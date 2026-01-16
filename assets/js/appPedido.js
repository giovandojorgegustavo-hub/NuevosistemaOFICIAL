import { applyI18n, detectLocale, t } from "./i18nPedido.js";
import { FormWizard } from "./formWizardPedido.js";

const locale = detectLocale();
applyI18n(locale);

(async () => {
  const wizard = new FormWizard({
    locale,
    t,
    endpoints: {
      dbStatus: "/api/db-status",
      clients: "/api/clients",
      products: "/api/products",
      bases: "/api/bases",
      packings: "/api/packings",
      clientDirecciones: (clientId) => `/api/clients/${clientId}/direcciones`,
      clientDireccionesProv: (clientId) => `/api/clients/${clientId}/direccionesprov`,
      clientNumrecibe: (clientId) => `/api/clients/${clientId}/numrecibe`,
      sqlLogs: "/api/sql-logs",
      emit: "/api/erp/emit",
    },
  });
  await wizard.init();
})();
