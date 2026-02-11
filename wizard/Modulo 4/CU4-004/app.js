/*
SPs de lectura y campos devueltos
vBases = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
vcodigo_base
vnombre
Variables
vCodigo_base no visible editable
vBaseNombre visible editable

vProductos = Llamada SP: get_productos() (devuelve campo_visible)
Campos devueltos
vcodigo_producto
vnombre
Variables
vcodigo_producto_insumo no visible editable
vnombre_producto_insumo visible no editable

vProductosProduccion = Llamada SP: get_productos() (devuelve campo_visible)
Campos devueltos
vcodigo_producto
vnombre
Variables
vcodigo_producto_producido no visible editable
vnombre_producto_producido visible no editable

vCuentas = Llamada SP: get_cuentasbancarias() (devuelve campo_visible)
Campos devueltos
vcodigo_cuentabancaria
vnombre
vbanco
Variables
vCodigo_cuentabancaria no visible editable
vCuentaNombre visible editable
vCuentaBanco visible editable

vEtiquetasGasto = Llamada SP: get_etiquetas_gastos() (devuelve campo_visible)
Campos devueltos
vcodigoetiquetagasto
vnombre
Variables
vcodigoetiquetagasto no visible editable
vnombre_etiquetagasto visible no editable
*/

class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.wizard-step'));
    this.progressBar = document.querySelector('.progress-bar');
    this.stepLabel = document.getElementById('stepLabel');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.confirmBtn = document.getElementById('confirmBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.confirmCheck = document.getElementById('confirmCheck');
    this.alertBox = document.getElementById('alertBox');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.fechaInput = document.getElementById('vFecha');
    this.tipoDocInsumoInput = document.getElementById('vTipoDocumentoStockInsumo');
    this.numDocInsumoInput = document.getElementById('vNumDocumentoStockInsumo');
    this.baseInput = document.getElementById('vBaseNombre');
    this.baseList = document.getElementById('baseList');
    this.codigoBaseInput = document.getElementById('vCodigo_base');

    this.tipoDocGastoInput = document.getElementById('vTipoDocumentoGasto');
    this.numDocGastoInput = document.getElementById('vNumDocumentoGasto');

    this.tipoDocProduccionInput = document.getElementById('vTipoDocumentoStockProduccion');
    this.numDocProduccionInput = document.getElementById('vNumDocumentoStockProduccion');

    this.insumosBody = document.querySelector('#insumosTable tbody');
    this.gastosBody = document.querySelector('#gastosTable tbody');
    this.produccionBody = document.querySelector('#produccionTable tbody');

    this.confirmInsumosBody = document.querySelector('#confirmInsumosTable tbody');
    this.confirmGastosBody = document.querySelector('#confirmGastosTable tbody');
    this.confirmProduccionBody = document.querySelector('#confirmProduccionTable tbody');

    this.summaryGeneral = document.getElementById('summaryGeneral');
    this.summaryDocs = document.getElementById('summaryDocs');
    this.summaryTotales = document.getElementById('summaryTotales');

    this.addInsumoBtn = document.getElementById('addInsumoBtn');
    this.addGastoBtn = document.getElementById('addGastoBtn');
    this.addProduccionBtn = document.getElementById('addProduccionBtn');

    this.state = {
      step: 0,
      locale: 'es',
      bases: [],
      productos: [],
      cuentas: [],
      etiquetas: [],
      config: {}
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.applyLanguage();
    this.updateStep();
    this.loadInitialData();
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.confirmBtn.addEventListener('click', () => this.confirm());
    this.resetBtn.addEventListener('click', () => this.resetWizard());
    this.confirmCheck.addEventListener('change', () => {
      this.confirmBtn.disabled = !this.confirmCheck.checked;
    });

    this.addInsumoBtn.addEventListener('click', () => this.addInsumoRow());
    this.addGastoBtn.addEventListener('click', () => this.addGastoRow());
    this.addProduccionBtn.addEventListener('click', () => this.addProduccionRow());

    this.setupTypeahead(
      this.baseInput,
      this.baseList,
      () => this.state.bases,
      (item) => {
        this.baseInput.value = this.formatLabel(item.codigo_base, item.nombre);
        this.codigoBaseInput.value = item.codigo_base;
      },
      (item) => this.formatLabel(item.codigo_base, item.nombre)
    );

    this.baseInput.addEventListener('input', () => {
      this.codigoBaseInput.value = '';
    });

    this.baseInput.addEventListener('blur', () => {
      const code = this.parseCodeFromLabel(this.baseInput.value);
      if (!code) {
        const match = this.state.bases.find(
          (item) =>
            String(item.nombre).toLowerCase() === String(this.baseInput.value).toLowerCase() ||
            String(item.codigo_base) === String(this.baseInput.value).trim()
        );
        if (match) {
          this.baseInput.value = this.formatLabel(match.codigo_base, match.nombre);
          this.codigoBaseInput.value = match.codigo_base;
        } else {
          this.codigoBaseInput.value = '';
        }
      } else {
        this.codigoBaseInput.value = code;
      }
    });

  }

  applyLanguage() {
    const lang = (navigator.language || 'es').toLowerCase();
    const locale = lang.startsWith('es') ? 'es' : 'en';
    this.state.locale = locale;
    document.documentElement.lang = locale;

    const dict = {
      es: {
        eyebrow: 'Operaciones globales IaaS y PaaS',
        title: 'Fabricacion',
        subtitle: 'Orqueste insumos, gastos y produccion con trazabilidad financiera integrada.',
        wizardTitle: 'Registro Multi-Paso',
        wizardSubtitle: 'Capture insumos, gastos y productos terminados antes de confirmar.',
        step1Title: 'Datos Generales + Insumos',
        step1Desc: 'Defina la base y registre los insumos que salen de stock.',
        step2Title: 'Registrar Gastos Asociados',
        step2Desc: 'Registre uno o mas gastos asociados.',
        step3Title: 'Registrar Productos Producidos',
        step3Desc: 'Defina las cantidades producidas. El costo se calcula automaticamente.',
        step4Title: 'Confirmar y Registrar Fabricacion',
        step4Desc: 'Revise la informacion antes de registrar.',
        lblFecha: 'Fecha',
        lblTipoInsumo: 'Tipo Doc Insumo',
        lblNumInsumo: 'Numero Doc Insumo',
        lblBase: 'Base',
        lblTipoGasto: 'Tipo Doc Gasto',
        lblNumGasto: 'Numero Doc Gasto',
        lblMontoGasto: 'Total Gastos',
        lblCuenta: 'Cuenta Bancaria',
        lblBanco: 'Banco',
        lblTipoProd: 'Tipo Doc Produccion',
        lblNumProd: 'Numero Doc Produccion',
        insumosTitle: 'Detalle de Insumos',
        gastosTitle: 'Detalle de Gastos',
        produccionTitle: 'Detalle de Produccion',
        thProducto: 'Producto',
        thCantidad: 'Cantidad',
        thMonto: 'Monto',
        thCuenta: 'Cuenta',
        thBanco: 'Banco',
        thMontoGasto: 'Monto',
        thEtiqueta: 'Etiqueta',
        thAcciones: 'Acciones',
        addInsumo: 'Agregar insumo',
        addGasto: 'Agregar etiqueta',
        addProduccion: 'Agregar producto',
        summaryGeneral: 'Datos Generales',
        summaryDocs: 'Documentos',
        summaryTotales: 'Totales',
        confirmLabel: 'Confirmo que los datos son correctos.',
        prev: 'Anterior',
        next: 'Siguiente',
        confirm: 'Registrar Fabricacion',
        reset: 'Limpiar',
        logs: 'Ver Logs SQL',
        logsTitle: 'Logs SQL',
        logsFile: 'Archivo',
        loading: 'Procesando...',
        typeaheadHelp: 'Escriba para filtrar miles de registros.',
        basePlaceholder: 'Buscar base',
        cuentaPlaceholder: 'Buscar cuenta',
        stepLabel: 'Paso {current} de {total}',
        required: 'Complete la informacion requerida.',
        baseRequired: 'Seleccione una base valida.',
        insumosRequired: 'Debe registrar al menos un insumo.',
        gastosRequired: 'Debe registrar al menos un gasto.',
        produccionRequired: 'Debe registrar al menos un producto producido.',
        cuentaRequired: 'Seleccione una cuenta bancaria.',
        montoRequired: 'Ingrese un monto de gasto valido.',
        cantidadesInvalidas: 'Revise cantidades y montos (maximo 2 decimales).',
        confirmRequired: 'Debe confirmar la operacion.',
        success: 'Fabricacion registrada correctamente.',
        logsEmpty: 'No hay logs disponibles.'
      },
      en: {
        eyebrow: 'Global IaaS & PaaS Operations',
        title: 'Manufacturing',
        subtitle: 'Coordinate inputs, costs, and output with integrated financial traceability.',
        wizardTitle: 'Multi-Step Registration',
        wizardSubtitle: 'Capture inputs, costs, and finished goods before confirming.',
        step1Title: 'General Data + Inputs',
        step1Desc: 'Define the base and record the stock inputs that exit inventory.',
        step2Title: 'Register Associated Costs',
        step2Desc: 'Register one or more associated expenses.',
        step3Title: 'Register Produced Items',
        step3Desc: 'Define produced quantities. Cost is calculated automatically.',
        step4Title: 'Confirm and Register Manufacturing',
        step4Desc: 'Review the information before registering.',
        lblFecha: 'Date',
        lblTipoInsumo: 'Input Doc Type',
        lblNumInsumo: 'Input Doc Number',
        lblBase: 'Base',
        lblTipoGasto: 'Expense Doc Type',
        lblNumGasto: 'Expense Doc Number',
        lblMontoGasto: 'Total Expenses',
        lblCuenta: 'Bank Account',
        lblBanco: 'Bank',
        lblTipoProd: 'Production Doc Type',
        lblNumProd: 'Production Doc Number',
        insumosTitle: 'Input Details',
        gastosTitle: 'Expense Details',
        produccionTitle: 'Production Details',
        thProducto: 'Product',
        thCantidad: 'Quantity',
        thMonto: 'Amount',
        thCuenta: 'Account',
        thBanco: 'Bank',
        thMontoGasto: 'Amount',
        thEtiqueta: 'Tag',
        thAcciones: 'Actions',
        addInsumo: 'Add input',
        addGasto: 'Add tag',
        addProduccion: 'Add product',
        summaryGeneral: 'General Data',
        summaryDocs: 'Documents',
        summaryTotales: 'Totals',
        confirmLabel: 'I confirm the data is correct.',
        prev: 'Previous',
        next: 'Next',
        confirm: 'Register Manufacturing',
        reset: 'Reset',
        logs: 'View SQL Logs',
        logsTitle: 'SQL Logs',
        logsFile: 'File',
        loading: 'Processing...',
        typeaheadHelp: 'Type to filter thousands of records.',
        basePlaceholder: 'Search base',
        cuentaPlaceholder: 'Search account',
        stepLabel: 'Step {current} of {total}',
        required: 'Complete the required information.',
        baseRequired: 'Select a valid base.',
        insumosRequired: 'Register at least one input.',
        gastosRequired: 'Register at least one expense.',
        produccionRequired: 'Register at least one produced item.',
        cuentaRequired: 'Select a bank account.',
        montoRequired: 'Enter a valid expense amount.',
        cantidadesInvalidas: 'Check quantities and amounts (max 2 decimals).',
        confirmRequired: 'You must confirm the operation.',
        success: 'Manufacturing registered successfully.',
        logsEmpty: 'No logs available.'
      }
    };

    this.dictionary = dict[locale];

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (this.dictionary[key]) {
        el.textContent = this.dictionary[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (this.dictionary[key]) {
        el.setAttribute('placeholder', this.dictionary[key]);
      }
    });
  }

  t(key, vars = {}) {
    const template = this.dictionary[key] || '';
    return template.replace(/\{(\w+)\}/g, (_, name) => (vars[name] !== undefined ? vars[name] : ''));
  }

  updateStep() {
    this.steps.forEach((step, index) => {
      step.classList.toggle('active', index === this.state.step);
    });

    const total = this.steps.length;
    const current = this.state.step + 1;
    const percent = (current / total) * 100;
    this.progressBar.style.width = `${percent}%`;
    this.stepLabel.textContent = this.t('stepLabel', { current, total });

    this.prevBtn.disabled = this.state.step === 0;

    const isLast = this.state.step === total - 1;
    this.nextBtn.classList.toggle('d-none', isLast);
    this.confirmBtn.classList.toggle('d-none', !isLast);
    if (isLast) {
      this.buildSummary();
      this.confirmBtn.disabled = !this.confirmCheck.checked;
    }
  }

  showAlert(message, type = 'danger') {
    this.alertBox.textContent = message;
    this.alertBox.className = `alert alert-${type}`;
    this.alertBox.classList.remove('d-none');
  }

  clearAlert() {
    this.alertBox.classList.add('d-none');
  }

  setLoading(isLoading) {
    this.loadingOverlay.classList.toggle('d-none', !isLoading);
  }

  formatLabel(code, name) {
    const cleanCode = code !== undefined && code !== null ? String(code) : '';
    const cleanName = name !== undefined && name !== null ? String(name) : '';
    if (!cleanCode) {
      return cleanName;
    }
    return `${cleanCode} | ${cleanName}`;
  }

  parseCodeFromLabel(value) {
    if (!value) {
      return '';
    }
    const parts = value.split('|');
    if (parts.length > 1) {
      return parts[0].trim();
    }
    return '';
  }

  toDatetimeLocal(value) {
    if (!value) {
      return '';
    }
    const raw = String(value).trim();
    if (!raw) {
      return '';
    }
    if (raw.includes('T')) {
      return raw.slice(0, 16);
    }
    if (raw.includes(' ')) {
      return raw.replace(' ', 'T').slice(0, 16);
    }
    if (raw.length === 10) {
      return `${raw}T00:00`;
    }
    return raw.slice(0, 16);
  }

  setupTypeahead(input, list, getItems, onSelect, formatItem) {
    const home = list.parentElement;
    let portalActive = false;

    const attachPortal = () => {
      if (portalActive) {
        return;
      }
      if (!list._portalHome) {
        list._portalHome = home;
      }
      if (list.parentElement !== document.body) {
        document.body.appendChild(list);
      }
      list.classList.add('typeahead-portal');
      portalActive = true;
    };

    const detachPortal = () => {
      if (!portalActive) {
        return;
      }
      if (list._portalHome) {
        list._portalHome.appendChild(list);
      }
      list.classList.remove('typeahead-portal');
      list.style.top = '';
      list.style.left = '';
      list.style.width = '';
      portalActive = false;
    };

    const positionList = () => {
      const rect = input.getBoundingClientRect();
      list.style.width = `${rect.width}px`;
      list.style.left = `${rect.left}px`;
      list.style.top = `${rect.bottom + 6}px`;
    };

    const showList = () => {
      attachPortal();
      list.style.display = 'block';
      positionList();
    };

    const hideList = () => {
      list.style.display = 'none';
      detachPortal();
    };

    const render = (query = '') => {
      const items = getItems();
      const term = query.trim().toLowerCase();
      const matches = items.filter((item) => {
        const label = formatItem(item).toLowerCase();
        return label.includes(term);
      });
      list.innerHTML = '';
      matches.slice(0, 50).forEach((item) => {
        const entry = document.createElement('div');
        entry.className = 'typeahead-item';
        entry.textContent = formatItem(item);
        entry.addEventListener('click', () => {
          onSelect(item);
          hideList();
        });
        list.appendChild(entry);
      });
      if (matches.length) {
        showList();
      } else {
        hideList();
      }
    };

    input.addEventListener('input', (event) => render(event.target.value));
    input.addEventListener('focus', (event) => render(event.target.value));
    input.addEventListener('blur', () => {
      setTimeout(() => {
        hideList();
      }, 150);
    });

    document.addEventListener('click', (event) => {
      if (!list.contains(event.target) && event.target !== input) {
        hideList();
      }
    });

    window.addEventListener(
      'scroll',
      () => {
        if (list.style.display === 'block') {
          positionList();
        }
      },
      true
    );
    window.addEventListener('resize', () => {
      if (list.style.display === 'block') {
        positionList();
      }
    });

    return { render };
  }

  attachProductTypeahead(input, list, hiddenInput, productos) {
    input.addEventListener('input', () => {
      hiddenInput.value = '';
    });
    this.setupTypeahead(
      input,
      list,
      () => productos,
      (item) => {
        input.value = this.formatLabel(item.codigo_producto, item.nombre);
        hiddenInput.value = item.codigo_producto;
      },
      (item) => this.formatLabel(item.codigo_producto, item.nombre)
    );

    input.addEventListener('blur', () => {
      const code = this.parseCodeFromLabel(input.value);
      if (!code) {
        const match = productos.find(
          (item) =>
            String(item.nombre).toLowerCase() === String(input.value).toLowerCase() ||
            String(item.codigo_producto) === String(input.value).trim()
        );
        if (match) {
          input.value = this.formatLabel(match.codigo_producto, match.nombre);
          hiddenInput.value = match.codigo_producto;
        } else {
          hiddenInput.value = '';
        }
      } else {
        hiddenInput.value = code;
      }
    });
  }

  attachEtiquetaTypeahead(input, list, hiddenInput, etiquetas) {
    input.addEventListener('input', () => {
      hiddenInput.value = '';
    });
    this.setupTypeahead(
      input,
      list,
      () => etiquetas,
      (item) => {
        input.value = this.formatLabel(item.codigoetiquetagasto, item.nombre);
        hiddenInput.value = item.codigoetiquetagasto;
      },
      (item) => this.formatLabel(item.codigoetiquetagasto, item.nombre)
    );

    input.addEventListener('blur', () => {
      const code = this.parseCodeFromLabel(input.value);
      if (!code) {
        const match = etiquetas.find(
          (item) =>
            String(item.nombre).toLowerCase() === String(input.value).toLowerCase() ||
            String(item.codigoetiquetagasto) === String(input.value).trim()
        );
        if (match) {
          input.value = this.formatLabel(match.codigoetiquetagasto, match.nombre);
          hiddenInput.value = match.codigoetiquetagasto;
        } else {
          hiddenInput.value = '';
        }
      } else {
        hiddenInput.value = code;
      }
    });
  }

  attachCuentaTypeahead(input, list, hiddenInput, bancoInput, cuentas) {
    input.addEventListener('input', () => {
      hiddenInput.value = '';
      if (bancoInput) {
        bancoInput.value = '';
      }
    });
    this.setupTypeahead(
      input,
      list,
      () => cuentas,
      (item) => {
        input.value = this.formatLabel(item.codigo_cuentabancaria, item.nombre);
        hiddenInput.value = item.codigo_cuentabancaria;
        if (bancoInput) {
          bancoInput.value = item.banco || '';
        }
      },
      (item) => this.formatLabel(item.codigo_cuentabancaria, item.nombre)
    );

    input.addEventListener('blur', () => {
      const code = this.parseCodeFromLabel(input.value);
      if (!code) {
        const match = cuentas.find(
          (item) =>
            String(item.nombre).toLowerCase() === String(input.value).toLowerCase() ||
            String(item.codigo_cuentabancaria) === String(input.value).trim()
        );
        if (match) {
          input.value = this.formatLabel(match.codigo_cuentabancaria, match.nombre);
          hiddenInput.value = match.codigo_cuentabancaria;
          if (bancoInput) {
            bancoInput.value = match.banco || '';
          }
        } else {
          hiddenInput.value = '';
          if (bancoInput) {
            bancoInput.value = '';
          }
        }
      } else {
        hiddenInput.value = code;
        const match = cuentas.find(
          (item) => String(item.codigo_cuentabancaria) === String(code)
        );
        if (bancoInput && match) {
          bancoInput.value = match.banco || '';
        }
      }
    });
  }

  async fetchJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      const message = data && data.message ? data.message : 'ERROR';
      throw new Error(message);
    }
    return data;
  }

  async loadInitialData() {
    this.setLoading(true);
    try {
      const [configData, basesData, productosData, cuentasData, etiquetasData] = await Promise.all([
        this.fetchJson('/api/metadata'),
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/cuentas'),
        this.fetchJson('/api/etiquetas-gastos')
      ]);

      this.state.config = configData.data || {};
      this.state.bases = basesData.bases || [];
      this.state.productos = productosData.productos || [];
      this.state.cuentas = cuentasData.cuentas || [];
      this.state.etiquetas = etiquetasData.etiquetas || [];

      this.applyConfig();
      this.resetTables();
    } catch (error) {
      this.showAlert(error.message || this.t('required'));
    } finally {
      this.setLoading(false);
    }
  }

  async reloadConfig() {
    try {
      const configData = await this.fetchJson('/api/metadata');
      this.state.config = configData.data || {};
      this.applyConfig();
    } catch (error) {
      this.showAlert(error.message || this.t('required'));
    }
  }

  applyConfig() {
    const config = this.state.config;
    this.fechaInput.value = this.toDatetimeLocal(config.vFecha);
    this.tipoDocInsumoInput.value = config.vTipoDocumentoStockInsumo || 'FBI';
    this.numDocInsumoInput.value = config.vNumDocumentoStockInsumo || '';
    this.tipoDocProduccionInput.value = config.vTipoDocumentoStockProduccion || 'FBF';
    this.numDocProduccionInput.value = config.vNumDocumentoStockProduccion || '';
    this.tipoDocGastoInput.value = config.vTipoDocumentoGasto || 'GAS';
    this.numDocGastoInput.value = config.vNumDocumentoGasto || '';
  }

  resetTables() {
    this.insumosBody.innerHTML = '';
    this.gastosBody.innerHTML = '';
    this.produccionBody.innerHTML = '';

    this.addInsumoRow();
    this.addGastoRow();
    this.addProduccionRow();
  }

  addInsumoRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="typeahead">
          <input type="text" class="form-control" name="vnombre_producto_insumo" />
          <input type="hidden" name="vcodigo_producto_insumo" />
          <div class="typeahead-list"></div>
        </div>
      </td>
      <td>
        <input type="text" class="form-control" name="vcantidad_insumo" placeholder="0.00" inputmode="decimal" />
      </td>
      <td>
        <button type="button" class="btn btn-outline-danger btn-sm" data-action="remove">&times;</button>
      </td>
    `;

    this.insumosBody.appendChild(row);
    const input = row.querySelector('input[name="vnombre_producto_insumo"]');
    const list = row.querySelector('.typeahead-list');
    const hidden = row.querySelector('input[name="vcodigo_producto_insumo"]');
    this.attachProductTypeahead(input, list, hidden, this.state.productos);

    row.querySelector('[data-action="remove"]').addEventListener('click', () => row.remove());
  }

  addGastoRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="typeahead">
          <input type="text" class="form-control" name="vnombre_etiquetagasto" />
          <input type="hidden" name="vcodigoetiquetagasto" />
          <div class="typeahead-list"></div>
        </div>
      </td>
      <td>
        <div class="typeahead">
          <input type="text" class="form-control" name="vnombre_cuentabancaria" />
          <input type="hidden" name="vcodigo_cuentabancaria" />
          <div class="typeahead-list"></div>
        </div>
      </td>
      <td>
        <input type="text" class="form-control" name="vbanco" readonly />
      </td>
      <td>
        <input type="text" class="form-control" name="vmonto_gasto" placeholder="0.00" inputmode="decimal" />
      </td>
      <td>
        <button type="button" class="btn btn-outline-danger btn-sm" data-action="remove">&times;</button>
      </td>
    `;

    this.gastosBody.appendChild(row);
    const input = row.querySelector('input[name="vnombre_etiquetagasto"]');
    const list = row.querySelector('.typeahead-list');
    const hidden = row.querySelector('input[name="vcodigoetiquetagasto"]');
    this.attachEtiquetaTypeahead(input, list, hidden, this.state.etiquetas);

    const cuentaInput = row.querySelector('input[name="vnombre_cuentabancaria"]');
    const cuentaList = row.querySelectorAll('.typeahead-list')[1];
    const cuentaHidden = row.querySelector('input[name="vcodigo_cuentabancaria"]');
    const bancoInput = row.querySelector('input[name="vbanco"]');
    cuentaInput.setAttribute('placeholder', this.t('cuentaPlaceholder'));
    this.attachCuentaTypeahead(cuentaInput, cuentaList, cuentaHidden, bancoInput, this.state.cuentas);

    row.querySelector('[data-action="remove"]').addEventListener('click', () => row.remove());
  }

  addProduccionRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="typeahead">
          <input type="text" class="form-control" name="vnombre_producto_producido" />
          <input type="hidden" name="vcodigo_producto_producido" />
          <div class="typeahead-list"></div>
        </div>
      </td>
      <td>
        <input type="text" class="form-control" name="vcantidad_producida" placeholder="0.00" inputmode="decimal" />
      </td>
      <td>
        <button type="button" class="btn btn-outline-danger btn-sm" data-action="remove">&times;</button>
      </td>
    `;

    this.produccionBody.appendChild(row);
    const input = row.querySelector('input[name="vnombre_producto_producido"]');
    const list = row.querySelector('.typeahead-list');
    const hidden = row.querySelector('input[name="vcodigo_producto_producido"]');
    this.attachProductTypeahead(input, list, hidden, this.state.productos);

    row.querySelector('[data-action="remove"]').addEventListener('click', () => row.remove());
  }

  collectInsumos() {
    return Array.from(this.insumosBody.querySelectorAll('tr'))
      .map((row) => {
        const codigo = row.querySelector('input[name="vcodigo_producto_insumo"]').value.trim();
        const nombre = row.querySelector('input[name="vnombre_producto_insumo"]').value.trim();
        const cantidad = row.querySelector('input[name="vcantidad_insumo"]').value.trim();
        return { vcodigo_producto_insumo: codigo, vnombre_producto_insumo: nombre, vcantidad_insumo: cantidad };
      })
      .filter((row) => row.vcodigo_producto_insumo || row.vnombre_producto_insumo || row.vcantidad_insumo);
  }

  collectGastos() {
    return Array.from(this.gastosBody.querySelectorAll('tr'))
      .map((row) => {
        const codigo = row.querySelector('input[name="vcodigoetiquetagasto"]').value.trim();
        const nombre = row.querySelector('input[name="vnombre_etiquetagasto"]').value.trim();
        const codigoCuenta = row.querySelector('input[name="vcodigo_cuentabancaria"]').value.trim();
        const nombreCuenta = row.querySelector('input[name="vnombre_cuentabancaria"]').value.trim();
        const banco = row.querySelector('input[name="vbanco"]').value.trim();
        const monto = row.querySelector('input[name="vmonto_gasto"]').value.trim();
        return {
          vcodigoetiquetagasto: codigo,
          vnombre_etiquetagasto: nombre,
          vcodigo_cuentabancaria: codigoCuenta,
          vnombre_cuentabancaria: nombreCuenta,
          vbanco: banco,
          vmonto_gasto: monto
        };
      })
      .filter(
        (row) =>
          row.vcodigoetiquetagasto ||
          row.vnombre_etiquetagasto ||
          row.vcodigo_cuentabancaria ||
          row.vnombre_cuentabancaria ||
          row.vmonto_gasto
      );
  }

  collectProduccion() {
    return Array.from(this.produccionBody.querySelectorAll('tr'))
      .map((row) => {
        const codigo = row.querySelector('input[name="vcodigo_producto_producido"]').value.trim();
        const nombre = row.querySelector('input[name="vnombre_producto_producido"]').value.trim();
        const cantidad = row.querySelector('input[name="vcantidad_producida"]').value.trim();
        return {
          vcodigo_producto_producido: codigo,
          vnombre_producto_producido: nombre,
          vcantidad_producida: cantidad
        };
      })
      .filter(
        (row) =>
          row.vcodigo_producto_producido ||
          row.vnombre_producto_producido ||
          row.vcantidad_producida
      );
  }

  isValidDecimal(value) {
    const regex = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
    return regex.test(String(value));
  }

  validateStep1() {
    if (!this.codigoBaseInput.value) {
      this.showAlert(this.t('baseRequired'));
      return false;
    }
    const insumos = this.collectInsumos();
    if (!insumos.length) {
      this.showAlert(this.t('insumosRequired'));
      return false;
    }
    const invalid = insumos.some(
      (item) =>
        !item.vcodigo_producto_insumo ||
        !this.isValidDecimal(item.vcantidad_insumo) ||
        Number(item.vcantidad_insumo) <= 0
    );
    if (invalid) {
      this.showAlert(this.t('cantidadesInvalidas'));
      return false;
    }
    this.clearAlert();
    return true;
  }

  validateStep2() {
    const gastos = this.collectGastos();
    if (!gastos.length) {
      this.showAlert(this.t('gastosRequired'));
      return false;
    }
    const invalid = gastos.some(
      (item) =>
        !item.vcodigoetiquetagasto ||
        !item.vcodigo_cuentabancaria ||
        !this.isValidDecimal(item.vmonto_gasto) ||
        Number(item.vmonto_gasto) <= 0
    );
    if (invalid) {
      this.showAlert(this.t('cantidadesInvalidas'));
      return false;
    }
    this.clearAlert();
    return true;
  }

  validateStep3() {
    const produccion = this.collectProduccion();
    if (!produccion.length) {
      this.showAlert(this.t('produccionRequired'));
      return false;
    }
    const invalid = produccion.some(
      (item) =>
        !item.vcodigo_producto_producido ||
        !this.isValidDecimal(item.vcantidad_producida) ||
        Number(item.vcantidad_producida) <= 0
    );
    if (invalid) {
      this.showAlert(this.t('cantidadesInvalidas'));
      return false;
    }
    this.clearAlert();
    return true;
  }

  validateStep4() {
    if (!this.confirmCheck.checked) {
      this.showAlert(this.t('confirmRequired'));
      return false;
    }
    this.clearAlert();
    return true;
  }

  next() {
    if (this.state.step === 0 && !this.validateStep1()) {
      return;
    }
    if (this.state.step === 1 && !this.validateStep2()) {
      return;
    }
    if (this.state.step === 2 && !this.validateStep3()) {
      return;
    }

    if (this.state.step < this.steps.length - 1) {
      this.state.step += 1;
      this.updateStep();
    }
  }

  prev() {
    if (this.state.step > 0) {
      this.state.step -= 1;
      this.updateStep();
    }
  }

  buildSummary() {
    const insumos = this.collectInsumos();
    const gastos = this.collectGastos();
    const produccion = this.collectProduccion();

    const baseLabel = this.baseInput.value || this.codigoBaseInput.value;

    const totalInsumos = insumos.reduce((sum, item) => sum + Number(item.vcantidad_insumo || 0), 0);
    const totalProduccion = produccion.reduce((sum, item) => sum + Number(item.vcantidad_producida || 0), 0);
    const totalGastos = gastos.reduce((sum, item) => sum + Number(item.vmonto_gasto || 0), 0);
    this.summaryGeneral.innerHTML = `
      <div><span class="summary-label">${this.t('lblFecha')}:</span> ${this.fechaInput.value}</div>
      <div><span class="summary-label">${this.t('lblBase')}:</span> ${baseLabel}</div>
    `;

    this.summaryDocs.innerHTML = `
      <div><span class="summary-label">${this.t('lblTipoInsumo')}:</span> ${
      this.tipoDocInsumoInput.value
    } ${this.numDocInsumoInput.value}</div>
      <div><span class="summary-label">${this.t('lblTipoProd')}:</span> ${
      this.tipoDocProduccionInput.value
    } ${this.numDocProduccionInput.value}</div>
      <div><span class="summary-label">${this.t('lblTipoGasto')}:</span> ${this.tipoDocGastoInput.value}</div>
    `;

    this.summaryTotales.innerHTML = `
      <div><span class="summary-label">${this.t('insumosTitle')}:</span> ${totalInsumos}</div>
      <div><span class="summary-label">${this.t('produccionTitle')}:</span> ${totalProduccion}</div>
      <div><span class="summary-label">${this.t('lblMontoGasto')}:</span> ${totalGastos.toFixed(2)}</div>
    `;

    this.confirmInsumosBody.innerHTML = insumos
      .map(
        (item) => `
      <tr>
        <td>${item.vnombre_producto_insumo || item.vcodigo_producto_insumo}</td>
        <td>${item.vcantidad_insumo}</td>
      </tr>
    `
      )
      .join('');

    this.confirmGastosBody.innerHTML = gastos
      .map(
        (item) => `
      <tr>
        <td>${item.vnombre_etiquetagasto || item.vcodigoetiquetagasto}</td>
        <td>${item.vnombre_cuentabancaria || item.vcodigo_cuentabancaria}</td>
        <td>${Number(item.vmonto_gasto || 0).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    this.confirmProduccionBody.innerHTML = produccion
      .map(
        (item) => `
      <tr>
        <td>${item.vnombre_producto_producido || item.vcodigo_producto_producido}</td>
        <td>${item.vcantidad_producida}</td>
      </tr>
    `
      )
      .join('');
  }

  async confirm() {
    if (!this.validateStep4()) {
      return;
    }

    const insumos = this.collectInsumos();
    const gastos = this.collectGastos();
    const produccion = this.collectProduccion();

    const payload = {
      vFecha: this.fechaInput.value,
      vCodigo_base: this.codigoBaseInput.value,
      vBaseNombre: this.baseInput.value,
      vTipoDocumentoStockInsumo: this.tipoDocInsumoInput.value,
      vNumDocumentoStockInsumo: this.numDocInsumoInput.value,
      vTipoDocumentoStockProduccion: this.tipoDocProduccionInput.value,
      vNumDocumentoStockProduccion: this.numDocProduccionInput.value,
      vTipoDocumentoGasto: this.tipoDocGastoInput.value,
      vNumDocumentoGasto: this.numDocGastoInput.value,
      vDetalleInsumos: insumos,
      vDetalleGastos: gastos,
      vDetalleProduccion: produccion
    };

    this.setLoading(true);
    try {
      await this.fetchJson('/api/fabricacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.resetWizard(true);
      this.showAlert(this.t('success'), 'success');
    } catch (error) {
      this.showAlert(error.message || this.t('required'));
    } finally {
      this.setLoading(false);
    }
  }

  resetWizard(afterSubmit = false) {
    this.clearAlert();
    this.baseInput.value = '';
    this.codigoBaseInput.value = '';
    this.confirmCheck.checked = false;

    this.state.step = 0;
    this.updateStep();

    this.resetTables();

    if (afterSubmit) {
      this.reloadConfig();
    }
  }
}

new FormWizard();
