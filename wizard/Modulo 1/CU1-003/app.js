const i18n = {
  en: {
    title: 'Packages in transit',
    subtitle: 'Global IaaS & PaaS Operations',
    wizardTitle: 'Manage in-transit packages',
    wizardHint: 'Type a package number, review details, and confirm the new status.',
    step1Title: 'Search package by document',
    step1Hint: 'Enter document type and package number to load the detail.',
    step1Hint2: 'Search loads trip, products, and map when available.',
    docTypeLabel: 'Document type',
    packageCodeLabel: 'Package number',
    search: 'Search package',
    step2Title: 'Package detail',
    step2Products: 'Products in invoice',
    step3Title: 'Confirm and save',
    step3TitleDevuelto: 'Confirm and cancel invoice',
    next: 'Next',
    prev: 'Back',
    confirm: 'Confirm and save',
    confirmDevuelto: 'Confirm and cancel',
    viewLogs: 'View SQL logs',
    logsTitle: 'SQL logs',
    colProducto: 'Product',
    colCantidad: 'Quantity',
    labelEntrega: 'Delivery point',
    labelRecibe: 'Receiver',
    labelBase: 'Base',
    labelPacking: 'Packing',
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
    estadoHint: 'Only authorized status values are accepted: robado, standby, llegado, devuelto.',
    loading: 'Processing...',
    errorSelection: 'Enter a valid package number to continue.',
    packageNotFound: 'Package not found for selected status.',
    confirmRequired: 'You must confirm that the data is correct.',
    errorEstado: 'State must be: robado, standby, llegado, or devuelto.',
    saveOk: 'Status updated successfully.',
    saveOkDevuelto: 'Return processed and invoice canceled successfully.',
    saveFail: 'We could not save changes. Try again.',
    devueltoWarning:
      'When status is devuelto, the invoice is canceled (no new mov_contable/mov_contable_detalle records are created).',
    devueltoLoading: 'Loading invoice summary for cancellation...',
    devueltoError: 'We could not load the invoice summary for cancellation.'
  },
  es: {
    title: 'Paquetes en camino',
    subtitle: 'Operaciones Globales IaaS & PaaS',
    wizardTitle: 'Gestionar paquetes en camino',
    wizardHint: 'Ingresa un numero de paquete, valida detalle y confirma el nuevo estado.',
    step1Title: 'Buscar paquete por documento',
    step1Hint: 'Ingresa tipo documento y numero de paquete para cargar el detalle.',
    step1Hint2: 'Al buscar se cargan viaje, productos y mapa si aplica.',
    docTypeLabel: 'Tipo documento',
    packageCodeLabel: 'Numero paquete',
    search: 'Buscar paquete',
    step2Title: 'Detalle del paquete',
    step2Products: 'Productos en factura',
    step3Title: 'Confirmar y guardar',
    step3TitleDevuelto: 'Confirmar y anular factura',
    next: 'Siguiente',
    prev: 'Anterior',
    confirm: 'Confirmar y guardar',
    confirmDevuelto: 'Confirmar y anular',
    viewLogs: 'Ver logs SQL',
    logsTitle: 'Logs SQL',
    colProducto: 'Producto',
    colCantidad: 'Cantidad',
    labelEntrega: 'Punto entrega',
    labelRecibe: 'Recibe',
    labelBase: 'Base',
    labelPacking: 'Packing',
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
    estadoHint: 'Solo se aceptan estados autorizados: robado, standby, llegado, devuelto.',
    loading: 'Procesando...',
    errorSelection: 'Ingresa un numero de paquete valido para continuar.',
    packageNotFound: 'No se encontro el paquete para el estado seleccionado.',
    confirmRequired: 'Debes confirmar que los datos son correctos.',
    errorEstado: 'El estado debe ser: robado, standby, llegado o devuelto.',
    saveOk: 'Estado actualizado correctamente.',
    saveOkDevuelto: 'Devolucion procesada y factura anulada correctamente.',
    saveFail: 'No pudimos guardar los cambios. Intenta de nuevo.',
    devueltoWarning:
      'Si el estado es devuelto, se anula la factura (sin crear registros nuevos en mov_contable/mov_contable_detalle).',
    devueltoLoading: 'Cargando resumen de factura para anulacion...',
    devueltoError: 'No se pudo cargar el resumen de factura para anulacion.'
  }
};

const state = {
  lang: 'es',
  selected: null,
  viaje: null,
  detalle: [],
  config: null,
  mapLoaded: false,
  devueltoPreview: {
    loading: false,
    error: '',
    cabecera: null,
    detalle: []
  }
};

const elements = {
  steps: document.querySelectorAll('.wizard-step'),
  progressBar: document.getElementById('progressBar'),
  errorAlert: document.getElementById('errorAlert'),
  successAlert: document.getElementById('successAlert'),
  tipoDocumentoInput: document.getElementById('tipoDocumentoInput'),
  codigoPaqueteInput: document.getElementById('codigoPaqueteInput'),
  searchBtn: document.getElementById('searchBtn'),
  detalleTable: document.getElementById('detalleTable').querySelector('tbody'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn2: document.getElementById('nextBtn2'),
  prevBtn2: document.getElementById('prevBtn2'),
  confirmBtn: document.getElementById('confirmBtn'),
  confirmCheck: document.getElementById('confirmCheck'),
  estadoInput: document.getElementById('estadoInput'),
  step3Title: document.getElementById('step3Title'),
  devueltoNotice: document.getElementById('devueltoNotice'),
  summaryGrid: document.getElementById('summaryGrid'),
  detalleEntrega: document.getElementById('detalleEntrega'),
  detalleRecibe: document.getElementById('detalleRecibe'),
  detalleBase: document.getElementById('detalleBase'),
  detallePacking: document.getElementById('detallePacking'),
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

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '-';
  }
  return new Intl.NumberFormat(state.lang === 'es' ? 'es-PE' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function getEstadoInputValue() {
  return String(elements.estadoInput.value || '').trim().toLowerCase();
}

function mapPaqueteRow(row) {
  return {
    vcodigo_paquete: row.codigo_paquete,
    vfecha_actualizado: formatDateTime(row.fecha_actualizado),
    vcodigo_cliente: row.codigo_cliente,
    vnombre_cliente: row.nombre_cliente,
    vnum_cliente: row.num_cliente,
    vcodigo_puntoentrega: row.codigo_puntoentrega,
    vcodigo_base: row.codigo_base,
    vnombre_base: row.nombre_base,
    vcodigo_packing: row.codigo_packing,
    vnombre_packing: row.nombre_packing,
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
  state.config = await apiFetch('./api/config');
}

function getSearchPayload() {
  const tipoDocumento = String(elements.tipoDocumentoInput.value || 'FAC').trim().toUpperCase();
  const codigo = String(elements.codigoPaqueteInput.value || '').trim();
  if (!/^[0-9]+$/.test(codigo)) {
    return null;
  }
  return { tipoDocumento, codigo };
}

async function buscarPaquete() {
  clearError();
  const payload = getSearchPayload();
  if (!payload) {
    setError(t('errorSelection'));
    return false;
  }

  setLoading(true);
  try {
    const params = new URLSearchParams({
      estado: 'en camino',
      tipo_documento: payload.tipoDocumento,
      codigo_paquete: payload.codigo
    });
    const data = await apiFetch(`./api/paquete?${params.toString()}`);
    if (!data?.row) {
      setError(t('packageNotFound'));
      return false;
    }

    state.selected = mapPaqueteRow(data.row);
    await loadDetalleForSelection();
    wizard.showStep(2);
    return true;
  } catch (error) {
    console.error(error);
    setError(t('saveFail'));
    return false;
  } finally {
    setLoading(false);
  }
}

async function loadDetalleForSelection() {
  const pkg = state.selected;
  if (!pkg) {
    return;
  }

  setLoading(true);
  clearError();
  try {
    const [viajeData, detalleData] = await Promise.all([
      apiFetch(`./api/viaje/${encodeURIComponent(pkg.vcodigo_paquete)}`),
      apiFetch(`./api/detalle/${encodeURIComponent(pkg.vcodigo_paquete)}`)
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
  elements.detallePacking.textContent = pkg.vnombre_packing || pkg.vcodigo_packing || '-';
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
    row.innerHTML = '<td colspan="2" class="text-center muted">-</td>';
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

  await new Promise((resolve) => {
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
  if (!state.selected) {
    return;
  }

  const pkg = state.selected;
  const selectedEstado = getEstadoInputValue();

  if (selectedEstado === 'devuelto') {
    if (state.devueltoPreview.loading) {
      const loading = document.createElement('div');
      loading.className = 'muted';
      loading.textContent = t('devueltoLoading');
      elements.summaryGrid.appendChild(loading);
      return;
    }

    if (state.devueltoPreview.error) {
      const error = document.createElement('div');
      error.className = 'text-danger';
      error.textContent = state.devueltoPreview.error;
      elements.summaryGrid.appendChild(error);
      return;
    }

    const cabecera = state.devueltoPreview.cabecera || {};
    const detalle = Array.isArray(state.devueltoPreview.detalle) ? state.devueltoPreview.detalle : [];
    const fallbackTotal = detalle.reduce((sum, row) => sum + (Number(row.precio_total) || 0), 0);
    const totalFactura = Number(cabecera.monto || 0) || fallbackTotal;

    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div><strong>FAC-${pkg.vcodigo_paquete}</strong></div>
      <div class="muted">Cliente: ${cabecera.codigo_cliente ?? pkg.vcodigo_cliente ?? '-'}</div>
      <div class="muted">Base: ${cabecera.codigo_base ?? pkg.vcodigo_base ?? '-'}</div>
      <div class="muted">Fecha emision: ${formatDateTime(cabecera.fecha_emision)}</div>
      <div class="muted">Monto: ${formatAmount(totalFactura)}</div>
      <div class="muted">Estado factura: ${cabecera.estado ?? '-'}</div>
    `;

    const detailTitle = document.createElement('div');
    detailTitle.className = 'mt-2';
    detailTitle.innerHTML = '<strong>Detalle:</strong>';
    card.appendChild(detailTitle);

    if (!detalle.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = '-';
      card.appendChild(empty);
    } else {
      const list = document.createElement('ul');
      list.className = 'mb-0 ps-3';
      detalle.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = `${item.nombre_producto || item.codigo_producto || '-'} x ${item.cantidad || 0}`;
        list.appendChild(li);
      });
      card.appendChild(list);
    }

    elements.summaryGrid.appendChild(card);
    return;
  }

  const card = document.createElement('div');
  card.className = 'summary-card';
  card.innerHTML = `
    <div><strong>${pkg.vcodigo_paquete}</strong></div>
    <div class="muted">${pkg.vnombre_cliente ?? ''} · ${pkg.vconcatenarpuntoentrega ?? ''}</div>
    <div class="muted">${pkg.vconcatenarnumrecibe ?? ''}</div>
    ${state.viaje ? `<div class="muted">${state.viaje.vlink ?? ''}</div>` : ''}
  `;
  elements.summaryGrid.appendChild(card);
}

async function loadDevueltoPreview() {
  if (!state.selected) {
    return;
  }

  state.devueltoPreview.loading = true;
  state.devueltoPreview.error = '';
  renderSummary();

  try {
    const codigo = String(state.selected.vcodigo_paquete);
    const response = await apiFetch(`./api/factura-resumen/${encodeURIComponent(codigo)}`);
    state.devueltoPreview.cabecera = response.cabecera || null;
    state.devueltoPreview.detalle = Array.isArray(response.detalle) ? response.detalle : [];
  } catch (error) {
    console.error(error);
    state.devueltoPreview.cabecera = null;
    state.devueltoPreview.detalle = [];
    state.devueltoPreview.error = t('devueltoError');
  } finally {
    state.devueltoPreview.loading = false;
    renderSummary();
  }
}

function updateStep3Mode() {
  const isDevuelto = getEstadoInputValue() === 'devuelto';
  elements.step3Title.textContent = isDevuelto ? t('step3TitleDevuelto') : t('step3Title');
  elements.confirmBtn.textContent = isDevuelto ? t('confirmDevuelto') : t('confirm');
  elements.devueltoNotice.classList.toggle('d-none', !isDevuelto);

  if (isDevuelto) {
    loadDevueltoPreview();
  } else {
    state.devueltoPreview.loading = false;
    state.devueltoPreview.error = '';
    state.devueltoPreview.cabecera = null;
    state.devueltoPreview.detalle = [];
    renderSummary();
  }
}

function validateEstado() {
  const value = getEstadoInputValue();
  const regex = /^(robado|standby|llegado|devuelto)$/i;
  if (!regex.test(value)) {
    return null;
  }
  return value;
}

async function confirmSave() {
  clearError();
  clearSuccess();

  if (!state.selected) {
    setError(t('errorSelection'));
    return;
  }

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
    await apiFetch('./api/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado,
        paquetes: [state.selected.vcodigo_paquete]
      })
    });

    setSuccess(estado === 'devuelto' ? t('saveOkDevuelto') : t('saveOk'));
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
  state.selected = null;
  state.viaje = null;
  state.detalle = [];
  state.devueltoPreview = { loading: false, error: '', cabecera: null, detalle: [] };

  elements.detalleEntrega.textContent = '-';
  elements.detalleRecibe.textContent = '-';
  elements.detalleBase.textContent = '-';
  elements.detallePacking.textContent = '-';
  elements.detalleMotorizado.textContent = '-';
  elements.detalleWsp.textContent = '-';
  elements.detalleLlamadas.textContent = '-';
  elements.detalleYape.textContent = '-';
  elements.detalleFecha.textContent = '-';
  elements.detalleObs.textContent = '-';
  elements.detalleLink.textContent = '-';
  elements.detalleLink.removeAttribute('href');
  elements.detalleTable.innerHTML = '';
  elements.summaryGrid.innerHTML = '';

  updateStep3Mode();
  wizard.reset();
}

async function openLogs() {
  try {
    const data = await apiFetch('./api/logs');
    elements.logsContent.textContent = data.content || '';
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('logsModal'));
    modal.show();
  } catch (error) {
    console.error(error);
  }
}

function bindEvents() {
  elements.searchBtn.addEventListener('click', () => {
    buscarPaquete();
  });

  elements.codigoPaqueteInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      buscarPaquete();
    }
  });

  elements.prevBtn.addEventListener('click', () => {
    wizard.showStep(1);
  });

  elements.nextBtn2.addEventListener('click', () => {
    if (!state.selected) {
      setError(t('errorSelection'));
      return;
    }
    wizard.showStep(3);
    renderSummary();
    updateStep3Mode();
  });

  elements.prevBtn2.addEventListener('click', () => {
    wizard.showStep(2);
  });

  elements.confirmCheck.addEventListener('change', () => {
    elements.confirmBtn.disabled = !elements.confirmCheck.checked;
  });

  elements.estadoInput.addEventListener('input', updateStep3Mode);
  elements.estadoInput.addEventListener('change', updateStep3Mode);
  elements.confirmBtn.addEventListener('click', confirmSave);
  elements.logsBtn.addEventListener('click', openLogs);
}

function loadFromQueryString() {
  const params = new URLSearchParams(window.location.search || '');
  const codigo = String(params.get('codigo_paquete') || params.get('numero_documento') || '').trim();
  const tipo = String(params.get('tipo_documento') || 'FAC').trim().toUpperCase();

  if (!codigo) {
    return;
  }

  elements.codigoPaqueteInput.value = codigo;
  elements.tipoDocumentoInput.value = tipo || 'FAC';
  buscarPaquete();
}

function init() {
  state.lang = detectLanguage();
  applyTranslations();
  wizard.showStep(1);
  bindEvents();
  updateStep3Mode();
  loadFromQueryString();
}

init();
