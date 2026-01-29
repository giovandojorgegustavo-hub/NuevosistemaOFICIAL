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
    this.proveedoresBody = document.querySelector('#proveedoresTable tbody');
    this.refreshBtn = document.getElementById('refreshBtn');
    this.syncTime = document.getElementById('syncTime');

    this.vFecha = document.getElementById('vFecha');
    this.vNumDocumento = document.getElementById('vNum_documento_compra');
    this.vCuenta = document.getElementById('vCodigo_cuentabancaria');
    this.vMonto = document.getElementById('vMonto');

    this.selectedProveedor = null;
    this.proveedores = [];
    this.cuentas = [];

    this.decimalRegex = /^\d+(?:[.,]\d{1,2})?$/;
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
        title: 'Recibo Proveedor',
        subtitle: 'Registra pagos con visibilidad completa del saldo pendiente y confirmacion segura.',
        status: 'Operativo',
        statusLabel: 'Ultima sincronizacion',
        wizardTitle: 'CU2-006 - Registro de recibo proveedor (RCP)',
        wizardSubtitle: 'Flujo guiado para listar saldos pendientes, registrar pago y confirmar.',
        refresh: 'Actualizar',
        step1: 'Proveedores',
        step2: 'Registrar pago',
        step3: 'Confirmacion',
        step1Title: '1. Proveedores con saldo pendiente',
        step1Help: 'Seleccione un proveedor para continuar al registro del pago.',
        colSelect: 'Seleccionar',
        colNombre: 'Proveedor',
        colSaldo: 'Saldo pendiente',
        step2Title: '2. Registrar pago',
        step2Help: 'Revise la informacion del proveedor y complete los datos del recibo.',
        proveedor: 'Proveedor',
        saldoPendiente: 'Saldo pendiente',
        codigo: 'Codigo',
        fecha: 'Fecha',
        fechaError: 'Seleccione una fecha valida.',
        tipoDocumento: 'Tipo documento',
        numDocumento: 'Numero documento',
        cuenta: 'Cuenta bancaria',
        cuentaError: 'Seleccione una cuenta bancaria.',
        monto: 'Monto a pagar',
        montoError: 'Ingrese un monto valido.',
        step3Title: '3. Confirmar y registrar recibo',
        step3Help: 'Revise el resumen final y confirme la operacion.',
        confirm: 'Confirmo que la informacion es correcta.',
        confirmError: 'Debe confirmar la operacion.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Recibo',
        loading: 'Procesando...',
        selectPlaceholder: 'Seleccione...',
        emptyProveedores: 'No hay proveedores con saldo pendiente.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Supplier Receipt',
        subtitle: 'Register payments with full visibility of pending balances and secure confirmation.',
        status: 'Operational',
        statusLabel: 'Last sync',
        wizardTitle: 'CU2-006 - Supplier receipt registration (RCP)',
        wizardSubtitle: 'Guided flow to list pending balances, register payment, and confirm.',
        refresh: 'Refresh',
        step1: 'Suppliers',
        step2: 'Register payment',
        step3: 'Confirmation',
        step1Title: '1. Suppliers with pending balance',
        step1Help: 'Select a supplier to continue to payment registration.',
        colSelect: 'Select',
        colNombre: 'Supplier',
        colSaldo: 'Pending balance',
        step2Title: '2. Register payment',
        step2Help: 'Review supplier info and complete receipt data.',
        proveedor: 'Supplier',
        saldoPendiente: 'Pending balance',
        codigo: 'Code',
        fecha: 'Date',
        fechaError: 'Select a valid date.',
        tipoDocumento: 'Document type',
        numDocumento: 'Document number',
        cuenta: 'Bank account',
        cuentaError: 'Select a bank account.',
        monto: 'Amount',
        montoError: 'Enter a valid amount.',
        step3Title: '3. Confirm and register receipt',
        step3Help: 'Review the summary and confirm the operation.',
        confirm: 'I confirm the information is correct.',
        confirmError: 'You must confirm the operation.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Receipt',
        loading: 'Processing...',
        selectPlaceholder: 'Select...',
        emptyProveedores: 'No suppliers with pending balance.'
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
    this.refreshBtn.addEventListener('click', () => this.refreshData());

    this.proveedoresBody.addEventListener('click', (event) => {
      const row = event.target.closest('tr');
      if (!row) return;
      const idx = Number(row.dataset.index);
      if (!Number.isFinite(idx)) return;
      this.selectProveedor(idx);
    });

    this.vCuenta.addEventListener('change', (event) => this.clearFieldError(event.target));
    this.vMonto.addEventListener('input', () => this.clearFieldError(this.vMonto));
    this.vFecha.addEventListener('change', () => this.clearFieldError(this.vFecha));

    document.getElementById('confirmCheck').addEventListener('change', (event) => {
      if (event.target.checked) {
        event.target.classList.remove('is-invalid');
      }
    });

    ['change', 'input'].forEach((evt) => {
      this.vCuenta.addEventListener(evt, () => this.updateSummary());
      this.vMonto.addEventListener(evt, () => this.updateSummary());
      this.vFecha.addEventListener(evt, () => this.updateSummary());
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
      const [now, proveedores, cuentas, nextDoc] = await Promise.all([
        this.fetchJson('/api/now'),
        this.fetchJson('/api/proveedores-pendientes'),
        this.fetchJson('/api/cuentasbancarias'),
        this.fetchJson('/api/next-numdocumento-rcp')
      ]);

      this.proveedores = Array.isArray(proveedores) ? proveedores.map(this.normalizeProveedor) : [];
      this.cuentas = Array.isArray(cuentas) ? cuentas : [];

      this.renderProveedores();
      this.renderCuentas();
      this.applyFecha(now?.fecha);
      this.applyNextDoc(nextDoc?.next);
      this.syncTime.textContent = now?.hora || '--:--';
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    }
  }

  normalizeProveedor(raw) {
    const codigo = raw.codigo_provedor ?? raw.codigo_proveedor ?? raw.codigo ?? raw.id ?? '';
    const nombre = raw.nombre ?? raw.nombre_provedor ?? raw.razon_social ?? raw.descripcion ?? '';
    const saldo = raw.saldo_final ?? raw.saldo ?? raw.saldo_pendiente ?? 0;
    return {
      codigo,
      nombre,
      saldo: Number(saldo) || 0
    };
  }

  renderProveedores() {
    this.proveedoresBody.innerHTML = '';
    if (!this.proveedores.length) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="3" class="text-center text-muted">${this.localeStrings.emptyProveedores}</td>
      `;
      this.proveedoresBody.appendChild(row);
      return;
    }

    this.proveedores.forEach((prov, index) => {
      const row = document.createElement('tr');
      row.classList.add('provider-row');
      row.dataset.index = String(index);
      row.innerHTML = `
        <td><input type="radio" name="proveedorSelect" aria-label="select" ${this.selectedProveedor?.codigo === prov.codigo ? 'checked' : ''} /></td>
        <td>${prov.nombre}</td>
        <td>${this.formatCurrency(prov.saldo)}</td>
      `;
      if (this.selectedProveedor?.codigo === prov.codigo) {
        row.classList.add('selected');
      }
      this.proveedoresBody.appendChild(row);
    });
  }

  renderCuentas() {
    this.vCuenta.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = this.localeStrings.selectPlaceholder;
    this.vCuenta.appendChild(placeholder);

    this.cuentas.forEach((cuenta) => {
      const option = document.createElement('option');
      const codigo = cuenta.codigo_cuentabancaria ?? cuenta.codigo ?? cuenta.id ?? '';
      const nombre = cuenta.nombre ?? cuenta.descripcion ?? cuenta.banco ?? '';
      option.value = codigo;
      option.textContent = nombre ? `${codigo} - ${nombre}` : String(codigo);
      this.vCuenta.appendChild(option);
    });
  }

  applyFecha(fecha) {
    if (fecha) {
      this.vFecha.value = fecha;
    }
  }

  applyNextDoc(next) {
    const num = Number(next) || 1;
    this.vNumDocumento.value = String(num).padStart(12, '0');
  }

  selectProveedor(index) {
    const proveedor = this.proveedores[index];
    if (!proveedor) return;
    this.selectedProveedor = proveedor;
    this.proveedoresBody.querySelectorAll('tr').forEach((row) => row.classList.remove('selected'));
    const row = this.proveedoresBody.querySelector(`tr[data-index="${index}"]`);
    if (row) {
      row.classList.add('selected');
      const radio = row.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }
    }

    document.getElementById('selectedProveedor').textContent = proveedor.nombre || '--';
    document.getElementById('selectedSaldo').textContent = this.formatCurrency(proveedor.saldo);
    document.getElementById('selectedCodigo').textContent = proveedor.codigo || '--';
    this.updateSummary();
  }

  updateSummary() {
    document.getElementById('summaryProveedor').textContent = this.selectedProveedor?.nombre || '--';
    document.getElementById('summarySaldo').textContent = this.selectedProveedor
      ? this.formatCurrency(this.selectedProveedor.saldo)
      : '--';
    document.getElementById('summaryMonto').textContent = this.vMonto.value ? this.vMonto.value : '--';
    document.getElementById('summaryFecha').textContent = this.vFecha.value || '--';
    const cuentaOption = this.vCuenta.selectedOptions?.[0];
    document.getElementById('summaryCuenta').textContent = cuentaOption?.textContent || '--';
  }

  goStep(step) {
    const total = this.steps.length;
    if (step < 0 || step >= total) return;
    this.currentStep = step;
    this.steps.forEach((panel, index) => {
      panel.style.display = index === step ? 'block' : 'none';
    });
    this.stepBadges.forEach((badge, index) => {
      badge.classList.toggle('active', index === step);
    });

    const progress = ((step + 1) / total) * 100;
    this.progressBar.style.width = `${progress}%`;

    this.prevBtn.disabled = step === 0;
    this.nextBtn.classList.toggle('d-none', step === total - 1);
    this.registrarBtn.classList.toggle('d-none', step !== total - 1);
  }

  async handleNext() {
    this.clearAlerts();
    if (this.currentStep === 0) {
      if (!this.selectedProveedor) {
        this.showError('Debe seleccionar un proveedor para continuar.');
        return;
      }
    }

    if (this.currentStep === 1) {
      if (!this.validatePago()) {
        return;
      }
    }

    this.goStep(this.currentStep + 1);
  }

  validatePago() {
    let isValid = true;
    const montoRaw = this.vMonto.value.trim();
    const monto = this.parseNumber(montoRaw);
    const saldo = this.selectedProveedor?.saldo ?? 0;

    if (!this.vFecha.value) {
      this.setFieldError(this.vFecha, this.localeStrings.fechaError);
      isValid = false;
    }

    if (!this.vCuenta.value) {
      this.setFieldError(this.vCuenta, this.localeStrings.cuentaError);
      isValid = false;
    }

    if (!montoRaw || !this.decimalRegex.test(montoRaw) || monto <= 0 || monto > saldo) {
      this.setFieldError(this.vMonto, this.localeStrings.montoError);
      isValid = false;
    }

    if (monto > saldo) {
      this.showError('El monto no puede ser mayor al saldo pendiente.');
      isValid = false;
    }

    return isValid;
  }

  async handleRegistrar() {
    this.clearAlerts();
    const confirmCheck = document.getElementById('confirmCheck');
    if (!confirmCheck.checked) {
      confirmCheck.classList.add('is-invalid');
      this.showError(this.localeStrings.confirmError);
      return;
    }

    if (!this.validatePago()) {
      return;
    }

    try {
      this.showLoading(true);
      const payload = {
        vFecha: this.vFecha.value,
        vTipo_documento_compra: 'RCP',
        vNum_documento_compra: this.vNumDocumento.value,
        vCodigo_provedor: this.selectedProveedor.codigo,
        vCodigo_cuentabancaria: this.vCuenta.value,
        vMonto: this.parseNumber(this.vMonto.value.trim())
      };

      const response = await this.fetchJson('/api/recibo-proveedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.showSuccess(response?.message || 'Recibo registrado correctamente.');
      await this.loadInitialData();
      this.goStep(0);
      this.resetForm();
    } catch (error) {
      this.showError(error.message || 'No se pudo registrar el recibo.');
    } finally {
      this.showLoading(false);
    }
  }

  resetForm() {
    this.selectedProveedor = null;
    this.vMonto.value = '';
    this.vCuenta.value = '';
    document.getElementById('selectedProveedor').textContent = '--';
    document.getElementById('selectedSaldo').textContent = '--';
    document.getElementById('selectedCodigo').textContent = '--';
    document.getElementById('summaryProveedor').textContent = '--';
    document.getElementById('summarySaldo').textContent = '--';
    document.getElementById('summaryMonto').textContent = '--';
    document.getElementById('summaryFecha').textContent = '--';
    document.getElementById('summaryCuenta').textContent = '--';
    document.getElementById('confirmCheck').checked = false;
  }

  parseNumber(value) {
    if (!value) return 0;
    return Number(value.replace(',', '.'));
  }

  formatCurrency(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Error en la solicitud.');
    }
    return response.json();
  }

  showLoading(show) {
    this.loadingState.classList.toggle('hidden', !show);
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

  setFieldError(field, message) {
    field.classList.add('is-invalid');
    const feedback = field.parentElement?.querySelector('.invalid-feedback');
    if (feedback && message) {
      feedback.textContent = message;
    }
  }

  clearFieldError(field) {
    field.classList.remove('is-invalid');
  }
}

const wizard = new FormWizard();
wizard.init();
