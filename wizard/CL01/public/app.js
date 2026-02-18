(() => {
  const STORAGE_TOKEN_KEY = 'cl01_token';
  const STORAGE_USER_KEY = 'cl01_user';
  const STORAGE_SHORTCUTS_KEY = 'cl01_shortcuts';

  const I18N = {
    es: {
      brand_kicker: 'Plataforma ERP SaaS Global',
      logout: 'Logout',
      login_title: 'Acceso seguro',
      login_subtitle: 'Inicia sesión para lanzar módulos ERP y aplicaciones web.',
      user_label: 'Usuario',
      password_label: 'Password',
      login_btn: 'Login',
      menu_title: 'Tu espacio ERP',
      menu_subtitle: 'Lanza cada caso de uso con acceso protegido por OTP.',
      shortcuts_title: 'Accesos directos',
      modules_count: 'Módulos: ',
      shortcuts_empty: 'Aún no tienes accesos directos. Usa la estrella para guardar favoritos.',
      launch: 'Abrir',
      add_shortcut: 'Agregar acceso directo',
      remove_shortcut: 'Quitar acceso directo',
      login_required: 'Usuario y password son obligatorios.',
      login_ok: 'Login exitoso.',
      login_user_error: 'Usuario erróneo.',
      login_password_error: 'Password errónea.',
      session_expired: 'Sesión inválida o expirada.',
      launch_ready: 'Caso de uso listo. Abriendo URL con OTP...',
      launch_popup_blocked: 'El navegador bloqueó la ventana. Permite pop-ups para este sitio.',
      generic_error: 'Ocurrió un error en el launcher.',
      loading_menu_error: 'No se pudo cargar el menú.',
      logout_ok: 'Sesión cerrada correctamente.'
    },
    en: {
      brand_kicker: 'Global SaaS ERP Platform',
      logout: 'Logout',
      login_title: 'Secure access',
      login_subtitle: 'Sign in to launch your ERP modules and web apps.',
      user_label: 'User',
      password_label: 'Password',
      login_btn: 'Login',
      menu_title: 'Your ERP Workspace',
      menu_subtitle: 'Launch each use case with OTP-secured access.',
      shortcuts_title: 'Quick Access',
      modules_count: 'Modules: ',
      shortcuts_empty: 'No quick links yet. Use the star button to save favorites.',
      launch: 'Launch',
      add_shortcut: 'Add shortcut',
      remove_shortcut: 'Remove shortcut',
      login_required: 'User and password are required.',
      login_ok: 'Login successful.',
      login_user_error: 'Invalid user.',
      login_password_error: 'Invalid password.',
      session_expired: 'Session is invalid or expired.',
      launch_ready: 'Use case ready. Opening URL with OTP...',
      launch_popup_blocked: 'Popup blocked by browser. Allow pop-ups for this site.',
      generic_error: 'Launcher error.',
      loading_menu_error: 'Failed to load menu.',
      logout_ok: 'Session closed successfully.'
    }
  };

  const state = {
    locale: navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en',
    token: null,
    user: null,
    menu: []
  };

  const el = {
    alertArea: document.getElementById('alertArea'),
    loginSection: document.getElementById('loginSection'),
    dashboardSection: document.getElementById('dashboardSection'),
    loginForm: document.getElementById('loginForm'),
    logoutBtn: document.getElementById('logoutBtn'),
    userPill: document.getElementById('userPill'),
    modulesRow: document.getElementById('modulesRow'),
    shortcutsArea: document.getElementById('shortcutsArea'),
    moduleCountBadge: document.getElementById('moduleCountBadge'),
    shortcutCountBadge: document.getElementById('shortcutCountBadge')
  };

  function t(key) {
    return (I18N[state.locale] && I18N[state.locale][key]) || I18N.es[key] || key;
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (key) node.textContent = t(key);
    });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showAlert(type, message) {
    const klass = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : 'alert-info';
    const html = `<div class="alert ${klass} alert-dismissible fade show" role="alert">${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
    el.alertArea.innerHTML = html;
  }

  function clearAlert() {
    el.alertArea.innerHTML = '';
  }

  function readShortcuts() {
    try {
      const raw = localStorage.getItem(STORAGE_SHORTCUTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeShortcuts(list) {
    localStorage.setItem(STORAGE_SHORTCUTS_KEY, JSON.stringify(list));
  }

  function findUsecase(code) {
    const upper = String(code || '').toUpperCase();
    for (const module of state.menu) {
      const found = module.usecases.find((item) => String(item.codigo_usecase).toUpperCase() === upper);
      if (found) return found;
    }
    return null;
  }

  function toggleShortcut(code) {
    const upper = String(code || '').toUpperCase();
    if (!upper) return;
    const current = readShortcuts();
    const index = current.findIndex((item) => String(item).toUpperCase() === upper);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(upper);
    }
    writeShortcuts(current);
    renderModules();
    renderShortcuts();
  }

  async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (state.token) {
      headers.set('Authorization', `Bearer ${state.token}`);
    }
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  }

  function setLoggedOutView() {
    el.loginSection.classList.remove('d-none');
    el.dashboardSection.classList.add('d-none');
    el.logoutBtn.classList.add('d-none');
    el.userPill.classList.add('d-none');
    state.menu = [];
    el.modulesRow.innerHTML = '';
    el.shortcutsArea.innerHTML = '';
    el.moduleCountBadge.textContent = '0';
    el.shortcutCountBadge.textContent = '0';
  }

  function setLoggedInView() {
    el.loginSection.classList.add('d-none');
    el.dashboardSection.classList.remove('d-none');
    el.logoutBtn.classList.remove('d-none');
    el.userPill.classList.remove('d-none');
    const label = state.user ? `${state.user.codigo_usuario} - ${state.user.nombre || ''}` : '';
    el.userPill.textContent = label.trim();
  }

  function persistSession() {
    if (state.token) {
      localStorage.setItem(STORAGE_TOKEN_KEY, state.token);
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
    }
    if (state.user) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(state.user));
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
    }
  }

  function clearSession() {
    state.token = null;
    state.user = null;
    state.menu = [];
    persistSession();
    setLoggedOutView();
  }

  async function loadMenu() {
    const { response, payload } = await apiFetch('/api/menu');
    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || t('loading_menu_error'));
    }
    state.menu = Array.isArray(payload.menu) ? payload.menu : [];
    renderModules();
    renderShortcuts();
  }

  function renderShortcuts() {
    const shortcuts = readShortcuts();
    const validShortcuts = shortcuts.filter((code) => Boolean(findUsecase(code)));
    if (validShortcuts.length !== shortcuts.length) {
      writeShortcuts(validShortcuts);
    }
    el.shortcutCountBadge.textContent = String(validShortcuts.length);
    if (!validShortcuts.length) {
      el.shortcutsArea.innerHTML = `<span class="text-light-emphasis">${escapeHtml(t('shortcuts_empty'))}</span>`;
      return;
    }

    el.shortcutsArea.innerHTML = validShortcuts
      .map((code) => {
        const usecase = findUsecase(code);
        if (!usecase) return '';
        return `<button type="button" class="btn btn-sm btn-outline-info" data-action="launch" data-usecase="${escapeHtml(
          usecase.codigo_usecase
        )}">
          ${escapeHtml(usecase.codigo_usecase)} - ${escapeHtml(usecase.caption)}
        </button>`;
      })
      .join('');
  }

  function renderModules() {
    const shortcuts = readShortcuts().map((item) => String(item).toUpperCase());
    el.moduleCountBadge.textContent = `${t('modules_count')}${state.menu.length}`;

    if (!state.menu.length) {
      el.modulesRow.innerHTML = '';
      return;
    }

    const html = state.menu
      .map((module) => {
        const moduleTitle = `${module.codigo_modulo} · ${module.titulo}`;
        const usecaseList = module.usecases
          .map((usecase) => {
            const code = String(usecase.codigo_usecase || '').toUpperCase();
            const isShortcut = shortcuts.includes(code);
            return `<div class="usecase-item d-flex justify-content-between align-items-center gap-2">
                <div>
                  <span class="badge text-bg-dark me-2">${escapeHtml(code)}</span>
                  <span>${escapeHtml(usecase.caption || code)}</span>
                </div>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-sm btn-outline-warning" data-action="shortcut" data-usecase="${escapeHtml(
                    code
                  )}" title="${escapeHtml(isShortcut ? t('remove_shortcut') : t('add_shortcut'))}">
                    <i class="${isShortcut ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                  </button>
                  <button type="button" class="btn btn-sm btn-primary" data-action="launch" data-usecase="${escapeHtml(code)}">
                    <i class="fa-solid fa-rocket me-1"></i>${escapeHtml(t('launch'))}
                  </button>
                </div>
              </div>`;
          })
          .join('');

        return `<div class="col-12 col-lg-6">
            <article class="glass-card h-100 p-3 p-md-4">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <h3 class="h5 mb-0">${escapeHtml(moduleTitle)}</h3>
                <span class="badge text-bg-info-subtle border border-info-subtle">:${escapeHtml(module.puerto)}</span>
              </div>
              <div class="d-grid gap-2">${usecaseList}</div>
            </article>
          </div>`;
      })
      .join('');

    el.modulesRow.innerHTML = html;
  }

  async function launchUsecase(codigoUsecase) {
    clearAlert();
    const { response, payload } = await apiFetch('/api/otp', {
      method: 'POST',
      body: JSON.stringify({ codigo_usecase: codigoUsecase })
    });

    if (response.status === 401) {
      clearSession();
      showAlert('error', t('session_expired'));
      return;
    }
    if (!response.ok || !payload.ok) {
      showAlert('error', payload.message || t('generic_error'));
      return;
    }

    const popup = window.open(payload.launchUrl, '_blank', 'noopener');
    if (!popup) {
      showAlert('error', t('launch_popup_blocked'));
      return;
    }

    showAlert('success', t('launch_ready'));
  }

  async function tryRestoreSession() {
    const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const savedUser = localStorage.getItem(STORAGE_USER_KEY);
    if (!savedToken) return false;

    state.token = savedToken;
    try {
      state.user = savedUser ? JSON.parse(savedUser) : null;
    } catch {
      state.user = null;
    }

    try {
      await loadMenu();
      setLoggedInView();
      return true;
    } catch {
      clearSession();
      return false;
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearAlert();

    const vUsuario = String(el.loginForm.vUsuario.value || '').trim();
    const vPassword = String(el.loginForm.vPassword.value || '').trim();
    if (!vUsuario || !vPassword) {
      showAlert('error', t('login_required'));
      return;
    }

    const { response, payload } = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ vUsuario, vPassword })
    });

    if (!response.ok || !payload.ok) {
      if (payload.code === 1) {
        showAlert('error', t('login_user_error'));
      } else if (payload.code === 2) {
        showAlert('error', t('login_password_error'));
      } else {
        showAlert('error', payload.message || t('generic_error'));
      }
      return;
    }

    state.token = payload.token;
    state.user = payload.user || null;
    state.menu = Array.isArray(payload.menu) ? payload.menu : [];
    persistSession();
    setLoggedInView();
    renderModules();
    renderShortcuts();
    el.loginForm.reset();
    showAlert('success', t('login_ok'));
  }

  async function handleLogout() {
    try {
      await apiFetch('/api/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {}
    clearSession();
    showAlert('info', t('logout_ok'));
  }

  function onDashboardClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const usecase = button.dataset.usecase;
    if (!usecase) return;

    if (action === 'launch') {
      launchUsecase(usecase).catch((error) => {
        showAlert('error', error.message || t('generic_error'));
      });
      return;
    }
    if (action === 'shortcut') {
      toggleShortcut(usecase);
    }
  }

  async function bootstrap() {
    applyI18n();
    setLoggedOutView();
    el.loginForm.addEventListener('submit', handleLogin);
    el.logoutBtn.addEventListener('click', handleLogout);
    el.dashboardSection.addEventListener('click', onDashboardClick);

    const restored = await tryRestoreSession();
    if (!restored) {
      setLoggedOutView();
    }
  }

  bootstrap().catch((error) => {
    showAlert('error', error.message || t('generic_error'));
  });
})();
