import { applyI18n, detectLocale, t } from "./i18nCompras.js";
import { FormWizard } from "./formWizardCompras.js";

const locale = detectLocale();
applyI18n(locale);

(async () => {
  const wizard = new FormWizard({
    locale,
    t,
    endpoints: {
      dbStatus: "/api/db-status",
      proveedores: "/api/proveedores",
      products: "/api/products",
      nextNum: "/api/compras/next-num",
      sqlLogs: "/api/sql-logs",
      facturar: "/api/compras/facturar",
    },
  });
  await wizard.init();
})();
