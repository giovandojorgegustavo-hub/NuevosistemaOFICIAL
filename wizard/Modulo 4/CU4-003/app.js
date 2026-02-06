/*
SPs de lectura y campos devueltos
vFacturasPendientes = Llamada SP: get_facturascompras_pendientes() (devuelve campo_visible)
Campos devueltos
vtipo_documento_compra
vnum_documento_compra
vcodigo_provedor
vnombre_provedor
vfecha
Variables
vtipo_documento_compra visible no editable
vnum_documento_compra visible no editable
vcodigo_provedor no visible no editable
vnombre_provedor visible no editable
vfecha visible no editable

vBases = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
vcodigo_base
vnombre
vlatitud
vlongitud
Variables
vCodigo_base no visible editable
vBaseNombre visible editable

vDetalleRemitoCompra = Llamada SP: get_detalle_compra_por_documento(p_tipo_documento_compra, p_num_documento_compra, p_codigo_provedor) (devuelve campo_visible)
Campos devueltos
vordinal
vcodigo_producto
vnombre_producto
vcantidad
vcantidad_entregada
vsaldo
Variables
vOrdinalCompra no visible no editable
vcodigo_producto no visible no editable
vnombre_producto visible no editable
vCantidadDisponible visible editable
*/

class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progressBar = document.querySelector('.progress-bar');
    this.stepLabel = document.getElementById('stepLabel');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.confirmBtn = document.getElementById('confirmBtn');
    this.confirmCheck = document.getElementById('confirmCheck');
    this.resetBtn = document.getElementById('resetBtn');
    this.alertBox = document.getElementById('alertBox');
    this.loadingOverlay = document.getElementById('loadingOverlay');

    this.facturasTableBody = document.querySelector('#facturasTable tbody');
    this.detalleTableBody = document.querySelector('#detalleTable tbody');
    this.confirmTableBody = document.querySelector('#confirmTable tbody');

    this.baseInput = document.getElementById('baseInput');
    this.baseList = document.getElementById('baseList');

    this.facturaResumen = document.getElementById('facturaResumen');
    this.baseResumen = document.getElementById('baseResumen');
    this.remitoResumen = document.getElementById('remitoResumen');

    this.state = {
      step: 0,
      facturas: [],
      bases: [],
      selectedFactura: null,
      selectedBase: null,
      detalle: [],
      remito: {
        tipo: 'REM',
        numero: ''
      }
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.applyLanguage();
    this.updateStep();
    this.loadInitialData();
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.confirmBtn.addEventListener('click', () => this.confirm());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.confirmCheck.addEventListener('change', () => {
      this.confirmBtn.disabled = !this.confirmCheck.checked;
    });

    this.baseInput.addEventListener('input', (event) => this.filterBases(event.target.value));
    this.baseInput.addEventListener('focus', (event) => this.filterBases(event.target.value));
    document.addEventListener('click', (event) => {
      if (!this.baseList.contains(event.target) && event.target !== this.baseInput) {
        this.baseList.style.display = 'none';
      }
    });
  }

  applyLanguage() {
    const lang = (navigator.language || 'es').toLowerCase();
    const locale = lang.startsWith('es') ? 'es' : 'en';
    this.state.locale = locale;
    const dict = {
      es: {
        eyebrow: 'Operaciones globales IaaS y PaaS',
        title: 'Gestion Compras',
        subtitle: 'Flujo integral para registrar remitos de compra con control de entregas.',
        wizardTitle: 'Registro Multi-Paso',
        wizardSubtitle: 'Seleccione la factura, defina el remito y confirme la operacion.',
        step1Title: 'Seleccionar Factura de Compra Pendiente',
        step1Desc: 'Elija una factura tipo FCC con entregas pendientes.',
        step2Title: 'Definir Remito de Compra',
        step2Desc: 'Configure la base destino y las cantidades a recibir.',
        step3Title: 'Confirmar y Registrar Remito',
        step3Desc: 'Revise la informacion antes de registrar.',
        thTipo: 'Tipo',
        thNumero: 'Numero',
        thProveedor: 'Proveedor',
        thFecha: 'Fecha',
        thProducto: 'Producto',
        thCantidad: 'Cantidad Disponible',
        thIngresar: 'Cantidad a Recibir',
        thSaldo: 'Saldo',
        lblTipoRemito: 'Tipo Documento Remito',
        lblNumRemito: 'Numero Remito',
        lblBase: 'Base destino',
        basePlaceholder: 'Buscar base',
        baseHelp: 'Escriba para filtrar miles de registros.',
        detalleTitle: 'Detalle de Remito',
        summaryFactura: 'Factura Seleccionada',
        summaryBase: 'Base Destino',
        summaryRemito: 'Remito',
        prev: 'Anterior',
        next: 'Siguiente',
        confirm: 'Registrar Remito',
        confirmRequired: 'Debes confirmar que los datos son correctos.',
        reset: 'Limpiar',
        loading: 'Procesando...',
        stepLabel: 'Paso {current} de {total}',
        noFacturas: 'Sin facturas pendientes.',
        pickFactura: 'Seleccione una factura.',
        pickFacturaContinue: 'Seleccione una factura para continuar.',
        pickBase: 'Seleccione una base destino.',
        noDetalle: 'No hay detalle para registrar.',
        qtyRequired: 'Debe ingresar cantidades mayores a cero.',
        success: 'Remito registrado correctamente.',
        required: 'Complete la informacion requerida.'
      },
      en: {
        eyebrow: 'Global IaaS & PaaS Operations',
        title: 'Purchase Management',
        subtitle: 'End-to-end flow to register purchase delivery notes with delivery control.',
        wizardTitle: 'Multi-Step Registration',
        wizardSubtitle: 'Select the invoice, define the delivery note, and confirm the operation.',
        step1Title: 'Select Pending Purchase Invoice',
        step1Desc: 'Choose an FCC invoice with pending deliveries.',
        step2Title: 'Define Purchase Delivery Note',
        step2Desc: 'Set the destination base and quantities to receive.',
        step3Title: 'Confirm and Register Delivery Note',
        step3Desc: 'Review the information before registering.',
        thTipo: 'Type',
        thNumero: 'Number',
        thProveedor: 'Supplier',
        thFecha: 'Date',
        thProducto: 'Product',
        thCantidad: 'Available Qty',
        thIngresar: 'Receiving Qty',
        thSaldo: 'Balance',
        lblTipoRemito: 'Delivery Note Type',
        lblNumRemito: 'Delivery Note Number',
        lblBase: 'Destination Base',
        basePlaceholder: 'Search base',
        baseHelp: 'Type to filter thousands of records.',
        detalleTitle: 'Delivery Note Details',
        summaryFactura: 'Selected Invoice',
        summaryBase: 'Destination Base',
        summaryRemito: 'Delivery Note',
        prev: 'Previous',
        next: 'Next',
        confirm: 'Register Delivery Note',
        confirmRequired: 'You must confirm that the data is correct.',
        reset: 'Reset',
        loading: 'Processing...',
        stepLabel: 'Step {current} of {total}',
        noFacturas: 'No pending invoices.',
        pickFactura: 'Select an invoice.',
        pickFacturaContinue: 'Select an invoice to continue.',
        pickBase: 'Select a destination base.',
        noDetalle: 'No detail lines to register.',
        qtyRequired: 'Enter quantities greater than zero.',
        success: 'Delivery note registered successfully.',
        required: 'Complete the required information.'
      }
    };

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (dict[locale][key]) {
        node.textContent = dict[locale][key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (dict[locale][key]) {
        node.setAttribute('placeholder', dict[locale][key]);
      }
    });
  }

  async loadInitialData() {
    await Promise.all([this.loadFacturas(), this.loadBases()]);
  }

  async loadFacturas() {
    this.toggleLoading(true);
    try {
      const response = await fetch('/api/facturas-pendientes');
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || 'FACTURAS_ERROR');
      }
      this.state.facturas = data.facturas || [];
      this.renderFacturas();
    } catch (error) {
      this.showAlert(error.message, 'danger');
    } finally {
      this.toggleLoading(false);
    }
  }

  async loadBases() {
    try {
      const response = await fetch('/api/bases');
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || 'BASES_ERROR');
      }
      this.state.bases = data.bases || [];
    } catch (error) {
      this.showAlert(error.message, 'danger');
    }
  }

  renderFacturas() {
    this.facturasTableBody.innerHTML = '';
    if (!this.state.facturas.length) {
      this.facturasTableBody.innerHTML = `<tr><td colspan="5">${this.t('noFacturas')}</td></tr>`;
      return;
    }

    this.state.facturas.forEach((factura) => {
      const row = document.createElement('tr');
      const selected = this.state.selectedFactura &&
        this.state.selectedFactura.num_documento_compra === factura.num_documento_compra &&
        this.state.selectedFactura.codigo_provedor === factura.codigo_provedor;

      row.innerHTML = `
        <td>
          <input type="radio" name="facturaSelect" ${selected ? 'checked' : ''} />
        </td>
        <td>${factura.tipo_documento_compra}</td>
        <td>${factura.num_documento_compra}</td>
        <td>${factura.nombre_provedor}</td>
        <td>${this.formatDate(factura.fecha)}</td>
      `;

      row.addEventListener('click', () => {
        this.state.selectedFactura = factura;
        this.renderFacturas();
        this.showAlert(null);
      });

      this.facturasTableBody.appendChild(row);
    });
  }

  filterBases(search) {
    const query = (search || '').toLowerCase();
    const matches = this.state.bases.filter((base) =>
      `${base.codigo_base} ${base.nombre}`.toLowerCase().includes(query)
    );

    this.baseList.innerHTML = '';
    if (!matches.length) {
      this.baseList.style.display = 'none';
      return;
    }

    matches.slice(0, 50).forEach((base) => {
      const item = document.createElement('div');
      item.className = 'typeahead-item';
      item.textContent = `${base.codigo_base} - ${base.nombre}`;
      item.addEventListener('click', () => {
        this.state.selectedBase = base;
        this.baseInput.value = `${base.codigo_base} - ${base.nombre}`;
        this.baseList.style.display = 'none';
      });
      this.baseList.appendChild(item);
    });

    this.baseList.style.display = 'block';
  }

  async loadDetalle() {
    if (!this.state.selectedFactura) {
      this.showAlert(this.t('pickFactura'), 'warning');
      return;
    }

    this.toggleLoading(true);
    try {
      const [remitoResponse, detalleResponse] = await Promise.all([
        fetch('/api/remito-meta'),
        fetch('/api/detalle-compra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vTipo_documento_compra: this.state.selectedFactura.tipo_documento_compra,
            vNum_documento_compra: this.state.selectedFactura.num_documento_compra,
            vCodigo_provedor: this.state.selectedFactura.codigo_provedor
          })
        })
      ]);

      const remitoData = await remitoResponse.json();
      const detalleData = await detalleResponse.json();

      if (!remitoData.ok) {
        throw new Error(remitoData.message || 'REM_META_ERROR');
      }
      if (!detalleData.ok) {
        throw new Error(detalleData.message || 'DETALLE_ERROR');
      }

      this.state.remito.numero = remitoData.vNum_documento_compra_remito;
      document.getElementById('numRemito').value = remitoData.vNum_documento_compra_remito;

      this.state.detalle = (detalleData.detalle || []).map((item) => {
        const disponible = Number(item.cantidad) - Number(item.cantidad_entregada);
        return {
          vOrdinalCompra: item.ordinal,
          vcodigo_producto: item.codigo_producto,
          vnombre_producto: item.nombre_producto,
          vCantidadDisponibleMax: disponible,
          vCantidadDisponible: disponible,
          vsaldo: item.saldo
        };
      });

      this.renderDetalle();
    } catch (error) {
      this.showAlert(error.message, 'danger');
    } finally {
      this.toggleLoading(false);
    }
  }

  renderDetalle() {
    this.detalleTableBody.innerHTML = '';
    this.state.detalle.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.vnombre_producto}</td>
        <td>${item.vCantidadDisponibleMax}</td>
        <td>
          <input
            type="text"
            class="form-control form-control-sm"
            data-index="${index}"
            value="${item.vCantidadDisponible}"
          />
        </td>
        <td>${item.vsaldo ?? ''}</td>
      `;

      const input = row.querySelector('input');
      input.addEventListener('input', (event) => this.updateCantidad(event));
      this.detalleTableBody.appendChild(row);
    });
  }

  updateCantidad(event) {
    const index = Number(event.target.dataset.index);
    const raw = event.target.value.trim();
    const normal = raw.replace(',', '.');

    if (!this.isValidDecimal(normal)) {
      event.target.classList.add('is-invalid');
      return;
    }

    const value = Number(normal);
    const max = this.state.detalle[index].vCantidadDisponibleMax;

    if (value < 0 || value > max) {
      event.target.classList.add('is-invalid');
      return;
    }

    event.target.classList.remove('is-invalid');
    this.state.detalle[index].vCantidadDisponible = value;
  }

  isValidDecimal(value) {
    return /^\d+(\.\d+)?$/.test(value);
  }

  validateDetalle() {
    let valid = true;
    this.detalleTableBody.querySelectorAll('input').forEach((input) => {
      const index = Number(input.dataset.index);
      const raw = input.value.trim();
      const normal = raw.replace(',', '.');
      const max = this.state.detalle[index].vCantidadDisponibleMax;
      const value = Number(normal);

      if (!this.isValidDecimal(normal) || value < 0 || value > max) {
        input.classList.add('is-invalid');
        valid = false;
      } else {
        input.classList.remove('is-invalid');
        this.state.detalle[index].vCantidadDisponible = value;
      }
    });
    return valid;
  }

  updateStep() {
    this.steps.forEach((step, index) => {
      step.style.display = index === this.state.step ? 'block' : 'none';
    });

    const progress = ((this.state.step + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.stepLabel.textContent = this.t('stepLabel', {
      current: this.state.step + 1,
      total: this.steps.length
    });

    this.prevBtn.disabled = this.state.step === 0;
    this.nextBtn.classList.toggle('d-none', this.state.step === this.steps.length - 1);
    this.confirmBtn.classList.toggle('d-none', this.state.step !== this.steps.length - 1);
    if (this.state.step === this.steps.length - 1) {
      this.confirmBtn.disabled = !this.confirmCheck.checked;
    }
  }

  next() {
    if (this.state.step === 0) {
      if (!this.state.selectedFactura) {
        this.showAlert(this.t('pickFacturaContinue'), 'warning');
        return;
      }
    }

    if (this.state.step === 1) {
      if (!this.state.selectedBase) {
        this.showAlert(this.t('pickBase'), 'warning');
        return;
      }
      if (!this.state.detalle.length) {
        this.showAlert(this.t('noDetalle'), 'warning');
        return;
      }
      if (!this.validateDetalle()) {
        this.showAlert(this.t('required'), 'warning');
        return;
      }
    }

    this.state.step = Math.min(this.state.step + 1, this.steps.length - 1);

    if (this.state.step === 1 && !this.state.detalle.length) {
      this.loadDetalle();
    }

    if (this.state.step === 2) {
      this.renderResumen();
    }

    this.updateStep();
  }

  prev() {
    this.state.step = Math.max(this.state.step - 1, 0);
    this.updateStep();
  }

  async confirm() {
    if (!this.confirmCheck.checked) {
      this.showAlert(this.t('confirmRequired'), 'warning');
      return;
    }
    if (!this.state.selectedFactura || !this.state.selectedBase) {
      this.showAlert(this.t('required'), 'warning');
      return;
    }

    const detalleValidado = this.state.detalle.filter((item) => item.vCantidadDisponible > 0);
    if (!detalleValidado.length) {
      this.showAlert(this.t('qtyRequired'), 'warning');
      return;
    }

    this.toggleLoading(true);
    try {
      const payload = {
        vTipo_documento_compra_remito: this.state.remito.tipo,
        vNum_documento_compra_remito: this.state.remito.numero,
        vFecha: this.state.selectedFactura.fecha,
        vCodigo_base: this.state.selectedBase.codigo_base,
        vTipo_documento_compra_origen: this.state.selectedFactura.tipo_documento_compra,
        vNum_documento_compra_origen: this.state.selectedFactura.num_documento_compra,
        vCodigo_provedor: this.state.selectedFactura.codigo_provedor,
        vDetalleRemitoCompra: detalleValidado.map((item) => ({
          vOrdinalCompra: item.vOrdinalCompra,
          vcodigo_producto: item.vcodigo_producto,
          vCantidadDisponible: item.vCantidadDisponible
        }))
      };

      const response = await fetch('/api/registrar-remito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || 'REGISTRO_ERROR');
      }

      this.showAlert(this.t('success'), 'success');
      this.reset(true);
      await this.loadFacturas();
    } catch (error) {
      this.showAlert(error.message, 'danger');
    } finally {
      this.toggleLoading(false);
    }
  }

  renderResumen() {
    const factura = this.state.selectedFactura;
    this.facturaResumen.innerHTML = `
      <div>${factura.tipo_documento_compra} - ${factura.num_documento_compra}</div>
      <div>${factura.nombre_provedor}</div>
      <div>${this.formatDate(factura.fecha)}</div>
    `;

    this.baseResumen.innerHTML = this.state.selectedBase
      ? `${this.state.selectedBase.codigo_base} - ${this.state.selectedBase.nombre}`
      : '-';

    this.remitoResumen.innerHTML = `${this.state.remito.tipo} ${this.state.remito.numero}`;

    this.confirmTableBody.innerHTML = '';
    this.state.detalle
      .filter((item) => item.vCantidadDisponible > 0)
      .forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${item.vnombre_producto}</td><td>${item.vCantidadDisponible}</td>`;
        this.confirmTableBody.appendChild(row);
      });
  }

  reset(keepAlert = false) {
    this.state.step = 0;
    this.state.selectedFactura = null;
    this.state.selectedBase = null;
    this.state.detalle = [];
    this.state.remito.numero = '';

    if (!keepAlert) {
      this.showAlert(null);
    }

    this.baseInput.value = '';
    document.getElementById('numRemito').value = '';
    this.confirmCheck.checked = false;
    this.confirmBtn.disabled = true;

    this.renderFacturas();
    this.updateStep();
  }

  t(key, vars = {}) {
    const dict = this.state.locale === 'en' ? 'en' : 'es';
    const messages = {
      es: {
        stepLabel: 'Paso {current} de {total}',
        noFacturas: 'Sin facturas pendientes.',
        pickFactura: 'Seleccione una factura.',
        pickFacturaContinue: 'Seleccione una factura para continuar.',
        pickBase: 'Seleccione una base destino.',
        noDetalle: 'No hay detalle para registrar.',
        qtyRequired: 'Debe ingresar cantidades mayores a cero.',
        success: 'Remito registrado correctamente.',
        required: 'Complete la informacion requerida.',
        confirmRequired: 'Debes confirmar que los datos son correctos.'
      },
      en: {
        stepLabel: 'Step {current} of {total}',
        noFacturas: 'No pending invoices.',
        pickFactura: 'Select an invoice.',
        pickFacturaContinue: 'Select an invoice to continue.',
        pickBase: 'Select a destination base.',
        noDetalle: 'No detail lines to register.',
        qtyRequired: 'Enter quantities greater than zero.',
        success: 'Delivery note registered successfully.',
        required: 'Complete the required information.',
        confirmRequired: 'You must confirm that the data is correct.'
      }
    };

    let text = messages[dict][key] || key;
    Object.keys(vars).forEach((name) => {
      text = text.replace(`{${name}}`, vars[name]);
    });
    return text;
  }

  showAlert(message, type = 'info') {
    if (!message) {
      this.alertBox.className = 'alert d-none';
      this.alertBox.textContent = '';
      return;
    }

    this.alertBox.className = `alert alert-${type}`;
    this.alertBox.textContent = message;
  }

  toggleLoading(show) {
    this.loadingOverlay.classList.toggle('d-none', !show);
  }

  formatDate(raw) {
    if (!raw) return '';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    return date.toLocaleDateString();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
