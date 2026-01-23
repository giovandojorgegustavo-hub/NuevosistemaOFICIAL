class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 3;
    this.selectedPaquete = null;
    this.ordinal = null;

    this.progressEl = document.getElementById('wizardProgress');
    this.stepEls = document.querySelectorAll('.wizard-step');
    this.stepBadges = document.querySelectorAll('.step-badge');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.submitBtn = document.getElementById('submitBtn');
    this.errorAlert = document.getElementById('errorAlert');
    this.successAlert = document.getElementById('successAlert');
    this.paquetesTableBody = document.querySelector('#paquetesTable tbody');
    this.detalleTableBody = document.querySelector('#detalleTable tbody');

    this.puntoEntrega = document.getElementById('puntoEntrega');
    this.numRecibe = document.getElementById('numRecibe');
    this.summaryCodigo = document.getElementById('summaryCodigo');
    this.summaryOrdinal = document.getElementById('summaryOrdinal');
    this.toggleEntrega = document.getElementById('toggleEntrega');
    this.entregaGroup = document.getElementById('entregaGroup');
    this.entregaNombre = document.getElementById('entregaNombre');
    this.recibeId = document.getElementById('recibeId');
    this.confirmCheck = document.getElementById('confirmCheck');

    this.init();
  }

  init() {
    this.applyTranslations();
    this.updateStep();
    this.bindEvents();
    this.loadPaquetes();
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.goStep(this.currentStep - 1));
    this.nextBtn.addEventListener('click', () => this.handleNext());
    document.getElementById('wizardForm').addEventListener('submit', (event) => this.handleSubmit(event));
    document.getElementById('refreshBtn').addEventListener('click', () => this.loadPaquetes());
    this.toggleEntrega.addEventListener('change', () => {
      this.entregaGroup.classList.toggle('d-none', !this.toggleEntrega.checked);
    });
  }

  showError(message) {
    this.errorAlert.textContent = message;
    this.errorAlert.classList.remove('d-none');
  }

  clearAlerts() {
    this.errorAlert.classList.add('d-none');
    this.successAlert.classList.add('d-none');
  }

  async loadPaquetes() {
    this.clearAlerts();
    this.paquetesTableBody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
    try {
      const response = await fetch('/api/paquetes?estado=pendiente%20empacar');
      if (!response.ok) throw new Error('No se pudieron cargar los paquetes.');
      const data = await response.json();
      this.renderPaquetes(data);
    } catch (error) {
      this.showError(error.message);
    }
  }

  renderPaquetes(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      this.paquetesTableBody.innerHTML = '<tr><td colspan="7">Sin resultados.</td></tr>';
      return;
    }
    this.paquetesTableBody.innerHTML = rows
      .map((row) => {
        const codigo = row.codigo_paquete || row.Vcodigo_paquete || '';
        return `
          <tr>
            <td>${codigo}</td>
            <td>${row.fecha_actualizado || row.vfecha || ''}</td>
            <td>${row.nombre_cliente || row.vnombre_cliente || ''}</td>
            <td>${row.num_cliente || row.vnum_cliente || ''}</td>
            <td>${row.concatenarpuntoentrega || row.vconcatenarpuntoentrega || ''}</td>
            <td>${row.concatenarnumrecibe || row.vconcatenarnumrecibe || ''}</td>
            <td><button class="btn btn-ghost btn-select" data-codigo="${codigo}">Seleccionar</button></td>
          </tr>`;
      })
      .join('');

    this.paquetesTableBody.querySelectorAll('.btn-select').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const codigo = event.currentTarget.dataset.codigo;
        const row = rows.find((item) => (item.codigo_paquete || item.Vcodigo_paquete) === codigo);
        this.selectPaquete(row);
      });
    });
  }

  async selectPaquete(row) {
    if (!row) return;
    this.selectedPaquete = {
      codigo: row.codigo_paquete || row.Vcodigo_paquete,
      puntoEntrega: row.concatenarpuntoentrega || row.vconcatenarpuntoentrega || '',
      numRecibe: row.concatenarnumrecibe || row.vconcatenarnumrecibe || ''
    };
    this.puntoEntrega.value = this.selectedPaquete.puntoEntrega;
    this.numRecibe.value = this.selectedPaquete.numRecibe;
    this.summaryCodigo.textContent = this.selectedPaquete.codigo;

    await this.fetchDetalle();
    await this.fetchOrdinal();
    this.goStep(1);
  }

  async fetchDetalle() {
    if (!this.selectedPaquete) return;
    this.detalleTableBody.innerHTML = '<tr><td colspan="2">Cargando...</td></tr>';
    try {
      const response = await fetch(`/api/mov-detalle?tipo=FAC&num=${encodeURIComponent(this.selectedPaquete.codigo)}`);
      if (!response.ok) throw new Error('No se pudo cargar el detalle.');
      const data = await response.json();
      this.renderDetalle(data);
    } catch (error) {
      this.showError(error.message);
    }
  }

  renderDetalle(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      this.detalleTableBody.innerHTML = '<tr><td colspan="2">Sin detalle.</td></tr>';
      return;
    }
    this.detalleTableBody.innerHTML = rows
      .map((row) => `
        <tr>
          <td>${row.nombre_producto || row.Vnombre_producto || ''}</td>
          <td>${row.cantidad || row.vcantidad || ''}</td>
        </tr>`)
      .join('');
  }

  async fetchOrdinal() {
    if (!this.selectedPaquete) return;
    try {
      const response = await fetch(`/api/ordinal?codigo=${encodeURIComponent(this.selectedPaquete.codigo)}`);
      if (!response.ok) throw new Error('No se pudo calcular ordinal.');
      const data = await response.json();
      this.ordinal = data.next || 1;
      this.summaryOrdinal.textContent = this.ordinal;
    } catch (error) {
      this.showError(error.message);
    }
  }

  goStep(step) {
    this.currentStep = Math.min(Math.max(step, 0), this.totalSteps - 1);
    this.updateStep();
  }

  updateStep() {
    this.stepEls.forEach((el) => el.classList.add('d-none'));
    this.stepEls[this.currentStep].classList.remove('d-none');

    this.stepBadges.forEach((badge, index) => {
      badge.classList.toggle('active', index <= this.currentStep);
    });

    const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
    this.progressEl.style.width = `${progress}%`;

    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.classList.toggle('d-none', this.currentStep === this.totalSteps - 1);
    this.submitBtn.classList.toggle('d-none', this.currentStep !== this.totalSteps - 1);
  }

  handleNext() {
    this.clearAlerts();
    if (this.currentStep === 0 && !this.selectedPaquete) {
      this.showError(this.t('errorSelect'));
      return;
    }
    if (this.currentStep === 1) {
      this.goStep(2);
      return;
    }
    this.goStep(this.currentStep + 1);
  }

  validateStep3() {
    let valid = true;
    const nameRegex = /^[a-zA-ZÀ-ÿ\s.'-]{3,60}$/;
    const idRegex = /^\d{4,20}$/;

    if (this.toggleEntrega.checked) {
      if (!nameRegex.test(this.entregaNombre.value.trim())) {
        this.entregaNombre.classList.add('is-invalid');
        valid = false;
      } else {
        this.entregaNombre.classList.remove('is-invalid');
      }
      if (!idRegex.test(this.recibeId.value.trim())) {
        this.recibeId.classList.add('is-invalid');
        valid = false;
      } else {
        this.recibeId.classList.remove('is-invalid');
      }
    }

    if (!this.confirmCheck.checked) {
      this.confirmCheck.classList.add('is-invalid');
      valid = false;
    } else {
      this.confirmCheck.classList.remove('is-invalid');
    }

    return valid;
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.clearAlerts();
    if (!this.validateStep3()) return;

    const payload = {
      codigo_paquete: this.selectedPaquete.codigo,
      entrega_nombre: this.entregaNombre.value.trim() || null,
      recibe_id: this.recibeId.value.trim() || null
    };

    const spinner = this.submitBtn.querySelector('.spinner-border');
    spinner.classList.remove('d-none');
    this.submitBtn.disabled = true;

    try {
      const response = await fetch('/api/empacar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Error en el servidor.' }));
        throw new Error(err.message || 'Error en el servidor.');
      }
      const result = await response.json();
      this.successAlert.textContent = result.message || this.t('success');
      this.successAlert.classList.remove('d-none');
      this.resetWizard();
    } catch (error) {
      this.showError(error.message);
    } finally {
      spinner.classList.add('d-none');
      this.submitBtn.disabled = false;
    }
  }

  resetWizard() {
    this.selectedPaquete = null;
    this.ordinal = null;
    this.puntoEntrega.value = '';
    this.numRecibe.value = '';
    this.summaryCodigo.textContent = '-';
    this.summaryOrdinal.textContent = '-';
    this.entregaNombre.value = '';
    this.recibeId.value = '';
    this.confirmCheck.checked = false;
    this.toggleEntrega.checked = false;
    this.entregaGroup.classList.add('d-none');
    this.goStep(0);
    this.loadPaquetes();
  }

  applyTranslations() {
    const lang = (navigator.language || 'es').toLowerCase();
    const dictionary = {
      es: {
        eyebrow: 'IaaS + PaaS Global Logistics',
        title: 'Registro de Empaque',
        subtitle: 'Gestione paquetes pendientes con trazabilidad y control operativo.',
        status: 'Operativo',
        step1Title: '1. Seleccionar paquete pendiente',
        step2Title: '2. Detalle del documento',
        step3Title: '3. Confirmar empaque',
        refresh: 'Actualizar',
        colCodigo: 'Código',
        colFecha: 'Fecha',
        colCliente: 'Cliente',
        colNumCliente: '# Cliente',
        colEntrega: 'Punto Entrega',
        colRecibe: 'Recibe',
        colProducto: 'Producto',
        colCantidad: 'Cantidad',
        labelEntrega: 'Punto de entrega',
        labelRecibe: 'Recibe',
        labelEntregaNombre: 'Persona entrega',
        labelRecibeId: 'Identificación recibe',
        toggleEntrega: 'Registrar entrega/recibe',
        confirm: 'Confirmo que el paquete está listo para empacar.',
        prev: 'Anterior',
        next: 'Siguiente',
        submit: 'Empacar',
        summaryCodigo: 'Código Paquete',
        summaryOrdinal: 'Ordinal',
        step1Help: 'Seleccione un paquete para ver el detalle del documento.',
        errorSelect: 'Seleccione un paquete pendiente antes de continuar.',
        errorEntrega: 'Ingrese un nombre válido.',
        errorRecibe: 'Ingrese una identificación válida.',
        errorConfirm: 'Debe confirmar antes de continuar.',
        success: 'Empaque registrado correctamente.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Logistics',
        title: 'Packing Registration',
        subtitle: 'Manage pending packages with traceability and operational control.',
        status: 'Operational',
        step1Title: '1. Select pending package',
        step2Title: '2. Document detail',
        step3Title: '3. Confirm packing',
        refresh: 'Refresh',
        colCodigo: 'Code',
        colFecha: 'Date',
        colCliente: 'Client',
        colNumCliente: 'Client #',
        colEntrega: 'Delivery point',
        colRecibe: 'Receiver',
        colProducto: 'Product',
        colCantidad: 'Quantity',
        labelEntrega: 'Delivery point',
        labelRecibe: 'Receiver',
        labelEntregaNombre: 'Delivered by',
        labelRecibeId: 'Receiver ID',
        toggleEntrega: 'Register delivery/receiver',
        confirm: 'I confirm the package is ready to be packed.',
        prev: 'Back',
        next: 'Next',
        submit: 'Pack',
        summaryCodigo: 'Package Code',
        summaryOrdinal: 'Ordinal',
        step1Help: 'Select a package to view the document detail.',
        errorSelect: 'Please select a pending package to continue.',
        errorEntrega: 'Enter a valid name.',
        errorRecibe: 'Enter a valid ID.',
        errorConfirm: 'You must confirm before continuing.',
        success: 'Packing registered successfully.'
      }
    };

    const locale = lang.startsWith('en') ? 'en' : 'es';
    this.locale = locale;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = dictionary[locale][key] || dictionary.es[key] || el.textContent;
    });
  }

  t(key) {
    const lookup = {
      es: {
        errorSelect: 'Seleccione un paquete pendiente antes de continuar.',
        success: 'Empaque registrado correctamente.'
      },
      en: {
        errorSelect: 'Please select a pending package to continue.',
        success: 'Packing registered successfully.'
      }
    };
    return (lookup[this.locale] && lookup[this.locale][key]) || lookup.es[key] || key;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
