const state = {
  step: 1,
  totalSteps: 8,
  clienteModo: 'existente',
  entregaModo: 'existente',
  recibeModo: 'existente',
  regionEntrega: null,
  clientes: [],
  productos: [],
  puntosEntrega: [],
  departamentos: [],
  provincias: [],
  distritos: [],
  numrecibe: [],
  cuentas: [],
  bases: [],
  basesCandidatas: [],
  pedidoDetalle: [],
  facturaDetalle: [],
  pagos: [],
  mapsReady: false,
  map: null,
  geocoder: null,
  nextCodigoCliente: null,
  nextCodigoPedido: null,
  nextNumeroFactura: null,
  nextNumeroRecibo: null,
  nextOrdinalRecibe: null,
  nextPuntoEntrega: null,
  config: {
    googleMapsKey: '',
    mapCenter: { lat: -12.0464, lng: -77.0428 },
    mapZoom: 12
  }
};

const decimalRegex = /^\d+(?:\.\d{1,2})?$/;

const i18n = {
  es: {
    tag: 'IaaS + PaaS Global',
    title: 'Pedidos',
    subtitle: 'Wizard multi-paso para registrar pedidos, factura, entrega y pagos.',
    status: 'Estado del flujo',
    statusHint: 'Completa cada paso para emitir la factura.',
    step1Title: '1. Seleccionar o crear cliente',
    step1Subtitle: 'Define si trabajaras con un cliente existente o uno nuevo.',
    step2Title: '2. Crear pedido',
    step2Subtitle: 'Agrega productos, cantidades y precios.',
    step3Title: '3. Crear factura',
    step3Subtitle: 'Valida cantidades y montos de factura.',
    step4Title: '4. Datos entrega',
    step4Subtitle: 'Selecciona un punto existente o crea uno nuevo.',
    step5Title: '5. Datos recibe',
    step5Subtitle: 'Solo aplica para entregas en Lima.',
    step6Title: '6. Registro de pago (recibo)',
    step6Subtitle: 'Puedes registrar pagos parciales o dejar saldo pendiente.',
    step7Title: '7. Asignar base',
    step7Subtitle: 'Selecciona la base para la factura.',
    step8Title: '8. Resumen y emitir factura',
    step8Subtitle: 'Revisa toda la informacion antes de emitir.',
    required: 'Requerido',
    editable: 'Editable',
    optional: 'Condicional',
    clienteExistente: 'Cliente existente',
    clienteNuevo: 'Cliente nuevo',
    cliente: 'Cliente',
    numero: 'Numero',
    clienteNombre: 'Nombre',
    clienteNumero: 'Numero',
    fechaPedido: 'Fecha pedido',
    horaPedido: 'Hora pedido',
    codigoPedido: 'Codigo pedido',
    producto: 'Producto',
    cantidad: 'Cantidad',
    precioTotal: 'Precio total',
    acciones: 'Acciones',
    agregarLinea: 'Agregar linea',
    fechaEmision: 'Fecha emision',
    horaEmision: 'Hora emision',
    numeroFactura: 'Numero documento',
    montoFactura: 'Monto factura',
    entregaExistente: 'Existe',
    entregaNuevo: 'Nuevo',
    puntoEntrega: 'Punto entrega',
    regionEntrega: 'Region entrega',
    direccion: 'Direccion',
    referencia: 'Referencia',
    nombre: 'Nombre',
    dni: 'DNI',
    agencia: 'Agencia',
    observaciones: 'Observaciones',
    departamento: 'Departamento',
    provincia: 'Provincia',
    distrito: 'Distrito',
    mapTitle: 'Mapa de entrega',
    mapSubtitle: 'Selecciona el punto exacto en Lima.',
    mapHint: 'Click para geocodificar',
    latitud: 'Latitud',
    longitud: 'Longitud',
    recibeExistente: 'Existe',
    recibeNuevo: 'Nuevo',
    recibe: 'Recibe',
    numeroRecibe: 'Numero',
    nombreRecibe: 'Nombre',
    cuenta: 'Cuenta bancaria',
    banco: 'Banco',
    montoPendiente: 'Monto pendiente',
    montoPago: 'Monto pago',
    registrarPago: 'Registrar pago',
    numeroDocumento: 'Numero documento',
    monto: 'Monto',
    base: 'Base',
    basesCandidatas: 'Bases candidatas',
    confirm: 'Confirmar operacion',
    confirmText: 'Confirmo la operacion.',
    emitirFactura: 'Emitir factura',
    prev: 'Anterior',
    next: 'Siguiente'
  },
  en: {
    tag: 'Global IaaS + PaaS',
    title: 'Orders',
    subtitle: 'Multi-step wizard to register orders, invoices, delivery, and payments.',
    status: 'Flow status',
    statusHint: 'Complete each step to issue the invoice.',
    step1Title: '1. Select or create client',
    step1Subtitle: 'Choose an existing client or create a new one.',
    step2Title: '2. Create order',
    step2Subtitle: 'Add products, quantities, and totals.',
    step3Title: '3. Create invoice',
    step3Subtitle: 'Validate invoice quantities and totals.',
    step4Title: '4. Delivery data',
    step4Subtitle: 'Pick an existing point or create a new one.',
    step5Title: '5. Receiver data',
    step5Subtitle: 'Applies only to Lima deliveries.',
    step6Title: '6. Payment record (receipt)',
    step6Subtitle: 'Register partial payments or leave a balance.',
    step7Title: '7. Assign base',
    step7Subtitle: 'Select the base for the invoice.',
    step8Title: '8. Summary and issue invoice',
    step8Subtitle: 'Review all information before issuing.',
    required: 'Required',
    editable: 'Editable',
    optional: 'Conditional',
    clienteExistente: 'Existing client',
    clienteNuevo: 'New client',
    cliente: 'Client',
    numero: 'Number',
    clienteNombre: 'Name',
    clienteNumero: 'Number',
    fechaPedido: 'Order date',
    horaPedido: 'Order time',
    codigoPedido: 'Order code',
    producto: 'Product',
    cantidad: 'Quantity',
    precioTotal: 'Total price',
    acciones: 'Actions',
    agregarLinea: 'Add row',
    fechaEmision: 'Issue date',
    horaEmision: 'Issue time',
    numeroFactura: 'Document number',
    montoFactura: 'Invoice total',
    entregaExistente: 'Existing',
    entregaNuevo: 'New',
    puntoEntrega: 'Delivery point',
    regionEntrega: 'Delivery region',
    direccion: 'Address',
    referencia: 'Reference',
    nombre: 'Name',
    dni: 'ID',
    agencia: 'Agency',
    observaciones: 'Notes',
    departamento: 'Department',
    provincia: 'Province',
    distrito: 'District',
    mapTitle: 'Delivery map',
    mapSubtitle: 'Pick the exact point in Lima.',
    mapHint: 'Click to geocode',
    latitud: 'Latitude',
    longitud: 'Longitude',
    recibeExistente: 'Existing',
    recibeNuevo: 'New',
    recibe: 'Receiver',
    numeroRecibe: 'Number',
    nombreRecibe: 'Name',
    cuenta: 'Bank account',
    banco: 'Bank',
    montoPendiente: 'Pending amount',
    montoPago: 'Payment amount',
    registrarPago: 'Add payment',
    numeroDocumento: 'Document number',
    monto: 'Amount',
    base: 'Base',
    basesCandidatas: 'Candidate bases',
    confirm: 'Confirm operation',
    confirmText: 'I confirm the operation.',
    emitirFactura: 'Issue invoice',
    prev: 'Previous',
    next: 'Next'
  }
};

function applyLanguage() {
  const lang = navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
  const dict = i18n[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

function showAlert(message, type = 'danger') {
  const alertArea = document.getElementById('alertArea');
  const wrapper = document.createElement('div');
  wrapper.className = `alert alert-${type}`;
  wrapper.textContent = message;
  alertArea.innerHTML = '';
  alertArea.appendChild(wrapper);
}

function clearAlert() {
  const alertArea = document.getElementById('alertArea');
  alertArea.innerHTML = '';
}

function setLoading(isLoading, message = 'Cargando...') {
  const loading = document.getElementById('loadingState');
  if (isLoading) {
    loading.textContent = message;
    loading.classList.add('active');
  } else {
    loading.classList.remove('active');
    loading.textContent = '';
  }
}

function formatNumber(value) {
  const num = Number(value || 0);
  return num.toFixed(2);
}

function fetchJson(url, options) {
  return fetch(url, options).then((res) => {
    if (!res.ok) {
      return res.json().then((data) => Promise.reject(new Error(data.message || 'Error')));
    }
    return res.json();
  });
}

function setProgress(step) {
  const progress = document.getElementById('progressBar');
  const badge = document.getElementById('stepBadge');
  const percent = Math.round((step / state.totalSteps) * 100);
  progress.style.width = `${percent}%`;
  badge.textContent = `Paso ${step}/${state.totalSteps}`;
}

function updateRegionBadge() {
  const badge = document.getElementById('regionBadge');
  badge.textContent = `Region: ${state.regionEntrega || '-'}`;
}

function togglePanels() {
  document.getElementById('clienteExistentePanel').classList.toggle('hidden', state.clienteModo !== 'existente');
  document.getElementById('clienteNuevoPanel').classList.toggle('hidden', state.clienteModo !== 'nuevo');
  document.getElementById('entregaExistentePanel').classList.toggle('hidden', state.entregaModo !== 'existente');
  document.getElementById('entregaNuevoPanel').classList.toggle('hidden', state.entregaModo !== 'nuevo');
  document.getElementById('recibeExistentePanel').classList.toggle('hidden', state.recibeModo !== 'existente');
  document.getElementById('recibeNuevoPanel').classList.toggle('hidden', state.recibeModo !== 'nuevo');
}

function renderClientes() {
  const list = document.getElementById('clientesList');
  list.innerHTML = '';
  state.clientes.forEach((cliente) => {
    const option = document.createElement('option');
    option.value = cliente.nombre;
    list.appendChild(option);
  });
}

function renderProductos() {
  const list = document.getElementById('productosList');
  if (!list) {
    const datalist = document.createElement('datalist');
    datalist.id = 'productosList';
    document.body.appendChild(datalist);
  }
  const datalist = document.getElementById('productosList');
  datalist.innerHTML = '';
  state.productos.forEach((producto) => {
    const option = document.createElement('option');
    option.value = producto.nombre;
    datalist.appendChild(option);
  });
}

function renderPuntosEntrega() {
  const list = document.getElementById('puntosEntregaList');
  list.innerHTML = '';
  state.puntosEntrega.forEach((punto) => {
    const option = document.createElement('option');
    option.value = punto.concatenarpuntoentrega;
    list.appendChild(option);
  });
  const hasPuntos = state.puntosEntrega.length > 0;
  const option = document.getElementById('entregaExistenteOption');
  option.classList.toggle('hidden', !hasPuntos);
  if (!hasPuntos) {
    document.getElementById('entregaNuevo').checked = true;
    state.entregaModo = 'nuevo';
  }
  togglePanels();
}

function renderDepartamentos() {
  const list = document.getElementById('departamentosList');
  list.innerHTML = '';
  state.departamentos.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.departamento;
    list.appendChild(option);
  });
}

function renderProvincias() {
  const list = document.getElementById('provinciasList');
  list.innerHTML = '';
  state.provincias.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.provincia;
    list.appendChild(option);
  });
}

function renderDistritos() {
  const list = document.getElementById('distritosList');
  list.innerHTML = '';
  state.distritos.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.distrito;
    list.appendChild(option);
  });
}

function renderNumrecibe() {
  const list = document.getElementById('recibeList');
  list.innerHTML = '';
  state.numrecibe.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.concatenarnumrecibe;
    list.appendChild(option);
  });
  const hasRecibe = state.numrecibe.length > 0;
  const option = document.getElementById('recibeExistenteOption');
  option.classList.toggle('hidden', !hasRecibe);
  if (!hasRecibe) {
    document.getElementById('recibeNuevo').checked = true;
    state.recibeModo = 'nuevo';
  }
  togglePanels();
}

function renderCuentas() {
  const list = document.getElementById('cuentasList');
  list.innerHTML = '';
  state.cuentas.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.nombre;
    list.appendChild(option);
  });
}

function renderBases() {
  const list = document.getElementById('basesList');
  list.innerHTML = '';
  const combined = [...state.basesCandidatas, ...state.bases];
  const seen = new Set();
  combined.forEach((item) => {
    if (seen.has(item.codigo_base)) return;
    const option = document.createElement('option');
    option.value = item.nombre || String(item.codigo_base);
    list.appendChild(option);
    seen.add(item.codigo_base);
  });
  const container = document.getElementById('basesCandidatas');
  container.innerHTML = '';
  state.basesCandidatas.forEach((item) => {
    const pill = document.createElement('div');
    pill.className = 'candidate-pill';
    pill.textContent = `Base ${item.codigo_base} (${item.latitud}, ${item.longitud})`;
    container.appendChild(pill);
  });
}

function addPedidoRow(prefill = {}) {
  const rowId = Date.now() + Math.random();
  const row = {
    id: rowId,
    productoCodigo: prefill.productoCodigo || '',
    productoNombre: prefill.productoNombre || '',
    cantidad: prefill.cantidad || '',
    precioTotal: prefill.precioTotal || ''
  };
  state.pedidoDetalle.push(row);
  renderPedido();
}

function renderPedido() {
  const tbody = document.getElementById('pedidoBody');
  tbody.innerHTML = '';
  state.pedidoDetalle.forEach((row, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input class="form-control" list="productosList" value="${row.productoNombre}" data-row="${row.id}" data-field="producto" placeholder="Producto" />
      </td>
      <td>
        <input class="form-control" value="${row.cantidad}" data-row="${row.id}" data-field="cantidad" placeholder="0.00" />
      </td>
      <td>
        <input class="form-control" value="${row.precioTotal}" data-row="${row.id}" data-field="precio" placeholder="0.00" />
      </td>
      <td>
        <button class="btn btn-outline-light btn-sm" type="button" data-action="remove" data-row="${row.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFactura() {
  const tbody = document.getElementById('facturaBody');
  tbody.innerHTML = '';
  state.facturaDetalle.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.productoNombre}</td>
      <td>
        <input class="form-control" value="${row.cantidad}" data-row="${row.id}" data-field="cantidad-factura" />
      </td>
      <td>${formatNumber(row.precioTotal)}</td>
      <td>
        <button class="btn btn-outline-light btn-sm" type="button" data-action="remove-factura" data-row="${row.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('montoFactura').textContent = formatNumber(getFacturaMonto());
  const pagosTotal = state.pagos.reduce((sum, pago) => sum + Number(pago.monto || 0), 0);
  const pendiente = Math.max(getFacturaMonto() - pagosTotal, 0);
  document.getElementById('montoPendiente').value = formatNumber(pendiente);
  if (pagosTotal === 0) {
    document.getElementById('montoPago').value = formatNumber(pendiente);
  }
}

function renderPagos() {
  const tbody = document.getElementById('pagosBody');
  tbody.innerHTML = '';
  state.pagos.forEach((pago) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${pago.numdocumento}</td>
      <td>${formatNumber(pago.monto)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function getFacturaMonto() {
  return state.facturaDetalle.reduce((sum, row) => sum + Number(row.precioTotal || 0), 0);
}

function syncFacturaFromPedido() {
  const map = new Map();
  state.facturaDetalle.forEach((row) => map.set(row.productoCodigo, row));
  state.facturaDetalle = state.pedidoDetalle.map((row) => {
    const existing = map.get(row.productoCodigo) || {};
    const cantidad = existing.cantidad || row.cantidad;
    const precioUnitario = Number(row.precioTotal || 0) / Number(row.cantidad || 1);
    const precioTotal = precioUnitario * Number(cantidad || 0);
    return {
      id: row.id,
      productoCodigo: row.productoCodigo,
      productoNombre: row.productoNombre,
      cantidad,
      precioUnitario,
      precioTotal,
      maxCantidad: row.cantidad
    };
  });
  renderFactura();
  if (state.pagos.length === 0) {
    document.getElementById('montoPendiente').value = formatNumber(getFacturaMonto());
    document.getElementById('montoPago').value = formatNumber(getFacturaMonto());
  }
}

function updateRegionPanels() {
  const region = state.regionEntrega;
  const limaPanel = document.getElementById('entregaLimaPanel');
  const provPanel = document.getElementById('entregaProvPanel');
  const provNuevoPanel = document.getElementById('entregaProvNuevoPanel');
  if (region === 'LIMA') {
    limaPanel.classList.remove('hidden');
    provPanel.classList.add('hidden');
    provNuevoPanel.classList.add('hidden');
  } else if (region === 'PROV') {
    limaPanel.classList.add('hidden');
    provPanel.classList.remove('hidden');
    provNuevoPanel.classList.remove('hidden');
  } else {
    limaPanel.classList.add('hidden');
    provPanel.classList.add('hidden');
    provNuevoPanel.classList.add('hidden');
  }
  updateRegionBadge();
}

function computeRegion(codDep, codProv) {
  if (codDep === '15' && codProv === '01') {
    return 'LIMA';
  }
  if (codDep && codProv) {
    return 'PROV';
  }
  return null;
}

function buildConcatenarPunto(entrega) {
  if (entrega.region_entrega === 'LIMA') {
    const parts = [entrega.direccion_linea, entrega.distrito];
    if (entrega.referencia) parts.push(entrega.referencia);
    return parts.filter(Boolean).join(' | ');
  }
  const parts = [entrega.nombre, entrega.dni, entrega.agencia, entrega.observaciones];
  return parts.filter(Boolean).join(' | ');
}

function buildConcatenarRecibe(recibe) {
  return [recibe.numero, recibe.nombre].filter(Boolean).join(' | ');
}

function initMap() {
  if (state.mapsReady || !state.config.googleMapsKey) return;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${state.config.googleMapsKey}&libraries=places`;
  script.async = true;
  script.onload = () => {
    state.mapsReady = true;
    state.map = new google.maps.Map(document.getElementById('map'), {
      center: state.config.mapCenter,
      zoom: state.config.mapZoom
    });
    state.geocoder = new google.maps.Geocoder();
    state.map.addListener('click', (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      document.getElementById('latitud').value = lat.toFixed(6);
      document.getElementById('longitud').value = lng.toFixed(6);
      state.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          document.getElementById('direccionLineaNuevo').value = results[0].formatted_address;
        }
      });
    });
  };
  script.onerror = () => showAlert('No se pudo cargar Google Maps.');
  document.head.appendChild(script);
}

function updateSummary() {
  const summary = document.getElementById('summary');
  const clienteNombre = state.clienteModo === 'existente'
    ? document.getElementById('clienteSelect').value
    : document.getElementById('clienteNombreNuevo').value;
  const pedidoItems = state.pedidoDetalle.map((row) => `<li>${row.productoNombre} - ${row.cantidad} - ${row.precioTotal}</li>`).join('');
  const facturaItems = state.facturaDetalle.map((row) => `<li>${row.productoNombre} - ${row.cantidad} - ${formatNumber(row.precioTotal)}</li>`).join('');
  const entregaModo = state.entregaModo === 'existente' ? 'EXISTENTE' : 'NUEVO';
  const recibeModo = state.recibeModo === 'existente' ? 'EXISTENTE' : 'NUEVO';
  const region = state.regionEntrega || '-';
  summary.innerHTML = `
    <h4>Cliente</h4>
    <p>${clienteNombre}</p>
    <h4>Pedido</h4>
    <ul>${pedidoItems}</ul>
    <h4>Factura</h4>
    <ul>${facturaItems}</ul>
    <p><strong>Monto:</strong> ${formatNumber(getFacturaMonto())}</p>
    <h4>Entrega</h4>
    <p>Modo: ${entregaModo} | Region: ${region}</p>
    <h4>Recibe</h4>
    <p>Modo: ${recibeModo}</p>
  `;
}

function nextStep() {
  clearAlert();
  if (!validateStep(state.step)) return;
  let next = state.step + 1;
  if (next === 5 && state.regionEntrega !== 'LIMA') {
    next = 6;
  }
  if (next > state.totalSteps) return;
  goToStep(next);
}

function prevStep() {
  clearAlert();
  let prev = state.step - 1;
  if (prev === 5 && state.regionEntrega !== 'LIMA') {
    prev = 4;
  }
  if (prev < 1) return;
  goToStep(prev);
}

function goToStep(step) {
  document.querySelectorAll('.step').forEach((section) => {
    section.classList.toggle('active', Number(section.dataset.step) === step);
  });
  state.step = step;
  setProgress(step);
  if (step === 3) {
    syncFacturaFromPedido();
    document.getElementById('fechaEmision').value = document.getElementById('fechaPedido').value;
    document.getElementById('horaEmision').value = document.getElementById('horaPedido').value;
  }
  if (step === 4) {
    initMap();
    if (state.clienteModo === 'nuevo') {
      loadNextPuntoEntrega(state.nextCodigoCliente);
    }
  }
  if (step === 7) {
    loadBasesCandidatas();
  }
  if (step === 8) {
    updateSummary();
  }
}

function validateStep(step) {
  if (step === 1) {
    if (state.clienteModo === 'existente') {
      const nombre = document.getElementById('clienteSelect').value.trim();
      const cliente = state.clientes.find((item) => item.nombre === nombre);
      if (!cliente) {
        showAlert('Selecciona un cliente existente.');
        return false;
      }
    } else {
      const nombre = document.getElementById('clienteNombreNuevo').value.trim();
      const numero = document.getElementById('clienteNumeroNuevo').value.trim();
      if (!nombre || !numero) {
        showAlert('Completa nombre y numero del cliente.');
        return false;
      }
      if (!state.nextCodigoCliente) {
        showAlert('No se pudo calcular el codigo del cliente nuevo.');
        return false;
      }
    }
  }
  if (step === 2) {
    if (state.pedidoDetalle.length === 0) {
      showAlert('Agrega al menos una linea al pedido.');
      return false;
    }
    for (const row of state.pedidoDetalle) {
      if (!row.productoCodigo || !row.productoNombre) {
        showAlert('Selecciona un producto valido.');
        return false;
      }
      if (!decimalRegex.test(String(row.cantidad)) || Number(row.cantidad) <= 0) {
        showAlert('Cantidad invalida.');
        return false;
      }
      if (!decimalRegex.test(String(row.precioTotal)) || Number(row.precioTotal) <= 0) {
        showAlert('Precio total invalido.');
        return false;
      }
    }
  }
  if (step === 3) {
    for (const row of state.facturaDetalle) {
      if (Number(row.cantidad) > Number(row.maxCantidad)) {
        showAlert('La cantidad facturada no puede superar la cantidad del pedido.');
        return false;
      }
    }
  }
  if (step === 4) {
    if (state.entregaModo === 'existente') {
      const texto = document.getElementById('puntoEntregaSelect').value.trim();
      const punto = state.puntosEntrega.find((item) => item.concatenarpuntoentrega === texto);
      if (!punto) {
        showAlert('Selecciona un punto de entrega existente.');
        return false;
      }
    } else {
      const dep = document.getElementById('departamentoSelect').value.trim();
      const prov = document.getElementById('provinciaSelect').value.trim();
      const dist = document.getElementById('distritoSelect').value.trim();
      if (!dep || !prov || !dist) {
        showAlert('Selecciona ubigeo completo.');
        return false;
      }
      if (!state.nextPuntoEntrega) {
        showAlert('No se pudo calcular el codigo del punto de entrega.');
        return false;
      }
      if (state.regionEntrega === 'LIMA') {
        const dir = document.getElementById('direccionLineaNuevo').value.trim();
        if (!dir) {
          showAlert('La direccion es requerida.');
          return false;
        }
      } else {
        const nombre = document.getElementById('entregaNombreNuevo').value.trim();
        if (!nombre) {
          showAlert('El nombre es requerido para entregas en provincia.');
          return false;
        }
      }
    }
  }
  if (step === 5 && state.regionEntrega === 'LIMA') {
    if (state.recibeModo === 'existente') {
      const texto = document.getElementById('recibeSelect').value.trim();
      const item = state.numrecibe.find((rec) => rec.concatenarnumrecibe === texto);
      if (!item) {
        showAlert('Selecciona un recibe existente.');
        return false;
      }
    } else {
      const numero = document.getElementById('recibeNumeroNuevo').value.trim();
      if (!numero) {
        showAlert('Numero de recibe requerido.');
        return false;
      }
    }
  }
  if (step === 6) {
    if (state.pagos.length > 0 && !document.getElementById('cuentaSelect').value.trim()) {
      showAlert('Selecciona cuenta bancaria para registrar pagos.');
      return false;
    }
  }
  if (step === 7) {
    const baseNombre = document.getElementById('baseSelect').value.trim();
    const base = state.bases.find((item) => item.nombre === baseNombre) || state.basesCandidatas.find((item) => item.codigo_base && String(item.codigo_base) === baseNombre);
    if (!base) {
      showAlert('Selecciona una base valida.');
      return false;
    }
  }
  if (step === 8) {
    if (!document.getElementById('confirmCheck').checked) {
      showAlert('Debes confirmar la operacion.');
      return false;
    }
  }
  return true;
}

function attachEvents() {
  document.getElementById('prevBtn').addEventListener('click', prevStep);
  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('emitirBtn').addEventListener('click', emitirFactura);

  document.querySelectorAll('input[name="clienteModo"]').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      state.clienteModo = event.target.value;
      togglePanels();
      if (state.clienteModo === 'nuevo' && !state.nextCodigoCliente) {
        loadNextCodigoCliente();
      }
    });
  });

  document.querySelectorAll('input[name="entregaModo"]').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      state.entregaModo = event.target.value;
      togglePanels();
      if (state.entregaModo === 'nuevo') {
        initMap();
      }
    });
  });

  document.querySelectorAll('input[name="recibeModo"]').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      state.recibeModo = event.target.value;
      togglePanels();
      if (state.recibeModo === 'nuevo') {
        loadNextOrdinalRecibe();
      }
    });
  });

  document.getElementById('clienteSelect').addEventListener('change', handleClienteSelect);
  document.getElementById('addPedidoRow').addEventListener('click', () => addPedidoRow());

  document.getElementById('pedidoBody').addEventListener('input', (event) => {
    const rowId = Number(event.target.dataset.row);
    const field = event.target.dataset.field;
    const row = state.pedidoDetalle.find((item) => item.id === rowId);
    if (!row) return;
    if (field === 'producto') {
      row.productoNombre = event.target.value;
      const producto = state.productos.find((item) => item.nombre === row.productoNombre);
      if (producto) {
        row.productoCodigo = producto.codigo_producto;
      }
    }
    if (field === 'cantidad') {
      row.cantidad = event.target.value;
    }
    if (field === 'precio') {
      row.precioTotal = event.target.value;
    }
  });

  document.getElementById('pedidoBody').addEventListener('click', (event) => {
    if (event.target.dataset.action === 'remove') {
      const rowId = Number(event.target.dataset.row);
      state.pedidoDetalle = state.pedidoDetalle.filter((item) => item.id !== rowId);
      renderPedido();
    }
  });

  document.getElementById('facturaBody').addEventListener('input', (event) => {
    const rowId = Number(event.target.dataset.row);
    const field = event.target.dataset.field;
    const row = state.facturaDetalle.find((item) => item.id === rowId);
    if (!row) return;
    if (field === 'cantidad-factura') {
      row.cantidad = event.target.value;
      const precioTotal = row.precioUnitario * Number(row.cantidad || 0);
      row.precioTotal = precioTotal;
      renderFactura();
    }
  });

  document.getElementById('facturaBody').addEventListener('click', (event) => {
    if (event.target.dataset.action === 'remove-factura') {
      if (state.facturaDetalle.length <= 1) {
        showAlert('Debe existir al menos una fila en la factura.');
        return;
      }
      const rowId = Number(event.target.dataset.row);
      state.facturaDetalle = state.facturaDetalle.filter((item) => item.id !== rowId);
      renderFactura();
    }
  });

  document.getElementById('puntoEntregaSelect').addEventListener('change', handlePuntoEntregaSelect);
  document.getElementById('departamentoSelect').addEventListener('change', handleDepartamentoSelect);
  document.getElementById('provinciaSelect').addEventListener('change', handleProvinciaSelect);
  document.getElementById('distritoSelect').addEventListener('change', handleDistritoSelect);

  document.getElementById('recibeSelect').addEventListener('change', handleRecibeSelect);

  document.getElementById('cuentaSelect').addEventListener('change', handleCuentaSelect);
  document.getElementById('addPago').addEventListener('click', addPago);

  document.getElementById('baseSelect').addEventListener('change', handleBaseSelect);
}

function handleClienteSelect() {
  const value = document.getElementById('clienteSelect').value.trim();
  const cliente = state.clientes.find((item) => item.nombre === value);
  if (cliente) {
    document.getElementById('clienteNumero').value = cliente.numero;
    loadPuntosEntrega(cliente.codigo_cliente);
    loadNumrecibe(cliente.codigo_cliente);
  }
}

function handlePuntoEntregaSelect() {
  const value = document.getElementById('puntoEntregaSelect').value.trim();
  const punto = state.puntosEntrega.find((item) => item.concatenarpuntoentrega === value);
  if (!punto) return;
  state.regionEntrega = punto.region_entrega;
  document.getElementById('regionEntrega').value = punto.region_entrega || '';
  document.getElementById('direccionLinea').value = punto.direccion_linea || '';
  document.getElementById('referencia').value = punto.referencia || '';
  document.getElementById('entregaNombre').value = punto.nombre || '';
  document.getElementById('entregaDni').value = punto.dni || '';
  document.getElementById('entregaAgencia').value = punto.agencia || '';
  document.getElementById('entregaObservaciones').value = punto.observaciones || '';
  updateRegionPanels();
}

function handleDepartamentoSelect() {
  const value = document.getElementById('departamentoSelect').value.trim();
  const dep = state.departamentos.find((item) => item.departamento === value);
  if (!dep) return;
  state.selectedCodDep = dep.cod_dep;
  loadProvincias(dep.cod_dep);
}

function handleProvinciaSelect() {
  const value = document.getElementById('provinciaSelect').value.trim();
  const prov = state.provincias.find((item) => item.provincia === value);
  if (!prov) return;
  state.selectedCodProv = prov.cod_prov;
  loadDistritos(state.selectedCodDep, prov.cod_prov);
}

function handleDistritoSelect() {
  const value = document.getElementById('distritoSelect').value.trim();
  const dist = state.distritos.find((item) => item.distrito === value);
  if (!dist) return;
  state.selectedCodDist = dist.cod_dist;
  state.regionEntrega = computeRegion(state.selectedCodDep, state.selectedCodProv);
  updateRegionPanels();
}

function handleRecibeSelect() {
  const value = document.getElementById('recibeSelect').value.trim();
  const item = state.numrecibe.find((rec) => rec.concatenarnumrecibe === value);
  if (!item) return;
  document.getElementById('recibeNumero').value = item.numero || '';
}

function handleCuentaSelect() {
  const value = document.getElementById('cuentaSelect').value.trim();
  const cuenta = state.cuentas.find((item) => item.nombre === value);
  if (!cuenta) return;
  document.getElementById('cuentaBanco').value = cuenta.banco || '';
}

function handleBaseSelect() {
  const value = document.getElementById('baseSelect').value.trim();
  const base = state.bases.find((item) => item.nombre === value);
  const candidata = state.basesCandidatas.find((item) => String(item.codigo_base) === value);
  if (base) state.selectedBase = base;
  if (candidata) state.selectedBase = candidata;
}

function addPago() {
  const pendiente = Number(document.getElementById('montoPendiente').value || 0);
  if (pendiente <= 0) {
    showAlert('El monto pendiente ya es 0.');
    return;
  }
  const monto = Number(document.getElementById('montoPago').value || 0);
  if (!monto || monto <= 0) {
    showAlert('Monto de pago invalido.');
    return;
  }
  if (monto > pendiente) {
    showAlert('El monto de pago no puede superar el pendiente.');
    return;
  }
  const cuentaNombre = document.getElementById('cuentaSelect').value.trim();
  const cuenta = state.cuentas.find((item) => item.nombre === cuentaNombre);
  if (!cuenta) {
    showAlert('Selecciona una cuenta bancaria valida.');
    return;
  }
  const numdocumento = (state.nextNumeroRecibo || 1) + state.pagos.length;
  state.pagos.push({ numdocumento, monto, codigo_cuentabancaria: cuenta.codigo_cuentabancaria });
  const nuevoPendiente = pendiente - monto;
  document.getElementById('montoPendiente').value = formatNumber(nuevoPendiente);
  document.getElementById('montoPago').value = formatNumber(nuevoPendiente);
  if (nuevoPendiente <= 0) {
    document.getElementById('montoPago').value = '0.00';
  }
  renderPagos();
}

async function loadConfig() {
  const data = await fetchJson('/api/config');
  state.config = data;
}

async function loadClientes() {
  state.clientes = await fetchJson('/api/clientes');
  renderClientes();
}

async function loadProductos() {
  state.productos = await fetchJson('/api/productos');
  renderProductos();
}

async function loadPuntosEntrega(codigoCliente) {
  state.puntosEntrega = await fetchJson(`/api/puntos-entrega?cliente=${codigoCliente}`);
  renderPuntosEntrega();
  state.nextPuntoEntrega = null;
  try {
    const data = await fetchJson(`/api/puntos-entrega/next?cliente=${codigoCliente}`);
    state.nextPuntoEntrega = data.next;
  } catch (error) {
    // ignore
  }
}

async function loadNextPuntoEntrega(codigoCliente) {
  if (!codigoCliente) return;
  try {
    const data = await fetchJson(`/api/puntos-entrega/next?cliente=${codigoCliente}`);
    state.nextPuntoEntrega = data.next;
  } catch (error) {
    // ignore
  }
}

async function loadDepartamentos() {
  state.departamentos = await fetchJson('/api/ubigeo/departamentos');
  renderDepartamentos();
}

async function loadProvincias(codDep) {
  state.provincias = await fetchJson(`/api/ubigeo/provincias?cod_dep=${codDep}`);
  renderProvincias();
}

async function loadDistritos(codDep, codProv) {
  state.distritos = await fetchJson(`/api/ubigeo/distritos?cod_dep=${codDep}&cod_prov=${codProv}`);
  renderDistritos();
}

async function loadNumrecibe(codigoCliente) {
  state.numrecibe = await fetchJson(`/api/numrecibe?cliente=${codigoCliente}`);
  renderNumrecibe();
}

async function loadCuentas() {
  state.cuentas = await fetchJson('/api/cuentas-bancarias');
  renderCuentas();
}

async function loadBases() {
  state.bases = await fetchJson('/api/bases');
  renderBases();
}

async function loadBasesCandidatas() {
  const payload = {
    items: state.facturaDetalle.map((row) => ({
      vFProducto: row.productoCodigo,
      vFCantidadProducto: Number(row.cantidad || 0),
      vFPrecioTotal: Number(row.precioTotal || 0)
    })),
    fechaPedido: document.getElementById('fechaPedido').value + ' ' + document.getElementById('horaPedido').value
  };
  state.basesCandidatas = await fetchJson('/api/bases/candidatas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  renderBases();
}

async function loadNextCodigoCliente() {
  const data = await fetchJson('/api/clientes/next');
  state.nextCodigoCliente = data.next;
}

async function loadNextCodigoPedido() {
  const data = await fetchJson('/api/pedidos/next');
  state.nextCodigoPedido = data.next;
  document.getElementById('codigoPedido').value = data.next;
}

async function loadNextNumeroFactura() {
  const data = await fetchJson('/api/facturas/next');
  state.nextNumeroFactura = data.next;
  document.getElementById('numeroFactura').value = data.next;
}

async function loadNextNumeroRecibo() {
  const data = await fetchJson('/api/recibos/next');
  state.nextNumeroRecibo = data.next;
}

async function loadNextOrdinalRecibe() {
  const clienteCodigo = getClienteCodigo();
  if (!clienteCodigo) return;
  const data = await fetchJson(`/api/numrecibe/next?cliente=${clienteCodigo}`);
  state.nextOrdinalRecibe = data.next;
}

function getClienteCodigo() {
  if (state.clienteModo === 'existente') {
    const value = document.getElementById('clienteSelect').value.trim();
    const cliente = state.clientes.find((item) => item.nombre === value);
    return cliente ? cliente.codigo_cliente : null;
  }
  return state.nextCodigoCliente;
}

function buildPayload() {
  const fechaPedido = document.getElementById('fechaPedido').value;
  const horaPedido = document.getElementById('horaPedido').value;
  const fechaP = `${fechaPedido} ${horaPedido}`;

  const cliente = state.clienteModo === 'existente'
    ? state.clientes.find((item) => item.nombre === document.getElementById('clienteSelect').value.trim())
    : {
        codigo_cliente: state.nextCodigoCliente,
        nombre: document.getElementById('clienteNombreNuevo').value.trim(),
        numero: document.getElementById('clienteNumeroNuevo').value.trim()
      };

  const entrega = buildEntregaPayload(cliente.codigo_cliente);
  const recibe = buildRecibePayload(cliente.codigo_cliente);

  const baseNombre = document.getElementById('baseSelect').value.trim();
  const base = state.bases.find((item) => item.nombre === baseNombre) || state.basesCandidatas.find((item) => String(item.codigo_base) === baseNombre) || {};

  return {
    cliente: { modo: state.clienteModo, ...cliente },
    pedido: {
      codigo_pedido: state.nextCodigoPedido,
      codigo_cliente: cliente.codigo_cliente,
      fechaP,
      detalle: state.pedidoDetalle.map((row, index) => ({
        codigo_producto: row.productoCodigo,
        cantidad: Number(row.cantidad),
        precio_total: Number(row.precioTotal),
        precio_unitario: Number(row.precioTotal) / Number(row.cantidad || 1),
        ordinal: index + 1
      }))
    },
    factura: {
      tipo_documento: 'FAC',
      numero_documento: state.nextNumeroFactura,
      fechaP,
      monto: getFacturaMonto(),
      saldo: getFacturaMonto(),
      detalle: state.facturaDetalle.map((row, index) => ({
        codigo_producto: row.productoCodigo,
        cantidad: Number(row.cantidad),
        precio_total: Number(row.precioTotal),
        ordinal: index + 1
      }))
    },
    entrega,
    recibe,
    pagos: state.pagos,
    base: {
      codigo_base: base.codigo_base
    }
  };
}

function buildEntregaPayload(codigoCliente) {
  if (state.entregaModo === 'existente') {
    const punto = state.puntosEntrega.find((item) => item.concatenarpuntoentrega === document.getElementById('puntoEntregaSelect').value.trim());
    return {
      modo: 'existente',
      codigo_puntoentrega: punto.codigo_puntoentrega,
      codigo_cliente_puntoentrega: punto.codigo_cliente,
      ubigeo: punto.ubigeo,
      cod_dep: punto.cod_dep,
      cod_prov: punto.cod_prov,
      cod_dist: punto.cod_dist,
      departamento: punto.departamento,
      provincia: punto.provincia,
      distrito: punto.distrito,
      region_entrega: punto.region_entrega,
      direccion_linea: punto.direccion_linea,
      referencia: punto.referencia,
      nombre: punto.nombre,
      dni: punto.dni,
      agencia: punto.agencia,
      observaciones: punto.observaciones,
      concatenarpuntoentrega: punto.concatenarpuntoentrega,
      latitud: punto.latitud,
      longitud: punto.longitud
    };
  }

  const departamento = state.departamentos.find((item) => item.departamento === document.getElementById('departamentoSelect').value.trim()) || {};
  const provincia = state.provincias.find((item) => item.provincia === document.getElementById('provinciaSelect').value.trim()) || {};
  const distrito = state.distritos.find((item) => item.distrito === document.getElementById('distritoSelect').value.trim()) || {};

  const region = computeRegion(departamento.cod_dep, provincia.cod_prov);
  state.regionEntrega = region;
  const entrega = {
    modo: 'nuevo',
    codigo_puntoentrega: state.nextPuntoEntrega,
    codigo_cliente_puntoentrega: codigoCliente,
    ubigeo: `${departamento.cod_dep || ''}${provincia.cod_prov || ''}${distrito.cod_dist || ''}`,
    cod_dep: departamento.cod_dep,
    cod_prov: provincia.cod_prov,
    cod_dist: distrito.cod_dist,
    departamento: departamento.departamento,
    provincia: provincia.provincia,
    distrito: distrito.distrito,
    region_entrega: region,
    direccion_linea: document.getElementById('direccionLineaNuevo').value.trim(),
    referencia: document.getElementById('referenciaNuevo').value.trim(),
    nombre: document.getElementById('entregaNombreNuevo').value.trim(),
    dni: document.getElementById('entregaDniNuevo').value.trim(),
    agencia: document.getElementById('entregaAgenciaNuevo').value.trim(),
    observaciones: document.getElementById('entregaObservacionesNuevo').value.trim(),
    latitud: document.getElementById('latitud').value.trim(),
    longitud: document.getElementById('longitud').value.trim()
  };
  entrega.concatenarpuntoentrega = buildConcatenarPunto(entrega);
  return entrega;
}

function buildRecibePayload(codigoCliente) {
  if (state.regionEntrega !== 'LIMA') {
    return { aplica: false };
  }
  if (state.recibeModo === 'existente') {
    const item = state.numrecibe.find((rec) => rec.concatenarnumrecibe === document.getElementById('recibeSelect').value.trim());
    return {
      aplica: true,
      modo: 'existente',
      codigo_cliente_numrecibe: item.codigo_cliente_numrecibe,
      ordinal_numrecibe: item.ordinal_numrecibe,
      numero: item.numero,
      nombre: item.nombre,
      concatenarnumrecibe: item.concatenarnumrecibe
    };
  }
  const recibe = {
    aplica: true,
    modo: 'nuevo',
    codigo_cliente_numrecibe: codigoCliente,
    ordinal_numrecibe: state.nextOrdinalRecibe,
    numero: document.getElementById('recibeNumeroNuevo').value.trim(),
    nombre: document.getElementById('recibeNombreNuevo').value.trim()
  };
  recibe.concatenarnumrecibe = buildConcatenarRecibe(recibe);
  return recibe;
}

async function emitirFactura() {
  if (!validateStep(8)) return;
  try {
    setLoading(true, 'Registrando factura...');
    const payload = buildPayload();
    await fetchJson('/api/emitir-factura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    showAlert('Factura emitida correctamente.', 'success');
  } catch (error) {
    showAlert(error.message || 'Error al emitir la factura.');
  } finally {
    setLoading(false);
  }
}

async function init() {
  applyLanguage();
  setProgress(1);
  updateRegionBadge();
  togglePanels();
  attachEvents();
  try {
    setLoading(true, 'Cargando datos...');
    await loadConfig();
    await Promise.all([
      loadClientes(),
      loadProductos(),
      loadDepartamentos(),
      loadCuentas(),
      loadBases(),
      loadNextCodigoPedido(),
      loadNextNumeroFactura(),
      loadNextNumeroRecibo()
    ]);
    const now = new Date();
    document.getElementById('fechaPedido').value = now.toISOString().slice(0, 10);
    document.getElementById('horaPedido').value = now.toTimeString().slice(0, 5);
    addPedidoRow();
    document.getElementById('montoPendiente').value = formatNumber(0);
  } catch (error) {
    showAlert(error.message || 'Error al cargar datos.');
  } finally {
    setLoading(false);
  }
}

init();
