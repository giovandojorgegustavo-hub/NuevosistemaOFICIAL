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
    this.emitirBtn = document.getElementById('emitirBtn');
    this.confirmOperacion = document.getElementById('confirmOperacion');
    this.fechaPedidoInput = document.getElementById('fechaPedido');
    this.horaPedidoInput = document.getElementById('horaPedido');
    this.clienteSelect = document.getElementById('clienteSelect');
    this.fechaEmisionInput = document.getElementById('fechaEmision');
    this.codigoBaseSelect = document.getElementById('codigoBase');
    this.facturaTotalLabel = document.getElementById('facturaTotalLabel');
    this.pedidoTableBody = document.querySelector('#pedidoTable tbody');
    this.facturaTableBody = document.querySelector('#facturaTable tbody');
    this.addPedidoRowBtn = document.getElementById('addPedidoRow');
    this.addFacturaRowBtn = document.getElementById('addFacturaRow');
    this.puntoEntregaSelect = document.getElementById('puntoEntregaSelect');
    this.modoEntregaSelect = document.getElementById('modoEntrega');
    this.regionEntregaSelect = document.getElementById('regionEntrega');
    this.codDepSelect = document.getElementById('codDep');
    this.codProvSelect = document.getElementById('codProv');
    this.codDistSelect = document.getElementById('codDist');
    this.direccionInput = document.getElementById('direccionLinea');
    this.referenciaInput = document.getElementById('referencia');
    this.destinatarioNombreInput = document.getElementById('destinatarioNombre');
    this.destinatarioDniInput = document.getElementById('destinatarioDni');
    this.agenciaInput = document.getElementById('agencia');
    this.destinatarioNombreRow = document.getElementById('destinatarioNombreRow');
    this.destinatarioDniRow = document.getElementById('destinatarioDniRow');
    this.agenciaRow = document.getElementById('agenciaRow');
    this.ubigeoRow = document.getElementById('ubigeoRow');
    this.direccionRow = document.getElementById('direccionRow');
    this.entregaPreview = document.getElementById('entregaPreview');
    this.numRecibeSelect = document.getElementById('numRecibeSelect');
    this.numeroRecibeInput = document.getElementById('numeroRecibe');
    this.nombreRecibeInput = document.getElementById('nombreRecibe');
    this.nuevoNumeroRecibeInput = document.getElementById('nuevoNumeroRecibe');
    this.nuevoNombreRecibeInput = document.getElementById('nuevoNombreRecibe');
    this.addRecibeBtn = document.getElementById('addRecibeBtn');
    this.pedidoSummary = document.getElementById('pedidoSummary');
    this.facturaSummary = document.getElementById('facturaSummary');
    this.entregaSummary = document.getElementById('entregaSummary');
    this.recibeSummary = document.getElementById('recibeSummary');
    this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
    this.logsContent = document.getElementById('logsContent');

    this.regex = {
      numero: /^(?:\d+)(?:\.\d{1,3})?$/,
      monto: /^(?:\d+)(?:\.\d{1,2})?$/,
      texto: /^.{2,}$/,
      dni: /^\d{6,12}$/,
    };

    this.state = {
      locale: navigator.language || 'es',
      clientes: [],
      productos: [],
      bases: [],
      puntosEntrega: [],
      numRecibe: [],
      pedidoDetalle: [],
      facturaDetalle: [],
      facturaTotal: 0,
      regionEntrega: '',
    };

    this.dictionary = {
      es: {
        stepTitles: [
          'Paso 1: Crear Pedido',
          'Paso 2: Crear Factura',
          'Paso 3: Datos Entrega',
          'Paso 4: Datos Recibe',
          'Paso 5: Resumen y Emitir',
        ],
        stepHints: [
          'Complete los datos del pedido y productos.',
          'Ajuste cantidades y confirme la base.',
          'Seleccione o registre el punto de entrega.',
          'Complete la informacion del receptor.',
          'Revise el resumen antes de emitir la factura.',
        ],
        ui: {
          wizardStatus: 'Servicio Global IaaS/PaaS',
          wizardTitle: 'Pedidos y Facturacion',
          wizardSubtitle: 'Registre pedidos con facturacion automatizada y entrega trazable.',
          viewLogs: 'Ver Logs de SQL',
          fechaPedido: 'Fecha Pedido',
          horaPedido: 'Hora Pedido',
          cliente: 'Cliente',
          pedidoDetalle: 'vProdPedidos',
          agregarLinea: 'Agregar linea',
          codigoProducto: 'Codigo Producto',
          descripcion: 'Descripcion',
          cantidad: 'Cantidad',
          precioTotal: 'Precio Total',
          fechaEmision: 'Fecha Emision',
          codigoBase: 'Base',
          facturaDetalle: 'vProdFactura',
          datosEntrega: 'Datos Entrega',
          tipoDocumento: 'Tipo Documento: F',
          puntoEntrega: 'Punto Entrega',
          modoEntrega: 'Modo',
          modoExistente: 'Usar existente',
          modoNuevo: 'Agregar nuevo',
          regionEntrega: 'Region Entrega',
          seleccione: 'Seleccione',
          departamento: 'Departamento',
          provincia: 'Provincia',
          distrito: 'Distrito',
          direccion: 'Direccion',
          referencia: 'Referencia',
          destinatario: 'Destinatario',
          dni: 'DNI',
          agencia: 'Agencia',
          datosRecibe: 'Datos Recibe',
          soloLima: 'Solo para region LIMA',
          codigoRecibe: 'Codigo NumRecibe',
          numeroRecibe: 'Numero',
          nombreRecibe: 'Nombre',
          agregarRecibe: 'Agregar nuevo numrecibe',
          registrar: 'Registrar',
          confirmacion: 'Confirmo que la informacion es correcta',
          emitirFactura: 'Emitir Factura',
          anterior: 'Anterior',
          siguiente: 'Siguiente',
          logsTitle: 'Logs de SQL',
          loading: 'Procesando...',
          loadingHint: 'Espere un momento.',
          pedidoResumen: 'Pedido',
          facturaResumen: 'Factura',
          entregaResumen: 'Entrega',
          recibeResumen: 'Recibe',
          totalLabel: 'Total',
          labelCliente: 'Cliente',
          labelFecha: 'Fecha',
          labelItems: 'Items',
          labelBase: 'Base',
          labelRegion: 'Region',
          labelUbigeo: 'Ubigeo',
          labelDireccion: 'Direccion',
          labelNumero: 'Numero',
          labelNombre: 'Nombre',
          labelNoAplica: 'No aplica para PROV',
          labelCodigo: 'Codigo',
        },
        messages: {
          errorServer: 'Error al comunicar con el servidor',
          seleccionarCliente: 'Seleccione un cliente valido.',
          pedidoDetalleVacio: 'Agregue al menos un producto al pedido.',
          pedidoDetalleInvalido: 'Complete productos, cantidad y precio total.',
          facturaDetalleInvalido: 'Complete productos y cantidades de factura.',
          baseInvalida: 'Seleccione una base valida.',
          facturaCantidadExcede: 'La cantidad facturada excede la cantidad del pedido.',
          puntoEntregaInvalido: 'Seleccione o registre un punto de entrega.',
          ubigeoInvalido: 'Complete departamento, provincia y distrito.',
          direccionInvalida: 'Complete direccion y referencia.',
          destinatarioInvalido: 'Complete destinatario y DNI.',
          agenciaInvalida: 'Complete agencia para PROV.',
          numRecibeInvalido: 'Seleccione o registre un numrecibe.',
          confirmarOperacion: 'Debe confirmar la operacion.',
          facturaOk: 'Factura emitida correctamente.',
          numrecibeOk: 'Numrecibe registrado.',
          sinLogs: 'Sin logs disponibles.',
        },
      },
      en: {
        stepTitles: [
          'Step 1: Create Order',
          'Step 2: Create Invoice',
          'Step 3: Delivery Data',
          'Step 4: Receiver Data',
          'Step 5: Summary and Issue',
        ],
        stepHints: [
          'Complete order details and products.',
          'Adjust quantities and confirm base.',
          'Select or register delivery point.',
          'Complete receiver information.',
          'Review the summary before issuing.',
        ],
        ui: {
          wizardStatus: 'Global IaaS/PaaS Service',
          wizardTitle: 'Orders and Billing',
          wizardSubtitle: 'Register orders with automated invoicing and traceable delivery.',
          viewLogs: 'View SQL Logs',
          fechaPedido: 'Order Date',
          horaPedido: 'Order Time',
          cliente: 'Client',
          pedidoDetalle: 'vOrderItems',
          agregarLinea: 'Add line',
          codigoProducto: 'Product Code',
          descripcion: 'Description',
          cantidad: 'Quantity',
          precioTotal: 'Total Price',
          fechaEmision: 'Issue Date',
          codigoBase: 'Base',
          facturaDetalle: 'vInvoiceItems',
          datosEntrega: 'Delivery Data',
          tipoDocumento: 'Document Type: F',
          puntoEntrega: 'Delivery Point',
          modoEntrega: 'Mode',
          modoExistente: 'Use existing',
          modoNuevo: 'Add new',
          regionEntrega: 'Delivery Region',
          seleccione: 'Select',
          departamento: 'Department',
          provincia: 'Province',
          distrito: 'District',
          direccion: 'Address',
          referencia: 'Reference',
          destinatario: 'Recipient',
          dni: 'ID',
          agencia: 'Agency',
          datosRecibe: 'Receiver Data',
          soloLima: 'Only for LIMA region',
          codigoRecibe: 'Receiver Code',
          numeroRecibe: 'Number',
          nombreRecibe: 'Name',
          agregarRecibe: 'Add new receiver',
          registrar: 'Register',
          confirmacion: 'I confirm the information is correct',
          emitirFactura: 'Issue Invoice',
          anterior: 'Previous',
          siguiente: 'Next',
          logsTitle: 'SQL Logs',
          loading: 'Processing...',
          loadingHint: 'Please wait.',
          pedidoResumen: 'Order',
          facturaResumen: 'Invoice',
          entregaResumen: 'Delivery',
          recibeResumen: 'Receiver',
          totalLabel: 'Total',
          labelCliente: 'Client',
          labelFecha: 'Date',
          labelItems: 'Items',
          labelBase: 'Base',
          labelRegion: 'Region',
          labelUbigeo: 'Ubigeo',
          labelDireccion: 'Address',
          labelNumero: 'Number',
          labelNombre: 'Name',
          labelNoAplica: 'Not applicable for PROV',
          labelCodigo: 'Code',
        },
        messages: {
          errorServer: 'Failed to communicate with server',
          seleccionarCliente: 'Select a valid client.',
          pedidoDetalleVacio: 'Add at least one product to the order.',
          pedidoDetalleInvalido: 'Complete product, quantity, and total price.',
          facturaDetalleInvalido: 'Complete product and quantities for invoice.',
          baseInvalida: 'Select a valid base.',
          facturaCantidadExcede: 'Invoiced quantity exceeds order quantity.',
          puntoEntregaInvalido: 'Select or register a delivery point.',
          ubigeoInvalido: 'Complete department, province, and district.',
          direccionInvalida: 'Complete address and reference.',
          destinatarioInvalido: 'Complete recipient and ID.',
          agenciaInvalida: 'Complete agency for PROV.',
          numRecibeInvalido: 'Select or register a receiver.',
          confirmarOperacion: 'You must confirm the operation.',
          facturaOk: 'Invoice issued successfully.',
          numrecibeOk: 'Receiver registered.',
          sinLogs: 'No logs available.',
        },
      },
    };

    this.init();
  }

  getLang() {
    const lang = this.state.locale.toLowerCase();
    return lang.startsWith('en') ? 'en' : 'es';
  }

  t(path) {
    const lang = this.getLang();
    const segments = path.split('.');
    let current = this.dictionary[lang];
    for (const segment of segments) {
      if (!current || !(segment in current)) return path;
      current = current[segment];
    }
    return current;
  }

  applyTranslations() {
    document.documentElement.lang = this.getLang();
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = this.t(`ui.${key}`);
      if (value) {
        el.textContent = value;
      }
    });
  }

  setLoading(isLoading, message) {
    if (isLoading) {
      this.loadingText.textContent = message || this.t('ui.loading');
      this.loadingOverlay.classList.add('active');
    } else {
      this.loadingOverlay.classList.remove('active');
    }
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

  async fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || this.t('messages.errorServer'));
    }
    return response.json();
  }

  init() {
    this.applyTranslations();
    this.setFechaActual();
    this.facturaTotalLabel.textContent = `${this.t('ui.totalLabel')}: 0.00`;
    this.toggleEntregaFields(true);
    this.showStep(0);
    this.prevBtn.addEventListener('click', () => this.goPrev());
    this.nextBtn.addEventListener('click', () => this.goNext());
    this.emitirBtn.addEventListener('click', () => this.handleEmitir());
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.openLogs());
    this.addPedidoRowBtn.addEventListener('click', () => this.addPedidoRow());
    this.addFacturaRowBtn.addEventListener('click', () => this.addFacturaRow());
    this.pedidoTableBody.addEventListener('input', (event) => this.handlePedidoInput(event));
    this.facturaTableBody.addEventListener('input', (event) => this.handleFacturaInput(event));
    this.pedidoTableBody.addEventListener('change', (event) => this.handlePedidoInput(event));
    this.facturaTableBody.addEventListener('change', (event) => this.handleFacturaInput(event));
    this.pedidoTableBody.addEventListener('click', (event) => this.handlePedidoAction(event));
    this.facturaTableBody.addEventListener('click', (event) => this.handleFacturaAction(event));
    this.clienteSelect.addEventListener('change', () => this.handleClienteChange());
    this.modoEntregaSelect.addEventListener('change', () => this.handleModoEntregaChange());
    this.regionEntregaSelect.addEventListener('change', () => this.handleRegionChange());
    this.puntoEntregaSelect.addEventListener('change', () => this.handlePuntoEntregaChange());
    this.codDepSelect.addEventListener('change', () => this.loadProvincias());
    this.codProvSelect.addEventListener('change', () => this.loadDistritos());
    this.codDistSelect.addEventListener('change', () => this.updateEntregaPreview());
    this.direccionInput.addEventListener('input', () => this.updateEntregaPreview());
    this.referenciaInput.addEventListener('input', () => this.updateEntregaPreview());
    this.destinatarioNombreInput.addEventListener('input', () => this.updateEntregaPreview());
    this.destinatarioDniInput.addEventListener('input', () => this.updateEntregaPreview());
    this.agenciaInput.addEventListener('input', () => this.updateEntregaPreview());
    this.numRecibeSelect.addEventListener('change', () => this.handleNumRecibeChange());
    this.addRecibeBtn.addEventListener('click', () => this.handleAddRecibe());

    this.loadInitialData();
  }

  setFechaActual() {
    const now = new Date();
    const dateValue = now.toISOString().slice(0, 10);
    const timeValue = now.toTimeString().slice(0, 5);
    this.fechaPedidoInput.value = dateValue;
    this.horaPedidoInput.value = timeValue;
    this.fechaEmisionInput.value = dateValue;
  }

  async loadInitialData() {
    this.setLoading(true);
    try {
      const [clientes, productos, bases] = await Promise.all([
        this.fetchJson('/api/clientes'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/bases'),
      ]);
      this.state.clientes = clientes;
      this.state.productos = productos;
      this.state.bases = bases;
      this.renderClienteOptions();
      this.renderProductoOptions();
      this.renderBaseOptions();
      this.addPedidoRow();
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  renderClienteOptions() {
    const lang = this.getLang();
    this.clienteSelect.innerHTML = `<option value="">${lang === 'en' ? 'Select' : 'Seleccione'}</option>`;
    this.state.clientes.forEach((cliente) => {
      const option = document.createElement('option');
      option.value = cliente.codigo_cliente;
      option.textContent = `${cliente.codigo_cliente} - ${cliente.nombre}`;
      this.clienteSelect.appendChild(option);
    });
  }

  renderProductoOptions() {
    this.productOptionsHtml = this.state.productos
      .map((producto) => `<option value="${producto.codigo_producto}">${producto.codigo_producto} - ${producto.nombre}</option>`)
      .join('');
  }

  renderBaseOptions() {
    const lang = this.getLang();
    this.codigoBaseSelect.innerHTML = `<option value="">${lang === 'en' ? 'Select base' : 'Seleccione base'}</option>`;
    this.state.bases.forEach((base) => {
      const option = document.createElement('option');
      option.value = base.codigo_base;
      option.textContent = `${base.codigo_base} - ${base.nombre}`;
      this.codigoBaseSelect.appendChild(option);
    });
  }

  getVisibleSteps() {
    const steps = [0, 1, 2];
    if (this.state.regionEntrega === 'LIMA') {
      steps.push(3);
    }
    steps.push(4);
    return steps;
  }

  showStep(stepIndex) {
    this.steps.forEach((step, index) => {
      step.classList.toggle('active', index === stepIndex);
    });
    this.currentStep = stepIndex;
    const lang = this.getLang();
    this.stepTitle.textContent = this.dictionary[lang].stepTitles[stepIndex];
    this.stepHint.textContent = this.dictionary[lang].stepHints[stepIndex];
    this.updateProgress();
    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.style.display = this.currentStep === 4 ? 'none' : 'inline-flex';
  }

  updateProgress() {
    const visibleSteps = this.getVisibleSteps();
    const position = visibleSteps.indexOf(this.currentStep);
    const percent = Math.round(((position + 1) / visibleSteps.length) * 100);
    this.progressBar.style.width = `${percent}%`;
    this.progressBar.setAttribute('aria-valuenow', String(percent));
  }

  goNext() {
    this.clearAlerts();
    if (!this.validateStep(this.currentStep)) {
      return;
    }
    if (this.currentStep === 0) {
      this.syncFacturaFromPedido();
    }
    if (this.currentStep === 2 && this.state.regionEntrega === 'PROV') {
      this.showStep(4);
      this.renderSummaries();
      return;
    }
    const next = Math.min(this.currentStep + 1, this.steps.length - 1);
    this.showStep(next);
    if (next === 4) {
      this.renderSummaries();
    }
  }

  goPrev() {
    this.clearAlerts();
    if (this.currentStep === 4 && this.state.regionEntrega === 'PROV') {
      this.showStep(2);
      return;
    }
    const prev = Math.max(this.currentStep - 1, 0);
    this.showStep(prev);
  }

  validateStep(stepIndex) {
    if (stepIndex === 0) {
      if (!this.clienteSelect.value) {
        this.showError(this.t('messages.seleccionarCliente'));
        return false;
      }
      if (!this.state.pedidoDetalle.length) {
        this.showError(this.t('messages.pedidoDetalleVacio'));
        return false;
      }
      if (!this.state.pedidoDetalle.every((row) => row.codigo_producto && this.isValidNumber(row.cantidad) && this.isValidNumber(row.precio_total))) {
        this.showError(this.t('messages.pedidoDetalleInvalido'));
        return false;
      }
      return true;
    }

    if (stepIndex === 1) {
      if (!this.codigoBaseSelect.value) {
        this.showError(this.t('messages.baseInvalida'));
        return false;
      }
      if (!this.state.facturaDetalle.length || !this.state.facturaDetalle.every((row) => row.codigo_producto && this.isValidNumber(row.cantidad))) {
        this.showError(this.t('messages.facturaDetalleInvalido'));
        return false;
      }
      if (!this.validateFacturaCantidad()) {
        this.showError(this.t('messages.facturaCantidadExcede'));
        return false;
      }
      return true;
    }

    if (stepIndex === 2) {
      if (this.modoEntregaSelect.value === 'existente') {
        if (!this.puntoEntregaSelect.value) {
          this.showError(this.t('messages.puntoEntregaInvalido'));
          return false;
        }
      } else {
        if (!this.regionEntregaSelect.value) {
          this.showError(this.t('messages.puntoEntregaInvalido'));
          return false;
        }
        if (!this.codDepSelect.value || !this.codProvSelect.value || !this.codDistSelect.value) {
          this.showError(this.t('messages.ubigeoInvalido'));
          return false;
        }
        if (!this.regex.texto.test(this.direccionInput.value.trim()) || !this.regex.texto.test(this.referenciaInput.value.trim())) {
          this.showError(this.t('messages.direccionInvalida'));
          return false;
        }
        if (this.regionEntregaSelect.value === 'LIMA') {
          if (!this.regex.texto.test(this.destinatarioNombreInput.value.trim()) || !this.regex.dni.test(this.destinatarioDniInput.value.trim())) {
            this.showError(this.t('messages.destinatarioInvalido'));
            return false;
          }
        }
        if (this.regionEntregaSelect.value === 'PROV') {
          if (!this.regex.texto.test(this.agenciaInput.value.trim())) {
            this.showError(this.t('messages.agenciaInvalida'));
            return false;
          }
        }
      }
      return true;
    }

    if (stepIndex === 3) {
      if (this.state.regionEntrega === 'LIMA') {
        if (!this.numRecibeSelect.value) {
          this.showError(this.t('messages.numRecibeInvalido'));
          return false;
        }
      }
      return true;
    }

    if (stepIndex === 4) {
      if (!this.confirmOperacion.checked) {
        this.showError(this.t('messages.confirmarOperacion'));
        return false;
      }
      return true;
    }

    return true;
  }

  addPedidoRow(data = {}) {
    const row = {
      id: Date.now() + Math.random(),
      codigo_producto: data.codigo_producto || '',
      descripcion: data.descripcion || '',
      cantidad: data.cantidad || '',
      precio_total: data.precio_total || '',
    };
    this.state.pedidoDetalle.push(row);
    this.renderPedidoTable();
  }

  addFacturaRow(data = {}) {
    const row = {
      id: Date.now() + Math.random(),
      codigo_producto: data.codigo_producto || '',
      descripcion: data.descripcion || '',
      cantidad: data.cantidad || '',
      precio_total: data.precio_total || 0,
    };
    this.state.facturaDetalle.push(row);
    this.renderFacturaTable();
    this.recalculateFactura();
  }

  renderPedidoTable() {
    this.pedidoTableBody.innerHTML = '';
    this.state.pedidoDetalle.forEach((row) => {
      const tr = document.createElement('tr');
      tr.dataset.id = row.id;
      tr.innerHTML = `
        <td>
          <select class="form-select form-select-sm product-select">
            <option value="">${this.getLang() === 'en' ? 'Select' : 'Seleccione'}</option>
            ${this.productOptionsHtml}
          </select>
        </td>
        <td class="product-name">${row.descripcion || ''}</td>
        <td>
          <input class="form-control form-control-sm input-inline qty-input" type="number" min="0" step="0.001" value="${row.cantidad}" />
        </td>
        <td>
          <input class="form-control form-control-sm input-inline price-input" type="number" min="0" step="0.01" value="${row.precio_total}" />
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline-light btn-sm remove-row" type="button">-</button>
          </div>
        </td>
      `;
      const select = tr.querySelector('select');
      select.value = row.codigo_producto;
      this.pedidoTableBody.appendChild(tr);
    });
  }

  renderFacturaTable() {
    this.facturaTableBody.innerHTML = '';
    this.state.facturaDetalle.forEach((row) => {
      const tr = document.createElement('tr');
      tr.dataset.id = row.id;
      tr.innerHTML = `
        <td>
          <select class="form-select form-select-sm product-select">
            <option value="">${this.getLang() === 'en' ? 'Select' : 'Seleccione'}</option>
            ${this.productOptionsHtml}
          </select>
        </td>
        <td class="product-name">${row.descripcion || ''}</td>
        <td>
          <input class="form-control form-control-sm input-inline qty-input" type="number" min="0" step="0.001" value="${row.cantidad}" />
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-outline-light btn-sm remove-row" type="button">-</button>
          </div>
        </td>
      `;
      const select = tr.querySelector('select');
      select.value = row.codigo_producto;
      this.facturaTableBody.appendChild(tr);
    });
  }

  handlePedidoInput(event) {
    const rowElement = event.target.closest('tr');
    if (!rowElement) return;
    const row = this.state.pedidoDetalle.find((item) => item.id === Number(rowElement.dataset.id));
    if (!row) return;
    if (event.target.classList.contains('product-select')) {
      row.codigo_producto = event.target.value;
      row.descripcion = this.getProductoNombre(row.codigo_producto);
      rowElement.querySelector('.product-name').textContent = row.descripcion || '';
    }
    if (event.target.classList.contains('qty-input')) {
      row.cantidad = event.target.value;
    }
    if (event.target.classList.contains('price-input')) {
      row.precio_total = event.target.value;
    }
  }

  handleFacturaInput(event) {
    const rowElement = event.target.closest('tr');
    if (!rowElement) return;
    const row = this.state.facturaDetalle.find((item) => item.id === Number(rowElement.dataset.id));
    if (!row) return;
    if (event.target.classList.contains('product-select')) {
      row.codigo_producto = event.target.value;
      row.descripcion = this.getProductoNombre(row.codigo_producto);
      rowElement.querySelector('.product-name').textContent = row.descripcion || '';
    }
    if (event.target.classList.contains('qty-input')) {
      row.cantidad = event.target.value;
    }
    this.recalculateFactura();
  }

  handlePedidoAction(event) {
    if (event.target.classList.contains('remove-row')) {
      const rowElement = event.target.closest('tr');
      this.state.pedidoDetalle = this.state.pedidoDetalle.filter((row) => row.id !== Number(rowElement.dataset.id));
      this.renderPedidoTable();
    }
  }

  handleFacturaAction(event) {
    if (event.target.classList.contains('remove-row')) {
      const rowElement = event.target.closest('tr');
      this.state.facturaDetalle = this.state.facturaDetalle.filter((row) => row.id !== Number(rowElement.dataset.id));
      this.renderFacturaTable();
      this.recalculateFactura();
    }
  }

  getProductoNombre(codigo) {
    const producto = this.state.productos.find((item) => String(item.codigo_producto) === String(codigo));
    return producto ? producto.nombre : '';
  }

  isValidNumber(value) {
    return this.regex.numero.test(String(value)) && Number(value) > 0;
  }

  syncFacturaFromPedido() {
    this.state.facturaDetalle = this.state.pedidoDetalle.map((row) => ({
      id: Date.now() + Math.random(),
      codigo_producto: row.codigo_producto,
      descripcion: row.descripcion,
      cantidad: row.cantidad,
      precio_total: 0,
    }));
    this.renderFacturaTable();
    this.recalculateFactura();
  }

  buildPedidoPriceMap() {
    const map = new Map();
    this.state.pedidoDetalle.forEach((row) => {
      const key = String(row.codigo_producto);
      const qty = Number(row.cantidad) || 0;
      const total = Number(row.precio_total) || 0;
      if (!map.has(key)) {
        map.set(key, { qty: 0, total: 0 });
      }
      const entry = map.get(key);
      entry.qty += qty;
      entry.total += total;
    });
    return map;
  }

  validateFacturaCantidad() {
    const pedidoMap = this.buildPedidoPriceMap();
    const facturaMap = new Map();
    for (const row of this.state.facturaDetalle) {
      const key = String(row.codigo_producto);
      const qty = Number(row.cantidad) || 0;
      if (!pedidoMap.has(key)) {
        return false;
      }
      if (!facturaMap.has(key)) {
        facturaMap.set(key, 0);
      }
      facturaMap.set(key, facturaMap.get(key) + qty);
    }
    for (const [key, qty] of facturaMap.entries()) {
      const pedidoQty = pedidoMap.get(key).qty;
      if (qty > pedidoQty) {
        return false;
      }
    }
    return true;
  }

  recalculateFactura() {
    const pedidoMap = this.buildPedidoPriceMap();
    let total = 0;
    this.state.facturaDetalle.forEach((row) => {
      const key = String(row.codigo_producto);
      const qty = Number(row.cantidad) || 0;
      const pedidoEntry = pedidoMap.get(key);
      if (pedidoEntry && pedidoEntry.qty > 0) {
        const unitPrice = pedidoEntry.total / pedidoEntry.qty;
        row.precio_total = Number((unitPrice * qty).toFixed(2));
      } else {
        row.precio_total = 0;
      }
      total += row.precio_total || 0;
    });
    this.state.facturaTotal = Number(total.toFixed(2));
    this.facturaTotalLabel.textContent = `${this.t('ui.totalLabel')}: ${this.state.facturaTotal.toFixed(2)}`;
  }

  async handleClienteChange() {
    const codigoCliente = this.clienteSelect.value;
    if (!codigoCliente) {
      this.state.puntosEntrega = [];
      this.state.numRecibe = [];
      this.renderPuntoEntregaOptions();
      this.renderNumRecibeOptions();
      return;
    }
    this.setLoading(true);
    try {
      const [puntosEntrega, numRecibe] = await Promise.all([
        this.fetchJson(`/api/puntos-entrega?cliente=${encodeURIComponent(codigoCliente)}`),
        this.fetchJson(`/api/numrecibe?cliente=${encodeURIComponent(codigoCliente)}`),
      ]);
      this.state.puntosEntrega = puntosEntrega;
      this.state.numRecibe = numRecibe;
      this.renderPuntoEntregaOptions();
      this.renderNumRecibeOptions();
      if (this.state.puntosEntrega.length === 0) {
        this.modoEntregaSelect.value = 'nuevo';
        this.puntoEntregaSelect.disabled = true;
        this.toggleEntregaFields(false);
        this.updateRegionFields();
        await this.loadDepartamentos();
      } else {
        this.puntoEntregaSelect.disabled = false;
      }
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  renderPuntoEntregaOptions() {
    const lang = this.getLang();
    this.puntoEntregaSelect.innerHTML = `<option value="">${lang === 'en' ? 'Select' : 'Seleccione'}</option>`;
    this.state.puntosEntrega.forEach((punto) => {
      const option = document.createElement('option');
      option.value = `${punto.codigo_puntoentrega}|${punto.cod_dep}${punto.cod_prov}${punto.cod_dist}`;
      option.textContent = `${punto.codigo_puntoentrega} - ${punto.region_entrega}`;
      this.puntoEntregaSelect.appendChild(option);
    });
  }

  renderNumRecibeOptions() {
    const lang = this.getLang();
    this.numRecibeSelect.innerHTML = `<option value="">${lang === 'en' ? 'Select' : 'Seleccione'}</option>`;
    this.state.numRecibe.forEach((item) => {
      const option = document.createElement('option');
      option.value = `${item.codigo_cliente_numrecibe}|${item.ordinal_numrecibe}`;
      option.textContent = `${item.numero} - ${item.nombre || ''}`;
      this.numRecibeSelect.appendChild(option);
    });
    this.numeroRecibeInput.value = '';
    this.nombreRecibeInput.value = '';
  }

  async handleModoEntregaChange() {
    const modo = this.modoEntregaSelect.value;
    if (modo === 'existente') {
      this.regionEntregaSelect.value = '';
      this.state.regionEntrega = '';
      this.toggleEntregaFields(true);
    } else {
      this.toggleEntregaFields(false);
      this.updateRegionFields();
      await this.loadDepartamentos();
    }
    this.updateEntregaPreview();
  }

  handleRegionChange() {
    this.state.regionEntrega = this.regionEntregaSelect.value;
    this.updateRegionFields();
    this.updateEntregaPreview();
    this.updateProgress();
  }

  handlePuntoEntregaChange() {
    const value = this.puntoEntregaSelect.value;
    if (!value) {
      this.entregaPreview.innerHTML = '';
      return;
    }
    const [codigo, ubigeo] = value.split('|');
    const punto = this.state.puntosEntrega.find(
      (item) => String(item.codigo_puntoentrega) === String(codigo) && `${item.cod_dep}${item.cod_prov}${item.cod_dist}` === ubigeo
    );
    if (!punto) return;
    this.state.regionEntrega = punto.region_entrega;
    this.regionEntregaSelect.value = punto.region_entrega;
    this.updateEntregaPreview(punto);
    this.updateProgress();
  }

  toggleEntregaFields(usingExisting) {
    const fields = [this.regionEntregaSelect, this.codDepSelect, this.codProvSelect, this.codDistSelect, this.direccionInput, this.referenciaInput, this.destinatarioNombreInput, this.destinatarioDniInput, this.agenciaInput];
    fields.forEach((field) => {
      field.disabled = usingExisting;
    });
    this.ubigeoRow.style.display = usingExisting ? 'none' : 'flex';
    this.direccionRow.style.display = usingExisting ? 'none' : 'flex';
    this.destinatarioNombreRow.style.display = usingExisting ? 'none' : 'block';
    this.destinatarioDniRow.style.display = usingExisting ? 'none' : 'block';
    this.agenciaRow.style.display = usingExisting ? 'none' : 'block';
  }

  updateRegionFields() {
    if (this.modoEntregaSelect.value !== 'nuevo') {
      return;
    }
    const isLima = this.regionEntregaSelect.value === 'LIMA';
    const isProv = this.regionEntregaSelect.value === 'PROV';
    this.destinatarioNombreRow.style.display = isLima ? 'block' : 'none';
    this.destinatarioDniRow.style.display = isLima ? 'block' : 'none';
    this.agenciaRow.style.display = isProv ? 'block' : 'none';
  }

  updateEntregaPreview(punto) {
    let content = '';
    if (this.modoEntregaSelect.value === 'existente' && punto) {
      content = `
        <h4>${this.t('ui.datosEntrega')}</h4>
        <div class="summary-grid">
          <div><span class="small-muted">${this.t('ui.labelCodigo')}</span><div>${punto.codigo_puntoentrega}</div></div>
          <div><span class="small-muted">${this.t('ui.labelRegion')}</span><div>${punto.region_entrega}</div></div>
          <div><span class="small-muted">${this.t('ui.labelUbigeo')}</span><div>${punto.cod_dep}${punto.cod_prov}${punto.cod_dist}</div></div>
          <div><span class="small-muted">${this.t('ui.labelDireccion')}</span><div>${punto.direccion_linea || '-'}</div></div>
        </div>
      `;
    } else if (this.modoEntregaSelect.value === 'nuevo') {
      content = `
        <h4>${this.t('ui.datosEntrega')}</h4>
        <div class="summary-grid">
          <div><span class="small-muted">${this.t('ui.labelRegion')}</span><div>${this.regionEntregaSelect.value || '-'}</div></div>
          <div><span class="small-muted">${this.t('ui.labelUbigeo')}</span><div>${this.codDepSelect.value}${this.codProvSelect.value}${this.codDistSelect.value}</div></div>
          <div><span class="small-muted">${this.t('ui.labelDireccion')}</span><div>${this.direccionInput.value || '-'}</div></div>
        </div>
      `;
    }
    this.entregaPreview.innerHTML = content;
  }

  async loadDepartamentos() {
    try {
      const departamentos = await this.fetchJson('/api/ubigeo/departamentos');
      this.codDepSelect.innerHTML = `<option value="">${this.getLang() === 'en' ? 'Select' : 'Seleccione'}</option>`;
      departamentos.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.cod_dep;
        option.textContent = `${item.cod_dep} - ${item.departamento}`;
        this.codDepSelect.appendChild(option);
      });
    } catch (error) {
      this.showError(error.message);
    }
  }

  async loadProvincias() {
    const codDep = this.codDepSelect.value;
    if (!codDep) return;
    try {
      const provincias = await this.fetchJson(`/api/ubigeo/provincias?cod_dep=${encodeURIComponent(codDep)}`);
      this.codProvSelect.innerHTML = `<option value="">${this.getLang() === 'en' ? 'Select' : 'Seleccione'}</option>`;
      provincias.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.cod_prov;
        option.textContent = `${item.cod_prov} - ${item.provincia}`;
        this.codProvSelect.appendChild(option);
      });
    } catch (error) {
      this.showError(error.message);
    }
  }

  async loadDistritos() {
    const codDep = this.codDepSelect.value;
    const codProv = this.codProvSelect.value;
    if (!codDep || !codProv) return;
    try {
      const distritos = await this.fetchJson(
        `/api/ubigeo/distritos?cod_dep=${encodeURIComponent(codDep)}&cod_prov=${encodeURIComponent(codProv)}`
      );
      this.codDistSelect.innerHTML = `<option value="">${this.getLang() === 'en' ? 'Select' : 'Seleccione'}</option>`;
      distritos.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.cod_dist;
        option.textContent = `${item.cod_dist} - ${item.distrito}`;
        this.codDistSelect.appendChild(option);
      });
    } catch (error) {
      this.showError(error.message);
    }
  }

  handleNumRecibeChange() {
    const value = this.numRecibeSelect.value;
    if (!value) {
      this.numeroRecibeInput.value = '';
      this.nombreRecibeInput.value = '';
      return;
    }
    const [codigo, ordinal] = value.split('|');
    const item = this.state.numRecibe.find(
      (row) => String(row.codigo_cliente_numrecibe) === String(codigo) && String(row.ordinal_numrecibe) === String(ordinal)
    );
    if (item) {
      this.numeroRecibeInput.value = item.numero;
      this.nombreRecibeInput.value = item.nombre || '';
    }
  }

  async handleAddRecibe() {
    this.clearAlerts();
    const numero = this.nuevoNumeroRecibeInput.value.trim();
    const nombre = this.nuevoNombreRecibeInput.value.trim();
    const codigoCliente = this.clienteSelect.value;
    if (!codigoCliente || !numero || !nombre) {
      this.showError(this.t('messages.numRecibeInvalido'));
      return;
    }
    this.setLoading(true);
    try {
      const response = await this.fetchJson('/api/numrecibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_cliente: codigoCliente, numero, nombre }),
      });
      this.showSuccess(this.t('messages.numrecibeOk'));
      this.state.numRecibe.push(response);
      this.renderNumRecibeOptions();
      this.numRecibeSelect.value = `${response.codigo_cliente_numrecibe}|${response.ordinal_numrecibe}`;
      this.handleNumRecibeChange();
      this.nuevoNumeroRecibeInput.value = '';
      this.nuevoNombreRecibeInput.value = '';
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  renderSummaries() {
    const cliente = this.state.clientes.find((row) => String(row.codigo_cliente) === String(this.clienteSelect.value));
    this.pedidoSummary.innerHTML = `
      <h4>${this.t('ui.pedidoResumen')}</h4>
      <div class="summary-grid">
        <div><span class="small-muted">${this.t('ui.labelCliente')}</span><div>${cliente ? cliente.nombre : '-'}</div></div>
        <div><span class="small-muted">${this.t('ui.labelFecha')}</span><div>${this.fechaPedidoInput.value} ${this.horaPedidoInput.value}</div></div>
        <div><span class="small-muted">${this.t('ui.labelItems')}</span><div>${this.state.pedidoDetalle.length}</div></div>
      </div>
    `;
    this.facturaSummary.innerHTML = `
      <h4>${this.t('ui.facturaResumen')}</h4>
      <div class="summary-grid">
        <div><span class="small-muted">${this.t('ui.labelBase')}</span><div>${this.codigoBaseSelect.value || '-'}</div></div>
        <div><span class="small-muted">${this.t('ui.labelFecha')}</span><div>${this.fechaEmisionInput.value}</div></div>
        <div><span class="small-muted">${this.t('ui.totalLabel')}</span><div>${this.state.facturaTotal.toFixed(2)}</div></div>
      </div>
    `;

    const entregaInfo = this.getEntregaInfo();
    this.entregaSummary.innerHTML = `
      <h4>${this.t('ui.entregaResumen')}</h4>
      <div class="summary-grid">
        <div><span class="small-muted">${this.t('ui.labelRegion')}</span><div>${entregaInfo.region || '-'}</div></div>
        <div><span class="small-muted">${this.t('ui.labelUbigeo')}</span><div>${entregaInfo.ubigeo || '-'}</div></div>
        <div><span class="small-muted">${this.t('ui.labelDireccion')}</span><div>${entregaInfo.direccion || '-'}</div></div>
      </div>
    `;

    if (this.state.regionEntrega === 'LIMA') {
      this.recibeSummary.innerHTML = `
        <h4>${this.t('ui.recibeResumen')}</h4>
        <div class="summary-grid">
          <div><span class="small-muted">${this.t('ui.labelNumero')}</span><div>${this.numeroRecibeInput.value || '-'}</div></div>
          <div><span class="small-muted">${this.t('ui.labelNombre')}</span><div>${this.nombreRecibeInput.value || '-'}</div></div>
        </div>
      `;
    } else {
      this.recibeSummary.innerHTML = `
        <h4>${this.t('ui.recibeResumen')}</h4>
        <div class="small-muted">${this.t('ui.labelNoAplica')}</div>
      `;
    }
  }

  getEntregaInfo() {
    if (this.modoEntregaSelect.value === 'existente') {
      const value = this.puntoEntregaSelect.value;
      if (!value) return {};
      const [codigo, ubigeo] = value.split('|');
      const punto = this.state.puntosEntrega.find(
        (item) => String(item.codigo_puntoentrega) === String(codigo) && `${item.cod_dep}${item.cod_prov}${item.cod_dist}` === ubigeo
      );
      return {
        region: punto ? punto.region_entrega : '',
        ubigeo: ubigeo,
        codigo: codigo,
        direccion: punto ? punto.direccion_linea : '',
        referencia: punto ? punto.referencia : '',
        destinatario_nombre: punto ? punto.destinatario_nombre : '',
        destinatario_dni: punto ? punto.destinatario_dni : '',
        agencia: punto ? punto.agencia : '',
      };
    }
    return {
      region: this.regionEntregaSelect.value,
      ubigeo: `${this.codDepSelect.value}${this.codProvSelect.value}${this.codDistSelect.value}`,
      codigo: '',
      direccion: this.direccionInput.value.trim(),
      referencia: this.referenciaInput.value.trim(),
      destinatario_nombre: this.destinatarioNombreInput.value.trim(),
      destinatario_dni: this.destinatarioDniInput.value.trim(),
      agencia: this.agenciaInput.value.trim(),
    };
  }

  async handleEmitir() {
    this.clearAlerts();
    if (!this.validateStep(4)) {
      return;
    }
    const entrega = this.getEntregaInfo();
    const payload = {
      fecha_pedido: this.fechaPedidoInput.value,
      hora_pedido: this.horaPedidoInput.value,
      codigo_cliente: this.clienteSelect.value,
      pedido_detalle: this.state.pedidoDetalle.map((row) => ({
        codigo_producto: row.codigo_producto,
        cantidad: row.cantidad,
        precio_total: row.precio_total,
      })),
      fecha_emision: this.fechaEmisionInput.value,
      codigo_base: this.codigoBaseSelect.value,
      tipo_documento: 'F',
      factura_detalle: this.state.facturaDetalle.map((row) => ({
        codigo_producto: row.codigo_producto,
        cantidad: row.cantidad,
      })),
      entrega: {
        modo: this.modoEntregaSelect.value,
        region: entrega.region,
        ubigeo: entrega.ubigeo,
        codigo_puntoentrega: entrega.codigo,
        direccion: entrega.direccion,
        referencia: entrega.referencia,
        destinatario_nombre: entrega.destinatario_nombre,
        destinatario_dni: entrega.destinatario_dni,
        agencia: entrega.agencia,
      },
      recibe: this.state.regionEntrega === 'LIMA' ? this.numRecibeSelect.value : '',
    };
    this.setLoading(true, this.t('ui.loading'));
    try {
      const response = await this.fetchJson('/api/pedido/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.showSuccess(`${this.t('messages.facturaOk')} #${response.numero_documento}`);
      this.confirmOperacion.checked = false;
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async openLogs() {
    try {
      const data = await this.fetchJson('/api/logs/latest');
      this.logsContent.textContent = data.content || this.t('messages.sinLogs');
      this.logsModal.show();
    } catch (error) {
      this.showError(error.message);
    }
  }
}

new FormWizard();
