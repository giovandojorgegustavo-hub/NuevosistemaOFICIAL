const STORAGE_KEY = "formWizard:v1";

const RE = {
  productId: /^[0-9]{1,9}$/,
  compositeKey: /^[0-9]{1,12}\|[0-9]{1,12}$/,
  ubigeoPart: /^[0-9]{2}$/,
  puntoEntrega: /^[0-9]{2}\|[0-9]{2}\|[0-9]{2}\|[0-9]{1,12}$/,
};

function nowLocalDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowLocalTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
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
    this.maxStep = 4;
    this.isBusy = false;
    this.dbReady = false;

    this.lookups = {
      clients: [],
      products: [],
      bases: [],
      packings: [],
      puntosEntrega: [],
      numrecibe: [],
    };
    this.productsById = new Map();

    this.state = {
      vFechaPedido: "",
      vHoraPedido: "",
      vClienteSelected: "",
      vProdPedidos: [],
      vFecha_emision: "",
      vCodigo_base: "",
      vCodigo_packing: "",
      vProdFactura: [],
      vCodigo_Cliente_Numrecibe: "",
      vPuntoEntrega: "",
      vCrearPuntoEntrega: false,
      vCod_Dep: "",
      vCod_Prov: "",
      vCod_Dist: "",
      vCodigo_puntoentrega: "",
      vRegion_Entrega: "",
      vDireccion_linea: "",
      vReferencia: "",
      vDestinatario_nombre: "",
      vDestinatario_dni: "",
      vAgencia: "",
      vUbigeoInfo: "",
    };

    this.el = {
      form: document.getElementById("wizardForm"),
      steps: Array.from(document.querySelectorAll(".wizard-step")),
      btnPrev: document.getElementById("btnPrev"),
      btnNext: document.getElementById("btnNext"),
      btnEmit: document.getElementById("btnEmit"),
      btnReset: document.getElementById("btnReset"),
      btnShowSql: document.getElementById("btnShowSql"),
      progressBar: document.getElementById("progressBar"),
      stepLabel: document.getElementById("stepLabel"),
      stepCounter: document.getElementById("stepCounter"),
      alertContainer: document.getElementById("alertContainer"),
      statusText: document.getElementById("statusText"),
      summary: document.getElementById("summary"),
      sqlLogsPanel: document.getElementById("sqlLogsPanel"),

      vFechaPedido: document.getElementById("vFechaPedido"),
      vHoraPedido: document.getElementById("vHoraPedido"),
      vClienteSelected: document.getElementById("vClienteSelected"),

      vFecha_emision: document.getElementById("vFecha_emision"),
      vCodigo_base: document.getElementById("vCodigo_base"),
      vCodigo_Cliente_Numrecibe: document.getElementById("vCodigo_Cliente_Numrecibe"),
      vPuntoEntrega: document.getElementById("vPuntoEntrega"),
      vCrearPuntoEntrega: document.getElementById("vCrearPuntoEntrega"),
      vRegion_Entrega: document.getElementById("vRegion_Entrega"),
      vCod_Dep: document.getElementById("vCod_Dep"),
      vCod_Prov: document.getElementById("vCod_Prov"),
      vCod_Dist: document.getElementById("vCod_Dist"),
      vDireccion_linea: document.getElementById("vDireccion_linea"),
      vReferencia: document.getElementById("vReferencia"),
      vDestinatario_nombre: document.getElementById("vDestinatario_nombre"),
      vDestinatario_dni: document.getElementById("vDestinatario_dni"),
      vAgencia: document.getElementById("vAgencia"),
      btnBuscarUbigeo: document.getElementById("btnBuscarUbigeo"),
      ubigeoInfo: document.getElementById("ubigeoInfo"),
      puntoEntregaSelectWrap: document.getElementById("puntoEntregaSelectWrap"),

      btnAddProdPedido: document.getElementById("btnAddProdPedido"),
      btnAddProdFactura: document.getElementById("btnAddProdFactura"),
      tblProdPedidosBody: document.querySelector("#tblProdPedidos tbody"),
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

    this.el.btnAddProdPedido.addEventListener("click", () => this.addRow("pedido"));
    this.el.btnAddProdFactura.addEventListener("click", () => this.addRow("factura"));

    this.el.tblProdPedidosBody.addEventListener("click", (e) => this._onTableClick(e, "pedido"));
    this.el.tblProdFacturaBody.addEventListener("click", (e) => this._onTableClick(e, "factura"));
    this.el.tblProdPedidosBody.addEventListener("input", (e) => this._onTableInput(e, "pedido"));
    this.el.tblProdFacturaBody.addEventListener("input", (e) => this._onTableInput(e, "factura"));
    this.el.tblProdPedidosBody.addEventListener("change", (e) => this._onTableInput(e, "pedido"));
    this.el.tblProdFacturaBody.addEventListener("change", (e) => this._onTableInput(e, "factura"));

    this.el.vClienteSelected.addEventListener("change", async () => {
      this._pullFromDom();
      if (!this.dbReady) return;
      await this._loadClientDeliveryLookups({ initial: false });
      this._saveDebounced();
      this._renderAll();
    });

    this.el.vPuntoEntrega?.addEventListener("change", () => {
      this._pullFromDom();
      this._applyPuntoEntregaSelection();
      this._renderEntregaFields();
      this._saveDebounced();
    });

    this.el.vCrearPuntoEntrega?.addEventListener("change", () => {
      this._pullFromDom();
      if (!this.state.vCrearPuntoEntrega) this._applyPuntoEntregaSelection();
      this._renderEntregaFields();
      this._saveDebounced();
    });

    this.el.vRegion_Entrega?.addEventListener("change", () => {
      this._pullFromDom();
      this._renderEntregaFields();
      this._saveDebounced();
    });

    this.el.btnBuscarUbigeo?.addEventListener("click", () => this.buscarUbigeo());

    document.getElementById("btnConfirmOk").addEventListener("click", () => this._confirmResolve?.(true));
    document.getElementById("confirmModal").addEventListener("hidden.bs.modal", () => this._confirmResolve?.(false));
  }

  _initDefaults() {
    if (!this.state.vFechaPedido) this.state.vFechaPedido = nowLocalDate();
    if (!this.state.vHoraPedido) this.state.vHoraPedido = nowLocalTime();
    if (!this.state.vFecha_emision) this.state.vFecha_emision = nowLocalDate();
    if (!this.state.vRegion_Entrega) this.state.vRegion_Entrega = "LIMA";
    if (this.state.vProdPedidos.length === 0) this.state.vProdPedidos = [this._blankProdRow({ withBalance: true })];
    if (this.state.vProdFactura.length === 0) this.state.vProdFactura = [];
  }

  async _loadLookups() {
    const [clients, products, bases, packings] = await Promise.all([
      this._safeJson(this.endpoints.clients, []),
      this._safeJson(this.endpoints.products, []),
      this._safeJson(this.endpoints.bases, []),
      this._safeJson(this.endpoints.packings, []),
    ]);
    this.lookups.clients = Array.isArray(clients) ? clients : [];
    this.lookups.products = Array.isArray(products) ? products : [];
    this.lookups.bases = Array.isArray(bases) ? bases : [];
    this.lookups.packings = Array.isArray(packings) ? packings : [];

    this.productsById = new Map(this.lookups.products.map((p) => [String(p.id), p]));

    this._fillSelect(this.el.vClienteSelected, this.lookups.clients, { placeholder: this.t(this.locale, "loading") });
    this._fillSelect(this.el.vCodigo_base, this.lookups.bases, { placeholder: this.t(this.locale, "loading") });

    const clientExists = this.lookups.clients.some((c) => String(c.id) === String(this.state.vClienteSelected));
    if ((!this.state.vClienteSelected || !clientExists) && this.lookups.clients[0])
      this.state.vClienteSelected = String(this.lookups.clients[0].id);
    if (!this.state.vCodigo_base && this.lookups.bases[0]) this.state.vCodigo_base = String(this.lookups.bases[0].id);
    if (!this.state.vCodigo_packing && this.lookups.packings[0])
      this.state.vCodigo_packing = String(this.lookups.packings[0].id);
    const packingExists = this.lookups.packings.some((p) => String(p.id) === String(this.state.vCodigo_packing));
    if (!packingExists && this.lookups.packings[0]) {
      this.state.vCodigo_packing = String(this.lookups.packings[0].id);
    }

    for (const row of [...this.state.vProdPedidos, ...this.state.vProdFactura]) {
      const id = String(row?.idProducto || "");
      if (!id || String(row?.descripcion || "").trim()) continue;
      const p = this.productsById.get(id);
      if (p) row.descripcion = String(p.name || "");
    }
  }

  async _checkDb() {
    this._setStatus(this.t(this.locale, "dbConnecting"));
    const out = await this._safeJson(this.endpoints.dbStatus, { ok: false });
    if (out?.ok) {
      this.dbReady = true;
      const suffix = out?.database ? ` · ${out.database}` : "";
      this._setStatus(`${this.t(this.locale, "dbConnected")}${suffix}`);
      this._clearAlert();
      return;
    }
    this.dbReady = false;
    const err = String(out?.error || "db_error");
    this._setStatus(`${this.t(this.locale, "dbFailed")}: ${err}`);
    this._showAlert("danger", `${this.t(this.locale, "dbFailed")}: ${err}`);
  }

  async _loadClientDeliveryLookups({ initial }) {
    const clientId = String(this.state.vClienteSelected || "").trim();
    if (!clientId) return;

    if (!initial) {
      this.state.vCodigo_Cliente_Numrecibe = "";
      this.state.vPuntoEntrega = "";
    }

    this._fillSelect(this.el.vCodigo_Cliente_Numrecibe, [], { placeholder: this.t(this.locale, "loading") });
    if (this.el.vPuntoEntrega) {
      this._fillSelect(this.el.vPuntoEntrega, [], { placeholder: this.t(this.locale, "loading") });
    }

    const [numrecibe, puntosEntrega] = await Promise.all([
      this._safeJson(this.endpoints.clientNumrecibe(clientId), []),
      this._safeJson(this.endpoints.clientPuntosEntrega(clientId), []),
    ]);

    this.lookups.numrecibe = Array.isArray(numrecibe) ? numrecibe : [];
    this.lookups.puntosEntrega = Array.isArray(puntosEntrega) ? puntosEntrega : [];

    this._fillSelect(this.el.vCodigo_Cliente_Numrecibe, this.lookups.numrecibe);
    if (this.el.vPuntoEntrega) this._fillSelect(this.el.vPuntoEntrega, this.lookups.puntosEntrega);

    const keepIfExists = (value, items) => items.some((i) => String(i.id) === String(value));

    if (initial && keepIfExists(this.state.vCodigo_Cliente_Numrecibe, this.lookups.numrecibe)) {
      // keep
    } else if (this.lookups.numrecibe[0]) {
      this.state.vCodigo_Cliente_Numrecibe = String(this.lookups.numrecibe[0].id);
    }

    if (initial && keepIfExists(this.state.vPuntoEntrega, this.lookups.puntosEntrega)) {
      // keep
    } else if (this.lookups.puntosEntrega[0]) {
      this.state.vPuntoEntrega = String(this.lookups.puntosEntrega[0].id);
    }

    if (this.lookups.puntosEntrega.length === 0) {
      this.state.vCrearPuntoEntrega = true;
    } else if (!initial) {
      this.state.vCrearPuntoEntrega = false;
    }

    this._applyPuntoEntregaSelection();
    this._renderEntregaFields();
  }

  _fillSelect(select, items, { placeholder } = {}) {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder ?? "—";
    empty.disabled = true;
    empty.selected = true;
    select.appendChild(empty);
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = String(item.id);
      opt.textContent = item.name;
      select.appendChild(opt);
    }
  }

  _blankProdRow({ withBalance }) {
    return {
      idProducto: "",
      descripcion: "",
      cantidad: 1,
      precio: 0,
      monto: 0,
      saldo: withBalance ? 0 : undefined,
    };
  }

  _onTableClick(e, kind) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const index = Number(btn.getAttribute("data-index"));
    if (!Number.isFinite(index)) return;
    if (action === "del") this.deleteRow(kind, index);
  }

  _onTableInput(e, kind) {
    const input = e.target.closest("input,select");
    if (!input) return;
    const index = Number(input.getAttribute("data-index"));
    const field = input.getAttribute("data-field");
    if (!Number.isFinite(index) || !field) return;

    const rows = kind === "pedido" ? this.state.vProdPedidos : this.state.vProdFactura;
    const row = rows[index];
    if (!row) return;

    if (field === "idProducto") {
      row.idProducto = String(input.value || "");
      const p = this.productsById.get(row.idProducto);
      if (p) row.descripcion = String(p.name || "");
    } else if (field === "cantidad" || field === "precio" || field === "saldo") {
      const num = Number(input.value);
      row[field] = Number.isFinite(num) ? num : 0;
    } else {
      row[field] = String(input.value || "");
    }

    row.monto = Number(row.cantidad || 0) * Number(row.precio || 0);
    if (typeof row.saldo === "number") row.saldo = Math.max(0, row.saldo);
    this._renderTables();
    this._saveDebounced();
  }

  addRow(kind) {
    if (kind === "pedido") this.state.vProdPedidos.push(this._blankProdRow({ withBalance: true }));
    else this.state.vProdFactura.push(this._blankProdRow({ withBalance: false }));
    this._renderTables();
    this._saveDebounced();
  }

  deleteRow(kind, index) {
    const rows = kind === "pedido" ? this.state.vProdPedidos : this.state.vProdFactura;
    rows.splice(index, 1);
    if (kind === "pedido" && rows.length === 0) rows.push(this._blankProdRow({ withBalance: true }));
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
    if (this.step === 1) this._syncFacturaFromPedidoIfEmpty();
    this.step = Math.min(this.maxStep, this.step + 1);
    this._renderAll();
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
    if (this.state.vProdFactura.length === 0) this.state.vProdFactura = [this._blankProdRow({ withBalance: false })];
  }

  validateStep(step) {
    this._pullFromDom();
    if (step === 1) return this._validateStep1();
    if (step === 2) return this._validateStep2();
    if (step === 3) return this._validateStep3();
    if (step === 4) return true;
    return true;
  }

  _pullFromDom() {
    this.state.vFechaPedido = this.el.vFechaPedido.value;
    this.state.vHoraPedido = this.el.vHoraPedido.value;
    this.state.vClienteSelected = this.el.vClienteSelected.value;

    this.state.vFecha_emision = this.el.vFecha_emision.value;
    this.state.vCodigo_base = this.el.vCodigo_base.value;
    this.state.vCodigo_Cliente_Numrecibe = this.el.vCodigo_Cliente_Numrecibe.value;
    this.state.vPuntoEntrega = this.el.vPuntoEntrega?.value || "";
    this.state.vCrearPuntoEntrega = Boolean(this.el.vCrearPuntoEntrega?.checked);
    this.state.vRegion_Entrega = this.el.vRegion_Entrega?.value || "";
    this.state.vCod_Dep = this.el.vCod_Dep?.value || "";
    this.state.vCod_Prov = this.el.vCod_Prov?.value || "";
    this.state.vCod_Dist = this.el.vCod_Dist?.value || "";
    this.state.vDireccion_linea = this.el.vDireccion_linea?.value || "";
    this.state.vReferencia = this.el.vReferencia?.value || "";
    this.state.vDestinatario_nombre = this.el.vDestinatario_nombre?.value || "";
    this.state.vDestinatario_dni = this.el.vDestinatario_dni?.value || "";
    this.state.vAgencia = this.el.vAgencia?.value || "";
  }

  _markInvalid(input, isInvalid) {
    if (!input) return;
    input.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  _validateProductRows(rows, { withBalance }) {
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
      if (withBalance) {
        const bal = Number(row.saldo ?? 0);
        if (!Number.isFinite(bal) || bal < 0) ok = false;
      }
    }
    return ok && any;
  }

  _validateStep1() {
    let ok = true;
    this._markInvalid(this.el.vFechaPedido, !this.state.vFechaPedido);
    this._markInvalid(this.el.vHoraPedido, !this.state.vHoraPedido);
    this._markInvalid(this.el.vClienteSelected, !this.state.vClienteSelected);

    if (!this.state.vFechaPedido) ok = false;
    if (!this.state.vHoraPedido) ok = false;
    if (!this.state.vClienteSelected) ok = false;

    const rowsOk = this._validateProductRows(this.state.vProdPedidos, { withBalance: true });
    if (!rowsOk) ok = false;
    return ok;
  }

  _validateStep2() {
    let ok = true;
    this._markInvalid(this.el.vFecha_emision, !this.state.vFecha_emision);
    this._markInvalid(this.el.vCodigo_base, !this.state.vCodigo_base);
    if (!this.state.vFecha_emision) ok = false;
    if (!this.state.vCodigo_base) ok = false;

    const rowsOk = this._validateProductRows(this.state.vProdFactura, { withBalance: false });
    if (!rowsOk) ok = false;
    return ok;
  }

  _validateStep3() {
    let ok = true;
    const numOk = RE.compositeKey.test(String(this.state.vCodigo_Cliente_Numrecibe || "").trim());
    this._markInvalid(this.el.vCodigo_Cliente_Numrecibe, !numOk);
    if (!numOk) ok = false;

    const creating = this._isCreatingPuntoEntrega();
    if (!creating) {
      const puntoOk = RE.puntoEntrega.test(String(this.state.vPuntoEntrega || "").trim());
      this._markInvalid(this.el.vPuntoEntrega, !puntoOk);
      if (!puntoOk) ok = false;
      return ok;
    }

    const region = String(this.state.vRegion_Entrega || "").toUpperCase();
    const regionOk = region === "LIMA" || region === "PROV";
    const depOk = RE.ubigeoPart.test(String(this.state.vCod_Dep || "").trim());
    const provOk = RE.ubigeoPart.test(String(this.state.vCod_Prov || "").trim());
    const distOk = RE.ubigeoPart.test(String(this.state.vCod_Dist || "").trim());

    this._markInvalid(this.el.vRegion_Entrega, !regionOk);
    this._markInvalid(this.el.vCod_Dep, !depOk);
    this._markInvalid(this.el.vCod_Prov, !provOk);
    this._markInvalid(this.el.vCod_Dist, !distOk);

    if (!regionOk || !depOk || !provOk || !distOk) ok = false;

    if (region === "LIMA") {
      const dirOk = Boolean(String(this.state.vDireccion_linea || "").trim());
      this._markInvalid(this.el.vDireccion_linea, !dirOk);
      if (!dirOk) ok = false;
    } else if (region === "PROV") {
      const nameOk = Boolean(String(this.state.vDestinatario_nombre || "").trim());
      const dniOk = Boolean(String(this.state.vDestinatario_dni || "").trim());
      const agenciaOk = Boolean(String(this.state.vAgencia || "").trim());
      this._markInvalid(this.el.vDestinatario_nombre, !nameOk);
      this._markInvalid(this.el.vDestinatario_dni, !dniOk);
      this._markInvalid(this.el.vAgencia, !agenciaOk);
      if (!nameOk || !dniOk || !agenciaOk) ok = false;
    }

    return ok;
  }

  _isCreatingPuntoEntrega() {
    return Boolean(this.state.vCrearPuntoEntrega || this.lookups.puntosEntrega.length === 0);
  }

  _getSelectedPuntoEntrega() {
    return (
      this.lookups.puntosEntrega.find((p) => String(p.id) === String(this.state.vPuntoEntrega)) || null
    );
  }

  _applyPuntoEntregaSelection() {
    const punto = this._getSelectedPuntoEntrega();
    if (!punto) return;
    this.state.vCod_Dep = String(punto.cod_dep || "");
    this.state.vCod_Prov = String(punto.cod_prov || "");
    this.state.vCod_Dist = String(punto.cod_dist || "");
    this.state.vCodigo_puntoentrega = String(punto.codigo_puntoentrega || "");
    this.state.vRegion_Entrega = String(punto.region_entrega || "");
    this.state.vDireccion_linea = String(punto.direccion_linea || "");
    this.state.vReferencia = String(punto.referencia || "");
    this.state.vDestinatario_nombre = String(punto.destinatario_nombre || "");
    this.state.vDestinatario_dni = String(punto.destinatario_dni || "");
    this.state.vAgencia = String(punto.agencia || "");
    this.state.vUbigeoInfo = "";
  }

  _renderEntregaFields() {
    if (this.lookups.puntosEntrega.length === 0) {
      this.state.vCrearPuntoEntrega = true;
      if (this.el.vCrearPuntoEntrega) {
        this.el.vCrearPuntoEntrega.checked = true;
        this.el.vCrearPuntoEntrega.disabled = true;
      }
    } else if (this.el.vCrearPuntoEntrega) {
      this.el.vCrearPuntoEntrega.disabled = false;
    }
    const creating = this._isCreatingPuntoEntrega();
    const region = String(this.state.vRegion_Entrega || "").toUpperCase();
    const showLima = region === "LIMA";
    const showProv = region === "PROV";

    document.querySelectorAll(".entrega-lima").forEach((el) => el.classList.toggle("d-none", !showLima));
    document.querySelectorAll(".entrega-prov").forEach((el) => el.classList.toggle("d-none", !showProv));

    if (this.el.puntoEntregaSelectWrap) {
      this.el.puntoEntregaSelectWrap.classList.toggle("d-none", this.lookups.puntosEntrega.length === 0);
    }
    if (this.el.vPuntoEntrega) this.el.vPuntoEntrega.disabled = creating;

    const lock = !creating;
    [
      this.el.vRegion_Entrega,
      this.el.vCod_Dep,
      this.el.vCod_Prov,
      this.el.vCod_Dist,
      this.el.vDireccion_linea,
      this.el.vReferencia,
      this.el.vDestinatario_nombre,
      this.el.vDestinatario_dni,
      this.el.vAgencia,
      this.el.btnBuscarUbigeo,
    ].forEach((el) => {
      if (el) el.disabled = lock;
    });
  }

  _renderAll() {
    this._renderStep();
    this._renderProgress();
    this._renderFormValues();
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
    this.el.vFechaPedido.value = this.state.vFechaPedido || nowLocalDate();
    this.el.vHoraPedido.value = this.state.vHoraPedido || nowLocalTime();

    if (this.el.vClienteSelected.options.length) this.el.vClienteSelected.value = this.state.vClienteSelected || "";

    this.el.vFecha_emision.value = this.state.vFecha_emision || nowLocalDate();
    if (this.el.vCodigo_base.options.length) this.el.vCodigo_base.value = this.state.vCodigo_base || "";
    if (this.el.vCodigo_Cliente_Numrecibe.options.length)
      this.el.vCodigo_Cliente_Numrecibe.value = this.state.vCodigo_Cliente_Numrecibe || "";
    if (this.el.vPuntoEntrega?.options?.length) this.el.vPuntoEntrega.value = this.state.vPuntoEntrega || "";
    if (this.el.vCrearPuntoEntrega) this.el.vCrearPuntoEntrega.checked = Boolean(this.state.vCrearPuntoEntrega);
    if (this.el.vRegion_Entrega) this.el.vRegion_Entrega.value = this.state.vRegion_Entrega || "";
    if (this.el.vCod_Dep) this.el.vCod_Dep.value = this.state.vCod_Dep || "";
    if (this.el.vCod_Prov) this.el.vCod_Prov.value = this.state.vCod_Prov || "";
    if (this.el.vCod_Dist) this.el.vCod_Dist.value = this.state.vCod_Dist || "";
    if (this.el.vDireccion_linea) this.el.vDireccion_linea.value = this.state.vDireccion_linea || "";
    if (this.el.vReferencia) this.el.vReferencia.value = this.state.vReferencia || "";
    if (this.el.vDestinatario_nombre) this.el.vDestinatario_nombre.value = this.state.vDestinatario_nombre || "";
    if (this.el.vDestinatario_dni) this.el.vDestinatario_dni.value = this.state.vDestinatario_dni || "";
    if (this.el.vAgencia) this.el.vAgencia.value = this.state.vAgencia || "";
    if (this.el.ubigeoInfo) this.el.ubigeoInfo.textContent = this.state.vUbigeoInfo || "";

    this._renderEntregaFields();
  }

  _renderTables() {
    this._renderTable(this.el.tblProdPedidosBody, this.state.vProdPedidos, { withBalance: true });
    this._renderTable(this.el.tblProdFacturaBody, this.state.vProdFactura, { withBalance: false });
  }

  _renderTable(tbody, rows, { withBalance }) {
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
        ${
          withBalance
            ? `<td><input class="form-control form-control-sm" data-index="${idx}" data-field="saldo" inputmode="numeric" value="${escapeHtml(
                String(row.saldo ?? 0)
              )}" /></td>`
            : ""
        }
        <td class="text-end">
          <button type="button" class="btn btn-outline-danger btn-sm" data-action="del" data-index="${idx}" aria-label="Delete">
            ×
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
        `<option value="${escapeHtml(id)}"${id === selected ? " selected" : ""}>${escapeHtml(id)} · ${escapeHtml(
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
    if (this.step !== 4) return;

    const products = this.state.vProdFactura.filter((r) => String(r.idProducto).trim() || String(r.descripcion).trim());
    const total = products.reduce((acc, r) => acc + Number(r.monto || 0), 0);
    const numName =
      this.lookups.numrecibe.find((d) => String(d.id) === String(this.state.vCodigo_Cliente_Numrecibe))?.name || "";
    const punto = this._getSelectedPuntoEntrega();
    const creating = this._isCreatingPuntoEntrega();
    const region = String(
      (creating ? this.state.vRegion_Entrega : punto?.region_entrega) || ""
    ).toUpperCase();
    const entregaLinea = creating ? this.state.vDireccion_linea : punto?.direccion_linea;
    const entregaRef = creating ? this.state.vReferencia : punto?.referencia;
    const entregaNombre = creating ? this.state.vDestinatario_nombre : punto?.destinatario_nombre;
    const entregaDni = creating ? this.state.vDestinatario_dni : punto?.destinatario_dni;
    const entregaAgencia = creating ? this.state.vAgencia : punto?.agencia;
    const puntoLabel = creating ? this.t(this.locale, "newDeliveryPoint") : punto?.name || "";
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
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelClient"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vClienteSelected || ""))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelDateTime"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vFechaPedido || ""))} ${escapeHtml(
      String(this.state.vHoraPedido || "")
    )}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelIssueDate"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vFecha_emision || ""))}</span>
            </div>
            <hr class="my-2" />
            <div class="d-flex justify-content-between">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelBase"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vCodigo_base || ""))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelDeliveryPoint"))}</span>
              <span class="kpi">${escapeHtml(puntoLabel || "—")}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelDeliveryRegion"))}</span>
              <span class="kpi">${escapeHtml(region || "—")}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelDeliveryReceiver"))}</span>
              <span class="kpi">${escapeHtml(numName || "—")}</span>
            </div>
            ${
              region === "LIMA"
                ? `
                <div class="d-flex justify-content-between mt-1">
                  <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelDeliveryLine"))}</span>
                  <span class="kpi">${escapeHtml(entregaLinea || "—")}</span>
                </div>
                ${
                  entregaRef
                    ? `
                    <div class="d-flex justify-content-between mt-1">
                      <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelReference"))}</span>
                      <span class="kpi">${escapeHtml(entregaRef)}</span>
                    </div>
                  `
                    : ""
                }
              `
                : ""
            }
            ${
              region === "PROV"
                ? `
                <div class="d-flex justify-content-between mt-1">
                  <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelRecipient"))}</span>
                  <span class="kpi">${escapeHtml(`${entregaNombre || ""} ${entregaDni || ""}`.trim() || "—")}</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                  <span class="text-secondary">${escapeHtml(this.t(this.locale, "labelAgency"))}</span>
                  <span class="kpi">${escapeHtml(entregaAgencia || "—")}</span>
                </div>
              `
                : ""
            }
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
                <tbody>${itemsHtml || `<tr><td colspan="5" class="text-secondary small">—</td></tr>`}</tbody>
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
      vFechaPedido: nowLocalDate(),
      vHoraPedido: nowLocalTime(),
      vClienteSelected: "",
      vProdPedidos: [this._blankProdRow({ withBalance: true })],
      vFecha_emision: nowLocalDate(),
      vCodigo_base: "",
      vCodigo_packing: "",
      vProdFactura: [],
      vCodigo_Cliente_Numrecibe: "",
      vPuntoEntrega: "",
      vCrearPuntoEntrega: false,
      vCod_Dep: "",
      vCod_Prov: "",
      vCod_Dist: "",
      vCodigo_puntoentrega: "",
      vRegion_Entrega: "LIMA",
      vDireccion_linea: "",
      vReferencia: "",
      vDestinatario_nombre: "",
      vDestinatario_dni: "",
      vAgencia: "",
      vUbigeoInfo: "",
    };
    this.step = 1;
    this._renderAll();
    this._toastInfo(this.t(this.locale, "draftCleared"));
  }

  async buscarUbigeo() {
    this._pullFromDom();
    const codDep = String(this.state.vCod_Dep || "").trim();
    const codProv = String(this.state.vCod_Prov || "").trim();
    const codDist = String(this.state.vCod_Dist || "").trim();

    const depOk = RE.ubigeoPart.test(codDep);
    const provOk = RE.ubigeoPart.test(codProv);
    const distOk = RE.ubigeoPart.test(codDist);
    this._markInvalid(this.el.vCod_Dep, !depOk);
    this._markInvalid(this.el.vCod_Prov, !provOk);
    this._markInvalid(this.el.vCod_Dist, !distOk);
    if (!depOk || !provOk || !distOk) {
      this.state.vUbigeoInfo = this.t(this.locale, "ubigeoInvalid");
      this._renderFormValues();
      return;
    }

    if (this.el.ubigeoInfo) this.el.ubigeoInfo.textContent = this.t(this.locale, "loading");
    const data = await this._safeJson(this.endpoints.ubigeo(codDep, codProv, codDist), null);
    if (!data || !data.departamento) {
      this.state.vUbigeoInfo = this.t(this.locale, "ubigeoNotFound");
    } else {
      this.state.vUbigeoInfo = `${data.departamento} / ${data.provincia} / ${data.distrito}`;
    }
    this._saveDebounced();
    this._renderFormValues();
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
    const creating = this._isCreatingPuntoEntrega();
    return {
      pedido: {
        fecha: this.state.vFechaPedido,
        hora: this.state.vHoraPedido,
        clienteId: this.state.vClienteSelected,
        productos: this.state.vProdPedidos,
      },
      factura: {
        fecha_emision: this.state.vFecha_emision,
        codigo_base: this.state.vCodigo_base,
        codigo_packing: this.state.vCodigo_packing,
        productos: products,
      },
      entrega: {
        codigo_cliente_numrecibe: this.state.vCodigo_Cliente_Numrecibe,
        crear_punto_entrega: creating,
        punto_entrega: creating ? "" : this.state.vPuntoEntrega,
        cod_dep: this.state.vCod_Dep,
        cod_prov: this.state.vCod_Prov,
        cod_dist: this.state.vCod_Dist,
        codigo_puntoentrega: creating ? "" : this.state.vCodigo_puntoentrega,
        region_entrega: this.state.vRegion_Entrega,
        direccion_linea: this.state.vDireccion_linea,
        referencia: this.state.vReferencia,
        destinatario_nombre: this.state.vDestinatario_nombre,
        destinatario_dni: this.state.vDestinatario_dni,
        agencia: this.state.vAgencia,
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
