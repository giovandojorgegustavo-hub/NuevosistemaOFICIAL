export function detectLocale() {
  const lang = (navigator.language || "es").toLowerCase();
  return lang.startsWith("es") ? "es" : "en";
}

const DICT = {
  es: {
    brandOverline: "Global SaaS Control",
    brandTitle: "Launcher ERP",
    brandSubtitle: "Acceso seguro a modulos, apps y tableros para operaciones multinacionales.",
    userLabel: "Usuario",
    passwordLabel: "Password",
    requiredField: "Campo requerido.",
    login: "Login",
    loginHint: "Las credenciales se validan en tiempo real contra tu base de datos ERP.",
    sideTitle: "Control global en una sola vista",
    sideCopy:
      "Administra las operaciones de tu ERP SaaS desde un launcher diseñado para equipos distribuidos y despliegues de alta disponibilidad.",
    feature1: "Accesos dinamicos por perfil",
    feature2: "Rastreo de sesiones y trazas",
    feature3: "Arquitectura segura, preparada para auditorias",
    launcherTitle: "Panel de modulos",
    launcherSubtitle: "Acceso rapido a tus apps y casos de uso asignados.",
    userMeta: "Sesion activa",
    logout: "Logout",
    modulesMenu: "Modulos disponibles",
    modulesHint: "Selecciona un caso de uso para abrir la app.",
    shortcutsTitle: "Accesos directos",
    shortcutsHint: "Marca tus modulos favoritos para fijarlos aqui.",
    modulesTitle: "Apps y casos de uso",
    modulesCopy: "Explora los modulos asignados a tu usuario.",
    loginInvalidUser: "Usuario no encontrado.",
    loginInvalidPassword: "Password incorrecta.",
    loginFailed: "No se pudo iniciar sesion.",
    loading: "Cargando...",
    emptyShortcuts: "Aun no tienes accesos directos.",
    emptyModules: "No hay modulos asignados.",
    open: "Abrir",
    pin: "Fijar",
    unpin: "Soltar",
  },
  en: {
    brandOverline: "Global SaaS Control",
    brandTitle: "ERP Launcher",
    brandSubtitle: "Secure access to modules, apps, and dashboards for multinational operations.",
    userLabel: "User",
    passwordLabel: "Password",
    requiredField: "Required field.",
    login: "Login",
    loginHint: "Credentials are validated in real time against your ERP database.",
    sideTitle: "Global control in a single view",
    sideCopy:
      "Manage ERP SaaS operations from a launcher designed for distributed teams and high availability deployments.",
    feature1: "Dynamic access by profile",
    feature2: "Session and trace logging",
    feature3: "Secure architecture, audit ready",
    launcherTitle: "Module panel",
    launcherSubtitle: "Quick access to your assigned apps and use cases.",
    userMeta: "Active session",
    logout: "Logout",
    modulesMenu: "Available modules",
    modulesHint: "Select a use case to open the app.",
    shortcutsTitle: "Shortcuts",
    shortcutsHint: "Pin your favorite modules here.",
    modulesTitle: "Apps and use cases",
    modulesCopy: "Explore the modules assigned to your user.",
    loginInvalidUser: "User not found.",
    loginInvalidPassword: "Incorrect password.",
    loginFailed: "Unable to sign in.",
    loading: "Loading...",
    emptyShortcuts: "No shortcuts yet.",
    emptyModules: "No modules assigned.",
    open: "Open",
    pin: "Pin",
    unpin: "Unpin",
  },
};

export function t(locale, key) {
  return DICT[locale]?.[key] ?? DICT.es[key] ?? key;
}

export function applyI18n(locale) {
  document.documentElement.lang = locale;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(locale, key);
  }
}
