import { applyI18n, detectLocale, t } from "./i18nNotaCredito.js";
import { FormWizard } from "./formWizardNotaCredito.js";

const locale = detectLocale();
applyI18n(locale);

(async () => {
  const wizard = new FormWizard({
    locale,
    t,
    endpoints: {
      dbStatus: "/api/db-status",
      clients: "/api/clients",
      bases: "/api/bases",
      products: "/api/products",
      sqlLogs: "/api/sql-logs",
      emit: "/api/notas-credito/emitir",
    },
  });
  await wizard.init();
})();
