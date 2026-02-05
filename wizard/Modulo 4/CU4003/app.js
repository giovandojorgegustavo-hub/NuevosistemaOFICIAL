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
    this.facturaCount = document.getElementById('facturaCount');
    this.facturaSearch = document.getElementById('facturaSearch');
    this.detalleTableBody = document.querySelector('#detalleRemitoTable tbody');
    this.summaryTableBody = document.querySelector('#detalleRemitoSummary tbody');
    this.loadingState = document.getElementById('loadingState');
    this.baseInput = document.getElementById('vCodigo_base_label');
    this.baseHidden = document.getElementById('vCodigo_base');
    this.baseError = document.getElementById('baseError');
    this.basesList = document.getElementById('basesList');
    this.decimalRegex = /^\d+(?:[.,]\d{1,2})?$/;
    this.facturas = [];
    this.bases = [];
    this.facturaSeleccionada = null;
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
        title: 'Gestion de Compras - Remitos',
        subtitle: 'Orquesta remitos de compra con visibilidad total y actualizacion en tiempo real.',
        status: 'Operativo',
        step1Title: '1. Seleccionar Factura',
        step2Title: '2. Definir Remito',
        step3Title: '3. Confirmar y registrar',
        buscarFactura: 'Buscar factura',
        colFecha: 'Fecha',
        colTipo: 'Tipo doc.',
        colNumero: 'Numero doc.',
        colProveedor: 'Proveedor',
        step1Help: 'Selecciona una factura FCC pendiente con items sin entregar para continuar.',
        fecha: 'Fecha',
        tipoRemito: 'Tipo documento',
        numRemito: 'Numero documento',
        ordinalRemito: 'Ordinal',
        base: 'Base destino',
        baseHint: 'Escribe para filtrar la base.',
        baseError: 'Seleccione una base valida.',
        detalleRemito: 'Detalle Remito',
        colProducto: 'Producto',
        colDisponible: 'Cantidad disponible',
        colEntregar: 'Cantidad a entregar',
        step2Help: 'Ajusta las cantidades a remitir. No puede superar la cantidad disponible.',
        summaryTitle: 'Resumen del remito',
        proveedor: 'Proveedor',
        confirmacion: 'Confirmo que la informacion es correcta.',
        confirmacionError: 'Debe confirmar la operacion.',
        step3Help: 'Al confirmar, se registrara el remito en el ERP.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Remito'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Purchases - Delivery Notes',
        subtitle: 'Orchestrate purchase delivery notes with full visibility and real-time updates.',
        status: 'Operational',
        step1Title: '1. Select Invoice',
        step2Title: '2. Define Delivery Note',
        step3Title: '3. Confirm and register',
        buscarFactura: 'Search invoice',
        colFecha: 'Date',
        colTipo: 'Doc type',
        colNumero: 'Doc number',
        colProveedor: 'Supplier',
        step1Help: 'Select a pending FCC invoice with items not fully delivered.',
        fecha: 'Date',
        tipoRemito: 'Document type',
        numRemito: 'Document number',
        ordinalRemito: 'Ordinal',
        base: 'Destination base',
        baseHint: 'Type to filter bases.',
        baseError: 'Select a valid base.',
        detalleRemito: 'Delivery note details',
        colProducto: 'Product',
        colDisponible: 'Available quantity',
        colEntregar: 'Quantity to deliver',
        step2Help: 'Adjust quantities to deliver. Cannot exceed the available quantity.',
        summaryTitle: 'Delivery note summary',
        proveedor: 'Supplier',
        confirmacion: 'I confirm the information is correct.',
        confirmacionError: 'You must confirm the operation.',
        step3Help: 'Upon confirmation, the delivery note will be registered in the ERP.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Delivery Note'
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

    this.facturaSearch.addEventListener('input', (event) => {
      this.filterFacturas(event.target.value);
    });

    this.baseInput.addEventListener('input', () => {
      this.syncBaseSelection();
      this.clearFieldError(this.baseInput);
    });

    this.detalleTableBody.addEventListener('input', (event) => {
      if (event.target.matches('input[data-field="vCantidadDisponible"]')) {
        this.handleCantidadInput(event.target);
      }
    });
  }

  async loadInitialData() {
    this.setLoading(true);
    try {
      const [facturas, bases, nextNum] = await Promise.all([
        this.fetchJson('/api/facturas-pendientes'),
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/next-numdocumento?tipo=REM')
      ]);

      this.facturas = facturas || [];
      this.bases = bases || [];
      this.renderFacturas(this.facturas);
      this.renderBases(this.bases);

      document.getElementById('vTipo_documento_compra_remito').value = 'REM';
      document.getElementById('vNum_documento_compra_remito').value = nextNum.next || 1;
      const ordinal = await this.fetchJson(`/api/next-ordinal?tipo=REM&num=${nextNum.next || 1}`);
      document.getElementById('vOrdinal').value = ordinal.next || 1;
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    } finally {
      this.setLoading(false);
    }
  }

  renderFacturas(facturas) {
    this.facturasTableBody.innerHTML = '';
    facturas.forEach((factura, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <input class="form-check-input" type="radio" name="facturaSeleccion" value="${index}" />
        </td>
        <td>${factura.fecha || '-'}</td>
        <td>${factura.tipo_documento_compra || '-'}</td>
        <td>${factura.num_documento_compra || '-'}</td>
        <td>${factura.nombre_provedor || '-'}</td>
      `;

      row.addEventListener('click', () => {
        const radio = row.querySelector('input[type="radio"]');
        radio.checked = true;
        this.handleFacturaSelect(index);
      });

      row.querySelector('input[type="radio"]').addEventListener('change', () => {
        this.handleFacturaSelect(index);
      });

      this.facturasTableBody.appendChild(row);
    });

    const label = this.locale === 'en' ? 'invoices' : 'facturas';
    this.facturaCount.textContent = `${facturas.length} ${label}`;
  }

  filterFacturas(query) {
    const value = (query || '').toLowerCase();
    const rows = Array.from(this.facturasTableBody.querySelectorAll('tr'));
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.classList.toggle('d-none', value && !text.includes(value));
    });
  }

  async handleFacturaSelect(index) {
    this.clearAlerts();
    const selected = this.facturas[index];
    if (!selected) return;

    this.facturaSeleccionada = {
      vTipo_documento_compra_origen: selected.tipo_documento_compra,
      vNum_documento_compra_origen: selected.num_documento_compra,
      vCodigo_provedor: selected.codigo_provedor,
      vNombre_provedor: selected.nombre_provedor,
      vfecha: selected.fecha
    };

    Array.from(this.facturasTableBody.querySelectorAll('tr')).forEach((row) => {
      row.classList.remove('selected');
    });
    const selectedRow = this.facturasTableBody.querySelectorAll('tr')[index];
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }

    document.getElementById('vfecha').value = this.formatDateInput(selected.fecha);

    await this.loadDetalleRemito();
  }

  async loadDetalleRemito() {
    if (!this.facturaSeleccionada) return;
    this.detalleTableBody.innerHTML = '';
    try {
      const params = new URLSearchParams({
        tipo: this.facturaSeleccionada.vTipo_documento_compra_origen,
        num: this.facturaSeleccionada.vNum_documento_compra_origen,
        prov: this.facturaSeleccionada.vCodigo_provedor
      });
      const detalles = await this.fetchJson(`/api/detalle-compra?${params.toString()}`);
      detalles.forEach((item) => {
        const disponible = this.parseNumber(item.cantidad) - this.parseNumber(item.cantidad_entregada || 0);
        const disponibleValue = disponible > 0 ? disponible : 0;
        if (disponibleValue <= 0) {
          return;
        }
        const row = document.createElement('tr');
        row.dataset.codigoProducto = item.codigo_producto;
        row.dataset.ordinalCompra = item.ordinal;
        row.dataset.nombreProducto = item.nombre_producto;
        row.dataset.disponible = disponibleValue;
        row.innerHTML = `
          <td>${item.nombre_producto || '-'}</td>
          <td>${this.formatNumber(disponibleValue)}</td>
          <td>
            <input
              type="text"
              class="form-control"
              data-field="vCantidadDisponible"
              value="${this.formatNumber(disponibleValue)}"
            />
            <div class="invalid-feedback">Cantidad invalida.</div>
          </td>
        `;
        this.detalleTableBody.appendChild(row);
      });
    } catch (error) {
      this.showError(error.message || 'Error al cargar detalle de compra.');
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

  handleCantidadInput(input) {
    const row = input.closest('tr');
    if (!row) return;
    const disponible = this.parseNumber(row.dataset.disponible);
    const value = input.value;

    if (!value) {
      input.classList.remove('is-invalid');
      return;
    }

    if (!this.decimalRegex.test(value)) {
      input.classList.add('is-invalid');
      return;
    }

    const numeric = this.parseNumber(value);
    if (Number.isNaN(numeric) || numeric < 0 || numeric > disponible) {
      input.classList.add('is-invalid');
      if (numeric > disponible) {
        input.value = this.formatNumber(disponible);
      }
      return;
    }

    input.classList.remove('is-invalid');
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
    if (!this.facturaSeleccionada) {
      this.showError('Debe seleccionar una factura.');
      return false;
    }
    return true;
  }

  validateStep2() {
    this.clearAlerts();
    this.syncBaseSelection();
    let valid = true;

    if (!this.baseHidden.value) {
      this.baseInput.classList.add('is-invalid');
      valid = false;
    } else {
      this.baseInput.classList.remove('is-invalid');
    }

    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    if (!rows.length) {
      this.showError('No hay detalle de compra disponible.');
      return false;
    }

    rows.forEach((row) => {
      const input = row.querySelector('input[data-field="vCantidadDisponible"]');
      const disponible = this.parseNumber(row.dataset.disponible);
      const value = input.value;
      const numeric = this.parseNumber(value);

      if (!value || !this.decimalRegex.test(value) || Number.isNaN(numeric) || numeric <= 0 || numeric > disponible) {
        input.classList.add('is-invalid');
        valid = false;
      } else {
        input.classList.remove('is-invalid');
      }
    });

    if (!valid) {
      this.showError('Revise las cantidades del remito y la base destino.');
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
      const response = await this.fetchJson('/api/remito', {
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
    const detalles = Array.from(this.detalleTableBody.querySelectorAll('tr')).map((row) => {
      const input = row.querySelector('input[data-field="vCantidadDisponible"]');
      return {
        vcodigo_producto: row.dataset.codigoProducto,
        vOrdinalCompra: row.dataset.ordinalCompra,
        vCantidadDisponible: this.normalizeNumberString(input.value)
      };
    });

    return {
      vfecha: document.getElementById('vfecha').value,
      vTipo_documento_compra_remito: document.getElementById('vTipo_documento_compra_remito').value,
      vNum_documento_compra_remito: document.getElementById('vNum_documento_compra_remito').value,
      vOrdinal: document.getElementById('vOrdinal').value,
      vCodigo_base: this.baseHidden.value,
      vTipo_documento_compra_origen: this.facturaSeleccionada?.vTipo_documento_compra_origen || '',
      vNum_documento_compra_origen: this.facturaSeleccionada?.vNum_documento_compra_origen || '',
      vCodigo_provedor: this.facturaSeleccionada?.vCodigo_provedor || '',
      vDetalleRemitoCompra: detalles
    };
  }

  updateSummary() {
    const baseLabel = this.baseInput.value || '-';
    document.getElementById('summaryFecha').textContent = document.getElementById('vfecha').value || '-';
    document.getElementById('summaryNumero').textContent =
      document.getElementById('vNum_documento_compra_remito').value || '-';
    document.getElementById('summaryBase').textContent = baseLabel;
    document.getElementById('summaryProveedor').textContent = this.facturaSeleccionada?.vNombre_provedor || '-';

    this.summaryTableBody.innerHTML = '';
    const rows = Array.from(this.detalleTableBody.querySelectorAll('tr'));
    rows.forEach((row) => {
      const cantidad = row.querySelector('input[data-field="vCantidadDisponible"]').value || '0';
      if (!cantidad) return;
      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
        <td>${row.dataset.nombreProducto || '-'}</td>
        <td>${cantidad}</td>
      `;
      this.summaryTableBody.appendChild(summaryRow);
    });
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

  normalizeNumberString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().replace(',', '.');
  }

  formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    return Number(value).toFixed(2);
  }

  formatDateInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

const wizard = new FormWizard();
wizard.init();
