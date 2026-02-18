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
  vBaseNombre: '',
  vPriv: '',
  vBases: [],
  vCodigo_usuario: 1,
  vUltima_asistencia: null,
  Codigo_usuario: '',
  OTP: '',
  vParametros: null
};

const formAlert = document.getElementById('formAlert');
const formSuccess = document.getElementById('formSuccess');
const loadingOverlay = document.getElementById('loadingOverlay');
const vFechaInput = document.getElementById('vFecha');
const vBaseNombreInput = document.getElementById('vBaseNombre');
const vBasesList = document.getElementById('vBasesList');
const baseHelpText = document.getElementById('baseHelpText');
const vCodigoBaseInput = document.getElementById('vCodigo_base');
const vCodigoUsuarioInput = document.getElementById('vCodigo_usuario');
const ultimaAsistenciaText = document.getElementById('ultimaAsistencia');
const abrirHorarioBtn = document.getElementById('abrirHorarioBtn');
const confirmCheck = document.getElementById('confirmCheck');

const wizard = new FormWizard(1);

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const intRe = /^\d+$/;
const unauthorizedMessage = 'Warning ACCESO NO AUTORIZADO !!!';

const i18n = {
  es: {
    title: 'Abrir Horario',
    subtitle: 'Operaciones Globales IaaS & PaaS',
    status: 'En linea',
    stepTitle: '1. Abrir Horario',
    stepHint: 'Registra la asistencia y valida la ultima marca disponible.',
    fecha: 'Fecha del sistema',
    base: 'Base',
    baseHelp: 'Selecciona la base operativa registrada.',
    baseHelpReadonly: 'Base asignada por permisos del usuario (solo lectura).',
    ultima: 'Ultima asistencia',
    sinRegistro: 'sin registro',
    abrirHorario: 'Abrir Horario',
    asistenciaRegistrada: 'Asistencia registrada',
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
    base: 'Base',
    baseHelp: 'Select the registered operational base.',
    baseHelpReadonly: 'Base assigned by user privileges (read-only).',
    ultima: 'Last attendance',
    sinRegistro: 'no record',
    abrirHorario: 'Open Schedule',
    asistenciaRegistrada: 'Attendance recorded',
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

function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBaseCode(value) {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? text : '';
}

function formatBaseLabel(base) {
  if (!base) return '';
  const code = String(base.codigo_base ?? '').trim();
  const name = String(base.nombre ?? '').trim();
  if (code && name) return `${code} - ${name}`;
  return code || name;
}

function renderBaseOptions() {
  if (!vBasesList) return;
  vBasesList.innerHTML = '';
  (state.vBases || []).forEach((base) => {
    const option = document.createElement('option');
    option.value = formatBaseLabel(base);
    vBasesList.appendChild(option);
  });
}

function resolveBaseFromInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();

  return (
    (state.vBases || []).find((base) => {
      const code = String(base.codigo_base || '').trim().toLowerCase();
      const name = String(base.nombre || '').trim().toLowerCase();
      const label = formatBaseLabel(base).toLowerCase();
      return normalized === code || normalized === name || normalized === label;
    }) || null
  );
}

function setBaseEditable(isEditable) {
  if (!vBaseNombreInput) return;
  vBaseNombreInput.readOnly = !isEditable;
  if (isEditable) {
    vBaseNombreInput.setAttribute('list', 'vBasesList');
    if (baseHelpText) {
      baseHelpText.textContent = i18n[getLang()].baseHelp;
    }
  } else {
    vBaseNombreInput.removeAttribute('list');
    if (baseHelpText) {
      baseHelpText.textContent = i18n[getLang()].baseHelpReadonly;
    }
  }
}

function applyBaseContext(data) {
  state.vPriv = String(data?.vPriv || '').trim().toUpperCase();
  state.vBases = Array.isArray(data?.rows) ? data.rows : [];
  state.vBaseNombre = String(data?.vBaseTexto || '').trim();
  const selectedBaseCode = normalizeBaseCode(data?.vBase);

  const isAll = state.vPriv === 'ALL';
  setBaseEditable(isAll);
  renderBaseOptions();

  if (isAll) {
    const selected =
      state.vBases.find((base) => String(base.codigo_base) === String(selectedBaseCode)) || state.vBases[0] || null;
    state.vCodigo_base = selected ? selected.codigo_base : selectedBaseCode || '';
    vBaseNombreInput.value = selected ? formatBaseLabel(selected) : '';
    state.vBaseNombre = vBaseNombreInput.value;
  } else {
    state.vCodigo_base = selectedBaseCode;
    vBaseNombreInput.value = state.vBaseNombre;
  }
}

async function loadBaseContext() {
  const params = new URLSearchParams({
    codigo_usuario: state.Codigo_usuario
  });

  const requestedBase = normalizeBaseCode(state.vCodigo_base);
  if (requestedBase) {
    params.set('codigo_base', requestedBase);
  }

  const response = await fetch(`./api/base-context?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'BASE_CONTEXT_ERROR');
  }
  applyBaseContext(data);
}

function getParam(searchParams, keys) {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readStartupParams() {
  if (window.__cu2001Auth && window.__cu2001AuthValidated === true) {
    const auth = window.__cu2001Auth;
    if (
      typeof auth.Codigo_usuario === 'string' &&
      auth.Codigo_usuario &&
      auth.Codigo_usuario.length <= 36 &&
      typeof auth.OTP === 'string' &&
      auth.OTP &&
      auth.OTP.length <= 6
    ) {
      return {
        ok: true,
        Codigo_usuario: auth.Codigo_usuario,
        OTP: auth.OTP,
        vParametros: auth.vParametros ?? null
      };
    }
    return { ok: false };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const codigoUsuario = getParam(searchParams, ['vUsuario', 'Codigo_usuario', 'codigo_usuario']);
  const otp = getParam(searchParams, ['vOTP', 'OTP', 'otp']);
  const parametrosRaw = getParam(searchParams, ['vParametros', 'vParámetros']);

  if (!codigoUsuario || !otp) {
    return { ok: false };
  }

  if (codigoUsuario.length > 36 || otp.length > 6) {
    return { ok: false };
  }

  let parsedParams = null;
  if (parametrosRaw) {
    try {
      parsedParams = JSON.parse(parametrosRaw);
    } catch (error) {
      return { ok: false };
    }
  }

  return {
    ok: true,
    Codigo_usuario: codigoUsuario,
    OTP: otp,
    vParametros: parsedParams
  };
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
  if (vBaseNombreInput) {
    const allowEditBase = state.vPriv === 'ALL' && !isLoading;
    vBaseNombreInput.readOnly = !allowEditBase;
  }
}

function denyAccessAndClose() {
  showAlert(unauthorizedMessage, 'danger');
  window.alert(unauthorizedMessage);
  try {
    window.open('', '_self');
    window.close();
  } catch (error) {
    // Ignorado: algunos navegadores bloquean cierre programatico.
  }
  setTimeout(() => {
    if (!window.closed) {
      window.location.replace('about:blank');
    }
  }, 150);
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTimeForDb(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function resolveCodes() {
  const userbase = window.userbase; // TODO: reemplazar cuando exista contexto real.
  const currentuser = window.currentuser; // TODO: reemplazar cuando exista contexto real.
  const extra = state.vParametros && typeof state.vParametros === 'object' ? state.vParametros : null;

  const codigoBaseParam = extra ? extra.vCodigo_base ?? extra.codigo_base ?? extra.userbase : null;
  const codigoUsuarioParam = extra ? extra.vCodigo_usuario ?? extra.codigo_usuario ?? extra.currentuser : null;

  state.vCodigo_base = parseNumeric(codigoBaseParam) ?? parseNumeric(userbase) ?? 1;
  state.vCodigo_usuario =
    parseNumeric(codigoUsuarioParam) ?? parseNumeric(state.Codigo_usuario) ?? parseNumeric(currentuser) ?? 1;
}

function updateHiddenFields() {
  vCodigoBaseInput.value = state.vCodigo_base;
  vCodigoUsuarioInput.value = state.vCodigo_usuario;
  vFechaInput.value = state.vFecha;
  if (vBaseNombreInput) {
    vBaseNombreInput.value = state.vBaseNombre || vBaseNombreInput.value || '';
  }
}

function updateUltimaAsistencia(value) {
  const dict = i18n[getLang()];
  const formatted = formatDateTime(value);
  if (!formatted) {
    ultimaAsistenciaText.textContent = `${dict.ultima}: ${dict.sinRegistro}`;
  } else {
    ultimaAsistenciaText.textContent = `${dict.ultima}: ${formatted}`;
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

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { date: value, hasTime: true };
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return { date, hasTime: true };
    }
    return null;
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (dateRe.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map((part) => Number(part));
    if (!year || !month || !day) return null;
    return { date: new Date(year, month - 1, day), hasTime: false };
  }

  if (trimmed.includes('T')) {
    const isoDate = new Date(trimmed);
    if (!Number.isNaN(isoDate.getTime())) {
      return { date: isoDate, hasTime: true };
    }
  }

  const dateTimeMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );
  if (dateTimeMatch) {
    const [, year, month, day, hour, minute, second = '0'] = dateTimeMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
    if (!Number.isNaN(date.getTime())) {
      return { date, hasTime: true };
    }
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return { date: fallback, hasTime: true };
  }
  return null;
}

function formatDateTime(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return null;

  const locale = navigator.language || 'es';
  const datePart = parsed.date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  if (!parsed.hasTime) {
    return datePart;
  }
  const timePart = parsed.date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return `${datePart} ${timePart}`;
}

async function fetchUltimaAsistencia() {
  const params = new URLSearchParams({
    codigo_base: state.vCodigo_base,
    codigo_usuario: state.vCodigo_usuario,
    Codigo_usuario: state.Codigo_usuario
  });
  const response = await fetch(`./api/ultima-asistencia?${params.toString()}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.message || 'ULTIMA_ASISTENCIA_ERROR');
  state.vUltima_asistencia = data.ultima_asistencia;
  updateUltimaAsistencia(state.vUltima_asistencia);
}

async function syncBaseSelection() {
  if (state.vPriv !== 'ALL') return;
  const selected = resolveBaseFromInput(vBaseNombreInput.value);
  if (!selected) {
    const current = (state.vBases || []).find((base) => String(base.codigo_base) === String(state.vCodigo_base));
    vBaseNombreInput.value = current ? formatBaseLabel(current) : '';
    return;
  }

  if (String(selected.codigo_base) === String(state.vCodigo_base)) {
    vBaseNombreInput.value = formatBaseLabel(selected);
    return;
  }

  state.vCodigo_base = String(selected.codigo_base);
  state.vBaseNombre = formatBaseLabel(selected);
  updateHiddenFields();
  try {
    await fetchUltimaAsistencia();
  } catch (error) {
    const code = String(error?.message || '').trim().toUpperCase();
    if (code === 'UNAUTHORIZED' || code === 'BASE_FORBIDDEN' || code === 'CODIGO_USUARIO_REQUIRED') {
      denyAccessAndClose();
      return;
    }
    updateUltimaAsistencia(null);
  }
}

async function validarOtpUsuario() {
  const response = await fetch('./api/validar-otp-usuario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Codigo_usuario: state.Codigo_usuario,
      OTP: state.OTP
    })
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'VALIDAR_OTP_USUARIO_ERROR');
  }
  return Number(data.resultado);
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
    const vFechaRegistro = formatDateTimeForDb(new Date());
    const response = await fetch('./api/abrir-horario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Codigo_usuario: state.Codigo_usuario,
        vFecha: state.vFecha,
        vFecha_registro: vFechaRegistro,
        vCodigo_base: state.vCodigo_base,
        vCodigo_usuario: state.vCodigo_usuario
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'ABRIR_HORARIO_ERROR');
    state.vUltima_asistencia = data.ultima_asistencia || vFechaRegistro;
    updateUltimaAsistencia(state.vUltima_asistencia);
    setAsistenciaState(true);
    showAlert(i18n[getLang()].success, 'success');
  } catch (error) {
    const code = String(error?.message || '').trim().toUpperCase();
    if (code === 'UNAUTHORIZED' || code === 'BASE_FORBIDDEN' || code === 'CODIGO_USUARIO_REQUIRED') {
      denyAccessAndClose();
      return;
    }
    showAlert(i18n[getLang()].error);
  } finally {
    setLoading(false);
  }
}

async function init() {
  applyI18n();
  wizard.goTo(1);
  clearAlerts();
  const startupParams = readStartupParams();
  if (!startupParams.ok) {
    denyAccessAndClose();
    return;
  }
  state.Codigo_usuario = startupParams.Codigo_usuario;
  state.OTP = startupParams.OTP;
  state.vParametros = startupParams.vParametros;
  if (window.__cu2001AuthValidated !== true) {
    try {
      const resultado = await validarOtpUsuario();
      if (resultado !== 1) {
        denyAccessAndClose();
        return;
      }
    } catch (error) {
      denyAccessAndClose();
      return;
    }
  }
  resolveCodes();
  state.vFecha = formatDate(new Date());
  try {
    await loadBaseContext();
  } catch (error) {
    const code = String(error?.message || '').trim().toUpperCase();
    if (code === 'UNAUTHORIZED' || code === 'BASE_FORBIDDEN' || code === 'CODIGO_USUARIO_REQUIRED') {
      denyAccessAndClose();
      return;
    }
    throw error;
  }
  updateHiddenFields();
  setAsistenciaState(false);
  await fetchUltimaAsistencia().catch((error) => {
    const code = String(error?.message || '').trim().toUpperCase();
    if (code === 'UNAUTHORIZED' || code === 'BASE_FORBIDDEN' || code === 'CODIGO_USUARIO_REQUIRED') {
      denyAccessAndClose();
      return;
    }
    updateUltimaAsistencia(null);
  });
}

abrirHorarioBtn.addEventListener('click', abrirHorario);
confirmCheck.addEventListener('change', () => {
  abrirHorarioBtn.disabled = !confirmCheck.checked;
});
vBaseNombreInput.addEventListener('change', () => {
  void syncBaseSelection();
});
vBaseNombreInput.addEventListener('blur', () => {
  void syncBaseSelection();
});

init();
