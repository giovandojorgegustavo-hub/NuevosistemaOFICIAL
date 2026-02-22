/*
SPs de lectura (obligatorio)

vPedidosPendientes = Llamada SP: get_pedidospendientes() (devuelve campo_visible)
Campos devueltos
vCodigo_pedido = codigo_pedido
vCodigo_cliente = codigo_cliente
vNombre_cliente = nombre_cliente
vNumero_cliente = numero_cliente
vFecha_pedido = fecha
vCreated_at = created_at
Variables
vCodigo_pedido visible no editable
vCodigo_cliente no visible no editable
vNombre_cliente visible no editable
vNumero_cliente visible no editable
vFecha_pedido visible no editable
vCreated_at no visible no editable

vPedidoDetalle = Llamada SP: get_pedido_detalle_por_pedido(p_codigo_pedido=vCodigo_pedido) (devuelve campo_visible)
Campos devueltos
vProductoCodigo = codigo_producto
vProductoNombre = nombre_producto
vCantidadSaldo = saldo
vPrecioUnitario = precio_unitario
Variables
vProductoCodigo no visible no editable
vProductoNombre visible no editable
vCantidadSaldo visible no editable
vPrecioUnitario visible no editable
vPrecioTotal visible no editable
*/

class FormWizard {
  constructor() {
    this.currentStep = 1;
    this.locale = (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
    this.isLoading = false;

    this.state = {
      vParametros: null,
      vPedidosPendientes: [],
      filteredPedidos: [],
      vPedidoDetalle: [],
      vCodigo_pedido: '',
      vCodigo_cliente: '',
      vNombre_cliente: '',
      vNumero_cliente: '',
      vFecha_pedido: '',
      vTotalPendiente: 0
    };

    this.regex = {
      vCodigo_pedido: /^\d+$/,
      vFecha: /^\d{4}-\d{2}-\d{2}$/
    };

    this.el = {
      steps: document.querySelectorAll('.step-view'),
      stepChips: document.querySelectorAll('.step-chip'),
      progress: document.getElementById('wizardProgress'),
      alert: document.getElementById('alertArea'),
      connectionBadge: document.getElementById('connectionBadge'),
      vClienteFiltro: document.getElementById('vClienteFiltro'),
      vFechaFiltro: document.getElementById('vFechaFiltro'),
      clienteMenu: document.getElementById('clienteMenu'),
      reloadBtn: document.getElementById('reloadBtn'),
      vPedidosPendientes: document.getElementById('vPedidosPendientes'),
      vPedidoDetalle: document.getElementById('vPedidoDetalle'),
      resPedido: document.getElementById('resPedido'),
      resCliente: document.getElementById('resCliente'),
      resFecha: document.getElementById('resFecha'),
      resTotalPendiente: document.getElementById('resTotalPendiente'),
      confPedido: document.getElementById('confPedido'),
      confCliente: document.getElementById('confCliente'),
      confFecha: document.getElementById('confFecha'),
      confTotal: document.getElementById('confTotal'),
      vConfirmarAnulacion: document.getElementById('vConfirmarAnulacion'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      anularBtn: document.getElementById('anularBtn')
    };

    this.i18n = {
      es: {
        brandTitle: 'Anular Pedidos',
        brandSubtitle: 'Global IaaS + PaaS Order Lifecycle',
        statusConnecting: 'Conectando',
        statusOnline: 'En linea',
        statusOffline: 'Sin conexion',
        wizardTitle: 'CU009 - M1AnularPedidos',
        wizardSubtitle: 'Flujo transaccional para anular pedidos con saldo pendiente',
        metaAction: 'Accion',
        metaActionValue: 'ANULAR PEDIDO',
        labelClienteFiltro: 'Filtrar por cliente',
        labelFechaFiltro: 'Filtrar por fecha',
        phClienteFiltro: 'Nombre, numero o codigo',
        reload: 'Recargar',
        thSelect: 'Sel',
        thPedido: 'Pedido',
        thCliente: 'Cliente',
        thNumero: 'Numero',
        thFecha: 'Fecha',
        thProducto: 'Producto',
        thSaldo: 'Saldo',
        thPrecioUnitario: 'Precio unitario',
        thPrecioTotal: 'Precio total',
        summaryPedido: 'Pedido',
        summaryCliente: 'Cliente',
        summaryFecha: 'Fecha',
        summaryPendiente: 'Total pendiente',
        confirmLabel: 'Confirmo que deseo anular el pedido seleccionado.',
        prev: 'Anterior',
        next: 'Siguiente',
        cancelOrder: 'Anular Pedido',
        select: 'Seleccionar',
        noResults: 'Sin resultados',
        noDetail: 'Sin detalle',
        loading: 'Procesando...',
        selectOrderFirst: 'Selecciona un pedido con saldo pendiente.',
        detailWithoutBalance: 'El pedido no tiene lineas con saldo > 0. No se puede anular.',
        confirmRequired: 'Debes confirmar la anulacion.',
        canceledOk: 'Pedido anulado correctamente.',
        serverError: 'Error interno. Revisa logs del backend.',
        invalidDateFilter: 'Filtro de fecha invalido.',
        invalidOrder: 'Codigo de pedido invalido.',
        notFound: 'Pedido no encontrado.',
        alreadyCanceled: 'Pedido ya anulado.',
        updateFailed: 'No fue posible anular el pedido.'
      },
      en: {
        brandTitle: 'Cancel Orders',
        brandSubtitle: 'Global IaaS + PaaS Order Lifecycle',
        statusConnecting: 'Connecting',
        statusOnline: 'Online',
        statusOffline: 'Offline',
        wizardTitle: 'CU009 - M1CancelOrders',
        wizardSubtitle: 'Transactional flow to cancel orders with pending balance',
        metaAction: 'Action',
        metaActionValue: 'CANCEL ORDER',
        labelClienteFiltro: 'Filter by client',
        labelFechaFiltro: 'Filter by date',
        phClienteFiltro: 'Name, number or code',
        reload: 'Reload',
        thSelect: 'Sel',
        thPedido: 'Order',
        thCliente: 'Client',
        thNumero: 'Number',
        thFecha: 'Date',
        thProducto: 'Product',
        thSaldo: 'Balance',
        thPrecioUnitario: 'Unit price',
        thPrecioTotal: 'Total price',
        summaryPedido: 'Order',
        summaryCliente: 'Client',
        summaryFecha: 'Date',
        summaryPendiente: 'Pending total',
        confirmLabel: 'I confirm I want to cancel the selected order.',
        prev: 'Previous',
        next: 'Next',
        cancelOrder: 'Cancel Order',
        select: 'Select',
        noResults: 'No results',
        noDetail: 'No detail',
        loading: 'Processing...',
        selectOrderFirst: 'Select an order with pending balance.',
        detailWithoutBalance: 'Order has no lines with balance > 0. Cancellation blocked.',
        confirmRequired: 'You must confirm cancellation.',
        canceledOk: 'Order canceled successfully.',
        serverError: 'Internal error. Check backend logs.',
        invalidDateFilter: 'Invalid date filter.',
        invalidOrder: 'Invalid order code.',
        notFound: 'Order not found.',
        alreadyCanceled: 'Order already canceled.',
        updateFailed: 'Could not cancel order.'
      }
    };
  }

  t(key) {
    return this.i18n[this.locale][key] || key;
  }

  applyI18n() {
    document.documentElement.lang = this.locale;
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = this.t(node.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      node.placeholder = this.t(node.dataset.i18nPlaceholder);
    });
  }

  parseQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('vParámetros') || params.get('vParametros');
    if (raw) {
      try {
        this.state.vParametros = JSON.parse(raw);
      } catch (_e) {
        this.state.vParametros = null;
      }
    }
  }

  async api(path, options = {}) {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (_e) {
      payload = {};
    }

    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.message || `HTTP_${response.status}`);
      error.code = payload.message || `HTTP_${response.status}`;
      throw error;
    }

    return payload;
  }

  showAlert(type, message) {
    const className = type === 'error' ? 'alert-danger' : type === 'success' ? 'alert-success' : 'alert-info';
    this.el.alert.className = `alert ${className}`;
    this.el.alert.textContent = message;
    this.el.alert.classList.remove('d-none');
  }

  clearAlert() {
    this.el.alert.classList.add('d-none');
    this.el.alert.textContent = '';
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.el.reloadBtn.disabled = loading;
    this.el.prevBtn.disabled = loading;
    this.el.nextBtn.disabled = loading;
    this.el.anularBtn.disabled = loading;
    if (loading) {
      this.el.nextBtn.dataset.label = this.el.nextBtn.textContent;
      this.el.anularBtn.dataset.label = this.el.anularBtn.textContent;
      this.el.nextBtn.textContent = this.t('loading');
      this.el.anularBtn.textContent = this.t('loading');
    } else {
      this.el.nextBtn.textContent = this.el.nextBtn.dataset.label || this.t('next');
      this.el.anularBtn.textContent = this.el.anularBtn.dataset.label || this.t('cancelOrder');
    }
  }

  formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat(this.locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  formatMoney(value) {
    return Number(value || 0).toLocaleString(this.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  updateStepUI() {
    const pct = Math.round((this.currentStep / 3) * 100);
    this.el.progress.style.width = `${pct}%`;

    this.el.steps.forEach((view) => {
      const step = Number(view.dataset.step);
      view.classList.toggle('d-none', step !== this.currentStep);
    });

    this.el.stepChips.forEach((chip) => {
      const step = Number(chip.dataset.step);
      chip.classList.toggle('active', step === this.currentStep);
    });

    this.el.prevBtn.classList.toggle('d-none', this.currentStep === 1);
    this.el.nextBtn.classList.toggle('d-none', this.currentStep === 3);
    this.el.anularBtn.classList.toggle('d-none', this.currentStep !== 3);
  }

  bindEvents() {
    this.el.reloadBtn.addEventListener('click', () => this.loadPedidos());

    this.el.vClienteFiltro.addEventListener('input', () => {
      this.renderClienteTypeahead();
      this.renderPedidos();
    });

    this.el.vFechaFiltro.addEventListener('change', () => {
      this.renderPedidos();
    });

    this.el.prevBtn.addEventListener('click', () => {
      if (this.currentStep > 1) {
        this.currentStep -= 1;
        this.updateStepUI();
      }
    });

    this.el.nextBtn.addEventListener('click', async () => {
      if (this.currentStep === 1) {
        if (!this.state.vCodigo_pedido) {
          this.showAlert('error', this.t('selectOrderFirst'));
          return;
        }
        await this.loadDetalleAndContinue();
        return;
      }

      if (this.currentStep === 2) {
        const hasSaldo = this.state.vPedidoDetalle.some((row) => Number(row.saldo) > 0);
        if (!hasSaldo) {
          this.showAlert('error', this.t('detailWithoutBalance'));
          return;
        }
        this.currentStep = 3;
        this.fillConfirmation();
        this.updateStepUI();
      }
    });

    this.el.anularBtn.addEventListener('click', () => this.submitAnulacion());
  }

  async init() {
    this.applyI18n();
    this.parseQueryParams();
    this.bindEvents();
    this.updateStepUI();

    try {
      await this.api('/api/health');
      this.el.connectionBadge.textContent = this.t('statusOnline');
      this.el.connectionBadge.className = 'badge rounded-pill text-bg-success';
      await this.loadPedidos();
    } catch (_error) {
      this.el.connectionBadge.textContent = this.t('statusOffline');
      this.el.connectionBadge.className = 'badge rounded-pill text-bg-danger';
      this.showAlert('error', this.t('serverError'));
    }
  }

  renderClienteTypeahead() {
    const vTerm = String(this.el.vClienteFiltro.value || '').trim().toLowerCase();
    const seen = new Set();

    const options = this.state.vPedidosPendientes
      .filter((row) => {
        if (!vTerm) return true;
        return (
          String(row.nombre_cliente || '').toLowerCase().includes(vTerm) ||
          String(row.numero_cliente || '').toLowerCase().includes(vTerm) ||
          String(row.codigo_cliente || '').toLowerCase().includes(vTerm)
        );
      })
      .slice(0, 12)
      .map((row) => ({
        label: `${row.nombre_cliente || ''} (${row.numero_cliente || row.codigo_cliente || '-'})`,
        value: String(row.nombre_cliente || '')
      }))
      .filter((opt) => {
        if (!opt.value || seen.has(opt.label)) return false;
        seen.add(opt.label);
        return true;
      });

    if (!options.length) {
      this.el.clienteMenu.style.display = 'none';
      this.el.clienteMenu.innerHTML = '';
      return;
    }

    this.el.clienteMenu.innerHTML = options
      .map(
        (opt) =>
          `<button type="button" class="typeahead-item" data-value="${opt.value.replace(/"/g, '&quot;')}">${opt.label}</button>`
      )
      .join('');

    this.el.clienteMenu.style.display = 'block';

    this.el.clienteMenu.querySelectorAll('.typeahead-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.el.vClienteFiltro.value = btn.dataset.value;
        this.el.clienteMenu.style.display = 'none';
        this.renderPedidos();
      });
    });
  }

  async loadPedidos() {
    this.clearAlert();
    this.setLoading(true);
    try {
      const vClienteFiltro = String(this.el.vClienteFiltro.value || '').trim();
      const vFechaFiltro = String(this.el.vFechaFiltro.value || '').trim();
      if (vFechaFiltro && !this.regex.vFecha.test(vFechaFiltro)) {
        this.showAlert('error', this.t('invalidDateFilter'));
        return;
      }

      const qs = new URLSearchParams();
      if (vClienteFiltro) qs.set('vClienteFiltro', vClienteFiltro);
      if (vFechaFiltro) qs.set('vFechaFiltro', vFechaFiltro);

      const payload = await this.api(`/api/pedidos-pendientes?${qs.toString()}`);
      this.state.vPedidosPendientes = payload.data || [];
      this.renderPedidos();
      this.renderClienteTypeahead();
    } catch (error) {
      this.handleApiError(error);
    } finally {
      this.setLoading(false);
    }
  }

  renderPedidos() {
    const vClienteFiltro = String(this.el.vClienteFiltro.value || '').trim().toLowerCase();
    const vFechaFiltro = String(this.el.vFechaFiltro.value || '').trim();

    this.state.filteredPedidos = this.state.vPedidosPendientes.filter((row) => {
      const byCliente =
        !vClienteFiltro ||
        String(row.nombre_cliente || '').toLowerCase().includes(vClienteFiltro) ||
        String(row.numero_cliente || '').toLowerCase().includes(vClienteFiltro) ||
        String(row.codigo_cliente || '').toLowerCase().includes(vClienteFiltro);

      const byFecha =
        !vFechaFiltro ||
        `${new Date(row.fecha).getFullYear()}-${String(new Date(row.fecha).getMonth() + 1).padStart(2, '0')}-${String(
          new Date(row.fecha).getDate()
        ).padStart(2, '0')}` === vFechaFiltro;

      return byCliente && byFecha;
    });

    if (!this.state.filteredPedidos.length) {
      this.el.vPedidosPendientes.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${this.t('noResults')}</td></tr>`;
      return;
    }

    this.el.vPedidosPendientes.innerHTML = this.state.filteredPedidos
      .map((row) => {
        const active = String(this.state.vCodigo_pedido) === String(row.codigo_pedido) ? 'table-active' : '';
        return `<tr class="${active}">
          <td class="text-center">
            <button type="button" class="btn btn-sm btn-outline-info" data-select="${row.codigo_pedido}">${this.t('select')}</button>
          </td>
          <td>${row.codigo_pedido}</td>
          <td>${row.nombre_cliente || '-'}</td>
          <td>${row.numero_cliente || '-'}</td>
          <td>${this.formatDate(row.fecha)}</td>
        </tr>`;
      })
      .join('');

    this.el.vPedidosPendientes.querySelectorAll('button[data-select]').forEach((btn) => {
      btn.addEventListener('click', () => this.selectPedido(btn.dataset.select));
    });
  }

  selectPedido(vCodigo_pedido) {
    const selected = this.state.filteredPedidos.find((row) => String(row.codigo_pedido) === String(vCodigo_pedido));
    if (!selected) return;

    this.state.vCodigo_pedido = String(selected.codigo_pedido);
    this.state.vCodigo_cliente = String(selected.codigo_cliente || '');
    this.state.vNombre_cliente = String(selected.nombre_cliente || '');
    this.state.vNumero_cliente = String(selected.numero_cliente || '');
    this.state.vFecha_pedido = selected.fecha;

    this.renderPedidos();
    this.clearAlert();
  }

  async loadDetalleAndContinue() {
    this.clearAlert();
    if (!this.regex.vCodigo_pedido.test(this.state.vCodigo_pedido)) {
      this.showAlert('error', this.t('invalidOrder'));
      return;
    }

    this.setLoading(true);
    try {
      const payload = await this.api(`/api/pedido-detalle?vCodigo_pedido=${encodeURIComponent(this.state.vCodigo_pedido)}`);
      this.state.vPedidoDetalle = payload.data || [];
      this.state.vTotalPendiente = this.state.vPedidoDetalle.reduce((sum, row) => {
        const vSaldo = Number(row.saldo) || 0;
        const vPrecioUnitario = Number(row.precio_unitario) || 0;
        return sum + vSaldo * vPrecioUnitario;
      }, 0);

      this.renderDetalle();

      const hasSaldo = this.state.vPedidoDetalle.some((row) => Number(row.saldo) > 0);
      this.currentStep = 2;
      this.updateStepUI();

      if (!hasSaldo) {
        this.showAlert('error', this.t('detailWithoutBalance'));
      }
    } catch (error) {
      this.handleApiError(error);
    } finally {
      this.setLoading(false);
    }
  }

  renderDetalle() {
    this.el.resPedido.textContent = this.state.vCodigo_pedido || '-';
    this.el.resCliente.textContent = `${this.state.vNombre_cliente || '-'} (${this.state.vNumero_cliente || '-'})`;
    this.el.resFecha.textContent = this.formatDate(this.state.vFecha_pedido);
    this.el.resTotalPendiente.textContent = this.formatMoney(this.state.vTotalPendiente);

    if (!this.state.vPedidoDetalle.length) {
      this.el.vPedidoDetalle.innerHTML = `<tr><td colspan="4" class="text-center text-muted">${this.t('noDetail')}</td></tr>`;
      return;
    }

    this.el.vPedidoDetalle.innerHTML = this.state.vPedidoDetalle
      .map((row) => {
        const vSaldo = Number(row.saldo) || 0;
        const vPrecioUnitario = Number(row.precio_unitario) || 0;
        const vPrecioTotal = vSaldo * vPrecioUnitario;
        return `<tr>
          <td>${row.nombre_producto || '-'}</td>
          <td class="text-end">${this.formatMoney(vSaldo)}</td>
          <td class="text-end">${this.formatMoney(vPrecioUnitario)}</td>
          <td class="text-end">${this.formatMoney(vPrecioTotal)}</td>
        </tr>`;
      })
      .join('');
  }

  fillConfirmation() {
    this.el.confPedido.textContent = this.state.vCodigo_pedido || '-';
    this.el.confCliente.textContent = `${this.state.vNombre_cliente || '-'} (${this.state.vNumero_cliente || '-'})`;
    this.el.confFecha.textContent = this.formatDate(this.state.vFecha_pedido);
    this.el.confTotal.textContent = this.formatMoney(this.state.vTotalPendiente);
  }

  async submitAnulacion() {
    if (!this.el.vConfirmarAnulacion.checked) {
      this.showAlert('error', this.t('confirmRequired'));
      return;
    }

    if (!this.regex.vCodigo_pedido.test(this.state.vCodigo_pedido)) {
      this.showAlert('error', this.t('invalidOrder'));
      return;
    }

    this.clearAlert();
    this.setLoading(true);

    try {
      await this.api('/api/anular-pedido', {
        method: 'POST',
        body: JSON.stringify({
          vCodigo_pedido: this.state.vCodigo_pedido
        })
      });

      this.showAlert('success', this.t('canceledOk'));
      await this.resetWizard();
    } catch (error) {
      this.handleApiError(error);
    } finally {
      this.setLoading(false);
    }
  }

  async resetWizard() {
    this.currentStep = 1;
    this.state.vPedidoDetalle = [];
    this.state.vCodigo_pedido = '';
    this.state.vCodigo_cliente = '';
    this.state.vNombre_cliente = '';
    this.state.vNumero_cliente = '';
    this.state.vFecha_pedido = '';
    this.state.vTotalPendiente = 0;

    this.el.vConfirmarAnulacion.checked = false;
    this.el.vPedidoDetalle.innerHTML = '';
    this.el.resPedido.textContent = '-';
    this.el.resCliente.textContent = '-';
    this.el.resFecha.textContent = '-';
    this.el.resTotalPendiente.textContent = '0.00';
    this.el.confPedido.textContent = '-';
    this.el.confCliente.textContent = '-';
    this.el.confFecha.textContent = '-';
    this.el.confTotal.textContent = '0.00';

    this.updateStepUI();
    await this.loadPedidos();
  }

  handleApiError(error) {
    const code = String(error.code || 'SERVER_ERROR');
    const map = {
      INVALID_DATE_FILTER: 'invalidDateFilter',
      INVALID_CODIGO_PEDIDO: 'invalidOrder',
      PEDIDO_NOT_FOUND: 'notFound',
      PEDIDO_ALREADY_CANCELED: 'alreadyCanceled',
      PEDIDO_WITHOUT_PENDING_BALANCE: 'detailWithoutBalance',
      PEDIDO_UPDATE_FAILED: 'updateFailed',
      SERVER_ERROR: 'serverError'
    };
    this.showAlert('error', this.t(map[code] || 'serverError'));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
