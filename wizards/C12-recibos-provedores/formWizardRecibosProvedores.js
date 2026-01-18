const STORAGE_KEY = "formWizard:recibos-provedores:v1";

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
      proveedores: [],
    };

    this.state = {
      vFecha: "",
      vTipo_documento_compra: "RC",
      vNum_documento_compra: "",
      vCodigo_provedor: "",
    };

    this.el = {
      form: document.getElementById("wizardForm"),
      steps: Array.from(document.querySelectorAll(".wizard-step")),
      btnPrev: document.getElementById("btnPrev"),
      btnNext: document.getElementById("btnNext"),
      btnRegister: document.getElementById("btnRegister"),
      btnReset: document.getElementById("btnReset"),
      btnShowSql: document.getElementById("btnShowSql"),
      progressBar: document.getElementById("progressBar"),
      stepLabel: document.getElementById("stepLabel"),
      stepCounter: document.getElementById("stepCounter"),
      alertContainer: document.getElementById("alertContainer"),
      statusText: document.getElementById("statusText"),
      summary: document.getElementById("summary"),
      sqlLogsPanel: document.getElementById("sqlLogsPanel"),

      vFecha: document.getElementById("vFecha"),
      vTipo_documento_compra: document.getElementById("vTipo_documento_compra"),
      vNum_documento_compra: document.getElementById("vNum_documento_compra"),
      vCodigo_provedor: document.getElementById("vCodigo_provedor"),
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

    this.el.btnPrev?.addEventListener("click", () => this.prev());
    this.el.btnNext?.addEventListener("click", () => this.next());
    this.el.btnRegister?.addEventListener("click", () => this.registerReceipt());
    this.el.btnReset.addEventListener("click", () => this.reset());
    this.el.btnShowSql.addEventListener("click", () => this.showSqlLogs());

    document.getElementById("btnConfirmOk").addEventListener("click", () => this._confirmResolve?.(true));
    document.getElementById("confirmModal").addEventListener("hidden.bs.modal", () => this._confirmResolve?.(false));
  }

  _initDefaults() {
    if (!this.state.vFecha) this.state.vFecha = nowLocalDate();
    if (!this.state.vTipo_documento_compra) this.state.vTipo_documento_compra = "RC";
  }

  async _loadLookups() {
    const proveedores = await this._safeJson(this.endpoints.proveedores, []);
    this.lookups.proveedores = Array.isArray(proveedores) ? proveedores : [];

    this._fillSelect(this.el.vCodigo_provedor, this.lookups.proveedores, {
      placeholder: this.t(this.locale, "selectProvider"),
    });

    if (!this.state.vCodigo_provedor && this.lookups.proveedores[0]) {
      this.state.vCodigo_provedor = String(this.lookups.proveedores[0].id);
    }
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

  _fillSelect(select, items, { placeholder } = {}) {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = placeholder ?? "-";
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

  prev() {
    if (this.isBusy) return;
    this.step = Math.max(1, this.step - 1);
    this._renderAll();
  }

  next() {
    if (this.isBusy) return;
    const ok = this.validateStep(this.step);
    if (!ok) {
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
    this.state.vFecha = this.el.vFecha.value;
    this.state.vTipo_documento_compra = this.el.vTipo_documento_compra.value || "RC";
    this.state.vCodigo_provedor = this.el.vCodigo_provedor.value;
  }

  _markInvalid(input, isInvalid) {
    if (!input) return;
    input.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  _validateStep1() {
    let ok = true;
    const hasDate = Boolean(this.state.vFecha);
    const hasProveedor = Boolean(this.state.vCodigo_provedor);

    this._markInvalid(this.el.vFecha, !hasDate);
    this._markInvalid(this.el.vCodigo_provedor, !hasProveedor);

    if (!hasDate || !hasProveedor) ok = false;
    return ok;
  }

  _renderAll() {
    this._renderStep();
    this._renderProgress();
    this._renderFormValues();
    this._renderNav();
    this._renderSummary();
  }

  _renderStep() {
    for (const s of this.el.steps) {
      const n = Number(s.getAttribute("data-step"));
      s.classList.toggle("d-none", n !== this.step);
    }
    if (this.el.stepLabel) this.el.stepLabel.textContent = this.t(this.locale, `step${this.step}Title`);
    if (this.el.stepCounter) this.el.stepCounter.textContent = `${this.step}/${this.maxStep}`;
  }

  _renderProgress() {
    if (!this.el.progressBar) return;
    const pct = this.maxStep <= 1 ? 100 : Math.round(((this.step - 1) / (this.maxStep - 1)) * 100);
    this.el.progressBar.style.width = `${pct}%`;
    this.el.progressBar.textContent = pct >= 15 ? `${pct}%` : "";
  }

  _renderFormValues() {
    this.el.vFecha.value = this.state.vFecha || nowLocalDate();
    this.el.vTipo_documento_compra.value = this.state.vTipo_documento_compra || "RC";
    this.el.vNum_documento_compra.value = this.state.vNum_documento_compra || this.t(this.locale, "auto");

    if (this.el.vCodigo_provedor.options.length) {
      this.el.vCodigo_provedor.value = this.state.vCodigo_provedor || "";
    }
  }

  _renderNav() {
    const blocked = this.isBusy || !this.dbReady;
    if (this.el.btnPrev) this.el.btnPrev.disabled = blocked || this.step === 1;
    if (this.el.btnNext) {
      this.el.btnNext.classList.toggle("d-none", this.step === this.maxStep);
      this.el.btnNext.disabled = blocked || this.step === this.maxStep;
    }
    if (this.el.btnRegister) this.el.btnRegister.disabled = blocked;
  }

  _renderSummary() {
    if (!this.el.summary) return;
    const providerName =
      this.lookups.proveedores.find((p) => String(p.id) === String(this.state.vCodigo_provedor))?.name || "-";

    this.el.summary.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <div class="p-3 rounded border bg-body">
            <div class="text-secondary small">${escapeHtml(this.t(this.locale, "title"))}</div>
            <div class="d-flex justify-content-between mt-2">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "paymentDate"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vFecha || ""))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "docNumber"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vNum_documento_compra || this.t(this.locale, "auto")))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "docType"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vTipo_documento_compra || "RC"))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "provider"))}</span>
              <span class="kpi">${escapeHtml(String(providerName || ""))}</span>
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
      vFecha: nowLocalDate(),
      vTipo_documento_compra: "RC",
      vNum_documento_compra: "",
      vCodigo_provedor: "",
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

  async registerReceipt() {
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
      const payload = this._buildReciboPayload();
      const res = await fetch(this.endpoints.register, {
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
      if (out?.num_documento_compra) {
        this.state.vNum_documento_compra = String(out.num_documento_compra);
        this.el.vNum_documento_compra.value = this.state.vNum_documento_compra;
      }
      this._setStatus(this.t(this.locale, "registerOk"));
      this._showAlert("success", this.t(this.locale, "registerOk"));
    } catch (e) {
      this._setStatus(`${this.t(this.locale, "error")}: ${e?.message || e}`);
      this._showAlert("danger", `${this.t(this.locale, "error")}: ${e?.message || e}`);
    } finally {
      this._setBusy(false);
    }
  }

  _buildReciboPayload() {
    return {
      recibo: {
        vFecha: this.state.vFecha,
        vTipo_documento_compra: this.state.vTipo_documento_compra || "RC",
        vCodigo_provedor: this.state.vCodigo_provedor,
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
