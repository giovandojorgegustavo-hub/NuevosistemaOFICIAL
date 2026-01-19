class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.progressBar = document.getElementById('progressBar');
    this.stepTitle = document.getElementById('stepTitle');
    this.stepHint = document.getElementById('stepHint');
    this.stepBadge = document.getElementById('stepBadge');
    this.errorBox = document.getElementById('errorBox');
    this.successBox = document.getElementById('successBox');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.emitirBtn = document.getElementById('emitirBtn');
    this.confirmOperacion = document.getElementById('confirmOperacion');
    this.viewLogsBtn = document.getElementById('viewLogsBtn');
    this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
    this.logsContent = document.getElementById('logsContent');

    this.pedidosTableBody = document.querySelector('#pedidosTable tbody');
    this.facturaTableBody = document.querySelector('#facturaTable tbody');

    this.selectedPedidoLabel = document.getElementById('selectedPedidoLabel');
    this.pedidoResumen = document.getElementById('pedidoResumen');
    this.totalFacturaEl = document.getElementById('totalFactura');

    this.clienteFiltro = document.getElementById('clienteFiltro');
    this.fechaFiltro = document.getElementById('fechaFiltro');
    this.filtrarBtn = document.getElementById('filtrarBtn');

    this.fechaEmision = document.getElementById('fechaEmision');
    this.codigoBase = document.getElementById('codigoBase');
    this.tipoDocumento = document.getElementById('tipoDocumento');

    this.puntoEntregaSelect = document.getElementById('puntoEntregaSelect');
    this.sinPuntosEntrega = document.getElementById('sinPuntosEntrega');
    this.regionEntrega = document.getElementById('regionEntrega');
    this.usarNuevoPunto = document.getElementById('usarNuevoPunto');
    this.nuevoPuntoPanel = document.getElementById('nuevoPuntoPanel');
    this.puntoSeleccionadoPanel = document.getElementById('puntoSeleccionadoPanel');
    this.puntoUbigeo = document.getElementById('puntoUbigeo');
    this.puntoDireccion = document.getElementById('puntoDireccion');
    this.puntoRegion = document.getElementById('puntoRegion');

    this.departamento = document.getElementById('departamento');
    this.provincia = document.getElementById('provincia');
    this.distrito = document.getElementById('distrito');
    this.direccion = document.getElementById('direccion');
    this.referencia = document.getElementById('referencia');
    this.destinatario = document.getElementById('destinatario');
    this.dni = document.getElementById('dni');
    this.agencia = document.getElementById('agencia');

    this.usarNuevoRecibe = document.getElementById('usarNuevoRecibe');
    this.numrecibeSelect = document.getElementById('numrecibeSelect');
    this.numeroRecibe = document.getElementById('numeroRecibe');
    this.nombreRecibe = document.getElementById('nombreRecibe');
    this.nuevoNumero = document.getElementById('nuevoNumero');
    this.nuevoNombre = document.getElementById('nuevoNombre');

    this.resumenPedido = document.getElementById('resumenPedido');
    this.resumenFactura = document.getElementById('resumenFactura');
    this.resumenEntrega = document.getElementById('resumenEntrega');

    this.regex = {
      codigo: /^[0-9]+$/,
      fecha: /^\d{4}-\d{2}-\d{2}$/,
      texto: /^(?=.{2,}).+$/,
      dni: /^\d{8}$/,
    };

    this.state = {
      pedidos: [],
      productos: [],
      bases: [],
      puntosEntrega: [],
      numrecibe: [],
      departamentos: [],
      provincias: [],
      distritos: [],
      selectedPedido: null,
      facturaItems: [],
      totalFactura: 0,
      locale: (navigator.language || 'es').toLowerCase(),
    };

    this.dictionary = {
      es: {
        stepTitles: [
          'Paso 1: Seleccionar Pedido',
          'Paso 2: Crear Factura',
          'Paso 3: Datos Entrega',
          'Paso 4: Datos Recibe',
          'Paso 5: Resumen y Emitir',
        ],
        stepHints: [
          'Filtre y seleccione un pedido con saldo pendiente.',
          'Confirme detalle de factura y cantidades.',
          'Defina punto de entrega y region.',
          'Capture datos de quien recibe si aplica.',
          'Revise y emita la factura.',
        ],
        ui: {
          wizardStatus: 'Servicio Global IaaS/PaaS',
          wizardTitle: 'Gestion Pedido',
          wizardSubtitle: 'Emita facturas con entrega coordinada y trazabilidad completa del pedido.',
          viewLogs: 'Ver Logs de SQL',
          stepBadge: 'Paso',
          clienteFiltro: 'Cliente',
          fechaFiltro: 'Fecha',
          filtrar: 'Aplicar filtros',
          pedidosTitulo: 'vPedidosPendientes',
          sinSeleccion: 'Ningun pedido seleccionado',
          fechaPedido: 'Fecha Pedido',
          codigoPedido: 'Codigo Pedido',
          codigoCliente: 'Codigo Cliente',
          nombreCliente: 'Nombre Cliente',
          fechaEmision: 'Fecha Emision',
          codigoBase: 'Codigo Base',
          tipoDocumento: 'Tipo Documento',
          seleccionar: 'Seleccione',
          prodFactura: 'vProdFactura',
          codigoProducto: 'Codigo Producto',
          descripcion: 'Descripcion',
          cantidad: 'Cantidad',
          precioTotal: 'Precio Total',
          totalFactura: 'Total Factura',
          puntoEntrega: 'Punto de Entrega',
          regionEntrega: 'Region Entrega',
          nuevoPuntoEntrega: 'Nuevo Punto de Entrega',
          activarNuevoPunto: 'Agregar nuevo punto',
          departamento: 'Departamento',
          provincia: 'Provincia',
          distrito: 'Distrito',
          direccion: 'Direccion',
          referencia: 'Referencia',
          destinatario: 'Destinatario',
          dni: 'DNI',
          agencia: 'Agencia',
          puntoSeleccionado: 'Punto de Entrega Seleccionado',
          datosRecibe: 'Datos Recibe',
          nuevoRecibe: 'Agregar nuevo numrecibe',
          codigoNumrecibe: 'Numrecibe',
          numeroRecibe: 'Numero',
          nombreRecibe: 'Nombre',
          nuevoNumero: 'Nuevo Numero',
          nuevoNombre: 'Nuevo Nombre',
          notaRecibe: 'Solo aplica para entregas LIMA.',
          resumenPedido: 'Resumen Pedido',
          resumenFactura: 'Resumen Factura',
          resumenEntrega: 'Resumen Entrega',
          confirmOperacion: 'Confirmo que la informacion es correcta',
          emitirFactura: 'Emitir Factura',
          anterior: 'Anterior',
          siguiente: 'Siguiente',
          logsTitle: 'Logs de SQL',
          loading: 'Procesando...',
          sinPuntosEntrega: 'Sin puntos de entrega registrados',
        },
        messages: {
          errorServer: 'Error al comunicar con el servidor',
          seleccionarPedido: 'Seleccione un pedido para continuar.',
          seleccionarBase: 'Seleccione una base valida.',
          fechaInvalida: 'Fecha de emision invalida.',
          cantidadExcede: 'Cantidad excede saldo permitido.',
          totalInvalido: 'El total de factura debe ser mayor a 0.',
          seleccionarEntrega: 'Seleccione un punto de entrega o agregue uno nuevo.',
          ubigeoInvalido: 'Complete el ubigeo completo.',
          datosRecibe: 'Complete datos de quien recibe.',
          confirmarOperacion: 'Debe confirmar la operacion.',
          facturaOk: 'Factura emitida correctamente.',
          sinLogs: 'Sin logs disponibles.',
        },
      },
      en: {
        stepTitles: [
          'Step 1: Select Order',
          'Step 2: Create Invoice',
          'Step 3: Delivery Data',
          'Step 4: Receiver Data',
          'Step 5: Summary & Issue',
        ],
        stepHints: [
          'Filter and select an order with remaining balance.',
          'Review invoice detail and quantities.',
          'Define delivery point and region.',
          'Capture receiver data if needed.',
          'Review and issue the invoice.',
        ],
        ui: {
          wizardStatus: 'Global IaaS/PaaS Service',
          wizardTitle: 'Order Management',
          wizardSubtitle: 'Issue invoices with coordinated delivery and full order traceability.',
          viewLogs: 'View SQL Logs',
          stepBadge: 'Step',
          clienteFiltro: 'Client',
          fechaFiltro: 'Date',
          filtrar: 'Apply filters',
          pedidosTitulo: 'vPendingOrders',
          sinSeleccion: 'No order selected',
          fechaPedido: 'Order Date',
          codigoPedido: 'Order Code',
          codigoCliente: 'Client Code',
          nombreCliente: 'Client Name',
          fechaEmision: 'Issue Date',
          codigoBase: 'Base Code',
          tipoDocumento: 'Document Type',
          seleccionar: 'Select',
          prodFactura: 'vInvoiceItems',
          codigoProducto: 'Product Code',
          descripcion: 'Description',
          cantidad: 'Quantity',
          precioTotal: 'Total Price',
          totalFactura: 'Invoice Total',
          puntoEntrega: 'Delivery Point',
          regionEntrega: 'Delivery Region',
          nuevoPuntoEntrega: 'New Delivery Point',
          activarNuevoPunto: 'Add new point',
          departamento: 'Department',
          provincia: 'Province',
          distrito: 'District',
          direccion: 'Address',
          referencia: 'Reference',
          destinatario: 'Recipient',
          dni: 'ID',
          agencia: 'Agency',
          puntoSeleccionado: 'Selected Delivery Point',
          datosRecibe: 'Receiver Data',
          nuevoRecibe: 'Add new receiver',
          codigoNumrecibe: 'Receiver',
          numeroRecibe: 'Number',
          nombreRecibe: 'Name',
          nuevoNumero: 'New Number',
          nuevoNombre: 'New Name',
          notaRecibe: 'Only applies for LIMA deliveries.',
          resumenPedido: 'Order Summary',
          resumenFactura: 'Invoice Summary',
          resumenEntrega: 'Delivery Summary',
          confirmOperacion: 'I confirm the information is correct',
          emitirFactura: 'Issue Invoice',
          anterior: 'Previous',
          siguiente: 'Next',
          logsTitle: 'SQL Logs',
          loading: 'Processing...',
          sinPuntosEntrega: 'No delivery points registered',
        },
        messages: {
          errorServer: 'Error communicating with server',
          seleccionarPedido: 'Select an order to continue.',
          seleccionarBase: 'Select a valid base.',
          fechaInvalida: 'Invalid issue date.',
          cantidadExcede: 'Quantity exceeds allowed balance.',
          totalInvalido: 'Invoice total must be greater than 0.',
          seleccionarEntrega: 'Select a delivery point or create a new one.',
          ubigeoInvalido: 'Complete the full ubigeo.',
          datosRecibe: 'Complete receiver data.',
          confirmarOperacion: 'You must confirm the operation.',
          facturaOk: 'Invoice issued successfully.',
          sinLogs: 'No logs available.',
        },
      },
    };

    this.bindEvents();
    this.applyLocale();
    this.init();
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.prevStep());
    this.nextBtn.addEventListener('click', () => this.nextStep());
    this.emitirBtn.addEventListener('click', () => this.emitirFactura());
    this.filtrarBtn.addEventListener('click', () => this.loadPedidos());
    this.viewLogsBtn.addEventListener('click', () => this.showLogs());

    this.usarNuevoPunto.addEventListener('change', () => this.toggleNuevoPunto());
    this.puntoEntregaSelect.addEventListener('change', () => this.onPuntoEntregaChange());
    this.regionEntrega.addEventListener('change', () => this.onRegionChange());

    this.departamento.addEventListener('change', () => this.loadProvincias());
    this.provincia.addEventListener('change', () => this.loadDistritos());

    this.usarNuevoRecibe.addEventListener('change', () => this.toggleNuevoRecibe());
    this.numrecibeSelect.addEventListener('change', () => this.onNumrecibeChange());
  }

  applyLocale() {
    const lang = this.state.locale.startsWith('es') ? 'es' : 'en';
    this.activeLang = lang;
    document.documentElement.lang = lang;
    const texts = this.dictionary[lang].ui;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      if (texts[key]) {
        node.textContent = texts[key];
      }
    });
    this.updateStepMeta();
  }

  updateStepMeta() {
    const stepIndex = this.currentStep;
    const meta = this.dictionary[this.activeLang];
    const stepNumber = stepIndex + 1;
    this.stepBadge.textContent = `${meta.ui.stepBadge} ${stepNumber}`;
    this.stepTitle.textContent = meta.stepTitles[stepIndex];
    this.stepHint.textContent = meta.stepHints[stepIndex];
  }

  showMessage(type, message) {
    if (type === 'error') {
      this.errorBox.textContent = message;
      this.errorBox.classList.remove('d-none');
      this.successBox.classList.add('d-none');
    } else {
      this.successBox.textContent = message;
      this.successBox.classList.remove('d-none');
      this.errorBox.classList.add('d-none');
    }
  }

  clearMessages() {
    this.errorBox.classList.add('d-none');
    this.successBox.classList.add('d-none');
  }

  setLoading(active, text) {
    if (active) {
      this.loadingText.textContent = text || this.dictionary[this.activeLang].ui.loading;
      this.loadingOverlay.classList.add('active');
    } else {
      this.loadingOverlay.classList.remove('active');
    }
  }

  async init() {
    this.fechaEmision.valueAsDate = new Date();
    await Promise.all([this.loadPedidos(), this.loadBases(), this.loadProductos(), this.loadDepartamentos()]);
    this.toggleNuevoPunto();
    this.toggleNuevoRecibe();
    this.updateStep();
  }

  updateStep() {
    this.steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.currentStep);
    });
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.progressBar.setAttribute('aria-valuenow', Math.round(progress));
    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.classList.toggle('d-none', this.currentStep === this.steps.length - 1);
    this.emitirBtn.classList.toggle('d-none', this.currentStep !== this.steps.length - 1);
    this.updateStepMeta();
  }

  nextStep() {
    if (!this.validateStep()) {
      return;
    }
    if (this.currentStep === 2 && this.regionEntrega.value === 'PROV') {
      this.currentStep = 4;
    } else {
      this.currentStep = Math.min(this.currentStep + 1, this.steps.length - 1);
    }
    this.updateStep();
    if (this.currentStep === 4) {
      this.updateResumen();
    }
  }

  prevStep() {
    if (this.currentStep === 4 && this.regionEntrega.value === 'PROV') {
      this.currentStep = 2;
    } else {
      this.currentStep = Math.max(this.currentStep - 1, 0);
    }
    this.updateStep();
  }

  validateStep() {
    const { messages } = this.dictionary[this.activeLang];
    this.clearMessages();

    if (this.currentStep === 0) {
      if (!this.state.selectedPedido) {
        this.showMessage('error', messages.seleccionarPedido);
        return false;
      }
    }

    if (this.currentStep === 1) {
      if (!this.regex.fecha.test(this.fechaEmision.value)) {
        this.showMessage('error', messages.fechaInvalida);
        return false;
      }
      if (!this.codigoBase.value) {
        this.showMessage('error', messages.seleccionarBase);
        return false;
      }
      if (this.state.totalFactura <= 0) {
        this.showMessage('error', messages.totalInvalido);
        return false;
      }
    }

    if (this.currentStep === 2) {
      const usingNew = this.usarNuevoPunto.checked;
      if (!usingNew && !this.puntoEntregaSelect.value) {
        this.showMessage('error', messages.seleccionarEntrega);
        return false;
      }
      if (usingNew && !this.regionEntrega.value) {
        this.showMessage('error', messages.seleccionarEntrega);
        return false;
      }
      if (usingNew) {
        if (!this.departamento.value || !this.provincia.value || !this.distrito.value) {
          this.showMessage('error', messages.ubigeoInvalido);
          return false;
        }
      }
    }

    if (this.currentStep === 3 && this.regionEntrega.value === 'LIMA') {
      if (this.usarNuevoRecibe.checked) {
        if (!this.regex.texto.test(this.nuevoNumero.value) || !this.regex.texto.test(this.nuevoNombre.value)) {
          this.showMessage('error', messages.datosRecibe);
          return false;
        }
      } else if (!this.numrecibeSelect.value) {
        this.showMessage('error', messages.datosRecibe);
        return false;
      }
    }

    return true;
  }

  async loadPedidos() {
    this.setLoading(true);
    try {
      const cliente = encodeURIComponent(this.clienteFiltro.value.trim());
      const fecha = encodeURIComponent(this.fechaFiltro.value.trim());
      const data = await this.fetchJson(`/api/pedidos?cliente=${cliente}&fecha=${fecha}`);
      this.state.pedidos = data;
      this.renderPedidos();
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    } finally {
      this.setLoading(false);
    }
  }

  renderPedidos() {
    this.pedidosTableBody.innerHTML = '';
    this.state.pedidos.forEach((pedido) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${pedido.fecha_pedido || '-'}</td>
        <td>${pedido.codigo_pedido}</td>
        <td>${pedido.codigo_cliente}</td>
        <td>${pedido.nombre_cliente || '-'}</td>
        <td><button class="btn btn-sm btn-primary" type="button">${
          this.dictionary[this.activeLang].ui.seleccionar
        }</button></td>
      `;
      row.querySelector('button').addEventListener('click', () => this.selectPedido(pedido));
      this.pedidosTableBody.appendChild(row);
    });
  }

  async selectPedido(pedido) {
    this.state.selectedPedido = pedido;
    this.selectedPedidoLabel.textContent = `${pedido.codigo_pedido} - ${pedido.nombre_cliente || ''}`.trim();
    this.pedidoResumen.textContent = `Pedido ${pedido.codigo_pedido} (${pedido.codigo_cliente})`;
    await this.loadPedidoDetalle(pedido.codigo_pedido);
    await this.loadPuntosEntrega(pedido.codigo_cliente);
    await this.loadNumrecibe(pedido.codigo_cliente);
  }

  async loadPedidoDetalle(codigoPedido) {
    this.setLoading(true);
    try {
      const data = await this.fetchJson(`/api/pedidos/detalle?codigo=${encodeURIComponent(codigoPedido)}`);
      this.state.facturaItems = data.map((item) => {
        const saldo = Number(item.saldo || 0);
        const cantidadPedido = Number(item.cantidad || 0);
        const totalPedido = Number(item.precio_total || 0);
        const unitPrice = cantidadPedido ? totalPedido / cantidadPedido : 0;
        const cantidadFactura = saldo;
        const precioFactura = unitPrice * cantidadFactura;
        return {
          codigo_producto: item.codigo_producto,
          descripcion: item.descripcion || item.nombre || '',
          saldo,
          cantidad_pedido: cantidadPedido,
          precio_total_pedido: totalPedido,
          unit_price: unitPrice,
          cantidad_factura: cantidadFactura,
          precio_total_factura: precioFactura,
        };
      });
      this.renderFacturaItems();
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    } finally {
      this.setLoading(false);
    }
  }

  renderFacturaItems() {
    this.facturaTableBody.innerHTML = '';
    this.state.facturaItems.forEach((item, index) => {
      const row = document.createElement('tr');
      const options = this.state.productos
        .map((producto) => {
          const selected = producto.codigo_producto === item.codigo_producto ? 'selected' : '';
          return `<option value="${producto.codigo_producto}" ${selected}>${producto.codigo_producto}</option>`;
        })
        .join('');
      row.innerHTML = `
        <td>
          <select class="form-select form-select-sm" data-index="${index}">${options}</select>
        </td>
        <td class="small-muted" data-field="descripcion">${item.descripcion}</td>
        <td>
          <input class="form-control form-control-sm" type="number" min="0" step="1" value="${item.cantidad_factura}" data-index="${index}" />
          <div class="small-muted">Saldo: ${item.saldo}</div>
        </td>
        <td class="text-end" data-field="precio">${item.precio_total_factura.toFixed(2)}</td>
      `;
      row.querySelector('select').addEventListener('change', (event) => this.onProductoChange(event));
      row.querySelector('input').addEventListener('input', (event) => this.onCantidadChange(event));
      this.facturaTableBody.appendChild(row);
    });
    this.updateTotalFactura();
  }

  onProductoChange(event) {
    const index = Number(event.target.dataset.index);
    const codigo = event.target.value;
    const producto = this.state.productos.find((item) => item.codigo_producto === codigo);
    if (producto) {
      this.state.facturaItems[index].codigo_producto = codigo;
      this.state.facturaItems[index].descripcion = producto.nombre || producto.descripcion || '';
      const row = event.target.closest('tr');
      row.querySelector('[data-field="descripcion"]').textContent = this.state.facturaItems[index].descripcion;
    }
  }

  onCantidadChange(event) {
    const index = Number(event.target.dataset.index);
    const cantidad = Number(event.target.value || 0);
    const item = this.state.facturaItems[index];
    if (cantidad > item.saldo) {
      event.target.value = item.saldo;
      this.showMessage('error', this.dictionary[this.activeLang].messages.cantidadExcede);
      item.cantidad_factura = item.saldo;
    } else {
      item.cantidad_factura = cantidad;
    }
    item.precio_total_factura = item.unit_price * item.cantidad_factura;
    const row = event.target.closest('tr');
    row.querySelector('[data-field="precio"]').textContent = item.precio_total_factura.toFixed(2);
    this.updateTotalFactura();
  }

  updateTotalFactura() {
    const total = this.state.facturaItems.reduce((sum, item) => sum + Number(item.precio_total_factura || 0), 0);
    this.state.totalFactura = Number(total.toFixed(2));
    this.totalFacturaEl.textContent = this.state.totalFactura.toFixed(2);
  }

  async loadBases() {
    try {
      const data = await this.fetchJson('/api/bases');
      this.state.bases = data;
      this.codigoBase.innerHTML = `<option value="">${this.dictionary[this.activeLang].ui.seleccionar}</option>`;
      data.forEach((base) => {
        const option = document.createElement('option');
        option.value = base.codigo_base || base.codigo;
        option.textContent = base.nombre || base.codigo_base || base.codigo;
        this.codigoBase.appendChild(option);
      });
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    }
  }

  async loadProductos() {
    try {
      const data = await this.fetchJson('/api/productos');
      this.state.productos = data;
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    }
  }

  async loadPuntosEntrega(codigoCliente) {
    try {
      const data = await this.fetchJson(`/api/puntos-entrega?cliente=${encodeURIComponent(codigoCliente)}`);
      this.state.puntosEntrega = data;
      this.puntoEntregaSelect.innerHTML = `<option value="">${this.dictionary[this.activeLang].ui.seleccionar}</option>`;
      if (!data.length) {
        this.sinPuntosEntrega.textContent = this.dictionary[this.activeLang].ui.sinPuntosEntrega;
        this.puntoEntregaSelect.disabled = true;
        this.usarNuevoPunto.checked = true;
        this.toggleNuevoPunto();
      } else {
        this.sinPuntosEntrega.textContent = '';
        this.puntoEntregaSelect.disabled = false;
        data.forEach((punto) => {
          const option = document.createElement('option');
          option.value = punto.codigo_puntoentrega;
          option.textContent = `${punto.codigo_puntoentrega} - ${punto.direccion_linea || punto.direccion || ''}`;
          this.puntoEntregaSelect.appendChild(option);
        });
      }
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    }
  }

  onPuntoEntregaChange() {
    const selected = this.state.puntosEntrega.find(
      (punto) => String(punto.codigo_puntoentrega) === this.puntoEntregaSelect.value
    );
    if (selected) {
      this.regionEntrega.value = selected.region_entrega || '';
      this.puntoUbigeo.textContent = selected.ubigeo || '-';
      this.puntoDireccion.textContent = selected.direccion_linea || selected.direccion || '-';
      this.puntoRegion.textContent = selected.region_entrega || '-';
      this.usarNuevoPunto.checked = false;
      this.toggleNuevoPunto();
    }
  }

  toggleNuevoPunto() {
    const usingNew = this.usarNuevoPunto.checked;
    this.nuevoPuntoPanel.style.display = usingNew ? 'block' : 'none';
    this.puntoSeleccionadoPanel.style.display = usingNew ? 'none' : 'block';
  }

  onRegionChange() {
    if (this.regionEntrega.value === 'PROV') {
      this.usarNuevoRecibe.checked = false;
      this.toggleNuevoRecibe();
    }
  }

  async loadDepartamentos() {
    try {
      const data = await this.fetchJson('/api/ubigeo/departamentos');
      this.state.departamentos = data;
      this.departamento.innerHTML = `<option value="">${this.dictionary[this.activeLang].ui.seleccionar}</option>`;
      data.forEach((dep) => {
        const option = document.createElement('option');
        option.value = dep.codigo_departamento || dep.codigo;
        option.textContent = dep.nombre || dep.descripcion || dep.codigo_departamento;
        this.departamento.appendChild(option);
      });
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    }
  }

  async loadProvincias() {
    const dep = this.departamento.value;
    if (!dep) return;
    try {
      const data = await this.fetchJson(`/api/ubigeo/provincias?dep=${encodeURIComponent(dep)}`);
      this.state.provincias = data;
      this.provincia.innerHTML = `<option value="">${this.dictionary[this.activeLang].ui.seleccionar}</option>`;
      data.forEach((prov) => {
        const option = document.createElement('option');
        option.value = prov.codigo_provincia || prov.codigo;
        option.textContent = prov.nombre || prov.descripcion || prov.codigo_provincia;
        this.provincia.appendChild(option);
      });
      this.distrito.innerHTML = `<option value="">${this.dictionary[this.activeLang].ui.seleccionar}</option>`;
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    }
  }

  async loadDistritos() {
    const dep = this.departamento.value;
    const prov = this.provincia.value;
    if (!dep || !prov) return;
    try {
      const data = await this.fetchJson(
        `/api/ubigeo/distritos?dep=${encodeURIComponent(dep)}&prov=${encodeURIComponent(prov)}`
      );
      this.state.distritos = data;
      this.distrito.innerHTML = `<option value="">${this.dictionary[this.activeLang].ui.seleccionar}</option>`;
      data.forEach((dist) => {
        const option = document.createElement('option');
        option.value = dist.codigo_distrito || dist.codigo;
        option.textContent = dist.nombre || dist.descripcion || dist.codigo_distrito;
        this.distrito.appendChild(option);
      });
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    }
  }

  async loadNumrecibe(codigoCliente) {
    try {
      const data = await this.fetchJson(`/api/numrecibe?cliente=${encodeURIComponent(codigoCliente)}`);
      this.state.numrecibe = data;
      this.numrecibeSelect.innerHTML = `<option value="">${this.dictionary[this.activeLang].ui.seleccionar}</option>`;
      data.forEach((recibe) => {
        const option = document.createElement('option');
        option.value = recibe.codigo_cliente_numrecibe || recibe.codigo;
        option.textContent = `${recibe.numero || ''} - ${recibe.nombre || ''}`.trim();
        option.dataset.numero = recibe.numero || '';
        option.dataset.nombre = recibe.nombre || '';
        this.numrecibeSelect.appendChild(option);
      });
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    }
  }

  onNumrecibeChange() {
    const selected = this.numrecibeSelect.options[this.numrecibeSelect.selectedIndex];
    if (!selected) return;
    this.numeroRecibe.value = selected.dataset.numero || '';
    this.nombreRecibe.value = selected.dataset.nombre || '';
  }

  toggleNuevoRecibe() {
    const usingNew = this.usarNuevoRecibe.checked;
    this.numrecibeSelect.disabled = usingNew;
    this.numeroRecibe.readOnly = true;
    this.nombreRecibe.readOnly = true;
    this.nuevoNumero.disabled = !usingNew;
    this.nuevoNombre.disabled = !usingNew;
  }

  updateResumen() {
    const pedido = this.state.selectedPedido;
    if (!pedido) return;
    const entrega = this.getEntregaPayload();
    this.resumenPedido.textContent = `Pedido ${pedido.codigo_pedido} - ${pedido.nombre_cliente || ''}`.trim();
    this.resumenFactura.textContent = `Base ${this.codigoBase.value} | Total ${this.state.totalFactura.toFixed(2)}`;
    this.resumenEntrega.textContent = `Region ${entrega.region_entrega || '-'} | Ubigeo ${entrega.ubigeo || '-'}`;
  }

  getEntregaPayload() {
    const usingNew = this.usarNuevoPunto.checked;
    if (usingNew) {
      const ubigeo = `${this.departamento.value}${this.provincia.value}${this.distrito.value}`;
      return {
        mode: 'new',
        ubigeo,
        region_entrega: this.regionEntrega.value,
        direccion_linea: this.direccion.value.trim(),
        referencia: this.referencia.value.trim(),
        destinatario_nombre: this.destinatario.value.trim(),
        destinatario_dni: this.dni.value.trim(),
        agencia: this.agencia.value.trim(),
      };
    }
    const selected = this.state.puntosEntrega.find(
      (punto) => String(punto.codigo_puntoentrega) === this.puntoEntregaSelect.value
    );
    return {
      mode: 'existing',
      codigo_puntoentrega: selected ? selected.codigo_puntoentrega : null,
      ubigeo: selected ? selected.ubigeo : null,
      region_entrega: selected ? selected.region_entrega : this.regionEntrega.value,
    };
  }

  getRecibePayload() {
    if (this.regionEntrega.value !== 'LIMA') {
      return { mode: 'none' };
    }
    if (this.usarNuevoRecibe.checked) {
      return {
        mode: 'new',
        numero: this.nuevoNumero.value.trim(),
        nombre: this.nuevoNombre.value.trim(),
      };
    }
    return {
      mode: 'existing',
      codigo_cliente_numrecibe: this.numrecibeSelect.value,
      numero: this.numeroRecibe.value,
      nombre: this.nombreRecibe.value,
    };
  }

  async emitirFactura() {
    const { messages } = this.dictionary[this.activeLang];
    if (!this.confirmOperacion.checked) {
      this.showMessage('error', messages.confirmarOperacion);
      return;
    }
    this.setLoading(true, this.dictionary[this.activeLang].ui.loading);
    try {
      const payload = {
        pedido: this.state.selectedPedido,
        factura: {
          fecha_emision: this.fechaEmision.value,
          codigo_base: this.codigoBase.value,
          tipo_documento: this.tipoDocumento.value,
          total: this.state.totalFactura,
        },
        detalles: this.state.facturaItems,
        entrega: this.getEntregaPayload(),
        recibe: this.getRecibePayload(),
      };
      const result = await this.fetchJson('/api/facturas/emitir', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.showMessage('success', `${messages.facturaOk} #${result.numero_documento}`);
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    } finally {
      this.setLoading(false);
    }
  }

  async showLogs() {
    try {
      const data = await this.fetchJson('/api/logs');
      this.logsContent.textContent = data.content || this.dictionary[this.activeLang].messages.sinLogs;
      this.logsModal.show();
    } catch (error) {
      this.showMessage('error', this.dictionary[this.activeLang].messages.errorServer);
    }
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
