/*
vPaquetesPendientes = Llamada SP: get_paquetes_por_estado(p_estado="pendiente empacar") (devuelve campo_visible)
Campos devueltos
vcodigo_paquete
vfecha_actualizado
vcodigo_cliente
vnombre_cliente
vnum_cliente
vcodigo_puntoentrega
vcodigo_base
vnombre_base
vordinal_numrecibe
vconcatenarpuntoentrega
vRegion_Entrega
vLatitud
vLongitud
vconcatenarnumrecibe
Variables
vcodigo_paquete visible no editable
vfecha_actualizado visible no editable
vcodigo_cliente no visible no editable
vnombre_cliente visible no editable
vnum_cliente visible no editable
vcodigo_puntoentrega no visible no editable
vcodigo_base no visible no editable
vnombre_base visible no editable
vordinal_numrecibe no visible no editable
vconcatenarpuntoentrega visible no editable
vRegion_Entrega no visible no editable
vLatitud no visible no editable
vLongitud no visible no editable
vconcatenarnumrecibe visible no editable

vDetalleDocumento = Llamada SP: get_mov_contable_detalle(p_tipo_documento, p_numero_documento) (devuelve campo_visible)
Campos devueltos
vtipo_documento
vnumero_documento
vordinal
vcodigo_producto
vnombre_producto
vcantidad
vsaldo
vprecio_total
Variables
vtipo_documento no visible no editable
vnumero_documento no visible no editable
vordinal no visible no editable
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vcantidad visible no editable
vsaldo no visible no editable
vprecio_total no visible no editable

Vordinal = regla sin ambiguedad:
- Siempre generar el siguiente correlativo con SQL SELECT COALESCE(MAX(ordinal), 0) + 1 AS next FROM paquetedetalle WHERE codigo_paquete = vcodigo_paquete AND tipo_documento = 'FAC'
*/

const i18n = {
  en: {
    badge: 'Global IaaS & PaaS',
    title: 'Package pending orders',
    subtitle: 'Coordinate packaging with inventory sync and transactional confirmation.',
    module: 'Module 2',
    step1: '1. Selection',
    step2: '2. Detail',
    step3: '3. Confirm',
    step1Title: 'Select pending package',
    step1Hint: 'Choose a pending package to continue.',
    step2Title: 'Document detail',
    step2Hint: 'Review delivery, receiver, and items.',
    step3Title: 'Confirm packaging',
    step3Hint: 'Review the summary and confirm the record.',
    colCodigo: 'Code',
    colFecha: 'Updated',
    colCliente: 'Client',
    colBase: 'Base',
    colNumero: 'Client number',
    colEntrega: 'Delivery point',
    colRecibe: 'Receiver',
    labelPacking: 'Packing',
    packingPlaceholder: 'Select packing...',
    labelEntrega: 'Delivery point',
    labelRecibe: 'Receiver number',
    mapTitle: 'Address and map',
    detalleGridTitle: 'Document detail',
    colProducto: 'Product',
    colCantidad: 'Quantity',
    prev: 'Previous',
    next: 'Next',
    reset: 'Clear',
    confirmLabel: 'I confirm that the data is correct.',
    errorConfirm: 'You must confirm the checklist before packing.',
    errorPacking: 'Select a packing before continuing.',
    actionEmpacar: 'Pack',
    successSaved: 'Package registered as packed. Wizard reset.',
    errorSelection: 'Select a package to continue.',
    errorServer: 'We could not complete your request. Try again.',
    emptyTable: 'No records found.'
  },
  es: {
    badge: 'IaaS & PaaS Global',
    title: 'Empacar pedidos pendientes',
    subtitle: 'Coordina empaque con inventario sincronizado y confirmacion transaccional.',
    module: 'Modulo 2',
    step1: '1. Seleccion',
    step2: '2. Detalle',
    step3: '3. Confirmar',
    step1Title: 'Seleccionar paquete pendiente',
    step1Hint: 'Elige un paquete pendiente de empaque para continuar.',
    step2Title: 'Detalle del documento',
    step2Hint: 'Revision de entrega, receptor y productos.',
    step3Title: 'Confirmar empaque',
    step3Hint: 'Revisa el resumen y confirma el registro.',
    colCodigo: 'Codigo',
    colFecha: 'Actualizado',
    colCliente: 'Cliente',
    colBase: 'Base',
    colNumero: 'Numero cliente',
    colEntrega: 'Punto entrega',
    colRecibe: 'Num recibe',
    labelPacking: 'Packing',
    packingPlaceholder: 'Selecciona un packing...',
    labelEntrega: 'Punto entrega',
    labelRecibe: 'Num recibe',
    mapTitle: 'Direccion y mapa',
    detalleGridTitle: 'Detalle del documento',
    colProducto: 'Producto',
    colCantidad: 'Cantidad',
    prev: 'Anterior',
    next: 'Siguiente',
    reset: 'Limpiar',
    confirmLabel: 'Confirmo que los datos son correctos.',
    errorConfirm: 'Debes marcar el checklist para empacar.',
    errorPacking: 'Selecciona un packing antes de continuar.',
    actionEmpacar: 'Empacar',
    successSaved: 'Paquete empacado. Wizard reiniciado.',
    errorSelection: 'Selecciona un paquete para continuar.',
    errorServer: 'No pudimos completar tu solicitud. Intenta de nuevo.',
    emptyTable: 'No se encontraron registros.'
  }
};

class FormWizard {
  constructor() {
    this.state = {
      step: 1,
      lang: 'es',
      codigoUsuario: '',
      priv: '',
      paquetes: [],
      detalles: [],
      packings: [],
      selected: null,
      selectedPacking: null,
      mapsConfig: null,
      mapReady: false,
      map: null,
      marker: null
    };

    this.elements = {
      progressBar: document.getElementById('progressBar'),
      stepIndicator: document.getElementById('stepIndicator'),
      step1: document.getElementById('step1'),
      step2: document.getElementById('step2'),
      step3: document.getElementById('step3'),
      alertBox: document.getElementById('alertBox'),
      successBox: document.getElementById('successBox'),
      pendientesTableBody: document.querySelector('#pendientesTable tbody'),
      detalleTableBody: document.querySelector('#detalleTable tbody'),
      detalleEntrega: document.getElementById('detalleEntrega'),
      detalleRecibe: document.getElementById('detalleRecibe'),
      packingSelect: document.getElementById('packingSelect'),
      resumenInfo: document.getElementById('resumenInfo'),
      mapSection: document.getElementById('mapSection'),
      mapCanvas: document.getElementById('map'),
      btnPrev: document.getElementById('btnPrev'),
      btnNext: document.getElementById('btnNext'),
      btnReset: document.getElementById('btnReset'),
      confirmCheck: document.getElementById('confirmCheck'),
      loadingPendientes: document.getElementById('loadingPendientes'),
      loadingDetalle: document.getElementById('loadingDetalle'),
      loadingGuardar: document.getElementById('loadingGuardar')
    };
  }

  init() {
    this.setLanguage();
    this.state.codigoUsuario = this.resolveCodigoUsuario();
    this.bindEvents();
    this.setStep(1);
    if (!this.state.codigoUsuario) {
      this.showAlert('Warning ACCESO NO AUTORIZADO !!!');
      this.elements.btnNext.disabled = true;
      return;
    }
    this.loadPaquetes();
  }

  resolveCodigoUsuario() {
    const params = new URLSearchParams(window.location.search || '');
    const value =
      params.get('Codigo_usuario') ||
      params.get('codigo_usuario') ||
      params.get('vUsuario') ||
      params.get('vCodigo_usuario') ||
      '';
    return String(value).trim();
  }

  setLanguage() {
    const lang = navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
    this.state.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (i18n[lang][key]) {
        el.textContent = i18n[lang][key];
      }
    });
  }

  t(key) {
    return i18n[this.state.lang][key] || key;
  }

  formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const lang = this.state.lang === 'es' ? 'es-PE' : 'en-US';
    return new Intl.DateTimeFormat(lang, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  bindEvents() {
    this.elements.btnPrev.addEventListener('click', () => this.goPrev());
    this.elements.btnNext.addEventListener('click', () => this.goNext());
    this.elements.btnReset.addEventListener('click', () => this.resetWizard());
    this.elements.confirmCheck.addEventListener('change', () => this.updateConfirmState());
    this.elements.packingSelect.addEventListener('change', () => this.onPackingChange());
  }

  async fetchJson(url, options) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.ok === false) {
      throw new Error(body?.message || 'HTTP_ERROR');
    }
    return body;
  }

  isAccessError(error) {
    const code = String(error?.message || '').trim().toUpperCase();
    return code === 'UNAUTHORIZED' || code === 'BASE_FORBIDDEN' || code === 'CODIGO_USUARIO_REQUIRED';
  }

  setStep(step) {
    this.state.step = step;
    const progress = step === 1 ? 33 : step === 2 ? 66 : 100;
    this.elements.progressBar.style.width = `${progress}%`;

    [this.elements.step1, this.elements.step2, this.elements.step3].forEach((el, index) => {
      if (index + 1 === step) {
        el.classList.remove('d-none');
      } else {
        el.classList.add('d-none');
      }
    });

    this.elements.stepIndicator.querySelectorAll('.step-pill').forEach((pill) => {
      const current = Number(pill.getAttribute('data-step'));
      pill.classList.toggle('active', current === step);
    });

    this.elements.btnPrev.disabled = step === 1;
    this.elements.btnNext.textContent = step === 3 ? this.t('actionEmpacar') : this.t('next');
    this.updateConfirmState();
  }

  showAlert(message, type = 'danger') {
    this.elements.alertBox.textContent = message;
    this.elements.alertBox.classList.remove('d-none');
    this.elements.alertBox.classList.toggle('alert-danger', type === 'danger');
  }

  showSuccess(message) {
    this.elements.successBox.textContent = message;
    this.elements.successBox.classList.remove('d-none');
  }

  clearMessages() {
    this.elements.alertBox.classList.add('d-none');
    this.elements.successBox.classList.add('d-none');
  }

  updateConfirmState() {
    if (this.state.step !== 3) {
      this.elements.btnNext.disabled = false;
      return;
    }
    this.elements.btnNext.disabled = !this.elements.confirmCheck.checked;
  }

  setLoading(target, isLoading) {
    target.classList.toggle('d-none', !isLoading);
  }

  async loadPaquetes() {
    this.clearMessages();
    this.setLoading(this.elements.loadingPendientes, true);
    try {
      const params = new URLSearchParams({ codigo_usuario: this.state.codigoUsuario });
      const data = await this.fetchJson(`./api/paquetes-pendientes?${params.toString()}`);
      this.state.priv = String(data?.vPriv || '').trim().toUpperCase();
      this.state.paquetes = data.rows || [];
      this.renderPaquetes();
    } catch (error) {
      if (this.isAccessError(error)) {
        this.showAlert('Warning ACCESO NO AUTORIZADO !!!');
      } else {
        this.showAlert(this.t('errorServer'));
      }
    } finally {
      this.setLoading(this.elements.loadingPendientes, false);
    }
  }

  renderPaquetes() {
    const tbody = this.elements.pendientesTableBody;
    tbody.innerHTML = '';

    if (!this.state.paquetes.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.className = 'table-empty';
      cell.textContent = this.t('emptyTable');
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    this.state.paquetes.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.dataset.index = String(index);
      tr.innerHTML = `
        <td>${row.codigo_paquete ?? ''}</td>
        <td>${this.formatDate(row.fecha_actualizado)}</td>
        <td>${row.nombre_cliente ?? ''}</td>
        <td>${row.nombre_base ?? ''}</td>
        <td>${row.num_cliente ?? ''}</td>
        <td>${row.concatenarpuntoentrega ?? ''}</td>
        <td>${row.concatenarnumrecibe ?? ''}</td>
      `;
      tr.addEventListener('click', () => this.selectPaquete(index));
      tbody.appendChild(tr);
    });
  }

  selectPaquete(index) {
    const selected = this.state.paquetes[index];
    if (!selected) {
      return;
    }
    this.state.selected = selected;
    this.elements.pendientesTableBody.querySelectorAll('tr').forEach((row) => {
      row.classList.toggle('active', row.dataset.index === String(index));
    });
    this.setStep(2);
    this.loadDetalle();
  }

  async loadDetalle() {
    if (!this.state.selected) {
      return;
    }
    this.clearMessages();
    this.setLoading(this.elements.loadingDetalle, true);

    this.elements.detalleEntrega.textContent = this.state.selected.concatenarpuntoentrega || '-';
    this.elements.detalleRecibe.textContent = this.state.selected.concatenarnumrecibe || '-';
    await this.loadPackings();

    await this.loadMapIfNeeded();

    try {
      const codigo = this.state.selected.codigo_paquete;
      const params = new URLSearchParams({ codigo_usuario: this.state.codigoUsuario });
      const data = await this.fetchJson(`./api/detalle/${encodeURIComponent(codigo)}?${params.toString()}`);
      this.state.detalles = data.rows || [];
      this.renderDetalle();
      this.updateResumen();
    } catch (error) {
      if (this.isAccessError(error)) {
        this.showAlert('Warning ACCESO NO AUTORIZADO !!!');
      } else {
        this.showAlert(this.t('errorServer'));
      }
    } finally {
      this.setLoading(this.elements.loadingDetalle, false);
    }
  }

  renderDetalle() {
    const tbody = this.elements.detalleTableBody;
    tbody.innerHTML = '';

    if (!this.state.detalles.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.className = 'table-empty';
      cell.textContent = this.t('emptyTable');
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    this.state.detalles.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.nombre_producto ?? ''}</td>
        <td>${row.cantidad ?? ''}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async loadPackings() {
    const normalizeNumericId = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const num = Number(raw);
      if (!Number.isFinite(num) || num <= 0) return '';
      return String(Math.trunc(num));
    };

    const codigoBase = normalizeNumericId(this.state.selected?.codigo_base);
    const codigoCliente = normalizeNumericId(this.state.selected?.codigo_cliente);
    this.state.packings = [];
    this.state.selectedPacking = null;
    this.elements.packingSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = this.t('packingPlaceholder');
    placeholder.disabled = true;
    placeholder.selected = true;
    this.elements.packingSelect.appendChild(placeholder);

    if (!codigoBase && !codigoCliente) {
      this.elements.packingSelect.disabled = true;
      return;
    }

    this.elements.packingSelect.disabled = true;
    try {
      const params = new URLSearchParams();
      if (codigoBase) {
        params.set('codigo_base', codigoBase);
      }
      if (codigoCliente) {
        params.set('codigo_cliente', codigoCliente);
      }
      params.set('codigo_usuario', this.state.codigoUsuario);
      const data = await this.fetchJson(`./api/packings?${params.toString()}`);
      const rows = data.rows || [];
      this.state.packings = rows;
      rows.forEach((row) => {
        const option = document.createElement('option');
        option.value = String(row.id);
        option.textContent = row.name;
        this.elements.packingSelect.appendChild(option);
      });
      this.elements.packingSelect.disabled = rows.length === 0;
    } catch (error) {
      this.elements.packingSelect.disabled = true;
      if (this.isAccessError(error)) {
        this.showAlert('Warning ACCESO NO AUTORIZADO !!!');
      }
    }
  }

  onPackingChange() {
    const selectedId = String(this.elements.packingSelect.value || '');
    this.state.selectedPacking =
      this.state.packings.find((row) => String(row.id) === selectedId) || null;
    this.updateResumen();
  }

  updateResumen() {
    const selected = this.state.selected;
    if (!selected) {
      return;
    }
    const info = [
      { label: this.t('colCodigo'), value: selected.codigo_paquete },
      { label: this.t('colCliente'), value: selected.nombre_cliente },
      { label: this.t('colEntrega'), value: selected.concatenarpuntoentrega },
      { label: this.t('colRecibe'), value: selected.concatenarnumrecibe },
      { label: this.t('labelPacking'), value: this.state.selectedPacking?.name || '-' },
      { label: this.t('detalleGridTitle'), value: this.state.detalles.length }
    ];
    this.elements.resumenInfo.innerHTML = '';
    info.forEach((item) => {
      const block = document.createElement('div');
      block.className = 'info-item';
      block.innerHTML = `<span>${item.label}</span><strong>${item.value ?? '-'}</strong>`;
      this.elements.resumenInfo.appendChild(block);
    });
  }

  async loadMapIfNeeded() {
    const region = String(this.state.selected?.Region_Entrega || this.state.selected?.region_entrega || '').toUpperCase();
    if (region !== 'LIMA') {
      this.elements.mapSection.classList.add('d-none');
      return;
    }
    this.elements.mapSection.classList.remove('d-none');

    if (!this.state.mapsConfig) {
      try {
        const data = await this.fetchJson('./api/maps-config');
        this.state.mapsConfig = data;
      } catch (error) {
        this.elements.mapSection.classList.add('d-none');
        return;
      }
    }

    if (!this.state.mapsConfig?.apiKey) {
      this.elements.mapSection.classList.add('d-none');
      return;
    }

    await this.ensureMapScript(this.state.mapsConfig.apiKey);
    this.renderMap();
  }

  ensureMapScript(apiKey) {
    if (this.state.mapReady || (window.google && window.google.maps)) {
      this.state.mapReady = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      window.initMap = () => {
        this.state.mapReady = true;
        resolve();
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
      script.async = true;
      script.onerror = () => reject(new Error('MAPS_ERROR'));
      document.head.appendChild(script);
    });
  }

  renderMap() {
    const lat = Number(this.state.selected.latitud || this.state.selected.Latitud || this.state.mapsConfig?.defaultCenter?.lat || 0);
    const lng = Number(this.state.selected.longitud || this.state.selected.Longitud || this.state.mapsConfig?.defaultCenter?.lng || 0);
    const center = { lat, lng };

    if (!this.state.map) {
      this.state.map = new google.maps.Map(this.elements.mapCanvas, {
        center,
        zoom: Number(this.state.mapsConfig?.defaultZoom || 12),
        disableDefaultUI: false
      });
    } else {
      this.state.map.setCenter(center);
    }

    if (!this.state.marker) {
      this.state.marker = new google.maps.Marker({
        position: center,
        map: this.state.map,
        draggable: false
      });
    } else {
      this.state.marker.setPosition(center);
    }
  }

  goPrev() {
    if (this.state.step > 1) {
      this.setStep(this.state.step - 1);
    }
  }

  goNext() {
    if (this.state.step === 1) {
      if (!this.state.selected) {
        this.showAlert(this.t('errorSelection'));
        return;
      }
      this.setStep(2);
      this.loadDetalle();
      return;
    }

    if (this.state.step === 2) {
      if (!this.state.selectedPacking) {
        this.showAlert(this.t('errorPacking'));
        return;
      }
      this.setStep(3);
      this.updateResumen();
      return;
    }

    if (this.state.step === 3) {
      if (!this.elements.confirmCheck.checked) {
        this.showAlert(this.t('errorConfirm'));
        return;
      }
      this.handleConfirm();
    }
  }

  async handleConfirm() {
    if (!this.state.selected) {
      this.showAlert(this.t('errorSelection'));
      return;
    }
    const codigo = String(this.state.selected.codigo_paquete || '').trim();
    const codigoRegex = /^\d+$/;
    if (!codigoRegex.test(codigo)) {
      this.showAlert(this.t('errorServer'));
      return;
    }
    const codigoPacking = String(this.elements.packingSelect.value || '').trim();
    if (!codigoPacking || !codigoRegex.test(codigoPacking)) {
      this.showAlert(this.t('errorPacking'));
      return;
    }

    this.clearMessages();
    this.setLoading(this.elements.loadingGuardar, true);
    try {
      const payload = {
        codigo_usuario: this.state.codigoUsuario,
        codigo_paquete: codigo,
        codigo_packing: codigoPacking
      };
      await this.fetchJson('./api/empacar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(this.t('successSaved'));
      this.resetWizard();
    } catch (error) {
      if (this.isAccessError(error)) {
        this.showAlert('Warning ACCESO NO AUTORIZADO !!!');
      } else {
        this.showAlert(this.t('errorServer'));
      }
    } finally {
      this.setLoading(this.elements.loadingGuardar, false);
    }
  }

  resetWizard() {
    this.state.step = 1;
    this.state.selected = null;
    this.state.detalles = [];
    this.state.packings = [];
    this.state.selectedPacking = null;
    this.elements.confirmCheck.checked = false;
    this.elements.packingSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = this.t('packingPlaceholder');
    placeholder.disabled = true;
    placeholder.selected = true;
    this.elements.packingSelect.appendChild(placeholder);
    this.elements.packingSelect.disabled = true;
    this.renderDetalle();
    this.renderPaquetes();
    this.updateResumen();
    this.setStep(1);
    this.loadPaquetes();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
