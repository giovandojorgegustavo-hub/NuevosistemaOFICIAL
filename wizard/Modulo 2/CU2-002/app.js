class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progressBar = document.getElementById('wizardProgress');
    this.stepBadges = Array.from(document.querySelectorAll('.step-badge'));
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.registrarBtn = document.getElementById('registrarBtn');
    this.errorAlert = document.getElementById('errorAlert');
    this.successAlert = document.getElementById('successAlert');
    this.detalleTableBody = document.querySelector('#detalleTransferenciaTable tbody');
    this.summaryTableBody = document.querySelector('#detalleTransferenciaSummary tbody');
    this.viewLogsBtn = document.getElementById('viewLogsBtn');
    this.logsContent = document.getElementById('logsContent');
    this.logsModal = null;
    this.bases = [];
    this.productos = [];
    this.decimalRegex = /^\d+(?:\.\d{1,2})?$/;
  }

  async init() {
    this.applyLocale();
    this.bindEvents();
    await this.loadInitialData();
    this.addDetalleRow();
    this.updateProgress();
  }

  applyLocale() {
    const lang = (navigator.language || 'es').toLowerCase();
    const locale = lang.startsWith('es') ? 'es' : 'en';
    const translations = {
      es: {
        eyebrow: 'IaaS + PaaS Global Logistics',
        title: 'Transferencias TRS',
        subtitle: 'Coordina movimientos de stock en tu infraestructura global.',
        status: 'Operativo',
        step1Title: '1. Registrar Transferencia',
        step2Title: '2. Validar y confirmar',
        step3Title: '3. Ejecutar transferencia',
        fecha: 'Fecha',
        tipoDocumento: 'Tipo documento',
        numeroDocumento: 'Numero documento',
        ordinalDetalle: 'Ordinal detalle',
        baseOrigen: 'Base origen',
        baseDestino: 'Base destino',
        baseError: 'Seleccione una base origen.',
        baseDestinoError: 'Seleccione una base destino.',
        detalleTitle: 'Detalle de transferencia',
        addLine: 'Agregar linea',
        colProducto: 'Producto',
        colCantidad: 'Cantidad',
        step1Help: 'Agrega los productos y cantidades de la transferencia.',
        confirmacion: 'Confirmo que la informacion es correcta.',
        confirmacionError: 'Debe confirmar la operacion.',
        step2Help: 'Revisa los datos antes de registrar la transferencia.',
        step3Help: 'Confirma para registrar la transferencia en el ERP.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Transferencia',
        logsTitle: 'Logs SQL',
        viewLogs: 'Ver logs',
        logsHelp: 'Consulta la ultima ejecucion registrada.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Logistics',
        title: 'TRS Transfers',
        subtitle: 'Coordinate stock movements across your global infrastructure.',
        status: 'Operational',
        step1Title: '1. Register Transfer',
        step2Title: '2. Validate & confirm',
        step3Title: '3. Execute transfer',
        fecha: 'Date',
        tipoDocumento: 'Document type',
        numeroDocumento: 'Document number',
        ordinalDetalle: 'Detail ordinal',
        baseOrigen: 'Origin base',
        baseDestino: 'Destination base',
        baseError: 'Select an origin base.',
        baseDestinoError: 'Select a destination base.',
        detalleTitle: 'Transfer details',
        addLine: 'Add line',
        colProducto: 'Product',
        colCantidad: 'Quantity',
        step1Help: 'Add products and quantities for the transfer.',
        confirmacion: 'I confirm the information is correct.',
        confirmacionError: 'You must confirm the operation.',
        step2Help: 'Review the data before registering the transfer.',
        step3Help: 'Confirm to register the transfer in the ERP.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Transfer',
        logsTitle: 'SQL logs',
        viewLogs: 'View logs',
        logsHelp: 'Check the latest execution logs.'
      }
    };

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (translations[locale][key]) {
        el.textContent = translations[locale][key];
      }
    });
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.goStep(this.currentStep - 1));
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.registrarBtn.addEventListener('click', () => this.handleRegistrar());
    document.getElementById('addDetalleLine').addEventListener('click', () => this.addDetalleRow());

    this.detalleTableBody.addEventListener('input', (event) => {
      if (event.target.matches('input')) {
        this.validateDecimalInput(event.target);
      }
    });

    this.detalleTableBody.addEventListener('change', (event) => {
      if (event.target.matches('select')) {
        this.clearFieldError(event.target);
      }
    });

    if (this.viewLogsBtn) {
      this.viewLogsBtn.addEventListener('click', () => this.handleViewLogs());
    }
  }

  async loadInitialData() {
    try {
      const [now, bases, productos, nextNum] = await Promise.all([
        this.fetchJson('/api/now'),
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/next-numdocumento?tipo=TRS')
      ]);

      this.bases = bases;
      this.productos = productos;

      document.getElementById('vFecha').value = now.fecha;
      document.getElementById('vTipodocumentostock').value = 'TRS';
      document.getElementById('vNumdocumentostock').value = nextNum.next;

      const ordinal = await this.fetchJson(`/api/next-ordinal?tipo=TRS&num=${nextNum.next}`);
      document.getElementById('ordinaldetalle').value = ordinal.next;

      this.populateSelect('vCodigo_base', bases);
      this.populateSelect('vCodigo_basedestino', bases);
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    }
  }

  populateSelect(selectId, items) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seleccione...</option>';
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.codigo_base || item.codigo || item.id || item.value || '';
      option.textContent = item.nombre || item.nombre_base || item.descripcion || item.label || option.value;
      select.appendChild(option);
    });
  }

  addDetalleRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <select class="form-select" data-field="vcodigo_producto" name="vDetalleTransferencia.vcodigo_producto">
          <option value="">Seleccione...</option>
          ${this.productos
            .map(
              (prod) =>
                `<option value="${prod.codigo_producto}">${
                  prod.nombre_producto || prod.descripcion || prod.nombre || prod.codigo_producto
                }</option>`
            )
            .join('')}
        </select>
        <div class="invalid-feedback">Seleccione un producto.</div>
      </td>
      <td>
        <input
          type="text"
          class="form-control"
          data-field="Vcantidad"
          name="vDetalleTransferencia.Vcantidad"
          placeholder="0.00"
        />
        <div class="invalid-feedback">Ingrese cantidad valida.</div>
      </td>
      <td class="text-end">
        <button class="btn btn-outline-light btn-sm" type="button" data-action="delete">Eliminar</button>
      </td>
    `;

    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      row.remove();
    });

    this.detalleTableBody.appendChild(row);
  }

  validateDecimalInput(input) {
    const value = input.value.trim();
    if (!value) {
      input.classList.remove('is-invalid');
      return;
    }
    if (!this.decimalRegex.test(value)) {
      input.classList.add('is-invalid');
    } else {
      input.classList.remove('is-invalid');
    }
  }

  handleNext() {
    if (this.currentStep === 0 && !this.validateStep1()) {
      return;
    }
    if (this.currentStep === 1 && !this.validateStep2()) {
      return;
    }
    this.goStep(this.currentStep + 1);
    if (this.currentStep === 1) {
      this.renderSummary();
    }
    if (this.currentStep === 2) {
      this.renderFinal();
    }
  }

  validateStep1() {
    let valid = true;
    const baseOrigen = document.getElementById('vCodigo_base');
    const baseDestino = document.getElementById('vCodigo_basedestino');

    if (!baseOrigen.value) {
      baseOrigen.classList.add('is-invalid');
      valid = false;
    } else {
      baseOrigen.classList.remove('is-invalid');
    }

    if (!baseDestino.value) {
      baseDestino.classList.add('is-invalid');
      valid = false;
    } else {
      baseDestino.classList.remove('is-invalid');
    }

    if (baseOrigen.value && baseDestino.value && baseOrigen.value === baseDestino.value) {
      baseDestino.classList.add('is-invalid');
      valid = false;
    }

    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    if (!rows.length) {
      this.showError('Debe agregar al menos un detalle.');
      return false;
    }

    rows.forEach((row) => {
      const producto = row.querySelector('select[data-field="vcodigo_producto"]');
      const cantidad = row.querySelector('input[data-field="Vcantidad"]');

      if (!producto.value) {
        producto.classList.add('is-invalid');
        valid = false;
      } else {
        producto.classList.remove('is-invalid');
      }

      if (!cantidad.value || !this.decimalRegex.test(cantidad.value)) {
        cantidad.classList.add('is-invalid');
        valid = false;
      } else {
        cantidad.classList.remove('is-invalid');
      }
    });

    if (!valid) {
      this.showError('Complete los campos requeridos antes de continuar.');
    }
    return valid;
  }

  renderSummary() {
    const baseOrigenSelect = document.getElementById('vCodigo_base');
    const baseDestinoSelect = document.getElementById('vCodigo_basedestino');
    document.getElementById('summaryBaseOrigen').textContent =
      baseOrigenSelect.options[baseOrigenSelect.selectedIndex]?.text || '-';
    document.getElementById('summaryBaseDestino').textContent =
      baseDestinoSelect.options[baseDestinoSelect.selectedIndex]?.text || '-';
    document.getElementById('summaryFecha').textContent = document.getElementById('vFecha').value;
    document.getElementById('summaryNumero').textContent = document.getElementById('vNumdocumentostock').value;

    this.summaryTableBody.innerHTML = '';
    this.detalleTableBody.querySelectorAll('tr').forEach((row) => {
      const producto = row.querySelector('select[data-field="vcodigo_producto"]');
      const cantidad = row.querySelector('input[data-field="Vcantidad"]');
      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
        <td>${producto.options[producto.selectedIndex]?.text || ''}</td>
        <td>${cantidad.value}</td>
      `;
      this.summaryTableBody.appendChild(summaryRow);
    });
  }

  renderFinal() {
    document.getElementById('finalBaseOrigen').textContent = document.getElementById('summaryBaseOrigen').textContent;
    document.getElementById('finalBaseDestino').textContent = document.getElementById('summaryBaseDestino').textContent;
    document.getElementById('finalFecha').textContent = document.getElementById('summaryFecha').textContent;
    document.getElementById('finalNumero').textContent = document.getElementById('summaryNumero').textContent;
  }

  validateStep2() {
    const confirm = document.getElementById('confirmOperacion');
    if (!confirm.checked) {
      confirm.classList.add('is-invalid');
      this.showError('Debe confirmar la operacion.');
      return false;
    }
    confirm.classList.remove('is-invalid');
    return true;
  }

  async handleRegistrar() {
    if (!this.validateStep2()) {
      return;
    }

    this.toggleLoading(true);
    try {
      const payload = this.buildPayload();
      const response = await this.fetchJson('/api/transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response.message || 'Transferencia registrada correctamente.');
      await this.resetWizard();
    } catch (error) {
      this.showError(error.message || 'Error al registrar la transferencia.');
    } finally {
      this.toggleLoading(false);
    }
  }

  buildPayload() {
    const detalle = [];
    this.detalleTableBody.querySelectorAll('tr').forEach((row, index) => {
      detalle.push({
        ordinal: index + 1,
        vcodigo_producto: row.querySelector('select[data-field="vcodigo_producto"]').value,
        Vcantidad: row.querySelector('input[data-field="Vcantidad"]').value
      });
    });

    return {
      vTipodocumentostock: document.getElementById('vTipodocumentostock').value,
      vNumdocumentostock: document.getElementById('vNumdocumentostock').value,
      vFecha: document.getElementById('vFecha').value,
      vCodigo_base: document.getElementById('vCodigo_base').value,
      vCodigo_basedestino: document.getElementById('vCodigo_basedestino').value,
      vDetalleTransferencia: detalle
    };
  }

  async resetWizard() {
    this.goStep(0);
    document.getElementById('confirmOperacion').checked = false;
    this.detalleTableBody.innerHTML = '';
    this.addDetalleRow();
    await this.reloadDocumentNumbers();
  }

  async reloadDocumentNumbers() {
    const now = await this.fetchJson('/api/now');
    const nextNum = await this.fetchJson('/api/next-numdocumento?tipo=TRS');
    document.getElementById('vFecha').value = now.fecha;
    document.getElementById('vNumdocumentostock').value = nextNum.next;
    const ordinal = await this.fetchJson(`/api/next-ordinal?tipo=TRS&num=${nextNum.next}`);
    document.getElementById('ordinaldetalle').value = ordinal.next;
  }

  goStep(step) {
    if (step < 0 || step >= this.steps.length) return;
    this.currentStep = step;
    this.steps.forEach((section, index) => {
      section.classList.toggle('d-none', index !== step);
    });
    this.prevBtn.classList.toggle('d-none', step === 0);
    this.nextBtn.classList.toggle('d-none', step !== 0 && step !== 1);
    this.registrarBtn.classList.toggle('d-none', step !== 2);
    this.updateProgress();
  }

  updateProgress() {
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.stepBadges.forEach((badge, index) => {
      badge.classList.toggle('active', index <= this.currentStep);
    });
  }

  showError(message) {
    this.errorAlert.textContent = message;
    this.errorAlert.classList.remove('d-none');
    this.successAlert.classList.add('d-none');
  }

  showSuccess(message) {
    this.successAlert.textContent = message;
    this.successAlert.classList.remove('d-none');
    this.errorAlert.classList.add('d-none');
  }

  clearFieldError(field) {
    field.classList.remove('is-invalid');
  }

  toggleLoading(isLoading) {
    const spinner = this.registrarBtn.querySelector('.spinner-border');
    this.registrarBtn.disabled = isLoading;
    spinner.classList.toggle('d-none', !isLoading);
  }

  async handleViewLogs() {
    try {
      const data = await this.fetchJson('/api/logs/latest');
      this.logsContent.textContent = data.content || 'Sin registros disponibles.';
      if (!this.logsModal) {
        this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
      }
      this.logsModal.show();
    } catch (error) {
      this.showError(error.message || 'No se pudo cargar el log.');
    }
  }

  async fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Error de red.');
    }
    return response.json();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
