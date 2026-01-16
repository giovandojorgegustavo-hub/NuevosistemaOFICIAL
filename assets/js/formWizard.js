const STORAGE_KEY = "formWizard:viajes:v2";

const RE = {
  phone: /^[0-9+()\s-]{6,20}$/,
  number: /^[0-9]{1,12}$/,
  docNumber: /^[0-9]{1,20}$/,
  url: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/i,
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
    this.maxStep = 3;
    this.isBusy = false;
    this.dbReady = false;

    this.lookups = {
      bases: [],
      packings: [],
    };

    this.state = {
      vCodigo_viaje: "",
      vFechaViaje: "",
      Vnombre_motorizado: "",
      Vnumero_wsp: "",
      Vnum_llamadas: "",
      Vnum_yape: "",
      Vlink: "",
      Vobservacion: "",
      vBaseSelected: "",
      vViajeDetalle: [],
    };

    this.el = {
      form: document.getElementById("wizardForm"),
      steps: Array.from(document.querySelectorAll(".wizard-step")),
      btnPrev: document.getElementById("btnPrev"),
      btnNext: document.getElementById("btnNext"),
      btnRegister: document.getElementById("btnRegister"),
      btnDispatch: document.getElementById("btnDispatch"),
      btnReset: document.getElementById("btnReset"),
      btnShowSql: document.getElementById("btnShowSql"),
      progressBar: document.getElementById("progressBar"),
      stepLabel: document.getElementById("stepLabel"),
      stepCounter: document.getElementById("stepCounter"),
      alertContainer: document.getElementById("alertContainer"),
      statusText: document.getElementById("statusText"),
      summary: document.getElementById("summary"),
      sqlLogsPanel: document.getElementById("sqlLogsPanel"),

      vCodigo_viaje: document.getElementById("vCodigo_viaje"),
      vFechaViaje: document.getElementById("vFechaViaje"),
      Vnombre_motorizado: document.getElementById("Vnombre_motorizado"),
      Vnumero_wsp: document.getElementById("Vnumero_wsp"),
      Vnum_llamadas: document.getElementById("Vnum_llamadas"),
      Vnum_yape: document.getElementById("Vnum_yape"),
      Vlink: document.getElementById("Vlink"),
      Vobservacion: document.getElementById("Vobservacion"),
      vBaseSelected: document.getElementById("vBaseSelected"),

      btnAddDetalle: document.getElementById("btnAddDetalle"),
      tblViajeDetalleBody: document.querySelector("#tblViajeDetalle tbody"),
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
    this.el.btnRegister?.addEventListener("click", () => this.registerTrip());
    this.el.btnDispatch?.addEventListener("click", () => this.dispatchTrip());
    this.el.btnReset.addEventListener("click", () => this.reset());
    this.el.btnShowSql.addEventListener("click", () => this.showSqlLogs());

    this.el.btnAddDetalle.addEventListener("click", () => this.addRow());
    this.el.tblViajeDetalleBody.addEventListener("click", (e) => this._onTableClick(e));
    this.el.tblViajeDetalleBody.addEventListener("input", (e) => this._onTableInput(e));
    this.el.tblViajeDetalleBody.addEventListener("change", (e) => this._onTableInput(e));

    document.getElementById("btnConfirmOk").addEventListener("click", () => this._confirmResolve?.(true));
    document.getElementById("confirmModal").addEventListener("hidden.bs.modal", () => this._confirmResolve?.(false));
  }

  _initDefaults() {
    if (!this.state.vFechaViaje) this.state.vFechaViaje = nowLocalDate();
    if (this.state.vViajeDetalle.length === 0) this.state.vViajeDetalle = [this._blankDetailRow()];
  }

  async _loadLookups() {
    const [bases, packings] = await Promise.all([
      this._safeJson(this.endpoints.bases, []),
      this._safeJson(this.endpoints.packings, []),
    ]);
    this.lookups.bases = Array.isArray(bases) ? bases : [];
    this.lookups.packings = Array.isArray(packings) ? packings : [];

    this._fillSelect(this.el.vBaseSelected, this.lookups.bases, { placeholder: this.t(this.locale, "loading") });

    if (!this.state.vBaseSelected && this.lookups.bases[0]) {
      this.state.vBaseSelected = String(this.lookups.bases[0].id);
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

  _blankDetailRow() {
    return {
      numero_documento: "",
      codigo_packing: "",
    };
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

    const row = this.state.vViajeDetalle[index];
    if (!row) return;

    if (field === "numero_documento") {
      row.numero_documento = String(input.value || "");
    } else if (field === "codigo_packing") {
      row.codigo_packing = String(input.value || "");
    }

    this._saveDebounced();
  }

  addRow() {
    this.state.vViajeDetalle.push(this._blankDetailRow());
    this._renderTables();
    this._saveDebounced();
  }

  deleteRow(index) {
    this.state.vViajeDetalle.splice(index, 1);
    if (this.state.vViajeDetalle.length === 0) this.state.vViajeDetalle.push(this._blankDetailRow());
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
    if (step === 2) return this._validateStep2();
    if (step === 3) return true;
    return true;
  }

  _pullFromDom() {
    this.state.vFechaViaje = this.el.vFechaViaje.value;
    this.state.Vnombre_motorizado = this.el.Vnombre_motorizado.value;
    this.state.Vnumero_wsp = this.el.Vnumero_wsp.value;
    this.state.Vnum_llamadas = this.el.Vnum_llamadas.value;
    this.state.Vnum_yape = this.el.Vnum_yape.value;
    this.state.Vlink = this.el.Vlink.value;
    this.state.Vobservacion = this.el.Vobservacion.value;
    this.state.vBaseSelected = this.el.vBaseSelected.value;
  }

  _markInvalid(input, isInvalid) {
    if (!input) return;
    input.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  _markTableInvalid(index, field, isInvalid) {
    const input = this.el.tblViajeDetalleBody.querySelector(`[data-index="${index}"][data-field="${field}"]`);
    if (!input) return;
    input.classList.toggle("is-invalid", Boolean(isInvalid));
  }

  _validateStep1() {
    let ok = true;
    const hasDate = Boolean(this.state.vFechaViaje);
    const hasBase = Boolean(this.state.vBaseSelected);
    const hasDriver = Boolean(String(this.state.Vnombre_motorizado || "").trim());

    this._markInvalid(this.el.vFechaViaje, !hasDate);
    this._markInvalid(this.el.vBaseSelected, !hasBase);
    this._markInvalid(this.el.Vnombre_motorizado, !hasDriver);

    if (!hasDate || !hasBase || !hasDriver) ok = false;

    const wsp = String(this.state.Vnumero_wsp || "").trim();
    const calls = String(this.state.Vnum_llamadas || "").trim();
    const yape = String(this.state.Vnum_yape || "").trim();
    const link = String(this.state.Vlink || "").trim();

    const wspOk = !wsp || RE.phone.test(wsp);
    const callsOk = !calls || RE.number.test(calls);
    const yapeOk = !yape || RE.number.test(yape);
    const linkOk = !link || RE.url.test(link);

    this._markInvalid(this.el.Vnumero_wsp, !wspOk);
    this._markInvalid(this.el.Vnum_llamadas, !callsOk);
    this._markInvalid(this.el.Vnum_yape, !yapeOk);
    this._markInvalid(this.el.Vlink, !linkOk);

    if (!wspOk || !callsOk || !yapeOk || !linkOk) ok = false;
    return ok;
  }

  _validateStep2() {
    let ok = true;
    let any = false;
    const validPackingIds = new Set(this.lookups.packings.map((p) => String(p.id)));

    this.state.vViajeDetalle.forEach((row, idx) => {
      const doc = String(row.numero_documento || "").trim();
      const packing = String(row.codigo_packing || "").trim();
      const hasAny = doc || packing;
      if (!hasAny) {
        this._markTableInvalid(idx, "numero_documento", false);
        this._markTableInvalid(idx, "codigo_packing", false);
        return;
      }
      any = true;

      const docOk = RE.docNumber.test(doc);
      const packOk = validPackingIds.has(packing);

      this._markTableInvalid(idx, "numero_documento", !docOk);
      this._markTableInvalid(idx, "codigo_packing", !packOk);

      if (!docOk || !packOk) ok = false;
    });

    if (!any) ok = false;
    return ok;
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
    this.el.vCodigo_viaje.value = this.state.vCodigo_viaje || this.t(this.locale, "auto");
    this.el.vFechaViaje.value = this.state.vFechaViaje || nowLocalDate();

    if (this.el.vBaseSelected.options.length) {
      this.el.vBaseSelected.value = this.state.vBaseSelected || "";
    }

    this.el.Vnombre_motorizado.value = this.state.Vnombre_motorizado || "";
    this.el.Vnumero_wsp.value = this.state.Vnumero_wsp || "";
    this.el.Vnum_llamadas.value = this.state.Vnum_llamadas || "";
    this.el.Vnum_yape.value = this.state.Vnum_yape || "";
    this.el.Vlink.value = this.state.Vlink || "";
    this.el.Vobservacion.value = this.state.Vobservacion || "";
  }

  _renderTables() {
    this._renderDetailTable();
  }

  _renderDetailTable() {
    this.el.tblViajeDetalleBody.innerHTML = "";
    this.state.vViajeDetalle.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <input class="form-control form-control-sm" data-index="${idx}" data-field="numero_documento" value="${escapeHtml(
        String(row.numero_documento ?? "")
      )}" />
        </td>
        <td>
          <select class="form-select form-select-sm" data-index="${idx}" data-field="codigo_packing">
            ${this._packingOptionsHtml(row.codigo_packing)}
          </select>
        </td>
        <td class="text-end">
          <button type="button" class="btn btn-outline-danger btn-sm" data-action="del" data-index="${idx}" aria-label="Delete">
            ×
          </button>
        </td>
      `;
      this.el.tblViajeDetalleBody.appendChild(tr);
    });
  }

  _packingOptionsHtml(selectedId) {
    const selected = String(selectedId ?? "");
    const placeholder = escapeHtml(this.t(this.locale, "selectPacking"));
    const rows = this.lookups.packings || [];
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
    if (this.el.btnRegister) this.el.btnRegister.disabled = blocked || this.step !== this.maxStep;
    if (this.el.btnDispatch) this.el.btnDispatch.disabled = blocked || this.step !== this.maxStep;
  }

  _renderSummary() {
    if (this.step !== 3) return;

    const baseName = this.lookups.bases.find((b) => String(b.id) === String(this.state.vBaseSelected))?.name || "—";
    const details = this.state.vViajeDetalle.filter(
      (r) => String(r.numero_documento).trim() || String(r.codigo_packing).trim()
    );

    const rows = details
      .map(
        (r) => `
          <tr>
            <td class="mono">${escapeHtml(String(r.numero_documento || ""))}</td>
            <td>${escapeHtml(String(r.codigo_packing || ""))}</td>
          </tr>
        `
      )
      .join("");

    this.el.summary.innerHTML = `
      <div class="row g-3">
        <div class="col-12 col-lg-5">
          <div class="p-3 rounded border bg-body">
            <div class="text-secondary small">${escapeHtml(this.t(this.locale, "summaryTrip"))}</div>
            <div class="d-flex justify-content-between mt-2">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "summaryDate"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vFechaViaje || ""))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "tripCode"))}</span>
              <span class="kpi mono">${escapeHtml(String(this.state.vCodigo_viaje || this.t(this.locale, "auto")))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "summaryDriver"))}</span>
              <span class="kpi">${escapeHtml(String(this.state.Vnombre_motorizado || ""))}</span>
            </div>
            <div class="d-flex justify-content-between mt-1">
              <span class="text-secondary">${escapeHtml(this.t(this.locale, "summaryBase"))}</span>
              <span class="kpi">${escapeHtml(String(baseName || ""))}</span>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-7">
          <div class="p-3 rounded border bg-body">
            <div class="text-secondary small">${escapeHtml(this.t(this.locale, "summaryDocs"))}</div>
            <div class="table-responsive mt-2">
              <table class="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>${escapeHtml(this.t(this.locale, "docNumber"))}</th>
                    <th>${escapeHtml(this.t(this.locale, "packing"))}</th>
                  </tr>
                </thead>
                <tbody>${rows || `<tr><td colspan="2" class="text-secondary small">—</td></tr>`}</tbody>
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
      vCodigo_viaje: "",
      vFechaViaje: nowLocalDate(),
      Vnombre_motorizado: "",
      Vnumero_wsp: "",
      Vnum_llamadas: "",
      Vnum_yape: "",
      Vlink: "",
      Vobservacion: "",
      vBaseSelected: "",
      vViajeDetalle: [this._blankDetailRow()],
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

  async registerTrip() {
    await this._submitTrip({ action: "register", successKey: "registerOk" });
  }

  async dispatchTrip() {
    await this._submitTrip({ action: "dispatch", successKey: "dispatchOk" });
  }

  async _submitTrip({ action, successKey }) {
    this._clearAlert();
    const allOk = [1, 2].every((s) => this.validateStep(s));
    if (!allOk) {
      this._showAlert("danger", this.t(this.locale, "validationError"));
      return;
    }

    const ok = await this._confirm(this.t(this.locale, "confirmBody"));
    if (!ok) return;

    this._setBusy(true);
    try {
      this._setStatus(this.t(this.locale, "loading"));
      const payload = this._buildTripPayload();
      const endpoint = action === "dispatch" ? this.endpoints.dispatch : this.endpoints.register;
      const res = await fetch(endpoint, {
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
      if (out?.codigo_viaje) {
        this.state.vCodigo_viaje = String(out.codigo_viaje);
        this.el.vCodigo_viaje.value = this.state.vCodigo_viaje;
      }
      this._setStatus(this.t(this.locale, successKey));
      this._showAlert("success", this.t(this.locale, successKey));
    } catch (e) {
      this._setStatus(`${this.t(this.locale, "error")}: ${e?.message || e}`);
      this._showAlert("danger", `${this.t(this.locale, "error")}: ${e?.message || e}`);
    } finally {
      this._setBusy(false);
    }
  }

  _buildTripPayload() {
    const detalles = this.state.vViajeDetalle
      .filter((r) => String(r.numero_documento).trim() || String(r.codigo_packing).trim())
      .map((r) => ({
        numero_documento: String(r.numero_documento || "").trim(),
        codigo_packing: String(r.codigo_packing || "").trim(),
      }));

    return {
      viaje: {
        vCodigo_viaje: this.state.vCodigo_viaje || null,
        vFechaViaje: this.state.vFechaViaje,
        Vnombre_motorizado: this.state.Vnombre_motorizado,
        Vnumero_wsp: this.state.Vnumero_wsp,
        Vnum_llamadas: this.state.Vnum_llamadas,
        Vnum_yape: this.state.Vnum_yape,
        Vlink: this.state.Vlink,
        Vobservacion: this.state.Vobservacion,
        vBaseSelected: this.state.vBaseSelected,
      },
      detalles,
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
