import { applyI18n, detectLocale, t } from "./i18nRecibosProvedores.js";
import { FormWizard } from "./formWizardRecibosProvedores.js";

const locale = detectLocale();
applyI18n(locale);

(async () => {
  const wizard = new FormWizard({
    locale,
    t,
    endpoints: {
      dbStatus: "/api/db-status",
      proveedores: "/api/proveedores",
      sqlLogs: "/api/sql-logs",
      register: "/api/recibos-provedores/registrar",
    },
  });
  await wizard.init();
})();
