class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 3;
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
    this.empacarBtn = document.getElementById('empacarBtn');
    this.empacarSpinner = document.getElementById('empacarSpinner');
    this.confirmOperacion = document.getElementById('confirmOperacion');
    this.selectedChip = document.getElementById('selectedChip');

    this.paquetesTableBody = document.querySelector('#paquetesTable tbody');
    this.detalleTableBody = document.querySelector('#detalleTable tbody');
    this.puntoEntregaInput = document.getElementById('puntoEntregaInput');
    this.numRecibeInput = document.getElementById('numRecibeInput');

    this.summaryCodigo = document.getElementById('summaryCodigo');
    this.summaryEntrega = document.getElementById('summaryEntrega');
    this.summaryRecibe = document.getElementById('summaryRecibe');
    this.summaryOrdinal = document.getElementById('summaryOrdinal');

    this.regex = {
      codigo: /^[A-Za-z0-9_-]+$/,
    };

    this.state = {
      locale: this.getLocale(),
      paquetes: [],
      detalle: [],
      selectedPackage: null,
      ordinal: null,
    };

    this.dictionary = {
      es: {
        stepTitles: [
          'Paso 1: Seleccionar Paquete',
          'Paso 2: Detalle del Documento',
          'Paso 3: Confirmar Empaque',
        ],
        stepHints: [
          'Selecciona un paquete pendiente para empacar.',
          'Revisa el detalle del documento (solo lectura).',
          'Confirma la operacion y registra el empaque.',
        ],
        ui: {
          wizardStatus: 'Servicio Global IaaS/PaaS',
          wizardTitle: 'Empaquetar',
          wizardSubtitle: 'Gestiona paquetes pendientes con visibilidad global y trazabilidad en tiempo real.',
          gridPendientes: 'vPaquetesPendientes',
          gridPendientesHint: 'Seleccione un paquete pendiente.',
          codigoPaquete: 'Codigo',
          fechaActualizado: 'Fecha',
          nombreCliente: 'Cliente',
          numCliente: 'Num Cliente',
          puntoEntrega: 'Punto Entrega',
          numRecibe: 'Num Recibe',
          gridDetalle: 'Detalle Documento',
          gridDetalleHint: 'Solo lectura.',
          producto: 'Producto',
          cantidad: 'Cantidad',
          resumen: 'Resumen',
          resumenHint: 'Confirma los datos antes de registrar el empaque.',
          ordinal: 'Ordinal',
          confirmacion: 'Confirmo que la informacion es correcta',
          empacar: 'Empacar',
          empacarHint: 'Se registrara el empaque y se actualizara el stock.',
          anterior: 'Anterior',
          siguiente: 'Siguiente',
          loading: 'Procesando...',
          loadingHint: 'Espere un momento.',
          noSelection: 'Sin seleccion',
        },
        messages: {
          errorServer: 'Error al comunicar con el servidor.',
          required: 'Debe seleccionar un paquete valido.',
          confirmacion: 'Debe confirmar la operacion.',
          detalleVacio: 'No hay detalle disponible.',
          sinPaquetes: 'No hay paquetes pendientes.',
          empacarOk: 'Empaque registrado correctamente.',
        },
      },
      en: {
        stepTitles: [
          'Step 1: Select Package',
          'Step 2: Document Detail',
          'Step 3: Confirm Packaging',
        ],
        stepHints: [
          'Select a pending package to pack.',
          'Review document detail (read-only).',
          'Confirm the operation and register the package.',
        ],
        ui: {
          wizardStatus: 'Global IaaS/PaaS Service',
          wizardTitle: 'Package',
          wizardSubtitle: 'Manage pending packages with global visibility and real-time traceability.',
          gridPendientes: 'vPendingPackages',
          gridPendientesHint: 'Select a pending package.',
          codigoPaquete: 'Code',
          fechaActualizado: 'Date',
          nombreCliente: 'Client',
          numCliente: 'Client No.',
          puntoEntrega: 'Delivery Point',
          numRecibe: 'Receiver No.',
          gridDetalle: 'Document Detail',
          gridDetalleHint: 'Read-only.',
          producto: 'Product',
          cantidad: 'Quantity',
          resumen: 'Summary',
          resumenHint: 'Confirm the data before packaging.',
          ordinal: 'Ordinal',
          confirmacion: 'I confirm the information is correct',
          empacar: 'Pack',
          empacarHint: 'Packaging will be registered and stock updated.',
          anterior: 'Back',
          siguiente: 'Next',
          loading: 'Processing...',
          loadingHint: 'Please wait.',
          noSelection: 'No selection',
        },
        messages: {
          errorServer: 'Unable to reach the server.',
          required: 'Please select a valid package.',
          confirmacion: 'Please confirm the operation.',
          detalleVacio: 'No detail available.',
          sinPaquetes: 'No pending packages.',
          empacarOk: 'Packaging registered successfully.',
        },
      },
    };
  }

  getLocale() {
    const lang = navigator.language || 'es';
    return lang.toLowerCase().startsWith('es') ? 'es' : 'en';
  }

  t(path) {
    const [section, key] = path.split('.');
    const dict = this.dictionary[this.state.locale] || this.dictionary.es;
    return dict[section]?.[key] || '';
  }

  applyTranslations() {
    const dict = this.dictionary[this.state.locale] || this.dictionary.es;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (dict.ui && dict.ui[key]) {
        el.textContent = dict.ui[key];
      }
    });
    this.updateStepHeader();
  }

  updateStepHeader() {
    const dict = this.dictionary[this.state.locale] || this.dictionary.es;
    this.stepTitle.textContent = dict.stepTitles[this.currentStep];
    this.stepHint.textContent = dict.stepHints[this.currentStep];
  }

  setLoading(isLoading, message) {
    if (message) this.loadingText.textContent = message;
    this.loadingOverlay.classList.toggle('d-none', !isLoading);
  }

  setError(message) {
    this.errorBox.textContent = message;
    this.errorBox.classList.remove('d-none');
  }

  clearError() {
    this.errorBox.classList.add('d-none');
    this.errorBox.textContent = '';
  }

  setSuccess(message) {
    this.successBox.textContent = message;
    this.successBox.classList.remove('d-none');
  }

  clearSuccess() {
    this.successBox.classList.add('d-none');
    this.successBox.textContent = '';
  }

  updateProgress() {
    const progress = Math.round(((this.currentStep + 1) / this.totalSteps) * 100);
    this.progressBar.style.width = `${progress}%`;
    this.progressBar.setAttribute('aria-valuenow', String(progress));
    this.updateStepHeader();
    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.disabled = this.currentStep === this.totalSteps - 1;
  }

  showStep(index) {
    this.steps.forEach((step, idx) => step.classList.toggle('active', idx === index));
    this.currentStep = index;
    this.updateProgress();
  }

  async fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || this.dictionary[this.state.locale].messages.errorServer);
    }
    return response.json();
  }

  async loadPaquetes() {
    this.setLoading(true, this.dictionary[this.state.locale].ui.loading);
    this.clearError();
    try {
      const data = await this.fetchJson('/api/paquetes?estado=pendiente%20empacar');
      this.state.paquetes = Array.isArray(data) ? data : [];
      this.renderPaquetes();
    } catch (error) {
      this.setError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  renderPaquetes() {
    this.paquetesTableBody.innerHTML = '';
    if (!this.state.paquetes.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6" class="text-center">${this.dictionary[this.state.locale].messages.sinPaquetes}</td>`;
      this.paquetesTableBody.appendChild(row);
      return;
    }

    this.state.paquetes.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.codigo_paquete ?? ''}</td>
        <td>${item.fecha_actualizado ?? ''}</td>
        <td>${item.nombre_cliente ?? ''}</td>
        <td>${item.num_cliente ?? ''}</td>
        <td>${item.concatenarpuntoentrega ?? ''}</td>
        <td>${item.concatenarnumrecibe ?? ''}</td>
      `;
      row.addEventListener('click', () => this.selectPaquete(item, row));
      this.paquetesTableBody.appendChild(row);
    });
  }

  async selectPaquete(item, row) {
    this.clearError();
    this.clearSuccess();
    if (!item || !item.codigo_paquete) {
      this.setError(this.dictionary[this.state.locale].messages.required);
      return;
    }
    if (!this.regex.codigo.test(String(item.codigo_paquete))) {
      this.setError(this.dictionary[this.state.locale].messages.required);
      return;
    }

    Array.from(this.paquetesTableBody.querySelectorAll('tr')).forEach((tr) => tr.classList.remove('active'));
    row.classList.add('active');

    this.state.selectedPackage = item;
    this.selectedChip.textContent = `${item.codigo_paquete}`;

    this.setLoading(true, this.dictionary[this.state.locale].ui.loading);
    try {
      const [detalle, ordinal] = await Promise.all([
        this.fetchJson(`/api/mov-contable-detalle?tipo=FAC&numero=${encodeURIComponent(item.codigo_paquete)}`),
        this.fetchJson(`/api/paquete/next-ordinal?codigo=${encodeURIComponent(item.codigo_paquete)}`),
      ]);
      this.state.detalle = Array.isArray(detalle) ? detalle : [];
      this.state.ordinal = ordinal?.next ?? null;
      this.puntoEntregaInput.value = item.concatenarpuntoentrega ?? '';
      this.numRecibeInput.value = item.concatenarnumrecibe ?? '';
      this.renderDetalle();
      this.updateSummary();
    } catch (error) {
      this.setError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  renderDetalle() {
    this.detalleTableBody.innerHTML = '';
    if (!this.state.detalle.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="2" class="text-center">${this.dictionary[this.state.locale].messages.detalleVacio}</td>`;
      this.detalleTableBody.appendChild(row);
      return;
    }
    this.state.detalle.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.nombre_producto ?? ''}</td>
        <td>${item.cantidad ?? ''}</td>
      `;
      this.detalleTableBody.appendChild(row);
    });
  }

  updateSummary() {
    const item = this.state.selectedPackage || {};
    this.summaryCodigo.textContent = item.codigo_paquete ?? '-';
    this.summaryEntrega.textContent = item.concatenarpuntoentrega ?? '-';
    this.summaryRecibe.textContent = item.concatenarnumrecibe ?? '-';
    this.summaryOrdinal.textContent = this.state.ordinal ?? '-';
  }

  validateStep(index) {
    if (index === 0) {
      if (!this.state.selectedPackage || !this.regex.codigo.test(String(this.state.selectedPackage.codigo_paquete || ''))) {
        this.setError(this.dictionary[this.state.locale].messages.required);
        return false;
      }
      return true;
    }
    if (index === 2) {
      if (!this.state.selectedPackage || !this.state.ordinal) {
        this.setError(this.dictionary[this.state.locale].messages.required);
        return false;
      }
      if (!this.confirmOperacion.checked) {
        this.setError(this.dictionary[this.state.locale].messages.confirmacion);
        return false;
      }
      return true;
    }
    return true;
  }

  async empacar() {
    if (!this.validateStep(2)) return;
    this.clearError();
    this.clearSuccess();
    this.empacarSpinner.classList.remove('d-none');
    this.empacarBtn.disabled = true;
    try {
      const payload = {
        codigo_paquete: this.state.selectedPackage.codigo_paquete,
        ordinal: this.state.ordinal,
      };
      await this.fetchJson('/api/empacar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.setSuccess(this.dictionary[this.state.locale].messages.empacarOk);
      this.confirmOperacion.checked = false;
      this.state.selectedPackage = null;
      this.state.ordinal = null;
      this.state.detalle = [];
      this.selectedChip.textContent = this.dictionary[this.state.locale].ui.noSelection;
      this.puntoEntregaInput.value = '';
      this.numRecibeInput.value = '';
      this.renderDetalle();
      this.updateSummary();
      await this.loadPaquetes();
      this.showStep(0);
    } catch (error) {
      this.setError(error.message);
    } finally {
      this.empacarSpinner.classList.add('d-none');
      this.empacarBtn.disabled = false;
    }
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => {
      this.clearError();
      this.clearSuccess();
      if (this.currentStep > 0) this.showStep(this.currentStep - 1);
    });

    this.nextBtn.addEventListener('click', () => {
      this.clearError();
      this.clearSuccess();
      if (!this.validateStep(this.currentStep)) return;
      if (this.currentStep < this.totalSteps - 1) this.showStep(this.currentStep + 1);
    });

    this.empacarBtn.addEventListener('click', () => this.empacar());
  }

  async init() {
    document.documentElement.lang = this.state.locale;
    this.applyTranslations();
    this.updateProgress();
    this.bindEvents();
    await this.loadPaquetes();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
