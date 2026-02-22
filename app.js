document.addEventListener('DOMContentLoaded', () => {
  const messages = {
    es: {
      refresh: 'Actualizar',
      loadingBoard: 'Cargando tablero...',
      boardError: 'No se pudieron cargar los datos',
      packageDetail: 'Detalle del Paquete',
      client: 'Cliente',
      time: 'Hora',
      address: 'Direccion de Entrega',
      vgrid: 'vGrid - Productos del Paquete',
      product: 'Producto',
      qty: 'Cantidad',
      close: 'Cerrar',
      noProducts: 'Sin productos',
      loadingProducts: 'Cargando productos...',
      actionNotImplemented: 'Accion no implementada aun',
      liquidar: 'Liquidar Paquete',
      empacar: 'Empacar',
      despachar: 'Despachar',
      standby: 'Procesar Standby',
      launchError: 'No se pudo abrir el caso de uso',
      requestError: 'Error de solicitud',
    },
    en: {
      refresh: 'Refresh',
      loadingBoard: 'Loading board...',
      boardError: 'Could not load data',
      packageDetail: 'Package Details',
      client: 'Client',
      time: 'Time',
      address: 'Delivery Address',
      vgrid: 'vGrid - Package Products',
      product: 'Product',
      qty: 'Quantity',
      close: 'Close',
      noProducts: 'No products',
      loadingProducts: 'Loading products...',
      actionNotImplemented: 'Action not implemented yet',
      liquidar: 'Settle Package',
      empacar: 'Pack',
      despachar: 'Dispatch',
      standby: 'Process Standby',
      launchError: 'Could not open use case',
      requestError: 'Request failed',
    },
  };

  const lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  const t = (k) => messages[lang][k] || k;

  document.documentElement.lang = lang;

  const boardEl = document.getElementById('board');
  const refreshBtn = document.getElementById('btn-refresh');
  const refreshText = document.getElementById('refreshText');
  const currentDate = document.getElementById('current-date');

  const packageModalEl = document.getElementById('packageModal');
  const packageModal = new bootstrap.Modal(packageModalEl);
  const modalClient = document.getElementById('modal-client');
  const modalTime = document.getElementById('modal-time');
  const modalAddress = document.getElementById('modal-address');
  const modalGridBody = document.getElementById('modal-grid-body');
  const modalFooter = document.getElementById('modal-footer-actions');
  const toastContainer = document.getElementById('toast-container');

  const lblClient = document.getElementById('lblClient');
  const lblTime = document.getElementById('lblTime');
  const lblAddress = document.getElementById('lblAddress');
  const gridTitle = document.getElementById('gridTitle');
  const thProduct = document.getElementById('thProduct');
  const thQty = document.getElementById('thQty');
  const packageModalLabel = document.getElementById('packageModalLabel');

  let selectedPackage = null;

  function applyLabels() {
    refreshText.textContent = t('refresh');
    lblClient.textContent = `${t('client')}:`;
    lblTime.textContent = `${t('time')}:`;
    lblAddress.textContent = `${t('address')}:`;
    gridTitle.textContent = t('vgrid');
    thProduct.textContent = t('product');
    thQty.textContent = t('qty');
    packageModalLabel.textContent = t('packageDetail');
    currentDate.textContent = new Date().toLocaleDateString(lang);
  }

  function showToast(message, type = 'danger') {
    const wrapper = document.createElement('div');
    wrapper.className = `toast align-items-center text-bg-${type} border-0`;
    wrapper.role = 'alert';
    wrapper.ariaLive = 'assertive';
    wrapper.ariaAtomic = 'true';
    wrapper.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    toastContainer.appendChild(wrapper);
    const toast = new bootstrap.Toast(wrapper, { delay: 5000 });
    toast.show();
    wrapper.addEventListener('hidden.bs.toast', () => wrapper.remove());
  }

  async function apiFetch(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data?.detail ? `: ${data.detail}` : '';
      throw new Error(`${data?.error || t('requestError')}${detail}`);
    }
    return data;
  }

  function setBoardLoading() {
    boardEl.innerHTML = `
      <div class="d-flex justify-content-center w-100 align-items-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">${t('loadingBoard')}</span>
        </div>
      </div>
    `;
  }

  function createCard(pkg) {
    const card = document.createElement('div');
    card.className = 'card package-card';
    card.innerHTML = `
      <div class="card-body">
        <span class="card-id">#${pkg.codigo_paquete}</span>
        <div class="fw-semibold">${pkg.nombre_cliente || '-'}</div>
        <div class="small text-muted mt-1">
          <i class="bi bi-geo-alt-fill text-danger"></i>
          ${pkg.concatenarpuntoentrega || '-'}
        </div>
      </div>
    `;
    card.addEventListener('dblclick', () => openPackageModal(pkg));
    return card;
  }

  function renderBoard(columns, packages) {
    boardEl.innerHTML = '';
    const colMap = new Map();

    columns.sort((a, b) => Number(a.ordinal) - Number(b.ordinal)).forEach((col) => {
      const colEl = document.createElement('section');
      colEl.className = 'kanban-column';
      colEl.innerHTML = `
        <div class="column-header">
          <h6>${col.titulo}</h6>
          <span class="badge bg-secondary rounded-pill" id="count-${col.ordinal}">0</span>
        </div>
        <div class="column-body" id="col-${col.ordinal}"></div>
      `;
      boardEl.appendChild(colEl);
      colMap.set(Number(col.ordinal), colEl.querySelector('.column-body'));
    });

    packages.forEach((pkg) => {
      const body = colMap.get(Number(pkg.columna));
      if (body) body.appendChild(createCard(pkg));
    });

    colMap.forEach((body, ordinal) => {
      const count = body.querySelectorAll('.package-card').length;
      const badge = document.getElementById(`count-${ordinal}`);
      if (badge) badge.textContent = count;
    });
  }

  function renderModalButtons(columna) {
    modalFooter.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-secondary';
    closeBtn.setAttribute('data-bs-dismiss', 'modal');
    closeBtn.textContent = t('close');

    let actionBtn = null;

    if (Number(columna) === 1) {
      actionBtn = buttonWithIcon(t('empacar'), 'btn-primary', 'bi-box-seam');
    }
    if (Number(columna) === 2) {
      actionBtn = buttonWithIcon(t('despachar'), 'btn-success', 'bi-truck');
    }
    if (Number(columna) === 3) {
      actionBtn = buttonWithIcon(t('liquidar'), 'btn-warning', 'bi-cash-coin');
      actionBtn.id = 'btn-liquidar';
      actionBtn.addEventListener('click', liquidarpaquete);
    }
    if (Number(columna) === 4) {
      actionBtn = buttonWithIcon(t('standby'), 'btn-info text-white', 'bi-hourglass-split');
    }

    if (actionBtn && Number(columna) !== 3) {
      actionBtn.addEventListener('click', () => showToast(t('actionNotImplemented'), 'warning'));
    }

    if (actionBtn) modalFooter.appendChild(actionBtn);
    modalFooter.appendChild(closeBtn);
  }

  function buttonWithIcon(text, classes, icon) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${classes} me-auto`;
    btn.innerHTML = `<i class="bi ${icon} me-2"></i>${text}`;
    return btn;
  }

  async function openPackageModal(pkg) {
    selectedPackage = pkg;
    modalClient.textContent = pkg.nombre_cliente || '-';
    modalAddress.textContent = pkg.concatenarpuntoentrega || '-';

    const d = pkg.fecha_registro ? new Date(pkg.fecha_registro) : null;
    modalTime.textContent = d && !Number.isNaN(d.getTime())
      ? d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
      : '-';

    modalGridBody.innerHTML = `<tr><td colspan="3" class="text-center">${t('loadingProducts')}</td></tr>`;
    renderModalButtons(pkg.columna);
    packageModal.show();

    try {
      const products = await apiFetch(`/api/details/${encodeURIComponent(pkg.tipo_documento)}/${encodeURIComponent(pkg.codigo_paquete)}`);
      if (!Array.isArray(products) || products.length === 0) {
        modalGridBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">${t('noProducts')}</td></tr>`;
        return;
      }

      modalGridBody.innerHTML = '';
      products.sort((a, b) => Number(a.ordinal) - Number(b.ordinal)).forEach((p, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.ordinal ?? i + 1}</td>
          <td>${p.nombre || '-'}</td>
          <td class="text-end fw-semibold">${p.cantidad ?? 0}</td>
        `;
        modalGridBody.appendChild(tr);
      });
    } catch (error) {
      modalGridBody.innerHTML = `<tr><td colspan="3" class="text-danger text-center">${error.message}</td></tr>`;
      showToast(error.message, 'danger');
    }
  }

  async function liquidarpaquete() {
    const btn = document.getElementById('btn-liquidar');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>...';

    try {
      const payload = selectedPackage
        ? { tipo_documento: selectedPackage.tipo_documento, codigo_paquete: selectedPackage.codigo_paquete }
        : {};

      const result = await apiFetch('/api/liquidar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!result.url) {
        throw new Error(t('launchError'));
      }

      window.open(result.url, '_blank', 'noopener');
      packageModal.hide();
      await loadBoard();
    } catch (error) {
      showToast(error.message, 'danger');
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  async function loadBoard() {
    setBoardLoading();
    try {
      const [columns, packages] = await Promise.all([
        apiFetch('/api/board-config'),
        apiFetch('/api/packages'),
      ]);
      renderBoard(Array.isArray(columns) ? columns : [], Array.isArray(packages) ? packages : []);
    } catch (error) {
      boardEl.innerHTML = `<div class="alert alert-danger m-4">${t('boardError')}: ${error.message}</div>`;
      showToast(`${t('boardError')}: ${error.message}`, 'danger');
    }
  }

  applyLabels();
  refreshBtn.addEventListener('click', loadBoard);
  loadBoard();
});
