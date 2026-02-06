/*
SPs lectura
vClientesPendientes = Llamada SP: get_clientes_saldo_pendiente() (devuelve campo_visible)
Campos devueltos
codigo_cliente
nombre
saldo_final
Variables
vCodigo_cliente no visible no editable
vNombreCliente visible no editable
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
    eyebrow: 'Module 1 · Finance',
    title: 'CU006 · Create Receipts',
    subtitle: 'Manage pending payments with a secure, traceable global experience.',
    badgeTitle: 'IaaS + PaaS Runtime',
    badgeSubtitle: 'Global infrastructure for real-time receipts',
    step1Label: 'Step 1 of 3',
    step1Hint: 'Select a client with pending balance.',
    step2Label: 'Step 2 of 3',
    step2Hint: 'Register the payment details.',
    step3Label: 'Step 3 of 3',
    step3Hint: 'Confirm and register the receipt.',
    step1Title: 'Clients with pending balance',
    step1Desc: 'Filter and select the client to continue with the receipt registration.',
    searchLabel: 'Search client',
    pendingLabel: 'Pending clients',
    clienteCol: 'Client',
    saldoCol: 'Pending balance',
    actionCol: 'Action',
    selectClient: 'Select',
    step2Title: 'Register payment',
    step2Desc: 'Complete the receipt and select the bank account.',
    clientName: 'Client',
    saldoPendiente: 'Pending balance',
    fechaEmision: 'Issue date',
    tipoDocumento: 'Document type',
    numeroDocumento: 'Document number',
    cuentaBancaria: 'Bank account',
    cuentaBanco: 'Bank',
    monto: 'Amount',
    descripcion: 'Description (optional)',
    step3Title: 'Confirm and register',
    step3Desc: 'Review the information before registering the receipt.',
    reviewCliente: 'Client',
    reviewSaldo: 'Pending balance',
    reviewMonto: 'Payment amount',
    reviewFecha: 'Date',
    reviewCuenta: 'Bank account',
    confirmLabel: 'I confirm that the data is correct.',
    prev: 'Previous',
    next: 'Next',
    confirm: 'Confirm and register',
    loading: 'Processing...',
    requiredClient: 'Select a client to continue.',
    requiredAccount: 'Select a bank account.',
    invalidAmount: 'Enter a valid amount greater than 0.',
    amountExceeds: 'The amount cannot exceed the pending balance.',
    requiredConfirm: 'Confirm the receipt to proceed.',
    success: 'Receipt registered successfully. The form is ready for a new entry.',
    fetchError: 'We could not load the data. Please try again.'
  },
  es: {
    eyebrow: 'Modulo 1 · Finanzas',
    title: 'CU006 · Crear Recibos',
    subtitle: 'Gestiona pagos pendientes con una experiencia segura, trazable y global.',
    badgeTitle: 'Entorno IaaS + PaaS',
    badgeSubtitle: 'Infraestructura global para recibos en tiempo real',
    step1Label: 'Paso 1 de 3',
    step1Hint: 'Selecciona un cliente con saldo pendiente.',
    step2Label: 'Paso 2 de 3',
    step2Hint: 'Registra los datos del pago.',
    step3Label: 'Paso 3 de 3',
    step3Hint: 'Confirma y registra el recibo.',
    step1Title: 'Clientes con saldo pendiente',
    step1Desc: 'Filtra y selecciona al cliente para continuar con el registro del recibo.',
    searchLabel: 'Buscar cliente',
    pendingLabel: 'Clientes pendientes',
    clienteCol: 'Cliente',
    saldoCol: 'Saldo pendiente',
    actionCol: 'Accion',
    selectClient: 'Seleccionar',
    step2Title: 'Registrar pago',
    step2Desc: 'Completa el recibo y selecciona la cuenta bancaria.',
    clientName: 'Cliente',
    saldoPendiente: 'Saldo pendiente',
    fechaEmision: 'Fecha de emision',
    tipoDocumento: 'Tipo documento',
    numeroDocumento: 'Numero documento',
    cuentaBancaria: 'Cuenta bancaria',
    cuentaBanco: 'Banco',
    monto: 'Monto',
    descripcion: 'Descripcion (opcional)',
    step3Title: 'Confirmar y registrar',
    step3Desc: 'Revisa la informacion antes de registrar el recibo.',
    reviewCliente: 'Cliente',
    reviewSaldo: 'Saldo pendiente',
    reviewMonto: 'Monto a pagar',
    reviewFecha: 'Fecha',
    reviewCuenta: 'Cuenta bancaria',
    confirmLabel: 'Confirmo que los datos son correctos.',
    prev: 'Anterior',
    next: 'Siguiente',
    confirm: 'Confirmar y registrar',
    loading: 'Procesando...',
    requiredClient: 'Selecciona un cliente para continuar.',
    requiredAccount: 'Selecciona una cuenta bancaria.',
    invalidAmount: 'Ingresa un monto valido mayor que 0.',
    amountExceeds: 'El monto no puede superar el saldo pendiente.',
    requiredConfirm: 'Confirma el recibo para continuar.',
    success: 'Recibo registrado correctamente. El formulario esta listo para un nuevo registro.',
    fetchError: 'No pudimos cargar los datos. Intentalo nuevamente.'
  }
};

class FormWizard {
  constructor() {
    this.state = {
      step: 1,
      clients: [],
      filteredClients: [],
      accounts: [],
      selectedClient: null,
      lang: this.detectLanguage()
    };

    this.moneyRegex = /^(?:0|[1-9]\d*)(?:[\.,]\d{1,2})?$/;

    this.elements = {
      stepPanels: Array.from(document.querySelectorAll('.step-panel')),
      progressBar: document.getElementById('progressBar'),
      stepLabel: document.getElementById('stepLabel'),
      stepHint: document.getElementById('stepHint'),
      alertBox: document.getElementById('alertBox'),
      clientesTable: document.querySelector('#clientesTable tbody'),
      clientesCount: document.getElementById('clientesCount'),
      clienteSearch: document.getElementById('clienteSearch'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      submitBtn: document.getElementById('submitBtn'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      clienteNombre: document.getElementById('clienteNombre'),
      clienteSaldo: document.getElementById('clienteSaldo'),
      fechaEmision: document.getElementById('fechaEmision'),
      tipoDocumento: document.getElementById('tipoDocumento'),
      numeroDocumento: document.getElementById('numeroDocumento'),
      cuentaSearch: document.getElementById('cuentaSearch'),
      cuentasList: document.getElementById('cuentasList'),
      codigoCuenta: document.getElementById('codigoCuenta'),
      cuentaBanco: document.getElementById('cuentaBanco'),
      monto: document.getElementById('monto'),
      descripcion: document.getElementById('descripcion'),
      reviewClienteNombre: document.getElementById('reviewClienteNombre'),
      reviewSaldo: document.getElementById('reviewSaldo'),
      reviewMonto: document.getElementById('reviewMonto'),
      reviewFecha: document.getElementById('reviewFecha'),
      reviewCuenta: document.getElementById('reviewCuenta'),
      confirmCheck: document.getElementById('confirmCheck')
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

  setLoading(isLoading) {
    this.elements.loadingOverlay.classList.toggle('d-none', !isLoading);
  }

  formatCurrency(value) {
    const numberValue = Number(value || 0);
    return new Intl.NumberFormat(this.state.lang === 'es' ? 'es-PE' : 'en-US', {
      style: 'currency',
      currency: 'PEN'
    }).format(numberValue);
  }

  parseAmount(value) {
    if (!value) return 0;
    const normalized = String(value).replace(',', '.');
    return Number(normalized);
  }

  async init() {
    this.applyTranslations();
    this.bindEvents();
    this.setDefaultDate();
    await this.loadClients();
  }

  bindEvents() {
    this.elements.prevBtn.addEventListener('click', () => this.goPrev());
    this.elements.nextBtn.addEventListener('click', () => this.goNext());
    this.elements.submitBtn.addEventListener('click', () => this.submitReceipt());
    this.elements.clienteSearch.addEventListener('input', (event) => this.filterClients(event.target.value));
    this.elements.cuentaSearch.addEventListener('input', (event) => this.filterAccounts(event.target.value));
    this.elements.cuentaSearch.addEventListener('focus', () => this.filterAccounts(this.elements.cuentaSearch.value));
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.typeahead')) {
        this.elements.cuentasList.style.display = 'none';
      }
    });
  }

  setDefaultDate() {
    const now = new Date();
    const isoDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    this.elements.fechaEmision.value = isoDate;
  }

  async fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
  }

  async loadClients() {
    this.setLoading(true);
    try {
      const payload = await this.fetchJson('/api/clientes-pendientes');
      this.state.clients = payload.data || [];
      this.filterClients('');
    } catch (error) {
      this.setAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false);
    }
  }

  filterClients(query) {
    const term = String(query || '').toLowerCase();
    this.state.filteredClients = this.state.clients.filter((client) =>
      String(client.nombre || '').toLowerCase().includes(term)
    );
    this.renderClients();
  }

  renderClients() {
    this.elements.clientesTable.innerHTML = '';
    this.state.filteredClients.forEach((client) => {
      const row = document.createElement('tr');
      const isSelected = this.state.selectedClient && this.state.selectedClient.codigo_cliente === client.codigo_cliente;
      row.innerHTML = `
        <td>
          <div class="fw-semibold">${client.nombre || '-'}</div>
          <div class="text-muted small">${client.codigo_cliente || ''}</div>
        </td>
        <td class="fw-semibold">${this.formatCurrency(client.saldo_final)}</td>
        <td>
          <button class="btn btn-sm btn-outline-light" type="button">${this.t('selectClient')}</button>
        </td>
      `;
      if (isSelected) {
        row.classList.add('table-active');
      }
      row.addEventListener('click', () => this.selectClient(client));
      row.querySelector('button').addEventListener('click', (event) => {
        event.stopPropagation();
        this.selectClient(client);
      });
      this.elements.clientesTable.appendChild(row);
    });
    this.elements.clientesCount.textContent = String(this.state.filteredClients.length);
  }

  selectClient(client) {
    this.state.selectedClient = client;
    this.elements.clienteNombre.textContent = client.nombre || '-';
    this.elements.clienteSaldo.textContent = this.formatCurrency(client.saldo_final);
    this.setAlert('');
    this.renderClients();
  }

  async loadAccounts() {
    if (this.state.accounts.length) {
      return;
    }
    this.setLoading(true);
    try {
      const payload = await this.fetchJson('/api/cuentas-bancarias');
      this.state.accounts = payload.data || [];
    } catch (error) {
      this.setAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false);
    }
  }

  filterAccounts(query) {
    const term = String(query || '').toLowerCase();
    const list = this.state.accounts
      .filter((account) => {
        const nombre = String(account.nombre || '').toLowerCase();
        const banco = String(account.banco || '').toLowerCase();
        return nombre.includes(term) || banco.includes(term);
      })
      .slice(0, 20);

    this.elements.cuentasList.innerHTML = '';
    list.forEach((account) => {
      const item = document.createElement('div');
      item.className = 'typeahead-item';
      item.textContent = `${account.nombre || ''} · ${account.banco || ''}`;
      item.addEventListener('click', () => this.selectAccount(account));
      this.elements.cuentasList.appendChild(item);
    });

    this.elements.cuentasList.style.display = list.length ? 'block' : 'none';
  }

  selectAccount(account) {
    this.elements.cuentaSearch.value = account.nombre || '';
    this.elements.cuentaBanco.value = account.banco || '';
    this.elements.codigoCuenta.value = account.codigo_cuentabancaria || '';
    this.elements.cuentasList.style.display = 'none';
  }

  async ensureNumeroDocumento() {
    if (this.elements.numeroDocumento.value) {
      return;
    }
    this.setLoading(true);
    try {
      const payload = await this.fetchJson('/api/next-numero-documento?tipo=RCP');
      this.elements.numeroDocumento.value = payload.next || '';
    } catch (error) {
      this.setAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false);
    }
  }

  updateProgress() {
    const steps = {
      1: { width: 33, label: this.t('step1Label'), hint: this.t('step1Hint') },
      2: { width: 66, label: this.t('step2Label'), hint: this.t('step2Hint') },
      3: { width: 100, label: this.t('step3Label'), hint: this.t('step3Hint') }
    };
    const meta = steps[this.state.step];
    if (meta) {
      this.elements.progressBar.style.width = `${meta.width}%`;
      this.elements.stepLabel.textContent = meta.label;
      this.elements.stepHint.textContent = meta.hint;
    }
    this.elements.prevBtn.disabled = this.state.step === 1;
    this.elements.nextBtn.classList.toggle('d-none', this.state.step === 3);
    this.elements.submitBtn.classList.toggle('d-none', this.state.step !== 3);
  }

  showStep(step) {
    this.state.step = step;
    this.elements.stepPanels.forEach((panel) => {
      panel.classList.toggle('active', Number(panel.dataset.step) === step);
    });
    this.updateProgress();
  }

  async goNext() {
    this.setAlert('');
    if (this.state.step === 1) {
      if (!this.state.selectedClient) {
        this.setAlert(this.t('requiredClient'));
        return;
      }
      await this.loadAccounts();
      await this.ensureNumeroDocumento();
      this.showStep(2);
      return;
    }

    if (this.state.step === 2) {
      const validation = this.validateStep2();
      if (!validation.ok) {
        this.setAlert(validation.message);
        return;
      }
      this.populateReview();
      this.showStep(3);
    }
  }

  goPrev() {
    this.setAlert('');
    if (this.state.step > 1) {
      this.showStep(this.state.step - 1);
    }
  }

  validateStep2() {
    const amountValue = this.elements.monto.value.trim();
    if (!this.elements.codigoCuenta.value) {
      return { ok: false, message: this.t('requiredAccount') };
    }
    if (!this.moneyRegex.test(amountValue) || this.parseAmount(amountValue) <= 0) {
      return { ok: false, message: this.t('invalidAmount') };
    }
    const amountNumber = this.parseAmount(amountValue);
    const saldo = Number(this.state.selectedClient?.saldo_final || 0);
    if (amountNumber > saldo) {
      return { ok: false, message: this.t('amountExceeds') };
    }
    return { ok: true };
  }

  populateReview() {
    const amountNumber = this.parseAmount(this.elements.monto.value);
    this.elements.reviewClienteNombre.textContent = this.state.selectedClient?.nombre || '-';
    this.elements.reviewSaldo.textContent = this.formatCurrency(this.state.selectedClient?.saldo_final);
    this.elements.reviewMonto.textContent = this.formatCurrency(amountNumber);
    this.elements.reviewFecha.textContent = this.elements.fechaEmision.value || '-';
    this.elements.reviewCuenta.textContent = `${this.elements.cuentaSearch.value} · ${this.elements.cuentaBanco.value}`;
  }

  resetForm() {
    this.state.selectedClient = null;
    this.elements.clienteNombre.textContent = '-';
    this.elements.clienteSaldo.textContent = '-';
    this.elements.cuentaSearch.value = '';
    this.elements.cuentaBanco.value = '';
    this.elements.codigoCuenta.value = '';
    this.elements.monto.value = '';
    this.elements.descripcion.value = '';
    this.elements.numeroDocumento.value = '';
    this.elements.confirmCheck.checked = false;
    this.renderClients();
    this.setDefaultDate();
    this.showStep(1);
  }

  async submitReceipt() {
    this.setAlert('');
    if (!this.elements.confirmCheck.checked) {
      this.setAlert(this.t('requiredConfirm'));
      return;
    }
    const amountNumber = this.parseAmount(this.elements.monto.value);
    const payload = {
      codigo_cliente: this.state.selectedClient?.codigo_cliente,
      nombre_cliente: this.state.selectedClient?.nombre,
      saldo_pendiente: this.state.selectedClient?.saldo_final,
      fecha_emision: this.elements.fechaEmision.value,
      tipo_documento: this.elements.tipoDocumento.value,
      numero_documento: this.elements.numeroDocumento.value,
      codigo_cuentabancaria: this.elements.codigoCuenta.value,
      monto: amountNumber,
      descripcion: this.elements.descripcion.value || null
    };

    this.setLoading(true);
    try {
      await this.fetchJson('/api/recibos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      this.setAlert(this.t('success'), 'success');
      this.resetForm();
    } catch (error) {
      this.setAlert(this.t('fetchError'));
    } finally {
      this.setLoading(false);
    }
  }
}

const wizard = new FormWizard();
wizard.init();
