class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progress = document.getElementById('wizardProgress');
    this.stepPills = Array.from(document.querySelectorAll('.step-pill'));
    this.alertArea = document.getElementById('alertArea');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');

    this.clientesTableBody = document.querySelector('#clientesTable tbody');

    this.clienteNombre = document.getElementById('clienteNombre');
    this.clienteSaldo = document.getElementById('clienteSaldo');
    this.clienteCodigo = document.getElementById('clienteCodigo');

    this.fechaEmision = document.getElementById('fechaEmision');
    this.tipoDocumento = document.getElementById('tipoDocumento');
    this.numeroDocumento = document.getElementById('numeroDocumento');
    this.cuentaSelect = document.getElementById('cuentaSelect');
    this.montoInput = document.getElementById('montoInput');

    this.summaryCliente = document.getElementById('summaryCliente');
    this.summarySaldo = document.getElementById('summarySaldo');
    this.summaryMonto = document.getElementById('summaryMonto');
    this.summaryFecha = document.getElementById('summaryFecha');
    this.summaryCuenta = document.getElementById('summaryCuenta');

    this.confirmCheck = document.getElementById('confirmCheck');

    this.currentStep = 1;
    this.selectedCliente = null;
    this.clientes = [];
    this.cuentas = [];

    this.vTipoDocumento = 'REC';
    this.vNumeroDocumento = null;

    this.regex = {
      decimal: /^\d+(?:\.\d+)?$/,
    };

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('step1Next').addEventListener('click', () => this.handleStep1());
    document.getElementById('step2Back').addEventListener('click', () => this.goToStep(1));
    document.getElementById('step2Next').addEventListener('click', () => this.handleStep2());
    document.getElementById('step3Back').addEventListener('click', () => this.goToStep(2));
    document.getElementById('confirmBtn').addEventListener('click', () => this.handleConfirm());
    document.getElementById('btnLogs').addEventListener('click', () => this.openLogs());
  }

  async init() {
    this.setLanguage();
    this.setDefaultDate();
    await this.loadClientes();
    this.updateProgress();
  }

  setLanguage() {
    const lang = (navigator.language || 'es').split('-')[0];
    document.documentElement.lang = lang;
    const translations = this.getTranslations();
    const t = (key) => translations[lang]?.[key] || translations.es[key] || key;
    this.t = t;
    this.currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
  }

  getTranslations() {
    return {
      es: {
        eyebrow: 'Operaciones Globales IaaS / PaaS',
        title: 'Crear Recibos',
        subtitle: 'Registra pagos de clientes y actualiza saldos con trazabilidad completa.',
        viewLogs: 'Ver logs SQL',
        case: 'CU006',
        step1Pill: 'Clientes',
        step2Pill: 'Pago',
        step3Pill: 'Confirmar',
        step1Title: 'Clientes con saldo pendiente',
        step1Desc: 'Selecciona un cliente para registrar el pago.',
        thCliente: 'Cliente',
        thSaldo: 'Saldo pendiente',
        next: 'Siguiente',
        back: 'Anterior',
        step2Title: 'Registrar pago',
        step2Desc: 'Completa los datos del recibo y valida el monto.',
        labelCliente: 'Cliente',
        labelSaldo: 'Saldo pendiente',
        labelCodigo: 'Codigo cliente',
        labelFecha: 'Fecha emision',
        labelTipoDoc: 'Tipo documento',
        labelNumeroDoc: 'Numero documento',
        labelCuenta: 'Cuenta bancaria',
        labelMonto: 'Monto recibido',
        step3Title: 'Confirmar recibo',
        step3Desc: 'Verifica el resumen antes de registrar.',
        summaryCliente: 'Cliente',
        summaryPago: 'Pago',
        confirmText: 'Confirmo que deseo registrar este recibo.',
        confirm: 'Registrar recibo',
        loading: 'Cargando...',
        selectCliente: 'Selecciona un cliente para continuar.',
        loadClientesError: 'No se pudieron cargar los clientes pendientes.',
        loadCuentasError: 'No se pudieron cargar las cuentas bancarias.',
        loadNumeroError: 'No se pudo obtener el numero de recibo.',
        validationPago: 'Completa la fecha, cuenta bancaria y monto valido.',
        validationMonto: 'El monto debe ser mayor que 0 y menor o igual al saldo pendiente.',
        confirmRequired: 'Debes confirmar la operacion.',
        success: 'Recibo registrado correctamente.',
        apiError: 'No se pudo registrar el recibo.',
        select: 'Seleccionar',
        noData: 'Sin datos',
      },
      en: {
        eyebrow: 'Global IaaS / PaaS Operations',
        title: 'Create Receipts',
        subtitle: 'Register customer payments and update balances with full traceability.',
        viewLogs: 'View SQL logs',
        case: 'CU006',
        step1Pill: 'Clients',
        step2Pill: 'Payment',
        step3Pill: 'Confirm',
        step1Title: 'Clients with pending balance',
        step1Desc: 'Select a client to register the payment.',
        thCliente: 'Client',
        thSaldo: 'Pending balance',
        next: 'Next',
        back: 'Back',
        step2Title: 'Register payment',
        step2Desc: 'Complete the receipt data and validate the amount.',
        labelCliente: 'Client',
        labelSaldo: 'Pending balance',
        labelCodigo: 'Client code',
        labelFecha: 'Issue date',
        labelTipoDoc: 'Document type',
        labelNumeroDoc: 'Document number',
        labelCuenta: 'Bank account',
        labelMonto: 'Amount received',
        step3Title: 'Confirm receipt',
        step3Desc: 'Review the summary before registering.',
        summaryCliente: 'Client',
        summaryPago: 'Payment',
        confirmText: 'I confirm I want to register this receipt.',
        confirm: 'Register receipt',
        loading: 'Loading...',
        selectCliente: 'Select a client to continue.',
        loadClientesError: 'Unable to load pending clients.',
        loadCuentasError: 'Unable to load bank accounts.',
        loadNumeroError: 'Unable to fetch receipt number.',
        validationPago: 'Complete the date, bank account, and a valid amount.',
        validationMonto: 'Amount must be greater than 0 and no more than pending balance.',
        confirmRequired: 'You must confirm the operation.',
        success: 'Receipt successfully registered.',
        apiError: 'Unable to register the receipt.',
        select: 'Select',
        noData: 'No data',
      },
    };
  }

  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    this.fechaEmision.value = today;
  }

  formatMoney(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat(this.currentLang || 'es', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  }

  showAlert(message, type = 'danger') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    this.alertArea.appendChild(wrapper);
    setTimeout(() => {
      wrapper.querySelector('.alert')?.classList.remove('show');
      wrapper.querySelector('.alert')?.classList.add('hide');
    }, 5000);
  }

  setLoading(show, text) {
    if (text) {
      this.loadingText.textContent = text;
    }
    this.loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  updateProgress() {
    this.steps.forEach((step) => {
      step.classList.toggle('active', Number(step.dataset.step) === this.currentStep);
    });
    this.stepPills.forEach((pill) => {
      pill.classList.toggle('active', Number(pill.dataset.step) === this.currentStep);
    });
    const total = this.steps.length;
    const percent = total > 1 ? ((this.currentStep - 1) / (total - 1)) * 100 : 0;
    this.progress.style.width = `${percent}%`;
  }

  goToStep(step) {
    this.currentStep = step;
    this.updateProgress();
  }

  async loadClientes() {
    this.setLoading(true, this.t('loading'));
    try {
      const response = await fetch('/api/clientes-pendientes');
      if (!response.ok) throw new Error('API');
      this.clientes = await response.json();
      this.renderClientes();
    } catch (error) {
      this.showAlert(this.t('loadClientesError'));
    } finally {
      this.setLoading(false);
    }
  }

  renderClientes() {
    this.clientesTableBody.innerHTML = '';
    if (!this.clientes.length) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="3" class="text-center text-muted">${this.t('noData')}</td>`;
      this.clientesTableBody.appendChild(row);
      return;
    }
    this.clientes.forEach((rowData) => {
      const nombre = rowData.nombre || rowData.vNombreCliente || rowData.vnombre_cliente || rowData.nombre_cliente || '';
      const saldo = Number(rowData.saldo_final || rowData.vSaldoPendiente || rowData.vsaldo_final || rowData.saldo || 0);
      const codigo = rowData.codigo_cliente || rowData.vCodigo_cliente || rowData.vcodigo_cliente || '';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${nombre}</td>
        <td>${this.formatMoney(saldo)}</td>
        <td>
          <button class="btn btn-sm btn-outline-light" type="button" data-codigo="${codigo}">${this.t('select')}</button>
        </td>
      `;
      row.querySelector('button').addEventListener('click', () => {
        this.selectCliente({ codigo, nombre, saldo });
      });
      this.clientesTableBody.appendChild(row);
    });
  }

  selectCliente(cliente) {
    this.selectedCliente = cliente;
    this.clienteNombre.textContent = cliente.nombre || '-';
    this.clienteSaldo.textContent = this.formatMoney(cliente.saldo || 0);
    this.clienteCodigo.textContent = cliente.codigo || '-';
  }

  async loadCuentas() {
    this.setLoading(true, this.t('loading'));
    try {
      const response = await fetch('/api/cuentas-bancarias');
      if (!response.ok) throw new Error('API');
      this.cuentas = await response.json();
      this.renderCuentas();
    } catch (error) {
      this.showAlert(this.t('loadCuentasError'));
    } finally {
      this.setLoading(false);
    }
  }

  renderCuentas() {
    this.cuentaSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = this.t('select');
    this.cuentaSelect.appendChild(defaultOption);
    this.cuentas.forEach((cuenta) => {
      const codigo = cuenta.codigo_cuentabancaria || cuenta.vcodigo_cuentabancaria || cuenta.codigo || '';
      const nombre =
        cuenta.nombre ||
        cuenta.descripcion ||
        cuenta.banco ||
        cuenta.nombre_banco ||
        cuenta.vnombre ||
        'Cuenta';
      const numero = cuenta.numero || cuenta.numero_cuenta || cuenta.vnumero || '';
      const option = document.createElement('option');
      option.value = codigo;
      option.textContent = `${nombre}${numero ? ` (${numero})` : ''}`;
      this.cuentaSelect.appendChild(option);
    });
  }

  async loadNumeroDocumento() {
    this.setLoading(true, this.t('loading'));
    try {
      const response = await fetch('/api/numero-documento');
      if (!response.ok) throw new Error('API');
      const data = await response.json();
      this.vNumeroDocumento = data.next;
      this.numeroDocumento.value = data.next || '';
    } catch (error) {
      this.showAlert(this.t('loadNumeroError'));
    } finally {
      this.setLoading(false);
    }
  }

  async handleStep1() {
    if (!this.selectedCliente) {
      this.showAlert(this.t('selectCliente'));
      return;
    }
    if (!this.cuentas.length) {
      await this.loadCuentas();
    }
    if (!this.vNumeroDocumento) {
      await this.loadNumeroDocumento();
    }
    this.goToStep(2);
  }

  handleStep2() {
    const fecha = this.fechaEmision.value;
    const cuenta = this.cuentaSelect.value;
    const montoRaw = this.montoInput.value.trim();
    if (!fecha || !cuenta || !montoRaw || !this.regex.decimal.test(montoRaw)) {
      this.showAlert(this.t('validationPago'));
      return;
    }
    const monto = Number(montoRaw);
    const saldo = Number(this.selectedCliente?.saldo || 0);
    if (!(monto > 0 && monto <= saldo)) {
      this.showAlert(this.t('validationMonto'));
      return;
    }
    this.updateSummary(monto, fecha, cuenta);
    this.goToStep(3);
  }

  updateSummary(monto, fecha, cuentaCodigo) {
    const cuenta = this.cuentas.find((item) => {
      const codigo = item.codigo_cuentabancaria || item.vcodigo_cuentabancaria || item.codigo || '';
      return codigo === cuentaCodigo;
    });
    const cuentaLabel =
      cuenta?.nombre ||
      cuenta?.descripcion ||
      cuenta?.banco ||
      cuenta?.nombre_banco ||
      cuenta?.vnombre ||
      cuentaCodigo;
    this.summaryCliente.textContent = `${this.selectedCliente?.nombre || ''} (ID: ${this.selectedCliente?.codigo || ''})`;
    this.summarySaldo.textContent = `${this.t('labelSaldo')}: ${this.formatMoney(this.selectedCliente?.saldo || 0)}`;
    this.summaryMonto.textContent = `${this.t('labelMonto')}: ${this.formatMoney(monto)}`;
    this.summaryFecha.textContent = `${this.t('labelFecha')}: ${fecha}`;
    this.summaryCuenta.textContent = `${this.t('labelCuenta')}: ${cuentaLabel}`;
  }

  async handleConfirm() {
    if (!this.confirmCheck.checked) {
      this.showAlert(this.t('confirmRequired'));
      return;
    }
    const payload = {
      fecha_emision: this.fechaEmision.value,
      tipo_documento: this.vTipoDocumento,
      numero_documento: this.vNumeroDocumento,
      codigo_cliente: this.selectedCliente?.codigo,
      codigo_cuentabancaria: this.cuentaSelect.value,
      monto: Number(this.montoInput.value.trim()),
    };
    this.setLoading(true, this.t('loading'));
    try {
      const response = await fetch('/api/recibos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('API');
      this.showAlert(this.t('success'), 'success');
      this.resetWizard();
    } catch (error) {
      this.showAlert(this.t('apiError'));
    } finally {
      this.setLoading(false);
    }
  }

  resetWizard() {
    this.confirmCheck.checked = false;
    this.montoInput.value = '';
    this.cuentaSelect.value = '';
    this.vNumeroDocumento = null;
    this.numeroDocumento.value = '';
    this.selectedCliente = null;
    this.clienteNombre.textContent = '-';
    this.clienteSaldo.textContent = '-';
    this.clienteCodigo.textContent = '-';
    this.goToStep(1);
    this.loadClientes();
  }

  openLogs() {
    window.open('/api/logs', '_blank');
  }
}

const wizard = new FormWizard();
wizard.init();
