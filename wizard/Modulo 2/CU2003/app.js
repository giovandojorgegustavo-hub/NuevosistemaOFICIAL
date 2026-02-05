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
    this.paquetesBody = document.getElementById('paquetesBody');
    this.selectedCount = document.getElementById('selectedCount');
    this.resumenViaje = document.getElementById('resumenViaje');
    this.resumenPaquetes = document.getElementById('resumenPaquetes');

    this.baseInput = document.getElementById('baseInput');
    this.codigoBase = document.getElementById('codigoBase');
    this.baseOptions = document.getElementById('baseOptions');
    this.codigoViaje = document.getElementById('codigoViaje');
    this.viajeExistente = document.getElementById('viajeExistente');
    this.fecha = document.getElementById('fecha');
    this.nombreMotorizado = document.getElementById('nombreMotorizado');
    this.link = document.getElementById('link');
    this.numeroWsp = document.getElementById('numeroWsp');
    this.numLlamadas = document.getElementById('numLlamadas');
    this.numYape = document.getElementById('numYape');
    this.observacion = document.getElementById('observacion');

    this.searchPaquetes = document.getElementById('searchPaquetes');

    this.paquetes = [];
    this.selectedPaquetes = new Map();
    this.baseMap = new Map();

    this.init();
  }

  init() {
    this.setLanguage();
    this.applyLanguage();
    this.updateButtons();
    this.attachEvents();
    this.loadBases();
    this.loadPaquetes();
    this.loadNextCodigoViaje();
    this.setFechaSistema();
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
    document.getElementById('viewLogs').addEventListener('click', () => this.openLogs());
    document.getElementById('selectAll').addEventListener('click', () => this.selectAllPaquetes());
    document.getElementById('clearSelection').addEventListener('click', () => this.clearSelection());
    this.searchPaquetes.addEventListener('input', () => this.renderPaquetes());
    this.baseInput.addEventListener('input', () => this.resolveBaseCode());
    this.viajeExistente.addEventListener('change', () => this.toggleViajeExistente());
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
    if (this.currentStep === 0) {
      this.nextBtn.disabled = false;
    } else if (this.currentStep === 1) {
      this.nextBtn.disabled = this.selectedPaquetes.size === 0;
    } else {
      this.nextBtn.disabled = false;
    }
    this.nextBtn.textContent = this.currentStep === this.steps.length - 1 ? this.dict.confirm : this.dict.next;
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
    this.clearAlert();
    const valid = this.validateStep();
    if (!valid) return;

    if (this.currentStep === this.steps.length - 1) {
      await this.saveViaje();
      return;
    }

    this.goToStep(this.currentStep + 1);
    if (this.currentStep === 2) {
      this.renderResumen();
    }
  }

  handlePrev() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  validateStep() {
    if (this.currentStep === 0) {
      const linkRegex = /^(https?:\/\/|www\.)[^\s]+$/i;
      if (!this.codigoBase.value) {
        this.showAlert('warning', this.dict.baseRequired);
        return false;
      }
      if (!this.nombreMotorizado.value.trim()) {
        this.showAlert('warning', this.dict.motorizadoRequired);
        return false;
      }
      if (!linkRegex.test(this.link.value.trim())) {
        this.showAlert('warning', this.dict.linkInvalid);
        return false;
      }
      if (this.viajeExistente.checked && !this.codigoViaje.value.trim()) {
        this.showAlert('warning', this.dict.codigoRequired);
        return false;
      }
      return true;
    }

    if (this.currentStep === 1) {
      if (this.selectedPaquetes.size === 0) {
        this.showAlert('warning', this.dict.paquetesRequired);
        return false;
      }
      return true;
    }

    return true;
  }

  setFechaSistema() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    this.fecha.value = local.toISOString().slice(0, 16);
  }

  toggleViajeExistente() {
    if (this.viajeExistente.checked) {
      this.codigoViaje.removeAttribute('readonly');
      this.codigoViaje.value = '';
      this.statusHint.textContent = this.dict.existingHint;
    } else {
      this.codigoViaje.setAttribute('readonly', 'readonly');
      this.loadNextCodigoViaje();
      this.statusHint.textContent = this.dict.statusHint;
    }
  }

  resolveBaseCode() {
    const input = this.baseInput.value.trim();
    if (!input) {
      this.codigoBase.value = '';
      return;
    }
    if (this.baseMap.has(input)) {
      this.codigoBase.value = input;
      return;
    }
    for (const [code, name] of this.baseMap.entries()) {
      const combo = `${code} - ${name}`;
      if (combo.toLowerCase() === input.toLowerCase()) {
        this.codigoBase.value = code;
        return;
      }
    }
    this.codigoBase.value = '';
  }

  async loadBases() {
    this.setLoading(this.dict.loadingBases);
    try {
      const response = await fetch('/api/bases');
      if (!response.ok) throw new Error('Error al cargar bases.');
      const data = await response.json();
      this.baseOptions.innerHTML = '';
      this.baseMap.clear();
      data.forEach((row) => {
        const code = row.codigo_base || row.vcodigo_base || row.Vcodigo_base;
        const name = row.nombre || row.vnombre || row.Vnombre;
        if (!code) return;
        this.baseMap.set(String(code), name || '');
        const option = document.createElement('option');
        option.value = `${code} - ${name || ''}`.trim();
        this.baseOptions.appendChild(option);
      });
    } catch (error) {
      this.showAlert('danger', this.dict.baseError);
    } finally {
      this.setLoading('');
    }
  }

  async loadPaquetes() {
    this.setLoading(this.dict.loadingPaquetes);
    try {
      const response = await fetch('/api/paquetes?estado=empacado');
      if (!response.ok) throw new Error('Error al cargar paquetes.');
      this.paquetes = await response.json();
      this.renderPaquetes();
    } catch (error) {
      this.showAlert('danger', this.dict.paquetesError);
    } finally {
      this.setLoading('');
    }
  }

  renderPaquetes() {
    const term = this.searchPaquetes.value.trim().toLowerCase();
    const rows = this.paquetes.filter((row) => {
      const searchable = [
        row.codigo_paquete,
        row.nombre_cliente,
        row.num_cliente,
        row.concatenarpuntoentrega,
        row.concatenarnumrecibe,
        row.fecha_actualizado
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(term);
    });

    this.paquetesBody.innerHTML = '';
    rows.forEach((row, index) => {
      const codigo = row.codigo_paquete || row.vcodigo_paquete || row.Vcodigo_paquete;
      const selected = this.selectedPaquetes.has(String(codigo));
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input class="form-check-input" type="checkbox" ${selected ? 'checked' : ''} data-codigo="${codigo}" data-index="${index}" />
        </td>
        <td>${codigo || ''}</td>
        <td>${row.fecha_actualizado || ''}</td>
        <td>${row.nombre_cliente || ''}</td>
        <td>${row.num_cliente || ''}</td>
        <td>${row.concatenarpuntoentrega || ''}</td>
        <td>${row.concatenarnumrecibe || ''}</td>
      `;
      tr.querySelector('input').addEventListener('change', (event) => this.togglePaquete(event, row, index));
      this.paquetesBody.appendChild(tr);
    });
    this.updateSelectedCount();
  }

  togglePaquete(event, row, index) {
    const codigo = String(row.codigo_paquete || row.vcodigo_paquete || row.Vcodigo_paquete);
    if (event.target.checked) {
      this.selectedPaquetes.set(codigo, { row, index });
    } else {
      this.selectedPaquetes.delete(codigo);
    }
    this.updateSelectedCount();
  }

  updateSelectedCount() {
    const count = this.selectedPaquetes.size;
    this.selectedCount.textContent = this.dict.selectedCount.replace('{count}', count);
    this.updateButtons();
  }

  selectAllPaquetes() {
    this.paquetes.forEach((row, index) => {
      const codigo = String(row.codigo_paquete || row.vcodigo_paquete || row.Vcodigo_paquete);
      this.selectedPaquetes.set(codigo, { row, index });
    });
    this.renderPaquetes();
  }

  clearSelection() {
    this.selectedPaquetes.clear();
    this.renderPaquetes();
  }

  async loadNextCodigoViaje() {
    try {
      const response = await fetch('/api/viajes/next-codigo');
      if (!response.ok) throw new Error('Error al cargar codigo de viaje.');
      const data = await response.json();
      this.codigoViaje.value = data.next || '';
    } catch (error) {
      this.showAlert('danger', this.dict.codigoError);
    }
  }

  renderResumen() {
    this.resumenViaje.innerHTML = `
      <li><strong>${this.dict.codigoViaje}:</strong> ${this.codigoViaje.value}</li>
      <li><strong>${this.dict.codigoBase}:</strong> ${this.codigoBase.value}</li>
      <li><strong>${this.dict.motorizado}:</strong> ${this.nombreMotorizado.value}</li>
      <li><strong>${this.dict.link}:</strong> ${this.link.value}</li>
      <li><strong>${this.dict.fecha}:</strong> ${this.fecha.value}</li>
    `;

    this.resumenPaquetes.innerHTML = '';
    Array.from(this.selectedPaquetes.values()).forEach(({ row }) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.codigo_paquete || ''}</td>
        <td>${row.nombre_cliente || ''}</td>
        <td>${row.concatenarpuntoentrega || ''}</td>
      `;
      this.resumenPaquetes.appendChild(tr);
    });
  }

  async saveViaje() {
    this.setLoading(this.dict.saving);
    this.nextBtn.disabled = true;
    try {
      const payload = {
        viaje: {
          codigo_base: this.codigoBase.value.trim(),
          nombre_motorizado: this.nombreMotorizado.value.trim(),
          numero_wsp: this.numeroWsp.value.trim(),
          num_llamadas: this.numLlamadas.value.trim(),
          num_yape: this.numYape.value.trim(),
          link: this.link.value.trim(),
          observacion: this.observacion.value.trim(),
          fecha: this.fecha.value,
          codigo_viaje: this.codigoViaje.value.trim(),
          es_existente: this.viajeExistente.checked
        },
        paquetes: Array.from(this.selectedPaquetes.values()).map(({ row, index }) => ({
          codigo_paquete: row.codigo_paquete,
          index
        }))
      };

      const response = await fetch('/api/asignar-viaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al guardar viaje.');
      }

      this.showAlert('success', this.dict.success);
      this.selectedPaquetes.clear();
      this.renderPaquetes();
      this.goToStep(0);
      this.loadNextCodigoViaje();
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.saveError);
    } finally {
      this.setLoading('');
      this.nextBtn.disabled = false;
    }
  }

  async openLogs() {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) throw new Error('Error al cargar logs.');
      const data = await response.json();
      document.getElementById('logsContent').textContent = data.content || '';
      const modal = new bootstrap.Modal(document.getElementById('logsModal'));
      modal.show();
    } catch (error) {
      this.showAlert('danger', this.dict.logsError);
    }
  }
}

const translations = {
  es: {
    tag: 'IaaS + PaaS Global',
    title: 'Asignar viajes',
    subtitle: 'Wizard multi-paso para asignar paquetes empacados a un viaje.',
    status: 'Estado del flujo',
    statusHint: 'Completa los datos del viaje para continuar.',
    existingHint: 'Ingresa el codigo del viaje existente.',
    refresh: 'Actualizar paquetes',
    viewLogs: 'Ver logs SQL',
    step1Title: '1. Datos del viaje',
    step1Subtitle: 'Registra la cabecera del viaje y la base de salida.',
    step2Title: '2. Detalle del viaje',
    step2Subtitle: 'Selecciona paquetes empacados para asignarlos.',
    step3Title: '3. Confirmar y guardar',
    step3Subtitle: 'Revisa el resumen antes de confirmar.',
    required: 'Campos requeridos',
    codigoViaje: 'Codigo viaje',
    viajeExistente: 'Marcar si el viaje ya existe.',
    codigoBase: 'Base de salida',
    fecha: 'Fecha',
    motorizado: 'Nombre del motorizado',
    link: 'Link de seguimiento',
    wsp: 'Numero WhatsApp',
    llamadas: 'Numero llamadas',
    yape: 'Numero Yape',
    observacion: 'Observacion',
    buscar: 'Buscar paquete',
    selectAll: 'Seleccionar todos',
    clear: 'Limpiar',
    sel: 'Sel',
    codigo: 'Codigo',
    cliente: 'Cliente',
    telefono: 'Telefono',
    entrega: 'Punto entrega',
    recibe: 'Recibe',
    selectedNone: '0 seleccionados',
    selectedCount: '{count} seleccionados',
    resumenViaje: 'Resumen del viaje',
    resumenPaquetes: 'Paquetes seleccionados',
    confirm: 'Confirmar operacion',
    prev: 'Anterior',
    next: 'Siguiente',
    loadingBases: 'Cargando bases...',
    loadingPaquetes: 'Cargando paquetes empacados...',
    baseRequired: 'Selecciona una base valida.',
    motorizadoRequired: 'El nombre del motorizado es requerido.',
    linkInvalid: 'Ingresa un link valido (http://, https:// o www).',
    codigoRequired: 'Ingresa el codigo del viaje existente.',
    paquetesRequired: 'Selecciona al menos un paquete.',
    baseError: 'No se pudieron cargar las bases.',
    paquetesError: 'No se pudieron cargar los paquetes.',
    codigoError: 'No se pudo calcular el codigo del viaje.',
    saving: 'Guardando viaje y paquetes...',
    success: 'Viaje asignado correctamente.',
    saveError: 'No se pudo guardar el viaje.',
    logsError: 'No se pudieron cargar los logs.',
    logsTitle: 'Logs SQL'
  },
  en: {
    tag: 'Global IaaS + PaaS',
    title: 'Assign Trips',
    subtitle: 'Multi-step wizard to assign packed packages to a trip.',
    status: 'Flow status',
    statusHint: 'Complete trip data to continue.',
    existingHint: 'Enter the existing trip code.',
    refresh: 'Refresh packages',
    viewLogs: 'View SQL logs',
    step1Title: '1. Trip data',
    step1Subtitle: 'Register the trip header and base.',
    step2Title: '2. Trip detail',
    step2Subtitle: 'Select packed packages to assign.',
    step3Title: '3. Confirm and save',
    step3Subtitle: 'Review the summary before confirming.',
    required: 'Required fields',
    codigoViaje: 'Trip code',
    viajeExistente: 'Check if trip already exists.',
    codigoBase: 'Base',
    fecha: 'Date',
    motorizado: 'Driver name',
    link: 'Tracking link',
    wsp: 'WhatsApp number',
    llamadas: 'Calls number',
    yape: 'Yape number',
    observacion: 'Notes',
    buscar: 'Search package',
    selectAll: 'Select all',
    clear: 'Clear',
    sel: 'Sel',
    codigo: 'Code',
    cliente: 'Client',
    telefono: 'Phone',
    entrega: 'Drop-off',
    recibe: 'Receiver',
    selectedNone: '0 selected',
    selectedCount: '{count} selected',
    resumenViaje: 'Trip summary',
    resumenPaquetes: 'Selected packages',
    confirm: 'Confirm operation',
    prev: 'Back',
    next: 'Next',
    loadingBases: 'Loading bases...',
    loadingPaquetes: 'Loading packed packages...',
    baseRequired: 'Select a valid base.',
    motorizadoRequired: 'Driver name is required.',
    linkInvalid: 'Enter a valid link (http://, https://, or www).',
    codigoRequired: 'Enter the existing trip code.',
    paquetesRequired: 'Select at least one package.',
    baseError: 'Could not load bases.',
    paquetesError: 'Could not load packages.',
    codigoError: 'Could not calculate trip code.',
    saving: 'Saving trip and packages...',
    success: 'Trip assigned successfully.',
    saveError: 'Could not save trip.',
    logsError: 'Could not load logs.',
    logsTitle: 'SQL logs'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
