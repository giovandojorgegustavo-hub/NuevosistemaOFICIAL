/*
vPrivUsuario = Llamada SP: get_priv_usuario(p_usuario = Codigo_usuario) (devuelve campo_visible)
Campos devueltos
Columna 1 (base asignada del usuario)
Columna 2 (privilegio)
Columna 3 (opcional/auxiliar)
Variables
vBase no visible no editable
vPriv no visible no editable
vBaseAux no visible no editable
vBaseTexto visible no editable

vBases = Llamada SP: get_bases() (devuelve campo_visible) SOLO si vPriv = "ALL"
Campos devueltos
codigo_base
nombre
Variables
vcodigo_base visible editable
vnombre_base visible editable

vStockBase = Llamada SP: get_stock_xBase(p_codigo_base = vBase) (devuelve campo_visible)
Campos devueltos
codigo_base
nombre_base
codigo_producto
nombre_producto
fecha_saldoactual
saldo_actual
costo_unitario
saldo_reservado
saldo_disponible
Variables
vnombre_base_grid visible no editable
vnombre_producto visible no editable
vsaldo_actual visible no editable
vsaldo_reservado visible no editable
vsaldo_disponible visible no editable
*/

const vTranslations = {
  es: {
    eyebrow: 'GLOBAL IAAS + PAAS',
    title: 'Consulta de Stock por Base',
    subtitle: 'Consulta en un solo paso el saldo por producto en la base activa.',
    step1Pill: '1. Stock por Base',
    step1Title: 'Paso 1. Stock por Base',
    baseActiveLabel: 'Base activa',
    baseSelectorLabel: 'Base activa',
    baseSelectorPlaceholder: 'Escribe para filtrar por codigo o nombre',
    baseSelectorHelp: 'Typeahead habilitado para filtrar miles de registros.',
    refreshBtn: 'Actualizar Stock',
    quickFilterLabel: 'Filtro rapido',
    quickFilterPlaceholder: 'Filtra por base, producto o codigo',
    rowsLabel: 'Registros:',
    thBase: 'Base',
    thCodigoProducto: 'Cod. Producto',
    thProducto: 'Producto',
    thFecha: 'Fecha',
    thSaldoActual: 'Saldo Actual',
    thSaldoReservado: 'Saldo Reservado',
    thSaldoDisponible: 'Saldo Disponible',
    noRecords: 'Sin registros',
    loadError: 'No fue posible cargar el stock. Revisa logs del backend.',
    unauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
    invalidParams: 'Parametros de acceso invalidos.'
  },
  en: {
    eyebrow: 'GLOBAL IAAS + PAAS',
    title: 'Stock by Base',
    subtitle: 'Check product balances for the active base in a single step.',
    step1Pill: '1. Stock by Base',
    step1Title: 'Step 1. Stock by Base',
    baseActiveLabel: 'Active base',
    baseSelectorLabel: 'Active base',
    baseSelectorPlaceholder: 'Type to filter by code or name',
    baseSelectorHelp: 'Typeahead enabled to support large datasets.',
    refreshBtn: 'Refresh Stock',
    quickFilterLabel: 'Quick filter',
    quickFilterPlaceholder: 'Filter by base, product or code',
    rowsLabel: 'Rows:',
    thBase: 'Base',
    thCodigoProducto: 'Product Code',
    thProducto: 'Product',
    thFecha: 'Date',
    thSaldoActual: 'Current Balance',
    thSaldoReservado: 'Reserved Balance',
    thSaldoDisponible: 'Available Balance',
    noRecords: 'No records',
    loadError: 'Stock could not be loaded. Check backend logs.',
    unauthorized: 'Warning ACCESO NO AUTORIZADO !!!',
    invalidParams: 'Invalid access parameters.'
  }
};

class FormWizard {
  constructor() {
    this.vState = {
      vLang: 'es',
      vCodigoUsuario: '',
      vOTP: '',
      vParametrosRaw: null,
      vBase: '',
      vPriv: '',
      vBaseAux: '',
      vBaseTexto: '',
      vBases: [],
      vBasesFiltradas: [],
      vStockBase: [],
      vSort: {
        vKey: 'nombre_producto',
        vDir: 'asc'
      },
      vLoading: false
    };

    this.vRegex = {
      vCodigoUsuario: /^[A-Za-z0-9-]{1,36}$/,
      vOTP: /^\d{1,6}$/,
      vCodigoBase: /^\d+$/
    };

    this.cacheDom();
    this.bindEvents();
    this.init();
  }

  cacheDom() {
    this.vEl = {
      vAlertBox: document.getElementById('vAlertBox'),
      vInfoBox: document.getElementById('vInfoBox'),
      vLoadingIndicator: document.getElementById('vLoadingIndicator'),
      vBase: document.getElementById('vBase'),
      vPriv: document.getElementById('vPriv'),
      vBaseAux: document.getElementById('vBaseAux'),
      vBaseSelector: document.getElementById('vBaseSelector'),
      vBtnActualizarStock: document.getElementById('vBtnActualizarStock'),
      vFiltroRapido: document.getElementById('vFiltroRapido'),
      vRowsCount: document.getElementById('vRowsCount'),
      vStockTbody: document.getElementById('vStockTbody'),
      vSortButtons: Array.from(document.querySelectorAll('.sort-btn'))
    };
  }

  bindEvents() {
    this.vEl.vBtnActualizarStock.addEventListener('click', () => {
      this.loadStock(this.vState.vBase);
    });

    this.vEl.vFiltroRapido.addEventListener('input', () => {
      this.renderStockTable();
    });

    this.vEl.vBaseSelector.addEventListener('change', () => {
      this.commitBaseChange();
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

        this.updateSortIndicators();
        this.renderStockTable();
      });
    });
  }

  async init() {
    this.applyLanguage();

    if (!this.readAccessParams()) {
      this.showError(this.t('invalidParams'));
      this.denyAccess();
      return;
    }

    await this.loadInitialData();
  }

  applyLanguage() {
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

  t(vKey) {
    return (vTranslations[this.vState.vLang] || vTranslations.es)[vKey] || vKey;
  }

  readAccessParams() {
    const vQuery = new URLSearchParams(window.location.search);
    const vCodigoUsuario = String(
      vQuery.get('Codigo_usuario') || vQuery.get('codigo_usuario') || vQuery.get('vUsuario') || ''
    ).trim();
    const vOTP = String(vQuery.get('OTP') || vQuery.get('otp') || vQuery.get('vOTP') || '').trim();
    const vParametrosRaw = vQuery.get('vParámetros') ?? vQuery.get('vParametros') ?? null;

    this.vState.vCodigoUsuario = vCodigoUsuario;
    this.vState.vOTP = vOTP;
    this.vState.vParametrosRaw = vParametrosRaw;

    return this.vRegex.vCodigoUsuario.test(vCodigoUsuario) && this.vRegex.vOTP.test(vOTP);
  }

  clearMessages() {
    this.vEl.vAlertBox.classList.add('d-none');
    this.vEl.vInfoBox.classList.add('d-none');
    this.vEl.vAlertBox.textContent = '';
    this.vEl.vInfoBox.textContent = '';
  }

  showError(vMessage) {
    this.vEl.vAlertBox.textContent = vMessage;
    this.vEl.vAlertBox.classList.remove('d-none');
  }

  showInfo(vMessage) {
    this.vEl.vInfoBox.textContent = vMessage;
    this.vEl.vInfoBox.classList.remove('d-none');
  }

  setLoading(vLoading) {
    this.vState.vLoading = vLoading;
    this.vEl.vLoadingIndicator.classList.toggle('d-none', !vLoading);

    this.vEl.vBtnActualizarStock.disabled = vLoading;
    this.vEl.vFiltroRapido.disabled = vLoading;
    this.vEl.vBaseSelector.disabled = vLoading || this.vState.vPriv === 'ONE';
  }

  async fetchJson(vUrl, vOptions) {
    const vResponse = await fetch(vUrl, vOptions);
    const vBody = await vResponse.json().catch(() => ({}));

    if (vResponse.status === 403 || vBody?.message === this.t('unauthorized')) {
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

  async loadInitialData() {
    this.clearMessages();
    this.setLoading(true);

    try {
      const vPayload = {
        Codigo_usuario: this.vState.vCodigoUsuario,
        OTP: this.vState.vOTP,
        vParámetros: this.vState.vParametrosRaw
      };

      const vResponse = await this.fetchJson('/api/cu2-005/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vPayload)
      });

      this.applyServerData(vResponse?.data || {});
      this.renderStockTable();
    } catch (vError) {
      if (vError.vUnauthorized) {
        this.denyAccess();
        return;
      }
      this.showError(this.t('loadError'));
    } finally {
      this.setLoading(false);
    }
  }

  applyServerData(vData) {
    this.vState.vBase = String(vData.vBase || '').trim();
    this.vState.vPriv = String(vData.vPriv || '').trim().toUpperCase();
    this.vState.vBaseAux = String(vData.vBaseAux || '').trim();
    this.vState.vBaseTexto = String(vData.vBaseTexto || '').trim();
    this.vState.vBases = Array.isArray(vData.vBases) ? vData.vBases : [];
    this.vState.vBasesFiltradas = [...this.vState.vBases];
    this.vState.vStockBase = Array.isArray(vData.vStockBase) ? vData.vStockBase : [];

    this.vEl.vBase.value = this.vState.vBase;
    this.vEl.vPriv.value = this.vState.vPriv;
    this.vEl.vBaseAux.value = this.vState.vBaseAux;
    this.renderBaseOptions();
    this.syncBaseSelectorText();

    if (!this.vState.vStockBase.length) {
      this.showInfo(this.t('noRecords'));
    }

    this.updateSortIndicators();
  }

  renderBaseOptions() {
    this.vEl.vBaseSelector.innerHTML = '';
    const vCurrentCode = String(this.vState.vBase || '').trim();
    const vCurrentText = String(this.vState.vBaseTexto || this.vState.vBase || '').trim();

    const vAddOption = (vCode, vLabel) => {
      const vOption = document.createElement('option');
      vOption.value = String(vCode || '').trim();
      vOption.textContent = String(vLabel || '').trim();
      this.vEl.vBaseSelector.appendChild(vOption);
    };

    if (this.vState.vPriv === 'ONE') {
      vAddOption(vCurrentCode, vCurrentText);
      return;
    }

    const vBases = this.vState.vBases
      .map((vRow) => ({
        vCode: String(vRow?.codigo_base || '').trim(),
        vName: String(vRow?.nombre || '').trim()
      }))
      .filter((vRow) => vRow.vCode);

    vBases.forEach((vRow) => {
      const vLabel = vRow.vName ? `${vRow.vCode} - ${vRow.vName}` : vRow.vCode;
      vAddOption(vRow.vCode, vLabel);
    });

    if (vCurrentCode && !vBases.some((vRow) => vRow.vCode === vCurrentCode)) {
      vAddOption(vCurrentCode, vCurrentText || vCurrentCode);
    }

    if (!this.vEl.vBaseSelector.options.length && vCurrentCode) {
      vAddOption(vCurrentCode, vCurrentText || vCurrentCode);
    }
  }

  syncBaseSelectorText() {
    if (this.vState.vPriv === 'ONE') {
      this.vEl.vBaseSelector.value = this.vState.vBase;
    } else {
      this.vEl.vBaseSelector.value = String(this.vState.vBase || '');
    }
  }

  async commitBaseChange() {
    if (this.vState.vPriv === 'ONE' || this.vState.vLoading) {
      return;
    }

    const vSelectedCode = String(this.vEl.vBaseSelector.value || '').trim();
    if (!this.vRegex.vCodigoBase.test(vSelectedCode)) {
      this.syncBaseSelectorText();
      return;
    }

    if (vSelectedCode === String(this.vState.vBase)) {
      this.syncBaseSelectorText();
      return;
    }

    await this.loadStock(vSelectedCode);
  }

  async loadStock(vCodigoBase) {
    if (!this.vRegex.vCodigoBase.test(String(vCodigoBase || '').trim())) {
      return;
    }

    this.clearMessages();
    this.setLoading(true);

    try {
      const vResponse = await this.fetchJson('/api/cu2-005/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Codigo_usuario: this.vState.vCodigoUsuario,
          OTP: this.vState.vOTP,
          codigo_base: String(vCodigoBase).trim()
        })
      });

      this.applyServerData({
        ...vResponse?.data,
        vBases: this.vState.vBases
      });

      this.renderStockTable();
    } catch (vError) {
      if (vError.vUnauthorized) {
        this.denyAccess();
        return;
      }
      this.showError(this.t('loadError'));
    } finally {
      this.setLoading(false);
    }
  }

  getRowsForView() {
    const vSearch = String(this.vEl.vFiltroRapido.value || '').toLowerCase().trim();

    let vRows = [...this.vState.vStockBase];

    if (vSearch) {
      vRows = vRows.filter((vRow) => {
        const vBucket = [
          vRow.codigo_base,
          vRow.nombre_base,
          vRow.codigo_producto,
          vRow.nombre_producto,
          vRow.fecha_saldoactual,
          vRow.saldo_actual,
          vRow.costo_unitario,
          vRow.saldo_reservado,
          vRow.saldo_disponible
        ]
          .join(' ')
          .toLowerCase();

        return vBucket.includes(vSearch);
      });
    }

    const vSortKey = this.vState.vSort.vKey;
    const vSortDir = this.vState.vSort.vDir === 'desc' ? -1 : 1;

    vRows.sort((vA, vB) => {
      const vAValue = vA[vSortKey];
      const vBValue = vB[vSortKey];

      if (['saldo_actual', 'saldo_reservado', 'saldo_disponible'].includes(vSortKey)) {
        return (Number(vAValue) - Number(vBValue)) * vSortDir;
      }

      if (vSortKey === 'fecha_saldoactual') {
        return (new Date(vAValue).getTime() - new Date(vBValue).getTime()) * vSortDir;
      }

      return String(vAValue ?? '')
        .localeCompare(String(vBValue ?? ''), this.vState.vLang, { numeric: true, sensitivity: 'base' })
        * vSortDir;
    });

    return vRows;
  }

  renderStockTable() {
    const vRows = this.getRowsForView();

    this.vEl.vStockTbody.innerHTML = '';
    this.vEl.vRowsCount.textContent = String(vRows.length);

    if (!vRows.length) {
      const vEmptyRow = document.createElement('tr');
      vEmptyRow.innerHTML = `<td colspan="7" class="text-center py-4 text-muted">${this.t('noRecords')}</td>`;
      this.vEl.vStockTbody.appendChild(vEmptyRow);
      return;
    }

    const vNumberFormatter = new Intl.NumberFormat(this.vState.vLang === 'es' ? 'es-PE' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    });

    vRows.forEach((vRow) => {
      const vTr = document.createElement('tr');
      vTr.innerHTML = `
        <td>${this.escapeHtml(vRow.nombre_base)}</td>
        <td>${this.escapeHtml(vRow.codigo_producto)}</td>
        <td>${this.escapeHtml(vRow.nombre_producto)}</td>
        <td>${this.escapeHtml(this.formatDate(vRow.fecha_saldoactual))}</td>
        <td class="text-end">${vNumberFormatter.format(Number(vRow.saldo_actual || 0))}</td>
        <td class="text-end">${vNumberFormatter.format(Number(vRow.saldo_reservado || 0))}</td>
        <td class="text-end">${vNumberFormatter.format(Number(vRow.saldo_disponible || 0))}</td>
      `;

      this.vEl.vStockTbody.appendChild(vTr);
    });
  }

  updateSortIndicators() {
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

  formatDate(vValue) {
    if (!vValue) {
      return '-';
    }

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

  escapeHtml(vText) {
    return String(vText ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  denyAccess() {
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
