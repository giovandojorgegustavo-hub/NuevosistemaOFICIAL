/*
SPs DE LECTURA
vPaquetesEnCamino = Llamada SP: get_paquetes_por_estado(p_estado="en camino") (devuelve campo_visible)
Campos devueltos
codigo_paquete
fecha_actualizado
codigo_cliente
nombre_cliente
num_cliente
codigo_puntoentrega
codigo_base
ordinal_numrecibe
concatenarpuntoentrega
region_entrega
latitud
longitud
concatenarnumrecibe
Variables
vcodigo_paquete visible no editable
vfecha_actualizado visible no editable
vcodigo_cliente no visible no editable
vnombre_cliente visible no editable
vnum_cliente visible no editable
vcodigo_puntoentrega no visible no editable
vcodigo_base no visible no editable
vordinal_numrecibe no visible no editable
vconcatenarpuntoentrega visible no editable
vRegion_Entrega no visible no editable
vLatitud no visible no editable
vLongitud no visible no editable
vconcatenarnumrecibe visible no editable

vViajeDocumento = Llamada SP: get_viaje_por_documento(p_numero_documento = vcodigo_paquete) (devuelve campo_visible)
Campos devueltos
codigoviaje
nombrebase
nombre_motorizado
numero_wsp
num_llamadas
num_yape
link
observacion
fecha
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

vDetalleDocumento = Llamada SP: get_mov_contable_detalle(p_tipo_documento="FAC", p_numero_documento = vcodigo_paquete) (devuelve campo_visible)
Campos devueltos
tipo_documento
numero_documento
ordinal
codigo_producto
nombre_producto
cantidad
saldo
precio_total
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
    title: 'Packages in transit',
    subtitle: 'Global IaaS & PaaS Operations',
    wizardTitle: 'Manage in-transit packages',
    wizardHint: 'Select packages, review details, and confirm the new status.',
    step1Title: 'Select packages in transit',
    step1Hint: 'Choose one or more packages to update their status.',
    step2Title: 'Package detail',
    step2Products: 'Products in invoice',
    step3Title: 'Confirm and save',
    refresh: 'Refresh',
    next: 'Next',
    prev: 'Back',
    confirm: 'Confirm and save',
    confirmTitle: 'Confirm operation',
    confirmBody: 'Do you want to save the new status for the selected packages?',
    cancel: 'Cancel',
    viewLogs: 'View SQL logs',
    logsTitle: 'SQL logs',
    selectionNone: 'No selection',
    bulkAction: 'Bulk action',
    colCodigo: 'Code',
    colFecha: 'Updated',
    colCliente: 'Client',
    colNumero: 'Client number',
    colEntrega: 'Delivery point',
    colRecibe: 'Receiver',
    colProducto: 'Product',
    colCantidad: 'Quantity',
    labelEntrega: 'Delivery point',
    labelRecibe: 'Receiver',
    labelBase: 'Base',
    labelMotorizado: 'Courier',
    labelWhatsapp: 'WhatsApp',
    labelLlamadas: 'Calls',
    labelYape: 'Yape',
    labelFecha: 'Date',
    labelObs: 'Observation',
    labelLink: 'Trip link',
    labelMapa: 'Address and map',
    noMap: 'Map only available for Lima deliveries.',
    labelEstado: 'New status',
    estadoHint: 'Only authorized status values are accepted.',
    loading: 'Processing...',
    errorSelection: 'Select at least one package to continue.',
    confirmRequired: 'You must confirm that the data is correct.',
    errorEstado: 'State must be: robado, standby, or llegado.',
    saveOk: 'Status updated successfully.',
    saveFail: 'We could not save changes. Try again.'
  },
  es: {
    title: 'Paquetes en camino',
    subtitle: 'Operaciones Globales IaaS & PaaS',
    wizardTitle: 'Gestionar paquetes en camino',
    wizardHint: 'Selecciona paquetes, valida detalle y confirma el nuevo estado.',
    step1Title: 'Seleccion de paquete en camino',
    step1Hint: 'Elige uno o varios paquetes para actualizar su estado.',
    step2Title: 'Detalle del paquete',
    step2Products: 'Productos en factura',
    step3Title: 'Confirmar y guardar',
    refresh: 'Actualizar',
    next: 'Siguiente',
    prev: 'Anterior',
    confirm: 'Confirmar y guardar',
    confirmTitle: 'Confirmar operacion',
    confirmBody: '¿Deseas guardar el nuevo estado para los paquetes seleccionados?',
    cancel: 'Cancelar',
    viewLogs: 'Ver logs SQL',
    logsTitle: 'Logs SQL',
    selectionNone: 'Sin seleccion',
    bulkAction: 'Accion masiva',
    colCodigo: 'Codigo',
    colFecha: 'Actualizado',
    colCliente: 'Cliente',
    colNumero: 'Numero',
    colEntrega: 'Punto entrega',
    colRecibe: 'Recibe',
    colProducto: 'Producto',
    colCantidad: 'Cantidad',
    labelEntrega: 'Punto entrega',
    labelRecibe: 'Recibe',
    labelBase: 'Base',
    labelMotorizado: 'Motorizado',
    labelWhatsapp: 'WhatsApp',
    labelLlamadas: 'Llamadas',
    labelYape: 'Yape',
    labelFecha: 'Fecha',
    labelObs: 'Observacion',
    labelLink: 'Link de viaje',
    labelMapa: 'Direccion y mapa',
    noMap: 'Mapa solo disponible para entregas en Lima.',
    labelEstado: 'Nuevo estado',
    estadoHint: 'Solo se aceptan los estados autorizados.',
    loading: 'Procesando...',
    errorSelection: 'Selecciona al menos un paquete para continuar.',
    confirmRequired: 'Debes confirmar que los datos son correctos.',
    errorEstado: 'El estado debe ser: robado, standby o llegado.',
    saveOk: 'Estado actualizado correctamente.',
    saveFail: 'No pudimos guardar los cambios. Intenta de nuevo.'
  }
};

const selectionLabels = {
  en: (count) => `${count} ${count === 1 ? 'package' : 'packages'} selected`,
  es: (count) => `${count} ${count === 1 ? 'paquete' : 'paquetes'} seleccionado(s)`
};

const state = {
  lang: 'es',
  paquetes: [],
  selected: [],
  viaje: null,
  detalle: [],
  config: null,
  mapLoaded: false
};

const elements = {
  wizardForm: document.getElementById('wizardForm'),
  steps: document.querySelectorAll('.wizard-step'),
  progressBar: document.getElementById('progressBar'),
  stepIndicators: document.getElementById('stepIndicators'),
  errorAlert: document.getElementById('errorAlert'),
  successAlert: document.getElementById('successAlert'),
  packagesTable: document.getElementById('packagesTable').querySelector('tbody'),
  detalleTable: document.getElementById('detalleTable').querySelector('tbody'),
  selectionCount: document.getElementById('selectionCount'),
  refreshBtn: document.getElementById('refreshBtn'),
  nextBtn: document.getElementById('nextBtn'),
  bulkBtn: document.getElementById('bulkBtn'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn2: document.getElementById('nextBtn2'),
  prevBtn2: document.getElementById('prevBtn2'),
  confirmBtn: document.getElementById('confirmBtn'),
  confirmCheck: document.getElementById('confirmCheck'),
  estadoInput: document.getElementById('estadoInput'),
  summaryGrid: document.getElementById('summaryGrid'),
  detalleEntrega: document.getElementById('detalleEntrega'),
  detalleRecibe: document.getElementById('detalleRecibe'),
  detalleBase: document.getElementById('detalleBase'),
  detalleMotorizado: document.getElementById('detalleMotorizado'),
  detalleWsp: document.getElementById('detalleWsp'),
  detalleLlamadas: document.getElementById('detalleLlamadas'),
  detalleYape: document.getElementById('detalleYape'),
  detalleFecha: document.getElementById('detalleFecha'),
  detalleObs: document.getElementById('detalleObs'),
  detalleLink: document.getElementById('detalleLink'),
  mapSection: document.getElementById('mapSection'),
  mapBox: document.getElementById('map'),
  noMap: document.getElementById('noMap'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  logsBtn: document.getElementById('logsBtn'),
  logsContent: document.getElementById('logsContent')
};

class FormWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
  }

  showStep(step) {
    this.currentStep = step;
    elements.steps.forEach((section) => {
      const sectionStep = Number(section.dataset.step);
      section.classList.toggle('d-none', sectionStep !== step);
    });
    const progress = (step / this.totalSteps) * 100;
    elements.progressBar.style.width = `${progress}%`;
    document.querySelectorAll('.step').forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.toggle('active', s <= step);
    });
  }

  reset() {
    this.showStep(1);
  }
}

const wizard = new FormWizard();

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
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) {
      el.textContent = t(key);
    }
  });
}

function setError(message) {
  elements.errorAlert.textContent = message;
  elements.errorAlert.classList.remove('d-none');
}

function clearError() {
  elements.errorAlert.classList.add('d-none');
}

function setSuccess(message) {
  elements.successAlert.textContent = message;
  elements.successAlert.classList.remove('d-none');
}

function clearSuccess() {
  elements.successAlert.classList.add('d-none');
}

function setLoading(isLoading) {
  elements.loadingOverlay.classList.toggle('d-none', !isLoading);
}

function mapPaqueteRow(row) {
  return {
    vcodigo_paquete: row.codigo_paquete,
    vfecha_actualizado: row.fecha_actualizado,
    vcodigo_cliente: row.codigo_cliente,
    vnombre_cliente: row.nombre_cliente,
    vnum_cliente: row.num_cliente,
    vcodigo_puntoentrega: row.codigo_puntoentrega,
    vcodigo_base: row.codigo_base,
    vordinal_numrecibe: row.ordinal_numrecibe,
    vconcatenarpuntoentrega: row.concatenarpuntoentrega,
    vRegion_Entrega: row.region_entrega,
    vLatitud: row.latitud,
    vLongitud: row.longitud,
    vconcatenarnumrecibe: row.concatenarnumrecibe
  };
}

function mapViajeRow(row) {
  return row
    ? {
        vcodigoviaje: row.codigoviaje,
        vnombrebase: row.nombrebase,
        vnombre_motorizado: row.nombre_motorizado,
        vnumero_wsp: row.numero_wsp,
        vnum_llamadas: row.num_llamadas,
        vnum_yape: row.num_yape,
        vlink: row.link,
        vobservacion: row.observacion,
        vfecha: row.fecha
      }
    : null;
}

function mapDetalleRow(row) {
  return {
    vtipo_documento: row.tipo_documento,
    vnumero_documento: row.numero_documento,
    vordinal: row.ordinal,
    vcodigo_producto: row.codigo_producto,
    vnombre_producto: row.nombre_producto,
    vcantidad: row.cantidad,
    vsaldo: row.saldo,
    vprecio_total: row.precio_total
  };
}

async function apiFetch(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'SERVER_ERROR');
  }
  return response.json();
}

async function loadConfig() {
  state.config = await apiFetch('/api/config');
}

async function loadPaquetes() {
  clearError();
  setLoading(true);
  try {
    const data = await apiFetch('/api/paquetes?estado=en%20camino');
    state.paquetes = data.rows.map(mapPaqueteRow);
    renderPaquetes();
  } catch (error) {
    console.error(error);
    setError(t('saveFail'));
  } finally {
    setLoading(false);
  }
}

function renderPaquetes() {
  elements.packagesTable.innerHTML = '';
  state.selected = [];
  updateSelectionState();

  if (!state.paquetes.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="7" class="text-center muted">-</td>`;
    elements.packagesTable.appendChild(row);
    return;
  }

  state.paquetes.forEach((pkg) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input class="form-check-input" type="checkbox" data-code="${pkg.vcodigo_paquete}" /></td>
      <td>${pkg.vcodigo_paquete ?? ''}</td>
      <td>${pkg.vfecha_actualizado ?? ''}</td>
      <td>${pkg.vnombre_cliente ?? ''}</td>
      <td>${pkg.vnum_cliente ?? ''}</td>
      <td>${pkg.vconcatenarpuntoentrega ?? ''}</td>
      <td>${pkg.vconcatenarnumrecibe ?? ''}</td>
    `;
    row.querySelector('input').addEventListener('change', (event) => {
      handleSelection(pkg, event.target.checked);
    });
    elements.packagesTable.appendChild(row);
  });
}

function handleSelection(pkg, checked) {
  if (checked) {
    state.selected.push(pkg);
  } else {
    state.selected = state.selected.filter((item) => item.vcodigo_paquete !== pkg.vcodigo_paquete);
  }
  updateSelectionState();
}

function updateSelectionState() {
  const count = state.selected.length;
  elements.selectionCount.textContent = count ? selectionLabels[state.lang](count) : t('selectionNone');
  elements.bulkBtn.disabled = count <= 1;
  elements.nextBtn.disabled = count !== 1;
  elements.nextBtn.classList.toggle('disabled', count !== 1);
}

async function loadDetalleForSelection() {
  const pkg = state.selected[0];
  if (!pkg) {
    return;
  }
  setLoading(true);
  clearError();
  try {
    const [viajeData, detalleData] = await Promise.all([
      apiFetch(`/api/viaje/${encodeURIComponent(pkg.vcodigo_paquete)}`),
      apiFetch(`/api/detalle/${encodeURIComponent(pkg.vcodigo_paquete)}`)
    ]);
    state.viaje = mapViajeRow(viajeData.row);
    state.detalle = detalleData.rows.map(mapDetalleRow);
    renderDetalle(pkg);
  } catch (error) {
    console.error(error);
    setError(t('saveFail'));
  } finally {
    setLoading(false);
  }
}

function renderDetalle(pkg) {
  elements.detalleEntrega.textContent = pkg.vconcatenarpuntoentrega || '-';
  elements.detalleRecibe.textContent = pkg.vconcatenarnumrecibe || '-';
  elements.detalleBase.textContent = state.viaje?.vnombrebase || '-';
  elements.detalleMotorizado.textContent = state.viaje?.vnombre_motorizado || '-';
  elements.detalleWsp.textContent = state.viaje?.vnumero_wsp || '-';
  elements.detalleLlamadas.textContent = state.viaje?.vnum_llamadas || '-';
  elements.detalleYape.textContent = state.viaje?.vnum_yape || '-';
  elements.detalleFecha.textContent = state.viaje?.vfecha || '-';
  elements.detalleObs.textContent = state.viaje?.vobservacion || '-';

  if (state.viaje?.vlink) {
    elements.detalleLink.textContent = state.viaje.vlink;
    elements.detalleLink.href = state.viaje.vlink;
  } else {
    elements.detalleLink.textContent = '-';
    elements.detalleLink.removeAttribute('href');
  }

  elements.detalleTable.innerHTML = '';
  if (!state.detalle.length) {
    const row = document.createElement('tr');
    row.innerHTML = `<td colspan="2" class="text-center muted">-</td>`;
    elements.detalleTable.appendChild(row);
  } else {
    state.detalle.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${item.vnombre_producto ?? ''}</td><td>${item.vcantidad ?? ''}</td>`;
      elements.detalleTable.appendChild(row);
    });
  }

  const region = String(pkg.vRegion_Entrega || '').toUpperCase();
  if (region === 'LIMA') {
    elements.mapSection.classList.remove('d-none');
    elements.noMap.classList.add('d-none');
    loadMap(pkg);
  } else {
    elements.mapSection.classList.add('d-none');
    elements.noMap.classList.remove('d-none');
  }
}

async function loadMap(pkg) {
  if (!state.config) {
    await loadConfig();
  }
  const lat = Number(pkg.vLatitud) || state.config.google_maps.default_center.lat;
  const lng = Number(pkg.vLongitud) || state.config.google_maps.default_center.lng;
  const zoom = Number(state.config.google_maps.default_zoom || 12);

  const initMap = () => {
    const map = new window.google.maps.Map(elements.mapBox, {
      center: { lat, lng },
      zoom,
      disableDefaultUI: true,
      draggable: true,
      zoomControl: true,
      scrollwheel: true
    });
    new window.google.maps.Marker({
      position: { lat, lng },
      map,
      title: String(pkg.vcodigo_paquete || '')
    });
  };

  if (state.mapLoaded && window.google?.maps) {
    initMap();
    return;
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${state.config.google_maps.api_key}`;
    script.async = true;
    script.onload = () => {
      state.mapLoaded = true;
      initMap();
      resolve();
    };
    document.body.appendChild(script);
  });
}

function renderSummary() {
  elements.summaryGrid.innerHTML = '';
  if (!state.selected.length) {
    return;
  }
  state.selected.forEach((pkg) => {
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div><strong>${pkg.vcodigo_paquete}</strong></div>
      <div class="muted">${pkg.vnombre_cliente ?? ''} · ${pkg.vconcatenarpuntoentrega ?? ''}</div>
      <div class="muted">${pkg.vconcatenarnumrecibe ?? ''}</div>
      ${state.viaje && state.selected.length === 1 ? `<div class="muted">${state.viaje.vlink ?? ''}</div>` : ''}
    `;
    elements.summaryGrid.appendChild(card);
  });
}

async function handleNextFromStep1() {
  clearError();
  if (!state.selected.length) {
    setError(t('errorSelection'));
    return;
  }
  if (state.selected.length > 1) {
    renderSummary();
    wizard.showStep(3);
    return;
  }
  await loadDetalleForSelection();
  renderSummary();
  wizard.showStep(2);
}

function handleBulkAction() {
  clearError();
  if (state.selected.length <= 1) {
    setError(t('errorSelection'));
    return;
  }
  renderSummary();
  wizard.showStep(3);
}

function handleBack() {
  wizard.showStep(1);
}

function handleBackFromStep3() {
  if (state.selected.length > 1) {
    wizard.showStep(1);
  } else {
    wizard.showStep(2);
  }
}

function validateEstado() {
  const value = elements.estadoInput.value.trim().toLowerCase();
  const regex = /^(robado|standby|llegado)$/i;
  if (!regex.test(value)) {
    return null;
  }
  return value;
}

async function confirmSave() {
  clearError();
  clearSuccess();
  if (!elements.confirmCheck.checked) {
    setError(t('confirmRequired'));
    return;
  }
  const estado = validateEstado();
  if (!estado) {
    setError(t('errorEstado'));
    return;
  }
  setLoading(true);
  try {
    await apiFetch('/api/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado,
        paquetes: state.selected.map((pkg) => pkg.vcodigo_paquete)
      })
    });
    setSuccess(t('saveOk'));
    resetWizard();
  } catch (error) {
    console.error(error);
    setError(t('saveFail'));
  } finally {
    setLoading(false);
  }
}

function resetWizard() {
  elements.estadoInput.value = '';
  elements.confirmCheck.checked = false;
  elements.confirmBtn.disabled = true;
  state.selected = [];
  state.viaje = null;
  state.detalle = [];
  wizard.reset();
  loadPaquetes();
}

async function openLogs() {
  try {
    const data = await apiFetch('/api/logs');
    elements.logsContent.textContent = data.content || '';
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('logsModal'));
    modal.show();
  } catch (error) {
    console.error(error);
  }
}

function bindEvents() {
  elements.refreshBtn.addEventListener('click', loadPaquetes);
  elements.nextBtn.addEventListener('click', handleNextFromStep1);
  elements.bulkBtn.addEventListener('click', handleBulkAction);
  elements.prevBtn.addEventListener('click', handleBack);
  elements.nextBtn2.addEventListener('click', () => {
    renderSummary();
    wizard.showStep(3);
  });
  elements.prevBtn2.addEventListener('click', handleBackFromStep3);
  elements.confirmCheck.addEventListener('change', () => {
    elements.confirmBtn.disabled = !elements.confirmCheck.checked;
  });
  elements.confirmBtn.addEventListener('click', confirmSave);
  elements.logsBtn.addEventListener('click', openLogs);
}

async function init() {
  state.lang = detectLanguage();
  applyTranslations();
  wizard.showStep(1);
  bindEvents();
  await loadPaquetes();
}

init();
