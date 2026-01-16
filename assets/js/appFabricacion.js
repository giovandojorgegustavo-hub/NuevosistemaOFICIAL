import { applyI18n, detectLocale, t } from "./i18nFabricacion.js";
import { FormWizard } from "./formWizardFabricacion.js";

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
      nextNum: "/api/fabricaciones/next-num",
      sqlLogs: "/api/sql-logs",
      crearFabricacion: "/api/fabricaciones/crear",
    },
  });
  await wizard.init();
})();
