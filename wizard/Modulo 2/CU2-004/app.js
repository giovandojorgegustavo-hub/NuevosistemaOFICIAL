/*
vBases = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
codigo_base
nombre
Variables
vcodigo_base no visible editable
vnombre_base visible editable

vNuevoPacking = Captura manual en formulario (no llamada SP)
Variables
vnombre_packing_nuevo visible editable
vtipo_packing_nuevo visible editable
vdescripcion_packing_nuevo visible editable

vconfirmar_operacion visible editable
*/

const TRANSLATIONS = {
  es: {
    eyebrow: 'GLOBAL IAAS + PAAS',
    title: 'Registrar Packing por Base',
    subtitle: 'Completa la configuracion en dos pasos y guarda en una transaccion unica.',
    step1Pill: '1. Configuracion',
    step2Pill: '2. Resumen y Guardar',
    step1Title: 'Paso 1. Configuracion de Base + Nuevo Packing',
    step2Title: 'Paso 2. Resumen y Guardar',
    baseLabel: 'Base',
    basePlaceholder: 'Escribe para filtrar por codigo o nombre',
    baseHelp: 'Select con typeahead: escribe y filtra entre miles de registros.',
    baseHelpReadonly: 'Base asignada por permisos del usuario (solo lectura).',
    newNameLabel: 'Nombre packing',
    newTypeLabel: 'Tipo packing',
    newDescriptionLabel: 'Descripcion',
    confirmLabel: 'Confirmo la operacion.',
    prevBtn: 'Anterior',
    nextBtn: 'Siguiente',
    saveBtn: 'Guardar Packing',
    summaryBase: 'Base seleccionada',
    summaryPackingName: 'Nuevo packing: nombre',
    summaryPackingType: 'Nuevo packing: tipo',
    summaryPackingDescription: 'Nuevo packing: descripcion',
    errBaseRequired: 'Selecciona una base valida antes de continuar.',
    errFieldsRequired: 'Nombre, tipo y descripcion son obligatorios.',
    errFieldsFormat: 'Nombre, tipo o descripcion tienen formato invalido.',
    errConfirmRequired: 'Debes confirmar la operacion antes de guardar.',
    errServer: 'No fue posible completar la operacion. Revisa logs del backend.',
    errLoadBases: 'No fue posible cargar bases desde la base de datos.',
    errUserRequired: 'No se encontro Codigo_usuario en la URL.',
    errUnauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
    okSaved: 'Packing registrado correctamente. Codigo generado: {codigo}'
  },
  en: {
    eyebrow: 'GLOBAL IAAS + PAAS',
    title: 'Register Packing by Base',
    subtitle: 'Complete the two-step flow and save using one transaction.',
    step1Pill: '1. Setup',
    step2Pill: '2. Summary and Save',
    step1Title: 'Step 1. Base Setup + New Packing',
    step2Title: 'Step 2. Summary and Save',
    baseLabel: 'Base',
    basePlaceholder: 'Type to filter by code or name',
    baseHelp: 'Typeahead select: type and filter large datasets.',
    baseHelpReadonly: 'Base assigned by user privileges (read-only).',
    newNameLabel: 'Packing name',
    newTypeLabel: 'Packing type',
    newDescriptionLabel: 'Description',
    confirmLabel: 'I confirm the operation.',
    prevBtn: 'Previous',
    nextBtn: 'Next',
    saveBtn: 'Save Packing',
    summaryBase: 'Selected base',
    summaryPackingName: 'New packing: name',
    summaryPackingType: 'New packing: type',
    summaryPackingDescription: 'New packing: description',
    errBaseRequired: 'Select a valid base before continuing.',
    errFieldsRequired: 'Name, type and description are required.',
    errFieldsFormat: 'Name, type or description format is invalid.',
    errConfirmRequired: 'You must confirm the operation before saving.',
    errServer: 'Request failed. Check backend logs.',
    errLoadBases: 'Could not load bases from the database.',
    errUserRequired: 'Codigo_usuario not found in URL.',
    errUnauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
    okSaved: 'Packing saved successfully. Generated code: {codigo}'
  }
};

class FormWizard {
  constructor() {
    this.state = {
      vstep: 1,
      vtotal_steps: 2,
      vlang: 'es',
      vcodigo_usuario: '',
      vpriv: '',
      vbases: [],
      vbase_options: [],
      vselected_base: null,
      vloading: false,
      vbase_help_default: ''
    };

    this.regex = {
      vnumeric: /^\d+$/,
      vtext: /^(?=.{1,255}$).+$/
    };

    this.cacheDom();
    this.bindEvents();
    this.init();
  }

  cacheDom() {
    this.el = {
      vprogress_bar: document.getElementById('progressBar'),
      vstep_pills: document.querySelectorAll('.step-pill'),
      vstep1: document.getElementById('step1'),
      vstep2: document.getElementById('step2'),
      valert_box: document.getElementById('alertBox'),
      vsuccess_box: document.getElementById('successBox'),
      vloading_bases: document.getElementById('loadingBases'),
      vloading_save: document.getElementById('loadingSave'),
      vnombre_base: document.getElementById('vnombre_base'),
      vbase_help: document.getElementById('baseHelpText'),
      vbases_list: document.getElementById('basesList'),
      vcodigo_base: document.getElementById('vcodigo_base'),
      vnombre_packing_nuevo: document.getElementById('vnombre_packing_nuevo'),
      vtipo_packing_nuevo: document.getElementById('vtipo_packing_nuevo'),
      vdescripcion_packing_nuevo: document.getElementById('vdescripcion_packing_nuevo'),
      vsummary_grid: document.getElementById('summaryGrid'),
      vconfirmar_operacion: document.getElementById('vconfirmar_operacion'),
      vbtn_prev: document.getElementById('btnPrev'),
      vbtn_next: document.getElementById('btnNext'),
      vbtn_save: document.getElementById('btnSave')
    };
  }

  bindEvents() {
    this.el.vbtn_prev.addEventListener('click', () => this.prevStep());
    this.el.vbtn_next.addEventListener('click', () => this.nextStep());
    this.el.vbtn_save.addEventListener('click', () => this.savePacking());

    this.el.vconfirmar_operacion.addEventListener('change', () => {
      this.el.vbtn_save.disabled = !this.el.vconfirmar_operacion.checked;
    });

    this.el.vnombre_base.addEventListener('input', (event) => {
      if (this.state.vpriv !== 'ALL') return;
      this.filterBases(event.target.value);
    });

    this.el.vnombre_base.addEventListener('change', () => {
      if (this.state.vpriv !== 'ALL') return;
      this.syncSelectedBase();
    });

    this.el.vnombre_base.addEventListener('blur', () => {
      if (this.state.vpriv !== 'ALL') return;
      this.syncSelectedBase();
    });
  }

  async init() {
    this.state.vcodigo_usuario = this.resolveCodigoUsuarioFromUrl();
    this.applyLanguage();
    this.state.vbase_help_default = this.t('baseHelp');
    this.setStep(1);
    if (!this.state.vcodigo_usuario) {
      this.showError(this.t('errUserRequired'));
      this.setBaseEditable(false);
      return;
    }
    await this.loadBases();
  }

  resolveCodigoUsuarioFromUrl() {
    const params = new URLSearchParams(window.location.search || '');
    const value =
      params.get('Codigo_usuario') ||
      params.get('codigo_usuario') ||
      params.get('vUsuario') ||
      params.get('vCodigo_usuario') ||
      '';
    return String(value).trim();
  }

  applyLanguage() {
    const lang = navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
    this.state.vlang = lang;
    document.documentElement.lang = lang;

    const dict = TRANSLATIONS[lang];

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (dict[key]) {
        node.textContent = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (dict[key]) {
        node.setAttribute('placeholder', dict[key]);
      }
    });
  }

  t(key) {
    return TRANSLATIONS[this.state.vlang][key] || key;
  }

  clearMessages() {
    this.el.valert_box.classList.add('d-none');
    this.el.vsuccess_box.classList.add('d-none');
    this.el.valert_box.textContent = '';
    this.el.vsuccess_box.textContent = '';
  }

  showError(message) {
    this.el.valert_box.textContent = message;
    this.el.valert_box.classList.remove('d-none');
  }

  showSuccess(message) {
    this.el.vsuccess_box.textContent = message;
    this.el.vsuccess_box.classList.remove('d-none');
  }

  setLoading(visLoading, vtarget) {
    this.state.vloading = visLoading;

    if (vtarget === 'bases') {
      this.el.vloading_bases.classList.toggle('d-none', !visLoading);
    }
    if (vtarget === 'save') {
      this.el.vloading_save.classList.toggle('d-none', !visLoading);
    }

    this.el.vbtn_prev.disabled = visLoading || this.state.vstep === 1;
    this.el.vbtn_next.disabled = visLoading;
    this.el.vbtn_save.disabled = visLoading || !this.el.vconfirmar_operacion.checked;
  }

  async fetchJson(url, options) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.message || 'REQUEST_ERROR');
    }
    return body;
  }

  async loadBases() {
    this.clearMessages();
    this.setLoading(true, 'bases');

    try {
      const query = new URLSearchParams({ codigo_usuario: this.state.vcodigo_usuario });
      const data = await this.fetchJson(`./api/bases?${query.toString()}`);
      const rows = Array.isArray(data.rows) ? data.rows : [];
      this.state.vpriv = String(data.vPriv || '').trim().toUpperCase();
      this.state.vbases = rows.map((row) => ({
        vcodigo_base: String(row.codigo_base),
        vnombre_base: String(row.nombre)
      }));
      this.state.vbase_options = [...this.state.vbases];
      this.renderBaseOptions();
      this.applyBasePrivileges(data);
    } catch (error) {
      if (String(error.message || '').toUpperCase() === 'UNAUTHORIZED') {
        this.showError(this.t('errUnauthorized'));
      } else {
        this.showError(this.t('errLoadBases'));
      }
    } finally {
      this.setLoading(false, 'bases');
    }
  }

  applyBasePrivileges(data) {
    const isAll = this.state.vpriv === 'ALL';
    this.setBaseEditable(isAll);

    if (isAll) {
      this.el.vbase_help.textContent = this.state.vbase_help_default;
      this.syncSelectedBase();
      return;
    }

    const fixedBase = this.state.vbases.find((row) => String(row.vcodigo_base) === String(data.vBase)) || this.state.vbases[0] || null;
    this.state.vselected_base = fixedBase;
    this.el.vcodigo_base.value = fixedBase ? fixedBase.vcodigo_base : String(data.vBase || '');
    this.el.vnombre_base.value =
      fixedBase ? `${fixedBase.vcodigo_base} - ${fixedBase.vnombre_base}` : String(data.vBaseTexto || '').trim();
    this.el.vbase_help.textContent = this.t('baseHelpReadonly');
  }

  setBaseEditable(isEditable) {
    this.el.vnombre_base.readOnly = !isEditable;
    if (isEditable) {
      this.el.vnombre_base.setAttribute('list', 'basesList');
    } else {
      this.el.vnombre_base.removeAttribute('list');
      this.el.vbases_list.innerHTML = '';
    }
  }

  renderBaseOptions() {
    this.el.vbases_list.innerHTML = '';

    this.state.vbase_options.forEach((row) => {
      const option = document.createElement('option');
      option.value = `${row.vcodigo_base} - ${row.vnombre_base}`;
      this.el.vbases_list.appendChild(option);
    });
  }

  filterBases(vterm) {
    const q = String(vterm || '').toLowerCase().trim();
    if (!q) {
      this.state.vbase_options = [...this.state.vbases];
      this.renderBaseOptions();
      this.syncSelectedBase();
      return;
    }

    this.state.vbase_options = this.state.vbases.filter((row) => {
      const label = `${row.vcodigo_base} - ${row.vnombre_base}`.toLowerCase();
      return label.includes(q);
    });

    this.renderBaseOptions();
    this.syncSelectedBase();
  }

  syncSelectedBase() {
    const value = String(this.el.vnombre_base.value || '').trim();
    const selected = this.state.vbases.find((row) => `${row.vcodigo_base} - ${row.vnombre_base}` === value) || null;

    this.state.vselected_base = selected;
    this.el.vcodigo_base.value = selected ? selected.vcodigo_base : '';
  }

  setStep(vnextStep) {
    this.state.vstep = vnextStep;
    const progress = (vnextStep / this.state.vtotal_steps) * 100;
    this.el.vprogress_bar.style.width = `${progress}%`;

    this.el.vstep1.classList.toggle('d-none', vnextStep !== 1);
    this.el.vstep2.classList.toggle('d-none', vnextStep !== 2);

    this.el.vstep_pills.forEach((node) => {
      const nodeStep = Number(node.getAttribute('data-step'));
      node.classList.toggle('active', nodeStep <= vnextStep);
    });

    this.el.vbtn_prev.disabled = this.state.vstep === 1;
    this.el.vbtn_next.classList.toggle('d-none', this.state.vstep === this.state.vtotal_steps);
    this.el.vbtn_save.classList.toggle('d-none', this.state.vstep !== this.state.vtotal_steps);

    if (this.state.vstep === 2) {
      this.renderSummary();
      this.el.vbtn_save.disabled = !this.el.vconfirmar_operacion.checked;
    }
  }

  validateStep1() {
    const vcodigo_base = String(this.el.vcodigo_base.value || '').trim();
    const vnombre_packing_nuevo = String(this.el.vnombre_packing_nuevo.value || '').trim();
    const vtipo_packing_nuevo = String(this.el.vtipo_packing_nuevo.value || '').trim();
    const vdescripcion_packing_nuevo = String(this.el.vdescripcion_packing_nuevo.value || '').trim();

    if (!vcodigo_base || !this.regex.vnumeric.test(vcodigo_base)) {
      this.showError(this.t('errBaseRequired'));
      return false;
    }

    if (!vnombre_packing_nuevo || !vtipo_packing_nuevo || !vdescripcion_packing_nuevo) {
      this.showError(this.t('errFieldsRequired'));
      return false;
    }

    if (
      !this.regex.vtext.test(vnombre_packing_nuevo) ||
      !this.regex.vtext.test(vtipo_packing_nuevo) ||
      !this.regex.vtext.test(vdescripcion_packing_nuevo)
    ) {
      this.showError(this.t('errFieldsFormat'));
      return false;
    }

    return true;
  }

  renderSummary() {
    const baseText = this.state.vselected_base
      ? `${this.state.vselected_base.vcodigo_base} - ${this.state.vselected_base.vnombre_base}`
      : '-';

    const rows = [
      { label: this.t('summaryBase'), value: baseText },
      { label: this.t('summaryPackingName'), value: this.el.vnombre_packing_nuevo.value.trim() || '-' },
      { label: this.t('summaryPackingType'), value: this.el.vtipo_packing_nuevo.value.trim() || '-' },
      { label: this.t('summaryPackingDescription'), value: this.el.vdescripcion_packing_nuevo.value.trim() || '-' }
    ];

    this.el.vsummary_grid.innerHTML = '';
    rows.forEach((row) => {
      const item = document.createElement('div');
      item.className = 'summary-item';
      item.innerHTML = `<small>${row.label}</small><strong>${row.value}</strong>`;
      this.el.vsummary_grid.appendChild(item);
    });
  }

  nextStep() {
    this.clearMessages();

    if (this.state.vstep === 1) {
      if (!this.validateStep1()) {
        return;
      }
      this.setStep(2);
    }
  }

  prevStep() {
    this.clearMessages();
    if (this.state.vstep > 1) {
      this.setStep(this.state.vstep - 1);
    }
  }

  async savePacking() {
    this.clearMessages();

    if (!this.el.vconfirmar_operacion.checked) {
      this.showError(this.t('errConfirmRequired'));
      return;
    }

    const payload = {
      codigo_usuario: this.state.vcodigo_usuario,
      vcodigo_base: String(this.el.vcodigo_base.value || '').trim(),
      vnombre_packing_nuevo: String(this.el.vnombre_packing_nuevo.value || '').trim(),
      vtipo_packing_nuevo: String(this.el.vtipo_packing_nuevo.value || '').trim(),
      vdescripcion_packing_nuevo: String(this.el.vdescripcion_packing_nuevo.value || '').trim()
    };

    this.setLoading(true, 'save');

    try {
      const data = await this.fetchJson('./api/guardar-packing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const msg = this.t('okSaved').replace('{codigo}', String(data.vcodigo_packing_nuevo || '-'));
      this.showSuccess(msg);
      this.resetWizard();
    } catch (error) {
      const code = String(error.message || '').toUpperCase();
      if (code === 'UNAUTHORIZED' || code === 'BASE_FORBIDDEN') {
        this.showError(this.t('errUnauthorized'));
      } else {
        this.showError(this.t('errServer'));
      }
    } finally {
      this.setLoading(false, 'save');
    }
  }

  resetWizard() {
    if (this.state.vpriv === 'ALL') {
      this.el.vnombre_base.value = '';
      this.el.vcodigo_base.value = '';
      this.state.vselected_base = null;
      this.state.vbase_options = [...this.state.vbases];
      this.renderBaseOptions();
    } else {
      this.applyBasePrivileges({
        vBase: this.el.vcodigo_base.value,
        vBaseTexto: this.el.vnombre_base.value
      });
    }
    this.el.vnombre_packing_nuevo.value = '';
    this.el.vtipo_packing_nuevo.value = '';
    this.el.vdescripcion_packing_nuevo.value = '';
    this.el.vconfirmar_operacion.checked = false;

    this.setStep(1);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  window.formWizard = wizard;
});
