class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.progressBar = document.getElementById('progressBar');
    this.stepTitle = document.getElementById('stepTitle');
    this.stepHint = document.getElementById('stepHint');
    this.errorBox = document.getElementById('errorBox');
    this.successBox = document.getElementById('successBox');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.guardarBtn = document.getElementById('guardarBtn');
    this.confirmOperacion = document.getElementById('confirmOperacion');
    this.viewLogsBtn = document.getElementById('viewLogsBtn');
    this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
    this.logsContent = document.getElementById('logsContent');
    this.paquetesTableBody = document.querySelector('#paquetesTable tbody');
    this.selectedCountLabel = document.getElementById('selectedCountLabel');
    this.resumenViaje = document.getElementById('resumenViaje');
    this.resumenPaquetes = document.getElementById('resumenPaquetes');

    this.fields = {
      codigoViaje: document.getElementById('codigoViaje'),
      codigoBase: document.getElementById('codigoBase'),
      nombreMotorizado: document.getElementById('nombreMotorizado'),
      numeroWsp: document.getElementById('numeroWsp'),
      numLlamadas: document.getElementById('numLlamadas'),
      numYape: document.getElementById('numYape'),
      link: document.getElementById('link'),
      observacion: document.getElementById('observacion'),
      fecha: document.getElementById('fecha'),
    };

    this.regex = {
      nombre: /^.{2,}$/,
      link: /^(https?:\/\/|www\.)[^\s]+$/i,
      numeros: /^[0-9+\s-]*$/,
    };

    this.state = {
      locale: navigator.language || 'es',
      paquetes: [],
      selected: new Set(),
      bases: [],
      viaje: {
        fechaISO: new Date().toISOString(),
      },
    };

    this.dictionary = {
      es: {
        stepTitles: ['Paso 1: Datos del Viaje', 'Paso 2: Seleccion de Paquetes', 'Paso 3: Confirmar y Guardar'],
        stepHints: [
          'Complete los datos principales del viaje.',
          'Seleccione uno o mas paquetes empacados.',
          'Revise el resumen y confirme la operacion.',
        ],
        ui: {
          wizardStatus: 'Servicio Global IaaS/PaaS',
          wizardTitle: 'Asignar Viajes',
          wizardSubtitle: 'Coordine viajes y paquetes con visibilidad operacional para operaciones globales.',
          viewLogs: 'Ver Logs de SQL',
          codigoViaje: 'Codigo Viaje',
          codigoBase: 'Base Operativa',
          nombreMotorizado: 'Nombre Motorizado',
          numeroWsp: 'Numero WSP',
          numLlamadas: 'Numero de Llamadas',
          numYape: 'Numero Yape',
          link: 'Link',
          fecha: 'Fecha',
          observacion: 'Observacion',
          paquetesEmpacados: 'vPaquetesEmpacados',
          sinSeleccion: 'Ningun paquete seleccionado',
          codigoPaquete: 'Codigo Paquete',
          nombreCliente: 'Nombre Cliente',
          numCliente: 'Numero Cliente',
          puntoEntrega: 'Punto Entrega',
          numRecibe: 'Numero Recibe',
          confirmacion: 'Confirmo que la informacion es correcta',
          guardar: 'Guardar Viaje',
          anterior: 'Anterior',
          siguiente: 'Siguiente',
          logsTitle: 'Logs de SQL',
          loading: 'Procesando...',
          loadingHint: 'Espere un momento.',
          resumenViaje: 'Resumen del Viaje',
          resumenPaquetes: 'Paquetes Seleccionados',
          baseLabel: 'Base',
          motorizadoLabel: 'Motorizado',
          linkLabel: 'Link',
          wspLabel: 'WSP',
          llamadasLabel: 'Llamadas',
          yapeLabel: 'Yape',
          observacionLabel: 'Observacion',
          fechaLabel: 'Fecha',
          paquetesLabel: 'Paquetes',
          seleccionar: 'Seleccionar',
        },
        messages: {
          errorServer: 'Error al comunicar con el servidor',
          baseRequerida: 'Seleccione una base operativa.',
          nombreRequerido: 'Ingrese el nombre del motorizado.',
          linkInvalido: 'Ingrese un link valido (http, https o www).',
          numerosInvalidos: 'Los numeros solo deben contener digitos.',
          paquetesRequeridos: 'Seleccione al menos un paquete empacado.',
          confirmarOperacion: 'Debe confirmar la operacion.',
          guardarOk: 'Viaje asignado correctamente.',
          sinLogs: 'Sin logs disponibles.',
        },
      },
      en: {
        stepTitles: ['Step 1: Trip Data', 'Step 2: Select Packages', 'Step 3: Confirm and Save'],
        stepHints: [
          'Complete the main trip information.',
          'Select one or more packed packages.',
          'Review the summary and confirm the operation.',
        ],
        ui: {
          wizardStatus: 'Global IaaS/PaaS Service',
          wizardTitle: 'Assign Trips',
          wizardSubtitle: 'Coordinate trips and packages with global operational visibility.',
          viewLogs: 'View SQL Logs',
          codigoViaje: 'Trip Code',
          codigoBase: 'Operational Base',
          nombreMotorizado: 'Driver Name',
          numeroWsp: 'WhatsApp Number',
          numLlamadas: 'Call Number',
          numYape: 'Yape Number',
          link: 'Link',
          fecha: 'Date',
          observacion: 'Notes',
          paquetesEmpacados: 'vPackedPackages',
          sinSeleccion: 'No packages selected',
          codigoPaquete: 'Package Code',
          nombreCliente: 'Client Name',
          numCliente: 'Client Number',
          puntoEntrega: 'Delivery Point',
          numRecibe: 'Receiver Number',
          confirmacion: 'I confirm the information is correct',
          guardar: 'Save Trip',
          anterior: 'Previous',
          siguiente: 'Next',
          logsTitle: 'SQL Logs',
          loading: 'Processing...',
          loadingHint: 'Please wait.',
          resumenViaje: 'Trip Summary',
          resumenPaquetes: 'Selected Packages',
          baseLabel: 'Base',
          motorizadoLabel: 'Driver',
          linkLabel: 'Link',
          wspLabel: 'WhatsApp',
          llamadasLabel: 'Calls',
          yapeLabel: 'Yape',
          observacionLabel: 'Notes',
          fechaLabel: 'Date',
          paquetesLabel: 'Packages',
          seleccionar: 'Select',
        },
        messages: {
          errorServer: 'Failed to communicate with server',
          baseRequerida: 'Select an operational base.',
          nombreRequerido: 'Enter the driver name.',
          linkInvalido: 'Enter a valid link (http, https, or www).',
          numerosInvalidos: 'Numbers must contain digits only.',
          paquetesRequeridos: 'Select at least one packed package.',
          confirmarOperacion: 'You must confirm the operation.',
          guardarOk: 'Trip assigned successfully.',
          sinLogs: 'No logs available.',
        },
      },
    };

    this.init();
  }

  getLang() {
    const lang = this.state.locale.toLowerCase();
    return lang.startsWith('en') ? 'en' : 'es';
  }

  t(path) {
    const lang = this.getLang();
    const segments = path.split('.');
    let current = this.dictionary[lang];
    for (const segment of segments) {
      if (!current || typeof current !== 'object') return '';
      current = current[segment];
    }
    return current ?? '';
  }

  init() {
    this.applyTranslations();
    this.setFecha();
    this.bindEvents();
    this.loadInitialData();
    this.updateStep();
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(`ui.${key}`);
      if (text) {
        el.textContent = text;
      }
    });
  }

  setFecha() {
    const date = new Date();
    this.state.viaje.fechaISO = date.toISOString();
    this.fields.fecha.value = date.toLocaleString(this.state.locale);
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.goStep(this.currentStep - 1));
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.guardarBtn.addEventListener('click', () => this.handleSave());
    this.viewLogsBtn.addEventListener('click', () => this.loadLogs());
  }

  showError(message) {
    this.errorBox.textContent = message;
    this.errorBox.classList.remove('d-none');
    this.successBox.classList.add('d-none');
  }

  showSuccess(message) {
    this.successBox.textContent = message;
    this.successBox.classList.remove('d-none');
    this.errorBox.classList.add('d-none');
  }

  clearAlerts() {
    this.errorBox.classList.add('d-none');
    this.successBox.classList.add('d-none');
  }

  setLoading(isLoading, message) {
    if (isLoading) {
      if (message) this.loadingText.textContent = message;
      this.loadingOverlay.classList.remove('d-none');
    } else {
      this.loadingOverlay.classList.add('d-none');
    }
  }

  updateStep() {
    this.steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.currentStep);
    });

    const total = this.steps.length;
    const progress = Math.round(((this.currentStep + 1) / total) * 100);
    this.progressBar.style.width = `${progress}%`;
    this.progressBar.setAttribute('aria-valuenow', String(progress));

    const titles = this.t('stepTitles');
    const hints = this.t('stepHints');
    if (titles[this.currentStep]) this.stepTitle.textContent = titles[this.currentStep];
    if (hints[this.currentStep]) this.stepHint.textContent = hints[this.currentStep];

    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.classList.toggle('d-none', this.currentStep === total - 1);
  }

  goStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    this.updateStep();
  }

  handleNext() {
    this.clearAlerts();
    if (this.currentStep === 0 && !this.validateStep1()) return;
    if (this.currentStep === 1 && !this.validateStep2()) return;
    if (this.currentStep === 1) {
      this.renderResumen();
    }
    this.goStep(this.currentStep + 1);
  }

  validateStep1() {
    if (!this.fields.codigoBase.value) {
      this.showError(this.t('messages.baseRequerida'));
      return false;
    }
    if (!this.regex.nombre.test(this.fields.nombreMotorizado.value.trim())) {
      this.showError(this.t('messages.nombreRequerido'));
      return false;
    }
    if (!this.regex.link.test(this.fields.link.value.trim())) {
      this.showError(this.t('messages.linkInvalido'));
      return false;
    }
    if (!this.regex.numeros.test(this.fields.numeroWsp.value.trim())) {
      this.showError(this.t('messages.numerosInvalidos'));
      return false;
    }
    if (!this.regex.numeros.test(this.fields.numLlamadas.value.trim())) {
      this.showError(this.t('messages.numerosInvalidos'));
      return false;
    }
    if (!this.regex.numeros.test(this.fields.numYape.value.trim())) {
      this.showError(this.t('messages.numerosInvalidos'));
      return false;
    }
    return true;
  }

  validateStep2() {
    if (this.state.selected.size === 0) {
      this.showError(this.t('messages.paquetesRequeridos'));
      return false;
    }
    return true;
  }

  validateStep3() {
    if (!this.confirmOperacion.checked) {
      this.showError(this.t('messages.confirmarOperacion'));
      return false;
    }
    return true;
  }

  async loadInitialData() {
    this.setLoading(true, this.t('ui.loading'));
    try {
      const [bases, next, paquetes] = await Promise.all([
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/viajes/next'),
        this.fetchJson('/api/paquetes?estado=empacado'),
      ]);
      this.state.bases = bases;
      this.state.paquetes = paquetes;
      this.fields.codigoViaje.value = next.next;
      this.renderBases();
      this.renderPaquetes();
    } catch (error) {
      this.showError(this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  renderBases() {
    this.fields.codigoBase.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '--';
    this.fields.codigoBase.appendChild(placeholder);
    this.state.bases.forEach((base) => {
      const option = document.createElement('option');
      option.value = base.codigo_base ?? base.codigo ?? base.id ?? '';
      option.textContent = base.nombre_base ?? base.nombre ?? base.descripcion ?? option.value;
      this.fields.codigoBase.appendChild(option);
    });
  }

  renderPaquetes() {
    this.paquetesTableBody.innerHTML = '';
    this.state.paquetes.forEach((paquete) => {
      const row = document.createElement('tr');
      const codigo = paquete.codigo_paquete;
      row.innerHTML = `
        <td>
          <input class="form-check-input" type="checkbox" data-code="${codigo}" />
        </td>
        <td>${codigo ?? ''}</td>
        <td>${paquete.fecha_actualizado ?? ''}</td>
        <td>${paquete.nombre_cliente ?? ''}</td>
        <td>${paquete.num_cliente ?? ''}</td>
        <td>${paquete.concatenarpuntoentrega ?? ''}</td>
        <td>${paquete.concatenarnumrecibe ?? ''}</td>
      `;
      const checkbox = row.querySelector('input');
      checkbox.addEventListener('change', (event) => {
        const code = event.target.dataset.code;
        if (event.target.checked) {
          this.state.selected.add(code);
          row.classList.add('selected-row');
        } else {
          this.state.selected.delete(code);
          row.classList.remove('selected-row');
        }
        this.updateSelectedLabel();
      });
      this.paquetesTableBody.appendChild(row);
    });
    this.updateSelectedLabel();
  }

  updateSelectedLabel() {
    const count = this.state.selected.size;
    if (count === 0) {
      this.selectedCountLabel.textContent = this.t('ui.sinSeleccion');
    } else {
      this.selectedCountLabel.textContent = `${count} ${this.t('ui.paquetesLabel')}`;
    }
  }

  renderResumen() {
    const base = this.state.bases.find((item) => String(item.codigo_base ?? item.codigo ?? item.id) === this.fields.codigoBase.value);
    const selectedCodes = Array.from(this.state.selected);
    const selectedRows = this.state.paquetes.filter((item) => selectedCodes.includes(String(item.codigo_paquete)));
    const resumenViaje = `
      <div class="summary-title">${this.t('ui.resumenViaje')}</div>
      <ul class="summary-list">
        <li><strong>${this.t('ui.codigoViaje')}:</strong> ${this.fields.codigoViaje.value}</li>
        <li><strong>${this.t('ui.baseLabel')}:</strong> ${base?.nombre_base ?? base?.nombre ?? ''}</li>
        <li><strong>${this.t('ui.motorizadoLabel')}:</strong> ${this.fields.nombreMotorizado.value}</li>
        <li><strong>${this.t('ui.wspLabel')}:</strong> ${this.fields.numeroWsp.value || '-'}</li>
        <li><strong>${this.t('ui.llamadasLabel')}:</strong> ${this.fields.numLlamadas.value || '-'}</li>
        <li><strong>${this.t('ui.yapeLabel')}:</strong> ${this.fields.numYape.value || '-'}</li>
        <li><strong>${this.t('ui.linkLabel')}:</strong> ${this.fields.link.value}</li>
        <li><strong>${this.t('ui.observacionLabel')}:</strong> ${this.fields.observacion.value || '-'}</li>
        <li><strong>${this.t('ui.fechaLabel')}:</strong> ${this.fields.fecha.value}</li>
      </ul>
    `;

    const paqueteItems = selectedRows
      .map(
        (item) =>
          `<li><strong>${item.codigo_paquete}</strong> ${item.nombre_cliente ?? ''} (${item.num_cliente ?? ''})</li>`
      )
      .join('');

    const resumenPaquetes = `
      <div class="summary-title">${this.t('ui.resumenPaquetes')}</div>
      <ul class="summary-list">
        ${paqueteItems || `<li>${this.t('ui.sinSeleccion')}</li>`}
      </ul>
    `;

    this.resumenViaje.innerHTML = resumenViaje;
    this.resumenPaquetes.innerHTML = resumenPaquetes;
  }

  async handleSave() {
    this.clearAlerts();
    if (!this.validateStep1() || !this.validateStep2() || !this.validateStep3()) return;

    const payload = {
      viaje: {
        codigoviaje: Number(this.fields.codigoViaje.value),
        codigo_base: this.fields.codigoBase.value,
        nombre_motorizado: this.fields.nombreMotorizado.value.trim(),
        numero_wsp: this.fields.numeroWsp.value.trim() || null,
        num_llamadas: this.fields.numLlamadas.value.trim() || null,
        num_yape: this.fields.numYape.value.trim() || null,
        link: this.fields.link.value.trim(),
        observacion: this.fields.observacion.value.trim() || null,
        fecha: this.state.viaje.fechaISO,
      },
      paquetes: Array.from(this.state.selected).map((codigo) => ({ codigo_paquete: codigo })),
    };

    this.setLoading(true, this.t('ui.loading'));
    try {
      await this.fetchJson('/api/viajes/guardar', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.showSuccess(this.t('messages.guardarOk'));
      this.confirmOperacion.checked = false;
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  async loadLogs() {
    try {
      const data = await this.fetchJson('/api/logs/latest');
      this.logsContent.textContent = data.content || this.t('messages.sinLogs');
      this.logsModal.show();
    } catch (error) {
      this.showError(this.t('messages.errorServer'));
    }
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || this.t('messages.errorServer'));
    }
    return response.json();
  }
}

new FormWizard();
