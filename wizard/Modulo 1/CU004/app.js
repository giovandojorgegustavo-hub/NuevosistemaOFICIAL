class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progress = document.getElementById('wizardProgress');
    this.stepPills = Array.from(document.querySelectorAll('.step-pill'));
    this.alertArea = document.getElementById('alertArea');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');

    this.searchInput = document.getElementById('searchInput');
    this.paquetesBody = document.getElementById('paquetesBody');
    this.countHint = document.getElementById('countHint');
    this.selectedHint = document.getElementById('selectedHint');

    this.detalleBody = document.getElementById('detalleBody');

    this.detalleCodigo = document.getElementById('detalleCodigo');
    this.detalleFecha = document.getElementById('detalleFecha');
    this.detalleCliente = document.getElementById('detalleCliente');
    this.detalleNumCliente = document.getElementById('detalleNumCliente');
    this.detalleBase = document.getElementById('detalleBase');
    this.detalleMotorizado = document.getElementById('detalleMotorizado');
    this.detalleWsp = document.getElementById('detalleWsp');
    this.detalleLlamadas = document.getElementById('detalleLlamadas');
    this.detalleYape = document.getElementById('detalleYape');
    this.detalleEntrega = document.getElementById('detalleEntrega');
    this.detalleRecibe = document.getElementById('detalleRecibe');
    this.detalleLink = document.getElementById('detalleLink');
    this.detalleObs = document.getElementById('detalleObs');

    this.estadoInput = document.getElementById('estadoInput');
    this.ordinalInput = document.getElementById('ordinalInput');
    this.confirmCheck = document.getElementById('confirmCheck');

    this.summaryPaquete = document.getElementById('summaryPaquete');
    this.summaryViaje = document.getElementById('summaryViaje');
    this.summaryEstado = document.getElementById('summaryEstado');

    this.currentStep = 1;
    this.paquetes = [];
    this.detalle = [];
    this.selectedPackage = null;
    this.selectedViaje = null;
    this.vOrdinal = null;
    this.selectedIndex = null;

    this.regex = {
      estado: /^(robado|devuelto|empacado|llegado)$/i,
      codigo: /^\d+$/,
    };

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('btnRefresh').addEventListener('click', () => this.loadPaquetes());
    document.getElementById('btnLogs').addEventListener('click', () => this.openLogs());
    document.getElementById('step1Next').addEventListener('click', () => this.handleStep1());
    document.getElementById('step2Back').addEventListener('click', () => this.goToStep(1));
    document.getElementById('step2Next').addEventListener('click', () => this.handleStep2());
    document.getElementById('step3Back').addEventListener('click', () => this.goToStep(2));
    document.getElementById('confirmBtn').addEventListener('click', () => this.handleConfirm());
    this.searchInput.addEventListener('input', () => this.renderPaquetes());
    this.estadoInput.addEventListener('input', () => this.renderSummary());
  }

  async init() {
    this.setLanguage();
    await this.loadPaquetes();
    this.updateProgress();
  }

  setLanguage() {
    const lang = (navigator.language || 'es').split('-')[0];
    document.documentElement.lang = lang;
    const translations = this.getTranslations();
    const t = (key) => translations[lang]?.[key] || translations.es[key] || key;
    this.t = t;
    this.currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key));
    });
  }

  getTranslations() {
    return {
      es: {
        eyebrow: 'Operaciones Globales IaaS / PaaS',
        title: 'Gestionar paquetes en standby',
        subtitle: 'Confirma el estado de paquetes en standby con trazabilidad completa y visibilidad del viaje.',
        viewLogs: 'Ver logs SQL',
        refresh: 'Actualizar',
        case: 'CU004',
        step1Pill: 'Paquetes',
        step2Pill: 'Detalle',
        step3Pill: 'Confirmar',
        step1Title: 'Seleccion de paquete en standby',
        step1Desc: 'Revisa los paquetes en estado standby y selecciona uno para gestionar.',
        searchLabel: 'Buscar paquete',
        selectedLabel: 'Seleccion actual',
        noneSelected: 'Sin paquete seleccionado',
        searchPlaceholder: 'Codigo, cliente, punto entrega',
        thCodigo: 'Codigo',
        thFecha: 'Fecha',
        thCliente: 'Cliente',
        thNumero: 'Numero cliente',
        thEntrega: 'Punto entrega',
        thRecibe: 'Recibe',
        select: 'Seleccionar',
        step2Title: 'Detalle completo del paquete',
        step2Desc: 'Consulta los datos del viaje y el detalle del documento seleccionado.',
        labelCodigo: 'Codigo paquete',
        labelFecha: 'Fecha',
        labelCliente: 'Cliente',
        labelNumeroCliente: 'Numero cliente',
        labelBase: 'Base',
        labelMotorizado: 'Motorizado',
        labelWsp: 'WhatsApp',
        labelLlamadas: 'Llamadas',
        labelYape: 'Yape',
        labelEntrega: 'Punto entrega',
        labelRecibe: 'Recibe',
        labelLink: 'Link',
        labelObs: 'Observacion',
        detalleTitle: 'Detalle mov contable',
        thProducto: 'Producto',
        thCantidad: 'Cantidad',
        step3Title: 'Confirmar y guardar',
        step3Desc: 'Define el nuevo estado y confirma la operacion.',
        labelEstado: 'Nuevo estado',
        labelOrdinal: 'Ordinal',
        estadoHint: 'Solo estados permitidos.',
        estadoPlaceholder: 'robado / devuelto / empacado / llegado',
        summaryPaquete: 'Paquete',
        summaryViaje: 'Viaje',
        summaryEstado: 'Estado',
        confirmText: 'Confirmo que deseo actualizar el estado del paquete.',
        confirm: 'Confirmar y guardar',
        next: 'Siguiente',
        back: 'Anterior',
        selectPackage: 'Selecciona un paquete valido para continuar.',
        invalidPackage: 'El codigo del paquete no es valido.',
        loadPaquetesError: 'No se pudieron cargar los paquetes en standby.',
        loadDetalleError: 'No se pudo cargar el detalle del documento.',
        loadViajeError: 'No se pudo cargar el viaje asociado.',
        loadOrdinalError: 'No se pudo calcular el ordinal.',
        noData: 'Sin datos',
        selectEstado: 'Selecciona un estado permitido.',
        confirmRequired: 'Debes confirmar la operacion.',
        missingViaje: 'No se encontro el viaje del paquete seleccionado.',
        missingViajeForEstado: 'No se puede cerrar el viaje sin codigo de viaje.',
        success: 'Estado actualizado correctamente.',
        apiError: 'No se pudo actualizar el estado del paquete.',
        logsTitle: 'Logs SQL',
        loading: 'Procesando...',
        countHint: 'Paquetes encontrados: ',
      },
      en: {
        eyebrow: 'Global IaaS / PaaS Operations',
        title: 'Manage standby packages',
        subtitle: 'Confirm standby package status with full traceability and trip visibility.',
        viewLogs: 'View SQL logs',
        refresh: 'Refresh',
        case: 'CU004',
        step1Pill: 'Packages',
        step2Pill: 'Detail',
        step3Pill: 'Confirm',
        step1Title: 'Select standby package',
        step1Desc: 'Review packages in standby and select one to manage.',
        searchLabel: 'Search package',
        selectedLabel: 'Current selection',
        noneSelected: 'No package selected',
        searchPlaceholder: 'Code, client, delivery point',
        thCodigo: 'Code',
        thFecha: 'Date',
        thCliente: 'Client',
        thNumero: 'Client number',
        thEntrega: 'Delivery point',
        thRecibe: 'Receiver',
        select: 'Select',
        step2Title: 'Full package detail',
        step2Desc: 'Review trip data and the selected document detail.',
        labelCodigo: 'Package code',
        labelFecha: 'Date',
        labelCliente: 'Client',
        labelNumeroCliente: 'Client number',
        labelBase: 'Base',
        labelMotorizado: 'Courier',
        labelWsp: 'WhatsApp',
        labelLlamadas: 'Calls',
        labelYape: 'Yape',
        labelEntrega: 'Delivery point',
        labelRecibe: 'Receiver',
        labelLink: 'Link',
        labelObs: 'Notes',
        detalleTitle: 'Accounting detail',
        thProducto: 'Product',
        thCantidad: 'Quantity',
        step3Title: 'Confirm and save',
        step3Desc: 'Set the new status and confirm the operation.',
        labelEstado: 'New status',
        labelOrdinal: 'Ordinal',
        estadoHint: 'Only allowed statuses.',
        estadoPlaceholder: 'robado / devuelto / empacado / llegado',
        summaryPaquete: 'Package',
        summaryViaje: 'Trip',
        summaryEstado: 'Status',
        confirmText: 'I confirm I want to update the package status.',
        confirm: 'Confirm and save',
        next: 'Next',
        back: 'Back',
        selectPackage: 'Select a valid package to continue.',
        invalidPackage: 'Package code is not valid.',
        loadPaquetesError: 'Unable to load standby packages.',
        loadDetalleError: 'Unable to load document detail.',
        loadViajeError: 'Unable to load trip data.',
        loadOrdinalError: 'Unable to calculate ordinal.',
        noData: 'No data',
        selectEstado: 'Select a permitted status.',
        confirmRequired: 'You must confirm the operation.',
        missingViaje: 'No trip found for the selected package.',
        missingViajeForEstado: 'Cannot close trip without trip code.',
        success: 'Status updated successfully.',
        apiError: 'Unable to update package status.',
        logsTitle: 'SQL logs',
        loading: 'Processing...',
        countHint: 'Packages found: ',
      },
    };
  }

  updateProgress() {
    const progress = (this.currentStep / this.steps.length) * 100;
    this.progress.style.width = `${progress}%`;
    this.stepPills.forEach((pill) => {
      const step = Number(pill.getAttribute('data-step-pill'));
      pill.classList.toggle('active', step === this.currentStep);
    });
  }

  goToStep(step) {
    this.steps.forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    this.currentStep = step;
    this.updateProgress();
    if (step === 3) {
      this.renderSummary();
    }
  }

  setLoading(show, text) {
    if (text) {
      this.loadingText.textContent = text;
    }
    this.loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  showAlert(message, type = 'danger') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    this.alertArea.appendChild(wrapper);
    setTimeout(() => {
      wrapper.querySelector('.alert')?.classList.remove('show');
      wrapper.querySelector('.alert')?.classList.add('hide');
    }, 5000);
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Request error');
    }
    return response.json();
  }

  async loadPaquetes() {
    try {
      this.setLoading(true, this.t('loading'));
      const data = await this.fetchJson('/api/paquetes?estado=standby');
      this.paquetes = Array.isArray(data) ? data : [];
      this.renderPaquetes();
    } catch (error) {
      this.showAlert(this.t('loadPaquetesError'));
    } finally {
      this.setLoading(false);
    }
  }

  renderPaquetes() {
    const term = this.searchInput.value.trim().toLowerCase();
    const filtered = this.paquetes.filter((pkg) => {
      const values = [
        pkg.codigo_paquete,
        pkg.nombre_cliente,
        pkg.num_cliente,
        pkg.concatenarpuntoentrega,
        pkg.concatenarnumrecibe,
        pkg.fecha_actualizado,
      ];
      return values.some((val) => String(val || '').toLowerCase().includes(term));
    });

    this.paquetesBody.innerHTML = '';
    if (!filtered.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="7" class="text-center text-muted">${this.t('noData')}</td>`;
      this.paquetesBody.appendChild(row);
    } else {
      filtered.forEach((pkg, index) => {
        const row = document.createElement('tr');
        row.classList.add('selectable-row');
        if (this.selectedPackage && this.selectedPackage.codigo_paquete === pkg.codigo_paquete) {
          row.classList.add('active');
        }
        row.innerHTML = `
          <td>${pkg.codigo_paquete ?? ''}</td>
          <td>${pkg.fecha_actualizado ?? ''}</td>
          <td>${pkg.nombre_cliente ?? ''}</td>
          <td>${pkg.num_cliente ?? ''}</td>
          <td>${pkg.concatenarpuntoentrega ?? ''}</td>
          <td>${pkg.concatenarnumrecibe ?? ''}</td>
          <td>
            <button class="btn btn-sm btn-outline-light" type="button">${this.t('select')}</button>
          </td>
        `;
        row.querySelector('button').addEventListener('click', () => this.selectPackage(pkg, index));
        this.paquetesBody.appendChild(row);
      });
    }

    this.countHint.textContent = `${this.t('countHint')}${filtered.length}`;
    if (this.selectedPackage) {
      this.selectedHint.textContent = `${this.selectedPackage.codigo_paquete} - ${this.selectedPackage.nombre_cliente || ''}`;
    } else {
      this.selectedHint.textContent = this.t('noneSelected');
    }
  }

  async selectPackage(pkg, index) {
    this.selectedPackage = pkg;
    this.selectedViaje = null;
    this.detalle = [];
    this.vOrdinal = null;
    this.selectedIndex = typeof index === 'number' ? index : null;
    this.ordinalInput.value = '';
    this.renderPaquetes();

    if (pkg && pkg.codigo_paquete && !this.regex.codigo.test(String(pkg.codigo_paquete))) {
      this.showAlert(this.t('invalidPackage'), 'warning');
      return;
    }

    await Promise.all([this.loadViaje(), this.loadDetalle(), this.loadOrdinal()]);
  }

  async loadViaje() {
    if (!this.selectedPackage) return;
    try {
      const data = await this.fetchJson(`/api/viaje?numero=${this.selectedPackage.codigo_paquete}`);
      this.selectedViaje = data || null;
      this.renderViaje();
    } catch (error) {
      this.showAlert(this.t('loadViajeError'));
    }
  }

  async loadDetalle() {
    if (!this.selectedPackage) return;
    try {
      const data = await this.fetchJson(`/api/mov-detalle?tipo=FAC&numero=${this.selectedPackage.codigo_paquete}`);
      this.detalle = Array.isArray(data) ? data : [];
      this.renderDetalle();
    } catch (error) {
      this.showAlert(this.t('loadDetalleError'));
    }
  }

  async loadOrdinal() {
    if (!this.selectedPackage) return;
    try {
      const indexParam = this.selectedIndex !== null ? `&index=${this.selectedIndex}` : '';
      const data = await this.fetchJson(`/api/paquetes/ordinal?codigo=${this.selectedPackage.codigo_paquete}${indexParam}`);
      this.vOrdinal = data?.next ?? '';
      this.ordinalInput.value = this.vOrdinal ?? '';
    } catch (error) {
      this.showAlert(this.t('loadOrdinalError'));
    }
  }

  renderViaje() {
    const viaje = this.selectedViaje || {};
    const pkg = this.selectedPackage || {};
    this.detalleCodigo.textContent = pkg.codigo_paquete ?? '-';
    this.detalleFecha.textContent = viaje.fecha ?? '-';
    this.detalleCliente.textContent = pkg.nombre_cliente ?? '-';
    this.detalleNumCliente.textContent = pkg.num_cliente ?? '-';
    this.detalleBase.textContent = viaje.nombrebase ?? '-';
    this.detalleMotorizado.textContent = viaje.nombre_motorizado ?? '-';
    this.detalleWsp.textContent = viaje.numero_wsp ?? '-';
    this.detalleLlamadas.textContent = viaje.num_llamadas ?? '-';
    this.detalleYape.textContent = viaje.num_yape ?? '-';
    this.detalleEntrega.textContent = pkg.concatenarpuntoentrega ?? '-';
    this.detalleRecibe.textContent = pkg.concatenarnumrecibe ?? '-';
    this.detalleLink.innerHTML = viaje.link ? `<a href="${viaje.link}" target="_blank" rel="noopener">${viaje.link}</a>` : '-';
    this.detalleObs.textContent = viaje.observacion ?? '-';
  }

  renderDetalle() {
    this.detalleBody.innerHTML = '';
    if (!this.detalle.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="2" class="text-center text-muted">${this.t('noData')}</td>`;
      this.detalleBody.appendChild(row);
      return;
    }
    this.detalle.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.nombre_producto ?? ''}</td>
        <td>${item.cantidad ?? ''}</td>
      `;
      this.detalleBody.appendChild(row);
    });
  }

  handleStep1() {
    if (!this.selectedPackage) {
      this.showAlert(this.t('selectPackage'), 'warning');
      return;
    }
    this.goToStep(2);
    if (!this.selectedViaje) {
      this.showAlert(this.t('missingViaje'), 'warning');
    }
  }

  handleStep2() {
    if (!this.selectedPackage) {
      this.showAlert(this.t('selectPackage'), 'warning');
      return;
    }
    this.goToStep(3);
  }

  renderSummary() {
    const pkg = this.selectedPackage || {};
    const viaje = this.selectedViaje || {};
    this.summaryPaquete.innerHTML = `
      <div><strong>${pkg.codigo_paquete ?? '-'}</strong></div>
      <div>${pkg.nombre_cliente ?? '-'}</div>
      <div>${pkg.concatenarpuntoentrega ?? '-'}</div>
      <div>${pkg.concatenarnumrecibe ?? '-'}</div>
    `;
    const link = viaje.link ? `<a href="${viaje.link}" target="_blank" rel="noopener">${viaje.link}</a>` : '-';
    this.summaryViaje.innerHTML = `
      <div>${viaje.nombrebase ?? '-'} | ${viaje.nombre_motorizado ?? '-'}</div>
      <div>${viaje.numero_wsp ?? '-'}</div>
      <div>${viaje.num_llamadas ?? '-'}</div>
      <div>${viaje.num_yape ?? '-'}</div>
      <div>${link}</div>
    `;
    this.summaryEstado.textContent = this.estadoInput.value.trim() || '-';
  }

  async handleConfirm() {
    const estado = this.estadoInput.value.trim().toLowerCase();
    if (!this.regex.estado.test(estado)) {
      this.showAlert(this.t('selectEstado'), 'warning');
      return;
    }
    if (!this.confirmCheck.checked) {
      this.showAlert(this.t('confirmRequired'), 'warning');
      return;
    }
    const requiereCierre = ['robado', 'devuelto', 'empacado', 'llegado'].includes(estado);
    if (requiereCierre && !this.selectedViaje?.codigoviaje) {
      this.showAlert(this.t('missingViajeForEstado'), 'warning');
      return;
    }

    try {
      this.setLoading(true, this.t('loading'));
      const payload = {
        codigo_paquete: this.selectedPackage?.codigo_paquete,
        estado,
        ordinal: this.vOrdinal,
        codigoviaje: this.selectedViaje?.codigoviaje || null,
      };
      await this.fetchJson('/api/paquetes/estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.showAlert(this.t('success'), 'success');
      this.resetWizard();
    } catch (error) {
      this.showAlert(this.t('apiError'));
    } finally {
      this.setLoading(false);
    }
  }

  resetWizard() {
    this.estadoInput.value = '';
    this.confirmCheck.checked = false;
    this.selectedPackage = null;
    this.selectedViaje = null;
    this.detalle = [];
    this.vOrdinal = null;
    this.selectedIndex = null;
    this.ordinalInput.value = '';
    this.detalleBody.innerHTML = '';
    this.renderPaquetes();
    this.goToStep(1);
    this.loadPaquetes();
  }

  async openLogs() {
    try {
      const data = await this.fetchJson('/api/logs');
      const modalEl = document.getElementById('logsModal');
      const content = document.getElementById('logsContent');
      content.textContent = data.content || '';
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    } catch (error) {
      this.showAlert(this.t('apiError'));
    }
  }
}

const wizard = new FormWizard();
wizard.init();
