const translations = {
  es: {
    eyebrow: 'Global IaaS & PaaS Operations',
    title: 'Registro de Pedidos y Facturacion',
    subtitle: 'Crea pedidos, emite facturas y coordina entregas con trazabilidad total.',
    metric1Label: 'Registros activos',
    metric2Label: 'Saldo actual',
    step1: 'Pedido',
    step2: 'Factura',
    step3: 'Entrega',
    step4: 'Recibe',
    step5: 'Resumen',
    pedidoTitle: 'Crear Pedido',
    pedidoHelp: 'Selecciona cliente, fecha y registra los productos solicitados.',
    cliente: 'Cliente',
    fecha: 'Fecha Pedido',
    hora: 'Hora Pedido',
    productosPedido: 'Productos del Pedido',
    addRow: 'Agregar linea',
    producto: 'Producto',
    cantidad: 'Cantidad',
    precioTotal: 'Precio total',
    precioUnitario: 'Precio unitario',
    facturaTitle: 'Crear Factura',
    facturaHelp: 'Ajusta cantidades a facturar y valida el saldo total.',
    fechaEmision: 'Fecha emision',
    horaEmision: 'Hora emision',
    codigoBase: 'Codigo base',
    numeroDocumento: 'Numero documento',
    productosFactura: 'Productos a Facturar',
    cantidadFactura: 'Cantidad Factura',
    entregaTitle: 'Datos Entrega',
    entregaHelp: 'Selecciona un punto de entrega existente o registra uno nuevo.',
    existe: 'Existe',
    nuevo: 'Nuevo',
    puntoEntrega: 'Punto de entrega',
    departamento: 'Departamento',
    provincia: 'Provincia',
    distrito: 'Distrito',
    direccion: 'Direccion',
    referencia: 'Referencia',
    nombre: 'Nombre',
    dni: 'DNI',
    agencia: 'Agencia',
    observaciones: 'Observaciones',
    recibeTitle: 'Datos Recibe',
    recibeHelp: 'Solo aplica para entregas en Lima Metropolitana.',
    numRecibe: 'Numero recibe',
    numeroRecibe: 'Numero',
    nombreRecibe: 'Nombre',
    resumenTitle: 'Resumen y Emitir Factura',
    resumenHelp: 'Verifica la informacion antes de emitir la factura.',
    confirm: 'Confirmo la operacion y el envio de factura.',
    emitir: 'Emitir Factura',
    prev: 'Anterior',
    next: 'Siguiente',
    save: 'Emitir',
    loading: 'Cargando informacion...',
    emptyRows: 'Sin registros',
    errors: {
      cliente: 'Selecciona un cliente valido.',
      pedidoItems: 'Agrega al menos un producto con datos validos.',
      cantidad: 'Revisa las cantidades ingresadas.',
      facturaCantidad: 'La cantidad facturada no puede superar la cantidad del pedido.',
      base: 'Selecciona una base valida.',
      entrega: 'Selecciona un punto de entrega o completa los campos nuevos.',
      recibe: 'Selecciona un numrecibe o completa los campos nuevos.',
      confirm: 'Debes confirmar la operacion para emitir.',
      api: 'No se pudo completar la operacion. Intenta nuevamente.'
    },
    resumenPedido: 'Resumen Pedido',
    resumenFactura: 'Resumen Factura',
    resumenEntrega: 'Resumen Entrega',
    resumenRecibe: 'Resumen Recibe',
    existente: 'EXISTENTE',
    nuevoRegistro: 'NUEVO',
    regionLima: 'LIMA',
    regionProv: 'PROV',
    items: 'items'
  },
  en: {
    eyebrow: 'Global IaaS & PaaS Operations',
    title: 'Order & Invoice Registration',
    subtitle: 'Create orders, issue invoices, and coordinate delivery with full traceability.',
    metric1Label: 'Active records',
    metric2Label: 'Current balance',
    step1: 'Order',
    step2: 'Invoice',
    step3: 'Delivery',
    step4: 'Receiver',
    step5: 'Summary',
    pedidoTitle: 'Create Order',
    pedidoHelp: 'Select client, date and register requested products.',
    cliente: 'Client',
    fecha: 'Order Date',
    hora: 'Order Time',
    productosPedido: 'Order Products',
    addRow: 'Add line',
    producto: 'Product',
    cantidad: 'Quantity',
    precioTotal: 'Total price',
    precioUnitario: 'Unit price',
    facturaTitle: 'Create Invoice',
    facturaHelp: 'Adjust quantities to invoice and validate the total balance.',
    fechaEmision: 'Issue date',
    horaEmision: 'Issue time',
    codigoBase: 'Base code',
    numeroDocumento: 'Document number',
    productosFactura: 'Products to invoice',
    cantidadFactura: 'Invoice Quantity',
    entregaTitle: 'Delivery Details',
    entregaHelp: 'Select an existing delivery point or register a new one.',
    existe: 'Existing',
    nuevo: 'New',
    puntoEntrega: 'Delivery point',
    departamento: 'Department',
    provincia: 'Province',
    distrito: 'District',
    direccion: 'Address',
    referencia: 'Reference',
    nombre: 'Name',
    dni: 'ID',
    agencia: 'Agency',
    observaciones: 'Notes',
    recibeTitle: 'Receiver Details',
    recibeHelp: 'Only applies to Lima deliveries.',
    numRecibe: 'Receiver number',
    numeroRecibe: 'Number',
    nombreRecibe: 'Name',
    resumenTitle: 'Summary & Issue Invoice',
    resumenHelp: 'Verify the information before issuing the invoice.',
    confirm: 'I confirm the operation and invoice issuance.',
    emitir: 'Issue Invoice',
    prev: 'Back',
    next: 'Next',
    save: 'Issue',
    loading: 'Loading information...',
    emptyRows: 'No records',
    errors: {
      cliente: 'Select a valid client.',
      pedidoItems: 'Add at least one product with valid data.',
      cantidad: 'Review the quantities entered.',
      facturaCantidad: 'Invoiced quantity cannot exceed order quantity.',
      base: 'Select a valid base.',
      entrega: 'Select a delivery point or complete the new fields.',
      recibe: 'Select a receiver or complete the new fields.',
      confirm: 'You must confirm the operation to issue.',
      api: 'The operation could not be completed. Please try again.'
    },
    resumenPedido: 'Order Summary',
    resumenFactura: 'Invoice Summary',
    resumenEntrega: 'Delivery Summary',
    resumenRecibe: 'Receiver Summary',
    existente: 'EXISTING',
    nuevoRegistro: 'NEW',
    regionLima: 'LIMA',
    regionProv: 'OUTSIDE',
    items: 'items'
  }
};

class FormWizard {
  constructor() {
    this.stepsAll = Array.from(document.querySelectorAll('.step'));
    this.steps = [];
    this.currentStep = 0;
    this.progressBar = document.getElementById('progressBar');
    this.nextBtn = document.getElementById('nextBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.loadingState = document.getElementById('loadingState');
    this.alertArea = document.getElementById('alertArea');
    this.pedidoBody = document.getElementById('pedidoBody');
    this.facturaBody = document.getElementById('facturaBody');
    this.saldoBadge = document.getElementById('saldoBadge');

    this.state = {
      clientes: [],
      productos: [],
      bases: [],
      puntosEntrega: [],
      numRecibe: [],
      pedidoItems: [],
      facturaItems: [],
      regionEntrega: 'PROV',
      codigoPedido: null,
      numeroDocumento: null,
      moneda: 'PEN'
    };

    this.init();
  }

  init() {
    this.setLanguage();
    this.applyLanguage();
    this.bindEvents();
    this.initDates();
    this.refreshSteps();
    this.loadInit();
  }

  setLanguage() {
    const lang = (navigator.language || 'es').toLowerCase();
    this.langKey = lang.startsWith('es') ? 'es' : 'en';
    this.dict = translations[this.langKey];
    document.documentElement.lang = this.langKey;
  }

  applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (this.dict[key]) {
        el.textContent = this.dict[key];
      }
    });
  }

  bindEvents() {
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.prevBtn.addEventListener('click', () => this.handlePrev());
    document.getElementById('addPedidoRow').addEventListener('click', () => this.addPedidoRow());
    document.getElementById('clienteSelect').addEventListener('change', (e) => this.handleClienteChange(e));
    document.getElementById('baseSelect').addEventListener('change', () => this.calculateSaldo());
    document.getElementById('emitirBtn').addEventListener('click', () => this.handleEmitir());
    document.getElementById('puntoEntregaSelect').addEventListener('change', () => this.updateRegionFromExisting());

    document.querySelectorAll('input[name="entregaMode"]').forEach((input) => {
      input.addEventListener('change', () => this.toggleEntregaMode());
    });
    document.querySelectorAll('input[name="recibeMode"]').forEach((input) => {
      input.addEventListener('change', () => this.toggleRecibeMode());
    });

    document.getElementById('depSelect').addEventListener('change', () => this.loadProvincias());
    document.getElementById('provSelect').addEventListener('change', () => this.loadDistritos());
    document.getElementById('depSelect').addEventListener('change', () => this.updateRegionEntrega());
    document.getElementById('provSelect').addEventListener('change', () => this.updateRegionEntrega());
  }

  initDates() {
    const now = new Date();
    const fecha = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 5);
    document.getElementById('fechaPedido').value = fecha;
    document.getElementById('horaPedido').value = hora;
    document.getElementById('fechaEmision').value = fecha;
    document.getElementById('horaEmision').value = hora;
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
    const isLast = this.currentStep === this.steps.length - 1;
    this.nextBtn.textContent = isLast ? this.dict.save : this.dict.next;
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
  }

  refreshSteps() {
    const includeRecibe = this.state.regionEntrega === 'LIMA';
    const recibeStep = document.getElementById('step-recibe');
    recibeStep.classList.toggle('d-none', !includeRecibe);

    this.steps = this.stepsAll.filter((step) => !step.classList.contains('d-none'));
    if (this.currentStep >= this.steps.length) {
      this.currentStep = this.steps.length - 1;
    }
    this.stepsAll.forEach((step) => step.classList.remove('active'));
    if (this.steps[this.currentStep]) {
      this.steps[this.currentStep].classList.add('active');
    }
    this.updateButtons();
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
    const valid = this.validateStep();
    if (!valid) return;

    if (this.currentStep === this.steps.length - 1) {
      await this.handleEmitir();
      return;
    }

    this.goToStep(this.currentStep + 1);
    if (this.steps[this.currentStep].id === 'step-factura') {
      this.buildFacturaGrid();
    }
    if (this.steps[this.currentStep].id === 'step-resumen') {
      this.renderSummary();
    }
  }

  validateStep() {
    this.clearAlert();
    if (this.steps[this.currentStep].id === 'step-pedido') {
      const cliente = document.getElementById('clienteSelect').value;
      if (!cliente) {
        this.showAlert('warning', this.dict.errors.cliente);
        return false;
      }
      const items = this.collectPedidoItems();
      if (this.state.pedidoInvalid) {
        this.showAlert('warning', this.dict.errors.cantidad);
        return false;
      }
      if (items.length === 0) {
        this.showAlert('warning', this.dict.errors.pedidoItems);
        return false;
      }
      return true;
    }

    if (this.steps[this.currentStep].id === 'step-factura') {
      const base = document.getElementById('baseSelect').value;
      if (!base) {
        this.showAlert('warning', this.dict.errors.base);
        return false;
      }
      if (!this.validateFacturaItems()) {
        return false;
      }
      return true;
    }

    if (this.steps[this.currentStep].id === 'step-entrega') {
      if (!this.validateEntrega()) {
        this.showAlert('warning', this.dict.errors.entrega);
        return false;
      }
      return true;
    }

    if (this.steps[this.currentStep].id === 'step-recibe') {
      if (!this.validateRecibe()) {
        this.showAlert('warning', this.dict.errors.recibe);
        return false;
      }
      return true;
    }

    if (this.steps[this.currentStep].id === 'step-resumen') {
      if (!document.getElementById('confirmEmit').checked) {
        this.showAlert('warning', this.dict.errors.confirm);
        return false;
      }
    }

    return true;
  }

  async loadInit() {
    try {
      this.setLoading(this.dict.loading);
      const response = await fetch('/api/init');
      const data = await response.json();
      this.state.clientes = data.clientes || [];
      this.state.productos = data.productos || [];
      this.state.bases = data.bases || [];
      this.state.codigoPedido = data.codigo_pedido || null;
      this.state.numeroDocumento = data.numero_documento || null;

      this.fillClientes();
      this.fillBases();
      this.fillMetricas();
      this.numeroDocumentoField();
      this.addPedidoRow();
      await this.loadUbigeoDepartamentos();
    } catch (error) {
      this.showAlert('danger', this.dict.errors.api);
    } finally {
      this.setLoading('');
    }
  }

  fillMetricas() {
    const pedidosMetric = document.getElementById('metricPedidos');
    pedidosMetric.textContent = this.state.codigoPedido ? `#${this.state.codigoPedido}` : '--';
    document.getElementById('metricSaldo').textContent = this.formatMoney(this.calculateSaldo());
  }

  numeroDocumentoField() {
    document.getElementById('numeroDocumento').value = this.state.numeroDocumento || '';
  }

  fillClientes() {
    const select = document.getElementById('clienteSelect');
    select.innerHTML = '<option value="">--</option>';
    this.state.clientes.forEach((cliente) => {
      const value = this.getField(cliente, ['codigo_cliente', 'vcodigo_cliente', 'codigo', 'id']);
      const name = this.getField(cliente, ['nombre_cliente', 'vnombre_cliente', 'razon_social', 'nombre', 'descripcion']);
      const label = value ? `${value} - ${name || ''}` : name || '';
      const option = document.createElement('option');
      option.value = value || '';
      option.textContent = label || value || '--';
      select.appendChild(option);
    });
  }

  fillBases() {
    const select = document.getElementById('baseSelect');
    select.innerHTML = '<option value="">--</option>';
    this.state.bases.forEach((base) => {
      const value = this.getField(base, ['codigo_base', 'vcodigo_base', 'codigo', 'id']);
      const name = this.getField(base, ['descripcion', 'nombre', 'vdescripcion']);
      const option = document.createElement('option');
      option.value = value || '';
      option.textContent = name ? `${value} - ${name}` : value;
      select.appendChild(option);
    });
  }

  getField(obj, keys) {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        return obj[key];
      }
    }
    return '';
  }

  getProductoLabel(codigo) {
    const producto = this.state.productos.find((item) =>
      String(this.getField(item, ['codigo_producto', 'vcodigo_producto', 'codigo', 'id'])) === String(codigo)
    );
    const name = this.getField(producto, ['nombre_producto', 'descripcion', 'vdescripcion', 'nombre']);
    return name ? `${codigo} - ${name}` : String(codigo);
  }

  addPedidoRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td></td>
      <td><input type="text" class="form-control form-control-sm cantidad-input" /></td>
      <td><input type="text" class="form-control form-control-sm total-input" /></td>
      <td><input type="text" class="form-control form-control-sm unit-input" disabled /></td>
      <td><button type="button" class="btn btn-sm btn-outline-light delete-row">×</button></td>
    `;

    const productCell = row.children[0];
    const select = document.createElement('select');
    select.className = 'form-select form-select-sm';
    select.innerHTML = '<option value="">--</option>';
    this.state.productos.forEach((producto) => {
      const value = this.getField(producto, ['codigo_producto', 'vcodigo_producto', 'codigo', 'id']);
      const name = this.getField(producto, ['nombre_producto', 'descripcion', 'vdescripcion', 'nombre']);
      const option = document.createElement('option');
      option.value = value || '';
      option.textContent = name ? `${value} - ${name}` : value;
      select.appendChild(option);
    });
    productCell.appendChild(select);

    row.querySelector('.delete-row').addEventListener('click', () => {
      row.remove();
      this.calculateSaldo();
    });

    row.querySelectorAll('input, select').forEach((input) => {
      input.addEventListener('input', () => this.updateUnitPrice(row));
      input.addEventListener('change', () => this.updateUnitPrice(row));
    });

    this.pedidoBody.appendChild(row);
  }

  updateUnitPrice(row) {
    const cantidad = this.parseNumber(row.querySelector('.cantidad-input').value);
    const total = this.parseNumber(row.querySelector('.total-input').value);
    const unitInput = row.querySelector('.unit-input');
    if (cantidad > 0 && total > 0) {
      unitInput.value = (total / cantidad).toFixed(4);
    } else {
      unitInput.value = '';
    }
    this.calculateSaldo();
  }

  collectPedidoItems() {
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    const items = [];
    let invalid = false;
    this.pedidoBody.querySelectorAll('tr').forEach((row) => {
      const producto = row.querySelector('select').value;
      const cantidadRaw = row.querySelector('.cantidad-input').value.trim();
      const totalRaw = row.querySelector('.total-input').value.trim();
      const hasData = producto || cantidadRaw || totalRaw;
      if (!producto || !decimalRegex.test(cantidadRaw) || !decimalRegex.test(totalRaw)) {
        if (hasData) {
          invalid = true;
        }
        return;
      }
      const cantidad = Number(cantidadRaw);
      const total = Number(totalRaw);
      const unit = cantidad > 0 ? total / cantidad : 0;
      items.push({ codigo_producto: producto, cantidad, precio_total: total, precio_unitario: unit });
    });
    this.state.pedidoItems = items;
    this.state.pedidoInvalid = invalid;
    return items;
  }

  buildFacturaGrid() {
    const pedidoItems = this.collectPedidoItems();
    this.facturaBody.innerHTML = '';
    this.state.facturaItems = pedidoItems.map((item) => ({
      codigo_producto: item.codigo_producto,
      cantidad_pedido: item.cantidad,
      cantidad_factura: item.cantidad,
      precio_unitario: item.precio_unitario,
      precio_total: item.precio_total
    }));

    if (this.state.facturaItems.length === 0) {
      this.facturaBody.innerHTML = `<tr><td colspan="4" class="text-muted">${this.dict.emptyRows}</td></tr>`;
      return;
    }

    this.state.facturaItems.forEach((item, index) => {
      const productoLabel = this.getProductoLabel(item.codigo_producto);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${productoLabel}</td>
        <td><input type="text" class="form-control form-control-sm factura-cantidad" value="${item.cantidad_factura}" /></td>
        <td><input type="text" class="form-control form-control-sm factura-total" value="${item.precio_total.toFixed(2)}" disabled /></td>
        <td><button type="button" class="btn btn-sm btn-outline-light delete-factura">×</button></td>
      `;
      row.querySelector('.factura-cantidad').addEventListener('input', (e) => this.updateFacturaRow(e, index));
      row.querySelector('.delete-factura').addEventListener('click', () => this.deleteFacturaRow(index));
      this.facturaBody.appendChild(row);
    });

    this.toggleFacturaDeleteButtons();
    this.calculateSaldo();
  }

  updateFacturaRow(event, index) {
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    const value = event.target.value.trim();
    if (!decimalRegex.test(value)) {
      return;
    }
    const cantidad = Number(value);
    const item = this.state.facturaItems[index];
    item.cantidad_factura = cantidad;
    item.precio_total = item.precio_unitario * cantidad;
    const row = this.facturaBody.children[index];
    const totalInput = row.querySelector('.factura-total');
    totalInput.value = item.precio_total.toFixed(2);
    this.calculateSaldo();
  }

  deleteFacturaRow(index) {
    if (this.state.facturaItems.length <= 1) {
      return;
    }
    this.state.facturaItems.splice(index, 1);
    this.buildFacturaGrid();
  }

  toggleFacturaDeleteButtons() {
    const canDelete = this.state.facturaItems.length > 1;
    this.facturaBody.querySelectorAll('.delete-factura').forEach((btn) => {
      btn.disabled = !canDelete;
    });
  }

  validateFacturaItems() {
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    const rows = Array.from(this.facturaBody.querySelectorAll('tr'));
    for (let i = 0; i < rows.length; i += 1) {
      const input = rows[i].querySelector('.factura-cantidad');
      const value = input ? input.value.trim() : '';
      if (!decimalRegex.test(value)) {
        this.showAlert('warning', this.dict.errors.cantidad);
        return false;
      }
      const cantidad = Number(value);
      const item = this.state.facturaItems[i];
      item.cantidad_factura = cantidad;
      item.precio_total = item.precio_unitario * cantidad;
      if (cantidad > item.cantidad_pedido) {
        this.showAlert('warning', this.dict.errors.facturaCantidad);
        return false;
      }
    }
    return true;
  }

  async handleClienteChange(e) {
    const cliente = e.target.value;
    if (!cliente) {
      return;
    }
    await Promise.all([this.loadPuntosEntrega(cliente), this.loadNumRecibe(cliente)]);
  }

  async loadPuntosEntrega(cliente) {
    try {
      const response = await fetch(`/api/puntos-entrega?cliente=${encodeURIComponent(cliente)}`);
      const data = await response.json();
      this.state.puntosEntrega = data || [];
      this.fillPuntosEntrega();
    } catch (error) {
      this.state.puntosEntrega = [];
      this.fillPuntosEntrega();
    }
  }

  fillPuntosEntrega() {
    const select = document.getElementById('puntoEntregaSelect');
    select.innerHTML = '<option value="">--</option>';
    this.state.puntosEntrega.forEach((item) => {
      const value = this.getField(item, ['codigo_puntoentrega', 'vcodigo_puntoentrega', 'codigo']);
      const label = this.getField(item, ['concatenarpuntoentrega', 'vconcatenarpuntoentrega', 'descripcion']);
      const option = document.createElement('option');
      option.value = value || '';
      option.textContent = label || value || '--';
      select.appendChild(option);
    });
    if (this.state.puntosEntrega.length === 0) {
      document.getElementById('entregaExiste').disabled = true;
      document.getElementById('entregaNuevo').checked = true;
    } else {
      document.getElementById('entregaExiste').disabled = false;
      document.getElementById('entregaExiste').checked = true;
    }
    this.toggleEntregaMode();
    this.updateRegionFromExisting();
  }

  async loadNumRecibe(cliente) {
    try {
      const response = await fetch(`/api/numrecibe?cliente=${encodeURIComponent(cliente)}`);
      const data = await response.json();
      this.state.numRecibe = data || [];
      this.fillNumRecibe();
    } catch (error) {
      this.state.numRecibe = [];
      this.fillNumRecibe();
    }
  }

  fillNumRecibe() {
    const select = document.getElementById('numRecibeSelect');
    select.innerHTML = '<option value="">--</option>';
    this.state.numRecibe.forEach((item) => {
      const value = this.getField(item, ['ordinal_numrecibe', 'vordinal_numrecibe', 'codigo']);
      const label = this.getField(item, ['concatenarnumrecibe', 'vconcatenarnumrecibe', 'descripcion']);
      const option = document.createElement('option');
      option.value = value || '';
      option.textContent = label || value || '--';
      select.appendChild(option);
    });
    if (this.state.numRecibe.length === 0) {
      document.getElementById('recibeExiste').disabled = true;
      document.getElementById('recibeNuevo').checked = true;
    } else {
      document.getElementById('recibeExiste').disabled = false;
      document.getElementById('recibeExiste').checked = true;
    }
    this.toggleRecibeMode();
  }

  toggleEntregaMode() {
    const mode = document.querySelector('input[name="entregaMode"]:checked').value;
    document.getElementById('entregaExistePanel').style.display = mode === 'existe' ? 'block' : 'none';
    document.getElementById('entregaNuevoPanel').style.display = mode === 'nuevo' ? 'block' : 'none';
    if (mode === 'existe') {
      this.updateRegionFromExisting();
    }
  }

  toggleRecibeMode() {
    const mode = document.querySelector('input[name="recibeMode"]:checked').value;
    document.getElementById('recibeExistePanel').style.display = mode === 'existe' ? 'block' : 'none';
    document.getElementById('recibeNuevoPanel').style.display = mode === 'nuevo' ? 'block' : 'none';
  }

  async loadUbigeoDepartamentos() {
    try {
      const response = await fetch('/api/ubigeo/departamentos');
      const data = await response.json();
      const depSelect = document.getElementById('depSelect');
      depSelect.innerHTML = '<option value="">--</option>';
      data.forEach((item) => {
        const value = this.getField(item, ['codigo_departamento', 'cod_dep', 'vCod_Dep', 'codigo']);
        const label = this.getField(item, ['descripcion', 'departamento', 'vdescripcion', 'nombre']);
        const option = document.createElement('option');
        option.value = value || '';
        option.textContent = label ? `${value} - ${label}` : value;
        depSelect.appendChild(option);
      });
    } catch (error) {
      return;
    }
  }

  async loadProvincias() {
    const dep = document.getElementById('depSelect').value;
    if (!dep) return;
    try {
      const response = await fetch(`/api/ubigeo/provincias?dep=${encodeURIComponent(dep)}`);
      const data = await response.json();
      const provSelect = document.getElementById('provSelect');
      provSelect.innerHTML = '<option value="">--</option>';
      data.forEach((item) => {
        const value = this.getField(item, ['codigo_provincia', 'cod_prov', 'vCod_Prov', 'codigo']);
        const label = this.getField(item, ['descripcion', 'provincia', 'nombre']);
        const option = document.createElement('option');
        option.value = value || '';
        option.textContent = label ? `${value} - ${label}` : value;
        provSelect.appendChild(option);
      });
    } catch (error) {
      return;
    }
  }

  async loadDistritos() {
    const dep = document.getElementById('depSelect').value;
    const prov = document.getElementById('provSelect').value;
    if (!dep || !prov) return;
    try {
      const response = await fetch(`/api/ubigeo/distritos?dep=${encodeURIComponent(dep)}&prov=${encodeURIComponent(prov)}`);
      const data = await response.json();
      const distSelect = document.getElementById('distSelect');
      distSelect.innerHTML = '<option value="">--</option>';
      data.forEach((item) => {
        const value = this.getField(item, ['codigo_distrito', 'cod_dist', 'vCod_Dist', 'codigo']);
        const label = this.getField(item, ['descripcion', 'distrito', 'nombre']);
        const option = document.createElement('option');
        option.value = value || '';
        option.textContent = label ? `${value} - ${label}` : value;
        distSelect.appendChild(option);
      });
      this.updateRegionEntrega();
    } catch (error) {
      return;
    }
  }

  updateRegionEntrega() {
    const dep = document.getElementById('depSelect').value;
    const prov = document.getElementById('provSelect').value;
    this.state.regionEntrega = dep === '15' && prov === '01' ? 'LIMA' : 'PROV';
    document.getElementById('limaFields').style.display = this.state.regionEntrega === 'LIMA' ? 'block' : 'none';
    document.getElementById('provFields').style.display = this.state.regionEntrega === 'PROV' ? 'block' : 'none';
    document.getElementById('regionEntregaChip').textContent = this.state.regionEntrega;
    this.refreshSteps();
  }

  updateRegionFromExisting() {
    if (document.querySelector("input[name=\"entregaMode\"]:checked").value !== "existe") {
      return;
    }
    const selected = document.getElementById("puntoEntregaSelect").value;
    const item = this.state.puntosEntrega.find((entry) =>
      String(this.getField(entry, ["codigo_puntoentrega", "vcodigo_puntoentrega", "codigo"])) === String(selected)
    );
    if (item && item.region_entrega) {
      this.state.regionEntrega = item.region_entrega;
      document.getElementById("limaFields").style.display = this.state.regionEntrega === "LIMA" ? "block" : "none";
      document.getElementById("provFields").style.display = this.state.regionEntrega === "PROV" ? "block" : "none";
      document.getElementById("regionEntregaChip").textContent = this.state.regionEntrega;
      this.refreshSteps();
    }
  }

  validateEntrega() {
    const mode = document.querySelector('input[name="entregaMode"]:checked').value;
    if (mode === 'existe') {
      return !!document.getElementById('puntoEntregaSelect').value;
    }
    const dep = document.getElementById('depSelect').value;
    const prov = document.getElementById('provSelect').value;
    const dist = document.getElementById('distSelect').value;
    if (!dep || !prov || !dist) return false;
    if (this.state.regionEntrega === 'LIMA') {
      return !!document.getElementById('direccionInput').value.trim();
    }
    const nombre = document.getElementById('nombreInput').value.trim();
    const dni = document.getElementById('dniInput').value.trim();
    const dniRegex = /^\d{8}$/;
    return nombre.length > 1 && dniRegex.test(dni);
  }

  validateRecibe() {
    const mode = document.querySelector('input[name="recibeMode"]:checked').value;
    if (mode === 'existe') {
      return !!document.getElementById('numRecibeSelect').value;
    }
    const numero = document.getElementById('numeroRecibeInput').value.trim();
    const nombre = document.getElementById('nombreRecibeInput').value.trim();
    return numero.length > 0 && nombre.length > 1;
  }

  calculateSaldo() {
    const saldo = this.state.facturaItems.reduce((sum, item) => sum + (item.precio_total || 0), 0);
    this.saldoBadge.textContent = this.formatMoney(saldo);
    document.getElementById('metricSaldo').textContent = this.formatMoney(saldo);
    return saldo;
  }

  formatMoney(value) {
    if (!value || Number.isNaN(value)) {
      return `${this.state.moneda} 0.00`;
    }
    return `${this.state.moneda} ${value.toFixed(2)}`;
  }

  parseNumber(value) {
    const num = Number(String(value || '').replace(',', '.'));
    return Number.isNaN(num) ? 0 : num;
  }

  renderSummary() {
    const clienteText = document.getElementById('clienteSelect').selectedOptions[0]?.textContent || '--';
    const fecha = document.getElementById('fechaPedido').value;
    const hora = document.getElementById('horaPedido').value;
    const base = document.getElementById('baseSelect').value;
    const resumenPedido = document.getElementById('resumenPedido');
    resumenPedido.innerHTML = `
      <h4>${this.dict.resumenPedido}</h4>
      <p>${clienteText}</p>
      <p>${fecha} ${hora}</p>
      <p>${this.state.pedidoItems.length} ${this.dict.items}</p>
    `;

    const resumenFactura = document.getElementById('resumenFactura');
    resumenFactura.innerHTML = `
      <h4>${this.dict.resumenFactura}</h4>
      <p>${this.state.numeroDocumento || '--'}</p>
      <p>${base || '--'}</p>
      <p>${this.formatMoney(this.calculateSaldo())}</p>
    `;

    const entregaMode = document.querySelector('input[name="entregaMode"]:checked').value;
    const entregaStatus = entregaMode === 'existe' ? this.dict.existente : this.dict.nuevoRegistro;
    const resumenEntrega = document.getElementById('resumenEntrega');
    resumenEntrega.innerHTML = `
      <h4>${this.dict.resumenEntrega}</h4>
      <p>${entregaStatus}</p>
      <p>${this.state.regionEntrega === 'LIMA' ? this.dict.regionLima : this.dict.regionProv}</p>
    `;

    const recibeMode = document.querySelector('input[name="recibeMode"]:checked').value;
    const recibeStatus = recibeMode === 'existe' ? this.dict.existente : this.dict.nuevoRegistro;
    const resumenRecibe = document.getElementById('resumenRecibe');
    resumenRecibe.innerHTML = `
      <h4>${this.dict.resumenRecibe}</h4>
      <p>${this.state.regionEntrega === 'LIMA' ? recibeStatus : '--'}</p>
      <p>${this.state.regionEntrega === 'LIMA' ? this.dict.regionLima : '--'}</p>
    `;
  }

  async handleEmitir() {
    if (this.steps[this.currentStep].id !== 'step-resumen') {
      this.goToStep(this.steps.length - 1);
      this.renderSummary();
    }
    if (!document.getElementById('confirmEmit').checked) {
      this.showAlert('warning', this.dict.errors.confirm);
      return;
    }
    const payload = this.buildPayload();
    try {
      this.setLoading(this.dict.loading);
      const response = await fetch('/api/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error');
      }
      this.showAlert('success', data.message || 'OK');
    } catch (error) {
      this.showAlert('danger', this.dict.errors.api);
    } finally {
      this.setLoading('');
    }
  }

  buildPayload() {
    const cliente = document.getElementById('clienteSelect').value;
    const fecha = document.getElementById('fechaPedido').value;
    const hora = document.getElementById('horaPedido').value;
    const fechaP = `${fecha} ${hora}:00`;

    const pedidoItems = this.collectPedidoItems();
    const facturaItems = this.state.facturaItems.map((item) => ({
      codigo_producto: item.codigo_producto,
      cantidad: item.cantidad_factura,
      precio_total: Number(item.precio_total.toFixed(2)),
      cantidad_pedido: item.cantidad_pedido
    }));

    const entregaMode = document.querySelector('input[name="entregaMode"]:checked').value;
    const recibeMode = document.querySelector('input[name="recibeMode"]:checked').value;

    const entrega = {
      modo: entregaMode,
      codigo_puntoentrega: document.getElementById('puntoEntregaSelect').value || null,
      dep: document.getElementById('depSelect').value,
      prov: document.getElementById('provSelect').value,
      dist: document.getElementById('distSelect').value,
      direccion_linea: document.getElementById('direccionInput').value.trim(),
      referencia: document.getElementById('referenciaInput').value.trim(),
      nombre: document.getElementById('nombreInput').value.trim(),
      dni: document.getElementById('dniInput').value.trim(),
      agencia: document.getElementById('agenciaInput').value.trim(),
      observaciones: document.getElementById('observacionesInput').value.trim(),
      region: this.state.regionEntrega
    };

    const recibe = {
      modo: recibeMode,
      ordinal_numrecibe: document.getElementById('numRecibeSelect').value || null,
      numero: document.getElementById('numeroRecibeInput').value.trim(),
      nombre: document.getElementById('nombreRecibeInput').value.trim()
    };

    return {
      codigo_pedido: this.state.codigoPedido,
      cliente,
      fecha,
      hora,
      fechaP,
      pedidoItems,
      facturaItems,
      factura: {
        tipo_documento: 'FAC',
        numero_documento: this.state.numeroDocumento,
        codigo_base: document.getElementById('baseSelect').value
      },
      entrega,
      recibe
    };
  }
}

new FormWizard();
