class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.currentStep = 0;
    this.progressBar = document.getElementById('progressBar');
    this.nextBtn = document.getElementById('nextBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.loadingState = document.getElementById('loadingState');
    this.alertArea = document.getElementById('alertArea');
    this.statusHint = document.getElementById('statusHint');
    this.baseSelect = document.getElementById('baseSelect');
    this.codigoViajeInput = document.getElementById('codigoViaje');
    this.fechaViajeInput = document.getElementById('fechaViaje');
    this.nombreMotorizadoInput = document.getElementById('nombreMotorizado');
    this.linkInput = document.getElementById('link');
    this.numeroWspInput = document.getElementById('numeroWsp');
    this.numeroLlamadasInput = document.getElementById('numeroLlamadas');
    this.numeroYapeInput = document.getElementById('numeroYape');
    this.observacionInput = document.getElementById('observacion');
    this.paquetesBody = document.getElementById('paquetesBody');
    this.selectedCount = document.getElementById('selectedCount');
    this.summaryCard = document.getElementById('summaryCard');
    this.logContent = document.getElementById('logContent');
    this.logStatus = document.getElementById('logStatus');

    this.bases = [];
    this.selectedPaquetes = new Map();

    this.init();
  }

  init() {
    this.setLanguage();
    this.applyLanguage();
    this.updateSelectedCount();
    this.updateButtons();
    this.attachEvents();
    this.loadInitialData();
  }

  setLanguage() {
    const lang = (navigator.language || 'es').toLowerCase();
    this.langKey = lang.startsWith('es') ? 'es' : 'en';
    this.dict = translations[this.langKey];
    document.documentElement.lang = this.langKey;
  }

  applyLanguage() {
    const dict = this.dict;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
  }

  attachEvents() {
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.prevBtn.addEventListener('click', () => this.handlePrev());
    document.getElementById('refreshPaquetes').addEventListener('click', () => this.loadPaquetes());
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.loadLogs());

    [
      this.baseSelect,
      this.nombreMotorizadoInput,
      this.linkInput,
      this.numeroWspInput,
      this.numeroLlamadasInput,
      this.numeroYapeInput
    ].forEach((input) => {
      input.addEventListener('change', () => input.classList.remove('is-invalid'));
    });
  }

  setLoading(message) {
    if (!message) {
      this.loadingState.innerHTML = '';
      return;
    }
    this.loadingState.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>${message}`;
  }

  showAlert(type, message) {
    this.alertArea.innerHTML = `
      <div class="alert alert-${type} d-flex justify-content-between align-items-center" role="alert">
        <div>${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
  }

  clearAlert() {
    this.alertArea.innerHTML = '';
  }

  updateButtons() {
    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.textContent = this.currentStep === this.steps.length - 1 ? this.dict.save : this.dict.next;
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
  }

  goToStep(index) {
    this.steps[this.currentStep].classList.remove('active');
    this.currentStep = index;
    this.steps[this.currentStep].classList.add('active');
    this.updateButtons();
  }

  async handleNext() {
    const valid = this.validateStep();
    if (!valid) return;

    if (this.currentStep === this.steps.length - 1) {
      await this.saveViaje();
      return;
    }

    this.goToStep(this.currentStep + 1);
    if (this.currentStep === 1) {
      await this.loadPaquetes();
    }
    if (this.currentStep === 2) {
      this.renderSummary();
    }
  }

  handlePrev() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  validateStep() {
    this.clearAlert();

    if (this.currentStep === 0) {
      const nameRegex = /^[A-Za-z0-9\s'.-]{2,}$/;
      const linkRegex = /^(https?:\/\/|www\.)[^\s]+$/i;
      const phoneRegex = /^[0-9+()\s-]{6,20}$/;

      if (!this.baseSelect.value) {
        this.baseSelect.classList.add('is-invalid');
        this.showAlert('warning', this.dict.errors.base);
        return false;
      }
      if (!nameRegex.test(this.nombreMotorizadoInput.value.trim())) {
        this.nombreMotorizadoInput.classList.add('is-invalid');
        this.showAlert('warning', this.dict.errors.motorizado);
        return false;
      }
      if (!linkRegex.test(this.linkInput.value.trim())) {
        this.linkInput.classList.add('is-invalid');
        this.showAlert('warning', this.dict.errors.link);
        return false;
      }
      if (this.numeroWspInput.value && !phoneRegex.test(this.numeroWspInput.value.trim())) {
        this.numeroWspInput.classList.add('is-invalid');
        this.showAlert('warning', this.dict.errors.telefono);
        return false;
      }
      if (this.numeroLlamadasInput.value && !phoneRegex.test(this.numeroLlamadasInput.value.trim())) {
        this.numeroLlamadasInput.classList.add('is-invalid');
        this.showAlert('warning', this.dict.errors.telefono);
        return false;
      }
      if (this.numeroYapeInput.value && !phoneRegex.test(this.numeroYapeInput.value.trim())) {
        this.numeroYapeInput.classList.add('is-invalid');
        this.showAlert('warning', this.dict.errors.telefono);
        return false;
      }
      return true;
    }

    if (this.currentStep === 1) {
      if (this.selectedPaquetes.size === 0) {
        this.showAlert('warning', this.dict.errors.paquetes);
        return false;
      }
      return true;
    }

    if (this.currentStep === 2) {
      const confirm = document.getElementById('confirmCheck').checked;
      if (!confirm) {
        this.showAlert('warning', this.dict.errors.confirm);
        return false;
      }
      return true;
    }

    return true;
  }

  async fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  }

  async loadInitialData() {
    try {
      this.setLoading(this.dict.loadingInit);
      const [now, bases, next] = await Promise.all([
        this.fetchJson('/api/now'),
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/viajes/next')
      ]);
      this.bases = Array.isArray(bases) ? bases : [];
      this.codigoViajeInput.value = next.next || '';
      this.fechaViajeInput.value = `${now.fecha || ''} ${now.hora || ''}`.trim();
      this.renderBases();
      this.statusHint.textContent = this.dict.statusHint;
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.errors.init);
    } finally {
      this.setLoading('');
    }
  }

  renderBases() {
    const placeholder = `<option value="">${this.dict.select}</option>`;
    const options = this.bases.map((row) => {
      const codigo = row.codigo_base || row.Vcodigo_base || row.vcodigo_base || row.codigo || '';
      const nombre = row.descripcion || row.descripcion_base || row.vdescripcion || row.nombre || '';
      return `<option value="${codigo}">${codigo} - ${nombre}</option>`;
    });
    this.baseSelect.innerHTML = [placeholder, ...options].join('');
  }

  async loadPaquetes() {
    try {
      this.setLoading(this.dict.loadingPaquetes);
      const data = await this.fetchJson('/api/paquetes?estado=empacado');
      this.renderPaquetes(Array.isArray(data) ? data : []);
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.errors.paquetesLoad);
    } finally {
      this.setLoading('');
    }
  }

  renderPaquetes(paquetes) {
    this.paquetesBody.innerHTML = '';
    if (!Array.isArray(paquetes) || paquetes.length === 0) {
      this.paquetesBody.innerHTML = `<tr><td colspan="7" class="text-muted">${this.dict.emptyPaquetes}</td></tr>`;
      return;
    }

    paquetes.forEach((paquete) => {
      const codigo = paquete.codigo_paquete || paquete.vcodigo_paquete || '';
      const row = document.createElement('tr');
      row.dataset.codigo = codigo;
      row.innerHTML = `
        <td><input class="form-check-input" type="checkbox" /></td>
        <td>${codigo}</td>
        <td>${paquete.fecha_actualizado || paquete.vfecha || ''}</td>
        <td>${paquete.nombre_cliente || paquete.vnombre_cliente || ''}</td>
        <td>${paquete.num_cliente || paquete.vnum_cliente || ''}</td>
        <td>${paquete.concatenarpuntoentrega || paquete.vconcatenarpuntoentrega || ''}</td>
        <td>${paquete.concatenarnumrecibe || paquete.vconcatenarnumrecibe || ''}</td>
      `;
      const checkbox = row.querySelector('input');
      checkbox.addEventListener('change', () => this.togglePaquete(paquete, row, checkbox));
      row.addEventListener('click', (event) => {
        if (event.target.tagName.toLowerCase() === 'input') return;
        checkbox.checked = !checkbox.checked;
        this.togglePaquete(paquete, row, checkbox);
      });
      if (this.selectedPaquetes.has(codigo)) {
        checkbox.checked = true;
        row.classList.add('selected');
      }
      this.paquetesBody.appendChild(row);
    });
  }

  togglePaquete(paquete, row, checkbox) {
    const codigo = paquete.codigo_paquete || paquete.vcodigo_paquete || '';
    if (!codigo) return;

    if (checkbox.checked) {
      this.selectedPaquetes.set(codigo, {
        codigo_paquete: codigo,
        fecha: paquete.fecha_actualizado || paquete.vfecha || '',
        nombre_cliente: paquete.nombre_cliente || paquete.vnombre_cliente || '',
        num_cliente: paquete.num_cliente || paquete.vnum_cliente || '',
        entrega: paquete.concatenarpuntoentrega || paquete.vconcatenarpuntoentrega || '',
        recibe: paquete.concatenarnumrecibe || paquete.vconcatenarnumrecibe || ''
      });
      row.classList.add('selected');
    } else {
      this.selectedPaquetes.delete(codigo);
      row.classList.remove('selected');
    }

    this.updateSelectedCount();
  }

  updateSelectedCount() {
    this.selectedCount.textContent = `${this.selectedPaquetes.size} ${this.dict.selected}`;
  }

  renderSummary() {
    const baseText = this.baseSelect.options[this.baseSelect.selectedIndex]?.text || '-';
    const paquetes = Array.from(this.selectedPaquetes.values());

    const paquetesRows = paquetes
      .map((paquete) => {
        return `
          <tr>
            <td>${paquete.codigo_paquete}</td>
            <td>${paquete.nombre_cliente || '-'}</td>
            <td>${paquete.num_cliente || '-'}</td>
            <td>${paquete.entrega || '-'}</td>
          </tr>`;
      })
      .join('');

    this.summaryCard.innerHTML = `
      <div class="row g-3">
        <div class="col-md-4">
          <p class="text-muted mb-1">${this.dict.codigoViaje}</p>
          <p>${this.codigoViajeInput.value || '-'}</p>
        </div>
        <div class="col-md-4">
          <p class="text-muted mb-1">${this.dict.fecha}</p>
          <p>${this.fechaViajeInput.value || '-'}</p>
        </div>
        <div class="col-md-4">
          <p class="text-muted mb-1">${this.dict.base}</p>
          <p>${baseText}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.motorizado}</p>
          <p>${this.nombreMotorizadoInput.value || '-'}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.link}</p>
          <p>${this.linkInput.value || '-'}</p>
        </div>
        <div class="col-12">
          <p class="text-muted mb-1">${this.dict.observacion}</p>
          <p>${this.observacionInput.value || '-'}</p>
        </div>
      </div>
      <div class="table-responsive mt-3">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>${this.dict.codigo}</th>
              <th>${this.dict.cliente}</th>
              <th>${this.dict.telefono}</th>
              <th>${this.dict.entrega}</th>
            </tr>
          </thead>
          <tbody>
            ${paquetesRows || `<tr><td colspan="4" class="text-muted">${this.dict.emptyPaquetes}</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  buildPayload() {
    return {
      codigo_base: this.baseSelect.value,
      nombre_motorizado: this.nombreMotorizadoInput.value.trim(),
      numero_wsp: this.numeroWspInput.value.trim(),
      num_llamadas: this.numeroLlamadasInput.value.trim(),
      num_yape: this.numeroYapeInput.value.trim(),
      link: this.linkInput.value.trim(),
      observacion: this.observacionInput.value.trim(),
      paquetes: Array.from(this.selectedPaquetes.keys())
    };
  }

  async saveViaje() {
    try {
      this.setLoading(this.dict.saving);
      const payload = this.buildPayload();
      const response = await fetch('/api/viajes/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) {
        this.showAlert('danger', result.message || this.dict.errors.save);
        return;
      }
      this.showAlert('success', this.dict.success.replace('{id}', result.codigoviaje));
      await this.resetWizard();
    } catch (error) {
      this.showAlert('danger', this.dict.errors.save);
    } finally {
      this.setLoading('');
    }
  }

  async resetWizard() {
    this.selectedPaquetes.clear();
    this.updateSelectedCount();
    this.summaryCard.innerHTML = '';
    document.getElementById('confirmCheck').checked = false;
    this.baseSelect.value = '';
    this.nombreMotorizadoInput.value = '';
    this.linkInput.value = '';
    this.numeroWspInput.value = '';
    this.numeroLlamadasInput.value = '';
    this.numeroYapeInput.value = '';
    this.observacionInput.value = '';
    this.goToStep(0);
    await this.loadInitialData();
    await this.loadPaquetes();
  }

  async loadLogs() {
    try {
      this.logStatus.textContent = this.dict.loadingLogs;
      const data = await this.fetchJson('/api/logs/latest');
      this.logContent.textContent = data.content || '';
      this.logStatus.textContent = this.dict.logsReady;
    } catch (error) {
      this.logContent.textContent = error.message || this.dict.errors.logs;
      this.logStatus.textContent = this.dict.errors.logs;
    }
  }
}

const translations = {
  es: {
    tag: 'IaaS + PaaS Global',
    title: 'Asignar viajes',
    subtitle: 'Wizard multi-paso para coordinar viajes y paquetes en tiempo real.',
    status: 'Estado del flujo',
    statusHint: 'Completa los datos del viaje para iniciar.',
    viewLogs: 'Ver logs SQL',
    refresh: 'Actualizar paquetes',
    step1Title: '1. Datos del viaje',
    step1Subtitle: 'Registra la cabecera del viaje y la base operativa.',
    step2Title: '2. Detalle del viaje',
    step2Subtitle: 'Selecciona los paquetes empacados para asignarlos.',
    step3Title: '3. Confirmar y guardar',
    step3Subtitle: 'Verifica la informacion antes de asignar el viaje.',
    required: 'Campos obligatorios marcados',
    ready: 'Listo para asignar',
    codigoViaje: 'Codigo de viaje',
    fecha: 'Fecha/Hora',
    base: 'Base operativa',
    motorizado: 'Nombre motorizado',
    link: 'Link de seguimiento',
    wsp: 'Numero WhatsApp',
    llamadas: 'Numero llamadas',
    yape: 'Numero Yape',
    observacion: 'Observacion',
    codigo: 'Codigo',
    cliente: 'Cliente',
    telefono: 'Telefono',
    entrega: 'Punto entrega',
    recibe: 'Recibe',
    prev: 'Anterior',
    next: 'Siguiente',
    save: 'Guardar',
    confirm: 'Confirmo la operacion.',
    select: 'Seleccione...',
    selected: 'seleccionados',
    loadingInit: 'Cargando datos iniciales...',
    loadingPaquetes: 'Cargando paquetes empacados...',
    saving: 'Guardando asignacion...',
    logsTitle: 'SQL Logs (ultima ejecucion)',
    loadingLogs: 'Cargando logs...',
    logsReady: 'Listo',
    emptyPaquetes: 'No hay paquetes empacados disponibles.',
    success: 'Viaje asignado con codigo {id}.',
    errors: {
      base: 'Selecciona una base operativa.',
      motorizado: 'Nombre de motorizado invalido.',
      link: 'Link invalido. Usa http://, https:// o www.',
      telefono: 'Numero invalido. Usa solo digitos y simbolos basicos.',
      paquetes: 'Selecciona al menos un paquete empacado.',
      confirm: 'Confirma la operacion para continuar.',
      init: 'No se pudieron cargar los datos iniciales.',
      paquetesLoad: 'No se pudieron cargar los paquetes.',
      save: 'No se pudo guardar la asignacion.',
      logs: 'No se pudieron cargar los logs.'
    }
  },
  en: {
    tag: 'Global IaaS + PaaS',
    title: 'Assign trips',
    subtitle: 'Multi-step wizard to coordinate trips and packages in real time.',
    status: 'Flow status',
    statusHint: 'Complete trip data to start.',
    viewLogs: 'View SQL logs',
    refresh: 'Refresh packages',
    step1Title: '1. Trip data',
    step1Subtitle: 'Register the trip header and operating base.',
    step2Title: '2. Trip detail',
    step2Subtitle: 'Select packed packages to assign them.',
    step3Title: '3. Confirm and save',
    step3Subtitle: 'Review the information before assigning the trip.',
    required: 'Required fields highlighted',
    ready: 'Ready to assign',
    codigoViaje: 'Trip code',
    fecha: 'Date/Time',
    base: 'Operating base',
    motorizado: 'Driver name',
    link: 'Tracking link',
    wsp: 'WhatsApp number',
    llamadas: 'Call number',
    yape: 'Yape number',
    observacion: 'Observation',
    codigo: 'Code',
    cliente: 'Client',
    telefono: 'Phone',
    entrega: 'Delivery point',
    recibe: 'Receiver',
    prev: 'Previous',
    next: 'Next',
    save: 'Save',
    confirm: 'I confirm the operation.',
    select: 'Select...',
    selected: 'selected',
    loadingInit: 'Loading initial data...',
    loadingPaquetes: 'Loading packed packages...',
    saving: 'Saving assignment...',
    logsTitle: 'SQL Logs (latest run)',
    loadingLogs: 'Loading logs...',
    logsReady: 'Ready',
    emptyPaquetes: 'No packed packages available.',
    success: 'Trip assigned with code {id}.',
    errors: {
      base: 'Select an operating base.',
      motorizado: 'Invalid driver name.',
      link: 'Invalid link. Use http://, https:// or www.',
      telefono: 'Invalid number. Use digits and basic symbols only.',
      paquetes: 'Select at least one packed package.',
      confirm: 'Please confirm to continue.',
      init: 'Unable to load initial data.',
      paquetesLoad: 'Unable to load packages.',
      save: 'Unable to save assignment.',
      logs: 'Unable to load logs.'
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
