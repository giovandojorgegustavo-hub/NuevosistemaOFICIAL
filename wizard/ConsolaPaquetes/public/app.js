document.addEventListener('DOMContentLoaded', () => {
  const UNAUTHORIZED_MSG = 'Warning ACCESO NO AUTORIZADO !!!';

  const TEXT = {
    es: {
      title: 'Consola Paquetes',
      refresh: 'Actualizar',
      detail: 'Detalle del Paquete',
      hora: 'Hora',
      cliente: 'Cliente',
      direccion: 'Direccion de Entrega',
      producto: 'Producto',
      cantidad: 'Cantidad',
      loading: 'Cargando tablero...',
      loadingProducts: 'Cargando productos...',
      emptyProducts: 'Sin productos',
      cerrar: 'Cerrar',
      empacar: 'Empacar',
      despachar: 'Despachar',
      liquidar: 'Liquidar Paquete',
      standby: 'Procesar Standby',
      user: 'Usuario',
      statusDate: 'Fecha',
      statusConnectedUser: 'Usuario Conectado',
      statusTotalPackages: 'Total de Paquetes',
      actionNotImplemented: 'Accion no implementada',
      boardError: 'No se pudo cargar el tablero',
    },
    en: {
      title: 'Package Console',
      refresh: 'Refresh',
      detail: 'Package Detail',
      hora: 'Time',
      cliente: 'Client',
      direccion: 'Delivery Address',
      producto: 'Product',
      cantidad: 'Quantity',
      loading: 'Loading board...',
      loadingProducts: 'Loading products...',
      emptyProducts: 'No products',
      cerrar: 'Close',
      empacar: 'Pack',
      despachar: 'Dispatch',
      liquidar: 'Settle Package',
      standby: 'Process Standby',
      user: 'User',
      statusDate: 'Date',
      statusConnectedUser: 'Connected User',
      statusTotalPackages: 'Total Packages',
      actionNotImplemented: 'Action not implemented',
      boardError: 'Board load failed',
    },
  };

  const lang = String(navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  const t = (key) => TEXT[lang][key] || TEXT.es[key] || key;

  const params = new URLSearchParams(window.location.search || '');
  const Codigo_usuario = String(
    params.get('Codigo_usuario') || params.get('codigo_usuario') || params.get('vUsuario') || params.get('v_usuario') || ''
  ).trim();
  const OTP = String(params.get('OTP') || params.get('otp') || params.get('vOTP') || params.get('v_otp') || '').trim();
  const vParametros = params.get('vParametros') || '';

  const el = {
    board: document.getElementById('board'),
    alertArea: document.getElementById('alertArea'),
    sessionBadge: document.getElementById('sessionBadge'),
    btnRefresh: document.getElementById('btnRefresh'),
    toastContainer: document.getElementById('toastContainer'),
    modalTitle: document.getElementById('modalTitle'),
    lblHora: document.getElementById('lblHora'),
    lblCliente: document.getElementById('lblCliente'),
    lblDireccion: document.getElementById('lblDireccion'),
    thProducto: document.getElementById('thProducto'),
    thCantidad: document.getElementById('thCantidad'),
    valHora: document.getElementById('valHora'),
    valCliente: document.getElementById('valCliente'),
    valDireccion: document.getElementById('valDireccion'),
    gridProductos: document.getElementById('gridProductos'),
    modalActions: document.getElementById('modalActions'),
    statusSummary: document.getElementById('statusSummary'),
  };

  const modal = window.bootstrap ? new window.bootstrap.Modal(document.getElementById('packageModal')) : null;

  const state = {
    columns: [],
    packages: [],
    selected: null,
    hardcodedUser: '1',
    vPriv: '',
    vBase: '',
    sessionToken: '',
  };

  const MODULE_PORTS = {
    1: 4000,
    2: 4001,
    3: 4002,
    4: 4003,
    6: 4005,
    7: 4004,
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setLabels() {
    document.getElementById('titleApp').textContent = t('title');
    document.getElementById('txtRefresh').textContent = t('refresh');
    el.modalTitle.textContent = t('detail');
    el.lblHora.textContent = t('hora');
    el.lblCliente.textContent = t('cliente');
    el.lblDireccion.textContent = t('direccion');
    el.thProducto.textContent = t('producto');
    el.thCantidad.textContent = t('cantidad');
  }

  function showAlert(message, type = 'danger') {
    const safeType = /^[a-z-]+$/i.test(String(type || '')) ? String(type) : 'danger';
    el.alertArea.innerHTML = `<div class="alert alert-${safeType} alert-dismissible fade show" role="alert">${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
  }

  function showToast(message, type = 'danger') {
    if (!window.bootstrap || !el.toastContainer) {
      showAlert(message, type);
      return;
    }

    const wrapper = document.createElement('div');
    const safeType = /^[a-z-]+$/i.test(String(type || '')) ? String(type) : 'danger';
    wrapper.className = `toast text-bg-${safeType} border-0`;
    wrapper.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white m-auto me-2" data-bs-dismiss="toast"></button></div>`;

    el.toastContainer.appendChild(wrapper);
    const toast = new window.bootstrap.Toast(wrapper, { delay: 5000 });
    toast.show();
    wrapper.addEventListener('hidden.bs.toast', () => wrapper.remove());
  }

  async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.sessionToken) {
      headers.set('Authorization', `Bearer ${state.sessionToken}`);
    }
    const response = await fetch(url, { ...options, headers });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = payload?.detail ? `: ${payload.detail}` : '';
      throw new Error(`${payload?.message || payload?.error || 'Error'}${detail}`);
    }

    return payload;
  }

  function renderLoading() {
    el.board.innerHTML = `<div class="d-flex align-items-center justify-content-center w-100 pt-5">
      <div class="spinner-border text-primary me-3" role="status"></div><span>${t('loading')}</span></div>`;
  }

  function updateStatusBar() {
    if (!el.statusSummary) return;
    const currentDate = new Date().toLocaleString(lang, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const user = String(state.hardcodedUser || '-');
    const totalPackages = Array.isArray(state.packages) ? state.packages.length : 0;
    el.statusSummary.textContent =
      `${t('statusDate')}: ${currentDate} | ` +
      `${t('statusConnectedUser')}: ${user} | ` +
      `${t('statusTotalPackages')}: ${totalPackages}`;
  }

  function applyClientScopeFilter(packages) {
    const rows = Array.isArray(packages) ? packages : [];
    const vPriv = String(state.vPriv || '').trim().toUpperCase();
    const vBase = String(state.vBase || '').trim();
    const isGlobalScope = vPriv === 'ALL' || vPriv === 'PRIV';

    if (!vBase || isGlobalScope) {
      return rows;
    }

    return rows.filter((row) => String(row?.codigo_base ?? '').trim() === vBase);
  }

  function closeUnauthorizedPage() {
    showAlert(UNAUTHORIZED_MSG, 'danger');
    setTimeout(() => {
      try {
        window.close();
      } catch {}
      document.body.innerHTML = `<div class="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div class="alert alert-danger shadow-sm">${UNAUTHORIZED_MSG}</div></div>`;
    }, 500);
  }

  function renderBoard() {
    el.board.innerHTML = '';
    const byOrdinal = new Map();

    state.columns
      .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
      .forEach((column) => {
        const section = document.createElement('section');
        section.className = 'kanban-column';
        section.innerHTML = `<header class="column-header">
          <h6>${escapeHtml(column.titulo || 'Columna')}</h6>
          <span class="badge text-bg-secondary" id="count-${column.ordinal}">0</span>
        </header><div class="column-body" id="column-${column.ordinal}"></div>`;
        el.board.appendChild(section);
        byOrdinal.set(Number(column.ordinal), section.querySelector('.column-body'));
      });

    state.packages.forEach((pkg) => {
      const target = byOrdinal.get(Number(pkg.columna));
      if (!target) return;

      const card = document.createElement('article');
      card.className = 'card package-card';
      card.innerHTML = `<div class="card-body">
        <div class="card-id">#${escapeHtml(pkg.codigo_paquete || '-')}</div>
        <div class="card-client">${escapeHtml(pkg.nombre_cliente || '-')}</div>
        <div class="card-address"><i class="bi bi-geo-alt"></i> ${escapeHtml(pkg.concatenarpuntoentrega || '-')}</div>
        <div class="card-date"><i class="bi bi-clock"></i> ${escapeHtml(formatDate(pkg.fecha_registro))}</div>
      </div>`;

      card.addEventListener('dblclick', () => openPackageModal(pkg));
      target.appendChild(card);
    });

    byOrdinal.forEach((container, ordinal) => {
      const count = container.querySelectorAll('.package-card').length;
      const badge = document.getElementById(`count-${ordinal}`);
      if (badge) badge.textContent = String(count);
    });
  }

  function formatDate(value) {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return dt.toLocaleString(lang, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatTime(value) {
    if (!value) return '-';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return dt.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  async function openPackageModal(pkg) {
    state.selected = pkg;

    el.valHora.textContent = formatTime(pkg.fecha_registro);
    el.valCliente.textContent = pkg.nombre_cliente || '-';
    el.valDireccion.textContent = pkg.concatenarpuntoentrega || '-';
    el.gridProductos.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${t('loadingProducts')}</td></tr>`;

    renderActionButtons(Number(pkg.columna));
    if (modal) modal.show();

    try {
      const data = await apiFetch(
        `/api/productos?tipo_documento=${encodeURIComponent(pkg.tipo_documento)}&codigo_paquete=${encodeURIComponent(pkg.codigo_paquete)}`
      );
      const rows = Array.isArray(data.rows) ? data.rows : [];

      if (!rows.length) {
        el.gridProductos.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${t('emptyProducts')}</td></tr>`;
        return;
      }

      el.gridProductos.innerHTML = rows
        .map((row, idx) => `<tr>
          <td>${escapeHtml(row.ordinal || idx + 1)}</td>
          <td>${escapeHtml(row.nombre || '-')}</td>
          <td class="text-end">${escapeHtml(row.cantidad ?? 0)}</td>
        </tr>`)
        .join('');
    } catch (error) {
      el.gridProductos.innerHTML = `<tr><td colspan="3" class="text-center text-danger">${escapeHtml(error.message)}</td></tr>`;
      showToast(error.message, 'danger');
    }
  }

  function buildActionButton(label, classes, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${classes} me-auto`;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderActionButtons(column) {
    el.modalActions.innerHTML = '';

    const isOne = String(state.vPriv || '').trim().toUpperCase() === 'ONE';

    if (column === 1) {
      el.modalActions.appendChild(buildActionButton(t('empacar'), 'btn-primary', Empacar));
    } else if (column === 2 && !isOne) {
      el.modalActions.appendChild(
        buildActionButton(t('despachar'), 'btn-success', () => showToast(t('actionNotImplemented'), 'warning'))
      );
    } else if (column === 3 && !isOne) {
      el.modalActions.appendChild(buildActionButton(t('liquidar'), 'btn-warning', liquidarpaquete));
    } else if (column === 4 && !isOne) {
      el.modalActions.appendChild(buildActionButton(t('standby'), 'btn-info text-white', procesarStandBy));
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-secondary';
    closeBtn.setAttribute('data-bs-dismiss', 'modal');
    closeBtn.textContent = t('cerrar');
    el.modalActions.appendChild(closeBtn);
  }

  async function runAction(endpoint, body = null) {
    try {
      const actionBody = { ...(body || {}) };
      const payload = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionBody),
      });
      if (!payload.launchUrl) {
        throw new Error('No se obtuvo URL de lanzamiento');
      }
      const safeLaunchUrl = normalizeLaunchUrl(payload.launchUrl);
      if (!safeLaunchUrl) {
        throw new Error('URL de lanzamiento no confiable');
      }
      window.open(safeLaunchUrl, '_blank', 'noopener');
      if (modal) modal.hide();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  }

  function normalizeLaunchUrl(rawUrl) {
    const text = String(rawUrl || '').trim();
    if (!text) return '';

    try {
      const parsed = new URL(text, window.location.origin);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }

      const moduleMatch = parsed.pathname.match(/\/CU(\d+)(?:-(\d{1,3})|(\d{3}))?(?:\/|$)/i);
      const moduleNumber = moduleMatch ? Number(moduleMatch[1]) : NaN;
      const expectedPort = Number.isFinite(moduleNumber) ? MODULE_PORTS[moduleNumber] : null;
      if (!expectedPort) return '';

      const currentHost = window.location.hostname || parsed.hostname;
      parsed.protocol = window.location.protocol;
      parsed.hostname = currentHost;
      parsed.port = String(expectedPort);
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return '';
    }
  }

  async function Empacar() {
    if (!state.selected) {
      showToast(t('actionNotImplemented'), 'warning');
      return;
    }

    const ptipo_documento = String(state.selected.tipo_documento || '').trim();
    const pcodigo_paquete = String(state.selected.codigo_paquete || '').trim();

    if (!ptipo_documento || !pcodigo_paquete) {
      showToast('tipo_documento y codigo_paquete son obligatorios', 'danger');
      return;
    }

    await runAction('/api/empacar', { ptipo_documento, pcodigo_paquete });
  }

  async function liquidarpaquete() {
    if (!state.selected) {
      showToast(t('actionNotImplemented'), 'warning');
      return;
    }

    const ptipo_documento = String(state.selected.tipo_documento || '').trim();
    const pcodigo_paquete = String(state.selected.codigo_paquete || '').trim();

    if (!ptipo_documento || !pcodigo_paquete) {
      showToast('tipo_documento y codigo_paquete son obligatorios', 'danger');
      return;
    }

    await runAction('/api/liquidar', { ptipo_documento, pcodigo_paquete });
  }

  async function procesarStandBy() {
    if (!state.selected) {
      showToast(t('actionNotImplemented'), 'warning');
      return;
    }

    const ptipo_documento = String(state.selected.tipo_documento || '').trim();
    const pcodigo_paquete = String(state.selected.codigo_paquete || '').trim();

    if (!ptipo_documento || !pcodigo_paquete) {
      showToast('tipo_documento y codigo_paquete son obligatorios', 'danger');
      return;
    }

    await runAction('/api/standby', { ptipo_documento, pcodigo_paquete });
  }

  async function loadBoard() {
    if (!Codigo_usuario || !OTP) {
      closeUnauthorizedPage();
      return;
    }

    renderLoading();

    try {
      const url = `/api/init?Codigo_usuario=${encodeURIComponent(Codigo_usuario)}&OTP=${encodeURIComponent(OTP)}${
        vParametros ? `&vParametros=${encodeURIComponent(vParametros)}` : ''
      }`;

      const data = await apiFetch(url);
      state.columns = Array.isArray(data.columns) ? data.columns : [];
      const rawPackages = Array.isArray(data.packages) ? data.packages : [];
      state.hardcodedUser = String(data.vUsuario || Codigo_usuario || '1');
      state.vPriv = String(data.vPriv || '').trim().toUpperCase();
      state.vBase = String(data.vBase || '').trim();
      state.packages = applyClientScopeFilter(rawPackages);
      state.sessionToken = String(data.sessionToken || '').trim();
      const scopeText = [state.vPriv || '', state.vBase ? `BASE ${state.vBase}` : ''].filter(Boolean).join(' | ');
      el.sessionBadge.textContent = t('user') + ': ' + state.hardcodedUser + (scopeText ? ' | ' + scopeText : '');

      renderBoard();
      updateStatusBar();
      el.alertArea.innerHTML = '';
    } catch (error) {
      if (error.message.includes(UNAUTHORIZED_MSG)) {
        closeUnauthorizedPage();
        return;
      }
      showAlert(`${t('boardError')}: ${error.message}`, 'danger');
      showToast(error.message, 'danger');
    }
  }

  setLabels();
  updateStatusBar();
  setInterval(updateStatusBar, 1000);
  el.btnRefresh.addEventListener('click', loadBoard);
  loadBoard();

  window.Empacar = Empacar;
  window.liquidarpaquete = liquidarpaquete;
  window.procesarStandBy = procesarStandBy;
});
