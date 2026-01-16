import { applyI18n, detectLocale, t } from "./i18nAjustes.js";
import { FormWizard } from "./formWizardAjustes.js";

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
      nextNum: "/api/ajustes/next-num",
      sqlLogs: "/api/sql-logs",
      crearAjuste: "/api/ajustes/crear",
    },
  });
  await wizard.init();
})();
