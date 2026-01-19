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
    this.asignarBtn = document.getElementById('asignarBtn');
    this.confirmOperacion = document.getElementById('confirmOperacion');
    this.codigoViajeInput = document.getElementById('codigoViaje');
    this.fechaViajeInput = document.getElementById('fechaViaje');
    this.codigoBaseSelect = document.getElementById('codigoBase');
    this.nombreMotorizadoInput = document.getElementById('nombreMotorizado');
    this.numeroWspInput = document.getElementById('numeroWsp');
    this.numLlamadasInput = document.getElementById('numLlamadas');
    this.numYapeInput = document.getElementById('numYape');
    this.linkInput = document.getElementById('link');
    this.observacionInput = document.getElementById('observacion');
    this.paquetesTableBody = document.querySelector('#paquetesTable tbody');
    this.selectedCountLabel = document.getElementById('selectedCountLabel');
    this.viajeCard = document.getElementById('viajeCard');
    this.paquetesCard = document.getElementById('paquetesCard');
    this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
    this.logsContent = document.getElementById('logsContent');

    this.regex = {
      nombre: /^[A-Za-z\s.'-]{3,}$/,
      phone: /^\+?[0-9]{6,15}$/,
      link: /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=]*$/,
    };

    this.state = {
      locale: navigator.language || 'es',
      bases: [],
      paquetes: [],
      selectedPaquetes: new Set(),
      nextCodigo: '',
    };

    this.dictionary = {
      es: {
        stepTitles: [
          'Paso 1: Datos del Viaje',
          'Paso 2: Paquetes Empacados',
          'Paso 3: Confirmar y Guardar',
        ],
        stepHints: [
          'Complete los datos del motorizado y base.',
          'Seleccione los paquetes empacados para asignar.',
          'Revise el resumen antes de guardar.',
        ],
        ui: {
          wizardStatus: 'Servicio Global IaaS/PaaS',
          wizardTitle: 'Asignar Viajes',
          wizardSubtitle: 'Gestione rutas, paquetes y monitoreo de entregas desde un solo lugar.',
          viewLogs: 'Ver Logs de SQL',
          codigoViaje: 'Codigo Viaje',
          fecha: 'Fecha',
          codigoBase: 'Base',
          nombreMotorizado: 'Nombre Motorizado',
          numeroWsp: 'Numero WSP',
          numLlamadas: 'Numero Llamadas',
          numYape: 'Numero Yape',
          link: 'Link',
          observacion: 'Observacion',
          paquetesEmpacados: 'vPaquetesEmpacados',
          sinSeleccion: 'Ningun paquete seleccionado',
          codigoPaquete: 'Codigo Paquete',
          estado: 'Estado',
          fechaRegistro: 'Fecha Registro',
          codigoCliente: 'Codigo Cliente',
          nombreCliente: 'Nombre Cliente',
          ubigeo: 'Ubigeo',
          regionEntrega: 'Region Entrega',
          confirmacion: 'Confirmo que la informacion es correcta',
          asignar: 'Asignar Viaje',
          anterior: 'Anterior',
          siguiente: 'Siguiente',
          logsTitle: 'Logs de SQL',
          loading: 'Procesando...',
          loadingHint: 'Espere un momento.',
          viajeResumen: 'Resumen del Viaje',
          paquetesResumen: 'Paquetes Seleccionados',
          base: 'Base',
          motorizado: 'Motorizado',
          wsp: 'WSP',
          llamadas: 'Llamadas',
          yape: 'Yape',
          linkLabel: 'Link',
          observacionLabel: 'Observacion',
          fechaLabel: 'Fecha',
          paquetesTotal: 'Total paquetes',
          sinDatos: 'Sin datos disponibles',
          seleccionarBase: 'Seleccione una base',
        },
        messages: {
          errorServer: 'Error al comunicar con el servidor',
          completarPaso1: 'Complete los datos requeridos del viaje.',
          nombreInvalido: 'Nombre de motorizado invalido.',
          baseInvalida: 'Seleccione una base valida.',
          telefonoInvalido: 'Numero telefonico invalido.',
          linkInvalido: 'Link invalido.',
          seleccionarPaquetes: 'Seleccione al menos un paquete.',
          confirmarOperacion: 'Debe confirmar la operacion.',
          asignarOk: 'Viaje asignado correctamente.',
          sinLogs: 'Sin logs disponibles.',
        },
      },
      en: {
        stepTitles: [
          'Step 1: Trip Data',
          'Step 2: Packed Packages',
          'Step 3: Confirm and Save',
        ],
        stepHints: [
          'Complete rider and base data.',
          'Select packed packages to assign.',
          'Review the summary before saving.',
        ],
        ui: {
          wizardStatus: 'Global IaaS/PaaS Service',
          wizardTitle: 'Assign Trips',
          wizardSubtitle: 'Manage routes, packages, and delivery monitoring in one place.',
          viewLogs: 'View SQL Logs',
          codigoViaje: 'Trip Code',
          fecha: 'Date',
          codigoBase: 'Base',
          nombreMotorizado: 'Driver Name',
          numeroWsp: 'WhatsApp',
          numLlamadas: 'Calls',
          numYape: 'Yape',
          link: 'Link',
          observacion: 'Notes',
          paquetesEmpacados: 'vPackedPackages',
          sinSeleccion: 'No package selected',
          codigoPaquete: 'Package Code',
          estado: 'Status',
          fechaRegistro: 'Register Date',
          codigoCliente: 'Client Code',
          nombreCliente: 'Client Name',
          ubigeo: 'Ubigeo',
          regionEntrega: 'Delivery Region',
          confirmacion: 'I confirm the information is correct',
          asignar: 'Assign Trip',
          anterior: 'Previous',
          siguiente: 'Next',
          logsTitle: 'SQL Logs',
          loading: 'Processing...',
          loadingHint: 'Please wait.',
          viajeResumen: 'Trip Summary',
          paquetesResumen: 'Selected Packages',
          base: 'Base',
          motorizado: 'Driver',
          wsp: 'WhatsApp',
          llamadas: 'Calls',
          yape: 'Yape',
          linkLabel: 'Link',
          observacionLabel: 'Notes',
          fechaLabel: 'Date',
          paquetesTotal: 'Total packages',
          sinDatos: 'No data available',
          seleccionarBase: 'Select a base',
        },
        messages: {
          errorServer: 'Failed to communicate with server',
          completarPaso1: 'Complete required trip data.',
          nombreInvalido: 'Invalid driver name.',
          baseInvalida: 'Select a valid base.',
          telefonoInvalido: 'Invalid phone number.',
          linkInvalido: 'Invalid link.',
          seleccionarPaquetes: 'Select at least one package.',
          confirmarOperacion: 'You must confirm the operation.',
          asignarOk: 'Trip assigned successfully.',
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
    this.setFechaActual();
    this.showStep(0);
    this.prevBtn.addEventListener('click', () => this.goPrev());
    this.nextBtn.addEventListener('click', () => this.goNext());
    this.asignarBtn.addEventListener('click', () => this.handleAsignar());
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.openLogs());
    this.paquetesTableBody.addEventListener('change', (event) => this.handleTableSelection(event));
    this.loadInitialData();
  }

  setFechaActual() {
    const now = new Date();
    this.fechaViajeInput.value = now.toLocaleString(this.state.locale);
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
    if (index === 2) {
      this.renderResumen();
    }
  }

  goNext() {
    this.clearMessages();
    if (this.currentStep === 0 && !this.validatePaso1()) {
      this.showError(this.t('messages.completarPaso1'));
      return;
    }
    if (this.currentStep === 1 && this.state.selectedPaquetes.size === 0) {
      this.showError(this.t('messages.seleccionarPaquetes'));
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

  validatePaso1() {
    const codigoBase = this.codigoBaseSelect.value;
    const nombre = this.nombreMotorizadoInput.value.trim();
    const wsp = this.numeroWspInput.value.trim();
    const llamadas = this.numLlamadasInput.value.trim();
    const yape = this.numYapeInput.value.trim();
    const link = this.linkInput.value.trim();

    if (!codigoBase) {
      this.showError(this.t('messages.baseInvalida'));
      return false;
    }
    if (!this.regex.nombre.test(nombre)) {
      this.showError(this.t('messages.nombreInvalido'));
      return false;
    }
    if (wsp && !this.regex.phone.test(wsp)) {
      this.showError(this.t('messages.telefonoInvalido'));
      return false;
    }
    if (llamadas && !this.regex.phone.test(llamadas)) {
      this.showError(this.t('messages.telefonoInvalido'));
      return false;
    }
    if (yape && !this.regex.phone.test(yape)) {
      this.showError(this.t('messages.telefonoInvalido'));
      return false;
    }
    if (link && !this.regex.link.test(link)) {
      this.showError(this.t('messages.linkInvalido'));
      return false;
    }
    return true;
  }

  async loadInitialData() {
    this.setLoading(true, 'loading');
    try {
      const [basesRes, paquetesRes, codigoRes] = await Promise.all([
        fetch('/api/bases'),
        fetch('/api/paquetes?estado=empacado'),
        fetch('/api/viajes/next'),
      ]);
      if (!basesRes.ok || !paquetesRes.ok || !codigoRes.ok) {
        throw new Error(this.t('messages.errorServer'));
      }
      this.state.bases = await basesRes.json();
      this.state.paquetes = await paquetesRes.json();
      const codigoData = await codigoRes.json();
      this.state.nextCodigo = codigoData.next || '';
      this.renderBases();
      this.renderPaquetes();
      this.renderCodigoViaje();
      this.updateSelectedCount();
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  renderCodigoViaje() {
    this.codigoViajeInput.value = this.state.nextCodigo || '';
  }

  renderBases() {
    this.codigoBaseSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = this.t('ui.seleccionarBase');
    this.codigoBaseSelect.appendChild(placeholder);
    this.state.bases.forEach((base) => {
      const option = document.createElement('option');
      option.value = base.codigo_base;
      option.textContent = `${base.codigo_base} - ${base.nombre}`;
      this.codigoBaseSelect.appendChild(option);
    });
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
      const codigo = String(item.codigo_paquete);
      const isSelected = this.state.selectedPaquetes.has(codigo);
      const row = document.createElement('tr');
      row.classList.toggle('selected-row', isSelected);
      row.innerHTML = `
        <td>
          <input class="form-check-input" type="checkbox" data-code="${codigo}" ${
            isSelected ? 'checked' : ''
          } />
        </td>
        <td>${item.codigo_paquete ?? ''}</td>
        <td>${item.estado ?? ''}</td>
        <td>${item.fecha_registro ?? ''}</td>
        <td>${item.codigo_cliente ?? ''}</td>
        <td>${item.nombre_cliente ?? ''}</td>
        <td>${item.ubigeo ?? ''}</td>
        <td>${item.region_entrega ?? ''}</td>
      `;
      this.paquetesTableBody.appendChild(row);
    });
  }

  handleTableSelection(event) {
    const checkbox = event.target.closest('input[data-code]');
    if (!checkbox) return;
    const codigo = checkbox.getAttribute('data-code');
    if (checkbox.checked) {
      this.state.selectedPaquetes.add(codigo);
    } else {
      this.state.selectedPaquetes.delete(codigo);
    }
    this.renderPaquetes();
    this.updateSelectedCount();
  }

  updateSelectedCount() {
    const total = this.state.selectedPaquetes.size;
    if (!total) {
      this.selectedCountLabel.textContent = this.t('ui.sinSeleccion');
    } else {
      this.selectedCountLabel.textContent = `${this.t('ui.paquetesTotal')}: ${total}`;
    }
  }

  renderResumen() {
    const base = this.state.bases.find(
      (item) => String(item.codigo_base) === String(this.codigoBaseSelect.value)
    );
    const paquetes = this.state.paquetes.filter((item) =>
      this.state.selectedPaquetes.has(String(item.codigo_paquete))
    );

    const viajeHtml = `
      <h4>${this.t('ui.viajeResumen')}</h4>
      <p><strong>${this.t('ui.codigoViaje')}:</strong> ${this.codigoViajeInput.value || '-'}</p>
      <p><strong>${this.t('ui.fechaLabel')}:</strong> ${this.fechaViajeInput.value || '-'}</p>
      <p><strong>${this.t('ui.base')}:</strong> ${base ? base.nombre : '-'}</p>
      <p><strong>${this.t('ui.motorizado')}:</strong> ${this.nombreMotorizadoInput.value || '-'}</p>
      <p><strong>${this.t('ui.wsp')}:</strong> ${this.numeroWspInput.value || '-'}</p>
      <p><strong>${this.t('ui.llamadas')}:</strong> ${this.numLlamadasInput.value || '-'}</p>
      <p><strong>${this.t('ui.yape')}:</strong> ${this.numYapeInput.value || '-'}</p>
      <p><strong>${this.t('ui.linkLabel')}:</strong> ${this.linkInput.value || '-'}</p>
      <p><strong>${this.t('ui.observacionLabel')}:</strong> ${this.observacionInput.value || '-'}</p>
    `;
    this.viajeCard.innerHTML = viajeHtml;

    let paquetesHtml = `<h4>${this.t('ui.paquetesResumen')}</h4>`;
    if (!paquetes.length) {
      paquetesHtml += `<p>${this.t('ui.sinDatos')}</p>`;
    } else {
      paquetesHtml += `<p>${this.t('ui.paquetesTotal')}: ${paquetes.length}</p>`;
      paquetes.forEach((item) => {
        paquetesHtml += `<p>${item.codigo_paquete} - ${item.nombre_cliente || ''}</p>`;
      });
    }
    this.paquetesCard.innerHTML = paquetesHtml;
  }

  collectPayload() {
    const clean = (value) => {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };
    return {
      codigo_base: this.codigoBaseSelect.value,
      nombre_motorizado: this.nombreMotorizadoInput.value.trim(),
      numero_wsp: clean(this.numeroWspInput.value),
      num_llamadas: clean(this.numLlamadasInput.value),
      num_yape: clean(this.numYapeInput.value),
      link: clean(this.linkInput.value),
      observacion: clean(this.observacionInput.value),
      paquetes: Array.from(this.state.selectedPaquetes),
    };
  }

  resetForm() {
    this.codigoBaseSelect.value = '';
    this.nombreMotorizadoInput.value = '';
    this.numeroWspInput.value = '';
    this.numLlamadasInput.value = '';
    this.numYapeInput.value = '';
    this.linkInput.value = '';
    this.observacionInput.value = '';
    this.confirmOperacion.checked = false;
    this.state.selectedPaquetes.clear();
    this.updateSelectedCount();
  }

  async handleAsignar() {
    this.clearMessages();
    if (!this.validatePaso1()) {
      return;
    }
    if (this.state.selectedPaquetes.size === 0) {
      this.showError(this.t('messages.seleccionarPaquetes'));
      return;
    }
    if (!this.confirmOperacion.checked) {
      this.showError(this.t('messages.confirmarOperacion'));
      return;
    }

    this.setLoading(true, 'loading');
    try {
      const res = await fetch('/api/viajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.collectPayload()),
      });
      if (!res.ok) throw new Error(this.t('messages.errorServer'));
      const data = await res.json();
      this.showSuccess(`${this.t('messages.asignarOk')} ${data.codigoviaje || ''}`.trim());
      this.resetForm();
      this.setFechaActual();
      await this.reloadData();
      this.showStep(0);
    } catch (error) {
      this.showError(error.message || this.t('messages.errorServer'));
    } finally {
      this.setLoading(false);
    }
  }

  async reloadData() {
    const [paquetesRes, codigoRes] = await Promise.all([
      fetch('/api/paquetes?estado=empacado'),
      fetch('/api/viajes/next'),
    ]);
    if (paquetesRes.ok) {
      this.state.paquetes = await paquetesRes.json();
    }
    if (codigoRes.ok) {
      const codigoData = await codigoRes.json();
      this.state.nextCodigo = codigoData.next || '';
      this.renderCodigoViaje();
    }
    this.renderPaquetes();
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
