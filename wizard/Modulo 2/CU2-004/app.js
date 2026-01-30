/*
SPs de lectura y variables (campos con prefijo v)

vFacturasPendientes = Llamada SP: get_facturascompras_pendientes() (devuelve tipo_documento_compra, num_documento_compra, codigo_provedor, nombre_provedor, fecha)
Campos devueltos
vfecha = fecha
vtipo_documento_compra = tipo_documento_compra
vnum_documento_compra = num_documento_compra
vcodigo_provedor = codigo_provedor
vnombre_provedor = nombre_provedor
Variables
vfecha: visible / no editable
vtipo_documento_compra: visible / no editable
vnum_documento_compra: visible / no editable
vcodigo_provedor: no visible / no editable
vnombre_provedor: visible / no editable

vDetalleRemitoCompra = Llamada SP: get_detalle_compra_por_documento(vTipo_documento_compra_origen, vNum_documento_compra_origen, vCodigo_provedor) (devuelve ordinal, codigo_producto, nombre_producto, cantidad, cantidad_entregada, saldo)
Campos devueltos
vOrdinalCompra = ordinal
vcodigo_producto = codigo_producto
vnombre_producto = nombre_producto
vCantidad = cantidad
vCantidadEntregada = cantidad_entregada
vSaldo = saldo
Variables
vnombre_producto: visible / no editable
vCantidadDisponible: visible / editable
vcodigo_producto: no visible / no editable
vOrdinalCompra: no visible / no editable
*/

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
    this.facturasBody = document.querySelector('#facturasTable tbody');
    this.detalleBody = document.querySelector('#detalleRemitoTable tbody');
    this.summaryBody = document.querySelector('#detalleRemitoSummary tbody');
    this.refreshFacturas = document.getElementById('refreshFacturas');
    this.emptyFacturas = document.getElementById('emptyFacturas');

    this.vFecha = document.getElementById('vfecha');
    this.vTipoRemito = document.getElementById('vTipo_documento_compra_remito');
    this.vNumRemito = document.getElementById('vNum_documento_compra_remito');
    this.vOrdinal = document.getElementById('vOrdinal');
    this.vBaseNombre = document.getElementById('vCodigo_base_nombre');
    this.vBaseCodigo = document.getElementById('vCodigo_base');

    this.facturaSummary = document.getElementById('facturaSummary');

    this.summaryFecha = document.getElementById('summaryFecha');
    this.summaryNumero = document.getElementById('summaryNumero');
    this.summaryBase = document.getElementById('summaryBase');
    this.summaryFactura = document.getElementById('summaryFactura');

    this.confirmacion = document.getElementById('confirmacion');

    this.facturas = [];
    this.bases = [];
    this.selectedFactura = null;
    this.detalleItems = [];

    this.decimalRegex = /^\d+(?:\.\d{1,2})?$/;
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
        title: 'Gestion Compras',
        subtitle: 'Gestiona remitos de compra con trazabilidad completa y sincronizacion inmediata.',
        status: 'Operativo',
        step1Title: '1. Factura pendiente',
        step2Title: '2. Definir remito',
        step3Title: '3. Confirmar registro',
        facturasTitle: 'Facturas de compra pendientes',
        facturasHelp: 'Seleccione una factura FCC con items pendientes para generar el remito de compra.',
        refresh: 'Actualizar',
        colSelect: 'Seleccionar',
        colFecha: 'Fecha',
        colTipo: 'Tipo',
        colNumero: 'Numero',
        colProveedor: 'Proveedor',
        facturasEmpty: 'No hay facturas pendientes disponibles.',
        fecha: 'Fecha remito',
        tipoRemito: 'Tipo remito',
        numeroRemito: 'Numero remito',
        ordinal: 'Ordinal inicial',
        base: 'Base destino',
        baseError: 'Seleccione una base valida.',
        facturaSeleccionada: 'Factura seleccionada',
        detalleTitle: 'Detalle remito de compra',
        colProducto: 'Producto',
        colCantidad: 'Cantidad a entregar',
        detalleHelp: 'Ajuste la cantidad a entregar, sin superar el saldo pendiente de cada item.',
        summaryTitle: 'Resumen del remito',
        factura: 'Factura',
        confirmacion: 'Confirmo que la informacion es correcta.',
        confirmacionError: 'Debe confirmar la operacion.',
        step3Help: 'Confirme para registrar el remito y actualizar el stock.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Remito',
        loading: 'Procesando...'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Purchasing Management',
        subtitle: 'Manage purchase delivery notes with full traceability and real-time sync.',
        status: 'Operational',
        step1Title: '1. Pending invoice',
        step2Title: '2. Define delivery note',
        step3Title: '3. Confirm registration',
        facturasTitle: 'Pending purchase invoices',
        facturasHelp: 'Select an FCC invoice with pending items to generate the delivery note.',
        refresh: 'Refresh',
        colSelect: 'Select',
        colFecha: 'Date',
        colTipo: 'Type',
        colNumero: 'Number',
        colProveedor: 'Supplier',
        facturasEmpty: 'No pending invoices available.',
        fecha: 'Delivery note date',
        tipoRemito: 'Delivery note type',
        numeroRemito: 'Delivery note number',
        ordinal: 'Starting ordinal',
        base: 'Destination base',
        baseError: 'Select a valid base.',
        facturaSeleccionada: 'Selected invoice',
        detalleTitle: 'Delivery note detail',
        colProducto: 'Product',
        colCantidad: 'Quantity to deliver',
        detalleHelp: 'Adjust the quantity to deliver without exceeding the pending balance.',
        summaryTitle: 'Delivery note summary',
        factura: 'Invoice',
        confirmacion: 'I confirm the information is correct.',
        confirmacionError: 'You must confirm the operation.',
        step3Help: 'Confirm to register the delivery note and update stock.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Delivery Note',
        loading: 'Processing...'
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
    this.refreshFacturas.addEventListener('click', () => this.loadFacturas());

    this.facturasBody.addEventListener('click', (event) => {
      const row = event.target.closest('tr');
      if (!row) return;
      const idx = Number(row.dataset.index);
      if (!Number.isFinite(idx)) return;
      this.selectFactura(idx);
    });

    this.vBaseNombre.addEventListener('input', () => this.handleBaseInput());
    this.vBaseNombre.addEventListener('blur', () => this.handleBaseInput(true));

    this.detalleBody.addEventListener('input', (event) => {
      if (event.target.matches('input[data-field="vCantidadDisponible"]')) {
        this.clearFieldError(event.target);
        this.validateCantidad(event.target);
      }
    });

    this.confirmacion.addEventListener('change', (event) => {
      if (event.target.checked) {
        event.target.classList.remove('is-invalid');
      }
    });
  }

  async loadInitialData() {
    try {
      this.setLoading(true);
      const [now, bases, remitoNum] = await Promise.all([
        this.fetchJson('/api/now'),
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/remito/next-num')
      ]);

      this.bases = bases;
      this.populateBases();

      this.vFecha.value = now.fecha;
      this.vTipoRemito.value = 'REM';
      this.vNumRemito.value = remitoNum.next;

      const ordinal = await this.fetchJson(`/api/remito/next-ordinal?num=${remitoNum.next}`);
      this.vOrdinal.value = ordinal.next;

      await this.loadFacturas();
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    } finally {
      this.setLoading(false);
    }
  }

  async loadFacturas() {
    try {
      this.setLoading(true);
      const facturas = await this.fetchJson('/api/facturas-pendientes');
      this.facturas = facturas;
      this.renderFacturas();
    } catch (error) {
      this.showError(error.message || 'Error al cargar facturas pendientes.');
    } finally {
      this.setLoading(false);
    }
  }

  populateBases() {
    const datalist = document.getElementById('basesList');
    datalist.innerHTML = '';
    this.bases.forEach((base) => {
      const option = document.createElement('option');
      const name = base.nombre || base.nombre_base || base.descripcion || base.codigo_base;
      option.value = name;
      option.dataset.codigo = base.codigo_base || base.codigo || base.id || '';
      datalist.appendChild(option);
    });
  }

  handleBaseInput(forceValidate = false) {
    const value = this.vBaseNombre.value.trim();
    if (!value) {
      this.vBaseCodigo.value = '';
      if (forceValidate) {
        this.markFieldInvalid(this.vBaseNombre);
      }
      return;
    }

    const match = this.bases.find((base) => {
      const nombre = (base.nombre || base.nombre_base || base.descripcion || '').toLowerCase();
      const codigo = String(base.codigo_base || base.codigo || base.id || '').toLowerCase();
      return nombre === value.toLowerCase() || codigo === value.toLowerCase();
    });

    if (match) {
      const codigo = match.codigo_base || match.codigo || match.id || '';
      const nombre = match.nombre || match.nombre_base || match.descripcion || codigo;
      this.vBaseCodigo.value = codigo;
      if (value !== nombre) {
        this.vBaseNombre.value = nombre;
      }
      this.clearFieldError(this.vBaseNombre);
    } else if (forceValidate) {
      this.vBaseCodigo.value = '';
      this.markFieldInvalid(this.vBaseNombre);
    }
  }

  renderFacturas() {
    this.facturasBody.innerHTML = '';
    if (!this.facturas.length) {
      this.emptyFacturas.classList.remove('d-none');
      return;
    }
    this.emptyFacturas.classList.add('d-none');
    this.facturas.forEach((factura, index) => {
      const row = document.createElement('tr');
      row.dataset.index = index;
      const isSelected =
        this.selectedFactura && this.selectedFactura.num_documento_compra === factura.num_documento_compra;
      row.innerHTML = `
        <td>
          <input class="form-check-input" type="radio" name="facturaSelect" ${isSelected ? 'checked' : ''} />
        </td>
        <td>${factura.fecha || '-'}</td>
        <td>${factura.tipo_documento_compra || '-'}</td>
        <td>${factura.num_documento_compra || '-'}</td>
        <td>${factura.nombre_provedor || '-'} </td>
      `;
      if (isSelected) {
        row.classList.add('selected');
      }
      this.facturasBody.appendChild(row);
    });
  }

  selectFactura(index) {
    this.selectedFactura = this.facturas[index];
    this.renderFacturas();
    this.updateFacturaSummary();
  }

  updateFacturaSummary() {
    if (!this.selectedFactura) {
      this.facturaSummary.textContent = '-';
      return;
    }
    const factura = this.selectedFactura;
    const label = `${factura.tipo_documento_compra} ${factura.num_documento_compra} - ${factura.nombre_provedor}`;
    this.facturaSummary.textContent = label;
  }

  async handleNext() {
    if (this.currentStep === 0) {
      if (!this.selectedFactura) {
        this.showError('Seleccione una factura pendiente para continuar.');
        return;
      }
      await this.loadDetalleRemito();
      this.goStep(1);
      return;
    }

    if (this.currentStep === 1) {
      if (!this.validateStep2()) {
        return;
      }
      this.buildSummary();
      this.goStep(2);
    }
  }

  async loadDetalleRemito() {
    if (!this.selectedFactura) return;
    try {
      this.setLoading(true);
      const { tipo_documento_compra, num_documento_compra, codigo_provedor } = this.selectedFactura;
      const detalle = await this.fetchJson(
        `/api/detalle-compra?tipo=${encodeURIComponent(tipo_documento_compra)}&num=${encodeURIComponent(
          num_documento_compra
        )}&proveedor=${encodeURIComponent(codigo_provedor)}`
      );

      this.detalleItems = detalle.map((item) => {
        const cantidad = Number(item.cantidad || 0);
        const entregada = Number(item.cantidad_entregada || 0);
        const disponible = Math.max(cantidad - entregada, 0);
        return {
          vnombre_producto: item.nombre_producto,
          vcodigo_producto: item.codigo_producto,
          vOrdinalCompra: item.ordinal,
          vCantidadDisponible: disponible,
          vCantidadMax: disponible
        };
      });

      this.renderDetalle();
      this.updateFacturaSummary();
    } catch (error) {
      this.showError(error.message || 'Error al cargar detalle de compra.');
    } finally {
      this.setLoading(false);
    }
  }

  renderDetalle() {
    this.detalleBody.innerHTML = '';
    this.detalleItems.forEach((item, index) => {
      const row = document.createElement('tr');
      row.dataset.index = index;
      row.innerHTML = `
        <td>${item.vnombre_producto}</td>
        <td>
          <input
            type="text"
            class="form-control"
            data-field="vCantidadDisponible"
            value="${item.vCantidadDisponible}"
            data-max="${item.vCantidadMax}"
          />
          <div class="invalid-feedback">Cantidad invalida.</div>
        </td>
      `;
      this.detalleBody.appendChild(row);
    });
  }

  validateStep2() {
    let valid = true;
    this.handleBaseInput(true);
    if (!this.vBaseCodigo.value) {
      valid = false;
    }

    if (!this.detalleItems.length) {
      this.showError('No hay detalle de remito disponible.');
      return false;
    }

    this.detalleBody.querySelectorAll('input[data-field="vCantidadDisponible"]').forEach((input) => {
      if (!this.validateCantidad(input)) {
        valid = false;
      }
    });

    if (!valid) {
      this.showError('Verifique los datos del remito antes de continuar.');
    }

    return valid;
  }

  validateCantidad(input) {
    const value = input.value.trim();
    const max = Number(input.dataset.max || 0);
    const numeric = Number(value);
    if (!value || !this.decimalRegex.test(value) || Number.isNaN(numeric) || numeric < 0 || numeric > max) {
      this.markFieldInvalid(input);
      return false;
    }
    this.clearFieldError(input);
    return true;
  }

  buildSummary() {
    const base = this.resolveBase();
    this.summaryFecha.textContent = this.vFecha.value || '-';
    this.summaryNumero.textContent = this.vNumRemito.value || '-';
    this.summaryBase.textContent = base ? `${base.nombre} (${base.codigo})` : '-';
    if (this.selectedFactura) {
      this.summaryFactura.textContent = `${this.selectedFactura.tipo_documento_compra} ${
        this.selectedFactura.num_documento_compra
      }`;
    }

    this.summaryBody.innerHTML = '';
    this.detalleBody.querySelectorAll('tr').forEach((row, idx) => {
      const input = row.querySelector('input[data-field="vCantidadDisponible"]');
      const cantidad = input ? input.value : '0';
      const item = this.detalleItems[idx];
      if (!item) return;
      const summaryRow = document.createElement('tr');
      summaryRow.innerHTML = `
        <td>${item.vnombre_producto}</td>
        <td>${cantidad}</td>
      `;
      this.summaryBody.appendChild(summaryRow);
    });
  }

  resolveBase() {
    const code = this.vBaseCodigo.value;
    const match = this.bases.find((base) => String(base.codigo_base || base.codigo || base.id) === String(code));
    if (!match) return null;
    return {
      codigo: match.codigo_base || match.codigo || match.id,
      nombre: match.nombre || match.nombre_base || match.descripcion || code
    };
  }

  async handleRegistrar() {
    if (!this.confirmacion.checked) {
      this.confirmacion.classList.add('is-invalid');
      return;
    }

    const base = this.resolveBase();
    if (!base || !this.selectedFactura) {
      this.showError('Falta informacion para registrar el remito.');
      return;
    }

    const detalle = this.detalleBody.querySelectorAll('tr');
    const detallePayload = [];
    detalle.forEach((row, idx) => {
      const input = row.querySelector('input[data-field="vCantidadDisponible"]');
      const cantidad = input ? Number(input.value) : 0;
      const item = this.detalleItems[idx];
      if (item && cantidad > 0) {
        detallePayload.push({
          vcodigo_producto: item.vcodigo_producto,
          vCantidadDisponible: cantidad,
          vOrdinalCompra: item.vOrdinalCompra,
          vnombre_producto: item.vnombre_producto
        });
      }
    });

    if (!detallePayload.length) {
      this.showError('Debe ingresar al menos una linea con cantidad mayor a cero.');
      return;
    }

    const payload = {
      vTipo_documento_compra_remito: 'REM',
      vNum_documento_compra_remito: this.vNumRemito.value,
      vFecha: this.vFecha.value,
      vCodigo_base: base.codigo,
      vTipo_documento_compra_origen: this.selectedFactura.tipo_documento_compra,
      vNum_documento_compra_origen: this.selectedFactura.num_documento_compra,
      vCodigo_provedor: this.selectedFactura.codigo_provedor,
      vDetalleRemitoCompra: detallePayload
    };

    try {
      this.setLoading(true);
      const response = await this.fetchJson('/api/registrar-remito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showSuccess(response.message || 'Remito registrado correctamente.');
      this.resetWizard();
    } catch (error) {
      this.showError(error.message || 'Error al registrar el remito.');
    } finally {
      this.setLoading(false);
    }
  }

  resetWizard() {
    this.confirmacion.checked = false;
    this.selectedFactura = null;
    this.detalleItems = [];
    this.facturaSummary.textContent = '-';
    this.detalleBody.innerHTML = '';
    this.summaryBody.innerHTML = '';
    this.goStep(0);
    this.loadInitialData();
  }

  goStep(step) {
    if (step < 0 || step >= this.steps.length) return;
    this.currentStep = step;
    this.steps.forEach((el, idx) => {
      el.classList.toggle('active', idx === step);
    });
    this.stepBadges.forEach((badge, idx) => {
      badge.classList.toggle('active', idx === step);
    });
    const progress = (step / (this.steps.length - 1)) * 100;
    this.progressBar.style.width = `${progress}%`;

    this.prevBtn.disabled = step === 0;
    this.nextBtn.classList.toggle('d-none', step === this.steps.length - 1);
    this.registrarBtn.classList.toggle('d-none', step !== this.steps.length - 1);
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

  markFieldInvalid(field) {
    field.classList.add('is-invalid');
  }

  setLoading(state) {
    this.loadingState.classList.toggle('d-none', !state);
    this.prevBtn.disabled = state;
    this.nextBtn.disabled = state;
    this.registrarBtn.disabled = state;
  }

  async fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Error en la solicitud.');
    }
    return response.json();
  }
}

const wizard = new FormWizard();
wizard.init();
