class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progress = document.getElementById('wizardProgress');
    this.stepPills = Array.from(document.querySelectorAll('.step-pill'));
    this.alertArea = document.getElementById('alertArea');
    this.packagesTableBody = document.querySelector('#paquetesTable tbody');
    this.detalleTableBody = document.querySelector('#detalleTable tbody');
    this.tripInfo = document.getElementById('tripInfo');
    this.deliveryInfo = document.getElementById('deliveryInfo');
    this.summaryInfo = document.getElementById('summaryInfo');
    this.estadoSelect = document.getElementById('estadoSelect');
    this.confirmCheck = document.getElementById('confirmCheck');
    this.saveLoading = document.getElementById('saveLoading');

    this.currentStep = 1;
    this.selectedPackage = null;
    this.selectedPackageMeta = null;
    this.selectedDetail = null;
    this.viajeData = null;
    this.ordinal = 1;

    this.packageCodeRegex = /^[A-Za-z0-9-]+$/;

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('step1Next').addEventListener('click', () => this.goToStep(2));
    document.getElementById('step2Back').addEventListener('click', () => this.goToStep(1));
    document.getElementById('step2Next').addEventListener('click', () => this.goToStep(3));
    document.getElementById('step3Back').addEventListener('click', () => this.goToStep(2));
    document.getElementById('confirmBtn').addEventListener('click', () => this.confirmState());
    document.getElementById('btnLogs').addEventListener('click', () => this.openLogs());
  }

  async init() {
    this.setLanguage();
    await this.loadPackages();
    this.updateProgress();
  }

  setLanguage() {
    const lang = (navigator.language || 'en').split('-')[0];
    document.documentElement.lang = lang;
    const translations = this.getTranslations();
    const t = (key) => translations[lang]?.[key] || translations.en[key] || key;
    this.t = t;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
  }

  getTranslations() {
    return {
      es: {
        eyebrow: 'Operaciones Globales IaaS / PaaS',
        title: 'Gestionar paquetes en standby',
        subtitle: 'Flujo seguro y trazable para actualizar el estado de paquetes en espera.',
        viewLogs: 'Ver logs SQL',
        step1Title: 'Seleccion de paquete en standby',
        step1Desc: 'Selecciona un paquete en espera para continuar.',
        thCodigo: 'Codigo',
        thFecha: 'Fecha',
        thCliente: 'Cliente',
        thNumCliente: 'Num. cliente',
        thEntrega: 'Punto entrega',
        thRecibe: 'Num. recibe',
        next: 'Siguiente',
        step2Title: 'Detalle del paquete',
        step2Desc: 'Informacion del viaje y contenido del documento.',
        tripInfo: 'Datos del viaje',
        deliveryInfo: 'Datos de entrega',
        detailTitle: 'Detalle mov contable',
        thProducto: 'Producto',
        thCantidad: 'Cantidad',
        back: 'Anterior',
        step3Title: 'Confirmar y guardar',
        step3Desc: 'Actualiza el estado y confirma la operacion.',
        summaryTitle: 'Resumen del paquete',
        statusUpdate: 'Nuevo estado',
        estadoLabel: 'Estado',
        estadoPlaceholder: 'Selecciona un estado',
        estadoRobado: 'Robado',
        estadoDevuelto: 'Devuelto',
        estadoEmpacado: 'Empacado',
        estadoLlegado: 'Llegado',
        confirmText: 'Confirmo que deseo actualizar el estado del paquete.',
        saving: 'Guardando...',
        confirm: 'Confirmar operacion',
        logsTitle: 'Logs SQL',
        loading: 'Cargando...',
        noData: 'Sin datos',
        invalidCode: 'Codigo de paquete invalido',
        selectPackage: 'Selecciona un paquete para continuar.',
        selectState: 'Selecciona un estado.',
        confirmRequired: 'Debes confirmar la operacion.',
        loadPackagesError: 'No se pudo cargar paquetes',
        loadDetailError: 'No se pudo cargar el detalle del paquete',
        saveError: 'No se pudo guardar la operacion',
        logsError: 'No se pudieron cargar los logs',
        operationOk: 'Operacion confirmada.',
        select: 'Seleccionar',
        labelFecha: 'Fecha',
        labelBase: 'Base',
        labelMotorizado: 'Motorizado',
        labelWhatsApp: 'WhatsApp',
        labelLlamadas: 'Llamadas',
        labelYape: 'Yape',
        labelLink: 'Link',
        labelObservacion: 'Observacion',
        labelEntrega: 'Punto entrega',
        labelRecibe: 'Num recibe',
        labelPaquete: 'Paquete',
        labelOrdinal: 'Ordinal',
        labelCliente: 'Cliente',
      },
      en: {
        eyebrow: 'Global IaaS / PaaS Operations',
        title: 'Manage standby packages',
        subtitle: 'Secure, traceable flow to update waiting package status.',
        viewLogs: 'View SQL logs',
        step1Title: 'Select standby package',
        step1Desc: 'Choose a waiting package to continue.',
        thCodigo: 'Code',
        thFecha: 'Updated date',
        thCliente: 'Client',
        thNumCliente: 'Client no.',
        thEntrega: 'Delivery point',
        thRecibe: 'Receiver no.',
        next: 'Next',
        step2Title: 'Package detail',
        step2Desc: 'Trip information and document contents.',
        tripInfo: 'Trip data',
        deliveryInfo: 'Delivery data',
        detailTitle: 'Accounting detail',
        thProducto: 'Product',
        thCantidad: 'Quantity',
        back: 'Back',
        step3Title: 'Confirm and save',
        step3Desc: 'Update the status and confirm the operation.',
        summaryTitle: 'Package summary',
        statusUpdate: 'New status',
        estadoLabel: 'Status',
        estadoPlaceholder: 'Select a status',
        estadoRobado: 'Stolen',
        estadoDevuelto: 'Returned',
        estadoEmpacado: 'Packed',
        estadoLlegado: 'Arrived',
        confirmText: 'I confirm I want to update the package status.',
        saving: 'Saving...',
        confirm: 'Confirm operation',
        logsTitle: 'SQL logs',
        loading: 'Loading...',
        noData: 'No data',
        invalidCode: 'Invalid package code',
        selectPackage: 'Select a package to continue.',
        selectState: 'Select a status.',
        confirmRequired: 'You must confirm the operation.',
        loadPackagesError: 'Could not load packages',
        loadDetailError: 'Could not load package details',
        saveError: 'Could not save the operation',
        logsError: 'Could not load logs',
        operationOk: 'Operation confirmed.',
        select: 'Select',
        labelFecha: 'Date',
        labelBase: 'Base',
        labelMotorizado: 'Driver',
        labelWhatsApp: 'WhatsApp',
        labelLlamadas: 'Calls',
        labelYape: 'Yape',
        labelLink: 'Link',
        labelObservacion: 'Notes',
        labelEntrega: 'Delivery point',
        labelRecibe: 'Receiver no.',
        labelPaquete: 'Package',
        labelOrdinal: 'Ordinal',
        labelCliente: 'Client',
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

  setLoading(target, isLoading) {
    if (target) {
      target.classList.toggle('d-none', !isLoading);
    }
  }

  async loadPackages() {
    try {
      this.clearAlert();
      this.packagesTableBody.innerHTML = `<tr><td colspan="7">${this.t('loading')}</td></tr>`;
      const response = await fetch('/api/paquetes-standby');
      if (!response.ok) throw new Error(this.t('loadPackagesError'));
      const data = await response.json();
      this.packages = Array.isArray(data) ? data : [];
      this.renderPackages(this.packages);
    } catch (error) {
      this.packagesTableBody.innerHTML = '';
      this.showAlert(error.message);
    }
  }

  renderPackages(packages) {
    if (!Array.isArray(packages) || packages.length === 0) {
      this.packagesTableBody.innerHTML = `<tr><td colspan="7">${this.t('noData')}</td></tr>`;
      return;
    }

    this.packagesTableBody.innerHTML = packages
      .map((item) => {
        const code = item.Vcodigo_paquete || item.codigo_paquete || '';
        return `
          <tr>
            <td>${code}</td>
            <td>${item.vfecha || item.fecha_actualizado || ''}</td>
            <td>${item.vnombre_cliente || item.nombre_cliente || ''}</td>
            <td>${item.vnum_cliente || item.num_cliente || ''}</td>
            <td>${item.vconcatenarpuntoentrega || item.concatenarpuntoentrega || ''}</td>
            <td>${item.vconcatenarnumrecibe || item.concatenarnumrecibe || ''}</td>
            <td>
              <button class="btn btn-sm btn-outline-light" data-code="${code}">${this.t('select')}</button>
            </td>
          </tr>
        `;
      })
      .join('');

    this.packagesTableBody.querySelectorAll('button[data-code]').forEach((btn) => {
      btn.addEventListener('click', () => this.selectPackage(btn.getAttribute('data-code')));
    });
  }

  async selectPackage(code) {
    const normalizedCode = String(code ?? '').trim();
    if (!this.packageCodeRegex.test(normalizedCode)) {
      this.showAlert(this.t('invalidCode'));
      return;
    }

    this.selectedPackage = normalizedCode;
    this.selectedPackageMeta = this.packages?.find((item) => {
      return (item.Vcodigo_paquete || item.codigo_paquete) === normalizedCode;
    });
    document.getElementById('step1Next').disabled = false;
    await this.loadPackageDetail(code);
    this.goToStep(2);
  }

  async loadPackageDetail(code) {
    try {
      this.clearAlert();
      this.tripInfo.innerHTML = this.t('loading');
      this.deliveryInfo.innerHTML = '';
      this.detalleTableBody.innerHTML = '';
      const response = await fetch(`/api/paquete/${encodeURIComponent(code)}`);
      if (!response.ok) throw new Error(this.t('loadDetailError'));
      const data = await response.json();
      this.viajeData = data.viaje || {};
      this.selectedDetail = data.detalle || [];
      this.ordinal = data.ordinal || 1;
      this.renderTripInfo();
      this.renderDetalle();
      this.renderSummary();
    } catch (error) {
      this.showAlert(error.message);
    }
  }

  renderTripInfo() {
    const v = this.viajeData || {};
    this.tripInfo.innerHTML = `
      <div><span>${this.t('labelFecha')}</span>${v.fecha || ''}</div>
      <div><span>${this.t('labelBase')}</span>${v.nombrebase || ''}</div>
      <div><span>${this.t('labelMotorizado')}</span>${v.nombre_motorizado || ''}</div>
      <div><span>${this.t('labelWhatsApp')}</span>${v.numero_wsp || ''}</div>
      <div><span>${this.t('labelLlamadas')}</span>${v.num_llamadas || ''}</div>
      <div><span>${this.t('labelYape')}</span>${v.num_yape || ''}</div>
      <div><span>${this.t('labelLink')}</span>${v.link || ''}</div>
      <div><span>${this.t('labelObservacion')}</span>${v.observacion || ''}</div>
    `;

    this.deliveryInfo.innerHTML = `
      <div><span>${this.t('labelEntrega')}</span>${
        this.selectedPackageMeta?.vconcatenarpuntoentrega || this.selectedPackageMeta?.concatenarpuntoentrega || ''
      }</div>
      <div><span>${this.t('labelRecibe')}</span>${
        this.selectedPackageMeta?.vconcatenarnumrecibe || this.selectedPackageMeta?.concatenarnumrecibe || ''
      }</div>
    `;
  }

  renderDetalle() {
    if (!Array.isArray(this.selectedDetail) || this.selectedDetail.length === 0) {
      this.detalleTableBody.innerHTML = `<tr><td colspan="2">${this.t('noData')}</td></tr>`;
      return;
    }

    this.detalleTableBody.innerHTML = this.selectedDetail
      .map((row) => {
        return `
          <tr>
            <td>${row.Vnombre_producto || row.nombre_producto || ''}</td>
            <td>${row.vcantidad || row.cantidad || ''}</td>
          </tr>
        `;
      })
      .join('');
  }

  renderSummary() {
    const v = this.viajeData || {};
    const meta = this.selectedPackageMeta || {};
    this.summaryInfo.innerHTML = `
      <div><span>${this.t('labelPaquete')}</span>${this.selectedPackage || ''}</div>
      <div><span>${this.t('labelCliente')}</span>${meta.vnombre_cliente || meta.nombre_cliente || ''}</div>
      <div><span>${this.t('labelEntrega')}</span>${meta.vconcatenarpuntoentrega || meta.concatenarpuntoentrega || ''}</div>
      <div><span>${this.t('labelRecibe')}</span>${meta.vconcatenarnumrecibe || meta.concatenarnumrecibe || ''}</div>
      <div><span>${this.t('labelMotorizado')}</span>${v.nombre_motorizado || ''}</div>
      <div><span>${this.t('labelBase')}</span>${v.nombrebase || ''}</div>
      <div><span>${this.t('labelLink')}</span>${v.link || ''}</div>
      <div><span>${this.t('labelOrdinal')}</span>${this.ordinal}</div>
    `;
  }

  goToStep(step) {
    if (step === 2 && !this.selectedPackage) {
      this.showAlert(this.t('selectPackage'));
      return;
    }
    this.currentStep = step;
    this.steps.forEach((el) => {
      el.classList.toggle('d-none', Number(el.dataset.step) !== step);
    });
    this.updateProgress();
  }

  updateProgress() {
    const percentage = (this.currentStep / this.steps.length) * 100;
    this.progress.style.width = `${percentage}%`;
    this.stepPills.forEach((pill) => {
      pill.classList.toggle('active', Number(pill.dataset.step) === this.currentStep);
    });
  }

  async confirmState() {
    try {
      this.clearAlert();
      const estado = this.estadoSelect.value;
      if (!estado) {
        this.showAlert(this.t('selectState'));
        return;
      }
      if (!this.confirmCheck.checked) {
        this.showAlert(this.t('confirmRequired'));
        return;
      }
      if (!this.packageCodeRegex.test(this.selectedPackage || '')) {
        this.showAlert(this.t('invalidCode'));
        return;
      }
      this.setLoading(this.saveLoading, true);
      const response = await fetch(`/api/paquete/${encodeURIComponent(this.selectedPackage)}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || this.t('saveError'));
      }
      const data = await response.json();
      this.ordinal = data.ordinal || this.ordinal;
      this.showAlert(this.t('operationOk'), 'success');
      this.confirmCheck.checked = false;
      await this.loadPackages();
    } catch (error) {
      this.showAlert(error.message);
    } finally {
      this.setLoading(this.saveLoading, false);
    }
  }

  async openLogs() {
    try {
      const response = await fetch('/api/logs/latest');
      if (!response.ok) throw new Error(this.t('logsError'));
      const data = await response.json();
      document.getElementById('logsContent').textContent = data.content || '';
      const modal = new bootstrap.Modal(document.getElementById('logsModal'));
      modal.show();
    } catch (error) {
      this.showAlert(error.message);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
