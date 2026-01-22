class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('[data-step]'));
    this.progressBar = document.querySelector('#wizardProgress');
    this.prevBtn = document.querySelector('#prevBtn');
    this.nextBtn = document.querySelector('#nextBtn');
    this.submitBtn = document.querySelector('#submitBtn');
    this.alertBox = document.querySelector('#alertBox');
    this.loadingOverlay = document.querySelector('#loadingOverlay');
    this.logsModal = document.querySelector('#logsModal');
    this.state = {
      step: 0,
      clients: [],
      cuentas: [],
      selectedClient: null,
      payment: {
        fecha_emision: '',
        tipo_documento: 'RC',
        numero_documento: '',
        codigo_cliente: '',
        codigo_cuentabancaria: '',
        monto: '',
      },
    };
    this.regex = {
      monto: /^\d+(?:\.\d{1,2})?$/,
    };
  }

  init() {
    this.loadState();
    this.bindEvents();
    this.fetchInitialData();
    this.showStep(this.state.step);
    this.renderState();
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.submitBtn.addEventListener('click', () => this.submit());

    document.querySelector('#clientesTable').addEventListener('change', (event) => {
      if (event.target.name === 'clienteSelect') {
        const codigo = event.target.value;
        const cliente = this.state.clients.find((item) => String(item.codigo_cliente) === codigo);
        this.state.selectedClient = cliente || null;
        this.state.payment.codigo_cliente = cliente ? cliente.codigo_cliente : '';
        this.persist();
        this.renderState();
      }
    });

    document.querySelector('#cuentaBancaria').addEventListener('change', (event) => {
      this.state.payment.codigo_cuentabancaria = event.target.value;
      this.persist();
    });

    document.querySelector('#monto').addEventListener('input', (event) => {
      this.state.payment.monto = event.target.value.trim();
      this.persist();
    });

    document.querySelector('#confirmCheck').addEventListener('change', () => {
      this.renderState();
    });

    document.querySelector('#refreshLogs').addEventListener('click', () => this.loadLogs());
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.loadingOverlay.classList.remove('d-none');
      this.nextBtn.disabled = true;
      this.prevBtn.disabled = true;
      this.submitBtn.disabled = true;
    } else {
      this.loadingOverlay.classList.add('d-none');
      this.updateButtons();
    }
  }

  showAlert(type, message) {
    this.alertBox.className = `alert alert-${type}`;
    this.alertBox.textContent = message;
    this.alertBox.classList.remove('d-none');
  }

  clearAlert() {
    this.alertBox.classList.add('d-none');
    this.alertBox.textContent = '';
  }

  loadState() {
    const raw = localStorage.getItem('cu007-state');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.state = { ...this.state, ...data };
      } catch (error) {
        localStorage.removeItem('cu007-state');
      }
    }
  }

  persist() {
    localStorage.setItem('cu007-state', JSON.stringify(this.state));
  }

  async fetchInitialData() {
    this.setLoading(true);
    try {
      const [clientes, cuentas, nextDoc] = await Promise.all([
        fetch('/api/clientes').then((res) => res.json()),
        fetch('/api/cuentasbancarias').then((res) => res.json()),
        fetch('/api/documento/next').then((res) => res.json()),
      ]);
      this.state.clients = Array.isArray(clientes) ? clientes : [];
      this.state.cuentas = Array.isArray(cuentas) ? cuentas : [];
      if (!this.state.payment.numero_documento && nextDoc && nextDoc.next) {
        this.state.payment.numero_documento = nextDoc.next;
      }
      if (!this.state.payment.fecha_emision) {
        this.state.payment.fecha_emision = new Date().toISOString().slice(0, 10);
      }
      if (this.state.selectedClient) {
        const match = this.state.clients.find(
          (item) => String(item.codigo_cliente) === String(this.state.selectedClient.codigo_cliente)
        );
        if (!match) {
          this.state.selectedClient = null;
          this.state.payment.codigo_cliente = '';
        }
      }
      this.persist();
      this.renderState();
      this.loadLogs();
    } catch (error) {
      this.showAlert('danger', 'No se pudieron cargar los datos iniciales.');
    } finally {
      this.setLoading(false);
    }
  }

  updateButtons() {
    this.prevBtn.disabled = this.state.step === 0;
    this.nextBtn.classList.toggle('d-none', this.state.step === this.steps.length - 1);
    this.submitBtn.classList.toggle('d-none', this.state.step !== this.steps.length - 1);
    if (this.state.step === this.steps.length - 1) {
      const confirm = document.querySelector('#confirmCheck').checked;
      this.submitBtn.disabled = !confirm;
    } else {
      this.submitBtn.disabled = false;
    }
  }

  showStep(index) {
    this.steps.forEach((step) => {
      step.classList.toggle('d-none', Number(step.dataset.step) !== index);
    });
    this.state.step = index;
    this.updateProgress();
    this.updateButtons();
    this.persist();
  }

  updateProgress() {
    const percent = ((this.state.step + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${percent}%`;
    this.progressBar.setAttribute('aria-valuenow', String(percent));
  }

  next() {
    this.clearAlert();
    if (!this.validateStep()) return;
    this.showStep(Math.min(this.state.step + 1, this.steps.length - 1));
  }

  prev() {
    this.clearAlert();
    this.showStep(Math.max(this.state.step - 1, 0));
  }

  validateStep() {
    if (this.state.step === 0) {
      if (!this.state.selectedClient) {
        this.showAlert('warning', 'Selecciona un cliente con saldo pendiente.');
        return false;
      }
    }
    if (this.state.step === 1) {
      const monto = this.state.payment.monto;
      if (!this.state.payment.codigo_cuentabancaria) {
        this.showAlert('warning', 'Selecciona una cuenta bancaria.');
        return false;
      }
      if (!this.regex.monto.test(monto) || Number(monto) <= 0) {
        this.showAlert('warning', 'Ingresa un monto valido mayor que 0.');
        return false;
      }
    }
    return true;
  }

  async submit() {
    this.clearAlert();
    if (!this.validateStep()) return;

    const payload = {
      fecha_emision: this.state.payment.fecha_emision,
      tipo_documento: this.state.payment.tipo_documento,
      numero_documento: this.state.payment.numero_documento,
      codigo_cliente: this.state.payment.codigo_cliente,
      codigo_cuentabancaria: this.state.payment.codigo_cuentabancaria,
      saldo: Number(this.state.payment.monto),
    };

    this.setLoading(true);
    try {
      const res = await fetch('/api/recibos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al registrar el recibo');
      }
      this.showAlert('success', 'Recibo registrado correctamente.');
      localStorage.removeItem('cu007-state');
      this.state.step = 0;
      this.state.selectedClient = null;
      this.state.payment.monto = '';
      this.state.payment.codigo_cuentabancaria = '';
      this.showStep(0);
      await this.fetchInitialData();
    } catch (error) {
      this.showAlert('danger', error.message);
    } finally {
      this.setLoading(false);
      this.loadLogs();
    }
  }

  renderState() {
    const clientesBody = document.querySelector('#clientesBody');
    clientesBody.innerHTML = '';
    if (this.state.clients.length === 0) {
      clientesBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin clientes</td></tr>';
    } else {
      this.state.clients.forEach((cliente) => {
        const row = document.createElement('tr');
        const checked =
          this.state.selectedClient &&
          String(this.state.selectedClient.codigo_cliente) === String(cliente.codigo_cliente);
        row.innerHTML = `
          <td>
            <input class="form-check-input" type="radio" name="clienteSelect" value="${cliente.codigo_cliente}" ${
              checked ? 'checked' : ''
            }>
          </td>
          <td>${cliente.codigo_cliente}</td>
          <td>${cliente.nombre || cliente.nombre_cliente || ''}</td>
          <td class="text-end">${Number(cliente.saldo_final || 0).toFixed(2)}</td>
        `;
        clientesBody.appendChild(row);
      });
    }

    document.querySelector('#fechaEmision').value = this.state.payment.fecha_emision || '';
    document.querySelector('#tipoDocumento').value = this.state.payment.tipo_documento || 'RC';
    document.querySelector('#numeroDocumento').value = this.state.payment.numero_documento || '';
    document.querySelector('#codigoCliente').value = this.state.payment.codigo_cliente || '';

    const cuentaSelect = document.querySelector('#cuentaBancaria');
    cuentaSelect.innerHTML = '<option value="">--</option>';
    this.state.cuentas.forEach((cuenta) => {
      const option = document.createElement('option');
      option.value = cuenta.codigo_cuentabancaria || cuenta.codigo || '';
      option.textContent = `${cuenta.codigo_cuentabancaria || cuenta.codigo || ''} - ${cuenta.nombre || cuenta.descripcion || ''}`;
      if (String(option.value) === String(this.state.payment.codigo_cuentabancaria)) {
        option.selected = true;
      }
      cuentaSelect.appendChild(option);
    });

    document.querySelector('#monto').value = this.state.payment.monto || '';

    document.querySelector('#resumenCliente').textContent = this.state.selectedClient
      ? `${this.state.selectedClient.codigo_cliente} - ${this.state.selectedClient.nombre || ''}`
      : '--';
    document.querySelector('#resumenMonto').textContent = this.state.payment.monto
      ? Number(this.state.payment.monto).toFixed(2)
      : '--';
    document.querySelector('#resumenCuenta').textContent = this.state.payment.codigo_cuentabancaria || '--';
    document.querySelector('#resumenDocumento').textContent = this.state.payment.numero_documento || '--';

    this.updateButtons();
  }

  async loadLogs() {
    try {
      const res = await fetch('/api/logs/latest?limit=120');
      const data = await res.json();
      const logsBox = document.querySelector('#logsContent');
      logsBox.textContent = (data.lines || []).join('\n');
    } catch (error) {
      const logsBox = document.querySelector('#logsContent');
      logsBox.textContent = 'No se pudieron cargar los logs.';
    }
  }
}

const translations = {
  es: {
    title: 'Registrar Recibos',
    subtitle: 'Flujo guiado para cobranza de servicios globales.',
    step1Title: 'Clientes con saldo pendiente',
    step2Title: 'Datos del recibo',
    step3Title: 'Confirmacion',
    clienteCol: 'Cliente',
    nombreCol: 'Nombre',
    saldoCol: 'Saldo',
    fechaEmision: 'Fecha de emision',
    tipoDoc: 'Tipo documento',
    numeroDoc: 'Numero documento',
    codigoCliente: 'Codigo cliente',
    cuentaBancaria: 'Cuenta bancaria',
    monto: 'Monto',
    resumen: 'Resumen del recibo',
    confirmar: 'Confirmo que deseo registrar el recibo.',
    prev: 'Anterior',
    next: 'Siguiente',
    submit: 'Registrar Recibo',
    logs: 'Ver logs SQL',
    cargarLogs: 'Actualizar logs',
  },
  en: {
    title: 'Register Receipts',
    subtitle: 'Guided flow for global services collections.',
    step1Title: 'Clients with pending balance',
    step2Title: 'Receipt details',
    step3Title: 'Confirmation',
    clienteCol: 'Client',
    nombreCol: 'Name',
    saldoCol: 'Balance',
    fechaEmision: 'Issue date',
    tipoDoc: 'Document type',
    numeroDoc: 'Document number',
    codigoCliente: 'Client code',
    cuentaBancaria: 'Bank account',
    monto: 'Amount',
    resumen: 'Receipt summary',
    confirmar: 'I confirm I want to register the receipt.',
    prev: 'Previous',
    next: 'Next',
    submit: 'Register Receipt',
    logs: 'View SQL logs',
    cargarLogs: 'Refresh logs',
  },
};

function applyTranslations() {
  const lang = navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
  const dict = translations[lang] || translations.es;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

applyTranslations();
const wizard = new FormWizard();
wizard.init();
