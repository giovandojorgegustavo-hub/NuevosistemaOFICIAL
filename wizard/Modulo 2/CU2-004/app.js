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
    this.facturasTableBody = document.querySelector('#facturasTable tbody');
    this.detalleTableBody = document.querySelector('#detalleRemitoTable tbody');
    this.summaryTableBody = document.querySelector('#detalleRemitoSummary tbody');
    this.loadingState = document.getElementById('loadingState');
    this.facturas = [];
    this.bases = [];
    this.selectedFactura = null;
    this.decimalRegex = /^\d+(?:[.,]\d{1,2})?$/;
  }

  async init() {
    this.applyLocale();
    this.bindEvents();
    await this.loadInitialData();
    await this.loadFacturas();
    this.goStep(0);
  }

  applyLocale() {
    const lang = (navigator.language || 'es').toLowerCase();
    const locale = lang.startsWith('es') ? 'es' : 'en';
    const translations = {
      es: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Gestion de Compras - Remitos',
        subtitle: 'Orquesta remitos de compra con trazabilidad y validaciones en tiempo real.',
        status: 'Operativo',
        step1Title: '1. Seleccionar factura',
        step2Title: '2. Definir remito',
        step3Title: '3. Confirmar y registrar',
        facturasTitle: 'Facturas pendientes (FCC)',
        facturasHelp: 'Seleccione una factura para generar el remito.',
        colFecha: 'Fecha',
        colTipo: 'Tipo',
        colNumero: 'Numero',
        colProveedor: 'Proveedor',
        fecha: 'Fecha',
        tipoRemito: 'Tipo remito',
        numeroRemito: 'Numero remito',
        ordinalRemito: 'Ordinal base',
        base: 'Base destino',
        seleccione: 'Seleccione...',
        baseError: 'Seleccione una base.',
        detalleTitle: 'Detalle remito',
        detalleHelp: 'Defina cantidades a entregar.',
        colProducto: 'Producto',
        colDisponible: 'Disponible',
        colCantidad: 'Cantidad remito',
        step2Help: 'Ajuste las cantidades sin superar el disponible.',
        summaryTitle: 'Resumen del remito',
        factura: 'Factura',
        proveedor: 'Proveedor',
        remito: 'Remito',
        confirmacion: 'Confirmo que la informacion es correcta.',
        confirmacionError: 'Debe confirmar la operacion.',
        step3Help: 'Confirma para registrar el remito en el ERP.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Remito'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Purchasing Management - Remits',
        subtitle: 'Orchestrate purchase remits with real-time traceability and validations.',
        status: 'Operational',
        step1Title: '1. Select invoice',
        step2Title: '2. Define remit',
        step3Title: '3. Confirm & register',
        facturasTitle: 'Pending invoices (FCC)',
        facturasHelp: 'Select an invoice to generate the remit.',
        colFecha: 'Date',
        colTipo: 'Type',
        colNumero: 'Number',
        colProveedor: 'Supplier',
        fecha: 'Date',
        tipoRemito: 'Remit type',
        numeroRemito: 'Remit number',
        ordinalRemito: 'Base ordinal',
        base: 'Destination base',
        seleccione: 'Select...',
        baseError: 'Select a base.',
        detalleTitle: 'Remit details',
        detalleHelp: 'Define quantities to deliver.',
        colProducto: 'Product',
        colDisponible: 'Available',
        colCantidad: 'Remit quantity',
        step2Help: 'Adjust quantities without exceeding available.',
        summaryTitle: 'Remit summary',
        factura: 'Invoice',
        proveedor: 'Supplier',
        remito: 'Remit',
        confirmacion: 'I confirm the information is correct.',
        confirmacionError: 'You must confirm the operation.',
        step3Help: 'Confirm to register the remit in the ERP.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Remit'
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

    this.facturasTableBody.addEventListener('change', (event) => {
      if (event.target.matches('input[type="radio"]')) {
        const index = Number(event.target.value);
        this.selectedFactura = this.facturas[index] || null;
        this.clearAlerts();
      }
    });

    this.detalleTableBody.addEventListener('input', (event) => {
      if (event.target.matches('input')) {
        this.validateCantidadInput(event.target);
        this.updateSummary();
      }
    });

    document.getElementById('vCodigo_base').addEventListener('change', (event) => {
      this.clearFieldError(event.target);
      this.updateSummary();
    });
  }

  async loadInitialData() {
    try {
      const [now, bases] = await Promise.all([this.fetchJson('/api/now'), this.fetchJson('/api/bases')]);
      this.bases = bases;
      document.getElementById('vFecha').value = now.fecha;
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

  async loadFacturas() {
    try {
      const rows = await this.fetchJson('/api/facturas-pendientes');
      this.facturas = rows;
      this.renderFacturas();
    } catch (error) {
      this.showError(error.message || 'Error al cargar facturas.');
    }
  }

  renderFacturas() {
    this.facturasTableBody.innerHTML = '';
    if (!this.facturas.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="5" class="text-center text-muted">Sin facturas pendientes.</td>`;
      this.facturasTableBody.appendChild(emptyRow);
      return;
    }

    this.facturas.forEach((factura, index) => {
      const row = document.createElement('tr');
      const fecha = factura.fecha || factura.vfecha || '';
      const tipo = factura.tipo_documento_compra || factura.vtipo_documento_compra || '';
      const numero = factura.num_documento_compra || factura.vnum_documento_compra || '';
      const proveedor = factura.nombre_provedor || factura.vnombre_provedor || '';
      row.innerHTML = `
        <td>
          <input class="form-check-input" type="radio" name="factura" value="${index}" />
        </td>
        <td>${fecha}</td>
        <td>${tipo}</td>
        <td>${numero}</td>
        <td>${proveedor}</td>
      `;
      this.facturasTableBody.appendChild(row);
    });
  }

  async loadRemitoData() {
    if (!this.selectedFactura) return;
    this.detalleTableBody.innerHTML = '';
    const tipoOrigen = this.selectedFactura.tipo_documento_compra || this.selectedFactura.vtipo_documento_compra || '';
    const numOrigen = this.selectedFactura.num_documento_compra || this.selectedFactura.vnum_documento_compra || '';
    const codigoProveedor = this.selectedFactura.codigo_provedor || this.selectedFactura.vcodigo_provedor || '';

    try {
      const numData = await this.fetchJson('/api/next-numdocumento?tipo=RMP');
      const numRemito = numData.next;
      document.getElementById('vTipo_documento_compra_remito').value = 'RMP';
      document.getElementById('vNum_documento_compra_remito').value = numRemito;
      const ordinalData = await this.fetchJson(`/api/next-ordinal?tipo=RMP&num=${encodeURIComponent(numRemito)}`);
      document.getElementById('vOrdinal').value = ordinalData.next;

      const detalle = await this.fetchJson(
        `/api/detalle-compra?tipo=${encodeURIComponent(tipoOrigen)}&num=${encodeURIComponent(
          numOrigen
        )}&proveedor=${encodeURIComponent(codigoProveedor)}`
      );
      this.renderDetalle(detalle || []);
    } catch (error) {
      this.showError(error.message || 'Error al cargar detalle de remito.');
    }
  }

  renderDetalle(detalle) {
    this.detalleTableBody.innerHTML = '';
    if (!detalle.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="3" class="text-center text-muted">Sin detalles disponibles.</td>`;
      this.detalleTableBody.appendChild(emptyRow);
      return;
    }

    detalle.forEach((item) => {
      const nombre = item.nombre_producto || item.vnombre_producto || '';
      const cantidad = this.parseNumber(item.cantidad || item.vcantidad || 0);
      const entregada = this.parseNumber(item.cantidad_entregada || item.vcantidad_entregada || 0);
      const disponible = Math.max(0, cantidad - entregada);
      const row = document.createElement('tr');
      row.dataset.codigoProducto = item.codigo_producto || item.vcodigo_producto || '';
      row.dataset.ordinalCompra = item.ordinal || item.vordinal || item.vOrdinalCompra || '';
      row.dataset.disponible = disponible;
      row.innerHTML = `
        <td>${nombre}</td>
        <td>${this.formatNumber(disponible)}</td>
        <td>
          <input
            type="text"
            class="form-control"
            data-field="vCantidadDisponible"
            placeholder="0.00"
            value="${this.formatNumber(disponible)}"
          />
          <div class="invalid-feedback">Cantidad invalida.</div>
        </td>
      `;
      this.detalleTableBody.appendChild(row);
    });
  }

  handleNext() {
    if (this.currentStep === 0 && !this.validateStep1()) {
      return;
    }
    if (this.currentStep === 1 && !this.validateStep2()) {
      return;
    }
    if (this.currentStep === 1) {
      this.updateSummary();
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
      this.loadRemitoData();
    }
    if (step === 2) {
      this.updateSummary();
    }
    this.updateProgress();
  }

  updateProgress() {
    const percentage = ((this.currentStep + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${percentage}%`;
  }

  validateStep1() {
    this.clearAlerts();
    if (!this.selectedFactura) {
      this.showError('Debe seleccionar una factura pendiente.');
      return false;
    }
    return true;
  }

  validateStep2() {
    let valid = true;
    this.clearAlerts();
    const baseSelect = document.getElementById('vCodigo_base');
    if (!baseSelect.value) {
      baseSelect.classList.add('is-invalid');
      valid = false;
    }

    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    if (!rows.length) {
      this.showError('Debe cargar el detalle del remito.');
      return false;
    }

    let anyPositive = false;
    rows.forEach((row) => {
      const input = row.querySelector('[data-field="vCantidadDisponible"]');
      if (!input || !input.value || !this.decimalRegex.test(input.value)) {
        input.classList.add('is-invalid');
        valid = false;
        return;
      }
      const value = this.parseNumber(input.value);
      const disponible = this.parseNumber(row.dataset.disponible);
      if (Number.isNaN(value) || value < 0 || value > disponible) {
        input.classList.add('is-invalid');
        valid = false;
      }
      if (!Number.isNaN(value) && value > 0) {
        anyPositive = true;
      }
    });

    if (!anyPositive) {
      this.showError('Debe ingresar al menos una cantidad mayor a cero.');
      valid = false;
    } else if (!valid) {
      this.showError('Revise las cantidades del remito.');
    }

    return valid;
  }

  validateStep3() {
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
    if (!this.validateStep3()) {
      return;
    }
    this.setLoading(true);
    this.clearAlerts();
    try {
      const payload = this.collectPayload();
      const response = await this.fetchJson('/api/remitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response.message || 'Remito registrado correctamente.');
    } catch (error) {
      this.showError(error.message || 'Error al registrar el remito.');
    } finally {
      this.setLoading(false);
    }
  }

  collectPayload() {
    const detalles = Array.from(this.detalleTableBody.querySelectorAll('tr'))
      .map((row) => {
        const input = row.querySelector('[data-field="vCantidadDisponible"]');
        return {
          vcodigo_producto: row.dataset.codigoProducto,
          vOrdinalCompra: row.dataset.ordinalCompra,
          vCantidadDisponible: input ? input.value : '0'
        };
      })
      .filter((item) => this.parseNumber(item.vCantidadDisponible) > 0);

    return {
      vFecha: document.getElementById('vFecha').value,
      vTipo_documento_compra_remito: document.getElementById('vTipo_documento_compra_remito').value,
      vNum_documento_compra_remito: document.getElementById('vNum_documento_compra_remito').value,
      vCodigo_base: document.getElementById('vCodigo_base').value,
      vTipo_documento_compra_origen:
        this.selectedFactura?.tipo_documento_compra || this.selectedFactura?.vtipo_documento_compra || '',
      vNum_documento_compra_origen:
        this.selectedFactura?.num_documento_compra || this.selectedFactura?.vnum_documento_compra || '',
      vCodigo_provedor: this.selectedFactura?.codigo_provedor || this.selectedFactura?.vcodigo_provedor || '',
      vDetalleRemitoCompra: detalles
    };
  }

  updateSummary() {
    if (!this.selectedFactura) return;
    const facturaTipo = this.selectedFactura.tipo_documento_compra || this.selectedFactura.vtipo_documento_compra || '';
    const facturaNum = this.selectedFactura.num_documento_compra || this.selectedFactura.vnum_documento_compra || '';
    const proveedor = this.selectedFactura.nombre_provedor || this.selectedFactura.vnombre_provedor || '';
    const baseSelect = document.getElementById('vCodigo_base');
    const baseLabel = baseSelect.options[baseSelect.selectedIndex]?.textContent || '-';
    const remitoTipo = document.getElementById('vTipo_documento_compra_remito').value || '-';
    const remitoNum = document.getElementById('vNum_documento_compra_remito').value || '-';

    document.getElementById('summaryFactura').textContent = `${facturaTipo} ${facturaNum}`.trim();
    document.getElementById('summaryProveedor').textContent = proveedor || '-';
    document.getElementById('summaryRemito').textContent = `${remitoTipo} ${remitoNum}`.trim();
    document.getElementById('summaryBase').textContent = baseLabel;

    this.summaryTableBody.innerHTML = '';
    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    rows.forEach((row) => {
      const nombre = row.querySelector('td')?.textContent || '';
      const input = row.querySelector('[data-field="vCantidadDisponible"]');
      const cantidad = input ? input.value : '0';
      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
        <td>${nombre}</td>
        <td>${cantidad}</td>
      `;
      this.summaryTableBody.appendChild(summaryRow);
    });
  }

  validateCantidadInput(input) {
    if (!input.value) {
      input.classList.remove('is-invalid');
      return;
    }
    const row = input.closest('tr');
    const disponible = this.parseNumber(row?.dataset.disponible || 0);
    const value = this.parseNumber(input.value);
    if (!this.decimalRegex.test(input.value) || Number.isNaN(value) || value < 0 || value > disponible) {
      input.classList.add('is-invalid');
    } else {
      input.classList.remove('is-invalid');
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
