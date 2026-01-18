export function detectLocale() {
  const lang = (navigator.language || "es").toLowerCase();
  return lang.startsWith("es") ? "es" : "en";
}

const DICT = {
  es: {
    title: "Registro de recibos provedores",
    subtitle: "Wizard IaaS/PaaS para recibos de provedores con validaciones, trazabilidad y autosave.",
    reset: "Reiniciar",
    sqlLogs: "Logs SQL",
    step1Title: "Registrar recibo",
    autosave: "Auto-guardado",
    paymentDate: "Fecha",
    docType: "Tipo documento",
    docNumber: "# Documento",
    provider: "Proveedor",
    registerReceipt: "Registrar recibo",
    status: "Estado",
    idle: "Listo.",
    footer: "Bootstrap 5.3 - HTML5 - JavaScript ES6+",
    confirmTitle: "Confirmar",
    confirmBody: "Confirmas la operacion?",
    cancel: "Cancelar",
    confirm: "Confirmar",
    close: "Cerrar",
    requiredField: "Campo requerido.",
    loading: "Cargando...",
    error: "Error",
    dbConnecting: "Conectando a la base de datos...",
    dbConnected: "Conexion OK",
    dbFailed: "No se pudo conectar a la base de datos",
    restored: "Se restauro un borrador guardado.",
    noDraft: "No hay borrador guardado.",
    draftCleared: "Borrador eliminado.",
    validationError: "Revisa los campos marcados.",
    registerOk: "Recibo registrado correctamente.",
    selectProvider: "Selecciona proveedor...",
    auto: "Auto",
  },
  en: {
    title: "Supplier receipts",
    subtitle: "IaaS/PaaS wizard for supplier receipts with validation, traceability, and autosave.",
    reset: "Reset",
    sqlLogs: "SQL logs",
    step1Title: "Register receipt",
    autosave: "Auto-save",
    paymentDate: "Date",
    docType: "Document type",
    docNumber: "Document #",
    provider: "Supplier",
    registerReceipt: "Register receipt",
    status: "Status",
    idle: "Ready.",
    footer: "Bootstrap 5.3 - HTML5 - JavaScript ES6+",
    confirmTitle: "Confirm",
    confirmBody: "Confirm this operation?",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    requiredField: "Required field.",
    loading: "Loading...",
    error: "Error",
    dbConnecting: "Connecting to database...",
    dbConnected: "Connection OK",
    dbFailed: "Could not connect to the database",
    restored: "A saved draft was restored.",
    noDraft: "No saved draft.",
    draftCleared: "Draft cleared.",
    validationError: "Please review the highlighted fields.",
    registerOk: "Receipt registered successfully.",
    selectProvider: "Select supplier...",
    auto: "Auto",
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
