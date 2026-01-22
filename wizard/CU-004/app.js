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
    this.detalleTableBody = document.querySelector('#detalleTable tbody');
    this.selectedLabel = document.getElementById('selectedLabel');
    this.paqueteDetalle = document.getElementById('paqueteDetalle');
    this.viajeDetalle = document.getElementById('viajeDetalle');
    this.resumenPaquete = document.getElementById('resumenPaquete');
    this.estadoSelect = document.getElementById('estadoSelect');

    this.regex = {
      codigo: /^[0-9A-Za-z-]+$/,
      estado: /^(robado|devuelto|standby|llegado)$/,
    };

    this.state = {
      locale: (navigator.language || 'es').toLowerCase(),
      paquetes: [],
      selectedPaquete: null,
      viaje: null,
      movDetalle: [],
      ordinal: 1,
    };

    this.dictionary = {
      es: {
        stepTitles: [
          'Paso 1: Seleccion de Paquete',
          'Paso 2: Detalle del Paquete',
          'Paso 3: Confirmar y Guardar',
        ],
        stepHints: [
          'Seleccione un paquete en camino.',
          'Revise los datos del viaje y del paquete.',
          'Defina el nuevo estado y confirme la operacion.',
        ],
        ui: {
          wizardStatus: 'Servicio Global IaaS/PaaS',
          wizardTitle: 'Gestionar Paquetes en Camino',
          wizardSubtitle: 'Controle estados de paquetes en ruta con visibilidad operativa para servicios globales.',
          viewLogs: 'Ver Logs de sentencias SQL',
          paquetesEnCamino: 'vPaquetesEnCamino',
          sinSeleccion: 'Ningun paquete seleccionado',
          codigoPaquete: 'Codigo Paquete',
          fecha: 'Fecha',
          nombreCliente: 'Nombre Cliente',
          numCliente: 'Numero Cliente',
          puntoEntrega: 'Punto Entrega',
          numRecibe: 'Numero Recibe',
          detallePaquete: 'Detalle del Paquete',
          detalleViaje: 'Datos del Viaje',
          movContableDetalle: 'mov_contable_detalle',
          detalleSoloLectura: 'Solo lectura',
          nombreProducto: 'Producto',
          cantidad: 'Cantidad',
          nuevoEstado: 'Nuevo Estado',
          seleccione: 'Seleccione...',
          estadoRobado: 'robado',
          estadoDevuelto: 'devuelto',
          estadoStandby: 'standby',
          estadoLlegado: 'llegado',
          confirmacion: 'Confirmo que la informacion es correcta',
          guardar: 'Guardar Estado',
          anterior: 'Anterior',
          siguiente: 'Siguiente',
          logsTitle: 'Logs de SQL',
          loading: 'Procesando...',
          loadingHint: 'Espere un momento.',
          resumenTitulo: 'Resumen del Paquete',
          clienteLabel: 'Cliente',
          entregaLabel: 'Entrega',
          linkLabel: 'Link',
          viajeLabel: 'Viaje',
          fechaLabel: 'Fecha',
          motorizadoLabel: 'Motorizado',
          wspLabel: 'WSP',
          llamadasLabel: 'Llamadas',
          yapeLabel: 'Yape',
          observacionLabel: 'Observacion',
          estadoLabel: 'Estado',
          seleccionar: 'Seleccionar',
          sinDatos: 'Sin datos disponibles',
        },
        messages: {
          errorServer: 'Error al comunicar con el servidor',
          paqueteRequerido: 'Debe seleccionar un paquete en camino.',
          estadoRequerido: 'Seleccione un estado valido para el paquete.',
          confirmarOperacion: 'Debe confirmar la operacion.',
          guardarOk: 'Estado actualizado correctamente.',
          sinLogs: 'Sin logs disponibles.',
          cargandoPaquetes: 'Cargando paquetes en camino...',
          cargandoDetalle: 'Cargando detalle del paquete...',
        },
      },
      en: {
        stepTitles: ['Step 1: Select Package', 'Step 2: Package Details', 'Step 3: Confirm and Save'],
        stepHints: [
          'Select a package that is on the way.',
          'Review trip and package details.',
          'Choose the new status and confirm the operation.',
        ],
        ui: {
          wizardStatus: 'Global IaaS/PaaS Service',
          wizardTitle: 'Manage In-Transit Packages',
          wizardSubtitle: 'Control in-transit packages with global operational visibility.',
          viewLogs: 'View SQL Statement Logs',
          paquetesEnCamino: 'vInTransitPackages',
          sinSeleccion: 'No package selected',
          codigoPaquete: 'Package Code',
          fecha: 'Date',
          nombreCliente: 'Client Name',
          numCliente: 'Client Number',
          puntoEntrega: 'Delivery Point',
          numRecibe: 'Receiver Number',
          detallePaquete: 'Package Details',
          detalleViaje: 'Trip Details',
          movContableDetalle: 'mov_contable_detalle',
          detalleSoloLectura: 'Read only',
          nombreProducto: 'Product',
          cantidad: 'Quantity',
          nuevoEstado: 'New Status',
          seleccione: 'Select...',
          estadoRobado: 'robado',
          estadoDevuelto: 'devuelto',
          estadoStandby: 'standby',
          estadoLlegado: 'llegado',
          confirmacion: 'I confirm the information is correct',
          guardar: 'Save Status',
          anterior: 'Previous',
          siguiente: 'Next',
          logsTitle: 'SQL Logs',
          loading: 'Processing...',
          loadingHint: 'Please wait.',
          resumenTitulo: 'Package Summary',
          clienteLabel: 'Client',
          entregaLabel: 'Delivery',
          linkLabel: 'Link',
          viajeLabel: 'Trip',
          fechaLabel: 'Date',
          motorizadoLabel: 'Driver',
          wspLabel: 'WSP',
          llamadasLabel: 'Calls',
          yapeLabel: 'Yape',
          observacionLabel: 'Notes',
          estadoLabel: 'Status',
          seleccionar: 'Select',
          sinDatos: 'No data available',
        },
        messages: {
          errorServer: 'Failed to communicate with server',
          paqueteRequerido: 'You must select an in-transit package.',
          estadoRequerido: 'Select a valid status for the package.',
          confirmarOperacion: 'You must confirm the operation.',
          guardarOk: 'Status updated successfully.',
          sinLogs: 'No logs available.',
          cargandoPaquetes: 'Loading in-transit packages...',
          cargandoDetalle: 'Loading package details...',
        },
      },
    };

    this.init();
  }

  getLang() {
    const lang = this.state.locale;
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

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = this.t(`ui.${key}`) || this.t(`messages.${key}`);
      if (value) {
        el.textContent = value;
      }
    });
  }

  init() {
    this.applyTranslations();
    this.bindEvents();
    this.loadPaquetes();
    this.updateStep();
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.prevStep());
    this.nextBtn.addEventListener('click', () => this.nextStep());
    this.guardarBtn.addEventListener('click', () => this.guardarEstado());
    this.viewLogsBtn.addEventListener('click', () => this.loadLogs());
    this.estadoSelect.addEventListener('change', () => this.renderResumen());

    this.paquetesTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-codigo]');
      if (button) {
        const codigo = button.getAttribute('data-codigo');
        this.selectPaquete(codigo);
      }
    });
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

  toggleLoading(show, text) {
    if (text) this.loadingText.textContent = text;
    this.loadingOverlay.classList.toggle('d-none', !show);
  }

  updateStep() {
    this.steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.currentStep);
    });
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.progressBar.setAttribute('aria-valuenow', String(progress));
    this.stepTitle.textContent = this.t(`stepTitles.${this.currentStep}`);
    this.stepHint.textContent = this.t(`stepHints.${this.currentStep}`);

    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.classList.toggle('d-none', this.currentStep === this.steps.length - 1);
  }

  async nextStep() {
    this.clearAlerts();
    const valid = await this.validateStep();
    if (!valid) return;
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep += 1;
      this.updateStep();
    }
  }

  prevStep() {
    this.clearAlerts();
    if (this.currentStep > 0) {
      this.currentStep -= 1;
      this.updateStep();
    }
  }

  async validateStep() {
    if (this.currentStep === 0) {
      if (!this.state.selectedPaquete || !this.regex.codigo.test(this.state.selectedPaquete.codigo_paquete)) {
        this.showError(this.t('messages.paqueteRequerido'));
        return false;
      }
    }

    if (this.currentStep === 2) {
      const estado = this.estadoSelect.value;
      if (!this.regex.estado.test(estado)) {
        this.showError(this.t('messages.estadoRequerido'));
        return false;
      }
      if (!this.confirmOperacion.checked) {
        this.showError(this.t('messages.confirmarOperacion'));
        return false;
      }
    }

    return true;
  }

  async loadPaquetes() {
    this.toggleLoading(true, this.t('messages.cargandoPaquetes'));
    try {
      const response = await fetch('/api/paquetes/en-camino');
      if (!response.ok) throw new Error(this.t('messages.errorServer'));
      const data = await response.json();
      this.state.paquetes = Array.isArray(data) ? data : [];
      this.renderPaquetes();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.toggleLoading(false);
    }
  }

  renderPaquetes() {
    this.paquetesTableBody.innerHTML = '';
    if (this.state.paquetes.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'small-muted text-center py-4';
      cell.textContent = this.t('ui.sinDatos');
      row.appendChild(cell);
      this.paquetesTableBody.appendChild(row);
      return;
    }

    this.state.paquetes.forEach((paquete) => {
      const row = document.createElement('tr');
      row.dataset.codigo = paquete.codigo_paquete;
      const selected =
        this.state.selectedPaquete && this.state.selectedPaquete.codigo_paquete === paquete.codigo_paquete;
      if (selected) row.classList.add('selected-row');

      row.innerHTML = `
        <td>
          <button class="btn btn-sm btn-outline-light" type="button" data-codigo="${paquete.codigo_paquete}">
            ${this.t('ui.seleccionar')}
          </button>
        </td>
        <td>${paquete.codigo_paquete ?? ''}</td>
        <td>${paquete.fecha_actualizado ?? ''}</td>
        <td>${paquete.nombre_cliente ?? ''}</td>
        <td>${paquete.num_cliente ?? ''}</td>
        <td>${paquete.concatenarpuntoentrega ?? ''}</td>
        <td>${paquete.concatenarnumrecibe ?? ''}</td>
      `;
      this.paquetesTableBody.appendChild(row);
    });
  }

  async selectPaquete(codigo) {
    const paquete = this.state.paquetes.find((item) => String(item.codigo_paquete) === String(codigo));
    if (!paquete) return;
    this.state.selectedPaquete = paquete;
    this.selectedLabel.textContent = `${this.t('ui.codigoPaquete')}: ${paquete.codigo_paquete}`;
    this.renderPaquetes();
    await this.loadDetalle(paquete.codigo_paquete);
  }

  async loadDetalle(codigoPaquete) {
    this.toggleLoading(true, this.t('messages.cargandoDetalle'));
    try {
      const [viajeRes, detalleRes, ordinalRes] = await Promise.all([
        fetch(`/api/paquetes/viaje?codigo=${encodeURIComponent(codigoPaquete)}`),
        fetch(`/api/paquetes/detalle?codigo=${encodeURIComponent(codigoPaquete)}`),
        fetch(`/api/paquetes/ordinal?codigo=${encodeURIComponent(codigoPaquete)}`),
      ]);

      if (!viajeRes.ok || !detalleRes.ok || !ordinalRes.ok) {
        throw new Error(this.t('messages.errorServer'));
      }

      const viajeData = await viajeRes.json();
      const detalleData = await detalleRes.json();
      const ordinalData = await ordinalRes.json();

      this.state.viaje = Array.isArray(viajeData) ? viajeData[0] : viajeData;
      this.state.movDetalle = Array.isArray(detalleData) ? detalleData : [];
      this.state.ordinal = ordinalData?.next || 1;

      this.renderDetalle();
      this.renderResumen();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.toggleLoading(false);
    }
  }

  renderDetalle() {
    const paquete = this.state.selectedPaquete;
    const viaje = this.state.viaje || {};
    if (!paquete) return;

    const paqueteItems = [
      { label: this.t('ui.codigoPaquete'), value: paquete.codigo_paquete },
      { label: this.t('ui.fecha'), value: paquete.fecha_actualizado },
      { label: this.t('ui.nombreCliente'), value: paquete.nombre_cliente },
      { label: this.t('ui.numCliente'), value: paquete.num_cliente },
      { label: this.t('ui.puntoEntrega'), value: paquete.concatenarpuntoentrega },
      { label: this.t('ui.numRecibe'), value: paquete.concatenarnumrecibe },
    ];

    this.paqueteDetalle.innerHTML = paqueteItems
      .map((item) => `<li><strong>${item.label}:</strong> ${item.value ?? ''}</li>`)
      .join('');

    const viajeItems = [
      { label: this.t('ui.fechaLabel'), value: viaje.fecha },
      { label: this.t('ui.viajeLabel'), value: viaje.nombrebase },
      { label: this.t('ui.motorizadoLabel'), value: viaje.nombre_motorizado },
      { label: this.t('ui.wspLabel'), value: viaje.numero_wsp },
      { label: this.t('ui.llamadasLabel'), value: viaje.num_llamadas },
      { label: this.t('ui.yapeLabel'), value: viaje.num_yape },
      { label: this.t('ui.linkLabel'), value: viaje.link, isLink: true },
      { label: this.t('ui.observacionLabel'), value: viaje.observacion },
    ];

    this.viajeDetalle.innerHTML = viajeItems
      .map((item) => {
        if (item.isLink && item.value) {
          return `<li><strong>${item.label}:</strong> <a class="summary-link" href="${item.value}" target="_blank">${item.value}</a></li>`;
        }
        return `<li><strong>${item.label}:</strong> ${item.value ?? ''}</li>`;
      })
      .join('');

    this.detalleTableBody.innerHTML = '';
    if (this.state.movDetalle.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.className = 'small-muted text-center py-4';
      cell.textContent = this.t('ui.sinDatos');
      row.appendChild(cell);
      this.detalleTableBody.appendChild(row);
      return;
    }

    this.state.movDetalle.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.nombre_producto ?? ''}</td>
        <td>${item.cantidad ?? ''}</td>
      `;
      this.detalleTableBody.appendChild(row);
    });
  }

  renderResumen() {
    const paquete = this.state.selectedPaquete;
    if (!paquete) {
      this.resumenPaquete.innerHTML = '';
      return;
    }
    const viaje = this.state.viaje || {};
    const estado = this.estadoSelect.value || '-';

    this.resumenPaquete.innerHTML = `
      <div class="summary-title">${this.t('ui.resumenTitulo')}</div>
      <ul class="summary-list">
        <li><strong>${this.t('ui.codigoPaquete')}:</strong> ${paquete.codigo_paquete ?? ''}</li>
        <li><strong>${this.t('ui.clienteLabel')}:</strong> ${paquete.nombre_cliente ?? ''}</li>
        <li><strong>${this.t('ui.entregaLabel')}:</strong> ${paquete.concatenarpuntoentrega ?? ''}</li>
        <li><strong>${this.t('ui.numRecibe')}:</strong> ${paquete.concatenarnumrecibe ?? ''}</li>
        <li><strong>${this.t('ui.viajeLabel')}:</strong> ${viaje.nombrebase ?? ''}</li>
        <li><strong>${this.t('ui.linkLabel')}:</strong> ${viaje.link ?? ''}</li>
        <li><strong>${this.t('ui.estadoLabel')}:</strong> ${estado}</li>
      </ul>
    `;
  }

  async guardarEstado() {
    this.clearAlerts();
    if (!(await this.validateStep())) return;

    const paquete = this.state.selectedPaquete;
    const estado = this.estadoSelect.value;

    this.toggleLoading(true, this.t('ui.loading'));
    try {
      const response = await fetch('/api/paquetes/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_paquete: paquete.codigo_paquete,
          estado,
          ordinal: this.state.ordinal,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || this.t('messages.errorServer'));
      }
      await response.json();
      this.showSuccess(this.t('messages.guardarOk'));
      this.resetWizard();
      await this.loadPaquetes();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.toggleLoading(false);
    }
  }

  resetWizard() {
    this.currentStep = 0;
    this.state.selectedPaquete = null;
    this.state.viaje = null;
    this.state.movDetalle = [];
    this.estadoSelect.value = '';
    this.confirmOperacion.checked = false;
    this.selectedLabel.textContent = this.t('ui.sinSeleccion');
    this.paqueteDetalle.innerHTML = '';
    this.viajeDetalle.innerHTML = '';
    this.detalleTableBody.innerHTML = '';
    this.resumenPaquete.innerHTML = '';
    this.updateStep();
  }

  async loadLogs() {
    try {
      const response = await fetch('/api/logs/latest');
      if (!response.ok) throw new Error(this.t('messages.errorServer'));
      const data = await response.json();
      this.logsContent.textContent = data.content || this.t('messages.sinLogs');
      this.logsModal.show();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
