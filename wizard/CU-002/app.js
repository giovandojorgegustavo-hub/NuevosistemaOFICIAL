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
    this.empacarBtn = document.getElementById('empacarBtn');
    this.confirmOperacion = document.getElementById('confirmOperacion');
    this.paquetesTableBody = document.querySelector('#paquetesTable tbody');
    this.detalleTableBody = document.querySelector('#detalleTable tbody');
    this.selectedPackageLabel = document.getElementById('selectedPackageLabel');
    this.entregaCard = document.getElementById('entregaCard');
    this.recibeCard = document.getElementById('recibeCard');
    this.paqueteCard = document.getElementById('paqueteCard');
    this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
    this.logsContent = document.getElementById('logsContent');

    this.regex = {
      codigoPaquete: /^[0-9]+$/,
    };

    this.state = {
      paquetes: [],
      detalle: [],
      info: null,
      selectedPaquete: null,
      locale: navigator.language || 'es',
    };

    this.dictionary = {
      es: {
        stepTitles: [
          'Paso 1: Paquetes Pendientes',
          'Paso 2: Detalle del Documento',
          'Paso 3: Confirmar Empaque',
        ],
        stepHints: [
          'Seleccione un paquete en estado pendiente empacar.',
          'Revise el detalle del documento seleccionado.',
          'Valide entrega y recepcion antes de empacar.',
        ],
        ui: {
          wizardStatus: 'Servicio Global IaaS/PaaS',
          wizardTitle: 'Empaquetar Paquetes',
          wizardSubtitle: 'Confirme entrega y recepcion con trazabilidad lista para despacho.',
          viewLogs: 'Ver Logs de SQL',
          paquetesPendientes: 'vPaquetesPendientes',
          sinSeleccion: 'Ningun paquete seleccionado',
          codigoPaquete: 'Codigo Paquete',
          estado: 'Estado',
          fechaRegistro: 'Fecha Registro',
          codigoCliente: 'Codigo Cliente',
          nombreCliente: 'Nombre Cliente',
          ubigeo: 'Ubigeo',
          regionEntrega: 'Region Entrega',
          seleccionar: 'Seleccionar',
          detalleDocumento: 'Detalle del Documento',
          detalleHint: 'Informacion solo lectura del documento seleccionado.',
          nombreProducto: 'Nombre Producto',
          cantidad: 'Cantidad',
          confirmacion: 'Confirmo que la informacion es correcta',
          empacar: 'Empacar',
          anterior: 'Anterior',
          siguiente: 'Siguiente',
          logsTitle: 'Logs de SQL',
          loading: 'Procesando...',
          loadingHint: 'Espere un momento.',
          entregaTitulo: 'Entrega',
          recibeTitulo: 'Recibe',
          paqueteTitulo: 'Resumen',
          direccion: 'Direccion',
          referencia: 'Referencia',
          destinatario: 'Destinatario',
          dni: 'DNI',
          agencia: 'Agencia',
          ubigeoNombre: 'Ubigeo',
          numeroRecibe: 'Numero',
          nombreRecibe: 'Nombre',
          region: 'Region',
          sinDatos: 'Sin datos disponibles',
          noAplica: 'No aplica para PROV',
        },
        messages: {
          errorServer: 'Error al comunicar con el servidor',
          seleccionarPaquete: 'Seleccione un paquete pendiente.',
          codigoPaqueteInvalido: 'Codigo de paquete invalido.',
          confirmarOperacion: 'Debe confirmar la operacion.',
          empacarOk: 'Paquete empacado correctamente.',
          sinLogs: 'Sin logs disponibles.',
        },
      },
      en: {
        stepTitles: [
          'Step 1: Pending Packages',
          'Step 2: Document Detail',
          'Step 3: Confirm Packing',
        ],
        stepHints: [
          'Select a package in pending packing state.',
          'Review selected document details.',
          'Validate delivery and reception before packing.',
        ],
        ui: {
          wizardStatus: 'Global IaaS/PaaS Service',
          wizardTitle: 'Package Packing',
          wizardSubtitle: 'Confirm delivery and reception with dispatch-ready traceability.',
          viewLogs: 'View SQL Logs',
          paquetesPendientes: 'vPendingPackages',
          sinSeleccion: 'No package selected',
          codigoPaquete: 'Package Code',
          estado: 'Status',
          fechaRegistro: 'Register Date',
          codigoCliente: 'Client Code',
          nombreCliente: 'Client Name',
          ubigeo: 'Ubigeo',
          regionEntrega: 'Delivery Region',
          seleccionar: 'Select',
          detalleDocumento: 'Document Detail',
          detalleHint: 'Read-only information for the selected document.',
          nombreProducto: 'Product Name',
          cantidad: 'Quantity',
          confirmacion: 'I confirm the information is correct',
          empacar: 'Pack',
          anterior: 'Previous',
          siguiente: 'Next',
          logsTitle: 'SQL Logs',
          loading: 'Processing...',
          loadingHint: 'Please wait.',
          entregaTitulo: 'Delivery',
          recibeTitulo: 'Receiver',
          paqueteTitulo: 'Summary',
          direccion: 'Address',
          referencia: 'Reference',
          destinatario: 'Recipient',
          dni: 'ID',
          agencia: 'Agency',
          ubigeoNombre: 'Ubigeo',
          numeroRecibe: 'Number',
          nombreRecibe: 'Name',
          region: 'Region',
          sinDatos: 'No data available',
          noAplica: 'Not applicable for PROV',
        },
        messages: {
          errorServer: 'Failed to communicate with server',
          seleccionarPaquete: 'Select a pending package.',
          codigoPaqueteInvalido: 'Invalid package code.',
          confirmarOperacion: 'You must confirm the operation.',
          empacarOk: 'Package packed successfully.',
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

  init() {
    this.applyTranslations();
    this.showStep(0);
    this.prevBtn.addEventListener('click', () => this.goPrev());
    this.nextBtn.addEventListener('click', () => this.goNext());
    this.empacarBtn.addEventListener('click', () => this.handleEmpacar());
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.openLogs());
    this.paquetesTableBody.addEventListener('click', (event) => this.handleTableClick(event));
    this.loadPaquetes();
  }

  updateSelectionLabel() {
    if (this.state.selectedPaquete) {
      this.selectedPackageLabel.textContent = `${this.t('ui.codigoPaquete')}: ${this.state.selectedPaquete}`;
    } else {
      this.selectedPackageLabel.textContent = this.t('ui.sinSeleccion');
    }
  }

  setLoading(isLoading, textKey = 'loading') {
    if (isLoading) {
      this.loadingText.textContent = this.t(`ui.${textKey}`) || this.t('ui.loading');
      this.loadingOverlay.classList.add('active');
    } else {
      this.loadingOverlay.classList.remove('active');
    }
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

  clearMessages() {
    this.errorBox.classList.add('d-none');
    this.successBox.classList.add('d-none');
  }

  showStep(index) {
    this.currentStep = index;
    this.steps.forEach((step, idx) => {
      step.classList.toggle('active', idx === index);
    });
    this.stepTitle.textContent = this.t('stepTitles')[index] || '';
    this.stepHint.textContent = this.t('stepHints')[index] || '';
    const progress = Math.round(((index + 1) / this.steps.length) * 100);
    this.progressBar.style.width = `${progress}%`;
    this.progressBar.setAttribute('aria-valuenow', `${progress}`);
    this.prevBtn.disabled = index === 0;
    if (index === this.steps.length - 1) {
      this.nextBtn.classList.add('d-none');
    } else {
      this.nextBtn.classList.remove('d-none');
    }
  }

  goNext() {
    this.clearMessages();
    if (this.currentStep === 0 && !this.state.selectedPaquete) {
      this.showError(this.t('messages.seleccionarPaquete'));
      return;
    }
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    }
  }

  goPrev() {
    this.clearMessages();
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  handleTableClick(event) {
    const button = event.target.closest('[data-action="select"]');
    if (!button) return;
    const codigo = button.getAttribute('data-code');
    this.selectPackage(codigo);
  }

  async loadPaquetes() {
    this.setLoading(true, 'loading');
    try {
      const res = await fetch('/api/paquetes?estado=pendiente%20empacar');
      if (!res.ok) throw new Error(this.t('messages.errorServer'));
      const data = await res.json();
      this.state.paquetes = data;
      const match = this.state.paquetes.some(
        (item) => String(item.codigo_paquete) === String(this.state.selectedPaquete)
      );
      if (!match) {
        this.state.selectedPaquete = null;
        this.state.detalle = [];
        this.state.info = null;
        this.renderDetalle();
        this.renderInfo();
      }
      this.updateSelectionLabel();
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
      row.innerHTML = `<td colspan="8" class="text-center small-muted">${this.t('ui.sinDatos')}</td>`;
      this.paquetesTableBody.appendChild(row);
      return;
    }

    this.state.paquetes.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.codigo_paquete ?? ''}</td>
        <td>${item.estado ?? ''}</td>
        <td>${item.fecha_registro ?? ''}</td>
        <td>${item.codigo_cliente ?? ''}</td>
        <td>${item.nombre_cliente ?? ''}</td>
        <td>${item.ubigeo ?? ''}</td>
        <td>${item.region_entrega ?? ''}</td>
        <td>
          <button class="btn btn-sm btn-outline-light" type="button" data-action="select" data-code="${item.codigo_paquete}">
            ${this.t('ui.seleccionar')}
          </button>
        </td>
      `;
      if (String(item.codigo_paquete) === String(this.state.selectedPaquete)) {
        row.classList.add('active-row');
      }
      this.paquetesTableBody.appendChild(row);
    });
  }

  async selectPackage(codigo) {
    this.clearMessages();
    if (!this.regex.codigoPaquete.test(String(codigo))) {
      this.showError(this.t('messages.codigoPaqueteInvalido'));
      return;
    }
    this.state.selectedPaquete = codigo;
    this.updateSelectionLabel();
    this.renderPaquetes();
    await this.loadDetalleYInfo();
  }

  async loadDetalleYInfo() {
    if (!this.state.selectedPaquete) return;
    this.setLoading(true, 'loading');
    try {
      const [detalleRes, infoRes] = await Promise.all([
        fetch(`/api/paquetes/detalle?codigo=${encodeURIComponent(this.state.selectedPaquete)}`),
        fetch(`/api/paquetes/info?codigo=${encodeURIComponent(this.state.selectedPaquete)}`),
      ]);
      if (!detalleRes.ok || !infoRes.ok) throw new Error(this.t('messages.errorServer'));
      this.state.detalle = await detalleRes.json();
      this.state.info = await infoRes.json();
      this.renderDetalle();
      this.renderInfo();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  renderDetalle() {
    this.detalleTableBody.innerHTML = '';
    if (!this.state.detalle.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="2" class="text-center small-muted">${this.t('ui.sinDatos')}</td>`;
      this.detalleTableBody.appendChild(row);
      return;
    }
    this.state.detalle.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.nombre_producto ?? ''}</td>
        <td>${item.cantidad ?? ''}</td>
      `;
      this.detalleTableBody.appendChild(row);
    });
  }

  renderInfo() {
    const info = this.state.info || {};
    const entrega = info.entrega || {};
    const recibe = info.recibe || {};
    const ubigeo = info.ubigeo || {};

    const ubigeoLabel = ubigeo.nombre
      ? `${ubigeo.nombre} (${ubigeo.codigo || ''})`
      : ubigeo.codigo || '';

    let entregaHtml = `<h4>${this.t('ui.entregaTitulo')}</h4>`;
    if (!entrega.region_entrega) {
      entregaHtml += `<p>${this.t('ui.sinDatos')}</p>`;
    } else if (entrega.region_entrega === 'LIMA') {
      entregaHtml += `
        <p><strong>${this.t('ui.region')}:</strong> ${entrega.region_entrega}</p>
        <p><strong>${this.t('ui.direccion')}:</strong> ${entrega.direccion_linea || '-'}</p>
        <p><strong>${this.t('ui.referencia')}:</strong> ${entrega.referencia || '-'}</p>
        <p><strong>${this.t('ui.destinatario')}:</strong> ${entrega.destinatario_nombre || '-'} </p>
        <p><strong>${this.t('ui.dni')}:</strong> ${entrega.destinatario_dni || '-'}</p>
        <p><strong>${this.t('ui.ubigeoNombre')}:</strong> ${ubigeoLabel || '-'}</p>
      `;
    } else {
      entregaHtml += `
        <p><strong>${this.t('ui.region')}:</strong> ${entrega.region_entrega}</p>
        <p><strong>${this.t('ui.agencia')}:</strong> ${entrega.agencia || '-'}</p>
        <p><strong>${this.t('ui.ubigeoNombre')}:</strong> ${ubigeoLabel || '-'}</p>
      `;
    }
    this.entregaCard.innerHTML = entregaHtml;

    let recibeHtml = `<h4>${this.t('ui.recibeTitulo')}</h4>`;
    if (entrega.region_entrega !== 'LIMA') {
      recibeHtml += `<p>${this.t('ui.noAplica')}</p>`;
    } else if (!recibe.numero) {
      recibeHtml += `<p>${this.t('ui.sinDatos')}</p>`;
    } else {
      recibeHtml += `
        <p><strong>${this.t('ui.numeroRecibe')}:</strong> ${recibe.numero}</p>
        <p><strong>${this.t('ui.nombreRecibe')}:</strong> ${recibe.nombre || '-'}</p>
      `;
    }
    this.recibeCard.innerHTML = recibeHtml;

    const paquete = this.state.paquetes.find(
      (item) => String(item.codigo_paquete) === String(this.state.selectedPaquete)
    );
    let paqueteHtml = `<h4>${this.t('ui.paqueteTitulo')}</h4>`;
    if (!paquete) {
      paqueteHtml += `<p>${this.t('ui.sinDatos')}</p>`;
    } else {
      paqueteHtml += `
        <p><strong>${this.t('ui.codigoPaquete')}:</strong> ${paquete.codigo_paquete}</p>
        <p><strong>${this.t('ui.estado')}:</strong> ${paquete.estado}</p>
        <p><strong>${this.t('ui.nombreCliente')}:</strong> ${paquete.nombre_cliente || '-'}</p>
        <p><strong>${this.t('ui.regionEntrega')}:</strong> ${paquete.region_entrega || '-'}</p>
      `;
    }
    this.paqueteCard.innerHTML = paqueteHtml;
  }

  async handleEmpacar() {
    this.clearMessages();
    const codigo = this.state.selectedPaquete;
    if (!codigo) {
      this.showError(this.t('messages.seleccionarPaquete'));
      return;
    }
    if (!this.regex.codigoPaquete.test(String(codigo))) {
      this.showError(this.t('messages.codigoPaqueteInvalido'));
      return;
    }
    if (!this.confirmOperacion.checked) {
      this.showError(this.t('messages.confirmarOperacion'));
      return;
    }

    this.setLoading(true, 'loading');
    try {
      const res = await fetch('/api/empacar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_paquete: codigo }),
      });
      if (!res.ok) throw new Error(this.t('messages.errorServer'));
      const data = await res.json();
      this.showSuccess(`${this.t('messages.empacarOk')} ${data.codigo_paquete || ''}`.trim());
      this.confirmOperacion.checked = false;
      await this.loadPaquetes();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  async openLogs() {
    this.clearMessages();
    try {
      const res = await fetch('/api/logs/latest');
      if (!res.ok) throw new Error(this.t('messages.errorServer'));
      const data = await res.json();
      this.logsContent.textContent = data.content || this.t('messages.sinLogs');
      this.logsModal.show();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
