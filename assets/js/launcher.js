import { applyI18n, detectLocale, t } from "./i18nLauncher.js";

const locale = detectLocale();
applyI18n(locale);

const LS_SESSION_KEY = "launcher:session";
const LS_PIN_KEY_PREFIX = "launcher:pins:";

const el = {
  loginPane: document.getElementById("loginPane"),
  launcherPane: document.getElementById("launcherPane"),
  loginForm: document.getElementById("loginForm"),
  loginAlert: document.getElementById("loginAlert"),
  btnLogin: document.getElementById("btnLogin"),
  btnLogout: document.getElementById("btnLogout"),
  userName: document.getElementById("userName"),
  userMeta: document.getElementById("userMeta"),
  launcherAlert: document.getElementById("launcherAlert"),
  moduleAccordion: document.getElementById("moduleAccordion"),
  moduleGrid: document.getElementById("moduleGrid"),
  pinnedGrid: document.getElementById("pinnedGrid"),
  launcherProgress: document.getElementById("launcherProgress"),
};

const state = {
  locale,
  token: null,
  user: null,
  modules: [],
  usecases: [],
  pinned: new Set(),
};

function setAlert(target, type, message) {
  if (!target) return;
  if (!message) {
    target.classList.add("d-none");
    target.textContent = "";
    return;
  }
  target.className = `alert alert-${type}`;
  target.textContent = message;
}

function setProgress(visible) {
  if (!el.launcherProgress) return;
  el.launcherProgress.classList.toggle("d-none", !visible);
}

function setLoginLoading(loading) {
  el.btnLogin.disabled = loading;
  el.btnLogin.innerHTML = loading
    ? `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${t(locale, "loading")}`
    : `<span>${t(locale, "login")}</span>`;
}

function showLauncher() {
  el.loginPane.classList.add("d-none");
  el.launcherPane.classList.remove("d-none");
}

function showLogin() {
  el.launcherPane.classList.add("d-none");
  el.loginPane.classList.remove("d-none");
}

function getPinKey() {
  if (!state.user?.codigo_usuario) return `${LS_PIN_KEY_PREFIX}guest`;
  return `${LS_PIN_KEY_PREFIX}${state.user.codigo_usuario}`;
}

function loadPins() {
  try {
    const raw = localStorage.getItem(getPinKey());
    const list = raw ? JSON.parse(raw) : [];
    state.pinned = new Set(Array.isArray(list) ? list : []);
  } catch {
    state.pinned = new Set();
  }
}

function savePins() {
  try {
    localStorage.setItem(getPinKey(), JSON.stringify(Array.from(state.pinned)));
  } catch {
    // ignore storage errors
  }
}

function titleize(code) {
  if (!code) return "Usecase";
  const cleaned = code.replace(/^UC_/, "").replace(/_/g, " ");
  return cleaned
    .toLowerCase()
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function usecaseLabel(usecase) {
  return usecase?.caption || usecase?.descripcion || titleize(usecase?.codigo_usecase);
}

function moduleLabel(moduleRow) {
  return moduleRow?.caption || moduleRow?.descripcion || "Modulo";
}

function makeIconLabel(label) {
  const clean = String(label || "?").trim();
  return clean ? clean.slice(0, 2).toUpperCase() : "??";
}

function buildUsecaseMap() {
  const map = new Map();
  for (const moduleRow of state.modules) {
    for (const usecase of moduleRow.usecases || []) {
      map.set(usecase.codigo_usecase, {
        ...usecase,
        moduleName: moduleLabel(moduleRow),
      });
    }
  }
  return map;
}

function renderMenu() {
  el.moduleAccordion.innerHTML = "";
  if (!state.modules.length) {
    el.moduleAccordion.textContent = t(locale, "emptyModules");
    return;
  }
  state.modules.forEach((moduleRow, idx) => {
    const item = document.createElement("div");
    item.className = "accordion-item";

    const headerId = `moduleHeading-${idx}`;
    const collapseId = `moduleCollapse-${idx}`;

    const button = document.createElement("button");
    button.className = `accordion-button ${idx === 0 ? "" : "collapsed"}`;
    button.type = "button";
    button.setAttribute("data-bs-toggle", "collapse");
    button.setAttribute("data-bs-target", `#${collapseId}`);
    button.setAttribute("aria-expanded", idx === 0 ? "true" : "false");
    button.setAttribute("aria-controls", collapseId);
    button.textContent = moduleLabel(moduleRow);

    const header = document.createElement("h2");
    header.className = "accordion-header";
    header.id = headerId;
    header.appendChild(button);

    const body = document.createElement("div");
    body.id = collapseId;
    body.className = `accordion-collapse collapse ${idx === 0 ? "show" : ""}`;
    body.setAttribute("aria-labelledby", headerId);
    body.setAttribute("data-bs-parent", "#moduleAccordion");

    const bodyInner = document.createElement("div");
    bodyInner.className = "accordion-body";

    (moduleRow.usecases || []).forEach((usecase) => {
      const link = document.createElement("a");
      link.className = "menu-link";
      link.href = usecase.linktolaunch || "#";
      link.dataset.usecase = usecase.codigo_usecase;
      link.dataset.launch = "true";
      link.textContent = usecaseLabel(usecase);
      bodyInner.appendChild(link);
    });

    body.appendChild(bodyInner);
    item.appendChild(header);
    item.appendChild(body);
    el.moduleAccordion.appendChild(item);
  });
}

function renderModuleGrid() {
  el.moduleGrid.innerHTML = "";
  if (!state.modules.length) {
    const empty = document.createElement("div");
    empty.className = "text-secondary";
    empty.textContent = t(locale, "emptyModules");
    el.moduleGrid.appendChild(empty);
    return;
  }
  state.modules.forEach((moduleRow) => {
    const card = document.createElement("div");
    card.className = "module-card";

    const title = document.createElement("div");
    title.className = "module-title";

    const icon = document.createElement("div");
    icon.className = "module-icon";
    icon.textContent = makeIconLabel(moduleLabel(moduleRow));

    const titleText = document.createElement("div");
    titleText.textContent = moduleLabel(moduleRow);

    title.appendChild(icon);
    title.appendChild(titleText);

    const list = document.createElement("div");
    list.className = "usecase-list";

    (moduleRow.usecases || []).forEach((usecase) => {
      const row = document.createElement("div");
      row.className = "d-flex align-items-center gap-2";

      const link = document.createElement("a");
      link.className = "usecase-link flex-grow-1";
      link.href = usecase.linktolaunch || "#";
      link.dataset.usecase = usecase.codigo_usecase;
      link.dataset.launch = "true";
      link.textContent = usecaseLabel(usecase);

      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "pin-btn";
      pin.dataset.pin = usecase.codigo_usecase;
      pin.textContent = state.pinned.has(usecase.codigo_usecase) ? t(locale, "unpin") : t(locale, "pin");
      if (state.pinned.has(usecase.codigo_usecase)) pin.classList.add("active");

      row.appendChild(link);
      row.appendChild(pin);
      list.appendChild(row);
    });

    card.appendChild(title);
    card.appendChild(list);
    el.moduleGrid.appendChild(card);
  });
}

function renderPinned() {
  el.pinnedGrid.innerHTML = "";
  const map = buildUsecaseMap();
  const pinned = Array.from(state.pinned).map((code) => map.get(code)).filter(Boolean);

  if (!pinned.length) {
    const empty = document.createElement("div");
    empty.className = "text-secondary";
    empty.textContent = t(locale, "emptyShortcuts");
    el.pinnedGrid.appendChild(empty);
    return;
  }

  pinned.forEach((usecase) => {
    const card = document.createElement("div");
    card.className = "shortcut-card";

    const icon = document.createElement("div");
    icon.className = "module-icon";
    icon.textContent = makeIconLabel(usecase.moduleName);

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.textContent = usecaseLabel(usecase);
    const meta = document.createElement("div");
    meta.className = "shortcut-meta";
    meta.textContent = usecase.moduleName;
    info.appendChild(name);
    info.appendChild(meta);

    const open = document.createElement("a");
    open.className = "btn btn-sm btn-outline-light";
    open.href = usecase.linktolaunch || "#";
    open.dataset.usecase = usecase.codigo_usecase;
    open.dataset.launch = "true";
    open.textContent = t(locale, "open");

    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(open);
    el.pinnedGrid.appendChild(card);
  });
}

function renderLauncher() {
  el.userName.textContent = state.user?.nombre || state.user?.codigo_usuario || "";
  el.userMeta.textContent = `${t(locale, "userMeta")}${state.user?.codigo_usuario ? ` · ${state.user.codigo_usuario}` : ""}`;
  renderMenu();
  renderModuleGrid();
  renderPinned();
}

async function reportError(message, detail) {
  if (!message) return;
  try {
    const headers = { "content-type": "application/json" };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    await fetch("/api/log/error", {
      method: "POST",
      headers,
      body: JSON.stringify({ message, detail }),
    });
  } catch {
    // ignore
  }
}

async function api(path, options = {}, { silent = false } = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    if (!silent) await reportError(err.message, JSON.stringify(data || {}));
    throw err;
  }
  return data;
}

async function handleLogin(event) {
  event.preventDefault();
  setAlert(el.loginAlert, "warning", "");

  if (!el.loginForm.checkValidity()) {
    el.loginForm.classList.add("was-validated");
    return;
  }

  setLoginLoading(true);
  try {
    const payload = {
      vUsuario: document.getElementById("vUsuario").value.trim(),
      vPassword: document.getElementById("vPassword").value,
    };
    console.log("[login] intento de login", { usuario: payload.vUsuario || "(vacio)" });
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      const code = Number(data?.code);
      const msg =
        code === 1 ? t(locale, "loginInvalidUser") : code === 2 ? t(locale, "loginInvalidPassword") : t(locale, "loginFailed");
      setAlert(el.loginAlert, "danger", msg);
      setLoginLoading(false);
      return;
    }

    state.token = data.token;
    state.user = data.user;
    state.modules = data.modules || [];
    state.usecases = data.usecases || [];
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify({ token: state.token }));
    loadPins();
    renderLauncher();
    showLauncher();
  } catch (err) {
    setAlert(el.loginAlert, "danger", t(locale, "loginFailed"));
    await reportError(err?.message || "login_failed", JSON.stringify(err));
  } finally {
    setLoginLoading(false);
  }
}

async function restoreSession() {
  const stored = localStorage.getItem(LS_SESSION_KEY);
  if (!stored) return;
  let data = null;
  try {
    data = JSON.parse(stored);
  } catch {
    return;
  }
  if (!data?.token) return;
  state.token = data.token;
  setProgress(true);
  try {
    const session = await api("/api/auth/session", { method: "GET" }, { silent: true });
    state.user = session.user;
    state.modules = session.modules || [];
    state.usecases = session.usecases || [];
    loadPins();
    renderLauncher();
    showLauncher();
  } catch {
    localStorage.removeItem(LS_SESSION_KEY);
    state.token = null;
    showLogin();
  } finally {
    setProgress(false);
  }
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" }, { silent: true });
  } catch {
    // ignore
  }
  state.token = null;
  state.user = null;
  state.modules = [];
  state.usecases = [];
  localStorage.removeItem(LS_SESSION_KEY);
  showLogin();
}

async function logTrace(usecase) {
  if (!usecase || !state.token) return;
  try {
    await api(
      "/api/log/trace",
      {
        method: "POST",
        body: JSON.stringify({ codigo_usecase: usecase }),
      },
      { silent: true }
    );
  } catch {
    // ignore
  }
}

function togglePin(usecase) {
  if (state.pinned.has(usecase)) {
    state.pinned.delete(usecase);
  } else {
    state.pinned.add(usecase);
  }
  savePins();
  renderModuleGrid();
  renderPinned();
}

function handleLauncherClick(event) {
  const pinBtn = event.target.closest("[data-pin]");
  if (pinBtn) {
    event.preventDefault();
    togglePin(pinBtn.dataset.pin);
    return;
  }

  const launchLink = event.target.closest("[data-launch]");
  if (!launchLink) return;
  const href = launchLink.getAttribute("href");
  const usecase = launchLink.dataset.usecase;
  if (!href || href === "#") return;
  event.preventDefault();
  logTrace(usecase).finally(() => {
    window.location.href = href;
  });
}

el.loginForm.addEventListener("submit", handleLogin);
el.btnLogout.addEventListener("click", handleLogout);
el.launcherPane.addEventListener("click", handleLauncherClick);

restoreSession();
