class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progressBar = document.getElementById('wizardProgress');
    this.stepBadges = Array.from(document.querySelectorAll('.step-badge'));
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.facturarBtn = document.getElementById('facturarBtn');
    this.errorAlert = document.getElementById('errorAlert');
    this.successAlert = document.getElementById('successAlert');
    this.detalleTableBody = document.querySelector('#detalleCompraTable tbody');
    this.summaryTableBody = document.querySelector('#detalleCompraSummary tbody');
    this.productos = [];
    this.proveedores = [];
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
        eyebrow: 'IaaS + PaaS Global Procurement',
        title: 'Compras - Factura',
        subtitle: 'Gestiona compras y facturación con trazabilidad global.',
        status: 'Operativo',
        step1Title: '1. Crear Compra',
        step2Title: '2. Confirmar y Facturar Compra',
        fecha: 'Fecha',
        tipoDocumento: 'Tipo documento',
        numeroDocumento: 'Número documento',
        totalCompra: 'Total compra',
        proveedor: 'Proveedor',
        proveedorError: 'Seleccione un proveedor válido.',
        addLine: 'Agregar línea',
        colProducto: 'Producto',
        colCantidad: 'Cantidad',
        colMonto: 'Monto',
        step1Help: 'Agrega los productos y montos de la compra.',
        confirmacion: 'Confirmo que la información es correcta.',
        confirmacionError: 'Debe confirmar la operación.',
        step2Help: 'Revise antes de facturar la compra.',
        prev: 'Anterior',
        next: 'Siguiente',
        facturar: 'Facturar Compra'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Procurement',
        title: 'Purchase Invoice',
        subtitle: 'Manage purchases and billing with global traceability.',
        status: 'Operational',
        step1Title: '1. Create Purchase',
        step2Title: '2. Confirm & Invoice Purchase',
        fecha: 'Date',
        tipoDocumento: 'Document type',
        numeroDocumento: 'Document number',
        totalCompra: 'Purchase total',
        proveedor: 'Supplier',
        proveedorError: 'Select a valid supplier.',
        addLine: 'Add line',
        colProducto: 'Product',
        colCantidad: 'Quantity',
        colMonto: 'Amount',
        step1Help: 'Add products and amounts to the purchase.',
        confirmacion: 'I confirm the information is correct.',
        confirmacionError: 'You must confirm the operation.',
        step2Help: 'Review before invoicing the purchase.',
        prev: 'Back',
        next: 'Next',
        facturar: 'Invoice Purchase'
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
    this.facturarBtn.addEventListener('click', () => this.handleFacturar());

    document.getElementById('addDetalleLine').addEventListener('click', () => this.addDetalleRow());

    this.detalleTableBody.addEventListener('input', (event) => {
      if (event.target.matches('input')) {
        this.validateDecimalInput(event.target);
        this.updateTotal();
      }
    });

    this.detalleTableBody.addEventListener('change', (event) => {
      if (event.target.matches('select')) {
        this.clearFieldError(event.target);
      }
    });
  }

  async loadInitialData() {
    try {
      const [now, proveedores, productos, nextNum] = await Promise.all([
        this.fetchJson('/api/now'),
        this.fetchJson('/api/proveedores'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/next-num-documento?tipo=FCC')
      ]);

      this.proveedores = proveedores;
      this.productos = productos;

      document.getElementById('vFecha').value = now.fecha;
      document.getElementById('vTipo_documento_compra').value = 'FCC';
      document.getElementById('vNum_documento_compra').value = nextNum.next;

      const ordinal = await this.fetchJson(`/api/next-ordinal?tipo=FCC&num=${nextNum.next}`);
      document.getElementById('vordinalmovstockdetalles').value = ordinal.next;

      this.populateSelect('vCodigo_provedor', proveedores, 'codigo_provedor', 'nombre_provedor');
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    }
  }

  populateSelect(selectId, items, valueKey, labelKey) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Seleccione...</option>';
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item[valueKey];
      option.textContent = item[labelKey] || item[valueKey];
      select.appendChild(option);
    });
  }

  addDetalleRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <select class="form-select" data-field="codigo_producto" name="vDetalleCompra.codigo_producto">
          <option value="">Seleccione...</option>
          ${this.productos.map((prod) => `<option value="${prod.codigo_producto}">${prod.nombre_producto || prod.descripcion || prod.codigo_producto}</option>`).join('')}
        </select>
        <div class="invalid-feedback">Seleccione un producto.</div>
      </td>
      <td>
        <input type="text" class="form-control" data-field="cantidad" name="vDetalleCompra.cantidad" placeholder="0.00" />
        <div class="invalid-feedback">Ingrese cantidad válida.</div>
      </td>
      <td>
        <input type="text" class="form-control" data-field="monto" name="vDetalleCompra.monto" placeholder="0.00" />
        <div class="invalid-feedback">Ingrese monto válido.</div>
        <input type="hidden" data-field="saldo" name="vDetalleCompra.saldo" value="0" />
      </td>
      <td class="text-end">
        <button class="btn btn-outline-light btn-sm" type="button" data-action="delete">Eliminar</button>
      </td>
    `;

    row.querySelector('[data-action="delete"]').addEventListener('click', () => {
      row.remove();
      this.updateTotal();
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

  updateTotal() {
    let total = 0;
    this.detalleTableBody.querySelectorAll('tr').forEach((row) => {
      const montoInput = row.querySelector('input[data-field="monto"]');
      if (montoInput && this.decimalRegex.test(montoInput.value.trim())) {
        total += parseFloat(montoInput.value);
      }
    });
    document.getElementById('vTotal_compra').value = total.toFixed(2);
  }

  handleNext() {
    if (this.currentStep === 0 && !this.validateStep1()) {
      return;
    }
    this.goStep(this.currentStep + 1);
    if (this.currentStep === 1) {
      this.renderSummary();
    }
  }

  validateStep1() {
    let valid = true;
    const proveedorSelect = document.getElementById('vCodigo_provedor');
    if (!proveedorSelect.value) {
      proveedorSelect.classList.add('is-invalid');
      valid = false;
    } else {
      proveedorSelect.classList.remove('is-invalid');
    }

    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    if (!rows.length) {
      this.showError('Debe agregar al menos un detalle.');
      return false;
    }

    rows.forEach((row) => {
      const producto = row.querySelector('select[data-field="codigo_producto"]');
      const cantidad = row.querySelector('input[data-field="cantidad"]');
      const monto = row.querySelector('input[data-field="monto"]');

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

      if (!monto.value || !this.decimalRegex.test(monto.value)) {
        monto.classList.add('is-invalid');
        valid = false;
      } else {
        monto.classList.remove('is-invalid');
      }
    });

    if (!valid) {
      this.showError('Complete los campos requeridos antes de continuar.');
    }
    return valid;
  }

  renderSummary() {
    const proveedorSelect = document.getElementById('vCodigo_provedor');
    const proveedorLabel = proveedorSelect.options[proveedorSelect.selectedIndex]?.text || '-';
    document.getElementById('summaryProveedor').textContent = proveedorLabel;
    document.getElementById('summaryFecha').textContent = document.getElementById('vFecha').value;
    document.getElementById('summaryNumero').textContent = document.getElementById('vNum_documento_compra').value;
    document.getElementById('summaryTotal').textContent = document.getElementById('vTotal_compra').value;

    this.summaryTableBody.innerHTML = '';
    this.detalleTableBody.querySelectorAll('tr').forEach((row) => {
      const producto = row.querySelector('select[data-field="codigo_producto"]');
      const cantidad = row.querySelector('input[data-field="cantidad"]');
      const monto = row.querySelector('input[data-field="monto"]');
      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
        <td>${producto.options[producto.selectedIndex]?.text || ''}</td>
        <td>${cantidad.value}</td>
        <td>${monto.value}</td>
      `;
      this.summaryTableBody.appendChild(summaryRow);
    });
  }

  validateStep2() {
    const confirm = document.getElementById('confirmOperacion');
    if (!confirm.checked) {
      confirm.classList.add('is-invalid');
      return false;
    }
    confirm.classList.remove('is-invalid');
    return true;
  }

  async handleFacturar() {
    if (!this.validateStep2()) {
      this.showError('Debe confirmar la operación.');
      return;
    }

    this.toggleLoading(true);
    try {
      const payload = this.buildPayload();
      const response = await this.fetchJson('/api/facturar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response.message || 'Compra facturada correctamente.');
      this.resetWizard();
    } catch (error) {
      this.showError(error.message || 'Error al facturar la compra.');
    } finally {
      this.toggleLoading(false);
    }
  }

  buildPayload() {
    const detalle = [];
    this.detalleTableBody.querySelectorAll('tr').forEach((row, index) => {
      detalle.push({
        ordinal: index + 1,
        codigo_producto: row.querySelector('select[data-field="codigo_producto"]').value,
        cantidad: row.querySelector('input[data-field="cantidad"]').value,
        saldo: 0,
        monto: row.querySelector('input[data-field="monto"]').value
      });
    });

    return {
      vTipo_documento_compra: document.getElementById('vTipo_documento_compra').value,
      vNum_documento_compra: document.getElementById('vNum_documento_compra').value,
      vCodigo_provedor: document.getElementById('vCodigo_provedor').value,
      vFecha: document.getElementById('vFecha').value,
      vTotal_compra: document.getElementById('vTotal_compra').value,
      vordinalmovstockdetalles: document.getElementById('vordinalmovstockdetalles').value,
      vDetalleCompra: detalle
    };
  }

  resetWizard() {
    this.goStep(0);
    document.getElementById('confirmOperacion').checked = false;
    this.detalleTableBody.innerHTML = '';
    this.addDetalleRow();
    this.updateTotal();
  }

  goStep(step) {
    if (step < 0 || step >= this.steps.length) return;
    this.currentStep = step;
    this.steps.forEach((section, index) => {
      section.classList.toggle('d-none', index !== step);
    });
    this.prevBtn.classList.toggle('d-none', step === 0);
    this.nextBtn.classList.toggle('d-none', step !== 0);
    this.facturarBtn.classList.toggle('d-none', step !== 1);
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
    const spinner = this.facturarBtn.querySelector('.spinner-border');
    this.facturarBtn.disabled = isLoading;
    spinner.classList.toggle('d-none', !isLoading);
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
