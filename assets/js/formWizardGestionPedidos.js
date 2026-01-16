const STORAGE_KEY = "formWizard:gestion-pedidos:v1";

const RE = {
  productId: /^[0-9]{1,9}$/,
  compositeKey: /^[0-9]{1,12}\|[0-9]{1,12}$/,
  orderId: /^[0-9]{1,12}$/,
};

function nowLocalDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function money(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(2);
}

export class FormWizard {
  constructor({ locale, t, endpoints }) {
    this.locale = locale;
    this.t = t;
    this.endpoints = endpoints;

    this.step = 1;
    this.maxStep = 3;
    this.isBusy = false;
    this.dbReady = false;

    this.pendingOrders = [];
    this.lookups = {
      clients: [],
      products: [],
      bases: [],
      direcciones: [],
      direccionesprov: [],
      numrecibe: [],
    };
    this.productsById = new Map();

    this.state = {
      vFiltroCliente: "",
      vFiltroFecha: "",
      vPedidoSelected: "",
      vPedidoFecha: "",
      vCodigoCliente: "",
      vProdPedidos: [],
      vFecha_emision: "",
      vCodigo_base: "",
      vProdFactura: [],
      vCodigo_Cliente_Direccion: "",
      vCodigo_Cliente_DireccionProv: "",
      vCodigo_Cliente_Numrecibe: "",
    };

    this.el = {
      form: document.getElementById("wizardForm"),
      steps: Array.from(document.querySelectorAll(".wizard-step")),
      btnPrev: document.getElementById("btnPrev"),
      btnNext: document.getElementById("btnNext"),
      btnEmit: document.getElementById("btnEmit"),
      btnReset: document.getElementById("btnReset"),
      btnShowSql: document.getElementById("btnShowSql"),
      btnApplyFilters: document.getElementById("btnApplyFilters"),
      progressBar: document.getElementById("progressBar"),
      stepLabel: document.getElementById("stepLabel"),
      stepCounter: document.getElementById("stepCounter"),
      alertContainer: document.getElementById("alertContainer"),
      statusText: document.getElementById("statusText"),
      summary: document.getElementById("summary"),
      sqlLogsPanel: document.getElementById("sqlLogsPanel"),

      vFiltroCliente: document.getElementById("vFiltroCliente"),
      vFiltroFecha: document.getElementById("vFiltroFecha"),
      tblPedidosBody: document.querySelector("#tblPedidosPendientes tbody"),

      vFecha_emision: document.getElementById("vFecha_emision"),
      vCodigo_base: document.getElementById("vCodigo_base"),

      vCodigo_Cliente_Direccion: document.getElementById("vCodigo_Cliente_Direccion"),
      vCodigo_Cliente_DireccionProv: document.getElementById("vCodigo_Cliente_DireccionProv"),
      vCodigo_Cliente_Numrecibe: document.getElementById("vCodigo_Cliente_Numrecibe"),

      btnAddProdFactura: document.getElementById("btnAddProdFactura"),
      tblProdFacturaBody: document.querySelector("#tblProdFactura tbody"),
    };

    this.confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
    this.sqlModal = new bootstrap.Modal(document.getElementById("sqlModal"));

    this._saveDebounced = debounce(() => this.saveDraft(), 250);
  }

  async init() {
    this._bindEvents();
    this._initDefaults();
    this.restoreDraft({ silent: true });
    await this._checkDb();
    if (!this.dbReady) {
      this._renderAll();
      return;
    }

    await this._loadLookups();
    await this._loadPendingOrders({ silent: true });
    if (this.state.vPedidoSelected) {
      await this._loadPedidoDetalle(this.state.vPedidoSelected, { silent: true });
    }
    await this._loadClientDeliveryLookups({ initial: true });
    this._renderAll();
    this._toastInfo(this.t(this.locale, "restored"), { onlyIfRestored: true });
  }

  _bindEvents() {
    const onAnyChange = () => this._saveDebounced();
    this.el.form.addEventListener("input", onAnyChange);
    this.el.form.addEventListener("change", onAnyChange);

    this.el.btnPrev.addEventListener("click", () => this.prev());
    this.el.btnNext.addEventListener("click", () => this.next());
    this.el.btnEmit?.addEventListener("click", () => this.emitInvoice());
    this.el.btnReset.addEventListener("click", () => this.reset());
    this.el.btnShowSql.addEventListener("click", () => this.showSqlLogs());
    this.el.btnApplyFilters.addEventListener("click", () => this.applyFilters());

    this.el.btnAddProdFactura.addEventListener("click", () => this.addRow());

    this.el.tblPedidosBody.addEventListener("click", (e) => this._onPedidosClick(e));
    this.el.tblProdFacturaBody.addEventListener("click", (e) => this._onTableClick(e));
    this.el.tblProdFacturaBody.addEventListener("input", (e) => this._onTableInput(e));
    this.el.tblProdFacturaBody.addEventListener("change", (e) => this._onTableInput(e));

    document.getElementById("btnConfirmOk").addEventListener("click", () => this._confirmResolve?.(true));
    document.getElementById("confirmModal").addEventListener("hidden.bs.modal", () => this._confirmResolve?.(false));
  }

  _initDefaults() {
    if (!this.state.vFecha_emision) this.state.vFecha_emision = nowLocalDate();
  }

  async _loadLookups() {
    const [clients, products, bases] = await Promise.all([
      this._safeJson(this.endpoints.clients, []),
      this._safeJson(this.endpoints.products, []),
      this._safeJson(this.endpoints.bases, []),
    ]);
    this.lookups.clients = Array.isArray(clients) ? clients : [];
    this.lookups.products = Array.isArray(products) ? products : [];
    this.lookups.bases = Array.isArray(bases) ? bases : [];

    this.productsById = new Map(this.lookups.products.map((p) => [String(p.id), p]));

    this._fillSelect(this.el.vFiltroCliente, this.lookups.clients, {
      placeholder: this.t(this.locale, "filterAll"),
      allowBlank: true,
    });
    this._fillSelect(this.el.vCodigo_base, this.lookups.bases, { placeholder: this.t(this.locale, "loading") });

    if (!this.state.vCodigo_base && this.lookups.bases[0]) this.state.vCodigo_base = String(this.lookups.bases[0].id);
  }

  async _checkDb() {
    this._setStatus(this.t(this.locale, "dbConnecting"));
    const out = await this._safeJson(this.endpoints.dbStatus, { ok: false });
    if (out?.ok) {
      this.dbReady = true;
      const suffix = out?.database ? ` - ${out.database}` : "";
      this._setStatus(`${this.t(this.locale, "dbConnected")}${suffix}`);
      this._clearAlert();
      return;
    }
    this.dbReady = false;
    const err = String(out?.error || "db_error");
    this._setStatus(`${this.t(this.locale, "dbFailed")}: ${err}`);
    this._showAlert("danger", `${this.t(this.locale, "dbFailed")}: ${err}`);
  }

  async _loadPendingOrders({ silent } = {}) {
    if (!this.dbReady) return;
    this._pullFromDom();
    this.el.tblPedidosBody.innerHTML = `<tr><td colspan="5" class="text-secondary">${escapeHtml(
      this.t(this.locale, "loading")
    )}</td></tr>`;
    const rows = await this._safeJson(
      this.endpoints.pedidosPendientes({
        clientId: this.state.vFiltroCliente,
        fecha: this.state.vFiltroFecha,
      }),
      []
    );
    this.pendingOrders = Array.isArray(rows) ? rows : [];
    if (!silent && this.pendingOrders.length === 0) {
      this._showAlert("info", this.t(this.locale, "noOrders"));
    }

    const hasSelected = this.pendingOrders.some((p) => String(p.codigo_pedido) === String(this.state.vPedidoSelected));
    if (!hasSelected) {
      this.state.vPedidoSelected = "";
      this.state.vCodigoCliente = "";
      this.state.vPedidoFecha = "";
      this.state.vProdPedidos = [];
      this.state.vProdFactura = [];
      this.state.vCodigo_Cliente_Direccion = "";
      this.state.vCodigo_Cliente_DireccionProv = "";
      this.state.vCodigo_Cliente_Numrecibe = "";
    }
    this._renderAll();
  }

  async _loadPedidoDetalle(pedidoId, { silent } = {}) {
    if (!pedidoId) return;
    this._setStatus(this.t(this.locale, "loading"));
    const rows = await this._safeJson(this.endpoints.pedidoDetalle(pedidoId), []);
    const items = Array.isArray(rows) ? rows : [];
    this.state.vProdPedidos = items.map((r) => {
      const id = String(r.codigo_producto ?? "");
      return {
        idProducto: id,
        descripcion: String(r.nombre ?? ""),
        cantidad: Number(r.cantidad || 0),
        precio: Number(r.precio_unitario || 0),
        monto: Number(r.cantidad || 0) * Number(r.precio_unitario || 0),
        saldo: r.saldo == null ? 0 : Number(r.saldo),
      };
    });
    if (this.state.vProdPedidos.length === 0 && !silent) {
      this._showAlert("warning", this.t(this.locale, "noOrders"));
    }
    this._syncFacturaFromPedidoIfEmpty();
    this._setStatus(this.t(this.locale, "idle"));
  }

  async _loadClientDeliveryLookups({ initial }) {
    const clientId = String(this.state.vCodigoCliente || "").trim();
    if (!clientId) return;

    if (!initial) {
      this.state.vCodigo_Cliente_Direccion = "";
      this.state.vCodigo_Cliente_DireccionProv = "";
      this.state.vCodigo_Cliente_Numrecibe = "";
    }

    this._fillSelect(this.el.vCodigo_Cliente_Direccion, [], { placeholder: this.t(this.locale, "loading") });
    this._fillSelect(this.el.vCodigo_Cliente_Numrecibe, [], { placeholder: this.t(this.locale, "loading") });
    this._fillSelect(this.el.vCodigo_Cliente_DireccionProv, [], { placeholder: this.t(this.locale, "loading") });

    const [direcciones, numrecibe, direccionesprov] = await Promise.all([
      this._safeJson(this.endpoints.clientDirecciones(clientId), []),
      this._safeJson(this.endpoints.clientNumrecibe(clientId), []),
      this._safeJson(this.endpoints.clientDireccionesProv(clientId), []),
    ]);

    this.lookups.direcciones = Array.isArray(direcciones) ? direcciones : [];
    this.lookups.numrecibe = Array.isArray(numrecibe) ? numrecibe : [];
    this.lookups.direccionesprov = Array.isArray(direccionesprov) ? direccionesprov : [];

    this._fillSelect(this.el.vCodigo_Cliente_Direccion, this.lookups.direcciones);
    this._fillSelect(this.el.vCodigo_Cliente_Numrecibe, this.lookups.numrecibe);
    this._fillSelect(this.el.vCodigo_Cliente_DireccionProv, this.lookups.direccionesprov);

    const keepIfExists = (value, items) => items.some((i) => String(i.id) === String(value));
    if (!keepIfExists(this.state.vCodigo_Cliente_Direccion, this.lookups.direcciones) && this.lookups.direcciones[0]) {
      this.state.vCodigo_Cliente_Direccion = String(this.lookups.direcciones[0].id);
    }
    if (!keepIfExists(this.state.vCodigo_Cliente_Numrecibe, this.lookups.numrecibe) && this.lookups.numrecibe[0]) {
      this.state.vCodigo_Cliente_Numrecibe = String(this.lookups.numrecibe[0].id);
    }
    if (
      !keepIfExists(this.state.vCodigo_Cliente_DireccionProv, this.lookups.direccionesprov) &&
      this.lookups.direccionesprov[0]
    ) {
      this.state.vCodigo_Cliente_DireccionProv = String(this.lookups.direccionesprov[0].id);
    }
  }

  _fillSelect(select, items, { placeholder, allowBlank } = {}) {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder ?? "-";
    empty.disabled = !allowBlank;
    empty.selected = true;
    select.appendChild(empty);
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = String(item.id);
      opt.textContent = item.name;
      select.appendChild(opt);
    }
  }

  _blankProdRow() {
    return {
      idProducto: "",
      descripcion: "",
      cantidad: 1,
      precio: 0,
      monto: 0,
    };
  }

  _onPedidosClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const pedidoId = btn.getAttribute("data-id");
    if (action === "select" && pedidoId) this.selectPedido(pedidoId);
  }

  _onTableClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const index = Number(btn.getAttribute("data-index"));
    if (!Number.isFinite(index)) return;
    if (action === "del") this.deleteRow(index);
  }

  _onTableInput(e) {
    const input = e.target.closest("input,select");
    if (!input) return;
    const index = Number(input.getAttribute("data-index"));
    const field = input.getAttribute("data-field");
    if (!Number.isFinite(index) || !field) return;

    const row = this.state.vProdFactura[index];
    if (!row) return;

    if (field === "idProducto") {
      row.idProducto = String(input.value || "");
      const p = this.productsById.get(row.idProducto);
      if (p) row.descripcion = String(p.name || "");
    } else if (field === "cantidad" || field === "precio") {
      const num = Number(input.value);
      row[field] = Number.isFinite(num) ? num : 0;
    } else {
      row[field] = String(input.value || "");
    }

    row.monto = Number(row.cantidad || 0) * Number(row.precio || 0);
    this._renderTables();
    this._saveDebounced();
  }

  addRow() {
    this.state.vProdFactura.push(this._blankProdRow());
    this._renderTables();
    this._saveDebounced();
  }

  deleteRow(index) {
    this.state.vProdFactura.splice(index, 1);
    if (this.state.vProdFactura.length === 0) this.state.vProdFactura.push(this._blankProdRow());
    this._renderTables();
    this._saveDebounced();
  }

  prev() {
    if (this.isBusy) return;
    this._clearAlert();
    this.step = Math.max(1, this.step - 1);
    this._renderAll();
  }

  next() {
    if (this.isBusy) return;
    this._clearAlert();
    if (!this.validateStep(this.step)) {
      this._showAlert("danger", this.t(this.locale, "validationError"));
      return;
    }
    this.step = Math.min(this.maxStep, this.step + 1);
    this._renderAll();
  }

  applyFilters() {
    this._clearAlert();
    this._loadPendingOrders();
  }

  async selectPedido(pedidoId) {
    const pedido = this.pendingOrders.find((p) => String(p.codigo_pedido) === String(pedidoId));
    if (!pedido) return;
    this.state.vPedidoSelected = String(pedido.codigo_pedido);
    this.state.vCodigoCliente = String(pedido.codigo_cliente || "");
    this.state.vPedidoFecha = String(pedido.fecha || "");
    await this._loadPedidoDetalle(this.state.vPedidoSelected, { silent: true });
    await this._loadClientDeliveryLookups({ initial: false });
    this._renderAll();
    this._saveDebounced();
  }

  _syncFacturaFromPedidoIfEmpty() {
    if (this.state.vProdFactura.length > 0) return;
    this.state.vProdFactura = this.state.vProdPedidos
      .filter((r) => String(r.idProducto).trim() || String(r.descripcion).trim())
      .map((r) => ({
        idProducto: String(r.idProducto || ""),
        descripcion: String(r.descripcion || ""),
        cantidad: Number(r.cantidad || 0),
        precio: Number(r.precio || 0),
        monto: Number(r.monto || 0),
      }));
    if (this.state.vProdFactura.length === 0) this.state.vProdFactura = [this._blankProdRow()];
  }

  validateStep(step) {
    this._pullFromDom();
    if (step === 1) return this._validateStep1();
    if (step === 2) return this._validateStep2();
    if (step === 3) return this._validateStep3();
    return true;
  }

  _pullFromDom() {
    this.state.vFiltroCliente = this.el.vFiltroCliente.value;
    this.state.vFiltroFecha = this.el.vFiltroFecha.value;
    this.state.vFecha_emision = this.el.vFecha_emision.value;
    this.state.vCodigo_base = this.el.vCodigo_base.value;
    this.state.vCodigo_Cliente_Direccion = this.el.vCodigo_Cliente_Direccion.value;
    this.state.vCodigo_Cliente_Numrecibe = this.el.vCodigo_Cliente_Numrecibe.value;
    this.state.vCodigo_Cliente_DireccionProv = this.el.vCodigo_Cliente_DireccionProv.value;
  }

  _markInvalid(input, isInvalid) {
    if (!input) return;
    input.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  _validateProductRows(rows) {
    let ok = true;
    let any = false;
    for (const row of rows) {
      const hasAny = String(row.idProducto).trim() || String(row.descripcion).trim();
      if (!hasAny) continue;
      any = true;
      if (!RE.productId.test(String(row.idProducto).trim())) ok = false;
      if (!String(row.descripcion).trim()) ok = false;
      const qty = Number(row.cantidad);
      const price = Number(row.precio);
      if (!Number.isFinite(qty) || qty <= 0) ok = false;
      if (!Number.isFinite(price) || price < 0) ok = false;
    }
    return ok && any;
  }

  _validateStep1() {
    const orderOk = RE.orderId.test(String(this.state.vPedidoSelected || "").trim());
    if (!orderOk) return false;
    return this.state.vProdPedidos.length > 0;
  }

  _validateStep2() {
    let ok = true;
    this._markInvalid(this.el.vFecha_emision, !this.state.vFecha_emision);
    this._markInvalid(this.el.vCodigo_base, !this.state.vCodigo_base);
    if (!this.state.vFecha_emision) ok = false;
    if (!this.state.vCodigo_base) ok = false;

    const rowsOk = this._validateProductRows(this.state.vProdFactura);
    if (!rowsOk) ok = false;
    return ok;
  }

  _validateStep3() {
    let ok = true;
    const dirOk = RE.compositeKey.test(String(this.state.vCodigo_Cliente_Direccion || "").trim());
    const numOk = RE.compositeKey.test(String(this.state.vCodigo_Cliente_Numrecibe || "").trim());
    const provOk = RE.compositeKey.test(String(this.state.vCodigo_Cliente_DireccionProv || "").trim());

    this._markInvalid(this.el.vCodigo_Cliente_Direccion, !dirOk);
    this._markInvalid(this.el.vCodigo_Cliente_Numrecibe, !numOk);
    this._markInvalid(this.el.vCodigo_Cliente_DireccionProv, !provOk);

    if (!dirOk || !numOk || !provOk) ok = false;
    return ok;
  }

  _renderAll() {
    this._renderStep();
    this._renderProgress();
    this._renderFormValues();
    this._renderPendingOrders();
    this._renderTables();
    this._renderNav();
    this._renderSummary();
  }

  _renderStep() {
    for (const s of this.el.steps) {
      const n = Number(s.getAttribute("data-step"));
      s.classList.toggle("d-none", n !== this.step);
    }
    this.el.stepLabel.textContent = this.t(this.locale, `step${this.step}Title`);
    this.el.stepCounter.textContent = `${this.step}/${this.maxStep}`;
  }

  _renderProgress() {
    const pct = Math.round(((this.step - 1) / (this.maxStep - 1)) * 100);
    this.el.progressBar.style.width = `${pct}%`;
    this.el.progressBar.textContent = pct >= 15 ? `${pct}%` : "";
  }

  _renderFormValues() {
    if (this.el.vFiltroCliente.options.length) this.el.vFiltroCliente.value = this.state.vFiltroCliente || "";
    this.el.vFiltroFecha.value = this.state.vFiltroFecha || "";

    this.el.vFecha_emision.value = this.state.vFecha_emision || nowLocalDate();
    if (this.el.vCodigo_base.options.length) this.el.vCodigo_base.value = this.state.vCodigo_base || "";

    if (this.el.vCodigo_Cliente_Direccion.options.length)
      this.el.vCodigo_Cliente_Direccion.value = this.state.vCodigo_Cliente_Direccion || "";
    if (this.el.vCodigo_Cliente_Numrecibe.options.length)
      this.el.vCodigo_Cliente_Numrecibe.value = this.state.vCodigo_Cliente_Numrecibe || "";
    if (this.el.vCodigo_Cliente_DireccionProv.options.length)
      this.el.vCodigo_Cliente_DireccionProv.value = this.state.vCodigo_Cliente_DireccionProv || "";
  }

  _renderPendingOrders() {
    if (!this.el.tblPedidosBody) return;
    if (this.pendingOrders.length === 0) {
      this.el.tblPedidosBody.innerHTML = `<tr><td colspan="5" class="text-secondary">${escapeHtml(
        this.t(this.locale, "noOrders")
      )}</td></tr>`;
      return;
    }
    this.el.tblPedidosBody.innerHTML = "";
    this.pendingOrders.forEach((row) => {
      const selected = String(row.codigo_pedido) === String(this.state.vPedidoSelected);
      const tr = document.createElement("tr");
      if (selected) tr.classList.add("table-primary");
      tr.innerHTML = `
        <td class="mono">${escapeHtml(String(row.fecha || ""))}</td>
        <td class="mono">${escapeHtml(String(row.codigo_pedido || ""))}</td>
        <td class="mono">${escapeHtml(String(row.codigo_cliente || ""))}</td>
        <td>${escapeHtml(String(row.nombre_cliente || ""))}</td>
        <td class="text-end">
          <button type="button" class="btn btn-outline-primary btn-sm" data-action="select" data-id="${escapeHtml(
            String(row.codigo_pedido)
          )}">
            ${escapeHtml(this.t(this.locale, "selectOrder"))}
          </button>
        </td>
      `;
      this.el.tblPedidosBody.appendChild(tr);
    });
  }

  _renderTables() {
    this._renderTable(this.el.tblProdFacturaBody, this.state.vProdFactura);
  }

  _renderTable(tbody, rows) {
    tbody.innerHTML = "";
    rows.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <select class="form-select form-select-sm" data-index="${idx}" data-field="idProducto">
            ${this._productOptionsHtml(row.idProducto)}
          </select>
        </td>
        <td><input class="form-control form-control-sm" data-index="${idx}" data-field="descripcion" value="${escapeHtml(
          String(row.descripcion ?? "")
        )}" /></td>
        <td><input class="form-control form-control-sm" data-index="${idx}" data-field="cantidad" inputmode="numeric" value="${escapeHtml(
          String(row.cantidad ?? 0)
        )}" /></td>
        <td><input class="form-control form-control-sm" data-index="${idx}" data-field="precio" inputmode="numeric" value="${escapeHtml(
          String(row.precio ?? 0)
        )}" /></td>
        <td class="mono">${money(Number(row.monto || 0))}</td>
        <td class="text-end">
          <button type="button" class="btn btn-outline-danger btn-sm" data-action="del" data-index="${idx}" aria-label="Delete">
            x
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  _productOptionsHtml(selectedId) {
    const selected = String(selectedId ?? "");
    const placeholder = escapeHtml(this.t(this.locale, "selectProduct"));
    const rows = this.lookups.products || [];
    const options = [`<option value="">${placeholder}</option>`];
    for (const p of rows) {
      const id = String(p.id);
      const name = String(p.name ?? "");
      options.push(
        `<option value="${escapeHtml(id)}"${id === selected ? " selected" : ""}>${escapeHtml(id)} - ${escapeHtml(
          name
        )}</option>`
      );
    }
    return options.join("");
  }

  _renderNav() {
    const blocked = this.isBusy || !this.dbReady;
    this.el.btnPrev.disabled = blocked || this.step === 1;
    this.el.btnNext.classList.toggle("d-none", this.step === this.maxStep);
    this.el.btnNext.disabled = blocked || this.step === this.maxStep;
    this.el.btnEmit?.classList.toggle("d-none", this.step !== this.maxStep);
    if (this.el.btnEmit) this.el.btnEmit.disabled = blocked || this.step !== this.maxStep;
  }

  _renderSummary() {
    if (this.step !== 3) return;
    const products = this.state.vProdFactura.filter((r) => String(r.idProducto).trim() || String(r.descripcion).trim());
    const total = products.reduce((acc, r) => acc + Number(r.monto || 0), 0);
    const dirName =
      this.lookups.direcciones.find((d) => String(d.id) === String(this.state.vCodigo_Cliente_Direccion))?.name || "";
    const numName =
      this.lookups.numrecibe.find((d) => String(d.id) === String(this.state.vCodigo_Cliente_Numrecibe))?.name || "";
    const provName =
      this.lookups.direccionesprov.find((d) => String(d.id) === String(this.state.vCodigo_Cliente_DireccionProv))?.name ||
      "";

    const itemsHtml = products
      .map(
        (r) => `
          <tr>
            <td class="mono">${escapeHtml(String(r.idProducto || ""))}</td>
            <td>${escapeHtml(String(r.descripcion || ""))}</td>
            <td class="text-end mono">${escapeHtml(String(r.cantidad || 0))}</td>
            <td class="text-end mono">${money(Number(r.precio || 0))}</td>
            <td class="text-end mono">${money(Number(r.monto || 0))}</td>
          </tr>
        `
      )
      .join("");

    this.el.summary.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <div class="p-3 rounded border bg-body">
            <div class="d-flex justify-content-between">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelOrder"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vPedidoSelected || ""))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelClient"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vCodigoCliente || ""))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelIssueDate"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vFecha_emision || ""))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelBase"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vCodigo_base || ""))}</span>
            </div>
            <hr class="my-2" />
            <div class="d-flex justify-content-between">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelDeliveryAddress"))}</span>
              <span class="kpi">${escapeHtml(dirName || "-")}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelDeliveryReceiver"))}</span>
              <span class="kpi">${escapeHtml(numName || "-")}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelDeliveryShipTo"))}</span>
              <span class="kpi">${escapeHtml(provName || "-")}</span>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-7">
          <div class="p-3 rounded border bg-body">
            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>${escapeHtml(this.t(this.locale, "colDesc"))}</th>
                    <th class="text-end">${escapeHtml(this.t(this.locale, "labelQtyShort"))}</th>
                    <th class="text-end">${escapeHtml(this.t(this.locale, "colPrice"))}</th>
                    <th class="text-end">${escapeHtml(this.t(this.locale, "colAmount"))}</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml || `<tr><td colspan="5" class="text-secondary small">-</td></tr>`}</tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" class="text-end text-secondary">${escapeHtml(this.t(this.locale, "labelTotal"))}</td>
                    <td class="text-end mono">${money(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _showAlert(variant, message) {
    this.el.alertContainer.innerHTML = `
      <div class="alert alert-${variant} alert-dismissible fade show" role="alert">
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  _clearAlert() {
    this.el.alertContainer.innerHTML = "";
  }

  _toastInfo(message, { onlyIfRestored } = {}) {
    if (onlyIfRestored && !this._restoredOnce) return;
    const el = document.createElement("div");
    el.className = "toast align-items-center text-bg-dark border-0";
    el.setAttribute("role", "alert");
    el.setAttribute("aria-live", "assertive");
    el.setAttribute("aria-atomic", "true");
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${escapeHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    const container = document.getElementById("toastContainer") || this._ensureToastContainer();
    container.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 1800 });
    t.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  }

  _ensureToastContainer() {
    const div = document.createElement("div");
    div.id = "toastContainer";
    div.className = "toast-container position-fixed bottom-0 end-0 p-3";
    document.body.appendChild(div);
    return div;
  }

  saveDraft() {
    this._pullFromDom();
    const payload = {
      step: this.step,
      state: this.state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  restoreDraft({ silent } = {}) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (!silent) this._toastInfo(this.t(this.locale, "noDraft"));
      return false;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.state && typeof parsed.state === "object") {
        this.state = { ...this.state, ...parsed.state };
        this.step = Math.min(this.maxStep, Math.max(1, Number(parsed.step || 1)));
        this._restoredOnce = true;
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  async reset() {
    const ok = await this._confirm(this.t(this.locale, "confirmBody"));
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    this.state = {
      vFiltroCliente: "",
      vFiltroFecha: "",
      vPedidoSelected: "",
      vPedidoFecha: "",
      vCodigoCliente: "",
      vProdPedidos: [],
      vFecha_emision: nowLocalDate(),
      vCodigo_base: "",
      vProdFactura: [],
      vCodigo_Cliente_Direccion: "",
      vCodigo_Cliente_DireccionProv: "",
      vCodigo_Cliente_Numrecibe: "",
    };
    this.pendingOrders = [];
    this.step = 1;
    await this._loadPendingOrders({ silent: true });
    this._renderAll();
    this._toastInfo(this.t(this.locale, "draftCleared"));
  }

  async showSqlLogs() {
    this.el.sqlLogsPanel.innerHTML = `<div class="text-secondary">${escapeHtml(this.t(this.locale, "loading"))}</div>`;
    this.sqlModal.show();
    const logs = await this._safeJson(this.endpoints.sqlLogs, []);
    if (!Array.isArray(logs)) return;
    this.el.sqlLogsPanel.innerHTML = logs
      .map(
        (l) => `
          <div class="sql-log">
            <div class="d-flex justify-content-between flex-wrap gap-2">
              <div class="text-secondary mono">${escapeHtml(String(l.at || ""))}</div>
              <div class="badge text-bg-light border">${escapeHtml(String(l.level || "INFO"))}</div>
            </div>
            <div class="mono mt-2">${escapeHtml(String(l.sql || ""))}</div>
          </div>
        `
      )
      .join("");
  }

  async emitInvoice() {
    this._clearAlert();
    const allOk = [1, 2, 3].every((s) => this.validateStep(s));
    if (!allOk) {
      this._showAlert("danger", this.t(this.locale, "validationError"));
      return;
    }

    const ok = await this._confirm(this.t(this.locale, "confirmBody"));
    if (!ok) return;

    this._setBusy(true);
    try {
      this._setStatus(this.t(this.locale, "loading"));
      const payload = this._buildInvoicePayload();
      const res = await fetch(this.endpoints.emit, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err?.error) msg = String(err.error);
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      const out = await res.json();
      const html = out?.invoiceHtml;
      if (typeof html !== "string") throw new Error("Bad response");
      this._downloadText(html, `factura-${Date.now()}.html`, "text/html");
      this._setStatus(this.t(this.locale, "emitOk"));
      this._showAlert("success", this.t(this.locale, "emitOk"));
    } catch (e) {
      this._setStatus(`${this.t(this.locale, "error")}: ${e?.message || e}`);
      this._showAlert("danger", `${this.t(this.locale, "error")}: ${e?.message || e}`);
    } finally {
      this._setBusy(false);
    }
  }

  _buildInvoicePayload() {
    const products = this.state.vProdFactura
      .filter((r) => String(r.idProducto).trim() || String(r.descripcion).trim())
      .map((r) => ({
        idProducto: String(r.idProducto || "").trim(),
        descripcion: String(r.descripcion || "").trim(),
        cantidad: Number(r.cantidad || 0),
        precio: Number(r.precio || 0),
        monto: Number(r.monto || 0),
      }));
    return {
      pedido: {
        codigo_pedido: this.state.vPedidoSelected,
        codigo_cliente: this.state.vCodigoCliente,
      },
      factura: {
        fecha_emision: this.state.vFecha_emision,
        codigo_base: this.state.vCodigo_base,
        productos: products,
      },
      entrega: {
        codigo_cliente_direccion: this.state.vCodigo_Cliente_Direccion,
        codigo_cliente_direccionprov: this.state.vCodigo_Cliente_DireccionProv,
        codigo_cliente_numrecibe: this.state.vCodigo_Cliente_Numrecibe,
      },
      locale: this.locale,
    };
  }

  _downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  _setStatus(text) {
    this.el.statusText.textContent = text;
  }

  _setBusy(isBusy) {
    this.isBusy = Boolean(isBusy);
    this._renderNav();
  }

  _confirm(message) {
    document.getElementById("confirmBody").textContent = message;
    this.confirmModal.show();
    return new Promise((resolve) => {
      this._confirmResolve = (val) => {
        this._confirmResolve = null;
        this.confirmModal.hide();
        resolve(Boolean(val));
      };
    });
  }

  async _safeJson(url, fallback) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return fallback;
    }
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
