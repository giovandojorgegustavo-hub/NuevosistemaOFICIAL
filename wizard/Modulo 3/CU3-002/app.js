/*
SPs lectura
vProveedoresPendientes = Llamada SP: get_proveedores_saldos_pendientes() (devuelve campo_visible)
Campos devueltos
codigo_provedor
nombre
saldo_final
Variables
vCodigo_provedor no visible no editable
vNombreProvedor visible no editable
vSaldoPendiente visible no editable

vCuentas = Llamada SP: get_cuentasbancarias() (devuelve campo_visible)
Campos devueltos
codigo_cuentabancaria
nombre
banco
Variables
vCodigo_cuentabancaria no visible editable
vCuentaNombre visible editable
vCuentaBanco visible editable
*/

const i18n = {
  en: {
    title: 'Provider Receipt',
    subtitle: 'Global IaaS & PaaS Finance Platform',
    statusReady: 'Ready',
    wizardTitle: 'CU3002 - Provider Receipt',
    wizardHint: 'Multi-step flow with full transactionality and SQL traceability.',
    step1Title: '1. Providers with pending balance',
    step1Hint: 'Select a provider to continue.',
    searchProveedor: 'Search provider',
    colNombre: 'Provider',
    colSaldo: 'Pending balance',
    colAction: 'Select',
    step2Title: '2. Register payment',
    step2Hint: 'Complete the receipt details.',
    proveedorLabel: 'Provider',
    saldoLabel: 'Pending balance',
    fechaLabel: 'Date',
    tipoDoc: 'Document type',
    numDoc: 'Document number',
    cuentaLabel: 'Bank account',
    bancoLabel: 'Bank',
    montoLabel: 'Amount',
    descripcionLabel: 'Description (optional)',
    step3Title: '3. Confirm and register',
    step3Hint: 'Review the summary before registering.',
    summaryProveedor: 'Provider',
    summarySaldo: 'Pending balance',
    summaryMonto: 'Payment amount',
    summaryFecha: 'Date',
    summaryCuenta: 'Bank account',
    confirmLabel: 'I confirm that the data is correct.',
    prev: 'Previous',
    next: 'Next',
    confirm: 'Confirm',
    loading: 'Processing...',
    requiredProveedor: 'Select a provider to continue.',
    requiredCuenta: 'Select a bank account.',
    invalidMonto: 'Enter a valid amount greater than 0.',
    montoExcede: 'The amount cannot exceed the pending balance.',
    requiredConfirm: 'Confirm the operation to proceed.',
    fetchError: 'We could not load data. Please try again.',
    success: 'Receipt registered successfully. The form is ready for a new entry.'
  },
  es: {
    title: 'Recibo Provedor',
    subtitle: 'Plataforma financiera global IaaS & PaaS',
    statusReady: 'Listo',
    wizardTitle: 'CU3002 - Recibo Provedor',
    wizardHint: 'Flujo multi-paso con transaccion total y trazabilidad SQL.',
    step1Title: '1. Proveedores con saldo pendiente',
    step1Hint: 'Selecciona un proveedor para continuar.',
    searchProveedor: 'Buscar proveedor',
    colNombre: 'Proveedor',
    colSaldo: 'Saldo pendiente',
    colAction: 'Seleccionar',
    step2Title: '2. Registrar pago',
    step2Hint: 'Completa los datos del recibo.',
    proveedorLabel: 'Proveedor',
    saldoLabel: 'Saldo pendiente',
    fechaLabel: 'Fecha',
    tipoDoc: 'Tipo documento',
    numDoc: 'Numero documento',
    cuentaLabel: 'Cuenta bancaria',
    bancoLabel: 'Banco',
    montoLabel: 'Monto',
    descripcionLabel: 'Descripcion (opcional)',
    step3Title: '3. Confirmar y registrar',
    step3Hint: 'Revisa el resumen antes de registrar.',
    summaryProveedor: 'Proveedor',
    summarySaldo: 'Saldo pendiente',
    summaryMonto: 'Monto a pagar',
    summaryFecha: 'Fecha',
    summaryCuenta: 'Cuenta bancaria',
    confirmLabel: 'Confirmo que los datos son correctos.',
    prev: 'Anterior',
    next: 'Siguiente',
    confirm: 'Confirmar',
    loading: 'Procesando...',
    requiredProveedor: 'Selecciona un proveedor para continuar.',
    requiredCuenta: 'Selecciona una cuenta bancaria.',
    invalidMonto: 'Ingresa un monto valido mayor que 0.',
    montoExcede: 'El monto no puede superar el saldo pendiente.',
    requiredConfirm: 'Confirma la operacion para continuar.',
    fetchError: 'No pudimos cargar los datos. Intentalo nuevamente.',
    success: 'Recibo registrado correctamente. El formulario esta listo para un nuevo registro.'
  }
};

class FormWizard {
  constructor() {
    this.state = {
      step: 1,
      proveedores: [],
      filteredProveedores: [],
      cuentas: [],
      selectedProveedor: null,
      selectedCuenta: null,
      lang: this.detectLanguage()
    };

    this.moneyRegex = /^(?:0|[1-9]\d*)(?:[\.,]\d{1,2})?$/;

    this.elements = {
      stepPanels: Array.from(document.querySelectorAll('.step-panel')),
      progressBar: document.getElementById('progressBar'),
      stepIndicator: document.getElementById('stepIndicator'),
      alertBox: document.getElementById('formAlert'),
      successBox: document.getElementById('formSuccess'),
      proveedoresTable: document.querySelector('#proveedoresTable tbody'),
      proveedoresCount: document.getElementById('proveedoresCount'),
      proveedorSearch: document.getElementById('proveedorSearch'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      submitBtn: document.getElementById('submitBtn'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      proveedorNombre: document.getElementById('proveedorNombre'),
      proveedorSaldo: document.getElementById('proveedorSaldo'),
      fechaPago: document.getElementById('fechaPago'),
      tipoDocumento: document.getElementById('tipoDocumento'),
      numeroDocumento: document.getElementById('numeroDocumento'),
      cuentaSearch: document.getElementById('cuentaSearch'),
      cuentasList: document.getElementById('cuentasList'),
      codigoCuenta: document.getElementById('codigoCuenta'),
      cuentaBanco: document.getElementById('cuentaBanco'),
      montoPago: document.getElementById('montoPago'),
      descripcionPago: document.getElementById('descripcionPago'),
      summaryProveedor: document.getElementById('summaryProveedor'),
      summarySaldo: document.getElementById('summarySaldo'),
      summaryMonto: document.getElementById('summaryMonto'),
      summaryFecha: document.getElementById('summaryFecha'),
      summaryCuenta: document.getElementById('summaryCuenta'),
      confirmOperacion: document.getElementById('confirmOperacion')
    };
  }

  detectLanguage() {
    const browserLang = navigator.language || 'en';
    return browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
  }

  t(key) {
    return i18n[this.state.lang][key] || i18n.en[key] || key;
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (key) {
        el.textContent = this.t(key);
      }
    });
  }

  setAlert(message, type = 'danger') {
    if (!message) {
      this.elements.alertBox.classList.add('d-none');
      return;
    }
    this.elements.alertBox.textContent = message;
    this.elements.alertBox.className = `alert alert-${type}`;
    this.elements.alertBox.classList.remove('d-none');
  }

  setSuccess(message) {
    if (!message) {
      this.elements.successBox.classList.add('d-none');
      return;
    }
    this.elements.successBox.textContent = message;
    this.elements.successBox.className = 'alert alert-success';
    this.elements.successBox.classList.remove('d-none');
  }

  setLoading(isLoading) {
    this.elements.loadingOverlay.classList.toggle('d-none', !isLoading);
  }

  updateProgress() {
    const step = this.state.step;
    const progress = ((step - 1) / 2) * 100;
    this.elements.progressBar.style.width = `${progress}%`;
    this.elements.stepIndicator.textContent = `${step} / 3`;

    this.elements.stepPanels.forEach((panel) => {
      panel.classList.toggle('active', Number(panel.dataset.step) === step);
    });

    this.elements.prevBtn.disabled = step === 1;
    this.elements.nextBtn.classList.toggle('d-none', step === 3);
    this.elements.submitBtn.classList.toggle('d-none', step !== 3);
    this.elements.submitBtn.disabled = step !== 3 || !this.elements.confirmOperacion.checked;
  }

  async init() {
    this.applyTranslations();
    this.updateProgress();
    this.bindEvents();
    await this.loadProveedores();
  }

  bindEvents() {
    this.elements.proveedorSearch.addEventListener('input', (event) => {
      this.filterProveedores(event.target.value);
    });

    this.elements.prevBtn.addEventListener('click', () => {
      if (this.state.step > 1) {
        this.state.step -= 1;
        this.setAlert('');
        this.updateProgress();
      }
    });

    this.elements.nextBtn.addEventListener('click', async () => {
      if (this.state.step === 1) {
        if (!this.state.selectedProveedor) {
          this.setAlert(this.t('requiredProveedor'));
          return;
        }
        await this.preparePaso2();
      }

      if (this.state.step === 2) {
        const valid = this.validatePaso2();
        if (!valid) {
          return;
        }
        this.fillSummary();
      }

      if (this.state.step < 3) {
        this.state.step += 1;
        this.setAlert('');
        this.updateProgress();
      }
    });

    this.elements.submitBtn.addEventListener('click', () => this.handleSubmit());
    this.elements.confirmOperacion.addEventListener('change', () => {
      this.elements.submitBtn.disabled = !this.elements.confirmOperacion.checked || this.state.step !== 3;
    });

    this.elements.cuentaSearch.addEventListener('input', (event) => {
      this.applyCuentaSelection(event.target.value);
      this.filterCuentas(event.target.value);
    });
  }

  async loadProveedores() {
    try {
      this.setLoading(true);
      const response = await fetch('/api/proveedores-pendientes');
      const payload = await response.json();
      if (!payload.ok) {
        throw new Error('API');
      }
      this.state.proveedores = payload.data || [];
      this.state.filteredProveedores = [...this.state.proveedores];
      this.renderProveedores();
    } catch (error) {
      this.setAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false);
    }
  }

  filterProveedores(query) {
    const term = query.toLowerCase();
    this.state.filteredProveedores = this.state.proveedores.filter((item) =>
      String(item.nombre || '').toLowerCase().includes(term)
    );
    this.renderProveedores();
  }

  renderProveedores() {
    const tbody = this.elements.proveedoresTable;
    tbody.innerHTML = '';
    this.elements.proveedoresCount.textContent = `${this.state.filteredProveedores.length}`;

    this.state.filteredProveedores.forEach((prov) => {
      const tr = document.createElement('tr');
      const saldo = this.formatCurrency(prov.saldo_final);

      tr.innerHTML = `
        <td>${prov.nombre || ''}</td>
        <td>${saldo}</td>
        <td><button type="button" class="btn btn-sm btn-outline-info">${this.t('colAction')}</button></td>
      `;

      const btn = tr.querySelector('button');
      btn.addEventListener('click', () => this.selectProveedor(prov));

      tbody.appendChild(tr);
    });
  }

  selectProveedor(prov) {
    this.state.selectedProveedor = {
      codigo_provedor: prov.codigo_provedor,
      nombre: prov.nombre,
      saldo_final: Number(prov.saldo_final || 0)
    };
    this.setAlert('');
    this.setSuccess('');
  }

  async preparePaso2() {
    this.setLoading(true);
    try {
      await Promise.all([this.loadCuentas(), this.loadNumeroDocumento()]);
      const today = new Date();
      this.elements.fechaPago.value = today.toISOString().split('T')[0];
      this.elements.tipoDocumento.value = 'RCC';
      this.elements.proveedorNombre.value = this.state.selectedProveedor?.nombre || '';
      this.elements.proveedorSaldo.value = this.formatCurrency(this.state.selectedProveedor?.saldo_final || 0);
    } catch (error) {
      this.setAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false);
    }
  }

  async loadCuentas() {
    const response = await fetch('/api/cuentas-bancarias');
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error('API');
    }
    this.state.cuentas = payload.data || [];
    this.renderCuentas();
  }

  async loadNumeroDocumento() {
    const response = await fetch('/api/next-numero-documento?tipo=RCC');
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error('API');
    }
    const next = payload.next || 1;
    this.elements.numeroDocumento.value = String(next).padStart(12, '0');
  }

  renderCuentas(filtered) {
    const list = this.elements.cuentasList;
    list.innerHTML = '';
    const cuentas = filtered || this.state.cuentas;
    cuentas.forEach((cuenta) => {
      const option = document.createElement('option');
      option.value = `${cuenta.nombre} - ${cuenta.banco}`;
      option.dataset.codigo = cuenta.codigo_cuentabancaria;
      list.appendChild(option);
    });
  }

  filterCuentas(query) {
    const term = query.toLowerCase();
    const filtered = this.state.cuentas.filter((cuenta) => {
      const label = `${cuenta.nombre} - ${cuenta.banco}`.toLowerCase();
      return label.includes(term);
    });
    this.renderCuentas(filtered);
  }

  applyCuentaSelection(inputValue) {
    const match = this.state.cuentas.find((cuenta) =>
      `${cuenta.nombre} - ${cuenta.banco}`.toLowerCase() === inputValue.toLowerCase()
    );
    if (match) {
      this.state.selectedCuenta = match;
      this.elements.codigoCuenta.value = match.codigo_cuentabancaria;
      this.elements.cuentaBanco.value = match.banco || '';
    } else {
      this.state.selectedCuenta = null;
      this.elements.codigoCuenta.value = '';
      this.elements.cuentaBanco.value = '';
    }
  }

  validatePaso2() {
    const montoValue = this.elements.montoPago.value.trim();
    const montoNumeric = this.parseAmount(montoValue);
    const saldo = this.state.selectedProveedor?.saldo_final || 0;

    if (!this.state.selectedCuenta || !this.elements.codigoCuenta.value) {
      this.setAlert(this.t('requiredCuenta'));
      return false;
    }

    if (!montoValue || !this.moneyRegex.test(montoValue) || montoNumeric <= 0) {
      this.setAlert(this.t('invalidMonto'));
      return false;
    }

    if (montoNumeric > saldo) {
      this.setAlert(this.t('montoExcede'));
      return false;
    }

    this.setAlert('');
    return true;
  }

  fillSummary() {
    const montoNumeric = this.parseAmount(this.elements.montoPago.value.trim());
    this.elements.summaryProveedor.textContent = this.state.selectedProveedor?.nombre || '-';
    this.elements.summarySaldo.textContent = this.formatCurrency(this.state.selectedProveedor?.saldo_final || 0);
    this.elements.summaryMonto.textContent = this.formatCurrency(montoNumeric);
    this.elements.summaryFecha.textContent = this.elements.fechaPago.value || '-';
    this.elements.summaryCuenta.textContent = this.elements.cuentaSearch.value || '-';
  }

  async handleSubmit() {
    if (!this.elements.confirmOperacion.checked) {
      this.setAlert(this.t('requiredConfirm'));
      return;
    }

    const montoNumeric = this.parseAmount(this.elements.montoPago.value.trim());
    const payload = {
      codigo_provedor: this.state.selectedProveedor?.codigo_provedor,
      fecha: this.elements.fechaPago.value,
      tipo_documento: this.elements.tipoDocumento.value,
      numero_documento: this.elements.numeroDocumento.value,
      codigo_cuentabancaria: this.elements.codigoCuenta.value,
      monto: montoNumeric,
      descripcion: this.elements.descripcionPago.value.trim()
    };

    try {
      this.setLoading(true);
      const response = await fetch('/api/recibos-proveedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!result.ok) {
        throw new Error('API');
      }
      this.setSuccess(this.t('success'));
      this.resetForm();
    } catch (error) {
      this.setAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false);
    }
  }

  resetForm() {
    this.state.step = 1;
    this.state.selectedProveedor = null;
    this.state.selectedCuenta = null;
    this.elements.proveedorSearch.value = '';
    this.elements.cuentaSearch.value = '';
    this.elements.codigoCuenta.value = '';
    this.elements.cuentaBanco.value = '';
    this.elements.montoPago.value = '';
    this.elements.descripcionPago.value = '';
    this.elements.confirmOperacion.checked = false;
    this.setAlert('');
    this.updateProgress();
    this.loadProveedores();
  }

  parseAmount(value) {
    const normalized = value.replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  formatCurrency(value) {
    const amount = Number(value || 0);
    return amount.toLocaleString(this.state.lang === 'es' ? 'es-PE' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
