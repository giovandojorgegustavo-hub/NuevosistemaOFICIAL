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
    this.insumosBody = document.querySelector('#insumosTable tbody');
    this.gastosBody = document.querySelector('#gastosTable tbody');
    this.produccionBody = document.querySelector('#produccionTable tbody');
    this.summaryInsumosBody = document.querySelector('#summaryInsumosTable tbody');
    this.summaryGastosBody = document.querySelector('#summaryGastosTable tbody');
    this.summaryProduccionBody = document.querySelector('#summaryProduccionTable tbody');
    this.syncTime = document.getElementById('syncTime');
    this.products = [];
    this.productMap = new Map();
    this.bases = [];
    this.cuentas = [];
    this.etiquetas = [];
    this.decimalRegex = /^\d+(?:[.,]\d{1,2})?$/;
    this.textRegex = /^.{3,}$/;
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
    const translations = {
      es: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Fabricacion',
        subtitle: 'Controla insumos, gastos y produccion con trazabilidad total en un flujo guiado.',
        status: 'Operativo',
        statusLabel: 'Ultima sincronizacion',
        wizardTitle: 'CU2-005 - Registro de fabricacion (FAB)',
        wizardSubtitle: 'Guia paso a paso para registrar la fabricacion y sus costos asociados.',
        refresh: 'Actualizar',
        viewLogs: 'Ver logs SQL',
        step1: 'Datos generales',
        step2: 'Gastos',
        step3: 'Produccion',
        step4: 'Confirmacion',
        step1Title: '1. Datos generales + insumos',
        step1Help: 'Defina la base de fabricacion y registre los insumos utilizados.',
        fecha: 'Fecha',
        base: 'Base',
        baseError: 'Seleccione una base.',
        docStockInsumo: 'Documento stock insumo',
        docStockProduccion: 'Documento stock produccion',
        insumosTitle: 'Detalle de insumos',
        insumosHelp: 'Agregue los insumos necesarios para la fabricacion.',
        addRow: 'Agregar fila',
        producto: 'Producto',
        nombre: 'Nombre',
        cantidad: 'Cantidad',
        step2Title: '2. Registrar gastos asociados',
        step2Help: 'Cada gasto genera su propio documento contable.',
        gastosTitle: 'Gastos y etiquetas',
        gastosHelp: 'Defina los gastos asociados a la fabricacion.',
        descripcion: 'Descripcion',
        monto: 'Monto',
        cuenta: 'Cuenta bancaria',
        etiquetas: 'Etiquetas',
        step3Title: '3. Registrar produccion',
        step3Help: 'Ingrese los productos producidos y sus cantidades.',
        produccionTitle: 'Detalle de produccion',
        produccionHelp: 'Agregue los productos obtenidos en la fabricacion.',
        step4Title: '4. Confirmar y registrar',
        step4Help: 'Valide los datos antes de ejecutar las transacciones.',
        summaryGeneral: 'Datos generales',
        summaryInsumos: 'Insumos',
        summaryGastos: 'Gastos',
        summaryProduccion: 'Produccion',
        confirm: 'Confirmo que la informacion es correcta.',
        confirmError: 'Debe confirmar la operacion.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Fabricacion',
        loading: 'Procesando...',
        logsTitle: 'Logs SQL',
        selectPlaceholder: 'Seleccione...'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Manufacturing',
        subtitle: 'Control inputs, expenses, and output with full traceability in a guided flow.',
        status: 'Operational',
        statusLabel: 'Last sync',
        wizardTitle: 'CU2-005 - Manufacturing registration (FAB)',
        wizardSubtitle: 'Step-by-step guide to register manufacturing and its associated costs.',
        refresh: 'Refresh',
        viewLogs: 'View SQL logs',
        step1: 'General data',
        step2: 'Expenses',
        step3: 'Production',
        step4: 'Confirmation',
        step1Title: '1. General data + inputs',
        step1Help: 'Select the base and register the inputs used.',
        fecha: 'Date',
        base: 'Base',
        baseError: 'Select a base.',
        docStockInsumo: 'Input stock document',
        docStockProduccion: 'Production stock document',
        insumosTitle: 'Input detail',
        insumosHelp: 'Add the inputs required for the manufacturing.',
        addRow: 'Add row',
        producto: 'Product',
        nombre: 'Name',
        cantidad: 'Quantity',
        step2Title: '2. Register expenses',
        step2Help: 'Each expense generates its own accounting document.',
        gastosTitle: 'Expenses and tags',
        gastosHelp: 'Define the expenses associated with the manufacturing.',
        descripcion: 'Description',
        monto: 'Amount',
        cuenta: 'Bank account',
        etiquetas: 'Tags',
        step3Title: '3. Register production',
        step3Help: 'Enter the produced items and quantities.',
        produccionTitle: 'Production detail',
        produccionHelp: 'Add products obtained in the manufacturing.',
        step4Title: '4. Confirm & register',
        step4Help: 'Validate the data before executing transactions.',
        summaryGeneral: 'General data',
        summaryInsumos: 'Inputs',
        summaryGastos: 'Expenses',
        summaryProduccion: 'Production',
        confirm: 'I confirm the information is correct.',
        confirmError: 'You must confirm the operation.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Manufacturing',
        loading: 'Processing...',
        logsTitle: 'SQL logs',
        selectPlaceholder: 'Select...'
      }
    };

    this.localeStrings = translations[locale];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (this.localeStrings[key]) {
        el.textContent = this.localeStrings[key];
      }
    });
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.goStep(this.currentStep - 1));
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.registrarBtn.addEventListener('click', () => this.handleRegistrar());

    document.getElementById('addInsumoBtn').addEventListener('click', () => this.addInsumoRow());
    document.getElementById('addGastoBtn').addEventListener('click', () => this.addGastoRow());
    document.getElementById('addProduccionBtn').addEventListener('click', () => this.addProduccionRow());
    document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.openLogs());

    this.insumosBody.addEventListener('change', (event) => {
      if (event.target.matches('select[name="vcodigo_producto_insumo"]')) {
        this.handleProductoChange(event.target, 'vnombre_producto_insumo');
      }
    });

    this.produccionBody.addEventListener('change', (event) => {
      if (event.target.matches('select[name="vcodigo_producto_producido"]')) {
        this.handleProductoChange(event.target, 'vnombre_producto_producido');
      }
    });

    document.getElementById('vCodigo_base').addEventListener('change', (event) => {
      this.clearFieldError(event.target);
      this.updateSummary();
    });

    document.getElementById('confirmCheck').addEventListener('change', (event) => {
      if (event.target.checked) {
        event.target.classList.remove('is-invalid');
      }
    });
  }

  async refreshData() {
    this.showLoading(true);
    this.clearAlerts();
    await this.loadInitialData();
    this.showLoading(false);
  }

  async loadInitialData() {
    try {
      const [now, bases, productos, cuentas, etiquetas, docInsumo, docProd] = await Promise.all([
        this.fetchJson('/api/now'),
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/cuentasbancarias'),
        this.fetchJson('/api/etiquetas-gastos'),
        this.fetchJson('/api/next-numdocumentostock?tipo=FIS'),
        this.fetchJson('/api/next-numdocumentostock?tipo=FPR')
      ]);

      this.bases = bases;
      this.products = productos;
      this.cuentas = cuentas;
      this.etiquetas = etiquetas;
      this.productMap = new Map(
        productos.map((item) => [item.codigo_producto || item.codigo || item.id || item.value, item.nombre || item.nombre_producto || item.descripcion || ''])
      );

      document.getElementById('vFecha').value = now.fecha;
      document.getElementById('vTipoDocumentoStockInsumo').value = 'FIS';
      document.getElementById('vTipoDocumentoStockProduccion').value = 'FPR';
      document.getElementById('vNumDocumentoStockInsumo').value = docInsumo.next;
      document.getElementById('vNumDocumentoStockProduccion').value = docProd.next;

      this.populateSelect('vCodigo_base', bases, 'codigo_base', 'nombre');
      this.syncTime.textContent = now.hora || '--:--';

      if (!this.insumosBody.children.length) {
        this.addInsumoRow();
      }
      if (!this.gastosBody.children.length) {
        this.addGastoRow();
      }
      if (!this.produccionBody.children.length) {
        this.addProduccionRow();
      }

      this.updateSummary();
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    }
  }

  populateSelect(selectId, items, valueKey = 'codigo', labelKey = 'nombre') {
    const select = document.getElementById(selectId);
    const placeholder = this.localeStrings?.selectPlaceholder || 'Seleccione...';
    select.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item[valueKey] || item.codigo || item.id || item.value || '';
      option.textContent = item[labelKey] || item.nombre || item.descripcion || option.value;
      select.appendChild(option);
    });
  }

  addInsumoRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <select class="form-select" name="vcodigo_producto_insumo" required>
          ${this.renderProductOptions()}
        </select>
      </td>
      <td>
        <input class="form-control" name="vnombre_producto_insumo" readonly />
      </td>
      <td>
        <input class="form-control" name="vcantidad_insumo" placeholder="0.00" />
      </td>
      <td>
        <button class="btn btn-sm btn-outline-light" type="button" data-action="delete">x</button>
      </td>
    `;
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      row.remove();
      this.updateSummary();
    });
    row.addEventListener('input', () => this.updateSummary());
    this.insumosBody.appendChild(row);
  }

  addGastoRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input class="form-control" name="vDescripcionGasto" placeholder="Detalle" />
      </td>
      <td>
        <input class="form-control" name="vMontoGastoTotal" placeholder="0.00" />
      </td>
      <td>
        <select class="form-select" name="vCodigo_cuentabancaria">
          ${this.renderCuentaOptions()}
        </select>
      </td>
      <td>
        <div class="tags" data-role="etiquetas">
          ${this.renderEtiquetaOptions()}
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-outline-light" type="button" data-action="delete">x</button>
      </td>
    `;
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      row.remove();
      this.updateSummary();
    });
    row.addEventListener('input', () => this.updateSummary());
    this.gastosBody.appendChild(row);
  }

  addProduccionRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <select class="form-select" name="vcodigo_producto_producido" required>
          ${this.renderProductOptions()}
        </select>
      </td>
      <td>
        <input class="form-control" name="vnombre_producto_producido" readonly />
      </td>
      <td>
        <input class="form-control" name="vcantidad_producida" placeholder="0.00" />
      </td>
      <td>
        <button class="btn btn-sm btn-outline-light" type="button" data-action="delete">x</button>
      </td>
    `;
    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      row.remove();
      this.updateSummary();
    });
    row.addEventListener('input', () => this.updateSummary());
    this.produccionBody.appendChild(row);
  }

  renderProductOptions() {
    const placeholder = this.localeStrings?.selectPlaceholder || 'Seleccione...';
    const options = [`<option value="">${placeholder}</option>`];
    this.products.forEach((item) => {
      const value = item.codigo_producto || item.codigo || item.id || item.value || '';
      const label = item.nombre || item.nombre_producto || item.descripcion || value;
      options.push(`<option value="${value}">${label}</option>`);
    });
    return options.join('');
  }

  renderCuentaOptions() {
    const placeholder = this.localeStrings?.selectPlaceholder || 'Seleccione...';
    const options = [`<option value="">${placeholder}</option>`];
    this.cuentas.forEach((item) => {
      const value = item.codigo_cuentabancaria || item.codigo || item.id || item.value || '';
      const label = `${item.nombre || ''} ${item.banco ? `(${item.banco})` : ''}`.trim() || value;
      options.push(`<option value="${value}">${label}</option>`);
    });
    return options.join('');
  }

  renderEtiquetaOptions() {
    if (!this.etiquetas.length) {
      return '<span class="text-muted">Sin etiquetas</span>';
    }
    return this.etiquetas
      .map((item) => {
        const value = item.codigoetiquetagasto || item.codigo || item.id || '';
        const label = item.nombre || item.descripcion || value;
        return `
          <label class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="vDetalleGastos" value="${value}" />
            <span class="form-check-label">${label}</span>
          </label>
        `;
      })
      .join('');
  }

  handleProductoChange(select, nameField) {
    const value = select.value;
    const row = select.closest('tr');
    const nameInput = row.querySelector(`input[name="${nameField}"]`);
    const label = this.productMap.get(value) || '';
    nameInput.value = label;
    this.updateSummary();
  }

  goStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= this.steps.length) {
      return;
    }
    this.currentStep = stepIndex;
    this.steps.forEach((step, index) => {
      step.style.display = index === stepIndex ? 'block' : 'none';
    });
    this.stepBadges.forEach((badge, index) => {
      badge.classList.toggle('active', index === stepIndex);
    });
    const progress = ((stepIndex + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;

    this.prevBtn.disabled = stepIndex === 0;
    this.nextBtn.classList.toggle('d-none', stepIndex === this.steps.length - 1);
    this.registrarBtn.classList.toggle('d-none', stepIndex !== this.steps.length - 1);
    this.updateSummary();
  }

  handleNext() {
    this.clearAlerts();
    if (this.validateStep(this.currentStep)) {
      this.goStep(this.currentStep + 1);
    }
  }

  validateStep(stepIndex) {
    if (stepIndex === 0) {
      return this.validateStepGeneral();
    }
    if (stepIndex === 1) {
      return this.validateStepGastos();
    }
    if (stepIndex === 2) {
      return this.validateStepProduccion();
    }
    if (stepIndex === 3) {
      return this.validateStepConfirm();
    }
    return true;
  }

  validateStepGeneral() {
    let valid = true;
    const baseSelect = document.getElementById('vCodigo_base');
    if (!baseSelect.value) {
      baseSelect.classList.add('is-invalid');
      valid = false;
    }

    const { items, invalid } = this.collectInsumos(true);
    if (!items.length) {
      this.showError('Debe registrar al menos un insumo.');
      valid = false;
    }
    if (invalid) {
      this.showError('Revise los insumos: producto y cantidad son obligatorios.');
      valid = false;
    }
    return valid;
  }

  validateStepGastos() {
    const { items, invalid } = this.collectGastos(true);
    if (!items.length) {
      this.showError('Debe registrar al menos un gasto.');
      return false;
    }
    if (invalid) {
      this.showError('Revise los gastos: descripcion, monto, cuenta y etiquetas son obligatorios.');
      return false;
    }
    return true;
  }

  validateStepProduccion() {
    const { items, invalid } = this.collectProduccion(true);
    if (!items.length) {
      this.showError('Debe registrar al menos un producto producido.');
      return false;
    }
    if (invalid) {
      this.showError('Revise la produccion: producto y cantidad son obligatorios.');
      return false;
    }
    return true;
  }

  validateStepConfirm() {
    const confirm = document.getElementById('confirmCheck');
    if (!confirm.checked) {
      confirm.classList.add('is-invalid');
      return false;
    }
    return true;
  }

  clearFieldError(field) {
    field.classList.remove('is-invalid');
  }

  collectInsumos(strict = false) {
    const items = [];
    let invalid = false;
    this.insumosBody.querySelectorAll('tr').forEach((row) => {
      const codigo = row.querySelector('select[name="vcodigo_producto_insumo"]').value;
      const nombre = row.querySelector('input[name="vnombre_producto_insumo"]').value;
      const cantidadRaw = row.querySelector('input[name="vcantidad_insumo"]').value.trim();
      if (!codigo && !cantidadRaw) {
        return;
      }
      if (!codigo || !this.decimalRegex.test(cantidadRaw)) {
        row.classList.add('table-danger');
        invalid = true;
        return;
      }
      row.classList.remove('table-danger');
      items.push({
        vcodigo_producto_insumo: codigo,
        vnombre_producto_insumo: nombre,
        vcantidad_insumo: cantidadRaw
      });
    });
    return { items, invalid: strict ? invalid : false };
  }

  collectGastos(strict = false) {
    const items = [];
    let invalid = false;
    this.gastosBody.querySelectorAll('tr').forEach((row) => {
      const descripcion = row.querySelector('input[name="vDescripcionGasto"]').value.trim();
      const montoRaw = row.querySelector('input[name="vMontoGastoTotal"]').value.trim();
      const cuenta = row.querySelector('select[name="vCodigo_cuentabancaria"]').value;
      const etiquetas = Array.from(row.querySelectorAll('input[name="vDetalleGastos"]:checked')).map(
        (item) => item.value
      );

      if (!descripcion && !montoRaw && etiquetas.length === 0) {
        return;
      }

      if (!this.textRegex.test(descripcion) || !this.decimalRegex.test(montoRaw) || !cuenta || !etiquetas.length) {
        row.classList.add('table-danger');
        invalid = true;
        return;
      }
      row.classList.remove('table-danger');
      items.push({
        vDescripcionGasto: descripcion,
        vMontoGastoTotal: montoRaw,
        vCodigo_cuentabancaria: cuenta,
        vDetalleGastos: etiquetas
      });
    });
    return { items, invalid: strict ? invalid : false };
  }

  collectProduccion(strict = false) {
    const items = [];
    let invalid = false;
    this.produccionBody.querySelectorAll('tr').forEach((row) => {
      const codigo = row.querySelector('select[name="vcodigo_producto_producido"]').value;
      const nombre = row.querySelector('input[name="vnombre_producto_producido"]').value;
      const cantidadRaw = row.querySelector('input[name="vcantidad_producida"]').value.trim();
      if (!codigo && !cantidadRaw) {
        return;
      }
      if (!codigo || !this.decimalRegex.test(cantidadRaw)) {
        row.classList.add('table-danger');
        invalid = true;
        return;
      }
      row.classList.remove('table-danger');
      items.push({
        vcodigo_producto_producido: codigo,
        vnombre_producto_producido: nombre,
        vcantidad_producida: cantidadRaw
      });
    });
    return { items, invalid: strict ? invalid : false };
  }

  updateSummary() {
    const baseSelect = document.getElementById('vCodigo_base');
    const baseLabel = baseSelect.options[baseSelect.selectedIndex]?.textContent || '--';
    document.getElementById('summaryFecha').textContent = document.getElementById('vFecha').value || '--';
    document.getElementById('summaryBase').textContent = baseLabel;
    document.getElementById('summaryDocInsumo').textContent = `${
      document.getElementById('vTipoDocumentoStockInsumo').value
    }-${document.getElementById('vNumDocumentoStockInsumo').value}`;
    document.getElementById('summaryDocProduccion').textContent = `${
      document.getElementById('vTipoDocumentoStockProduccion').value
    }-${document.getElementById('vNumDocumentoStockProduccion').value}`;

    this.summaryInsumosBody.innerHTML = '';
    this.collectInsumos().items.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${item.vnombre_producto_insumo || item.vcodigo_producto_insumo}</td><td>${item.vcantidad_insumo}</td>`;
      this.summaryInsumosBody.appendChild(row);
    });

    this.summaryGastosBody.innerHTML = '';
    this.collectGastos().items.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${item.vDescripcionGasto}</td><td>${item.vMontoGastoTotal}</td>`;
      this.summaryGastosBody.appendChild(row);
    });

    this.summaryProduccionBody.innerHTML = '';
    this.collectProduccion().items.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${item.vnombre_producto_producido || item.vcodigo_producto_producido}</td><td>${item.vcantidad_producida}</td>`;
      this.summaryProduccionBody.appendChild(row);
    });
  }

  async handleRegistrar() {
    this.clearAlerts();
    const validations = [
      this.validateStepGeneral(),
      this.validateStepGastos(),
      this.validateStepProduccion(),
      this.validateStepConfirm()
    ];
    const firstInvalid = validations.findIndex((value) => !value);
    if (firstInvalid !== -1) {
      this.goStep(firstInvalid);
      return;
    }
    const payload = {
      vFecha: document.getElementById('vFecha').value,
      vCodigo_base: document.getElementById('vCodigo_base').value,
      vDetalleInsumos: this.collectInsumos().items,
      vDetalleProduccion: this.collectProduccion().items,
      vGastosFacturas: this.collectGastos().items
    };

    if (!payload.vDetalleInsumos.length || !payload.vDetalleProduccion.length || !payload.vGastosFacturas.length) {
      this.showError('Complete todos los pasos antes de registrar.');
      return;
    }

    try {
      this.showLoading(true);
      const response = await this.fetchJson('/api/fabricacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response.message || 'Fabricacion registrada.');
      await this.refreshData();
      document.getElementById('confirmCheck').checked = false;
      this.goStep(0);
    } catch (error) {
      this.showError(error.message || 'Error al registrar fabricacion.');
    } finally {
      this.showLoading(false);
    }
  }

  async openLogs() {
    try {
      const data = await this.fetchJson('/api/logs');
      document.getElementById('logsFilename').textContent = data.filename || '';
      document.getElementById('logsContent').textContent = data.content || '';
      const modal = new bootstrap.Modal(document.getElementById('logsModal'));
      modal.show();
    } catch (error) {
      this.showError(error.message || 'No se pudo cargar el log.');
    }
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Error en la solicitud.');
    }
    return response.json();
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

  showLoading(show) {
    this.loadingState.classList.toggle('d-none', !show);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
