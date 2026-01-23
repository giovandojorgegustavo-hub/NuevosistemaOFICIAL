const API_BASE = '/api';

const i18n = {
  es: {
    eyebrow: 'Global IaaS · PaaS Operations',
    title: 'Gestion Pedido · Facturacion',
    subtitle: 'Flujo asistido para convertir pedidos en facturas con trazabilidad completa.',
    status: 'Conectado al ERP',
    sectionTitle: 'Formulario multipaso',
    sectionSubtitle: 'Completa los datos requeridos para emitir la factura.',
    step1Title: 'Seleccionar Pedido',
    step1Desc: 'Filtra y selecciona el pedido pendiente a facturar.',
    step2Title: 'Crear Factura',
    step2Desc: 'Confirma los detalles del pedido y configura la factura.',
    step3Title: 'Datos Entrega',
    step3Desc: 'Selecciona un punto de entrega existente o crea uno nuevo.',
    step4Title: 'Datos Recibe',
    step4Desc: 'Configura quien recibe el paquete en Lima.',
    step5Title: 'Resumen y Emitir Factura',
    step5Desc: 'Revisa la informacion antes de emitir.',
    filterClient: 'Cliente',
    filterDate: 'Fecha',
    filterButton: 'Buscar pedidos',
    colFecha: 'Fecha',
    colPedido: 'Codigo Pedido',
    colCliente: 'Codigo Cliente',
    colProducto: 'Producto',
    colSaldo: 'Saldo',
    colPrecio: 'Precio total',
    colCantidad: 'Cantidad',
    fechaEmision: 'Fecha emision',
    horaEmision: 'Hora emision',
    tipoDocumento: 'Tipo documento',
    numeroDocumento: 'Numero documento',
    codigoBase: 'Codigo base',
    pedidoSeleccionado: 'Pedido seleccionado',
    detallePedido: 'Detalle del pedido',
    detalleFactura: 'Detalle factura',
    totalFactura: 'Total factura',
    existente: 'Existente',
    nuevo: 'Nuevo',
    puntoEntrega: 'Punto entrega',
    departamento: 'Departamento',
    provincia: 'Provincia',
    distrito: 'Distrito',
    direccion: 'Direccion',
    referencia: 'Referencia',
    nombre: 'Nombre',
    dni: 'DNI',
    agencia: 'Agencia',
    observaciones: 'Observaciones',
    numRecibe: 'Numero recibe',
    numero: 'Numero',
    resPedido: 'Resumen Pedido',
    resFactura: 'Resumen Factura',
    resEntrega: 'Resumen Entrega',
    resRecibe: 'Resumen Recibe',
    emitirFactura: 'Emitir Factura',
    prev: 'Anterior',
    next: 'Siguiente',
    confirmTitle: 'Confirmar operacion',
    confirmBody: '¿Deseas emitir la factura ahora?',
    cancel: 'Cancelar',
    confirm: 'Confirmar'
  },
  en: {
    eyebrow: 'Global IaaS · PaaS Operations',
    title: 'Order Management · Billing',
    subtitle: 'Guided flow to convert orders into invoices with full traceability.',
    status: 'ERP Connected',
    sectionTitle: 'Multi-step form',
    sectionSubtitle: 'Complete the required data to issue the invoice.',
    step1Title: 'Select Order',
    step1Desc: 'Filter and select the pending order to invoice.',
    step2Title: 'Create Invoice',
    step2Desc: 'Confirm order details and configure the invoice.',
    step3Title: 'Delivery Data',
    step3Desc: 'Select an existing delivery point or create a new one.',
    step4Title: 'Recipient Data',
    step4Desc: 'Configure who receives the package in Lima.',
    step5Title: 'Summary & Issue Invoice',
    step5Desc: 'Review information before issuing.',
    filterClient: 'Customer',
    filterDate: 'Date',
    filterButton: 'Search orders',
    colFecha: 'Date',
    colPedido: 'Order Code',
    colCliente: 'Customer Code',
    colProducto: 'Product',
    colSaldo: 'Balance',
    colPrecio: 'Total price',
    colCantidad: 'Quantity',
    fechaEmision: 'Issue date',
    horaEmision: 'Issue time',
    tipoDocumento: 'Document type',
    numeroDocumento: 'Document number',
    codigoBase: 'Base code',
    pedidoSeleccionado: 'Selected order',
    detallePedido: 'Order detail',
    detalleFactura: 'Invoice detail',
    totalFactura: 'Invoice total',
    existente: 'Existing',
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
    numRecibe: 'Recipient number',
    numero: 'Number',
    resPedido: 'Order Summary',
    resFactura: 'Invoice Summary',
    resEntrega: 'Delivery Summary',
    resRecibe: 'Recipient Summary',
    emitirFactura: 'Issue Invoice',
    prev: 'Previous',
    next: 'Next',
    confirmTitle: 'Confirm operation',
    confirmBody: 'Do you want to issue the invoice now?',
    cancel: 'Cancel',
    confirm: 'Confirm'
  }
};

const state = {
  pedidos: [],
  pedidoSeleccionado: null,
  detallePedido: [],
  facturaItems: [],
  bases: [],
  puntoEntrega: { tipo: 'existe', list: [], selected: null, nuevo: {} },
  numRecibe: { tipo: 'existe', list: [], selected: null, nuevo: {} },
  regionEntrega: 'PROV',
  totals: { factura: 0 },
  nextDocumento: null,
  nextOrdinalDetalle: null,
  nextPuntoEntrega: null,
  nextNumRecibe: null,
  nextPaqueteDetalle: null
};

const regex = {
  dni: /^\d{8}$/,
  texto: /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s.'-]{2,}$/,
  numero: /^\d+$/
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function getLang() {
  const lang = navigator.language ? navigator.language.slice(0, 2) : 'es';
  return i18n[lang] ? lang : 'es';
}

function applyI18n() {
  const lang = getLang();
  document.documentElement.lang = lang;
  const dict = i18n[lang];
  $$('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

function showAlert(type, message) {
  const alertZone = $('#alertZone');
  alertZone.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
}

function clearAlert() {
  $('#alertZone').innerHTML = '';
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Error de servidor');
  }
  return response.json();
}

function setLoading(isLoading) {
  $('#btnNext').disabled = isLoading;
  $('#btnPrev').disabled = isLoading;
  $('#emitirFactura').disabled = isLoading;
  if (isLoading) {
    $('#btnNext').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  } else {
    $('#btnNext').textContent = i18n[getLang()].next;
  }
}

class FormWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 5;
    this.progress = $('#wizardProgress');
    this.progressText = $('#progressText');
    this.stepPanes = $$('.step-pane');
    this.init();
  }

  init() {
    this.showStep(1);
    $('#btnPrev').addEventListener('click', () => this.prev());
    $('#btnNext').addEventListener('click', () => this.next());
  }

  getSequence() {
    if (state.regionEntrega === 'LIMA') {
      return [1, 2, 3, 4, 5];
    }
    return [1, 2, 3, 5];
  }

  showStep(step) {
    this.currentStep = step;
    this.stepPanes.forEach((pane) => {
      pane.classList.toggle('active', Number(pane.dataset.step) === step);
    });
    this.updateProgress();
    $('#btnPrev').disabled = step === 1;
    $('#btnNext').classList.toggle('d-none', step === 5);
  }

  updateProgress() {
    const sequence = this.getSequence();
    const index = sequence.indexOf(this.currentStep) + 1;
    const percentage = (index / sequence.length) * 100;
    this.progress.style.width = `${percentage}%`;
    this.progressText.textContent = `${index}/${sequence.length}`;
  }

  async next() {
    clearAlert();
    const sequence = this.getSequence();
    const index = sequence.indexOf(this.currentStep);
    if (!(await this.validateStep(this.currentStep))) {
      return;
    }
    if (index < sequence.length - 1) {
      const nextStep = sequence[index + 1];
      this.showStep(nextStep);
      await this.onEnterStep(nextStep);
    }
  }

  prev() {
    clearAlert();
    const sequence = this.getSequence();
    const index = sequence.indexOf(this.currentStep);
    if (index > 0) {
      const prevStep = sequence[index - 1];
      this.showStep(prevStep);
    }
  }

  async onEnterStep(step) {
    if (step === 2) {
      await loadFacturaData();
    }
    if (step === 3) {
      await loadEntregaData();
    }
    if (step === 4) {
      await loadRecibeData();
    }
    if (step === 5) {
      renderResumen();
    }
  }

  async validateStep(step) {
    if (step === 1) {
      if (!state.pedidoSeleccionado) {
        showAlert('warning', 'Selecciona un pedido para continuar.');
        return false;
      }
    }
    if (step === 2) {
      if (!$('#facturaBase').value) {
        showAlert('warning', 'Selecciona una base para la factura.');
        return false;
      }
      const invalid = state.facturaItems.find((item) => item.cantidad > item.maxCantidad);
      if (invalid) {
        showAlert('danger', 'La cantidad facturada no puede superar el saldo del pedido.');
        return false;
      }
    }
    if (step === 3) {
      if (state.puntoEntrega.tipo === 'existe') {
        if (!state.puntoEntrega.selected) {
          showAlert('warning', 'Selecciona un punto de entrega existente.');
          return false;
        }
      } else {
        if (!$('#ubigeoDep').value || !$('#ubigeoProv').value || !$('#ubigeoDist').value) {
          showAlert('warning', 'Completa el ubigeo para continuar.');
          return false;
        }
        if (state.regionEntrega === 'LIMA') {
          if (!$('#direccionLinea').value.trim()) {
            showAlert('warning', 'Ingresa la direccion para Lima.');
            return false;
          }
        } else {
          if (!regex.texto.test($('#entregaNombre').value.trim())) {
            showAlert('warning', 'Ingresa un nombre valido.');
            return false;
          }
          if (!regex.dni.test($('#entregaDni').value.trim())) {
            showAlert('warning', 'Ingresa un DNI valido (8 digitos).');
            return false;
          }
        }
      }
      if (state.regionEntrega !== 'LIMA') {
        this.showStep(5);
        await this.onEnterStep(5);
        return false;
      }
    }
    if (step === 4) {
      if (state.numRecibe.tipo === 'existe') {
        if (!state.numRecibe.selected) {
          showAlert('warning', 'Selecciona un numero de recibe.');
          return false;
        }
      } else {
        if (!regex.numero.test($('#recibeNumero').value.trim())) {
          showAlert('warning', 'Ingresa un numero valido.');
          return false;
        }
        if (!regex.texto.test($('#recibeNombre').value.trim())) {
          showAlert('warning', 'Ingresa un nombre valido.');
          return false;
        }
      }
    }
    return true;
  }
}

let wizard;

function renderPedidos() {
  const tbody = $('#tablaPedidos tbody');
  tbody.innerHTML = '';
  state.pedidos.forEach((pedido) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="radio" name="pedido" value="${pedido.vcodigo_pedido}" /></td>
      <td>${pedido.vfecha || ''}</td>
      <td>${pedido.vcodigo_pedido}</td>
      <td>${pedido.vcodigo_cliente}</td>
    `;
    tr.querySelector('input').addEventListener('change', () => {
      state.pedidoSeleccionado = pedido;
      $('#pedidoResumen').textContent = `${pedido.vcodigo_pedido} · ${pedido.vcodigo_cliente}`;
    });
    tbody.appendChild(tr);
  });
}

async function loadPedidos() {
  setLoading(true);
  try {
    const cliente = $('#filterCliente').value.trim();
    const fecha = $('#filterFecha').value;
    const query = new URLSearchParams();
    if (cliente) query.append('cliente', cliente);
    if (fecha) query.append('fecha', fecha);
    const data = await fetchJson(`${API_BASE}/pedidos?${query.toString()}`);
    state.pedidos = data;
    renderPedidos();
  } catch (error) {
    showAlert('danger', error.message);
  } finally {
    setLoading(false);
  }
}

async function loadFacturaData() {
  if (!state.pedidoSeleccionado) return;
  setLoading(true);
  try {
    const detalle = await fetchJson(`${API_BASE}/pedidos/${state.pedidoSeleccionado.vcodigo_pedido}/detalle`);
    state.detallePedido = detalle.map((row) => {
      const saldo = Number(row.saldo || row.vcantidad || 0);
      const total = Number(row.precio_total || row.vprecio_total || 0);
      const precioUnit = row.precio_unitario ? Number(row.precio_unitario) : saldo ? total / saldo : 0;
      return {
        codigo_producto: row.codigo_producto,
        nombre_producto: row.nombre_producto,
        saldo,
        precioUnit,
        precio_total: total
      };
    });

    state.facturaItems = state.detallePedido.map((row) => ({
      codigo_producto: row.codigo_producto,
      nombre_producto: row.nombre_producto,
      maxCantidad: row.saldo,
      cantidad: row.saldo,
      precioUnit: row.precioUnit,
      precio_total: row.precioUnit * row.saldo,
      ordinal: null
    }));

    const bases = await fetchJson(`${API_BASE}/bases`);
    state.bases = bases;
    const nextDoc = await fetchJson(`${API_BASE}/next-documento?tipo=FAC`);
    state.nextDocumento = nextDoc.next;
    const nextOrdinal = await fetchJson(`${API_BASE}/next-ordinal-detalle?tipo=FAC&numero=${state.nextDocumento}`);
    state.nextOrdinalDetalle = nextOrdinal.next;

    state.facturaItems = state.facturaItems.map((item, idx) => ({
      ...item,
      ordinal: state.nextOrdinalDetalle + idx
    }));

    const now = new Date();
    $('#facturaFecha').value = now.toISOString().slice(0, 10);
    $('#facturaHora').value = now.toTimeString().slice(0, 5);
    $('#facturaNumero').value = state.nextDocumento;

    renderDetallePedido();
    renderFactura();
    renderBases();
  } catch (error) {
    showAlert('danger', error.message);
  } finally {
    setLoading(false);
  }
}

function renderDetallePedido() {
  const tbody = $('#tablaDetallePedido tbody');
  tbody.innerHTML = '';
  state.detallePedido.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nombre_producto}</td>
      <td>${item.saldo}</td>
      <td>${formatMoney(item.precio_total)}</td>
      <td><button class="btn btn-sm btn-outline-light" data-code="${item.codigo_producto}">Eliminar</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => removeFacturaItem(item.codigo_producto));
    tbody.appendChild(tr);
  });
}

function renderFactura() {
  const tbody = $('#tablaFactura tbody');
  tbody.innerHTML = '';
  state.facturaItems.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nombre_producto}</td>
      <td><input class="form-control form-control-sm" type="number" min="0" value="${item.cantidad}" data-code="${item.codigo_producto}" /></td>
      <td>${formatMoney(item.precio_total)}</td>
      <td><button class="btn btn-sm btn-outline-light" data-code="${item.codigo_producto}">Eliminar</button></td>
    `;
    tr.querySelector('input').addEventListener('input', (event) => updateCantidad(event.target));
    tr.querySelector('button').addEventListener('click', () => removeFacturaItem(item.codigo_producto));
    tbody.appendChild(tr);
  });
  updateTotalFactura();
  updateDeleteButtons();
}

function renderBases() {
  const select = $('#facturaBase');
  select.innerHTML = '<option value="">Seleccione</option>';
  state.bases.forEach((base) => {
    const option = document.createElement('option');
    option.value = base.codigo_base || base.codigo || base.id || '';
    option.textContent = base.nombre_base || base.nombre || base.codigo_base || 'Base';
    select.appendChild(option);
  });
}

function updateCantidad(input) {
  const code = input.dataset.code;
  const item = state.facturaItems.find((row) => row.codigo_producto === code);
  if (!item) return;
  const cantidad = Number(input.value || 0);
  item.cantidad = cantidad;
  item.precio_total = item.precioUnit * cantidad;
  renderFactura();
}

function removeFacturaItem(code) {
  if (state.facturaItems.length <= 1) {
    showAlert('warning', 'No se puede eliminar la ultima linea.');
    return;
  }
  state.facturaItems = state.facturaItems.filter((item) => item.codigo_producto !== code);
  state.detallePedido = state.detallePedido.filter((item) => item.codigo_producto !== code);
  renderDetallePedido();
  renderFactura();
}

function updateTotalFactura() {
  const total = state.facturaItems.reduce((sum, item) => sum + item.precio_total, 0);
  state.totals.factura = total;
  $('#facturaTotal').textContent = formatMoney(total);
}

function updateDeleteButtons() {
  const disable = state.facturaItems.length <= 1;
  $$('#tablaFactura button').forEach((btn) => (btn.disabled = disable));
  $$('#tablaDetallePedido button').forEach((btn) => (btn.disabled = disable));
}

async function loadEntregaData() {
  if (!state.pedidoSeleccionado) return;
  setLoading(true);
  try {
    const puntos = await fetchJson(`${API_BASE}/puntos-entrega?cliente=${state.pedidoSeleccionado.vcodigo_cliente}`);
    state.puntoEntrega.list = puntos;
    renderPuntoEntrega();
    await loadUbigeo();
    const nextPunto = await fetchJson(`${API_BASE}/next-puntoentrega?cliente=${state.pedidoSeleccionado.vcodigo_cliente}`);
    state.nextPuntoEntrega = nextPunto.next;
  } catch (error) {
    showAlert('danger', error.message);
  } finally {
    setLoading(false);
  }
}

function renderPuntoEntrega() {
  const select = $('#selectPuntoEntrega');
  select.innerHTML = '';
  state.puntoEntrega.list.forEach((punto) => {
    const option = document.createElement('option');
    option.value = punto.codigo_puntoentrega || punto.codigo || '';
    option.textContent = punto.concatenarpuntoentrega || punto.descripcion || option.value;
    select.appendChild(option);
  });
  if (state.puntoEntrega.list.length > 0) {
    select.value = select.options[0].value;
    state.puntoEntrega.selected = state.puntoEntrega.list[0];
    state.regionEntrega = state.puntoEntrega.selected.region_entrega || 'PROV';
  }
  if (state.puntoEntrega.list.length === 0) {
    $('#puntoEntregaExiste').disabled = true;
    $('#puntoEntregaNuevo').checked = true;
    toggleEntregaTipo('nuevo');
  }
}

async function loadUbigeo() {
  const deps = await fetchJson(`${API_BASE}/ubigeo/departamentos`);
  const depSelect = $('#ubigeoDep');
  depSelect.innerHTML = '<option value="">Seleccione</option>';
  deps.forEach((dep) => {
    const option = document.createElement('option');
    option.value = dep.codigo_departamento || dep.codigo || dep.id || '';
    option.textContent = dep.nombre_departamento || dep.nombre || option.value;
    depSelect.appendChild(option);
  });
}

async function loadProvincias(dep) {
  const provs = await fetchJson(`${API_BASE}/ubigeo/provincias?dep=${dep}`);
  const provSelect = $('#ubigeoProv');
  provSelect.innerHTML = '<option value="">Seleccione</option>';
  provs.forEach((prov) => {
    const option = document.createElement('option');
    option.value = prov.codigo_provincia || prov.codigo || prov.id || '';
    option.textContent = prov.nombre_provincia || prov.nombre || option.value;
    provSelect.appendChild(option);
  });
}

async function loadDistritos(dep, prov) {
  const distros = await fetchJson(`${API_BASE}/ubigeo/distritos?dep=${dep}&prov=${prov}`);
  const distSelect = $('#ubigeoDist');
  distSelect.innerHTML = '<option value="">Seleccione</option>';
  distros.forEach((dist) => {
    const option = document.createElement('option');
    option.value = dist.codigo_distrito || dist.codigo || dist.id || '';
    option.textContent = dist.nombre_distrito || dist.nombre || option.value;
    distSelect.appendChild(option);
  });
}

function computeRegion() {
  const dep = $('#ubigeoDep').value;
  const prov = $('#ubigeoProv').value;
  state.regionEntrega = dep === '15' && prov === '01' ? 'LIMA' : 'PROV';
  $('#entregaLimaFields').classList.toggle('d-none', state.regionEntrega !== 'LIMA');
  $('#entregaProvFields').classList.toggle('d-none', state.regionEntrega === 'LIMA');
}

async function loadRecibeData() {
  if (!state.pedidoSeleccionado) return;
  setLoading(true);
  try {
    const recibeList = await fetchJson(`${API_BASE}/numrecibe?cliente=${state.pedidoSeleccionado.vcodigo_cliente}`);
    state.numRecibe.list = recibeList;
    renderNumRecibe();
    const nextNum = await fetchJson(`${API_BASE}/next-numrecibe?cliente=${state.pedidoSeleccionado.vcodigo_cliente}`);
    state.nextNumRecibe = nextNum.next;
    const nextPaquete = await fetchJson(`${API_BASE}/next-paquetedetalle?numero=${state.nextDocumento}`);
    state.nextPaqueteDetalle = nextPaquete.next;
  } catch (error) {
    showAlert('danger', error.message);
  } finally {
    setLoading(false);
  }
}

function renderNumRecibe() {
  const select = $('#selectNumRecibe');
  select.innerHTML = '';
  state.numRecibe.list.forEach((recibe) => {
    const option = document.createElement('option');
    option.value = recibe.ordinal_numrecibe || recibe.codigo || '';
    option.textContent = recibe.concatenarnumrecibe || recibe.nombre || option.value;
    select.appendChild(option);
  });
  if (state.numRecibe.list.length > 0) {
    select.value = select.options[0].value;
    state.numRecibe.selected = state.numRecibe.list[0];
  }
  if (state.numRecibe.list.length === 0) {
    $('#recibeExiste').disabled = true;
    $('#recibeNuevo').checked = true;
    toggleRecibeTipo('nuevo');
  }
}

function renderResumen() {
  $('#resumenPedido').innerHTML = `
    <p><strong>${state.pedidoSeleccionado.vcodigo_pedido}</strong></p>
    <p>${state.pedidoSeleccionado.vcodigo_cliente}</p>
  `;
  $('#resumenFactura').innerHTML = `
    <p>${$('#facturaTipo').value} · ${$('#facturaNumero').value}</p>
    <p>Total: ${formatMoney(state.totals.factura)}</p>
  `;
  const entregaTipo = state.puntoEntrega.tipo === 'existe' ? 'EXISTENTE' : 'NUEVO';
  $('#resumenEntrega').innerHTML = `
    <p>${entregaTipo}</p>
    <p>${getConcatenarEntrega() || '-'}</p>
  `;
  const recibeTipo = state.numRecibe.tipo === 'existe' ? 'EXISTENTE' : 'NUEVO';
  $('#resumenRecibe').innerHTML = `
    <p>${recibeTipo}</p>
    <p>${getConcatenarRecibe() || '-'}</p>
  `;
}

function getConcatenarEntrega() {
  if (state.puntoEntrega.tipo === 'existe') {
    const selected = state.puntoEntrega.list.find((item) => (item.codigo_puntoentrega || item.codigo) === $('#selectPuntoEntrega').value);
    return selected ? selected.concatenarpuntoentrega || selected.descripcion : '';
  }
  if (state.regionEntrega === 'LIMA') {
    const referencia = $('#referencia').value.trim();
    return [$('#direccionLinea').value.trim(), $('#ubigeoDist').selectedOptions[0]?.textContent, referencia].filter(Boolean).join(' | ');
  }
  return [$('#entregaNombre').value.trim(), $('#entregaDni').value.trim(), $('#entregaAgencia').value.trim(), $('#entregaObs').value.trim()].filter(Boolean).join(' | ');
}

function getConcatenarRecibe() {
  if (state.numRecibe.tipo === 'existe') {
    const selected = state.numRecibe.list.find((item) => (item.ordinal_numrecibe || item.codigo) === $('#selectNumRecibe').value);
    return selected ? selected.concatenarnumrecibe || selected.nombre : '';
  }
  return [$('#recibeNumero').value.trim(), $('#recibeNombre').value.trim()].filter(Boolean).join(' | ');
}

async function emitirFactura() {
  clearAlert();
  setLoading(true);
  try {
    const payload = buildPayload();
    await fetchJson(`${API_BASE}/emit-factura`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    showAlert('success', 'Factura emitida correctamente.');
  } catch (error) {
    showAlert('danger', error.message);
  } finally {
    setLoading(false);
  }
}

function buildPayload() {
  const fecha = $('#facturaFecha').value;
  const hora = $('#facturaHora').value;
  const fechaP = `${fecha} ${hora}:00`;
  return {
    pedido: state.pedidoSeleccionado,
    factura: {
      fecha_emision: fechaP,
      tipo_documento: 'FAC',
      numero_documento: Number($('#facturaNumero').value),
      codigo_base: $('#facturaBase').value,
      saldo: state.totals.factura
    },
    facturaDetalle: state.facturaItems,
    entrega: {
      tipo: state.puntoEntrega.tipo,
      codigo_puntoentrega: state.puntoEntrega.tipo === 'existe' ? $('#selectPuntoEntrega').value : state.nextPuntoEntrega,
      ubigeo: `${$('#ubigeoDep').value}${$('#ubigeoProv').value}${$('#ubigeoDist').value}`,
      direccion_linea: $('#direccionLinea').value.trim(),
      referencia: $('#referencia').value.trim(),
      nombre: $('#entregaNombre').value.trim(),
      dni: $('#entregaDni').value.trim(),
      agencia: $('#entregaAgencia').value.trim(),
      observaciones: $('#entregaObs').value.trim(),
      region_entrega: state.regionEntrega,
      concatenarpuntoentrega: getConcatenarEntrega()
    },
    recibe: {
      tipo: state.numRecibe.tipo,
      ordinal_numrecibe: state.numRecibe.tipo === 'existe' ? $('#selectNumRecibe').value : state.nextNumRecibe,
      numero: $('#recibeNumero').value.trim(),
      nombre: $('#recibeNombre').value.trim(),
      concatenarnumrecibe: getConcatenarRecibe()
    },
    paquetedetalle: {
      ordinal_paquetedetalle: state.nextPaqueteDetalle
    }
  };
}

function toggleEntregaTipo(value) {
  state.puntoEntrega.tipo = value;
  $('#puntoEntregaExistente').classList.toggle('d-none', value !== 'existe');
  $('#puntoEntregaNuevoForm').classList.toggle('d-none', value !== 'nuevo');
  if (value === 'existe' && state.puntoEntrega.list.length > 0) {
    const selected = state.puntoEntrega.list.find((item) => (item.codigo_puntoentrega || item.codigo) === $('#selectPuntoEntrega').value);
    state.regionEntrega = selected?.region_entrega || 'PROV';
  }
}

function toggleRecibeTipo(value) {
  state.numRecibe.tipo = value;
  $('#recibeExistente').classList.toggle('d-none', value !== 'existe');
  $('#recibeNuevoForm').classList.toggle('d-none', value !== 'nuevo');
}

function bindEvents() {
  $('#btnFiltrar').addEventListener('click', loadPedidos);
  $$('#puntoEntregaExiste, #puntoEntregaNuevo').forEach((radio) => {
    radio.addEventListener('change', (event) => toggleEntregaTipo(event.target.value));
  });
  $$('#recibeExiste, #recibeNuevo').forEach((radio) => {
    radio.addEventListener('change', (event) => toggleRecibeTipo(event.target.value));
  });
  $('#selectPuntoEntrega').addEventListener('change', (event) => {
    const selected = state.puntoEntrega.list.find((item) => (item.codigo_puntoentrega || item.codigo) === event.target.value);
    state.puntoEntrega.selected = selected || null;
    state.regionEntrega = selected?.region_entrega || 'PROV';
  });
  $('#selectNumRecibe').addEventListener('change', (event) => {
    const selected = state.numRecibe.list.find((item) => (item.ordinal_numrecibe || item.codigo) === event.target.value);
    state.numRecibe.selected = selected || null;
  });
  $('#ubigeoDep').addEventListener('change', async (event) => {
    await loadProvincias(event.target.value);
    computeRegion();
  });
  $('#ubigeoProv').addEventListener('change', async () => {
    await loadDistritos($('#ubigeoDep').value, $('#ubigeoProv').value);
    computeRegion();
  });
  $('#ubigeoDist').addEventListener('change', computeRegion);
  $('#emitirFactura').addEventListener('click', () => {
    const modal = bootstrap.Modal.getOrCreateInstance($('#confirmModal'));
    modal.show();
  });
  $('#confirmEmit').addEventListener('click', () => {
    bootstrap.Modal.getInstance($('#confirmModal')).hide();
    emitirFactura();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();
  wizard = new FormWizard();
  bindEvents();
  await loadPedidos();
});
