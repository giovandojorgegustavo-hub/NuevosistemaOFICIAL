/*
Campos devueltos por procedimientos (LECTURA)
vcodigo_paquete = Llamada SP: get_paquetes_por_estado(p_estado="pendiente empacar") (devuelve campo_visible)
Campos devueltos
codigo_paquete
fecha_actualizado
codigo_cliente
nombre_cliente
num_cliente
codigo_puntoentrega
codigo_base
ordinal_numrecibe
concatenarpuntoentrega
concatenarnumrecibe
Variables
vcodigo_paquete visible no editable
vfecha_actualizado visible no editable
vcodigo_cliente no visible no editable
vnombre_cliente visible no editable
vnum_cliente visible no editable
vcodigo_puntoentrega no visible no editable
vcodigo_base visible no editable
vordinal_numrecibe no visible no editable
vconcatenarpuntoentrega visible no editable
vconcatenarnumrecibe visible no editable

vtipo_documento = Llamada SP: get_mov_contable_detalle(p_tipo_documento="FAC", p_numero_documento=vcodigo_paquete) (devuelve campo_visible)
Campos devueltos
tipo_documento
numero_documento
ordinal
codigo_producto
nombre_producto
cantidad
saldo
precio_total
Variables
vtipo_documento no visible no editable
vnumero_documento no visible no editable
vordinal no visible no editable
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vcantidad visible no editable
vsaldo no visible no editable
vprecio_total no visible no editable

vNombre_base_nueva = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
codigo_base
nombre
Variables
vCodigo_base_nueva visible editable
vNombre_base_nueva visible no editable
*/
class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progressBar = document.getElementById('wizardProgress');
    this.stepBadges = Array.from(document.querySelectorAll('.step-badge'));
    this.errorAlert = document.getElementById('errorAlert');
    this.successAlert = document.getElementById('successAlert');
    this.loadingState = document.getElementById('loadingState');

    this.paquetesBody = document.getElementById('paquetesBody');
    this.detalleBody = document.getElementById('detalleBody');
    this.paqueteSearch = document.getElementById('paqueteSearch');
    this.paquetesCounter = document.getElementById('paquetesCounter');
    this.pendingCount = document.getElementById('pendingCount');
    this.selectionPreview = document.getElementById('selectionPreview');

    this.vconcatenarpuntoentrega = document.getElementById('vconcatenarpuntoentrega');
    this.vconcatenarnumrecibe = document.getElementById('vconcatenarnumrecibe');
    this.vcodigo_base = document.getElementById('vcodigo_base');

    this.vCodigo_base_nueva = document.getElementById('vCodigo_base_nueva');
    this.vNombre_base_nueva = document.getElementById('vNombre_base_nueva');
    this.baseSuggestions = document.getElementById('baseSuggestions');

    this.vcodigo_usuario = document.getElementById('vcodigo_usuario');

    this.nextStep1 = document.getElementById('nextStep1');
    this.nextStep2 = document.getElementById('nextStep2');
    this.prevStep2 = document.getElementById('prevStep2');
    this.prevStep3 = document.getElementById('prevStep3');
    this.confirmBtn = document.getElementById('confirmBtn');

    this.summaryPaquete = document.getElementById('summaryPaquete');
    this.summaryCliente = document.getElementById('summaryCliente');
    this.summaryBaseActual = document.getElementById('summaryBaseActual');
    this.summaryBaseNueva = document.getElementById('summaryBaseNueva');
    this.summaryDocumento = document.getElementById('summaryDocumento');
    this.summaryDetalle = document.getElementById('summaryDetalle');

    this.baseCodeRegex = /^[A-Za-z0-9_-]+$/;
    this.userCodeRegex = /^\d+$/;

    this.paquetes = [];
    this.filteredPaquetes = [];
    this.detalle = [];
    this.bases = [];
    this.selectedPaquete = null;
    this.selectedBase = null;
    this.vtipo_documento = 'FAC';
  }

  async init() {
    this.applyLocale();
    this.bindEvents();
    await this.loadInitialData();
    this.goStep(0);
  }

  applyLocale() {
    const lang = (navigator.language || 'es').toLowerCase();
    const locale = lang.startsWith('es') ? 'es' : 'en';
    const translations = {
      es: {
        eyebrow: 'IaaS + PaaS Global Fabric',
        title: 'Reasignar Base',
        subtitle: 'Automatiza el traslado de paquetes pendientes con trazabilidad contable y auditoria en tiempo real.',
        status: 'Estado',
        statusValue: 'Operativo',
        pendingLabel: 'Paquetes pendientes',
        selectionLabel: 'Seleccion actual',
        wizardTitle: 'CU002 - Reasignar Base',
        wizardSubtitle: 'Flujo de tres pasos para reasignar la base y registrar el cambio.',
        step1Badge: 'Paso 1',
        step2Badge: 'Paso 2',
        step3Badge: 'Paso 3',
        step1Title: '1. Seleccionar Paquete Pendiente',
        step1Help: 'Selecciona un paquete pendiente para continuar con el detalle del documento.',
        searchPlaceholder: 'Buscar por codigo, cliente o base',
        thPaquete: 'Codigo Paquete',
        thCliente: 'Cliente',
        thNumCliente: 'Numero',
        thBase: 'Base',
        thActualizado: 'Actualizado',
        step2Title: '2. Detalle del Documento + Nueva Base',
        step2Help: 'Revisa el detalle contable y define la nueva base del paquete.',
        puntoEntrega: 'Punto de entrega',
        numRecibe: 'Numero recibe',
        baseActual: 'Base actual',
        thProducto: 'Producto',
        thCantidad: 'Cantidad',
        thSaldo: 'Saldo',
        thTotal: 'Total',
        nuevaBaseCodigo: 'Nueva base (codigo)',
        nuevaBaseNombre: 'Nombre de la base',
        nuevaBaseError: 'Seleccione una base valida distinta a la actual.',
        step3Title: '3. Confirmar Reasignacion',
        step3Help: 'Valida el resumen antes de ejecutar el cambio de base.',
        summaryPaquete: 'Paquete',
        summaryBase: 'Base actual',
        summaryBaseNueva: 'Nueva base',
        summaryDoc: 'Documento',
        summaryDetalle: 'Detalle contable cargado',
        codigoUsuario: 'Codigo usuario',
        codigoUsuarioError: 'Ingrese un codigo de usuario valido.',
        back: 'Anterior',
        next: 'Siguiente',
        confirm: 'Reasignar Base',
        loading: 'Procesando...',
        errorGeneric: 'Revise los campos obligatorios antes de continuar.',
        success: 'Reasignacion completada.',
        emptyPaquetes: 'Sin paquetes pendientes.',
        emptyDetalle: 'Sin detalle disponible.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Fabric',
        title: 'Reassign Base',
        subtitle: 'Automate pending packages reassignment with real-time accounting traceability.',
        status: 'Status',
        statusValue: 'Operational',
        pendingLabel: 'Pending packages',
        selectionLabel: 'Current selection',
        wizardTitle: 'CU002 - Reassign Base',
        wizardSubtitle: 'Three-step flow to reassign the base and register the change.',
        step1Badge: 'Step 1',
        step2Badge: 'Step 2',
        step3Badge: 'Step 3',
        step1Title: '1. Select Pending Package',
        step1Help: 'Choose a pending package to continue with document details.',
        searchPlaceholder: 'Search by code, client, or base',
        thPaquete: 'Package Code',
        thCliente: 'Client',
        thNumCliente: 'Number',
        thBase: 'Base',
        thActualizado: 'Updated',
        step2Title: '2. Document Detail + New Base',
        step2Help: 'Review accounting detail and define the new base.',
        puntoEntrega: 'Delivery point',
        numRecibe: 'Receiver number',
        baseActual: 'Current base',
        thProducto: 'Product',
        thCantidad: 'Quantity',
        thSaldo: 'Balance',
        thTotal: 'Total',
        nuevaBaseCodigo: 'New base (code)',
        nuevaBaseNombre: 'Base name',
        nuevaBaseError: 'Select a valid base different from current.',
        step3Title: '3. Confirm Reassignment',
        step3Help: 'Validate the summary before executing the base change.',
        summaryPaquete: 'Package',
        summaryBase: 'Current base',
        summaryBaseNueva: 'New base',
        summaryDoc: 'Document',
        summaryDetalle: 'Accounting detail loaded',
        codigoUsuario: 'User code',
        codigoUsuarioError: 'Enter a valid user code.',
        back: 'Back',
        next: 'Next',
        confirm: 'Reassign Base',
        loading: 'Processing...',
        errorGeneric: 'Review required fields before continuing.',
        success: 'Reassignment completed.',
        emptyPaquetes: 'No pending packages.',
        emptyDetalle: 'No detail available.'
      }
    };

    this.localeStrings = translations[locale];
    document.documentElement.lang = locale;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (this.localeStrings[key]) {
        el.textContent = this.localeStrings[key];
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (this.localeStrings[key]) {
        el.setAttribute('placeholder', this.localeStrings[key]);
      }
    });
  }

  bindEvents() {
    this.nextStep1.addEventListener('click', () => this.handleNextFromStep1());
    this.nextStep2.addEventListener('click', () => this.handleNextFromStep2());
    this.prevStep2.addEventListener('click', () => this.goStep(0));
    this.prevStep3.addEventListener('click', () => this.goStep(1));
    this.confirmBtn.addEventListener('click', () => this.handleConfirm());

    this.paqueteSearch.addEventListener('input', () => this.filterPaquetes());

    this.paquetesBody.addEventListener('click', (event) => {
      const row = event.target.closest('tr[data-index]');
      if (!row) return;
      const index = Number(row.dataset.index);
      this.selectPaquete(this.filteredPaquetes[index]);
    });

    this.vCodigo_base_nueva.addEventListener('input', () => this.handleBaseInput());
    this.vCodigo_base_nueva.addEventListener('focus', () => this.handleBaseInput());
    this.vCodigo_base_nueva.addEventListener('blur', () => {
      setTimeout(() => this.baseSuggestions.classList.remove('show'), 150);
    });

    this.vcodigo_usuario.addEventListener('input', () => this.clearFieldError(this.vcodigo_usuario));
  }

  async loadInitialData() {
    try {
      this.showLoading(true);
      const [paquetesData, basesData] = await Promise.all([
        this.fetchJson('/api/paquetes-pendientes'),
        this.fetchJson('/api/bases')
      ]);
      this.paquetes = paquetesData?.data || [];
      this.bases = basesData?.data || [];
      this.filteredPaquetes = [...this.paquetes];
      this.renderPaquetes();
      this.updatePendingCount();
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    } finally {
      this.showLoading(false);
    }
  }

  goStep(step) {
    if (step < 0 || step >= this.steps.length) return;
    this.currentStep = step;
    this.steps.forEach((panel, index) => {
      panel.style.display = index === step ? 'block' : 'none';
    });
    this.stepBadges.forEach((badge, index) => {
      badge.classList.toggle('active', index === step);
    });
    const progress = ((step + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
  }

  filterPaquetes() {
    const term = this.paqueteSearch.value.trim().toLowerCase();
    if (!term) {
      this.filteredPaquetes = [...this.paquetes];
    } else {
      this.filteredPaquetes = this.paquetes.filter((item) => {
        return (
          String(item.codigo_paquete || '').toLowerCase().includes(term) ||
          String(item.nombre_cliente || '').toLowerCase().includes(term) ||
          String(item.codigo_base || '').toLowerCase().includes(term)
        );
      });
    }
    this.renderPaquetes();
  }

  renderPaquetes() {
    this.paquetesBody.innerHTML = '';
    if (!this.filteredPaquetes.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'text-center text-muted py-4';
      cell.textContent = this.localeStrings.emptyPaquetes;
      row.appendChild(cell);
      this.paquetesBody.appendChild(row);
      this.paquetesCounter.textContent = '';
      this.nextStep1.disabled = true;
      return;
    }

    this.filteredPaquetes.forEach((paquete, index) => {
      const row = document.createElement('tr');
      row.dataset.index = String(index);
      if (this.selectedPaquete && this.selectedPaquete.codigo_paquete === paquete.codigo_paquete) {
        row.classList.add('active');
      }
      row.innerHTML = `
        <td>${this.escapeHtml(paquete.codigo_paquete)}</td>
        <td>${this.escapeHtml(paquete.nombre_cliente)}</td>
        <td>${this.escapeHtml(paquete.num_cliente)}</td>
        <td>${this.escapeHtml(paquete.codigo_base)}</td>
        <td>${this.escapeHtml(paquete.fecha_actualizado)}</td>
      `;
      this.paquetesBody.appendChild(row);
    });

    this.paquetesCounter.textContent = `${this.filteredPaquetes.length} registros`;
  }

  updatePendingCount() {
    this.pendingCount.textContent = String(this.paquetes.length);
  }

  async selectPaquete(paquete) {
    this.selectedPaquete = paquete;
    this.selectionPreview.textContent = paquete ? paquete.codigo_paquete : '--';
    this.renderPaquetes();
    this.nextStep1.disabled = !paquete;

    if (paquete) {
      this.vconcatenarpuntoentrega.value = paquete.concatenarpuntoentrega || '';
      this.vconcatenarnumrecibe.value = paquete.concatenarnumrecibe || '';
      this.vcodigo_base.value = paquete.codigo_base || '';
      await this.loadDetalle(paquete.codigo_paquete);
      this.goStep(1);
    }
  }

  async loadDetalle(codigoPaquete) {
    try {
      this.showLoading(true);
      const data = await this.fetchJson(`/api/mov-contable-detalle?codigo_paquete=${encodeURIComponent(codigoPaquete)}`);
      this.detalle = data?.data || [];
      if (this.detalle.length > 0) {
        this.vtipo_documento = this.detalle[0].tipo_documento || 'FAC';
      } else {
        this.vtipo_documento = 'FAC';
      }
      this.renderDetalle();
    } catch (error) {
      this.showError(error.message || 'Error al cargar detalle.');
    } finally {
      this.showLoading(false);
    }
  }

  renderDetalle() {
    this.detalleBody.innerHTML = '';
    if (!this.detalle.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.className = 'text-center text-muted py-4';
      cell.textContent = this.localeStrings.emptyDetalle;
      row.appendChild(cell);
      this.detalleBody.appendChild(row);
      return;
    }

    this.detalle.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${this.escapeHtml(item.nombre_producto)}</td>
        <td>${this.escapeHtml(item.cantidad)}</td>
        <td>${this.escapeHtml(item.saldo)}</td>
        <td>${this.escapeHtml(item.precio_total)}</td>
      `;
      this.detalleBody.appendChild(row);
    });
  }

  handleBaseInput() {
    const term = this.vCodigo_base_nueva.value.trim().toLowerCase();
    const suggestions = !term
      ? this.bases.slice(0, 10)
      : this.bases.filter((base) => {
          return (
            String(base.codigo_base || '').toLowerCase().includes(term) ||
            String(base.nombre || '').toLowerCase().includes(term)
          );
        });

    this.baseSuggestions.innerHTML = '';
    suggestions.slice(0, 12).forEach((base) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-group-item list-group-item-action';
      item.textContent = `${base.codigo_base} - ${base.nombre}`;
      item.addEventListener('click', () => this.selectBase(base));
      this.baseSuggestions.appendChild(item);
    });

    if (suggestions.length) {
      this.baseSuggestions.classList.add('show');
    } else {
      this.baseSuggestions.classList.remove('show');
    }

    this.selectedBase = null;
    this.vNombre_base_nueva.value = '';
    this.clearFieldError(this.vCodigo_base_nueva);
  }

  selectBase(base) {
    this.selectedBase = base;
    this.vCodigo_base_nueva.value = base.codigo_base || '';
    this.vNombre_base_nueva.value = base.nombre || '';
    this.baseSuggestions.classList.remove('show');
    this.clearFieldError(this.vCodigo_base_nueva);
  }

  handleNextFromStep1() {
    this.clearAlerts();
    if (!this.selectedPaquete) {
      this.showError(this.localeStrings.errorGeneric);
      return;
    }
    this.goStep(1);
  }

  handleNextFromStep2() {
    this.clearAlerts();
    if (!this.validateBaseSelection()) {
      this.showError(this.localeStrings.errorGeneric);
      return;
    }
    this.updateSummary();
    this.goStep(2);
  }

  validateBaseSelection() {
    const value = this.vCodigo_base_nueva.value.trim();
    const currentBase = String(this.vcodigo_base.value || '').trim();
    if (!value || !this.baseCodeRegex.test(value)) {
      this.setFieldError(this.vCodigo_base_nueva, this.localeStrings.nuevaBaseError);
      return false;
    }

    const matched = this.bases.find(
      (base) => String(base.codigo_base).toLowerCase() === value.toLowerCase()
    );
    if (!matched) {
      this.setFieldError(this.vCodigo_base_nueva, this.localeStrings.nuevaBaseError);
      return false;
    }

    if (currentBase && value.toLowerCase() === currentBase.toLowerCase()) {
      this.setFieldError(this.vCodigo_base_nueva, this.localeStrings.nuevaBaseError);
      return false;
    }

    this.selectBase(matched);
    return true;
  }

  updateSummary() {
    const paquete = this.selectedPaquete;
    if (!paquete) return;
    this.summaryPaquete.textContent = paquete.codigo_paquete || '--';
    this.summaryCliente.textContent = `${paquete.nombre_cliente || ''} (${paquete.num_cliente || ''})`;
    this.summaryBaseActual.textContent = paquete.codigo_base || '--';
    this.summaryBaseNueva.textContent = this.vNombre_base_nueva.value || '--';
    this.summaryDocumento.textContent = `${this.vtipo_documento} - ${paquete.codigo_paquete}`;
    this.summaryDetalle.textContent = String(this.detalle.length || 0);
  }

  async handleConfirm() {
    this.clearAlerts();
    if (!this.validateConfirm()) {
      this.showError(this.localeStrings.errorGeneric);
      return;
    }

    const payload = {
      vtipo_documento: this.vtipo_documento,
      vcodigo_paquete: this.selectedPaquete.codigo_paquete,
      vcodigo_base: this.selectedPaquete.codigo_base,
      vCodigo_base_nueva: this.vCodigo_base_nueva.value.trim(),
      vcodigo_usuario: this.vcodigo_usuario.value.trim()
    };

    try {
      this.showLoading(true);
      const response = await this.fetchJson('/api/reasignar-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response?.message || this.localeStrings.success);
    } catch (error) {
      this.showError(error.message || 'Error al reasignar base.');
    } finally {
      this.showLoading(false);
    }
  }

  validateConfirm() {
    let valid = true;
    if (!this.vcodigo_usuario.value || !this.userCodeRegex.test(this.vcodigo_usuario.value.trim())) {
      this.setFieldError(this.vcodigo_usuario, this.localeStrings.codigoUsuarioError);
      valid = false;
    }
    if (!this.validateBaseSelection()) {
      valid = false;
    }
    return valid;
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Error en la solicitud.');
    }
    return response.json();
  }

  showLoading(show) {
    this.loadingState.classList.toggle('hidden', !show);
  }

  showError(message) {
    this.errorAlert.textContent = message;
    this.errorAlert.classList.remove('d-none');
  }

  showSuccess(message) {
    this.successAlert.textContent = message;
    this.successAlert.classList.remove('d-none');
  }

  clearAlerts() {
    this.errorAlert.classList.add('d-none');
    this.successAlert.classList.add('d-none');
  }

  setFieldError(field, message) {
    field.classList.add('is-invalid');
    const feedback = field.parentElement?.querySelector('.invalid-feedback');
    if (feedback && message) {
      feedback.textContent = message;
    }
  }

  clearFieldError(field) {
    field.classList.remove('is-invalid');
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

const wizard = new FormWizard();
wizard.init();
