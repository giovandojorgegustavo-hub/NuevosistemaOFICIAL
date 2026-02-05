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
    this.vCuentaOrigen = document.getElementById('vCodigo_cuentabancaria');
    this.vCuentaDestino = document.getElementById('vCodigo_cuentabancaria_destino');
    this.vMonto = document.getElementById('vMonto');
    this.vDescripcion = document.getElementById('vDescripcion');

    this.decimalRegex = /^\d+(?:[.,]\d{1,2})?$/;
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
        title: 'Transferencia Bancaria',
        subtitle: 'Registra transferencias interbancarias con controles de seguridad, trazabilidad y experiencia guiada.',
        status: 'Operativo',
        statusLabel: 'Ultima sincronizacion',
        wizardTitle: 'CU5001 - Transferencia Bancos',
        wizardSubtitle: 'Flujo guiado para registrar la transferencia, confirmar y ejecutar la operacion bancaria.',
        viewLogs: 'Ver logs SQL',
        step1: 'Transferencia',
        step2: 'Confirmacion',
        step3: 'Resultado',
        step1Title: '1. Registrar Transferencia Bancaria (TRS)',
        step1Help: 'Complete los datos de la transferencia bancaria.',
        fecha: 'Fecha',
        fechaError: 'Seleccione una fecha valida.',
        tipoDocumento: 'Tipo documento',
        numDocumento: 'Numero documento',
        cuentaOrigen: 'Cuenta bancaria origen',
        cuentaDestino: 'Cuenta bancaria destino',
        cuentaError: 'Seleccione una cuenta bancaria.',
        cuentaDestinoError: 'Seleccione una cuenta bancaria destino.',
        monto: 'Monto de transferencia',
        montoError: 'Ingrese un monto valido.',
        descripcion: 'Descripcion',
        descripcionError: 'La descripcion debe tener hasta 200 caracteres.',
        step2Title: '2. Confirmar y Registrar Operacion',
        step2Help: 'Revise el resumen y confirme la operacion.',
        resumenFecha: 'Fecha',
        resumenDoc: 'Documento',
        resumenMonto: 'Monto',
        resumenCuentaOrigen: 'Cuenta origen',
        resumenCuentaDestino: 'Cuenta destino',
        resumenDescripcion: 'Descripcion',
        confirm: 'Confirmo que la informacion es correcta.',
        confirmError: 'Debe confirmar la operacion.',
        step3Title: '3. Resultado',
        step3Help: 'Transferencia registrada y operacion aplicada.',
        resultMessage: 'Operacion registrada exitosamente.',
        resultHint: 'Puede revisar los logs SQL de esta ejecucion.',
        prev: 'Anterior',
        next: 'Siguiente',
        registrar: 'Registrar Transferencia',
        restart: 'Nueva transferencia',
        loading: 'Procesando...',
        logsTitle: 'Logs SQL',
        logsHelp: 'Consulta la ultima ejecucion registrada.',
        selectPlaceholder: 'Seleccione...'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Bank Transfer',
        subtitle: 'Register interbank transfers with security controls, traceability, and a guided experience.',
        status: 'Operational',
        statusLabel: 'Last sync',
        wizardTitle: 'CU5001 - Bank Transfer',
        wizardSubtitle: 'Guided flow to register the transfer, confirm, and execute the banking operation.',
        viewLogs: 'View SQL logs',
        step1: 'Transfer',
        step2: 'Confirmation',
        step3: 'Result',
        step1Title: '1. Register Bank Transfer (TRS)',
        step1Help: 'Complete the bank transfer details.',
        fecha: 'Date',
        fechaError: 'Select a valid date.',
        tipoDocumento: 'Document type',
        numDocumento: 'Document number',
        cuentaOrigen: 'Origin bank account',
        cuentaDestino: 'Destination bank account',
        cuentaError: 'Select a bank account.',
        cuentaDestinoError: 'Select a destination account.',
        monto: 'Transfer amount',
        montoError: 'Enter a valid amount.',
        descripcion: 'Description',
        descripcionError: 'Description must be up to 200 characters.',
        step2Title: '2. Confirm and Register Operation',
        step2Help: 'Review the summary and confirm the operation.',
        resumenFecha: 'Date',
        resumenDoc: 'Document',
        resumenMonto: 'Amount',
        resumenCuentaOrigen: 'Origin account',
        resumenCuentaDestino: 'Destination account',
        resumenDescripcion: 'Description',
        confirm: 'I confirm the information is correct.',
        confirmError: 'You must confirm the operation.',
        step3Title: '3. Result',
        step3Help: 'Transfer registered and operation applied.',
        resultMessage: 'Operation successfully registered.',
        resultHint: 'You can review SQL logs for this execution.',
        prev: 'Back',
        next: 'Next',
        registrar: 'Register Transfer',
        restart: 'New transfer',
        loading: 'Processing...',
        logsTitle: 'SQL logs',
        logsHelp: 'Check the latest execution logs.',
        selectPlaceholder: 'Select...'
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

    [this.vCuentaOrigen, this.vCuentaDestino, this.vMonto, this.vDescripcion, this.vFecha].forEach((field) => {
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
        this.fetchJson('/api/next-numdocumento-trs')
      ]);

      this.syncTime.textContent = now?.hora || '--:--';
      this.vFecha.value = now?.fecha || '';
      this.vTipodocumento.value = 'TRS';
      this.vNumdocumento.value = String(nextDoc?.next || 1);

      this.renderCuentas(cuentas || []);
      this.updateSummary();
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    }
  }

  renderCuentas(cuentas) {
    const clean = Array.isArray(cuentas) ? cuentas : [];
    const buildOptions = (select) => {
      select.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = this.localeStrings.selectPlaceholder;
      select.appendChild(placeholder);
      clean.forEach((cuenta) => {
        const option = document.createElement('option');
        const codigo = cuenta.codigo_cuentabancaria ?? cuenta.codigo ?? cuenta.id ?? '';
        const nombre = cuenta.nombre ?? cuenta.descripcion ?? cuenta.banco ?? '';
        option.value = codigo;
        option.textContent = nombre ? `${codigo} - ${nombre}` : String(codigo);
        select.appendChild(option);
      });
    };

    buildOptions(this.vCuentaOrigen);
    buildOptions(this.vCuentaDestino);
  }

  updateSummary() {
    document.getElementById('summaryFecha').textContent = this.vFecha.value || '--';
    document.getElementById('summaryDocumento').textContent = `${this.vTipodocumento.value}-${
      this.vNumdocumento.value || '--'
    }`;
    document.getElementById('summaryMonto').textContent = this.vMonto.value || '--';
    document.getElementById('summaryCuentaOrigen').textContent = this.getSelectedText(this.vCuentaOrigen);
    document.getElementById('summaryCuentaDestino').textContent = this.getSelectedText(this.vCuentaDestino);
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

    if (!this.vCuentaOrigen.value) {
      this.setFieldError(this.vCuentaOrigen, this.localeStrings.cuentaError);
      valid = false;
    }

    if (!this.vCuentaDestino.value) {
      this.setFieldError(this.vCuentaDestino, this.localeStrings.cuentaDestinoError);
      valid = false;
    }

    if (this.vCuentaOrigen.value && this.vCuentaDestino.value && this.vCuentaOrigen.value === this.vCuentaDestino.value) {
      this.showError('La cuenta origen y destino no pueden ser la misma.');
      valid = false;
    }

    const montoRaw = this.vMonto.value.trim();
    if (!montoRaw || !this.decimalRegex.test(montoRaw) || this.parseNumber(montoRaw) <= 0) {
      this.setFieldError(this.vMonto, this.localeStrings.montoError);
      valid = false;
    }

    if (this.vDescripcion.value && !this.textRegex.test(this.vDescripcion.value.trim())) {
      this.setFieldError(this.vDescripcion, this.localeStrings.descripcionError);
      valid = false;
    }

    if (!valid) {
      this.showError('Revise los campos obligatorios antes de continuar.');
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
      vTipodocumento: 'TRS',
      vNumdocumento: this.vNumdocumento.value,
      vCodigo_cuentabancaria: this.vCuentaOrigen.value,
      vCodigo_cuentabancaria_destino: this.vCuentaDestino.value,
      vMonto: this.parseNumber(this.vMonto.value.trim()),
      vDescripcion: this.vDescripcion.value.trim()
    };

    try {
      this.showLoading(true);
      const response = await this.fetchJson('/api/transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.showSuccess(response?.message || 'Transferencia registrada correctamente.');
      this.goStep(2);
    } catch (error) {
      this.showError(error.message || 'No se pudo registrar la transferencia.');
    } finally {
      this.showLoading(false);
    }
  }

  resetWizard() {
    this.clearAlerts();
    this.vMonto.value = '';
    this.vDescripcion.value = '';
    this.vCuentaOrigen.value = '';
    this.vCuentaDestino.value = '';
    document.getElementById('confirmCheck').checked = false;
    this.loadInitialData();
    this.goStep(0);
  }

  async openLogs() {
    try {
      const data = await this.fetchJson('/api/logs/latest');
      document.getElementById('logsContent').textContent = data.content || 'Sin logs disponibles.';
      if (!this.logsModal) {
        this.logsModal = new bootstrap.Modal(document.getElementById('logsModal'));
      }
      this.logsModal.show();
    } catch (error) {
      this.showError('No se pudieron cargar los logs.');
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
