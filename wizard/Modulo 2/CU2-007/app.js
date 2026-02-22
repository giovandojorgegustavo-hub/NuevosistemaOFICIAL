/*
vPrivUsuario = Llamada SP: get_priv_usuario(p_usuario = Codigo_usuario) (devuelve campo_visible)
Campos devueltos
Columna 1 (base asignada del usuario)
Columna 2 (privilegio)
Columna 3 (opcional/auxiliar)
Variables
vBaseUsuario no visible no editable
vPriv no visible no editable
vBaseAux no visible no editable

vBases = Llamada SP: get_bases() (devuelve campo_visible) SOLO si vPriv = "PRIV"
Campos devueltos
codigo_base
nombre
Variables
vCodigo_base visible editable
vNombre_base visible editable

vAsistenciaDia = Llamada SP: get_asistencia_dia_filtrado(p_fecha, p_codigo_base)
Campos devueltos
FECHA
TURNO
codigo_base
FechaRegistro
TurnoRegistro
codigo_usuario
codigo_bitacora
Variables Grid
vFecha visible no editable
vTurno visible no editable
vCodigo_base_grid no visible no editable
vFechaRegistro visible no editable
vTurnoRegistro visible no editable
vCodigo_usuario_grid visible no editable
vCodigo_bitacora_grid no visible no editable
*/

const vTranslations = {
  es: {
    eyebrow: 'GLOBAL IAAS + PAAS',
    title: 'Asistencia por Base',
    subtitle: 'Consulta la asistencia por base y fecha en un solo paso.',
    step1Pill: '1. Asistencia por Base',
    step1Title: 'Paso 1. Consultar Asistencia por Base',
    fechaConsultaLabel: 'Fecha de consulta',
    baseLabel: 'Base',
    basePlaceholder: 'Vacio = todas las bases',
    baseHelpAll: 'Privilegio PRIV: puedes escribir para filtrar y dejar vacio para todas.',
    baseHelpOne: 'Privilegio ONE: base fija del usuario (no editable).',
    quickFilterLabel: 'Filtro rapido',
    quickFilterPlaceholder: 'Filtra resultados del grid',
    consultarBtn: 'Consultar',
    limpiarBtn: 'Limpiar',
    rowsLabel: 'Registros:',
    thFecha: 'Fecha',
    thTurno: 'Turno',
    thFechaRegistro: 'Fecha Registro',
    thTurnoRegistro: 'Turno Registro',
    thCodigoUsuario: 'Codigo Usuario',
    noRecords: 'Sin registros',
    unauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
    invalidParams: 'Parametros de acceso invalidos.',
    invalidDateRequired: 'La fecha de consulta es obligatoria.',
    loadError: 'No fue posible cargar informacion inicial. Revisa logs del backend.',
    queryError: 'No fue posible consultar asistencia. Revisa logs del backend.'
  },
  en: {
    eyebrow: 'GLOBAL IAAS + PAAS',
    title: 'Attendance by Base',
    subtitle: 'Query attendance by base and date in a single step.',
    step1Pill: '1. Attendance by Base',
    step1Title: 'Step 1. Query Attendance by Base',
    fechaConsultaLabel: 'Query date',
    baseLabel: 'Base',
    basePlaceholder: 'Empty = all bases',
    baseHelpAll: 'PRIV privilege: type to filter and leave empty for all bases.',
    baseHelpOne: 'ONE privilege: fixed base assigned to user (read-only).',
    quickFilterLabel: 'Quick filter',
    quickFilterPlaceholder: 'Filter grid results',
    consultarBtn: 'Search',
    limpiarBtn: 'Reset',
    rowsLabel: 'Rows:',
    thFecha: 'Date',
    thTurno: 'Shift',
    thFechaRegistro: 'Record Date',
    thTurnoRegistro: 'Record Shift',
    thCodigoUsuario: 'User Code',
    noRecords: 'No records',
    unauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
    invalidParams: 'Invalid access parameters.',
    invalidDateRequired: 'Query date is required.',
    loadError: 'Initial data could not be loaded. Check backend logs.',
    queryError: 'Attendance query failed. Check backend logs.'
  }
};

class FormWizard {
  constructor() {
    this.vState = {
      vLang: 'es',
      vCodigo_usuario: '',
      vOTP: '',
      vParametrosRaw: null,
      vBaseUsuario: '',
      vPriv: '',
      vBaseAux: '',
      vBases: [],
      vBasesFiltradas: [],
      vCodigo_base: '',
      vFecha_consulta: '',
      vDefaultFiltros: {
        vFecha_consulta: '',
        vCodigo_base: ''
      },
      vAsistenciaDia: [],
      vSort: {
        vKey: 'TURNO',
        vDir: 'desc'
      },
      vLoading: false
    };

    this.vRegex = {
      vCodigoUsuario: /^[A-Za-z0-9-]{1,36}$/,
      vOTP: /^\d{1,6}$/,
      vFecha: /^\d{4}-\d{2}-\d{2}$/
    };

    this.vTypeaheadLimit = 200;

    this.vCacheDom();
    this.vBindEvents();
    this.vInit();
  }

  vCacheDom() {
    this.vEl = {
      vAlertBox: document.getElementById('vAlertBox'),
      vInfoBox: document.getElementById('vInfoBox'),
      vLoadingIndicator: document.getElementById('vLoadingIndicator'),
      vBaseUsuario: document.getElementById('vBaseUsuario'),
      vPriv: document.getElementById('vPriv'),
      vBaseAux: document.getElementById('vBaseAux'),
      vFecha_consulta: document.getElementById('vFecha_consulta'),
      vCodigo_base: document.getElementById('vCodigo_base'),
      vBasesList: document.getElementById('vBasesList'),
      vBaseHelp: document.getElementById('vBaseHelp'),
      vBtnConsultar: document.getElementById('vBtnConsultar'),
      vBtnLimpiar: document.getElementById('vBtnLimpiar'),
      vFiltroRapido: document.getElementById('vFiltroRapido'),
      vRowsCount: document.getElementById('vRowsCount'),
      vAsistenciaTbody: document.getElementById('vAsistenciaTbody'),
      vSortButtons: Array.from(document.querySelectorAll('.sort-btn'))
    };
  }

  vBindEvents() {
    this.vEl.vBtnConsultar.addEventListener('click', () => {
      this.vConsultar();
    });

    this.vEl.vBtnLimpiar.addEventListener('click', () => {
      this.vLimpiarFiltros();
    });

    this.vEl.vFiltroRapido.addEventListener('input', () => {
      this.vRenderGrid();
    });

    this.vEl.vCodigo_base.addEventListener('input', () => {
      this.vFiltrarBasesTypeahead();
    });

    this.vEl.vCodigo_base.addEventListener('change', () => {
      this.vCommitBase();
    });

    this.vEl.vCodigo_base.addEventListener('blur', () => {
      this.vCommitBase();
    });

    this.vEl.vSortButtons.forEach((vButton) => {
      vButton.addEventListener('click', () => {
        const vSortKey = String(vButton.dataset.sort || '').trim();
        if (!vSortKey) return;

        if (this.vState.vSort.vKey === vSortKey) {
          this.vState.vSort.vDir = this.vState.vSort.vDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.vState.vSort.vKey = vSortKey;
          this.vState.vSort.vDir = 'asc';
        }

        this.vUpdateSortIndicators();
        this.vRenderGrid();
      });
    });
  }

  async vInit() {
    this.vApplyLanguage();

    if (!this.vReadAccessParams()) {
      this.vShowError(this.vT('invalidParams'));
      this.vDenyAccess();
      return;
    }

    await this.vLoadInitialData();
  }

  vApplyLanguage() {
    const vLang = navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
    this.vState.vLang = vLang;
    document.documentElement.lang = vLang;

    const vDict = vTranslations[vLang] || vTranslations.es;

    document.querySelectorAll('[data-i18n]').forEach((vNode) => {
      const vKey = vNode.getAttribute('data-i18n');
      if (vKey && vDict[vKey]) {
        vNode.textContent = vDict[vKey];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((vNode) => {
      const vKey = vNode.getAttribute('data-i18n-placeholder');
      if (vKey && vDict[vKey]) {
        vNode.setAttribute('placeholder', vDict[vKey]);
      }
    });
  }

  vT(vKey) {
    return (vTranslations[this.vState.vLang] || vTranslations.es)[vKey] || vKey;
  }

  vReadAccessParams() {
    const vQuery = new URLSearchParams(window.location.search || '');
    const vCodigoUsuario = String(
      vQuery.get('Codigo_usuario') || vQuery.get('codigo_usuario') || vQuery.get('vUsuario') || vQuery.get('vCodigo_usuario') || ''
    ).trim();
    const vOTP = String(vQuery.get('OTP') || vQuery.get('otp') || vQuery.get('vOTP') || '').trim();

    let vParametrosRaw = null;
    if (vQuery.has('vParámetros')) vParametrosRaw = vQuery.get('vParámetros');
    else if (vQuery.has('vParametros')) vParametrosRaw = vQuery.get('vParametros');
    else if (vQuery.has('vParÃ¡metros')) vParametrosRaw = vQuery.get('vParÃ¡metros');

    this.vState.vCodigo_usuario = vCodigoUsuario;
    this.vState.vOTP = vOTP;
    this.vState.vParametrosRaw = vParametrosRaw;

    return this.vRegex.vCodigoUsuario.test(vCodigoUsuario) && this.vRegex.vOTP.test(vOTP);
  }

  vClearMessages() {
    this.vEl.vAlertBox.classList.add('d-none');
    this.vEl.vInfoBox.classList.add('d-none');
    this.vEl.vAlertBox.textContent = '';
    this.vEl.vInfoBox.textContent = '';
  }

  vShowError(vMessage) {
    this.vEl.vAlertBox.textContent = vMessage;
    this.vEl.vAlertBox.classList.remove('d-none');
  }

  vShowInfo(vMessage) {
    this.vEl.vInfoBox.textContent = vMessage;
    this.vEl.vInfoBox.classList.remove('d-none');
  }

  vSetLoading(vLoading) {
    this.vState.vLoading = vLoading;
    this.vEl.vLoadingIndicator.classList.toggle('d-none', !vLoading);

    const vDisableBase = vLoading || this.vState.vPriv !== 'PRIV';

    this.vEl.vBtnConsultar.disabled = vLoading;
    this.vEl.vBtnLimpiar.disabled = vLoading;
    this.vEl.vFecha_consulta.disabled = vLoading;
    this.vEl.vCodigo_base.disabled = vDisableBase;
    this.vEl.vFiltroRapido.disabled = vLoading;
  }

  async vFetchJson(vUrl, vOptions) {
    const vResponse = await fetch(vUrl, vOptions);
    const vBody = await vResponse.json().catch(() => ({}));

    if (vResponse.status === 403 || vBody?.message === this.vT('unauthorized')) {
      const vError = new Error('UNAUTHORIZED');
      vError.vUnauthorized = true;
      throw vError;
    }

    if (!vResponse.ok || vBody?.ok === false) {
      const vError = new Error(vBody?.message || 'REQUEST_ERROR');
      throw vError;
    }

    return vBody;
  }

  async vLoadInitialData() {
    this.vClearMessages();
    this.vSetLoading(true);

    try {
      const vPayload = {
        Codigo_usuario: this.vState.vCodigo_usuario,
        OTP: this.vState.vOTP,
        vParámetros: this.vState.vParametrosRaw
      };

      const vResponse = await this.vFetchJson('/api/cu2-007/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vPayload)
      });

      this.vApplyServerData(vResponse?.data || {}, true);
      this.vRenderGrid();
    } catch (vError) {
      if (vError.vUnauthorized) {
        this.vDenyAccess();
        return;
      }
      this.vShowError(this.vT('loadError'));
    } finally {
      this.vSetLoading(false);
    }
  }

  vApplyServerData(vData, vIsInitial) {
    this.vState.vBaseUsuario = String(vData.vBaseUsuario || '').trim();
    this.vState.vPriv = String(vData.vPriv || '').trim().toUpperCase();
    this.vState.vBaseAux = String(vData.vBaseAux || '').trim();
    this.vState.vBases = Array.isArray(vData.vBases) ? vData.vBases : [];
    this.vState.vBasesFiltradas = [...this.vState.vBases];

    this.vState.vFecha_consulta = String(vData.vFecha_consulta || '').trim();
    this.vState.vCodigo_base = String(vData.vCodigo_base || '').trim();
    this.vState.vAsistenciaDia = Array.isArray(vData.vAsistenciaDia) ? vData.vAsistenciaDia : [];

    if (vIsInitial) {
      this.vState.vDefaultFiltros = {
        vFecha_consulta: this.vState.vFecha_consulta,
        vCodigo_base: this.vState.vCodigo_base
      };
    }

    this.vEl.vBaseUsuario.value = this.vState.vBaseUsuario;
    this.vEl.vPriv.value = this.vState.vPriv;
    this.vEl.vBaseAux.value = this.vState.vBaseAux;

    this.vEl.vFecha_consulta.value = this.vState.vFecha_consulta;

    this.vRenderBasesOptions();
    this.vSyncBaseInput();

    const vIsPriv = this.vState.vPriv === 'PRIV';
    this.vEl.vCodigo_base.readOnly = !vIsPriv;
    this.vEl.vCodigo_base.classList.toggle('bg-light', !vIsPriv);
    this.vEl.vBaseHelp.textContent = this.vT(vIsPriv ? 'baseHelpAll' : 'baseHelpOne');

    if (!this.vState.vAsistenciaDia.length) {
      this.vShowInfo(this.vT('noRecords'));
    }

    this.vUpdateSortIndicators();
  }

  vRenderBasesOptions() {
    this.vEl.vBasesList.innerHTML = '';

    this.vState.vBasesFiltradas.slice(0, this.vTypeaheadLimit).forEach((vRow) => {
      const vOption = document.createElement('option');
      vOption.value = `${vRow.codigo_base} - ${vRow.nombre}`;
      this.vEl.vBasesList.appendChild(vOption);
    });
  }

  vFiltrarBasesTypeahead() {
    if (this.vState.vPriv !== 'PRIV') return;

    const vTerm = String(this.vEl.vCodigo_base.value || '').toLowerCase().trim();

    if (!vTerm) {
      this.vState.vBasesFiltradas = [...this.vState.vBases];
      this.vRenderBasesOptions();
      return;
    }

    this.vState.vBasesFiltradas = this.vState.vBases.filter((vRow) => {
      const vLabel = `${vRow.codigo_base} - ${vRow.nombre}`.toLowerCase();
      return vLabel.includes(vTerm);
    });

    this.vRenderBasesOptions();
  }

  vResolveBaseSelection(vRawValue) {
    const vNormalized = String(vRawValue || '').trim().toLowerCase();
    if (!vNormalized) return null;

    const vMatch = this.vState.vBases.find((vRow) => {
      const vLabel = `${vRow.codigo_base} - ${vRow.nombre}`.toLowerCase();
      return (
        vLabel === vNormalized ||
        String(vRow.codigo_base).toLowerCase() === vNormalized ||
        String(vRow.nombre).toLowerCase() === vNormalized
      );
    });

    return vMatch || null;
  }

  vSyncBaseInput() {
    if (this.vState.vPriv === 'ONE') {
      const vBaseOne = this.vState.vBases.find((vRow) => String(vRow.codigo_base) === this.vState.vBaseUsuario);
      if (vBaseOne) {
        this.vEl.vCodigo_base.value = `${vBaseOne.codigo_base} - ${vBaseOne.nombre}`;
      } else if (this.vState.vBaseAux) {
        this.vEl.vCodigo_base.value = `${this.vState.vBaseUsuario} - ${this.vState.vBaseAux}`;
      } else {
        this.vEl.vCodigo_base.value = this.vState.vBaseUsuario;
      }
      return;
    }

    const vCurrent = this.vState.vBases.find((vRow) => String(vRow.codigo_base) === this.vState.vCodigo_base);
    this.vEl.vCodigo_base.value = vCurrent ? `${vCurrent.codigo_base} - ${vCurrent.nombre}` : '';
  }

  vCommitBase() {
    if (this.vState.vPriv !== 'PRIV') {
      this.vSyncBaseInput();
      return;
    }

    const vRaw = String(this.vEl.vCodigo_base.value || '').trim();
    if (!vRaw) {
      this.vState.vCodigo_base = '';
      this.vEl.vCodigo_base.value = '';
      return;
    }

    const vSelected = this.vResolveBaseSelection(vRaw);
    if (!vSelected) {
      this.vSyncBaseInput();
      return;
    }

    this.vState.vCodigo_base = String(vSelected.codigo_base);
    this.vEl.vCodigo_base.value = `${vSelected.codigo_base} - ${vSelected.nombre}`;
  }

  vValidateFilters() {
    const vFecha_consulta = String(this.vEl.vFecha_consulta.value || '').trim();

    if (!this.vRegex.vFecha.test(vFecha_consulta)) {
      return { vOk: false, vMessage: this.vT('invalidDateRequired') };
    }

    return {
      vOk: true,
      vData: {
        vFecha_consulta,
        vCodigo_base: this.vState.vPriv === 'PRIV' ? this.vState.vCodigo_base : this.vState.vBaseUsuario
      }
    };
  }

  async vConsultar() {
    this.vCommitBase();

    const vValidation = this.vValidateFilters();
    if (!vValidation.vOk) {
      this.vShowError(vValidation.vMessage);
      return;
    }

    this.vClearMessages();
    this.vSetLoading(true);

    try {
      const vResponse = await this.vFetchJson('/api/cu2-007/consultar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vValidation.vData)
      });

      this.vApplyServerData({
        ...vResponse?.data,
        vBases: this.vState.vBases
      });
      this.vRenderGrid();
    } catch (vError) {
      if (vError.vUnauthorized) {
        this.vDenyAccess();
        return;
      }
      this.vShowError(this.vT('queryError'));
    } finally {
      this.vSetLoading(false);
    }
  }

  async vLimpiarFiltros() {
    this.vClearMessages();

    this.vState.vFecha_consulta = this.vState.vDefaultFiltros.vFecha_consulta;
    if (this.vState.vPriv === 'PRIV') {
      this.vState.vCodigo_base = this.vState.vDefaultFiltros.vCodigo_base;
    } else {
      this.vState.vCodigo_base = this.vState.vBaseUsuario;
    }

    this.vEl.vFecha_consulta.value = this.vState.vFecha_consulta;
    this.vSyncBaseInput();
    this.vEl.vFiltroRapido.value = '';

    await this.vConsultar();
  }

  vGetRowsForView() {
    const vSearch = String(this.vEl.vFiltroRapido.value || '').toLowerCase().trim();

    let vRows = [...this.vState.vAsistenciaDia];

    if (vSearch) {
      vRows = vRows.filter((vRow) => {
        const vBucket = [vRow.TURNO, vRow.FechaRegistro, vRow.TurnoRegistro, vRow.codigo_usuario].join(' ').toLowerCase();
        return vBucket.includes(vSearch);
      });
    }

    const vSortKey = this.vState.vSort.vKey;
    const vSortDir = this.vState.vSort.vDir === 'desc' ? -1 : 1;

    vRows.sort((vA, vB) => {
      const vAValue = vA[vSortKey];
      const vBValue = vB[vSortKey];

      if (vSortKey === 'FechaRegistro') {
        return (new Date(vAValue).getTime() - new Date(vBValue).getTime()) * vSortDir;
      }

      return (
        String(vAValue ?? '').localeCompare(String(vBValue ?? ''), this.vState.vLang, {
          numeric: true,
          sensitivity: 'base'
        }) * vSortDir
      );
    });

    return vRows;
  }

  vRenderGrid() {
    const vRows = this.vGetRowsForView();

    this.vEl.vAsistenciaTbody.innerHTML = '';
    this.vEl.vRowsCount.textContent = String(vRows.length);

    if (!vRows.length) {
      const vEmptyRow = document.createElement('tr');
      vEmptyRow.innerHTML = `<td colspan="4" class="text-center py-4 text-muted">${this.vT('noRecords')}</td>`;
      this.vEl.vAsistenciaTbody.appendChild(vEmptyRow);
      return;
    }

      vRows.forEach((vRow) => {
      const vTr = document.createElement('tr');
      vTr.innerHTML = `
        <td>${this.vEscapeHtml(vRow.TURNO)}</td>
        <td>${this.vEscapeHtml(this.vFormatDate(vRow.FechaRegistro))}</td>
        <td>${this.vEscapeHtml(vRow.TurnoRegistro)}</td>
        <td>${this.vEscapeHtml(vRow.codigo_usuario)}</td>
      `;
      this.vEl.vAsistenciaTbody.appendChild(vTr);
    });
  }

  vUpdateSortIndicators() {
    this.vEl.vSortButtons.forEach((vButton) => {
      const vSortKey = String(vButton.dataset.sort || '');
      if (vSortKey === this.vState.vSort.vKey) {
        vButton.classList.add('active');
        vButton.dataset.dir = this.vState.vSort.vDir;
      } else {
        vButton.classList.remove('active');
        vButton.dataset.dir = '';
      }
    });
  }

  vFormatDate(vValue) {
    if (!vValue) return '-';

    const vDate = new Date(vValue);
    if (Number.isNaN(vDate.getTime())) {
      return String(vValue);
    }

    return new Intl.DateTimeFormat(this.vState.vLang === 'es' ? 'es-PE' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(vDate);
  }

  vEscapeHtml(vText) {
    return String(vText ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  vDenyAccess() {
    const vMessage = 'Warning ACCESO NO AUTORIZADO !!!';
    alert(vMessage);
    try {
      window.open('', '_self');
      window.close();
    } catch (_vError) {
      // No-op.
    }
    setTimeout(() => {
      window.location.replace('about:blank');
    }, 120);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const vWizard = new FormWizard();
  window.vFormWizard = vWizard;
});
