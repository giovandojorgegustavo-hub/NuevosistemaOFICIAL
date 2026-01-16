const STORAGE_KEY = "formWizard:nota-credito:v1";

const RE = {
  productId: /^[0-9]{1,12}$/,
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

export class FormWizard {
  constructor({ locale, t, endpoints }) {
    this.locale = locale;
    this.t = t;
    this.endpoints = endpoints;

    this.step = 1;
    this.maxStep = 1;
    this.isBusy = false;
    this.dbReady = false;

    this.lookups = {
      clients: [],
      bases: [],
      products: [],
    };
    this.productsById = new Map();

    this.state = {
      vFecha_emision: "",
      vCodigo_cliente: "",
      vTipo_Documento: "NC",
      vCodigo_base: "",
      vProdNotaCredito: [],
      vNumero_documento: "",
    };

    this.el = {
      form: document.getElementById("wizardForm"),
      steps: Array.from(document.querySelectorAll(".wizard-step")),
      btnPrev: document.getElementById("btnPrev"),
      btnNext: document.getElementById("btnNext"),
      btnEmit: document.getElementById("btnEmit"),
      btnReset: document.getElementById("btnReset"),
      btnShowSql: document.getElementById("btnShowSql"),
      btnAddProd: document.getElementById("btnAddProd"),
      progressBar: document.getElementById("progressBar"),
      stepLabel: document.getElementById("stepLabel"),
      stepCounter: document.getElementById("stepCounter"),
      alertContainer: document.getElementById("alertContainer"),
      statusText: document.getElementById("statusText"),
      sqlLogsPanel: document.getElementById("sqlLogsPanel"),
      gridContainer: document.getElementById("gridContainer"),
      gridTable: document.getElementById("tblProdNotaCredito"),
      tblProdBody: document.querySelector("#tblProdNotaCredito tbody"),

      vFecha_emision: document.getElementById("vFecha_emision"),
      vCodigo_cliente: document.getElementById("vCodigo_cliente"),
      vTipo_Documento: document.getElementById("vTipo_Documento"),
      vCodigo_base: document.getElementById("vCodigo_base"),
      vNumero_documento: document.getElementById("vNumero_documento"),
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
    this._renderAll();
    this._toastInfo(this.t(this.locale, "restored"), { onlyIfRestored: true });
  }

  _bindEvents() {
    const onAnyChange = () => this._saveDebounced();
    this.el.form.addEventListener("input", onAnyChange);
    this.el.form.addEventListener("change", onAnyChange);

    this.el.btnPrev.addEventListener("click", () => this.prev());
    this.el.btnNext.addEventListener("click", () => this.next());
    this.el.btnEmit.addEventListener("click", () => this.emitCreditNote());
    this.el.btnReset.addEventListener("click", () => this.reset());
    this.el.btnShowSql.addEventListener("click", () => this.showSqlLogs());
    this.el.btnAddProd.addEventListener("click", () => this.addRow());

    this.el.tblProdBody.addEventListener("click", (e) => this._onTableClick(e));
    this.el.tblProdBody.addEventListener("input", (e) => this._onTableInput(e));
    this.el.tblProdBody.addEventListener("change", (e) => this._onTableInput(e));

    this.el.vCodigo_base.addEventListener("change", () => this._onBaseChange());

    document.getElementById("btnConfirmOk").addEventListener("click", () => this._confirmResolve?.(true));
    document.getElementById("confirmModal").addEventListener("hidden.bs.modal", () => this._confirmResolve?.(false));
  }

  _initDefaults() {
    if (!this.state.vFecha_emision) this.state.vFecha_emision = nowLocalDate();
    if (!this.state.vTipo_Documento) this.state.vTipo_Documento = "NC";
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

    this._fillSelect(this.el.vCodigo_cliente, this.lookups.clients, {
      placeholder: this.t(this.locale, "loading"),
    });
    this._fillSelect(this.el.vCodigo_base, this.lookups.bases, {
      placeholder: this.t(this.locale, "selectBase"),
      allowBlank: true,
    });

    if (!this.state.vCodigo_cliente && this.lookups.clients[0]) {
      this.state.vCodigo_cliente = String(this.lookups.clients[0].id);
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

  _onBaseChange() {
    this._pullFromDom();
    if (this.state.vCodigo_base && this.state.vProdNotaCredito.length === 0) {
      this.state.vProdNotaCredito = [this._blankRow()];
    }
    this._renderAll();
    this._saveDebounced();
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
    const input = e.target.closest("[data-index][data-field]");
    if (!input) return;
    const idx = Number(input.dataset.index);
    if (!Number.isFinite(idx)) return;
    const field = input.dataset.field;
    const row = this.state.vProdNotaCredito[idx];
    if (!row) return;
    if (field === "codigo_producto") {
      row.codigo_producto = String(input.value || "");
    } else if (field === "cantidad") {
      const num = Number(input.value);
      row.cantidad = Number.isFinite(num) ? num : 0;
    }
    this._saveDebounced();
  }

  addRow() {
    this.state.vProdNotaCredito.push(this._blankRow());
    this._renderTables();
    this._saveDebounced();
  }

  deleteRow(index) {
    this.state.vProdNotaCredito.splice(index, 1);
    if (this.state.vProdNotaCredito.length === 0 && this.state.vCodigo_base) {
      this.state.vProdNotaCredito.push(this._blankRow());
    }
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

  validateStep(step) {
    this._pullFromDom();
    if (step === 1) return this._validateStep1();
    return true;
  }

  _pullFromDom() {
    this.state.vFecha_emision = this.el.vFecha_emision.value;
    this.state.vCodigo_cliente = this.el.vCodigo_cliente.value;
    this.state.vTipo_Documento = this.el.vTipo_Documento.value;
    this.state.vCodigo_base = this.el.vCodigo_base.value;
  }

  _markInvalid(input, isInvalid) {
    if (!input) return;
    input.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  _validateProductRows(rows) {
    let ok = true;
    let any = false;
    for (const row of rows) {
      const hasAny = String(row.codigo_producto).trim();
      if (!hasAny) continue;
      any = true;
      if (!RE.productId.test(String(row.codigo_producto).trim())) ok = false;
      const qty = Number(row.cantidad);
      if (!Number.isFinite(qty) || qty <= 0) ok = false;
    }
    return ok && any;
  }

  _validateStep1() {
    let ok = true;
    const hasDate = Boolean(this.state.vFecha_emision);
    const hasClient = Boolean(this.state.vCodigo_cliente);
    const tipoOk = String(this.state.vTipo_Documento || "").toUpperCase() === "NC";

    this._markInvalid(this.el.vFecha_emision, !hasDate);
    this._markInvalid(this.el.vCodigo_cliente, !hasClient);
    this._markInvalid(this.el.vTipo_Documento, !tipoOk);

    if (!hasDate || !hasClient || !tipoOk) ok = false;

    let rowsOk = true;
    if (this.state.vCodigo_base) {
      rowsOk = this._validateProductRows(this.state.vProdNotaCredito);
      if (!rowsOk) ok = false;
    }

    this.el.gridTable.classList.toggle("grid-invalid", this.state.vCodigo_base && !rowsOk);
    return ok;
  }

  _renderAll() {
    this._renderStep();
    this._renderProgress();
    this._renderFormValues();
    this._renderTables();
    this._renderNav();
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
    const pct = this.maxStep <= 1 ? 100 : Math.round(((this.step - 1) / (this.maxStep - 1)) * 100);
    this.el.progressBar.style.width = `${pct}%`;
    this.el.progressBar.textContent = pct >= 15 ? `${pct}%` : "";
  }

  _renderFormValues() {
    this.el.vFecha_emision.value = this.state.vFecha_emision || nowLocalDate();
    if (this.el.vCodigo_cliente.options.length) this.el.vCodigo_cliente.value = this.state.vCodigo_cliente || "";
    this.el.vTipo_Documento.value = this.state.vTipo_Documento || "NC";
    if (this.el.vCodigo_base.options.length) this.el.vCodigo_base.value = this.state.vCodigo_base || "";
    this.el.vNumero_documento.value = this.state.vNumero_documento || "";
  }

  _renderTables() {
    const showGrid = Boolean(this.state.vCodigo_base);
    this.el.gridContainer.classList.toggle("d-none", !showGrid);
    if (!showGrid) return;
    if (this.state.vProdNotaCredito.length === 0) {
      this.state.vProdNotaCredito = [this._blankRow()];
    }
    this._renderTable(this.el.tblProdBody, this.state.vProdNotaCredito);
  }

  _renderTable(tbody, rows) {
    tbody.innerHTML = "";
    rows.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <select class="form-select form-select-sm" data-index="${idx}" data-field="codigo_producto">
            ${this._productOptionsHtml(row.codigo_producto)}
          </select>
        </td>
        <td>
          <input class="form-control form-control-sm" data-index="${idx}" data-field="cantidad" inputmode="decimal" value="${escapeHtml(
            String(row.cantidad ?? "")
          )}" />
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

  _renderNav() {
    const blocked = this.isBusy || !this.dbReady;
    this.el.btnPrev.disabled = blocked || this.step === 1;
    this.el.btnNext.disabled = blocked || this.step === this.maxStep;
    this.el.btnEmit.disabled = blocked;
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
      vFecha_emision: nowLocalDate(),
      vCodigo_cliente: "",
      vTipo_Documento: "NC",
      vCodigo_base: "",
      vProdNotaCredito: [],
      vNumero_documento: "",
    };
    this.step = 1;
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

  async emitCreditNote() {
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
      if (out?.numero_documento) {
        this.state.vNumero_documento = String(out.numero_documento);
        this.el.vNumero_documento.value = this.state.vNumero_documento;
      }
      this._setStatus(this.t(this.locale, "emitOk"));
      this._showAlert("success", this.t(this.locale, "emitOk"));
    } catch (e) {
      this._setStatus(`${this.t(this.locale, "error")}: ${e?.message || e}`);
      this._showAlert("danger", `${this.t(this.locale, "error")}: ${e?.message || e}`);
    } finally {
      this._setBusy(false);
    }
  }

  _buildPayload() {
    const rows = this.state.vProdNotaCredito.filter((r) => String(r.codigo_producto || "").trim());
    return {
      nota: {
        vFecha_emision: this.state.vFecha_emision,
        vCodigo_cliente: this.state.vCodigo_cliente,
        vTipo_Documento: this.state.vTipo_Documento,
        vCodigo_base: this.state.vCodigo_base || null,
        vProdNotaCredito: rows.map((r) => ({
          codigo_producto: r.codigo_producto,
          cantidad: r.cantidad,
        })),
      },
      locale: this.locale,
    };
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

  _blankRow() {
    return { codigo_producto: "", cantidad: "" };
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
