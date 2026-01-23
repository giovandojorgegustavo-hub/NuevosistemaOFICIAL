const RE = {
  codigo: /^[A-Za-z0-9\-_.]{1,32}$/,
  estado: /^(robado|devuelto|empacado|llegado)$/,
};

export class FormWizard {
  constructor({ locale, t, endpoints }) {
    this.locale = locale;
    this.t = t;
    this.endpoints = endpoints;

    this.step = 0;
    this.maxStep = 2;
    this.isBusy = false;
    this.dbReady = false;

    this.state = {
      paquetes: [],
      selected: null,
      detalle: [],
      viaje: {},
      ordinal: null,
    };

    this.el = {
      form: document.getElementById("wizardForm"),
      steps: Array.from(document.querySelectorAll(".wizard-step")),
      progress: document.getElementById("wizardProgress"),
      stepBadges: Array.from(document.querySelectorAll(".step-badge")),
      errorAlert: document.getElementById("errorAlert"),
      successAlert: document.getElementById("successAlert"),
      prevBtn: document.getElementById("prevBtn"),
      nextBtn: document.getElementById("nextBtn"),
      submitBtn: document.getElementById("submitBtn"),
      refreshBtn: document.getElementById("refreshBtn"),
      refreshSpinner: document.querySelector("#refreshBtn .spinner-border"),
      submitSpinner: document.querySelector("#submitBtn .spinner-border"),
      statusDot: document.getElementById("statusDot"),
      statusText: document.getElementById("statusText"),
      paquetesBody: document.querySelector("#paquetesTable tbody"),
      detalleBody: document.querySelector("#detalleTable tbody"),
      btnShowLogs: document.getElementById("btnShowLogs"),
      logsBody: document.getElementById("logsBody"),
      logsModal: document.getElementById("logsModal"),
      viajeFecha: document.getElementById("viajeFecha"),
      viajeBase: document.getElementById("viajeBase"),
      viajeMotorizado: document.getElementById("viajeMotorizado"),
      viajeWsp: document.getElementById("viajeWsp"),
      viajeLlamadas: document.getElementById("viajeLlamadas"),
      viajeYape: document.getElementById("viajeYape"),
      viajeLink: document.getElementById("viajeLink"),
      viajeObs: document.getElementById("viajeObs"),
      puntoEntrega: document.getElementById("puntoEntrega"),
      numRecibe: document.getElementById("numRecibe"),
      summaryCodigo: document.getElementById("summaryCodigo"),
      summaryCliente: document.getElementById("summaryCliente"),
      summaryEntrega: document.getElementById("summaryEntrega"),
      summaryRecibe: document.getElementById("summaryRecibe"),
      summaryLink: document.getElementById("summaryLink"),
      summaryOrdinal: document.getElementById("summaryOrdinal"),
      estadoSelect: document.getElementById("estadoSelect"),
      confirmCheck: document.getElementById("confirmCheck"),
    };

    this.logsModal = new bootstrap.Modal(this.el.logsModal);
  }

  async init() {
    this._bindEvents();
    await this._checkDb();
    await this._loadPaquetes();
    this._renderStep();
  }

  _bindEvents() {
    this.el.prevBtn.addEventListener("click", () => this.prev());
    this.el.nextBtn.addEventListener("click", () => this.next());
    this.el.refreshBtn.addEventListener("click", () => this._loadPaquetes());
    this.el.form.addEventListener("submit", (e) => this._onSubmit(e));
    this.el.btnShowLogs.addEventListener("click", () => this._showLogs());
  }

  async _checkDb() {
    this._setStatus(this.t(this.locale, "dbConnecting"), "warning");
    const data = await this._safeJson(this.endpoints.dbStatus, { ok: false });
    if (data.ok) {
      this.dbReady = true;
      const name = data.database ? ` - ${data.database}` : "";
      this._setStatus(`${this.t(this.locale, "dbConnected")}${name}`, "success");
      return;
    }
    this.dbReady = false;
    this._setStatus(this.t(this.locale, "dbFailed"), "danger");
    this._showAlert("danger", data.error || this.t(this.locale, "dbFailed"));
  }

  async _loadPaquetes() {
    if (!this.dbReady) return;
    this._toggleLoading(true, this.el.refreshSpinner);
    const data = await this._safeJson(this.endpoints.paquetesStandby, []);
    this.state.paquetes = Array.isArray(data) ? data : [];
    this._renderPaquetes();
    this._toggleLoading(false, this.el.refreshSpinner);
  }

  _renderPaquetes() {
    this.el.paquetesBody.innerHTML = "";
    if (!this.state.paquetes.length) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" class="text-center text-muted">${this.t(this.locale, "emptyTable")}</td>`;
      this.el.paquetesBody.appendChild(row);
      return;
    }

    this.state.paquetes.forEach((pkg) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${pkg.Vcodigo_paquete ?? ""}</td>
        <td>${pkg.vfecha ?? ""}</td>
        <td>${pkg.vnombre_cliente ?? ""}</td>
        <td>${pkg.vnum_cliente ?? ""}</td>
        <td>${pkg.vconcatenarpuntoentrega ?? ""}</td>
        <td>${pkg.vconcatenarnumrecibe ?? ""}</td>
        <td><button class="btn btn-sm btn-primary" data-codigo="${pkg.Vcodigo_paquete}">${this.t(this.locale, "select")}</button></td>
      `;
      row.querySelector("button").addEventListener("click", () => this._selectPaquete(pkg));
      this.el.paquetesBody.appendChild(row);
    });
  }

  async _selectPaquete(pkg) {
    const codigo = String(pkg.Vcodigo_paquete || "");
    if (!RE.codigo.test(codigo)) {
      this._showAlert("danger", "CaEdigo invaelido.");
      return;
    }

    this._clearAlert();
    this._toggleLoading(true, this.el.refreshSpinner);
    const data = await this._safeJson(this.endpoints.paqueteDetalle(codigo), null);
    this._toggleLoading(false, this.el.refreshSpinner);

    if (!data) {
      this._showAlert("danger", "No se pudo cargar el detalle del paquete.");
      return;
    }

    this.state.selected = pkg;
    this.state.detalle = data.detalle || [];
    this.state.viaje = data.viaje || {};
    this.state.ordinal = data.ordinal ?? 1;

    this._fillDetalle();
    this._fillSummary();
    this.step = 1;
    this._renderStep();
  }

  _fillDetalle() {
    const viaje = this.state.viaje || {};
    this.el.viajeFecha.value = viaje.fecha ?? "";
    this.el.viajeBase.value = viaje.nombrebase ?? "";
    this.el.viajeMotorizado.value = viaje.nombre_motorizado ?? "";
    this.el.viajeWsp.value = viaje.numero_wsp ?? "";
    this.el.viajeLlamadas.value = viaje.num_llamadas ?? "";
    this.el.viajeYape.value = viaje.num_yape ?? "";
    this.el.viajeLink.value = viaje.link ?? "";
    this.el.viajeObs.value = viaje.observacion ?? "";
    this.el.puntoEntrega.value = this.state.selected?.vconcatenarpuntoentrega ?? "";
    this.el.numRecibe.value = this.state.selected?.vconcatenarnumrecibe ?? "";

    this.el.detalleBody.innerHTML = "";
    if (!this.state.detalle.length) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="2" class="text-center text-muted">${this.t(this.locale, "emptyTable")}</td>`;
      this.el.detalleBody.appendChild(row);
      return;
    }

    this.state.detalle.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.Vnombre_producto ?? ""}</td>
        <td>${item.vcantidad ?? ""}</td>
      `;
      this.el.detalleBody.appendChild(row);
    });
  }

  _fillSummary() {
    const pkg = this.state.selected || {};
    this.el.summaryCodigo.textContent = pkg.Vcodigo_paquete ?? "-";
    this.el.summaryCliente.textContent = pkg.vnombre_cliente ?? "-";
    this.el.summaryEntrega.textContent = pkg.vconcatenarpuntoentrega ?? "-";
    this.el.summaryRecibe.textContent = pkg.vconcatenarnumrecibe ?? "-";
    this.el.summaryLink.textContent = this.state.viaje?.link ?? "-";
    this.el.summaryOrdinal.textContent = this.state.ordinal ?? "-";
  }

  next() {
    if (this.step === 0 && !this.state.selected) {
      this._showAlert("danger", this.t(this.locale, "step1Help"));
      return;
    }
    if (this.step === 1 && !this.state.detalle.length) {
      this._showAlert("danger", "No hay detalle cargado.");
      return;
    }
    this.step = Math.min(this.step + 1, this.maxStep);
    this._renderStep();
  }

  prev() {
    this.step = Math.max(this.step - 1, 0);
    this._renderStep();
  }

  async _onSubmit(event) {
    event.preventDefault();
    this._clearAlert();
    if (!this._validateStep3()) return;

    const codigo = this.state.selected?.Vcodigo_paquete;
    const estado = this.el.estadoSelect.value;

    this._toggleLoading(true, this.el.submitSpinner, true);
    const res = await this._safeJson(this.endpoints.confirmar(codigo), null, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    this._toggleLoading(false, this.el.submitSpinner, true);

    if (res?.ok) {
      this._showAlert("success", this.t(this.locale, "successSave"));
      this.el.confirmCheck.checked = false;
      this.el.estadoSelect.value = "";
      await this._loadPaquetes();
      this.step = 0;
      this._renderStep();
      return;
    }

    this._showAlert("danger", res?.error || "Error al guardar.");
  }

  _validateStep3() {
    const estado = this.el.estadoSelect.value;
    const okEstado = RE.estado.test(estado);
    const okConfirm = this.el.confirmCheck.checked;

    this.el.estadoSelect.classList.toggle("is-invalid", !okEstado);
    this.el.confirmCheck.classList.toggle("is-invalid", !okConfirm);

    if (!okEstado || !okConfirm) {
      if (!okEstado) {
        this._showAlert("danger", this.t(this.locale, "errorState"));
      } else {
        this._showAlert("danger", this.t(this.locale, "errorConfirm"));
      }
      return false;
    }
    return true;
  }

  _renderStep() {
    this.el.steps.forEach((stepEl, idx) => {
      stepEl.classList.toggle("d-none", idx !== this.step);
    });
    this.el.stepBadges.forEach((badge, idx) => {
      badge.classList.toggle("active", idx <= this.step);
    });
    const progress = ((this.step + 1) / (this.maxStep + 1)) * 100;
    this.el.progress.style.width = `${progress}%`;

    this.el.prevBtn.classList.toggle("d-none", this.step === 0);
    this.el.nextBtn.classList.toggle("d-none", this.step === this.maxStep);
    this.el.submitBtn.classList.toggle("d-none", this.step !== this.maxStep);
  }

  _setStatus(text, tone) {
    this.el.statusText.textContent = text;
    const colors = {
      success: "var(--accent)",
      danger: "var(--danger)",
      warning: "var(--warning)",
    };
    this.el.statusDot.style.background = colors[tone] || "var(--accent)";
  }

  _showAlert(type, message) {
    const alertEl = type === "success" ? this.el.successAlert : this.el.errorAlert;
    const otherEl = type === "success" ? this.el.errorAlert : this.el.successAlert;
    otherEl.classList.add("d-none");
    alertEl.textContent = message;
    alertEl.classList.remove("d-none");
  }

  _clearAlert() {
    this.el.errorAlert.classList.add("d-none");
    this.el.successAlert.classList.add("d-none");
  }

  _toggleLoading(isLoading, spinner, lockActions = false) {
    spinner?.classList.toggle("d-none", !isLoading);
    if (lockActions) {
      this.el.submitBtn.disabled = isLoading;
      this.el.prevBtn.disabled = isLoading;
      this.el.nextBtn.disabled = isLoading;
    }
  }

  async _showLogs() {
    this.el.logsBody.innerHTML = `<p class="text-muted">${this.t(this.locale, "loading")}</p>`;
    this.logsModal.show();
    const data = await this._safeJson(this.endpoints.sqlLogs, []);
    if (!Array.isArray(data) || data.length === 0) {
      this.el.logsBody.innerHTML = `<p class="text-muted">${this.t(this.locale, "emptyLogs")}</p>`;
      return;
    }
    this.el.logsBody.innerHTML = data
      .map((entry) => `<div class="sql-log">[${entry.ts}] ${entry.level}: ${entry.message}</div>`)
      .join("");
  }

  async _safeJson(url, fallback, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) return fallback;
      return await res.json();
    } catch (err) {
      return fallback;
    }
  }
}
