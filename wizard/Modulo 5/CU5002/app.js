class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progressBar = document.getElementById('wizardProgress');
    this.stepBadges = Array.from(document.querySelectorAll('.step-badge'));
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.registrarBtn = document.getElementById('registrarBtn');
    this.restartBtn = document.getElementById('restartBtn');
    this.errorAlert = document.getElementById('errorAlert');
    this.successAlert = document.getElementById('successAlert');
    this.loadingState = document.getElementById('loadingState');
    this.syncTime = document.getElementById('syncTime');

    this.vFecha = document.getElementById('vFecha');
    this.vTipodocumento = document.getElementById('vTipodocumento');
    this.vNumdocumento = document.getElementById('vNumdocumento');
    this.vCodigoCuenta = document.getElementById('vCodigo_cuentabancaria');
    this.vMonto = document.getElementById('vMonto');
    this.vDescripcion = document.getElementById('vDescripcion');

    this.decimalRegex = /^-?\d+(?:[.,]\d{1,2})?$/;
    this.textRegex = /^[\p{L}\p{N}\s.,;:()¡!¿?'"-]{0,200}$/u;

    this.logsModal = null;
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
        title: 'Ajuste Bancario',
        subtitle: 'Registra ajustes contables con visibilidad total, control operativo y trazabilidad en tiempo real.',
        status: 'Operativo',
        statusLabel: 'Ultima sincronizacion',
        wizardTitle: 'CU5002 - Ajuste Bancos',
        wizardSubtitle: 'Flujo guiado para registrar el ajuste bancario, confirmar y ejecutar la operacion.',
        viewLogs: 'Ver logs SQL',
        step1: 'Ajuste',
        step2: 'Confirmacion',
        step3: 'Resultado',
        step1Title: '1. Registrar Ajuste Bancario (AJC)',
        step1Help: 'Complete los datos del ajuste bancario.',
        fecha: 'Fecha',
        fechaError: 'Seleccione una fecha valida.',
        tipoDocumento: 'Tipo documento',
        numDocumento: 'Numero documento',
        cuenta: 'Cuenta bancaria',
        cuentaError: 'Seleccione una cuenta bancaria.',
        monto: 'Monto del ajuste',
        montoError: 'Ingrese un monto valido (positivo o negativo).',
        descripcion: 'Descripcion',
        descripcionError: 'La descripcion debe tener hasta 200 caracteres.',
        step2Title: '2. Confirmar y Registrar Operacion',
        step2Help: 'Revise el resumen y confirme la operacion.',
        resumenFecha: 'Fecha',
        resumenDoc: 'Documento',
        resumenMonto: 'Monto',
        resumenCuenta: 'Cuenta bancaria',
        resumenDescripcion: 'Descripcion',
        confirm: 'Confirmo que la informacion es correcta.',
        confirmError: 'Debe confirmar la operacion.',
        step3Title: '3. Resultado',
        step3Help: 'Ajuste registrado y operacion aplicada.',
        resultMessage: 'Operacion registrada exitosamente.',
        resultHint: 'Puede revisar los logs SQL de esta ejecucion.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Ajuste',
        restart: 'Nuevo ajuste',
        loading: 'Procesando...',
        logsTitle: 'Logs SQL',
        logsHelp: 'Consulta la ultima ejecucion registrada.',
        selectPlaceholder: 'Seleccione...',
        loadError: 'Error al cargar datos iniciales.',
        formError: 'Revise los campos obligatorios antes de continuar.',
        registerError: 'No se pudo registrar el ajuste.',
        logsError: 'No se pudieron cargar los logs.',
        noLogs: 'Sin logs disponibles.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Bank Adjustment',
        subtitle: 'Register accounting adjustments with full visibility, operational control, and real-time traceability.',
        status: 'Operational',
        statusLabel: 'Last sync',
        wizardTitle: 'CU5002 - Bank Adjustment',
        wizardSubtitle: 'Guided flow to register the bank adjustment, confirm, and execute the operation.',
        viewLogs: 'View SQL logs',
        step1: 'Adjustment',
        step2: 'Confirmation',
        step3: 'Result',
        step1Title: '1. Register Bank Adjustment (AJC)',
        step1Help: 'Complete the bank adjustment details.',
        fecha: 'Date',
        fechaError: 'Select a valid date.',
        tipoDocumento: 'Document type',
        numDocumento: 'Document number',
        cuenta: 'Bank account',
        cuentaError: 'Select a bank account.',
        monto: 'Adjustment amount',
        montoError: 'Enter a valid amount (positive or negative).',
        descripcion: 'Description',
        descripcionError: 'Description must be up to 200 characters.',
        step2Title: '2. Confirm and Register Operation',
        step2Help: 'Review the summary and confirm the operation.',
        resumenFecha: 'Date',
        resumenDoc: 'Document',
        resumenMonto: 'Amount',
        resumenCuenta: 'Bank account',
        resumenDescripcion: 'Description',
        confirm: 'I confirm the information is correct.',
        confirmError: 'You must confirm the operation.',
        step3Title: '3. Result',
        step3Help: 'Adjustment registered and operation applied.',
        resultMessage: 'Operation successfully registered.',
        resultHint: 'You can review SQL logs for this execution.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Adjustment',
        restart: 'New adjustment',
        loading: 'Processing...',
        logsTitle: 'SQL logs',
        logsHelp: 'Check the latest execution logs.',
        selectPlaceholder: 'Select...',
        loadError: 'Error loading initial data.',
        formError: 'Review the required fields before continuing.',
        registerError: 'Unable to register the adjustment.',
        logsError: 'Unable to load logs.',
        noLogs: 'No logs available.'
      }
    };

    this.localeStrings = translations[locale];
    document.documentElement.lang = locale;
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

    document.getElementById('viewLogsBtn').addEventListener('click', () => this.openLogs());
    document.getElementById('viewLogsBtnBottom').addEventListener('click', () => this.openLogs());

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => this.resetWizard());
    }

    [this.vCodigoCuenta, this.vMonto, this.vDescripcion, this.vFecha].forEach((field) => {
      ['input', 'change'].forEach((evt) => {
        field.addEventListener(evt, () => {
          this.clearFieldError(field);
          this.updateSummary();
        });
      });
    });

    document.getElementById('confirmCheck').addEventListener('change', (event) => {
      if (event.target.checked) {
        event.target.classList.remove('is-invalid');
      }
    });
  }

  async loadInitialData() {
    try {
      const [now, cuentas, nextDoc] = await Promise.all([
        this.fetchJson('/api/now'),
        this.fetchJson('/api/cuentasbancarias'),
        this.fetchJson('/api/next-numdocumento-ajc')
      ]);

      this.syncTime.textContent = now?.hora || '--:--';
      this.vFecha.value = now?.fecha || '';
      this.vTipodocumento.value = 'AJC';
      this.vNumdocumento.value = String(nextDoc?.next || 1);

      this.renderCuentas(cuentas || []);
      this.updateSummary();
    } catch (error) {
      this.showError(error.message || this.localeStrings.loadError);
    }
  }

  renderCuentas(cuentas) {
    const clean = Array.isArray(cuentas) ? cuentas : [];
    this.vCodigoCuenta.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = this.localeStrings.selectPlaceholder;
    this.vCodigoCuenta.appendChild(placeholder);
    clean.forEach((cuenta) => {
      const option = document.createElement('option');
      const codigo = cuenta.codigo_cuentabancaria ?? cuenta.codigo ?? cuenta.id ?? '';
      const nombre = cuenta.nombre ?? cuenta.descripcion ?? cuenta.banco ?? '';
      option.value = codigo;
      option.textContent = nombre ? `${codigo} - ${nombre}` : String(codigo);
      this.vCodigoCuenta.appendChild(option);
    });
  }

  updateSummary() {
    document.getElementById('summaryFecha').textContent = this.vFecha.value || '--';
    document.getElementById('summaryDocumento').textContent = `${this.vTipodocumento.value}-${
      this.vNumdocumento.value || '--'
    }`;
    document.getElementById('summaryMonto').textContent = this.vMonto.value || '--';
    document.getElementById('summaryCuenta').textContent = this.getSelectedText(this.vCodigoCuenta);
    document.getElementById('summaryDescripcion').textContent = this.vDescripcion.value || '--';
  }

  getSelectedText(select) {
    const option = select.selectedOptions?.[0];
    return option && option.value ? option.textContent : '--';
  }

  goStep(step) {
    if (step < 0 || step >= this.steps.length) return;
    this.currentStep = step;
    this.steps.forEach((panel, index) => {
      panel.style.display = index === step ? 'block' : 'none';
    });

    this.stepBadges.forEach((badge, index) => {
      badge.classList.toggle('active', index === step);
    });

    const progress = ((step + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;

    this.prevBtn.disabled = step === 0;
    this.nextBtn.classList.toggle('d-none', step !== 0);
    this.registrarBtn.classList.toggle('d-none', step !== 1);

    if (step === 2) {
      this.prevBtn.disabled = true;
      this.nextBtn.classList.add('d-none');
    }
  }

  async handleNext() {
    this.clearAlerts();
    if (!this.validateStep1()) {
      return;
    }
    this.goStep(1);
  }

  validateStep1() {
    let valid = true;

    if (!this.vFecha.value) {
      this.setFieldError(this.vFecha, this.localeStrings.fechaError);
      valid = false;
    }

    if (!this.vCodigoCuenta.value) {
      this.setFieldError(this.vCodigoCuenta, this.localeStrings.cuentaError);
      valid = false;
    }

    const montoRaw = this.vMonto.value.trim();
    const montoValue = this.parseNumber(montoRaw);
    if (!montoRaw || !this.decimalRegex.test(montoRaw) || !Number.isFinite(montoValue) || montoValue === 0) {
      this.setFieldError(this.vMonto, this.localeStrings.montoError);
      valid = false;
    }

    if (this.vDescripcion.value && !this.textRegex.test(this.vDescripcion.value.trim())) {
      this.setFieldError(this.vDescripcion, this.localeStrings.descripcionError);
      valid = false;
    }

    if (!valid) {
      this.showError(this.localeStrings.formError);
    }

    return valid;
  }

  async handleRegistrar() {
    this.clearAlerts();
    const confirmCheck = document.getElementById('confirmCheck');
    if (!confirmCheck.checked) {
      confirmCheck.classList.add('is-invalid');
      this.showError(this.localeStrings.confirmError);
      return;
    }

    if (!this.validateStep1()) {
      return;
    }

    const payload = {
      vFecha: this.vFecha.value,
      vTipodocumento: 'AJC',
      vNumdocumento: this.vNumdocumento.value,
      vCodigo_cuentabancaria: this.vCodigoCuenta.value,
      vMonto: this.parseNumber(this.vMonto.value.trim()),
      vDescripcion: this.vDescripcion.value.trim()
    };

    try {
      this.showLoading(true);
      const response = await this.fetchJson('/api/ajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.showSuccess(response?.message || 'Ajuste registrado correctamente.');
      this.goStep(2);
    } catch (error) {
      this.showError(error.message || this.localeStrings.registerError);
    } finally {
      this.showLoading(false);
    }
  }

  resetWizard() {
    this.clearAlerts();
    this.vMonto.value = '';
    this.vDescripcion.value = '';
    this.vCodigoCuenta.value = '';
    document.getElementById('confirmCheck').checked = false;
    this.loadInitialData();
    this.goStep(0);
  }

  async openLogs() {
    try {
      const data = await this.fetchJson('/api/logs/latest');
      document.getElementById('logsContent').textContent = data.content || this.localeStrings.noLogs;
      if (!this.logsModal) {
        this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
      }
      this.logsModal.show();
    } catch (error) {
      this.showError(this.localeStrings.logsError);
    }
  }

  parseNumber(value) {
    if (!value) return 0;
    return Number(value.replace(',', '.'));
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
