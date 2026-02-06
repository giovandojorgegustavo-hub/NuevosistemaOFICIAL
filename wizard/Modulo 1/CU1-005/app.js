/*
SPs de lectura y campos/variables obligatorios (v-prefijo, sin guiones):

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

vBaseNombre = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
vcodigo_base
vnombre
Variables
vcodigo_base no visible editable
vBaseNombre visible editable

vBasesCandidatas = Llamada SP: get_bases_candidatas(p_vProdFactura, vFechaP) (devuelve campo_visible)
Campos devueltos
vcodigo_base
vlatitud
vlongitud
Variables
vcodigo_base no visible no editable
vlatitud visible no editable
vlongitud visible no editable

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

vPuntoEntregaTexto = Llamada SP: get_puntos_entrega(vClienteCodigo) (devuelve campo_visible)
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

vDepartamento = Llamada SP: get_ubigeo_departamentos() (devuelve campo_visible)
Campos devueltos
vcod_dep
vdepartamento
Variables
vCod_Dep visible editable
vDepartamento visible editable

vProvincia = Llamada SP: get_ubigeo_provincias(vCod_Dep) (devuelve campo_visible)
Campos devueltos
vcod_prov
vprovincia
Variables
vCod_Prov visible editable
vProvincia visible editable

vDistrito = Llamada SP: get_ubigeo_distritos(vCod_Dep, vCod_Prov) (devuelve campo_visible)
Campos devueltos
vcod_dist
vdistrito
Variables
vCod_Dist visible editable
vDistrito visible editable

vConcatenarnumrecibe = Llamada SP: get_numrecibe(vClienteCodigo) (devuelve campo_visible)
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
vCuentaBanco visible editable
*/

const i18n = {
  en: {
    title: 'Gestion Pedido',
    subtitle: 'Global IaaS + PaaS Operations',
    statusReady: 'Ready',
    wizardTitle: 'CU005 - Manage Order',
    wizardHint: 'Transactional flow with real-time verification.',
    step1Title: '1. Select Order',
    step1Hint: 'Pick a pending order to start.',
    filterCliente: 'Client',
    filterFecha: 'Date',
    reload: 'Reload',
    pedidoCodigo: 'Code',
    pedidoCliente: 'Client',
    pedidoNumero: 'Client Number',
    pedidoFecha: 'Date',
    pedidoCreado: 'Created',
    step2Title: '2. Create Invoice',
    step2Hint: 'Complete invoice details.',
    fechaEmision: 'Issue Date',
    horaEmision: 'Issue Time',
    numeroFactura: 'Invoice Number',
    baseFactura: 'Suggested base',
    tipoDocumento: 'Document Type',
    producto: 'Product',
    saldo: 'Balance',
    cantidad: 'Quantity',
    precioUnitario: 'Unit Price',
    precioTotal: 'Total Price',
    monto: 'Amount',
    costoEnvio: 'Shipping cost',
    total: 'Total',
    step3Title: '3. Delivery Data',
    step3Hint: 'Choose existing or add new delivery point.',
    existe: 'Existing',
    nuevo: 'New',
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
    dni: 'DNI',
    agencia: 'Agency',
    observaciones: 'Notes',
    step4Title: '4. Receiver Data',
    step4Hint: 'Receiver info for Lima deliveries.',
    numRecibe: 'Receiver list',
    numRecibeEmpty: 'No receiver records available.',
    numero: 'Number',
    step5Title: '5. Payment Receipt',
    step5Hint: 'Register payment if applicable.',
    numeroDocumento: 'Document Number',
    montoPago: 'Payment amount',
    cuenta: 'Bank account',
    banco: 'Bank',
    montoPendiente: 'Pending amount',
    step6Title: '6. Assign Base',
    step6Hint: 'Suggest base by availability and ETA.',
    baseAsignada: 'Assigned base',
    baseSugerida: 'Suggested base',
    basesCandidatas: 'Candidate bases',
    basesEta: 'Bases by ETA',
    codigo: 'Code',
    eta: 'ETA',
    sinCandidatas: 'No candidate bases.',
    step7Title: '7. Summary & Issue',
    step7Hint: 'Review before issuing invoice.',
    resumenPedido: 'Order summary',
    resumenFactura: 'Invoice summary',
    resumenEntrega: 'Delivery summary',
    resumenRecibe: 'Receiver summary',
    confirmOperacion: 'I confirm the data is correct.',
    emitirFactura: 'Issue Invoice',
    prev: 'Previous',
    next: 'Next',
    saveDraft: 'Save draft',
    loading: 'Processing...',
    errorGeneric: 'Please complete required fields.',
    errorCantidad: 'Quantity exceeds available balance.',
    errorPago: 'Payment must be <= pending balance.',
    successEmit: 'Invoice issued successfully.',
    selectOrder: 'Select a pending order.'
  },
  es: {
    title: 'Gestion Pedido',
    subtitle: 'Operaciones IaaS + PaaS Globales',
    statusReady: 'Listo',
    wizardTitle: 'CU005 - Gestion Pedido',
    wizardHint: 'Flujo transaccional con verificacion en tiempo real.',
    step1Title: '1. Seleccionar Pedido',
    step1Hint: 'Selecciona un pedido pendiente para iniciar.',
    filterCliente: 'Cliente',
    filterFecha: 'Fecha',
    reload: 'Recargar',
    pedidoCodigo: 'Codigo',
    pedidoCliente: 'Cliente',
    pedidoNumero: 'Numero cliente',
    pedidoFecha: 'Fecha',
    pedidoCreado: 'Creado',
    step2Title: '2. Crear Factura',
    step2Hint: 'Completa los detalles de la factura.',
    fechaEmision: 'Fecha emision',
    horaEmision: 'Hora emision',
    numeroFactura: 'Numero factura',
    baseFactura: 'Base sugerida',
    tipoDocumento: 'Tipo documento',
    producto: 'Producto',
    saldo: 'Saldo',
    cantidad: 'Cantidad',
    precioUnitario: 'Precio unitario',
    precioTotal: 'Precio total',
    monto: 'Monto',
    costoEnvio: 'Costo envio',
    total: 'Total',
    step3Title: '3. Datos Entrega',
    step3Hint: 'Selecciona un punto existente o registra uno nuevo.',
    existe: 'Existe',
    nuevo: 'Nuevo',
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
    step4Title: '4. Datos Recibe',
    step4Hint: 'Registra a quien recibe el envio en Lima.',
    numRecibe: 'Num recibe',
    numRecibeEmpty: 'No hay registros disponibles.',
    numero: 'Numero',
    step5Title: '5. Registro de Pago',
    step5Hint: 'Registra el recibo si aplica.',
    numeroDocumento: 'Numero documento',
    montoPago: 'Monto pago',
    cuenta: 'Cuenta bancaria',
    banco: 'Banco',
    montoPendiente: 'Monto pendiente',
    step6Title: '6. Asignar Base',
    step6Hint: 'Sugiere la base ideal por disponibilidad y ETA.',
    baseAsignada: 'Base asignada',
    baseSugerida: 'Base sugerida',
    basesCandidatas: 'Bases candidatas',
    basesEta: 'Bases por ETA',
    codigo: 'Codigo',
    eta: 'ETA',
    sinCandidatas: 'Sin bases candidatas.',
    step7Title: '7. Resumen y Emitir',
    step7Hint: 'Revisa los datos antes de emitir la factura.',
    resumenPedido: 'Resumen Pedido',
    resumenFactura: 'Resumen Factura',
    resumenEntrega: 'Resumen Entrega',
    resumenRecibe: 'Resumen Recibe',
    confirmOperacion: 'Confirmo que los datos son correctos.',
    emitirFactura: 'Emitir Factura',
    prev: 'Anterior',
    next: 'Siguiente',
    saveDraft: 'Guardar borrador',
    loading: 'Procesando...',
    errorGeneric: 'Completa los campos requeridos.',
    errorCantidad: 'Cantidad supera el saldo disponible.',
    errorPago: 'Pago debe ser <= monto pendiente.',
    successEmit: 'Factura emitida correctamente.',
    selectOrder: 'Selecciona un pedido pendiente.'
  }
};

const state = {
  lang: 'es',
  currentStep: 1,
  config: null,
  pedidos: [],
  puntosEntrega: [],
  numRecibe: [],
  bases: [],
  cuentas: [],
  ubigeo: {
    departamentos: [],
    provincias: [],
    distritos: []
  },
  basesCandidatas: [],
  basesEta: [],
  data: {
    vcodigo_pedido: '',
    vClienteCodigo: '',
    vnombre_cliente: '',
    vnumero_cliente: '',
    vfecha: '',
    vFechaemision: '',
    vHoraemision: '',
    vFechaP: '',
    vTipo_documento: 'FAC',
    vNumero_documento: '',
    vcodigo_base: '',
    vBaseNombre: '',
    vProdFactura: [],
    VfMonto: 0,
    vCostoEnvio: 0,
    VfTotal: 0,
    Vfsaldo: 0,
    vPuntoEntregaTexto: '',
    vRegion_Entrega: '',
    vDireccionLinea: '',
    vReferencia: '',
    vNombre: '',
    vDni: '',
    vAgencia: '',
    vObservaciones: '',
    vLatitud: '',
    vLongitud: '',
    vCod_Dep: '15',
    vCod_Prov: '01',
    vCod_Dist: '',
    Vubigeo: '',
    Vcodigo_puntoentrega: '',
    vConcatenarpuntoentrega: '',
    vEntregaModo: 'existe',
    vRecibeModo: 'existe',
    vOrdinal_numrecibe: '',
    vNumeroRecibe: '',
    vNombreRecibe: '',
    vConcatenarnumrecibe: '',
    vTipo_documento_pago: 'RCP',
    vNumero_documento_pago: '',
    vCuentaBancaria: '',
    vCuentaNombre: '',
    vCuentaBanco: '',
    vMontoPago: 0,
    vMontoPendiente: 0
  }
};

const initialData = JSON.parse(JSON.stringify(state.data));

const reDecimal = /^(\d+)(\.\d{1,2})?$/;
const reDni = /^\d{8}$/;

class FormWizard {
  constructor() {
    this.steps = this.computeSteps();
  }

  computeSteps() {
    if (state.data.vRegion_Entrega === 'PROV') {
      return [1, 2, 3, 5, 6, 7];
    }
    return [1, 2, 3, 4, 5, 6, 7];
  }

  updateProgress() {
    this.steps = this.computeSteps();
    const index = this.steps.indexOf(state.currentStep);
    const total = this.steps.length;
    const progress = ((index + 1) / total) * 100;
    el.stepIndicator.textContent = `${index + 1} / ${total}`;
    el.progressBar.style.width = `${progress}%`;
  }

  show(step) {
    state.currentStep = step;
    document.querySelectorAll('.wizard-step').forEach((section) => {
      const sectionStep = Number(section.dataset.step);
      section.classList.toggle('active', sectionStep === step);
    });
    this.updateProgress();
    el.prevBtn.disabled = step === this.steps[0];
    el.nextBtn.classList.toggle('d-none', step === this.steps[this.steps.length - 1]);
    clearAlerts();
  }

  nextStep() {
    const idx = this.steps.indexOf(state.currentStep);
    return this.steps[idx + 1];
  }

  prevStep() {
    const idx = this.steps.indexOf(state.currentStep);
    return this.steps[idx - 1];
  }
}

const el = {
  stepIndicator: document.getElementById('stepIndicator'),
  progressBar: document.getElementById('progressBar'),
  formAlert: document.getElementById('formAlert'),
  formSuccess: document.getElementById('formSuccess'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  statusPill: document.getElementById('statusPill'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  saveDraft: document.getElementById('saveDraft'),
  reloadPedidos: document.getElementById('reloadPedidos'),
  pedidosTable: document.getElementById('pedidosTable').querySelector('tbody'),
  filterCliente: document.getElementById('filterCliente'),
  filterFecha: document.getElementById('filterFecha'),
  fechaEmision: document.getElementById('fechaEmision'),
  horaEmision: document.getElementById('horaEmision'),
  numeroFactura: document.getElementById('numeroFactura'),
  baseFactura: document.getElementById('baseFactura'),
  basesFacturaList: document.getElementById('basesFacturaList'),
  productosTable: document.getElementById('productosTable').querySelector('tbody'),
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
  direccionLinea: document.getElementById('direccionLinea'),
  referencia: document.getElementById('referencia'),
  latitud: document.getElementById('latitud'),
  longitud: document.getElementById('longitud'),
  mapSearch: document.getElementById('mapSearch'),
  departamento: document.getElementById('departamento'),
  departamentosList: document.getElementById('departamentosList'),
  provincia: document.getElementById('provincia'),
  provinciasList: document.getElementById('provinciasList'),
  distrito: document.getElementById('distrito'),
  distritosList: document.getElementById('distritosList'),
  nombreEntrega: document.getElementById('nombreEntrega'),
  dniEntrega: document.getElementById('dniEntrega'),
  agenciaEntrega: document.getElementById('agenciaEntrega'),
  observacionesEntrega: document.getElementById('observacionesEntrega'),
  recibeExiste: document.getElementById('recibeExiste'),
  recibeNuevo: document.getElementById('recibeNuevo'),
  recibeExistePanel: document.getElementById('recibeExistePanel'),
  recibeNuevoPanel: document.getElementById('recibeNuevoPanel'),
  numRecibe: document.getElementById('numRecibe'),
  numRecibeList: document.getElementById('numRecibeList'),
  numRecibeEmpty: document.getElementById('numRecibeEmpty'),
  numeroRecibe: document.getElementById('numeroRecibe'),
  nombreRecibe: document.getElementById('nombreRecibe'),
  tipoDocumentoPago: document.getElementById('tipoDocumentoPago'),
  numeroDocumentoPago: document.getElementById('numeroDocumentoPago'),
  montoPago: document.getElementById('montoPago'),
  cuentaNombre: document.getElementById('cuentaNombre'),
  cuentasList: document.getElementById('cuentasList'),
  cuentaBanco: document.getElementById('cuentaBanco'),
  montoPendiente: document.getElementById('montoPendiente'),
  baseAsignada: document.getElementById('baseAsignada'),
  baseSugerida: document.getElementById('baseSugerida'),
  basesAsignacionList: document.getElementById('basesAsignacionList'),
  basesCandidatasTable: document.getElementById('basesCandidatasTable').querySelector('tbody'),
  basesEtaTable: document.getElementById('basesEtaTable').querySelector('tbody'),
  basesEtaEmpty: document.getElementById('basesEtaEmpty'),
  resumenPedido: document.getElementById('resumenPedido'),
  resumenFactura: document.getElementById('resumenFactura'),
  resumenEntrega: document.getElementById('resumenEntrega'),
  resumenRecibe: document.getElementById('resumenRecibe'),
  confirmOperacion: document.getElementById('confirmOperacion'),
  emitirFactura: document.getElementById('emitirFactura')
};

function detectLanguage() {
  const browserLang = navigator.language || 'es';
  if (browserLang.toLowerCase().startsWith('es')) {
    return 'es';
  }
  return 'en';
}

function t(key) {
  return i18n[state.lang][key] || i18n.es[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = t(key);
  });
}

function showAlert(message) {
  el.formAlert.textContent = message;
  el.formAlert.classList.remove('d-none');
  el.formSuccess.classList.add('d-none');
}

function showSuccess(message) {
  el.formSuccess.textContent = message;
  el.formSuccess.classList.remove('d-none');
  el.formAlert.classList.add('d-none');
}

function clearAlerts() {
  el.formAlert.classList.add('d-none');
  el.formSuccess.classList.add('d-none');
}

function setLoading(isLoading) {
  el.loadingOverlay.classList.toggle('d-none', !isLoading);
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

const wizard = new FormWizard();

function mapListToDatalist(list, datalist, valueKey, labelKey) {
  datalist.innerHTML = '';
  list.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[labelKey];
    option.dataset.value = item[valueKey];
    datalist.appendChild(option);
  });
}

function findByLabel(list, labelKey, label) {
  return list.find((item) => item[labelKey] === label) || null;
}

function initDateTime() {
  const now = new Date();
  el.fechaEmision.value = now.toISOString().slice(0, 10);
  el.horaEmision.value = now.toTimeString().slice(0, 5);
  state.data.vFechaemision = el.fechaEmision.value;
  state.data.vHoraemision = el.horaEmision.value;
}

function updateFechaP() {
  const fecha = el.fechaEmision.value;
  const hora = el.horaEmision.value || '00:00';
  state.data.vFechaemision = fecha;
  state.data.vHoraemision = hora;
  state.data.vFechaP = `${fecha} ${hora}:00`;
}

function renderPedidos() {
  el.pedidosTable.innerHTML = '';
  state.pedidos.forEach((pedido) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${pedido.codigo_pedido}</td>
      <td>${pedido.nombre_cliente}</td>
      <td>${pedido.numero_cliente}</td>
      <td>${pedido.fecha || ''}</td>
      <td>${pedido.created_at || ''}</td>
      <td><button class="btn btn-sm btn-outline-light" data-id="${pedido.codigo_pedido}">${t('next')}</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => selectPedido(pedido));
    el.pedidosTable.appendChild(tr);
  });
}

async function loadPedidos() {
  setLoading(true);
  try {
    const params = new URLSearchParams();
    if (el.filterCliente.value) params.append('cliente', el.filterCliente.value);
    if (el.filterFecha.value) params.append('fecha', el.filterFecha.value);
    const data = await apiFetch(`/api/pedidos-pendientes?${params.toString()}`);
    state.pedidos = data.rows || [];
    renderPedidos();
  } catch (error) {
    showAlert(error.message);
  } finally {
    setLoading(false);
  }
}

async function selectPedido(pedido) {
  state.data.vcodigo_pedido = String(pedido.codigo_pedido);
  state.data.vClienteCodigo = String(pedido.codigo_cliente);
  state.data.vnombre_cliente = pedido.nombre_cliente;
  state.data.vnumero_cliente = pedido.numero_cliente;
  state.data.vfecha = pedido.fecha;
  await prepareStep2();
  wizard.show(2);
}

function renderProductos() {
  el.productosTable.innerHTML = '';
  state.data.vProdFactura.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nombre_producto}</td>
      <td>${formatMoney(item.saldo)}</td>
      <td>
        <input type="text" class="form-control form-control-sm" value="${item.cantidad}" data-index="${index}" />
      </td>
      <td>${formatMoney(item.precio_unitario)}</td>
      <td>${formatMoney(item.precio_total)}</td>
      <td>
        <button class="btn btn-sm btn-outline-warning" data-remove="${index}">-</button>
      </td>
    `;
    tr.querySelector('input').addEventListener('input', (event) => updateCantidad(event, index));
    tr.querySelector('button').addEventListener('click', () => removeProducto(index));
    el.productosTable.appendChild(tr);
  });
}

function updateCantidad(event, index) {
  const value = event.target.value.trim();
  if (value && !reDecimal.test(value)) {
    return;
  }
  const cantidad = value ? Number(value) : 0;
  const item = state.data.vProdFactura[index];
  item.cantidad = cantidad;
  item.precio_total = cantidad * Number(item.precio_unitario);
  renderProductos();
  updateTotales();
}

function removeProducto(index) {
  if (state.data.vProdFactura.length <= 1) {
    return;
  }
  state.data.vProdFactura.splice(index, 1);
  renderProductos();
  updateTotales();
}

function updateTotales() {
  const monto = state.data.vProdFactura.reduce((acc, item) => acc + Number(item.precio_total || 0), 0);
  state.data.VfMonto = monto;
  state.data.VfTotal = monto + Number(state.data.vCostoEnvio || 0);
  state.data.Vfsaldo = state.data.VfTotal;
  el.montoFactura.textContent = formatMoney(state.data.VfMonto);
  el.costoEnvio.textContent = formatMoney(state.data.vCostoEnvio);
  el.totalFactura.textContent = formatMoney(state.data.VfTotal);
  el.montoPendiente.textContent = formatMoney(state.data.VfTotal);
}

async function prepareStep2() {
  setLoading(true);
  try {
    updateFechaP();
    const nextFactura = await apiFetch('/api/next-factura');
    state.data.vNumero_documento = String(nextFactura.next || '');
    el.numeroFactura.value = state.data.vNumero_documento;

    const detalle = await apiFetch(`/api/pedido-detalle/${state.data.vcodigo_pedido}`);
    state.data.vProdFactura = (detalle.rows || []).map((item) => ({
      codigo_producto: item.codigo_producto,
      nombre_producto: item.nombre_producto,
      saldo: Number(item.saldo || 0),
      precio_unitario: Number(item.precio_unitario || 0),
      cantidad: Number(item.saldo || 0),
      precio_total: Number(item.saldo || 0) * Number(item.precio_unitario || 0)
    }));

    renderProductos();
    updateTotales();

    await loadBases();
  } catch (error) {
    showAlert(error.message);
  } finally {
    setLoading(false);
  }
}

async function loadBases() {
  const data = await apiFetch('/api/bases');
  state.bases = data.rows || [];
  mapListToDatalist(state.bases, el.basesFacturaList, 'codigo_base', 'nombre');
  mapListToDatalist(state.bases, el.basesAsignacionList, 'codigo_base', 'nombre');
}

async function loadPuntosEntrega() {
  if (!state.data.vClienteCodigo) return;
  const data = await apiFetch(`/api/puntos-entrega/${state.data.vClienteCodigo}`);
  state.puntosEntrega = data.rows || [];
  mapListToDatalist(state.puntosEntrega, el.puntosEntregaList, 'codigo_puntoentrega', 'concatenarpuntoentrega');
  const hasPuntos = state.puntosEntrega.length > 0;
  el.puntosEntregaEmpty.classList.toggle('d-none', hasPuntos);
  el.entregaExiste.disabled = !hasPuntos;
  el.entregaExiste.closest('.form-check').classList.toggle('d-none', !hasPuntos);
  if (!hasPuntos) {
    el.entregaNuevo.checked = true;
    state.data.vEntregaModo = 'nuevo';
    toggleEntregaMode();
  }
}

function toggleEntregaMode() {
  const mode = document.querySelector('input[name="entregaOption"]:checked').value;
  state.data.vEntregaModo = mode;
  el.entregaExistePanel.classList.toggle('d-none', mode !== 'existe');
  el.entregaNuevoPanel.classList.toggle('d-none', mode !== 'nuevo');
  if (mode === 'nuevo') {
    ensureMapa();
    fetchNextPuntoEntrega();
    updateRegion();
  }
}

async function fetchNextPuntoEntrega() {
  if (!state.data.vClienteCodigo) return;
  const data = await apiFetch(`/api/next-puntoentrega/${state.data.vClienteCodigo}`);
  state.data.Vcodigo_puntoentrega = String(data.next || '');
}

function setEntregaFromExisting(label) {
  const selected = findByLabel(state.puntosEntrega, 'concatenarpuntoentrega', label);
  if (!selected) return;
  state.data.vPuntoEntregaTexto = selected.concatenarpuntoentrega;
  state.data.vRegion_Entrega = selected.region_entrega || '';
  state.data.vDireccionLinea = selected.direccion_linea || '';
  state.data.vReferencia = selected.referencia || '';
  state.data.vNombre = selected.nombre || '';
  state.data.vDni = selected.dni || '';
  state.data.vAgencia = selected.agencia || '';
  state.data.vObservaciones = selected.observaciones || '';
  state.data.Vcodigo_puntoentrega = selected.codigo_puntoentrega || '';
  state.data.vConcatenarpuntoentrega = selected.concatenarpuntoentrega || '';
  updateCostoEnvio();
  wizard.updateProgress();
}

async function loadUbigeo() {
  const departamentos = await apiFetch('/api/ubigeo/departamentos');
  state.ubigeo.departamentos = departamentos.rows || [];
  mapListToDatalist(state.ubigeo.departamentos, el.departamentosList, 'cod_dep', 'departamento');

  await loadProvincias();
  await loadDistritos();

  const depDefault = state.ubigeo.departamentos.find((d) => d.cod_dep === state.data.vCod_Dep);
  if (depDefault) el.departamento.value = depDefault.departamento;
  const provDefault = state.ubigeo.provincias.find((p) => p.cod_prov === state.data.vCod_Prov);
  if (provDefault) el.provincia.value = provDefault.provincia;
}

async function loadProvincias() {
  const data = await apiFetch(`/api/ubigeo/provincias/${state.data.vCod_Dep}`);
  state.ubigeo.provincias = data.rows || [];
  mapListToDatalist(state.ubigeo.provincias, el.provinciasList, 'cod_prov', 'provincia');
}

async function loadDistritos() {
  const data = await apiFetch(`/api/ubigeo/distritos/${state.data.vCod_Dep}/${state.data.vCod_Prov}`);
  state.ubigeo.distritos = data.rows || [];
  mapListToDatalist(state.ubigeo.distritos, el.distritosList, 'cod_dist', 'distrito');
}

function updateUbigeoFromInput() {
  const dep = findByLabel(state.ubigeo.departamentos, 'departamento', el.departamento.value);
  if (dep) state.data.vCod_Dep = dep.cod_dep;

  const prov = findByLabel(state.ubigeo.provincias, 'provincia', el.provincia.value);
  if (prov) state.data.vCod_Prov = prov.cod_prov;

  const dist = findByLabel(state.ubigeo.distritos, 'distrito', el.distrito.value);
  if (dist) state.data.vCod_Dist = dist.cod_dist;

  state.data.Vubigeo = `${state.data.vCod_Dep}${state.data.vCod_Prov}${state.data.vCod_Dist || ''}`;
  updateRegion();
}

function updateRegion() {
  if (state.data.vCod_Dep === '15' && state.data.vCod_Prov === '01') {
    state.data.vRegion_Entrega = 'LIMA';
  } else {
    state.data.vRegion_Entrega = 'PROV';
  }
  updateCostoEnvio();
  applyRegionFields();
  wizard.updateProgress();
}

function updateCostoEnvio() {
  state.data.vCostoEnvio = state.data.vRegion_Entrega === 'PROV' ? 50 : 0;
  updateTotales();
}

function applyRegionFields() {
  const isLima = state.data.vRegion_Entrega === 'LIMA';
  el.direccionLinea.parentElement.classList.toggle('d-none', !isLima);
  el.referencia.parentElement.classList.toggle('d-none', !isLima);
  el.latitud.parentElement.classList.toggle('d-none', !isLima);
  el.longitud.parentElement.classList.toggle('d-none', !isLima);
  el.nombreEntrega.parentElement.classList.toggle('d-none', isLima);
  el.dniEntrega.parentElement.classList.toggle('d-none', isLima);
  el.agenciaEntrega.parentElement.classList.toggle('d-none', isLima);
  el.observacionesEntrega.parentElement.classList.toggle('d-none', isLima);
}

function buildConcatenarPuntoEntrega() {
  if (state.data.vRegion_Entrega === 'LIMA') {
    const parts = [state.data.vDireccionLinea, el.distrito.value, state.data.vReferencia].filter(Boolean);
    state.data.vConcatenarpuntoentrega = parts.join(' | ');
  } else {
    const parts = [state.data.vNombre, state.data.vDni, state.data.vAgencia, state.data.vObservaciones].filter(Boolean);
    state.data.vConcatenarpuntoentrega = parts.join(' | ');
  }
}

async function loadNumRecibe() {
  if (!state.data.vClienteCodigo) return;
  const data = await apiFetch(`/api/numrecibe/${state.data.vClienteCodigo}`);
  state.numRecibe = data.rows || [];
  mapListToDatalist(state.numRecibe, el.numRecibeList, 'ordinal_numrecibe', 'concatenarnumrecibe');
  const hasRecibe = state.numRecibe.length > 0;
  el.numRecibeEmpty.classList.toggle('d-none', hasRecibe);
  el.recibeExiste.disabled = !hasRecibe;
  el.recibeExiste.closest('.form-check').classList.toggle('d-none', !hasRecibe);
  if (!hasRecibe) {
    el.recibeNuevo.checked = true;
    state.data.vRecibeModo = 'nuevo';
    toggleRecibeMode();
  }
}

function toggleRecibeMode() {
  const mode = document.querySelector('input[name="recibeOption"]:checked').value;
  state.data.vRecibeModo = mode;
  el.recibeExistePanel.classList.toggle('d-none', mode !== 'existe');
  el.recibeNuevoPanel.classList.toggle('d-none', mode !== 'nuevo');
  if (mode === 'nuevo') {
    fetchNextNumRecibe();
  }
}

async function fetchNextNumRecibe() {
  if (!state.data.vClienteCodigo) return;
  const data = await apiFetch(`/api/next-numrecibe/${state.data.vClienteCodigo}`);
  state.data.vOrdinal_numrecibe = String(data.next || '');
}

function setRecibeFromExisting(label) {
  const selected = findByLabel(state.numRecibe, 'concatenarnumrecibe', label);
  if (!selected) return;
  state.data.vOrdinal_numrecibe = selected.ordinal_numrecibe;
  state.data.vNumeroRecibe = selected.numero;
  state.data.vNombreRecibe = selected.nombre;
  state.data.vConcatenarnumrecibe = selected.concatenarnumrecibe;
}

async function loadCuentas() {
  const data = await apiFetch('/api/cuentas-bancarias');
  state.cuentas = data.rows || [];
  mapListToDatalist(state.cuentas, el.cuentasList, 'codigo_cuentabancaria', 'nombre');
}

function setCuentaFromInput(label) {
  const selected = findByLabel(state.cuentas, 'nombre', label);
  if (!selected) return;
  state.data.vCuentaBancaria = selected.codigo_cuentabancaria;
  state.data.vCuentaNombre = selected.nombre;
  state.data.vCuentaBanco = selected.banco;
  el.cuentaBanco.value = selected.banco || '';
}

async function prepareStep5() {
  const nextRecibo = await apiFetch('/api/next-recibo');
  state.data.vNumero_documento_pago = String(nextRecibo.next || '');
  el.numeroDocumentoPago.value = state.data.vNumero_documento_pago;
  el.montoPago.value = formatMoney(state.data.VfTotal);
  state.data.vMontoPago = state.data.VfTotal;
  state.data.vMontoPendiente = state.data.VfTotal;
  el.montoPendiente.textContent = formatMoney(state.data.VfTotal);
}

function buildProdFacturaJson() {
  return state.data.vProdFactura.map((item) => ({
    vFProducto: item.codigo_producto,
    vFCantidadProducto: item.cantidad,
    vFPrecioTotal: item.precio_total
  }));
}

async function prepareStep6() {
  setLoading(true);
  try {
    updateFechaP();
    const payload = {
      vProdFactura: buildProdFacturaJson(),
      vFechaP: state.data.vFechaP
    };
    const data = await apiFetch('/api/bases-candidatas', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.basesCandidatas = data.rows || [];
    renderBasesCandidatas();
    await computeEta();
  } catch (error) {
    showAlert(error.message);
  } finally {
    setLoading(false);
  }
}

function renderBasesCandidatas() {
  el.basesCandidatasTable.innerHTML = '';
  state.basesCandidatas.forEach((base) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${base.codigo_base}</td>
      <td>${base.latitud || ''}</td>
      <td>${base.longitud || ''}</td>
    `;
    el.basesCandidatasTable.appendChild(tr);
  });

  const basesPrioridad = state.basesCandidatas.map((b) => b.codigo_base);
  const ordered = [...state.bases].sort((a, b) => {
    const aIs = basesPrioridad.includes(a.codigo_base) ? 0 : 1;
    const bIs = basesPrioridad.includes(b.codigo_base) ? 0 : 1;
    return aIs - bIs;
  });
  mapListToDatalist(ordered, el.basesAsignacionList, 'codigo_base', 'nombre');
}

async function computeEta() {
  el.basesEtaTable.innerHTML = '';
  el.basesEtaEmpty.classList.toggle('d-none', true);
  state.basesEta = [];

  if (!state.data.vLatitud || !state.data.vLongitud || state.basesCandidatas.length === 0) {
    el.basesEtaEmpty.classList.toggle('d-none', state.basesCandidatas.length > 0);
    return;
  }

  const response = await apiFetch('/api/distance-matrix', {
    method: 'POST',
    body: JSON.stringify({
      origin: `${state.data.vLatitud},${state.data.vLongitud}`,
      destinations: state.basesCandidatas.map((b) => `${b.latitud},${b.longitud}`),
      destinations_meta: state.basesCandidatas.map((b) => ({ codigo_base: b.codigo_base }))
    })
  });

  state.basesEta = response.rows || [];
  state.basesEta.sort((a, b) => a.duration_value - b.duration_value);

  state.basesEta.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item.codigo_base}</td><td>${item.duration_text}</td>`;
    el.basesEtaTable.appendChild(tr);
  });

  if (state.basesEta.length > 0) {
    const best = state.basesEta[0];
    const base = state.bases.find((b) => b.codigo_base === best.codigo_base);
    if (base) {
      state.data.vcodigo_base = base.codigo_base;
      state.data.vBaseNombre = base.nombre;
      el.baseAsignada.value = base.nombre;
      el.baseSugerida.value = `${base.nombre} (${best.duration_text})`;
    }
  } else {
    el.basesEtaEmpty.classList.remove('d-none');
  }
}

function buildResumen() {
  el.resumenPedido.textContent = `${state.data.vcodigo_pedido} | ${state.data.vnombre_cliente} | ${state.data.vnumero_cliente}`;
  el.resumenFactura.textContent = `FAC ${state.data.vNumero_documento} | Total ${formatMoney(state.data.VfTotal)}`;
  const entregaModo = state.data.vEntregaModo === 'nuevo' ? 'NUEVO' : 'EXISTENTE';
  el.resumenEntrega.textContent = `${entregaModo} | ${state.data.vRegion_Entrega || ''} | ${state.data.vConcatenarpuntoentrega || state.data.vPuntoEntregaTexto}`;
  const recibeModo = state.data.vRecibeModo === 'nuevo' ? 'NUEVO' : 'EXISTENTE';
  el.resumenRecibe.textContent = `${recibeModo} | ${state.data.vConcatenarnumrecibe || ''}`;
}

function validateStep(step) {
  clearAlerts();
  if (step === 1) {
    if (!state.data.vcodigo_pedido) {
      showAlert(t('selectOrder'));
      return false;
    }
  }
  if (step === 2) {
    updateFechaP();
    for (const item of state.data.vProdFactura) {
      if (Number(item.cantidad) > Number(item.saldo)) {
        showAlert(t('errorCantidad'));
        return false;
      }
    }
  }
  if (step === 3) {
    if (state.data.vEntregaModo === 'nuevo') {
      state.data.vDireccionLinea = el.direccionLinea.value.trim();
      state.data.vReferencia = el.referencia.value.trim();
      state.data.vLatitud = el.latitud.value.trim();
      state.data.vLongitud = el.longitud.value.trim();
      state.data.vNombre = el.nombreEntrega.value.trim();
      state.data.vDni = el.dniEntrega.value.trim();
      state.data.vAgencia = el.agenciaEntrega.value.trim();
      state.data.vObservaciones = el.observacionesEntrega.value.trim();
      updateUbigeoFromInput();
      if (state.data.vRegion_Entrega === 'LIMA') {
        if (!state.data.vDireccionLinea) {
          showAlert(t('errorGeneric'));
          return false;
        }
      } else {
        if (state.data.vDni && !reDni.test(state.data.vDni)) {
          showAlert('DNI invalido');
          return false;
        }
      }
      buildConcatenarPuntoEntrega();
    } else {
      if (!state.data.vPuntoEntregaTexto) {
        showAlert(t('errorGeneric'));
        return false;
      }
    }
  }
  if (step === 4 && state.data.vRegion_Entrega === 'LIMA') {
    if (state.data.vRecibeModo === 'nuevo') {
      state.data.vNumeroRecibe = el.numeroRecibe.value.trim();
      state.data.vNombreRecibe = el.nombreRecibe.value.trim();
      state.data.vConcatenarnumrecibe = [state.data.vNumeroRecibe, state.data.vNombreRecibe].filter(Boolean).join(' | ');
      if (!state.data.vNumeroRecibe || !state.data.vNombreRecibe) {
        showAlert(t('errorGeneric'));
        return false;
      }
    } else {
      if (!state.data.vConcatenarnumrecibe) {
        showAlert(t('errorGeneric'));
        return false;
      }
    }
  }
  if (step === 5) {
    const monto = el.montoPago.value.trim();
    if (monto && !reDecimal.test(monto)) {
      showAlert(t('errorGeneric'));
      return false;
    }
    state.data.vMontoPago = monto ? Number(monto) : 0;
    if (state.data.vMontoPago > state.data.vMontoPendiente) {
      showAlert(t('errorPago'));
      return false;
    }
    setCuentaFromInput(el.cuentaNombre.value);
    if (state.data.vMontoPago > 0 && !state.data.vCuentaBancaria) {
      showAlert(t('errorGeneric'));
      return false;
    }
  }
  if (step === 6) {
    const base = findByLabel(state.bases, 'nombre', el.baseAsignada.value);
    if (base) {
      state.data.vcodigo_base = base.codigo_base;
      state.data.vBaseNombre = base.nombre;
    }
  }
  if (step === 7) {
    buildResumen();
  }
  return true;
}

async function emitFactura() {
  if (!el.confirmOperacion.checked) {
    showAlert(t('errorGeneric'));
    return;
  }
  setLoading(true);
  try {
    const payload = {
      data: state.data,
      prodFactura: state.data.vProdFactura.map((item, index) => ({
        ...item,
        ordinal: index + 1
      })),
      prodFacturaJson: buildProdFacturaJson()
    };
    await apiFetch('/api/emitir-factura', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showSuccess(t('successEmit'));
    resetWizard();
  } catch (error) {
    showAlert(error.message);
  } finally {
    setLoading(false);
  }
}

function resetWizard() {
  state.currentStep = 1;
  state.data = JSON.parse(JSON.stringify(initialData));
  el.confirmOperacion.checked = false;
  el.emitirFactura.disabled = true;
  el.baseAsignada.value = '';
  el.baseSugerida.value = '';
  el.numRecibe.value = '';
  el.puntoEntrega.value = '';
  el.productosTable.innerHTML = '';
  el.resumenPedido.textContent = '';
  el.resumenFactura.textContent = '';
  el.resumenEntrega.textContent = '';
  el.resumenRecibe.textContent = '';
  wizard.show(1);
  loadPedidos();
}

function wireEvents() {
  el.prevBtn.addEventListener('click', () => {
    wizard.updateProgress();
    const prevStep = wizard.prevStep();
    if (prevStep) {
      wizard.show(prevStep);
    }
  });

  el.nextBtn.addEventListener('click', async () => {
    if (!validateStep(state.currentStep)) return;
    wizard.updateProgress();
    const nextStep = wizard.nextStep();
    if (nextStep) {
      if (nextStep === 3) {
        await loadPuntosEntrega();
        await loadUbigeo();
      }
      if (nextStep === 4) {
        await loadNumRecibe();
      }
      if (nextStep === 5) {
        await prepareStep5();
      }
      if (nextStep === 6) {
        await prepareStep6();
      }
      if (nextStep === 7) {
        buildResumen();
      }
      wizard.show(nextStep);
    }
  });

  el.saveDraft.addEventListener('click', () => {
    showAlert('Borrador local actualizado.');
  });

  el.reloadPedidos.addEventListener('click', loadPedidos);

  el.emitirFactura.disabled = true;
  el.confirmOperacion.addEventListener('change', () => {
    el.emitirFactura.disabled = !el.confirmOperacion.checked;
  });
  el.fechaEmision.addEventListener('change', updateFechaP);
  el.horaEmision.addEventListener('change', updateFechaP);

  el.baseFactura.addEventListener('change', () => {
    const base = findByLabel(state.bases, 'nombre', el.baseFactura.value);
    if (base) {
      state.data.vcodigo_base = base.codigo_base;
      state.data.vBaseNombre = base.nombre;
    }
  });

  document.querySelectorAll('input[name="entregaOption"]').forEach((input) => {
    input.addEventListener('change', toggleEntregaMode);
  });

  el.puntoEntrega.addEventListener('change', () => setEntregaFromExisting(el.puntoEntrega.value));

  el.departamento.addEventListener('change', async () => {
    updateUbigeoFromInput();
    await loadProvincias();
    await loadDistritos();
  });

  el.provincia.addEventListener('change', async () => {
    updateUbigeoFromInput();
    await loadDistritos();
  });

  el.distrito.addEventListener('change', updateUbigeoFromInput);

  document.querySelectorAll('input[name="recibeOption"]').forEach((input) => {
    input.addEventListener('change', toggleRecibeMode);
  });

  el.numRecibe.addEventListener('change', () => setRecibeFromExisting(el.numRecibe.value));
  el.cuentaNombre.addEventListener('change', () => setCuentaFromInput(el.cuentaNombre.value));
  el.montoPago.addEventListener('change', () => validateStep(5));

  el.baseAsignada.addEventListener('change', () => {
    const base = findByLabel(state.bases, 'nombre', el.baseAsignada.value);
    if (base) {
      state.data.vcodigo_base = base.codigo_base;
      state.data.vBaseNombre = base.nombre;
    }
  });

  el.emitirFactura.addEventListener('click', emitFactura);
}

let mapInstance = null;
let mapMarker = null;
let autocomplete = null;

function ensureMapa() {
  if (mapInstance) return;
  if (!state.config) return;
  if (!state.config.apiKey) {
    showAlert('Google Maps API key missing');
    return;
  }

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${state.config.apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => initMap();
  document.head.appendChild(script);
}

function initMap() {
  const center = state.config.defaultCenter || { lat: -12.0464, lng: -77.0428 };
  mapInstance = new google.maps.Map(document.getElementById('map'), {
    center,
    zoom: state.config.defaultZoom || 12
  });
  mapMarker = new google.maps.Marker({ map: mapInstance, position: center });

  autocomplete = new google.maps.places.Autocomplete(el.mapSearch);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;
    const location = place.geometry.location;
    setMapLocation(location.lat(), location.lng(), place.formatted_address || '');
  });

  mapInstance.addListener('click', (event) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: event.latLng }, (results, status) => {
      const address = status === 'OK' && results[0] ? results[0].formatted_address : '';
      setMapLocation(event.latLng.lat(), event.latLng.lng(), address);
    });
  });
}

function setMapLocation(lat, lng, address) {
  if (!mapInstance) return;
  const pos = { lat, lng };
  mapInstance.setCenter(pos);
  mapMarker.setPosition(pos);
  el.latitud.value = lat.toFixed(6);
  el.longitud.value = lng.toFixed(6);
  if (address) {
    el.direccionLinea.value = address;
  }
  state.data.vLatitud = el.latitud.value;
  state.data.vLongitud = el.longitud.value;
  if (state.currentStep >= 6 && state.basesCandidatas.length > 0) {
    computeEta().catch(() => {});
  }
}

async function init() {
  state.lang = detectLanguage();
  applyTranslations();
  wizard.updateProgress();
  initDateTime();
  wireEvents();

  setLoading(true);
  try {
    state.config = await apiFetch('/api/config');
    await loadPedidos();
    await loadCuentas();
  } catch (error) {
    showAlert(error.message);
  } finally {
    setLoading(false);
  }

  wizard.show(1);
}

init();
