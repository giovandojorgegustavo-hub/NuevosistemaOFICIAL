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
    this.loadingState = document.getElementById('loadingState');
    this.proveedores = [];
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
        title: 'Compras Factura',
        subtitle: 'Registra facturas de compra con trazabilidad y facturacion inmediata.',
        status: 'Operativo',
        step1Title: '1. Crear Compra',
        step2Title: '2. Confirmar y Facturar',
        fecha: 'Fecha',
        tipoDocumento: 'Tipo documento',
        numeroDocumento: 'Numero documento',
        ordinalStock: 'Ordinal stock',
        proveedor: 'Proveedor',
        proveedorError: 'Seleccione un proveedor valido.',
        total: 'Total compra',
        detalleTitle: 'Detalle compra',
        addLine: 'Agregar linea',
        colProducto: 'Producto',
        colCantidad: 'Cantidad',
        colSaldo: 'Saldo',
        colMonto: 'Monto',
        step1Help: 'Agrega productos con cantidades y montos para la factura de compra.',
        summaryTitle: 'Resumen de compra',
        summaryProveedor: 'Proveedor',
        summaryDocumento: 'Documento',
        summaryFecha: 'Fecha',
        summaryTotal: 'Total',
        confirmacion: 'Confirmo que la informacion es correcta.',
        confirmacionError: 'Debe confirmar la operacion.',
        step2Help: 'Revisa los datos antes de facturar.',
        prev: 'Anterior',
        next: 'Siguiente',
        facturar: 'Facturar Compra',
        loading: 'Procesando...',
        invalidProducto: 'Seleccione un producto valido.',
        invalidCantidad: 'Ingrese una cantidad valida.',
        invalidMonto: 'Ingrese un monto valido.',
        noDetalle: 'Debe agregar al menos una linea de detalle.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Purchase Invoice',
        subtitle: 'Register purchase invoices with traceability and immediate billing.',
        status: 'Operational',
        step1Title: '1. Create Purchase',
        step2Title: '2. Confirm & Bill',
        fecha: 'Date',
        tipoDocumento: 'Document type',
        numeroDocumento: 'Document number',
        ordinalStock: 'Stock ordinal',
        proveedor: 'Supplier',
        proveedorError: 'Select a valid supplier.',
        total: 'Purchase total',
        detalleTitle: 'Purchase detail',
        addLine: 'Add line',
        colProducto: 'Product',
        colCantidad: 'Quantity',
        colSaldo: 'Balance',
        colMonto: 'Amount',
        step1Help: 'Add products, quantities, and amounts for the invoice.',
        summaryTitle: 'Purchase summary',
        summaryProveedor: 'Supplier',
        summaryDocumento: 'Document',
        summaryFecha: 'Date',
        summaryTotal: 'Total',
        confirmacion: 'I confirm the information is correct.',
        confirmacionError: 'You must confirm the operation.',
        step2Help: 'Review the data before billing.',
        prev: 'Back',
        next: 'Next',
        facturar: 'Bill Purchase',
        loading: 'Processing...',
        invalidProducto: 'Select a valid product.',
        invalidCantidad: 'Enter a valid quantity.',
        invalidMonto: 'Enter a valid amount.',
        noDetalle: 'Add at least one detail line.'
      }
    };

    this.translations = translations[locale];

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (this.translations[key]) {
        el.textContent = this.translations[key];
      }
    });
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.goStep(this.currentStep - 1));
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.facturarBtn.addEventListener('click', () => this.handleFacturar());
    document.getElementById('addDetalleLine').addEventListener('click', () => this.addDetalleRow());

    document.getElementById('vCodigo_provedor').addEventListener('input', (event) => {
      this.clearFieldError(event.target);
    });

    this.detalleTableBody.addEventListener('input', (event) => {
      if (event.target.matches('input')) {
        if (event.target.dataset.field === 'vcantidad' || event.target.dataset.field === 'vmonto') {
          this.validateDecimalInput(event.target);
          this.updateTotals();
        }
      }
    });

    this.detalleTableBody.addEventListener('change', (event) => {
      if (event.target.matches('input')) {
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
        this.fetchJson('/api/next-numdocumento?tipo=FCC')
      ]);

      this.proveedores = proveedores;
      this.productos = productos;

      document.getElementById('vFecha').value = now.fecha;
      document.getElementById('vTipo_documento_compra').value = 'FCC';
      document.getElementById('vNum_documento_compra').value = nextNum.next;

      const ordinal = await this.fetchJson(`/api/next-ordinal?tipo=FCC&num=${nextNum.next}`);
      document.getElementById('vordinalmovstockdetalles').value = ordinal.next;

      this.populateDatalist('proveedorList', proveedores, 'codigo_provedor', 'nombre');
      this.populateDatalist('productoList', productos, 'codigo_producto', 'nombre');
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    }
  }

  populateDatalist(listId, items, valueKey, labelKey) {
    const list = document.getElementById(listId);
    list.innerHTML = '';
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item[valueKey];
      option.label = item[labelKey] || item[valueKey];
      list.appendChild(option);
    });
  }

  addDetalleRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input
          class="form-control"
          list="productoList"
          data-field="vcodigo_producto"
          name="vDetalleCompra.vcodigo_producto"
          placeholder=""
        />
        <div class="invalid-feedback">${this.translations.invalidProducto}</div>
      </td>
      <td>
        <input
          type="text"
          class="form-control"
          data-field="vcantidad"
          name="vDetalleCompra.vcantidad"
          placeholder="0.00"
        />
        <div class="invalid-feedback">${this.translations.invalidCantidad}</div>
      </td>
      <td class="d-none">
        <input
          type="text"
          class="form-control"
          data-field="vsaldo"
          name="vDetalleCompra.vsaldo"
          value="0"
          readonly
        />
      </td>
      <td>
        <input
          type="text"
          class="form-control"
          data-field="vmonto"
          name="vDetalleCompra.vmonto"
          placeholder="0.00"
        />
        <div class="invalid-feedback">${this.translations.invalidMonto}</div>
      </td>
      <td class="text-end">
        <button type="button" class="btn btn-outline-danger btn-sm" data-action="remove">&times;</button>
      </td>
    `;

    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      row.remove();
      this.updateTotals();
    });

    this.detalleTableBody.appendChild(row);
    this.updateTotals();
  }

  goStep(index) {
    if (index < 0 || index >= this.steps.length) {
      return;
    }
    this.currentStep = index;
    this.steps.forEach((step, idx) => {
      step.classList.toggle('active', idx === index);
      step.style.display = idx === index ? 'block' : 'none';
    });
    this.stepBadges.forEach((badge, idx) => {
      badge.classList.toggle('active', idx === index);
    });

    const progress = (index / (this.steps.length - 1)) * 100;
    this.progressBar.style.width = `${progress}%`;

    this.prevBtn.disabled = index === 0;
    this.nextBtn.classList.toggle('d-none', index === this.steps.length - 1);
    this.facturarBtn.classList.toggle('d-none', index !== this.steps.length - 1);

    if (index === 1) {
      this.buildSummary();
    }
  }

  handleNext() {
    if (this.currentStep === 0) {
      const valid = this.validateStep1();
      if (!valid) {
        return;
      }
    }
    this.goStep(this.currentStep + 1);
  }

  async handleFacturar() {
    if (!this.validateStep2()) {
      return;
    }

    const payload = this.collectPayload();
    if (!payload) {
      return;
    }

    try {
      this.setLoading(true);
      this.clearAlerts();
      const response = await this.fetchJson('/api/facturar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response.message || 'Factura registrada.');
      this.resetForm();
    } catch (error) {
      this.showError(error.message || 'Error al facturar compra.');
    } finally {
      this.setLoading(false);
    }
  }

  validateStep1() {
    let valid = true;
    const proveedorInput = document.getElementById('vCodigo_provedor');
    const proveedorVal = proveedorInput.value.trim();
    const proveedorOk = this.proveedores.some((prov) => prov.codigo_provedor === proveedorVal);
    if (!proveedorOk) {
      this.markInvalid(proveedorInput);
      valid = false;
    }

    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    if (!rows.length) {
      this.showError(this.translations.noDetalle);
      return false;
    }

    rows.forEach((row) => {
      const productoInput = row.querySelector('[data-field="vcodigo_producto"]');
      const cantidadInput = row.querySelector('[data-field="vcantidad"]');
      const montoInput = row.querySelector('[data-field="vmonto"]');

      const productoVal = productoInput.value.trim();
      const productoOk = this.productos.some((prod) => prod.codigo_producto === productoVal);
      if (!productoOk) {
        this.markInvalid(productoInput);
        valid = false;
      }

      if (!this.decimalRegex.test(cantidadInput.value.trim()) || Number(cantidadInput.value) <= 0) {
        this.markInvalid(cantidadInput);
        valid = false;
      }

      if (!this.decimalRegex.test(montoInput.value.trim()) || Number(montoInput.value) <= 0) {
        this.markInvalid(montoInput);
        valid = false;
      }
    });

    if (!valid) {
      this.showError(this.translations.noDetalle);
    }
    return valid;
  }

  validateStep2() {
    const confirm = document.getElementById('confirmacion');
    if (!confirm.checked) {
      confirm.classList.add('is-invalid');
      this.showError(this.translations.confirmacionError);
      return false;
    }
    confirm.classList.remove('is-invalid');
    return true;
  }

  collectPayload() {
    const detalle = Array.from(this.detalleTableBody.querySelectorAll('tr')).map((row) => {
      return {
        codigo_producto: row.querySelector('[data-field="vcodigo_producto"]').value.trim(),
        cantidad: row.querySelector('[data-field="vcantidad"]').value.trim(),
        monto: row.querySelector('[data-field="vmonto"]').value.trim()
      };
    });

    return {
      tipo_documento_compra: document.getElementById('vTipo_documento_compra').value.trim(),
      num_documento_compra: document.getElementById('vNum_documento_compra').value.trim(),
      codigo_provedor: document.getElementById('vCodigo_provedor').value.trim(),
      fecha: document.getElementById('vFecha').value.trim(),
      total_compra: document.getElementById('vTotal_compra').value.trim(),
      detalle
    };
  }

  buildSummary() {
    const proveedor = document.getElementById('vCodigo_provedor').value.trim();
    const proveedorNombre = this.proveedores.find((prov) => prov.codigo_provedor === proveedor)?.nombre || proveedor;
    document.getElementById('summaryProveedor').textContent = proveedorNombre;
    document.getElementById('summaryDocumento').textContent = `${
      document.getElementById('vTipo_documento_compra').value
    }-${document.getElementById('vNum_documento_compra').value}`;
    document.getElementById('summaryFecha').textContent = document.getElementById('vFecha').value;
    document.getElementById('summaryTotal').textContent = document.getElementById('vTotal_compra').value;

    this.summaryTableBody.innerHTML = '';
    Array.from(this.detalleTableBody.querySelectorAll('tr')).forEach((row) => {
      const codigo = row.querySelector('[data-field="vcodigo_producto"]').value.trim();
      const nombre = this.productos.find((prod) => prod.codigo_producto === codigo)?.nombre || codigo;
      const cantidad = row.querySelector('[data-field="vcantidad"]').value.trim();
      const monto = row.querySelector('[data-field="vmonto"]').value.trim();
      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
        <td>${nombre}</td>
        <td>${cantidad}</td>
        <td>${monto}</td>
      `;
      this.summaryTableBody.appendChild(summaryRow);
    });
  }

  updateTotals() {
    let total = 0;
    Array.from(this.detalleTableBody.querySelectorAll('tr')).forEach((row) => {
      const montoInput = row.querySelector('[data-field="vmonto"]');
      const value = parseFloat(montoInput.value || '0');
      if (!Number.isNaN(value)) {
        total += value;
      }
    });
    document.getElementById('vTotal_compra').value = total.toFixed(2);
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

  markInvalid(input) {
    input.classList.add('is-invalid');
  }

  clearFieldError(input) {
    input.classList.remove('is-invalid');
  }

  showError(message) {
    if (!message) return;
    this.errorAlert.textContent = message;
    this.errorAlert.classList.remove('d-none');
    this.successAlert.classList.add('d-none');
  }

  showSuccess(message) {
    if (!message) return;
    this.successAlert.textContent = message;
    this.successAlert.classList.remove('d-none');
    this.errorAlert.classList.add('d-none');
  }

  clearAlerts() {
    this.errorAlert.classList.add('d-none');
    this.successAlert.classList.add('d-none');
  }

  setLoading(isLoading) {
    this.loadingState.classList.toggle('show', isLoading);
  }

  resetForm() {
    document.getElementById('compraForm').reset();
    this.detalleTableBody.innerHTML = '';
    document.getElementById('confirmacion').checked = false;
    this.loadInitialData();
    this.addDetalleRow();
    this.goStep(0);
  }

  async fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Error en la solicitud.');
    }
    return response.json();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
