import { applyI18n, detectLocale, t } from "./i18nRemito.js";
import { FormWizard } from "./formWizardRemito.js";

const locale = detectLocale();
applyI18n(locale);

(async () => {
  const wizard = new FormWizard({
    locale,
    t,
    endpoints: {
      dbStatus: "/api/db-status",
      bases: "/api/bases",
      products: "/api/products",
      nextNum: "/api/remitos/next-num",
      sqlLogs: "/api/sql-logs",
      crearRemito: "/api/remitos/crear",
    },
  });
  await wizard.init();
})();
