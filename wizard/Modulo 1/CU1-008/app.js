/*
SPs de lectura (obligatorio)

vClientes = Llamada SP: get_clientes() (devuelve campo_visible)
Campos devueltos
vCodigo_cliente = codigo_cliente
vNombre = nombre
vNumero = numero
Variables
vCodigo_cliente no visible editable
vNombreCliente visible editable

vPaquetesLlegados = Llamada SP: get_paquetes_por_estado(p_estado in "pendiente empacar","empacado","llegado") (devuelve campo_visible)
Campos devueltos
vCodigo_paquete = codigo_paquete
vFecha_actualizado = fecha_actualizado
vCodigo_cliente = codigo_cliente
vNombre_cliente = nombre_cliente
vNum_cliente = num_cliente
vCodigo_puntoentrega = codigo_puntoentrega
vCodigo_base = codigo_base
vNombre_base = nombre_base
vCodigo_packing = codigo_packing
vNombre_packing = nombre_packing
vOrdinal_numrecibe = ordinal_numrecibe
vConcatenarpuntoentrega = concatenarpuntoentrega
vRegion_entrega = region_entrega
vLatitud = latitud
vLongitud = longitud
vConcatenarnumrecibe = concatenarnumrecibe
Variables
vCodigo_paquete visible editable
vFecha_actualizado visible no editable
vCodigo_base visible no editable
vNombre_base visible no editable
vCodigo_packing visible no editable
vNombre_packing visible no editable
vRegion_entrega visible no editable

vDetalleFactura = Llamada SP: get_mov_contable_detalle(p_tipo_documento="FAC", p_numero_documento=vCodigo_paquete) (devuelve campo_visible)
Campos devueltos
vTipo_documento = tipo_documento
vNumero_documento = numero_documento
vOrdinal = ordinal
vCodigo_producto = codigo_producto
vNombre_producto = nombre_producto
vCantidad = cantidad
vSaldo = saldo
vPrecio_total = precio_total
Variables
vCodigo_producto no visible no editable
vNombreProducto visible no editable
vCantidad visible no editable
vSaldo visible no editable
vPrecio_unitario no visible no editable
vPrecio_total visible no editable
*/

class FormWizard {
  constructor() {
    this.currentStep = 1;
    this.locale = navigator.language || 'es-PE';
    this.lang = 'es';
    this.i18nMap = {};
    this.isLoading = false;

    this.state = {
      vFecha_emision: '',
      vClientes: [],
      vPaquetesLlegados: [],
      filteredPaquetes: [],
      vCodigo_cliente: '',
      vNombreCliente: '',
      vCodigo_paquete: '',
      vFecha_actualizado: '',
      vFecha_emision_factura: '',
      vLugar_entrega: '',
      vLatitud: '',
      vLongitud: '',
      vRegion_mapa: '',
      vCodigo_base: '',
      vNombre_base: '',
      vCodigo_packing: '',
      vNombre_packing: '',
      vRegion_entrega: '',
      vDetalleFactura: [],
      vTotalFactura: 0,
      mapsConfig: {
        apiKey: '',
        defaultCenter: { lat: -12.0464, lng: -77.0428 },
        defaultZoom: 12
      }
    };

    this.regex = {
      date: /^\d{4}-\d{2}-\d{2}$/,
      numericCode: /^\d+$/
    };

    this.elements = {
      form: document.getElementById('wizardForm'),
      steps: document.querySelectorAll('.step-view'),
      stepChips: document.querySelectorAll('.step-chip'),
      progress: document.getElementById('wizardProgress'),
      alert: document.getElementById('alertArea'),
      connectionBadge: document.getElementById('connectionBadge'),
      fechaEmision: document.getElementById('fecha_emision'),
      nombreCliente: document.getElementById('nombre_cliente'),
      codigoCliente: document.getElementById('codigo_cliente'),
      clienteSelected: document.getElementById('clienteSelected'),
      clienteMenu: document.getElementById('clienteMenu'),
      codigoPaquete: document.getElementById('codigo_paquete'),
      paqueteSelected: document.getElementById('paqueteSelected'),
      paqueteMenu: document.getElementById('paqueteMenu'),
      fechaActualizado: document.getElementById('fecha_actualizado'),
      fechaFactura: document.getElementById('fecha_factura'),
      lugarEntrega: document.getElementById('lugar_entrega'),
      mapSection: document.getElementById('mapSection'),
      mapPlaceholder: document.getElementById('mapPlaceholder'),
      mapCanvas: document.getElementById('map'),
      mapBadge: document.getElementById('mapBadge'),
      codigoBase: document.getElementById('codigo_base'),
      nombreBase: document.getElementById('nombre_base'),
      codigoPacking: document.getElementById('codigo_packing'),
      nombrePacking: document.getElementById('nombre_packing'),
      regionEntrega: document.getElementById('region_entrega'),
      detalleGrid: document.getElementById('detalleGrid'),
      totalFactura: document.getElementById('totalFactura'),
      resCliente: document.getElementById('resCliente'),
      resFactura: document.getElementById('resFactura'),
      resFecha: document.getElementById('resFecha'),
      resFechaFactura: document.getElementById('resFechaFactura'),
      resLugar: document.getElementById('resLugar'),
      resBase: document.getElementById('resBase'),
      resPacking: document.getElementById('resPacking'),
      resItems: document.getElementById('resItems'),
      resTotalFactura: document.getElementById('resTotalFactura'),
      resDetalle: document.getElementById('resDetalle'),
      confirmCheck: document.getElementById('confirmCheck'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      anularBtn: document.getElementById('anularBtn')
    };
  }

  init() {
    this.applyI18n();
    this.setToday();
    this.bindEvents();
    this.updateStepUI();
    this.loadInitialData();
  }

  applyI18n() {
    const lang = (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
    const dict = {
      es: {
        brandTitle: 'Anular Facturas',
        brandSubtitle: 'Global IaaS + PaaS Billing Control',
        statusConnecting: 'Conectando',
        statusOnline: 'En linea',
        statusOffline: 'Sin conexion',
        wizardTitle: 'CU008 - Anular Facturas',
        wizardSubtitle: 'Flujo transaccional para anular facturas FAC y devolver inventario',
        metaDocType: 'Tipo',
        metaDocState: 'Accion',
        metaDocStateValue: 'ANULAR',
        labelFechaEmision: 'Fecha emision',
        labelCliente: 'Cliente',
        labelFactura: 'Numero factura (paquete)',
        labelFechaActualizado: 'Fecha actualizado',
        labelFechaFactura: 'Fecha factura',
        labelLugarEntrega: 'Lugar entrega',
        labelMapa: 'Direccion y mapa',
        mapOnlyLima: 'Mapa solo disponible para region LIMA.',
        mapNoConfig: 'Mapa no disponible: falta API key de Google Maps.',
        labelCodigoBase: 'Codigo base',
        labelNombreBase: 'Nombre base',
        labelRegionEntrega: 'Region entrega',
        labelCodigoPacking: 'Codigo packing',
        labelNombrePacking: 'Nombre packing',
        phCliente: 'Buscar cliente...',
        phFactura: 'Buscar factura...',
        step2Note: 'Detalle de factura en modo solo lectura',
        thOrdinal: '#',
        thProducto: 'Producto',
        thCantidad: 'Cantidad',
        thSaldo: 'Saldo',
        thPrecioUnitario: 'Precio unitario',
        thPrecioTotal: 'Precio total',
        labelTotalFactura: 'Total factura',
        summaryHeader: 'Resumen cabecera',
        summaryCliente: 'Cliente',
        summaryFactura: 'Factura',
        summaryFecha: 'Fecha emision',
        summaryFechaFactura: 'Fecha factura',
        summaryLugar: 'Lugar',
        summaryBase: 'Base',
        summaryPacking: 'Packing',
        summaryTotals: 'Totales',
        summaryItems: 'Items',
        summaryTotalFactura: 'Total factura',
        confirmLabel: 'Confirmo que deseo anular la factura seleccionada.',
        prev: 'Anterior',
        next: 'Siguiente',
        anular: 'Anular Factura',
        noResults: 'Sin resultados',
        noDetail: 'Sin detalle',
        processing: 'Procesando...',
        serverConnectionError: 'No se pudo conectar con el servidor.',
        dateRequired: 'vFecha_emision es requerida.',
        clientRequired: 'vCodigo_cliente es requerido.',
        packageRequired: 'vCodigo_paquete es requerido.',
        packageInvalid: 'vCodigo_paquete tiene formato invalido.',
        detailRequired: 'La factura no tiene detalle para anular.',
        confirmRequired: 'Confirma la operacion para continuar.',
        cancelSuccess: 'Factura anulada correctamente.',
        missingRequired: 'Completa los campos requeridos.',
        invalidDate: 'Fecha invalida.',
        invoiceNotFound: 'No se encontro la factura FAC seleccionada.',
        invoiceAlreadyCanceled: 'La factura ya se encuentra anulada.',
        clientMismatch: 'La factura no pertenece al cliente seleccionado.',
        baseRequired: 'No se encontro base para devolver stock.',
        serverError: 'Error interno. Revisa logs del backend.',
        detailLoadError: 'No se pudo cargar el detalle de factura.'
      },
      en: {
        brandTitle: 'Cancel Invoices',
        brandSubtitle: 'Global IaaS + PaaS Billing Control',
        statusConnecting: 'Connecting',
        statusOnline: 'Online',
        statusOffline: 'Offline',
        wizardTitle: 'CU008 - Cancel Invoices',
        wizardSubtitle: 'Transactional flow to cancel FAC invoices and restore stock',
        metaDocType: 'Type',
        metaDocState: 'Action',
        metaDocStateValue: 'CANCEL',
        labelFechaEmision: 'Issue date',
        labelCliente: 'Client',
        labelFactura: 'Invoice number (package)',
        labelFechaActualizado: 'Updated date',
        labelFechaFactura: 'Invoice date',
        labelLugarEntrega: 'Delivery location',
        labelMapa: 'Address and map',
        mapOnlyLima: 'Map only available for LIMA region.',
        mapNoConfig: 'Map unavailable: missing Google Maps API key.',
        labelCodigoBase: 'Base code',
        labelNombreBase: 'Base name',
        labelRegionEntrega: 'Delivery region',
        labelCodigoPacking: 'Packing code',
        labelNombrePacking: 'Packing name',
        phCliente: 'Search client...',
        phFactura: 'Search invoice...',
        step2Note: 'Invoice detail in read-only mode',
        thOrdinal: '#',
        thProducto: 'Product',
        thCantidad: 'Quantity',
        thSaldo: 'Balance',
        thPrecioUnitario: 'Unit price',
        thPrecioTotal: 'Total price',
        labelTotalFactura: 'Invoice total',
        summaryHeader: 'Header summary',
        summaryCliente: 'Client',
        summaryFactura: 'Invoice',
        summaryFecha: 'Issue date',
        summaryFechaFactura: 'Invoice date',
        summaryLugar: 'Location',
        summaryBase: 'Base',
        summaryPacking: 'Packing',
        summaryTotals: 'Totals',
        summaryItems: 'Items',
        summaryTotalFactura: 'Invoice total',
        confirmLabel: 'I confirm that I want to cancel the selected invoice.',
        prev: 'Previous',
        next: 'Next',
        anular: 'Cancel Invoice',
        noResults: 'No results',
        noDetail: 'No detail',
        processing: 'Processing...',
        serverConnectionError: 'Could not connect to server.',
        dateRequired: 'vFecha_emision is required.',
        clientRequired: 'vCodigo_cliente is required.',
        packageRequired: 'vCodigo_paquete is required.',
        packageInvalid: 'vCodigo_paquete has an invalid format.',
        detailRequired: 'The invoice has no detail to cancel.',
        confirmRequired: 'Confirm the operation to continue.',
        cancelSuccess: 'Invoice canceled successfully.',
        missingRequired: 'Complete required fields.',
        invalidDate: 'Invalid date.',
        invoiceNotFound: 'The selected FAC invoice was not found.',
        invoiceAlreadyCanceled: 'The invoice is already canceled.',
        clientMismatch: 'The invoice does not belong to the selected client.',
        baseRequired: 'Base code was not found to restore stock.',
        serverError: 'Internal error. Check backend logs.',
        detailLoadError: 'Could not load invoice detail.'
      }
    };

    this.lang = lang;
    this.i18nMap = dict[lang] || dict.es;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[lang] && dict[lang][key]) {
        el.textContent = dict[lang][key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[lang] && dict[lang][key]) {
        el.setAttribute('placeholder', dict[lang][key]);
      }
    });
  }

  bindEvents() {
    this.elements.prevBtn.addEventListener('click', () => this.prevStep());
    this.elements.nextBtn.addEventListener('click', () => this.nextStep());
    this.elements.anularBtn.addEventListener('click', () => this.anularFactura());

    this.elements.confirmCheck.addEventListener('change', () => this.updateStepUI());

    this.elements.fechaEmision.addEventListener('change', (event) => {
      this.state.vFecha_emision = event.target.value;
    });

    this.elements.nombreCliente.addEventListener('input', () => {
      this.state.vCodigo_cliente = '';
      this.state.vNombreCliente = '';
      this.elements.codigoCliente.value = '';
      this.elements.clienteSelected.textContent = '-';
      this.filterPaquetes();
    });

    this.elements.codigoPaquete.addEventListener('input', () => {
      this.clearPackageSelection();
    });

    this.setupTypeahead({
      input: this.elements.nombreCliente,
      menu: this.elements.clienteMenu,
      dataSource: () => this.state.vClientes,
      labelFn: (item) => `${item.codigo_cliente} - ${item.nombre} (${item.numero})`,
      onSelect: (item) => this.selectCliente(item)
    });

    this.setupTypeahead({
      input: this.elements.codigoPaquete,
      menu: this.elements.paqueteMenu,
      dataSource: () => this.state.filteredPaquetes,
      labelFn: (item) => `${item.codigo_paquete} - ${item.nombre_cliente} - ${item.nombre_packing || item.codigo_packing || ''}`,
      onSelect: (item) => this.selectPaquete(item)
    });
  }

  setToday() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const value = `${yyyy}-${mm}-${dd}`;
    this.state.vFecha_emision = value;
    this.elements.fechaEmision.value = value;
  }

  async loadInitialData() {
    try {
      this.setLoading(true);
      const [healthRes, clientesRes, paquetesRes, mapsConfigRes] = await Promise.all([
        fetch('./api/health'),
        fetch('./api/clientes'),
        fetch('./api/paquetes?estados=pendiente%20empacar,empacado,llegado'),
        fetch('./api/maps-config')
      ]);

      if (!healthRes.ok) {
        throw new Error('HEALTH_CHECK_FAILED');
      }

      const clientesData = await clientesRes.json();
      const paquetesData = await paquetesRes.json();
      if (!clientesRes.ok || !clientesData.ok) {
        throw new Error(clientesData.message || 'CLIENTES_ERROR');
      }
      if (!paquetesRes.ok || !paquetesData.ok) {
        throw new Error(paquetesData.message || 'PAQUETES_ERROR');
      }

      this.state.vClientes = Array.isArray(clientesData.data) ? clientesData.data : [];
      this.state.vPaquetesLlegados = Array.isArray(paquetesData.data) ? paquetesData.data : [];

      if (mapsConfigRes.ok) {
        const mapsData = await mapsConfigRes.json();
        if (mapsData?.ok && mapsData.data) {
          this.state.mapsConfig = {
            ...this.state.mapsConfig,
            ...mapsData.data
          };
        }
      }

      this.filterPaquetes();
      this.setConnectionState(true);
      this.showAlert('', 'd-none');
    } catch (error) {
      this.setConnectionState(false);
      this.showAlert(this.t('serverConnectionError', 'No se pudo conectar con el servidor.'), 'alert-danger');
    } finally {
      this.setLoading(false);
    }
  }

  setConnectionState(isOnline) {
    if (isOnline) {
      this.elements.connectionBadge.className = 'badge rounded-pill text-bg-success';
      this.elements.connectionBadge.textContent = this.t('statusOnline', 'En linea');
    } else {
      this.elements.connectionBadge.className = 'badge rounded-pill text-bg-danger';
      this.elements.connectionBadge.textContent = this.t('statusOffline', 'Sin conexion');
    }
  }

  selectCliente(item) {
    this.state.vCodigo_cliente = String(item.codigo_cliente);
    this.state.vNombreCliente = item.nombre || '';
    this.elements.codigoCliente.value = this.state.vCodigo_cliente;
    this.elements.nombreCliente.value = `${item.nombre} (${item.numero})`;
    this.elements.clienteSelected.textContent = `${item.nombre} | ${item.numero}`;
    this.filterPaquetes();
  }

  filterPaquetes() {
    const codigoCliente = String(this.state.vCodigo_cliente || '');
    this.state.filteredPaquetes = this.state.vPaquetesLlegados.filter(
      (item) => String(item.codigo_cliente) === codigoCliente
    );
    this.clearPackageSelection(false);
  }

  selectPaquete(item) {
    this.state.vCodigo_paquete = String(item.codigo_paquete || '');
    this.state.vFecha_actualizado = item.fecha_actualizado || '';
    this.state.vFecha_emision_factura = '';
    this.state.vLugar_entrega = item.concatenarpuntoentrega || '';
    this.state.vLatitud = item.latitud || '';
    this.state.vLongitud = item.longitud || '';
    this.state.vRegion_mapa = item.region_entrega || '';
    this.state.vCodigo_base = String(item.codigo_base || '');
    this.state.vNombre_base = item.nombre_base || item.region_entrega || '';
    this.state.vCodigo_packing = String(item.codigo_packing || '');
    this.state.vNombre_packing = item.nombre_packing || '';
    this.state.vRegion_entrega = item.region_entrega || '';

    this.elements.codigoPaquete.value = this.state.vCodigo_paquete;
    this.elements.paqueteSelected.textContent = `${item.nombre_cliente || '-'} | ${item.concatenarpuntoentrega || '-'}`;
    this.elements.fechaActualizado.value = this.formatDateTime(this.state.vFecha_actualizado);
    this.elements.fechaFactura.value = '';
    this.elements.lugarEntrega.value = this.state.vLugar_entrega || '-';
    this.elements.codigoBase.value = this.state.vCodigo_base;
    this.elements.nombreBase.value = this.state.vNombre_base;
    this.elements.codigoPacking.value = this.state.vCodigo_packing;
    this.elements.nombrePacking.value = this.state.vNombre_packing;
    this.elements.regionEntrega.value = this.state.vRegion_entrega || this.state.vNombre_base;

    this.loadFacturaCabecera();
    this.loadDetalleFactura();
    this.updateMapForSelection();
  }

  clearPackageSelection(keepQueryText = true) {
    this.state.vCodigo_paquete = '';
    this.state.vFecha_actualizado = '';
    this.state.vFecha_emision_factura = '';
    this.state.vLugar_entrega = '';
    this.state.vLatitud = '';
    this.state.vLongitud = '';
    this.state.vRegion_mapa = '';
    this.state.vCodigo_base = '';
    this.state.vNombre_base = '';
    this.state.vCodigo_packing = '';
    this.state.vNombre_packing = '';
    this.state.vRegion_entrega = '';
    this.state.vDetalleFactura = [];
    this.state.vTotalFactura = 0;

    if (!keepQueryText) {
      this.elements.codigoPaquete.value = '';
    }
    this.elements.paqueteSelected.textContent = '-';
    this.elements.fechaActualizado.value = '';
    this.elements.fechaFactura.value = '';
    this.elements.lugarEntrega.value = '';
    this.elements.codigoBase.value = '';
    this.elements.nombreBase.value = '';
    this.elements.codigoPacking.value = '';
    this.elements.nombrePacking.value = '';
    this.elements.regionEntrega.value = '';

    this.renderDetalle();
    this.resetMapView();
  }

  async loadDetalleFactura() {
    if (!this.state.vCodigo_paquete) {
      return;
    }
    try {
      this.setLoading(true);
      const res = await fetch(`./api/detalle-factura?codigo_paquete=${encodeURIComponent(this.state.vCodigo_paquete)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'DETALLE_FACTURA_ERROR');
      }

      this.state.vDetalleFactura = (Array.isArray(data.data) ? data.data : []).map((row, index) => {
        const vCantidad = Number(row.cantidad) || 0;
        const baseTotal = Number(row.precio_total) || 0;
        const vPrecio_unitario = vCantidad !== 0 ? baseTotal / vCantidad : 0;
        return {
          vOrdinalDetMovCont: index + 1,
          vCodigo_producto: String(row.codigo_producto || ''),
          vNombreProducto: row.nombre_producto || '',
          vCantidad,
          vSaldo: Number(row.saldo) || 0,
          vPrecio_unitario,
          vPrecio_total: vCantidad * vPrecio_unitario
        };
      });

      this.renderDetalle();
      this.showAlert('', 'd-none');
    } catch (error) {
      this.showAlert(this.t('detailLoadError', 'No se pudo cargar el detalle de factura.'), 'alert-danger');
      this.state.vDetalleFactura = [];
      this.renderDetalle();
    } finally {
      this.setLoading(false);
    }
  }

  async loadFacturaCabecera() {
    if (!this.state.vCodigo_paquete) {
      return;
    }
    try {
      const res = await fetch(`./api/factura-cabecera?codigo_paquete=${encodeURIComponent(this.state.vCodigo_paquete)}`);
      const data = await res.json();
      if (!res.ok || !data.ok || !data.data) {
        return;
      }
      const vCabecera = data.data;
      this.state.vFecha_emision_factura = vCabecera.fecha_emision || '';
      if (vCabecera.lugar_entrega) {
        this.state.vLugar_entrega = vCabecera.lugar_entrega;
      }
      if (vCabecera.codigo_packing !== null && vCabecera.codigo_packing !== undefined) {
        this.state.vCodigo_packing = String(vCabecera.codigo_packing);
      }
      if (vCabecera.nombre_packing) {
        this.state.vNombre_packing = vCabecera.nombre_packing;
      }
      this.elements.fechaFactura.value = this.state.vFecha_emision_factura
        ? this.formatDateOnly(this.state.vFecha_emision_factura)
        : '-';
      this.elements.lugarEntrega.value = this.state.vLugar_entrega || '-';
      this.elements.codigoPacking.value = this.state.vCodigo_packing;
      this.elements.nombrePacking.value = this.state.vNombre_packing;
    } catch (error) {
      this.elements.fechaFactura.value = '-';
      this.elements.lugarEntrega.value = this.state.vLugar_entrega || '-';
    }
  }

  isRegionLima(regionValue) {
    const value = String(regionValue || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    return value.includes('LIMA');
  }

  resetMapView(message) {
    if (!this.elements.mapSection || !this.elements.mapPlaceholder) {
      return;
    }
    this.elements.mapSection.classList.add('d-none');
    this.elements.mapPlaceholder.classList.remove('d-none');
    this.elements.mapPlaceholder.textContent = message || this.t('mapOnlyLima', 'Mapa solo disponible para region LIMA.');
  }

  async loadGoogleMaps() {
    if (window.google?.maps) {
      return;
    }
    if (this.mapScriptPromise) {
      return this.mapScriptPromise;
    }
    const apiKey = this.state.mapsConfig?.apiKey;
    if (!apiKey) {
      throw new Error('MAPS_API_KEY_MISSING');
    }
    this.mapScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
    return this.mapScriptPromise;
  }

  async updateMapForSelection() {
    if (!this.state.vCodigo_paquete) {
      this.resetMapView(this.t('mapOnlyLima', 'Mapa solo disponible para region LIMA.'));
      return;
    }
    if (!this.isRegionLima(this.state.vRegion_mapa)) {
      this.resetMapView(this.t('mapOnlyLima', 'Mapa solo disponible para region LIMA.'));
      return;
    }
    if (!this.state.mapsConfig?.apiKey) {
      this.resetMapView(this.t('mapNoConfig', 'Mapa no disponible: falta API key de Google Maps.'));
      return;
    }
    try {
      await this.loadGoogleMaps();
      const defaultCenter = this.state.mapsConfig?.defaultCenter || { lat: -12.0464, lng: -77.0428 };
      const center = {
        lat: Number(this.state.vLatitud) || Number(defaultCenter.lat) || -12.0464,
        lng: Number(this.state.vLongitud) || Number(defaultCenter.lng) || -77.0428
      };

      if (!this.mapInstance) {
        this.mapInstance = new window.google.maps.Map(this.elements.mapCanvas, {
          center,
          zoom: Number(this.state.mapsConfig?.defaultZoom || 12),
          disableDefaultUI: true,
          zoomControl: true
        });
        this.mapMarker = new window.google.maps.Marker({
          position: center,
          map: this.mapInstance,
          title: 'Entrega'
        });
      } else {
        this.mapInstance.setCenter(center);
        this.mapMarker.setPosition(center);
      }

      this.elements.mapBadge.textContent = 'LIMA';
      this.elements.mapSection.classList.remove('d-none');
      this.elements.mapPlaceholder.classList.add('d-none');
    } catch (error) {
      this.resetMapView(this.t('mapNoConfig', 'Mapa no disponible: falta API key de Google Maps.'));
    }
  }

  renderDetalle() {
    this.elements.detalleGrid.innerHTML = '';
    if (!this.state.vDetalleFactura.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="6" class="text-center text-muted">${this.t('noDetail', 'Sin detalle')}</td>`;
      this.elements.detalleGrid.appendChild(row);
      this.updateTotals();
      return;
    }

    this.state.vDetalleFactura.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="text-center">${item.vOrdinalDetMovCont}</td>
        <td>${item.vNombreProducto}</td>
        <td class="text-end">${this.formatQuantity(item.vCantidad)}</td>
        <td class="text-end">${this.formatQuantity(item.vSaldo)}</td>
        <td class="text-end">${this.formatCurrency(item.vPrecio_unitario)}</td>
        <td class="text-end">${this.formatCurrency(item.vPrecio_total)}</td>
      `;
      this.elements.detalleGrid.appendChild(row);
    });
    this.updateTotals();
  }

  updateTotals() {
    this.state.vTotalFactura = this.state.vDetalleFactura.reduce((sum, item) => sum + (Number(item.vPrecio_total) || 0), 0);
    this.elements.totalFactura.textContent = this.formatCurrency(this.state.vTotalFactura);
  }

  nextStep() {
    if (!this.validateStep(this.currentStep)) {
      return;
    }
    if (this.currentStep < 3) {
      this.currentStep += 1;
      if (this.currentStep === 3) {
        this.refreshSummary();
      }
      this.updateStepUI();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
      this.updateStepUI();
    }
  }

  updateStepUI() {
    this.elements.steps.forEach((step) => {
      step.classList.toggle('d-none', Number(step.dataset.step) !== this.currentStep);
    });

    this.elements.stepChips.forEach((chip) => {
      chip.classList.toggle('active', Number(chip.dataset.step) === this.currentStep);
    });

    const progress = (this.currentStep / 3) * 100;
    this.elements.progress.style.width = `${progress}%`;

    this.elements.prevBtn.classList.toggle('d-none', this.currentStep === 1);
    this.elements.nextBtn.classList.toggle('d-none', this.currentStep === 3);
    this.elements.anularBtn.classList.toggle('d-none', this.currentStep !== 3);

    if (this.currentStep !== 3) {
      this.elements.confirmCheck.checked = false;
    }

    this.elements.anularBtn.disabled = this.isLoading || !this.elements.confirmCheck.checked;
    this.elements.nextBtn.disabled = this.isLoading;
    this.elements.prevBtn.disabled = this.isLoading;
  }

  validateStep(step) {
    this.showAlert('', 'd-none');

    if (step === 1) {
      if (!this.regex.date.test(this.state.vFecha_emision)) {
        this.showAlert(this.t('dateRequired', 'vFecha_emision es requerida.'), 'alert-warning');
        return false;
      }
      if (!this.state.vCodigo_cliente) {
        this.showAlert(this.t('clientRequired', 'vCodigo_cliente es requerido.'), 'alert-warning');
        return false;
      }
      if (!this.state.vCodigo_paquete) {
        this.showAlert(this.t('packageRequired', 'vCodigo_paquete es requerido.'), 'alert-warning');
        return false;
      }
      if (!this.regex.numericCode.test(this.state.vCodigo_paquete)) {
        this.showAlert(this.t('packageInvalid', 'vCodigo_paquete tiene formato invalido.'), 'alert-warning');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!this.state.vDetalleFactura.length) {
        this.showAlert(this.t('detailRequired', 'La factura no tiene detalle para anular.'), 'alert-warning');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!this.elements.confirmCheck.checked) {
        this.showAlert(this.t('confirmRequired', 'Confirma la operacion para continuar.'), 'alert-warning');
        return false;
      }
      return true;
    }

    return true;
  }

  refreshSummary() {
    const vItems = this.state.vDetalleFactura.length;
    this.elements.resCliente.textContent = this.state.vNombreCliente || '-';
    this.elements.resFactura.textContent = this.state.vCodigo_paquete || '-';
    this.elements.resFecha.textContent = this.formatDateOnly(this.state.vFecha_emision);
    this.elements.resFechaFactura.textContent = this.state.vFecha_emision_factura
      ? this.formatDateOnly(this.state.vFecha_emision_factura)
      : '-';
    this.elements.resLugar.textContent = this.state.vLugar_entrega || '-';
    this.elements.resBase.textContent = this.state.vNombre_base
      ? `${this.state.vCodigo_base} - ${this.state.vNombre_base}`
      : this.state.vCodigo_base || '-';
    this.elements.resPacking.textContent = this.state.vNombre_packing
      ? `${this.state.vCodigo_packing} - ${this.state.vNombre_packing}`
      : this.state.vCodigo_packing || '-';
    this.elements.resItems.textContent = String(vItems);
    this.elements.resTotalFactura.textContent = this.formatCurrency(this.state.vTotalFactura);

    this.elements.resDetalle.innerHTML = '';
    if (!vItems) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" class="text-center text-muted">${this.t('noDetail', 'Sin detalle')}</td>`;
      this.elements.resDetalle.appendChild(row);
      return;
    }

    this.state.vDetalleFactura.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="text-center">${item.vOrdinalDetMovCont}</td>
        <td>${item.vNombreProducto}</td>
        <td class="text-end">${this.formatQuantity(item.vCantidad)}</td>
        <td class="text-end">${this.formatCurrency(item.vPrecio_total)}</td>
      `;
      this.elements.resDetalle.appendChild(row);
    });
  }

  async anularFactura() {
    if (!this.validateStep(3)) {
      return;
    }

    try {
      this.setLoading(true);
      const payload = {
        vFecha_emision: this.state.vFecha_emision,
        vCodigo_cliente: this.state.vCodigo_cliente,
        vCodigo_paquete: this.state.vCodigo_paquete,
        vCodigo_base: this.state.vCodigo_base,
        vTotalFactura: this.state.vTotalFactura
      };

      const res = await fetch('./api/anular-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'ANULACION_ERROR');
      }

      this.showAlert(this.t('cancelSuccess', 'Factura anulada correctamente.'), 'alert-success');
      this.resetWizard();
    } catch (error) {
      this.showAlert(this.toUserMessage(error.message), 'alert-danger');
    } finally {
      this.setLoading(false);
    }
  }

  toUserMessage(code) {
    const map = {
      MISSING_REQUIRED: this.t('missingRequired', 'Completa los campos requeridos.'),
      INVALID_DATE: this.t('invalidDate', 'Fecha invalida.'),
      INVOICE_NOT_FOUND: this.t('invoiceNotFound', 'No se encontro la factura FAC seleccionada.'),
      INVOICE_ALREADY_CANCELED: this.t('invoiceAlreadyCanceled', 'La factura ya se encuentra anulada.'),
      CLIENT_MISMATCH: this.t('clientMismatch', 'La factura no pertenece al cliente seleccionado.'),
      BASE_REQUIRED: this.t('baseRequired', 'No se encontro base para devolver stock.'),
      SERVER_ERROR: this.t('serverError', 'Error interno. Revisa logs del backend.')
    };
    return map[code] || this.t('serverError', 'Error interno. Revisa logs del backend.');
  }

  resetWizard() {
    this.currentStep = 1;
    this.state.vCodigo_cliente = '';
    this.state.vNombreCliente = '';
    this.state.vCodigo_paquete = '';
    this.state.vFecha_actualizado = '';
    this.state.vFecha_emision_factura = '';
    this.state.vLugar_entrega = '';
    this.state.vLatitud = '';
    this.state.vLongitud = '';
    this.state.vRegion_mapa = '';
    this.state.vCodigo_base = '';
    this.state.vNombre_base = '';
    this.state.vCodigo_packing = '';
    this.state.vNombre_packing = '';
    this.state.vRegion_entrega = '';
    this.state.vDetalleFactura = [];
    this.state.vTotalFactura = 0;

    this.elements.nombreCliente.value = '';
    this.elements.codigoCliente.value = '';
    this.elements.clienteSelected.textContent = '-';
    this.elements.codigoPaquete.value = '';
    this.elements.paqueteSelected.textContent = '-';
    this.elements.fechaActualizado.value = '';
    this.elements.fechaFactura.value = '';
    this.elements.lugarEntrega.value = '';
    this.elements.codigoBase.value = '';
    this.elements.nombreBase.value = '';
    this.elements.codigoPacking.value = '';
    this.elements.nombrePacking.value = '';
    this.elements.regionEntrega.value = '';
    this.elements.confirmCheck.checked = false;

    this.renderDetalle();
    this.setToday();
    this.filterPaquetes();
    this.resetMapView();
    this.updateStepUI();
    this.loadInitialData();
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    const originalLabel = this.t('anular', 'Anular Factura');
    const processingLabel = this.t('processing', 'Procesando...');
    this.elements.anularBtn.textContent = isLoading ? processingLabel : originalLabel;
    this.elements.nextBtn.disabled = isLoading;
    this.elements.prevBtn.disabled = isLoading;
    this.elements.anularBtn.disabled = isLoading || !this.elements.confirmCheck.checked;
  }

  showAlert(message, className) {
    this.elements.alert.className = `alert ${className}`;
    if (!message) {
      this.elements.alert.classList.add('d-none');
      return;
    }
    this.elements.alert.textContent = message;
    this.elements.alert.classList.remove('d-none');
  }

  setupTypeahead({ input, menu, dataSource, labelFn, onSelect }) {
    let filtered = [];
    let activeIndex = -1;

    const close = () => {
      menu.style.display = 'none';
      activeIndex = -1;
    };

    const highlightActive = () => {
      menu.querySelectorAll('.typeahead-item').forEach((item, index) => {
        item.classList.toggle('active', index === activeIndex);
      });
    };

    const render = (items) => {
      filtered = items;
      menu.innerHTML = '';
      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'typeahead-item';
        empty.textContent = this.t('noResults', 'Sin resultados');
        menu.appendChild(empty);
        return;
      }

      filtered.slice(0, 150).forEach((item, index) => {
        const option = document.createElement('div');
        option.className = 'typeahead-item';
        option.textContent = labelFn(item);
        option.addEventListener('mousedown', (event) => {
          event.preventDefault();
          onSelect(item);
          close();
        });
        menu.appendChild(option);
        if (index === activeIndex) {
          option.classList.add('active');
        }
      });
    };

    const filter = () => {
      const query = input.value.toLowerCase().trim();
      const source = dataSource();
      const result = source.filter((item) => labelFn(item).toLowerCase().includes(query));
      activeIndex = -1;
      render(result);
      menu.style.display = 'block';
    };

    input.addEventListener('focus', filter);
    input.addEventListener('input', filter);

    input.addEventListener('keydown', (event) => {
      const visibleItems = menu.querySelectorAll('.typeahead-item');
      if (!visibleItems.length || menu.style.display !== 'block') {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeIndex = Math.min(activeIndex + 1, visibleItems.length - 1);
        highlightActive();
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        highlightActive();
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          onSelect(filtered[activeIndex]);
          close();
        }
      }

      if (event.key === 'Escape') {
        close();
      }
    });

    document.addEventListener('click', (event) => {
      if (event.target !== input && !menu.contains(event.target)) {
        close();
      }
    });
  }

  formatCurrency(value) {
    return Number(value || 0).toLocaleString(this.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatQuantity(value) {
    return Number(value || 0).toLocaleString(this.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    });
  }

  formatDateOnly(value) {
    if (!value) return '-';
    if (this.regex.date.test(value)) {
      const [year, month, day] = value.split('-');
      return `${day}/${month}/${year}`;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleDateString(this.locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateTime(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleString(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  t(key, fallback) {
    return this.i18nMap[key] || fallback;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
