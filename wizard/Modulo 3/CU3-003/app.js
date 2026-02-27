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
    step1Title: '1. Seleccionar FCC',
    step1Hint: 'Selecciona proveedor y factura FCC origen.',
    step2Title: '2. Editar detalle',
    step2Hint: 'Selecciona tipo de nota y completa monto o detalle de productos.',
    step3Title: '3. Confirmar y registrar Nota Credito',
    step3Hint: 'Valida el resumen y confirma la operacion.',
    fecha: 'vFecha',
    proveedor: 'vNombreProvedor',
    tipoDocumento: 'vTipo_documento_compra',
    numeroDocumento: 'vNum_documento_compra',
    totalNota: 'vTotal_nota',
    tipoNotaLabel: 'Tipo de nota',
    tipoNotaProducto: 'Producto',
    tipoNotaDinero: 'Dinero',
    montoDineroLabel: 'Monto nota',
    buscarProveedor: 'Buscar proveedor',
    addRow: 'Agregar linea',
    colOrdinal: 'vOrdinal',
    colBase: 'codigo_base',
    colProducto: 'codigo_producto',
    colProductoNombre: 'Producto',
    colCantidad: 'cantidad NC',
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
    summaryColCampo: 'Campo',
    summaryColValor: 'Valor',
    summaryEmptyDetail: 'Sin detalle.',
    confirmLabel: 'Confirmo la operacion y autorizo registrar la nota de credito.',
    prev: 'Anterior',
    next: 'Siguiente',
    submit: 'Registrar Nota Credito',
    loading: 'Procesando...',
    success: 'Nota credito registrada correctamente. El formulario fue reiniciado.',
    fetchError: 'No se pudieron cargar datos de la base. Intentalo nuevamente.',
    requiredProveedor: 'Selecciona un proveedor valido.',
    requiredFactura: 'Selecciona una factura FCC.',
    requiredDetalle: 'Agrega al menos una linea valida en vDetalleNotaCredito.',
    requiredMontoDinero: 'Ingresa un monto valido mayor a 0 para nota de dinero.',
    detailFromFccEmpty: 'Selecciona una FCC para cargar el detalle.',
    invalidDetalle: 'Revisa producto, cantidad y monto en todas las lineas.',
    invalidCantidad: 'La cantidad debe ser mayor a 0 y con maximo 2 decimales.',
    invalidCantidadExcede: 'La cantidad NC no puede exceder el saldo disponible.',
    invalidMonto: 'El monto debe ser mayor a 0 y con maximo 2 decimales.',
    requiredConfirm: 'Debes confirmar la operacion para registrar.',
    providersCount: 'proveedores cargados',
    detailCount: 'lineas',
    fccListTitle: 'Facturas FCC',
    fccCount: 'facturas FCC visibles',
    fccEmpty: 'Sin facturas FCC para el filtro actual.'
  },
  en: {
    title: 'Provider Credit Note',
    subtitle: 'Global IaaS & PaaS Finance Platform',
    statusReady: 'Ready',
    wizardTitle: 'CU3003 - Provider Credit Note',
    wizardHint: 'Multi-step flow with full transactionality and SQL traceability.',
    step1Title: '1. Select FCC',
    step1Hint: 'Select provider and source FCC invoice.',
    step2Title: '2. Edit detail',
    step2Hint: 'Select note type and complete amount or product detail.',
    step3Title: '3. Confirm and register credit note',
    step3Hint: 'Validate the summary and confirm operation.',
    fecha: 'vFecha',
    proveedor: 'vNombreProvedor',
    tipoDocumento: 'vTipo_documento_compra',
    numeroDocumento: 'vNum_documento_compra',
    totalNota: 'vTotal_nota',
    tipoNotaLabel: 'Note type',
    tipoNotaProducto: 'Product',
    tipoNotaDinero: 'Money',
    montoDineroLabel: 'Note amount',
    buscarProveedor: 'Search provider',
    addRow: 'Add line',
    colOrdinal: 'vOrdinal',
    colBase: 'codigo_base',
    colProducto: 'codigo_producto',
    colProductoNombre: 'Product',
    colCantidad: 'CN qty',
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
    summaryColCampo: 'Field',
    summaryColValor: 'Value',
    summaryEmptyDetail: 'No detail.',
    confirmLabel: 'I confirm the operation and authorize credit note registration.',
    prev: 'Previous',
    next: 'Next',
    submit: 'Register Credit Note',
    loading: 'Processing...',
    success: 'Credit note registered successfully. The form has been reset.',
    fetchError: 'Could not load data from database. Please try again.',
    requiredProveedor: 'Select a valid provider.',
    requiredFactura: 'Select an FCC invoice.',
    requiredDetalle: 'Add at least one valid line in vDetalleNotaCredito.',
    requiredMontoDinero: 'Enter a valid amount greater than 0 for money note.',
    detailFromFccEmpty: 'Select an FCC invoice to load detail.',
    invalidDetalle: 'Review product, quantity and amount in every line.',
    invalidCantidad: 'Quantity must be greater than 0 and max 2 decimals.',
    invalidCantidadExcede: 'CN quantity cannot exceed available balance.',
    invalidMonto: 'Amount must be greater than 0 and max 2 decimals.',
    requiredConfirm: 'You must confirm the operation before registering.',
    providersCount: 'providers loaded',
    detailCount: 'lines',
    fccListTitle: 'FCC invoices',
    fccCount: 'visible FCC invoices',
    fccEmpty: 'No FCC invoices for the current filter.'
  }
};

class FormWizard {
  constructor() {
    this.state = {
      step: 1,
      lang: this.detectLang(),
      vFecha: '',
      vFechaDisplay: '',
      vTipo_documento_compra: 'NCC',
      vTipo_nota_credito: 'PRODUCTO',
      vNum_documento_compra: '',
      vMonto_dinero: '',
      vCodigo_provedor: '',
      vNombreProvedor: '',
      vProveedores: [],
      vFacturasFCC: [],
      vFacturasFCCFiltradas: [],
      selectedFacturaFCC: null,
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
      vNombreProvedor: document.getElementById('vNombreProvedor'),
      providerList: document.getElementById('providerList'),
      vCodigo_provedor: document.getElementById('vCodigo_provedor'),
      proveedoresCount: document.getElementById('proveedoresCount'),
      facturasFccBody: document.getElementById('facturasFccBody'),
      facturasFccCount: document.getElementById('facturasFccCount'),
      vDetalleNotaCreditoBody: document.querySelector('#vDetalleNotaCredito tbody'),
      detalleProductoPanel: document.getElementById('detalleProductoPanel'),
      detalleDineroPanel: document.getElementById('detalleDineroPanel'),
      vMontoDinero: document.getElementById('vMontoDinero'),
      tipoNotaRadios: Array.from(document.querySelectorAll('input[name="vTipoNota"]')),
      step2Proveedor: document.getElementById('step2Proveedor'),
      step2Fecha: document.getElementById('step2Fecha'),
      detalleCount: document.getElementById('detalleCount'),
      summaryProveedor: document.getElementById('summaryProveedor'),
      summaryFecha: document.getElementById('summaryFecha'),
      summaryDocumento: document.getElementById('summaryDocumento'),
      summaryTotal: document.getElementById('summaryTotal'),
      summaryItems: document.getElementById('summaryItems'),
      summaryDetalleBody: document.getElementById('summaryDetalleBody'),
      confirmOperacion: document.getElementById('confirmOperacion')
    };
  }

  bindEvents() {
    this.dom.prevBtn.addEventListener('click', () => this.goPrev());
    this.dom.nextBtn.addEventListener('click', () => this.goNext());
    this.dom.submitBtn.addEventListener('click', () => this.submit());
    this.dom.confirmOperacion.addEventListener('change', () => this.updateActions());
    this.dom.tipoNotaRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => this.handleTipoNotaChange(event.target.value));
    });
    this.dom.vMontoDinero.addEventListener('input', (event) => {
      this.state.vMonto_dinero = event.target.value;
      this.clearFieldError(this.dom.vMontoDinero);
      this.recalculateTotal();
    });
    this.dom.vMontoDinero.addEventListener('change', (event) => {
      const raw = String(event.target.value || '').trim();
      if (this.decimalRegex.test(raw) && this.parseDecimal(raw) > 0) {
        const normalized = this.toTwoDecimalString(raw);
        event.target.value = normalized;
        this.state.vMonto_dinero = normalized;
      } else {
        this.state.vMonto_dinero = raw;
      }
      this.recalculateTotal();
    });

    this.dom.vNombreProvedor.addEventListener('focus', () => this.renderProveedorList(this.dom.vNombreProvedor.value));
    this.dom.vNombreProvedor.addEventListener('input', (event) => {
      this.state.vCodigo_provedor = '';
      this.dom.vCodigo_provedor.value = '';
      this.renderProveedorList(event.target.value);
      this.state.selectedFacturaFCC = null;
      this.renderFacturasFCC(event.target.value);
    });
    this.dom.providerList.addEventListener('click', (event) => this.handleProviderClick(event));
    this.dom.facturasFccBody.addEventListener('click', (event) => this.handleFacturaClick(event));

    this.dom.vDetalleNotaCreditoBody.addEventListener('input', (event) => this.handleRowInput(event));
    this.dom.vDetalleNotaCreditoBody.addEventListener('change', (event) => this.normalizeRowField(event));
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
      this.renderFacturasFCC('');
      this.refreshSummary();
      this.renderEmptyDetail();
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
    this.state.vFechaDisplay = data.data.vFechaDisplay || this.formatDateTime(new Date());
    this.state.vTipo_documento_compra = data.data.vTipo_documento_compra;
    this.state.vTipo_nota_credito = 'PRODUCTO';
    this.state.vNum_documento_compra = data.data.vNum_documento_compra;
    this.state.vMonto_dinero = '';
    this.state.vProveedores = data.data.vProveedores || [];
    this.state.vFacturasFCC = data.data.vFacturasFCC || [];
    this.state.vFacturasFCCFiltradas = [...this.state.vFacturasFCC];
    this.state.selectedFacturaFCC = null;
    this.state.vProductos = data.data.vProductos || [];
    this.state.vBases = data.data.vBases || [];

    this.dom.proveedoresCount.textContent = `${this.state.vProveedores.length} ${this.t('providersCount')}`;
    this.dom.step2Proveedor.value = '';
    this.dom.step2Fecha.value = this.state.vFechaDisplay;
    this.dom.vMontoDinero.value = '';
    this.dom.tipoNotaRadios.forEach((radio) => {
      radio.checked = radio.value === this.state.vTipo_nota_credito;
    });
    this.updateTipoNotaUI();
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

  handleTipoNotaChange(tipo) {
    const normalized = String(tipo || '').toUpperCase() === 'DINERO' ? 'DINERO' : 'PRODUCTO';
    this.state.vTipo_nota_credito = normalized;
    this.showAlert('');
    this.updateTipoNotaUI();
    this.recalculateTotal();
  }

  updateTipoNotaUI() {
    const isDinero = this.state.vTipo_nota_credito === 'DINERO';
    this.dom.detalleDineroPanel.classList.toggle('d-none', !isDinero);
    this.dom.detalleProductoPanel.classList.toggle('d-none', isDinero);
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
    const totalSteps = 3;
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
    this.dom.nextBtn.classList.toggle('d-none', this.state.step === 3);
    this.dom.submitBtn.classList.toggle('d-none', this.state.step !== 3);
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

    if (this.state.step === 1) {
      if (!this.validateStep1Selection()) {
        return;
      }
      this.state.step = 2;
      this.updateProgress();
      return;
    }

    if (this.state.step === 2) {
      if (!this.validateStep2Detail()) {
        return;
      }
      this.refreshSummary();
      this.state.step = 3;
      this.updateProgress();
      return;
    }
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
    this.state.selectedFacturaFCC = null;
    this.renderFacturasFCC(button.dataset.name, button.dataset.code);
    this.closeAllTypeaheads();
    this.clearFieldError(this.dom.vNombreProvedor);
  }

  async handleFacturaClick(event) {
    const row = event.target.closest('tr[data-fcc-key]');
    if (!row) {
      return;
    }

    this.state.selectedFacturaFCC = {
      tipo_documento_compra: row.dataset.tipo,
      num_documento_compra: row.dataset.numero,
      codigo_provedor: row.dataset.proveedor
    };
    this.state.vCodigo_provedor = row.dataset.proveedor;
    this.dom.vCodigo_provedor.value = row.dataset.proveedor;

    const provider = this.state.vProveedores.find((item) => String(item.codigo_provedor) === row.dataset.proveedor);
    if (provider) {
      this.state.vNombreProvedor = provider.nombre;
      this.dom.vNombreProvedor.value = provider.nombre;
    }

    this.renderFacturasFCC(this.dom.vNombreProvedor.value, row.dataset.proveedor);
    this.clearFieldError(this.dom.vNombreProvedor);
    this.dom.step2Proveedor.value = this.state.vNombreProvedor || '';
    this.dom.step2Fecha.value = this.state.vFechaDisplay || '';
    await this.loadDetalleFCC();
    if (this.state.step === 1) {
      this.state.step = 2;
      this.updateProgress();
    }
  }

  renderEmptyDetail() {
    this.dom.vDetalleNotaCreditoBody.innerHTML = `<tr><td colspan="4" class="fcc-empty">${this.t('detailFromFccEmpty')}</td></tr>`;
    this.dom.detalleCount.textContent = `0 ${this.t('detailCount')}`;
  }

  async loadDetalleFCC() {
    const fcc = this.state.selectedFacturaFCC;
    if (!fcc) {
      this.state.vDetalleNotaCredito = [];
      this.renderEmptyDetail();
      this.recalculateTotal();
      return;
    }

    this.setLoading(true);
    try {
      const response = await fetch('./api/fcc-detalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vTipo_documento_compra: fcc.tipo_documento_compra,
          vNum_documento_compra: Number(fcc.num_documento_compra),
          vCodigo_provedor: Number(fcc.codigo_provedor)
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'DETALLE_FCC_ERROR');
      }

      const detalle = Array.isArray(data.detalle) ? data.detalle : [];
      this.state.vDetalleNotaCredito = detalle.map((item, idx) => ({
        id: `fcc-row-${idx}`,
        vOrdinal: Number(item.ordinal || idx + 1),
        vCodigo_base: String(item.codigo_base || ''),
        vNombreBase: '',
        vCodigo_producto: String(item.codigo_producto || ''),
        vNombreProducto: String(item.nombre_producto || ''),
        vCantidad: this.toTwoDecimalString(item.saldo_disponible),
        vSaldo: Number(item.saldo_disponible || 0),
        vSaldoMax: Number(item.saldo_disponible || 0),
        vCostoUnitario: Number(item.costo_unitario || 0),
        vMonto: this.toTwoDecimalString(item.monto_disponible)
      }));

      this.renderDetalleRows();
      this.recalculateTotal();
    } catch (error) {
      this.state.vDetalleNotaCredito = [];
      this.renderEmptyDetail();
      this.showAlert(error.message || this.t('fetchError'));
    } finally {
      this.setLoading(false);
    }
  }

  renderFacturasFCC(query = '', providerCode = '') {
    const body = this.dom.facturasFccBody;
    const term = String(query || '').trim().toLowerCase();
    const codeTerm = String(providerCode || this.state.vCodigo_provedor || '').trim();

    this.state.vFacturasFCCFiltradas = this.state.vFacturasFCC.filter((item) => {
      const byCode = !codeTerm || String(item.codigo_provedor || '') === codeTerm;
      const bucket = [
        item.tipo_documento_compra,
        item.num_documento_compra,
        item.codigo_provedor,
        item.nombre_provedor,
        this.formatDateTime(item.fecha)
      ].join(' ').toLowerCase();
      const byText = !term || bucket.includes(term);
      return byCode && byText;
    });

    this.dom.facturasFccCount.textContent = `${this.state.vFacturasFCCFiltradas.length} ${this.t('fccCount')}`;
    body.innerHTML = '';

    if (!this.state.vFacturasFCCFiltradas.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" class="fcc-empty">${this.t('fccEmpty')}</td>`;
      body.appendChild(row);
      return;
    }

    this.state.vFacturasFCCFiltradas.forEach((item) => {
      const row = document.createElement('tr');
      const isSelected =
        this.state.selectedFacturaFCC &&
        String(this.state.selectedFacturaFCC.tipo_documento_compra) === String(item.tipo_documento_compra) &&
        String(this.state.selectedFacturaFCC.num_documento_compra) === String(item.num_documento_compra) &&
        String(this.state.selectedFacturaFCC.codigo_provedor) === String(item.codigo_provedor);
      row.dataset.fccKey = `${item.tipo_documento_compra}-${item.num_documento_compra}-${item.codigo_provedor}`;
      row.dataset.tipo = item.tipo_documento_compra || 'FCC';
      row.dataset.numero = item.num_documento_compra || '';
      row.dataset.proveedor = item.codigo_provedor || '';
      row.classList.toggle('is-selected', Boolean(isSelected));
      row.innerHTML = `
        <td>${this.formatDateTime(item.fecha)}</td>
        <td>${item.num_documento_compra || '-'}</td>
        <td>${item.nombre_provedor || '-'}</td>
        <td class="text-end">${this.formatMoney(item.monto_total)}</td>
      `;
      body.appendChild(row);
    });
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
      this.applyCantidadToDetail(detail, event.target);
    }

    if (event.target.classList.contains('monto-input')) {
      detail.vMonto = event.target.value;
      this.clearFieldError(event.target);
      this.recalculateTotal();
    }
  }

  normalizeRowField(event) {
    const input = event.target;
    const row = input.closest('tr');
    if (!row) return;

    const detail = this.state.vDetalleNotaCredito.find((item) => item.id === row.dataset.rowId);
    if (!detail) return;

    if (input.classList.contains('cantidad-input')) {
      const raw = String(input.value || '').trim();
      if (this.decimalRegex.test(raw) && this.parseDecimal(raw) > 0) {
        detail.vCantidad = this.toTwoDecimalString(raw);
        this.applyCantidadToDetail(detail, input);
      }
    }

    if (input.classList.contains('monto-input')) {
      const raw = String(input.value || '').trim();
      if (this.decimalRegex.test(raw) && this.parseDecimal(raw) > 0) {
        const normalized = this.toTwoDecimalString(raw);
        input.value = normalized;
        detail.vMonto = normalized;
        this.clearFieldError(input);
        this.recalculateTotal();
      }
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

  renderDetalleRows() {
    this.dom.vDetalleNotaCreditoBody.innerHTML = '';
    if (!this.state.vDetalleNotaCredito.length) {
      this.renderEmptyDetail();
      return;
    }

    this.state.vDetalleNotaCredito.forEach((item) => {
      const row = document.createElement('tr');
      row.dataset.rowId = item.id;
      row.innerHTML = `
        <td class="ordinal-col">${item.vOrdinal}</td>
        <td>
          <input type="hidden" class="base-code" value="${item.vCodigo_base}" />
          <input type="hidden" class="producto-code" value="${item.vCodigo_producto}" />
          <span>${item.vNombreProducto || item.vCodigo_producto || '-'}</span>
        </td>
        <td>
          <input type="text" class="form-control form-control-sm cantidad-input" inputmode="decimal" value="${item.vCantidad}" />
          <small class="text-muted d-block mt-1">max ${this.toTwoDecimalString(item.vSaldoMax)}</small>
        </td>
        <td>
          <input type="text" class="form-control form-control-sm monto-input" inputmode="decimal" value="${item.vMonto}" readonly />
        </td>
      `;
      this.dom.vDetalleNotaCreditoBody.appendChild(row);
    });

    this.dom.detalleCount.textContent = `${this.state.vDetalleNotaCredito.length} ${this.t('detailCount')}`;
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
      vSaldoMax: 0,
      vCostoUnitario: 0,
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

  applyCantidadToDetail(detail, qtyInput) {
    const qtyText = String(detail.vCantidad || '').trim();
    const qty = this.parseDecimal(qtyText);
    const saldoMax = Number(detail.vSaldoMax || 0);
    let costoUnitario = Number(detail.vCostoUnitario || 0);
    if ((!Number.isFinite(costoUnitario) || costoUnitario <= 0) && saldoMax > 0) {
      const montoBase = this.parseDecimal(detail.vMonto);
      if (Number.isFinite(montoBase) && montoBase > 0) {
        costoUnitario = montoBase / saldoMax;
      }
    }

    if (!this.decimalRegex.test(qtyText) || !Number.isFinite(qty) || qty <= 0 || qty > saldoMax) {
      detail.vMonto = '0.00';
      const row = qtyInput ? qtyInput.closest('tr') : null;
      const montoInput = row ? row.querySelector('.monto-input') : null;
      if (montoInput) {
        montoInput.value = detail.vMonto;
      }
      if (qtyInput) {
        this.setFieldError(qtyInput);
      }
      this.recalculateTotal();
      return;
    }

    const qtyNormalized = Number(qty.toFixed(2));
    detail.vCantidad = qtyNormalized.toFixed(2);
    detail.vMonto = (qtyNormalized * costoUnitario).toFixed(2);
    detail.vCostoUnitario = costoUnitario;

    if (qtyInput) {
      const row = qtyInput.closest('tr');
      const montoInput = row ? row.querySelector('.monto-input') : null;
      qtyInput.value = detail.vCantidad;
      this.clearFieldError(qtyInput);
      if (montoInput) {
        montoInput.value = detail.vMonto;
        this.clearFieldError(montoInput);
      }
    }
    this.recalculateTotal();
  }

  formatMoney(value) {
    return new Intl.NumberFormat(this.state.lang === 'es' ? 'es-PE' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  toTwoDecimalString(value) {
    const n = this.parseDecimal(value);
    if (!Number.isFinite(n)) return '0.00';
    return n.toFixed(2);
  }

  formatDateTime(value) {
    if (!value) return '-';
    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (match) {
      const [, y, mo, d, h = '00', mi = '00', s = '00'] = match;
      return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return raw;
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}:${pad(date.getSeconds())}`;
  }

  formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(this.state.lang === 'es' ? 'es-PE' : 'en-US');
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
    if (this.state.vTipo_nota_credito === 'DINERO') {
      const amount = this.parseDecimal(this.state.vMonto_dinero);
      this.state.vTotal_nota = Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : 0;
      this.refreshSummary();
      return;
    }

    let total = 0;

    this.state.vDetalleNotaCredito.forEach((item) => {
      const amount = this.parseDecimal(item.vMonto);
      if (Number.isFinite(amount) && amount > 0) {
        total += amount;
      }
    });

    this.state.vTotal_nota = Number(total.toFixed(2));
    this.refreshSummary();
  }

  validateStep1Selection() {
    if (!this.state.vCodigo_provedor) {
      this.setFieldError(this.dom.vNombreProvedor);
      this.showAlert(this.t('requiredProveedor'));
      return false;
    }

    this.clearFieldError(this.dom.vNombreProvedor);

    if (!this.state.selectedFacturaFCC) {
      this.showAlert(this.t('requiredFactura'));
      return false;
    }

    return true;
  }

  validateStep2Detail() {
    if (this.state.vTipo_nota_credito === 'DINERO') {
      const raw = String(this.state.vMonto_dinero || '').trim();
      const valid = this.decimalRegex.test(raw) && this.parseDecimal(raw) > 0;
      if (!valid) {
        this.setFieldError(this.dom.vMontoDinero);
        this.showAlert(this.t('requiredMontoDinero'));
        return false;
      }
      const normalized = this.toTwoDecimalString(raw);
      this.state.vMonto_dinero = normalized;
      this.dom.vMontoDinero.value = normalized;
      this.clearFieldError(this.dom.vMontoDinero);
      this.recalculateTotal();
      return true;
    }

    let hasError = false;
    let hasExceededError = false;

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
      const saldoMax = Number(detail.vSaldoMax || 0);
      const qtyValue = this.parseDecimal(qtyText);

      const qtyValid = this.decimalRegex.test(qtyText) && this.parseDecimal(qtyText) > 0;
      const qtyWithinSaldo = Number.isFinite(qtyValue) && qtyValue <= saldoMax;
      const montoValid = this.decimalRegex.test(montoText) && this.parseDecimal(montoText) > 0;
      let rowHasError = false;

      if (!detail.vCodigo_producto) {
        this.setFieldError(productoInput);
        hasError = true;
        rowHasError = true;
      }

      if (!qtyValid) {
        this.setFieldError(cantidadInput);
        hasError = true;
        rowHasError = true;
      } else if (!qtyWithinSaldo) {
        this.setFieldError(cantidadInput);
        hasError = true;
        hasExceededError = true;
        rowHasError = true;
      }

      if (!montoValid) {
        this.setFieldError(montoInput);
        hasError = true;
        rowHasError = true;
      }

      if (!rowHasError) {
        normalized.push({
          ordinal: detail.vOrdinal,
          codigo_base: Number(detail.vCodigo_base || 0) > 0 ? Number(detail.vCodigo_base || 0) : null,
          codigo_producto: Number(detail.vCodigo_producto),
          cantidad: Number(this.parseDecimal(qtyText).toFixed(2)),
          saldo: 0,
          monto: Number(this.parseDecimal(montoText).toFixed(2))
        });
      }
    });

    if (hasError) {
      this.showAlert(hasExceededError ? this.t('invalidCantidadExcede') : this.t('invalidDetalle'));
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
        vCodigo_base: found.codigo_base === null ? '' : String(found.codigo_base),
        vCodigo_producto: String(found.codigo_producto),
        vCantidad: String(found.cantidad),
        vMonto: String(found.monto),
        vSaldo: item.vSaldo,
        vSaldoMax: item.vSaldoMax,
        vCostoUnitario: item.vCostoUnitario
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
    this.dom.summaryFecha.textContent = this.state.vFechaDisplay || '-';
    this.dom.summaryTotal.textContent = this.formatMoney(this.state.vTotal_nota);
    if (this.dom.summaryDocumento) {
      this.dom.summaryDocumento.textContent = `${this.state.vTipo_documento_compra || '-'}-${
        this.state.vNum_documento_compra || '-'
      }`;
    }
    if (this.dom.summaryItems) {
      this.dom.summaryItems.textContent = this.state.vTipo_nota_credito === 'DINERO'
        ? '0'
        : String(this.state.vDetalleNotaCredito.length || 0);
    }

    this.dom.summaryDetalleBody.innerHTML = '';
    if (this.state.vTipo_nota_credito === 'DINERO') {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>${this.formatMoney(this.state.vTotal_nota)}</td>
      `;
      this.dom.summaryDetalleBody.appendChild(row);
      return;
    }

    if (!this.state.vDetalleNotaCredito.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="5" class="fcc-empty">${this.t('summaryEmptyDetail')}</td>`;
      this.dom.summaryDetalleBody.appendChild(row);
      return;
    }

    this.state.vDetalleNotaCredito.forEach((item) => {
      const qty = this.parseDecimal(item.vCantidad);
      const monto = this.parseDecimal(item.vMonto);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.vOrdinal || '-'}</td>
        <td>${item.vCodigo_base || '-'}</td>
        <td>${item.vCodigo_producto || '-'}</td>
        <td>${Number.isFinite(qty) ? this.formatMoney(qty) : '-'}</td>
        <td>${Number.isFinite(monto) ? this.formatMoney(monto) : '-'}</td>
      `;
      this.dom.summaryDetalleBody.appendChild(row);
    });
  }

  buildPayload() {
    const detalleProducto = this.state.vDetalleNotaCredito.map((item) => ({
      ordinal: item.vOrdinal,
      codigo_base: Number(item.vCodigo_base || 0) > 0 ? Number(item.vCodigo_base || 0) : null,
      codigo_producto: Number(item.vCodigo_producto),
      cantidad: Number(this.parseDecimal(item.vCantidad).toFixed(2)),
      saldo: 0,
      monto: Number(this.parseDecimal(item.vMonto).toFixed(2))
    }));
    const isDinero = this.state.vTipo_nota_credito === 'DINERO';

    return {
      vFecha: this.state.vFecha,
      vTipo_documento_compra: this.state.vTipo_documento_compra,
      vTipo_nota_credito: this.state.vTipo_nota_credito,
      vNum_documento_compra: Number(this.state.vNum_documento_compra),
      vTipo_documento_compra_origen: this.state.selectedFacturaFCC?.tipo_documento_compra || null,
      vNum_documento_compra_origen: this.state.selectedFacturaFCC
        ? Number(this.state.selectedFacturaFCC.num_documento_compra)
        : null,
      vCodigo_provedor: Number(this.state.vCodigo_provedor),
      vMonto_dinero: isDinero ? Number(this.parseDecimal(this.state.vMonto_dinero).toFixed(2)) : null,
      vDetalleNotaCredito: isDinero ? [] : detalleProducto,
      vTotal_nota: this.state.vTotal_nota
    };
  }

  async submit() {
    this.showAlert('');
    this.showSuccess('');

    if (!this.validateStep2Detail()) {
      this.state.step = 2;
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
    this.state.selectedFacturaFCC = null;
    this.state.vTipo_nota_credito = 'PRODUCTO';
    this.state.vMonto_dinero = '';
    this.state.vDetalleNotaCredito = [];
    this.state.vTotal_nota = 0;

    this.dom.vNombreProvedor.value = '';
    this.dom.vCodigo_provedor.value = '';
    this.dom.step2Proveedor.value = '';
    this.dom.step2Fecha.value = '';
    this.dom.vMontoDinero.value = '';
    this.dom.tipoNotaRadios.forEach((radio) => {
      radio.checked = radio.value === this.state.vTipo_nota_credito;
    });
    this.updateTipoNotaUI();
    this.dom.vDetalleNotaCreditoBody.innerHTML = '';
    this.dom.confirmOperacion.checked = false;

    await this.loadBootstrap();
    this.renderFacturasFCC('');
    this.renderEmptyDetail();
    this.recalculateTotal();
    this.updateProgress();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
