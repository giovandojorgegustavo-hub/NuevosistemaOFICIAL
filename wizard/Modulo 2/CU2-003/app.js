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
    this.detalleTableBody = document.querySelector('#detalleAjusteTable tbody');
    this.summaryTableBody = document.querySelector('#detalleAjusteSummary tbody');
    this.viewLogsBtn = document.getElementById('viewLogsBtn');
    this.logsContent = document.getElementById('logsContent');
    this.logsModal = null;
    this.loadingState = document.getElementById('loadingState');
    this.bases = [];
    this.productos = [];
    this.decimalRegex = /^\d+(?:\.\d{1,2})?$/;
  }

  async init() {
    this.applyLocale();
    this.bindEvents();
    await this.loadInitialData();
    this.addDetalleRow();
    this.goStep(0);
  }

  applyLocale() {
    const lang = (navigator.language || 'es').toLowerCase();
    const locale = lang.startsWith('es') ? 'es' : 'en';
    const translations = {
      es: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Ajuste Stock AJU',
        subtitle: 'Ajusta inventario fisico con trazabilidad y actualizacion inmediata.',
        status: 'Operativo',
        step1Title: '1. Registrar Ajuste',
        step2Title: '2. Validar y confirmar',
        step3Title: '3. Ejecutar ajuste',
        fecha: 'Fecha',
        tipoDocumento: 'Tipo documento',
        numeroDocumento: 'Numero documento',
        ordinalDetalle: 'Ordinal detalle',
        base: 'Base',
        seleccione: 'Seleccione...',
        baseError: 'Seleccione una base.',
        detalleTitle: 'Detalle ajuste',
        addLine: 'Agregar linea',
        colProducto: 'Producto',
        colSistema: 'Cant. sistema',
        colReal: 'Cant. real',
        colAjuste: 'Cant. ajuste',
        step1Help:
          'Agrega productos y cantidades para el ajuste. La cantidad sistema se obtiene del procedimiento de saldos.',
        summaryTitle: 'Resumen del ajuste',
        confirmacion: 'Confirmo que la informacion es correcta.',
        confirmacionError: 'Debe confirmar la operacion.',
        step2Help: 'Revisa los datos antes de registrar el ajuste.',
        step3Help: 'Confirma para registrar el ajuste en el ERP.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Ajuste',
        logsTitle: 'Logs SQL',
        viewLogs: 'Ver logs',
        logsHelp: 'Consulta la ultima ejecucion registrada.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'AJU Stock Adjustment',
        subtitle: 'Adjust physical inventory with traceability and real-time updates.',
        status: 'Operational',
        step1Title: '1. Register Adjustment',
        step2Title: '2. Validate & confirm',
        step3Title: '3. Execute adjustment',
        fecha: 'Date',
        tipoDocumento: 'Document type',
        numeroDocumento: 'Document number',
        ordinalDetalle: 'Detail ordinal',
        base: 'Base',
        seleccione: 'Select...',
        baseError: 'Select a base.',
        detalleTitle: 'Adjustment details',
        addLine: 'Add line',
        colProducto: 'Product',
        colSistema: 'System qty',
        colReal: 'Physical qty',
        colAjuste: 'Adjustment qty',
        step1Help: 'Add products and quantities for the adjustment. System qty is fetched from the stock procedure.',
        summaryTitle: 'Adjustment summary',
        confirmacion: 'I confirm the information is correct.',
        confirmacionError: 'You must confirm the operation.',
        step2Help: 'Review the data before registering the adjustment.',
        step3Help: 'Confirm to register the adjustment in the ERP.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Adjustment',
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

    document.getElementById('vCodigo_base').addEventListener('change', (event) => {
      this.clearFieldError(event.target);
      this.refreshSaldoAllRows();
    });

    this.detalleTableBody.addEventListener('input', (event) => {
      if (event.target.matches('input')) {
        this.validateDecimalInput(event.target);
        this.updateRowTotals(event.target.closest('tr'));
      }
    });

    this.detalleTableBody.addEventListener('change', (event) => {
      if (event.target.matches('select')) {
        this.clearFieldError(event.target);
        this.updateSaldoForRow(event.target.closest('tr'));
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
        this.fetchJson('/api/next-numdocumento?tipo=AJU')
      ]);

      this.bases = bases;
      this.productos = productos;

      document.getElementById('vFecha').value = now.fecha;
      document.getElementById('vTipodocumentostock').value = 'AJU';
      document.getElementById('vNumdocumentostock').value = nextNum.next;

      const ordinal = await this.fetchJson(`/api/next-ordinal?tipo=AJU&num=${nextNum.next}`);
      document.getElementById('vordinaldetalle').value = ordinal.next;

      this.populateSelect('vCodigo_base', bases);
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
        <select class="form-select" data-field="vcodigo_producto" name="vDetalleAjuste.vcodigo_producto">
          <option value="">Seleccione...</option>
          ${this.productos
            .map(
              (prod) => {
                const value = prod.codigo_producto || prod.codigo || prod.id || prod.value || '';
                const label = prod.nombre_producto || prod.descripcion || prod.nombre || value;
                return `<option value="${value}">${label}</option>`;
              }
            )
            .join('')}
        </select>
        <div class="invalid-feedback">Seleccione un producto.</div>
      </td>
      <td>
        <input
          type="text"
          class="form-control"
          data-field="Vcantidad_sistema"
          name="vDetalleAjuste.Vcantidad_sistema"
          readonly
        />
      </td>
      <td>
        <input
          type="text"
          class="form-control"
          data-field="Vcantidad_real"
          name="vDetalleAjuste.Vcantidad_real"
          placeholder="0.00"
        />
        <div class="invalid-feedback">Ingrese cantidad valida.</div>
      </td>
      <td>
        <input
          type="text"
          class="form-control"
          data-field="Vcantidad"
          name="vDetalleAjuste.Vcantidad"
          readonly
        />
      </td>
      <td class="text-end">
        <button class="btn btn-outline-light btn-sm" type="button" data-action="delete">Eliminar</button>
      </td>
    `;

    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      row.remove();
      this.updateSummary();
    });

    this.detalleTableBody.appendChild(row);
    this.updateSaldoForRow(row);
  }

  async updateSaldoForRow(row) {
    if (!row) return;
    const base = document.getElementById('vCodigo_base').value;
    const producto = row.querySelector('[data-field="vcodigo_producto"]').value;
    if (!base || !producto) {
      row.querySelector('[data-field="Vcantidad_sistema"]').value = '';
      this.updateRowTotals(row);
      return;
    }

    try {
      const data = await this.fetchJson(`/api/saldo?base=${encodeURIComponent(base)}&producto=${encodeURIComponent(producto)}`);
      row.querySelector('[data-field="Vcantidad_sistema"]').value = this.formatNumber(data.saldo_actual || 0);
      this.updateRowTotals(row);
    } catch (error) {
      row.querySelector('[data-field="Vcantidad_sistema"]').value = '0';
      this.updateRowTotals(row);
      this.showError(error.message || 'Error al cargar saldo stock.');
    }
  }

  refreshSaldoAllRows() {
    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    rows.forEach((row) => this.updateSaldoForRow(row));
  }

  updateRowTotals(row) {
    if (!row) return;
    const sistemaRaw = row.querySelector('[data-field="Vcantidad_sistema"]').value;
    const realRaw = row.querySelector('[data-field="Vcantidad_real"]').value;
    const sistema = this.parseNumber(sistemaRaw);
    const real = this.parseNumber(realRaw);
    if (Number.isNaN(real)) {
      row.querySelector('[data-field="Vcantidad"]').value = '';
      return;
    }
    const ajuste = real - (Number.isNaN(sistema) ? 0 : sistema);
    row.querySelector('[data-field="Vcantidad"]').value = this.formatNumber(ajuste);
    this.updateSummary();
  }

  handleNext() {
    if (this.currentStep === 0 && !this.validateStep1()) {
      return;
    }
    if (this.currentStep === 1 && !this.validateStep2()) {
      return;
    }
    this.goStep(this.currentStep + 1);
  }

  goStep(step) {
    if (step < 0 || step >= this.steps.length) return;
    this.currentStep = step;
    this.steps.forEach((el, index) => el.classList.toggle('active', index === step));
    this.stepBadges.forEach((badge, index) => badge.classList.toggle('active', index === step));
    this.prevBtn.disabled = step === 0;
    this.nextBtn.classList.toggle('d-none', step === this.steps.length - 1);
    this.registrarBtn.classList.toggle('d-none', step !== this.steps.length - 1);
    if (step === 1) {
      this.updateSummary();
    }
    this.updateProgress();
  }

  updateProgress() {
    const percentage = ((this.currentStep + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${percentage}%`;
  }

  validateStep1() {
    let valid = true;
    this.clearAlerts();
    const baseSelect = document.getElementById('vCodigo_base');
    if (!baseSelect.value) {
      baseSelect.classList.add('is-invalid');
      valid = false;
    }

    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    if (!rows.length) {
      this.showError('Debe agregar al menos una linea de detalle.');
      return false;
    }

    rows.forEach((row) => {
      const productoSelect = row.querySelector('[data-field="vcodigo_producto"]');
      const realInput = row.querySelector('[data-field="Vcantidad_real"]');
      if (!productoSelect.value) {
        productoSelect.classList.add('is-invalid');
        valid = false;
      }
      if (!realInput.value || !this.decimalRegex.test(realInput.value)) {
        realInput.classList.add('is-invalid');
        valid = false;
      }
    });

    if (!valid) {
      this.showError('Revise los campos obligatorios del ajuste.');
    }

    return valid;
  }

  validateStep2() {
    const checkbox = document.getElementById('confirmacion');
    if (!checkbox.checked) {
      checkbox.classList.add('is-invalid');
      this.showError('Debe confirmar la operacion.');
      return false;
    }
    checkbox.classList.remove('is-invalid');
    return true;
  }

  async handleRegistrar() {
    if (!this.validateStep2()) {
      return;
    }
    this.setLoading(true);
    this.clearAlerts();
    try {
      const payload = this.collectPayload();
      const response = await this.fetchJson('/api/ajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response.message || 'Ajuste registrado correctamente.');
    } catch (error) {
      this.showError(error.message || 'Error al registrar el ajuste.');
    } finally {
      this.setLoading(false);
    }
  }

  collectPayload() {
    const detalles = Array.from(this.detalleTableBody.querySelectorAll('tr')).map((row) => {
      return {
        vcodigo_producto: row.querySelector('[data-field="vcodigo_producto"]').value,
        Vcantidad_sistema: row.querySelector('[data-field="Vcantidad_sistema"]').value,
        Vcantidad_real: row.querySelector('[data-field="Vcantidad_real"]').value,
        Vcantidad: row.querySelector('[data-field="Vcantidad"]').value
      };
    });

    return {
      vFecha: document.getElementById('vFecha').value,
      vTipodocumentostock: document.getElementById('vTipodocumentostock').value,
      vNumdocumentostock: document.getElementById('vNumdocumentostock').value,
      vCodigo_base: document.getElementById('vCodigo_base').value,
      vDetalleAjuste: detalles
    };
  }

  updateSummary() {
    const baseSelect = document.getElementById('vCodigo_base');
    const baseLabel = baseSelect.options[baseSelect.selectedIndex]?.textContent || '-';
    document.getElementById('summaryFecha').textContent = document.getElementById('vFecha').value || '-';
    document.getElementById('summaryTipo').textContent = document.getElementById('vTipodocumentostock').value || '-';
    document.getElementById('summaryNumero').textContent = document.getElementById('vNumdocumentostock').value || '-';
    document.getElementById('summaryBase').textContent = baseLabel;

    this.summaryTableBody.innerHTML = '';
    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    rows.forEach((row) => {
      const productoSelect = row.querySelector('[data-field="vcodigo_producto"]');
      const productoLabel = productoSelect.options[productoSelect.selectedIndex]?.textContent || '-';
      const sistema = row.querySelector('[data-field="Vcantidad_sistema"]').value || '0';
      const real = row.querySelector('[data-field="Vcantidad_real"]').value || '0';
      const ajuste = row.querySelector('[data-field="Vcantidad"]').value || '0';

      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
        <td>${productoLabel}</td>
        <td>${sistema}</td>
        <td>${real}</td>
        <td>${ajuste}</td>
      `;
      this.summaryTableBody.appendChild(summaryRow);
    });
  }

  validateDecimalInput(input) {
    if (!input.value) {
      input.classList.remove('is-invalid');
      return;
    }
    if (this.decimalRegex.test(input.value)) {
      input.classList.remove('is-invalid');
    } else {
      input.classList.add('is-invalid');
    }
  }

  clearFieldError(field) {
    field.classList.remove('is-invalid');
  }

  showError(message) {
    this.errorAlert.textContent = message;
    this.errorAlert.classList.remove('d-none');
  }

  showSuccess(message) {
    this.successAlert.textContent = message;
    this.successAlert.classList.remove('d-none');
  }

  clearAlerts() {
    this.errorAlert.classList.add('d-none');
    this.successAlert.classList.add('d-none');
  }

  setLoading(isLoading) {
    this.registrarBtn.disabled = isLoading;
    this.prevBtn.disabled = isLoading;
    this.nextBtn.disabled = isLoading;
    if (this.loadingState) {
      this.loadingState.classList.toggle('is-loading', isLoading);
      this.loadingState.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }
  }

  async handleViewLogs() {
    try {
      const data = await this.fetchJson('/api/logs/latest');
      this.logsContent.textContent = data.content || 'Sin logs disponibles.';
      if (!this.logsModal) {
        this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
      }
      this.logsModal.show();
    } catch (error) {
      this.showError('No se pudieron cargar los logs.');
    }
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Error de red.');
    }
    return response.json();
  }

  parseNumber(value) {
    if (value === null || value === undefined || value === '') return NaN;
    return Number(String(value).replace(',', '.'));
  }

  formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    return Number(value).toFixed(2);
  }
}

const wizard = new FormWizard();
wizard.init();
