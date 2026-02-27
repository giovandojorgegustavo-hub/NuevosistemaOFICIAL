/*
SPs lectura
vProveedores = Llamada SP: get_proveedores() (devuelve campo_visible)
Campos devueltos
codigo_provedor
nombre
Variables
vCodigo_provedor no visible no editable
vNombreProvedor visible editable

vProductos = Llamada SP: get_productos() (devuelve campo_visible)
Campos devueltos
codigo_producto
nombre
Variables
vcodigo_producto no visible editable
vNombreProducto visible editable
*/

const i18n = {
  en: {
    title: 'Purchase Invoice',
    subtitle: 'Global IaaS & PaaS Procurement Hub',
    statusReady: 'Ready',
    wizardTitle: 'CU3001 - Purchase Invoice',
    wizardHint: 'Multi-step flow with full transactionality and SQL traceability.',
    step1Title: '1. Select or create provider',
    step1Hint: 'Choose an existing provider or register a new one.',
    fechaLabel: 'Date',
    proveedorModo: 'Provider mode',
    proveedorExistente: 'Existing provider',
    proveedorNuevo: 'New provider',
    proveedorSearchLabel: 'Search provider',
    proveedorNombreLabel: 'Provider name',
    proveedorCodigo: 'Provider code',
    proveedorCodigoHint: 'Assigned automatically.',
    step2Title: '2. Add products',
    step2Hint: 'Register the purchase items.',
    tipoDocumento: 'Document type',
    numeroDocumento: 'Document number',
    totalLabel: 'Purchase total',
    saldoFavorTotalLabel: 'Credit balance total',
    saldoFavorNCCLabel: 'Credit balance NCC',
    saldoFavorRCCLabel: 'Credit balance RCC',
    saldoFavorUsadoLabel: 'Credit balance to apply',
    usarSaldoFavorLabel: 'Use available credit balance',
    addRow: 'Add row',
    colProducto: 'Product',
    colCantidad: 'Quantity',
    colMonto: 'Amount',
    colAccion: 'Action',
    step3Title: '3. Confirm and invoice purchase',
    step3Hint: 'Review the summary before registering.',
    summaryProveedor: 'Provider',
    summaryFecha: 'Date',
    summaryTotal: 'Purchase total',
    confirmLabel: 'I confirm that the data is correct.',
    prev: 'Previous',
    next: 'Next',
    facturar: 'Invoice purchase',
    loading: 'Processing...',
    requiredProveedor: 'Select a provider to continue.',
    requiredProveedorNombre: 'Enter a valid provider name.',
    requiredDetalle: 'Add at least one valid detail row.',
    requiredConfirm: 'Confirm the operation to proceed.',
    invalidCantidad: 'Enter valid quantities and amounts greater than 0.',
    fetchError: 'We could not load data. Please try again.',
    success: 'Purchase invoice registered successfully. The form is ready for a new entry.',
    providersCount: 'providers',
    detailCount: 'items'
  },
  es: {
    title: 'Compras Factura',
    subtitle: 'Hub de compras global IaaS & PaaS',
    statusReady: 'Listo',
    wizardTitle: 'CU3001 - Compras Factura',
    wizardHint: 'Multi-paso con control total y trazabilidad SQL.',
    step1Title: '1. Seleccionar o crear proveedor',
    step1Hint: 'Selecciona un proveedor existente o registra uno nuevo.',
    fechaLabel: 'Fecha',
    proveedorModo: 'Modo de proveedor',
    proveedorExistente: 'Proveedor existente',
    proveedorNuevo: 'Proveedor nuevo',
    proveedorSearchLabel: 'Buscar proveedor',
    proveedorNombreLabel: 'Nombre proveedor',
    proveedorCodigo: 'Codigo proveedor',
    proveedorCodigoHint: 'Asignado automaticamente.',
    step2Title: '2. Agregar productos',
    step2Hint: 'Registra los items de la compra.',
    tipoDocumento: 'Tipo documento',
    numeroDocumento: 'Numero documento',
    totalLabel: 'Total compra',
    saldoFavorTotalLabel: 'Saldo favor total',
    saldoFavorNCCLabel: 'Saldo favor NCC',
    saldoFavorRCCLabel: 'Saldo favor RCC',
    saldoFavorUsadoLabel: 'Saldo favor a usar',
    usarSaldoFavorLabel: 'Usar saldo a favor disponible',
    addRow: 'Agregar fila',
    colProducto: 'Producto',
    colCantidad: 'Cantidad',
    colMonto: 'Monto',
    colAccion: 'Accion',
    step3Title: '3. Confirmar y facturar compra',
    step3Hint: 'Revisa el resumen antes de registrar.',
    summaryProveedor: 'Proveedor',
    summaryFecha: 'Fecha',
    summaryTotal: 'Total compra',
    confirmLabel: 'Confirmo que los datos son correctos.',
    prev: 'Anterior',
    next: 'Siguiente',
    facturar: 'Facturar Compra',
    loading: 'Procesando...',
    requiredProveedor: 'Selecciona un proveedor para continuar.',
    requiredProveedorNombre: 'Ingresa un nombre de proveedor valido.',
    requiredDetalle: 'Agrega al menos un detalle valido.',
    requiredConfirm: 'Confirma la operacion para continuar.',
    invalidCantidad: 'Ingresa cantidades y montos validos mayores a 0.',
    fetchError: 'No pudimos cargar los datos. Intentalo nuevamente.',
    success: 'Factura registrada correctamente. El formulario esta listo para un nuevo registro.',
    providersCount: 'proveedores',
    detailCount: 'items'
  }
};

class FormWizard {
  constructor() {
    this.state = {
      step: 1,
      lang: this.detectLang(),
      proveedores: [],
      productos: [],
      selectedProveedor: null,
      proveedorMode: 'existente',
      proveedorNuevoCodigo: null,
      proveedorNuevoNombre: '',
      fecha: this.nowLocalDateTime(),
      tipoDocumento: 'FCC',
      numeroDocumento: '',
      detalle: [],
      total: 0,
      saldoFavor: {
        rows: [],
        total: 0,
        ncc: 0,
        rcc: 0,
        usar: false,
        usado: 0
      },
      loading: false
    };

    this.detalleCounter = 0;

    this.cacheDom();
    this.bindEvents();
    this.applyTranslations();
    this.init();
  }

  detectLang() {
    const lang = navigator.language || 'en';
    return lang.startsWith('es') ? 'es' : 'en';
  }

  nowLocalDateTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  t(key) {
    return i18n[this.state.lang][key] || i18n.en[key] || key;
  }

  cacheDom() {
    this.dom = {
      statusPill: document.getElementById('statusPill'),
      stepIndicator: document.getElementById('stepIndicator'),
      progressBar: document.getElementById('progressBar'),
      formAlert: document.getElementById('formAlert'),
      formSuccess: document.getElementById('formSuccess'),
      panels: document.querySelectorAll('.step-panel'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      submitBtn: document.getElementById('submitBtn'),
      fechaInput: document.getElementById('fechaInput'),
      proveedorExistentePanel: document.getElementById('proveedorExistentePanel'),
      proveedorNuevoPanel: document.getElementById('proveedorNuevoPanel'),
      proveedorSearch: document.getElementById('proveedorSearch'),
      proveedorList: document.getElementById('proveedorList'),
      proveedoresCount: document.getElementById('proveedoresCount'),
      proveedorCodigoNuevo: document.getElementById('proveedorCodigoNuevo'),
      proveedorNombreNuevo: document.getElementById('proveedorNombreNuevo'),
      totalCompra: document.getElementById('totalCompra'),
      saldoFavorTotal: document.getElementById('saldoFavorTotal'),
      usarSaldoFavorCheck: document.getElementById('usarSaldoFavorCheck'),
      addRowBtn: document.getElementById('addRowBtn'),
      detalleCount: document.getElementById('detalleCount'),
      detalleBody: document.querySelector('#detalleTable tbody'),
      summaryProveedor: document.getElementById('summaryProveedor'),
      summaryFecha: document.getElementById('summaryFecha'),
      summaryTotal: document.getElementById('summaryTotal'),
      summaryBody: document.querySelector('#summaryTable tbody'),
      confirmCheck: document.getElementById('confirmCheck')
    };
  }

  bindEvents() {
    document.querySelectorAll('input[name="proveedorModo"]').forEach((radio) => {
      radio.addEventListener('change', (event) => this.handleProveedorMode(event.target.value));
    });

    this.dom.proveedorSearch.addEventListener('input', () => this.handleProveedorSearch());
    this.dom.proveedorSearch.addEventListener('focus', () => this.handleProveedorSearch());

    document.addEventListener('click', (event) => {
      const inProveedor = this.dom.proveedorSearch.contains(event.target) || this.dom.proveedorList.contains(event.target);
      if (!inProveedor) {
        this.dom.proveedorList.classList.remove('show');
      }

      const inDetalleTypeahead = event.target.closest('#detalleTable .typeahead');
      if (!inDetalleTypeahead) {
        document.querySelectorAll('#detalleTable .typeahead-list').forEach((list) => list.classList.remove('show'));
      }
    });

    this.dom.proveedorList.addEventListener('click', (event) => {
      const item = event.target.closest('.list-group-item');
      if (!item) return;
      const codigo = item.dataset.codigo;
      const nombre = item.dataset.nombre;
      this.selectProveedor({ codigo_provedor: codigo, nombre });
      this.dom.proveedorList.classList.remove('show');
    });

    this.dom.proveedorNombreNuevo.addEventListener('input', (event) => {
      this.state.proveedorNuevoNombre = event.target.value;
    });

    this.dom.addRowBtn.addEventListener('click', () => this.addDetalleRow());
    this.dom.usarSaldoFavorCheck.addEventListener('change', (event) => {
      this.state.saldoFavor.usar = event.target.checked;
      this.recalculateSaldoFavor();
    });

    this.dom.detalleBody.addEventListener('input', (event) => this.handleDetalleInput(event));
    this.dom.detalleBody.addEventListener('focusin', (event) => this.handleDetalleFocus(event));
    this.dom.detalleBody.addEventListener('click', (event) => this.handleDetalleFocus(event));
    this.dom.detalleBody.addEventListener('click', (event) => this.handleDetalleClick(event));

    this.dom.prevBtn.addEventListener('click', () => this.prevStep());
    this.dom.nextBtn.addEventListener('click', () => this.nextStep());
    this.dom.submitBtn.addEventListener('click', () => this.submit());
  }

  applyTranslations() {
    document.documentElement.lang = this.state.lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = this.t(key);
    });
  }

  async init() {
    this.dom.fechaInput.value = this.state.fecha;

    this.setLoading(true, this.t('loading'));
    try {
      await Promise.all([this.loadProveedores(), this.loadProductos(), this.loadNumeroDocumento()]);
      await this.loadNextProveedor();
      if (!this.state.detalle.length) {
        this.addDetalleRow();
      }
    } catch (error) {
      this.showAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false, this.t('statusReady'));
    }

    this.recalculateSaldoFavor();
    this.updateProgress();
  }

  async loadProveedores() {
    const response = await fetch('./api/proveedores');
    const data = await response.json();
    if (!data.ok) {
      throw new Error('PROVEEDORES_ERROR');
    }
    this.state.proveedores = data.data || [];
    this.updateProveedoresCount();
  }

  async loadProductos() {
    const response = await fetch('./api/productos');
    const data = await response.json();
    if (!data.ok) {
      throw new Error('PRODUCTOS_ERROR');
    }
    this.state.productos = data.data || [];
  }

  async loadNextProveedor() {
    const response = await fetch('./api/next-proveedor');
    const data = await response.json();
    if (!data.ok) {
      throw new Error('NEXT_PROVEEDOR_ERROR');
    }
    this.state.proveedorNuevoCodigo = data.next;
    this.dom.proveedorCodigoNuevo.value = data.next;
  }

  async loadNumeroDocumento() {
    const response = await fetch(`./api/next-documento?tipo=${encodeURIComponent(this.state.tipoDocumento)}`);
    const data = await response.json();
    if (!data.ok) {
      throw new Error('NEXT_DOCUMENTO_ERROR');
    }
    this.state.numeroDocumento = data.next;
  }

  handleProveedorMode(mode) {
    this.state.proveedorMode = mode;
    if (mode === 'nuevo') {
      this.dom.proveedorExistentePanel.classList.add('d-none');
      this.dom.proveedorNuevoPanel.classList.remove('d-none');
      this.state.selectedProveedor = null;
      this.resetSaldoFavor();
      this.dom.proveedorSearch.value = '';
      this.dom.proveedorList.classList.remove('show');
      this.dom.proveedorNombreNuevo.value = this.state.proveedorNuevoNombre;
      this.loadNextProveedor().catch(() => {
        this.showAlert(this.t('fetchError'));
      });
    } else {
      this.dom.proveedorExistentePanel.classList.remove('d-none');
      this.dom.proveedorNuevoPanel.classList.add('d-none');
      this.state.proveedorNuevoNombre = '';
      this.dom.proveedorNombreNuevo.value = '';
      this.resetSaldoFavor();
    }
  }

  handleProveedorSearch() {
    const query = this.dom.proveedorSearch.value.toLowerCase();
    this.state.selectedProveedor = null;
    this.resetSaldoFavor();
    const matches = this.state.proveedores.filter((item) => {
      const nombre = String(item.nombre || '').toLowerCase();
      const codigo = String(item.codigo_provedor || '').toLowerCase();
      return nombre.includes(query) || codigo.includes(query);
    });
    this.renderProveedorList(matches.slice(0, 25));
  }

  renderProveedorList(list) {
    if (!list.length) {
      this.dom.proveedorList.innerHTML = '';
      this.dom.proveedorList.classList.remove('show');
      return;
    }
    this.dom.proveedorList.innerHTML = list
      .map(
        (item) =>
          `<button type="button" class="list-group-item list-group-item-action" data-codigo="${item.codigo_provedor}" data-nombre="${item.nombre}">${item.nombre} <span class="text-muted">(#${item.codigo_provedor})</span></button>`
      )
      .join('');
    this.dom.proveedorList.classList.add('show');
  }

  selectProveedor(proveedor) {
    this.state.selectedProveedor = proveedor;
    this.dom.proveedorSearch.value = proveedor.nombre;
    this.loadSaldoFavor(proveedor.codigo_provedor).catch(() => {
      this.showAlert(this.t('fetchError'));
    });
  }

  updateProveedoresCount() {
    this.dom.proveedoresCount.textContent = `${this.state.proveedores.length} ${this.t('providersCount')}`;
  }

  resetSaldoFavor() {
    this.state.saldoFavor = {
      rows: [],
      total: 0,
      ncc: 0,
      rcc: 0,
      usar: false,
      usado: 0
    };
    this.dom.usarSaldoFavorCheck.checked = false;
    this.recalculateSaldoFavor();
  }

  async loadSaldoFavor(codigoProvedor) {
    const response = await fetch(`./api/saldo-favor-provedor?provedor=${encodeURIComponent(codigoProvedor)}`);
    const data = await response.json();
    if (!data.ok) {
      throw new Error('SALDO_FAVOR_PROVEDOR_ERROR');
    }

    const rows = Array.isArray(data.rows) ? data.rows : [];
    const total = rows.reduce((acc, row) => acc + (Number(row.saldo) || 0), 0);
    const ncc = rows
      .filter((row) => row.tipo_documento_compra === 'NCC')
      .reduce((acc, row) => acc + (Number(row.saldo) || 0), 0);
    const rcc = rows
      .filter((row) => row.tipo_documento_compra === 'RCC')
      .reduce((acc, row) => acc + (Number(row.saldo) || 0), 0);

    this.state.saldoFavor.rows = rows;
    this.state.saldoFavor.total = total;
    this.state.saldoFavor.ncc = ncc;
    this.state.saldoFavor.rcc = rcc;
    if (total <= 0) {
      this.state.saldoFavor.usar = false;
      this.dom.usarSaldoFavorCheck.checked = false;
    }
    this.recalculateSaldoFavor();
  }

  recalculateSaldoFavor() {
    const totalCompra = Number(this.state.total) || 0;
    const totalFavor = Number(this.state.saldoFavor.total) || 0;
    const usar = this.state.saldoFavor.usar && totalFavor > 0;
    const usado = usar ? Math.min(totalFavor, totalCompra) : 0;
    this.state.saldoFavor.usado = usado;

    this.dom.saldoFavorTotal.value = totalFavor.toFixed(2);
    this.dom.usarSaldoFavorCheck.disabled = totalFavor <= 0 || this.state.proveedorMode !== 'existente';
  }

  addDetalleRow() {
    const id = `row-${this.detalleCounter++}`;
    const row = document.createElement('tr');
    row.dataset.rowId = id;
    row.innerHTML = `
      <td>
        <div class="typeahead">
          <input type="text" class="form-control form-control-sm product-input" placeholder="Producto" autocomplete="off" />
          <div class="typeahead-list list-group"></div>
        </div>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm qty-input" placeholder="0.00" inputmode="decimal" />
      </td>
      <td>
        <input type="text" class="form-control form-control-sm monto-input" placeholder="0.00" inputmode="decimal" />
      </td>
      <td>
        <button type="button" class="btn btn-outline-danger btn-sm remove-row">&times;</button>
      </td>
    `;
    this.dom.detalleBody.appendChild(row);
    this.state.detalle.push({ id, codigo_producto: '', nombre: '', cantidad: '', monto: '' });
    this.updateDetalleCount();
    this.updateTotal();
  }

  handleDetalleInput(event) {
    const row = event.target.closest('tr');
    if (!row) return;
    const rowId = row.dataset.rowId;
    const detail = this.state.detalle.find((item) => item.id === rowId);
    if (!detail) return;

    if (event.target.classList.contains('product-input')) {
      const query = event.target.value.toLowerCase();
      detail.nombre = event.target.value;
      detail.codigo_producto = '';
      const listEl = row.querySelector('.typeahead-list');
      const matches = this.state.productos.filter((item) => {
        const nombre = String(item.nombre || '').toLowerCase();
        const codigo = String(item.codigo_producto || '').toLowerCase();
        return nombre.includes(query) || codigo.includes(query);
      });
      this.renderProductList(listEl, matches.slice(0, 25));
    }

    if (event.target.classList.contains('qty-input')) {
      detail.cantidad = event.target.value;
    }

    if (event.target.classList.contains('monto-input')) {
      detail.monto = event.target.value;
      this.updateTotal();
    }
  }

  handleDetalleFocus(event) {
    if (!event.target.classList.contains('product-input')) {
      return;
    }
    const row = event.target.closest('tr');
    if (!row) return;
    const query = event.target.value.toLowerCase();
    const listEl = row.querySelector('.typeahead-list');
    const matches = this.state.productos.filter((item) => {
      const nombre = String(item.nombre || '').toLowerCase();
      const codigo = String(item.codigo_producto || '').toLowerCase();
      return nombre.includes(query) || codigo.includes(query);
    });
    this.renderProductList(listEl, matches.slice(0, 25));
  }

  handleDetalleClick(event) {
    const row = event.target.closest('tr');
    if (!row) return;
    const rowId = row.dataset.rowId;

    if (event.target.classList.contains('remove-row')) {
      this.state.detalle = this.state.detalle.filter((item) => item.id !== rowId);
      row.remove();
      this.updateDetalleCount();
      this.updateTotal();
      return;
    }

    const item = event.target.closest('.list-group-item');
    if (item) {
      const codigo = item.dataset.codigo;
      const nombre = item.dataset.nombre;
      const detail = this.state.detalle.find((entry) => entry.id === rowId);
      if (detail) {
        detail.codigo_producto = codigo;
        detail.nombre = nombre;
      }
      const input = row.querySelector('.product-input');
      const listEl = row.querySelector('.typeahead-list');
      input.value = nombre;
      listEl.classList.remove('show');
    }
  }

  renderProductList(listEl, list) {
    if (!list.length) {
      listEl.innerHTML = '';
      listEl.classList.remove('show');
      return;
    }
    listEl.innerHTML = list
      .map(
        (item) =>
          `<button type="button" class="list-group-item list-group-item-action" data-codigo="${item.codigo_producto}" data-nombre="${item.nombre}">${item.nombre} <span class="text-muted">(#${item.codigo_producto})</span></button>`
      )
      .join('');
    listEl.classList.add('show');
  }

  updateDetalleCount() {
    this.dom.detalleCount.textContent = `${this.state.detalle.length} ${this.t('detailCount')}`;
  }

  updateTotal() {
    const total = this.state.detalle.reduce((acc, item) => {
      const value = parseFloat(item.monto);
      return acc + (Number.isFinite(value) ? value : 0);
    }, 0);
    this.state.total = total;
    this.dom.totalCompra.value = total.toFixed(2);
    this.recalculateSaldoFavor();
  }

  showAlert(message) {
    this.dom.formAlert.textContent = message;
    this.dom.formAlert.classList.remove('d-none');
    this.dom.formSuccess.classList.add('d-none');
  }

  showSuccess(message) {
    this.dom.formSuccess.textContent = message;
    this.dom.formSuccess.classList.remove('d-none');
    this.dom.formAlert.classList.add('d-none');
  }

  clearAlerts() {
    this.dom.formAlert.classList.add('d-none');
    this.dom.formSuccess.classList.add('d-none');
  }

  setLoading(isLoading, label) {
    this.state.loading = isLoading;
    this.dom.statusPill.textContent = label;
    this.dom.nextBtn.disabled = isLoading;
    this.dom.prevBtn.disabled = isLoading;
    this.dom.submitBtn.disabled = isLoading;
  }

  updateProgress() {
    const percent = (this.state.step / 3) * 100;
    this.dom.progressBar.style.width = `${percent}%`;
    this.dom.stepIndicator.textContent = `${this.state.step} / 3`;

    this.dom.panels.forEach((panel) => {
      panel.classList.toggle('active', Number(panel.dataset.step) === this.state.step);
    });

    this.dom.prevBtn.classList.toggle('d-none', this.state.step === 1);
    this.dom.nextBtn.classList.toggle('d-none', this.state.step === 3);
    this.dom.submitBtn.classList.toggle('d-none', this.state.step !== 3);

    if (this.state.step === 3) {
      this.updateSummary();
    }
  }

  nextStep() {
    this.clearAlerts();
    if (!this.validateStep(this.state.step)) {
      return;
    }
    this.state.step = Math.min(this.state.step + 1, 3);
    this.updateProgress();
  }

  prevStep() {
    this.clearAlerts();
    this.state.step = Math.max(this.state.step - 1, 1);
    this.updateProgress();
  }

  validateStep(step) {
    if (step === 1) {
      return this.validateStep1();
    }
    if (step === 2) {
      return this.validateStep2();
    }
    return true;
  }

  validateStep1() {
    if (this.state.proveedorMode === 'existente') {
      if (!this.state.selectedProveedor) {
        this.showAlert(this.t('requiredProveedor'));
        return false;
      }
      return true;
    }

    const nameRegex = /^[A-Za-zÀ-ÿ0-9 .,'-]{2,}$/;
    if (!nameRegex.test(this.state.proveedorNuevoNombre.trim())) {
      this.showAlert(this.t('requiredProveedorNombre'));
      return false;
    }
    return true;
  }

  validateStep2() {
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    let validRows = 0;

    this.state.detalle.forEach((item) => {
      const row = this.dom.detalleBody.querySelector(`tr[data-row-id="${item.id}"]`);
      if (!row) return;
      const productInput = row.querySelector('.product-input');
      const qtyInput = row.querySelector('.qty-input');
      const montoInput = row.querySelector('.monto-input');

      const qtyValid = decimalRegex.test(item.cantidad) && parseFloat(item.cantidad) > 0;
      const montoValid = decimalRegex.test(item.monto) && parseFloat(item.monto) > 0;
      const productoValid = Boolean(item.codigo_producto);

      productInput.classList.toggle('is-invalid', !productoValid);
      qtyInput.classList.toggle('is-invalid', !qtyValid);
      montoInput.classList.toggle('is-invalid', !montoValid);

      if (productoValid && qtyValid && montoValid) {
        validRows += 1;
      }
    });

    if (!this.state.detalle.length || validRows === 0) {
      this.showAlert(this.t('requiredDetalle'));
      return false;
    }

    if (validRows !== this.state.detalle.length) {
      this.showAlert(this.t('invalidCantidad'));
      return false;
    }

    this.updateTotal();
    return true;
  }

  updateSummary() {
    const proveedorNombre = this.state.proveedorMode === 'existente'
      ? this.state.selectedProveedor?.nombre || ''
      : this.state.proveedorNuevoNombre;
    this.dom.summaryProveedor.textContent = proveedorNombre || '-';
    this.dom.summaryFecha.textContent = this.state.fecha ? this.state.fecha.replace('T', ' ') : '-';
    this.dom.summaryTotal.textContent = this.state.total.toFixed(2);

    this.dom.summaryBody.innerHTML = this.state.detalle
      .map(
        (item) =>
          `<tr><td>${item.nombre}</td><td>${item.cantidad}</td><td>${item.monto}</td></tr>`
      )
      .join('');
  }

  async submit() {
    this.clearAlerts();
    if (!this.validateStep2()) {
      return;
    }
    if (!this.dom.confirmCheck.checked) {
      this.showAlert(this.t('requiredConfirm'));
      return;
    }

    const proveedorNuevo = this.state.proveedorMode === 'nuevo';
    const codigoProveedor = proveedorNuevo
      ? this.state.proveedorNuevoCodigo
      : this.state.selectedProveedor?.codigo_provedor;
    const nombreProveedor = proveedorNuevo
      ? this.state.proveedorNuevoNombre
      : this.state.selectedProveedor?.nombre;

    const payload = {
      vFecha: this.state.fecha,
      vTipo_documento_compra: this.state.tipoDocumento,
      vNum_documento_compra: this.state.numeroDocumento,
      vCodigo_provedor: codigoProveedor,
      vNombreProvedor: nombreProveedor,
      proveedorNuevo,
      vDetalleCompra: this.state.detalle.map((item) => ({
        codigo_producto: item.codigo_producto,
        nombre: item.nombre,
        cantidad: Number(item.cantidad),
        monto: Number(item.monto)
      })),
      vTotal_compra: this.state.total,
      vSaldoFavorUsar: this.state.saldoFavor.usado
    };

    this.setLoading(true, this.t('loading'));
    try {
      const response = await fetch('./api/facturar-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.ok) {
        throw new Error('FACTURAR_ERROR');
      }
      this.showSuccess(this.t('success'));
      await this.resetWizard();
    } catch (error) {
      this.showAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false, this.t('statusReady'));
    }
  }

  async resetWizard() {
    this.state.step = 1;
    this.state.fecha = this.nowLocalDateTime();
    this.dom.fechaInput.value = this.state.fecha;
    this.dom.confirmCheck.checked = false;

    this.state.proveedorMode = 'existente';
    document.querySelectorAll('input[name="proveedorModo"]').forEach((radio) => {
      radio.checked = radio.value === 'existente';
    });
    this.dom.proveedorExistentePanel.classList.remove('d-none');
    this.dom.proveedorNuevoPanel.classList.add('d-none');

    this.state.detalle = [];
    this.dom.detalleBody.innerHTML = '';
    this.addDetalleRow();

    this.state.selectedProveedor = null;
    this.dom.proveedorSearch.value = '';
    this.state.proveedorNuevoNombre = '';
    this.dom.proveedorNombreNuevo.value = '';
    this.resetSaldoFavor();

    await Promise.all([this.loadNumeroDocumento(), this.loadNextProveedor(), this.loadProveedores()]);

    this.updateProgress();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
