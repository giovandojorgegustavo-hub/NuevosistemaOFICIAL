class FormWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.state = {
      cliente: null,
      cuentas: [],
      numeroDocumento: '',
      fechaEmision: '',
      monto: '',
      codigoCuenta: ''
    };

    this.progressBar = document.getElementById('progressBar');
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.alertArea = document.getElementById('alertArea');
    this.loadingOverlay = document.getElementById('loadingOverlay');

    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.submitBtn = document.getElementById('submitBtn');

    this.initEvents();
    this.applyI18n();
  }

  initEvents() {
    this.prevBtn.addEventListener('click', () => this.goStep(this.currentStep - 1));
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.submitBtn.addEventListener('click', () => this.handleSubmit());
  }

  applyI18n() {
    const lang = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    document.documentElement.lang = lang;
    const translations = {
      es: {
        eyebrow: 'Global IaaS + PaaS',
        title: 'Registrar recibos de clientes',
        subtitle: 'Consolida pagos con trazabilidad y ejecución segura.',
        status: 'Wizard activo',
        metric: 'Clientes con saldo pendiente',
        wizardTitle: 'CU-007 · Crear Recibos',
        wizardSubtitle: 'Selecciona un cliente, registra el pago y confirma.',
        step1Title: '1. Clientes con saldo pendiente',
        step1Desc: 'Selecciona un cliente para continuar.',
        colCliente: 'Cliente',
        colSaldo: 'Saldo pendiente',
        step2Title: '2. Registrar pago',
        step2Desc: 'Completa los datos del recibo.',
        clienteLabel: 'Cliente',
        saldoLabel: 'Saldo pendiente',
        codigoLabel: 'Código',
        fechaLabel: 'Fecha emisión',
        fechaHint: 'Formato AAAA-MM-DD',
        tipoDocLabel: 'Tipo documento',
        numeroDocLabel: 'Número documento',
        cuentaLabel: 'Cuenta bancaria',
        montoLabel: 'Monto a pagar',
        montoHint: 'Debe ser mayor que 0 y menor o igual al saldo.',
        step3Title: '3. Confirmar recibo',
        step3Desc: 'Verifica la información antes de registrar.',
        confirmCheck: 'Confirmo que la información es correcta.',
        prev: 'Anterior',
        next: 'Siguiente',
        confirm: 'Confirmar y registrar',
        loading: 'Procesando...'
      },
      en: {
        eyebrow: 'Global IaaS + PaaS',
        title: 'Register customer receipts',
        subtitle: 'Consolidate payments with traceability and secure execution.',
        status: 'Wizard active',
        metric: 'Customers with pending balance',
        wizardTitle: 'CU-007 · Create Receipts',
        wizardSubtitle: 'Select a customer, register the payment, and confirm.',
        step1Title: '1. Customers with pending balance',
        step1Desc: 'Select a customer to continue.',
        colCliente: 'Customer',
        colSaldo: 'Pending balance',
        step2Title: '2. Register payment',
        step2Desc: 'Complete the receipt details.',
        clienteLabel: 'Customer',
        saldoLabel: 'Pending balance',
        codigoLabel: 'Code',
        fechaLabel: 'Issue date',
        fechaHint: 'Format YYYY-MM-DD',
        tipoDocLabel: 'Document type',
        numeroDocLabel: 'Document number',
        cuentaLabel: 'Bank account',
        montoLabel: 'Amount to pay',
        montoHint: 'Must be greater than 0 and less or equal to balance.',
        step3Title: '3. Confirm receipt',
        step3Desc: 'Review the information before saving.',
        confirmCheck: 'I confirm the information is correct.',
        prev: 'Previous',
        next: 'Next',
        confirm: 'Confirm and save',
        loading: 'Processing...'
      }
    };

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });
  }

  setLoading(isLoading) {
    this.loadingOverlay.classList.toggle('active', isLoading);
  }

  showAlert(message, type = 'danger') {
    this.alertArea.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  clearAlert() {
    this.alertArea.innerHTML = '';
  }

  formatCurrency(value) {
    const locale = navigator.language || 'es-ES';
    const number = Number(value || 0);
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(number);
  }

  async init() {
    this.goStep(1);
    await this.loadClientes();
  }

  goStep(step) {
    if (step < 1 || step > this.totalSteps) return;
    this.currentStep = step;
    this.steps.forEach((panel) => {
      panel.classList.toggle('active', Number(panel.dataset.step) === step);
    });
    const progress = ((step - 1) / (this.totalSteps - 1)) * 100;
    this.progressBar.style.width = `${progress}%`;
    this.prevBtn.disabled = step === 1;
    this.nextBtn.style.display = step === this.totalSteps ? 'none' : 'inline-flex';
    this.submitBtn.style.display = step === this.totalSteps ? 'inline-flex' : 'none';
  }

  async loadClientes() {
    this.setLoading(true);
    this.clearAlert();
    try {
      const data = await apiFetch('/api/clientes-pendientes');
      const clientes = data.data || [];
      document.getElementById('metricClientes').textContent = clientes.length;
      const body = document.getElementById('clientesBody');
      body.innerHTML = '';
      clientes.forEach((cliente) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${cliente.nombre}</td>
          <td class="text-end">${this.formatCurrency(cliente.saldo_final)}</td>
          <td class="text-end"><button class="btn btn-sm btn-outline-light" type="button">Seleccionar</button></td>
        `;
        row.addEventListener('click', () => this.selectCliente(cliente, row));
        row.querySelector('button').addEventListener('click', (event) => {
          event.stopPropagation();
          this.selectCliente(cliente, row);
        });
        body.appendChild(row);
      });
    } catch (error) {
      this.showAlert(error.message || 'Error al cargar clientes');
    } finally {
      this.setLoading(false);
    }
  }

  async selectCliente(cliente, row) {
    document.querySelectorAll('#clientesBody tr').forEach((tr) => tr.classList.remove('selected'));
    row.classList.add('selected');
    this.state.cliente = cliente;
    await this.loadPagoData();
    this.goStep(2);
  }

  async loadPagoData() {
    if (!this.state.cliente) return;
    this.setLoading(true);
    try {
      const [cuentas, numero] = await Promise.all([
        apiFetch('/api/cuentas-bancarias'),
        apiFetch('/api/next-numero-documento')
      ]);
      this.state.cuentas = cuentas.data || [];
      this.state.numeroDocumento = numero.data?.next || '';

      const codigo = this.state.cliente.codigo_cliente;
      const saldo = this.state.cliente.saldo_final;
      document.getElementById('selectedCliente').textContent = this.state.cliente.nombre;
      document.getElementById('selectedSaldo').textContent = this.formatCurrency(saldo);
      document.getElementById('selectedCodigo').textContent = codigo;

      const fechaInput = document.getElementById('vFechaEmision');
      const today = new Date();
      const isoDate = today.toISOString().slice(0, 10);
      fechaInput.value = isoDate;
      this.state.fechaEmision = isoDate;

      document.getElementById('vNumeroDocumento').value = this.state.numeroDocumento;
      const cuentaSelect = document.getElementById('vCodigoCuenta');
      cuentaSelect.innerHTML = '<option value="">Seleccione...</option>';
      this.state.cuentas.forEach((cuenta) => {
        const option = document.createElement('option');
        option.value = cuenta.codigo_cuentabancaria;
        option.textContent = cuenta.descripcion || `${cuenta.codigo_cuentabancaria}`;
        cuentaSelect.appendChild(option);
      });
    } catch (error) {
      this.showAlert(error.message || 'Error al cargar datos del pago');
    } finally {
      this.setLoading(false);
    }
  }

  handleNext() {
    this.clearAlert();
    if (this.currentStep === 1) {
      if (!this.state.cliente) {
        this.showAlert('Seleccione un cliente para continuar.', 'warning');
        return;
      }
    }

    if (this.currentStep === 2) {
      const validation = this.validatePago();
      if (!validation.valid) {
        this.showAlert(validation.message, 'warning');
        return;
      }
      this.populateConfirm();
    }

    this.goStep(this.currentStep + 1);
  }

  validatePago() {
    const fecha = document.getElementById('vFechaEmision').value.trim();
    const numero = document.getElementById('vNumeroDocumento').value.trim();
    const cuenta = document.getElementById('vCodigoCuenta').value.trim();
    const monto = document.getElementById('vMonto').value.trim();

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const amountRegex = /^\d+(\.\d{1,2})?$/;
    const docRegex = /^\d{12}$/;

    if (!dateRegex.test(fecha)) {
      return { valid: false, message: 'La fecha no tiene el formato correcto.' };
    }
    if (!docRegex.test(numero)) {
      return { valid: false, message: 'El número de documento no es válido.' };
    }
    if (!cuenta) {
      return { valid: false, message: 'Seleccione una cuenta bancaria.' };
    }
    if (!amountRegex.test(monto)) {
      return { valid: false, message: 'El monto debe ser numérico.' };
    }

    const montoValue = Number(monto);
    if (montoValue <= 0) {
      return { valid: false, message: 'El monto debe ser mayor que 0.' };
    }
    const saldo = Number(this.state.cliente?.saldo_final || 0);
    if (montoValue > saldo) {
      return { valid: false, message: 'El monto no puede exceder el saldo pendiente.' };
    }

    this.state.fechaEmision = fecha;
    this.state.codigoCuenta = cuenta;
    this.state.monto = montoValue;

    return { valid: true };
  }

  populateConfirm() {
    const cuenta = this.state.cuentas.find((item) => String(item.codigo_cuentabancaria) === this.state.codigoCuenta);
    document.getElementById('confirmCliente').textContent = this.state.cliente?.nombre || '';
    document.getElementById('confirmSaldo').textContent = this.formatCurrency(this.state.cliente?.saldo_final || 0);
    document.getElementById('confirmMonto').textContent = this.formatCurrency(this.state.monto);
    document.getElementById('confirmFecha').textContent = this.state.fechaEmision;
    document.getElementById('confirmCuenta').textContent = cuenta?.descripcion || this.state.codigoCuenta;
    document.getElementById('confirmNumero').textContent = this.state.numeroDocumento;
  }

  async handleSubmit() {
    this.clearAlert();
    const confirmed = document.getElementById('confirmCheck').checked;
    if (!confirmed) {
      this.showAlert('Debes confirmar la operación para continuar.', 'warning');
      return;
    }

    this.setLoading(true);
    try {
      const payload = {
        codigo_cliente: this.state.cliente.codigo_cliente,
        nombre_cliente: this.state.cliente.nombre,
        saldo_pendiente: this.state.cliente.saldo_final,
        fecha_emision: this.state.fechaEmision,
        tipo_documento: 'REC',
        numero_documento: this.state.numeroDocumento,
        codigo_cuentabancaria: this.state.codigoCuenta,
        monto: this.state.monto
      };
      await apiFetch('/api/recibos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.showAlert('Recibo registrado correctamente.', 'success');
      document.getElementById('confirmCheck').checked = false;
      document.getElementById('vMonto').value = '';
      await this.loadClientes();
      this.goStep(1);
    } catch (error) {
      this.showAlert(error.message || 'Error al registrar el recibo');
    } finally {
      this.setLoading(false);
    }
  }
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Error en la solicitud');
  }
  return response.json();
}

const wizard = new FormWizard();
wizard.init();
