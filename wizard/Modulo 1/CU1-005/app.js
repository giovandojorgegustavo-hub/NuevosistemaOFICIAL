/*
vPedidosPendientes = Llamada SP: get_pedidospendientes() (devuelve campo_visible)
Campos devueltos
vcodigo_pedido
vcodigo_cliente
vnombre_cliente
vnumero_cliente
vfecha
vcreated_at
Variables
vcodigo_pedido visible no editable
vClienteCodigo no visible no editable
vnombre_cliente visible no editable
vnumero_cliente visible no editable
vfecha visible no editable

vProdFactura = Llamada SP: get_pedido_detalle_por_pedido(p_codigo_pedido) (devuelve campo_visible)
Campos devueltos
vcodigo_producto
vnombre_producto
vsaldo
vprecio_unitario
Variables
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vcantidad visible editable
vprecio_unitario no visible no editable
vprecio_total visible no editable

vBaseNombre = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
vcodigo_base
vnombre
Variables
vcodigo_base no visible editable
vBaseNombre visible editable

vPuntoEntregaTexto = Llamada SP: get_puntos_entrega(p_codigo_cliente) (devuelve campo_visible)
Campos devueltos
vcod_dep
vcod_prov
vcod_dist
vdepartamento
vprovincia
vdistrito
vubigeo
vcodigo_puntoentrega
vcodigo_cliente
vregion_entrega
vdireccion_linea
vreferencia
vnombre
vdni
vagencia
vobservaciones
vconcatenarpuntoentrega
vlatitud
vlongitud
vestado
Variables
vPuntoEntregaTexto visible editable
vRegion_Entrega no visible no editable
vDireccionLinea visible editable
vReferencia visible editable
vNombre visible editable
vDni visible editable
vAgencia visible editable
vObservaciones visible editable
vLatitud visible no editable
vLongitud visible no editable

vDepartamento = Llamada SP: get_ubigeo_departamentos() (devuelve campo_visible)
Campos devueltos
vcod_dep
vdepartamento
Variables
vCod_Dep visible editable
vDepartamento visible editable

vProvincia = Llamada SP: get_ubigeo_provincias(p_cod_dep) (devuelve campo_visible)
Campos devueltos
vcod_prov
vprovincia
Variables
vCod_Prov visible editable
vProvincia visible editable

vDistrito = Llamada SP: get_ubigeo_distritos(p_cod_dep, p_cod_prov) (devuelve campo_visible)
Campos devueltos
vcod_dist
vdistrito
Variables
vCod_Dist visible editable
vDistrito visible editable

vConcatenarnumrecibe = Llamada SP: get_numrecibe(p_codigo_cliente) (devuelve campo_visible)
Campos devueltos
vcodigo_cliente_numrecibe
vordinal_numrecibe
vnumero
vnombre
vconcatenarnumrecibe
Variables
vOrdinal_numrecibe no visible no editable
vNumeroRecibe no visible no editable
vNombreRecibe no visible no editable
vConcatenarnumrecibe visible editable

vCuentaNombre = Llamada SP: get_cuentasbancarias() (devuelve campo_visible)
Campos devueltos
vcodigo_cuentabancaria
vnombre
vbanco
Variables
vCuentaNombre visible editable
vCuentaBanco visible no editable

vBasesCandidatas = Llamada SP: get_bases_candidatas(p_vProdFactura, vFechaP) (devuelve campo_visible)
Campos devueltos
vcodigo_base
vlatitud
vlongitud
Variables
vcodigo_base visible no editable
vlatitud visible no editable
vlongitud visible no editable
*/

const i18n = {
  en: {
    badge: 'IaaS & PaaS Operations',
    title: 'Order Management',
    subtitle: 'Issue invoices, orchestrate deliveries, and assign bases with full transactional control.',
    module: 'Module 1',
    step1: '1. Select order',
    step2: '2. Create invoice',
    step3: '3. Delivery data',
    step4: '4. Receiver data',
    step5: '5. Payment record',
    step6: '6. Assign base',
    step7: '7. Summary',
    step1Title: 'Select pending order',
    step1Hint: 'Filter by client or date, then select the order to invoice.',
    filterCliente: 'Client',
    filterClienteHint: 'Name or code',
    filterFecha: 'Date',
    filter: 'Filter',
    clear: 'Clear',
    colPedido: 'Order',
    colCliente: 'Client',
    colNumero: 'Client number',
    colFecha: 'Date',
    colCreado: 'Created',
    step2Title: 'Create invoice',
    step2Hint: 'Define issue date/time and order detail.',
    fechaEmision: 'Issue date',
    horaEmision: 'Issue time',
    tipoDocumento: 'Document type',
    numeroDocumento: 'Document number',
    baseNombre: 'Base (manual)',
    detallePedido: 'Order detail',
    colProducto: 'Product',
    colSaldo: 'Balance',
    colCantidad: 'Quantity',
    colPrecio: 'Unit price',
    colTotal: 'Total',
    colAcciones: 'Actions',
    montoFactura: 'Amount',
    costoEnvio: 'Shipping',
    totalFactura: 'Total',
    saldoFactura: 'Balance',
    saldoFavorTotal: 'Total credit',
    saldoFavorNtc: 'Credit note',
    saldoFavorRcp: 'Receipt credit',
    saldoFavorUsar: 'Use available credit',
    step3Title: 'Delivery data',
    step3Hint: 'Select an existing point or register a new one.',
    entregaExistente: 'Existing',
    entregaNuevo: 'New',
    puntoEntrega: 'Delivery point',
    puntoEntregaHint: 'If there are no points, the new option will be enabled.',
    mapTitle: 'Map and location',
    mapHint: 'Search for an address or click on the map.',
    mapSearch: 'Search address',
    latitud: 'Latitude',
    longitud: 'Longitude',
    departamento: 'Department',
    provincia: 'Province',
    distrito: 'District',
    direccion: 'Address',
    referencia: 'Reference',
    nombre: 'Name',
    dni: 'Document ID',
    agencia: 'Agency',
    observaciones: 'Notes',
    step4Title: 'Receiver data',
    step4Hint: 'Define the receiver number when Lima delivery.',
    recibeExistente: 'Existing',
    recibeNuevo: 'New',
    numRecibe: 'Receiver number',
    numeroRecibe: 'Number',
    nombreRecibe: 'Name',
    ordinalRecibe: 'Ordinal',
    step5Title: 'Payment record',
    step5Hint: 'Add partial payments or skip if not needed.',
    numeroDocumentoPago: 'Receipt number',
    cuentaNombre: 'Bank account',
    cuentaBanco: 'Bank',
    montoPago: 'Payment amount',
    montoPendiente: 'Pending amount',
    agregarPago: 'Add payment',
    pagoBloqueado: 'Covered by credit. No payment required.',
    colRecibo: 'Receipt',
    colCuenta: 'Account',
    colMonto: 'Amount',
    step6Title: 'Assign base',
    step6Hint: 'Use candidates and ETA to choose the best base.',
    baseFinal: 'Selected base',
    basesCandidatas: 'Candidate bases',
    colBase: 'Base',
    colUbicacion: 'Location',
    basesEta: 'Bases with ETA',
    colEta: 'ETA',
    etaHint: 'No candidate bases.',
    step7Title: 'Summary and issue invoice',
    step7Hint: 'Review the summary before issuing the invoice.',
    resumenPedido: 'Order summary',
    resumenFactura: 'Invoice summary',
    resumenEntrega: 'Delivery summary',
    resumenRecibe: 'Receiver summary',
    resumenPago: 'Payment summary',
    resumenBase: 'Base summary',
    confirmLabel: 'I confirm the information is correct.',
    prev: 'Previous',
    reset: 'Clear',
    next: 'Next',
    emitir: 'Issue invoice',
    confirmTitle: 'Confirm operation',
    confirmBody: 'Do you want to issue the invoice?',
    cancel: 'Cancel',
    confirm: 'Issue',
    errorPedido: 'Select a pending order before continuing.',
    errorDetalle: 'Each invoice quantity must be numeric and not exceed the product balance.',
    errorEntrega: 'Complete the delivery data before continuing.',
    errorRecibe: 'Complete receiver data before continuing.',
    errorPago: 'Payment amount must be valid and not exceed the pending balance.',
    errorCuenta: 'Select a bank account before continuing.',
    errorBase: 'Select a base before continuing.',
    errorConfirm: 'You must confirm the operation before issuing the invoice.',
    errorServer: 'We could not complete the request. Try again.',
    successEmitir: 'Invoice issued successfully. Wizard reset.',
    modoExistente: 'EXISTING',
    modoNuevo: 'NEW',
    noAplica: 'NOT APPLICABLE',
    sinPagos: 'No payments registered.'
  },
  es: {
    badge: 'Operaciones IaaS & PaaS',
    title: 'Gestion Pedido',
    subtitle: 'Emite facturas, organiza entregas y asigna bases con control transaccional completo.',
    module: 'Modulo 1',
    step1: '1. Seleccionar pedido',
    step2: '2. Crear factura',
    step3: '3. Datos entrega',
    step4: '4. Datos recibe',
    step5: '5. Registro pago',
    step6: '6. Asignar base',
    step7: '7. Resumen',
    step1Title: 'Seleccionar pedido pendiente',
    step1Hint: 'Filtra por cliente o fecha, luego selecciona el pedido.',
    filterCliente: 'Cliente',
    filterClienteHint: 'Nombre o codigo',
    filterFecha: 'Fecha',
    filter: 'Filtrar',
    clear: 'Limpiar',
    colPedido: 'Pedido',
    colCliente: 'Cliente',
    colNumero: 'Numero cliente',
    colFecha: 'Fecha',
    colCreado: 'Creado',
    step2Title: 'Crear factura',
    step2Hint: 'Define fecha/hora y detalle del pedido.',
    fechaEmision: 'Fecha emision',
    horaEmision: 'Hora emision',
    tipoDocumento: 'Tipo documento',
    numeroDocumento: 'Numero documento',
    baseNombre: 'Base (manual)',
    detallePedido: 'Detalle del pedido',
    colProducto: 'Producto',
    colSaldo: 'Saldo',
    colCantidad: 'Cantidad',
    colPrecio: 'Precio unitario',
    colTotal: 'Total',
    colAcciones: 'Acciones',
    montoFactura: 'Monto',
    costoEnvio: 'Costo envio',
    totalFactura: 'Total',
    saldoFactura: 'Saldo',
    saldoFavorTotal: 'Total saldo a favor',
    saldoFavorNtc: 'Saldo NTC',
    saldoFavorRcp: 'Saldo RCP',
    saldoFavorUsar: 'Usar saldo a favor',
    step3Title: 'Datos de entrega',
    step3Hint: 'Selecciona un punto existente o registra uno nuevo.',
    entregaExistente: 'Existe',
    entregaNuevo: 'Nuevo',
    puntoEntrega: 'Punto entrega',
    puntoEntregaHint: 'Si no hay puntos disponibles se habilitara la opcion nuevo.',
    mapTitle: 'Mapa y ubicacion',
    mapHint: 'Busca una direccion o haz clic en el mapa.',
    mapSearch: 'Buscar direccion',
    latitud: 'Latitud',
    longitud: 'Longitud',
    departamento: 'Departamento',
    provincia: 'Provincia',
    distrito: 'Distrito',
    direccion: 'Direccion',
    referencia: 'Referencia',
    nombre: 'Nombre',
    dni: 'DNI',
    agencia: 'Agencia',
    observaciones: 'Observaciones',
    step4Title: 'Datos recibe',
    step4Hint: 'Define el numero que recibe si aplica.',
    recibeExistente: 'Existe',
    recibeNuevo: 'Nuevo',
    numRecibe: 'Numero recibe',
    numeroRecibe: 'Numero',
    nombreRecibe: 'Nombre',
    ordinalRecibe: 'Ordinal',
    step5Title: 'Registro de pago',
    step5Hint: 'Registra pagos parciales o omite si aplica.',
    numeroDocumentoPago: 'Numero recibo',
    cuentaNombre: 'Cuenta bancaria',
    cuentaBanco: 'Banco',
    montoPago: 'Monto pago',
    montoPendiente: 'Monto pendiente',
    agregarPago: 'Agregar pago',
    pagoBloqueado: 'Saldo cubierto, no se requiere pago.',
    colRecibo: 'Recibo',
    colCuenta: 'Cuenta',
    colMonto: 'Monto',
    step6Title: 'Asignar base',
    step6Hint: 'Usa las bases candidatas y el ETA para decidir.',
    baseFinal: 'Base seleccionada',
    basesCandidatas: 'Bases candidatas',
    colBase: 'Base',
    colUbicacion: 'Ubicacion',
    basesEta: 'Bases con ETA',
    colEta: 'ETA',
    etaHint: 'Sin bases candidatas.',
    step7Title: 'Resumen y emitir factura',
    step7Hint: 'Revisa el resumen antes de emitir.',
    resumenPedido: 'Resumen pedido',
    resumenFactura: 'Resumen factura',
    resumenEntrega: 'Resumen entrega',
    resumenRecibe: 'Resumen recibe',
    resumenPago: 'Resumen pago',
    resumenBase: 'Resumen base',
    confirmLabel: 'Confirmo que la informacion es correcta.',
    prev: 'Anterior',
    reset: 'Limpiar',
    next: 'Siguiente',
    emitir: 'Emitir factura',
    confirmTitle: 'Confirmar operacion',
    confirmBody: '¿Deseas emitir la factura?',
    cancel: 'Cancelar',
    confirm: 'Emitir',
    errorPedido: 'Selecciona un pedido pendiente antes de continuar.',
    errorDetalle: 'Cada cantidad debe ser numerica y no exceder el saldo del producto.',
    errorEntrega: 'Completa los datos de entrega antes de continuar.',
    errorRecibe: 'Completa los datos de recibe antes de continuar.',
    errorPago: 'El monto debe ser valido.',
    errorCuenta: 'Selecciona una cuenta bancaria antes de continuar.',
    errorBase: 'Selecciona una base antes de continuar.',
    errorConfirm: 'Debes confirmar la operacion antes de emitir.',
    errorServer: 'No pudimos completar la solicitud. Intenta de nuevo.',
    successEmitir: 'Factura emitida. Wizard reiniciado.',
    modoExistente: 'EXISTENTE',
    modoNuevo: 'NUEVO',
    noAplica: 'NO APLICA',
    sinPagos: 'Sin pagos registrados.'
  }
};

const regex = {
  decimal: /^\d+(?:\.\d{1,2})?$/,
  integer: /^\d+$/
};

const state = {
  step: 1,
  lang: 'es',
  pedidos: [],
  pedidoSeleccionado: null,
  productosFactura: [],
  bases: [],
  basesCandidatas: [],
  basesEta: [],
  baseSugerida: null,
  baseManual: false,
  cuentas: [],
  pagos: [],
  mapsConfig: null,
  mapLoaded: false,
  map: null,
  marker: null,
  entrega: {
    modo: 'existente',
    puntos: [],
    seleccionado: null,
    codigo_puntoentrega: null,
    region_entrega: null,
    direccion_linea: '',
    referencia: '',
    nombre: '',
    dni: '',
    agencia: '',
    observaciones: '',
    cod_dep: '15',
    cod_prov: '01',
    cod_dist: '',
    distrito_nombre: '',
    distritos: [],
    ubigeo: '',
    latitud: null,
    longitud: null,
    concatenarpuntoentrega: ''
  },
  recibe: {
    modo: 'existente',
    lista: [],
    seleccionado: null,
    ordinal_numrecibe: null,
    numero: '',
    nombre: '',
    concatenarnumrecibe: ''
  },
  factura: {
    tipo_documento: 'FAC',
    numero_documento: '',
    fecha_emision: '',
    hora_emision: '',
    fechaP: '',
    codigo_base: null,
    base_nombre: '',
    monto: 0,
    costo_envio: 0,
    total: 0,
    saldo: 0
  },
  pago: {
    tipo_documento: 'RCP',
    numero_documento_base: '',
    monto_pago: '',
    monto_pendiente: 0,
    codigo_cuentabancaria: null,
    cuenta_nombre: '',
    cuenta_banco: ''
  },
  saldoFavor: {
    total: 0,
    ntc: 0,
    rcp: 0,
    usado: 0
  }
};

const el = {
  progressBar: document.getElementById('progressBar'),
  stepIndicator: document.getElementById('stepIndicator'),
  steps: {
    1: document.getElementById('step1'),
    2: document.getElementById('step2'),
    3: document.getElementById('step3'),
    4: document.getElementById('step4'),
    5: document.getElementById('step5'),
    6: document.getElementById('step6'),
    7: document.getElementById('step7')
  },
  alertBox: document.getElementById('alertBox'),
  successBox: document.getElementById('successBox'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  btnReset: document.getElementById('btnReset'),
  confirmModal: document.getElementById('confirmModal'),
  btnConfirmEmit: document.getElementById('btnConfirmEmit'),
  confirmEmit: document.getElementById('confirmEmitir'),
  loadingPedidos: document.getElementById('loadingPedidos'),
  loadingFactura: document.getElementById('loadingFactura'),
  loadingEntrega: document.getElementById('loadingEntrega'),
  loadingRecibe: document.getElementById('loadingRecibe'),
  loadingPagos: document.getElementById('loadingPagos'),
  loadingBases: document.getElementById('loadingBases'),
  loadingEmitir: document.getElementById('loadingEmitir'),
  filterCliente: document.getElementById('filterCliente'),
  filterFecha: document.getElementById('filterFecha'),
  btnFiltrarPedidos: document.getElementById('btnFiltrarPedidos'),
  btnLimpiarFiltro: document.getElementById('btnLimpiarFiltro'),
  pedidosTable: document.querySelector('#pedidosTable tbody'),
  fechaEmision: document.getElementById('fechaEmision'),
  horaEmision: document.getElementById('horaEmision'),
  tipoDocumento: document.getElementById('tipoDocumento'),
  numeroDocumento: document.getElementById('numeroDocumento'),
  baseNombreFinal: document.getElementById('baseNombreFinal'),
  basesList: document.getElementById('basesList'),
  baseSeleccionada: document.getElementById('baseSeleccionada'),
  productosTable: document.querySelector('#productosTable tbody'),
  montoFactura: document.getElementById('montoFactura'),
  costoEnvio: document.getElementById('costoEnvio'),
  totalFactura: document.getElementById('totalFactura'),
  saldoFactura: document.getElementById('saldoFactura'),
  saldoFavorTotal: document.getElementById('saldoFavorTotal'),
  saldoFavorNtc: document.getElementById('saldoFavorNtc'),
  saldoFavorRcp: document.getElementById('saldoFavorRcp'),
  saldoFavorUsar: document.getElementById('saldoFavorUsar'),
  entregaExistente: document.getElementById('entregaExistente'),
  entregaNuevo: document.getElementById('entregaNuevo'),
  entregaToggle: document.getElementById('entregaToggle'),
  entregaExistenteSection: document.getElementById('entregaExistenteSection'),
  entregaNuevoSection: document.getElementById('entregaNuevoSection'),
  puntoEntregaTexto: document.getElementById('puntoEntregaTexto'),
  puntosEntregaList: document.getElementById('puntosEntregaList'),
  mapSearch: document.getElementById('mapSearch'),
  mapCanvas: document.getElementById('map'),
  latitud: document.getElementById('latitud'),
  longitud: document.getElementById('longitud'),
  codDep: document.getElementById('codDep'),
  codProv: document.getElementById('codProv'),
  codDist: document.getElementById('codDist'),
  departamentosList: document.getElementById('departamentosList'),
  provinciasList: document.getElementById('provinciasList'),
  distritosList: document.getElementById('distritosList'),
  direccionLinea: document.getElementById('direccionLinea'),
  referencia: document.getElementById('referencia'),
  fieldsLima: document.getElementById('fieldsLima'),
  fieldsProv: document.getElementById('fieldsProv'),
  nombreEntrega: document.getElementById('nombreEntrega'),
  dniEntrega: document.getElementById('dniEntrega'),
  agenciaEntrega: document.getElementById('agenciaEntrega'),
  observacionesEntrega: document.getElementById('observacionesEntrega'),
  recibeExistente: document.getElementById('recibeExistente'),
  recibeNuevo: document.getElementById('recibeNuevo'),
  recibeToggle: document.getElementById('recibeToggle'),
  recibeExistenteSection: document.getElementById('recibeExistenteSection'),
  recibeNuevoSection: document.getElementById('recibeNuevoSection'),
  concatenaNumRecibe: document.getElementById('concatenaNumRecibe'),
  numRecibeList: document.getElementById('numRecibeList'),
  numeroRecibe: document.getElementById('numeroRecibe'),
  nombreRecibe: document.getElementById('nombreRecibe'),
  ordinalRecibe: document.getElementById('ordinalRecibe'),
  numeroDocumentoPago: document.getElementById('numeroDocumentoPago'),
  cuentaNombre: document.getElementById('cuentaNombre'),
  cuentasList: document.getElementById('cuentasList'),
  cuentaBanco: document.getElementById('cuentaBanco'),
  montoPago: document.getElementById('montoPago'),
  montoPendiente: document.getElementById('montoPendiente'),
  btnAgregarPago: document.getElementById('btnAgregarPago'),
  pagosTable: document.querySelector('#pagosTable tbody'),
  pagoBloqueado: document.getElementById('pagoBloqueado'),
  basesCandidatasTable: document.querySelector('#basesCandidatasTable tbody'),
  basesEtaTable: document.querySelector('#basesEtaTable tbody'),
  etaHint: document.getElementById('etaHint'),
  baseSugerida: document.getElementById('baseSugerida'),
  resumenPedido: document.getElementById('resumenPedido'),
  resumenFactura: document.getElementById('resumenFactura'),
  resumenEntrega: document.getElementById('resumenEntrega'),
  resumenRecibe: document.getElementById('resumenRecibe'),
  resumenPago: document.getElementById('resumenPago'),
  resumenBase: document.getElementById('resumenBase')
};

class FormWizard {
  constructor() {
    this.modal = new bootstrap.Modal(el.confirmModal);
  }

  async init() {
    this.setLanguage();
    this.bindEvents();
    await this.loadInitial();
    this.setStep(1);
  }

  setLanguage() {
    const browserLang = navigator.language || 'es';
    state.lang = browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
    document.documentElement.lang = state.lang;
    const dict = i18n[state.lang];
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (dict[key]) {
        node.textContent = dict[key];
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        node.setAttribute('placeholder', dict[key]);
      }
    });
  }

  bindEvents() {
    el.btnPrev.addEventListener('click', () => this.prev());
    el.btnNext.addEventListener('click', () => this.next());
    el.btnReset.addEventListener('click', () => this.reset());
    el.btnConfirmEmit.addEventListener('click', () => this.emitirFactura());

    el.btnFiltrarPedidos.addEventListener('click', () => loadPedidos());
    el.btnLimpiarFiltro.addEventListener('click', () => {
      el.filterCliente.value = '';
      el.filterFecha.value = '';
      loadPedidos();
    });

    el.baseNombreFinal.addEventListener('change', () => {
      state.baseManual = true;
      handleBaseSelection(el.baseNombreFinal.value);
    });

    el.entregaExistente.addEventListener('change', () => setEntregaModo('existente'));
    el.entregaNuevo.addEventListener('change', () => setEntregaModo('nuevo'));
    el.puntoEntregaTexto.addEventListener('change', () => selectPuntoEntrega(el.puntoEntregaTexto.value));

    el.codDep.addEventListener('change', () => updateUbigeo());
    el.codProv.addEventListener('change', () => updateUbigeo());
    el.codDist.addEventListener('change', () => updateUbigeo());

    el.direccionLinea.addEventListener('input', () => {
      state.entrega.direccion_linea = el.direccionLinea.value.trim();
      updateConcatenarEntrega();
    });
    el.referencia.addEventListener('input', () => {
      state.entrega.referencia = el.referencia.value.trim();
      updateConcatenarEntrega();
    });
    el.nombreEntrega.addEventListener('input', () => {
      state.entrega.nombre = el.nombreEntrega.value.trim();
      updateConcatenarEntrega();
    });
    el.dniEntrega.addEventListener('input', () => {
      state.entrega.dni = el.dniEntrega.value.trim();
      updateConcatenarEntrega();
    });
    el.agenciaEntrega.addEventListener('input', () => {
      state.entrega.agencia = el.agenciaEntrega.value.trim();
      updateConcatenarEntrega();
    });
    el.observacionesEntrega.addEventListener('input', () => {
      state.entrega.observaciones = el.observacionesEntrega.value.trim();
      updateConcatenarEntrega();
    });

    el.recibeExistente.addEventListener('change', () => setRecibeModo('existente'));
    el.recibeNuevo.addEventListener('change', () => setRecibeModo('nuevo'));
    el.concatenaNumRecibe.addEventListener('change', () => selectNumRecibe(el.concatenaNumRecibe.value));
    el.numeroRecibe.addEventListener('input', () => {
      state.recibe.numero = el.numeroRecibe.value.trim();
      updateConcatenarRecibe();
    });
    el.nombreRecibe.addEventListener('input', () => {
      state.recibe.nombre = el.nombreRecibe.value.trim();
      updateConcatenarRecibe();
    });

    el.cuentaNombre.addEventListener('change', () => selectCuenta(el.cuentaNombre.value));
    el.cuentaNombre.addEventListener('input', () => selectCuenta(el.cuentaNombre.value));
    el.btnAgregarPago.addEventListener('click', () => addPago());
    if (el.saldoFavorUsar) {
      el.saldoFavorUsar.addEventListener('change', () => {
        state.pagos = [];
        updateSaldoFavorUsado();
        renderPagos();
        el.montoPago.value = formatNumber(state.pago.monto_pendiente);
      });
    }

    el.fechaEmision.addEventListener('change', () => updateFechaP());
    el.horaEmision.addEventListener('change', () => updateFechaP());
  }

  async loadInitial() {
    await loadPedidos();
    await loadBases();
    await loadCuentas();
    await loadMapsConfig();
    const now = new Date();
    state.factura.fecha_emision = now.toISOString().slice(0, 10);
    state.factura.hora_emision = now.toTimeString().slice(0, 5);
    updateFechaInputs();
    updateFechaP();
  }

  setStep(step) {
    state.step = step;
    const visibleSteps = getVisibleSteps();
    visibleSteps.forEach((number) => {
      const section = el.steps[number];
      if (section) {
        section.classList.toggle('d-none', number !== step);
      }
    });

    Object.keys(el.steps).forEach((key) => {
      if (!visibleSteps.includes(Number(key))) {
        el.steps[key].classList.add('d-none');
      }
    });

    const pills = el.stepIndicator.querySelectorAll('.step-pill');
    pills.forEach((pill) => {
      const pillStep = Number(pill.getAttribute('data-step'));
      if (!visibleSteps.includes(pillStep)) {
        pill.classList.add('d-none');
        return;
      }
      pill.classList.remove('d-none');
      pill.classList.toggle('active', pillStep === step);
    });

    const index = visibleSteps.indexOf(step);
    const progress = ((index + 1) / visibleSteps.length) * 100;
    el.progressBar.style.width = `${progress}%`;

    el.btnPrev.disabled = index === 0;
    el.btnNext.textContent = index === visibleSteps.length - 1 ? i18n[state.lang].emitir : i18n[state.lang].next;
  }

  async next() {
    clearAlerts();
    if (state.step === 1) {
      if (!state.pedidoSeleccionado) {
        showAlert(i18n[state.lang].errorPedido);
        return;
      }
      await prepareFactura();
      this.setStep(2);
      return;
    }

    if (state.step === 2) {
      if (!validateDetalleFactura()) {
        showAlert(i18n[state.lang].errorDetalle);
        return;
      }
      await prepareEntrega();
      this.setStep(3);
      return;
    }

    if (state.step === 3) {
      if (!validateEntrega()) {
        showAlert(i18n[state.lang].errorEntrega);
        return;
      }
      if (state.entrega.region_entrega === 'LIMA') {
        await prepareRecibe();
        this.setStep(4);
      } else {
        await preparePagos();
        this.setStep(5);
      }
      return;
    }

    if (state.step === 4) {
      if (!validateRecibe()) {
        showAlert(i18n[state.lang].errorRecibe);
        return;
      }
      await preparePagos();
      this.setStep(5);
      return;
    }

    if (state.step === 5) {
      if (!validatePagos()) {
        showAlert(i18n[state.lang].errorPago);
        return;
      }
      await prepareBases();
      this.setStep(6);
      return;
    }

    if (state.step === 6) {
      if (!validateBase()) {
        showAlert(i18n[state.lang].errorBase);
        return;
      }
      renderResumen();
      this.setStep(7);
      return;
    }

    if (state.step === 7) {
      if (!el.confirmEmit.checked) {
        showAlert(i18n[state.lang].errorConfirm);
        return;
      }
      this.modal.show();
    }
  }

  prev() {
    clearAlerts();
    const visibleSteps = getVisibleSteps();
    const index = visibleSteps.indexOf(state.step);
    if (index <= 0) return;
    const previous = visibleSteps[index - 1];
    this.setStep(previous);
  }

  async emitirFactura() {
    this.modal.hide();
    setLoading(true, el.loadingEmitir);
    try {
      const payload = buildEmitPayload();
      const response = await fetch('/api/emitir-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error('ERROR');
      }
      showSuccess(i18n[state.lang].successEmitir);
      await this.reset();
    } catch (error) {
      showAlert(i18n[state.lang].errorServer);
    } finally {
      setLoading(false, el.loadingEmitir);
    }
  }

  async reset() {
    clearAlerts();
    state.step = 1;
    state.pedidoSeleccionado = null;
    state.productosFactura = [];
    state.factura.numero_documento = '';
    state.factura.codigo_base = null;
    state.factura.base_nombre = '';
    state.factura.monto = 0;
    state.factura.costo_envio = 0;
    state.factura.total = 0;
    state.factura.saldo = 0;
    state.entrega = {
      modo: 'existente',
      puntos: [],
      seleccionado: null,
      codigo_puntoentrega: null,
      region_entrega: null,
      direccion_linea: '',
      referencia: '',
      nombre: '',
      dni: '',
      agencia: '',
    observaciones: '',
    cod_dep: '15',
    cod_prov: '01',
    cod_dist: '',
    distrito_nombre: '',
    distritos: [],
    ubigeo: '',
    latitud: null,
    longitud: null,
    concatenarpuntoentrega: ''
  };
    state.recibe = {
      modo: 'existente',
      lista: [],
      seleccionado: null,
      ordinal_numrecibe: null,
      numero: '',
      nombre: '',
      concatenarnumrecibe: ''
    };
    state.pagos = [];
    state.pago.monto_pendiente = state.factura.total;
    state.pago.monto_pago = '';
    state.pago.codigo_cuentabancaria = null;
    state.pago.cuenta_nombre = '';
    state.pago.cuenta_banco = '';
    state.saldoFavor = { total: 0, ntc: 0, rcp: 0, usado: 0 };
    state.baseManual = false;
    state.baseSugerida = null;
    const now = new Date();
    state.factura.fecha_emision = now.toISOString().slice(0, 10);
    state.factura.hora_emision = now.toTimeString().slice(0, 5);
    el.baseNombreFinal.value = '';
    el.baseSeleccionada.textContent = '-';
    el.baseSugerida.textContent = '-';
    el.puntoEntregaTexto.value = '';
    el.codDep.value = '15';
    el.codProv.value = '01';
    el.codDist.value = '';
    el.direccionLinea.value = '';
    el.referencia.value = '';
    el.nombreEntrega.value = '';
    el.dniEntrega.value = '';
    el.agenciaEntrega.value = '';
    el.observacionesEntrega.value = '';
    el.mapSearch.value = '';
    el.latitud.value = '';
    el.longitud.value = '';
    el.concatenaNumRecibe.value = '';
    el.numeroRecibe.value = '';
    el.nombreRecibe.value = '';
    el.ordinalRecibe.value = '';
    el.cuentaNombre.value = '';
    el.cuentaBanco.value = '';
    el.montoPago.value = '';
    el.montoPendiente.value = '';
    el.numeroDocumentoPago.value = '';
    el.confirmEmit.checked = false;
    if (el.saldoFavorUsar) el.saldoFavorUsar.checked = false;
    updateFechaInputs();
    updateFacturaInputs();
    updateFechaP();
    updateTotals();
    updateSaldoFavorUI();
    await loadPedidos();
    renderProductos();
    renderPagos();
    renderBasesCandidatas();
    renderBasesEta();
    renderEntregaUI();
    renderRecibeUI();
    this.setStep(1);
  }
}

function setLoading(show, spinner = null) {
  el.loadingOverlay.classList.toggle('d-none', !show);
  if (spinner) {
    spinner.classList.toggle('d-none', !show);
  }
}

function showAlert(message) {
  el.alertBox.textContent = message;
  el.alertBox.classList.remove('d-none');
  el.successBox.classList.add('d-none');
}

function showSuccess(message) {
  el.successBox.textContent = message;
  el.successBox.classList.remove('d-none');
  el.alertBox.classList.add('d-none');
}

function clearAlerts() {
  el.alertBox.classList.add('d-none');
  el.successBox.classList.add('d-none');
}

function getVisibleSteps() {
  if (state.entrega.region_entrega === 'LIMA') {
    return [1, 2, 3, 4, 5, 6, 7];
  }
  return [1, 2, 3, 5, 6, 7];
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error('ERROR');
  }
  return data;
}

function pickField(obj, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return obj[key];
    }
  }
  return undefined;
}

function normalizeBaseCandidata(row) {
  const codigo = pickField(row, ['codigo_base', 'codigoBase', 'CODIGO_BASE', 'Codigo_base', 'codigo']);
  const lat = pickField(row, ['latitud', 'LATITUD', 'Latitud', 'lat', 'LAT']);
  const lng = pickField(row, ['longitud', 'LONGITUD', 'Longitud', 'lng', 'LNG', 'long', 'LONG']);
  return {
    ...row,
    codigo_base: codigo ?? row.codigo_base,
    latitud: lat ?? row.latitud,
    longitud: lng ?? row.longitud
  };
}

function buildOriginAddress() {
  const base = state.entrega.concatenarpuntoentrega || state.entrega.direccion_linea || '';
  if (!base) return '';
  const extras = [];
  if (state.entrega.distrito_nombre) extras.push(state.entrega.distrito_nombre);
  if (state.entrega.region_entrega) extras.push(state.entrega.region_entrega);
  const joined = [base, ...extras].filter(Boolean).join(', ');
  return joined.trim();
}

async function loadPedidos() {
  setLoading(true, el.loadingPedidos);
  try {
    const params = new URLSearchParams();
    if (el.filterCliente.value.trim()) {
      params.append('cliente', el.filterCliente.value.trim());
    }
    if (el.filterFecha.value) {
      params.append('fecha', el.filterFecha.value);
    }
    const query = params.toString();
    const data = await fetchJson(`/api/pedidos${query ? `?${query}` : ''}`);
    state.pedidos = data.rows || [];
    renderPedidos();
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  } finally {
    setLoading(false, el.loadingPedidos);
  }
}

function renderPedidos() {
  el.pedidosTable.innerHTML = '';
  state.pedidos.forEach((pedido) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${pedido.codigo_pedido}</td>
      <td>${pedido.nombre_cliente || ''}</td>
      <td>${pedido.numero_cliente || ''}</td>
      <td>${formatDate(pedido.fecha)}</td>
      <td>${formatDateTime(pedido.created_at)}</td>
    `;
    if (state.pedidoSeleccionado && state.pedidoSeleccionado.codigo_pedido === pedido.codigo_pedido) {
      row.classList.add('selected');
    }
    row.addEventListener('click', () => {
      state.pedidoSeleccionado = pedido;
      renderPedidos();
      wizard.next();
    });
    el.pedidosTable.appendChild(row);
  });
}

async function prepareFactura() {
  setLoading(true, el.loadingFactura);
  try {
    const data = await fetchJson(`/api/pedido-detalle/${state.pedidoSeleccionado.codigo_pedido}`);
    state.productosFactura = (data.rows || [])
      .filter((item) => Number(item.saldo || 0) > 0)
      .map((item) => ({
        codigo_producto: item.codigo_producto,
        nombre_producto: item.nombre_producto,
        saldo: Number(item.saldo || 0),
        precio_unitario: Number(item.precio_unitario || 0),
        cantidad: Number(item.saldo || 0),
        precio_total: Number(item.saldo || 0) * Number(item.precio_unitario || 0)
      }));

    const doc = await fetchJson('/api/next-documento');
    state.factura.numero_documento = String(doc.next || '');
    state.factura.tipo_documento = 'FAC';

    updateFacturaInputs();
    renderProductos();
    updateTotals();
    await loadSaldoFavor();
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  } finally {
    setLoading(false, el.loadingFactura);
  }
}

async function loadSaldoFavor() {
  state.saldoFavor.total = 0;
  state.saldoFavor.ntc = 0;
  state.saldoFavor.rcp = 0;
  state.saldoFavor.usado = 0;
  updateSaldoFavorUI();
  const cliente = state.pedidoSeleccionado?.codigo_cliente;
  if (!cliente) {
    return;
  }
  const data = await fetchJson(`/api/saldo-favor?cliente=${cliente}`);
  const rows = data.rows || [];
  rows.forEach((row) => {
    const saldo = Number(row.saldo || 0);
    if (row.tipo_documento === 'NTC') {
      state.saldoFavor.ntc += saldo;
    } else if (row.tipo_documento === 'RCP') {
      state.saldoFavor.rcp += saldo;
    }
  });
  state.saldoFavor.total = state.saldoFavor.ntc + state.saldoFavor.rcp;
  updateSaldoFavorUsado();
  recalcPendiente();
}


function updateFacturaInputs() {
  el.tipoDocumento.value = state.factura.tipo_documento;
  el.numeroDocumento.value = state.factura.numero_documento;
}

function updateFechaInputs() {
  el.fechaEmision.value = state.factura.fecha_emision;
  el.horaEmision.value = state.factura.hora_emision;
}

function updateFechaP() {
  state.factura.fecha_emision = el.fechaEmision.value || state.factura.fecha_emision;
  state.factura.hora_emision = el.horaEmision.value || state.factura.hora_emision;
  if (state.factura.fecha_emision && state.factura.hora_emision) {
    state.factura.fechaP = `${state.factura.fecha_emision} ${state.factura.hora_emision}:00`;
  }
}

function renderProductos() {
  el.productosTable.innerHTML = '';
  const disableRemove = state.productosFactura.length <= 1;
  state.productosFactura.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.nombre_producto || ''}</td>
      <td>${formatNumber(item.saldo)}</td>
      <td>
        <input class="form-control form-control-sm cantidad-input" data-index="${index}" value="${item.cantidad}" />
      </td>
      <td>${formatNumber(item.precio_total)}</td>
      <td>
        <button class="btn btn-outline-light btn-sm" data-remove="${index}" ${disableRemove ? 'disabled' : ''}>${i18n[state.lang].clear}</button>
      </td>
    `;
    el.productosTable.appendChild(row);
  });

  el.productosTable.querySelectorAll('.cantidad-input').forEach((input) => {
    input.addEventListener('input', (event) => {
      const index = Number(event.target.getAttribute('data-index'));
      const value = event.target.value.trim();
      if (value === '' || !regex.decimal.test(value)) {
        state.productosFactura[index].cantidad = value;
      } else {
        state.productosFactura[index].cantidad = Number(value);
        state.productosFactura[index].precio_total =
          Number(value) * Number(state.productosFactura[index].precio_unitario || 0);
      }
      updateTotals();
      renderProductos();
    });
  });

  el.productosTable.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      if (state.productosFactura.length <= 1) return;
      const index = Number(button.getAttribute('data-remove'));
      state.productosFactura.splice(index, 1);
      updateTotals();
      renderProductos();
    });
  });
}

function updateTotals() {
  const monto = state.productosFactura.reduce((acc, item) => acc + Number(item.precio_total || 0), 0);
  state.factura.monto = monto;
  state.factura.total = monto + Number(state.factura.costo_envio || 0);
  state.factura.saldo = state.factura.total;
  el.montoFactura.textContent = formatNumber(state.factura.monto);
  el.costoEnvio.textContent = formatNumber(state.factura.costo_envio || 0);
  el.totalFactura.textContent = formatNumber(state.factura.total);
  el.saldoFactura.textContent = formatNumber(state.factura.saldo);
  updateSaldoFavorUsado();
  recalcPendiente();
}

function updateSaldoFavorUI() {
  if (el.saldoFavorTotal) el.saldoFavorTotal.textContent = formatNumber(state.saldoFavor.total);
  if (el.saldoFavorNtc) el.saldoFavorNtc.textContent = formatNumber(state.saldoFavor.ntc);
  if (el.saldoFavorRcp) el.saldoFavorRcp.textContent = formatNumber(state.saldoFavor.rcp);
  if (el.saldoFavorUsar) {
    el.saldoFavorUsar.disabled = state.saldoFavor.total <= 0;
    if (el.saldoFavorUsar.disabled) {
      el.saldoFavorUsar.checked = false;
    }
  }
}

function updateSaldoFavorUsado() {
  const usar = el.saldoFavorUsar?.checked ? state.factura.total : 0;
  state.saldoFavor.usado = Math.min(state.saldoFavor.total, usar);
  updateSaldoFavorUI();
}

function recalcPendiente() {
  const pagosTotal = sumPagos();
  let pendiente = state.factura.total - state.saldoFavor.usado - pagosTotal;
  if (pendiente < 0) {
    pendiente = 0;
  }
  state.pago.monto_pendiente = pendiente;
  if (el.montoPendiente) {
    el.montoPendiente.value = formatNumber(state.pago.monto_pendiente);
  }
  const bloqueado = state.pago.monto_pendiente <= 0;
  if (el.montoPago) {
    if (bloqueado) {
      el.montoPago.value = formatNumber(state.pago.monto_pendiente);
    } else if (!el.montoPago.value) {
      el.montoPago.value = formatNumber(state.pago.monto_pendiente);
    }
  }
  if (el.pagoBloqueado) {
    el.pagoBloqueado.classList.toggle('d-none', !bloqueado);
  }
  if (el.montoPago) el.montoPago.disabled = bloqueado;
  if (el.btnAgregarPago) el.btnAgregarPago.disabled = bloqueado;
  if (el.cuentaNombre) el.cuentaNombre.disabled = bloqueado;
  if (el.cuentaBanco) el.cuentaBanco.disabled = bloqueado;
}

function validateDetalleFactura() {
  if (!state.productosFactura.length) {
    return false;
  }
  let valid = true;
  state.productosFactura.forEach((item) => {
    const cantidad = item.cantidad;
    if (cantidad === '' || !regex.decimal.test(String(cantidad))) {
      valid = false;
      return;
    }
    if (Number(cantidad) > Number(item.saldo || 0)) {
      valid = false;
    }
  });
  return valid;
}

async function prepareEntrega() {
  setLoading(true, el.loadingEntrega);
  try {
    const cliente = state.pedidoSeleccionado.codigo_cliente;
    const data = await fetchJson(`/api/puntos-entrega?cliente=${cliente}`);
    state.entrega.puntos = data.rows || [];
    renderEntregaUI();
    if (!state.entrega.puntos.length) {
      setEntregaModo('nuevo');
    }
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  } finally {
    setLoading(false, el.loadingEntrega);
  }
}

function renderEntregaUI() {
  el.puntosEntregaList.innerHTML = '';
  state.entrega.puntos.forEach((punto) => {
    const option = document.createElement('option');
    option.value = punto.concatenarpuntoentrega || '';
    el.puntosEntregaList.appendChild(option);
  });
  const hasExisting = state.entrega.puntos.length > 0;
  el.entregaExistente.parentElement.classList.toggle('d-none', !hasExisting);
  el.entregaExistenteSection.classList.toggle('d-none', state.entrega.modo !== 'existente');
  el.entregaNuevoSection.classList.toggle('d-none', state.entrega.modo !== 'nuevo');
}

function setEntregaModo(modo) {
  state.entrega.modo = modo;
  el.entregaExistente.checked = modo === 'existente';
  el.entregaNuevo.checked = modo === 'nuevo';
  renderEntregaUI();
  if (modo === 'nuevo') {
    state.entrega.seleccionado = null;
    initMap();
    loadUbigeo();
    loadNextPuntoEntrega();
  } else {
    state.entrega.codigo_puntoentrega = state.entrega.seleccionado?.codigo_puntoentrega || null;
  }
}

function selectPuntoEntrega(value) {
  const selected = state.entrega.puntos.find(
    (punto) => (punto.concatenarpuntoentrega || '').toLowerCase() === value.toLowerCase()
  );
  state.entrega.seleccionado = selected || null;
  if (selected) {
    state.entrega.codigo_puntoentrega = selected.codigo_puntoentrega;
    state.entrega.region_entrega = String(selected.region_entrega || '').toUpperCase();
    state.entrega.cod_dep = selected.cod_dep || state.entrega.cod_dep;
    state.entrega.cod_prov = selected.cod_prov || state.entrega.cod_prov;
    state.entrega.cod_dist = selected.cod_dist || state.entrega.cod_dist;
    state.entrega.distrito_nombre = selected.distrito || state.entrega.distrito_nombre;
    state.entrega.ubigeo = selected.ubigeo || state.entrega.ubigeo;
    state.entrega.direccion_linea = selected.direccion_linea || '';
    state.entrega.referencia = selected.referencia || '';
    state.entrega.nombre = selected.nombre || '';
    state.entrega.dni = selected.dni || '';
    state.entrega.agencia = selected.agencia || '';
    state.entrega.observaciones = selected.observaciones || '';
    state.entrega.latitud = selected.latitud ? Number(selected.latitud) : null;
    state.entrega.longitud = selected.longitud ? Number(selected.longitud) : null;
    state.entrega.concatenarpuntoentrega = selected.concatenarpuntoentrega || '';
    setCostoEnvio();
  }
}

async function loadUbigeo() {
  try {
    const deps = await fetchJson('/api/ubigeo/departamentos');
    el.departamentosList.innerHTML = '';
    deps.rows.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.cod_dep;
      option.label = item.departamento;
      el.departamentosList.appendChild(option);
    });
    el.codDep.value = state.entrega.cod_dep;
    await loadProvincias(state.entrega.cod_dep);
    el.codProv.value = state.entrega.cod_prov;
    await loadDistritos(state.entrega.cod_dep, state.entrega.cod_prov);
    updateRegion();
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  }
}

async function loadProvincias(codDep) {
  const data = await fetchJson(`/api/ubigeo/provincias?cod_dep=${codDep}`);
  el.provinciasList.innerHTML = '';
  data.rows.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.cod_prov;
    option.label = item.provincia;
    el.provinciasList.appendChild(option);
  });
}

async function loadDistritos(codDep, codProv) {
  const data = await fetchJson(`/api/ubigeo/distritos?cod_dep=${codDep}&cod_prov=${codProv}`);
  el.distritosList.innerHTML = '';
  state.entrega.distritos = data.rows || [];
  state.entrega.distritos.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.cod_dist;
    option.label = item.distrito;
    el.distritosList.appendChild(option);
  });
}

async function updateUbigeo() {
  state.entrega.cod_dep = el.codDep.value.trim() || '15';
  state.entrega.cod_prov = el.codProv.value.trim() || '01';
  state.entrega.cod_dist = el.codDist.value.trim();
  await loadProvincias(state.entrega.cod_dep);
  await loadDistritos(state.entrega.cod_dep, state.entrega.cod_prov);
  const distrito = state.entrega.distritos.find((item) => String(item.cod_dist) === String(state.entrega.cod_dist));
  state.entrega.distrito_nombre = distrito ? distrito.distrito : '';
  updateRegion();
}

function updateRegion() {
  state.entrega.region_entrega =
    state.entrega.cod_dep === '15' && state.entrega.cod_prov === '01' ? 'LIMA' : 'PROV';
  state.entrega.ubigeo = `${state.entrega.cod_dep}${state.entrega.cod_prov}${state.entrega.cod_dist || ''}`;
  el.fieldsLima.classList.toggle('d-none', state.entrega.region_entrega !== 'LIMA');
  el.fieldsProv.classList.toggle('d-none', state.entrega.region_entrega !== 'PROV');
  setCostoEnvio();
  updateConcatenarEntrega();
}

function setCostoEnvio() {
  state.factura.costo_envio = state.entrega.region_entrega === 'PROV' ? 50 : 0;
  updateTotals();
}

function updateConcatenarEntrega() {
  if (state.entrega.region_entrega === 'LIMA') {
    const parts = [
      state.entrega.direccion_linea,
      state.entrega.distrito_nombre || state.entrega.cod_dist,
      state.entrega.referencia
    ].filter(Boolean);
    state.entrega.concatenarpuntoentrega = parts.join(' | ');
  } else {
    const parts = [state.entrega.nombre, state.entrega.dni, state.entrega.agencia, state.entrega.observaciones].filter(Boolean);
    state.entrega.concatenarpuntoentrega = parts.join(' | ');
  }
}

function validateEntrega() {
  if (state.entrega.modo === 'existente') {
    return !!state.entrega.seleccionado;
  }
  if (!state.entrega.cod_dep || !state.entrega.cod_prov) {
    return false;
  }
  if (state.entrega.region_entrega === 'LIMA') {
    return !!state.entrega.direccion_linea;
  }
  return !!state.entrega.nombre;
}

async function prepareRecibe() {
  setLoading(true, el.loadingRecibe);
  try {
    const cliente = state.pedidoSeleccionado.codigo_cliente;
    const data = await fetchJson(`/api/numrecibe?cliente=${cliente}`);
    state.recibe.lista = data.rows || [];
    renderRecibeUI();
    if (!state.recibe.lista.length) {
      await setRecibeModo('nuevo');
    }
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  } finally {
    setLoading(false, el.loadingRecibe);
  }
}

function renderRecibeUI() {
  el.numRecibeList.innerHTML = '';
  state.recibe.lista.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.concatenarnumrecibe || '';
    el.numRecibeList.appendChild(option);
  });
  const hasExisting = state.recibe.lista.length > 0;
  el.recibeExistente.parentElement.classList.toggle('d-none', !hasExisting);
  el.recibeExistenteSection.classList.toggle('d-none', state.recibe.modo !== 'existente');
  el.recibeNuevoSection.classList.toggle('d-none', state.recibe.modo !== 'nuevo');
}

async function setRecibeModo(modo) {
  state.recibe.modo = modo;
  el.recibeExistente.checked = modo === 'existente';
  el.recibeNuevo.checked = modo === 'nuevo';
  renderRecibeUI();
  if (modo === 'nuevo') {
    state.recibe.seleccionado = null;
    const cliente = state.pedidoSeleccionado.codigo_cliente;
    try {
      const data = await fetchJson(`/api/next-numrecibe?cliente=${cliente}`);
      state.recibe.ordinal_numrecibe = data.next;
      el.ordinalRecibe.value = data.next;
    } catch (error) {
      showAlert(i18n[state.lang].errorServer);
    }
  }
}

function selectNumRecibe(value) {
  const selected = state.recibe.lista.find(
    (item) => (item.concatenarnumrecibe || '').toLowerCase() === value.toLowerCase()
  );
  state.recibe.seleccionado = selected || null;
  if (selected) {
    state.recibe.ordinal_numrecibe = selected.ordinal_numrecibe;
    state.recibe.numero = selected.numero;
    state.recibe.nombre = selected.nombre;
    state.recibe.concatenarnumrecibe = selected.concatenarnumrecibe;
  }
}

function updateConcatenarRecibe() {
  const parts = [state.recibe.numero, state.recibe.nombre].filter(Boolean);
  state.recibe.concatenarnumrecibe = parts.join(' | ');
}

function validateRecibe() {
  if (state.entrega.region_entrega !== 'LIMA') {
    return true;
  }
  if (state.recibe.modo === 'existente') {
    return !!state.recibe.seleccionado;
  }
  return !!state.recibe.numero && !!state.recibe.nombre;
}

async function preparePagos() {
  setLoading(true, el.loadingPagos);
  try {
    const data = await fetchJson('/api/next-documento-pago');
    state.pago.numero_documento_base = data.next;
    el.numeroDocumentoPago.value = data.next;
    recalcPendiente();
    el.montoPago.value = state.pago.monto_pendiente ? formatNumber(state.pago.monto_pendiente) : '';
    el.btnAgregarPago.disabled = false;
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  } finally {
    setLoading(false, el.loadingPagos);
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function selectCuenta(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    state.pago.codigo_cuentabancaria = null;
    state.pago.cuenta_nombre = '';
    state.pago.cuenta_banco = '';
    el.cuentaBanco.value = '';
    return;
  }
  const selected =
    state.cuentas.find((item) => normalizeText(item.nombre) === normalized) ||
    state.cuentas.find((item) => normalizeText(`${item.nombre} | ${item.banco}`) === normalized);
  if (selected) {
    state.pago.codigo_cuentabancaria = selected.codigo_cuentabancaria;
    state.pago.cuenta_nombre = selected.nombre;
    state.pago.cuenta_banco = selected.banco;
    el.cuentaBanco.value = selected.banco || '';
  }
}

function parseMoney(value) {
  const cleaned = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

function addPago() {
  const montoNum = parseMoney(el.montoPago.value);
  if (!Number.isFinite(montoNum)) {
    showAlert(i18n[state.lang].errorPago);
    return;
  }
  if (montoNum <= 0) {
    showAlert(i18n[state.lang].errorPago);
    return;
  }
  if (montoNum > state.pago.monto_pendiente) {
    showAlert(i18n[state.lang].errorPago);
    return;
  }
  if (!state.pago.codigo_cuentabancaria) {
    selectCuenta(el.cuentaNombre.value);
  }
  if (state.pago.codigo_cuentabancaria == null) {
    showAlert(i18n[state.lang].errorPago);
    return;
  }

  const numdocumento = Number(state.pago.numero_documento_base || 0) + state.pagos.length;
  state.pagos.push({
    numdocumento,
    monto: montoNum,
    codigo_cuentabancaria: state.pago.codigo_cuentabancaria,
    cuenta_nombre: state.pago.cuenta_nombre
  });

  renderPagos();
  el.montoPago.value = state.pago.monto_pendiente ? formatNumber(state.pago.monto_pendiente) : '';
  el.btnAgregarPago.disabled = false;
}

function renderPagos() {
  el.pagosTable.innerHTML = '';
  state.pagos.forEach((pago, index) => {
    const numero = pago.numdocumento ?? Number(state.pago.numero_documento_base) + index;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${numero}</td>
      <td>${pago.cuenta_nombre || ''}</td>
      <td>${formatNumber(pago.monto)}</td>
      <td><button class="btn btn-outline-light btn-sm" data-remove="${index}">${i18n[state.lang].clear}</button></td>
    `;
    row.querySelector('button').addEventListener('click', () => removePago(index));
    el.pagosTable.appendChild(row);
  });
  recalcPendiente();
}

function removePago(index) {
  const removed = state.pagos.splice(index, 1)[0];
  if (removed) {
    renderPagos();
    el.montoPago.value = formatNumber(state.pago.monto_pendiente);
    el.btnAgregarPago.disabled = false;
  }
}

function sumPagos() {
  return state.pagos.reduce((acc, item) => acc + Number(item.monto || 0), 0);
}

function validatePagos() {
  if (!state.pagos.length) {
    return true;
  }
  const hasMissingCuenta = state.pagos.some((pago) => !pago.codigo_cuentabancaria);
  if (hasMissingCuenta) {
    showAlert(i18n[state.lang].errorCuenta);
    return false;
  }
  if (!state.pagos.every((pago) => Number(pago.monto) > 0)) {
    return false;
  }
  return true;
}

async function prepareBases() {
  setLoading(true, el.loadingBases);
  try {
    const items = state.productosFactura.map((item) => ({
      vFProducto: item.codigo_producto,
      vFCantidadProducto: Number(item.cantidad || 0),
      vFPrecioTotal: Number(item.precio_total || 0)
    }));
    const data = await fetchJson('/api/bases-candidatas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, fechaP: state.factura.fechaP })
    });
    const seen = new Set();
    state.basesCandidatas = (data.rows || [])
      .map((row) => normalizeBaseCandidata(row))
      .filter((row) => {
        if (!row.codigo_base) return false;
        const key = String(row.codigo_base);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    renderBaseList(state.basesCandidatas.map((item) => String(item.codigo_base)));
    renderBasesCandidatas();
    await computeEta();
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  } finally {
    setLoading(false, el.loadingBases);
  }
}

async function computeEta() {
  state.basesEta = [];
  el.baseSugerida.textContent = '-';
  state.baseSugerida = null;
  if (!state.basesCandidatas.length) {
    renderBasesEta();
    return;
  }
  const hasCoords = Number.isFinite(state.entrega.latitud) && Number.isFinite(state.entrega.longitud);
  const originAddress = hasCoords ? '' : buildOriginAddress();
  if (!hasCoords && !originAddress) {
    renderBasesEta();
    return;
  }

  try {
    const destinations = state.basesCandidatas
      .map((base) => ({
        codigo_base: base.codigo_base,
        lat: Number(base.latitud),
        lng: Number(base.longitud)
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    if (!destinations.length) {
      renderBasesEta();
      return;
    }

    const data = await fetchJson('/api/distance-matrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: hasCoords ? { lat: state.entrega.latitud, lng: state.entrega.longitud } : null,
        originAddress: hasCoords ? '' : originAddress,
        destinations
      })
    });

    state.basesEta = (data.rows || []).map((item) => ({
      codigo_base: item.codigo_base,
      duration: item.duration,
      distance: item.distance,
      status: item.status
    }));
    renderBasesEta();
    applyBaseSugerida();
  } catch (error) {
    renderBasesEta();
  }
}

function renderBasesCandidatas() {
  el.basesCandidatasTable.innerHTML = '';
  state.basesCandidatas.forEach((base) => {
    const name = getBaseName(base.codigo_base);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${name}</td>
      <td>${base.latitud || ''}, ${base.longitud || ''}</td>
    `;
    el.basesCandidatasTable.appendChild(row);
  });
}

function renderBasesEta() {
  el.basesEtaTable.innerHTML = '';
  if (!state.basesEta.length) {
    el.etaHint.textContent = i18n[state.lang].etaHint;
    return;
  }
  const sorted = [...state.basesEta].filter((item) => item.status === 'OK').sort((a, b) => {
    return (a.duration?.value || 0) - (b.duration?.value || 0);
  });
  sorted.forEach((item) => {
    const row = document.createElement('tr');
    const baseName = getBaseName(item.codigo_base);
    const etaText = item.duration ? item.duration.text : '-';
    row.innerHTML = `
      <td>${baseName}</td>
      <td>${etaText}</td>
    `;
    el.basesEtaTable.appendChild(row);
  });
  el.etaHint.textContent = '';
}

function applyBaseSugerida() {
  const sorted = [...state.basesEta].filter((item) => item.status === 'OK').sort((a, b) => {
    return (a.duration?.value || 0) - (b.duration?.value || 0);
  });
  if (!sorted.length) return;
  const best = sorted[0];
  const name = getBaseName(best.codigo_base);
  state.baseSugerida = {
    codigo_base: best.codigo_base,
    nombre: name
  };
  el.baseSugerida.textContent = `${name} (${best.duration?.text || ''})`;
  if (!state.baseManual || !state.factura.codigo_base) {
    state.factura.codigo_base = best.codigo_base;
    state.factura.base_nombre = name;
    el.baseNombreFinal.value = name;
    updateBasePill();
  }
}

function validateBase() {
  return !!state.factura.codigo_base;
}

function renderResumen() {
  const pedido = state.pedidoSeleccionado || {};
  el.resumenPedido.innerHTML = `
    <div>Pedido: ${pedido.codigo_pedido || '-'}</div>
    <div>Cliente: ${pedido.nombre_cliente || '-'} (${pedido.numero_cliente || '-'})</div>
    <div>Fecha: ${formatDate(pedido.fecha)}</div>
  `;

  el.resumenFactura.innerHTML = `
    <div>Documento: ${state.factura.tipo_documento} ${state.factura.numero_documento}</div>
    <div>Fecha emision: ${state.factura.fechaP}</div>
    <div>Monto: ${formatNumber(state.factura.monto)}</div>
    <div>Costo envio: ${formatNumber(state.factura.costo_envio)}</div>
    <div>Total: ${formatNumber(state.factura.total)}</div>
  `;

  const entregaTipo = state.entrega.modo === 'existente' ? i18n[state.lang].modoExistente : i18n[state.lang].modoNuevo;
  el.resumenEntrega.innerHTML = `
    <div>Modo: ${entregaTipo}</div>
    <div>Region: ${state.entrega.region_entrega || '-'}</div>
    <div>Punto: ${state.entrega.concatenarpuntoentrega || state.entrega.seleccionado?.concatenarpuntoentrega || '-'}</div>
  `;

  const recibeTipo = state.recibe.modo === 'existente' ? i18n[state.lang].modoExistente : i18n[state.lang].modoNuevo;
  el.resumenRecibe.innerHTML = `
    <div>Modo: ${state.entrega.region_entrega === 'LIMA' ? recibeTipo : i18n[state.lang].noAplica}</div>
    <div>Recibe: ${state.recibe.concatenarnumrecibe || state.recibe.seleccionado?.concatenarnumrecibe || '-'}</div>
  `;

  if (!state.pagos.length) {
    el.resumenPago.innerHTML = `<div>${i18n[state.lang].sinPagos}</div>`;
  } else {
    el.resumenPago.innerHTML = state.pagos
      .map((pago, idx) => {
        const numero = pago.numdocumento ?? Number(state.pago.numero_documento_base) + idx;
        return `<div>RCP ${numero}: ${formatNumber(pago.monto)}</div>`;
      })
      .join('');
  }

  el.resumenBase.innerHTML = `
    <div>Base: ${state.factura.base_nombre || '-'}</div>
    <div>Codigo: ${state.factura.codigo_base || '-'}</div>
  `;
}

function buildEmitPayload() {
  const pedido = state.pedidoSeleccionado || {};
  const entrega = state.entrega;
  const recibe = state.recibe;
  const factura = state.factura;

  return {
    pedido: {
      codigo_pedido: pedido.codigo_pedido,
      codigo_cliente: pedido.codigo_cliente
    },
    factura: {
      tipo_documento: factura.tipo_documento,
      numero_documento: factura.numero_documento,
      fechaP: factura.fechaP,
      codigo_base: factura.codigo_base,
      monto: factura.monto,
      saldo: factura.saldo,
      saldo_favor_usado: state.saldoFavor.usado,
      costo_envio: factura.costo_envio,
      detalles: state.productosFactura.map((item) => ({
        codigo_producto: item.codigo_producto,
        cantidad: Number(item.cantidad || 0),
        precio_total: Number(item.precio_total || 0)
      }))
    },
    entrega: {
      modo: entrega.modo,
      ubigeo: entrega.ubigeo,
      codigo_puntoentrega: entrega.codigo_puntoentrega,
      codigo_cliente_puntoentrega: pedido.codigo_cliente,
      direccion_linea: entrega.direccion_linea,
      referencia: entrega.referencia,
      nombre: entrega.nombre,
      dni: entrega.dni,
      agencia: entrega.agencia,
      observaciones: entrega.observaciones,
      region_entrega: entrega.region_entrega,
      concatenarpuntoentrega: entrega.concatenarpuntoentrega || entrega.seleccionado?.concatenarpuntoentrega,
      latitud: entrega.latitud,
      longitud: entrega.longitud
    },
    recibe: {
      modo: recibe.modo,
      ordinal_numrecibe: recibe.ordinal_numrecibe,
      numero: recibe.numero,
      nombre: recibe.nombre,
      concatenarnumrecibe: recibe.concatenarnumrecibe || recibe.seleccionado?.concatenarnumrecibe
    },
    pagos: state.pagos.map((pago) => ({
      numdocumento: pago.numdocumento,
      monto: pago.monto,
      codigo_cuentabancaria: pago.codigo_cuentabancaria
    }))
  };
}

function formatNumber(value) {
  const number = Number(value || 0);
  return number.toFixed(2);
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return '-';
  const text = String(value);
  return text.length > 16 ? text.slice(0, 16).replace('T', ' ') : text;
}

function handleBaseSelection(value) {
  const selected = state.bases.find((base) => (base.nombre || '').toLowerCase() === value.toLowerCase());
  if (selected) {
    state.factura.codigo_base = selected.codigo_base;
    state.factura.base_nombre = selected.nombre;
    el.baseNombreFinal.value = selected.nombre;
    updateBasePill();
  }
}

function updateBasePill() {
  el.baseSeleccionada.textContent = state.factura.base_nombre
    ? `${state.factura.base_nombre} (${state.factura.codigo_base})`
    : '-';
}

async function loadNextPuntoEntrega() {
  try {
    const cliente = state.pedidoSeleccionado.codigo_cliente;
    const data = await fetchJson(`/api/next-punto-entrega?cliente=${cliente}`);
    state.entrega.codigo_puntoentrega = data.next;
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  }
}

async function loadBases() {
  try {
    const data = await fetchJson('/api/bases');
    state.bases = data.rows || [];
    renderBaseList();
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  }
}

function renderBaseList(priorityCodes = []) {
  const prioritySet = new Set(priorityCodes.map((code) => String(code)));
  const sorted = [...state.bases].sort((a, b) => {
    const aPriority = prioritySet.has(String(a.codigo_base)) ? 0 : 1;
    const bPriority = prioritySet.has(String(b.codigo_base)) ? 0 : 1;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return String(a.nombre || '').localeCompare(String(b.nombre || ''));
  });
  el.basesList.innerHTML = '';
  sorted.forEach((base) => {
    const option = document.createElement('option');
    option.value = base.nombre;
    el.basesList.appendChild(option);
  });
}

async function loadCuentas() {
  try {
    const data = await fetchJson('/api/cuentas-bancarias');
    state.cuentas = data.rows || [];
    el.cuentasList.innerHTML = '';
    state.cuentas.forEach((cuenta) => {
      const option = document.createElement('option');
      option.value = cuenta.nombre;
      el.cuentasList.appendChild(option);
    });
  } catch (error) {
    showAlert(i18n[state.lang].errorServer);
  }
}

function getBaseName(codigoBase) {
  const base = state.bases.find((item) => String(item.codigo_base) === String(codigoBase));
  return base ? base.nombre : `Base ${codigoBase}`;
}

async function loadMapsConfig() {
  try {
    const data = await fetchJson('/api/maps-config');
    state.mapsConfig = data;
  } catch (error) {
    state.mapsConfig = { apiKey: '', defaultCenter: null, defaultZoom: 12 };
  }
}

function initMap() {
  if (state.mapLoaded) return;
  if (!state.mapsConfig || !state.mapsConfig.apiKey) return;

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${state.mapsConfig.apiKey}&libraries=places&callback=initWizardMap`;
  script.async = true;
  window.initWizardMap = () => {
    const center = state.mapsConfig.defaultCenter || { lat: -12.0464, lng: -77.0428 };
    const zoom = state.mapsConfig.defaultZoom || 12;
    state.map = new google.maps.Map(el.mapCanvas, {
      center,
      zoom
    });
    state.marker = new google.maps.Marker({ map: state.map });
    const geocoder = new google.maps.Geocoder();

    const autocomplete = new google.maps.places.Autocomplete(el.mapSearch, {
      fields: ['geometry', 'formatted_address']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
      const location = place.geometry.location;
      updateLocation(location.lat(), location.lng(), place.formatted_address);
    });

    state.map.addListener('click', (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      updateLocation(lat, lng, null);
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          updateLocation(lat, lng, results[0].formatted_address);
        }
      });
    });

    state.mapLoaded = true;
  };
  document.body.appendChild(script);
}

function updateLocation(lat, lng, address) {
  state.entrega.latitud = lat;
  state.entrega.longitud = lng;
  el.latitud.value = lat.toFixed(6);
  el.longitud.value = lng.toFixed(6);
  if (state.marker) {
    state.marker.setPosition({ lat, lng });
    state.map.setCenter({ lat, lng });
  }
  if (address) {
    el.direccionLinea.value = address;
    state.entrega.direccion_linea = address;
    updateConcatenarEntrega();
  }
  if (state.basesCandidatas.length) {
    computeEta();
  }
}

const wizard = new FormWizard();

wizard.init();
