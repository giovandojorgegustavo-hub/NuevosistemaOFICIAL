/*
vUltima_asistencia = Llamada SP: SELECT MAX(fecha) AS ultima_asistencia FROM bitacoraBase WHERE codigo_base = vCodigo_base AND codigo_usuario = vCodigo_usuario (devuelve ultima_asistencia)
Campos devueltos
ultima_asistencia
Variables
vFecha visible no editable
vCodigo_base no visible no editable
vCodigo_usuario no visible no editable
vUltima_asistencia visible no editable
*/

class FormWizard {
  constructor(totalSteps) {
    this.totalSteps = totalSteps;
    this.currentStep = 1;
    this.stepSections = Array.from(document.querySelectorAll('[data-step]'));
    this.progressBar = document.getElementById('progressBar');
    this.stepIndicator = document.getElementById('stepIndicator');
  }

  goTo(step) {
    if (step < 1 || step > this.totalSteps) return;
    this.currentStep = step;
    this.stepSections.forEach((section) => {
      section.hidden = Number(section.dataset.step) !== step;
    });
    const percent = Math.round((step / this.totalSteps) * 100);
    this.progressBar.style.width = `${percent}%`;
    if (this.stepIndicator) {
      this.stepIndicator.textContent = `${step} / ${this.totalSteps}`;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

const state = {
  vFecha: '',
  vCodigo_base: 1,
  vCodigo_usuario: 1,
  vUltima_asistencia: null
};

const formAlert = document.getElementById('formAlert');
const formSuccess = document.getElementById('formSuccess');
const loadingOverlay = document.getElementById('loadingOverlay');
const vFechaInput = document.getElementById('vFecha');
const vCodigoBaseInput = document.getElementById('vCodigo_base');
const vCodigoUsuarioInput = document.getElementById('vCodigo_usuario');
const ultimaAsistenciaText = document.getElementById('ultimaAsistencia');
const abrirHorarioBtn = document.getElementById('abrirHorarioBtn');
const confirmCheck = document.getElementById('confirmCheck');
const logToggleBtn = document.getElementById('logToggleBtn');
const logPanel = document.getElementById('logPanel');
const logContent = document.getElementById('logContent');

const wizard = new FormWizard(1);

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const intRe = /^\d+$/;

const i18n = {
  es: {
    title: 'Abrir Horario',
    subtitle: 'Operaciones Globales IaaS & PaaS',
    status: 'En linea',
    stepTitle: '1. Abrir Horario',
    stepHint: 'Registra la asistencia y valida la ultima marca disponible.',
    fecha: 'Fecha del sistema',
    ultima: 'Ultima asistencia',
    sinRegistro: 'sin registro',
    abrirHorario: 'Abrir Horario',
    asistenciaRegistrada: 'Asistencia registrada',
    verLogs: 'Ver Logs de sentencias SQL',
    ocultarLogs: 'Ocultar Logs de sentencias SQL',
    confirmRequired: 'Debes confirmar que los datos son correctos.',
    loading: 'Procesando...',
    success: 'Horario abierto correctamente.',
    error: 'No se pudo abrir el horario. Revisa los datos.'
  },
  en: {
    title: 'Open Schedule',
    subtitle: 'Global IaaS & PaaS Operations',
    status: 'Online',
    stepTitle: '1. Open Schedule',
    stepHint: 'Registers attendance and confirms the latest mark.',
    fecha: 'System date',
    ultima: 'Last attendance',
    sinRegistro: 'no record',
    abrirHorario: 'Open Schedule',
    asistenciaRegistrada: 'Attendance recorded',
    verLogs: 'View SQL logs',
    ocultarLogs: 'Hide SQL logs',
    confirmRequired: 'You must confirm that the data is correct.',
    loading: 'Processing...',
    success: 'Schedule opened successfully.',
    error: 'Unable to open schedule. Check the data.'
  }
};

function getLang() {
  const lang = (navigator.language || 'es').toLowerCase();
  return lang.startsWith('es') ? 'es' : 'en';
}

function applyI18n() {
  const lang = getLang();
  const dict = i18n[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

function showAlert(message, type = 'danger') {
  if (type === 'success') {
    formSuccess.textContent = message;
    formSuccess.classList.remove('d-none');
    formAlert.classList.add('d-none');
  } else {
    formAlert.textContent = message;
    formAlert.classList.remove('d-none');
    formSuccess.classList.add('d-none');
  }
}

function clearAlerts() {
  formAlert.classList.add('d-none');
  formSuccess.classList.add('d-none');
}

function setLoading(isLoading) {
  loadingOverlay.classList.toggle('d-none', !isLoading);
  abrirHorarioBtn.disabled = isLoading || !confirmCheck.checked;
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function resolveCodes() {
  const userbase = window.userbase; // TODO: reemplazar cuando exista contexto real.
  const currentuser = window.currentuser; // TODO: reemplazar cuando exista contexto real.
  state.vCodigo_base = Number.isFinite(Number(userbase)) ? Number(userbase) : 1;
  state.vCodigo_usuario = Number.isFinite(Number(currentuser)) ? Number(currentuser) : 1;
}

function updateHiddenFields() {
  vCodigoBaseInput.value = state.vCodigo_base;
  vCodigoUsuarioInput.value = state.vCodigo_usuario;
  vFechaInput.value = state.vFecha;
}

function updateUltimaAsistencia(value) {
  const dict = i18n[getLang()];
  if (!value) {
    ultimaAsistenciaText.textContent = `${dict.ultima}: ${dict.sinRegistro}`;
  } else {
    ultimaAsistenciaText.textContent = `${dict.ultima}: ${value}`;
  }
}

function setAsistenciaState(isActive) {
  if (isActive) {
    abrirHorarioBtn.classList.remove('btn-primary');
    abrirHorarioBtn.classList.add('btn-success');
    abrirHorarioBtn.dataset.active = 'true';
    abrirHorarioBtn.textContent = i18n[getLang()].asistenciaRegistrada;
  } else {
    abrirHorarioBtn.classList.add('btn-primary');
    abrirHorarioBtn.classList.remove('btn-success');
    abrirHorarioBtn.dataset.active = 'false';
    abrirHorarioBtn.textContent = i18n[getLang()].abrirHorario;
  }
}

async function fetchUltimaAsistencia() {
  const params = new URLSearchParams({
    codigo_base: state.vCodigo_base,
    codigo_usuario: state.vCodigo_usuario
  });
  const response = await fetch(`/api/ultima-asistencia?${params.toString()}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.message || 'ULTIMA_ASISTENCIA_ERROR');
  state.vUltima_asistencia = data.ultima_asistencia;
  updateUltimaAsistencia(state.vUltima_asistencia);
}

function validate() {
  if (!dateRe.test(state.vFecha)) {
    return false;
  }
  if (!intRe.test(String(state.vCodigo_base)) || !intRe.test(String(state.vCodigo_usuario))) {
    return false;
  }
  if (!confirmCheck.checked) {
    return false;
  }
  return true;
}

async function abrirHorario() {
  clearAlerts();
  if (!validate()) {
    if (!confirmCheck.checked) {
      showAlert(i18n[getLang()].confirmRequired);
    } else {
      showAlert(i18n[getLang()].error);
    }
    return;
  }

  setLoading(true);
  try {
    const response = await fetch('/api/abrir-horario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vFecha: state.vFecha,
        vCodigo_base: state.vCodigo_base,
        vCodigo_usuario: state.vCodigo_usuario
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'ABRIR_HORARIO_ERROR');
    state.vUltima_asistencia = data.ultima_asistencia || state.vFecha;
    updateUltimaAsistencia(state.vUltima_asistencia);
    setAsistenciaState(true);
    showAlert(i18n[getLang()].success, 'success');
    await loadSqlLogs();
  } catch (error) {
    showAlert(i18n[getLang()].error);
  } finally {
    setLoading(false);
  }
}

async function loadSqlLogs() {
  try {
    const response = await fetch('/api/sql-logs');
    const data = await response.json();
    if (!data.ok) throw new Error('SQL_LOGS_ERROR');
    logContent.textContent = data.lines.length ? data.lines.join('\n') : 'Sin registros SQL.';
  } catch (error) {
    logContent.textContent = 'No se pudieron cargar los logs.';
  }
}

function toggleLogs() {
  const isOpen = !logPanel.classList.contains('d-none');
  if (isOpen) {
    logPanel.classList.add('d-none');
    logToggleBtn.textContent = i18n[getLang()].verLogs;
  } else {
    logPanel.classList.remove('d-none');
    logToggleBtn.textContent = i18n[getLang()].ocultarLogs;
    loadSqlLogs();
  }
}

function init() {
  applyI18n();
  wizard.goTo(1);
  resolveCodes();
  state.vFecha = formatDate(new Date());
  updateHiddenFields();
  setAsistenciaState(false);
  fetchUltimaAsistencia().catch(() => {
    updateUltimaAsistencia(null);
  });
}

abrirHorarioBtn.addEventListener('click', abrirHorario);
confirmCheck.addEventListener('change', () => {
  abrirHorarioBtn.disabled = !confirmCheck.checked;
});
logToggleBtn.addEventListener('click', toggleLogs);

init();
