class FormWizard {
  constructor(totalSteps) {
    this.totalSteps = totalSteps;
    this.currentStep = 1;
    this.stepSections = Array.from(document.querySelectorAll('[data-step]'));
    this.progressBar = document.getElementById('progressBar');
    this.stepLabels = Array.from(document.querySelectorAll('[data-step-label]'));
  }

  goTo(step) {
    if (step < 1 || step > this.totalSteps) return;
    this.currentStep = step;
    this.stepSections.forEach((section) => {
      section.hidden = Number(section.dataset.step) !== step;
    });
    const percent = Math.round((step / this.totalSteps) * 100);
    this.progressBar.style.width = `${percent}%`;
    this.stepLabels.forEach((label) => {
      label.classList.toggle('active', Number(label.dataset.stepLabel) === step);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  next() {
    this.goTo(this.currentStep + 1);
  }

  prev() {
    this.goTo(this.currentStep - 1);
  }
}

const state = {
  paquete: null,
  movDetalles: [],
  bases: [],
  baseNueva: null,
  baseNuevaNombre: '',
  config: null,
  codigoUsuario: null
};

const alertArea = document.getElementById('alertArea');
const paquetesTableBody = document.querySelector('#paquetesTable tbody');
const movTableBody = document.querySelector('#movTable tbody');
const step1Next = document.getElementById('step1Next');
const step2Next = document.getElementById('step2Next');
const step2Prev = document.getElementById('step2Prev');
const step3Prev = document.getElementById('step3Prev');
const submitBtn = document.getElementById('submitBtn');
const submitSpinner = submitBtn.querySelector('.spinner-border');
const confirmCheck = document.getElementById('confirmCheck');
const baseSearch = document.getElementById('baseSearch');
const baseNombre = document.getElementById('baseNombre');
const baseOptions = document.getElementById('baseOptions');
const detallePunto = document.getElementById('detallePunto');
const detalleRecibe = document.getElementById('detalleRecibe');
const detalleBase = document.getElementById('detalleBase');
const detallePacking = document.getElementById('detallePacking');
const mapCard = document.getElementById('mapCard');
const summary = document.getElementById('summary');
const codigoUsuario = document.getElementById('codigoUsuario');

const wizard = new FormWizard(3);
const baseCodeRe = /^[A-Za-z0-9_-]{1,30}$/;
const userCodeRe = /^[A-Za-z0-9_-]{1,30}$/;

const i18n = {
  es: {
    eyebrow: 'Operaciones Globales IaaS & PaaS',
    title: 'Reasignar Base',
    subtitle: 'Traslada paquetes pendientes a una nueva base con trazabilidad completa.',
    status: 'En línea',
    step1: 'Seleccionar Paquete Pendiente',
    step2: 'Detalle del Documento + Nueva Base',
    step3: 'Confirmar Reasignación',
    step1_title: 'Paquetes Pendientes',
    step1_desc: 'Selecciona un paquete para continuar.',
    step2_title: 'Detalle del Documento + Nueva Base',
    step2_desc: 'Revisa la información y asigna la nueva base.',
    step3_title: 'Confirmar Reasignación',
    step3_desc: 'Verifica los datos antes de ejecutar la transacción.',
    codigo_paquete: 'Código',
    fecha_actualizado: 'Fecha',
    nombre_cliente: 'Cliente',
    num_cliente: 'Número',
    codigo_base: 'Base',
    packing: 'Packing',
    concatenarpuntoentrega: 'Punto Entrega',
    concatenarnumrecibe: 'Recibe',
    next: 'Siguiente',
    prev: 'Anterior',
    document_info: 'Documento',
    codigo_base_actual: 'Base Actual',
    map_title: 'Ubicación (solo lectura)',
    new_base: 'Nueva Base',
    codigo_base_nueva: 'Código de base',
    nombre_base: 'Nombre',
    typeahead_hint: 'Escribe para filtrar miles de registros.',
    mov_contable: 'Detalle Contable',
    nombre_producto: 'Producto',
    cantidad: 'Cantidad',
    saldo: 'Saldo',
    precio_total: 'Precio Total',
    summary: 'Resumen',
    auth: 'Autorización',
    codigo_usuario: 'Código usuario',
    user_hint: 'Requerido para el registro de auditoría.',
    user_hint_login: 'Se toma del login para el registro de auditoría.',
    confirm: 'Confirmación',
    confirm_text: 'Esta acción es transaccional. Si falla algo, no se registrará nada.',
    confirm_required: 'Debes confirmar que los datos son correctos.',
    reassign: 'Reasignar Base',
    alert_select_package: 'Selecciona un paquete para continuar.',
    alert_select_base: 'Selecciona una base distinta a la base actual.',
    alert_usuario: 'Ingresa el código de usuario.',
    loading: 'Cargando...',
    success: 'Reasignación completada. El formulario se reinició.'
  },
  en: {
    eyebrow: 'Global IaaS & PaaS Operations',
    title: 'Reassign Base',
    subtitle: 'Move pending packages to a new operational base with full auditability.',
    status: 'Online',
    step1: 'Select Pending Package',
    step2: 'Document Detail + New Base',
    step3: 'Confirm Reassignment',
    step1_title: 'Pending Packages',
    step1_desc: 'Select a package to continue.',
    step2_title: 'Document Detail + New Base',
    step2_desc: 'Review the data and assign the new base.',
    step3_title: 'Confirm Reassignment',
    step3_desc: 'Verify the data before running the transaction.',
    codigo_paquete: 'Code',
    fecha_actualizado: 'Updated',
    nombre_cliente: 'Client',
    num_cliente: 'Number',
    codigo_base: 'Base',
    packing: 'Packing',
    concatenarpuntoentrega: 'Delivery Point',
    concatenarnumrecibe: 'Recipient',
    next: 'Next',
    prev: 'Back',
    document_info: 'Document',
    codigo_base_actual: 'Current Base',
    map_title: 'Location (read-only)',
    new_base: 'New Base',
    codigo_base_nueva: 'Base code',
    nombre_base: 'Name',
    typeahead_hint: 'Type to filter thousands of records.',
    mov_contable: 'Accounting Detail',
    nombre_producto: 'Product',
    cantidad: 'Quantity',
    saldo: 'Balance',
    precio_total: 'Total price',
    summary: 'Summary',
    auth: 'Authorization',
    codigo_usuario: 'User code',
    user_hint: 'Required for audit logging.',
    user_hint_login: 'Pulled from login for audit logging.',
    confirm: 'Confirmation',
    confirm_text: 'This action is transactional. If anything fails, nothing is recorded.',
    confirm_required: 'You must confirm that the data is correct.',
    reassign: 'Reassign Base',
    alert_select_package: 'Select a package to continue.',
    alert_select_base: 'Select a base different from the current base.',
    alert_usuario: 'Enter the user code.',
    loading: 'Loading...',
    success: 'Reassignment completed. The form was reset.'
  }
};

const locale = (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';

document.documentElement.lang = locale;

document.querySelectorAll('[data-i18n]').forEach((el) => {
  const key = el.dataset.i18n;
  if (i18n[locale][key]) {
    el.textContent = i18n[locale][key];
  }
});

function getCodigoUsuarioFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get('codigo_usuario') || params.get('codigoUsuario');
  if (!value) return null;
  const trimmed = value.trim();
  if (!userCodeRe.test(trimmed)) return null;
  return trimmed;
}

function applyCodigoUsuarioFromLogin() {
  const codigo = getCodigoUsuarioFromQuery();
  if (!codigo) return;
  state.codigoUsuario = codigo;
  codigoUsuario.value = codigo;
  codigoUsuario.readOnly = true;
  const hint = document.querySelector('[data-i18n="user_hint"]');
  if (hint && i18n[locale].user_hint_login) {
    hint.textContent = i18n[locale].user_hint_login;
  }
}

function showAlert(message, type = 'danger') {
  alertArea.innerHTML = `
    <div class="alert alert-${type}" role="alert">${message}</div>
  `;
}

function clearAlert() {
  alertArea.innerHTML = '';
}

function renderPaquetes(rows) {
  paquetesTableBody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.codigo_paquete}</td>
      <td>${formatDate(row.fecha_actualizado)}</td>
      <td>${row.nombre_cliente}</td>
      <td>${row.num_cliente}</td>
      <td>${row.codigo_base}</td>
      <td>${row.nombre_packing || row.codigo_packing || ''}</td>
      <td>${row.concatenarpuntoentrega}</td>
      <td>${row.concatenarnumrecibe}</td>
    `;
    tr.addEventListener('click', () => {
      document.querySelectorAll('#paquetesTable tbody tr').forEach((r) => r.classList.remove('selected'));
      tr.classList.add('selected');
      state.paquete = row;
      step1Next.disabled = false;
      loadStep2();
      wizard.next();
    });
    paquetesTableBody.appendChild(tr);
  });
}

function renderMovDetalle(rows) {
  movTableBody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.nombre_producto}</td>
      <td>${row.cantidad}</td>
    `;
    movTableBody.appendChild(tr);
  });
}

function renderBaseOptions(filter) {
  const normalized = filter.trim().toLowerCase();
  const matches = state.bases.filter((base) => {
    return (
      base.codigo_base.toLowerCase().includes(normalized) ||
      base.nombre.toLowerCase().includes(normalized)
    );
  });

  baseOptions.innerHTML = '';
  matches.slice(0, 20).forEach((base) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action';
    item.textContent = `${base.codigo_base} - ${base.nombre}`;
    item.addEventListener('click', () => selectBase(base));
    baseOptions.appendChild(item);
  });

  baseOptions.hidden = matches.length === 0;
}

function selectBase(base) {
  state.baseNueva = base.codigo_base;
  state.baseNuevaNombre = base.nombre;
  baseSearch.value = base.codigo_base;
  baseNombre.value = base.nombre;
  baseOptions.hidden = true;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function loadPaquetes() {
  clearAlert();
  step1Next.disabled = true;
  paquetesTableBody.innerHTML = `<tr><td colspan="8">${i18n[locale].loading}</td></tr>`;
  try {
    const data = await fetchJson('/api/paquetes-pendientes');
    renderPaquetes(data.rows || []);
  } catch (err) {
    showAlert(err.message || 'Error');
  }
}

async function loadStep2() {
  if (!state.paquete) return;
  detallePunto.textContent = state.paquete.concatenarpuntoentrega || '';
  detalleRecibe.textContent = state.paquete.concatenarnumrecibe || '';
  detalleBase.textContent = state.paquete.codigo_base || '';
  detallePacking.textContent = state.paquete.nombre_packing || state.paquete.codigo_packing || '';

  state.baseNueva = null;
  state.baseNuevaNombre = '';
  baseSearch.value = '';
  baseNombre.value = '';
  baseOptions.hidden = true;

  const region = (state.paquete.region_entrega || '').toUpperCase();
  if (region === 'LIMA') {
    mapCard.hidden = false;
    await initMap();
  } else {
    mapCard.hidden = true;
  }

  movTableBody.innerHTML = `<tr><td colspan="2">${i18n[locale].loading}</td></tr>`;
  try {
    const [movData, basesData] = await Promise.all([
      fetchJson(`/api/mov-contable-detalle?tipo_documento=FAC&numero_documento=${encodeURIComponent(state.paquete.codigo_paquete)}`),
      fetchJson('/api/bases')
    ]);
    state.movDetalles = movData.rows || [];
    state.bases = basesData.rows || [];
    renderMovDetalle(state.movDetalles);
    const baseActual = state.bases.find(
      (base) => String(base.codigo_base) === String(state.paquete.codigo_base)
    );
    if (baseActual) {
      detalleBase.textContent = `${baseActual.codigo_base} - ${baseActual.nombre}`;
    }
  } catch (err) {
    showAlert(err.message || 'Error');
  }
}

async function loadConfig() {
  try {
    state.config = await fetchJson('/api/config');
  } catch (err) {
    showAlert(err.message || 'Error');
  }
}

async function initMap() {
  if (!state.config || !state.config.google_maps || !state.config.google_maps.api_key) return;
  if (window.google && window.google.maps) {
    renderMapInstance();
    return;
  }

  await new Promise((resolve, reject) => {
    window.initMap = () => {
      resolve();
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${state.config.google_maps.api_key}&callback=initMap`;
    script.async = true;
    script.onerror = reject;
    document.body.appendChild(script);
  });
  renderMapInstance();
}

function renderMapInstance() {
  const center = {
    lat: Number(state.paquete.latitud) || state.config.google_maps.default_center.lat,
    lng: Number(state.paquete.longitud) || state.config.google_maps.default_center.lng
  };

  if (!state.map) {
    state.map = new window.google.maps.Map(document.getElementById('map'), {
      center,
      zoom: state.config.google_maps.default_zoom,
      disableDefaultUI: true,
      draggable: true,
      zoomControl: true
    });
  } else {
    state.map.setCenter(center);
  }

  if (!state.mapMarker) {
    state.mapMarker = new window.google.maps.Marker({
      map: state.map,
      position: center,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeWeight: 0,
        scale: 6
      }
    });
  } else {
    state.mapMarker.setPosition(center);
  }
}

function buildSummary() {
  if (!state.paquete) return;
  summary.innerHTML = `
    <div><strong>${i18n[locale].codigo_paquete}:</strong> ${state.paquete.codigo_paquete}</div>
    <div><strong>${i18n[locale].nombre_cliente}:</strong> ${state.paquete.nombre_cliente}</div>
    <div><strong>${i18n[locale].codigo_base_actual}:</strong> ${state.paquete.codigo_base}</div>
    <div><strong>${i18n[locale].packing}:</strong> ${state.paquete.nombre_packing || state.paquete.codigo_packing || '-'}</div>
    <div><strong>${i18n[locale].codigo_base_nueva}:</strong> ${state.baseNueva || '-'}</div>
    <div><strong>${i18n[locale].nombre_base}:</strong> ${state.baseNuevaNombre || '-'}</div>
  `;
}

function validateStep2() {
  if (!state.baseNueva || state.baseNueva === state.paquete.codigo_base) {
    showAlert(i18n[locale].alert_select_base, 'warning');
    return false;
  }
  if (!baseCodeRe.test(state.baseNueva)) {
    showAlert(i18n[locale].alert_select_base, 'warning');
    return false;
  }
  return true;
}

function validateStep3() {
  const value = state.codigoUsuario || codigoUsuario.value.trim();
  if (!value || !userCodeRe.test(value)) {
    showAlert(i18n[locale].alert_usuario, 'warning');
    return false;
  }
  if (!confirmCheck.checked) {
    showAlert(i18n[locale].confirm_required, 'warning');
    return false;
  }
  return true;
}

step1Next.addEventListener('click', () => {
  if (!state.paquete) {
    showAlert(i18n[locale].alert_select_package, 'warning');
    return;
  }
  wizard.next();
});

step2Prev.addEventListener('click', () => wizard.prev());
step2Next.addEventListener('click', () => {
  if (!validateStep2()) return;
  buildSummary();
  wizard.next();
});

step3Prev.addEventListener('click', () => wizard.prev());

baseSearch.addEventListener('input', (event) => {
  renderBaseOptions(event.target.value);
});

baseSearch.addEventListener('focus', () => {
  renderBaseOptions('');
});

baseSearch.addEventListener('blur', () => {
  setTimeout(() => {
    baseOptions.hidden = true;
  }, 150);
});

baseSearch.addEventListener('change', (event) => {
  const value = event.target.value.trim().toLowerCase();
  if (!value) return;
  const match = state.bases.find(
    (base) => base.codigo_base.toLowerCase() === value || base.nombre.toLowerCase() === value
  );
  if (match) {
    selectBase(match);
  }
});

confirmCheck.addEventListener('change', () => {
  submitBtn.disabled = !confirmCheck.checked;
});

submitBtn.addEventListener('click', async () => {
  clearAlert();
  if (!validateStep2() || !validateStep3()) return;
  submitBtn.disabled = true;
  submitSpinner.hidden = false;

  try {
    const codigoUsuarioValue = state.codigoUsuario || codigoUsuario.value.trim();
    await fetchJson('/api/reasignar-base', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vtipo_documento: 'FAC',
        vcodigo_paquete: state.paquete.codigo_paquete,
        vcodigo_base: state.paquete.codigo_base,
        vCodigo_base_nueva: state.baseNueva,
        vcodigo_usuario: codigoUsuarioValue
      })
    });
    showAlert(i18n[locale].success, 'success');
    resetWizard();
  } catch (err) {
    showAlert(err.message || 'Error');
  } finally {
    submitBtn.disabled = !confirmCheck.checked;
    submitSpinner.hidden = true;
  }
});

function resetWizard() {
  state.paquete = null;
  state.baseNueva = null;
  state.baseNuevaNombre = '';
  state.movDetalles = [];
  baseSearch.value = '';
  baseNombre.value = '';
  if (state.codigoUsuario) {
    codigoUsuario.value = state.codigoUsuario;
  } else {
    codigoUsuario.value = '';
  }
  confirmCheck.checked = false;
  submitBtn.disabled = true;
  renderMovDetalle([]);
  wizard.goTo(1);
  loadPaquetes();
}

applyCodigoUsuarioFromLogin();
loadConfig().then(loadPaquetes);
