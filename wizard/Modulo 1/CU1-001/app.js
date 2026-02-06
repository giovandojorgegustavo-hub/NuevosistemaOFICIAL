/*
Campos devueltos por SPs de lectura
vClienteNombre = Llamada SP: get_clientes() (devuelve nombre)
Campos devueltos
vcodigo_cliente = codigo_cliente
vnombre = nombre
vnumero = numero
Variables
vClienteCodigo (no visible, no editable)
vClienteNombre (visible, editable)
vClienteNumero (no visible, no editable)

vProductoNombre = Llamada SP: get_productos() (devuelve nombre)
Campos devueltos
vcodigo_producto = codigo_producto
vnombre = nombre
Variables
vProductoCodigo (no visible, no editable)
vProductoNombre (visible, editable)

vPuntoEntregaTexto = Llamada SP: get_puntos_entrega(vClienteCodigo) (devuelve concatenarpuntoentrega)
Campos devueltos
vcod_dep = cod_dep
vcod_prov = cod_prov
vcod_dist = cod_dist
vdepartamento = departamento
vprovincia = provincia
vdistrito = distrito
vubigeo = ubigeo
vcodigo_puntoentrega = codigo_puntoentrega
vcodigo_cliente = codigo_cliente
vregion_entrega = region_entrega
vdireccion_linea = direccion_linea
vreferencia = referencia
vnombre = nombre
vdni = dni
vagencia = agencia
vobservaciones = observaciones
vconcatenarpuntoentrega = concatenarpuntoentrega
vestado = estado
Variables
vPuntoEntregaTexto (visible, editable)
vRegion_Entrega (no visible, no editable)
vDireccionLinea (visible si LIMA, editable)
vReferencia (visible si LIMA, editable)
vNombre (visible si PROV, editable)
vDni (visible si PROV, editable)
vAgencia (visible si PROV, editable)
vObservaciones (visible si PROV, editable)

vDepartamento = Llamada SP: get_ubigeo_departamentos() (devuelve departamento)
Campos devueltos
vcod_dep = cod_dep
vdepartamento = departamento
Variables
vCod_Dep (visible, editable)
vDepartamento (visible, editable)

vProvincia = Llamada SP: get_ubigeo_provincias(vCod_Dep) (devuelve provincia)
Campos devueltos
vcod_prov = cod_prov
vprovincia = provincia
Variables
vCod_Prov (visible, editable)
vProvincia (visible, editable)

vDistrito = Llamada SP: get_ubigeo_distritos(vCod_Dep, vCod_Prov) (devuelve distrito)
Campos devueltos
vcod_dist = cod_dist
vdistrito = distrito
Variables
vCod_Dist (visible, editable)
vDistrito (visible, editable)

vConcatenarnumrecibe = Llamada SP: get_numrecibe(vClienteCodigo) (devuelve concatenarnumrecibe)
Campos devueltos
vcodigo_cliente_numrecibe = codigo_cliente_numrecibe
vordinal_numrecibe = ordinal_numrecibe
vnumero = numero
vnombre = nombre
vconcatenarnumrecibe = concatenarnumrecibe
Variables
vOrdinal_numrecibe (no visible, no editable)
vNumeroRecibe (no visible, no editable)
vNombreRecibe (no visible, no editable)
vConcatenarnumrecibe (visible, editable)

vCuentaNombre = Llamada SP: get_cuentasbancarias() (devuelve nombre)
Campos devueltos
vcodigo_cuentabancaria = codigo_cuentabancaria
vnombre = nombre
vbanco = banco
Variables
vCuentaNombre (visible, editable)
vCuentaBanco (visible, no editable)

vBaseNombre = Llamada SP: get_bases() (devuelve nombre)
Campos devueltos
vcodigo_base = codigo_base
vnombre = nombre
vlatitud = latitud
vlongitud = longitud
Variables
vCodigo_base (no visible, editable)
vBaseNombre (visible, editable)

vCodigo_base = Llamada SP: get_bases_candidatas(p_vProdFactura JSON, vFechaPedido DATETIME) (devuelve codigo_base)
Campos devueltos
vcodigo_base = codigo_base
vlatitud = latitud
vlongitud = longitud
Variables
vCodigo_base (no visible, editable)
*/

const state = {
  lang: 'es',
  step: 1,
  config: {
    apiKey: '',
    defaultCenter: { lat: -12.0464, lng: -77.0428 },
    defaultZoom: 12
  },
  cliente: {
    tipo: 'existe',
    codigo: null,
    nombre: '',
    numero: ''
  },
  pedido: {
    codigo: null,
    fecha: '',
    hora: '',
    fechaCompleta: ''
  },
  factura: {
    numero: null,
    tipo: 'FAC',
    monto: 0,
    costoEnvio: 0,
    total: 0,
    saldo: 0
  },
  entrega: {
    tipo: 'existe',
    codigoPunto: null,
    region: '',
    direccion: '',
    referencia: '',
    nombre: '',
    dni: '',
    agencia: '',
    observaciones: '',
    codDep: '15',
    codProv: '01',
    codDist: '',
    ubigeo: '',
    distrito: '',
    latitud: '',
    longitud: '',
    concatenado: ''
  },
  recibe: {
    tipo: 'existe',
    ordinal: null,
    numero: '',
    nombre: '',
    concatenado: ''
  },
  pagos: [],
  pago: {
    tipo: 'RCP',
    numeroBase: null,
    monto: '',
    pendiente: 0,
    cuentaCodigo: null,
    cuentaNombre: '',
    cuentaBanco: ''
  },
  base: {
    codigo: null,
    nombre: '',
    sugerida: ''
  },
  data: {
    clientes: [],
    productos: [],
    puntosEntrega: [],
    departamentos: [],
    provincias: [],
    distritos: [],
    numrecibe: [],
    cuentas: [],
    bases: [],
    basesCandidatas: [],
    basesEta: []
  },
  pedidoItems: [],
  facturaItems: []
};

const decimalRegex = /^\d+(\.\d{1,2})?$/;
const integerRegex = /^\d+$/;

const el = {
  statusPill: document.getElementById('statusPill'),
  progressBar: document.getElementById('progressBar'),
  stepIndicator: document.getElementById('stepIndicator'),
  formAlert: document.getElementById('formAlert'),
  formSuccess: document.getElementById('formSuccess'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  steps: Array.from(document.querySelectorAll('.wizard-step')),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  emitirFactura: document.getElementById('emitirFactura'),
  confirmOperacion: document.getElementById('confirmOperacion'),
  clienteExiste: document.getElementById('clienteExiste'),
  clienteNuevo: document.getElementById('clienteNuevo'),
  clienteExistePanel: document.getElementById('clienteExistePanel'),
  clienteNuevoPanel: document.getElementById('clienteNuevoPanel'),
  clienteNombre: document.getElementById('clienteNombre'),
  clienteNombreNuevo: document.getElementById('clienteNombreNuevo'),
  clienteNumeroNuevo: document.getElementById('clienteNumeroNuevo'),
  clientesList: document.getElementById('clientesList'),
  fechaPedido: document.getElementById('fechaPedido'),
  horaPedido: document.getElementById('horaPedido'),
  codigoPedido: document.getElementById('codigoPedido'),
  pedidoTable: document.getElementById('pedidoTable').querySelector('tbody'),
  addPedidoRow: document.getElementById('addPedidoRow'),
  fechaEmision: document.getElementById('fechaEmision'),
  horaEmision: document.getElementById('horaEmision'),
  numeroFactura: document.getElementById('numeroFactura'),
  facturaTable: document.getElementById('facturaTable').querySelector('tbody'),
  montoFactura: document.getElementById('montoFactura'),
  costoEnvio: document.getElementById('costoEnvio'),
  totalFactura: document.getElementById('totalFactura'),
  entregaExiste: document.getElementById('entregaExiste'),
  entregaNuevo: document.getElementById('entregaNuevo'),
  entregaExistePanel: document.getElementById('entregaExistePanel'),
  entregaNuevoPanel: document.getElementById('entregaNuevoPanel'),
  puntoEntrega: document.getElementById('puntoEntrega'),
  puntosEntregaList: document.getElementById('puntosEntregaList'),
  puntosEntregaEmpty: document.getElementById('puntosEntregaEmpty'),
  entregaExisteInfo: document.getElementById('entregaExisteInfo'),
  direccionLinea: document.getElementById('direccionLinea'),
  referencia: document.getElementById('referencia'),
  latitud: document.getElementById('latitud'),
  longitud: document.getElementById('longitud'),
  departamento: document.getElementById('departamento'),
  provincia: document.getElementById('provincia'),
  distrito: document.getElementById('distrito'),
  departamentosList: document.getElementById('departamentosList'),
  provinciasList: document.getElementById('provinciasList'),
  distritosList: document.getElementById('distritosList'),
  regionLimaFields: document.getElementById('regionLimaFields'),
  regionProvFields: document.getElementById('regionProvFields'),
  direccionLineaLima: document.getElementById('direccionLineaLima'),
  referenciaLima: document.getElementById('referenciaLima'),
  nombreProv: document.getElementById('nombreProv'),
  dniProv: document.getElementById('dniProv'),
  agenciaProv: document.getElementById('agenciaProv'),
  observacionesProv: document.getElementById('observacionesProv'),
  mapSearch: document.getElementById('mapSearch'),
  recibeExiste: document.getElementById('recibeExiste'),
  recibeNuevo: document.getElementById('recibeNuevo'),
  recibeExistePanel: document.getElementById('recibeExistePanel'),
  recibeNuevoPanel: document.getElementById('recibeNuevoPanel'),
  numRecibe: document.getElementById('numRecibe'),
  numRecibeList: document.getElementById('numRecibeList'),
  numRecibeEmpty: document.getElementById('numRecibeEmpty'),
  numeroRecibe: document.getElementById('numeroRecibe'),
  nombreRecibe: document.getElementById('nombreRecibe'),
  numeroDocumentoPago: document.getElementById('numeroDocumentoPago'),
  montoPago: document.getElementById('montoPago'),
  cuentaNombre: document.getElementById('cuentaNombre'),
  cuentaBanco: document.getElementById('cuentaBanco'),
  cuentasList: document.getElementById('cuentasList'),
  montoPendiente: document.getElementById('montoPendiente'),
  addPago: document.getElementById('addPago'),
  pagosTable: document.getElementById('pagosTable').querySelector('tbody'),
  baseAsignada: document.getElementById('baseAsignada'),
  baseSugerida: document.getElementById('baseSugerida'),
  basesList: document.getElementById('basesList'),
  basesCandidatasTable: document.getElementById('basesCandidatasTable').querySelector('tbody'),
  basesEtaTable: document.getElementById('basesEtaTable').querySelector('tbody'),
  basesEtaEmpty: document.getElementById('basesEtaEmpty'),
  resumenPedido: document.getElementById('resumenPedido'),
  resumenFactura: document.getElementById('resumenFactura'),
  resumenEntrega: document.getElementById('resumenEntrega'),
  resumenRecibe: document.getElementById('resumenRecibe')
};

const i18n = {
  es: {
    title: 'Toma de Pedidos',
    subtitle: 'Operaciones globales IaaS + PaaS',
    statusReady: 'Listo',
    statusLoading: 'Procesando',
    wizardTitle: 'CU001 - Toma de Pedidos',
    wizardHint: 'Flujo transaccional end-to-end con validaciones en tiempo real.',
    step1Title: '1. Seleccionar o Crear Cliente',
    step1Hint: 'Selecciona un cliente existente o registra uno nuevo.',
    step2Title: '2. Crear Pedido',
    step2Hint: 'Registra el detalle del pedido y sus productos.',
    step3Title: '3. Crear Factura',
    step3Hint: 'Ajusta cantidades y revisa el monto total.',
    step4Title: '4. Datos Entrega',
    step4Hint: 'Selecciona un punto existente o registra uno nuevo con mapa.',
    step5Title: '5. Datos Recibe',
    step5Hint: 'Solo aplica si la entrega es en Lima.',
    step6Title: '6. Registro de Pago',
    step6Hint: 'Puedes registrar pagos parciales o continuar sin pago.',
    step7Title: '7. Asignar Base',
    step7Hint: 'Se sugerira la base mas cercana con stock disponible.',
    step8Title: '8. Resumen y Emitir Factura',
    step8Hint: 'Revisa toda la informacion antes de emitir.',
    existe: 'Existe',
    nuevo: 'Nuevo',
    clienteNombre: 'Cliente',
    clienteNumero: 'Numero',
    fechaPedido: 'Fecha pedido',
    horaPedido: 'Hora pedido',
    codigoPedido: 'Codigo pedido',
    producto: 'Producto',
    cantidad: 'Cantidad',
    precioTotal: 'Precio total',
    addRow: 'Agregar linea',
    fechaEmision: 'Fecha emision',
    horaEmision: 'Hora emision',
    numeroFactura: 'Numero factura',
    tipoDocumento: 'Tipo documento',
    precioUnitario: 'Precio unitario',
    monto: 'Monto',
    costoEnvio: 'Costo envio',
    total: 'Total',
    puntoEntrega: 'Punto entrega',
    puntosEntregaEmpty: 'No hay puntos de entrega disponibles.',
    direccion: 'Direccion',
    referencia: 'Referencia',
    latitud: 'Latitud',
    longitud: 'Longitud',
    departamento: 'Departamento',
    provincia: 'Provincia',
    distrito: 'Distrito',
    nombre: 'Nombre',
    dni: 'DNI',
    agencia: 'Agencia',
    observaciones: 'Observaciones',
    numRecibe: 'Num recibe',
    numRecibeEmpty: 'No hay registros disponibles.',
    numero: 'Numero',
    tipoDocumentoPago: 'Tipo documento',
    numeroDocumento: 'Numero documento',
    montoPago: 'Monto pago',
    addPago: 'Agregar pago',
    cuenta: 'Cuenta bancaria',
    banco: 'Banco',
    montoPendiente: 'Monto pendiente',
    baseAsignada: 'Base asignada',
    baseSugerida: 'Base sugerida',
    basesCandidatas: 'Bases candidatas',
    basesEta: 'Bases por ETA',
    codigo: 'Codigo',
    eta: 'ETA',
    sinCandidatas: 'Sin bases candidatas.',
    resumenPedido: 'Resumen Pedido',
    resumenFactura: 'Resumen Factura',
    resumenEntrega: 'Resumen Entrega',
    resumenRecibe: 'Resumen Recibe',
    confirmOperacion: 'Confirmo que los datos son correctos.',
    emitirFactura: 'Emitir Factura',
    prev: 'Anterior',
    next: 'Siguiente',
    loading: 'Procesando...'
  },
  en: {
    title: 'Order Intake',
    subtitle: 'Global IaaS + PaaS Operations',
    statusReady: 'Ready',
    statusLoading: 'Processing',
    wizardTitle: 'CU001 - Order Intake',
    wizardHint: 'End-to-end transactional flow with real-time validations.',
    step1Title: '1. Select or Create Client',
    step1Hint: 'Pick an existing client or register a new one.',
    step2Title: '2. Create Order',
    step2Hint: 'Register order details and products.',
    step3Title: '3. Create Invoice',
    step3Hint: 'Adjust quantities and review totals.',
    step4Title: '4. Delivery Details',
    step4Hint: 'Select an existing point or register a new one.',
    step5Title: '5. Receiver Details',
    step5Hint: 'Only for Lima deliveries.',
    step6Title: '6. Payment Record',
    step6Hint: 'Register partial payments or skip.',
    step7Title: '7. Assign Base',
    step7Hint: 'Suggest the closest base with stock.',
    step8Title: '8. Summary & Issue Invoice',
    step8Hint: 'Review information before issuing.',
    existe: 'Existing',
    nuevo: 'New',
    clienteNombre: 'Client',
    clienteNumero: 'Number',
    fechaPedido: 'Order date',
    horaPedido: 'Order time',
    codigoPedido: 'Order code',
    producto: 'Product',
    cantidad: 'Quantity',
    precioTotal: 'Total price',
    addRow: 'Add row',
    fechaEmision: 'Issue date',
    horaEmision: 'Issue time',
    numeroFactura: 'Invoice number',
    tipoDocumento: 'Document type',
    precioUnitario: 'Unit price',
    monto: 'Amount',
    costoEnvio: 'Shipping cost',
    total: 'Total',
    puntoEntrega: 'Delivery point',
    puntosEntregaEmpty: 'No delivery points available.',
    direccion: 'Address',
    referencia: 'Reference',
    latitud: 'Latitude',
    longitud: 'Longitude',
    departamento: 'Department',
    provincia: 'Province',
    distrito: 'District',
    nombre: 'Name',
    dni: 'ID',
    agencia: 'Agency',
    observaciones: 'Notes',
    numRecibe: 'Receiver ID',
    numRecibeEmpty: 'No records available.',
    numero: 'Number',
    tipoDocumentoPago: 'Document type',
    numeroDocumento: 'Document number',
    montoPago: 'Payment amount',
    addPago: 'Add payment',
    cuenta: 'Bank account',
    banco: 'Bank',
    montoPendiente: 'Outstanding amount',
    baseAsignada: 'Assigned base',
    baseSugerida: 'Suggested base',
    basesCandidatas: 'Candidate bases',
    basesEta: 'ETA bases',
    codigo: 'Code',
    eta: 'ETA',
    sinCandidatas: 'No candidate bases.',
    resumenPedido: 'Order Summary',
    resumenFactura: 'Invoice Summary',
    resumenEntrega: 'Delivery Summary',
    resumenRecibe: 'Receiver Summary',
    confirmOperacion: 'I confirm the data is correct.',
    emitirFactura: 'Issue Invoice',
    prev: 'Previous',
    next: 'Next',
    loading: 'Processing...'
  }
};

let mapInstance = null;
let mapMarker = null;
let autocomplete = null;

function t(key) {
  return i18n[state.lang][key] || i18n.es[key] || key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = t(key);
  });
}

function setStatus(key, tone = 'info') {
  el.statusPill.textContent = t(key);
  el.statusPill.style.color = tone === 'error' ? 'var(--danger)' : 'var(--primary-glow)';
}

function showAlert(message, type = 'danger') {
  el.formAlert.classList.toggle('d-none', type !== 'danger');
  el.formSuccess.classList.toggle('d-none', type !== 'success');
  if (type === 'danger') {
    el.formAlert.textContent = message;
  } else {
    el.formSuccess.textContent = message;
  }
  if (type === 'danger') {
    el.formSuccess.classList.add('d-none');
  }
}

function clearAlerts() {
  el.formAlert.classList.add('d-none');
  el.formSuccess.classList.add('d-none');
}

function toggleLoading(show) {
  el.loadingOverlay.classList.toggle('d-none', !show);
  if (show) {
    setStatus('statusLoading');
  } else {
    setStatus('statusReady');
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatTime(date) {
  return date.toTimeString().slice(0, 5);
}

function formatDateTime(date, time) {
  return `${date} ${time}:00`;
}

function toFixed2(value) {
  const num = Number(value || 0);
  return num.toFixed(2);
}

function setDatalist(listEl, items, displayKey = 'display') {
  listEl.innerHTML = '';
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[displayKey];
    listEl.appendChild(option);
  });
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

function findByDisplay(list, display) {
  if (!display) return null;
  const exact = list.find((item) => item.display === display);
  if (exact) return exact;
  return list.find((item) => item.nombre === display || item.name === display);
}

function activeSteps() {
  const baseSteps = [1, 2, 3, 4, 5, 6, 7, 8];
  if (state.entrega.region && state.entrega.region !== 'LIMA') {
    return baseSteps.filter((step) => step !== 5);
  }
  return baseSteps;
}

function updateProgress() {
  const steps = activeSteps();
  const currentIndex = steps.indexOf(state.step) + 1;
  const total = steps.length;
  const progress = Math.round((currentIndex / total) * 100);
  el.progressBar.style.width = `${progress}%`;
  el.stepIndicator.textContent = `${currentIndex} / ${total}`;
}

function updateNavButtons() {
  const steps = activeSteps();
  const first = steps[0];
  const last = steps[steps.length - 1];
  el.prevBtn.disabled = state.step === first;
  el.nextBtn.classList.toggle('d-none', state.step === last);
}

function showStep(step) {
  state.step = step;
  el.steps.forEach((section) => {
    const number = Number(section.dataset.step);
    section.classList.toggle('active', number === step);
  });
  updateProgress();
  updateNavButtons();
  enterStep(step).catch((error) => {
    showAlert(error.message || 'Error al cargar el paso');
  });
}

function nextStep() {
  const steps = activeSteps();
  const idx = steps.indexOf(state.step);
  if (idx < steps.length - 1) {
    showStep(steps[idx + 1]);
  }
}

function prevStep() {
  const steps = activeSteps();
  const idx = steps.indexOf(state.step);
  if (idx > 0) {
    showStep(steps[idx - 1]);
  }
}

function initDateTime() {
  const now = new Date();
  state.pedido.fecha = formatDate(now);
  state.pedido.hora = formatTime(now);
  el.fechaPedido.value = state.pedido.fecha;
  el.horaPedido.value = state.pedido.hora;
  el.fechaEmision.value = state.pedido.fecha;
  el.horaEmision.value = state.pedido.hora;
}

function updateFechaCompleta() {
  state.pedido.fecha = el.fechaPedido.value || state.pedido.fecha;
  state.pedido.hora = el.horaPedido.value || state.pedido.hora;
  state.pedido.fechaCompleta = formatDateTime(state.pedido.fecha, state.pedido.hora);
  el.fechaEmision.value = state.pedido.fecha;
  el.horaEmision.value = state.pedido.hora;
}

function setPedidoItems(items) {
  state.pedidoItems = items;
  renderPedidoItems();
}

function addPedidoItem() {
  state.pedidoItems.push({
    productoCodigo: '',
    productoNombre: '',
    cantidad: '',
    precioTotal: ''
  });
  renderPedidoItems();
}

function renderPedidoItems() {
  el.pedidoTable.innerHTML = '';
  state.pedidoItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input class="form-control producto-input" list="productosList" data-index="${index}" value="${item.productoNombre}" placeholder="Producto" />
      </td>
      <td>
        <input class="form-control cantidad-input" data-index="${index}" value="${item.cantidad}" placeholder="0.00" />
      </td>
      <td>
        <input class="form-control precio-input" data-index="${index}" value="${item.precioTotal}" placeholder="0.00" />
      </td>
      <td class="text-end">
        <button class="btn btn-outline-light btn-sm remove-row" data-index="${index}" type="button">Eliminar</button>
      </td>
    `;
    el.pedidoTable.appendChild(row);
  });

  if (!document.getElementById('productosList')) {
    const datalist = document.createElement('datalist');
    datalist.id = 'productosList';
    document.body.appendChild(datalist);
  }
  setDatalist(document.getElementById('productosList'), state.data.productos);
}

function updatePedidoItem(index, updates) {
  state.pedidoItems[index] = { ...state.pedidoItems[index], ...updates };
}

function buildFacturaItems() {
  state.facturaItems = state.pedidoItems.map((item) => {
    const cantidad = Number(item.cantidad || 0);
    const precioTotal = Number(item.precioTotal || 0);
    const precioUnitario = cantidad > 0 ? precioTotal / cantidad : 0;
    return {
      productoCodigo: item.productoCodigo,
      productoNombre: item.productoNombre,
      cantidadPedido: cantidad,
      cantidadFactura: item.cantidad,
      precioUnitario: precioUnitario,
      precioTotal: precioTotal
    };
  });
  renderFacturaItems();
}

function renderFacturaItems() {
  el.facturaTable.innerHTML = '';
  state.facturaItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input class="form-control" value="${item.productoNombre}" readonly />
      </td>
      <td>
        <input class="form-control factura-cantidad" data-index="${index}" value="${item.cantidadFactura}" />
      </td>
      <td>
        <input class="form-control" value="${toFixed2(item.precioUnitario)}" readonly />
      </td>
      <td>
        <input class="form-control" value="${toFixed2(item.precioTotal)}" readonly />
      </td>
      <td class="text-end">
        <button class="btn btn-outline-light btn-sm remove-factura" data-index="${index}" type="button">Eliminar</button>
      </td>
    `;
    el.facturaTable.appendChild(row);
  });
  updateFacturaTotals();
}

function updateFacturaTotals() {
  const monto = state.facturaItems.reduce((acc, item) => acc + Number(item.precioTotal || 0), 0);
  state.factura.monto = monto;
  state.factura.costoEnvio = state.entrega.region === 'PROV' ? 50 : 0;
  state.factura.total = monto + state.factura.costoEnvio;
  state.factura.saldo = state.factura.total;
  el.montoFactura.textContent = toFixed2(state.factura.monto);
  el.costoEnvio.textContent = toFixed2(state.factura.costoEnvio);
  el.totalFactura.textContent = toFixed2(state.factura.total);
  state.pago.pendiente = state.factura.total - state.pagos.reduce((acc, pago) => acc + Number(pago.monto || 0), 0);
  el.montoPendiente.textContent = toFixed2(state.pago.pendiente);
}

function updateEntregaRegion() {
  if (state.entrega.codDep === '15' && state.entrega.codProv === '01') {
    state.entrega.region = 'LIMA';
  } else if (state.entrega.codDep && state.entrega.codProv) {
    state.entrega.region = 'PROV';
  }
  el.regionLimaFields.classList.toggle('d-none', state.entrega.region !== 'LIMA');
  el.regionProvFields.classList.toggle('d-none', state.entrega.region === 'LIMA');
  updateFacturaTotals();
  if (state.entrega.region && state.entrega.region !== 'LIMA') {
    if (state.step === 5) {
      showStep(6);
    }
  }
  updateProgress();
}

function updateEntregaConcatenado() {
  if (state.entrega.region === 'LIMA') {
    const ref = state.entrega.referencia ? ` | ${state.entrega.referencia}` : '';
    state.entrega.concatenado = `${state.entrega.direccion} | ${state.entrega.distrito}${ref}`;
  } else if (state.entrega.region === 'PROV') {
    const parts = [state.entrega.nombre, state.entrega.dni, state.entrega.agencia, state.entrega.observaciones].filter(Boolean);
    state.entrega.concatenado = parts.join(' | ');
  }
}

function updateRecibeConcatenado() {
  const parts = [state.recibe.numero, state.recibe.nombre].filter(Boolean);
  state.recibe.concatenado = parts.join(' | ');
}

function renderPagos() {
  el.pagosTable.innerHTML = '';
  state.pagos.forEach((pago, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${pago.numdocumento}</td>
      <td>${pago.cuentaNombre}</td>
      <td>${toFixed2(pago.monto)}</td>
      <td class="text-end">
        <button class="btn btn-outline-light btn-sm remove-pago" data-index="${index}" type="button">Eliminar</button>
      </td>
    `;
    el.pagosTable.appendChild(row);
  });
  updateFacturaTotals();
}

function renderBasesCandidatas() {
  el.basesCandidatasTable.innerHTML = '';
  state.data.basesCandidatas.forEach((base) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${base.codigo_base}</td>
      <td>${base.latitud || ''}</td>
      <td>${base.longitud || ''}</td>
    `;
    el.basesCandidatasTable.appendChild(row);
  });
}

function renderBasesEta() {
  el.basesEtaTable.innerHTML = '';
  if (!state.data.basesEta.length) {
    el.basesEtaEmpty.classList.remove('d-none');
    return;
  }
  el.basesEtaEmpty.classList.add('d-none');
  state.data.basesEta.forEach((base) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${base.codigo_base}</td>
      <td>${base.eta}</td>
    `;
    el.basesEtaTable.appendChild(row);
  });
}

async function enterStep(step) {
  clearAlerts();
  if (step === 1) {
    return;
  }
  if (step === 2) {
    updateFechaCompleta();
    if (state.cliente.tipo === 'nuevo' && !state.cliente.codigo) {
      const nextCliente = await fetchJSON('/api/next/cliente');
      state.cliente.codigo = nextCliente.next;
    }
    const next = await fetchJSON('/api/next/pedido');
    state.pedido.codigo = next.next;
    el.codigoPedido.value = state.pedido.codigo || '';
    if (!state.pedidoItems.length) {
      addPedidoItem();
    }
    return;
  }
  if (step === 3) {
    updateFechaCompleta();
    const next = await fetchJSON('/api/next/factura');
    state.factura.numero = next.next;
    el.numeroFactura.value = state.factura.numero || '';
    buildFacturaItems();
    return;
  }
  if (step === 4) {
    await loadPuntosEntrega();
    await loadUbigeo();
    updateEntregaRegion();
    return;
  }
  if (step === 5) {
    await loadNumRecibe();
    return;
  }
  if (step === 6) {
    const next = await fetchJSON('/api/next/recibo');
    state.pago.numeroBase = next.next;
    el.numeroDocumentoPago.value = state.pago.numeroBase || '';
    state.pago.pendiente = state.factura.total;
    el.montoPendiente.textContent = toFixed2(state.pago.pendiente);
    if (!el.montoPago.value) {
      el.montoPago.value = toFixed2(state.pago.pendiente);
    }
    renderPagos();
    return;
  }
  if (step === 7) {
    updateFechaCompleta();
    if (!state.facturaItems.length) {
      buildFacturaItems();
    }
    await loadBases();
    await loadBasesCandidatas();
    await calcularEtaBases();
    return;
  }
  if (step === 8) {
    buildResumen();
  }
}

async function loadConfig() {
  const data = await fetchJSON('/api/config');
  if (data.google_maps) {
    state.config.apiKey = data.google_maps.api_key || '';
    state.config.defaultCenter = data.google_maps.default_center || state.config.defaultCenter;
    state.config.defaultZoom = data.google_maps.default_zoom || state.config.defaultZoom;
  }
}

async function loadClientes() {
  const data = await fetchJSON('/api/clientes');
  state.data.clientes = (data.rows || []).map((row) => ({
    ...row,
    display: `${row.nombre} | ${row.numero}`
  }));
  setDatalist(el.clientesList, state.data.clientes);
}

async function loadProductos() {
  const data = await fetchJSON('/api/productos');
  state.data.productos = (data.rows || []).map((row) => ({
    ...row,
    display: row.nombre
  }));
  const list = document.getElementById('productosList');
  if (list) {
    setDatalist(list, state.data.productos);
  }
}

async function loadPuntosEntrega() {
  if (!state.cliente.codigo) {
    el.puntosEntregaEmpty.classList.remove('d-none');
    return;
  }
  const data = await fetchJSON(`/api/puntos-entrega?cliente=${state.cliente.codigo}`);
  state.data.puntosEntrega = (data.rows || []).map((row) => ({
    ...row,
    display: row.concatenarpuntoentrega
  }));
  setDatalist(el.puntosEntregaList, state.data.puntosEntrega);
  const hasPoints = state.data.puntosEntrega.length > 0;
  el.puntosEntregaEmpty.classList.toggle('d-none', hasPoints);
  if (!hasPoints) {
    el.entregaExiste.checked = false;
    el.entregaNuevo.checked = true;
    toggleEntregaPanels('nuevo');
  }
}

async function loadUbigeo() {
  const depData = await fetchJSON('/api/ubigeo/departamentos');
  state.data.departamentos = (depData.rows || []).map((row) => ({
    ...row,
    display: `${row.cod_dep} - ${row.departamento}`
  }));
  setDatalist(el.departamentosList, state.data.departamentos);
  if (state.entrega.codDep) {
    el.departamento.value = findByCode(state.data.departamentos, state.entrega.codDep)?.display || '';
    await loadProvincias(state.entrega.codDep);
  }
}

async function loadProvincias(codDep) {
  const provData = await fetchJSON(`/api/ubigeo/provincias?cod_dep=${codDep}`);
  state.data.provincias = (provData.rows || []).map((row) => ({
    ...row,
    display: `${row.cod_prov} - ${row.provincia}`
  }));
  setDatalist(el.provinciasList, state.data.provincias);
  if (state.entrega.codProv) {
    el.provincia.value = findByCode(state.data.provincias, state.entrega.codProv)?.display || '';
    await loadDistritos(codDep, state.entrega.codProv);
  }
}

async function loadDistritos(codDep, codProv) {
  const distData = await fetchJSON(`/api/ubigeo/distritos?cod_dep=${codDep}&cod_prov=${codProv}`);
  state.data.distritos = (distData.rows || []).map((row) => ({
    ...row,
    display: `${row.cod_dist} - ${row.distrito}`
  }));
  setDatalist(el.distritosList, state.data.distritos);
}

async function loadNumRecibe() {
  if (!state.cliente.codigo) {
    el.numRecibeEmpty.classList.remove('d-none');
    return;
  }
  const data = await fetchJSON(`/api/numrecibe?cliente=${state.cliente.codigo}`);
  state.data.numrecibe = (data.rows || []).map((row) => ({
    ...row,
    display: row.concatenarnumrecibe
  }));
  setDatalist(el.numRecibeList, state.data.numrecibe);
  const has = state.data.numrecibe.length > 0;
  el.numRecibeEmpty.classList.toggle('d-none', has);
  if (!has) {
    el.recibeExiste.checked = false;
    el.recibeNuevo.checked = true;
    toggleRecibePanels('nuevo');
  }
}

async function loadCuentas() {
  const data = await fetchJSON('/api/cuentas');
  state.data.cuentas = (data.rows || []).map((row) => ({
    ...row,
    display: `${row.nombre} | ${row.banco}`
  }));
  setDatalist(el.cuentasList, state.data.cuentas);
}

async function loadBases() {
  if (state.data.bases.length) {
    return;
  }
  const data = await fetchJSON('/api/bases');
  state.data.bases = (data.rows || []).map((row) => ({
    ...row,
    display: `${row.codigo_base} | ${row.nombre}`
  }));
  setDatalist(el.basesList, state.data.bases);
}

async function loadBasesCandidatas() {
  updateFechaCompleta();
  const payload = state.facturaItems.map((item) => ({
    vFProducto: item.productoCodigo,
    vFCantidadProducto: Number(item.cantidadFactura || 0),
    vFPrecioTotal: Number(item.precioTotal || 0)
  }));
  const data = await fetchJSON('/api/bases-candidatas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vProdFactura: payload, vFechaP: state.pedido.fechaCompleta })
  });
  const seen = new Set();
  state.data.basesCandidatas = (data.rows || [])
    .map((row) => normalizeBaseCandidata(row))
    .filter((row) => {
      if (!row.codigo_base) return false;
      const key = String(row.codigo_base);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  renderBasesCandidatas();
}

function findByCode(list, code) {
  return list.find((item) => String(item.cod_dep || item.cod_prov || item.cod_dist || item.codigo_base) === String(code));
}

function selectCliente() {
  if (state.cliente.tipo === 'nuevo') {
    state.cliente.nombre = el.clienteNombreNuevo.value.trim();
    state.cliente.numero = el.clienteNumeroNuevo.value.trim();
    return;
  }
  const selected = findByDisplay(state.data.clientes, el.clienteNombre.value.trim());
  if (selected) {
    state.cliente.codigo = selected.codigo_cliente;
    state.cliente.nombre = selected.nombre;
    state.cliente.numero = selected.numero;
  }
}

function toggleClientePanels(tipo) {
  state.cliente.tipo = tipo;
  el.clienteExistePanel.classList.toggle('d-none', tipo !== 'existe');
  el.clienteNuevoPanel.classList.toggle('d-none', tipo !== 'nuevo');
}

function toggleEntregaPanels(tipo) {
  state.entrega.tipo = tipo;
  el.entregaExistePanel.classList.toggle('d-none', tipo !== 'existe');
  el.entregaNuevoPanel.classList.toggle('d-none', tipo !== 'nuevo');
}

function toggleRecibePanels(tipo) {
  state.recibe.tipo = tipo;
  el.recibeExistePanel.classList.toggle('d-none', tipo !== 'existe');
  el.recibeNuevoPanel.classList.toggle('d-none', tipo !== 'nuevo');
}

function validateStep1() {
  selectCliente();
  if (state.cliente.tipo === 'existe') {
    if (!state.cliente.codigo) {
      showAlert('Selecciona un cliente existente.');
      return false;
    }
    return true;
  }
  if (!state.cliente.nombre || !state.cliente.numero) {
    showAlert('Completa nombre y numero del cliente nuevo.');
    return false;
  }
  return true;
}

function validatePedidoItems() {
  if (!state.pedidoItems.length) {
    showAlert('Agrega al menos un producto.');
    return false;
  }
  const codes = new Set();
  for (const item of state.pedidoItems) {
    if (!item.productoCodigo) {
      showAlert('Selecciona un producto para cada linea.');
      return false;
    }
    if (codes.has(item.productoCodigo)) {
      showAlert('No se permiten productos duplicados en el pedido.');
      return false;
    }
    codes.add(item.productoCodigo);
    if (!decimalRegex.test(String(item.cantidad))) {
      showAlert('Cantidad invalida. Usa hasta 2 decimales.');
      return false;
    }
    if (!decimalRegex.test(String(item.precioTotal))) {
      showAlert('Precio total invalido.');
      return false;
    }
  }
  return true;
}

function validateStep2() {
  updateFechaCompleta();
  if (!state.pedido.codigo) {
    showAlert('Codigo de pedido no generado.');
    return false;
  }
  return validatePedidoItems();
}

function validateStep3() {
  if (!state.factura.numero) {
    showAlert('Numero de factura no generado.');
    return false;
  }
  for (const item of state.facturaItems) {
    if (!decimalRegex.test(String(item.cantidadFactura))) {
      showAlert('Cantidad factura invalida.');
      return false;
    }
    if (Number(item.cantidadFactura) > Number(item.cantidadPedido)) {
      showAlert('La cantidad de factura no puede exceder la del pedido.');
      return false;
    }
  }
  return true;
}

async function validateStep4() {
  if (state.entrega.tipo === 'existe') {
    const selected = findByDisplay(state.data.puntosEntrega, el.puntoEntrega.value.trim());
    if (!selected) {
      showAlert('Selecciona un punto de entrega.');
      return false;
    }
    state.entrega.codigoPunto = selected.codigo_puntoentrega;
    state.entrega.region = selected.region_entrega;
    state.entrega.direccion = selected.direccion_linea || '';
    state.entrega.referencia = selected.referencia || '';
    state.entrega.nombre = selected.nombre || '';
    state.entrega.dni = selected.dni || '';
    state.entrega.agencia = selected.agencia || '';
    state.entrega.observaciones = selected.observaciones || '';
    state.entrega.codDep = selected.cod_dep || state.entrega.codDep;
    state.entrega.codProv = selected.cod_prov || state.entrega.codProv;
    state.entrega.codDist = selected.cod_dist || state.entrega.codDist;
    state.entrega.ubigeo = selected.ubigeo || state.entrega.ubigeo;
    state.entrega.concatenado = selected.concatenarpuntoentrega || '';
    updateFacturaTotals();
    updateProgress();
    return true;
  }

  state.entrega.direccion = el.direccionLineaLima.value.trim() || el.direccionLinea.value.trim();
  state.entrega.referencia = el.referenciaLima.value.trim() || el.referencia.value.trim();
  state.entrega.nombre = el.nombreProv.value.trim();
  state.entrega.dni = el.dniProv.value.trim();
  state.entrega.agencia = el.agenciaProv.value.trim();
  state.entrega.observaciones = el.observacionesProv.value.trim();
  if (!state.entrega.codDist) {
    showAlert('Selecciona un distrito para completar el ubigeo.');
    return false;
  }
  if (state.entrega.region === 'LIMA') {
    if (!state.entrega.direccion) {
      showAlert('Ingresa direccion para entrega en Lima.');
      return false;
    }
  }
  if (state.entrega.region === 'PROV') {
    if (!state.entrega.nombre || !state.entrega.dni) {
      showAlert('Nombre y DNI son requeridos para entrega en provincia.');
      return false;
    }
    if (!integerRegex.test(state.entrega.dni)) {
      showAlert('DNI invalido.');
      return false;
    }
  }
  if (!state.entrega.codigoPunto) {
    const next = await fetchJSON(`/api/next/punto-entrega?cliente=${state.cliente.codigo}`);
    state.entrega.codigoPunto = next.next;
  }
  updateEntregaConcatenado();
  return true;
}

async function validateStep5() {
  if (state.entrega.region !== 'LIMA') {
    return true;
  }
  if (state.recibe.tipo === 'existe') {
    const selected = findByDisplay(state.data.numrecibe, el.numRecibe.value.trim());
    if (!selected) {
      showAlert('Selecciona un registro de recibe.');
      return false;
    }
    state.recibe.ordinal = selected.ordinal_numrecibe;
    state.recibe.numero = selected.numero;
    state.recibe.nombre = selected.nombre;
    state.recibe.concatenado = selected.concatenarnumrecibe;
    return true;
  }
  state.recibe.numero = el.numeroRecibe.value.trim();
  state.recibe.nombre = el.nombreRecibe.value.trim();
  if (!state.recibe.numero || !state.recibe.nombre) {
    showAlert('Completa numero y nombre del receptor.');
    return false;
  }
  if (!state.recibe.ordinal) {
    const next = await fetchJSON(`/api/next/numrecibe?cliente=${state.cliente.codigo}`);
    state.recibe.ordinal = next.next;
  }
  updateRecibeConcatenado();
  return true;
}

function validateStep6() {
  const monto = Number(el.montoPago.value || 0);
  if (monto > 0 && monto > state.pago.pendiente) {
    showAlert('El monto de pago excede el pendiente.');
    return false;
  }
  return true;
}

function validateStep7() {
  const selected = findByDisplay(state.data.bases, el.baseAsignada.value.trim());
  if (selected) {
    state.base.codigo = selected.codigo_base;
    state.base.nombre = selected.nombre;
    return true;
  }
  showAlert('Selecciona una base para continuar.');
  return false;
}

function validateStep8() {
  if (!el.confirmOperacion.checked) {
    showAlert('Debes confirmar la operacion.');
    return false;
  }
  return true;
}

function buildResumen() {
  el.resumenPedido.innerHTML = `
    <div>Cliente: ${state.cliente.nombre}</div>
    <div>Pedido: ${state.pedido.codigo}</div>
    <div>Fecha: ${state.pedido.fechaCompleta}</div>
    <div>Items: ${state.pedidoItems.length}</div>
  `;
  el.resumenFactura.innerHTML = `
    <div>Factura: ${state.factura.numero}</div>
    <div>Monto: ${toFixed2(state.factura.monto)}</div>
    <div>Costo envio: ${toFixed2(state.factura.costoEnvio)}</div>
    <div>Total: ${toFixed2(state.factura.total)}</div>
  `;
  const entregaTipo = state.entrega.tipo === 'existe' ? 'EXISTENTE' : 'NUEVO';
  el.resumenEntrega.innerHTML = `
    <div>Tipo: ${entregaTipo}</div>
    <div>Region: ${state.entrega.region || ''}</div>
    <div>Detalle: ${state.entrega.concatenado || ''}</div>
  `;
  const recibeTipo = state.recibe.tipo === 'existe' ? 'EXISTENTE' : 'NUEVO';
  el.resumenRecibe.innerHTML = `
    <div>Tipo: ${state.entrega.region === 'LIMA' ? recibeTipo : 'NO APLICA'}</div>
    <div>Detalle: ${state.entrega.region === 'LIMA' ? state.recibe.concatenado : '-'}</div>
  `;
}

async function emitir() {
  if (!validateStep8()) {
    return;
  }
  toggleLoading(true);
  try {
    const payload = {
      cliente: {
        tipo: state.cliente.tipo,
        codigo: state.cliente.codigo,
        nombre: state.cliente.nombre,
        numero: state.cliente.numero
      },
      pedido: {
        codigo: state.pedido.codigo,
        fecha: state.pedido.fechaCompleta,
        items: state.pedidoItems.map((item, idx) => ({
          ordinal: idx + 1,
          codigo_producto: item.productoCodigo,
          cantidad: Number(item.cantidad),
          precio_total: Number(item.precioTotal)
        }))
      },
      factura: {
        numero: state.factura.numero,
        tipo: state.factura.tipo,
        monto: state.factura.monto,
        costo_envio: state.factura.costoEnvio,
        total: state.factura.total,
        saldo: state.factura.saldo,
        items: state.facturaItems.map((item, idx) => ({
          ordinal: idx + 1,
          codigo_producto: item.productoCodigo,
          cantidad: Number(item.cantidadFactura),
          precio_total: Number(item.precioTotal)
        }))
      },
      entrega: {
        tipo: state.entrega.tipo,
        codigo_puntoentrega: state.entrega.codigoPunto,
        ubigeo: state.entrega.ubigeo,
        region: state.entrega.region,
        direccion: state.entrega.direccion,
        referencia: state.entrega.referencia,
        nombre: state.entrega.nombre,
        dni: state.entrega.dni,
        agencia: state.entrega.agencia,
        observaciones: state.entrega.observaciones,
        concatenado: state.entrega.concatenado,
        latitud: state.entrega.latitud,
        longitud: state.entrega.longitud,
        cod_dep: state.entrega.codDep,
        cod_prov: state.entrega.codProv,
        cod_dist: state.entrega.codDist
      },
      recibe: {
        tipo: state.recibe.tipo,
        ordinal: state.recibe.ordinal,
        numero: state.recibe.numero,
        nombre: state.recibe.nombre,
        concatenado: state.recibe.concatenado
      },
      pagos: state.pagos,
      base: {
        codigo: state.base.codigo,
        nombre: state.base.nombre
      }
    };

    const res = await fetchJSON('/api/emitir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error('No se pudo emitir la factura');
    }
    showAlert('Factura emitida correctamente.', 'success');
    resetWizard();
  } catch (error) {
    showAlert(error.message || 'Error al emitir');
  } finally {
    toggleLoading(false);
  }
}

function resetWizard() {
  state.step = 1;
  state.cliente = { tipo: 'existe', codigo: null, nombre: '', numero: '' };
  state.pedidoItems = [];
  state.facturaItems = [];
  state.entrega = {
    tipo: 'existe',
    codigoPunto: null,
    region: '',
    direccion: '',
    referencia: '',
    nombre: '',
    dni: '',
    agencia: '',
    observaciones: '',
    codDep: '15',
    codProv: '01',
    codDist: '',
    ubigeo: '',
    distrito: '',
    latitud: '',
    longitud: '',
    concatenado: ''
  };
  state.recibe = { tipo: 'existe', ordinal: null, numero: '', nombre: '', concatenado: '' };
  state.pagos = [];
  state.pago.monto = '';
  state.base = { codigo: null, nombre: '', sugerida: '' };

  el.clienteNombre.value = '';
  el.clienteNombreNuevo.value = '';
  el.clienteNumeroNuevo.value = '';
  el.puntoEntrega.value = '';
  el.direccionLinea.value = '';
  el.referencia.value = '';
  el.latitud.value = '';
  el.longitud.value = '';
  el.direccionLineaLima.value = '';
  el.referenciaLima.value = '';
  el.nombreProv.value = '';
  el.dniProv.value = '';
  el.agenciaProv.value = '';
  el.observacionesProv.value = '';
  el.numRecibe.value = '';
  el.numeroRecibe.value = '';
  el.nombreRecibe.value = '';
  el.montoPago.value = '';
  el.cuentaNombre.value = '';
  el.cuentaBanco.value = '';
  el.baseAsignada.value = '';
  el.baseSugerida.value = '';
  el.confirmOperacion.checked = false;
  el.emitirFactura.disabled = true;

  initDateTime();
  toggleClientePanels('existe');
  toggleEntregaPanels('existe');
  toggleRecibePanels('existe');
  renderPagos();
  showStep(1);
}

async function calcularEtaBases() {
  if (!window.google || !state.entrega.latitud || !state.entrega.longitud) {
    state.data.basesEta = [];
    renderBasesEta();
    return;
  }
  if (!state.data.basesCandidatas.length) {
    state.data.basesEta = [];
    renderBasesEta();
    return;
  }

  const service = new google.maps.DistanceMatrixService();
  const origins = [new google.maps.LatLng(Number(state.entrega.latitud), Number(state.entrega.longitud))];
  const destinations = state.data.basesCandidatas
    .filter((base) => Number.isFinite(Number(base.latitud)) && Number.isFinite(Number(base.longitud)))
    .map((base) => new google.maps.LatLng(Number(base.latitud), Number(base.longitud)));

  if (!destinations.length) {
    state.data.basesEta = [];
    renderBasesEta();
    return;
  }

  await new Promise((resolve) => {
    service.getDistanceMatrix(
      {
        origins,
        destinations,
        travelMode: 'DRIVING'
      },
      (response, status) => {
        if (status !== 'OK' || !response.rows.length) {
          state.data.basesEta = [];
          renderBasesEta();
          resolve();
          return;
        }
        const durations = response.rows[0].elements;
        const etaList = durations.map((element, index) => ({
          ...state.data.basesCandidatas[index],
          duration: element.duration ? element.duration.value : null,
          eta: element.duration ? element.duration.text : 'N/A'
        }));
        etaList.sort((a, b) => (a.duration || 999999) - (b.duration || 999999));
        state.data.basesEta = etaList;
        renderBasesEta();
        if (etaList.length && etaList[0].codigo_base) {
          const selected = state.data.bases.find((base) => base.codigo_base === etaList[0].codigo_base);
          if (selected) {
            state.base.codigo = selected.codigo_base;
            state.base.nombre = selected.nombre;
            state.base.sugerida = selected.nombre;
            el.baseSugerida.value = selected.nombre;
            el.baseAsignada.value = selected.display;
          }
        }
        resolve();
      }
    );
  });
}

async function loadGoogleMaps() {
  if (!state.config.apiKey || document.getElementById('googleMapsScript')) {
    return;
  }
  const script = document.createElement('script');
  script.id = 'googleMapsScript';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${state.config.apiKey}&libraries=places`;
  script.async = true;
  document.body.appendChild(script);
  await new Promise((resolve) => {
    script.onload = resolve;
  });
  initMap();
}

function initMap() {
  if (mapInstance) return;
  const center = state.config.defaultCenter;
  mapInstance = new google.maps.Map(document.getElementById('map'), {
    center,
    zoom: state.config.defaultZoom
  });
  mapMarker = new google.maps.Marker({ map: mapInstance, position: center });
  autocomplete = new google.maps.places.Autocomplete(el.mapSearch);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
      return;
    }
    const location = place.geometry.location;
    mapInstance.setCenter(location);
    mapMarker.setPosition(location);
    state.entrega.latitud = location.lat().toFixed(6);
    state.entrega.longitud = location.lng().toFixed(6);
    el.latitud.value = state.entrega.latitud;
    el.longitud.value = state.entrega.longitud;
    if (place.formatted_address) {
      el.direccionLinea.value = place.formatted_address;
      el.direccionLineaLima.value = place.formatted_address;
      state.entrega.direccion = place.formatted_address;
    }
    if (state.step >= 7) {
      calcularEtaBases();
    }
  });

  mapInstance.addListener('click', (event) => {
    mapMarker.setPosition(event.latLng);
    state.entrega.latitud = event.latLng.lat().toFixed(6);
    state.entrega.longitud = event.latLng.lng().toFixed(6);
    el.latitud.value = state.entrega.latitud;
    el.longitud.value = state.entrega.longitud;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: event.latLng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        el.direccionLinea.value = results[0].formatted_address;
        el.direccionLineaLima.value = results[0].formatted_address;
        state.entrega.direccion = results[0].formatted_address;
      }
    });
    if (state.step >= 7) {
      calcularEtaBases();
    }
  });
}

function registerEvents(wizard) {
  el.prevBtn.addEventListener('click', () => {
    wizard.prev();
  });

  el.nextBtn.addEventListener('click', () => {
    clearAlerts();
    const validators = {
      1: validateStep1,
      2: validateStep2,
      3: validateStep3,
      4: validateStep4,
      5: validateStep5,
      6: validateStep6,
      7: validateStep7,
      8: validateStep8
    };
    Promise.resolve(validators[state.step] ? validators[state.step]() : true).then((isValid) => {
      if (isValid) {
        wizard.next();
      }
    });
  });

  el.emitirFactura.addEventListener('click', () => wizard.emitir());
  el.emitirFactura.disabled = true;
  el.confirmOperacion.addEventListener('change', () => {
    el.emitirFactura.disabled = !el.confirmOperacion.checked;
  });

  el.clienteExiste.addEventListener('change', () => toggleClientePanels('existe'));
  el.clienteNuevo.addEventListener('change', () => toggleClientePanels('nuevo'));

  el.entregaExiste.addEventListener('change', () => toggleEntregaPanels('existe'));
  el.entregaNuevo.addEventListener('change', async () => {
    toggleEntregaPanels('nuevo');
    await loadGoogleMaps();
  });

  el.recibeExiste.addEventListener('change', () => toggleRecibePanels('existe'));
  el.recibeNuevo.addEventListener('change', () => toggleRecibePanels('nuevo'));

  el.clienteNombre.addEventListener('change', () => {
    selectCliente();
    loadPuntosEntrega();
    loadNumRecibe();
  });

  el.clienteNombreNuevo.addEventListener('input', () => {
    state.cliente.nombre = el.clienteNombreNuevo.value.trim();
  });

  el.clienteNumeroNuevo.addEventListener('input', () => {
    state.cliente.numero = el.clienteNumeroNuevo.value.trim();
  });

  el.addPedidoRow.addEventListener('click', addPedidoItem);

  el.pedidoTable.addEventListener('input', (event) => {
    const index = Number(event.target.dataset.index || -1);
    if (index < 0) return;
    if (event.target.classList.contains('producto-input')) {
      const selected = findByDisplay(state.data.productos, event.target.value.trim());
      if (selected) {
        updatePedidoItem(index, {
          productoCodigo: selected.codigo_producto,
          productoNombre: selected.nombre
        });
      }
    }
    if (event.target.classList.contains('cantidad-input')) {
      updatePedidoItem(index, { cantidad: event.target.value.trim() });
    }
    if (event.target.classList.contains('precio-input')) {
      updatePedidoItem(index, { precioTotal: event.target.value.trim() });
    }
  });

  el.pedidoTable.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-row')) {
      const index = Number(event.target.dataset.index || -1);
      if (index >= 0) {
        state.pedidoItems.splice(index, 1);
        if (!state.pedidoItems.length) {
          addPedidoItem();
        } else {
          renderPedidoItems();
        }
      }
    }
  });

  el.facturaTable.addEventListener('input', (event) => {
    if (event.target.classList.contains('factura-cantidad')) {
      const index = Number(event.target.dataset.index || -1);
      if (index >= 0) {
        const value = event.target.value.trim();
        state.facturaItems[index].cantidadFactura = value;
        const cantidad = Number(value || 0);
        state.facturaItems[index].precioTotal = cantidad * state.facturaItems[index].precioUnitario;
        renderFacturaItems();
      }
    }
  });

  el.facturaTable.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-factura')) {
      const index = Number(event.target.dataset.index || -1);
      if (index >= 0 && state.facturaItems.length > 1) {
        state.facturaItems.splice(index, 1);
        renderFacturaItems();
      }
    }
  });

  el.puntoEntrega.addEventListener('change', () => {
    const selected = findByDisplay(state.data.puntosEntrega, el.puntoEntrega.value.trim());
    if (!selected) return;
    state.entrega.region = selected.region_entrega;
    state.entrega.concatenado = selected.concatenarpuntoentrega;
    state.entrega.direccion = selected.direccion_linea || '';
    state.entrega.referencia = selected.referencia || '';
    state.entrega.nombre = selected.nombre || '';
    state.entrega.dni = selected.dni || '';
    state.entrega.agencia = selected.agencia || '';
    state.entrega.observaciones = selected.observaciones || '';
    el.entregaExisteInfo.innerHTML = `
      <div>Region: ${state.entrega.region}</div>
      <div>Detalle: ${state.entrega.concatenado}</div>
    `;
    updateFacturaTotals();
    updateProgress();
  });

  el.departamento.addEventListener('change', async () => {
    const selected = findByDisplay(state.data.departamentos, el.departamento.value.trim());
    if (selected) {
      state.entrega.codDep = selected.cod_dep;
      await loadProvincias(state.entrega.codDep);
      updateEntregaRegion();
    }
  });

  el.provincia.addEventListener('change', async () => {
    const selected = findByDisplay(state.data.provincias, el.provincia.value.trim());
    if (selected) {
      state.entrega.codProv = selected.cod_prov;
      await loadDistritos(state.entrega.codDep, state.entrega.codProv);
      updateEntregaRegion();
    }
  });

  el.distrito.addEventListener('change', () => {
    const selected = findByDisplay(state.data.distritos, el.distrito.value.trim());
    if (selected) {
      state.entrega.codDist = selected.cod_dist;
      state.entrega.ubigeo = `${state.entrega.codDep}${state.entrega.codProv}${state.entrega.codDist}`;
      state.entrega.distrito = selected.distrito;
      updateEntregaConcatenado();
    }
  });

  el.direccionLinea.addEventListener('input', () => {
    state.entrega.direccion = el.direccionLinea.value.trim();
    updateEntregaConcatenado();
  });

  el.referencia.addEventListener('input', () => {
    state.entrega.referencia = el.referencia.value.trim();
    updateEntregaConcatenado();
  });

  el.direccionLineaLima.addEventListener('input', () => {
    state.entrega.direccion = el.direccionLineaLima.value.trim();
    updateEntregaConcatenado();
  });

  el.referenciaLima.addEventListener('input', () => {
    state.entrega.referencia = el.referenciaLima.value.trim();
    updateEntregaConcatenado();
  });

  el.nombreProv.addEventListener('input', () => {
    state.entrega.nombre = el.nombreProv.value.trim();
    updateEntregaConcatenado();
  });

  el.dniProv.addEventListener('input', () => {
    state.entrega.dni = el.dniProv.value.trim();
    updateEntregaConcatenado();
  });

  el.agenciaProv.addEventListener('input', () => {
    state.entrega.agencia = el.agenciaProv.value.trim();
    updateEntregaConcatenado();
  });

  el.observacionesProv.addEventListener('input', () => {
    state.entrega.observaciones = el.observacionesProv.value.trim();
    updateEntregaConcatenado();
  });

  el.numRecibe.addEventListener('change', () => {
    const selected = findByDisplay(state.data.numrecibe, el.numRecibe.value.trim());
    if (!selected) return;
    state.recibe.ordinal = selected.ordinal_numrecibe;
    state.recibe.numero = selected.numero;
    state.recibe.nombre = selected.nombre;
    state.recibe.concatenado = selected.concatenarnumrecibe;
  });

  el.numeroRecibe.addEventListener('input', () => {
    state.recibe.numero = el.numeroRecibe.value.trim();
    updateRecibeConcatenado();
  });

  el.nombreRecibe.addEventListener('input', () => {
    state.recibe.nombre = el.nombreRecibe.value.trim();
    updateRecibeConcatenado();
  });

  el.cuentaNombre.addEventListener('change', () => {
    const selected = findByDisplay(state.data.cuentas, el.cuentaNombre.value.trim());
    if (selected) {
      state.pago.cuentaCodigo = selected.codigo_cuentabancaria;
      state.pago.cuentaNombre = selected.nombre;
      state.pago.cuentaBanco = selected.banco;
      el.cuentaBanco.value = selected.banco;
    }
  });

  el.addPago.addEventListener('click', () => {
    const monto = Number(el.montoPago.value || 0);
    if (monto <= 0) {
      return;
    }
    if (monto > state.pago.pendiente) {
      showAlert('El monto de pago excede el pendiente.');
      return;
    }
    if (!state.pago.cuentaCodigo) {
      showAlert('Selecciona una cuenta bancaria.');
      return;
    }
    const numdocumento = state.pago.numeroBase + state.pagos.length;
    state.pagos.push({
      numdocumento,
      monto,
      cuentaCodigo: state.pago.cuentaCodigo,
      cuentaNombre: state.pago.cuentaNombre
    });
    state.pago.pendiente -= monto;
    el.montoPendiente.textContent = toFixed2(state.pago.pendiente);
    el.montoPago.value = toFixed2(state.pago.pendiente);
    renderPagos();
  });

  el.pagosTable.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-pago')) {
      const index = Number(event.target.dataset.index || -1);
      if (index >= 0) {
        state.pagos.splice(index, 1);
        state.pago.pendiente = state.factura.total - state.pagos.reduce((acc, pago) => acc + Number(pago.monto), 0);
        el.montoPendiente.textContent = toFixed2(state.pago.pendiente);
        el.montoPago.value = toFixed2(state.pago.pendiente);
        renderPagos();
      }
    }
  });

  el.baseAsignada.addEventListener('change', () => {
    const selected = findByDisplay(state.data.bases, el.baseAsignada.value.trim());
    if (selected) {
      state.base.codigo = selected.codigo_base;
      state.base.nombre = selected.nombre;
    }
  });
}

async function bootstrap(wizard) {
  state.lang = navigator.language && navigator.language.startsWith('es') ? 'es' : 'en';
  document.documentElement.lang = state.lang;
  applyI18n();
  initDateTime();
  toggleClientePanels('existe');
  toggleEntregaPanels('existe');
  toggleRecibePanels('existe');

  toggleLoading(true);
  try {
    await loadConfig();
    await loadClientes();
    await loadProductos();
    await loadCuentas();
  } catch (error) {
    showAlert('No se pudieron cargar datos iniciales.');
  } finally {
    toggleLoading(false);
  }

  updateProgress();
  registerEvents(wizard);
  showStep(1);
}

class FormWizard {
  async init() {
    await bootstrap(this);
  }

  next() {
    nextStep();
  }

  prev() {
    prevStep();
  }

  emitir() {
    emitir();
  }
}

const wizard = new FormWizard();
wizard.init();
