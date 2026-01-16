import { applyI18n, detectLocale, t } from "./i18nPagos.js";
import { FormWizard } from "./formWizardPagos.js";

const locale = detectLocale();
applyI18n(locale);

(async () => {
  const wizard = new FormWizard({
    locale,
    t,
    endpoints: {
      dbStatus: "/api/db-status",
      cuentas: "/api/cuentasbancarias",
      sqlLogs: "/api/sql-logs",
      register: "/api/pagos/registrar",
    },
  });
  await wizard.init();
})();
