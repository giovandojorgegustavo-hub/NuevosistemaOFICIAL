class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progressBar = document.getElementById('wizardProgress');
    this.stepBadges = Array.from(document.querySelectorAll('.step-badge'));
    this.actionBtn = document.getElementById('abrirHorarioBtn');
    this.errorAlert = document.getElementById('errorAlert');
    this.successAlert = document.getElementById('successAlert');
    this.loadingState = document.getElementById('loadingState');
    this.syncTime = document.getElementById('syncTime');
    this.ultimaAsistencia = document.getElementById('ultimaAsistencia');
    this.estadoAsistencia = document.getElementById('estadoAsistencia');

    this.vFecha = document.getElementById('vFecha');
    this.vCodigo_base = document.getElementById('vCodigo_base');
    this.vCodigo_usuario = document.getElementById('vCodigo_usuario');
    this.vUltima_asistencia = document.getElementById('vUltima_asistencia');

    this.dateRegex = /^\d{4}-\d{2}-\d{2}$/;
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
        title: 'Abrir Horario',
        subtitle: 'Registra la asistencia diaria con controles y bitacora en tiempo real.',
        status: 'Operativo',
        statusLabel: 'Ultima sincronizacion',
        wizardTitle: 'CU2001 - Abrir Horario',
        wizardSubtitle: 'Flujo de un solo paso para registrar asistencia y actualizar la bitacora.',
        viewLogs: 'Ver logs SQL',
        step1: 'Abrir Horario',
        step1Title: '1. Abrir Horario',
        step1Help: 'Confirme los datos y registre la asistencia.',
        fecha: 'Fecha',
        fechaError: 'Fecha invalida.',
        ultimaAsistenciaLabel: 'Ultima asistencia',
        asistenciaEstado: 'Asistencia',
        asistenciaPendiente: 'Pendiente',
        asistenciaOk: 'Registrada',
        abrirHorario: 'Abrir Horario',
        logsTitle: 'Logs SQL',
        logsHelp: 'Consulta la ultima ejecucion registrada.',
        loading: 'Procesando...',
        errorGeneric: 'Revise los campos antes de continuar.',
        success: 'Horario abierto correctamente.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Core',
        title: 'Open Schedule',
        subtitle: 'Register daily attendance with controls and real-time logging.',
        status: 'Operational',
        statusLabel: 'Last sync',
        wizardTitle: 'CU2001 - Open Schedule',
        wizardSubtitle: 'Single-step flow to register attendance and update the log.',
        viewLogs: 'View SQL logs',
        step1: 'Open Schedule',
        step1Title: '1. Open Schedule',
        step1Help: 'Confirm the data and register attendance.',
        fecha: 'Date',
        fechaError: 'Invalid date.',
        ultimaAsistenciaLabel: 'Last attendance',
        asistenciaEstado: 'Attendance',
        asistenciaPendiente: 'Pending',
        asistenciaOk: 'Registered',
        abrirHorario: 'Open Schedule',
        logsTitle: 'SQL logs',
        logsHelp: 'Check the latest execution logs.',
        loading: 'Processing...',
        errorGeneric: 'Check the required fields before continuing.',
        success: 'Schedule opened successfully.'
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
    document.getElementById('viewLogsBtn').addEventListener('click', () => this.openLogs());
    document.getElementById('viewLogsBtnBottom').addEventListener('click', () => this.openLogs());

    this.actionBtn.addEventListener('click', () => this.handleAbrirHorario());

    this.vFecha.addEventListener('change', () => {
      this.clearFieldError(this.vFecha);
    });
  }

  async loadInitialData() {
    try {
      const now = await this.fetchJson('/api/now');
      this.syncTime.textContent = now?.hora || '--:--';
      this.vFecha.value = now?.fecha || '';

      const userbase = window.userbase ?? 1; // TODO: reemplazar cuando userbase este disponible
      const currentuser = window.currentuser ?? 1; // TODO: reemplazar cuando currentuser este disponible
      this.vCodigo_base.value = String(userbase);
      this.vCodigo_usuario.value = String(currentuser);

      const ultima = await this.fetchJson(
        `/api/ultima-asistencia?codigo_base=${encodeURIComponent(userbase)}&codigo_usuario=${encodeURIComponent(
          currentuser
        )}`
      );
      this.updateUltimaAsistencia(ultima?.ultima_asistencia || null);
    } catch (error) {
      this.showError(error.message || 'Error al cargar datos iniciales.');
    }
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
  }

  validateStep() {
    let valid = true;
    if (!this.vFecha.value || !this.dateRegex.test(this.vFecha.value)) {
      this.setFieldError(this.vFecha, this.localeStrings.fechaError);
      valid = false;
    }

    if (!valid) {
      this.showError(this.localeStrings.errorGeneric);
    }

    return valid;
  }

  async handleAbrirHorario() {
    this.clearAlerts();
    if (!this.validateStep()) {
      return;
    }

    const payload = {
      vFecha: this.vFecha.value,
      vCodigo_base: this.vCodigo_base.value,
      vCodigo_usuario: this.vCodigo_usuario.value
    };

    try {
      this.showLoading(true);
      const response = await this.fetchJson('/api/abrir-horario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.showSuccess(response?.message || this.localeStrings.success);
      const fecha = response?.fecha || this.vFecha.value;
      this.updateUltimaAsistencia(fecha);
      this.markAsistencia();
    } catch (error) {
      this.showError(error.message || 'No se pudo abrir el horario.');
    } finally {
      this.showLoading(false);
    }
  }

  updateUltimaAsistencia(value) {
    const label = this.localeStrings.ultimaAsistenciaLabel;
    if (!value) {
      this.ultimaAsistencia.textContent = `${label}: sin registro`;
      this.vUltima_asistencia.value = '';
      return;
    }
    this.ultimaAsistencia.textContent = `${label}: ${value}`;
    this.vUltima_asistencia.value = value;
  }

  markAsistencia() {
    this.actionBtn.classList.remove('btn-primary');
    this.actionBtn.classList.add('btn-success');
    this.estadoAsistencia.textContent = this.localeStrings.asistenciaOk;
    this.estadoAsistencia.classList.remove('status-pending');
    this.estadoAsistencia.classList.add('status-ok');
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
