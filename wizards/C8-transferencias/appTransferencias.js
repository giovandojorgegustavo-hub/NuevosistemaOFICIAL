import { applyI18n, detectLocale, t } from "./i18nTransferencias.js";
import { FormWizard } from "./formWizardTransferencias.js";

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
      nextNum: "/api/transferencias/next-num",
      sqlLogs: "/api/sql-logs",
      crearTransferencia: "/api/transferencias/crear",
    },
  });
  await wizard.init();
})();
