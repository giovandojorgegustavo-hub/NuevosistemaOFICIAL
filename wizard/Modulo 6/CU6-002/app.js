/*
Variables
vCodigo_usuario no visible no editable
vOTP no visible no editable
vParámetros no visible no editable
vFecha no visible no editable
vAsunto visible editable
vDescripcion visible editable
vImagenes visible editable
vId_ticket no visible no editable
*/

class FormWizard {
  constructor() {
    this.vUnauthorizedMessage = 'Warning ACCESO NO AUTORIZADO !!!';
    this.vRegexAsunto = /^.{1,255}$/s;
    this.vRegexDescripcion = /^.{1,4096}$/s;
    this.vAllowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    this.vMaxFiles = 10;
    this.vMaxFileSizeBytes = 5 * 1024 * 1024;
    this.vCurrentLang = 'es';

    this.vState = {
      vCodigo_usuario: '',
      vOTP: '',
      vParámetros: null,
      vParámetrosRaw: '',
      vFecha: '',
      vId_ticket: null
    };

    this.vForm = document.getElementById('vTicketSoporteForm');
    this.vAlertArea = document.getElementById('vAlertArea');
    this.vSuccessArea = document.getElementById('vSuccessArea');
    this.vLoadingOverlay = document.getElementById('vLoadingOverlay');
    this.vLoadingText = document.getElementById('vLoadingText');
    this.vProgressBar = document.getElementById('vProgressBar');
    this.vStepIndicator = document.getElementById('vStepIndicator');
    this.vRegistrarBtn = document.getElementById('vRegistrarBtn');
    this.vResetBtn = document.getElementById('vResetBtn');

    this.vCodigoUsuarioInput = document.getElementById('vCodigo_usuario');
    this.vOTPInput = document.getElementById('vOTP');
    this.vParametrosInput = document.getElementById('vParámetros');
    this.vFechaInput = document.getElementById('vFecha');

    this.vAsuntoInput = document.getElementById('vAsunto');
    this.vDescripcionInput = document.getElementById('vDescripcion');
    this.vImagenesInput = document.getElementById('vImagenes');
    this.vImagenesPreview = document.getElementById('vImagenesPreview');

    this.vI18n = {
      es: {
        vPageTitle: 'CU6002 - Tickets Soporte',
        vEyebrow: 'Modulo 6',
        vTitle: 'Tickets de Soporte',
        vSubtitle: 'Registra un ticket de soporte en un solo paso.',
        vStatus: 'Atencion',
        vFormTitle: 'CU6002 - M6TicketsSoporte',
        vFormHint: 'Completa los campos requeridos y registra el ticket.',
        vAsuntoLabel: 'vAsunto',
        vDescripcionLabel: 'vDescripcion',
        vImagenesLabel: 'vImagenes',
        vAsuntoPlaceholder: 'Describe el asunto del ticket',
        vDescripcionPlaceholder: 'Describe el problema o solicitud de soporte',
        vAsuntoRules: 'Obligatorio, maximo 255 caracteres.',
        vDescripcionRules: 'Obligatorio, maximo 4096 caracteres.',
        vImagenesRules: 'Opcional. 0..10 imagenes, maximo 5 MB por archivo (JPG, PNG, WEBP).',
        vClearButton: 'Limpiar',
        vSaveButton: 'Registrar Ticket',
        vLoadingInit: 'Validando acceso...',
        vLoadingSave: 'Registrando ticket...',
        vLoadingEncode: 'Preparando imagenes...',
        vErrorDatosRequeridos: 'vAsunto y vDescripcion son obligatorios.',
        vErrorAsuntoLongitud: 'vAsunto debe tener entre 1 y 255 caracteres.',
        vErrorDescripcionLongitud: 'vDescripcion debe tener entre 1 y 4096 caracteres.',
        vErrorImagenesCantidad: 'vImagenes permite entre 0 y 10 archivos.',
        vErrorImagenTipo: 'Solo se permiten imagenes JPG, PNG o WEBP.',
        vErrorImagenTamano: 'Cada imagen debe pesar maximo 5 MB.',
        vErrorInit: 'No se pudo inicializar el formulario.',
        vErrorRegistrar: 'No se pudo registrar el ticket.',
        vErrorDetallePrefix: 'Detalle',
        vSuccess: 'Ticket registrado correctamente. vId_ticket: '
      },
      en: {
        vPageTitle: 'CU6002 - Support Tickets',
        vEyebrow: 'Module 6',
        vTitle: 'Support Tickets',
        vSubtitle: 'Create a support ticket in a single step.',
        vStatus: 'Attention',
        vFormTitle: 'CU6002 - M6SupportTickets',
        vFormHint: 'Complete required fields and submit the ticket.',
        vAsuntoLabel: 'vAsunto',
        vDescripcionLabel: 'vDescripcion',
        vImagenesLabel: 'vImagenes',
        vAsuntoPlaceholder: 'Describe the ticket subject',
        vDescripcionPlaceholder: 'Describe your issue or support request',
        vAsuntoRules: 'Required, maximum 255 characters.',
        vDescripcionRules: 'Required, maximum 4096 characters.',
        vImagenesRules: 'Optional. 0..10 images, up to 5 MB each (JPG, PNG, WEBP).',
        vClearButton: 'Clear',
        vSaveButton: 'Register Ticket',
        vLoadingInit: 'Validating access...',
        vLoadingSave: 'Registering ticket...',
        vLoadingEncode: 'Preparing images...',
        vErrorDatosRequeridos: 'vAsunto and vDescripcion are required.',
        vErrorAsuntoLongitud: 'vAsunto must be between 1 and 255 characters.',
        vErrorDescripcionLongitud: 'vDescripcion must be between 1 and 4096 characters.',
        vErrorImagenesCantidad: 'vImagenes supports between 0 and 10 files.',
        vErrorImagenTipo: 'Only JPG, PNG or WEBP images are allowed.',
        vErrorImagenTamano: 'Each image must be at most 5 MB.',
        vErrorInit: 'Could not initialize the form.',
        vErrorRegistrar: 'Could not register the ticket.',
        vErrorDetallePrefix: 'Detail',
        vSuccess: 'Ticket registered successfully. vId_ticket: '
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

    [this.vAsuntoInput, this.vDescripcionInput].forEach((vInput) => {
      vInput.addEventListener('input', () => this.vHideAlerts());
    });

    this.vImagenesInput.addEventListener('change', () => {
      this.vHideAlerts();
      this.vRenderImagePreview();
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
      } catch (_vError) {
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
    this.vFechaInput.value = this.vState.vFecha;
  }

  vSetLoading(vIsLoading, vTextKey) {
    this.vLoadingText.textContent = this.vT(vTextKey || 'vLoadingInit');
    this.vLoadingOverlay.classList.toggle('d-none', !vIsLoading);
    this.vRegistrarBtn.disabled = vIsLoading;
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
    } catch (_vError) {
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
    if (!vHeaders.has('x-otp') && this.vState.vOTP) {
      vHeaders.set('x-otp', this.vState.vOTP);
    }

    const vResponse = await fetch(vUrl, {
      ...vOptions,
      headers: vHeaders,
      credentials: 'same-origin'
    });

    if (vResponse.status === 403) {
      const vPayload = await vResponse.clone().json().catch(() => ({}));
      if (vPayload?.message === this.vUnauthorizedMessage) {
        this.vDenyAccessAndClose();
        throw new Error(this.vUnauthorizedMessage);
      }
    }

    return vResponse;
  }

  async vLoadInitialData() {
    this.vSetLoading(true, 'vLoadingInit');
    this.vHideAlerts();

    try {
      const vResponse = await this.vApiFetch('/api/init');
      const vJson = await vResponse.json();
      if (!vResponse.ok || !vJson?.ok) {
        throw new Error(vJson?.message || 'INIT_ERROR');
      }

      this.vState.vCodigo_usuario = String(vJson.data?.vCodigo_usuario || this.vState.vCodigo_usuario || '');
      this.vState.vFecha = String(vJson.data?.vFechaServidor || '');
      this.vState.vParámetros = vJson.data?.vParámetros ?? this.vState.vParámetros;
      this.vSyncHiddenFields();
    } catch (_vError) {
      this.vShowAlert(this.vT('vErrorInit'));
      this.vDenyAccessAndClose();
    } finally {
      this.vSetLoading(false, 'vLoadingInit');
    }
  }

  vGetSelectedFiles() {
    return Array.from(this.vImagenesInput.files || []);
  }

  vValidate() {
    const vAsunto = String(this.vAsuntoInput.value || '').trim();
    const vDescripcion = String(this.vDescripcionInput.value || '').trim();
    const vImagenes = this.vGetSelectedFiles();

    if (!vAsunto || !vDescripcion) {
      return { vOk: false, vMessage: this.vT('vErrorDatosRequeridos') };
    }
    if (!this.vRegexAsunto.test(vAsunto)) {
      return { vOk: false, vMessage: this.vT('vErrorAsuntoLongitud') };
    }
    if (!this.vRegexDescripcion.test(vDescripcion)) {
      return { vOk: false, vMessage: this.vT('vErrorDescripcionLongitud') };
    }
    if (vImagenes.length > this.vMaxFiles) {
      return { vOk: false, vMessage: this.vT('vErrorImagenesCantidad') };
    }

    for (const vFile of vImagenes) {
      if (!this.vAllowedMimeTypes.has(String(vFile.type || '').toLowerCase())) {
        return { vOk: false, vMessage: this.vT('vErrorImagenTipo') };
      }
      if (Number(vFile.size || 0) > this.vMaxFileSizeBytes) {
        return { vOk: false, vMessage: this.vT('vErrorImagenTamano') };
      }
    }

    return {
      vOk: true,
      vData: {
        vAsunto,
        vDescripcion,
        vImagenes
      }
    };
  }

  vFileToBase64(vFile) {
    return new Promise((vResolve, vReject) => {
      const vReader = new FileReader();
      vReader.onload = () => {
        const vResult = String(vReader.result || '');
        const vBase64 = vResult.includes(',') ? vResult.split(',')[1] : vResult;
        vResolve({
          vNombre: String(vFile.name || ''),
          vTipoMime: String(vFile.type || '').toLowerCase(),
          vTamano: Number(vFile.size || 0),
          vBase64
        });
      };
      vReader.onerror = () => vReject(new Error('FILE_READ_ERROR'));
      vReader.readAsDataURL(vFile);
    });
  }

  async vPrepareImages(vImagenes) {
    this.vSetLoading(true, 'vLoadingEncode');
    const vEncoded = [];
    for (const vFile of vImagenes) {
      const vItem = await this.vFileToBase64(vFile);
      vEncoded.push(vItem);
    }
    return vEncoded;
  }

  vRenderImagePreview() {
    const vFiles = this.vGetSelectedFiles();
    this.vImagenesPreview.innerHTML = '';

    if (!vFiles.length) {
      return;
    }

    vFiles.forEach((vFile) => {
      const vItem = document.createElement('article');
      vItem.className = 'vPreviewItem';

      const vImage = document.createElement('img');
      const vMeta = document.createElement('div');
      vMeta.className = 'vPreviewMeta';
      vMeta.textContent = `${vFile.name} (${(vFile.size / 1024 / 1024).toFixed(2)} MB)`;

      vItem.appendChild(vImage);
      vItem.appendChild(vMeta);
      this.vImagenesPreview.appendChild(vItem);

      const vReader = new FileReader();
      vReader.onload = () => {
        vImage.src = String(vReader.result || '');
      };
      vReader.readAsDataURL(vFile);
    });
  }

  async vHandleSave() {
    this.vHideAlerts();

    const vValidation = this.vValidate();
    if (!vValidation.vOk) {
      this.vShowAlert(vValidation.vMessage);
      return;
    }

    try {
      const vPayloadImagenes = await this.vPrepareImages(vValidation.vData.vImagenes);

      this.vSetLoading(true, 'vLoadingSave');
      const vPayload = {
        vAsunto: vValidation.vData.vAsunto,
        vDescripcion: vValidation.vData.vDescripcion,
        vImagenes: vPayloadImagenes,
        vParámetros: this.vState.vParámetros
      };

      const vResponse = await this.vApiFetch('/api/registrar-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vPayload)
      });

      const vJson = await vResponse.json().catch(() => ({}));
      if (!vResponse.ok || !vJson?.ok) {
        throw new Error(vJson?.message || 'REGISTRAR_TICKET_ERROR');
      }

      this.vState.vId_ticket = vJson.data?.vId_ticket;
      this.vState.vFecha = String(vJson.data?.vFecha || this.vState.vFecha || '');
      this.vSyncHiddenFields();
      this.vShowAlert(`${this.vT('vSuccess')}${this.vState.vId_ticket}`, 'success');
      this.vClearFormValues();
    } catch (vError) {
      if (String(vError.message || '').trim() !== this.vUnauthorizedMessage) {
        const vDetalle = this.vResolveErrorDetail(String(vError.message || '').trim());
        const vText = vDetalle
          ? `${this.vT('vErrorRegistrar')} ${this.vT('vErrorDetallePrefix')}: ${vDetalle}`
          : this.vT('vErrorRegistrar');
        this.vShowAlert(vText);
      }
    } finally {
      this.vSetLoading(false, 'vLoadingSave');
    }
  }

  vClearFormValues() {
    this.vAsuntoInput.value = '';
    this.vDescripcionInput.value = '';
    this.vImagenesInput.value = '';
    this.vImagenesPreview.innerHTML = '';
  }

  vResolveErrorDetail(vCode) {
    const vMap = {
      DATOS_REQUERIDOS: this.vT('vErrorDatosRequeridos'),
      ASUNTO_INVALIDO: this.vT('vErrorAsuntoLongitud'),
      DESCRIPCION_INVALIDA: this.vT('vErrorDescripcionLongitud'),
      IMAGENES_CANTIDAD_INVALIDA: this.vT('vErrorImagenesCantidad'),
      IMAGEN_TIPO_INVALIDO: this.vT('vErrorImagenTipo'),
      IMAGEN_BASE64_INVALIDO: this.vT('vErrorImagenTipo'),
      IMAGEN_VACIA: this.vT('vErrorImagenTipo'),
      IMAGEN_TAMANO_INVALIDO: this.vT('vErrorImagenTamano'),
      IMAGEN_MIME_INVALIDO: this.vT('vErrorImagenTipo'),
      DB_TABLE_MISSING: 'No existen tablas requeridas (ticketsoporte/ticketsoporte_imagenes).',
      DB_FK_ERROR: 'vCodigo_usuario no existe o viola una referencia de base de datos.',
      DB_DATA_TOO_LONG: 'Un valor excede el tamano permitido en base de datos.',
      DB_NULL_ERROR: 'La base de datos rechazo un valor obligatorio nulo.',
      INSERT_TICKET_FAILED: 'No se pudo generar vId_ticket.'
    };

    if (!vCode) return '';
    return vMap[vCode] || vCode;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const vWizard = new FormWizard();
  await vWizard.init();
});
