class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.currentStep = 0;
    this.progressBar = document.getElementById('progressBar');
    this.nextBtn = document.getElementById('nextBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.loadingState = document.getElementById('loadingState');
    this.alertArea = document.getElementById('alertArea');
    this.paquetesBody = document.getElementById('paquetesBody');
    this.summaryCard = document.getElementById('summaryCard');
    this.selectedPaquetes = [];
    this.bases = [];

    this.init();
  }

  init() {
    this.setLanguage();
    this.updateButtons();
    this.attachEvents();
    this.loadBases();
    this.loadPaquetes();
    this.loadLogs();
    this.applyLanguage();
  }

  attachEvents() {
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.prevBtn.addEventListener('click', () => this.handlePrev());
    document.getElementById('refreshPaquetes').addEventListener('click', () => this.loadPaquetes());
    document.getElementById('loadLog').addEventListener('click', () => this.fetchLog());
  }

  setLanguage() {
    const lang = (navigator.language || 'es').toLowerCase();
    this.langKey = lang.startsWith('es') ? 'es' : 'en';
    this.dict = translations[this.langKey];
  }

  applyLanguage() {
    const dict = this.dict;
    document.documentElement.lang = this.langKey;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const textKey = el.getAttribute('data-i18n');
      if (dict[textKey]) {
        el.textContent = dict[textKey];
      }
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

  handlePrev() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  async handleNext() {
    const valid = await this.validateStep();
    if (!valid) return;

    if (this.currentStep === this.steps.length - 1) {
      await this.saveViaje();
      return;
    }

    this.goToStep(this.currentStep + 1);
    if (this.currentStep === 2) {
      this.renderSummary();
      this.loadLogs();
    }
  }

  async validateStep() {
    this.clearAlert();
    if (this.currentStep === 0) {
      const base = document.getElementById('baseSelect').value;
      const nombre = document.getElementById('nombreMotorizado').value.trim();
      const link = document.getElementById('link').value.trim();
      const wsp = document.getElementById('numeroWsp').value.trim();
      const llamadas = document.getElementById('numLlamadas').value.trim();
      const yape = document.getElementById('numYape').value.trim();

      const linkRegex = /^(https?:\/\/|www\.)[^\s]+\.[^\s]{2,}$/i;
      const numericOptional = /^[0-9]{0,20}$/;

      if (!base) {
        this.showAlert('warning', this.dict.errors.base);
        return false;
      }
      if (!nombre) {
        this.showAlert('warning', this.dict.errors.nombre);
        return false;
      }
      if (!linkRegex.test(link)) {
        this.showAlert('warning', this.dict.errors.link);
        return false;
      }
      if (!numericOptional.test(wsp) || !numericOptional.test(llamadas) || !numericOptional.test(yape)) {
        this.showAlert('warning', this.dict.errors.numbers);
        return false;
      }
      return true;
    }

    if (this.currentStep === 1) {
      if (this.selectedPaquetes.length === 0) {
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

  clearAlert() {
    this.alertArea.innerHTML = '';
  }

  async loadBases() {
    try {
      this.setLoading(this.dict.loading);
      const response = await fetch('/api/bases');
      const data = await response.json();
      this.bases = data;
      const select = document.getElementById('baseSelect');
      select.innerHTML = '<option value="">--</option>';
      data.forEach((base) => {
        const option = document.createElement('option');
        option.value = base.codigo_base || base.codigo || base.id || '';
        option.textContent = base.nombre_base || base.nombre || base.descripcion || option.value;
        select.appendChild(option);
      });
    } catch (error) {
      this.showAlert('danger', this.dict.errors.bases);
    } finally {
      this.setLoading('');
    }
  }

  async loadPaquetes() {
    try {
      this.setLoading(this.dict.loading);
      const response = await fetch('/api/paquetes?estado=empacado');
      const data = await response.json();
      this.renderPaquetes(data);
    } catch (error) {
      this.showAlert('danger', this.dict.errors.paquetesLoad);
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
      row.innerHTML = `
        <td><input type="checkbox" class="form-check-input" data-codigo="${codigo}" /></td>
        <td>${codigo}</td>
        <td>${paquete.fecha_actualizado || paquete.vfecha || ''}</td>
        <td>${paquete.nombre_cliente || paquete.vnombre_cliente || ''}</td>
        <td>${paquete.num_cliente || paquete.vnum_cliente || ''}</td>
        <td>${paquete.concatenarpuntoentrega || paquete.vconcatenarpuntoentrega || ''}</td>
        <td>${paquete.concatenarnumrecibe || paquete.vconcatenarnumrecibe || ''}</td>
      `;
      this.paquetesBody.appendChild(row);
    });

    this.paquetesBody.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => this.collectPaquetes());
    });
  }

  collectPaquetes() {
    const selected = [];
    this.paquetesBody.querySelectorAll('input[type="checkbox"]:checked').forEach((checkbox) => {
      selected.push({ codigo_paquete: checkbox.dataset.codigo });
    });
    this.selectedPaquetes = selected;
  }

  renderSummary() {
    const baseId = document.getElementById('baseSelect').value;
    const base = this.bases.find((item) => `${item.codigo_base || item.codigo || item.id}` === baseId);
    const nombre = document.getElementById('nombreMotorizado').value.trim();
    const link = document.getElementById('link').value.trim();
    const wsp = document.getElementById('numeroWsp').value.trim();
    const llamadas = document.getElementById('numLlamadas').value.trim();
    const yape = document.getElementById('numYape').value.trim();
    const observacion = document.getElementById('observacion').value.trim();

    const paquetesList = this.selectedPaquetes.map((item) => `<li>${item.codigo_paquete}</li>`).join('');

    this.summaryCard.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.base}</p>
          <p>${base ? base.nombre_base || base.nombre || base.descripcion || baseId : baseId}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.driver}</p>
          <p>${nombre}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.link}</p>
          <p>${link}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.contact}</p>
          <p>${wsp || '-'} | ${llamadas || '-'} | ${yape || '-'}</p>
        </div>
        <div class="col-12">
          <p class="text-muted mb-1">${this.dict.observacion}</p>
          <p>${observacion || '-'}</p>
        </div>
        <div class="col-12">
          <p class="text-muted mb-1">${this.dict.paquetesSeleccionados}</p>
          <ul>${paquetesList}</ul>
        </div>
      </div>
    `;
  }

  async saveViaje() {
    try {
      this.setLoading(this.dict.saving);
      const payload = {
        codigo_base: document.getElementById('baseSelect').value,
        nombre_motorizado: document.getElementById('nombreMotorizado').value.trim(),
        numero_wsp: document.getElementById('numeroWsp').value.trim(),
        num_llamadas: document.getElementById('numLlamadas').value.trim(),
        num_yape: document.getElementById('numYape').value.trim(),
        link: document.getElementById('link').value.trim(),
        observacion: document.getElementById('observacion').value.trim(),
        paquetes: this.selectedPaquetes,
      };

      const response = await fetch('/api/viajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        this.showAlert('danger', result.message || this.dict.errors.save);
        return;
      }

      this.showAlert('success', this.dict.success.replace('{id}', result.codigoviaje));
      this.goToStep(0);
      document.getElementById('formStep1').reset();
      document.getElementById('confirmCheck').checked = false;
      this.selectedPaquetes = [];
      this.loadPaquetes();
    } catch (error) {
      this.showAlert('danger', this.dict.errors.save);
    } finally {
      this.setLoading('');
    }
  }

  async loadLogs() {
    try {
      const response = await fetch('/api/logs');
      const data = await response.json();
      const select = document.getElementById('logSelect');
      select.innerHTML = '';
      data.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
    } catch (error) {
      this.showAlert('warning', this.dict.errors.logs);
    }
  }

  async fetchLog() {
    const file = document.getElementById('logSelect').value;
    if (!file) return;
    try {
      const response = await fetch(`/api/logs/${encodeURIComponent(file)}`);
      const data = await response.text();
      document.getElementById('logViewer').textContent = data;
    } catch (error) {
      this.showAlert('warning', this.dict.errors.logs);
    }
  }
}

const translations = {
  es: {
    tag: 'IaaS + PaaS Global',
    title: 'Asignar viajes',
    subtitle: 'Registro multi-paso para coordinar envios con trazabilidad en tiempo real.',
    status: 'Estado del flujo',
    step1Title: '1. Datos del viaje',
    step2Title: '2. Detalle del viaje',
    step2Subtitle: 'Selecciona los paquetes empacados para asignarlos al viaje.',
    step3Title: '3. Confirmar y guardar',
    step3Subtitle: 'Verifica los datos antes de confirmar la asignacion.',
    step3Badge: 'Listo para guardar',
    base: 'Base operativa',
    driver: 'Nombre motorizado',
    link: 'Link',
    wsp: 'Numero WSP',
    calls: 'Num. llamadas',
    yape: 'Num. Yape',
    observacion: 'Observacion',
    paquete: 'Paquete',
    fecha: 'Fecha',
    cliente: 'Cliente',
    telefono: 'Telefono',
    entrega: 'Punto entrega',
    recibe: 'Recibe',
    refresh: 'Actualizar paquetes',
    prev: 'Anterior',
    next: 'Siguiente',
    save: 'Guardar',
    confirm: 'Confirmo que la informacion es correcta.',
    logsTitle: 'Ver logs SQL',
    loadLog: 'Cargar log',
    contact: 'Contacto',
    paquetesSeleccionados: 'Paquetes seleccionados',
    emptyPaquetes: 'No hay paquetes empacados disponibles.',
    loading: 'Cargando...',
    saving: 'Guardando...',
    success: 'Viaje guardado con codigo {id}.',
    errors: {
      base: 'Selecciona una base valida.',
      nombre: 'El nombre del motorizado es obligatorio.',
      link: 'Ingresa un link valido (http, https o www).',
      numbers: 'Los campos numericos deben contener solo digitos.',
      paquetes: 'Selecciona al menos un paquete.',
      confirm: 'Confirma la operacion para continuar.',
      bases: 'No se pudieron cargar las bases.',
      paquetesLoad: 'No se pudieron cargar los paquetes.',
      save: 'No se pudo guardar el viaje.',
      logs: 'No se pudieron cargar los logs.',
    },
  },
  en: {
    tag: 'Global IaaS + PaaS',
    title: 'Assign trips',
    subtitle: 'Multi-step registration to coordinate shipments with real-time traceability.',
    status: 'Flow status',
    step1Title: '1. Trip details',
    step2Title: '2. Trip detail',
    step2Subtitle: 'Select packed packages to assign to the trip.',
    step3Title: '3. Confirm and save',
    step3Subtitle: 'Review the data before confirming the assignment.',
    step3Badge: 'Ready to save',
    base: 'Base',
    driver: 'Driver name',
    link: 'Link',
    wsp: 'WSP number',
    calls: 'Calls',
    yape: 'Yape number',
    observacion: 'Notes',
    paquete: 'Package',
    fecha: 'Date',
    cliente: 'Client',
    telefono: 'Phone',
    entrega: 'Delivery point',
    recibe: 'Receiver',
    refresh: 'Refresh packages',
    prev: 'Previous',
    next: 'Next',
    save: 'Save',
    confirm: 'I confirm the information is correct.',
    logsTitle: 'View SQL logs',
    loadLog: 'Load log',
    contact: 'Contact',
    paquetesSeleccionados: 'Selected packages',
    emptyPaquetes: 'No packed packages available.',
    loading: 'Loading...',
    saving: 'Saving...',
    success: 'Trip saved with code {id}.',
    errors: {
      base: 'Select a valid base.',
      nombre: 'Driver name is required.',
      link: 'Enter a valid link (http, https or www).',
      numbers: 'Numeric fields must contain digits only.',
      paquetes: 'Select at least one package.',
      confirm: 'Confirm the operation to continue.',
      bases: 'Unable to load bases.',
      paquetesLoad: 'Unable to load packages.',
      save: 'Unable to save the trip.',
      logs: 'Unable to load logs.',
    },
  },
};

window.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
