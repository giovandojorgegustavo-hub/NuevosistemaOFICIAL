/*
vPaquetesStandby = Llamada SP: get_paquetes_por_estado(p_estado="standby") (devuelve campo_visible)
Campos devueltos
vcodigo_paquete
vfecha_actualizado
vcodigo_cliente
vnombre_cliente
vnum_cliente
vcodigo_puntoentrega
vcodigo_base
vnombre_base
vordinal_numrecibe
vconcatenarpuntoentrega
vRegion_Entrega
vLatitud
vLongitud
vconcatenarnumrecibe
Variables
vcodigo_paquete visible no editable
vfecha_actualizado visible no editable
vcodigo_cliente no visible no editable
vnombre_cliente visible no editable
vnum_cliente visible no editable
vcodigo_puntoentrega no visible no editable
vcodigo_base no visible no editable
vnombre_base visible no editable
vordinal_numrecibe no visible no editable
vconcatenarpuntoentrega visible no editable
vRegion_Entrega no visible no editable
vLatitud no visible no editable
vLongitud no visible no editable
vconcatenarnumrecibe visible no editable

vViajeDocumento = Llamada SP: get_viaje_por_documento(p_numero_documento) (devuelve campo_visible)
Campos devueltos
vcodigoviaje
vnombrebase
vnombre_motorizado
vnumero_wsp
vnum_llamadas
vnum_yape
vlink
vobservacion
vfecha
Variables
vcodigoviaje no visible no editable
vnombrebase visible no editable
vnombre_motorizado visible no editable
vnumero_wsp visible no editable
vnum_llamadas visible no editable
vnum_yape visible no editable
vlink visible no editable
vobservacion visible no editable
vfecha visible no editable

vDetalleDocumento = Llamada SP: get_mov_contable_detalle(p_tipo_documento, p_numero_documento) (devuelve campo_visible)
Campos devueltos
vtipo_documento
vnumero_documento
vordinal
vcodigo_producto
vnombre_producto
vcantidad
vsaldo
vprecio_total
Variables
vtipo_documento no visible no editable
vnumero_documento no visible no editable
vordinal no visible no editable
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vcantidad visible no editable
vsaldo no visible no editable
vprecio_total no visible no editable
*/

const i18n = {
  en: {
    badge: 'IaaS & PaaS Ops',
    title: 'Manage standby packages',
    subtitle: 'Control standby packages with full client, route, and audit detail.',
    module: 'Module 1',
    viewLogs: 'View SQL logs',
    step1: '1. Selection',
    step2: '2. Detail',
    step3: '3. Confirm',
    step1Title: 'Select standby package',
    step1Hint: 'Choose a package to review its full detail.',
    step2Title: 'Package detail',
    step2Hint: 'Client, delivery, and trip data (read only).',
    step3Title: 'Confirm & save',
    step3Hint: 'Define the new state and confirm.',
    colCodigo: 'Code',
    colFecha: 'Updated',
    colCliente: 'Client',
    colNumero: 'Client number',
    colBase: 'Base',
    colPacking: 'Packing',
    colEntrega: 'Delivery point',
    colRecibe: 'Receiver',
    labelEntrega: 'Delivery point',
    labelRecibe: 'Receiver',
    labelPacking: 'Packing',
    mapTitle: 'Address and map',
    detalleGridTitle: 'Document products',
    colProducto: 'Product',
    colCantidad: 'Quantity',
    labelEstado: 'New package state',
    estadoHint: 'Only listed states are allowed.',
    prev: 'Previous',
    next: 'Next',
    reset: 'Clear',
    logsTitle: 'SQL logs',
    logsHint: 'Latest lines from the active log file.',
    refresh: 'Refresh',
    confirmTitle: 'Confirm operation',
    confirmBody: 'Do you want to save the new package state?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    confirmRequired: 'You must confirm that the data is correct.',
    successSaved: 'State updated successfully. Wizard reset.',
    errorSelection: 'Select a package to continue.',
    errorEstado: 'Select a valid state before confirming.',
    errorServer: 'We could not complete your request. Try again.'
  },
  es: {
    badge: 'Operaciones IaaS & PaaS',
    title: 'Gestionar paquetes en standby',
    subtitle: 'Controla paquetes en standby con detalle de cliente, ruta y trazabilidad.',
    module: 'Modulo 1',
    viewLogs: 'Ver logs SQL',
    step1: '1. Seleccion',
    step2: '2. Detalle',
    step3: '3. Confirmar',
    step1Title: 'Seleccion de paquete en standby',
    step1Hint: 'Selecciona un paquete para revisar su detalle completo.',
    step2Title: 'Detalle del paquete',
    step2Hint: 'Datos del cliente, entrega y viaje asociado (solo lectura).',
    step3Title: 'Confirmar y guardar',
    step3Hint: 'Define el nuevo estado y confirma la operacion.',
    colCodigo: 'Codigo',
    colFecha: 'Actualizado',
    colCliente: 'Cliente',
    colNumero: 'Numero cliente',
    colBase: 'Base',
    colPacking: 'Packing',
    colEntrega: 'Punto entrega',
    colRecibe: 'Num recibe',
    labelEntrega: 'Punto entrega',
    labelRecibe: 'Num recibe',
    labelPacking: 'Packing',
    mapTitle: 'Direccion y mapa',
    detalleGridTitle: 'Productos del documento',
    colProducto: 'Producto',
    colCantidad: 'Cantidad',
    labelEstado: 'Nuevo estado del paquete',
    estadoHint: 'Solo se permiten los estados listados.',
    prev: 'Anterior',
    next: 'Siguiente',
    reset: 'Limpiar',
    logsTitle: 'Logs SQL',
    logsHint: 'Ultimas lineas del log activo.',
    refresh: 'Actualizar',
    confirmTitle: 'Confirmar operacion',
    confirmBody: '¿Deseas guardar el nuevo estado del paquete?',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    confirmRequired: 'Debes confirmar que los datos son correctos.',
    successSaved: 'Estado actualizado. Wizard reiniciado.',
    errorSelection: 'Selecciona un paquete para continuar.',
    errorEstado: 'Selecciona un estado valido antes de confirmar.',
    errorServer: 'No pudimos completar tu solicitud. Intenta de nuevo.'
  }
};

const state = {
  step: 1,
  lang: 'en',
  paquetes: [],
  selected: null,
  viaje: null,
  detalles: [],
  mapsConfig: null,
  mapLoaded: false
};

const elements = {
  progressBar: document.getElementById('progressBar'),
  stepIndicator: document.getElementById('stepIndicator'),
  step1: document.getElementById('step1'),
  step2: document.getElementById('step2'),
  step3: document.getElementById('step3'),
  alertBox: document.getElementById('alertBox'),
  successBox: document.getElementById('successBox'),
  standbyTableBody: document.querySelector('#standbyTable tbody'),
  detalleTableBody: document.querySelector('#detalleTable tbody'),
  detalleEntrega: document.getElementById('detalleEntrega'),
  detalleRecibe: document.getElementById('detalleRecibe'),
  detallePacking: document.getElementById('detallePacking'),
  viajeInfo: document.getElementById('viajeInfo'),
  resumenInfo: document.getElementById('resumenInfo'),
  mapSection: document.getElementById('mapSection'),
  mapCanvas: document.getElementById('map'),
  estadoInput: document.getElementById('estadoInput'),
  confirmCheck: document.getElementById('confirmCheck'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  btnReset: document.getElementById('btnReset'),
  loadingStandby: document.getElementById('loadingStandby'),
  loadingDetalle: document.getElementById('loadingDetalle'),
  loadingGuardar: document.getElementById('loadingGuardar'),
  logsContent: document.getElementById('logsContent'),
  btnRefreshLogs: document.getElementById('btnRefreshLogs')
};

function detectLanguage() {
  const browserLang = navigator.language || 'en';
  return browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function t(key) {
  return i18n[state.lang][key] || i18n.en[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) {
      el.textContent = t(key);
    }
  });
}

function setAlert(message, type = 'danger') {
  elements.alertBox.textContent = message;
  elements.alertBox.className = `alert alert-${type}`;
  elements.alertBox.classList.remove('d-none');
}

function clearAlert() {
  elements.alertBox.classList.add('d-none');
  elements.alertBox.textContent = '';
}

function setSuccess(message) {
  elements.successBox.textContent = message;
  elements.successBox.className = 'alert alert-success';
  elements.successBox.classList.remove('d-none');
  setTimeout(() => elements.successBox.classList.add('d-none'), 4000);
}

function formatDateTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat(state.lang === 'es' ? 'es-PE' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function mapPaqueteRow(row) {
  return {
    codigo_paquete: row.codigo_paquete,
    fecha_actualizado: formatDateTime(row.fecha_actualizado),
    codigo_cliente: row.codigo_cliente,
    nombre_cliente: row.nombre_cliente,
    num_cliente: row.num_cliente,
    codigo_puntoentrega: row.codigo_puntoentrega,
    codigo_base: row.codigo_base,
    nombre_base: row.nombre_base ?? row.nombrebase ?? '',
    codigo_packing: row.codigo_packing,
    nombre_packing: row.nombre_packing,
    ordinal_numrecibe: row.ordinal_numrecibe,
    concatenarpuntoentrega: row.concatenarpuntoentrega,
    region_entrega: row.region_entrega,
    latitud: row.latitud,
    longitud: row.longitud,
    concatenarnumrecibe: row.concatenarnumrecibe
  };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

function updateStepUI() {
  elements.step1.classList.toggle('d-none', state.step !== 1);
  elements.step2.classList.toggle('d-none', state.step !== 2);
  elements.step3.classList.toggle('d-none', state.step !== 3);
  elements.btnPrev.disabled = state.step === 1;
  elements.btnNext.textContent = state.step === 3 ? t('confirm') : t('next');
  elements.btnNext.disabled = state.step === 3 && !elements.confirmCheck.checked;
  const progress = (state.step / 3) * 100;
  elements.progressBar.style.width = `${progress}%`;
  document.querySelectorAll('.step-pill').forEach((pill) => {
    const step = Number(pill.dataset.step);
    pill.classList.toggle('active', step === state.step);
  });
}

function selectRow(row, paquete) {
  document.querySelectorAll('#standbyTable tbody tr').forEach((tr) => tr.classList.remove('active'));
  row.classList.add('active');
  state.selected = paquete;
}

function renderStandbyTable() {
  elements.standbyTableBody.innerHTML = '';
  state.paquetes.forEach((paquete) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${paquete.codigo_paquete ?? ''}</td>
      <td>${paquete.fecha_actualizado ?? ''}</td>
      <td>${paquete.nombre_cliente ?? ''}</td>
      <td>${paquete.num_cliente ?? ''}</td>
      <td>${paquete.nombre_base ?? ''}</td>
      <td>${paquete.nombre_packing || paquete.codigo_packing || '-'}</td>
      <td>${paquete.concatenarpuntoentrega ?? ''}</td>
      <td>${paquete.concatenarnumrecibe ?? ''}</td>
    `;
    row.addEventListener('click', () => {
      selectRow(row, paquete);
      clearAlert();
      goToStep(2);
    });
    elements.standbyTableBody.appendChild(row);
  });
}

function renderViajeInfo() {
  const viaje = state.viaje;
  elements.viajeInfo.innerHTML = '';
  if (!viaje) {
    return;
  }
  const data = [
    { label: 'Base', value: viaje.nombrebase },
    { label: 'Motorizado', value: viaje.nombre_motorizado },
    { label: 'WhatsApp', value: viaje.numero_wsp },
    { label: 'Llamadas', value: viaje.num_llamadas },
    { label: 'Yape', value: viaje.num_yape },
    { label: 'Link', value: viaje.link },
    { label: 'Observacion', value: viaje.observacion },
    { label: 'Fecha', value: viaje.fecha }
  ];
  data.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'info-item';
    const label = document.createElement('span');
    label.textContent = item.label;
    const value = document.createElement('strong');
    if (item.label === 'Link' && item.value) {
      const anchor = document.createElement('a');
      anchor.href = item.value;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = item.value;
      anchor.className = 'text-info';
      value.appendChild(anchor);
    } else {
      value.textContent = item.value ?? '-';
    }
    card.appendChild(label);
    card.appendChild(value);
    elements.viajeInfo.appendChild(card);
  });
}

function renderDetalleTable() {
  elements.detalleTableBody.innerHTML = '';
  state.detalles.forEach((detalle) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${detalle.nombre_producto ?? ''}</td>
      <td>${detalle.cantidad ?? ''}</td>
    `;
    elements.detalleTableBody.appendChild(row);
  });
}

function renderResumen() {
  const paquete = state.selected;
  const viaje = state.viaje || {};
  if (!paquete) {
    elements.resumenInfo.innerHTML = '';
    return;
  }
  const data = [
    { label: 'Codigo paquete', value: paquete.codigo_paquete },
    { label: 'Cliente', value: paquete.nombre_cliente },
    { label: 'Punto entrega', value: paquete.concatenarpuntoentrega },
    { label: 'Num recibe', value: paquete.concatenarnumrecibe },
    { label: 'Packing', value: paquete.nombre_packing || paquete.codigo_packing || '-' },
    { label: 'Base', value: viaje.nombrebase },
    { label: 'Motorizado', value: viaje.nombre_motorizado },
    { label: 'Link', value: viaje.link }
  ];
  elements.resumenInfo.innerHTML = '';
  data.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'info-item';
    const label = document.createElement('span');
    label.textContent = item.label;
    const value = document.createElement('strong');
    if (item.label === 'Link' && item.value) {
      const anchor = document.createElement('a');
      anchor.href = item.value;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = item.value;
      anchor.className = 'text-info';
      value.appendChild(anchor);
    } else {
      value.textContent = item.value ?? '-';
    }
    card.appendChild(label);
    card.appendChild(value);
    elements.resumenInfo.appendChild(card);
  });
}

async function loadStandby() {
  elements.loadingStandby.classList.remove('d-none');
  try {
    const data = await fetchJson('/api/paquetes-standby');
    state.paquetes = (data.rows || []).map(mapPaqueteRow);
    renderStandbyTable();
  } catch (error) {
    setAlert(t('errorServer'));
  } finally {
    elements.loadingStandby.classList.add('d-none');
  }
}

function parseLatLng(paquete) {
  const lat = Number(paquete.latitud);
  const lng = Number(paquete.longitud);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return { lat, lng };
}

async function ensureMapsLoaded() {
  if (state.mapLoaded) {
    return;
  }
  if (!state.mapsConfig || !state.mapsConfig.apiKey) {
    return;
  }
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${state.mapsConfig.apiKey}`;
    script.async = true;
    script.onload = () => {
      state.mapLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function renderMapIfNeeded() {
  const paquete = state.selected;
  if (!paquete || paquete.region_entrega !== 'LIMA') {
    elements.mapSection.classList.add('d-none');
    return;
  }
  elements.mapSection.classList.remove('d-none');
  const position = parseLatLng(paquete);
  if (!position) {
    return;
  }
  await ensureMapsLoaded();
  if (!window.google || !window.google.maps) {
    return;
  }
  const center = state.mapsConfig?.defaultCenter || position;
  const zoom = state.mapsConfig?.defaultZoom || 12;
  const map = new window.google.maps.Map(elements.mapCanvas, {
    center,
    zoom,
    disableDefaultUI: false,
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false
  });
  new window.google.maps.Marker({
    position,
    map,
    draggable: false,
    icon: {
      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
    }
  });
}

async function loadDetalle() {
  if (!state.selected) {
    return;
  }
  elements.loadingDetalle.classList.remove('d-none');
  try {
    const codigo = state.selected.codigo_paquete;
    const [viajeRes, detalleRes, mapsRes] = await Promise.all([
      fetchJson(`/api/viaje/${codigo}`),
      fetchJson(`/api/detalle/${codigo}`),
      fetchJson('/api/maps-config')
    ]);
    state.viaje = viajeRes.viaje || null;
    state.detalles = detalleRes.rows || [];
    state.mapsConfig = mapsRes || null;
    elements.detalleEntrega.textContent = state.selected.concatenarpuntoentrega || '-';
    elements.detalleRecibe.textContent = state.selected.concatenarnumrecibe || '-';
    elements.detallePacking.textContent = state.selected.nombre_packing || state.selected.codigo_packing || '-';
    renderViajeInfo();
    renderDetalleTable();
    await renderMapIfNeeded();
  } catch (error) {
    setAlert(t('errorServer'));
  } finally {
    elements.loadingDetalle.classList.add('d-none');
  }
}

function validateStep() {
  clearAlert();
  if (state.step === 1 && !state.selected) {
    setAlert(t('errorSelection'));
    return false;
  }
  if (state.step === 3) {
    const value = String(elements.estadoInput.value || '').trim().toLowerCase();
    const regex = /^(robado|empacado|llegado)$/;
    if (!regex.test(value)) {
      setAlert(t('errorEstado'));
      return false;
    }
    if (!elements.confirmCheck.checked) {
      setAlert(t('confirmRequired'));
      return false;
    }
  }
  return true;
}

function goToStep(step) {
  state.step = step;
  updateStepUI();
  if (step === 2) {
    loadDetalle();
  }
  if (step === 3) {
    renderResumen();
  }
}

async function guardarEstado() {
  if (!validateStep()) {
    return;
  }
  const codigo = state.selected.codigo_paquete;
  const nuevoEstado = String(elements.estadoInput.value || '').trim().toLowerCase();
  elements.loadingGuardar.classList.remove('d-none');
  try {
    await fetchJson('/api/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo_paquete: codigo, nuevo_estado: nuevoEstado })
    });
    setSuccess(t('successSaved'));
    resetWizard();
    await loadStandby();
  } catch (error) {
    setAlert(t('errorServer'));
  } finally {
    elements.loadingGuardar.classList.add('d-none');
  }
}

function resetWizard() {
  state.step = 1;
  state.selected = null;
  state.viaje = null;
  state.detalles = [];
  elements.estadoInput.value = '';
  elements.confirmCheck.checked = false;
  elements.detalleEntrega.textContent = '-';
  elements.detalleRecibe.textContent = '-';
  elements.detallePacking.textContent = '-';
  elements.viajeInfo.innerHTML = '';
  elements.detalleTableBody.innerHTML = '';
  elements.resumenInfo.innerHTML = '';
  elements.mapSection.classList.add('d-none');
  document.querySelectorAll('#standbyTable tbody tr').forEach((tr) => tr.classList.remove('active'));
  updateStepUI();
}

async function loadLogs() {
  try {
    const data = await fetchJson('/api/logs');
    elements.logsContent.textContent = data.content || '';
  } catch (error) {
    elements.logsContent.textContent = t('errorServer');
  }
}

class FormWizard {
  init() {
    state.lang = detectLanguage();
    applyTranslations();
    updateStepUI();
    this.bindEvents();
    loadStandby();
    loadLogs();
  }

  bindEvents() {
    elements.btnPrev.addEventListener('click', () => {
      if (state.step > 1) {
        state.step -= 1;
        updateStepUI();
      }
    });

    elements.btnNext.addEventListener('click', () => {
      if (state.step < 3) {
        if (!validateStep()) {
          return;
        }
        goToStep(state.step + 1);
        return;
      }
      if (!validateStep()) {
        return;
      }
      guardarEstado();
    });

    elements.btnReset.addEventListener('click', () => {
      resetWizard();
    });

    elements.confirmCheck.addEventListener('change', () => {
      if (state.step === 3) {
        elements.btnNext.disabled = !elements.confirmCheck.checked;
      }
    });
    elements.btnRefreshLogs.addEventListener('click', loadLogs);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
