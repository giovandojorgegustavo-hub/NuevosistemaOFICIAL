class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.progressBar = document.getElementById('progressBar');
    this.stepTitle = document.getElementById('stepTitle');
    this.stepHint = document.getElementById('stepHint');
    this.errorBox = document.getElementById('errorBox');
    this.successBox = document.getElementById('successBox');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.guardarBtn = document.getElementById('guardarBtn');
    this.confirmOperacion = document.getElementById('confirmOperacion');
    this.paquetesTableBody = document.querySelector('#paquetesTable tbody');
    this.productosTableBody = document.querySelector('#productosTable tbody');
    this.selectedPackageLabel = document.getElementById('selectedPackageLabel');
    this.productosCountLabel = document.getElementById('productosCountLabel');
    this.clienteEntregaCard = document.getElementById('clienteEntregaCard');
    this.viajeCard = document.getElementById('viajeCard');
    this.resumenPaqueteCard = document.getElementById('resumenPaqueteCard');
    this.resumenViajeCard = document.getElementById('resumenViajeCard');
    this.nuevoEstadoSelect = document.getElementById('nuevoEstado');
    this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
    this.logsContent = document.getElementById('logsContent');

    this.regex = {
      codigoPaquete: /^[0-9]+$/,
      estado: /^(robado|devuelto|standby|llegado)$/,
    };

    this.state = {
      paquetes: [],
      detalle: [],
      info: null,
      viaje: null,
      selectedPaquete: null,
      locale: navigator.language || 'es',
      estados: ['robado', 'devuelto', 'standby', 'llegado'],
    };

    this.dictionary = {
      es: {
        stepTitles: [
          'Paso 1: Seleccion de Paquete',
          'Paso 2: Detalle del Paquete',
          'Paso 3: Confirmar y Guardar',
        ],
        stepHints: [
          'Seleccione un paquete en camino para continuar.',
          'Revise cliente, productos y viaje asociado.',
          'Confirme el nuevo estado antes de guardar.',
        ],
        ui: {
          wizardStatus: 'Servicio Global IaaS/PaaS',
          wizardTitle: 'Paquetes en Camino',
          wizardSubtitle: 'Gestione estados, detalle y trazabilidad de paquetes con operaciones globales.',
          viewLogs: 'Ver Logs de SQL',
          paquetesEnCamino: 'vPaquetesEnCamino',
          sinSeleccion: 'Ningun paquete seleccionado',
          codigoPaquete: 'Codigo Paquete',
          estado: 'Estado',
          fechaRegistro: 'Fecha Registro',
          codigoCliente: 'Codigo Cliente',
          nombreCliente: 'Nombre Cliente',
          ubigeo: 'Ubigeo',
          regionEntrega: 'Region Entrega',
          productosDocumento: 'Productos del Documento',
          nombreProducto: 'Nombre Producto',
          cantidad: 'Cantidad',
          nuevoEstado: 'Nuevo Estado',
          confirmacion: 'Confirmo que la informacion es correcta',
          guardar: 'Guardar Estado',
          anterior: 'Anterior',
          siguiente: 'Siguiente',
          logsTitle: 'Logs de SQL',
          loading: 'Procesando...',
          loadingHint: 'Espere un momento.',
          clienteEntregaTitulo: 'Cliente y Entrega',
          viajeTitulo: 'Viaje Asociado',
          resumenPaquete: 'Resumen del Paquete',
          resumenViaje: 'Resumen del Viaje',
          codigo: 'Codigo',
          cliente: 'Cliente',
          direccion: 'Direccion',
          referencia: 'Referencia',
          destinatario: 'Destinatario',
          dni: 'DNI',
          agencia: 'Agencia',
          ubigeoNombre: 'Ubigeo',
          recibeNumero: 'Numero Recibe',
          recibeNombre: 'Nombre Recibe',
          base: 'Base',
          motorizado: 'Motorizado',
          wsp: 'WSP',
          llamadas: 'Llamadas',
          yape: 'Yape',
          linkLabel: 'Link',
          observacionLabel: 'Observacion',
          fechaLabel: 'Fecha',
          estadoActual: 'Estado Actual',
          sinDatos: 'Sin datos disponibles',
          seleccionar: 'Seleccionar',
        },
        messages: {
          errorServer: 'Error al comunicar con el servidor',
          seleccionarPaquete: 'Seleccione un paquete en camino.',
          codigoPaqueteInvalido: 'Codigo de paquete invalido.',
          confirmarOperacion: 'Debe confirmar la operacion.',
          estadoInvalido: 'Seleccione un estado valido.',
          guardarOk: 'Estado actualizado correctamente.',
          sinLogs: 'Sin logs disponibles.',
        },
      },
      en: {
        stepTitles: [
          'Step 1: Select Package',
          'Step 2: Package Detail',
          'Step 3: Confirm and Save',
        ],
        stepHints: [
          'Select an in-transit package to continue.',
          'Review customer, products, and trip data.',
          'Confirm the new status before saving.',
        ],
        ui: {
          wizardStatus: 'Global IaaS/PaaS Service',
          wizardTitle: 'Packages In Transit',
          wizardSubtitle: 'Manage status, detail, and traceability for global operations.',
          viewLogs: 'View SQL Logs',
          paquetesEnCamino: 'vPackagesInTransit',
          sinSeleccion: 'No package selected',
          codigoPaquete: 'Package Code',
          estado: 'Status',
          fechaRegistro: 'Register Date',
          codigoCliente: 'Client Code',
          nombreCliente: 'Client Name',
          ubigeo: 'Ubigeo',
          regionEntrega: 'Delivery Region',
          productosDocumento: 'Document Products',
          nombreProducto: 'Product Name',
          cantidad: 'Quantity',
          nuevoEstado: 'New Status',
          confirmacion: 'I confirm the information is correct',
          guardar: 'Save Status',
          anterior: 'Previous',
          siguiente: 'Next',
          logsTitle: 'SQL Logs',
          loading: 'Processing...',
          loadingHint: 'Please wait.',
          clienteEntregaTitulo: 'Customer and Delivery',
          viajeTitulo: 'Associated Trip',
          resumenPaquete: 'Package Summary',
          resumenViaje: 'Trip Summary',
          codigo: 'Code',
          cliente: 'Customer',
          direccion: 'Address',
          referencia: 'Reference',
          destinatario: 'Recipient',
          dni: 'ID',
          agencia: 'Agency',
          ubigeoNombre: 'Ubigeo',
          recibeNumero: 'Receiver Number',
          recibeNombre: 'Receiver Name',
          base: 'Base',
          motorizado: 'Driver',
          wsp: 'WhatsApp',
          llamadas: 'Calls',
          yape: 'Yape',
          linkLabel: 'Link',
          observacionLabel: 'Notes',
          fechaLabel: 'Date',
          estadoActual: 'Current Status',
          sinDatos: 'No data available',
          seleccionar: 'Select',
        },
        messages: {
          errorServer: 'Failed to communicate with server',
          seleccionarPaquete: 'Select an in-transit package.',
          codigoPaqueteInvalido: 'Invalid package code.',
          confirmarOperacion: 'You must confirm the operation.',
          estadoInvalido: 'Select a valid status.',
          guardarOk: 'Status updated successfully.',
          sinLogs: 'No logs available.',
        },
      },
    };

    this.init();
  }

  getLang() {
    const lang = this.state.locale.toLowerCase();
    return lang.startsWith('en') ? 'en' : 'es';
  }

  t(path) {
    const lang = this.getLang();
    const segments = path.split('.');
    let current = this.dictionary[lang];
    for (const segment of segments) {
      if (!current || !(segment in current)) return path;
      current = current[segment];
    }
    return current;
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = this.t(`ui.${key}`);
      if (value) {
        el.textContent = value;
      }
    });
  }

  safe(value, fallback = '') {
    return value === null || value === undefined ? fallback : value;
  }

  init() {
    this.applyTranslations();
    this.populateEstadoOptions();
    this.showStep(0);
    this.prevBtn.addEventListener('click', () => this.goPrev());
    this.nextBtn.addEventListener('click', () => this.goNext());
    this.guardarBtn.addEventListener('click', () => this.handleGuardar());
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.openLogs());
    this.paquetesTableBody.addEventListener('click', (event) => this.handleTableClick(event));
    this.loadPaquetes();
  }

  populateEstadoOptions() {
    this.nuevoEstadoSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = this.t('ui.nuevoEstado');
    placeholder.disabled = true;
    placeholder.selected = true;
    this.nuevoEstadoSelect.appendChild(placeholder);

    this.state.estados.forEach((estado) => {
      const option = document.createElement('option');
      option.value = estado;
      option.textContent = estado;
      this.nuevoEstadoSelect.appendChild(option);
    });
  }

  setLoading(active, message) {
    if (message) {
      this.loadingText.textContent = message;
    } else {
      this.loadingText.textContent = this.t('ui.loading');
    }
    this.loadingOverlay.classList.toggle('active', active);
  }

  showError(message) {
    this.errorBox.textContent = message;
    this.errorBox.classList.remove('d-none');
    this.successBox.classList.add('d-none');
  }

  showSuccess(message) {
    this.successBox.textContent = message;
    this.successBox.classList.remove('d-none');
    this.errorBox.classList.add('d-none');
  }

  clearAlerts() {
    this.errorBox.classList.add('d-none');
    this.successBox.classList.add('d-none');
  }

  showStep(index) {
    this.steps.forEach((step, i) => {
      step.classList.toggle('active', i === index);
    });
    this.currentStep = index;
    const percent = Math.round(((index + 1) / this.steps.length) * 100);
    this.progressBar.style.width = `${percent}%`;
    this.progressBar.setAttribute('aria-valuenow', String(percent));
    this.stepTitle.textContent = this.t(`stepTitles.${index}`);
    this.stepHint.textContent = this.t(`stepHints.${index}`);

    this.prevBtn.disabled = index === 0;
    this.nextBtn.classList.toggle('d-none', index === this.steps.length - 1);
    this.guardarBtn.classList.toggle('d-none', index !== this.steps.length - 1);
  }

  async goNext() {
    this.clearAlerts();
    if (this.currentStep === 0) {
      if (!this.validateSelection()) return;
      const ok = await this.loadDetalle();
      if (!ok) return;
    }
    if (this.currentStep === 1) {
      this.renderResumen();
    }
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    }
  }

  goPrev() {
    this.clearAlerts();
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  validateSelection() {
    if (!this.state.selectedPaquete) {
      this.showError(this.t('messages.seleccionarPaquete'));
      return false;
    }
    if (!this.regex.codigoPaquete.test(String(this.state.selectedPaquete.codigo_paquete))) {
      this.showError(this.t('messages.codigoPaqueteInvalido'));
      return false;
    }
    return true;
  }

  async loadPaquetes() {
    this.setLoading(true);
    try {
      const response = await fetch(`/api/paquetes?estado=${encodeURIComponent('en camino')}`);
      if (!response.ok) throw new Error(this.t('messages.errorServer'));
      const data = await response.json();
      this.state.paquetes = Array.isArray(data) ? data : [];
      this.renderPaquetes();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  renderPaquetes() {
    this.paquetesTableBody.innerHTML = '';
    if (!this.state.paquetes.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 8;
      cell.textContent = this.t('ui.sinDatos');
      cell.classList.add('small-muted');
      row.appendChild(cell);
      this.paquetesTableBody.appendChild(row);
      return;
    }

    this.state.paquetes.forEach((paquete) => {
      const row = document.createElement('tr');
      row.dataset.codigo = paquete.codigo_paquete;
      row.innerHTML = `
        <td><button class="btn btn-sm btn-outline-light select-btn" data-codigo="${paquete.codigo_paquete}">${this.t(
          'ui.seleccionar'
        )}</button></td>
        <td>${this.safe(paquete.codigo_paquete)}</td>
        <td>${this.safe(paquete.estado)}</td>
        <td>${this.formatDate(paquete.fecha_registro)}</td>
        <td>${this.safe(paquete.codigo_cliente)}</td>
        <td>${this.safe(paquete.nombre_cliente)}</td>
        <td>${this.safe(paquete.ubigeo)}</td>
        <td>${this.safe(paquete.region_entrega)}</td>
      `;
      if (this.state.selectedPaquete && paquete.codigo_paquete === this.state.selectedPaquete.codigo_paquete) {
        row.classList.add('selected-row');
      }
      this.paquetesTableBody.appendChild(row);
    });
  }

  handleTableClick(event) {
    const button = event.target.closest('.select-btn');
    if (!button) return;
    const codigo = button.dataset.codigo;
    const paquete = this.state.paquetes.find((item) => String(item.codigo_paquete) === String(codigo));
    if (!paquete) return;
    this.state.selectedPaquete = paquete;
    this.selectedPackageLabel.textContent = `${this.t('ui.codigoPaquete')}: ${paquete.codigo_paquete}`;
    this.renderPaquetes();
  }

  async loadDetalle() {
    if (!this.state.selectedPaquete) return;
    this.setLoading(true);
    let ok = true;
    try {
      const codigo = this.state.selectedPaquete.codigo_paquete;
      const [detalleRes, infoRes, viajeRes] = await Promise.all([
        fetch(`/api/paquetes/detalle?codigo=${encodeURIComponent(codigo)}`),
        fetch(`/api/paquetes/info?codigo=${encodeURIComponent(codigo)}`),
        fetch(`/api/paquetes/viaje?codigo=${encodeURIComponent(codigo)}`),
      ]);

      if (!detalleRes.ok || !infoRes.ok || !viajeRes.ok) {
        throw new Error(this.t('messages.errorServer'));
      }

      this.state.detalle = await detalleRes.json();
      this.state.info = await infoRes.json();
      this.state.viaje = await viajeRes.json();

      this.renderDetalle();
    } catch (error) {
      ok = false;
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
    return ok;
  }

  renderDetalle() {
    const info = this.state.info || {};
    const entrega = info.entrega || {};
    const recibe = info.recibe || {};
    const ubigeo = info.ubigeo || {};
    const viaje = this.state.viaje || {};

    this.clienteEntregaCard.innerHTML = `
      <div class="summary-title">${this.t('ui.clienteEntregaTitulo')}</div>
      <ul class="summary-list">
        <li>${this.t('ui.codigo')}: <span>${this.safe(this.state.selectedPaquete ? this.state.selectedPaquete.codigo_paquete : '')}</span></li>
        <li>${this.t('ui.cliente')}: <span>${this.safe(entrega.nombre_cliente)}</span></li>
        <li>${this.t('ui.direccion')}: <span>${this.safe(entrega.direccion_linea)}</span></li>
        <li>${this.t('ui.referencia')}: <span>${this.safe(entrega.referencia)}</span></li>
        <li>${this.t('ui.destinatario')}: <span>${this.safe(entrega.destinatario_nombre)}</span></li>
        <li>${this.t('ui.dni')}: <span>${this.safe(entrega.destinatario_dni)}</span></li>
        <li>${this.t('ui.agencia')}: <span>${this.safe(entrega.agencia)}</span></li>
        <li>${this.t('ui.ubigeoNombre')}: <span>${ubigeo.nombre || ubigeo.codigo || ''}</span></li>
        <li>${this.t('ui.recibeNumero')}: <span>${this.safe(recibe.numero)}</span></li>
        <li>${this.t('ui.recibeNombre')}: <span>${this.safe(recibe.nombre)}</span></li>
      </ul>
    `;

    this.viajeCard.innerHTML = `
      <div class="summary-title">${this.t('ui.viajeTitulo')}</div>
      <ul class="summary-list">
        <li>${this.t('ui.codigo')}: <span>${this.safe(viaje.codigoviaje, this.t('ui.sinDatos'))}</span></li>
        <li>${this.t('ui.base')}: <span>${this.safe(viaje.codigo_base)}</span></li>
        <li>${this.t('ui.motorizado')}: <span>${this.safe(viaje.nombre_motorizado)}</span></li>
        <li>${this.t('ui.wsp')}: <span>${this.safe(viaje.numero_wsp)}</span></li>
        <li>${this.t('ui.llamadas')}: <span>${this.safe(viaje.num_llamadas)}</span></li>
        <li>${this.t('ui.yape')}: <span>${this.safe(viaje.num_yape)}</span></li>
        <li>${this.t('ui.linkLabel')}: <span>${this.safe(viaje.link)}</span></li>
        <li>${this.t('ui.observacionLabel')}: <span>${this.safe(viaje.observacion)}</span></li>
        <li>${this.t('ui.fechaLabel')}: <span>${this.formatDate(viaje.fecha)}</span></li>
      </ul>
    `;

    this.renderProductos();
  }

  renderProductos() {
    this.productosTableBody.innerHTML = '';
    const detalle = Array.isArray(this.state.detalle) ? this.state.detalle : [];
    this.productosCountLabel.textContent = `${detalle.length} items`;
    if (!detalle.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 2;
      cell.textContent = this.t('ui.sinDatos');
      cell.classList.add('small-muted');
      row.appendChild(cell);
      this.productosTableBody.appendChild(row);
      return;
    }

    detalle.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${this.safe(item.nombre_producto)}</td>
        <td>${this.safe(item.cantidad)}</td>
      `;
      this.productosTableBody.appendChild(row);
    });
  }

  renderResumen() {
    const paquete = this.state.selectedPaquete || {};
    const viaje = this.state.viaje || {};
    this.resumenPaqueteCard.innerHTML = `
      <div class="summary-title">${this.t('ui.resumenPaquete')}</div>
      <ul class="summary-list">
        <li>${this.t('ui.codigo')}: <span>${this.safe(paquete.codigo_paquete)}</span></li>
        <li>${this.t('ui.estadoActual')}: <span>${this.safe(paquete.estado)}</span></li>
        <li>${this.t('ui.cliente')}: <span>${this.safe(paquete.nombre_cliente)}</span></li>
        <li>${this.t('ui.regionEntrega')}: <span>${this.safe(paquete.region_entrega)}</span></li>
        <li>${this.t('ui.fechaRegistro')}: <span>${this.formatDate(paquete.fecha_registro)}</span></li>
      </ul>
    `;

    this.resumenViajeCard.innerHTML = `
      <div class="summary-title">${this.t('ui.resumenViaje')}</div>
      <ul class="summary-list">
        <li>${this.t('ui.codigo')}: <span>${this.safe(viaje.codigoviaje, this.t('ui.sinDatos'))}</span></li>
        <li>${this.t('ui.base')}: <span>${this.safe(viaje.codigo_base)}</span></li>
        <li>${this.t('ui.motorizado')}: <span>${this.safe(viaje.nombre_motorizado)}</span></li>
        <li>${this.t('ui.linkLabel')}: <span>${this.safe(viaje.link)}</span></li>
      </ul>
    `;
  }

  async handleGuardar() {
    this.clearAlerts();
    if (!this.state.selectedPaquete) {
      this.showError(this.t('messages.seleccionarPaquete'));
      return;
    }
    if (!this.confirmOperacion.checked) {
      this.showError(this.t('messages.confirmarOperacion'));
      return;
    }
    const estado = this.nuevoEstadoSelect.value;
    if (!this.regex.estado.test(estado)) {
      this.showError(this.t('messages.estadoInvalido'));
      return;
    }

    this.setLoading(true);
    try {
      const response = await fetch('/api/paquetes/estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo_paquete: this.state.selectedPaquete.codigo_paquete,
          estado,
        }),
      });
      if (!response.ok) throw new Error(this.t('messages.errorServer'));
      const data = await response.json();
      this.showSuccess(this.t('messages.guardarOk'));
      this.state.selectedPaquete.estado = data.estado;
      this.confirmOperacion.checked = false;
      await this.loadPaquetes();
      this.renderResumen();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  async openLogs() {
    this.setLoading(true);
    try {
      const response = await fetch('/api/logs/latest');
      if (!response.ok) throw new Error(this.t('messages.errorServer'));
      const data = await response.json();
      this.logsContent.textContent = data.content || this.t('messages.sinLogs');
      this.logsModal.show();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(this.getLang());
  }
}

new FormWizard();
