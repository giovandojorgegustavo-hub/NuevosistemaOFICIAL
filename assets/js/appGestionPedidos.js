import { applyI18n, detectLocale, t } from "./i18nGestionPedidos.js";
import { FormWizard } from "./formWizardGestionPedidos.js";

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
      pedidosPendientes: ({ clientId, fecha }) => {
        const params = new URLSearchParams();
        if (clientId) params.set("clienteId", clientId);
        if (fecha) params.set("fecha", fecha);
        const qs = params.toString();
        return qs ? `/api/pedidos/pendientes?${qs}` : "/api/pedidos/pendientes";
      },
      pedidoDetalle: (pedidoId) => `/api/pedidos/${pedidoId}/detalle`,
      clientDirecciones: (clientId) => `/api/clients/${clientId}/direcciones`,
      clientDireccionesProv: (clientId) => `/api/clients/${clientId}/direccionesprov`,
      clientNumrecibe: (clientId) => `/api/clients/${clientId}/numrecibe`,
      sqlLogs: "/api/sql-logs",
      emit: "/api/pedidos/emitir",
    },
  });
  await wizard.init();
})();
