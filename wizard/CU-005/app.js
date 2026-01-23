import { applyI18n, detectLocale, t } from "./i18n.js";
import { FormWizard } from "./formWizard.js";

const locale = detectLocale();
applyI18n(locale);

const wizard = new FormWizard({
  locale,
  t,
  endpoints: {
    dbStatus: "/api/db-status",
    paquetesStandby: "/api/paquetes/standby",
    paqueteDetalle: (codigo) => `/api/paquetes/${encodeURIComponent(codigo)}/detalle`,
    confirmar: (codigo) => `/api/paquetes/${encodeURIComponent(codigo)}/confirmar`,
    sqlLogs: "/api/sql-logs",
  },
});

wizard.init();
