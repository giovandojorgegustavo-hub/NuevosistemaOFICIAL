const STORAGE_KEY = "formWizard:ajustes:v1";

const RE = {
  productId: /^[0-9]{1,12}$/,
  qty: /^\d+(\.\d{1,3})?$/,
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

function formatQty(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(3).replace(/\.000$/, "");
}

function formatDocNumber(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) return s.padStart(12, "0");
  return s;
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
      bases: [],
      products: [],
    };

    this.state = {
      vFecha: "",
      vTipo_documento: "AJU",
      vNum_documento: "",
      vCodigo_base: "",
      vDetalleAjuste: [],
    };

    this.el = {
      form: document.getElementById("wizardForm"),
      steps: Array.from(document.querySelectorAll(".wizard-step")),
      btnPrev: document.getElementById("btnPrev"),
      btnNext: document.getElementById("btnNext"),
      btnCrearAjuste: document.getElementById("btnCrearAjuste"),
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
      tblBody: document.querySelector("#tblDetalleAjuste tbody"),
      confirmBody: document.getElementById("confirmBody"),

      vFecha: document.getElementById("vFecha"),
      vTipo_documento: document.getElementById("vTipo_documento"),
      vNum_documento: document.getElementById("vNum_documento"),
      vCodigo_base: document.getElementById("vCodigo_base"),
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
    this.el.btnCrearAjuste.addEventListener("click", () => this.crearAjuste());
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
    if (!this.state.vTipo_documento) this.state.vTipo_documento = "AJU";
    if (!Array.isArray(this.state.vDetalleAjuste) || this.state.vDetalleAjuste.length === 0) {
      this.state.vDetalleAjuste = [this._blankRow()];
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
    const [bases, products] = await Promise.all([
      this._safeJson(this.endpoints.bases, []),
      this._safeJson(this.endpoints.products, []),
    ]);

    this.lookups.bases = Array.isArray(bases) ? bases : [];
    this.lookups.products = Array.isArray(products) ? products : [];

    this._fillSelect(this.el.vCodigo_base, this.lookups.bases, {
      placeholder: this.t(this.locale, "selectBase"),
    });

    if (!this.state.vCodigo_base && this.lookups.bases[0]) {
      this.state.vCodigo_base = String(this.lookups.bases[0].id);
    }
  }

  async _loadNextDocument() {
    if (this.state.vNum_documento) return;
    const out = await this._safeJson(`${this.endpoints.nextNum}?tipo=AJU`, null);
    if (out?.next_num) this.state.vNum_documento = String(out.next_num);
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
    this.el.btnCrearAjuste.disabled = blocked;
  }

  _renderForm() {
    this.el.vFecha.value = this.state.vFecha || "";
    this.el.vTipo_documento.value = this.state.vTipo_documento || "AJU";
    const docValue = this.state.vNum_documento ? formatDocNumber(this.state.vNum_documento) : "";
    this.el.vNum_documento.value = docValue || this.t(this.locale, "docAuto");
    this.el.vCodigo_base.value = this.state.vCodigo_base || "";
    this._renderTable();
  }

  _renderTable() {
    const tbody = this.el.tblBody;
    tbody.innerHTML = "";
    if (this.state.vDetalleAjuste.length === 0) return;

    this.state.vDetalleAjuste.forEach((row, idx) => {
      const tr = document.createElement("tr");
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
          <div class="invalid-feedback">${escapeHtml(this.t(this.locale, "invalidQty"))}</div>
        </td>
        <td class="text-end">
          <button type="button" class="btn btn-outline-danger btn-sm" data-action="del" data-index="${idx}">x</button>
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
    const base = this.lookups.bases.find((b) => String(b.id) === String(this.state.vCodigo_base));
    const totalQty = this.state.vDetalleAjuste.reduce((acc, row) => acc + Number(row.cantidad || 0), 0);
    const lines = this.state.vDetalleAjuste.length;
    const docNumber = this.state.vNum_documento ? formatDocNumber(this.state.vNum_documento) : this.t(this.locale, "docAuto");

    this.el.summary.innerHTML = `
      <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <div class="text-secondary small">${escapeHtml(this.t(this.locale, "summaryTitle"))}</div>
          <div class="fw-semibold">${escapeHtml(this.state.vFecha || "-")}</div>
        </div>
        <div class="text-end">
          <div class="text-secondary small">${escapeHtml(this.t(this.locale, "docNumber"))}</div>
          <div class="fw-semibold">${escapeHtml(docNumber)}</div>
        </div>
      </div>
      <div class="d-flex align-items-center justify-content-between">
        <div class="text-secondary small">${escapeHtml(this.t(this.locale, "base"))}</div>
        <div class="fw-semibold">${escapeHtml(base?.name || "-")}</div>
      </div>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <div class="text-secondary small">${escapeHtml(this.t(this.locale, "countLabel"))}</div>
        <div class="fw-semibold">${lines}</div>
      </div>
      <div class="d-flex align-items-center justify-content-between mt-2">
        <div class="text-secondary small">${escapeHtml(this.t(this.locale, "totalQtyLabel"))}</div>
        <div class="fw-semibold">${formatQty(totalQty)}</div>
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
    const row = this.state.vDetalleAjuste[idx];
    if (!row) return;

    if (field === "cantidad") {
      row.cantidad = e.target.value;
    } else if (field === "codigo_producto") {
      row.codigo_producto = e.target.value;
    }

    this._renderSummary();
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
    if (!message) return;
    this._showAlert("info", message);
    setTimeout(() => this._clearAlert(), 2200);
  }

  _setBusy(flag) {
    this.isBusy = flag;
    this._renderNav();
  }

  saveDraft() {
    const payload = {
      step: this.step,
      state: this.state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  restoreDraft({ silent } = {}) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (!silent) this._toastInfo(this.t(this.locale, "noDraft"));
      return;
    }
    try {
      const data = JSON.parse(raw);
      if (data?.state) {
        this.state = { ...this.state, ...data.state };
      }
      if (data?.step) this.step = Math.min(this.maxStep, Math.max(1, Number(data.step)));
      this._restoredOnce = true;
    } catch {
      // ignore invalid cache
    }
  }

  async reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = {
      vFecha: nowLocalDate(),
      vTipo_documento: "AJU",
      vNum_documento: "",
      vCodigo_base: "",
      vDetalleAjuste: [],
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
    if (!Array.isArray(this.state.vDetalleAjuste)) this.state.vDetalleAjuste = [];
    this.state.vDetalleAjuste.push(this._blankRow());
    this._renderTable();
    this._renderSummary();
    this._saveDebounced();
  }

  deleteRow(idx) {
    this.state.vDetalleAjuste.splice(idx, 1);
    this._renderTable();
    this._renderSummary();
    this._saveDebounced();
  }

  _blankRow() {
    return {
      codigo_producto: "",
      cantidad: "",
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

    const baseOk = Boolean(this.el.vCodigo_base.value);
    ok = this._setValidity(this.el.vCodigo_base, baseOk) && ok;

    return ok;
  }

  _validateDetalle() {
    const rows = this.state.vDetalleAjuste;
    if (!rows.length) {
      this._showAlert("danger", this.t(this.locale, "noRows"));
      return false;
    }

    let ok = true;
    rows.forEach((row, idx) => {
      const prodOk = RE.productId.test(String(row.codigo_producto || ""));
      const qtyOk = RE.qty.test(String(row.cantidad || "")) && Number(row.cantidad) > 0;
      ok = this._setRowValidity(idx, "codigo_producto", prodOk) && ok;
      ok = this._setRowValidity(idx, "cantidad", qtyOk) && ok;
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

  async crearAjuste() {
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
      const res = await fetch(this.endpoints.crearAjuste, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.error || "error");

      this.state.vNum_documento = String(out?.num_documento || this.state.vNum_documento);
      this._setStatus(this.t(this.locale, "adjustOk"));
      this._showAlert("success", this.t(this.locale, "adjustOk"));
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
    const detalle = this.state.vDetalleAjuste.map((row) => ({
      codigo_producto: Number(row.codigo_producto),
      cantidad: Number(row.cantidad),
    }));
    return {
      ajuste: {
        vFecha: this.state.vFecha,
        vCodigo_base: Number(this.state.vCodigo_base),
        vTipo_documento: "AJU",
      },
      detalle,
    };
  }

  _pullFromDom() {
    this.state.vFecha = this.el.vFecha.value;
    this.state.vCodigo_base = this.el.vCodigo_base.value;
    const docValue = this.el.vNum_documento.value;
    if (docValue !== this.t(this.locale, "docAuto")) {
      this.state.vNum_documento = docValue;
    }
    this.state.vTipo_documento = this.el.vTipo_documento.value || "AJU";
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
