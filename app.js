document.addEventListener('DOMContentLoaded', () => {
  const lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  document.documentElement.lang = lang;

  const i18n = {
    es: {
      refresh: 'Actualizar',
      loading: 'Cargando...',
      boardError: 'No se pudieron cargar los datos del tablero',
      unauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
      packageDetail: 'Detalle del Paquete',
      hora: 'Hora:',
      cliente: 'Cliente:',
      direccion: 'Dirección de Entrega:',
      grid: 'vGrid - Productos del Paquete',
      producto: 'Producto',
      cantidad: 'Cantidad',
      cerrar: 'Cerrar',
      empacar: 'Empacar',
      despachar: 'Despachar',
      liquidar: 'Liquidar Paquete',
      standby: 'Procesar Standby',
      noProducts: 'No hay productos para este paquete',
      loadingProducts: 'Cargando productos...',
      actionPending: 'Acción disponible visualmente, implementación pendiente para este estado.',
      launchError: 'No se pudo abrir el caso de uso',
    },
    en: {
      refresh: 'Refresh',
      loading: 'Loading...',
      boardError: 'Could not load board data',
      unauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
      packageDetail: 'Package Detail',
      hora: 'Time:',
      cliente: 'Client:',
      direccion: 'Delivery Address:',
      grid: 'vGrid - Package Products',
      producto: 'Product',
      cantidad: 'Qty',
      cerrar: 'Close',
      empacar: 'Pack',
      despachar: 'Dispatch',
      liquidar: 'Settle Package',
      standby: 'Process Standby',
      noProducts: 'No products for this package',
      loadingProducts: 'Loading products...',
      actionPending: 'Action shown by requirement; implementation is pending for this status.',
      launchError: 'Could not launch use case',
    },
  };
  const t = (key) => i18n[lang][key] || key;

  const appShell = document.getElementById('app-shell');
  const unauthorizedWrap = document.getElementById('unauthorized-wrap');
  const unauthorizedMessage = document.getElementById('unauthorized-message');
  const board = document.getElementById('board');
  const btnRefresh = document.getElementById('btn-refresh');

  const modalEl = document.getElementById('packageModal');
  const modal = new bootstrap.Modal(modalEl);
  const packageModalLabel = document.getElementById('packageModalLabel');
  const lblHora = document.getElementById('lblHora');
  const lblCliente = document.getElementById('lblCliente');
  const lblDireccion = document.getElementById('lblDireccion');
  const lblGrid = document.getElementById('lblGrid');
  const thProducto = document.getElementById('thProducto');
  const thCantidad = document.getElementById('thCantidad');
  const modalHora = document.getElementById('modalHora');
  const modalCliente = document.getElementById('modalCliente');
  const modalDireccion = document.getElementById('modalDireccion');
  const modalGridBody = document.getElementById('modalGridBody');
  const modalActions = document.getElementById('modalActions');
  const toastContainer = document.getElementById('toastContainer');

  let boardColumns = [];
  let boardPackages = [];
  let selectedPackage = null;
  let sessionQuery = null;

  function setLabels() {
    btnRefresh.textContent = t('refresh');
    packageModalLabel.textContent = t('packageDetail');
    lblHora.textContent = t('hora');
    lblCliente.textContent = t('cliente');
    lblDireccion.textContent = t('direccion');
    lblGrid.textContent = t('grid');
    thProducto.textContent = t('producto');
    thCantidad.textContent = t('cantidad');
  }

  function showToast(message, level = 'danger') {
    const node = document.createElement('div');
    node.className = `toast align-items-center text-bg-${level} border-0`;
    node.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    toastContainer.appendChild(node);
    const toast = new bootstrap.Toast(node, { delay: 5000 });
    toast.show();
    node.addEventListener('hidden.bs.toast', () => node.remove());
  }

  function showLoading() {
    board.innerHTML = `
      <div class="d-flex justify-content-center w-100 align-items-center">
        <div class="spinner-border text-primary" role="status"><span class="visually-hidden">${t('loading')}</span></div>
      </div>
    `;
  }

  function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    const Codigo_usuario = (params.get('Codigo_usuario') || '').trim();
    const OTP = (params.get('OTP') || '').trim();
    const rawVParametros = params.get('vParametros');

    let vParametros = null;
    if (rawVParametros) {
      try {
        vParametros = JSON.parse(rawVParametros);
      } catch {
        vParametros = null;
      }
    }

    return { Codigo_usuario, OTP, vParametros };
  }

  function denyAccessAndClose() {
    appShell.style.display = 'none';
    unauthorizedWrap.classList.add('show');
    unauthorizedMessage.textContent = 'Warning ACCESO NO AUTORIZADO !!!';

    // Intento de cierre segun requerimiento. Si el navegador no lo permite, se vacia la app.
    setTimeout(() => {
      window.close();
      if (!window.closed) {
        document.body.innerHTML = `<div class="p-3"><div class="alert alert-danger fw-bold">Warning ACCESO NO AUTORIZADO !!!</div></div>`;
      }
    }, 300);
  }

  async function fetchJSON(url, options) {
    const res = await fetch(url, options);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = json?.detail ? `: ${json.detail}` : '';
      const message = json?.message || json?.error || 'Error';
      throw new Error(`${message}${detail}`);
    }
    return json;
  }

  function formatDateForCard(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString(lang, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function createPackageCard(pkg) {
    const card = document.createElement('div');
    card.className = 'card package-card shadow-sm';
    card.innerHTML = `
      <div class="card-body">
        <div class="card-id">#${pkg.codigo_paquete ?? '-'}</div>
        <div class="fw-semibold">${pkg.nombre_cliente || '-'}</div>
        <div class="small text-muted">${pkg.concatenarpuntoentrega || '-'}</div>
        <div class="card-date">${formatDateForCard(pkg.fecha_registro)}</div>
      </div>
    `;
    card.addEventListener('dblclick', () => openModal(pkg));
    return card;
  }

  function renderBoard() {
    board.innerHTML = '';
    const columnMap = new Map();

    boardColumns.forEach((col) => {
      const section = document.createElement('section');
      section.className = 'kanban-column';
      section.innerHTML = `
        <div class="column-header">
          <h6>${col.titulo || '-'}</h6>
          <span class="badge bg-secondary rounded-pill" id="badge-col-${col.ordinal}">0</span>
        </div>
        <div class="column-body" id="body-col-${col.ordinal}"></div>
      `;
      board.appendChild(section);
      columnMap.set(Number(col.ordinal), section.querySelector('.column-body'));
    });

    boardPackages.forEach((pkg) => {
      const body = columnMap.get(Number(pkg.columna));
      if (body) {
        body.appendChild(createPackageCard(pkg));
      }
    });

    columnMap.forEach((value, key) => {
      const total = value.querySelectorAll('.package-card').length;
      const badge = document.getElementById(`badge-col-${key}`);
      if (badge) badge.textContent = String(total);
    });
  }

  async function loadBoard() {
    showLoading();
    const query = new URLSearchParams({
      Codigo_usuario: sessionQuery.Codigo_usuario,
      OTP: sessionQuery.OTP,
    });

    try {
      const data = await fetchJSON(`/api/init?${query.toString()}`);
      boardColumns = Array.isArray(data.columns) ? data.columns : [];
      boardPackages = Array.isArray(data.packages) ? data.packages : [];
      renderBoard();
    } catch (error) {
      if (error.message.includes('Warning ACCESO NO AUTORIZADO !!!')) {
        denyAccessAndClose();
        return;
      }
      board.innerHTML = `<div class="alert alert-danger m-3">${t('boardError')}: ${error.message}</div>`;
      showToast(`${t('boardError')}: ${error.message}`, 'danger');
    }
  }

  async function loadProductos(pkg) {
    const query = new URLSearchParams({
      tipo_documento: String(pkg.tipo_documento || ''),
      codigo_paquete: String(pkg.codigo_paquete || ''),
    });

    const data = await fetchJSON(`/api/productos?${query.toString()}`);
    return Array.isArray(data.rows) ? data.rows : [];
  }

  function makeActionButton(text, className, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn ${className} me-auto`;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  function setModalActions(columna) {
    modalActions.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-secondary';
    closeBtn.dataset.bsDismiss = 'modal';
    closeBtn.textContent = t('cerrar');

    let actionBtn = null;

    if (Number(columna) === 1) {
      actionBtn = makeActionButton(t('empacar'), 'btn-primary', () => showToast(t('actionPending'), 'warning'));
    }
    if (Number(columna) === 2) {
      actionBtn = makeActionButton(t('despachar'), 'btn-success', () => showToast(t('actionPending'), 'warning'));
    }
    if (Number(columna) === 3) {
      actionBtn = makeActionButton(t('liquidar'), 'btn-warning', liquidarpaquete);
    }
    if (Number(columna) === 4) {
      actionBtn = makeActionButton(t('standby'), 'btn-info text-white', procesarStandBy);
    }

    if (actionBtn) modalActions.appendChild(actionBtn);
    modalActions.appendChild(closeBtn);
  }

  async function openModal(pkg) {
    selectedPackage = pkg;
    modalHora.textContent = formatTime(pkg.fecha_registro);
    modalCliente.textContent = pkg.nombre_cliente || '-';
    modalDireccion.textContent = pkg.concatenarpuntoentrega || '-';

    setModalActions(pkg.columna);
    modalGridBody.innerHTML = `<tr><td colspan="3" class="text-center">${t('loadingProducts')}</td></tr>`;
    modal.show();

    try {
      const productos = await loadProductos(pkg);
      if (productos.length === 0) {
        modalGridBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${t('noProducts')}</td></tr>`;
        return;
      }

      modalGridBody.innerHTML = '';
      productos.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.ordinal ?? idx + 1}</td>
          <td>${item.nombre || '-'}</td>
          <td class="text-end fw-semibold">${item.cantidad ?? 0}</td>
        `;
        modalGridBody.appendChild(tr);
      });
    } catch (error) {
      modalGridBody.innerHTML = `<tr><td colspan="3" class="text-danger text-center">${error.message}</td></tr>`;
      showToast(error.message, 'danger');
    }
  }

  async function launchAction(endpoint) {
    const actionButton = modalActions.querySelector('.btn.me-auto');
    const previousText = actionButton ? actionButton.textContent : '';

    if (actionButton) {
      actionButton.disabled = true;
      actionButton.textContent = `${previousText}...`;
    }

    try {
      const result = await fetchJSON(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_documento: selectedPackage?.tipo_documento,
          codigo_paquete: selectedPackage?.codigo_paquete,
        }),
      });

      if (!result.url) {
        throw new Error(t('launchError'));
      }

      window.open(result.url, '_blank', 'noopener');
      modal.hide();
      await loadBoard();
    } catch (error) {
      showToast(error.message, 'danger');
      if (actionButton) {
        actionButton.disabled = false;
        actionButton.textContent = previousText;
      }
    }
  }

  async function liquidarpaquete() {
    await launchAction('/api/liquidar');
  }

  async function procesarStandBy() {
    await launchAction('/api/standby');
  }

  async function init() {
    setLabels();
    sessionQuery = parseQuery();

    if (!sessionQuery.Codigo_usuario || !sessionQuery.OTP) {
      denyAccessAndClose();
      return;
    }

    btnRefresh.addEventListener('click', loadBoard);
    await loadBoard();
  }

  init().catch((error) => {
    showToast(error.message || 'Error en inicializacion', 'danger');
  });
});
