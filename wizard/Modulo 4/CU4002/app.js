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
    this.loadingState = document.getElementById('loadingState');
    this.baseInput = document.getElementById('vBaseNombre');
    this.baseHidden = document.getElementById('vCodigo_base');
    this.baseError = document.getElementById('baseError');
    this.basesList = document.getElementById('basesList');
    this.productosList = document.getElementById('productosList');
    this.detalleTableBody = document.querySelector('#detalleAjusteTable tbody');
    this.summaryTableBody = document.querySelector('#summaryTable tbody');
    this.confirmCheck = document.getElementById('confirmCheck');
    this.confirmError = document.getElementById('confirmError');
    this.addLineBtn = document.getElementById('addLineBtn');
    this.viewLogsBtn = document.getElementById('viewLogsBtn');
    this.decimalRegex = /^\d+(?:[.,]\d{1,2})?$/;
    this.bases = [];
    this.productos = [];
    this.rowCounter = 0;
  }

  async init() {
    this.applyLocale();
    this.bindEvents();
    await this.loadInitialData();
    this.goStep(0);
  }

  applyLocale() {
    const lang = (navigator.language || 'es').toLowerCase();
    const locale = lang.startsWith('es') ? 'es' : 'en';
    this.locale = locale;
    document.documentElement.lang = locale;
    const translations = {
      es: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Ajuste de Stock',
        subtitle: 'Gestiona ajustes de inventario con trazabilidad completa y ejecucion segura.',
        status: 'Operativo',
        viewLogs: 'Ver logs SQL',
        step1Title: '1. Datos del ajuste',
        step2Title: '2. Detalle del ajuste',
        step3Title: '3. Confirmar',
        fecha: 'Fecha',
        docAje: 'Num documento AJE',
        docAjs: 'Num documento AJS',
        proveedor: 'Proveedor',
        base: 'Base',
        baseHint: 'Escribe para filtrar la base.',
        baseError: 'Seleccione una base valida.',
        step1Help: 'Define la base origen y revisa los correlativos de documentos para los ajustes.',
        detalleTitle: 'Detalle del ajuste',
        addLine: 'Agregar linea',
        colProducto: 'Producto',
        colSistema: 'Cantidad sistema',
        colReal: 'Cantidad real',
        colAjuste: 'Cantidad ajuste',
        colMonto: 'Monto',
        step2Help: 'El sistema calcula el ajuste como la diferencia entre el conteo real y el saldo actual.',
        summaryTitle: 'Resumen del ajuste',
        totalAje: 'Total AJE',
        totalAjs: 'Total AJS',
        confirmacion: 'Confirmo que la informacion es correcta.',
        confirmacionError: 'Debe confirmar la operacion.',
        step3Help: 'Al registrar se ejecutaran los ajustes de stock y las partidas correspondientes.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Ajuste',
        logsTitle: 'Logs SQL',
        loading: 'Procesando...'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Stock Adjustment',
        subtitle: 'Manage inventory adjustments with full traceability and safe execution.',
        status: 'Operational',
        viewLogs: 'View SQL logs',
        step1Title: '1. Adjustment data',
        step2Title: '2. Adjustment details',
        step3Title: '3. Confirm',
        fecha: 'Date',
        docAje: 'AJE document number',
        docAjs: 'AJS document number',
        proveedor: 'Supplier',
        base: 'Base',
        baseHint: 'Type to filter the base.',
        baseError: 'Select a valid base.',
        step1Help: 'Define the source base and review document correlatives for adjustments.',
        detalleTitle: 'Adjustment details',
        addLine: 'Add line',
        colProducto: 'Product',
        colSistema: 'System quantity',
        colReal: 'Counted quantity',
        colAjuste: 'Adjustment quantity',
        colMonto: 'Amount',
        step2Help: 'The system calculates the adjustment as the difference between physical count and current stock.',
        summaryTitle: 'Adjustment summary',
        totalAje: 'AJE total',
        totalAjs: 'AJS total',
        confirmacion: 'I confirm the information is correct.',
        confirmacionError: 'You must confirm the operation.',
        step3Help: 'By registering, stock updates and matching batches will be executed.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Adjustment',
        logsTitle: 'SQL logs',
        loading: 'Processing...'
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

    this.baseInput.addEventListener('input', () => {
      this.syncBaseSelection();
      this.clearFieldError(this.baseInput);
    });

    this.baseInput.addEventListener('blur', () => {
      this.syncBaseSelection();
      this.refreshSaldosForBase();
    });

    this.addLineBtn.addEventListener('click', () => this.addDetalleRow());

    this.detalleTableBody.addEventListener('input', (event) => {
      const input = event.target;
      if (input.matches('[data-field="vNombreProducto"]')) {
        this.syncProductSelection(input.closest('tr'));
      }
      if (input.matches('[data-field="vCantidad_real"]')) {
        this.handleCantidadReal(input);
      }
      if (input.matches('[data-field="vMonto"]')) {
        this.handleMontoInput(input);
      }
    });

    this.detalleTableBody.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="remove-line"]');
      if (btn) {
        const row = btn.closest('tr');
        if (row) {
          row.remove();
        }
      }
    });

    this.viewLogsBtn.addEventListener('click', () => this.showLogs());
  }

  async loadInitialData() {
    this.setLoading(true);
    try {
      const [bases, productos, nextAje, nextAjs] = await Promise.all([
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/next-numdocumentostock?tipo=AJE'),
        this.fetchJson('/api/next-numdocumentostock?tipo=AJS')
      ]);

      this.bases = bases || [];
      this.productos = productos || [];
      this.renderBases(this.bases);
      this.renderProductos(this.productos);

      const today = new Date();
      const dateValue = today.toISOString().split('T')[0];
      document.getElementById('vFecha').value = dateValue;

      document.getElementById('vNumdocumentostock_AJE').value = nextAje.next || 1;
      document.getElementById('vNumdocumentostock_AJS').value = nextAjs.next || 1;

      document.getElementById('vCodigo_provedor').value = 0;
      document.getElementById('vCodigo_provedor_display').textContent = '0 - PROVEEDOR GENERICO';

      this.addDetalleRow();
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    } finally {
      this.setLoading(false);
    }
  }

  renderBases(bases) {
    this.basesList.innerHTML = '';
    bases.forEach((base) => {
      const option = document.createElement('option');
      const codigo = base.codigo_base ?? '';
      const nombre = base.nombre ?? '';
      option.value = `${codigo} - ${nombre}`.trim();
      this.basesList.appendChild(option);
    });
  }

  renderProductos(productos) {
    this.productosList.innerHTML = '';
    productos.forEach((producto) => {
      const option = document.createElement('option');
      const codigo = producto.codigo_producto ?? '';
      const nombre = producto.nombre ?? '';
      option.value = `${codigo} - ${nombre}`.trim();
      this.productosList.appendChild(option);
    });
  }

  syncBaseSelection() {
    const value = this.baseInput.value || '';
    const normalized = value.toLowerCase();
    const match = this.bases.find((base) => {
      const codigo = String(base.codigo_base ?? '');
      const nombre = String(base.nombre ?? '');
      const label = `${codigo} - ${nombre}`.toLowerCase();
      return label === normalized || codigo.toLowerCase() === normalized || nombre.toLowerCase() === normalized;
    });
    this.baseHidden.value = match ? String(match.codigo_base ?? '') : '';
  }

  syncProductSelection(row) {
    if (!row) return;
    const input = row.querySelector('[data-field="vNombreProducto"]');
    const hidden = row.querySelector('[data-field="vCodigo_producto"]');
    const value = (input.value || '').toLowerCase();
    const match = this.productos.find((producto) => {
      const codigo = String(producto.codigo_producto ?? '');
      const nombre = String(producto.nombre ?? '');
      const label = `${codigo} - ${nombre}`.toLowerCase();
      return label === value || codigo.toLowerCase() === value || nombre.toLowerCase() === value;
    });
    hidden.value = match ? String(match.codigo_producto ?? '') : '';

    if (match) {
      input.classList.remove('is-invalid');
      this.loadSaldoForRow(row);
    }
  }

  async refreshSaldosForBase() {
    const base = this.baseHidden.value;
    if (!base) return;
    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    for (const row of rows) {
      const codigoProducto = row.querySelector('[data-field="vCodigo_producto"]').value;
      if (codigoProducto) {
        await this.loadSaldoForRow(row);
      }
    }
  }

  async loadSaldoForRow(row) {
    const base = this.baseHidden.value;
    const codigoProducto = row.querySelector('[data-field="vCodigo_producto"]').value;
    if (!base || !codigoProducto) {
      return;
    }
    try {
      const saldo = await this.fetchJson(`/api/saldo-stock?base=${base}&producto=${codigoProducto}`);
      const cantidadSistema = this.formatNumber(saldo.saldo_actual ?? 0);
      const sistemaInput = row.querySelector('[data-field="vCantidad_sistema"]');
      sistemaInput.value = cantidadSistema;
      this.updateRowCalculation(row);
    } catch (error) {
      this.showError(error.message || 'Error al cargar saldo de stock.');
    }
  }

  addDetalleRow() {
    const rowId = ++this.rowCounter;
    const row = document.createElement('tr');
    row.dataset.rowId = String(rowId);
    row.innerHTML = `
      <td>
        <div class="typeahead-input">
          <input class="form-control" list="productosList" data-field="vNombreProducto" placeholder="Producto" />
          <div class="invalid-feedback">Producto invalido.</div>
        </div>
        <input type="hidden" data-field="vCodigo_producto" />
        <input type="hidden" data-field="vTipodocumentostock" />
      </td>
      <td>
        <input class="form-control" data-field="vCantidad_sistema" readonly value="0" />
      </td>
      <td>
        <input class="form-control" data-field="vCantidad_real" placeholder="0.00" />
        <div class="invalid-feedback">Cantidad invalida.</div>
      </td>
      <td>
        <input class="form-control" data-field="vCantidad" readonly value="0" />
      </td>
      <td>
        <input class="form-control" data-field="vMonto" placeholder="0.00" />
        <div class="invalid-feedback">Monto invalido.</div>
      </td>
      <td>
        <button class="btn btn-outline-light btn-sm" type="button" data-action="remove-line">×</button>
      </td>
    `;
    this.detalleTableBody.appendChild(row);
  }

  handleCantidadReal(input) {
    const row = input.closest('tr');
    if (!row) return;

    const value = input.value;
    if (!value) {
      input.classList.remove('is-invalid');
      this.updateRowCalculation(row);
      return;
    }

    if (!this.decimalRegex.test(value)) {
      input.classList.add('is-invalid');
      return;
    }

    input.classList.remove('is-invalid');
    this.updateRowCalculation(row);
  }

  handleMontoInput(input) {
    const value = input.value;
    if (!value) {
      input.classList.remove('is-invalid');
      return;
    }
    if (!this.decimalRegex.test(value)) {
      input.classList.add('is-invalid');
      return;
    }
    input.classList.remove('is-invalid');
  }

  updateRowCalculation(row) {
    const sistemaValue = this.parseNumber(row.querySelector('[data-field="vCantidad_sistema"]').value);
    const realValue = this.parseNumber(row.querySelector('[data-field="vCantidad_real"]').value);
    if (Number.isNaN(realValue)) {
      row.querySelector('[data-field="vCantidad"]').value = this.formatNumber(0);
      row.querySelector('[data-field="vTipodocumentostock"]').value = 'AJS';
      return;
    }
    const ajuste = realValue - (Number.isNaN(sistemaValue) ? 0 : sistemaValue);
    row.querySelector('[data-field="vCantidad"]').value = this.formatNumber(ajuste);
    row.querySelector('[data-field="vTipodocumentostock"]').value = ajuste > 0 ? 'AJE' : 'AJS';

    const montoInput = row.querySelector('[data-field="vMonto"]');
    if (ajuste > 0) {
      montoInput.disabled = false;
      montoInput.parentElement.classList.remove('monto-hidden');
    } else {
      montoInput.value = this.formatNumber(0);
      montoInput.disabled = true;
      montoInput.parentElement.classList.add('monto-hidden');
    }
  }

  handleNext() {
    if (this.currentStep === 0 && !this.validateStep1()) {
      return;
    }
    if (this.currentStep === 1 && !this.validateStep2()) {
      return;
    }
    if (this.currentStep === 1) {
      this.buildSummary();
    }
    this.goStep(this.currentStep + 1);
  }

  validateStep1() {
    this.clearAlerts();
    const base = this.baseHidden.value;
    if (!base) {
      this.baseInput.classList.add('is-invalid');
      this.baseError.textContent = this.locale === 'en' ? 'Select a valid base.' : 'Seleccione una base valida.';
      this.showError(this.locale === 'en' ? 'Please select a valid base.' : 'Debe seleccionar una base valida.');
      return false;
    }
    return true;
  }

  validateStep2() {
    this.clearAlerts();
    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    if (!rows.length) {
      this.showError(this.locale === 'en' ? 'Add at least one line.' : 'Agregue al menos una linea.');
      return false;
    }

    let valid = true;
    rows.forEach((row) => {
      const productoInput = row.querySelector('[data-field="vNombreProducto"]');
      const codigoProducto = row.querySelector('[data-field="vCodigo_producto"]').value;
      const cantidadRealInput = row.querySelector('[data-field="vCantidad_real"]');
      const montoInput = row.querySelector('[data-field="vMonto"]');
      if (!codigoProducto) {
        productoInput.classList.add('is-invalid');
        valid = false;
      }
      if (!cantidadRealInput.value || !this.decimalRegex.test(cantidadRealInput.value)) {
        cantidadRealInput.classList.add('is-invalid');
        valid = false;
      }
      const ajuste = this.parseNumber(row.querySelector('[data-field="vCantidad"]').value);
      if (ajuste > 0) {
        if (!montoInput.value || !this.decimalRegex.test(montoInput.value)) {
          montoInput.classList.add('is-invalid');
          valid = false;
        }
      }
    });

    if (!valid) {
      this.showError(this.locale === 'en' ? 'Review the lines with invalid values.' : 'Revise las lineas con valores invalidos.');
    }
    return valid;
  }

  validateStep3() {
    if (!this.confirmCheck.checked) {
      this.confirmError.textContent =
        this.locale === 'en' ? 'You must confirm the operation.' : 'Debe confirmar la operacion.';
      return false;
    }
    this.confirmError.textContent = '';
    return true;
  }

  buildSummary() {
    const baseLabel = this.baseInput.value || '-';
    const fecha = document.getElementById('vFecha').value || '-';
    document.getElementById('summaryFecha').textContent = fecha;
    document.getElementById('summaryBase').textContent = baseLabel;
    document.getElementById('summaryAje').textContent = document.getElementById('vNumdocumentostock_AJE').value || '-';
    document.getElementById('summaryAjs').textContent = document.getElementById('vNumdocumentostock_AJS').value || '-';

    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    this.summaryTableBody.innerHTML = '';

    let totalAje = 0;
    let totalAjs = 0;
    rows.forEach((row) => {
      const nombre = row.querySelector('[data-field="vNombreProducto"]').value || '-';
      const sistema = row.querySelector('[data-field="vCantidad_sistema"]').value || '0';
      const real = row.querySelector('[data-field="vCantidad_real"]').value || '0';
      const ajuste = row.querySelector('[data-field="vCantidad"]').value || '0';
      const monto = row.querySelector('[data-field="vMonto"]').value || '0';
      const ajusteValue = this.parseNumber(ajuste);
      if (ajusteValue > 0) {
        totalAje += ajusteValue;
      } else if (ajusteValue < 0) {
        totalAjs += Math.abs(ajusteValue);
      }
      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
        <td>${nombre}</td>
        <td>${sistema}</td>
        <td>${real}</td>
        <td>${ajuste}</td>
        <td>${monto}</td>
      `;
      this.summaryTableBody.appendChild(summaryRow);
    });

    document.getElementById('summaryTotalAje').textContent = this.formatNumber(totalAje);
    document.getElementById('summaryTotalAjs').textContent = this.formatNumber(totalAjs);
  }

  async handleRegistrar() {
    this.clearAlerts();
    if (!this.validateStep3()) {
      return;
    }

    const payload = this.collectPayload();
    if (!payload) return;

    this.setLoading(true);
    try {
      const response = await this.fetchJson('/api/ajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response.message || (this.locale === 'en' ? 'Adjustment registered.' : 'Ajuste registrado.'));
      if (response.usedNumbers) {
        document.getElementById('vNumdocumentostock_AJE').value = response.usedNumbers.vNumdocumentostock_AJE || '';
        document.getElementById('vNumdocumentostock_AJS').value = response.usedNumbers.vNumdocumentostock_AJS || '';
      }
      this.confirmCheck.checked = false;
    } catch (error) {
      this.showError(error.message || (this.locale === 'en' ? 'Failed to register adjustment.' : 'Error al registrar ajuste.'));
    } finally {
      this.setLoading(false);
    }
  }

  collectPayload() {
    const base = this.baseHidden.value;
    if (!base) {
      this.showError(this.locale === 'en' ? 'Select a base.' : 'Seleccione una base.');
      return null;
    }

    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    const detalle = rows.map((row) => ({
      vCodigo_producto: row.querySelector('[data-field="vCodigo_producto"]').value,
      vNombreProducto: row.querySelector('[data-field="vNombreProducto"]').value,
      vTipodocumentostock: row.querySelector('[data-field="vTipodocumentostock"]').value,
      vCantidad_sistema: row.querySelector('[data-field="vCantidad_sistema"]').value,
      vCantidad_real: row.querySelector('[data-field="vCantidad_real"]').value,
      vCantidad: row.querySelector('[data-field="vCantidad"]').value,
      vMonto: row.querySelector('[data-field="vMonto"]').value
    }));

    return {
      vFecha: document.getElementById('vFecha').value,
      vCodigo_base: base,
      vBaseNombre: this.baseInput.value,
      vCodigo_provedor: document.getElementById('vCodigo_provedor').value,
      vNumdocumentostock_AJE: document.getElementById('vNumdocumentostock_AJE').value,
      vNumdocumentostock_AJS: document.getElementById('vNumdocumentostock_AJS').value,
      vDetalleAjuste: detalle
    };
  }

  async showLogs() {
    this.setLoading(true);
    try {
      const data = await this.fetchJson('/api/logs');
      document.getElementById('logsFilename').textContent = data.filename || '';
      document.getElementById('logsContent').textContent = data.content || '';
      const modal = new bootstrap.Modal(document.getElementById('logsModal'));
      modal.show();
    } catch (error) {
      this.showError(error.message || 'No se pudo leer el log.');
    } finally {
      this.setLoading(false);
    }
  }

  goStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    this.steps.forEach((step, i) => {
      step.classList.toggle('active', i === index);
    });
    this.stepBadges.forEach((badge, i) => {
      badge.classList.toggle('active', i === index);
    });
    const progress = (index / (this.steps.length - 1)) * 100;
    this.progressBar.style.width = `${progress}%`;

    this.prevBtn.disabled = index === 0;
    this.nextBtn.classList.toggle('d-none', index === this.steps.length - 1);
    this.registrarBtn.classList.toggle('d-none', index !== this.steps.length - 1);
  }

  setLoading(state) {
    this.loadingState.classList.toggle('show', state);
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

  clearAlerts() {
    this.errorAlert.classList.add('d-none');
    this.successAlert.classList.add('d-none');
  }

  clearFieldError(field) {
    field.classList.remove('is-invalid');
  }

  parseNumber(value) {
    if (value === null || value === undefined || value === '') return NaN;
    return Number(String(value).replace(',', '.'));
  }

  formatNumber(value) {
    if (Number.isNaN(value)) return '0';
    return Number(value).toFixed(2);
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Request failed');
    }
    return response.json();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
