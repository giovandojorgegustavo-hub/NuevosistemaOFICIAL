export function detectLocale() {
  const lang = (navigator.language || "es").toLowerCase();
  return lang.startsWith("es") ? "es" : "en";
}

const DICT = {
  es: {
    title: "Nota de credito",
    subtitle: "Wizard IaaS/PaaS para emitir notas de credito con trazabilidad y autosave.",
    reset: "Reiniciar",
    sqlLogs: "Logs SQL",
    step1Title: "Paso 1 · Crear nota de credito",
    autosave: "Auto-guardado",
    issueDate: "Fecha de emision",
    client: "Cliente",
    docType: "Tipo documento",
    base: "Base (opcional)",
    gridTitle: "Detalle de productos",
    gridHint: "Agrega productos si seleccionaste una base.",
    addLine: "Agregar linea",
    productCode: "Codigo producto",
    quantity: "Cantidad",
    emitNote: "Emitir nota de credito",
    status: "Estado",
    idle: "Listo.",
    prev: "Anterior",
    next: "Siguiente",
    footer: "Bootstrap 5.3 · HTML5 · JavaScript ES6+",
    confirmTitle: "Confirmar",
    confirmBody: "¿Confirmas la operacion?",
    cancel: "Cancelar",
    confirm: "Confirmar",
    close: "Cerrar",
    close: "Cerrar",
    requiredField: "Campo requerido.",
    invalidNumber: "Numero invalido.",
    invalidQty: "Cantidad invalida.",
    loading: "Cargando...",
    error: "Error",
    dbConnecting: "Conectando a la base de datos…",
    dbConnected: "Conexion OK",
    dbFailed: "No se pudo conectar a la base de datos",
    restored: "Se restauro un borrador guardado.",
    noDraft: "No hay borrador guardado.",
    draftCleared: "Borrador eliminado.",
    validationError: "Revisa los campos marcados.",
    emitOk: "Nota de credito emitida correctamente.",
    selectClient: "Selecciona…",
    selectBase: "Opcional",
    selectProduct: "Selecciona producto…",
  },
  en: {
    title: "Credit note",
    subtitle: "IaaS/PaaS wizard to issue credit notes with traceability and autosave.",
    reset: "Reset",
    sqlLogs: "SQL logs",
    step1Title: "Step 1 · Create credit note",
    autosave: "Auto-save",
    issueDate: "Issue date",
    client: "Client",
    docType: "Document type",
    base: "Base (optional)",
    gridTitle: "Product detail",
    gridHint: "Add products when a base is selected.",
    addLine: "Add line",
    productCode: "Product code",
    quantity: "Quantity",
    emitNote: "Issue credit note",
    status: "Status",
    idle: "Ready.",
    prev: "Previous",
    next: "Next",
    footer: "Bootstrap 5.3 · HTML5 · JavaScript ES6+",
    confirmTitle: "Confirm",
    confirmBody: "Do you want to confirm this operation?",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    close: "Close",
    requiredField: "Required field.",
    invalidNumber: "Invalid number.",
    invalidQty: "Invalid quantity.",
    loading: "Loading...",
    error: "Error",
    dbConnecting: "Connecting to database…",
    dbConnected: "Connection OK",
    dbFailed: "Could not connect to the database",
    restored: "A saved draft was restored.",
    noDraft: "No saved draft.",
    draftCleared: "Draft cleared.",
    validationError: "Please review the highlighted fields.",
    emitOk: "Credit note issued successfully.",
    selectClient: "Select…",
    selectBase: "Optional",
    selectProduct: "Select product…",
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
