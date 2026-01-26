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
    this.detalleBody = document.getElementById('detalleBody');
    this.summaryCard = document.getElementById('summaryCard');
    this.selectedPaquete = null;
    this.detalle = [];
    this.ordinal = null;

    this.init();
  }

  init() {
    this.setLanguage();
    this.applyLanguage();
    this.updateButtons();
    this.attachEvents();
    this.loadPaquetes();
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
    this.nextBtn.textContent = this.currentStep === this.steps.length - 1 ? this.dict.pack : this.dict.next;
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
      await this.saveEmpaque();
      return;
    }

    this.goToStep(this.currentStep + 1);
    if (this.currentStep === 1) {
      await this.loadDetalle();
    }
    if (this.currentStep === 2) {
      this.renderSummary();
    }
  }

  async validateStep() {
    this.clearAlert();

    if (this.currentStep === 0) {
      if (!this.selectedPaquete) {
        this.showAlert('warning', this.dict.errors.paquete);
        return false;
      }
      const codeRegex = /^[0-9A-Za-z-]+$/;
      if (!codeRegex.test(this.selectedPaquete.codigo_paquete || '')) {
        this.showAlert('warning', this.dict.errors.codigo);
        return false;
      }
      return true;
    }

    if (this.currentStep === 1) {
      if (!Array.isArray(this.detalle) || this.detalle.length === 0) {
        this.showAlert('warning', this.dict.errors.detalle);
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

  async loadPaquetes() {
    try {
      this.setLoading(this.dict.loading);
      const response = await fetch('/api/paquetes?estado=pendiente%20empacar');
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
      row.dataset.codigo = codigo;
      row.innerHTML = `
        <td><input class="form-check-input" type="radio" name="paqueteSelect" /></td>
        <td>${codigo}</td>
        <td>${paquete.fecha_actualizado || paquete.vfecha || ''}</td>
        <td>${paquete.nombre_cliente || paquete.vnombre_cliente || ''}</td>
        <td>${paquete.num_cliente || paquete.vnum_cliente || ''}</td>
        <td>${paquete.concatenarpuntoentrega || paquete.vconcatenarpuntoentrega || ''}</td>
        <td>${paquete.concatenarnumrecibe || paquete.vconcatenarnumrecibe || ''}</td>
      `;
      row.addEventListener('click', () => this.selectPaquete(paquete, row));
      row.querySelector('input').addEventListener('change', () => this.selectPaquete(paquete, row));
      this.paquetesBody.appendChild(row);
    });
  }

  selectPaquete(paquete, row) {
    this.paquetesBody.querySelectorAll('tr').forEach((tr) => tr.classList.remove('selected'));
    row.classList.add('selected');
    row.querySelector('input').checked = true;

    this.selectedPaquete = {
      codigo_paquete: paquete.codigo_paquete || paquete.vcodigo_paquete || '',
      fecha: paquete.fecha_actualizado || paquete.vfecha || '',
      nombre_cliente: paquete.nombre_cliente || paquete.vnombre_cliente || '',
      num_cliente: paquete.num_cliente || paquete.vnum_cliente || '',
      entrega: paquete.concatenarpuntoentrega || paquete.vconcatenarpuntoentrega || '',
      recibe: paquete.concatenarnumrecibe || paquete.vconcatenarnumrecibe || ''
    };

    document.getElementById('puntoEntrega').value = this.selectedPaquete.entrega || '-';
    document.getElementById('numRecibe').value = this.selectedPaquete.recibe || '-';
  }

  async loadDetalle() {
    if (!this.selectedPaquete) return;
    try {
      this.setLoading(this.dict.loadingDetalle);
      const codigo = encodeURIComponent(this.selectedPaquete.codigo_paquete);
      const response = await fetch(`/api/paquetes/detalle?codigo=${codigo}&tipo=FAC`);
      const data = await response.json();
      this.detalle = data.detalle || [];
      this.ordinal = data.ordinal || null;
      this.renderDetalle();
    } catch (error) {
      this.showAlert('danger', this.dict.errors.detalleLoad);
    } finally {
      this.setLoading('');
    }
  }

  renderDetalle() {
    this.detalleBody.innerHTML = '';
    if (!Array.isArray(this.detalle) || this.detalle.length === 0) {
      this.detalleBody.innerHTML = `<tr><td colspan="2" class="text-muted">${this.dict.emptyDetalle}</td></tr>`;
      return;
    }

    this.detalle.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.nombre_producto || item.Vnombre_producto || ''}</td>
        <td>${item.cantidad || item.vcantidad || ''}</td>
      `;
      this.detalleBody.appendChild(row);
    });
  }

  renderSummary() {
    if (!this.selectedPaquete) return;

    this.summaryCard.innerHTML = `
      <div class="row g-3">
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.codigo}</p>
          <p>${this.selectedPaquete.codigo_paquete}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.cliente}</p>
          <p>${this.selectedPaquete.nombre_cliente || '-'}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.entrega}</p>
          <p>${this.selectedPaquete.entrega || '-'}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.recibe}</p>
          <p>${this.selectedPaquete.recibe || '-'}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.ordinal}</p>
          <p>${this.ordinal || '-'}</p>
        </div>
        <div class="col-md-6">
          <p class="text-muted mb-1">${this.dict.items}</p>
          <p>${this.detalle.length}</p>
        </div>
      </div>
    `;
  }

  async saveEmpaque() {
    try {
      this.setLoading(this.dict.saving);
      const payload = { codigo_paquete: this.selectedPaquete.codigo_paquete };
      const response = await fetch('/api/empacar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        this.showAlert('danger', result.message || this.dict.errors.save);
        return;
      }
      this.showAlert('success', this.dict.success.replace('{id}', result.codigo_paquete));
      this.resetWizard();
    } catch (error) {
      this.showAlert('danger', this.dict.errors.save);
    } finally {
      this.setLoading('');
    }
  }

  resetWizard() {
    this.selectedPaquete = null;
    this.detalle = [];
    this.ordinal = null;
    this.paquetesBody.innerHTML = '';
    this.detalleBody.innerHTML = '';
    this.summaryCard.innerHTML = '';
    document.getElementById('confirmCheck').checked = false;
    document.getElementById('puntoEntrega').value = '';
    document.getElementById('numRecibe').value = '';
    this.goToStep(0);
    this.loadPaquetes();
  }
}

const translations = {
  es: {
    tag: 'IaaS + PaaS Global',
    title: 'Empaquetar',
    subtitle: 'Flujo multi-paso para confirmar empaques con trazabilidad segura.',
    status: 'Estado del flujo',
    statusHint: 'Selecciona un paquete para iniciar.',
    step1Title: '1. Seleccionar Paquete Pendiente',
    step1Subtitle: 'Elige el paquete pendiente de empacar.',
    step2Title: '2. Detalle del Documento',
    step2Subtitle: 'Consulta la informacion asociada al documento seleccionado.',
    step3Title: '3. Confirmar Empaque',
    step3Subtitle: 'Verifica el resumen antes de ejecutar el empaque.',
    ready: 'Listo para empacar',
    readonly: 'Solo lectura',
    refresh: 'Actualizar',
    codigo: 'Codigo',
    fecha: 'Fecha',
    cliente: 'Cliente',
    telefono: 'Telefono',
    entrega: 'Punto entrega',
    recibe: 'Recibe',
    producto: 'Producto',
    cantidad: 'Cantidad',
    prev: 'Anterior',
    next: 'Siguiente',
    pack: 'Empacar',
    confirm: 'Confirmo la operacion.',
    ordinal: 'Ordinal',
    items: 'Items',
    loading: 'Cargando paquetes...',
    loadingDetalle: 'Cargando detalle...',
    saving: 'Registrando empaque...',
    emptyPaquetes: 'No hay paquetes pendientes de empacar.',
    emptyDetalle: 'No hay detalle disponible para este documento.',
    success: 'Empaque registrado para paquete {id}.',
    errors: {
      paquete: 'Selecciona un paquete pendiente.',
      codigo: 'Codigo de paquete invalido.',
      detalle: 'No hay detalle para confirmar.',
      confirm: 'Confirma la operacion para continuar.',
      paquetesLoad: 'No se pudieron cargar los paquetes.',
      detalleLoad: 'No se pudo cargar el detalle.',
      save: 'No se pudo registrar el empaque.'
    }
  },
  en: {
    tag: 'Global IaaS + PaaS',
    title: 'Packaging',
    subtitle: 'Multi-step flow to confirm packages with secure traceability.',
    status: 'Flow status',
    statusHint: 'Select a package to start.',
    step1Title: '1. Select Pending Package',
    step1Subtitle: 'Choose a package pending to be packed.',
    step2Title: '2. Document Details',
    step2Subtitle: 'Review the document linked to the selected package.',
    step3Title: '3. Confirm Packaging',
    step3Subtitle: 'Review the summary before executing the packaging.',
    ready: 'Ready to pack',
    readonly: 'Read only',
    refresh: 'Refresh',
    codigo: 'Code',
    fecha: 'Date',
    cliente: 'Client',
    telefono: 'Phone',
    entrega: 'Delivery point',
    recibe: 'Receiver',
    producto: 'Product',
    cantidad: 'Qty',
    prev: 'Previous',
    next: 'Next',
    pack: 'Pack',
    confirm: 'I confirm the operation.',
    ordinal: 'Ordinal',
    items: 'Items',
    loading: 'Loading packages...',
    loadingDetalle: 'Loading detail...',
    saving: 'Registering package...',
    emptyPaquetes: 'No pending packages available.',
    emptyDetalle: 'No detail available for this document.',
    success: 'Packaging registered for package {id}.',
    errors: {
      paquete: 'Select a pending package.',
      codigo: 'Invalid package code.',
      detalle: 'No detail available to confirm.',
      confirm: 'Please confirm to continue.',
      paquetesLoad: 'Unable to load packages.',
      detalleLoad: 'Unable to load detail.',
      save: 'Unable to register packaging.'
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
