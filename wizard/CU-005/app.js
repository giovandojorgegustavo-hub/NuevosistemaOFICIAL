const I18N = {
  es: {
    title: 'Gestionar paquetes en standby',
    subtitle: 'Control multi-paso para paquetes en espera con trazabilidad completa.',
    logs: 'Ver logs SQL',
    logsTitle: 'Logs SQL',
    step1Title: 'Seleccion de paquete en standby',
    step1Chip: 'vPaquetesStandby',
    step2Title: 'Detalle completo del paquete',
    step3Title: 'Confirmar y guardar',
    codigoCol: 'Codigo',
    fechaCol: 'Fecha actualizado',
    clienteCol: 'Cliente',
    numClienteCol: 'Nro cliente',
    entregaCol: 'Punto entrega',
    recibeCol: 'Recibe',
    fecha: 'Fecha',
    base: 'Base',
    motorizado: 'Motorizado',
    wsp: 'Numero WSP',
    llamadas: 'Nro llamadas',
    yape: 'Nro yape',
    link: 'Link',
    observacion: 'Observacion',
    puntoEntrega: 'Punto entrega',
    detalleMov: 'Detalle mov_contable_detalle',
    productoCol: 'Producto',
    cantidadCol: 'Cantidad',
    resumen: 'Resumen del paquete',
    viaje: 'Viaje',
    nuevoEstado: 'Nuevo estado',
    robado: 'robado',
    devuelto: 'devuelto',
    empacado: 'empacado',
    llegado: 'llegado',
    confirmar: 'Confirmo que deseo cambiar el estado del paquete.',
    prev: 'Anterior',
    next: 'Siguiente',
    submit: 'Confirmar operacion',
    loading: 'Cargando...',
    empty: 'No hay paquetes en standby disponibles.',
    selectPackage: 'Selecciona un paquete para continuar.',
    selectState: 'Selecciona un nuevo estado.',
    confirmCheck: 'Debes confirmar la operacion.',
    errorFetch: 'No se pudo obtener los datos. Intenta nuevamente.',
    saved: 'Estado actualizado correctamente.',
  },
  en: {
    title: 'Manage standby packages',
    subtitle: 'Multi-step control flow for standby packages with full traceability.',
    logs: 'View SQL logs',
    logsTitle: 'SQL Logs',
    step1Title: 'Select standby package',
    step1Chip: 'vPaquetesStandby',
    step2Title: 'Full package detail',
    step3Title: 'Confirm and save',
    codigoCol: 'Code',
    fechaCol: 'Updated date',
    clienteCol: 'Client',
    numClienteCol: 'Client #',
    entregaCol: 'Delivery point',
    recibeCol: 'Receiver',
    fecha: 'Date',
    base: 'Base',
    motorizado: 'Courier',
    wsp: 'WhatsApp #',
    llamadas: 'Calls #',
    yape: 'Yape #',
    link: 'Link',
    observacion: 'Notes',
    puntoEntrega: 'Delivery point',
    detalleMov: 'mov_contable_detalle detail',
    productoCol: 'Product',
    cantidadCol: 'Quantity',
    resumen: 'Package summary',
    viaje: 'Trip',
    nuevoEstado: 'New status',
    robado: 'stolen',
    devuelto: 'returned',
    empacado: 'packed',
    llegado: 'arrived',
    confirmar: 'I confirm I want to change the package status.',
    prev: 'Previous',
    next: 'Next',
    submit: 'Confirm operation',
    loading: 'Loading...',
    empty: 'No standby packages available.',
    selectPackage: 'Select a package to continue.',
    selectState: 'Select a new status.',
    confirmCheck: 'You must confirm the operation.',
    errorFetch: 'Unable to fetch data. Please try again.',
    saved: 'Status updated successfully.',
  },
};

class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.selectedPaquete = null;
    this.movDetalle = [];
    this.viajeDetalle = null;
    this.ordinal = 1;
    this.locale = this.detectLocale();

    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progressBar = document.getElementById('wizardProgress');
    this.alertBox = document.getElementById('alertBox');
    this.loadingOverlay = document.getElementById('loadingOverlay');

    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.submitBtn = document.getElementById('submitBtn');

    this.paquetesBody = document.getElementById('paquetesBody');
    this.detalleBody = document.getElementById('detalleBody');

    this.bindEvents();
    this.applyTranslations();
    this.loadPaquetes();
  }

  detectLocale() {
    const lang = (navigator.language || 'es').toLowerCase();
    if (lang.startsWith('es')) return 'es';
    return 'en';
  }

  t(key) {
    return I18N[this.locale][key] || key;
  }

  applyTranslations() {
    document.documentElement.lang = this.locale;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = this.t(key);
    });
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.goPrev());
    this.nextBtn.addEventListener('click', () => this.goNext());
    this.submitBtn.addEventListener('click', () => this.submit());

    const logsModal = document.getElementById('logsModal');
    logsModal.addEventListener('show.bs.modal', () => this.loadLogs());
  }

  setLoading(isLoading) {
    this.loadingOverlay.classList.toggle('d-none', !isLoading);
    this.prevBtn.disabled = isLoading;
    this.nextBtn.disabled = isLoading;
    this.submitBtn.disabled = isLoading;
  }

  showAlert(message, type = 'danger') {
    this.alertBox.textContent = message;
    this.alertBox.className = `alert alert-${type}`;
  }

  clearAlert() {
    this.alertBox.className = 'alert d-none';
    this.alertBox.textContent = '';
  }

  setStep(stepIndex) {
    this.currentStep = stepIndex;
    this.steps.forEach((step, index) => {
      step.classList.toggle('d-none', index !== stepIndex);
    });
    const percent = ((stepIndex + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${percent}%`;
    this.progressBar.parentElement.setAttribute('aria-valuenow', String(percent));

    this.prevBtn.classList.toggle('d-none', stepIndex === 0);
    this.nextBtn.classList.toggle('d-none', stepIndex === this.steps.length - 1);
    this.submitBtn.classList.toggle('d-none', stepIndex !== this.steps.length - 1);
  }

  async loadPaquetes() {
    this.setLoading(true);
    this.clearAlert();
    try {
      const res = await fetch('/api/paquetes?estado=standby');
      if (!res.ok) throw new Error('fetch');
      const data = await res.json();
      this.renderPaquetes(data || []);
    } catch (error) {
      this.showAlert(this.t('errorFetch'));
    } finally {
      this.setLoading(false);
    }
  }

  renderPaquetes(rows) {
    this.paquetesBody.innerHTML = '';
    if (!rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="7" class="text-center text-muted">${this.t('empty')}</td>`;
      this.paquetesBody.appendChild(tr);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="radio" name="paquete" /></td>
        <td>${row.Vcodigo_paquete ?? row.codigo_paquete ?? ''}</td>
        <td>${row.vfecha ?? row.fecha_actualizado ?? ''}</td>
        <td>${row.vnombre_cliente ?? row.nombre_cliente ?? ''}</td>
        <td>${row.vnum_cliente ?? row.num_cliente ?? ''}</td>
        <td>${row.vconcatenarpuntoentrega ?? row.concatenarpuntoentrega ?? ''}</td>
        <td>${row.vconcatenarnumrecibe ?? row.concatenarnumrecibe ?? ''}</td>
      `;
      tr.addEventListener('click', () => {
        const input = tr.querySelector('input');
        input.checked = true;
        this.selectPaquete({
          codigo: row.Vcodigo_paquete ?? row.codigo_paquete,
          fecha: row.vfecha ?? row.fecha_actualizado,
          cliente: row.vnombre_cliente ?? row.nombre_cliente,
          numCliente: row.vnum_cliente ?? row.num_cliente,
          entrega: row.vconcatenarpuntoentrega ?? row.concatenarpuntoentrega,
          recibe: row.vconcatenarnumrecibe ?? row.concatenarnumrecibe,
        });
      });
      this.paquetesBody.appendChild(tr);
    });
  }

  async selectPaquete(paquete) {
    this.selectedPaquete = paquete;
    await this.loadPaqueteDetalle();
  }

  async loadPaqueteDetalle() {
    if (!this.selectedPaquete?.codigo) return;
    this.setLoading(true);
    this.clearAlert();
    try {
      const [detalleRes, viajeRes] = await Promise.all([
        fetch(`/api/paquetes/${this.selectedPaquete.codigo}/detalle`),
        fetch(`/api/paquetes/${this.selectedPaquete.codigo}/viaje`),
      ]);
      if (!detalleRes.ok || !viajeRes.ok) throw new Error('fetch');
      const detalleData = await detalleRes.json();
      const viajeData = await viajeRes.json();
      this.movDetalle = detalleData.movDetalle || [];
      this.ordinal = detalleData.ordinal || 1;
      this.viajeDetalle = viajeData || null;
      this.renderDetalle();
    } catch (error) {
      this.showAlert(this.t('errorFetch'));
    } finally {
      this.setLoading(false);
    }
  }

  renderDetalle() {
    const viaje = this.viajeDetalle || {};
    const linkValue = viaje.link || '';
    document.getElementById('viajeFecha').value = viaje.fecha || '';
    document.getElementById('viajeBase').value = viaje.nombrebase || viaje.nombre_base || '';
    document.getElementById('viajeMotorizado').value = viaje.nombre_motorizado || '';
    document.getElementById('viajeWsp').value = viaje.numero_wsp || '';
    document.getElementById('viajeLlamadas').value = viaje.num_llamadas || '';
    document.getElementById('viajeYape').value = viaje.num_yape || '';
    document.getElementById('viajeLink').value = linkValue;
    document.getElementById('viajeLinkOpen').href = linkValue || '#';
    document.getElementById('viajeObservacion').value = viaje.observacion || '';
    document.getElementById('paqueteEntrega').value = this.selectedPaquete?.entrega || '';
    document.getElementById('paqueteRecibe').value = this.selectedPaquete?.recibe || '';

    this.detalleBody.innerHTML = '';
    if (!this.movDetalle.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="2" class="text-center text-muted">--</td>`;
      this.detalleBody.appendChild(tr);
    } else {
      this.movDetalle.forEach((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${row.Vnombre_producto ?? row.nombre_producto ?? ''}</td>
          <td class="text-end">${row.vcantidad ?? row.cantidad ?? ''}</td>
        `;
        this.detalleBody.appendChild(tr);
      });
    }

    this.updateSummary();
  }

  updateSummary() {
    const viaje = this.viajeDetalle || {};
    const linkValue = viaje.link || '--';
    document.getElementById('summaryCodigo').textContent = this.selectedPaquete?.codigo || '--';
    document.getElementById('summaryCliente').textContent = this.selectedPaquete?.cliente || '--';
    document.getElementById('summaryEntrega').textContent = this.selectedPaquete?.entrega || '--';
    document.getElementById('summaryRecibe').textContent = this.selectedPaquete?.recibe || '--';
    document.getElementById('summaryViaje').textContent = viaje.nombre_motorizado || '--';
    document.getElementById('summaryLink').textContent = linkValue;
  }

  validateStep() {
    if (this.currentStep === 0) {
      if (!this.selectedPaquete?.codigo) {
        this.showAlert(this.t('selectPackage'));
        return false;
      }
      const codeOk = /^\d+$/.test(String(this.selectedPaquete.codigo));
      if (!codeOk) {
        this.showAlert(this.t('selectPackage'));
        return false;
      }
      return true;
    }

    if (this.currentStep === 1) {
      return true;
    }

    if (this.currentStep === 2) {
      const estado = this.getEstado();
      if (!estado) {
        this.showAlert(this.t('selectState'));
        return false;
      }
      if (!document.getElementById('confirmCheck').checked) {
        this.showAlert(this.t('confirmCheck'));
        return false;
      }
      return true;
    }

    return true;
  }

  getEstado() {
    const checked = document.querySelector('input[name="estado"]:checked');
    if (!checked) return null;
    return checked.value;
  }

  goNext() {
    this.clearAlert();
    if (!this.validateStep()) return;
    const nextStep = Math.min(this.currentStep + 1, this.steps.length - 1);
    this.setStep(nextStep);
  }

  goPrev() {
    this.clearAlert();
    const prevStep = Math.max(this.currentStep - 1, 0);
    this.setStep(prevStep);
  }

  async submit() {
    this.clearAlert();
    if (!this.validateStep()) return;
    const estado = this.getEstado();

    const payload = {
      codigo_paquete: String(this.selectedPaquete.codigo),
      estado,
      ordinal: this.ordinal,
    };

    this.setLoading(true);
    try {
      const res = await fetch('/api/paquetes/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save');
      this.showAlert(this.t('saved'), 'success');
    } catch (error) {
      this.showAlert(this.t('errorFetch'));
    } finally {
      this.setLoading(false);
    }
  }

  async loadLogs() {
    const output = document.getElementById('logsContent');
    output.textContent = this.t('loading');
    try {
      const res = await fetch('/api/logs/latest?limit=200');
      if (!res.ok) throw new Error('logs');
      const data = await res.json();
      output.textContent = (data.lines || []).join('\n') || '--';
    } catch (error) {
      output.textContent = this.t('errorFetch');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.setStep(0);
});
