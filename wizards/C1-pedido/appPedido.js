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
      clientPuntosEntrega: (clientId) => `/api/clients/${clientId}/puntos-entrega`,
      clientNumrecibe: (clientId) => `/api/clients/${clientId}/numrecibe`,
      ubigeo: (codDep, codProv, codDist) =>
        `/api/ubigeo?cod_dep=${encodeURIComponent(codDep)}&cod_prov=${encodeURIComponent(
          codProv
        )}&cod_dist=${encodeURIComponent(codDist)}`,
      sqlLogs: "/api/sql-logs",
      emit: "/api/erp/emit",
    },
  });
  await wizard.init();
})();
