/*
Variables
vCodigo_usuario no visible no editable
vOTP no visible no editable
vParámetros no visible no editable
vPasswordActualBD no visible no editable
vContrasenaAntigua visible editable
vContrasenaNueva visible editable
vContrasenaNuevaRepetir visible editable
*/

class FormWizard {
  constructor() {
    this.vUnauthorizedMessage = 'Warning ACCESO NO AUTORIZADO !!!';
    this.vRegexNuevaContrasenaLongitud = /^.{8,255}$/;
    this.vRegexNuevaContrasenaMayuscula = /[A-Z]/;
    this.vCurrentLang = 'es';

    this.vState = {
      vCodigo_usuario: '',
      vOTP: '',
      vParámetros: null,
      vParámetrosRaw: '',
      vPasswordActualBD: ''
    };

    this.vForm = document.getElementById('vCambiarContrasenaForm');
    this.vAlertArea = document.getElementById('vAlertArea');
    this.vSuccessArea = document.getElementById('vSuccessArea');
    this.vLoadingOverlay = document.getElementById('vLoadingOverlay');
    this.vLoadingText = document.getElementById('vLoadingText');
    this.vProgressBar = document.getElementById('vProgressBar');
    this.vStepIndicator = document.getElementById('vStepIndicator');
    this.vGuardarBtn = document.getElementById('vGuardarBtn');
    this.vResetBtn = document.getElementById('vResetBtn');

    this.vCodigoUsuarioInput = document.getElementById('vCodigo_usuario');
    this.vOTPInput = document.getElementById('vOTP');
    this.vParametrosInput = document.getElementById('vParámetros');
    this.vPasswordActualBDInput = document.getElementById('vPasswordActualBD');

    this.vContrasenaAntiguaInput = document.getElementById('vContrasenaAntigua');
    this.vContrasenaNuevaInput = document.getElementById('vContrasenaNueva');
    this.vContrasenaNuevaRepetirInput = document.getElementById('vContrasenaNuevaRepetir');

    this.vI18n = {
      es: {
        vPageTitle: 'CU6001 - Cambiar Contrasena',
        vEyebrow: 'Modulo 6',
        vTitle: 'Cambiar Contrasena',
        vSubtitle: 'Actualiza tu contrasena en un solo paso.',
        vStatus: 'Seguro',
        vFormTitle: 'CU6001 - M6CambiarContrasena',
        vFormHint: 'Completa los campos obligatorios y guarda.',
        vContrasenaAntiguaLabel: 'vContrasenaAntigua',
        vContrasenaNuevaLabel: 'vContrasenaNueva',
        vContrasenaNuevaRepetirLabel: 'vContrasenaNuevaRepetir',
        vContrasenaAntiguaPlaceholder: 'Escribe tu contrasena antigua',
        vContrasenaNuevaPlaceholder: 'Escribe tu contrasena nueva',
        vContrasenaNuevaRepetirPlaceholder: 'Repite tu contrasena nueva',
        vRules: 'Minimo 8 caracteres, al menos una mayuscula y maximo 255 caracteres.',
        vClearButton: 'Limpiar',
        vSaveButton: 'Guardar Contrasena',
        vLoadingInit: 'Validando acceso...',
        vLoadingSave: 'Guardando contrasena...',
        vErrorDatosRequeridos: 'vContrasenaAntigua, vContrasenaNueva y vContrasenaNuevaRepetir son obligatorias.',
        vErrorAntiguaNoCoincide: 'vContrasenaAntigua no coincide con vPasswordActualBD.',
        vErrorNuevaNoCoincide: 'vContrasenaNueva y vContrasenaNuevaRepetir deben ser iguales.',
        vErrorNuevaLongitud: 'vContrasenaNueva debe tener entre 8 y 255 caracteres.',
        vErrorNuevaMayuscula: 'vContrasenaNueva debe contener al menos una letra mayuscula.',
        vErrorInit: 'No se pudo inicializar el formulario.',
        vSuccess: 'Contrasena actualizada correctamente.'
      },
      en: {
        vPageTitle: 'CU6001 - Change Password',
        vEyebrow: 'Module 6',
        vTitle: 'Change Password',
        vSubtitle: 'Update your password in a single step.',
        vStatus: 'Secure',
        vFormTitle: 'CU6001 - M6ChangePassword',
        vFormHint: 'Complete required fields and save.',
        vContrasenaAntiguaLabel: 'vContrasenaAntigua',
        vContrasenaNuevaLabel: 'vContrasenaNueva',
        vContrasenaNuevaRepetirLabel: 'vContrasenaNuevaRepetir',
        vContrasenaAntiguaPlaceholder: 'Enter your current password',
        vContrasenaNuevaPlaceholder: 'Enter your new password',
        vContrasenaNuevaRepetirPlaceholder: 'Repeat your new password',
        vRules: 'Minimum 8 chars, at least one uppercase letter, max 255 chars.',
        vClearButton: 'Clear',
        vSaveButton: 'Save Password',
        vLoadingInit: 'Validating access...',
        vLoadingSave: 'Saving password...',
        vErrorDatosRequeridos: 'vContrasenaAntigua, vContrasenaNueva and vContrasenaNuevaRepetir are required.',
        vErrorAntiguaNoCoincide: 'vContrasenaAntigua must match vPasswordActualBD.',
        vErrorNuevaNoCoincide: 'vContrasenaNueva and vContrasenaNuevaRepetir must be equal.',
        vErrorNuevaLongitud: 'vContrasenaNueva must be between 8 and 255 characters.',
        vErrorNuevaMayuscula: 'vContrasenaNueva must contain at least one uppercase letter.',
        vErrorInit: 'Could not initialize the form.',
        vSuccess: 'Password updated successfully.'
      }
    };
  }

  async init() {
    this.vApplyI18n();
    this.vBindEvents();
    this.vSetStep(1, 1);

    const vStartup = this.vReadStartupParams();
    if (!vStartup.vOk) {
      this.vDenyAccessAndClose();
      return;
    }

    this.vState.vCodigo_usuario = vStartup.vCodigo_usuario;
    this.vState.vOTP = vStartup.vOTP;
    this.vState.vParámetros = vStartup.vParámetros;
    this.vState.vParámetrosRaw = vStartup.vParámetrosRaw;
    this.vSyncHiddenFields();

    await this.vLoadInitialData();
  }

  vBindEvents() {
    this.vForm.addEventListener('submit', async (vEvent) => {
      vEvent.preventDefault();
      await this.vHandleSave();
    });

    this.vResetBtn.addEventListener('click', () => {
      this.vClearFormValues();
      this.vHideAlerts();
    });

    [this.vContrasenaAntiguaInput, this.vContrasenaNuevaInput, this.vContrasenaNuevaRepetirInput].forEach((vInput) => {
      vInput.addEventListener('input', () => this.vHideAlerts());
    });
  }

  vLangCode() {
    const vLang = String(navigator.language || 'es').toLowerCase();
    return vLang.startsWith('es') ? 'es' : 'en';
  }

  vT(vKey) {
    const vDict = this.vI18n[this.vCurrentLang] || this.vI18n.es;
    return vDict[vKey] || vKey;
  }

  vApplyI18n() {
    this.vCurrentLang = this.vLangCode();
    document.documentElement.lang = this.vCurrentLang;
    document.title = this.vT('vPageTitle');

    document.querySelectorAll('[data-i18n]').forEach((vEl) => {
      const vKey = vEl.dataset.i18n;
      vEl.textContent = this.vT(vKey);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((vEl) => {
      const vKey = vEl.dataset.i18nPlaceholder;
      vEl.setAttribute('placeholder', this.vT(vKey));
    });
  }

  vSetStep(vStep, vTotal) {
    const vPercent = Math.round((vStep / vTotal) * 100);
    this.vProgressBar.style.width = `${vPercent}%`;
    this.vStepIndicator.textContent = `${vStep} / ${vTotal}`;
  }

  vGetParam(vSearchParams, vKeys) {
    for (const vKey of vKeys) {
      const vValue = vSearchParams.get(vKey);
      if (typeof vValue === 'string' && vValue.trim()) {
        return vValue.trim();
      }
    }
    return '';
  }

  vReadStartupParams() {
    const vSearchParams = new URLSearchParams(window.location.search);
    const vCodigoUsuario = this.vGetParam(vSearchParams, ['Codigo_usuario', 'codigo_usuario', 'vCodigo_usuario', 'vUsuario']);
    const vOTP = this.vGetParam(vSearchParams, ['OTP', 'otp', 'vOTP']);
    const vParámetrosRaw = this.vGetParam(vSearchParams, ['vParámetros', 'vParametros']);

    if (!vCodigoUsuario || !vOTP || vCodigoUsuario.length > 36 || vOTP.length > 6) {
      return { vOk: false };
    }

    let vParámetros = null;
    if (vParámetrosRaw) {
      try {
        vParámetros = JSON.parse(vParámetrosRaw);
      } catch (vError) {
        return { vOk: false };
      }
    }

    return {
      vOk: true,
      vCodigo_usuario: vCodigoUsuario,
      vOTP,
      vParámetros,
      vParámetrosRaw
    };
  }

  vSyncHiddenFields() {
    this.vCodigoUsuarioInput.value = this.vState.vCodigo_usuario;
    this.vOTPInput.value = this.vState.vOTP;
    this.vParametrosInput.value = this.vState.vParámetrosRaw || '';
    this.vPasswordActualBDInput.value = this.vState.vPasswordActualBD;
  }

  vSetLoading(vIsLoading, vTextKey) {
    this.vLoadingText.textContent = this.vT(vTextKey || 'vLoadingInit');
    this.vLoadingOverlay.classList.toggle('d-none', !vIsLoading);
    this.vGuardarBtn.disabled = vIsLoading;
    this.vResetBtn.disabled = vIsLoading;
  }

  vShowAlert(vMessage, vType = 'danger') {
    if (vType === 'success') {
      this.vSuccessArea.textContent = vMessage;
      this.vSuccessArea.classList.remove('d-none');
      this.vAlertArea.classList.add('d-none');
    } else {
      this.vAlertArea.textContent = vMessage;
      this.vAlertArea.classList.remove('d-none');
      this.vSuccessArea.classList.add('d-none');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  vHideAlerts() {
    this.vAlertArea.classList.add('d-none');
    this.vSuccessArea.classList.add('d-none');
  }

  vDenyAccessAndClose() {
    this.vShowAlert(this.vUnauthorizedMessage);
    window.alert(this.vUnauthorizedMessage);
    try {
      window.open('', '_self');
      window.close();
    } catch (vError) {
      // Algunos navegadores bloquean cierre programatico.
    }
    setTimeout(() => {
      window.location.replace('about:blank');
    }, 150);
  }

  async vApiFetch(vUrl, vOptions = {}) {
    const vHeaders = new Headers(vOptions.headers || {});
    if (!vHeaders.has('x-codigo-usuario')) {
      vHeaders.set('x-codigo-usuario', this.vState.vCodigo_usuario);
    }
    if (!vHeaders.has('x-otp')) {
      vHeaders.set('x-otp', this.vState.vOTP);
    }
    if (this.vState.vParámetrosRaw && !vHeaders.has('x-vparametros')) {
      vHeaders.set('x-vparametros', this.vState.vParámetrosRaw);
    }
    if (vOptions.body && !vHeaders.has('Content-Type')) {
      vHeaders.set('Content-Type', 'application/json');
    }

    const vResponse = await fetch(vUrl, { ...vOptions, headers: vHeaders });
    let vData = {};
    try {
      vData = await vResponse.json();
    } catch (vError) {
      vData = {};
    }

    if (vData.message === this.vUnauthorizedMessage || vResponse.status === 403) {
      this.vDenyAccessAndClose();
      throw new Error(this.vUnauthorizedMessage);
    }

    return { vResponse, vData };
  }

  async vLoadInitialData() {
    this.vSetLoading(true, 'vLoadingInit');
    try {
      const { vResponse, vData } = await this.vApiFetch('./api/init', { method: 'GET' });
      if (!vResponse.ok || !vData.ok) {
        throw new Error(vData.message || 'INIT_ERROR');
      }

      this.vState.vPasswordActualBD = String(vData.data?.vPasswordActualBD ?? '');
      this.vSyncHiddenFields();
    } catch (vError) {
      const vMessageCode = String(vError?.message || '');
      const vMessage = vMessageCode === this.vUnauthorizedMessage ? this.vUnauthorizedMessage : this.vMapBackendMessage(vMessageCode);
      this.vShowAlert(vMessage || this.vT('vErrorInit'));
    } finally {
      this.vSetLoading(false, 'vLoadingInit');
    }
  }

  vValidateForm() {
    const vErrors = [];
    const vContrasenaAntigua = this.vContrasenaAntiguaInput.value;
    const vContrasenaNueva = this.vContrasenaNuevaInput.value;
    const vContrasenaNuevaRepetir = this.vContrasenaNuevaRepetirInput.value;

    if (!vContrasenaAntigua || !vContrasenaNueva || !vContrasenaNuevaRepetir) {
      vErrors.push(this.vT('vErrorDatosRequeridos'));
    }
    if (vContrasenaAntigua && vContrasenaAntigua !== this.vState.vPasswordActualBD) {
      vErrors.push(this.vT('vErrorAntiguaNoCoincide'));
    }
    if (vContrasenaNueva && !this.vRegexNuevaContrasenaLongitud.test(vContrasenaNueva)) {
      vErrors.push(this.vT('vErrorNuevaLongitud'));
    }
    if (vContrasenaNueva && !this.vRegexNuevaContrasenaMayuscula.test(vContrasenaNueva)) {
      vErrors.push(this.vT('vErrorNuevaMayuscula'));
    }
    if (vContrasenaNueva && vContrasenaNuevaRepetir && vContrasenaNueva !== vContrasenaNuevaRepetir) {
      vErrors.push(this.vT('vErrorNuevaNoCoincide'));
    }

    return vErrors;
  }

  vMapBackendMessage(vCode) {
    const vMap = {
      DATOS_REQUERIDOS: this.vT('vErrorDatosRequeridos'),
      CONTRASENAS_NUEVAS_NO_COINCIDEN: this.vT('vErrorNuevaNoCoincide'),
      CONTRASENA_NUEVA_INVALIDA: `${this.vT('vErrorNuevaLongitud')} ${this.vT('vErrorNuevaMayuscula')}`,
      USUARIO_INEXISTENTE: 'usuario inexistente',
      CONTRASENA_ANTIGUA_INCORRECTA: 'contrasena antigua incorrecta',
      NUEVA_CONTRASENA_IGUAL_ACTUAL: 'la nueva contrasena es igual a la actual',
      VPARAMETROS_INVALID_JSON: 'vParámetros debe ser JSON valido',
      INIT_ERROR: this.vT('vErrorInit')
    };
    return vMap[vCode] || vCode || this.vT('vErrorInit');
  }

  vClearFormValues() {
    this.vContrasenaAntiguaInput.value = '';
    this.vContrasenaNuevaInput.value = '';
    this.vContrasenaNuevaRepetirInput.value = '';
  }

  async vHandleSave() {
    this.vHideAlerts();
    const vErrors = this.vValidateForm();
    if (vErrors.length) {
      this.vShowAlert(vErrors.join(' | '));
      return;
    }

    this.vSetLoading(true, 'vLoadingSave');
    try {
      const vPayload = {
        vCodigo_usuario: this.vState.vCodigo_usuario,
        vContrasenaAntigua: this.vContrasenaAntiguaInput.value,
        vContrasenaNueva: this.vContrasenaNuevaInput.value,
        vContrasenaNuevaRepetir: this.vContrasenaNuevaRepetirInput.value,
        vOTP: this.vState.vOTP,
        vParámetros: this.vState.vParámetros
      };

      const { vResponse, vData } = await this.vApiFetch('./api/cambiar-contrasena', {
        method: 'POST',
        body: JSON.stringify(vPayload)
      });

      if (!vResponse.ok || !vData.ok) {
        throw new Error(vData.message || 'CAMBIAR_CONTRASENA_ERROR');
      }

      this.vState.vPasswordActualBD = this.vContrasenaNuevaInput.value;
      this.vSyncHiddenFields();
      this.vShowAlert(this.vT('vSuccess'), 'success');
      this.vClearFormValues();
    } catch (vError) {
      const vMessageCode = String(vError?.message || '');
      const vMessage = this.vMapBackendMessage(vMessageCode);
      this.vShowAlert(vMessage);
    } finally {
      this.vSetLoading(false, 'vLoadingSave');
    }
  }
}

const vWizard = new FormWizard();
vWizard.init();
