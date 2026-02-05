const i18n = {
  en: {
    brandTitle: 'Launcher ERP',
    brandSubtitle: 'Global SaaS ERP Platform',
    statusOffline: 'Offline',
    heroTitle: 'Your ERP world, one secure launch away',
    heroSubtitle: 'Access every module, workflow, and web app approved for your role. Fast, traceable, and built for scale.',
    feature1Badge: 'Secure',
    feature1Title: 'Credential-first access',
    feature1Desc: 'Every launch is validated and logged end-to-end.',
    feature2Badge: 'Traceable',
    feature2Title: 'Navigation traces',
    feature2Desc: 'Operational visibility for every click you make.',
    feature3Badge: 'Global',
    feature3Title: 'SaaS at scale',
    feature3Desc: 'Optimized for distributed teams and partners.',
    loginTitle: 'Login',
    loginHint: 'Use your ERP username, name, or number.',
    labelUser: 'User',
    labelPassword: 'Password',
    loginButton: 'Login',
    loginFooter: 'Need access? Contact your ERP administrator.',
    launcherTitle: 'Launcher',
    logout: 'Logout',
    shortcuts: 'Shortcuts',
    shortcutsHint: 'Pin your most used apps.',
    modules: 'Modules',
    usecases: 'Use cases',
    welcome: 'Welcome',
    noUsecases: 'No use cases available for this user.',
    addShortcut: 'Add shortcut',
    removeShortcut: 'Remove shortcut',
    launch: 'Launch',
    errorUser: 'Incorrect user. Check your credentials.',
    errorPass: 'Incorrect password. Try again.',
    errorFields: 'Complete both fields to continue.',
    errorServer: 'We could not complete your request. Try again.',
    loginSuccess: 'Session active'
  },
  es: {
    brandTitle: 'Launcher ERP',
    brandSubtitle: 'Plataforma SaaS ERP Global',
    statusOffline: 'Sin sesión',
    heroTitle: 'Tu ERP global, listo para lanzar',
    heroSubtitle: 'Accede a cada módulo, flujo y app web aprobada para tu rol. Rápido, trazable y a escala.',
    feature1Badge: 'Seguro',
    feature1Title: 'Acceso validado',
    feature1Desc: 'Cada acceso se valida y registra de punta a punta.',
    feature2Badge: 'Trazable',
    feature2Title: 'Trazas de navegación',
    feature2Desc: 'Visibilidad operativa en cada click que realizas.',
    feature3Badge: 'Global',
    feature3Title: 'SaaS a escala',
    feature3Desc: 'Optimizado para equipos y partners distribuidos.',
    loginTitle: 'Login',
    loginHint: 'Usa tu usuario, nombre o número ERP.',
    labelUser: 'Usuario',
    labelPassword: 'Password',
    loginButton: 'Login',
    loginFooter: '¿Necesitas acceso? Contacta al administrador ERP.',
    launcherTitle: 'Launcher',
    logout: 'Logout',
    shortcuts: 'Accesos directos',
    shortcutsHint: 'Fija tus apps más usadas.',
    modules: 'Módulos',
    usecases: 'Casos de uso',
    welcome: 'Bienvenido',
    noUsecases: 'No hay casos de uso disponibles para este usuario.',
    addShortcut: 'Agregar acceso',
    removeShortcut: 'Quitar acceso',
    launch: 'Abrir',
    errorUser: 'Usuario incorrecto. Verifica tus credenciales.',
    errorPass: 'Password incorrecta. Inténtalo de nuevo.',
    errorFields: 'Completa ambos campos para continuar.',
    errorServer: 'No pudimos completar tu solicitud. Inténtalo de nuevo.',
    loginSuccess: 'Sesión activa'
  }
};

const state = {
  sessionToken: null,
  user: null,
  usecases: [],
  activeModule: null,
  lang: 'en'
};

const elements = {
  loginView: document.getElementById('loginView'),
  launcherView: document.getElementById('launcherView'),
  loginForm: document.getElementById('loginForm'),
  loginAlert: document.getElementById('loginAlert'),
  usuario: document.getElementById('usuario'),
  password: document.getElementById('password'),
  modulesList: document.getElementById('modulesList'),
  usecasesGrid: document.getElementById('usecasesGrid'),
  shortcutsGrid: document.getElementById('shortcutsGrid'),
  shortcuts: document.getElementById('shortcuts'),
  sessionInfo: document.getElementById('sessionInfo'),
  welcomeText: document.getElementById('welcomeText'),
  logoutBtn: document.getElementById('logoutBtn')
};

function detectLanguage() {
  const browserLang = navigator.language || 'en';
  if (browserLang.toLowerCase().startsWith('es')) {
    return 'es';
  }
  return 'en';
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
  elements.loginAlert.textContent = message;
  elements.loginAlert.className = `alert alert-${type}`;
  elements.loginAlert.classList.remove('d-none');
}

function clearAlert() {
  elements.loginAlert.classList.add('d-none');
}

function setSessionBadge(label, style = 'light') {
  elements.sessionInfo.innerHTML = `<span class="badge text-bg-${style}">${label}</span>`;
}

function saveSession(token) {
  state.sessionToken = token;
  localStorage.setItem('cl01.session', token);
}

function clearSession() {
  state.sessionToken = null;
  localStorage.removeItem('cl01.session');
}

function getShortcuts() {
  const raw = localStorage.getItem('cl01.shortcuts');
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function setShortcuts(list) {
  localStorage.setItem('cl01.shortcuts', JSON.stringify(list));
}

function groupByModule(usecases) {
  const modules = new Map();
  usecases.forEach((uc) => {
    const moduleCode = uc.codigo_modulo || 'SIN_MODULO';
    const moduleName = uc.caption || uc.descripcion || moduleCode;
    if (!modules.has(moduleCode)) {
      modules.set(moduleCode, {
        codigo_modulo: moduleCode,
        descripcion: uc.descripcion || moduleName,
        caption: moduleName,
        usecases: []
      });
    }
    modules.get(moduleCode).usecases.push(uc);
  });
  return Array.from(modules.values());
}

function buildModulesList(modules) {
  elements.modulesList.innerHTML = '';
  modules.forEach((mod, idx) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `list-group-item list-group-item-action ${idx === 0 ? 'active' : ''}`;
    item.dataset.module = mod.codigo_modulo;
    item.innerHTML = `
      <div class="module-item">
        <div class="module-icon">${(mod.caption || 'M').slice(0, 2).toUpperCase()}</div>
        <div>
          <div class="module-title">${mod.caption || mod.descripcion || mod.codigo_modulo}</div>
          <div class="module-subtitle">${mod.descripcion || ''}</div>
        </div>
      </div>
    `;
    item.addEventListener('click', () => {
      document.querySelectorAll('#modulesList .list-group-item').forEach((btn) => btn.classList.remove('active'));
      item.classList.add('active');
      state.activeModule = mod.codigo_modulo;
      renderUsecases();
    });
    elements.modulesList.appendChild(item);
  });

  if (modules.length) {
    state.activeModule = modules[0].codigo_modulo;
  }
}

function renderUsecases() {
  const modules = groupByModule(state.usecases);
  const module = modules.find((mod) => mod.codigo_modulo === state.activeModule) || modules[0];
  const list = module ? module.usecases : [];
  elements.usecasesGrid.innerHTML = '';

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('noUsecases');
    elements.usecasesGrid.appendChild(empty);
    return;
  }

  list.forEach((uc) => {
    const card = document.createElement('div');
    card.className = 'usecase-card';
    card.innerHTML = `
      <div class="usecase-card-body">
        <div class="usecase-header">
          <span class="badge text-bg-dark">${uc.codigo_usecase}</span>
          <span class="badge text-bg-info">${uc.codigo_modulo || 'MOD'}</span>
        </div>
        <div class="usecase-title">${uc.caption || uc.descripcion || uc.codigo_usecase}</div>
        <div class="usecase-link">${uc.linktolaunch}</div>
      </div>
      <div class="usecase-actions">
        <button class="btn btn-sm btn-outline-light" data-shortcut="${uc.codigo_usecase}">
          ${isShortcut(uc.codigo_usecase) ? t('removeShortcut') : t('addShortcut')}
        </button>
        <button class="btn btn-sm btn-primary" data-launch="${uc.codigo_usecase}">${t('launch')}</button>
      </div>
    `;
    card.querySelector('[data-launch]').addEventListener('click', () => launchUsecase(uc));
    card.querySelector('[data-shortcut]').addEventListener('click', (event) => toggleShortcut(event, uc));
    elements.usecasesGrid.appendChild(card);
  });
}

function renderShortcuts() {
  const shortcuts = getShortcuts();
  elements.shortcutsGrid.innerHTML = '';
  if (!shortcuts.length) {
    elements.shortcuts.classList.add('muted');
    return;
  }
  elements.shortcuts.classList.remove('muted');
  shortcuts.forEach((code) => {
    const uc = state.usecases.find((item) => item.codigo_usecase === code);
    if (!uc) {
      return;
    }
    const item = document.createElement('div');
    item.className = 'shortcut-card';
    item.innerHTML = `
      <div>
        <div class="shortcut-title">${uc.caption || uc.descripcion || code}</div>
        <div class="shortcut-link">${uc.linktolaunch}</div>
      </div>
      <button class="btn btn-sm btn-outline-light" data-launch-shortcut="${code}">${t('launch')}</button>
    `;
    item.querySelector('[data-launch-shortcut]').addEventListener('click', () => launchUsecase(uc));
    elements.shortcutsGrid.appendChild(item);
  });
}

function isShortcut(code) {
  return getShortcuts().includes(code);
}

function toggleShortcut(event, uc) {
  const shortcuts = getShortcuts();
  const index = shortcuts.indexOf(uc.codigo_usecase);
  if (index >= 0) {
    shortcuts.splice(index, 1);
  } else {
    shortcuts.push(uc.codigo_usecase);
  }
  setShortcuts(shortcuts);
  renderShortcuts();
  renderUsecases();
}

async function launchUsecase(uc) {
  try {
    await fetch('/api/trace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': state.sessionToken
      },
      body: JSON.stringify({ codigo_usecase: uc.codigo_usecase })
    });
  } catch (error) {
    console.error(error);
  }
  window.open(uc.linktolaunch, '_blank', 'noopener');
}

function renderLauncher() {
  elements.loginView.classList.add('d-none');
  elements.launcherView.classList.remove('d-none');
  setSessionBadge(t('loginSuccess'), 'success');
  elements.welcomeText.textContent = `${t('welcome')}, ${state.user?.nombre || ''}`;

  const modules = groupByModule(state.usecases);
  buildModulesList(modules);
  renderUsecases();
  renderShortcuts();
}

async function submitLogin(event) {
  event.preventDefault();
  clearAlert();

  const usuario = elements.usuario.value.trim();
  const password = elements.password.value.trim();

  if (!usuario || !password) {
    setAlert(t('errorFields'));
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password })
    });
    const data = await response.json();
    if (!data.ok) {
      if (data.code === 1) {
        setAlert(t('errorUser'));
      } else if (data.code === 2) {
        setAlert(t('errorPass'));
      } else if (data.message === 'MISSING_FIELDS') {
        setAlert(t('errorFields'));
      } else {
        setAlert(t('errorServer'));
      }
      return;
    }

    saveSession(data.token);
    state.user = data.user;
    state.usecases = data.usecases || [];
    renderLauncher();
  } catch (error) {
    console.error(error);
    setAlert(t('errorServer'));
  }
}

async function restoreSession() {
  const token = localStorage.getItem('cl01.session');
  if (!token) {
    return;
  }
  try {
    const response = await fetch('/api/session', {
      headers: { 'x-session-token': token }
    });
    const data = await response.json();
    if (!data.ok) {
      clearSession();
      return;
    }
    state.sessionToken = token;
    state.user = data.user;
    state.usecases = data.usecases || [];
    renderLauncher();
  } catch (error) {
    console.error(error);
    clearSession();
  }
}

async function logout() {
  if (!state.sessionToken) {
    return;
  }
  try {
    await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': state.sessionToken
      }
    });
  } catch (error) {
    console.error(error);
  }
  clearSession();
  state.user = null;
  state.usecases = [];
  elements.launcherView.classList.add('d-none');
  elements.loginView.classList.remove('d-none');
  setSessionBadge(t('statusOffline'), 'light');
}

function init() {
  state.lang = detectLanguage();
  applyTranslations();
  setSessionBadge(t('statusOffline'), 'light');
  elements.loginForm.addEventListener('submit', submitLogin);
  elements.logoutBtn.addEventListener('click', logout);
  restoreSession();
}

init();
