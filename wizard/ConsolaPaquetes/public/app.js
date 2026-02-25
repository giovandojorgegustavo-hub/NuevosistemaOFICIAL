document.addEventListener('DOMContentLoaded', () => {
  const dict = {
    es: {
      title: 'Consola de Paquetes',
      refresh: 'Actualizar',
      unauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
      boardError: 'No se pudieron cargar los datos',
      loadBoard: 'Cargando tablero...',
      detail: 'Detalle del Paquete',
      client: 'Cliente',
      time: 'Hora',
      address: 'Direccion',
      product: 'Producto',
      qty: 'Cantidad',
      noProducts: 'Sin productos',
      loadingProducts: 'Cargando productos...',
      close: 'Cerrar',
      notImplemented: 'Accion no implementada aun',
      settle: 'Liquidar Paquete',
      pack: 'Empacar',
      dispatch: 'Despachar',
      standby: 'Procesar Standby',
      session: 'Usuario',
      restrictedAction: 'Usuario ONE: solo esta permitido Empacar',
    },
    en: {
      title: 'Package Console',
      refresh: 'Refresh',
      unauthorized: 'Warning UNAUTHORIZED ACCESS !!!',
      boardError: 'Failed to load data',
      loadBoard: 'Loading board...',
      detail: 'Package Detail',
      client: 'Client',
      time: 'Time',
      address: 'Address',
      product: 'Product',
      qty: 'Qty',
      noProducts: 'No products',
      loadingProducts: 'Loading products...',
      close: 'Close',
      notImplemented: 'Action not implemented yet',
      settle: 'Settle Package',
      pack: 'Pack',
      dispatch: 'Dispatch',
      standby: 'Process Standby',
      session: 'User',
      restrictedAction: 'ONE scope user: only Pack is allowed',
    },
  };

  const lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  const t = (key) => dict[lang][key] || key;

  const params = new URLSearchParams(window.location.search || '');
  const vUsuario = Number(params.get('vUsuario') || params.get('v_usuario') || params.get('Codigo_usuario') || 1) || 1;
  const vOTP = String(params.get('vOTP') || params.get('v_otp') || params.get('OTP') || '').trim();

  const board = document.getElementById('board');
  const refreshBtn = document.getElementById('btn-refresh');
  const alertContainer = document.getElementById('alert-container');
  const toastContainer = document.getElementById('toast-container');
  const sessionUser = document.getElementById('session-user');

  const modalElement = document.getElementById('packageModal');
  const hasBootstrap = Boolean(window.bootstrap);
  const modal = hasBootstrap && modalElement ? new window.bootstrap.Modal(modalElement) : null;
  const modalClient = document.getElementById('modal-client');
  const modalTime = document.getElementById('modal-time');
  const modalAddress = document.getElementById('modal-address');
  const modalBody = document.getElementById('modal-grid-body');
  const modalActions = document.getElementById('modal-footer-actions');

  let selectedPackage = null;
  let userScope = { vPriv: 'ALL', canLaunchAll: true, vBase: '' };

  function setStaticLabels() {
    document.getElementById('title-app').textContent = t('title');
    document.getElementById('txt-refresh').textContent = t('refresh');
    document.getElementById('packageModalLabel').textContent = t('detail');
    document.getElementById('lbl-client').textContent = t('client');
    document.getElementById('lbl-time').textContent = t('time');
    document.getElementById('lbl-address').textContent = t('address');
    document.getElementById('th-product').textContent = t('product');
    document.getElementById('th-qty').textContent = t('qty');
    sessionUser.textContent = `${t('session')}: ${vUsuario}`;
  }

  function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  function showToast(message, type = 'danger') {
    if (!hasBootstrap || !toastContainer || !window.bootstrap?.Toast) {
      showAlert(message, type);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = `toast text-bg-${type} border-0`;
    wrapper.role = 'alert';
    wrapper.ariaLive = 'assertive';
    wrapper.ariaAtomic = 'true';
    wrapper.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white m-auto me-2" data-bs-dismiss="toast"></button>
      </div>`;
    toastContainer.appendChild(wrapper);
    const toast = new bootstrap.Toast(wrapper, { delay: 4500 });
    toast.show();
    wrapper.addEventListener('hidden.bs.toast', () => wrapper.remove());
  }

  async function apiFetch(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.detail ? `: ${data.detail}` : '';
      throw new Error(`${data?.message || data?.error || 'Error'}${detail}`);
    }
    return data;
  }

  function renderLoading() {
    board.innerHTML = `
      <div class="d-flex align-items-center justify-content-center w-100 pt-5">
        <div class="spinner-border text-success me-3" role="status"></div>
        <span>${t('loadBoard')}</span>
      </div>
    `;
  }

  function renderBoard(columns, packages) {
    board.innerHTML = '';
    const colMap = new Map();

    columns
      .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
      .forEach((col) => {
        const colSection = document.createElement('section');
        colSection.className = 'kanban-column';
        colSection.innerHTML = `
          <header class="column-head">
            <h6>${col.titulo || 'Columna'}</h6>
            <span class="badge badge-count" id="count-${col.ordinal}">0</span>
          </header>
          <div class="column-body" id="col-${col.ordinal}"></div>
        `;
        board.appendChild(colSection);
        colMap.set(Number(col.ordinal), colSection.querySelector('.column-body'));
      });

    (packages || []).forEach((pkg) => {
      const body = colMap.get(Number(pkg.columna));
      if (!body) return;

      const card = document.createElement('article');
      card.className = 'package-card card';
      card.innerHTML = `
        <div class="card-body">
          <div class="package-id">#${pkg.codigo_paquete || '-'}</div>
          <div class="package-client">${pkg.nombre_cliente || '-'}</div>
          <div class="package-address"><i class="bi bi-geo-alt"></i> ${pkg.concatenarpuntoentrega || '-'}</div>
        </div>
      `;
      card.addEventListener('dblclick', () => openModal(pkg));
      body.appendChild(card);
    });

    colMap.forEach((body, ordinal) => {
      const count = body.querySelectorAll('.package-card').length;
      const badge = document.getElementById(`count-${ordinal}`);
      if (badge) badge.textContent = String(count);
    });
  }

  async function openModal(pkg) {
    selectedPackage = pkg;
    modalClient.textContent = pkg.nombre_cliente || '-';
    modalAddress.textContent = pkg.concatenarpuntoentrega || '-';

    const when = pkg.fecha_registro ? new Date(pkg.fecha_registro) : null;
    modalTime.textContent = when && !Number.isNaN(when.getTime())
      ? when.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
      : '-';

    modalBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${t('loadingProducts')}</td></tr>`;
    renderActionButtons(pkg.columna);
    if (!modal) {
      showToast('UI modal no disponible (bootstrap.js no cargado)', 'warning');
      return;
    }
    modal.show();

    try {
      const products = await apiFetch(`/api/details/${encodeURIComponent(pkg.tipo_documento)}/${encodeURIComponent(pkg.codigo_paquete)}`);
      if (!Array.isArray(products) || !products.length) {
        modalBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${t('noProducts')}</td></tr>`;
        return;
      }

      modalBody.innerHTML = '';
      products.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.ordinal || index + 1}</td>
          <td>${item.nombre || '-'}</td>
          <td class="text-end">${item.cantidad ?? 0}</td>
        `;
        modalBody.appendChild(tr);
      });
    } catch (error) {
      modalBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">${error.message}</td></tr>`;
      showToast(error.message);
    }
  }

  function createActionButton(label, classes, icon) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${classes} me-auto`;
    button.innerHTML = `<i class="bi ${icon} me-1"></i>${label}`;
    return button;
  }

  function actionAllowed(actionKey) {
    if (userScope?.canLaunchAll) return true;
    return String(actionKey || '').toLowerCase() === 'empacar';
  }

  function applyActionScope(button, actionKey) {
    if (!button) return;
    if (actionAllowed(actionKey)) return;
    button.disabled = true;
    button.classList.add('disabled');
    button.title = t('restrictedAction');
  }

  function renderActionButtons(column) {
    modalActions.innerHTML = '';

    let action = null;
    switch (Number(column)) {
      case 1:
        action = createActionButton(t('pack'), 'btn-primary', 'bi-box-seam');
        action.id = 'btn-empacar';
        action.addEventListener('click', empacarPaquete);
        applyActionScope(action, 'empacar');
        break;
      case 2:
        action = createActionButton(t('dispatch'), 'btn-success', 'bi-truck');
        break;
      case 3:
        action = createActionButton(t('settle'), 'btn-warning', 'bi-cash-coin');
        action.id = 'btn-liquidar';
        action.addEventListener('click', liquidarPaquete);
        applyActionScope(action, 'encamino');
        break;
      case 4:
        action = createActionButton(t('standby'), 'btn-info text-white', 'bi-hourglass-split');
        action.id = 'btn-standby';
        action.addEventListener('click', standbyPaquete);
        applyActionScope(action, 'standby');
        break;
      default:
        break;
    }

    if (action && action.id !== 'btn-liquidar' && action.id !== 'btn-empacar' && action.id !== 'btn-standby') {
      action.addEventListener('click', () => showToast(t('notImplemented'), 'warning'));
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn btn-secondary';
    close.setAttribute('data-bs-dismiss', 'modal');
    close.textContent = t('close');

    if (action) modalActions.appendChild(action);
    modalActions.appendChild(close);
  }

  async function liquidarPaquete() {
    const button = document.getElementById('btn-liquidar');
    if (!button) return;
    await launchUsecase(button, 'encamino', 'liquidar');
  }

  async function standbyPaquete() {
    const button = document.getElementById('btn-standby');
    if (!button) return;
    await launchUsecase(button, 'standby', 'standby');
  }

  async function empacarPaquete() {
    const button = document.getElementById('btn-empacar');
    if (!button) return;
    await launchUsecase(button, 'empacar', 'empacar');
  }

  async function launchUsecase(button, action, endpoint) {
    const oldHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>';

    try {
      const payload = {
        vUsuario,
        tipo_documento: selectedPackage?.tipo_documento,
        codigo_paquete: selectedPackage?.codigo_paquete,
        action,
      };

      const result = await apiFetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!result.url) {
        throw new Error('URL de lanzamiento no disponible');
      }

      window.open(result.url, '_blank', 'noopener');
      if (modal) modal.hide();
      await loadBoard();
    } catch (error) {
      showToast(error.message, 'danger');
      button.disabled = false;
      button.innerHTML = oldHtml;
    }
  }

  async function validateSessionIfNeeded() {
    if (!vOTP) return true;
    try {
      const result = await apiFetch(`/api/session/validate?v_usuario=${encodeURIComponent(vUsuario)}&v_otp=${encodeURIComponent(vOTP)}`);
      return Boolean(result?.authorized);
    } catch (error) {
      showAlert(t('unauthorized'));
      setTimeout(() => {
        window.close();
      }, 500);
      return false;
    }
  }

  async function loadUserScope() {
    try {
      const scope = await apiFetch(`/api/user-scope?v_usuario=${encodeURIComponent(vUsuario)}`);
      userScope = {
        vPriv: String(scope?.vPriv || 'ONE').toUpperCase(),
        canLaunchAll: Boolean(scope?.canLaunchAll),
        vBase: String(scope?.vBase || ''),
      };
    } catch (error) {
      userScope = { vPriv: 'ALL', canLaunchAll: true, vBase: '' };
    }
  }

  async function loadBoard() {
    renderLoading();
    try {
      const columns = await apiFetch('/api/board-config');
      const packages = await apiFetch(`/api/packages?v_usuario=${encodeURIComponent(vUsuario)}`);
      renderBoard(columns, packages);
    } catch (error) {
      showAlert(`${t('boardError')}: ${error.message}`);
      board.innerHTML = '';
    }
  }

  async function bootstrap() {
    setStaticLabels();

    const authorized = await validateSessionIfNeeded();
    if (!authorized) return;
    await loadUserScope();

    if (refreshBtn) refreshBtn.addEventListener('click', loadBoard);
    loadBoard();
  }

  bootstrap();
});
