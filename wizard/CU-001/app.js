class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.currentStep = 0;
    this.alertContainer = document.getElementById('alertContainer');
    this.progressBar = document.getElementById('progressBar');
    this.stepIndicator = document.getElementById('stepIndicator');
    this.stepName = document.getElementById('stepName');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.confirmBtn = document.getElementById('confirmBtn');
    this.emitirBtn = document.getElementById('emitirBtn');
    this.confirmEmitBtn = document.getElementById('confirmEmit');
    this.overlay = document.getElementById('overlay');
    this.confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

    this.locale = (navigator.language || 'es').toLowerCase();
    this.dict = this.locale.startsWith('es') ? this.getDictEs() : this.getDictEn();
    document.documentElement.lang = this.locale;

    this.state = {
      clientes: [],
      productos: [],
      bases: [],
      puntosEntrega: [],
      numrecibe: [],
      pedidoDetalles: [],
      facturaDetalles: [],
      regionEntrega: 'PROV',
      systemTime: null,
    };
  }

  init() {
    this.applyI18n();
    this.bindEvents();
    this.loadInitialData();
  }

  getDictEs() {
    return {
      wizard_label: 'Wizard',
      step_label: 'Paso',
      title: 'Pedidos y Facturacion',
      subtitle: 'Flujo guiado para pedidos, facturacion y entrega en un entorno IaaS/PaaS global.',
      progress_title: 'Progreso del flujo',
      progress_hint: 'Completa los pasos para emitir la factura.',
      step1_title: 'Crear Pedido',
      step1_badge: 'Datos base',
      step2_title: 'Crear Factura',
      step2_badge: 'Detalle de facturacion',
      step3_title: 'Datos Entrega',
      step3_badge: 'Ubicacion',
      step4_title: 'Datos Recibe',
      step4_badge: 'Solo Lima',
      step5_title: 'Resumen y Emitir Factura',
      step5_badge: 'Confirmacion',
      fecha_pedido: 'Fecha Pedido',
      hora_pedido: 'Hora Pedido',
      cliente: 'Cliente',
      productos_pedido: 'Productos del Pedido',
      add_row: 'Agregar linea',
      producto: 'Producto',
      cantidad: 'Cantidad',
      precio_total: 'Precio Total',
      acciones: 'Acciones',
      remove: 'Eliminar',
      fecha_emision: 'Fecha Emision',
      hora_emision: 'Hora Emision',
      base: 'Base',
      tipo_documento: 'Tipo Documento',
      punto_entrega: 'Punto de entrega',
      existente: 'Existe',
      nuevo: 'Nuevo',
      seleccionar_punto: 'Seleccionar punto',
      departamento: 'Departamento',
      provincia: 'Provincia',
      distrito: 'Distrito',
      direccion: 'Direccion',
      referencia: 'Referencia',
      region_entrega: 'Region',
      nombre: 'Nombre',
      dni: 'DNI',
      agencia: 'Agencia',
      observaciones: 'Observaciones',
      numrecibe: 'Numrecibe',
      seleccionar_numrecibe: 'Seleccionar numrecibe',
      numero: 'Numero',
      confirmar: 'Confirmar Operacion',
      emitir: 'Emitir Factura',
      anterior: 'Anterior',
      siguiente: 'Siguiente',
      confirm_title: 'Confirmar Operacion',
      confirm_body: 'Confirma la emision de la factura con los datos actuales.',
      cancelar: 'Cancelar',
      required: 'Completa los campos requeridos.',
      invalid_qty: 'La cantidad de factura no puede superar la cantidad de pedido.',
      loading: 'Cargando datos...',
      pedido: 'Pedido',
      factura: 'Factura',
      entrega: 'Entrega',
      recibe: 'Recibe',
      exists_label: 'Existente',
      new_label: 'Nuevo',
      total_label: 'Total',
    };
  }

  getDictEn() {
    return {
      wizard_label: 'Wizard',
      step_label: 'Step',
      title: 'Orders & Billing',
      subtitle: 'Guided flow for orders, billing, and delivery in a global IaaS/PaaS stack.',
      progress_title: 'Flow progress',
      progress_hint: 'Complete each step to issue the invoice.',
      step1_title: 'Create Order',
      step1_badge: 'Base data',
      step2_title: 'Create Invoice',
      step2_badge: 'Billing detail',
      step3_title: 'Delivery Data',
      step3_badge: 'Location',
      step4_title: 'Receiver Data',
      step4_badge: 'Lima only',
      step5_title: 'Summary & Issue Invoice',
      step5_badge: 'Confirmation',
      fecha_pedido: 'Order Date',
      hora_pedido: 'Order Time',
      cliente: 'Client',
      productos_pedido: 'Order Items',
      add_row: 'Add line',
      producto: 'Product',
      cantidad: 'Quantity',
      precio_total: 'Total Price',
      acciones: 'Actions',
      remove: 'Remove',
      fecha_emision: 'Issue Date',
      hora_emision: 'Issue Time',
      base: 'Base',
      tipo_documento: 'Doc Type',
      punto_entrega: 'Delivery point',
      existente: 'Existing',
      nuevo: 'New',
      seleccionar_punto: 'Select point',
      departamento: 'Department',
      provincia: 'Province',
      distrito: 'District',
      direccion: 'Address',
      referencia: 'Reference',
      region_entrega: 'Region',
      nombre: 'Name',
      dni: 'ID',
      agencia: 'Agency',
      observaciones: 'Notes',
      numrecibe: 'Receiver',
      seleccionar_numrecibe: 'Select receiver',
      numero: 'Number',
      confirmar: 'Confirm',
      emitir: 'Issue Invoice',
      anterior: 'Back',
      siguiente: 'Next',
      confirm_title: 'Confirm Operation',
      confirm_body: 'Confirm issuing the invoice with current data.',
      cancelar: 'Cancel',
      required: 'Complete the required fields.',
      invalid_qty: 'Invoice quantity cannot exceed order quantity.',
      loading: 'Loading data...',
      pedido: 'Order',
      factura: 'Invoice',
      entrega: 'Delivery',
      recibe: 'Receiver',
      exists_label: 'Existing',
      new_label: 'New',
      total_label: 'Total',
    };
  }

  t(key) {
    return this.dict[key] || key;
  }

  applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = this.t(key);
    });
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.goPrev());
    this.nextBtn.addEventListener('click', () => this.goNext());
    this.confirmBtn.addEventListener('click', () => this.confirmModal.show());
    this.confirmEmitBtn.addEventListener('click', () => {
      this.confirmModal.hide();
      this.emitFactura();
    });
    this.emitirBtn.addEventListener('click', () => this.confirmModal.show());

    document.getElementById('addPedidoRow').addEventListener('click', () => this.addPedidoRow());
    document.getElementById('clienteSelect').addEventListener('change', () => this.onClienteChange());
    document.getElementById('puntoEntregaSelect').addEventListener('change', () => this.onPuntoEntregaChange());

    document.getElementsByName('entregaMode').forEach((el) =>
      el.addEventListener('change', () => this.toggleEntregaMode())
    );
    document.getElementsByName('recibeMode').forEach((el) =>
      el.addEventListener('change', () => this.toggleRecibeMode())
    );
    document.getElementById('numrecibeSelect').addEventListener('change', () => this.updateRecibePreview());

    document.getElementById('depSelect').addEventListener('change', () => this.onDepChange());
    document.getElementById('provSelect').addEventListener('change', () => this.onProvChange());
    document.getElementById('distSelect').addEventListener('change', () => this.updateRegionEntrega());

    ['direccionLinea', 'referencia', 'destNombre', 'destDni', 'destAgencia', 'destObservaciones'].forEach((id) => {
      document.getElementById(id).addEventListener('input', () => this.updateEntregaPreview());
    });

    ['recibeNumero', 'recibeNombre'].forEach((id) => {
      document.getElementById(id).addEventListener('input', () => this.updateRecibePreview());
    });
  }

  async loadInitialData() {
    this.setLoading(true, this.t('loading'));
    try {
      const [time, clientes, productos, bases] = await Promise.all([
        this.fetchJson('/api/system-time'),
        this.fetchJson('/api/clientes'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/bases'),
      ]);

      this.state.systemTime = time;
      this.state.clientes = clientes;
      this.state.productos = productos;
      this.state.bases = bases;

      this.fillClientes();
      this.fillBases();
      this.setSystemTime();
      this.syncFechaHora();
      this.addPedidoRow();
      this.updateNav();
    } catch (error) {
      this.showAlert('danger', error.message || 'Error al cargar datos.');
    } finally {
      this.setLoading(false);
    }
  }

  async onClienteChange() {
    const cliente = document.getElementById('clienteSelect').value;
    if (!cliente) return;
    this.setLoading(true);
    try {
      const [puntos, numrecibe] = await Promise.all([
        this.fetchJson(`/api/puntos-entrega?cliente=${encodeURIComponent(cliente)}`),
        this.fetchJson(`/api/numrecibe?cliente=${encodeURIComponent(cliente)}`),
      ]);
      this.state.puntosEntrega = puntos;
      this.state.numrecibe = numrecibe;
      this.fillPuntosEntrega();
      this.fillNumrecibe();
      this.toggleEntregaMode();
      this.toggleRecibeMode();
    } catch (error) {
      this.showAlert('danger', error.message || 'Error al cargar datos del cliente.');
    } finally {
      this.setLoading(false);
    }
  }

  setSystemTime() {
    if (!this.state.systemTime) return;
    const { date, time } = this.state.systemTime;
    document.getElementById('systemTime').textContent = `${date} ${time}`;
  }

  syncFechaHora() {
    if (!this.state.systemTime) return;
    const { date, time } = this.state.systemTime;
    document.getElementById('fechaPedido').value = date;
    document.getElementById('horaPedido').value = time;
    document.getElementById('fechaEmision').value = date;
    document.getElementById('horaEmision').value = time;
  }

  fillClientes() {
    const select = document.getElementById('clienteSelect');
    select.innerHTML = '<option value="">--</option>';
    this.state.clientes.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.codigo_cliente || item.codigo || item.id || item.codigo_cliente_puntoentrega || '';
      opt.textContent = item.nombre || item.razon_social || item.descripcion || item.cliente || opt.value;
      select.appendChild(opt);
    });
  }

  fillBases() {
    const select = document.getElementById('baseSelect');
    select.innerHTML = '<option value="">--</option>';
    this.state.bases.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.codigo_base || item.codigo || item.id || '';
      opt.textContent = item.nombre || item.descripcion || opt.value;
      select.appendChild(opt);
    });
  }

  fillPuntosEntrega() {
    const wrap = document.getElementById('entregaExistenteWrap');
    const select = document.getElementById('puntoEntregaSelect');
    select.innerHTML = '';
    if (!this.state.puntosEntrega.length) {
      wrap.classList.add('d-none');
      document.getElementById('entregaExiste').disabled = true;
      document.getElementById('entregaNuevo').checked = true;
    } else {
      wrap.classList.remove('d-none');
      document.getElementById('entregaExiste').disabled = false;
      document.getElementById('entregaExiste').checked = true;
      this.state.puntosEntrega.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.codigo_puntoentrega || item.codigo || item.id || '';
        opt.textContent = item.concatenarpuntoentrega || item.descripcion || opt.value;
        opt.dataset.region = item.region_entrega || item.region || '';
        select.appendChild(opt);
      });
    }
    this.toggleEntregaMode();
    this.onPuntoEntregaChange();
  }

  fillNumrecibe() {
    const wrap = document.getElementById('recibeExistenteWrap');
    const select = document.getElementById('numrecibeSelect');
    select.innerHTML = '';
    if (!this.state.numrecibe.length) {
      wrap.classList.add('d-none');
      document.getElementById('recibeExiste').disabled = true;
      document.getElementById('recibeNuevo').checked = true;
    } else {
      wrap.classList.remove('d-none');
      document.getElementById('recibeExiste').disabled = false;
      document.getElementById('recibeExiste').checked = true;
      this.state.numrecibe.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.codigo_cliente_numrecibe || item.codigo || item.id || '';
        opt.textContent = item.concatenarnumrecibe || item.descripcion || opt.value;
        select.appendChild(opt);
      });
    }
    this.toggleRecibeMode();
  }

  toggleEntregaMode() {
    const isNuevo = document.getElementById('entregaNuevo').checked;
    document.getElementById('entregaNuevoWrap').classList.toggle('d-none', !isNuevo);
    document.getElementById('entregaExistenteWrap').classList.toggle('d-none', isNuevo);
    if (isNuevo) {
      this.loadUbigeoDepartamentos();
    } else {
      this.onPuntoEntregaChange();
    }
    this.updateEntregaPreview();
  }

  onPuntoEntregaChange() {
    const select = document.getElementById('puntoEntregaSelect');
    const region = select.selectedOptions[0]?.dataset.region || '';
    if (region) {
      this.state.regionEntrega = region;
    }
    this.updateEntregaPreview();
  }

  toggleRecibeMode() {
    const isNuevo = document.getElementById('recibeNuevo').checked;
    document.getElementById('recibeNuevoWrap').classList.toggle('d-none', !isNuevo);
    document.getElementById('recibeExistenteWrap').classList.toggle('d-none', isNuevo);
    this.updateRecibePreview();
  }

  async loadUbigeoDepartamentos() {
    if (this.state.departamentosLoaded) return;
    const depSelect = document.getElementById('depSelect');
    depSelect.innerHTML = '<option value="">--</option>';
    const data = await this.fetchJson('/api/ubigeo/departamentos');
    data.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.codigo || item.cod_dep || item.cod_departamento || item.cod || '';
      opt.textContent = item.nombre || item.departamento || opt.value;
      depSelect.appendChild(opt);
    });
    this.state.departamentosLoaded = true;
  }

  async onDepChange() {
    const dep = document.getElementById('depSelect').value;
    const provSelect = document.getElementById('provSelect');
    const distSelect = document.getElementById('distSelect');
    provSelect.innerHTML = '<option value="">--</option>';
    distSelect.innerHTML = '<option value="">--</option>';
    if (!dep) return;
    const data = await this.fetchJson(`/api/ubigeo/provincias?dep=${encodeURIComponent(dep)}`);
    data.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.codigo || item.cod_prov || item.cod || '';
      opt.textContent = item.nombre || item.provincia || opt.value;
      provSelect.appendChild(opt);
    });
    this.updateRegionEntrega();
  }

  async onProvChange() {
    const dep = document.getElementById('depSelect').value;
    const prov = document.getElementById('provSelect').value;
    const distSelect = document.getElementById('distSelect');
    distSelect.innerHTML = '<option value="">--</option>';
    if (!dep || !prov) return;
    const data = await this.fetchJson(
      `/api/ubigeo/distritos?dep=${encodeURIComponent(dep)}&prov=${encodeURIComponent(prov)}`
    );
    data.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.codigo || item.cod_dist || item.cod || '';
      opt.textContent = item.nombre || item.distrito || opt.value;
      distSelect.appendChild(opt);
    });
    this.updateRegionEntrega();
  }

  updateRegionEntrega() {
    const dep = document.getElementById('depSelect').value;
    const prov = document.getElementById('provSelect').value;
    const region = dep === '15' && prov === '01' ? 'LIMA' : 'PROV';
    this.state.regionEntrega = region;
    document.getElementById('regionEntrega').value = region;
    document.getElementById('entregaLimaFields').classList.toggle('d-none', region !== 'LIMA');
    document.getElementById('entregaProvFields').classList.toggle('d-none', region === 'LIMA');
    this.updateEntregaPreview();
  }

  addPedidoRow() {
    const tableBody = document.querySelector('#pedidoTable tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <select class="form-select producto-select"></select>
      </td>
      <td>
        <input type="number" min="1" step="1" class="form-control cantidad-input" value="1" />
      </td>
      <td>
        <input type="number" min="0" step="0.01" class="form-control precio-input" value="0" />
      </td>
      <td>
        <div class="grid-actions">
          <button type="button" class="btn btn-outline-warning btn-sm remove-row">${this.t('remove')}</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
    this.fillProductos(row.querySelector('.producto-select'));

    row.querySelector('.remove-row').addEventListener('click', () => {
      row.remove();
      this.refreshPedidoState();
    });
    row.querySelectorAll('input, select').forEach((el) =>
      el.addEventListener('input', () => this.refreshPedidoState())
    );
    this.refreshPedidoState();
  }

  fillProductos(select) {
    select.innerHTML = '<option value="">--</option>';
    this.state.productos.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.codigo_producto || item.codigo || item.id || '';
      opt.textContent = item.descripcion || item.nombre || opt.value;
      opt.dataset.precio = item.precio_unitario || item.precio || 0;
      select.appendChild(opt);
    });
  }

  refreshPedidoState() {
    const rows = Array.from(document.querySelectorAll('#pedidoTable tbody tr'));
    this.state.pedidoDetalles = rows.map((row, index) => {
      const productoSelect = row.querySelector('.producto-select');
      const cantidad = Number(row.querySelector('.cantidad-input').value) || 0;
      const precioTotal = Number(row.querySelector('.precio-input').value) || 0;
      const codigo = productoSelect.value;
      const label = productoSelect.options[productoSelect.selectedIndex]?.textContent || '';
      const precioUnitario = cantidad ? precioTotal / cantidad : 0;
      return {
        source_index: index,
        codigo_producto: codigo,
        producto_label: label,
        cantidad,
        precio_total: precioTotal,
        precio_unitario: precioUnitario,
      };
    });
    if (this.currentStep >= 1) {
      this.buildFacturaFromPedido();
    }
  }

  buildFacturaFromPedido() {
    this.state.facturaDetalles = this.state.pedidoDetalles.map((item) => ({
      ...item,
      source_index: item.source_index,
      cantidad_factura: item.cantidad,
      precio_total_factura: item.precio_total,
    }));
    this.renderFacturaTable();
  }

  renderFacturaTable() {
    const tbody = document.querySelector('#facturaTable tbody');
    tbody.innerHTML = '';
    this.state.facturaDetalles.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <input type="text" class="form-control" value="${item.producto_label}" readonly />
        </td>
        <td>
          <input type="number" min="1" step="1" class="form-control factura-cantidad" value="${item.cantidad_factura}" data-index="${index}" />
        </td>
        <td>
          <input type="text" class="form-control factura-total" value="${this.formatMoney(item.precio_total_factura)}" readonly />
        </td>
        <td>
          <button type="button" class="btn btn-outline-warning btn-sm factura-remove" data-index="${index}">${this.t(
            'remove'
          )}</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    tbody.querySelectorAll('.factura-cantidad').forEach((input) => {
      input.addEventListener('input', (event) => this.onFacturaCantidadChange(event));
    });
    tbody.querySelectorAll('.factura-remove').forEach((btn) => {
      btn.addEventListener('click', (event) => this.removeFacturaRow(event));
    });

    this.updateFacturaTotal();
    this.updateFacturaRemoveState();
  }

  onFacturaCantidadChange(event) {
    const index = Number(event.target.dataset.index);
    const newQty = Number(event.target.value) || 0;
    const pedido = this.state.pedidoDetalles.find(
      (item) => item.source_index === this.state.facturaDetalles[index].source_index
    );
    if (!pedido) return;
    const maxQty = pedido.cantidad || 0;
    this.state.facturaDetalles[index].cantidad_factura = newQty;
    const precioUnitario = pedido.precio_unitario || 0;
    this.state.facturaDetalles[index].precio_total_factura = precioUnitario * newQty;

    const row = event.target.closest('tr');
    row.querySelector('.factura-total').value = this.formatMoney(
      this.state.facturaDetalles[index].precio_total_factura
    );

    if (newQty > maxQty) {
      this.showAlert('warning', this.t('invalid_qty'));
    }
    this.updateFacturaTotal();
  }

  removeFacturaRow(event) {
    if (this.state.facturaDetalles.length <= 1) return;
    const index = Number(event.target.dataset.index);
    this.state.facturaDetalles.splice(index, 1);
    this.renderFacturaTable();
  }

  updateFacturaTotal() {
    const total = this.state.facturaDetalles.reduce(
      (sum, item) => sum + (Number(item.precio_total_factura) || 0),
      0
    );
    document.getElementById('facturaTotal').textContent = `${this.t('total_label')}: ${this.formatMoney(total)}`;
  }

  updateFacturaRemoveState() {
    const buttons = document.querySelectorAll('.factura-remove');
    buttons.forEach((btn) => {
      btn.disabled = this.state.facturaDetalles.length <= 1;
    });
  }

  goPrev() {
    if (this.currentStep === 0) return;
    if (this.currentStep === 4 && this.state.regionEntrega !== 'LIMA') {
      this.currentStep = 2;
    } else {
      this.currentStep -= 1;
    }
    this.showStep();
  }

  goNext() {
    if (!this.validateStep(this.currentStep)) return;
    if (this.currentStep === 1) {
      this.buildFacturaFromPedido();
    }
    if (this.currentStep === 2 && this.state.regionEntrega !== 'LIMA') {
      this.currentStep = 4;
    } else {
      this.currentStep += 1;
    }
    this.showStep();
  }

  validateStep(stepIndex) {
    if (stepIndex === 0) return this.validateStep1();
    if (stepIndex === 1) return this.validateStep2();
    if (stepIndex === 2) return this.validateStep3();
    if (stepIndex === 3) return this.validateStep4();
    return true;
  }

  validateStep1() {
    const cliente = document.getElementById('clienteSelect').value;
    if (!cliente) {
      this.showAlert('warning', this.t('required'));
      return false;
    }
    if (!this.state.pedidoDetalles.length || this.state.pedidoDetalles.some((item) => !item.codigo_producto)) {
      this.showAlert('warning', this.t('required'));
      return false;
    }
    const invalidQty = this.state.pedidoDetalles.some(
      (item) => !this.validateInteger(String(item.cantidad)) || !this.validateNumber(String(item.precio_total))
    );
    if (invalidQty) {
      this.showAlert('warning', this.t('required'));
      return false;
    }
    return true;
  }

  validateStep2() {
    const base = document.getElementById('baseSelect').value;
    if (!base) {
      this.showAlert('warning', this.t('required'));
      return false;
    }
    const invalid = this.state.facturaDetalles.some((item) => {
      const pedido = this.state.pedidoDetalles.find((row) => row.source_index === item.source_index);
      return item.cantidad_factura > (pedido ? pedido.cantidad : 0);
    });
    if (invalid) {
      this.showAlert('warning', this.t('invalid_qty'));
      return false;
    }
    return true;
  }

  validateStep3() {
    const modeNuevo = document.getElementById('entregaNuevo').checked;
    if (!modeNuevo) return true;
    const dep = document.getElementById('depSelect').value;
    const prov = document.getElementById('provSelect').value;
    const dist = document.getElementById('distSelect').value;
    if (!dep || !prov || !dist) {
      this.showAlert('warning', this.t('required'));
      return false;
    }
    if (this.state.regionEntrega === 'LIMA') {
      const direccion = document.getElementById('direccionLinea').value.trim();
      if (!direccion) {
        this.showAlert('warning', this.t('required'));
        return false;
      }
    } else {
      const nombre = document.getElementById('destNombre').value.trim();
      const dni = document.getElementById('destDni').value.trim();
      if (!nombre || !this.validateDni(dni)) {
        this.showAlert('warning', this.t('required'));
        return false;
      }
    }
    return true;
  }

  validateStep4() {
    if (this.state.regionEntrega !== 'LIMA') return true;
    const modeNuevo = document.getElementById('recibeNuevo').checked;
    if (!modeNuevo) return true;
    const numero = document.getElementById('recibeNumero').value.trim();
    const nombre = document.getElementById('recibeNombre').value.trim();
    if (!numero || !nombre) {
      this.showAlert('warning', this.t('required'));
      return false;
    }
    return true;
  }

  showStep() {
    this.steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.currentStep);
    });
    this.updateNav();
    if (this.currentStep === 4) {
      this.buildSummary();
    }
  }

  updateNav() {
    const totalSteps = 5;
    const current = this.currentStep + 1;
    this.stepIndicator.textContent = `${current}/${totalSteps}`;
    this.progressBar.style.width = `${(current / totalSteps) * 100}%`;
    this.stepName.textContent = `${this.t('step_label')} ${current}`;
    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.classList.toggle('d-none', this.currentStep === 4);
  }

  updateEntregaPreview() {
    const preview = document.getElementById('entregaPreview');
    const modeNuevo = document.getElementById('entregaNuevo').checked;
    if (!modeNuevo) {
      const select = document.getElementById('puntoEntregaSelect');
      preview.textContent = select.options[select.selectedIndex]?.textContent || '';
      return;
    }
    const region = this.state.regionEntrega;
    const distLabel = document.getElementById('distSelect').selectedOptions[0]?.textContent || '';
    if (region === 'LIMA') {
      const direccion = document.getElementById('direccionLinea').value.trim();
      const referencia = document.getElementById('referencia').value.trim();
      const parts = [direccion, distLabel];
      if (referencia) parts.push(referencia);
      preview.textContent = parts.filter(Boolean).join(' | ');
    } else {
      const nombre = document.getElementById('destNombre').value.trim();
      const dni = document.getElementById('destDni').value.trim();
      const agencia = document.getElementById('destAgencia').value.trim();
      const obs = document.getElementById('destObservaciones').value.trim();
      preview.textContent = [nombre, dni, agencia, obs].filter(Boolean).join(' | ');
    }
  }

  updateRecibePreview() {
    const preview = document.getElementById('recibePreview');
    const modeNuevo = document.getElementById('recibeNuevo').checked;
    if (!modeNuevo) {
      const select = document.getElementById('numrecibeSelect');
      preview.textContent = select.options[select.selectedIndex]?.textContent || '';
      return;
    }
    const numero = document.getElementById('recibeNumero').value.trim();
    const nombre = document.getElementById('recibeNombre').value.trim();
    preview.textContent = [numero, nombre].filter(Boolean).join(' | ');
  }

  buildSummary() {
    const clienteSelect = document.getElementById('clienteSelect');
    const clienteLabel = clienteSelect.options[clienteSelect.selectedIndex]?.textContent || '';
    const totalFactura = this.state.facturaDetalles.reduce(
      (sum, item) => sum + (Number(item.precio_total_factura) || 0),
      0
    );

    document.getElementById('summaryPedido').innerHTML = `
      <h5>${this.t('pedido')}</h5>
      <div class="inline-meta">${this.t('cliente')}: ${clienteLabel}</div>
      <div class="inline-meta">${this.state.pedidoDetalles.length} items</div>
    `;

    document.getElementById('summaryFactura').innerHTML = `
      <h5>${this.t('factura')}</h5>
      <div class="inline-meta">${this.t('base')}: ${document.getElementById('baseSelect').value}</div>
      <div class="inline-meta">${this.t('total_label')}: ${this.formatMoney(totalFactura)}</div>
    `;

    const entregaMode = document.getElementById('entregaNuevo').checked ? this.t('new_label') : this.t('exists_label');
    document.getElementById('summaryEntrega').innerHTML = `
      <h5>${this.t('entrega')}</h5>
      <div class="inline-meta">${entregaMode}</div>
      <div class="inline-meta">${document.getElementById('entregaPreview').textContent}</div>
    `;

    const recibeMode =
      this.state.regionEntrega !== 'LIMA'
        ? '-'
        : document.getElementById('recibeNuevo').checked
          ? this.t('new_label')
          : this.t('exists_label');
    const recibeText =
      this.state.regionEntrega !== 'LIMA'
        ? this.t('step4_badge')
        : document.getElementById('recibePreview').textContent || '-';
    document.getElementById('summaryRecibe').innerHTML = `
      <h5>${this.t('recibe')}</h5>
      <div class="inline-meta">${recibeMode}</div>
      <div class="inline-meta">${recibeText}</div>
    `;
  }

  async emitFactura() {
    if (!this.validateStep(4)) return;
    this.setLoading(true);
    try {
      const payload = this.buildPayload();
      const result = await this.fetchJson('/api/emitir-factura', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.showAlert('success', `OK: ${result.numero_documento || ''}`);
    } catch (error) {
      this.showAlert('danger', error.message || 'Error al emitir factura.');
    } finally {
      this.setLoading(false);
    }
  }

  buildPayload() {
    const cliente = document.getElementById('clienteSelect').value;
    const pedidoFecha = document.getElementById('fechaPedido').value;
    const pedidoHora = document.getElementById('horaPedido').value;
    const fechaP = `${pedidoFecha} ${pedidoHora}:00`;

    const entregaMode = document.getElementById('entregaNuevo').checked ? 'nuevo' : 'existe';
    const recibeMode = document.getElementById('recibeNuevo').checked ? 'nuevo' : 'existe';

    const entrega = {
      mode: entregaMode,
      codigo_puntoentrega: document.getElementById('puntoEntregaSelect').value || null,
      dep: document.getElementById('depSelect').value,
      prov: document.getElementById('provSelect').value,
      dist: document.getElementById('distSelect').value,
      dist_label: document.getElementById('distSelect').selectedOptions[0]?.textContent || '',
      direccion_linea: document.getElementById('direccionLinea').value.trim(),
      referencia: document.getElementById('referencia').value.trim(),
      nombre: document.getElementById('destNombre').value.trim(),
      dni: document.getElementById('destDni').value.trim(),
      agencia: document.getElementById('destAgencia').value.trim(),
      observaciones: document.getElementById('destObservaciones').value.trim(),
      region_entrega: this.state.regionEntrega,
    };

    const recibe = {
      mode: recibeMode,
      codigo_cliente_numrecibe: document.getElementById('numrecibeSelect').value || null,
      numero: document.getElementById('recibeNumero').value.trim(),
      nombre: document.getElementById('recibeNombre').value.trim(),
    };

    return {
      pedido: {
        codigo_cliente: cliente,
        fecha: fechaP,
      },
      pedido_detalles: this.state.pedidoDetalles,
      factura: {
        codigo_base: document.getElementById('baseSelect').value,
        tipo_documento: 'FAC',
        saldo: this.state.facturaDetalles.reduce(
          (sum, item) => sum + (Number(item.precio_total_factura) || 0),
          0
        ),
      },
      factura_detalles: this.state.facturaDetalles,
      entrega,
      recibe,
    };
  }

  validateDni(value) {
    return /^\d{8}$/.test(value);
  }

  validateInteger(value) {
    return /^\d+$/.test(value) && Number(value) > 0;
  }

  validateNumber(value) {
    return /^\d+(\.\d{1,2})?$/.test(value);
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      const msg = await response.text();
      throw new Error(msg || 'Request failed');
    }
    return response.json();
  }

  showAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    this.alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
  }

  setLoading(show, message = '') {
    this.overlay.classList.toggle('show', show);
    if (show && message) {
      this.overlay.setAttribute('aria-label', message);
    }
  }

  formatMoney(value) {
    return new Intl.NumberFormat(this.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      value || 0
    );
  }
}

const wizard = new FormWizard();
wizard.init();
