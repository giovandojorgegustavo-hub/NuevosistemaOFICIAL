/*
SPs lectura
vProveedores = Llamada SP: get_proveedores() (devuelve campo_visible)
Campos devueltos
codigo_provedor
nombre
Variables
vCodigo_provedor no visible editable
vNombreProvedor visible editable

vProductos = Llamada SP: get_productos() (devuelve campo_visible)
Campos devueltos
codigo_producto
nombre
Variables
vCodigo_producto no visible editable
vNombreProducto visible editable

vBases = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
codigo_base
nombre
Variables
vCodigo_base no visible editable
vNombreBase visible editable
*/

const i18n = {
  es: {
    title: 'Nota Credito Provedor',
    subtitle: 'Plataforma financiera global IaaS & PaaS',
    statusReady: 'Listo',
    wizardTitle: 'CU3003 - Nota Credito Provedor',
    wizardHint: 'Flujo multi-paso con transaccion total y trazabilidad SQL.',
    step1Title: '1. Crear Nota Credito Provedor',
    step1Hint: 'Completa la cabecera y el detalle de la nota de credito.',
    step2Title: '2. Confirmar y registrar Nota Credito',
    step2Hint: 'Valida el resumen y confirma la operacion.',
    fecha: 'vFecha',
    proveedor: 'vNombreProvedor',
    tipoDocumento: 'vTipo_documento_compra',
    numeroDocumento: 'vNum_documento_compra',
    totalNota: 'vTotal_nota',
    buscarProveedor: 'Buscar proveedor',
    addRow: 'Agregar linea',
    colOrdinal: 'vOrdinal',
    colBase: 'codigo_base',
    colProducto: 'codigo_producto',
    colCantidad: 'cantidad',
    colSaldo: 'saldo',
    colMonto: 'monto',
    colAccion: 'Accion',
    basePlaceholder: 'Escribe base...',
    productoPlaceholder: 'Escribe producto...',
    cantidadPlaceholder: '0.00',
    montoPlaceholder: '0.00',
    resumenProveedor: 'Proveedor',
    resumenFecha: 'Fecha',
    resumenDocumento: 'Documento',
    resumenTotal: 'Total nota',
    resumenItems: 'Items',
    confirmLabel: 'Confirmo la operacion y autorizo registrar la nota de credito.',
    prev: 'Anterior',
    next: 'Siguiente',
    submit: 'Registrar Nota Credito',
    loading: 'Procesando...',
    success: 'Nota credito registrada correctamente. El formulario fue reiniciado.',
    fetchError: 'No se pudieron cargar datos de la base. Intentalo nuevamente.',
    requiredProveedor: 'Selecciona un proveedor valido.',
    requiredDetalle: 'Agrega al menos una linea valida en vDetalleNotaCredito.',
    invalidDetalle: 'Revisa base, producto, cantidad y monto en todas las lineas.',
    invalidCantidad: 'La cantidad debe ser mayor a 0 y con maximo 2 decimales.',
    invalidMonto: 'El monto debe ser mayor a 0 y con maximo 2 decimales.',
    requiredConfirm: 'Debes confirmar la operacion para registrar.',
    providersCount: 'proveedores cargados',
    detailCount: 'lineas'
  },
  en: {
    title: 'Provider Credit Note',
    subtitle: 'Global IaaS & PaaS Finance Platform',
    statusReady: 'Ready',
    wizardTitle: 'CU3003 - Provider Credit Note',
    wizardHint: 'Multi-step flow with full transactionality and SQL traceability.',
    step1Title: '1. Create Provider Credit Note',
    step1Hint: 'Complete header and detail lines.',
    step2Title: '2. Confirm and register credit note',
    step2Hint: 'Validate the summary and confirm operation.',
    fecha: 'vFecha',
    proveedor: 'vNombreProvedor',
    tipoDocumento: 'vTipo_documento_compra',
    numeroDocumento: 'vNum_documento_compra',
    totalNota: 'vTotal_nota',
    buscarProveedor: 'Search provider',
    addRow: 'Add line',
    colOrdinal: 'vOrdinal',
    colBase: 'codigo_base',
    colProducto: 'codigo_producto',
    colCantidad: 'cantidad',
    colSaldo: 'saldo',
    colMonto: 'monto',
    colAccion: 'Action',
    basePlaceholder: 'Type base...',
    productoPlaceholder: 'Type product...',
    cantidadPlaceholder: '0.00',
    montoPlaceholder: '0.00',
    resumenProveedor: 'Provider',
    resumenFecha: 'Date',
    resumenDocumento: 'Document',
    resumenTotal: 'Credit total',
    resumenItems: 'Items',
    confirmLabel: 'I confirm the operation and authorize credit note registration.',
    prev: 'Previous',
    next: 'Next',
    submit: 'Register Credit Note',
    loading: 'Processing...',
    success: 'Credit note registered successfully. The form has been reset.',
    fetchError: 'Could not load data from database. Please try again.',
    requiredProveedor: 'Select a valid provider.',
    requiredDetalle: 'Add at least one valid line in vDetalleNotaCredito.',
    invalidDetalle: 'Review base, product, quantity and amount in every line.',
    invalidCantidad: 'Quantity must be greater than 0 and max 2 decimals.',
    invalidMonto: 'Amount must be greater than 0 and max 2 decimals.',
    requiredConfirm: 'You must confirm the operation before registering.',
    providersCount: 'providers loaded',
    detailCount: 'lines'
  }
};

class FormWizard {
  constructor() {
    this.state = {
      step: 1,
      lang: this.detectLang(),
      vFecha: '',
      vTipo_documento_compra: 'NCC',
      vNum_documento_compra: '',
      vCodigo_provedor: '',
      vNombreProvedor: '',
      vProveedores: [],
      vProductos: [],
      vBases: [],
      vDetalleNotaCredito: [],
      vTotal_nota: 0,
      isLoading: false
    };

    this.rowCounter = 0;
    this.decimalRegex = /^(?:0|[1-9]\d*)(?:[\.,]\d{1,2})?$/;

    this.cacheDom();
    this.bindEvents();
    this.applyTranslations();
    this.init();
  }

  detectLang() {
    const lang = (navigator.language || 'en').toLowerCase();
    return lang.startsWith('es') ? 'es' : 'en';
  }

  t(key) {
    return i18n[this.state.lang][key] || i18n.en[key] || key;
  }

  cacheDom() {
    this.dom = {
      stepPanels: Array.from(document.querySelectorAll('.step-panel')),
      stepIndicator: document.getElementById('stepIndicator'),
      progressBar: document.getElementById('progressBar'),
      formAlert: document.getElementById('formAlert'),
      formSuccess: document.getElementById('formSuccess'),
      statusPill: document.getElementById('statusPill'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      submitBtn: document.getElementById('submitBtn'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      vFecha: document.getElementById('vFecha'),
      vTipo_documento_compra: document.getElementById('vTipo_documento_compra'),
      vNum_documento_compra: document.getElementById('vNum_documento_compra'),
      vNombreProvedor: document.getElementById('vNombreProvedor'),
      providerList: document.getElementById('providerList'),
      vCodigo_provedor: document.getElementById('vCodigo_provedor'),
      proveedoresCount: document.getElementById('proveedoresCount'),
      vDetalleNotaCreditoBody: document.querySelector('#vDetalleNotaCredito tbody'),
      addRowBtn: document.getElementById('addRowBtn'),
      detalleCount: document.getElementById('detalleCount'),
      vTotal_nota: document.getElementById('vTotal_nota'),
      summaryProveedor: document.getElementById('summaryProveedor'),
      summaryFecha: document.getElementById('summaryFecha'),
      summaryDocumento: document.getElementById('summaryDocumento'),
      summaryTotal: document.getElementById('summaryTotal'),
      summaryItems: document.getElementById('summaryItems'),
      confirmOperacion: document.getElementById('confirmOperacion')
    };
  }

  bindEvents() {
    this.dom.prevBtn.addEventListener('click', () => this.goPrev());
    this.dom.nextBtn.addEventListener('click', () => this.goNext());
    this.dom.submitBtn.addEventListener('click', () => this.submit());
    this.dom.addRowBtn.addEventListener('click', () => this.addDetailRow());
    this.dom.confirmOperacion.addEventListener('change', () => this.updateActions());

    this.dom.vNombreProvedor.addEventListener('focus', () => this.renderProveedorList(this.dom.vNombreProvedor.value));
    this.dom.vNombreProvedor.addEventListener('input', (event) => {
      this.state.vCodigo_provedor = '';
      this.dom.vCodigo_provedor.value = '';
      this.renderProveedorList(event.target.value);
    });
    this.dom.providerList.addEventListener('click', (event) => this.handleProviderClick(event));

    this.dom.vDetalleNotaCreditoBody.addEventListener('input', (event) => this.handleRowInput(event));
    this.dom.vDetalleNotaCreditoBody.addEventListener('click', (event) => this.handleRowClick(event));
    this.dom.vDetalleNotaCreditoBody.addEventListener('focusin', (event) => this.handleRowFocus(event));

    document.addEventListener('click', (event) => {
      const inProvider = event.target.closest('#providerTypeahead');
      if (!inProvider) {
        this.closeAllTypeaheads();
      }

      if (!event.target.closest('#vDetalleNotaCredito')) {
        this.dom.vDetalleNotaCreditoBody
          .querySelectorAll('.typeahead-list')
          .forEach((el) => el.classList.remove('show'));
      }
    });
  }

  async init() {
    this.updateProgress();
    this.setLoading(true);

    try {
      await this.loadBootstrap();
      this.addDetailRow();
      this.refreshSummary();
      this.showSuccess('');
      this.showAlert('');
    } catch (error) {
      this.showAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false);
      this.updateActions();
    }
  }

  async loadBootstrap() {
    const response = await fetch('./api/bootstrap');
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error('BOOTSTRAP_ERROR');
    }

    this.state.vFecha = data.data.vFecha;
    this.state.vTipo_documento_compra = data.data.vTipo_documento_compra;
    this.state.vNum_documento_compra = data.data.vNum_documento_compra;
    this.state.vProveedores = data.data.vProveedores || [];
    this.state.vProductos = data.data.vProductos || [];
    this.state.vBases = data.data.vBases || [];

    this.dom.vFecha.value = this.state.vFecha;
    this.dom.vTipo_documento_compra.value = this.state.vTipo_documento_compra;
    this.dom.vNum_documento_compra.value = this.state.vNum_documento_compra;

    this.dom.proveedoresCount.textContent = `${this.state.vProveedores.length} ${this.t('providersCount')}`;
  }

  applyTranslations() {
    document.documentElement.lang = this.state.lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      el.placeholder = this.t(key);
    });
  }

  setLoading(isLoading) {
    this.state.isLoading = isLoading;
    this.dom.loadingOverlay.classList.toggle('d-none', !isLoading);
    this.dom.statusPill.textContent = isLoading ? this.t('loading') : this.t('statusReady');
    this.dom.prevBtn.disabled = isLoading;
    this.dom.nextBtn.disabled = isLoading;
    this.dom.submitBtn.disabled = isLoading;
  }

  showAlert(message) {
    if (!message) {
      this.dom.formAlert.classList.add('d-none');
      this.dom.formAlert.textContent = '';
      return;
    }
    this.dom.formAlert.textContent = message;
    this.dom.formAlert.classList.remove('d-none');
  }

  showSuccess(message) {
    if (!message) {
      this.dom.formSuccess.classList.add('d-none');
      this.dom.formSuccess.textContent = '';
      return;
    }
    this.dom.formSuccess.textContent = message;
    this.dom.formSuccess.classList.remove('d-none');
  }

  closeAllTypeaheads() {
    document.querySelectorAll('.typeahead-list').forEach((el) => el.classList.remove('show'));
  }

  updateProgress() {
    const totalSteps = 2;
    const progress = ((this.state.step - 1) / (totalSteps - 1)) * 100;

    this.dom.stepIndicator.textContent = `${this.state.step} / ${totalSteps}`;
    this.dom.progressBar.style.width = `${progress}%`;

    this.dom.stepPanels.forEach((panel) => {
      panel.classList.toggle('active', Number(panel.dataset.step) === this.state.step);
    });

    this.updateActions();
  }

  updateActions() {
    this.dom.prevBtn.disabled = this.state.step === 1 || this.state.isLoading;
    this.dom.nextBtn.classList.toggle('d-none', this.state.step === 2);
    this.dom.submitBtn.classList.toggle('d-none', this.state.step !== 2);
    this.dom.submitBtn.disabled = this.state.isLoading || !this.dom.confirmOperacion.checked;
  }

  goPrev() {
    this.showAlert('');
    if (this.state.step > 1) {
      this.state.step -= 1;
      this.updateProgress();
    }
  }

  goNext() {
    this.showAlert('');
    this.showSuccess('');

    if (this.state.step !== 1) {
      return;
    }

    if (!this.validateStep1()) {
      return;
    }

    this.refreshSummary();
    this.state.step = 2;
    this.updateProgress();
  }

  renderProveedorList(query) {
    const list = this.dom.providerList;
    const term = String(query || '').trim().toLowerCase();

    const matched = this.state.vProveedores.filter((item) => {
      const codigo = String(item.codigo_provedor || '').toLowerCase();
      const nombre = String(item.nombre || '').toLowerCase();
      return !term || codigo.includes(term) || nombre.includes(term);
    });

    if (!matched.length) {
      list.innerHTML = '';
      list.classList.remove('show');
      return;
    }

    list.innerHTML = matched
      .slice(0, 50)
      .map(
        (item) =>
          `<button type="button" class="list-group-item list-group-item-action" data-type="proveedor" data-code="${item.codigo_provedor}" data-name="${String(item.nombre || '').replace(/"/g, '&quot;')}">${item.nombre} <span class="item-code">#${item.codigo_provedor}</span></button>`
      )
      .join('');

    list.classList.add('show');
  }

  handleProviderClick(event) {
    const button = event.target.closest('button[data-type="proveedor"]');
    if (!button) {
      return;
    }

    this.state.vCodigo_provedor = button.dataset.code;
    this.state.vNombreProvedor = button.dataset.name;
    this.dom.vCodigo_provedor.value = button.dataset.code;
    this.dom.vNombreProvedor.value = button.dataset.name;
    this.closeAllTypeaheads();
    this.clearFieldError(this.dom.vNombreProvedor);
  }

  handleRowInput(event) {
    const row = event.target.closest('tr');
    if (!row) {
      return;
    }

    const rowId = row.dataset.rowId;
    const detail = this.state.vDetalleNotaCredito.find((item) => item.id === rowId);
    if (!detail) {
      return;
    }

    if (event.target.classList.contains('base-input')) {
      detail.vCodigo_base = '';
      detail.vNombreBase = event.target.value;
      this.renderDetailTypeahead(row, 'base', event.target.value);
    }

    if (event.target.classList.contains('producto-input')) {
      detail.vCodigo_producto = '';
      detail.vNombreProducto = event.target.value;
      this.renderDetailTypeahead(row, 'producto', event.target.value);
    }

    if (event.target.classList.contains('cantidad-input')) {
      detail.vCantidad = event.target.value;
      this.clearFieldError(event.target);
      this.recalculateTotal();
    }

    if (event.target.classList.contains('monto-input')) {
      detail.vMonto = event.target.value;
      this.clearFieldError(event.target);
      this.recalculateTotal();
    }
  }

  handleRowFocus(event) {
    const row = event.target.closest('tr');
    if (!row) {
      return;
    }

    if (event.target.classList.contains('base-input')) {
      this.renderDetailTypeahead(row, 'base', event.target.value);
    }

    if (event.target.classList.contains('producto-input')) {
      this.renderDetailTypeahead(row, 'producto', event.target.value);
    }
  }

  handleRowClick(event) {
    const removeBtn = event.target.closest('button[data-action="remove-row"]');
    if (removeBtn) {
      const row = removeBtn.closest('tr');
      if (!row) {
        return;
      }
      this.removeRow(row.dataset.rowId);
      return;
    }

    const baseBtn = event.target.closest('button[data-type="base-item"]');
    if (baseBtn) {
      const row = baseBtn.closest('tr');
      if (!row) {
        return;
      }
      const rowId = row.dataset.rowId;
      const detail = this.state.vDetalleNotaCredito.find((item) => item.id === rowId);
      if (!detail) {
        return;
      }

      detail.vCodigo_base = baseBtn.dataset.code;
      detail.vNombreBase = baseBtn.dataset.name;
      row.querySelector('.base-input').value = detail.vNombreBase;
      row.querySelector('.base-code').value = detail.vCodigo_base;
      row.querySelector('.base-list').classList.remove('show');
      this.clearFieldError(row.querySelector('.base-input'));
      return;
    }

    const productoBtn = event.target.closest('button[data-type="producto-item"]');
    if (productoBtn) {
      const row = productoBtn.closest('tr');
      if (!row) {
        return;
      }
      const rowId = row.dataset.rowId;
      const detail = this.state.vDetalleNotaCredito.find((item) => item.id === rowId);
      if (!detail) {
        return;
      }

      detail.vCodigo_producto = productoBtn.dataset.code;
      detail.vNombreProducto = productoBtn.dataset.name;
      row.querySelector('.producto-input').value = detail.vNombreProducto;
      row.querySelector('.producto-code').value = detail.vCodigo_producto;
      row.querySelector('.producto-list').classList.remove('show');
      this.clearFieldError(row.querySelector('.producto-input'));
    }
  }

  renderDetailTypeahead(row, type, query) {
    const term = String(query || '').trim().toLowerCase();
    const listEl = row.querySelector(type === 'base' ? '.base-list' : '.producto-list');

    const source = type === 'base' ? this.state.vBases : this.state.vProductos;
    const codeField = type === 'base' ? 'codigo_base' : 'codigo_producto';

    const matches = source.filter((item) => {
      const code = String(item[codeField] || '').toLowerCase();
      const name = String(item.nombre || '').toLowerCase();
      return !term || code.includes(term) || name.includes(term);
    });

    if (!matches.length) {
      listEl.innerHTML = '';
      listEl.classList.remove('show');
      return;
    }

    listEl.innerHTML = matches
      .slice(0, 50)
      .map(
        (item) =>
          `<button type="button" class="list-group-item list-group-item-action" data-type="${type}-item" data-code="${item[codeField]}" data-name="${String(item.nombre || '').replace(/"/g, '&quot;')}">${item.nombre} <span class="item-code">#${item[codeField]}</span></button>`
      )
      .join('');

    listEl.classList.add('show');
  }

  addDetailRow() {
    const id = `row-${this.rowCounter++}`;

    const row = document.createElement('tr');
    row.dataset.rowId = id;
    row.innerHTML = `
      <td class="ordinal-col"></td>
      <td>
        <div class="typeahead">
          <input type="text" class="form-control form-control-sm base-input" data-i18n-placeholder="basePlaceholder" placeholder="${this.t(
            'basePlaceholder'
          )}" autocomplete="off" />
          <input type="hidden" class="base-code" />
          <div class="typeahead-list list-group base-list"></div>
        </div>
      </td>
      <td>
        <div class="typeahead">
          <input type="text" class="form-control form-control-sm producto-input" data-i18n-placeholder="productoPlaceholder" placeholder="${this.t(
            'productoPlaceholder'
          )}" autocomplete="off" />
          <input type="hidden" class="producto-code" />
          <div class="typeahead-list list-group producto-list"></div>
        </div>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm cantidad-input" inputmode="decimal" placeholder="${this.t(
          'cantidadPlaceholder'
        )}" />
      </td>
      <td class="d-none">
        <input type="hidden" class="saldo-input" value="0" />
      </td>
      <td>
        <input type="text" class="form-control form-control-sm monto-input" inputmode="decimal" placeholder="${this.t(
          'montoPlaceholder'
        )}" />
      </td>
      <td>
        <button type="button" class="btn btn-outline-danger btn-sm" data-action="remove-row">&times;</button>
      </td>
    `;

    this.dom.vDetalleNotaCreditoBody.appendChild(row);

    this.state.vDetalleNotaCredito.push({
      id,
      vOrdinal: 0,
      vCodigo_base: '',
      vNombreBase: '',
      vCodigo_producto: '',
      vNombreProducto: '',
      vCantidad: '',
      vSaldo: 0,
      vMonto: ''
    });

    this.reindexRows();
    this.recalculateTotal();
  }

  removeRow(rowId) {
    this.state.vDetalleNotaCredito = this.state.vDetalleNotaCredito.filter((item) => item.id !== rowId);
    const row = this.dom.vDetalleNotaCreditoBody.querySelector(`tr[data-row-id="${rowId}"]`);
    if (row) {
      row.remove();
    }

    this.reindexRows();
    this.recalculateTotal();
  }

  reindexRows() {
    const rows = Array.from(this.dom.vDetalleNotaCreditoBody.querySelectorAll('tr'));
    rows.forEach((row, index) => {
      const ordinal = index + 1;
      const detail = this.state.vDetalleNotaCredito.find((item) => item.id === row.dataset.rowId);
      if (detail) {
        detail.vOrdinal = ordinal;
      }
      row.querySelector('.ordinal-col').textContent = String(ordinal);
    });

    this.dom.detalleCount.textContent = `${rows.length} ${this.t('detailCount')}`;
  }

  parseDecimal(value) {
    return Number(String(value || '').replace(',', '.'));
  }

  formatMoney(value) {
    return new Intl.NumberFormat(this.state.lang === 'es' ? 'es-PE' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  clearFieldError(field) {
    if (field) {
      field.classList.remove('is-invalid');
    }
  }

  setFieldError(field) {
    if (field) {
      field.classList.add('is-invalid');
    }
  }

  recalculateTotal() {
    let total = 0;

    this.state.vDetalleNotaCredito.forEach((item) => {
      const qty = this.parseDecimal(item.vCantidad);
      const amount = this.parseDecimal(item.vMonto);
      if (Number.isFinite(qty) && qty > 0 && Number.isFinite(amount) && amount > 0) {
        total += qty * amount;
      }
    });

    this.state.vTotal_nota = Number(total.toFixed(2));
    this.dom.vTotal_nota.value = this.formatMoney(this.state.vTotal_nota);
    this.refreshSummary();
  }

  validateStep1() {
    let hasError = false;

    if (!this.state.vCodigo_provedor) {
      hasError = true;
      this.setFieldError(this.dom.vNombreProvedor);
      this.showAlert(this.t('requiredProveedor'));
      return false;
    }

    this.clearFieldError(this.dom.vNombreProvedor);

    if (!this.state.vDetalleNotaCredito.length) {
      this.showAlert(this.t('requiredDetalle'));
      return false;
    }

    const normalized = [];
    const rows = Array.from(this.dom.vDetalleNotaCreditoBody.querySelectorAll('tr'));

    rows.forEach((row) => {
      const rowId = row.dataset.rowId;
      const detail = this.state.vDetalleNotaCredito.find((item) => item.id === rowId);
      if (!detail) {
        return;
      }

      const baseInput = row.querySelector('.base-input');
      const productoInput = row.querySelector('.producto-input');
      const cantidadInput = row.querySelector('.cantidad-input');
      const montoInput = row.querySelector('.monto-input');

      this.clearFieldError(baseInput);
      this.clearFieldError(productoInput);
      this.clearFieldError(cantidadInput);
      this.clearFieldError(montoInput);

      const qtyText = String(detail.vCantidad || '').trim();
      const montoText = String(detail.vMonto || '').trim();

      const qtyValid = this.decimalRegex.test(qtyText) && this.parseDecimal(qtyText) > 0;
      const montoValid = this.decimalRegex.test(montoText) && this.parseDecimal(montoText) > 0;

      if (!detail.vCodigo_base) {
        this.setFieldError(baseInput);
        hasError = true;
      }

      if (!detail.vCodigo_producto) {
        this.setFieldError(productoInput);
        hasError = true;
      }

      if (!qtyValid) {
        this.setFieldError(cantidadInput);
        hasError = true;
      }

      if (!montoValid) {
        this.setFieldError(montoInput);
        hasError = true;
      }

      if (!hasError || (detail.vCodigo_base && detail.vCodigo_producto && qtyValid && montoValid)) {
        normalized.push({
          ordinal: detail.vOrdinal,
          codigo_base: Number(detail.vCodigo_base),
          codigo_producto: Number(detail.vCodigo_producto),
          cantidad: Number(this.parseDecimal(qtyText).toFixed(2)),
          saldo: 0,
          monto: Number(this.parseDecimal(montoText).toFixed(2))
        });
      }
    });

    if (hasError) {
      this.showAlert(this.t('invalidDetalle'));
      return false;
    }

    if (!normalized.length) {
      this.showAlert(this.t('requiredDetalle'));
      return false;
    }

    this.state.vDetalleNotaCredito = this.state.vDetalleNotaCredito.map((item) => {
      const found = normalized.find((x) => x.ordinal === item.vOrdinal);
      if (!found) {
        return item;
      }

      return {
        ...item,
        vCodigo_base: String(found.codigo_base),
        vCodigo_producto: String(found.codigo_producto),
        vCantidad: String(found.cantidad),
        vMonto: String(found.monto),
        vSaldo: 0
      };
    });

    this.recalculateTotal();

    if (this.state.vTotal_nota <= 0) {
      this.showAlert(this.t('invalidMonto'));
      return false;
    }

    return true;
  }

  refreshSummary() {
    this.dom.summaryProveedor.textContent = this.state.vNombreProvedor || '-';
    this.dom.summaryFecha.textContent = this.state.vFecha || '-';
    this.dom.summaryDocumento.textContent = `${this.state.vTipo_documento_compra || '-'}-${
      this.state.vNum_documento_compra || '-'
    }`;
    this.dom.summaryTotal.textContent = this.formatMoney(this.state.vTotal_nota);
    this.dom.summaryItems.textContent = String(this.state.vDetalleNotaCredito.length || 0);
  }

  buildPayload() {
    const detalle = this.state.vDetalleNotaCredito.map((item) => ({
      ordinal: item.vOrdinal,
      codigo_base: Number(item.vCodigo_base),
      codigo_producto: Number(item.vCodigo_producto),
      cantidad: Number(this.parseDecimal(item.vCantidad).toFixed(2)),
      saldo: 0,
      monto: Number(this.parseDecimal(item.vMonto).toFixed(2))
    }));

    return {
      vFecha: this.state.vFecha,
      vTipo_documento_compra: this.state.vTipo_documento_compra,
      vNum_documento_compra: Number(this.state.vNum_documento_compra),
      vCodigo_provedor: Number(this.state.vCodigo_provedor),
      vDetalleNotaCredito: detalle,
      vTotal_nota: this.state.vTotal_nota
    };
  }

  async submit() {
    this.showAlert('');
    this.showSuccess('');

    if (!this.validateStep1()) {
      this.state.step = 1;
      this.updateProgress();
      return;
    }

    if (!this.dom.confirmOperacion.checked) {
      this.showAlert(this.t('requiredConfirm'));
      return;
    }

    this.setLoading(true);

    try {
      const response = await fetch('./api/nota-credito-proveedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildPayload())
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'ERROR_REGISTRO');
      }

      this.showSuccess(this.t('success'));
      await this.resetWizard();
    } catch (error) {
      this.showAlert(error.message || this.t('fetchError'));
    } finally {
      this.setLoading(false);
      this.updateActions();
    }
  }

  async resetWizard() {
    this.state.step = 1;
    this.state.vCodigo_provedor = '';
    this.state.vNombreProvedor = '';
    this.state.vDetalleNotaCredito = [];
    this.state.vTotal_nota = 0;

    this.dom.vNombreProvedor.value = '';
    this.dom.vCodigo_provedor.value = '';
    this.dom.vDetalleNotaCreditoBody.innerHTML = '';
    this.dom.confirmOperacion.checked = false;

    await this.loadBootstrap();
    this.addDetailRow();
    this.recalculateTotal();
    this.updateProgress();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
