const STORAGE_KEY = "formWizard:compras:v1";

const RE = {
  productId: /^[0-9]{1,12}$/,
  qty: /^\d+(\.\d{1,3})?$/,
  price: /^\d+(\.\d{1,2})?$/,
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export class FormWizard {
  constructor({ locale, t, endpoints }) {
    this.locale = locale;
    this.t = t;
    this.endpoints = endpoints;

    this.step = 1;
    this.maxStep = 2;
    this.isBusy = false;
    this.dbReady = false;
    this._restoredOnce = false;

    this.lookups = {
      proveedores: [],
      products: [],
    };

    this.state = {
      vFecha: "",
      vCodigo_provedor: "",
      vNum_documento_compra: "",
      vTipo_documento_compra: "FC",
      vDetalleCompra: [],
    };

    this.el = {
      form: document.getElementById("wizardForm"),
      steps: Array.from(document.querySelectorAll(".wizard-step")),
      btnPrev: document.getElementById("btnPrev"),
      btnNext: document.getElementById("btnNext"),
      btnFacturar: document.getElementById("btnFacturar"),
      btnReset: document.getElementById("btnReset"),
      btnShowSql: document.getElementById("btnShowSql"),
      btnAddDetalle: document.getElementById("btnAddDetalle"),
      progressBar: document.getElementById("progressBar"),
      stepLabel: document.getElementById("stepLabel"),
      stepCounter: document.getElementById("stepCounter"),
      alertContainer: document.getElementById("alertContainer"),
      statusText: document.getElementById("statusText"),
      sqlLogsPanel: document.getElementById("sqlLogsPanel"),
      summary: document.getElementById("summary"),
      gridTable: document.getElementById("tblDetalleCompra"),
      tblBody: document.querySelector("#tblDetalleCompra tbody"),
      confirmBody: document.getElementById("confirmBody"),

      vFecha: document.getElementById("vFecha"),
      vCodigo_provedor: document.getElementById("vCodigo_provedor"),
      vNum_documento_compra: document.getElementById("vNum_documento_compra"),
      vTipo_documento_compra: document.getElementById("vTipo_documento_compra"),
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
    await this._loadNextDocument();
    this._renderAll();
    this._toastInfo(this.t(this.locale, "restored"), { onlyIfRestored: true });
  }

  _bindEvents() {
    const onAnyChange = () => this._saveDebounced();
    this.el.form.addEventListener("input", onAnyChange);
    this.el.form.addEventListener("change", onAnyChange);

    this.el.btnPrev.addEventListener("click", () => this.prev());
    this.el.btnNext.addEventListener("click", () => this.next());
    this.el.btnFacturar.addEventListener("click", () => this.facturarCompra());
    this.el.btnReset.addEventListener("click", () => this.reset());
    this.el.btnShowSql.addEventListener("click", () => this.showSqlLogs());
    this.el.btnAddDetalle.addEventListener("click", () => this.addRow());

    this.el.tblBody.addEventListener("click", (e) => this._onTableClick(e));
    this.el.tblBody.addEventListener("input", (e) => this._onTableInput(e));
    this.el.tblBody.addEventListener("change", (e) => this._onTableInput(e));

    document.getElementById("btnConfirmOk").addEventListener("click", () => this._confirmResolve?.(true));
    document.getElementById("confirmModal").addEventListener("hidden.bs.modal", () => this._confirmResolve?.(false));
  }

  _initDefaults() {
    if (!this.state.vFecha) this.state.vFecha = nowLocalDate();
    if (!this.state.vTipo_documento_compra) this.state.vTipo_documento_compra = "FC";
    if (!Array.isArray(this.state.vDetalleCompra) || this.state.vDetalleCompra.length === 0) {
      this.state.vDetalleCompra = [this._blankRow()];
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

  async _loadLookups() {
    const [proveedores, products] = await Promise.all([
      this._safeJson(this.endpoints.proveedores, []),
      this._safeJson(this.endpoints.products, []),
    ]);

    this.lookups.proveedores = Array.isArray(proveedores) ? proveedores : [];
    this.lookups.products = Array.isArray(products) ? products : [];

    this._fillSelect(this.el.vCodigo_provedor, this.lookups.proveedores, {
      placeholder: this.t(this.locale, "selectProvider"),
    });

    if (!this.state.vCodigo_provedor && this.lookups.proveedores[0]) {
      this.state.vCodigo_provedor = String(this.lookups.proveedores[0].id);
    }
  }

  async _loadNextDocument() {
    if (this.state.vNum_documento_compra) return;
    const out = await this._safeJson(`${this.endpoints.nextNum}?tipo=FC`, null);
    if (out?.next_num) this.state.vNum_documento_compra = String(out.next_num);
  }

  _fillSelect(select, items, { placeholder, allowBlank } = {}) {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder ?? "—";
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

  _renderAll() {
    this._renderSteps();
    this._renderNav();
    this._renderForm();
    this._renderSummary();
  }

  _renderSteps() {
    this.el.steps.forEach((stepEl) => {
      const stepNum = Number(stepEl.dataset.step || 0);
      stepEl.classList.toggle("d-none", stepNum !== this.step);
    });

    const label = this.locale === "es" ? `Paso ${this.step}` : `Step ${this.step}`;
    this.el.stepLabel.textContent = label;
    this.el.stepCounter.textContent = `${this.step}/${this.maxStep}`;

    const progress = Math.round((this.step / this.maxStep) * 100);
    this.el.progressBar.style.width = `${progress}%`;
  }

  _renderNav() {
    const blocked = this.isBusy || !this.dbReady;
    this.el.btnPrev.disabled = blocked || this.step === 1;
    this.el.btnNext.disabled = blocked || this.step === this.maxStep;
    if (this.el.btnFacturar) this.el.btnFacturar.disabled = blocked;
  }

  _renderForm() {
    this.el.vFecha.value = this.state.vFecha || "";
    this.el.vCodigo_provedor.value = this.state.vCodigo_provedor || "";
    this.el.vNum_documento_compra.value = this.state.vNum_documento_compra || this.t(this.locale, "docAuto");
    this.el.vTipo_documento_compra.value = this.state.vTipo_documento_compra || "FC";

    this._renderTable();
  }

  _renderTable() {
    const tbody = this.el.tblBody;
    tbody.innerHTML = "";

    if (this.state.vDetalleCompra.length === 0) {
      return;
    }

    this.state.vDetalleCompra.forEach((row, idx) => {
      const tr = document.createElement("tr");
      const lineTotal = this._lineTotal(row);
      tr.innerHTML = `
        <td>
          <select class="form-select form-select-sm" data-field="codigo_producto" data-index="${idx}">
            ${this._productOptionsHtml(row.codigo_producto)}
          </select>
        </td>
        <td>
          <input
            class="form-control form-control-sm"
            data-field="cantidad"
            data-index="${idx}"
            inputmode="decimal"
            value="${escapeHtml(row.cantidad ?? "")}" />
        </td>
        <td>
          <input
            class="form-control form-control-sm"
            data-field="saldo"
            data-index="${idx}"
            inputmode="decimal"
            value="${escapeHtml(row.saldo ?? "")}" />
        </td>
        <td>
          <input
            class="form-control form-control-sm"
            data-field="precio_compra"
            data-index="${idx}"
            inputmode="decimal"
            value="${escapeHtml(row.precio_compra ?? "")}" />
        </td>
        <td class="text-end">
          <span class="js-line-total" data-index="${idx}">${formatMoney(lineTotal)}</span>
        </td>
        <td class="text-end">
          <button type="button" class="btn btn-outline-danger btn-sm" data-action="del" data-index="${idx}">
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

  _renderSummary() {
    if (!this.el.summary) return;
    const provider = this.lookups.proveedores.find((p) => String(p.id) === String(this.state.vCodigo_provedor));
    const total = this.state.vDetalleCompra.reduce((acc, row) => acc + this._lineTotal(row), 0);
    const lines = this.state.vDetalleCompra.length;
    const docNumber = this.state.vNum_documento_compra || this.t(this.locale, "docAuto");

    this.el.summary.innerHTML = `
      <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <div class="text-secondary small">${escapeHtml(this.t(this.locale, "summaryTitle"))}</div>
          <div class="fw-semibold">${escapeHtml(provider?.name || "-")}</div>
          <div class="text-secondary small">${escapeHtml(this.state.vFecha || "-")}</div>
        </div>
        <div class="text-end">
          <div class="text-secondary small">${escapeHtml(this.t(this.locale, "docNumber"))}</div>
          <div class="fw-semibold">${escapeHtml(docNumber)}</div>
        </div>
      </div>
      <div class="d-flex align-items-center justify-content-between">
        <div class="text-secondary small">${escapeHtml(this.t(this.locale, "countLabel"))}</div>
        <div class="fw-semibold">${lines}</div>
      </div>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <div class="text-secondary small">${escapeHtml(this.t(this.locale, "totalLabel"))}</div>
        <div class="fw-semibold">${formatMoney(total)}</div>
      </div>
    `;
  }

  _onTableClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "del") {
      const idx = Number(btn.dataset.index);
      if (Number.isFinite(idx)) this.deleteRow(idx);
    }
  }

  _onTableInput(e) {
    const field = e.target.dataset.field;
    const idx = Number(e.target.dataset.index);
    if (!field || !Number.isFinite(idx)) return;
    const row = this.state.vDetalleCompra[idx];
    if (!row) return;

    if (field === "cantidad") {
      const prevCantidad = row.cantidad;
      row.cantidad = e.target.value;
      const saldoEdited = row.saldoEdited === true;
      if (!saldoEdited || row.saldo === "" || Number(row.saldo) === Number(prevCantidad)) {
        row.saldo = e.target.value;
        const saldoInput = this._findInput(idx, "saldo");
        if (saldoInput) saldoInput.value = row.saldo;
      }
    } else if (field === "saldo") {
      row.saldo = e.target.value;
      row.saldoEdited = true;
    } else if (field === "precio_compra") {
      row.precio_compra = e.target.value;
    } else if (field === "codigo_producto") {
      row.codigo_producto = e.target.value;
    }

    this._updateLineTotal(idx);
    this._renderSummary();
  }

  _updateLineTotal(idx) {
    const cell = this.el.tblBody.querySelector(`.js-line-total[data-index="${idx}"]`);
    if (!cell) return;
    const row = this.state.vDetalleCompra[idx];
    cell.textContent = formatMoney(this._lineTotal(row));
  }

  _lineTotal(row) {
    const qty = Number(row?.cantidad || 0);
    const price = Number(row?.precio_compra || 0);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
    return qty * price;
  }

  _setStatus(message) {
    this.el.statusText.textContent = message;
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

  _setBusy(isBusy) {
    this.isBusy = Boolean(isBusy);
    this._renderNav();
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
      vFecha: nowLocalDate(),
      vCodigo_provedor: "",
      vNum_documento_compra: "",
      vTipo_documento_compra: "FC",
      vDetalleCompra: [],
    };
    this.step = 1;
    await this._loadNextDocument();
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

  addRow() {
    if (!Array.isArray(this.state.vDetalleCompra)) this.state.vDetalleCompra = [];
    this.state.vDetalleCompra.push(this._blankRow());
    this._renderTable();
    this._renderSummary();
    this._saveDebounced();
  }

  deleteRow(idx) {
    this.state.vDetalleCompra.splice(idx, 1);
    this._renderTable();
    this._renderSummary();
    this._saveDebounced();
  }

  _blankRow() {
    return {
      codigo_producto: "",
      cantidad: "",
      saldo: "",
      precio_compra: "",
      saldoEdited: false,
    };
  }

  prev() {
    this.step = Math.max(1, this.step - 1);
    this._renderAll();
  }

  next() {
    this._clearAlert();
    if (!this.validateStep(1)) {
      this._showAlert("danger", this.t(this.locale, "validationError"));
      return;
    }
    this.step = Math.min(this.maxStep, this.step + 1);
    this._renderAll();
  }

  validateStep(step) {
    let ok = true;
    if (step === 1) {
      ok = this._validateHeader() && this._validateDetalle();
    }
    return ok;
  }

  _validateHeader() {
    let ok = true;
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(this.el.vFecha.value || "");
    ok = this._setValidity(this.el.vFecha, dateOk) && ok;

    const providerOk = Boolean(this.el.vCodigo_provedor.value);
    ok = this._setValidity(this.el.vCodigo_provedor, providerOk) && ok;

    return ok;
  }

  _validateDetalle() {
    const rows = this.state.vDetalleCompra;
    if (!rows.length) {
      this._showAlert("danger", this.t(this.locale, "noRows"));
      return false;
    }

    let ok = true;
    rows.forEach((row, idx) => {
      const prodOk = RE.productId.test(String(row.codigo_producto || ""));
      const qtyOk = RE.qty.test(String(row.cantidad || "")) && Number(row.cantidad) > 0;
      const saldoOk = RE.qty.test(String(row.saldo || "")) && Number(row.saldo) >= 0;
      const priceOk = RE.price.test(String(row.precio_compra || "")) && Number(row.precio_compra) >= 0;
      ok = this._setRowValidity(idx, "codigo_producto", prodOk) && ok;
      ok = this._setRowValidity(idx, "cantidad", qtyOk) && ok;
      ok = this._setRowValidity(idx, "saldo", saldoOk) && ok;
      ok = this._setRowValidity(idx, "precio_compra", priceOk) && ok;
    });
    return ok;
  }

  _setRowValidity(idx, field, isValid) {
    const input = this._findInput(idx, field);
    if (!input) return isValid;
    input.classList.toggle("is-invalid", !isValid);
    return isValid;
  }

  _findInput(idx, field) {
    return this.el.tblBody.querySelector(`[data-index="${idx}"][data-field="${field}"]`);
  }

  _setValidity(el, isValid) {
    el.classList.toggle("is-invalid", !isValid);
    return isValid;
  }

  async facturarCompra() {
    this._clearAlert();
    const allOk = [1].every((s) => this.validateStep(s));
    if (!allOk) {
      this._showAlert("danger", this.t(this.locale, "validationError"));
      return;
    }

    const ok = await this._confirm(this.t(this.locale, "confirmBody"));
    if (!ok) return;

    this._setBusy(true);
    try {
      this._setStatus(this.t(this.locale, "loading"));
      const payload = this._buildPayload();
      const res = await fetch(this.endpoints.facturar, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || "error");

      this.state.vNum_documento_compra = String(out?.num_documento_compra || this.state.vNum_documento_compra);
      this._setStatus(this.t(this.locale, "facturaOk"));
      this._showAlert("success", this.t(this.locale, "facturaOk"));
      localStorage.removeItem(STORAGE_KEY);
      this._renderAll();
    } catch (e) {
      this._setStatus(`${this.t(this.locale, "error")}: ${e?.message || e}`);
      this._showAlert("danger", `${this.t(this.locale, "error")}: ${e?.message || e}`);
    } finally {
      this._setBusy(false);
    }
  }

  _buildPayload() {
    this._pullFromDom();
    const detalle = this.state.vDetalleCompra.map((row) => ({
      codigo_producto: Number(row.codigo_producto),
      cantidad: Number(row.cantidad),
      saldo: Number(row.saldo),
      precio_compra: Number(row.precio_compra),
    }));
    return {
      compra: {
        vFecha: this.state.vFecha,
        vCodigo_provedor: Number(this.state.vCodigo_provedor),
        vTipo_documento_compra: "FC",
      },
      detalle,
    };
  }

  _pullFromDom() {
    this.state.vFecha = this.el.vFecha.value;
    this.state.vCodigo_provedor = this.el.vCodigo_provedor.value;
    const docValue = this.el.vNum_documento_compra.value;
    if (docValue !== this.t(this.locale, "docAuto")) {
      this.state.vNum_documento_compra = docValue;
    }
    this.state.vTipo_documento_compra = this.el.vTipo_documento_compra.value || "FC";
  }

  async _confirm(message) {
    if (this.el.confirmBody) this.el.confirmBody.textContent = message;
    this.confirmModal.show();
    return await new Promise((resolve) => {
      this._confirmResolve = resolve;
    });
  }

  async _safeJson(url, fallback) {
    try {
      const res = await fetch(url);
      if (!res.ok) return fallback;
      return await res.json();
    } catch {
      return fallback;
    }
  }
}
