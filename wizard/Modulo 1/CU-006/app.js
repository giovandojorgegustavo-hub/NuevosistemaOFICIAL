class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progress = document.getElementById('wizardProgress');
    this.stepPills = Array.from(document.querySelectorAll('.step-pill'));
    this.alertArea = document.getElementById('alertArea');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');

    this.pedidosTableBody = document.querySelector('#pedidosTable tbody');
    this.detalleTableBody = document.querySelector('#detalleTable tbody');

    this.filterCliente = document.getElementById('filterCliente');
    this.filterFecha = document.getElementById('filterFecha');

    this.baseSelect = document.getElementById('baseSelect');
    this.fechaEmision = document.getElementById('fechaEmision');
    this.horaEmision = document.getElementById('horaEmision');
    this.tipoDocumento = document.getElementById('tipoDocumento');
    this.numeroDocumento = document.getElementById('numeroDocumento');
    this.saldoTotal = document.getElementById('saldoTotal');

    this.puntoEntregaSelect = document.getElementById('puntoEntregaSelect');
    this.puntoExistenteWrap = document.getElementById('puntoExistenteWrap');
    this.puntoNuevoWrap = document.getElementById('puntoNuevoWrap');
    this.entregaExistente = document.getElementById('entregaExistente');
    this.entregaNuevo = document.getElementById('entregaNuevo');

    this.depSelect = document.getElementById('depSelect');
    this.provSelect = document.getElementById('provSelect');
    this.distSelect = document.getElementById('distSelect');
    this.regionEntregaLabel = document.getElementById('regionEntregaLabel');
    this.limaFields = document.getElementById('limaFields');
    this.provFields = document.getElementById('provFields');
    this.direccionLinea = document.getElementById('direccionLinea');
    this.referencia = document.getElementById('referencia');
    this.nombreEntrega = document.getElementById('nombreEntrega');
    this.dniEntrega = document.getElementById('dniEntrega');
    this.agencia = document.getElementById('agencia');
    this.observaciones = document.getElementById('observaciones');

    this.recibeExistente = document.getElementById('recibeExistente');
    this.recibeNuevo = document.getElementById('recibeNuevo');
    this.recibeExistenteWrap = document.getElementById('recibeExistenteWrap');
    this.recibeNuevoWrap = document.getElementById('recibeNuevoWrap');
    this.recibeSelect = document.getElementById('recibeSelect');
    this.numeroRecibe = document.getElementById('numeroRecibe');
    this.nombreRecibe = document.getElementById('nombreRecibe');

    this.summaryPedido = document.getElementById('summaryPedido');
    this.summaryFactura = document.getElementById('summaryFactura');
    this.summaryEntrega = document.getElementById('summaryEntrega');
    this.summaryRecibe = document.getElementById('summaryRecibe');
    this.summaryRecibeWrap = document.getElementById('summaryRecibeWrap');

    this.confirmCheck = document.getElementById('confirmCheck');

    this.currentStep = 1;
    this.selectedPedido = null;
    this.pedidos = [];
    this.detalleFactura = [];
    this.bases = [];
    this.puntosEntrega = [];
    this.numRecibe = [];

    this.vTipoDocumento = 'FAC';
    this.vNumeroDocumento = null;
    this.vOrdinalDetMovCont = 1;
    this.vCodigoPuntoEntrega = null;
    this.vOrdinalNumRecibe = null;
    this.vOrdinalPaqueteDetalle = null;
    this.vRegionEntrega = 'PROV';

    this.regex = {
      integer: /^\d+$/,
      decimal: /^\d+(?:\.\d+)?$/,
      dni: /^\d{8}$/,
    };

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('btnBuscar').addEventListener('click', () => this.loadPedidos());
    document.getElementById('step1Next').addEventListener('click', () => this.handleStep1());
    document.getElementById('step2Back').addEventListener('click', () => this.goToStep(1));
    document.getElementById('step2Next').addEventListener('click', () => this.handleStep2());
    document.getElementById('step3Back').addEventListener('click', () => this.goToStep(2));
    document.getElementById('step3Next').addEventListener('click', () => this.handleStep3());
    document.getElementById('step4Back').addEventListener('click', () => this.goToStep(3));
    document.getElementById('step4Next').addEventListener('click', () => this.handleStep4());
    document.getElementById('step5Back').addEventListener('click', () => this.goToPreviousSummary());
    document.getElementById('emitirBtn').addEventListener('click', () => this.emitirFactura());
    document.getElementById('btnLogs').addEventListener('click', () => this.openLogs());

    this.entregaExistente.addEventListener('change', () => this.toggleEntregaModo());
    this.entregaNuevo.addEventListener('change', () => this.toggleEntregaModo());
    this.depSelect.addEventListener('change', () => this.onDepartamentoChange());
    this.provSelect.addEventListener('change', () => this.onProvinciaChange());
    this.distSelect.addEventListener('change', () => this.updateRegionEntrega());
    this.puntoEntregaSelect.addEventListener('change', () => this.updateRegionFromExisting());

    this.recibeExistente.addEventListener('change', () => this.toggleRecibeModo());
    this.recibeNuevo.addEventListener('change', () => this.toggleRecibeModo());
  }

  async init() {
    this.setLanguage();
    await this.loadPedidos();
    this.updateProgress();
  }

  setLanguage() {
    const lang = (navigator.language || 'es').split('-')[0];
    document.documentElement.lang = lang;
    const translations = this.getTranslations();
    const t = (key) => translations[lang]?.[key] || translations.es[key] || key;
    this.t = t;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
  }

  getTranslations() {
    const numeroRecibeValue = recibeModo === 'existente' ? this.recibeSelect.value : this.numeroRecibe.value.trim();
    return {
      es: {
        eyebrow: 'Operaciones Globales IaaS / PaaS',
        title: 'Gestion Pedido',
        subtitle: 'Flujo multipaso para emitir facturas y coordinar entregas con trazabilidad completa.',
        viewLogs: 'Ver logs SQL',
        case: 'CU-006',
        step1Pill: 'Pedido',
        step2Pill: 'Factura',
        step3Pill: 'Entrega',
        step4Pill: 'Recibe',
        step5Pill: 'Resumen',
        step1Title: 'Seleccionar Pedido',
        step1Desc: 'Filtra pedidos pendientes y selecciona el pedido a facturar.',
        filterClient: 'Cliente',
        filterDate: 'Fecha',
        filterApply: 'Aplicar filtros',
        thFecha: 'Fecha',
        thPedido: 'Codigo',
        thCliente: 'Cliente',
        thNumCliente: 'Num. cliente',
        next: 'Siguiente',
        back: 'Anterior',
        step2Title: 'Crear Factura',
        step2Desc: 'Define datos del documento y ajusta cantidades a facturar.',
        labelBase: 'Base',
        labelFechaEmision: 'Fecha emision',
        labelHoraEmision: 'Hora emision',
        labelTipoDoc: 'Tipo documento',
        labelNumeroDoc: 'Numero documento',
        labelSaldo: 'Saldo total',
        thProducto: 'Producto',
        thCantidad: 'Cantidad',
        thPrecio: 'Precio total',
        step3Title: 'Datos Entrega',
        step3Desc: 'Selecciona punto de entrega existente o registra uno nuevo.',
        labelEntregaModo: 'Punto entrega',
        existente: 'Existe',
        nuevo: 'Nuevo',
        labelPuntoEntrega: 'Punto entrega',
        labelDepartamento: 'Departamento',
        labelProvincia: 'Provincia',
        labelDistrito: 'Distrito',
        labelDireccion: 'Direccion',
        labelReferencia: 'Referencia',
        labelRegion: 'Region',
        labelNombre: 'Nombre',
        labelDni: 'DNI',
        labelAgencia: 'Agencia',
        labelObservaciones: 'Observaciones',
        step4Title: 'Datos Recibe',
        step4Desc: 'Selecciona o registra quien recibe el pedido.',
        labelRecibeModo: 'Num recibe',
        labelNumRecibe: 'Num recibe',
        labelNumeroRecibe: 'Numero',
        labelNombreRecibe: 'Nombre',
        step5Title: 'Resumen y emitir factura',
        step5Desc: 'Verifica la informacion antes de confirmar.',
        summaryPedido: 'Pedido',
        summaryFactura: 'Factura',
        summaryEntrega: 'Entrega',
        summaryRecibe: 'Recibe',
        confirmText: 'Confirmo que deseo emitir la factura y registrar los datos.',
        emit: 'Emitir factura',
        loading: 'Cargando...',
        noData: 'Sin datos',
        selectPedido: 'Selecciona un pedido para continuar.',
        loadPedidosError: 'No se pudo cargar pedidos pendientes.',
        loadDetalleError: 'No se pudo cargar detalle del pedido.',
        loadBasesError: 'No se pudieron cargar bases.',
        validationFactura: 'Completa base, fecha, hora y cantidades validas.',
        validationEntrega: 'Completa los datos de entrega requeridos.',
        validationRecibe: 'Completa los datos de recibe requeridos.',
        confirmRequired: 'Debes confirmar la operacion.',
        emitSuccess: 'Factura emitida correctamente.',
        emitError: 'No se pudo emitir la factura.',
        quantityInvalid: 'Cantidad invalida o mayor al saldo.',
        selected: 'Seleccionado',
        select: 'Seleccionar',
        modeExisting: 'EXISTENTE',
        modeNew: 'NUEVO',
        max: 'Max',
      },
      en: {
        eyebrow: 'Global IaaS / PaaS Operations',
        title: 'Order Management',
        subtitle: 'Multi-step flow to emit invoices and coordinate deliveries with full traceability.',
        viewLogs: 'View SQL logs',
        case: 'CU-006',
        step1Pill: 'Order',
        step2Pill: 'Invoice',
        step3Pill: 'Delivery',
        step4Pill: 'Receiver',
        step5Pill: 'Summary',
        step1Title: 'Select Order',
        step1Desc: 'Filter pending orders and select the order to invoice.',
        filterClient: 'Client',
        filterDate: 'Date',
        filterApply: 'Apply filters',
        thFecha: 'Date',
        thPedido: 'Code',
        thCliente: 'Client',
        thNumCliente: 'Client no.',
        next: 'Next',
        back: 'Back',
        step2Title: 'Create Invoice',
        step2Desc: 'Define document data and adjust invoiced quantities.',
        labelBase: 'Base',
        labelFechaEmision: 'Issue date',
        labelHoraEmision: 'Issue time',
        labelTipoDoc: 'Document type',
        labelNumeroDoc: 'Document number',
        labelSaldo: 'Total balance',
        thProducto: 'Product',
        thCantidad: 'Quantity',
        thPrecio: 'Total price',
        step3Title: 'Delivery Data',
        step3Desc: 'Select an existing delivery point or register a new one.',
        labelEntregaModo: 'Delivery point',
        existente: 'Existing',
        nuevo: 'New',
        labelPuntoEntrega: 'Delivery point',
        labelDepartamento: 'Department',
        labelProvincia: 'Province',
        labelDistrito: 'District',
        labelDireccion: 'Address',
        labelReferencia: 'Reference',
        labelRegion: 'Region',
        labelNombre: 'Name',
        labelDni: 'ID',
        labelAgencia: 'Agency',
        labelObservaciones: 'Notes',
        step4Title: 'Receiver Data',
        step4Desc: 'Select or register the receiver.',
        labelRecibeModo: 'Receiver no.',
        labelNumRecibe: 'Receiver no.',
        labelNumeroRecibe: 'Number',
        labelNombreRecibe: 'Name',
        step5Title: 'Summary and emit invoice',
        step5Desc: 'Review the information before confirming.',
        summaryPedido: 'Order',
        summaryFactura: 'Invoice',
        summaryEntrega: 'Delivery',
        summaryRecibe: 'Receiver',
        confirmText: 'I confirm I want to emit the invoice and register the data.',
        emit: 'Emit invoice',
        loading: 'Loading...',
        noData: 'No data',
        selectPedido: 'Select an order to continue.',
        loadPedidosError: 'Could not load pending orders.',
        loadDetalleError: 'Could not load order details.',
        loadBasesError: 'Could not load bases.',
        validationFactura: 'Complete base, date, time and valid quantities.',
        validationEntrega: 'Complete required delivery data.',
        validationRecibe: 'Complete required receiver data.',
        confirmRequired: 'You must confirm the operation.',
        emitSuccess: 'Invoice emitted successfully.',
        emitError: 'Could not emit invoice.',
        quantityInvalid: 'Invalid quantity or exceeds balance.',
        selected: 'Selected',
        select: 'Select',
        modeExisting: 'EXISTING',
        modeNew: 'NEW',
        max: 'Max',
      },
    };
  }

  showAlert(message, type = 'danger') {
    this.alertArea.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  clearAlert() {
    this.alertArea.innerHTML = '';
  }

  setLoading(active, textKey = 'loading') {
    this.loadingOverlay.classList.toggle('active', active);
    this.loadingText.textContent = this.t(textKey);
  }

  updateProgress() {
    const steps = this.steps.length;
    const percent = (this.currentStep / steps) * 100;
    this.progress.style.width = `${percent}%`;
    this.stepPills.forEach((pill) => {
      const step = Number(pill.getAttribute('data-step'));
      pill.classList.toggle('active', step === this.currentStep);
    });
  }

  goToStep(step) {
    this.currentStep = step;
    this.steps.forEach((el) => {
      el.classList.toggle('active', Number(el.getAttribute('data-step')) === step);
    });
    this.updateProgress();
  }

  goToPreviousSummary() {
    if (this.vRegionEntrega === 'LIMA') {
      this.goToStep(4);
    } else {
      this.goToStep(3);
    }
  }

  async loadPedidos() {
    this.clearAlert();
    this.setLoading(true);
    const cliente = this.filterCliente.value.trim();
    const fecha = this.filterFecha.value;
    const params = new URLSearchParams();
    if (cliente) params.append('cliente', cliente);
    if (fecha) params.append('fecha', fecha);
    try {
      const response = await fetch(`/api/pedidos?${params.toString()}`);
      if (!response.ok) throw new Error('error');
      const data = await response.json();
      this.pedidos = Array.isArray(data) ? data : [];
      this.renderPedidos();
    } catch (error) {
      this.showAlert(this.t('loadPedidosError'));
    } finally {
      this.setLoading(false);
    }
  }

  renderPedidos() {
    if (!this.pedidos.length) {
      this.pedidosTableBody.innerHTML = `<tr><td colspan="5">${this.t('noData')}</td></tr>`;
      return;
    }
    this.pedidosTableBody.innerHTML = '';
    this.pedidos.forEach((row, index) => {
      const tr = document.createElement('tr');
      const selected = this.selectedPedido && this.selectedPedido.codigo_pedido === row.codigo_pedido;
      tr.innerHTML = `
        <td>${this.formatDate(row.fecha || row.vfecha || '')}</td>
        <td>${row.codigo_pedido || row.vcodigo_pedido || ''}</td>
        <td>${row.nombre_cliente || row.vnombre_cliente || ''}</td>
        <td>${row.numero_cliente || row.vnumero_cliente || ''}</td>
        <td>
          <button class="btn btn-sm ${selected ? 'btn-success' : 'btn-outline-light'}" data-index="${index}">
            ${selected ? this.t('selected') : this.t('select')}
          </button>
        </td>
      `;
      tr.querySelector('button').addEventListener('click', () => this.selectPedido(index));
      this.pedidosTableBody.appendChild(tr);
    });
  }

  selectPedido(index) {
    this.selectedPedido = this.pedidos[index];
    this.renderPedidos();
  }

  async handleStep1() {
    if (!this.selectedPedido) {
      this.showAlert(this.t('selectPedido'));
      return;
    }
    await this.prepareStep2();
    this.goToStep(2);
  }

  async prepareStep2() {
    this.clearAlert();
    this.setLoading(true);
    try {
      await Promise.all([this.loadBases(), this.loadDetallePedido(), this.loadNumeroDocumento()]);
      this.saldoTotal.value = this.formatMoney(this.getTotalFactura());
    } catch (error) {
      this.showAlert(this.t('loadDetalleError'));
    } finally {
      this.setLoading(false);
    }
  }

  async loadBases() {
    if (this.bases.length) return;
    const response = await fetch('/api/bases');
    if (!response.ok) throw new Error('error');
    const data = await response.json();
    this.bases = Array.isArray(data) ? data : [];
    this.baseSelect.innerHTML = this.bases
      .map((base) => {
        const value = base.codigo_base || base.codigo || base.id || base.base || '';
        const label = base.nombre_base || base.nombre || base.descripcion || value;
        return `<option value="${value}">${label}</option>`;
      })
      .join('');
  }

  async loadNumeroDocumento() {
    const response = await fetch('/api/next-documento?tipo=FAC');
    if (!response.ok) throw new Error('error');
    const data = await response.json();
    this.vNumeroDocumento = data?.next || 1;
    this.numeroDocumento.value = this.vNumeroDocumento;
    const ordinalRes = await fetch(`/api/next-ordinal-detalle?tipo=FAC&numero=${this.vNumeroDocumento}`);
    if (!ordinalRes.ok) throw new Error('error');
    const ordinalData = await ordinalRes.json();
    this.vOrdinalDetMovCont = ordinalData?.next || 1;
  }

  async loadDetallePedido() {
    if (!this.selectedPedido) return;
    const codigo = this.selectedPedido.codigo_pedido || this.selectedPedido.vcodigo_pedido;
    const response = await fetch(`/api/pedidos/${encodeURIComponent(codigo)}/detalle`);
    if (!response.ok) throw new Error('error');
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    this.detalleFactura = rows.map((row) => {
      const cantidad = this.toNumber(row.saldo ?? row.cantidad ?? row.vcantidad ?? row.cantidad_producto ?? 0);
      const precioUnitario = this.toNumber(row.precio_unitario ?? row.precio_unitario_producto ?? row.precio ?? 0);
      const precioTotalBase = this.toNumber(row.precio_total ?? row.vprecio_total ?? 0);
      const unit = precioUnitario || (cantidad ? precioTotalBase / cantidad : 0);
      const total = unit * cantidad;
      return {
        codigo_producto: row.codigo_producto || row.vcodigo_producto || '',
        nombre_producto: row.nombre_producto || row.vnombre_producto || '',
        cantidad_original: cantidad,
        cantidad_factura: cantidad,
        precio_unitario: unit,
        precio_total_original: total,
        precio_total: total,
      };
    });
    this.renderDetalle();
  }

  renderDetalle() {
    if (!this.detalleFactura.length) {
      this.detalleTableBody.innerHTML = `<tr><td colspan="4">${this.t('noData')}</td></tr>`;
      return;
    }
    this.detalleTableBody.innerHTML = '';
    this.detalleFactura.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.nombre_producto}</td>
        <td style="max-width: 140px;">
          <input class="form-control form-control-sm" data-index="${index}" value="${item.cantidad_factura}" />
          <div class="small text-muted">${this.t('max')}: ${item.cantidad_original}</div>
        </td>
        <td>${this.formatMoney(item.precio_total)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-light" data-action="delete" data-index="${index}">✕</button>
        </td>
      `;
      const input = tr.querySelector('input');
      input.addEventListener('input', (event) => this.onCantidadChange(event));
      const deleteBtn = tr.querySelector('button');
      deleteBtn.addEventListener('click', () => this.removeDetalle(index));
      if (this.detalleFactura.length <= 1) {
        deleteBtn.disabled = true;
      }
      this.detalleTableBody.appendChild(tr);
    });
  }

  onCantidadChange(event) {
    const index = Number(event.target.getAttribute('data-index'));
    const value = event.target.value.trim();
    const item = this.detalleFactura[index];
    const cantidad = this.toNumber(value);
    if (!this.regex.decimal.test(value) || cantidad <= 0 || cantidad > item.cantidad_original) {
      event.target.classList.add('is-invalid');
      return;
    }
    event.target.classList.remove('is-invalid');
    item.cantidad_factura = cantidad;
    item.precio_total = item.precio_unitario * cantidad;
    this.detalleFactura[index] = item;
    this.renderDetalle();
    this.saldoTotal.value = this.formatMoney(this.getTotalFactura());
  }

  removeDetalle(index) {
    if (this.detalleFactura.length <= 1) return;
    this.detalleFactura.splice(index, 1);
    this.renderDetalle();
    this.saldoTotal.value = this.formatMoney(this.getTotalFactura());
  }

  handleStep2() {
    const validation = this.validateFactura();
    if (!validation.ok) {
      this.showAlert(this.t(validation.reason));
      return;
    }
    this.prepareStep3();
    this.goToStep(3);
  }

  validateFactura() {
    const base = this.baseSelect.value;
    if (!base || !this.fechaEmision.value || !this.horaEmision.value) {
      return { ok: false, reason: 'validationFactura' };
    }
    const invalid = this.detalleFactura.some((item) => {
      return !item.cantidad_factura || item.cantidad_factura <= 0;
    });
    if (invalid) return { ok: false, reason: 'validationFactura' };
    const over = this.detalleFactura.some((item) => item.cantidad_factura > item.cantidad_original);
    if (over) return { ok: false, reason: 'quantityInvalid' };
    return { ok: true };
  }

  async prepareStep3() {
    this.clearAlert();
    await Promise.all([this.loadPuntosEntrega(), this.loadUbigeo()]);
    this.toggleEntregaModo();
  }

  async loadPuntosEntrega() {
    if (!this.selectedPedido) return;
    const codigoCliente = this.selectedPedido.codigo_cliente || this.selectedPedido.vcodigo_cliente;
    const response = await fetch(`/api/puntos-entrega?cliente=${encodeURIComponent(codigoCliente)}`);
    if (!response.ok) throw new Error('error');
    const data = await response.json();
    this.puntosEntrega = Array.isArray(data) ? data : [];
    if (!this.puntosEntrega.length) {
      this.entregaExistente.disabled = true;
      this.entregaNuevo.checked = true;
    } else {
      this.entregaExistente.disabled = false;
      this.entregaExistente.checked = true;
    }
    this.puntoEntregaSelect.innerHTML = this.puntosEntrega
      .map((row) => {
        const value = row.codigo_puntoentrega || row.vcodigo_puntoentrega || '';
        const label = row.concatenarpuntoentrega || row.vconcatenarpuntoentrega || value;
        return `<option value="${value}">${label}</option>`;
      })
      .join('');
  }

  async loadUbigeo() {
    const response = await fetch('/api/ubigeo/departamentos');
    if (!response.ok) throw new Error('error');
    const data = await response.json();
    this.depSelect.innerHTML = (Array.isArray(data) ? data : [])
      .map((row) => {
        const value = row.codigo || row.cod_dep || row.codigo_dep || row.codigo_departamento || row.codigo_ubigeo || '';
        const label = row.nombre || row.nombre_departamento || row.departamento || value;
        return `<option value="${value}">${label}</option>`;
      })
      .join('');
    await this.onDepartamentoChange();
  }

  async onDepartamentoChange() {
    const dep = this.depSelect.value;
    if (!dep) return;
    const response = await fetch(`/api/ubigeo/provincias?dep=${encodeURIComponent(dep)}`);
    if (!response.ok) return;
    const data = await response.json();
    this.provSelect.innerHTML = (Array.isArray(data) ? data : [])
      .map((row) => {
        const value = row.codigo || row.cod_prov || row.codigo_provincia || row.codigo_ubigeo || '';
        const label = row.nombre || row.nombre_provincia || row.provincia || value;
        return `<option value="${value}">${label}</option>`;
      })
      .join('');
    await this.onProvinciaChange();
  }

  async onProvinciaChange() {
    const dep = this.depSelect.value;
    const prov = this.provSelect.value;
    if (!dep || !prov) return;
    const response = await fetch(`/api/ubigeo/distritos?dep=${encodeURIComponent(dep)}&prov=${encodeURIComponent(prov)}`);
    if (!response.ok) return;
    const data = await response.json();
    this.distSelect.innerHTML = (Array.isArray(data) ? data : [])
      .map((row) => {
        const value = row.codigo || row.cod_dist || row.codigo_distrito || row.codigo_ubigeo || '';
        const label = row.nombre || row.nombre_distrito || row.distrito || value;
        return `<option value="${value}">${label}</option>`;
      })
      .join('');
    this.updateRegionEntrega();
  }

  updateRegionEntrega() {
    const dep = this.depSelect.value;
    const prov = this.provSelect.value;
    this.vRegionEntrega = dep === '15' && prov === '01' ? 'LIMA' : 'PROV';
    this.regionEntregaLabel.textContent = this.vRegionEntrega;
    this.limaFields.style.display = this.vRegionEntrega === 'LIMA' ? 'block' : 'none';
    this.provFields.style.display = this.vRegionEntrega === 'PROV' ? 'block' : 'none';
  }

  toggleEntregaModo() {
    const isExistente = this.entregaExistente.checked && !this.entregaExistente.disabled;
    this.puntoExistenteWrap.style.display = isExistente ? 'block' : 'none';
    this.puntoNuevoWrap.style.display = isExistente ? 'none' : 'block';
    if (isExistente) {
      this.updateRegionFromExisting();
    } else {
      this.updateRegionEntrega();
    }
  }

  updateRegionFromExisting() {
    const selected = this.puntosEntrega.find(
      (row) => String(row.codigo_puntoentrega || row.vcodigo_puntoentrega || '') === this.puntoEntregaSelect.value
    );
    const region = selected?.region_entrega || selected?.vregion_entrega || null;
    if (region) {
      this.vRegionEntrega = region;
      this.regionEntregaLabel.textContent = this.vRegionEntrega;
    }
  }

  handleStep3() {
    if (!this.validateEntrega()) {
      this.showAlert(this.t('validationEntrega'));
      return;
    }
    if (this.vRegionEntrega === 'LIMA') {
      this.prepareStep4();
      this.goToStep(4);
    } else {
      this.prepareStep5();
      this.goToStep(5);
    }
  }

  validateEntrega() {
    const isExistente = this.entregaExistente.checked && !this.entregaExistente.disabled;
    if (isExistente) {
      return Boolean(this.puntoEntregaSelect.value);
    }
    if (!this.depSelect.value || !this.provSelect.value || !this.distSelect.value) return false;
    if (this.vRegionEntrega === 'LIMA') {
      return this.direccionLinea.value.trim().length > 3;
    }
    const nombre = this.nombreEntrega.value.trim();
    const dni = this.dniEntrega.value.trim();
    return nombre.length > 2 && this.regex.dni.test(dni);
  }

  async prepareStep4() {
    this.clearAlert();
    await Promise.all([this.loadNumRecibe(), this.loadOrdinalesRecibe()]);
    this.toggleRecibeModo();
  }

  async loadNumRecibe() {
    const codigoCliente = this.selectedPedido.codigo_cliente || this.selectedPedido.vcodigo_cliente;
    const response = await fetch(`/api/numrecibe?cliente=${encodeURIComponent(codigoCliente)}`);
    if (!response.ok) throw new Error('error');
    const data = await response.json();
    this.numRecibe = Array.isArray(data) ? data : [];
    if (!this.numRecibe.length) {
      this.recibeExistente.disabled = true;
      this.recibeNuevo.checked = true;
    } else {
      this.recibeExistente.disabled = false;
      this.recibeExistente.checked = true;
    }
    this.recibeSelect.innerHTML = this.numRecibe
      .map((row) => {
        const value = row.numero || row.vnumero || row.numero_recibe || row.codigo_numrecibe || '';
        const label = row.concatenarnumrecibe || row.vconcatenarnumrecibe || value;
        return `<option value="${value}">${label}</option>`;
      })
      .join('');
  }

  async loadOrdinalesRecibe() {
    const codigoCliente = this.selectedPedido.codigo_cliente || this.selectedPedido.vcodigo_cliente;
    const numRes = await fetch(`/api/next-numrecibe?cliente=${encodeURIComponent(codigoCliente)}`);
    if (numRes.ok) {
      const data = await numRes.json();
      this.vOrdinalNumRecibe = data?.next || 1;
    }
    const paqueteRes = await fetch(`/api/next-paquetedetalle?numero=${encodeURIComponent(this.vNumeroDocumento)}`);
    if (paqueteRes.ok) {
      const data = await paqueteRes.json();
      this.vOrdinalPaqueteDetalle = data?.next || 1;
    }
  }

  toggleRecibeModo() {
    const isExistente = this.recibeExistente.checked && !this.recibeExistente.disabled;
    this.recibeExistenteWrap.style.display = isExistente ? 'block' : 'none';
    this.recibeNuevoWrap.style.display = isExistente ? 'none' : 'block';
  }

  handleStep4() {
    if (!this.validateRecibe()) {
      this.showAlert(this.t('validationRecibe'));
      return;
    }
    this.prepareStep5();
    this.goToStep(5);
  }

  validateRecibe() {
    const isExistente = this.recibeExistente.checked && !this.recibeExistente.disabled;
    if (isExistente) {
      return Boolean(this.recibeSelect.value);
    }
    const numero = this.numeroRecibe.value.trim();
    const nombre = this.nombreRecibe.value.trim();
    return numero.length > 0 && nombre.length > 2;
  }

  prepareStep5() {
    const pedido = this.selectedPedido;
    this.summaryPedido.innerHTML = `
      <div class="summary-item"><strong>${pedido.codigo_pedido || pedido.vcodigo_pedido}</strong></div>
      <div class="summary-item">${pedido.nombre_cliente || pedido.vnombre_cliente}</div>
      <div class="summary-item">${pedido.numero_cliente || pedido.vnumero_cliente}</div>
    `;

    const total = this.formatMoney(this.getTotalFactura());
    this.summaryFactura.innerHTML = `
      <div class="summary-item">${this.t('labelTipoDoc')}: ${this.vTipoDocumento}</div>
      <div class="summary-item">${this.t('labelNumeroDoc')}: ${this.vNumeroDocumento}</div>
      <div class="summary-item">${this.t('labelSaldo')}: ${total}</div>
    `;

    const entregaModo = this.entregaExistente.checked && !this.entregaExistente.disabled ? this.t('modeExisting') : this.t('modeNew');
    const entregaDetalle = this.getEntregaSummary();
    this.summaryEntrega.innerHTML = `
      <div class="summary-item">${entregaModo}</div>
      <div class="summary-item">${entregaDetalle}</div>
    `;

    if (this.vRegionEntrega === 'LIMA') {
      this.summaryRecibeWrap.style.display = 'block';
      const recibeModo = this.recibeExistente.checked && !this.recibeExistente.disabled ? this.t('modeExisting') : this.t('modeNew');
      const recibeDetalle = this.getRecibeSummary();
      this.summaryRecibe.innerHTML = `
        <div class="summary-item">${recibeModo}</div>
        <div class="summary-item">${recibeDetalle}</div>
      `;
    } else {
      this.summaryRecibeWrap.style.display = 'none';
    }
  }

  getEntregaSummary() {
    if (this.entregaExistente.checked && !this.entregaExistente.disabled) {
      const selected = this.puntosEntrega.find(
        (row) => String(row.codigo_puntoentrega || row.vcodigo_puntoentrega || '') === this.puntoEntregaSelect.value
      );
      return selected?.concatenarpuntoentrega || selected?.vconcatenarpuntoentrega || this.puntoEntregaSelect.value;
    }
    return this.buildConcatenarPuntoEntrega();
  }

  getRecibeSummary() {
    if (this.recibeExistente.checked && !this.recibeExistente.disabled) {
      const selected = this.numRecibe.find(
        (row) => String(row.numero || row.vnumero || '') === this.recibeSelect.value
      );
      return selected?.concatenarnumrecibe || selected?.vconcatenarnumrecibe || this.recibeSelect.value;
    }
    return this.buildConcatenarNumRecibe();
  }

  buildConcatenarPuntoEntrega() {
    if (this.vRegionEntrega === 'LIMA') {
      const parts = [this.direccionLinea.value.trim(), this.distSelect.options[this.distSelect.selectedIndex]?.text || ''];
      if (this.referencia.value.trim()) parts.push(this.referencia.value.trim());
      return parts.filter(Boolean).join(' | ');
    }
    const parts = [this.nombreEntrega.value.trim(), this.dniEntrega.value.trim(), this.agencia.value.trim(), this.observaciones.value.trim()];
    return parts.filter(Boolean).join(' | ');
  }

  buildConcatenarNumRecibe() {
    const parts = [this.numeroRecibe.value.trim(), this.nombreRecibe.value.trim()];
    return parts.filter(Boolean).join(' | ');
  }

  async emitirFactura() {
    if (!this.confirmCheck.checked) {
      this.showAlert(this.t('confirmRequired'));
      return;
    }
    this.setLoading(true, 'emit');
    this.clearAlert();
    try {
      const payload = this.buildPayload();
      const response = await fetch('/api/emitir-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('error');
      this.showAlert(this.t('emitSuccess'), 'success');
    } catch (error) {
      this.showAlert(this.t('emitError'));
    } finally {
      this.setLoading(false);
    }
  }

  buildPayload() {
    const pedido = this.selectedPedido;
    const entregaModo = this.entregaExistente.checked && !this.entregaExistente.disabled ? 'existente' : 'nuevo';
    const recibeModo =
      this.vRegionEntrega === 'LIMA' && this.recibeExistente.checked && !this.recibeExistente.disabled
        ? 'existente'
        : 'nuevo';
    const codigoCliente = pedido.codigo_cliente || pedido.vcodigo_cliente;

    return {
      pedido: {
        codigo_pedido: pedido.codigo_pedido || pedido.vcodigo_pedido,
        codigo_cliente: codigoCliente,
      },
      factura: {
        tipo_documento: this.vTipoDocumento,
        numero_documento: this.vNumeroDocumento,
        codigo_base: this.baseSelect.value,
        fecha_emision: this.fechaEmision.value,
        hora_emision: this.horaEmision.value,
        saldo_total: this.getTotalFactura(),
        ordinal_detalle: this.vOrdinalDetMovCont,
      },
      detalle: this.detalleFactura.map((item) => ({
        codigo_producto: item.codigo_producto,
        cantidad_factura: item.cantidad_factura,
        precio_total: item.precio_total,
        precio_unitario: item.precio_unitario,
        cantidad_original: item.cantidad_original,
      })),
      entrega: {
        modo: entregaModo,
        codigo_cliente: codigoCliente,
        codigo_puntoentrega: this.puntoEntregaSelect.value,
        ubigeo: `${this.depSelect.value}${this.provSelect.value}${this.distSelect.value}`,
        region_entrega: this.vRegionEntrega,
        direccion_linea: this.direccionLinea.value.trim(),
        referencia: this.referencia.value.trim(),
        nombre: this.nombreEntrega.value.trim(),
        dni: this.dniEntrega.value.trim(),
        agencia: this.agencia.value.trim(),
        observaciones: this.observaciones.value.trim(),
        concatenarpuntoentrega: this.buildConcatenarPuntoEntrega(),
      },
      recibe: {
        modo: recibeModo,
        codigo_cliente: codigoCliente,
        numero: numeroRecibeValue,
        nombre: this.nombreRecibe.value.trim(),
        concatenarnumrecibe: this.buildConcatenarNumRecibe(),
      },
      ordinals: {
        ordinal_numrecibe: this.vOrdinalNumRecibe,
        ordinal_paquetedetalle: this.vOrdinalPaqueteDetalle,
      },
    };
  }

  openLogs() {
    window.open('/api/logs', '_blank');
  }

  getTotalFactura() {
    return this.detalleFactura.reduce((sum, item) => sum + this.toNumber(item.precio_total), 0);
  }

  formatMoney(value) {
    return Number(value || 0).toFixed(2);
  }

  formatDate(value) {
    if (!value) return '';
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      return value.split('T')[0];
    }
    return value;
  }

  toNumber(value) {
    const num = parseFloat(value);
    return Number.isNaN(num) ? 0 : num;
  }
}

const wizard = new FormWizard();
window.addEventListener('DOMContentLoaded', () => wizard.init());
