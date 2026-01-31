/*
SPs de lectura (segun Promts/PromtsERP/_procedimientos_campos.md)

vPedidosPendientes = Llamada SP: get_pedidospendientes() (devuelve campo_visible)
Campos devueltos: codigo_pedido, codigo_cliente, nombre_cliente, numero_cliente, fecha, created_at
Variables (visibilidad/edicion):
vcodigo_pedido (no visible, no editable)
vcodigo_cliente (no visible, no editable)
vnombre_cliente (visible, no editable)
vnumero_cliente (visible, no editable)
vfecha (visible, no editable)

vPedidoDetalle = Llamada SP: get_pedido_detalle_por_pedido(p_codigo_pedido) (devuelve campo_visible)
Campos devueltos: codigo_producto, nombre_producto, saldo, precio_unitario
Variables (visibilidad/edicion):
vcodigo_producto (no visible, no editable)
vnombre_producto (visible, no editable)
vcantidad_producto (visible, editable)
vprecio_unitario (no visible, no editable)

vBases = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos: codigo_base, nombre
Variables (visibilidad/edicion):
vcodigo_base (visible, editable)
vnombre_base (visible, no editable)

vPuntosEntrega = Llamada SP: get_puntos_entrega(p_codigo_cliente) (devuelve campo_visible)
Campos devueltos: cod_dep, cod_prov, cod_dist, departamento, provincia, distrito, ubigeo, codigo_puntoentrega, codigo_cliente, region_entrega, direccion_linea, referencia, nombre, dni, agencia, observaciones, concatenarpuntoentrega, estado
Variables (visibilidad/edicion):
vcodigo_puntoentrega (visible, editable)
vconcatenarpuntoentrega (visible, no editable)

vDepartamentos = Llamada SP: get_ubigeo_departamentos() (devuelve campo_visible)
Campos devueltos: cod_dep, departamento
Variables (visibilidad/edicion):
vcod_dep (visible, editable)
vdepartamento (visible, no editable)

vProvincias = Llamada SP: get_ubigeo_provincias(p_cod_dep) (devuelve campo_visible)
Campos devueltos: cod_prov, provincia
Variables (visibilidad/edicion):
vcod_prov (visible, editable)
vprovincia (visible, no editable)

vDistritos = Llamada SP: get_ubigeo_distritos(p_cod_dep, p_cod_prov) (devuelve campo_visible)
Campos devueltos: cod_dist, distrito
Variables (visibilidad/edicion):
vcod_dist (visible, editable)
vdistrito (visible, no editable)

vNumRecibe = Llamada SP: get_numrecibe(p_codigo_cliente) (devuelve campo_visible)
Campos devueltos: codigo_cliente_numrecibe, ordinal_numrecibe, numero, nombre, concatenarnumrecibe
Variables (visibilidad/edicion):
vcodigo_cliente_numrecibe (no visible, no editable)
vordinal_numrecibe (no visible, no editable)
vnumero_recibe (visible, editable)
vnombre_recibe (visible, editable)
vconcatenarnumrecibe (visible, no editable)

vCuentasBancarias = Llamada SP: get_cuentasbancarias() (devuelve campo_visible)
Campos devueltos: codigo_cuentabancaria, nombre, banco
Variables (visibilidad/edicion):
vcodigo_cuentabancaria (visible, editable)
vnombre_cuentabancaria (visible, no editable)
vbanco_cuentabancaria (visible, no editable)
*/

class FormWizard {
  constructor() {
    this.step = 1;
    this.totalSteps = 6;
    this.state = {
      pedido: null,
      pedidoDetalle: [],
      factura: {
        esNueva: true,
        vTipo_documento: 'FAC',
        vNumero_documento: '',
        vCodigo_base: '',
        vFecha_emision: '',
        vHora_emision: '',
        vFechaP: '',
      },
      entrega: {
        modo: 'existente',
        vCodigo_puntoentrega: '',
        vCod_Dep: '',
        vCod_Prov: '',
        vCod_Dist: '',
        vRegion_Entrega: 'PROV',
        Vdireccion_linea: '',
        Vreferencia: '',
        Vnombre: '',
        Vdni: '',
        Vagencia: '',
        Vobservaciones: '',
        Vconcatenarpuntoentrega: '',
      },
      recibe: {
        modo: 'existente',
        vCodigoClienteNumrecibe: '',
        vNumeroRecibe: '',
        vNombreRecibe: '',
        Vordinal_numrecibe: null,
        Vconcatenarnumrecibe: '',
      },
      pago: {
        vTipo_documento_pago: 'RCP',
        vNumero_documento_pago: '',
        vCuentaBancaria: '',
        vMontoPago: '',
      },
      totals: {
        vFsaldo: 0,
      },
    };

    this.cache = {
      pedidos: [],
      bases: [],
      puntosEntrega: [],
      departamentos: [],
      provincias: [],
      distritos: [],
      numrecibe: [],
      cuentas: [],
    };

    this.init();
  }

  init() {
    this.setupI18n();
    this.bindNav();
    this.renderStepTrack();
    this.loadInitialData();
    this.bindStepEvents();
    this.showStep(1);
  }

  setupI18n() {
    const language = navigator.language || 'es';
    document.documentElement.lang = language;

    const strings = {
      es: {
        title: 'Gestión de Pedido y Facturación',
        subtitle: 'Flujo seguro para seleccionar pedidos pendientes, emitir factura, registrar entrega y pagos.',
        progressHint: 'Completa los datos solicitados para continuar.',
        step1Title: '1. Seleccionar Pedido',
        step1Desc: 'Elige un pedido pendiente para iniciar la factura.',
        filterClient: 'Filtrar por cliente',
        filterDate: 'Filtrar por fecha',
        reloadGrid: 'Recargar pedidos',
        colFecha: 'Fecha',
        colCodigo: 'Código pedido',
        colCliente: 'Cliente',
        colNumero: 'Número',
        step2Title: '2. Crear Factura',
        step2Desc: 'Confirma base, fecha y cantidades facturadas.',
        baseLabel: 'Base',
        fechaEmision: 'Fecha emisión',
        horaEmision: 'Hora emisión',
        tipoDoc: 'Tipo documento',
        numDoc: 'Número documento',
        facturaExistente: '¿Factura existente?',
        facturaExistenteHint: 'Marcar si ya existe un número',
        colProducto: 'Producto',
        colCantidad: 'Cantidad',
        colTotal: 'Precio total',
        totalFactura: 'Total factura',
        step3Title: '3. Datos de Entrega',
        step3Desc: 'Selecciona un punto de entrega existente o registra uno nuevo.',
        existing: 'Existe',
        new: 'Nuevo',
        puntoEntrega: 'Punto de entrega',
        departamento: 'Departamento',
        provincia: 'Provincia',
        distrito: 'Distrito',
        direccion: 'Dirección',
        referencia: 'Referencia',
        nombre: 'Nombre',
        dni: 'DNI',
        agencia: 'Agencia',
        observaciones: 'Observaciones',
        step4Title: '4. Datos Recibe',
        step4Desc: 'Registra quién recibe el pedido (solo Lima).',
        recibe: 'Recibe',
        numeroRecibe: 'Número',
        nombreRecibe: 'Nombre',
        step5Title: '5. Registro de Pago',
        step5Desc: 'Registra el recibo de pago (opcional).',
        tipoDocPago: 'Tipo documento',
        numDocPago: 'Número documento',
        cuentaBancaria: 'Cuenta bancaria',
        montoPago: 'Monto pago',
        montoPagoHint: 'Dejar vacío o 0 para no registrar pago.',
        step6Title: '6. Resumen y Emitir Factura',
        step6Desc: 'Revisa toda la información antes de confirmar.',
        summaryPedido: 'Resumen Pedido',
        summaryFactura: 'Resumen Factura',
        summaryEntrega: 'Resumen Entrega',
        summaryRecibe: 'Resumen Recibe',
        summaryPago: 'Resumen Pago',
        confirmOperacion: 'Confirmo que los datos son correctos y deseo emitir la factura.',
        emitirFactura: 'Emitir Factura',
        prev: 'Anterior',
        next: 'Siguiente',
        loading: 'Cargando...',
      },
      en: {
        title: 'Order Management & Billing',
        subtitle: 'Secure flow to select pending orders, issue invoices, register delivery and payments.',
        progressHint: 'Complete the required data to continue.',
        step1Title: '1. Select Order',
        step1Desc: 'Choose a pending order to start invoicing.',
        filterClient: 'Filter by client',
        filterDate: 'Filter by date',
        reloadGrid: 'Reload orders',
        colFecha: 'Date',
        colCodigo: 'Order code',
        colCliente: 'Client',
        colNumero: 'Number',
        step2Title: '2. Create Invoice',
        step2Desc: 'Confirm base, date, and quantities.',
        baseLabel: 'Base',
        fechaEmision: 'Issue date',
        horaEmision: 'Issue time',
        tipoDoc: 'Document type',
        numDoc: 'Document number',
        facturaExistente: 'Existing invoice?',
        facturaExistenteHint: 'Check if the number already exists',
        colProducto: 'Product',
        colCantidad: 'Quantity',
        colTotal: 'Total price',
        totalFactura: 'Invoice total',
        step3Title: '3. Delivery Data',
        step3Desc: 'Select an existing delivery point or register a new one.',
        existing: 'Existing',
        new: 'New',
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
        step4Title: '4. Recipient Data',
        step4Desc: 'Register who receives the order (Lima only).',
        recibe: 'Recipient',
        numeroRecibe: 'Number',
        nombreRecibe: 'Name',
        step5Title: '5. Payment Receipt',
        step5Desc: 'Register payment receipt (optional).',
        tipoDocPago: 'Document type',
        numDocPago: 'Document number',
        cuentaBancaria: 'Bank account',
        montoPago: 'Payment amount',
        montoPagoHint: 'Leave empty or 0 to skip payment.',
        step6Title: '6. Summary & Issue Invoice',
        step6Desc: 'Review all information before confirming.',
        summaryPedido: 'Order Summary',
        summaryFactura: 'Invoice Summary',
        summaryEntrega: 'Delivery Summary',
        summaryRecibe: 'Recipient Summary',
        summaryPago: 'Payment Summary',
        confirmOperacion: 'I confirm the data is correct and want to issue the invoice.',
        emitirFactura: 'Issue Invoice',
        prev: 'Back',
        next: 'Next',
        loading: 'Loading...',
      },
    };

    const locale = language.startsWith('es') ? 'es' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (strings[locale] && strings[locale][key]) {
        el.textContent = strings[locale][key];
      }
    });
  }

  bindNav() {
    this.btnPrev = document.getElementById('btnPrev');
    this.btnNext = document.getElementById('btnNext');

    this.btnPrev.addEventListener('click', () => this.prevStep());
    this.btnNext.addEventListener('click', () => this.nextStep());

    document.getElementById('btnEmitir').addEventListener('click', () => this.emitirFactura());
  }

  renderStepTrack() {
    const track = document.getElementById('stepTrack');
    track.innerHTML = '';
    for (let i = 1; i <= this.totalSteps; i += 1) {
      const dot = document.createElement('div');
      dot.className = 'step-dot';
      track.appendChild(dot);
    }
  }

  bindStepEvents() {
    document.getElementById('btnRecargarPedidos').addEventListener('click', () => this.loadPedidos());
    document.getElementById('filterCliente').addEventListener('input', () => this.renderPedidos());
    document.getElementById('filterFecha').addEventListener('change', () => this.renderPedidos());

    document.getElementById('facturaExistente').addEventListener('change', (event) => {
      this.state.factura.esNueva = !event.target.checked;
      const numeroInput = document.getElementById('numeroDocumento');
      if (event.target.checked) {
        numeroInput.removeAttribute('readonly');
        numeroInput.value = '';
      } else {
        numeroInput.setAttribute('readonly', 'readonly');
        this.fetchNextFactura();
      }
    });

    document.getElementById('fechaEmision').addEventListener('change', (e) => {
      this.state.factura.vFecha_emision = e.target.value;
    });
    document.getElementById('horaEmision').addEventListener('change', (e) => {
      this.state.factura.vHora_emision = e.target.value;
    });

    document.getElementById('entregaExistente').addEventListener('change', () => this.toggleEntregaModo('existente'));
    document.getElementById('entregaNuevo').addEventListener('change', () => this.toggleEntregaModo('nuevo'));
    document.getElementById('recibeExistente').addEventListener('change', () => this.toggleRecibeModo('existente'));
    document.getElementById('recibeNuevo').addEventListener('change', () => this.toggleRecibeModo('nuevo'));

    document.getElementById('montoPago').addEventListener('input', (e) => {
      this.state.pago.vMontoPago = e.target.value.trim();
    });
  }

  async loadInitialData() {
    await Promise.all([
      this.loadPedidos(),
      this.loadBases(),
      this.loadCuentas(),
    ]);

    this.initTypeahead();
    this.fetchNextFactura();
    this.fetchNextRecibo();
  }

  initTypeahead() {
    this.baseTypeahead = new Typeahead('baseTypeahead', {
      placeholder: 'Buscar base',
      onSelect: (item) => {
        this.state.factura.vCodigo_base = item.value;
      },
    });
    this.baseTypeahead.setOptions(this.cache.bases.map((base) => ({
      label: `${base.nombre} (${base.codigo_base})`,
      value: base.codigo_base,
    })));

    this.puntoEntregaTypeahead = new Typeahead('puntoEntregaTypeahead', {
      placeholder: 'Buscar punto de entrega',
      onSelect: (item) => {
        this.state.entrega.vCodigo_puntoentrega = item.value;
        this.state.entrega.Vconcatenarpuntoentrega = item.label;
        this.state.entrega.vRegion_Entrega = item.region_entrega || this.state.entrega.vRegion_Entrega;
        this.state.entrega.vCod_Dep = item.cod_dep || this.state.entrega.vCod_Dep;
        this.state.entrega.vCod_Prov = item.cod_prov || this.state.entrega.vCod_Prov;
        this.state.entrega.vCod_Dist = item.cod_dist || this.state.entrega.vCod_Dist;
      },
    });

    this.depTypeahead = new Typeahead('depTypeahead', {
      placeholder: 'Buscar departamento',
      onSelect: (item) => {
        this.state.entrega.vCod_Dep = item.value;
        this.loadProvincias(item.value);
        this.computeRegion();
      },
    });

    this.provTypeahead = new Typeahead('provTypeahead', {
      placeholder: 'Buscar provincia',
      onSelect: (item) => {
        this.state.entrega.vCod_Prov = item.value;
        this.loadDistritos(this.state.entrega.vCod_Dep, item.value);
        this.computeRegion();
      },
    });

    this.distTypeahead = new Typeahead('distTypeahead', {
      placeholder: 'Buscar distrito',
      onSelect: (item) => {
        this.state.entrega.vCod_Dist = item.value;
        this.computeRegion();
      },
    });

    this.recibeTypeahead = new Typeahead('recibeTypeahead', {
      placeholder: 'Buscar recibe',
      onSelect: (item) => {
        this.state.recibe.vCodigoClienteNumrecibe = item.codigo_cliente_numrecibe;
        this.state.recibe.Vordinal_numrecibe = item.ordinal_numrecibe;
        this.state.recibe.Vconcatenarnumrecibe = item.label;
      },
    });

    this.cuentaTypeahead = new Typeahead('cuentaTypeahead', {
      placeholder: 'Buscar cuenta bancaria',
      onSelect: (item) => {
        this.state.pago.vCuentaBancaria = item.value;
      },
    });
    this.cuentaTypeahead.setOptions(this.cache.cuentas.map((cuenta) => ({
      label: `${cuenta.nombre} · ${cuenta.banco}`,
      value: cuenta.codigo_cuentabancaria,
    })));
  }

  async loadPedidos() {
    this.showLoading(true);
    try {
      const response = await fetch('/api/pedidos-pendientes');
      if (!response.ok) throw new Error('No se pudo cargar pedidos');
      const data = await response.json();
      this.cache.pedidos = data || [];
      this.renderPedidos();
    } catch (error) {
      this.showError(error.message || 'Error cargando pedidos');
    } finally {
      this.showLoading(false);
    }
  }

  renderPedidos() {
    const filtroCliente = document.getElementById('filterCliente').value.toLowerCase();
    const filtroFecha = document.getElementById('filterFecha').value;
    const tbody = document.querySelector('#tablaPedidos tbody');
    tbody.innerHTML = '';

    const pedidos = this.cache.pedidos.filter((pedido) => {
      const matchesCliente = !filtroCliente || pedido.nombre_cliente.toLowerCase().includes(filtroCliente);
      const matchesFecha = !filtroFecha || pedido.fecha.startsWith(filtroFecha);
      return matchesCliente && matchesFecha;
    });

    pedidos.forEach((pedido) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${this.formatDate(pedido.fecha)}</td>
        <td>${pedido.codigo_pedido}</td>
        <td>${pedido.nombre_cliente}</td>
        <td>${pedido.numero_cliente}</td>
      `;
      tr.addEventListener('click', () => this.selectPedido(pedido));
      tbody.appendChild(tr);
    });
  }

  async selectPedido(pedido) {
    this.state.pedido = {
      vcodigo_pedido: pedido.codigo_pedido,
      vcodigo_cliente: pedido.codigo_cliente,
      vnombre_cliente: pedido.nombre_cliente,
      vnumero_cliente: pedido.numero_cliente,
      vfecha: pedido.fecha,
    };

    document.getElementById('pedidoSeleccionado').textContent =
      `Pedido #${pedido.codigo_pedido} · ${pedido.nombre_cliente} (${pedido.numero_cliente})`;

    await Promise.all([
      this.loadPedidoDetalle(pedido.codigo_pedido),
      this.loadPuntosEntrega(pedido.codigo_cliente),
      this.loadDepartamentos(),
      this.loadNumRecibe(pedido.codigo_cliente),
    ]);
  }

  async loadPedidoDetalle(codigoPedido) {
    this.showLoading(true);
    try {
      const response = await fetch(`/api/pedido-detalle?codigo_pedido=${encodeURIComponent(codigoPedido)}`);
      if (!response.ok) throw new Error('No se pudo cargar detalle');
      const data = await response.json();
      this.state.pedidoDetalle = data.map((row) => {
        const vCantidadProducto = Number(row.saldo || 0);
        const vPrecioUnitario = Number(row.precio_unitario || 0);
        return {
          vcodigo_producto: row.codigo_producto,
          vnombre_producto: row.nombre_producto,
          vCantidadProducto,
          vPrecioUnitario,
          vPrecioTotal: vCantidadProducto * vPrecioUnitario,
          vFCantidadProducto: vCantidadProducto,
          vFPrecioTotal: vCantidadProducto * vPrecioUnitario,
        };
      });
      this.renderFacturaDetalle();
    } catch (error) {
      this.showError(error.message || 'Error cargando detalle');
    } finally {
      this.showLoading(false);
    }
  }

  renderFacturaDetalle() {
    const tbody = document.querySelector('#tablaFactura tbody');
    tbody.innerHTML = '';
    const rows = this.state.pedidoDetalle;

    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.vnombre_producto}</td>
        <td>
          <input type="text" class="form-control form-control-sm" value="${row.vFCantidadProducto}" data-index="${index}" />
        </td>
        <td>${this.formatCurrency(row.vFPrecioTotal)}</td>
        <td>
          <button class="btn btn-sm btn-outline-light" data-remove="${index}">×</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', (e) => this.updateCantidadFactura(e));
    });

    tbody.querySelectorAll('button[data-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => this.removeFacturaRow(e));
    });

    this.updateTotalFactura();
  }

  updateCantidadFactura(event) {
    const input = event.target;
    const index = Number(input.dataset.index);
    const value = input.value.trim();
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    if (value && !decimalRegex.test(value)) {
      input.classList.add('is-invalid');
      return;
    }
    input.classList.remove('is-invalid');

    const row = this.state.pedidoDetalle[index];
    const newCantidad = value === '' ? 0 : Number(value);
    row.vFCantidadProducto = newCantidad;
    const precioUnitario = row.vCantidadProducto === 0 ? 0 : row.vPrecioTotal / row.vCantidadProducto;
    row.vFPrecioTotal = precioUnitario * newCantidad;

    this.renderFacturaDetalle();
  }

  removeFacturaRow(event) {
    const index = Number(event.target.dataset.remove);
    if (this.state.pedidoDetalle.length <= 1) {
      this.showError('No se permite eliminar la ultima fila.');
      return;
    }
    this.state.pedidoDetalle.splice(index, 1);
    this.renderFacturaDetalle();
  }

  updateTotalFactura() {
    const total = this.state.pedidoDetalle.reduce((sum, row) => sum + (row.vFPrecioTotal || 0), 0);
    this.state.totals.vFsaldo = total;
    document.getElementById('totalFactura').textContent = this.formatCurrency(total);
  }

  async loadBases() {
    this.showLoading(true);
    try {
      const response = await fetch('/api/bases');
      if (!response.ok) throw new Error('No se pudo cargar bases');
      this.cache.bases = await response.json();
    } catch (error) {
      this.showError(error.message || 'Error cargando bases');
    } finally {
      this.showLoading(false);
    }
  }

  async loadPuntosEntrega(codigoCliente) {
    if (!codigoCliente) return;
    try {
      const response = await fetch(`/api/puntos-entrega?codigo_cliente=${encodeURIComponent(codigoCliente)}`);
      if (!response.ok) throw new Error('No se pudo cargar puntos de entrega');
      this.cache.puntosEntrega = await response.json();
    } catch (error) {
      this.showError(error.message || 'Error cargando puntos de entrega');
    }

    const hasPuntos = this.cache.puntosEntrega.length > 0;
    document.getElementById('entregaExistente').parentElement.style.display = hasPuntos ? 'inline-flex' : 'none';
    if (!hasPuntos) {
      document.getElementById('entregaNuevo').checked = true;
      this.toggleEntregaModo('nuevo');
    }

    if (this.puntoEntregaTypeahead) {
      this.puntoEntregaTypeahead.setOptions(this.cache.puntosEntrega.map((punto) => ({
        label: punto.concatenarpuntoentrega,
        value: punto.codigo_puntoentrega,
        region_entrega: punto.region_entrega,
        cod_dep: punto.cod_dep,
        cod_prov: punto.cod_prov,
        cod_dist: punto.cod_dist,
      })));
    }
  }

  async loadDepartamentos() {
    try {
      const response = await fetch('/api/ubigeo/departamentos');
      if (!response.ok) throw new Error('No se pudo cargar departamentos');
      this.cache.departamentos = await response.json();
      if (this.depTypeahead) {
        this.depTypeahead.setOptions(this.cache.departamentos.map((dep) => ({
          label: dep.departamento,
          value: dep.cod_dep,
        })));
      }
    } catch (error) {
      this.showError(error.message || 'Error cargando departamentos');
    }
  }

  async loadProvincias(codDep) {
    if (!codDep) return;
    try {
      const response = await fetch(`/api/ubigeo/provincias?cod_dep=${encodeURIComponent(codDep)}`);
      if (!response.ok) throw new Error('No se pudo cargar provincias');
      this.cache.provincias = await response.json();
      if (this.provTypeahead) {
        this.provTypeahead.setOptions(this.cache.provincias.map((prov) => ({
          label: prov.provincia,
          value: prov.cod_prov,
        })));
      }
    } catch (error) {
      this.showError(error.message || 'Error cargando provincias');
    }
  }

  async loadDistritos(codDep, codProv) {
    if (!codDep || !codProv) return;
    try {
      const response = await fetch(`/api/ubigeo/distritos?cod_dep=${encodeURIComponent(codDep)}&cod_prov=${encodeURIComponent(codProv)}`);
      if (!response.ok) throw new Error('No se pudo cargar distritos');
      this.cache.distritos = await response.json();
      if (this.distTypeahead) {
        this.distTypeahead.setOptions(this.cache.distritos.map((dist) => ({
          label: dist.distrito,
          value: dist.cod_dist,
        })));
      }
    } catch (error) {
      this.showError(error.message || 'Error cargando distritos');
    }
  }

  async loadNumRecibe(codigoCliente) {
    if (!codigoCliente) return;
    try {
      const response = await fetch(`/api/numrecibe?codigo_cliente=${encodeURIComponent(codigoCliente)}`);
      if (!response.ok) throw new Error('No se pudo cargar numrecibe');
      this.cache.numrecibe = await response.json();
    } catch (error) {
      this.showError(error.message || 'Error cargando numrecibe');
    }

    const hasRecibe = this.cache.numrecibe.length > 0;
    document.getElementById('recibeExistente').parentElement.style.display = hasRecibe ? 'inline-flex' : 'none';
    if (!hasRecibe) {
      document.getElementById('recibeNuevo').checked = true;
      this.toggleRecibeModo('nuevo');
    }

    if (this.recibeTypeahead) {
      this.recibeTypeahead.setOptions(this.cache.numrecibe.map((recibe) => ({
        label: recibe.concatenarnumrecibe,
        codigo_cliente_numrecibe: recibe.codigo_cliente_numrecibe,
        ordinal_numrecibe: recibe.ordinal_numrecibe,
        value: recibe.codigo_cliente_numrecibe,
      })));
    }
  }

  async loadCuentas() {
    this.showLoading(true);
    try {
      const response = await fetch('/api/cuentas-bancarias');
      if (!response.ok) throw new Error('No se pudo cargar cuentas');
      this.cache.cuentas = await response.json();
    } catch (error) {
      this.showError(error.message || 'Error cargando cuentas');
    } finally {
      this.showLoading(false);
    }
  }

  async fetchNextFactura() {
    try {
      const response = await fetch('/api/next-factura');
      if (!response.ok) throw new Error('No se pudo obtener numero');
      const data = await response.json();
      this.state.factura.vNumero_documento = data.next;
      document.getElementById('numeroDocumento').value = data.next;
    } catch (error) {
      this.showError(error.message || 'Error obteniendo numero de factura');
    }
  }

  async fetchNextRecibo() {
    try {
      const response = await fetch('/api/next-recibo');
      if (!response.ok) throw new Error('No se pudo obtener numero');
      const data = await response.json();
      this.state.pago.vNumero_documento_pago = data.next;
      document.getElementById('numeroDocumentoPago').value = data.next;
    } catch (error) {
      this.showError(error.message || 'Error obteniendo numero de recibo');
    }
  }

  toggleEntregaModo(modo) {
    this.state.entrega.modo = modo;
    document.getElementById('puntoEntregaExistente').style.display = modo === 'existente' ? 'block' : 'none';
    document.getElementById('puntoEntregaNuevo').style.display = modo === 'nuevo' ? 'block' : 'none';
  }

  toggleRecibeModo(modo) {
    this.state.recibe.modo = modo;
    document.getElementById('recibeExistentePanel').style.display = modo === 'existente' ? 'block' : 'none';
    document.getElementById('recibeNuevoPanel').style.display = modo === 'nuevo' ? 'flex' : 'none';
  }

  computeRegion() {
    const { vCod_Dep, vCod_Prov } = this.state.entrega;
    const region = vCod_Dep === '15' && vCod_Prov === '01' ? 'LIMA' : 'PROV';
    this.state.entrega.vRegion_Entrega = region;
    document.getElementById('entregaLima').style.display = region === 'LIMA' ? 'flex' : 'none';
    document.getElementById('entregaProv').style.display = region === 'PROV' ? 'flex' : 'none';
  }

  nextStep() {
    if (!this.validateStep()) return;
    if (this.step === 3 && this.state.entrega.vRegion_Entrega !== 'LIMA') {
      this.step = 5;
    } else {
      this.step = Math.min(this.step + 1, this.totalSteps);
    }
    this.showStep(this.step);
  }

  prevStep() {
    if (this.step === 5 && this.state.entrega.vRegion_Entrega !== 'LIMA') {
      this.step = 3;
    } else {
      this.step = Math.max(this.step - 1, 1);
    }
    this.showStep(this.step);
  }

  showStep(step) {
    this.step = step;
    document.querySelectorAll('.step-panel').forEach((panel) => {
      panel.classList.toggle('active', Number(panel.dataset.step) === step);
    });
    document.getElementById('btnPrev').style.visibility = step === 1 ? 'hidden' : 'visible';
    document.getElementById('btnNext').style.display = step === this.totalSteps ? 'none' : 'inline-flex';

    const progress = Math.round((step - 1) / (this.totalSteps - 1) * 100);
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('stepLabel').textContent = `Paso ${step} de ${this.totalSteps}`;

    const dots = document.querySelectorAll('.step-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index < step);
    });

    if (step === 6) {
      this.renderResumen();
    }
  }

  validateStep() {
    this.clearAlert();
    if (this.step === 1) {
      if (!this.state.pedido) {
        this.showError('Selecciona un pedido antes de continuar.');
        return false;
      }
    }

    if (this.step === 2) {
      if (!this.state.factura.vCodigo_base) {
        this.showError('Selecciona una base.');
        return false;
      }
      const fecha = document.getElementById('fechaEmision').value;
      const hora = document.getElementById('horaEmision').value;
      if (!fecha || !hora) {
        this.showError('Fecha y hora de emisión son obligatorias.');
        return false;
      }
      this.state.factura.vFecha_emision = fecha;
      this.state.factura.vHora_emision = hora;
      this.state.factura.vNumero_documento = document.getElementById('numeroDocumento').value.trim();
      if (!this.state.factura.vNumero_documento) {
        this.showError('Numero de documento es obligatorio.');
        return false;
      }

      const invalid = this.state.pedidoDetalle.some((row) => row.vFCantidadProducto > row.vCantidadProducto);
      if (invalid) {
        this.showError('No se permite facturar cantidad mayor al saldo del pedido.');
        return false;
      }
    }

    if (this.step === 3) {
      if (this.state.entrega.modo === 'existente') {
        if (!this.state.entrega.vCodigo_puntoentrega) {
          this.showError('Selecciona un punto de entrega existente.');
          return false;
        }
      } else {
        this.state.entrega.Vdireccion_linea = document.getElementById('direccionLinea').value.trim();
        this.state.entrega.Vreferencia = document.getElementById('referencia').value.trim();
        this.state.entrega.Vnombre = document.getElementById('nombreProv').value.trim();
        this.state.entrega.Vdni = document.getElementById('dniProv').value.trim();
        this.state.entrega.Vagencia = document.getElementById('agenciaProv').value.trim();
        this.state.entrega.Vobservaciones = document.getElementById('observacionesProv').value.trim();

        if (!this.state.entrega.vCod_Dep || !this.state.entrega.vCod_Prov || !this.state.entrega.vCod_Dist) {
          this.showError('Selecciona ubigeo completo.');
          return false;
        }

        if (this.state.entrega.vRegion_Entrega === 'LIMA' && !this.state.entrega.Vdireccion_linea) {
          this.showError('Direccion es obligatoria para Lima.');
          return false;
        }

        if (this.state.entrega.vRegion_Entrega === 'PROV' && !this.state.entrega.Vnombre) {
          this.showError('Nombre es obligatorio para provincia.');
          return false;
        }
      }
    }

    if (this.step === 4) {
      if (this.state.entrega.vRegion_Entrega === 'LIMA') {
        if (this.state.recibe.modo === 'existente' && !this.state.recibe.Vconcatenarnumrecibe) {
          this.showError('Selecciona un numrecibe existente.');
          return false;
        }

        if (this.state.recibe.modo === 'nuevo') {
          const numero = document.getElementById('numeroRecibe').value.trim();
          const nombre = document.getElementById('nombreRecibe').value.trim();
          if (!numero || !nombre) {
            this.showError('Numero y nombre de recibe son obligatorios.');
            return false;
          }
          this.state.recibe.vNumeroRecibe = numero;
          this.state.recibe.vNombreRecibe = nombre;
        }
      }
    }

    if (this.step === 5) {
      const montoRaw = document.getElementById('montoPago').value.trim();
      if (montoRaw) {
        const decimalRegex = /^\d+(\.\d{1,2})?$/;
        if (!decimalRegex.test(montoRaw)) {
          this.showError('Monto de pago invalido.');
          return false;
        }
        const monto = Number(montoRaw);
        if (monto > this.state.totals.vFsaldo) {
          this.showError('El monto de pago no puede ser mayor al total.');
          return false;
        }
        if (!this.state.pago.vCuentaBancaria) {
          this.showError('Selecciona una cuenta bancaria para registrar el pago.');
          return false;
        }
      }
    }

    return true;
  }

  renderResumen() {
    const pedido = this.state.pedido || {};
    const entrega = this.state.entrega;
    const recibe = this.state.recibe;
    const pago = this.state.pago;

    document.getElementById('summaryPedido').textContent =
      `Pedido ${pedido.vcodigo_pedido || ''} · ${pedido.vnombre_cliente || ''} (${pedido.vnumero_cliente || ''})`;

    document.getElementById('summaryFactura').textContent =
      `Factura ${this.state.factura.vNumero_documento} · Total ${this.formatCurrency(this.state.totals.vFsaldo)}`;

    document.getElementById('summaryEntrega').textContent =
      entrega.modo === 'existente'
        ? `Punto existente: ${entrega.Vconcatenarpuntoentrega}`
        : `Punto nuevo: ${this.buildConcatenarEntrega()}`;

    document.getElementById('summaryRecibe').textContent =
      this.state.entrega.vRegion_Entrega !== 'LIMA'
        ? 'No aplica'
        : (recibe.modo === 'existente'
          ? `Recibe existente: ${recibe.Vconcatenarnumrecibe}`
          : `Recibe nuevo: ${recibe.vNumeroRecibe} | ${recibe.vNombreRecibe}`);

    document.getElementById('summaryPago').textContent =
      pago.vMontoPago && Number(pago.vMontoPago) > 0
        ? `Pago registrado: ${this.formatCurrency(Number(pago.vMontoPago))}`
        : 'Sin pago registrado';
  }

  buildConcatenarEntrega() {
    if (this.state.entrega.vRegion_Entrega === 'LIMA') {
      const parts = [this.state.entrega.Vdireccion_linea];
      const distrito = this.cache.distritos.find((d) => d.cod_dist === this.state.entrega.vCod_Dist)?.distrito;
      if (distrito) parts.push(distrito);
      if (this.state.entrega.Vreferencia) parts.push(this.state.entrega.Vreferencia);
      return parts.filter(Boolean).join(' | ');
    }
    const parts = [this.state.entrega.Vnombre, this.state.entrega.Vdni, this.state.entrega.Vagencia, this.state.entrega.Vobservaciones];
    return parts.filter(Boolean).join(' | ');
  }

  async emitirFactura() {
    if (!document.getElementById('confirmOperacion').checked) {
      this.showError('Debes confirmar la operación antes de emitir.');
      return;
    }

    const payload = this.buildPayload();
    this.showLoading(true);
    try {
      const response = await fetch('/api/emitir-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al emitir factura');
      this.showSuccess('Factura emitida correctamente.');
    } catch (error) {
      this.showError(error.message || 'Error al emitir factura');
    } finally {
      this.showLoading(false);
    }
  }

  buildPayload() {
    const facturaDetalle = this.state.pedidoDetalle.map((row, index) => ({
      vcodigo_producto: row.vcodigo_producto,
      vnombre_producto: row.vnombre_producto,
      vFCantidadProducto: row.vFCantidadProducto,
      vFPrecioTotal: row.vFPrecioTotal,
      vOrdinalDetMovCont: index + 1,
    }));

    const fechaP = `${this.state.factura.vFecha_emision} ${this.state.factura.vHora_emision}:00`;
    this.state.factura.vFechaP = fechaP;

    const entrega = this.state.entrega;
    if (entrega.modo === 'nuevo') {
      entrega.Vconcatenarpuntoentrega = this.buildConcatenarEntrega();
    }

    if (this.state.recibe.modo === 'nuevo') {
      this.state.recibe.Vconcatenarnumrecibe = `${this.state.recibe.vNumeroRecibe} | ${this.state.recibe.vNombreRecibe}`;
    }

    return {
      pedido: this.state.pedido,
      factura: {
        ...this.state.factura,
        vFechaP: fechaP,
        vFsaldo: this.state.totals.vFsaldo,
        detalle: facturaDetalle,
      },
      entrega: this.state.entrega,
      recibe: this.state.recibe,
      pago: {
        ...this.state.pago,
        vMontoPago: this.state.pago.vMontoPago ? Number(this.state.pago.vMontoPago) : 0,
      },
    };
  }

  showLoading(isLoading) {
    document.getElementById('loadingOverlay').classList.toggle('active', isLoading);
  }

  clearAlert() {
    document.getElementById('alertArea').innerHTML = '';
  }

  showError(message) {
    this.showAlert('danger', message);
  }

  showSuccess(message) {
    this.showAlert('success', message);
  }

  showAlert(type, message) {
    const alertArea = document.getElementById('alertArea');
    alertArea.innerHTML = `
      <div class="alert alert-${type}" role="alert">
        ${message}
      </div>
    `;
  }

  formatCurrency(value) {
    const locale = navigator.language || 'es';
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  }

  formatDate(value) {
    if (!value) return '';
    const locale = navigator.language || 'es';
    return new Intl.DateTimeFormat(locale).format(new Date(value));
  }
}

class Typeahead {
  constructor(containerId, { placeholder, onSelect }) {
    this.container = document.getElementById(containerId);
    this.onSelect = onSelect;
    this.options = [];
    this.activeIndex = -1;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'form-control';
    this.input.placeholder = placeholder;

    this.list = document.createElement('div');
    this.list.className = 'typeahead-list';
    this.list.style.display = 'none';

    this.container.appendChild(this.input);
    this.container.appendChild(this.list);

    this.input.addEventListener('input', () => this.render());
    this.input.addEventListener('focus', () => this.render());
    this.input.addEventListener('keydown', (e) => this.handleKey(e));
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hide();
      }
    });
  }

  setOptions(options) {
    this.options = options;
    this.render();
  }

  render() {
    const query = this.input.value.toLowerCase();
    const filtered = this.options.filter((option) => option.label.toLowerCase().includes(query));
    this.list.innerHTML = '';
    filtered.forEach((option, index) => {
      const item = document.createElement('div');
      item.className = 'typeahead-item';
      item.textContent = option.label;
      item.addEventListener('click', () => this.select(option));
      if (index === this.activeIndex) item.classList.add('active');
      this.list.appendChild(item);
    });
    this.list.style.display = filtered.length ? 'block' : 'none';
  }

  handleKey(event) {
    const items = Array.from(this.list.children);
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % items.length;
      this.render();
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + items.length) % items.length;
      this.render();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.activeIndex >= 0) {
        const option = this.options.filter((opt) => opt.label.toLowerCase().includes(this.input.value.toLowerCase()))[this.activeIndex];
        if (option) this.select(option);
      }
    }
  }

  select(option) {
    this.input.value = option.label;
    this.hide();
    if (this.onSelect) this.onSelect(option);
  }

  hide() {
    this.list.style.display = 'none';
    this.activeIndex = -1;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
