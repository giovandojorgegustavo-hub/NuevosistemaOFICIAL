/* global google */
(() => {
  const state = {
    currentStep: 1,
    steps: [1, 2, 3, 4, 5, 6, 7, 8],
    catalogs: {
      clientes: [],
      productos: [],
      puntosEntrega: [],
      numRecibe: [],
      cuentas: [],
      bases: []
    },
    config: null,
    values: {
      vClienteCodigo: null,
      vClienteNombre: '',
      vClienteNumero: '',
      vFechaPedido: '',
      vHoraPedido: '',
      vcodigo_pedido: null,
      vFechaP: '',
      vProdPedidos: [],
      vNumero_documento: null,
      vProdFactura: [],
      vfMonto: 0,
      vfCostoEnvio: 0,
      vfTotal: 0,
      vRegion_Entrega: '',
      vDireccionLinea: '',
      vReferencia: '',
      vNombre: '',
      vDni: '',
      vAgencia: '',
      vObservaciones: '',
      vCod_Dep: '15',
      vCod_Prov: '01',
      vCod_Dist: '',
      vDepartamento: '',
      vProvincia: '',
      vDistrito: '',
      Vubigeo: '',
      Vcodigo_puntoentrega: null,
      Vconcatenarpuntoentrega: '',
      vLatitud: null,
      vLongitud: null,
      vOrdinal_numrecibe: null,
      vNumeroRecibe: '',
      vNombreRecibe: '',
      vConcatenarnumrecibe: '',
      vNumero_documento_pago: null,
      vMontoPago: 0,
      vMontoPendiente: 0,
      vCuentaBancaria: null,
      vCuentaNombre: '',
      vCuentaBanco: '',
      vPagos: [],
      vCodigo_base: null,
      vBaseNombre: '',
      vBaseSugerida: ''
    }
  };

  const elements = {
    progressBar: document.getElementById('progressBar'),
    statusHint: document.getElementById('statusHint'),
    alertArea: document.getElementById('alertArea'),
    loadingState: document.getElementById('loadingState'),
    refreshData: document.getElementById('refreshData'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    clienteExistente: document.getElementById('clienteExistente'),
    clienteNuevo: document.getElementById('clienteNuevo'),
    clienteExistenteFields: document.getElementById('clienteExistenteFields'),
    clienteNuevoFields: document.getElementById('clienteNuevoFields'),
    clienteSelect: document.getElementById('clienteSelect'),
    clientesList: document.getElementById('clientesList'),
    clienteNombre: document.getElementById('clienteNombre'),
    clienteNumero: document.getElementById('clienteNumero'),
    fechaPedido: document.getElementById('fechaPedido'),
    horaPedido: document.getElementById('horaPedido'),
    codigoPedido: document.getElementById('codigoPedido'),
    pedidoBody: document.getElementById('pedidoBody'),
    addPedido: document.getElementById('addPedido'),
    clearPedido: document.getElementById('clearPedido'),
    fechaEmision: document.getElementById('fechaEmision'),
    horaEmision: document.getElementById('horaEmision'),
    numeroFactura: document.getElementById('numeroFactura'),
    facturaBody: document.getElementById('facturaBody'),
    vfMonto: document.getElementById('vfMonto'),
    vfCostoEnvio: document.getElementById('vfCostoEnvio'),
    vfTotal: document.getElementById('vfTotal'),
    entregaExistente: document.getElementById('entregaExistente'),
    entregaNuevo: document.getElementById('entregaNuevo'),
    entregaExistenteFields: document.getElementById('entregaExistenteFields'),
    entregaExistenteInfo: document.getElementById('entregaExistenteInfo'),
    entregaNuevoFields: document.getElementById('entregaNuevoFields'),
    puntosEntregaList: document.getElementById('puntosEntregaList'),
    puntoEntregaSelect: document.getElementById('puntoEntregaSelect'),
    regionEntrega: document.getElementById('regionEntrega'),
    mapSearch: document.getElementById('mapSearch'),
    map: document.getElementById('map'),
    direccionLinea: document.getElementById('direccionLinea'),
    latitud: document.getElementById('latitud'),
    longitud: document.getElementById('longitud'),
    departamentoSelect: document.getElementById('departamentoSelect'),
    provinciaSelect: document.getElementById('provinciaSelect'),
    distritoSelect: document.getElementById('distritoSelect'),
    entregaLimaFields: document.getElementById('entregaLimaFields'),
    entregaProvFields: document.getElementById('entregaProvFields'),
    referencia: document.getElementById('referencia'),
    entregaNombre: document.getElementById('entregaNombre'),
    entregaDni: document.getElementById('entregaDni'),
    entregaAgencia: document.getElementById('entregaAgencia'),
    entregaObservaciones: document.getElementById('entregaObservaciones'),
    exDireccionLinea: document.getElementById('exDireccionLinea'),
    exReferencia: document.getElementById('exReferencia'),
    exNombre: document.getElementById('exNombre'),
    exDni: document.getElementById('exDni'),
    exAgencia: document.getElementById('exAgencia'),
    exObservaciones: document.getElementById('exObservaciones'),
    recibeExistente: document.getElementById('recibeExistente'),
    recibeNuevo: document.getElementById('recibeNuevo'),
    recibeExistenteFields: document.getElementById('recibeExistenteFields'),
    recibeNuevoFields: document.getElementById('recibeNuevoFields'),
    recibeSelect: document.getElementById('recibeSelect'),
    recibeList: document.getElementById('recibeList'),
    recibeNumero: document.getElementById('recibeNumero'),
    recibeNombre: document.getElementById('recibeNombre'),
    cuentaSelect: document.getElementById('cuentaSelect'),
    cuentasList: document.getElementById('cuentasList'),
    cuentaBanco: document.getElementById('cuentaBanco'),
    montoPago: document.getElementById('montoPago'),
    montoPendiente: document.getElementById('montoPendiente'),
    addPago: document.getElementById('addPago'),
    pagosBody: document.getElementById('pagosBody'),
    baseSelect: document.getElementById('baseSelect'),
    basesList: document.getElementById('basesList'),
    baseSugerida: document.getElementById('baseSugerida'),
    basesCandidatas: document.getElementById('basesCandidatas'),
    basesEta: document.getElementById('basesEta'),
    resumenCard: document.getElementById('resumenCard'),
    confirmEmitir: document.getElementById('confirmEmitir'),
    emitirFactura: document.getElementById('emitirFactura')
  };

  const regex = {
    decimal: /^\d+(?:\.\d{1,2})?$/,
    integer: /^\d+$/
  };

  class FormWizard {
    constructor() {
      this.steps = Array.from(document.querySelectorAll('.step'));
      this.totalSteps = this.steps.length;
      this.registerEvents();
      this.updateUI();
    }

    registerEvents() {
      elements.prevBtn.addEventListener('click', () => this.prev());
      elements.nextBtn.addEventListener('click', () => this.next());
    }

    updateUI() {
      this.steps.forEach((step) => {
        const stepNumber = Number(step.dataset.step);
        step.classList.toggle('active', stepNumber === state.currentStep);
      });
      const index = state.steps.indexOf(state.currentStep) + 1;
      const progress = (index / state.steps.length) * 100;
      elements.progressBar.style.width = `${progress}%`;
      elements.prevBtn.disabled = state.currentStep === state.steps[0];
      elements.nextBtn.style.display = state.currentStep === state.steps[state.steps.length - 1] ? 'none' : 'inline-flex';
      elements.statusHint.textContent = `${index}/${state.steps.length}`;
    }

    async next() {
      if (!(await validateStep(state.currentStep))) {
        return;
      }
      const currentIndex = state.steps.indexOf(state.currentStep);
      if (currentIndex < state.steps.length - 1) {
        state.currentStep = state.steps[currentIndex + 1];
        onStepChange();
        this.updateUI();
      }
    }

    prev() {
      const currentIndex = state.steps.indexOf(state.currentStep);
      if (currentIndex > 0) {
        state.currentStep = state.steps[currentIndex - 1];
        onStepChange();
        this.updateUI();
      }
    }
  }

  function setLoading(active, message = 'Cargando...') {
    elements.loadingState.classList.toggle('active', active);
    elements.loadingState.textContent = active ? message : '';
  }

  function showAlert(type, message) {
    const wrapper = document.createElement('div');
    wrapper.className = `alert alert-${type} alert-dismissible fade show`;
    wrapper.role = 'alert';
    wrapper.textContent = message;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-close';
    button.setAttribute('data-bs-dismiss', 'alert');
    button.setAttribute('aria-label', 'Close');
    wrapper.appendChild(button);
    elements.alertArea.innerHTML = '';
    elements.alertArea.appendChild(wrapper);
  }

  function clearAlert() {
    elements.alertArea.innerHTML = '';
  }

  function formatMoney(value) {
    return Number(value || 0).toFixed(2);
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Error en la solicitud');
    }
    return response.json();
  }

  function setLanguage() {
    const lang = navigator.language || 'es';
    document.documentElement.lang = lang;
    const translations = {
      es: {
        tag: 'IaaS + PaaS Global',
        title: 'Pedidos',
        subtitle: 'Wizard multi-paso para registrar pedidos, facturas y entregas.',
        status: 'Estado del flujo',
        statusHint: 'Completa los pasos para emitir la factura.',
        refresh: 'Actualizar catalogos',
        step1Title: '1. Seleccionar o crear cliente',
        step1Subtitle: 'Elige un cliente existente o registra uno nuevo.',
        clienteExistente: 'Cliente existente',
        clienteNuevo: 'Cliente nuevo',
        clienteSelect: 'Cliente',
        clienteNombre: 'Nombre',
        clienteNumero: 'Numero',
        step2Title: '2. Crear pedido',
        step2Subtitle: 'Agrega productos al pedido.',
        fechaPedido: 'Fecha pedido',
        horaPedido: 'Hora pedido',
        codigoPedido: 'Codigo pedido',
        producto: 'Producto',
        cantidad: 'Cantidad',
        precioTotal: 'Precio total',
        acciones: 'Acciones',
        addLinea: 'Agregar linea',
        clearLinea: 'Limpiar',
        step3Title: '3. Crear factura',
        step3Subtitle: 'Revisa y ajusta cantidades facturadas.',
        fechaEmision: 'Fecha emision',
        horaEmision: 'Hora emision',
        numeroFactura: 'Numero documento',
        precioUnitario: 'Precio unitario',
        step4Title: '4. Datos entrega',
        step4Subtitle: 'Selecciona o registra el punto de entrega.',
        entregaExistente: 'Existe',
        entregaNuevo: 'Nuevo',
        puntoEntrega: 'Punto entrega',
        regionEntrega: 'Region entrega',
        buscarDireccion: 'Buscar direccion',
        direccion: 'Direccion',
        latitud: 'Latitud',
        longitud: 'Longitud',
        departamento: 'Departamento',
        provincia: 'Provincia',
        distrito: 'Distrito',
        referencia: 'Referencia',
        nombre: 'Nombre',
        dni: 'DNI',
        agencia: 'Agencia',
        observaciones: 'Observaciones',
        step5Title: '5. Datos recibe',
        step5Subtitle: 'Solo aplica si la entrega es en Lima.',
        recibeExistente: 'Existe',
        recibeNuevo: 'Nuevo',
        recibeSelect: 'Numero recibe',
        numero: 'Numero',
        step6Title: '6. Registro de pago',
        step6Subtitle: 'Registra pagos parciales si aplica.',
        cuenta: 'Cuenta bancaria',
        banco: 'Banco',
        montoPago: 'Monto pago',
        montoPendiente: 'Monto pendiente',
        addPago: 'Agregar pago',
        numeroDoc: 'Num documento',
        monto: 'Monto',
        step7Title: '7. Asignar base',
        step7Subtitle: 'Selecciona la base sugerida por tiempo de llegada.',
        base: 'Base',
        sugerencia: 'Base sugerida',
        candidatas: 'Bases candidatas',
        etas: 'Bases por ETA',
        step8Title: '8. Resumen y emitir factura',
        step8Subtitle: 'Confirma la operacion antes de emitir.',
        resumen: 'Resumen',
        confirm: 'Confirmo la operacion.',
        emitir: 'Emitir factura',
        prev: 'Anterior',
        next: 'Siguiente'
      },
      en: {
        tag: 'Global IaaS + PaaS',
        title: 'Orders',
        subtitle: 'Multi-step wizard for orders, invoices, and delivery.',
        status: 'Flow status',
        statusHint: 'Complete the steps to issue the invoice.',
        refresh: 'Refresh catalogs',
        step1Title: '1. Select or create customer',
        step1Subtitle: 'Choose an existing customer or register a new one.',
        clienteExistente: 'Existing customer',
        clienteNuevo: 'New customer',
        clienteSelect: 'Customer',
        clienteNombre: 'Name',
        clienteNumero: 'Number',
        step2Title: '2. Create order',
        step2Subtitle: 'Add products to the order.',
        fechaPedido: 'Order date',
        horaPedido: 'Order time',
        codigoPedido: 'Order code',
        producto: 'Product',
        cantidad: 'Quantity',
        precioTotal: 'Total price',
        acciones: 'Actions',
        addLinea: 'Add line',
        clearLinea: 'Clear',
        step3Title: '3. Create invoice',
        step3Subtitle: 'Review and adjust invoiced quantities.',
        fechaEmision: 'Issue date',
        horaEmision: 'Issue time',
        numeroFactura: 'Document number',
        precioUnitario: 'Unit price',
        step4Title: '4. Delivery data',
        step4Subtitle: 'Select or register the delivery point.',
        entregaExistente: 'Existing',
        entregaNuevo: 'New',
        puntoEntrega: 'Delivery point',
        regionEntrega: 'Delivery region',
        buscarDireccion: 'Search address',
        direccion: 'Address',
        latitud: 'Latitude',
        longitud: 'Longitude',
        departamento: 'Department',
        provincia: 'Province',
        distrito: 'District',
        referencia: 'Reference',
        nombre: 'Name',
        dni: 'ID',
        agencia: 'Agency',
        observaciones: 'Notes',
        step5Title: '5. Receiver data',
        step5Subtitle: 'Only applies if delivery is in Lima.',
        recibeExistente: 'Existing',
        recibeNuevo: 'New',
        recibeSelect: 'Receiver number',
        numero: 'Number',
        step6Title: '6. Payment registration',
        step6Subtitle: 'Register partial payments if needed.',
        cuenta: 'Bank account',
        banco: 'Bank',
        montoPago: 'Payment amount',
        montoPendiente: 'Outstanding amount',
        addPago: 'Add payment',
        numeroDoc: 'Doc number',
        monto: 'Amount',
        step7Title: '7. Assign base',
        step7Subtitle: 'Select the base suggested by ETA.',
        base: 'Base',
        sugerencia: 'Suggested base',
        candidatas: 'Candidate bases',
        etas: 'Bases by ETA',
        step8Title: '8. Summary and issue invoice',
        step8Subtitle: 'Confirm before issuing.',
        resumen: 'Summary',
        confirm: 'I confirm the operation.',
        emitir: 'Issue invoice',
        prev: 'Back',
        next: 'Next'
      }
    };
    const locale = lang.startsWith('es') ? 'es' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      if (translations[locale] && translations[locale][key]) {
        node.textContent = translations[locale][key];
      }
    });
  }

  function setSelectOptions(listElement, items, valueKey, labelKey) {
    listElement.innerHTML = '';
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item[labelKey];
      option.dataset.value = item[valueKey];
      Object.entries(item).forEach(([key, value]) => {
        option.dataset[key] = value;
      });
      listElement.appendChild(option);
    });
  }

  function findOptionData(listElement, value) {
    const option = Array.from(listElement.options).find((opt) => opt.value === value);
    return option ? option.dataset : null;
  }

  function updateClienteMode() {
    const isNuevo = elements.clienteNuevo.checked;
    elements.clienteExistenteFields.classList.toggle('hidden', isNuevo);
    elements.clienteNuevoFields.classList.toggle('hidden', !isNuevo);
    if (isNuevo) {
      fetchJson('/api/next/cliente').then((data) => {
        state.values.vClienteCodigo = data.next;
      }).catch(() => {});
    }
  }

  function updateEntregaMode() {
    const isNuevo = elements.entregaNuevo.checked;
    elements.entregaExistenteFields.classList.toggle('hidden', isNuevo);
    elements.entregaExistenteInfo.classList.toggle('hidden', isNuevo);
    elements.entregaNuevoFields.classList.toggle('hidden', !isNuevo);
    elements.entregaLimaFields.classList.toggle('hidden', isNuevo);
    elements.entregaProvFields.classList.toggle('hidden', isNuevo);
    if (isNuevo) {
      fetchNextPuntoEntrega();
    }
  }

  function updateRecibeMode() {
    const isNuevo = elements.recibeNuevo.checked;
    elements.recibeExistenteFields.classList.toggle('hidden', isNuevo);
    elements.recibeNuevoFields.classList.toggle('hidden', !isNuevo);
    if (isNuevo) {
      fetchNextNumRecibe();
    }
  }

  function addPedidoRow(initial = {}) {
    const row = {
      vProductoCodigo: initial.vProductoCodigo || '',
      vProductoNombre: initial.vProductoNombre || '',
      vCantidadProducto: initial.vCantidadProducto || '',
      vPrecioTotal: initial.vPrecioTotal || '',
      vOrdinalPedDetalle: state.values.vProdPedidos.length + 1
    };
    state.values.vProdPedidos.push(row);
    renderPedidoRows();
  }

  function renderPedidoRows() {
    elements.pedidoBody.innerHTML = '';
    state.values.vProdPedidos.forEach((row, index) => {
      row.vOrdinalPedDetalle = index + 1;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <input class="form-control product-input" list="productosList" data-index="${index}" value="${row.vProductoNombre || ''}" placeholder="Producto">
        </td>
        <td>
          <input class="form-control qty-input" data-index="${index}" value="${row.vCantidadProducto || ''}" placeholder="0.00">
        </td>
        <td>
          <input class="form-control price-input" data-index="${index}" value="${row.vPrecioTotal || ''}" placeholder="0.00">
        </td>
        <td>
          <button class="btn btn-outline-light btn-sm remove-line" data-index="${index}" type="button">Eliminar</button>
        </td>
      `;
      elements.pedidoBody.appendChild(tr);
    });

    elements.pedidoBody.querySelectorAll('.remove-line').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        state.values.vProdPedidos.splice(idx, 1);
        renderPedidoRows();
      });
    });

    elements.pedidoBody.querySelectorAll('.product-input').forEach((input) => {
      input.addEventListener('change', () => {
        const idx = Number(input.dataset.index);
        const data = findOptionData(document.getElementById('productosList'), input.value);
        if (!data) {
          showAlert('warning', 'Seleccione un producto valido.');
          input.value = '';
          state.values.vProdPedidos[idx].vProductoCodigo = '';
          state.values.vProdPedidos[idx].vProductoNombre = '';
          return;
        }
        const duplicate = state.values.vProdPedidos.some((item, itemIdx) => itemIdx !== idx && item.vProductoCodigo === data.codigo_producto);
        if (duplicate) {
          showAlert('danger', 'No se permite repetir el mismo producto en el pedido.');
          input.value = '';
          state.values.vProdPedidos[idx].vProductoCodigo = '';
          state.values.vProdPedidos[idx].vProductoNombre = '';
          return;
        }
        state.values.vProdPedidos[idx].vProductoCodigo = data.codigo_producto;
        state.values.vProdPedidos[idx].vProductoNombre = data.nombre;
      });
    });

    elements.pedidoBody.querySelectorAll('.qty-input').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.index);
        state.values.vProdPedidos[idx].vCantidadProducto = input.value;
      });
    });

    elements.pedidoBody.querySelectorAll('.price-input').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.index);
        state.values.vProdPedidos[idx].vPrecioTotal = input.value;
      });
    });
  }

  function renderFacturaRows() {
    elements.facturaBody.innerHTML = '';
    state.values.vProdFactura.forEach((row, index) => {
      row.vOrdinalDetMovCont = index + 1;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.vProductoNombre}</td>
        <td>
          <input class="form-control factura-qty" data-index="${index}" value="${row.vFCantidadProducto}">
        </td>
        <td>${formatMoney(row.vPrecioUnitario)}</td>
        <td>${formatMoney(row.vFPrecioTotal)}</td>
        <td>
          <button class="btn btn-outline-light btn-sm remove-factura" data-index="${index}" type="button">Eliminar</button>
        </td>
      `;
      elements.facturaBody.appendChild(tr);
    });

    elements.facturaBody.querySelectorAll('.remove-factura').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.values.vProdFactura.length <= 1) {
          showAlert('warning', 'Debe existir al menos un producto en la factura.');
          return;
        }
        const idx = Number(btn.dataset.index);
        state.values.vProdFactura.splice(idx, 1);
        recalcFacturaTotals();
        renderFacturaRows();
      });
    });

    elements.facturaBody.querySelectorAll('.factura-qty').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.index);
        state.values.vProdFactura[idx].vFCantidadProducto = input.value;
        recalcFacturaLine(idx);
      });
    });
  }

  function recalcFacturaLine(index) {
    const row = state.values.vProdFactura[index];
    if (!regex.decimal.test(String(row.vFCantidadProducto))) {
      return;
    }
    row.vFPrecioTotal = Number(row.vPrecioUnitario) * Number(row.vFCantidadProducto);
    recalcFacturaTotals();
    renderFacturaRows();
  }

  function recalcFacturaTotals() {
    const total = state.values.vProdFactura.reduce((sum, row) => sum + Number(row.vFPrecioTotal || 0), 0);
    state.values.vfMonto = total;
    state.values.vfTotal = total + Number(state.values.vfCostoEnvio || 0);
    state.values.vMontoPendiente = state.values.vfTotal;
    elements.vfMonto.value = formatMoney(state.values.vfMonto);
    elements.vfCostoEnvio.value = formatMoney(state.values.vfCostoEnvio);
    elements.vfTotal.value = formatMoney(state.values.vfTotal);
    elements.montoPendiente.value = formatMoney(state.values.vMontoPendiente);
    elements.montoPago.value = formatMoney(state.values.vMontoPendiente);
  }

  function updateEntregaRegion() {
    const usingExistente = elements.entregaExistente.checked && !elements.entregaNuevo.checked;
    const isLima = usingExistente
      ? state.values.vRegion_Entrega === 'LIMA'
      : state.values.vCod_Dep === '15' && state.values.vCod_Prov === '01';
    if (!usingExistente) {
      state.values.vRegion_Entrega = isLima ? 'LIMA' : 'PROV';
    }
    state.values.vfCostoEnvio = isLima ? 0 : 50;
    elements.regionEntrega.value = state.values.vRegion_Entrega;
    elements.entregaLimaFields.classList.toggle('hidden', !isLima);
    elements.entregaProvFields.classList.toggle('hidden', isLima);
    if (elements.entregaExistente.checked) {
      elements.exDireccionLinea.parentElement.classList.toggle('hidden', !isLima);
      elements.exReferencia.parentElement.classList.toggle('hidden', !isLima);
      elements.exNombre.parentElement.classList.toggle('hidden', isLima);
      elements.exDni.parentElement.classList.toggle('hidden', isLima);
      elements.exAgencia.parentElement.classList.toggle('hidden', isLima);
      elements.exObservaciones.parentElement.classList.toggle('hidden', isLima);
    }
    if (isLima) {
      elements.direccionLinea.readOnly = false;
      elements.referencia.readOnly = false;
      elements.entregaNombre.readOnly = true;
      elements.entregaDni.readOnly = true;
      elements.entregaAgencia.readOnly = true;
      elements.entregaObservaciones.readOnly = true;
    } else {
      elements.direccionLinea.readOnly = true;
      elements.referencia.readOnly = true;
      elements.entregaNombre.readOnly = false;
      elements.entregaDni.readOnly = false;
      elements.entregaAgencia.readOnly = false;
      elements.entregaObservaciones.readOnly = false;
    }
    recalcFacturaTotals();
  }

  function buildConcatenarPuntoEntrega() {
    if (state.values.vRegion_Entrega === 'LIMA') {
      const parts = [state.values.vDireccionLinea, state.values.vDistrito, state.values.vReferencia].filter(Boolean);
      state.values.Vconcatenarpuntoentrega = parts.join(' | ');
    } else {
      const parts = [state.values.vNombre, state.values.vDni, state.values.vAgencia, state.values.vObservaciones].filter(Boolean);
      state.values.Vconcatenarpuntoentrega = parts.join(' | ');
    }
  }

  function buildConcatenarNumRecibe() {
    const parts = [state.values.vNumeroRecibe, state.values.vNombreRecibe].filter(Boolean);
    state.values.vConcatenarnumrecibe = parts.join(' | ');
  }

  function updateStepsForRegion() {
    if (state.values.vRegion_Entrega === 'LIMA') {
      state.steps = [1, 2, 3, 4, 5, 6, 7, 8];
    } else {
      state.steps = [1, 2, 3, 4, 6, 7, 8];
      if (state.currentStep === 5) {
        state.currentStep = 6;
      }
    }
  }

  function renderPagos() {
    elements.pagosBody.innerHTML = '';
    state.values.vPagos.forEach((pago, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${pago.numdocumento}</td>
        <td>${formatMoney(pago.monto)}</td>
        <td><button class="btn btn-outline-light btn-sm remove-pago" data-index="${index}" type="button">Eliminar</button></td>
      `;
      elements.pagosBody.appendChild(tr);
    });
    elements.pagosBody.querySelectorAll('.remove-pago').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        state.values.vPagos.splice(idx, 1);
        recomputePagos();
      });
    });
  }

  function recomputePagos() {
    const totalPagado = state.values.vPagos.reduce((sum, pago) => sum + Number(pago.monto || 0), 0);
    const pendiente = Math.max(0, Number(state.values.vfTotal) - totalPagado);
    state.values.vMontoPendiente = pendiente;
    elements.montoPendiente.value = formatMoney(pendiente);
    elements.montoPago.value = formatMoney(pendiente);
    elements.addPago.disabled = pendiente === 0;
    renderPagos();
  }

  function renderResumen() {
    const entregaTipo = elements.entregaNuevo.checked ? 'Nuevo' : 'Existe';
    const recibeTipo = state.values.vRegion_Entrega === 'LIMA' ? (elements.recibeNuevo.checked ? 'Nuevo' : 'Existe') : 'No aplica';
    const pagoResumen = state.values.vPagos.length ? `${state.values.vPagos.length} pagos` : 'Sin pagos';

    elements.resumenCard.innerHTML = `
      <div>
        <h3>Cliente</h3>
        <p>${state.values.vClienteNombre || '-'} (${state.values.vClienteCodigo || '-'})</p>
      </div>
      <div>
        <h3>Pedido</h3>
        <p>Codigo pedido: ${state.values.vcodigo_pedido || '-'}</p>
        <p>Items: ${state.values.vProdPedidos.length}</p>
      </div>
      <div>
        <h3>Factura</h3>
        <p>Documento: FAC ${state.values.vNumero_documento || '-'}</p>
        <p>Total: ${formatMoney(state.values.vfTotal)}</p>
      </div>
      <div>
        <h3>Entrega</h3>
        <p>${entregaTipo} | ${state.values.Vconcatenarpuntoentrega || '-'}</p>
      </div>
      <div>
        <h3>Recibe</h3>
        <p>${recibeTipo} | ${state.values.vConcatenarnumrecibe || '-'}</p>
      </div>
      <div>
        <h3>Pago</h3>
        <p>${pagoResumen}</p>
      </div>
      <div>
        <h3>Base</h3>
        <p>${state.values.vBaseNombre || '-'}</p>
      </div>
    `;
  }

  async function loadCatalogs() {
    setLoading(true, 'Cargando catalogos...');
    try {
      const [clientes, productos, cuentas, bases] = await Promise.all([
        fetchJson('/api/clientes'),
        fetchJson('/api/productos'),
        fetchJson('/api/cuentas'),
        fetchJson('/api/bases')
      ]);
      state.catalogs.clientes = clientes;
      state.catalogs.productos = productos;
      state.catalogs.cuentas = cuentas;
      state.catalogs.bases = bases;
      setSelectOptions(elements.clientesList, clientes, 'codigo_cliente', 'nombre');
      setSelectOptions(document.getElementById('productosList'), productos, 'codigo_producto', 'nombre');
      setSelectOptions(elements.cuentasList, cuentas, 'codigo_cuentabancaria', 'nombre');
      setSelectOptions(elements.basesList, bases, 'codigo_base', 'nombre');
    } catch (error) {
      showAlert('danger', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPuntosEntrega() {
    if (!state.values.vClienteCodigo) {
      return;
    }
    try {
      const puntos = await fetchJson(`/api/puntos-entrega?cliente=${state.values.vClienteCodigo}`);
      state.catalogs.puntosEntrega = puntos;
      setSelectOptions(elements.puntosEntregaList, puntos, 'codigo_puntoentrega', 'concatenarpuntoentrega');
      const hasPuntos = puntos.length > 0;
      elements.entregaExistente.disabled = !hasPuntos;
      if (!hasPuntos) {
        elements.entregaNuevo.checked = true;
        updateEntregaMode();
      }
    } catch (error) {
      showAlert('danger', error.message);
    }
  }

  async function loadNumRecibe() {
    if (!state.values.vClienteCodigo) {
      return;
    }
    try {
      const numRecibe = await fetchJson(`/api/numrecibe?cliente=${state.values.vClienteCodigo}`);
      state.catalogs.numRecibe = numRecibe;
      setSelectOptions(elements.recibeList, numRecibe, 'ordinal_numrecibe', 'concatenarnumrecibe');
      const hasRecibe = numRecibe.length > 0;
      elements.recibeExistente.disabled = !hasRecibe;
      if (!hasRecibe) {
        elements.recibeNuevo.checked = true;
        updateRecibeMode();
      }
    } catch (error) {
      showAlert('danger', error.message);
    }
  }

  async function loadUbigeoDepartamentos() {
    try {
      const deps = await fetchJson('/api/ubigeo/departamentos');
      elements.departamentoSelect.innerHTML = '';
      deps.forEach((dep) => {
        const option = document.createElement('option');
        option.value = dep.cod_dep;
        option.textContent = dep.departamento;
        if (dep.cod_dep === state.values.vCod_Dep) {
          option.selected = true;
          state.values.vDepartamento = dep.departamento;
        }
        elements.departamentoSelect.appendChild(option);
      });
      await loadUbigeoProvincias(state.values.vCod_Dep);
    } catch (error) {
      showAlert('danger', error.message);
    }
  }

  async function loadUbigeoProvincias(codDep) {
    const provs = await fetchJson(`/api/ubigeo/provincias?dep=${codDep}`);
    elements.provinciaSelect.innerHTML = '';
    provs.forEach((prov) => {
      const option = document.createElement('option');
      option.value = prov.cod_prov;
      option.textContent = prov.provincia;
      if (prov.cod_prov === state.values.vCod_Prov) {
        option.selected = true;
        state.values.vProvincia = prov.provincia;
      }
      elements.provinciaSelect.appendChild(option);
    });
    await loadUbigeoDistritos(state.values.vCod_Dep, state.values.vCod_Prov);
  }

  async function loadUbigeoDistritos(codDep, codProv) {
    const dists = await fetchJson(`/api/ubigeo/distritos?dep=${codDep}&prov=${codProv}`);
    elements.distritoSelect.innerHTML = '';
    dists.forEach((dist) => {
      const option = document.createElement('option');
      option.value = dist.cod_dist;
      option.textContent = dist.distrito;
      if (dist.cod_dist === state.values.vCod_Dist) {
        option.selected = true;
        state.values.vDistrito = dist.distrito;
      }
      elements.distritoSelect.appendChild(option);
    });
    if (!state.values.vCod_Dist && dists[0]) {
      state.values.vCod_Dist = dists[0].cod_dist;
      state.values.vDistrito = dists[0].distrito;
      elements.distritoSelect.value = dists[0].cod_dist;
    }
    updateEntregaRegion();
  }

  async function fetchNextPedido() {
    const data = await fetchJson('/api/next/pedido');
    state.values.vcodigo_pedido = data.next;
    elements.codigoPedido.value = data.next;
  }

  async function fetchNextFactura() {
    const data = await fetchJson('/api/next/factura');
    state.values.vNumero_documento = data.next;
    elements.numeroFactura.value = data.next;
  }

  async function fetchNextPuntoEntrega() {
    if (!state.values.vClienteCodigo) {
      return;
    }
    const data = await fetchJson(`/api/next/puntoentrega?cliente=${state.values.vClienteCodigo}`);
    state.values.Vcodigo_puntoentrega = data.next;
  }

  async function fetchNextNumRecibe() {
    if (!state.values.vClienteCodigo) {
      return;
    }
    const data = await fetchJson(`/api/next/numrecibe?cliente=${state.values.vClienteCodigo}`);
    state.values.vOrdinal_numrecibe = data.next;
  }

  async function fetchNextRecibo() {
    const data = await fetchJson('/api/next/recibo');
    state.values.vNumero_documento_pago = data.next;
  }

  function setFechaHora() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    state.values.vFechaPedido = `${yyyy}-${mm}-${dd}`;
    state.values.vHoraPedido = `${hh}:${min}`;
    state.values.vFechaP = `${state.values.vFechaPedido} ${state.values.vHoraPedido}:00`;
    elements.fechaPedido.value = state.values.vFechaPedido;
    elements.horaPedido.value = state.values.vHoraPedido;
    elements.fechaEmision.value = state.values.vFechaPedido;
    elements.horaEmision.value = state.values.vHoraPedido;
  }

  async function prepareFacturaFromPedido() {
    state.values.vProdFactura = state.values.vProdPedidos.map((row) => {
      const qty = Number(row.vCantidadProducto || 0);
      const total = Number(row.vPrecioTotal || 0);
      const unit = qty > 0 ? total / qty : 0;
      return {
        vProductoCodigo: row.vProductoCodigo,
        vProductoNombre: row.vProductoNombre,
        vFCantidadProducto: row.vCantidadProducto,
        vFPrecioTotal: total,
        vPrecioUnitario: unit
      };
    });
    renderFacturaRows();
    recalcFacturaTotals();
  }

  async function loadBasesCandidatas() {
    const payload = {
      vProdFactura: state.values.vProdFactura.map((row) => ({
        vFProducto: row.vProductoCodigo,
        vFCantidadProducto: Number(row.vFCantidadProducto || 0),
        vFPrecioTotal: Number(row.vFPrecioTotal || 0)
      })),
      vFechaPedido: state.values.vFechaP
    };
    const candidatas = await fetchJson('/api/bases-candidatas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    renderBasesCandidatas(candidatas || []);
    if (candidatas.length && state.values.vLatitud && state.values.vLongitud) {
      await calcularEtas(candidatas);
    } else {
      elements.basesEta.innerHTML = '<li>Sin bases candidatas</li>';
    }
  }

  function renderBasesCandidatas(bases) {
    elements.basesCandidatas.innerHTML = '';
    const unique = [];
    const seen = new Set();
    bases.forEach((base) => {
      const key = String(base.codigo_base);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(base);
      }
    });
    if (!unique.length) {
      elements.basesCandidatas.innerHTML = '<li>Sin bases candidatas</li>';
      return;
    }
    unique.forEach((base) => {
      const li = document.createElement('li');
      li.textContent = `Base ${base.codigo_base}`;
      elements.basesCandidatas.appendChild(li);
    });
  }

  async function calcularEtas(bases) {
    try {
      const payload = {
        origin: { lat: state.values.vLatitud, lng: state.values.vLongitud },
        destinations: bases
      };
      const data = await fetchJson('/api/distance-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const sorted = data.etas.sort((a, b) => a.duration.value - b.duration.value);
      elements.basesEta.innerHTML = '';
      sorted.forEach((eta) => {
        const li = document.createElement('li');
        li.textContent = `Base ${eta.codigo_base} - ${eta.duration.text}`;
        elements.basesEta.appendChild(li);
      });
      if (sorted[0]) {
        const base = state.catalogs.bases.find((b) => String(b.codigo_base) === String(sorted[0].codigo_base));
        if (base) {
          state.values.vCodigo_base = base.codigo_base;
          state.values.vBaseNombre = base.nombre;
          state.values.vBaseSugerida = base.nombre;
          elements.baseSelect.value = base.nombre;
          elements.baseSugerida.value = base.nombre;
        }
      }
    } catch (error) {
      elements.basesEta.innerHTML = '<li>Sin bases candidatas</li>';
    }
  }

  async function validateStep(step) {
    clearAlert();
    if (step === 1) {
      if (elements.clienteExistente.checked) {
        const data = findOptionData(elements.clientesList, elements.clienteSelect.value);
        if (!data) {
          showAlert('warning', 'Seleccione un cliente valido.');
          return false;
        }
        state.values.vClienteCodigo = data.codigo_cliente;
        state.values.vClienteNombre = data.nombre;
        state.values.vClienteNumero = data.numero;
      } else {
        if (!elements.clienteNombre.value.trim() || !elements.clienteNumero.value.trim()) {
          showAlert('warning', 'Complete nombre y numero del cliente.');
          return false;
        }
        if (!state.values.vClienteCodigo) {
          showAlert('warning', 'No se pudo generar el codigo del cliente.');
          return false;
        }
        state.values.vClienteNombre = elements.clienteNombre.value.trim();
        state.values.vClienteNumero = elements.clienteNumero.value.trim();
      }
      await loadPuntosEntrega();
      await loadNumRecibe();
    }

    if (step === 2) {
      if (!state.values.vProdPedidos.length) {
        showAlert('warning', 'Agregue al menos un producto.');
        return false;
      }
      for (const row of state.values.vProdPedidos) {
        if (!row.vProductoCodigo || !regex.decimal.test(String(row.vCantidadProducto)) || !regex.decimal.test(String(row.vPrecioTotal))) {
          showAlert('warning', 'Complete productos, cantidad y precio validos.');
          return false;
        }
      }
      await prepareFacturaFromPedido();
    }

    if (step === 3) {
      for (let i = 0; i < state.values.vProdFactura.length; i += 1) {
        const row = state.values.vProdFactura[i];
        if (!regex.decimal.test(String(row.vFCantidadProducto))) {
          showAlert('warning', 'Cantidad de factura invalida.');
          return false;
        }
        const pedidoRow = state.values.vProdPedidos.find((item) => item.vProductoCodigo === row.vProductoCodigo);
        if (pedidoRow && Number(row.vFCantidadProducto) > Number(pedidoRow.vCantidadProducto)) {
          showAlert('danger', 'La cantidad facturada no puede ser mayor a la cantidad pedida.');
          return false;
        }
      }
    }

    if (step === 4) {
      if (elements.entregaExistente.checked) {
        const data = findOptionData(elements.puntosEntregaList, elements.puntoEntregaSelect.value);
        if (!data) {
          showAlert('warning', 'Seleccione un punto de entrega valido.');
          return false;
        }
        state.values.Vcodigo_puntoentrega = data.codigo_puntoentrega;
        state.values.vRegion_Entrega = data.region_entrega;
        state.values.vDireccionLinea = data.direccion_linea;
        state.values.vReferencia = data.referencia;
        state.values.vNombre = data.nombre;
        state.values.vDni = data.dni;
        state.values.vAgencia = data.agencia;
        state.values.vObservaciones = data.observaciones;
        state.values.vDepartamento = data.departamento;
        state.values.vProvincia = data.provincia;
        state.values.vDistrito = data.distrito;
        state.values.Vubigeo = data.ubigeo;
        state.values.vLatitud = data.latitud || state.values.vLatitud;
        state.values.vLongitud = data.longitud || state.values.vLongitud;
        state.values.vfCostoEnvio = state.values.vRegion_Entrega === 'PROV' ? 50 : 0;
        state.values.Vconcatenarpuntoentrega = data.concatenarpuntoentrega;
      } else {
        state.values.vDireccionLinea = elements.direccionLinea.value.trim();
        state.values.vReferencia = elements.referencia.value.trim();
        state.values.vNombre = elements.entregaNombre.value.trim();
        state.values.vDni = elements.entregaDni.value.trim();
        state.values.vAgencia = elements.entregaAgencia.value.trim();
        state.values.vObservaciones = elements.entregaObservaciones.value.trim();
        state.values.Vubigeo = `${state.values.vCod_Dep}${state.values.vCod_Prov}${state.values.vCod_Dist}`;
        updateEntregaRegion();
        if (state.values.vRegion_Entrega === 'LIMA') {
          if (!state.values.vDireccionLinea) {
            showAlert('warning', 'Direccion requerida para Lima.');
            return false;
          }
        } else {
          if (!state.values.vNombre || !state.values.vDni) {
            showAlert('warning', 'Nombre y DNI requeridos para provincia.');
            return false;
          }
        }
        buildConcatenarPuntoEntrega();
      }
      updateStepsForRegion();
    }

    if (step === 5 && state.values.vRegion_Entrega === 'LIMA') {
      if (elements.recibeExistente.checked) {
        const data = findOptionData(elements.recibeList, elements.recibeSelect.value);
        if (!data) {
          showAlert('warning', 'Seleccione un numero recibe valido.');
          return false;
        }
        state.values.vOrdinal_numrecibe = data.ordinal_numrecibe;
        state.values.vNumeroRecibe = data.numero;
        state.values.vNombreRecibe = data.nombre;
        state.values.vConcatenarnumrecibe = data.concatenarnumrecibe;
      } else {
        if (!elements.recibeNumero.value.trim() || !elements.recibeNombre.value.trim()) {
          showAlert('warning', 'Complete numero y nombre para recibe.');
          return false;
        }
        state.values.vNumeroRecibe = elements.recibeNumero.value.trim();
        state.values.vNombreRecibe = elements.recibeNombre.value.trim();
        buildConcatenarNumRecibe();
      }
    }

    if (step === 6) {
      const data = findOptionData(elements.cuentasList, elements.cuentaSelect.value);
      if (elements.cuentaSelect.value && !data) {
        showAlert('warning', 'Seleccione una cuenta valida.');
        return false;
      }
      if (data) {
        state.values.vCuentaBancaria = data.codigo_cuentabancaria;
        state.values.vCuentaNombre = data.nombre;
        state.values.vCuentaBanco = data.banco;
      }
    }

    if (step === 7) {
      const data = findOptionData(elements.basesList, elements.baseSelect.value);
      if (!data) {
        showAlert('warning', 'Seleccione una base valida.');
        return false;
      }
      state.values.vCodigo_base = data.codigo_base;
      state.values.vBaseNombre = data.nombre;
    }

    if (step === 8) {
      renderResumen();
    }

    return true;
  }

  function onStepChange() {
    if (state.currentStep === 2) {
      if (!state.values.vcodigo_pedido) {
        fetchNextPedido();
      }
    }
    if (state.currentStep === 3) {
      if (!state.values.vNumero_documento) {
        fetchNextFactura();
      }
    }
    if (state.currentStep === 4) {
      loadUbigeoDepartamentos();
      updateEntregaMode();
    }
    if (state.currentStep === 6) {
      if (!state.values.vNumero_documento_pago) {
        fetchNextRecibo();
      }
      recomputePagos();
    }
    if (state.currentStep === 7) {
      loadBasesCandidatas();
    }
    if (state.currentStep === 8) {
      renderResumen();
    }
  }

  function registerEvents() {
    elements.refreshData.addEventListener('click', loadCatalogs);
    elements.clienteExistente.addEventListener('change', updateClienteMode);
    elements.clienteNuevo.addEventListener('change', updateClienteMode);

    elements.clienteSelect.addEventListener('change', () => {
      const data = findOptionData(elements.clientesList, elements.clienteSelect.value);
      if (data) {
        state.values.vClienteCodigo = data.codigo_cliente;
        state.values.vClienteNombre = data.nombre;
        state.values.vClienteNumero = data.numero;
        loadPuntosEntrega();
        loadNumRecibe();
      }
    });

    elements.addPedido.addEventListener('click', () => addPedidoRow());
    elements.clearPedido.addEventListener('click', () => {
      state.values.vProdPedidos = [];
      renderPedidoRows();
    });

    elements.entregaExistente.addEventListener('change', updateEntregaMode);
    elements.entregaNuevo.addEventListener('change', updateEntregaMode);

    elements.puntoEntregaSelect.addEventListener('change', () => {
      const data = findOptionData(elements.puntosEntregaList, elements.puntoEntregaSelect.value);
      if (data) {
        state.values.vRegion_Entrega = data.region_entrega;
        elements.regionEntrega.value = data.region_entrega;
        state.values.vDireccionLinea = data.direccion_linea;
        state.values.vReferencia = data.referencia;
        state.values.vNombre = data.nombre;
        state.values.vDni = data.dni;
        state.values.vAgencia = data.agencia;
        state.values.vObservaciones = data.observaciones;
        state.values.Vconcatenarpuntoentrega = data.concatenarpuntoentrega;
        elements.direccionLinea.value = data.direccion_linea || '';
        elements.referencia.value = data.referencia || '';
        elements.entregaNombre.value = data.nombre || '';
        elements.entregaDni.value = data.dni || '';
        elements.entregaAgencia.value = data.agencia || '';
        elements.entregaObservaciones.value = data.observaciones || '';
        elements.exDireccionLinea.value = data.direccion_linea || '';
        elements.exReferencia.value = data.referencia || '';
        elements.exNombre.value = data.nombre || '';
        elements.exDni.value = data.dni || '';
        elements.exAgencia.value = data.agencia || '';
        elements.exObservaciones.value = data.observaciones || '';
        updateEntregaRegion();
      }
    });

    elements.departamentoSelect.addEventListener('change', async () => {
      state.values.vCod_Dep = elements.departamentoSelect.value;
      await loadUbigeoProvincias(state.values.vCod_Dep);
    });

    elements.provinciaSelect.addEventListener('change', async () => {
      state.values.vCod_Prov = elements.provinciaSelect.value;
      await loadUbigeoDistritos(state.values.vCod_Dep, state.values.vCod_Prov);
    });

    elements.distritoSelect.addEventListener('change', () => {
      state.values.vCod_Dist = elements.distritoSelect.value;
      const selected = elements.distritoSelect.options[elements.distritoSelect.selectedIndex];
      state.values.vDistrito = selected ? selected.textContent : '';
      updateEntregaRegion();
    });

    elements.recibeExistente.addEventListener('change', updateRecibeMode);
    elements.recibeNuevo.addEventListener('change', updateRecibeMode);

    elements.recibeSelect.addEventListener('change', () => {
      const data = findOptionData(elements.recibeList, elements.recibeSelect.value);
      if (data) {
        state.values.vOrdinal_numrecibe = data.ordinal_numrecibe;
        state.values.vNumeroRecibe = data.numero;
        state.values.vNombreRecibe = data.nombre;
        state.values.vConcatenarnumrecibe = data.concatenarnumrecibe;
      }
    });

    elements.cuentaSelect.addEventListener('change', () => {
      const data = findOptionData(elements.cuentasList, elements.cuentaSelect.value);
      if (data) {
        state.values.vCuentaBancaria = data.codigo_cuentabancaria;
        state.values.vCuentaNombre = data.nombre;
        state.values.vCuentaBanco = data.banco;
        elements.cuentaBanco.value = data.banco;
      }
    });

    elements.addPago.addEventListener('click', () => {
      if (!elements.montoPago.value || Number(elements.montoPago.value) === 0) {
        return;
      }
      if (!state.values.vCuentaBancaria) {
        showAlert('warning', 'Seleccione una cuenta bancaria antes de agregar pagos.');
        return;
      }
      if (!regex.decimal.test(elements.montoPago.value)) {
        showAlert('warning', 'Monto de pago invalido.');
        return;
      }
      const monto = Number(elements.montoPago.value);
      if (monto > state.values.vMontoPendiente) {
        showAlert('danger', 'Monto de pago supera el pendiente.');
        return;
      }
      const numdocumento = state.values.vNumero_documento_pago + state.values.vPagos.length;
      state.values.vPagos.push({
        numdocumento,
        monto,
        codigo_cuentabancaria: state.values.vCuentaBancaria
      });
      recomputePagos();
      if (state.values.vMontoPendiente === 0) {
        elements.addPago.disabled = true;
      }
    });

    elements.baseSelect.addEventListener('change', () => {
      const data = findOptionData(elements.basesList, elements.baseSelect.value);
      if (data) {
        state.values.vCodigo_base = data.codigo_base;
        state.values.vBaseNombre = data.nombre;
      }
    });

    elements.emitirFactura.addEventListener('click', async () => {
      if (!elements.confirmEmitir.checked) {
        showAlert('warning', 'Debe confirmar la operacion.');
        return;
      }
      setLoading(true, 'Registrando factura...');
      try {
        const payload = buildEmitPayload();
        await fetchJson('/api/emitir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showAlert('success', 'Factura emitida correctamente.');
      } catch (error) {
        showAlert('danger', error.message);
      } finally {
        setLoading(false);
      }
    });
  }

  function buildEmitPayload() {
    return {
      cliente: {
        tipo: elements.clienteNuevo.checked ? 'nuevo' : 'existente',
        codigo: state.values.vClienteCodigo,
        nombre: state.values.vClienteNombre,
        numero: state.values.vClienteNumero
      },
      pedido: {
        codigo_pedido: state.values.vcodigo_pedido,
        codigo_cliente: state.values.vClienteCodigo,
        fecha: state.values.vFechaP,
        detalle: state.values.vProdPedidos
      },
      entrega: {
        tipo: elements.entregaNuevo.checked ? 'nuevo' : 'existente',
        codigo_puntoentrega: state.values.Vcodigo_puntoentrega,
        ubigeo: state.values.Vubigeo,
        codigo_cliente: state.values.vClienteCodigo,
        direccion_linea: state.values.vDireccionLinea,
        referencia: state.values.vReferencia,
        nombre: state.values.vNombre,
        dni: state.values.vDni,
        agencia: state.values.vAgencia,
        observaciones: state.values.vObservaciones,
        region_entrega: state.values.vRegion_Entrega,
        concatenarpuntoentrega: state.values.Vconcatenarpuntoentrega
      },
      recibe: {
        tipo: state.values.vRegion_Entrega === 'LIMA' ? (elements.recibeNuevo.checked ? 'nuevo' : 'existente') : 'no_aplica',
        ordinal_numrecibe: state.values.vOrdinal_numrecibe,
        numero: state.values.vNumeroRecibe,
        nombre: state.values.vNombreRecibe,
        concatenarnumrecibe: state.values.vConcatenarnumrecibe
      },
      factura: {
        tipo_documento: 'FAC',
        numero_documento: state.values.vNumero_documento,
        fecha: state.values.vFechaP,
        codigo_base: state.values.vCodigo_base,
        costoenvio: state.values.vfCostoEnvio,
        monto: state.values.vfMonto,
        saldo: state.values.vfTotal,
        detalle: state.values.vProdFactura
      },
      pagos: state.values.vPagos,
      cuenta: {
        codigo_cuentabancaria: state.values.vCuentaBancaria
      }
    };
  }

  async function loadConfigAndMap() {
    try {
      const config = await fetchJson('/api/config');
      state.config = config;
      await loadGoogleMaps(config.google_maps);
    } catch (error) {
      showAlert('warning', 'No se pudo cargar Google Maps.');
    }
  }

  function loadGoogleMaps(config) {
    return new Promise((resolve, reject) => {
      if (!config || !config.api_key) {
        reject(new Error('Sin API key'));
        return;
      }
      if (window.google && window.google.maps) {
        initMap(config);
        resolve();
        return;
      }
      window.initMap = () => {
        initMap(config);
        resolve();
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.api_key}&libraries=places&callback=initMap`;
      script.async = true;
      script.onerror = () => reject(new Error('Error al cargar Maps'));
      document.head.appendChild(script);
    });
  }

  function initMap(config) {
    const center = config.default_center || { lat: -12.0464, lng: -77.0428 };
    const map = new google.maps.Map(elements.map, {
      center,
      zoom: config.default_zoom || 12
    });
    const marker = new google.maps.Marker({ map, draggable: true });
    const geocoder = new google.maps.Geocoder();

    map.addListener('click', (event) => {
      marker.setPosition(event.latLng);
      setLatLng(event.latLng.lat(), event.latLng.lng());
      geocoder.geocode({ location: event.latLng }, (results, status) => {
        if (status === 'OK' && results[0]) {
          elements.direccionLinea.value = results[0].formatted_address;
        }
      });
    });

    marker.addListener('dragend', (event) => {
      setLatLng(event.latLng.lat(), event.latLng.lng());
    });

    const autocomplete = new google.maps.places.Autocomplete(elements.mapSearch);
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) {
        return;
      }
      map.setCenter(place.geometry.location);
      marker.setPosition(place.geometry.location);
      elements.direccionLinea.value = place.formatted_address || '';
      setLatLng(place.geometry.location.lat(), place.geometry.location.lng());
    });
  }

  function setLatLng(lat, lng) {
    state.values.vLatitud = lat;
    state.values.vLongitud = lng;
    elements.latitud.value = lat;
    elements.longitud.value = lng;
  }

  async function init() {
    setLanguage();
    registerEvents();
    setFechaHora();
    await loadCatalogs();
    await loadConfigAndMap();
    addPedidoRow();
    updateClienteMode();
    updateEntregaMode();
    updateRecibeMode();
    new FormWizard();
  }

  init();
})();
