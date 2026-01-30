class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.currentStep = 0;
    this.progressBar = document.getElementById('progressBar');
    this.nextBtn = document.getElementById('nextBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.emitirBtn = document.getElementById('emitirBtn');
    this.loadingState = document.getElementById('loadingState');
    this.alertArea = document.getElementById('alertArea');
    this.statusHint = document.getElementById('statusHint');

    this.fechaPedidoInput = document.getElementById('fechaPedido');
    this.horaPedidoInput = document.getElementById('horaPedido');
    this.clienteInput = document.getElementById('clienteInput');
    this.clienteList = document.getElementById('clienteList');
    this.clienteNumero = document.getElementById('clienteNumero');

    this.pedidoBody = document.getElementById('pedidoBody');
    this.addPedidoRowBtn = document.getElementById('addPedidoRow');

    this.fechaEmisionInput = document.getElementById('fechaEmision');
    this.horaEmisionInput = document.getElementById('horaEmision');
    this.tipoDocumentoInput = document.getElementById('tipoDocumento');
    this.numeroDocumentoInput = document.getElementById('numeroDocumento');
    this.facturaBody = document.getElementById('facturaBody');
    this.saldoFactura = document.getElementById('saldoFactura');

    this.entregaExisteRadio = document.getElementById('entregaExiste');
    this.entregaNuevoRadio = document.getElementById('entregaNuevo');
    this.entregaExistenteCard = document.getElementById('entregaExistente');
    this.entregaNuevoCard = document.getElementById('entregaNuevo');
    this.puntoEntregaInput = document.getElementById('puntoEntregaInput');
    this.puntoEntregaList = document.getElementById('puntoEntregaList');
    this.entregaExistenteInfo = document.getElementById('entregaExistenteInfo');
    this.departamentoInput = document.getElementById('departamentoInput');
    this.departamentoList = document.getElementById('departamentoList');
    this.provinciaInput = document.getElementById('provinciaInput');
    this.provinciaList = document.getElementById('provinciaList');
    this.distritoInput = document.getElementById('distritoInput');
    this.distritoList = document.getElementById('distritoList');
    this.entregaLimaFields = document.getElementById('entregaLimaFields');
    this.entregaProvFields = document.getElementById('entregaProvFields');
    this.direccionInput = document.getElementById('direccionInput');
    this.referenciaInput = document.getElementById('referenciaInput');
    this.nombreProvInput = document.getElementById('nombreProvInput');
    this.dniProvInput = document.getElementById('dniProvInput');
    this.agenciaProvInput = document.getElementById('agenciaProvInput');
    this.observacionesProvInput = document.getElementById('observacionesProvInput');

    this.recibeExisteRadio = document.getElementById('recibeExiste');
    this.recibeNuevoRadio = document.getElementById('recibeNuevo');
    this.recibeExistenteCard = document.getElementById('recibeExistente');
    this.recibeNuevoCard = document.getElementById('recibeNuevo');
    this.recibeInput = document.getElementById('recibeInput');
    this.recibeList = document.getElementById('recibeList');
    this.numeroRecibeInput = document.getElementById('numeroRecibeInput');
    this.nombreRecibeInput = document.getElementById('nombreRecibeInput');

    this.cuentaInput = document.getElementById('cuentaInput');
    this.cuentaList = document.getElementById('cuentaList');
    this.cuentaBanco = document.getElementById('cuentaBanco');
    this.montoPendienteInput = document.getElementById('montoPendiente');
    this.montoPagoInput = document.getElementById('montoPago');
    this.addPagoBtn = document.getElementById('addPagoBtn');
    this.pagosBody = document.getElementById('pagosBody');

    this.baseInput = document.getElementById('baseInput');
    this.baseList = document.getElementById('baseList');
    this.jsonDetalle = document.getElementById('jsonDetalle');

    this.resumenPedido = document.getElementById('resumenPedido');
    this.resumenFactura = document.getElementById('resumenFactura');
    this.resumenEntrega = document.getElementById('resumenEntrega');
    this.resumenRecibe = document.getElementById('resumenRecibe');

    this.confirmCheck = document.getElementById('confirmCheck');

    this.state = {
      vcodigo_pedido: null,
      vFechaPedido: null,
      vHoraPedido: null,
      vFechaP: null,
      vClienteSeleted: null,
      vClienteNombre: '',
      vClienteNumero: '',
      vProdPedidos: [],
      vProdFactura: [],
      vTipo_documento: 'FAC',
      vNumero_documento: null,
      vRegion_Entrega: null,
      vEntregaExiste: true,
      vPuntoEntrega: null,
      vPuntoEntregaTexto: '',
      vDireccionLinea: '',
      vReferencia: '',
      vNombre: '',
      vDni: '',
      vAgencia: '',
      vObservaciones: '',
      vCod_Dep: '',
      vCod_Prov: '',
      vCod_Dist: '',
      Vubigeo: '',
      Vcodigo_puntoentrega: null,
      vRecibeExiste: true,
      vConcatenarnumrecibe: '',
      vNumeroRecibe: '',
      vNombreRecibe: '',
      vOrdinal_numrecibe: null,
      vTipo_documento_pago: 'RCP',
      vNumero_documento_pago: null,
      vCuentaNombre: '',
      vCuentaBanco: '',
      vCuentaBancaria: null,
      vMontoPendiente: 0,
      vMontoPago: 0,
      vPagos: [],
      vCodigo_base: null,
      vBaseNombre: ''
    };

    this.catalogos = {
      clientes: [],
      productos: [],
      puntosEntrega: [],
      departamentos: [],
      provincias: [],
      distritos: [],
      numrecibe: [],
      cuentas: [],
      bases: []
    };

    this.init();
  }

  init() {
    this.setLanguage();
    this.applyLanguage();
    this.initializeDates();
    this.updateButtons();
    this.attachEvents();
    this.loadInitialData();
    this.addPedidoRow();
  }

  setLanguage() {
    const lang = (navigator.language || 'es').toLowerCase();
    this.langKey = lang.startsWith('es') ? 'es' : 'en';
    this.dict = translations[this.langKey];
    document.documentElement.lang = this.langKey;
  }

  applyLanguage() {
    const dict = this.dict;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });
  }

  initializeDates() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8);
    this.state.vFechaPedido = date;
    this.state.vHoraPedido = time;
    this.state.vFechaP = `${date} ${time}`;
    this.fechaPedidoInput.value = date;
    this.horaPedidoInput.value = time;
    this.fechaEmisionInput.value = date;
    this.horaEmisionInput.value = time;
    this.tipoDocumentoInput.value = this.state.vTipo_documento;
  }

  attachEvents() {
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.prevBtn.addEventListener('click', () => this.handlePrev());
    this.emitirBtn.addEventListener('click', () => this.handleEmitir());

    this.addPedidoRowBtn.addEventListener('click', () => this.addPedidoRow());
    this.entregaExisteRadio.addEventListener('change', () => this.toggleEntrega());
    this.entregaNuevoRadio.addEventListener('change', () => this.toggleEntrega());
    this.recibeExisteRadio.addEventListener('change', () => this.toggleRecibe());
    this.recibeNuevoRadio.addEventListener('change', () => this.toggleRecibe());

    this.addPagoBtn.addEventListener('click', () => this.addPago());
    this.montoPagoInput.addEventListener('input', () => this.clearInvalid(this.montoPagoInput));

    this.clienteInput.addEventListener('input', () => this.showTypeahead('clientes', this.clienteInput, this.clienteList, 'nombre'));
    this.puntoEntregaInput.addEventListener('input', () => this.showTypeahead('puntosEntrega', this.puntoEntregaInput, this.puntoEntregaList, 'concatenarpuntoentrega'));
    this.departamentoInput.addEventListener('input', () => this.showTypeahead('departamentos', this.departamentoInput, this.departamentoList, 'departamento'));
    this.provinciaInput.addEventListener('input', () => this.showTypeahead('provincias', this.provinciaInput, this.provinciaList, 'provincia'));
    this.distritoInput.addEventListener('input', () => this.showTypeahead('distritos', this.distritoInput, this.distritoList, 'distrito'));
    this.recibeInput.addEventListener('input', () => this.showTypeahead('numrecibe', this.recibeInput, this.recibeList, 'concatenarnumrecibe'));
    this.cuentaInput.addEventListener('input', () => this.showTypeahead('cuentas', this.cuentaInput, this.cuentaList, 'nombre'));
    this.baseInput.addEventListener('input', () => this.showTypeahead('bases', this.baseInput, this.baseList, 'nombre'));

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.typeahead')) {
        document.querySelectorAll('.typeahead-list').forEach((list) => list.style.display = 'none');
      }
    });
  }

  setLoading(message) {
    if (!message) {
      this.loadingState.innerHTML = '';
      return;
    }
    this.loadingState.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>${message}`;
  }

  showAlert(type, message) {
    this.alertArea.innerHTML = `
      <div class="alert alert-${type} d-flex justify-content-between align-items-center" role="alert">
        <div>${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`;
  }

  clearAlert() {
    this.alertArea.innerHTML = '';
  }

  updateButtons() {
    const sequence = this.getStepSequence();
    this.prevBtn.disabled = this.currentStep === 0;
    this.nextBtn.textContent = this.currentStep === sequence.length - 1 ? this.dict.finish : this.dict.next;
    const progress = ((this.currentStep + 1) / sequence.length) * 100;
    this.progressBar.style.width = `${progress}%`;
  }

  getStepSequence() {
    const steps = [0, 1, 2, 3, 4, 5, 6];
    if (this.state.vRegion_Entrega && this.state.vRegion_Entrega !== 'LIMA') {
      return steps.filter((step) => step !== 3);
    }
    return steps;
  }

  goToStep(index) {
    const sequence = this.getStepSequence();
    const actualIndex = sequence[index];
    const currentActual = sequence[this.currentStep];
    this.steps[currentActual].classList.remove('active');
    this.currentStep = index;
    this.steps[actualIndex].classList.add('active');
    this.updateButtons();
  }

  handlePrev() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  async handleNext() {
    this.clearAlert();
    const valid = this.validateStep();
    if (!valid) return;

    const sequence = this.getStepSequence();
    if (this.currentStep === sequence.length - 1) {
      this.goToStep(this.currentStep);
      return;
    }

    this.goToStep(this.currentStep + 1);

    const stepIndex = sequence[this.currentStep];
    if (stepIndex === 1) {
      this.prepareFactura();
    }
    if (stepIndex === 2) {
      this.updateEntregaUI();
    }
    if (stepIndex === 4) {
      this.updateMontoPendiente();
    }
    if (stepIndex === 5) {
      this.updateJsonDetalle();
    }
    if (stepIndex === 6) {
      this.renderResumen();
    }
  }

  validateStep() {
    const stepIndex = this.getStepSequence()[this.currentStep];

    if (stepIndex === 0) {
      if (!this.state.vClienteSeleted) {
        this.showAlert('warning', this.dict.errors.cliente);
        this.clienteInput.classList.add('is-invalid');
        return false;
      }

      const rows = Array.from(this.pedidoBody.querySelectorAll('tr'));
      if (rows.length === 0) {
        this.showAlert('warning', this.dict.errors.detallePedido);
        return false;
      }

      const decimalRegex = /^\d+(\.\d{1,2})?$/;
      for (const row of rows) {
        const producto = row.dataset.codigoProducto;
        const cantidadInput = row.querySelector('.pedido-cantidad');
        const precioInput = row.querySelector('.pedido-precio');
        if (!producto) {
          this.showAlert('warning', this.dict.errors.producto);
          row.querySelector('.pedido-producto').classList.add('is-invalid');
          return false;
        }
        if (!decimalRegex.test(cantidadInput.value) || Number(cantidadInput.value) <= 0) {
          this.showAlert('warning', this.dict.errors.cantidad);
          cantidadInput.classList.add('is-invalid');
          return false;
        }
        if (!decimalRegex.test(precioInput.value) || Number(precioInput.value) <= 0) {
          this.showAlert('warning', this.dict.errors.precio);
          precioInput.classList.add('is-invalid');
          return false;
        }
      }
      this.storePedidoLines();
      return true;
    }

    if (stepIndex === 1) {
      const decimalRegex = /^\d+(\.\d{1,2})?$/;
      for (const line of this.state.vProdFactura) {
        if (!decimalRegex.test(String(line.vFCantidadProducto)) || Number(line.vFCantidadProducto) <= 0) {
          this.showAlert('warning', this.dict.errors.cantidadFactura);
          return false;
        }
        if (Number(line.vFCantidadProducto) > Number(line.vMaxCantidad)) {
          this.showAlert('danger', this.dict.errors.cantidadFacturaExcede);
          return false;
        }
      }
      return true;
    }

    if (stepIndex === 2) {
      if (this.state.vEntregaExiste && !this.state.vPuntoEntrega) {
        this.showAlert('warning', this.dict.errors.puntoEntrega);
        this.puntoEntregaInput.classList.add('is-invalid');
        return false;
      }

      if (!this.state.vEntregaExiste) {
        if (!this.state.vCod_Dep || !this.state.vCod_Prov || !this.state.vCod_Dist) {
          this.showAlert('warning', this.dict.errors.ubigeo);
          return false;
        }
        if (this.state.vRegion_Entrega === 'LIMA' && !this.direccionInput.value.trim()) {
          this.showAlert('warning', this.dict.errors.direccion);
          this.direccionInput.classList.add('is-invalid');
          return false;
        }
        if (this.state.vRegion_Entrega === 'PROV') {
          const nameRegex = /^[A-Za-z0-9\s'.-]{2,}$/;
          const dniRegex = /^\d{8}$/;
          if (!nameRegex.test(this.nombreProvInput.value.trim())) {
            this.showAlert('warning', this.dict.errors.nombre);
            this.nombreProvInput.classList.add('is-invalid');
            return false;
          }
          if (!dniRegex.test(this.dniProvInput.value.trim())) {
            this.showAlert('warning', this.dict.errors.dni);
            this.dniProvInput.classList.add('is-invalid');
            return false;
          }
        }
      }

      return true;
    }

    if (stepIndex === 3) {
      if (this.state.vRegion_Entrega !== 'LIMA') {
        return true;
      }
      if (this.state.vRecibeExiste && !this.state.vConcatenarnumrecibe) {
        this.showAlert('warning', this.dict.errors.recibe);
        this.recibeInput.classList.add('is-invalid');
        return false;
      }
      if (!this.state.vRecibeExiste) {
        if (!this.numeroRecibeInput.value.trim() || !this.nombreRecibeInput.value.trim()) {
          this.showAlert('warning', this.dict.errors.recibeNuevo);
          return false;
        }
      }
      return true;
    }

    if (stepIndex === 4) {
      if (this.state.vPagos.length > 0) {
        return true;
      }
      const pago = Number(this.montoPagoInput.value || 0);
      if (pago > 0 && (!this.state.vCuentaBancaria || pago > this.state.vMontoPendiente)) {
        this.showAlert('warning', this.dict.errors.pago);
        return false;
      }
      return true;
    }

    if (stepIndex === 5) {
      if (!this.state.vCodigo_base) {
        this.showAlert('warning', this.dict.errors.base);
        this.baseInput.classList.add('is-invalid');
        return false;
      }
      return true;
    }

    if (stepIndex === 6) {
      if (!this.confirmCheck.checked) {
        this.showAlert('warning', this.dict.errors.confirm);
        return false;
      }
      return true;
    }

    return true;
  }

  async loadInitialData() {
    this.setLoading(this.dict.loading);
    try {
      const [clientes, productos, cuentas, bases, nextPedido, nextFactura, nextRecibo] = await Promise.all([
        this.fetchJson('/api/clientes'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/cuentas'),
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/next/pedido'),
        this.fetchJson('/api/next/factura'),
        this.fetchJson('/api/next/recibo')
      ]);
      this.catalogos.clientes = clientes;
      this.catalogos.productos = productos;
      this.catalogos.cuentas = cuentas;
      this.catalogos.bases = bases;
      this.state.vcodigo_pedido = nextPedido.next;
      this.state.vNumero_documento = nextFactura.next;
      this.state.vNumero_documento_pago = nextRecibo.next;
      this.numeroDocumentoInput.value = this.state.vNumero_documento;
      this.refreshPedidoRowsTypeahead();

      this.bindTypeahead(this.clienteInput, this.clienteList, clientes, 'nombre', (item) => {
        this.state.vClienteSeleted = item.codigo_cliente;
        this.state.vClienteNombre = item.nombre;
        this.state.vClienteNumero = item.numero;
        this.clienteNumero.textContent = `${this.dict.numeroCliente}: ${item.numero}`;
        this.clienteInput.value = item.nombre;
        this.clienteInput.classList.remove('is-invalid');
        this.loadEntregaData();
        this.loadRecibeData();
      });

      this.bindTypeahead(this.cuentaInput, this.cuentaList, cuentas, 'nombre', (item) => {
        this.state.vCuentaBancaria = item.codigo_cuentabancaria;
        this.state.vCuentaNombre = item.nombre;
        this.state.vCuentaBanco = item.banco;
        this.cuentaBanco.textContent = item.banco ? `${this.dict.banco}: ${item.banco}` : '';
        this.cuentaInput.value = item.nombre;
        this.cuentaInput.classList.remove('is-invalid');
      });

      this.bindTypeahead(this.baseInput, this.baseList, bases, 'nombre', (item) => {
        this.state.vCodigo_base = item.codigo_base;
        this.state.vBaseNombre = item.nombre;
        this.baseInput.value = item.nombre;
        this.baseInput.classList.remove('is-invalid');
        this.updateJsonDetalle();
      });
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.errors.general);
    } finally {
      this.setLoading('');
    }
  }

  async loadEntregaData() {
    if (!this.state.vClienteSeleted) return;
    try {
      this.state.vPuntoEntrega = null;
      this.state.vPuntoEntregaTexto = '';
      this.state.vRegion_Entrega = null;
      this.puntoEntregaInput.value = '';
      this.entregaExistenteInfo.innerHTML = '';
      this.departamentoInput.value = '';
      this.provinciaInput.value = '';
      this.distritoInput.value = '';
      const [puntos, departamentos] = await Promise.all([
        this.fetchJson(`/api/puntos-entrega?codigoCliente=${this.state.vClienteSeleted}`),
        this.fetchJson('/api/departamentos')
      ]);
      this.catalogos.puntosEntrega = puntos;
      this.catalogos.departamentos = departamentos;

      if (!puntos || puntos.length === 0) {
        this.entregaExisteRadio.disabled = true;
        this.entregaNuevoRadio.checked = true;
        this.state.vEntregaExiste = false;
      } else {
        this.entregaExisteRadio.disabled = false;
        this.entregaExisteRadio.checked = true;
        this.state.vEntregaExiste = true;
      }
      this.toggleEntrega();

      this.bindTypeahead(this.puntoEntregaInput, this.puntoEntregaList, puntos, 'concatenarpuntoentrega', (item) => {
        this.state.vPuntoEntrega = item;
        this.state.vPuntoEntregaTexto = item.concatenarpuntoentrega;
        this.state.vRegion_Entrega = item.region_entrega;
        this.state.Vcodigo_puntoentrega = item.codigo_puntoentrega;
        this.state.vCod_Dep = item.cod_dep;
        this.state.vCod_Prov = item.cod_prov;
        this.state.vCod_Dist = item.cod_dist;
        this.state.Vubigeo = item.ubigeo;
        this.entregaExistenteInfo.innerHTML = this.renderEntregaInfo(item);
        this.updateRegionUI();
      });

      this.bindTypeahead(this.departamentoInput, this.departamentoList, departamentos, 'departamento', (item) => {
        this.state.vCod_Dep = item.cod_dep;
        this.departamentoInput.value = item.departamento;
        this.departamentoInput.classList.remove('is-invalid');
        this.loadProvincias(item.cod_dep);
      });
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.errors.general);
    }
  }

  async loadProvincias(codDep) {
    this.provinciaInput.value = '';
    this.distritoInput.value = '';
    this.catalogos.provincias = [];
    this.catalogos.distritos = [];
    if (!codDep) return;
    const provincias = await this.fetchJson(`/api/provincias?codDep=${codDep}`);
    this.catalogos.provincias = provincias;
    this.bindTypeahead(this.provinciaInput, this.provinciaList, provincias, 'provincia', (item) => {
      this.state.vCod_Prov = item.cod_prov;
      this.provinciaInput.value = item.provincia;
      this.provinciaInput.classList.remove('is-invalid');
      this.loadDistritos(this.state.vCod_Dep, item.cod_prov);
    });
  }

  async loadDistritos(codDep, codProv) {
    this.distritoInput.value = '';
    this.catalogos.distritos = [];
    if (!codDep || !codProv) return;
    const distritos = await this.fetchJson(`/api/distritos?codDep=${codDep}&codProv=${codProv}`);
    this.catalogos.distritos = distritos;
    this.bindTypeahead(this.distritoInput, this.distritoList, distritos, 'distrito', (item) => {
      this.state.vCod_Dist = item.cod_dist;
      this.distritoInput.value = item.distrito;
      this.distritoInput.classList.remove('is-invalid');
      this.defineRegion();
    });
  }

  async loadRecibeData() {
    if (!this.state.vClienteSeleted) return;
    this.state.vConcatenarnumrecibe = '';
    this.state.vNumeroRecibe = '';
    this.state.vNombreRecibe = '';
    this.state.vOrdinal_numrecibe = null;
    this.recibeInput.value = '';
    this.numeroRecibeInput.value = '';
    this.nombreRecibeInput.value = '';
    const numrecibe = await this.fetchJson(`/api/numrecibe?codigoCliente=${this.state.vClienteSeleted}`);
    this.catalogos.numrecibe = numrecibe;

    if (!numrecibe || numrecibe.length === 0) {
      this.recibeExisteRadio.disabled = true;
      this.recibeNuevoRadio.checked = true;
      this.state.vRecibeExiste = false;
    } else {
      this.recibeExisteRadio.disabled = false;
      this.recibeExisteRadio.checked = true;
      this.state.vRecibeExiste = true;
    }
    this.toggleRecibe();

    this.bindTypeahead(this.recibeInput, this.recibeList, numrecibe, 'concatenarnumrecibe', (item) => {
      this.state.vConcatenarnumrecibe = item.concatenarnumrecibe;
      this.state.vNumeroRecibe = item.numero;
      this.state.vNombreRecibe = item.nombre;
      this.state.vOrdinal_numrecibe = item.ordinal_numrecibe;
      this.recibeInput.value = item.concatenarnumrecibe;
      this.recibeInput.classList.remove('is-invalid');
    });
  }

  async fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || this.dict.errors.general);
    }
    return data;
  }

  bindTypeahead(input, listEl, items, key, onSelect) {
    listEl.innerHTML = '';
    listEl.style.display = 'none';
    input.addEventListener('focus', () => this.showTypeaheadItems(input, listEl, items, key, onSelect));
    input.addEventListener('input', () => this.showTypeaheadItems(input, listEl, items, key, onSelect));
    listEl.onmousedown = (event) => {
      const item = event.target.closest('.typeahead-item');
      if (!item) return;
      const index = Number(item.dataset.index);
      const selected = items[index];
      if (selected) {
        onSelect(selected);
      }
      listEl.style.display = 'none';
    };
  }

  showTypeaheadItems(input, listEl, items, key, onSelect) {
    const query = input.value.trim().toLowerCase();
    const filtered = items.filter((item) => String(item[key] || '').toLowerCase().includes(query));
    listEl.innerHTML = filtered
      .slice(0, 50)
      .map((item, index) => `<div class="typeahead-item" data-index="${items.indexOf(item)}">${item[key]}</div>`)
      .join('');
    listEl.style.display = filtered.length ? 'block' : 'none';
    listEl.onmousedown = (event) => {
      const node = event.target.closest('.typeahead-item');
      if (!node) return;
      const selected = items[Number(node.dataset.index)];
      if (selected) {
        onSelect(selected);
      }
      listEl.style.display = 'none';
    };
  }

  showTypeahead(catalogKey, input, listEl, key) {
    const items = this.catalogos[catalogKey] || [];
    this.showTypeaheadItems(input, listEl, items, key, () => {});
  }

  addPedidoRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="typeahead">
          <input class="form-control typeahead-input pedido-producto" type="text" placeholder="Buscar producto" autocomplete="off" />
          <div class="typeahead-list"></div>
        </div>
      </td>
      <td><input class="form-control pedido-cantidad" type="text" placeholder="0.00" /></td>
      <td><input class="form-control pedido-precio" type="text" placeholder="0.00" /></td>
      <td><button class="btn btn-outline-light btn-sm remove-row" type="button">${this.dict.remove}</button></td>
    `;
    const productoInput = row.querySelector('.pedido-producto');
    const listEl = row.querySelector('.typeahead-list');

    this.bindTypeahead(productoInput, listEl, this.catalogos.productos, 'nombre', (item) => {
      row.dataset.codigoProducto = item.codigo_producto;
      row.dataset.nombreProducto = item.nombre;
      productoInput.value = item.nombre;
      productoInput.classList.remove('is-invalid');
    });

    row.querySelector('.remove-row').addEventListener('click', () => {
      row.remove();
    });

    row.querySelector('.pedido-cantidad').addEventListener('input', (event) => {
      this.clearInvalid(event.target);
    });
    row.querySelector('.pedido-precio').addEventListener('input', (event) => {
      this.clearInvalid(event.target);
    });

    this.pedidoBody.appendChild(row);
  }

  refreshPedidoRowsTypeahead() {
    const rows = Array.from(this.pedidoBody.querySelectorAll('tr'));
    rows.forEach((row) => {
      const productoInput = row.querySelector('.pedido-producto');
      const listEl = row.querySelector('.typeahead-list');
      this.bindTypeahead(productoInput, listEl, this.catalogos.productos, 'nombre', (item) => {
        row.dataset.codigoProducto = item.codigo_producto;
        row.dataset.nombreProducto = item.nombre;
        productoInput.value = item.nombre;
        productoInput.classList.remove('is-invalid');
      });
    });
  }

  storePedidoLines() {
    const rows = Array.from(this.pedidoBody.querySelectorAll('tr'));
    this.state.vProdPedidos = rows.map((row, index) => {
      const cantidad = Number(row.querySelector('.pedido-cantidad').value);
      const precio = Number(row.querySelector('.pedido-precio').value);
      const precioUnitario = cantidad ? precio / cantidad : 0;
      return {
        vProductoCodigo: row.dataset.codigoProducto,
        vProductoNombre: row.dataset.nombreProducto,
        vCantidadProducto: cantidad,
        vPrecioTotal: precio,
        vOrdinalPedDetalle: index + 1,
        vPrecioUnitario: precioUnitario
      };
    });
  }

  prepareFactura() {
    this.state.vProdFactura = this.state.vProdPedidos.map((item, index) => ({
      vFProducto: item.vProductoCodigo,
      vFProductoNombre: item.vProductoNombre,
      vFCantidadProducto: item.vCantidadProducto,
      vFPrecioTotal: item.vPrecioTotal,
      vPrecioUnitario: item.vPrecioUnitario,
      vMaxCantidad: item.vCantidadProducto,
      vOrdinalDetMovCont: index + 1
    }));
    this.renderFacturaTable();
    this.updateMontoPendiente();
  }

  renderFacturaTable() {
    this.facturaBody.innerHTML = '';
    this.state.vProdFactura.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.vFProductoNombre}</td>
        <td><input class="form-control factura-cantidad" type="text" value="${item.vFCantidadProducto}" /></td>
        <td><input class="form-control" type="text" value="${item.vFPrecioTotal.toFixed(2)}" readonly /></td>
        <td><button class="btn btn-outline-light btn-sm remove-factura" type="button">${this.dict.remove}</button></td>
      `;

      if (this.state.vProdFactura.length <= 1) {
        row.querySelector('.remove-factura').disabled = true;
      }

      row.querySelector('.remove-factura').addEventListener('click', () => {
        if (this.state.vProdFactura.length > 1) {
          this.state.vProdFactura.splice(index, 1);
          this.renderFacturaTable();
        }
      });

      row.querySelector('.factura-cantidad').addEventListener('input', (event) => {
        const value = Number(event.target.value || 0);
        item.vFCantidadProducto = value;
        item.vFPrecioTotal = item.vPrecioUnitario * value;
        row.querySelector('td:nth-child(3) input').value = item.vFPrecioTotal.toFixed(2);
        this.updateMontoPendiente();
      });

      this.facturaBody.appendChild(row);
    });
  }

  toggleEntrega() {
    this.state.vEntregaExiste = this.entregaExisteRadio.checked;
    if (this.state.vEntregaExiste) {
      this.entregaExistenteCard.classList.remove('d-none');
      this.entregaNuevoCard.classList.add('d-none');
    } else {
      this.entregaExistenteCard.classList.add('d-none');
      this.entregaNuevoCard.classList.remove('d-none');
      this.state.vPuntoEntrega = null;
      this.state.vPuntoEntregaTexto = '';
      this.entregaExistenteInfo.innerHTML = '';
    }
    this.updateRegionUI();
  }

  toggleRecibe() {
    this.state.vRecibeExiste = this.recibeExisteRadio.checked;
    if (this.state.vRecibeExiste) {
      this.recibeExistenteCard.classList.remove('d-none');
      this.recibeNuevoCard.classList.add('d-none');
    } else {
      this.recibeExistenteCard.classList.add('d-none');
      this.recibeNuevoCard.classList.remove('d-none');
    }
  }

  defineRegion() {
    if (this.state.vCod_Dep === '15' && this.state.vCod_Prov === '01') {
      this.state.vRegion_Entrega = 'LIMA';
    } else {
      this.state.vRegion_Entrega = 'PROV';
    }
    this.state.Vubigeo = `${this.state.vCod_Dep}${this.state.vCod_Prov}${this.state.vCod_Dist}`;
    this.updateRegionUI();
  }

  updateRegionUI() {
    if (this.state.vRegion_Entrega === 'LIMA') {
      this.entregaLimaFields.classList.remove('d-none');
      this.entregaProvFields.classList.add('d-none');
    } else if (this.state.vRegion_Entrega === 'PROV') {
      this.entregaLimaFields.classList.add('d-none');
      this.entregaProvFields.classList.remove('d-none');
    }
    this.updateButtons();
  }

  updateEntregaUI() {
    if (this.state.vEntregaExiste && this.state.vPuntoEntrega) {
      this.entregaExistenteInfo.innerHTML = this.renderEntregaInfo(this.state.vPuntoEntrega);
      this.state.vRegion_Entrega = this.state.vPuntoEntrega.region_entrega;
      this.updateRegionUI();
    }
  }

  renderEntregaInfo(item) {
    return `
      <div><strong>${this.dict.region}:</strong> ${item.region_entrega}</div>
      <div><strong>${this.dict.direccion}:</strong> ${item.direccion_linea || '-'}</div>
      <div><strong>${this.dict.referencia}:</strong> ${item.referencia || '-'}</div>
      <div><strong>${this.dict.nombre}:</strong> ${item.nombre || '-'}</div>
      <div><strong>${this.dict.dni}:</strong> ${item.dni || '-'}</div>
      <div><strong>${this.dict.agencia}:</strong> ${item.agencia || '-'}</div>
    `;
  }

  updateMontoPendiente() {
    const total = this.getFacturaTotal();
    if (this.state.vPagos.length > 0) {
      this.recalculatePagos();
    } else {
      this.state.vMontoPendiente = Number(total.toFixed(2));
      this.montoPendienteInput.value = this.state.vMontoPendiente.toFixed(2);
      this.montoPagoInput.value = this.state.vMontoPendiente.toFixed(2);
    }
    this.saldoFactura.textContent = total.toFixed(2);
    this.addPagoBtn.disabled = this.state.vMontoPendiente <= 0;
  }

  addPago() {
    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    const pago = Number(this.montoPagoInput.value || 0);
    if (!decimalRegex.test(String(this.montoPagoInput.value || '0'))) {
      this.showAlert('warning', this.dict.errors.pagoFormato);
      return;
    }
    if (pago <= 0) {
      this.showAlert('warning', this.dict.errors.pagoVacio);
      return;
    }
    if (!this.state.vCuentaBancaria) {
      this.showAlert('warning', this.dict.errors.cuenta);
      return;
    }
    if (pago > this.state.vMontoPendiente) {
      this.showAlert('warning', this.dict.errors.pagoMayor);
      return;
    }

    const pagoItem = {
      vCuentaBancaria: this.state.vCuentaBancaria,
      vCuentaNombre: this.state.vCuentaNombre,
      monto: Number(pago.toFixed(2))
    };
    this.state.vPagos.push(pagoItem);
    this.state.vMontoPendiente = Number((this.state.vMontoPendiente - pago).toFixed(2));
    this.montoPendienteInput.value = this.state.vMontoPendiente.toFixed(2);
    this.montoPagoInput.value = this.state.vMontoPendiente.toFixed(2);
    this.renderPagos();
    this.addPagoBtn.disabled = this.state.vMontoPendiente <= 0;
  }

  renderPagos() {
    this.pagosBody.innerHTML = '';
    this.state.vPagos.forEach((pago, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${pago.vCuentaNombre}</td>
        <td>${pago.monto.toFixed(2)}</td>
        <td><button class="btn btn-outline-light btn-sm" type="button">${this.dict.remove}</button></td>
      `;
      row.querySelector('button').addEventListener('click', () => {
        this.state.vPagos.splice(index, 1);
        this.recalculatePagos();
      });
      this.pagosBody.appendChild(row);
    });
  }

  recalculatePagos() {
    const totalPagos = this.state.vPagos.reduce((sum, pago) => sum + pago.monto, 0);
    const totalFactura = this.getFacturaTotal();
    this.state.vMontoPendiente = Number((totalFactura - totalPagos).toFixed(2));
    this.montoPendienteInput.value = this.state.vMontoPendiente.toFixed(2);
    this.montoPagoInput.value = this.state.vMontoPendiente.toFixed(2);
    this.renderPagos();
  }

  getFacturaTotal() {
    return this.state.vProdFactura.reduce((sum, item) => sum + Number(item.vFPrecioTotal || 0), 0);
  }

  updateJsonDetalle() {
    const json = this.state.vProdFactura.map((item) => ({
      vFProducto: item.vFProducto,
      vFCantidadProducto: item.vFCantidadProducto,
      vFPrecioTotal: Number(item.vFPrecioTotal.toFixed(2))
    }));
    this.jsonDetalle.textContent = JSON.stringify(json, null, 2);
  }

  renderResumen() {
    const pedidoItems = this.state.vProdPedidos
      .map((item) => `${item.vProductoNombre}: ${item.vCantidadProducto} (${item.vPrecioTotal.toFixed(2)})`)
      .join('<br>');

    const facturaItems = this.state.vProdFactura
      .map((item) => `${item.vFProductoNombre}: ${item.vFCantidadProducto} (${item.vFPrecioTotal.toFixed(2)})`)
      .join('<br>');

    const entregaTipo = this.state.vEntregaExiste ? this.dict.existente : this.dict.nuevo;
    const recibeTipo = this.state.vRecibeExiste ? this.dict.existente : this.dict.nuevo;
    const totalFactura = this.getFacturaTotal();

    this.resumenPedido.innerHTML = `
      <div><strong>${this.dict.codigoPedido}:</strong> ${this.state.vcodigo_pedido}</div>
      <div><strong>${this.dict.cliente}:</strong> ${this.state.vClienteNombre}</div>
      <div>${pedidoItems}</div>
    `;

    this.resumenFactura.innerHTML = `
      <div><strong>${this.dict.numeroDoc}:</strong> ${this.state.vNumero_documento}</div>
      <div><strong>${this.dict.saldoFactura}:</strong> ${totalFactura.toFixed(2)}</div>
      <div>${facturaItems}</div>
    `;

    this.resumenEntrega.innerHTML = `
      <div><strong>${this.dict.tipoPunto}:</strong> ${entregaTipo}</div>
      <div>${this.state.vPuntoEntregaTexto || this.buildConcatenarPuntoEntrega()}</div>
    `;

    this.resumenRecibe.innerHTML = `
      <div><strong>${this.dict.tipoRecibe}:</strong> ${this.state.vRegion_Entrega === 'LIMA' ? recibeTipo : this.dict.noAplica}</div>
      <div>${this.state.vRegion_Entrega === 'LIMA' ? (this.state.vConcatenarnumrecibe || this.buildConcatenarNumRecibe()) : this.dict.noAplica}</div>
    `;
  }

  buildConcatenarPuntoEntrega() {
    if (this.state.vRegion_Entrega === 'LIMA') {
      const parts = [this.direccionInput.value.trim(), this.distritoInput.value.trim(), this.referenciaInput.value.trim()].filter(Boolean);
      return parts.join(' | ');
    }
    const parts = [
      this.nombreProvInput.value.trim(),
      this.dniProvInput.value.trim(),
      this.agenciaProvInput.value.trim(),
      this.observacionesProvInput.value.trim()
    ].filter(Boolean);
    return parts.join(' | ');
  }

  buildConcatenarNumRecibe() {
    const parts = [this.numeroRecibeInput.value.trim(), this.nombreRecibeInput.value.trim()].filter(Boolean);
    return parts.join(' | ');
  }

  async handleEmitir() {
    this.clearAlert();
    if (!this.validateStep()) return;

    this.setLoading(this.dict.emitiendo);
    try {
      const payload = this.buildPayload();
      const response = await fetch('/api/emitir-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || this.dict.errors.general);
      }
      this.showAlert('success', this.dict.success);
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.errors.general);
    } finally {
      this.setLoading('');
    }
  }

  buildPayload() {
    const entregaNuevo = !this.state.vEntregaExiste;
    const recibeNuevo = this.state.vRegion_Entrega === 'LIMA' && !this.state.vRecibeExiste;

    const payload = {
      vcodigo_pedido: this.state.vcodigo_pedido,
      vFechaP: this.state.vFechaP,
      vClienteSeleted: this.state.vClienteSeleted,
      vProdPedidos: this.state.vProdPedidos,
      vTipo_documento: this.state.vTipo_documento,
      vNumero_documento: this.state.vNumero_documento,
      vProdFactura: this.state.vProdFactura,
      vRegion_Entrega: this.state.vRegion_Entrega,
      vEntregaNuevo: entregaNuevo,
      vPuntoEntrega: this.state.vPuntoEntrega,
      vDireccionLinea: this.direccionInput.value.trim(),
      vReferencia: this.referenciaInput.value.trim(),
      vNombre: this.nombreProvInput.value.trim(),
      vDni: this.dniProvInput.value.trim(),
      vAgencia: this.agenciaProvInput.value.trim(),
      vObservaciones: this.observacionesProvInput.value.trim(),
      vCod_Dep: this.state.vCod_Dep,
      vCod_Prov: this.state.vCod_Prov,
      vCod_Dist: this.state.vCod_Dist,
      Vubigeo: this.state.Vubigeo,
      Vcodigo_puntoentrega: this.state.Vcodigo_puntoentrega,
      vConcatenarpuntoentrega: this.state.vPuntoEntregaTexto || this.buildConcatenarPuntoEntrega(),
      vRecibeNuevo: recibeNuevo,
      vConcatenarnumrecibe: this.state.vConcatenarnumrecibe || this.buildConcatenarNumRecibe(),
      vNumeroRecibe: this.state.vNumeroRecibe || this.numeroRecibeInput.value.trim(),
      vNombreRecibe: this.state.vNombreRecibe || this.nombreRecibeInput.value.trim(),
      vOrdinal_numrecibe: this.state.vOrdinal_numrecibe,
      vTipo_documento_pago: this.state.vTipo_documento_pago,
      vNumero_documento_pago: this.state.vNumero_documento_pago,
      vCuentaBancaria: this.state.vCuentaBancaria,
      vPagos: this.state.vPagos,
      vCodigo_base: this.state.vCodigo_base
    };

    return payload;
  }

  clearInvalid(input) {
    input.classList.remove('is-invalid');
  }
}

const translations = {
  es: {
    tag: 'IaaS + PaaS Global',
    title: 'Pedidos',
    subtitle: 'Wizard multi-paso para crear pedidos, facturas y entregas con trazabilidad total.',
    status: 'Estado del flujo',
    statusHint: 'Completa el pedido para continuar.',
    steps: '7 pasos',
    step1Title: '1. Crear Pedido',
    step1Subtitle: 'Registra cliente, fecha y detalle del pedido.',
    required: 'Campos obligatorios marcados',
    fechaPedido: 'Fecha pedido',
    horaPedido: 'Hora pedido',
    cliente: 'Cliente',
    detallePedido: 'Detalle del pedido',
    producto: 'Producto',
    cantidad: 'Cantidad',
    precioTotal: 'Precio total',
    agregarLinea: 'Agregar linea',
    step2Title: '2. Crear Factura',
    step2Subtitle: 'Ajusta cantidades a facturar y verifica totales.',
    auto: 'Generado automaticamente',
    fechaEmision: 'Fecha emision',
    horaEmision: 'Hora emision',
    tipoDoc: 'Tipo documento',
    numeroDoc: 'Numero documento',
    cantidadFactura: 'Cantidad factura',
    saldoFactura: 'Saldo factura',
    step3Title: '3. Datos Entrega',
    step3Subtitle: 'Selecciona un punto existente o registra uno nuevo.',
    entrega: 'Entrega',
    existe: 'Existe',
    nuevo: 'Nuevo',
    puntoEntrega: 'Punto de entrega',
    departamento: 'Departamento',
    provincia: 'Provincia',
    distrito: 'Distrito',
    direccion: 'Direccion',
    referencia: 'Referencia',
    nombre: 'Nombre',
    dni: 'DNI',
    agencia: 'Agencia',
    observaciones: 'Observaciones',
    step4Title: '4. Datos Recibe (solo LIMA)',
    step4Subtitle: 'Define quien recibe en Lima Metropolitana.',
    recibe: 'Recibe',
    numero: 'Numero',
    step5Title: '5. Registro de Pago (Recibo)',
    step5Subtitle: 'Registra pagos parciales o deja pendiente.',
    cuenta: 'Cuenta bancaria',
    montoPendiente: 'Monto pendiente',
    montoPago: 'Monto pago',
    agregarPago: 'Agregar pago',
    pagoHint: 'Puedes dejar el monto en 0 si no deseas registrar pago.',
    monto: 'Monto',
    step6Title: '6. Asignar Base',
    step6Subtitle: 'Define la base operativa y prepara el JSON del detalle.',
    base: 'Base',
    jsonDetalle: 'JSON detalle',
    step7Title: '7. Resumen y Emitir Factura',
    step7Subtitle: 'Confirma la operacion y emite la factura.',
    resumen: 'Resumen',
    resumenPedido: 'Pedido',
    resumenFactura: 'Factura',
    resumenEntrega: 'Entrega',
    resumenRecibe: 'Recibe',
    confirm: 'Confirmo la operacion.',
    emitir: 'Emitir Factura',
    prev: 'Anterior',
    next: 'Siguiente',
    finish: 'Finalizar',
    remove: 'Eliminar',
    region: 'Region',
    banco: 'Banco',
    numeroCliente: 'Numero cliente',
    codigoPedido: 'Codigo pedido',
    tipoPunto: 'Punto',
    tipoRecibe: 'Recibe',
    existente: 'EXISTENTE',
    noAplica: 'No aplica',
    loading: 'Cargando datos...',
    emitiendo: 'Emitendo factura...',
    success: 'Factura emitida correctamente.',
    errors: {
      general: 'Ocurrio un error inesperado.',
      cliente: 'Selecciona un cliente valido.',
      detallePedido: 'Agrega al menos una linea de pedido.',
      producto: 'Selecciona un producto valido.',
      cantidad: 'Cantidad invalida. Use hasta 2 decimales.',
      precio: 'Precio invalido. Use hasta 2 decimales.',
      cantidadFactura: 'Cantidad de factura invalida.',
      cantidadFacturaExcede: 'La cantidad de factura excede el pedido.',
      puntoEntrega: 'Selecciona un punto de entrega.',
      ubigeo: 'Selecciona departamento, provincia y distrito.',
      direccion: 'Direccion requerida para Lima.',
      nombre: 'Nombre invalido.',
      dni: 'DNI invalido.',
      recibe: 'Selecciona un registro de recibe.',
      recibeNuevo: 'Completa numero y nombre de recibe.',
      pago: 'Completa cuenta y monto valido.',
      pagoFormato: 'Monto invalido.',
      pagoVacio: 'El monto debe ser mayor a 0.',
      pagoMayor: 'El pago no puede superar el pendiente.',
      cuenta: 'Selecciona una cuenta bancaria.',
      base: 'Selecciona una base.',
      confirm: 'Debes confirmar la operacion.'
    }
  },
  en: {
    tag: 'Global IaaS + PaaS',
    title: 'Orders',
    subtitle: 'Multi-step wizard to create orders, invoices, and deliveries with full traceability.',
    status: 'Flow status',
    statusHint: 'Complete the order to continue.',
    steps: '7 steps',
    step1Title: '1. Create Order',
    step1Subtitle: 'Capture client, date, and order details.',
    required: 'Required fields marked',
    fechaPedido: 'Order date',
    horaPedido: 'Order time',
    cliente: 'Client',
    detallePedido: 'Order detail',
    producto: 'Product',
    cantidad: 'Quantity',
    precioTotal: 'Total price',
    agregarLinea: 'Add line',
    step2Title: '2. Create Invoice',
    step2Subtitle: 'Adjust quantities and verify totals.',
    auto: 'Auto generated',
    fechaEmision: 'Issue date',
    horaEmision: 'Issue time',
    tipoDoc: 'Document type',
    numeroDoc: 'Document number',
    cantidadFactura: 'Invoice quantity',
    saldoFactura: 'Invoice balance',
    step3Title: '3. Delivery Data',
    step3Subtitle: 'Select an existing delivery point or register a new one.',
    entrega: 'Delivery',
    existe: 'Existing',
    nuevo: 'New',
    puntoEntrega: 'Delivery point',
    departamento: 'Department',
    provincia: 'Province',
    distrito: 'District',
    direccion: 'Address',
    referencia: 'Reference',
    nombre: 'Name',
    dni: 'ID',
    agencia: 'Agency',
    observaciones: 'Notes',
    step4Title: '4. Receiver (LIMA only)',
    step4Subtitle: 'Define who receives in Lima.',
    recibe: 'Receiver',
    numero: 'Number',
    step5Title: '5. Payment Receipt',
    step5Subtitle: 'Register partial payments or leave pending.',
    cuenta: 'Bank account',
    montoPendiente: 'Pending amount',
    montoPago: 'Payment amount',
    agregarPago: 'Add payment',
    pagoHint: 'Set to 0 if you do not want to register a payment.',
    monto: 'Amount',
    step6Title: '6. Assign Base',
    step6Subtitle: 'Define the operational base and JSON detail.',
    base: 'Base',
    jsonDetalle: 'JSON detail',
    step7Title: '7. Summary and Issue Invoice',
    step7Subtitle: 'Confirm the operation and issue the invoice.',
    resumen: 'Summary',
    resumenPedido: 'Order',
    resumenFactura: 'Invoice',
    resumenEntrega: 'Delivery',
    resumenRecibe: 'Receiver',
    confirm: 'I confirm the operation.',
    emitir: 'Issue Invoice',
    prev: 'Previous',
    next: 'Next',
    finish: 'Finish',
    remove: 'Remove',
    region: 'Region',
    banco: 'Bank',
    numeroCliente: 'Client number',
    codigoPedido: 'Order code',
    tipoPunto: 'Delivery point',
    tipoRecibe: 'Receiver',
    existente: 'EXISTING',
    noAplica: 'Not applicable',
    loading: 'Loading data...',
    emitiendo: 'Issuing invoice...',
    success: 'Invoice issued successfully.',
    errors: {
      general: 'Unexpected error occurred.',
      cliente: 'Select a valid client.',
      detallePedido: 'Add at least one order line.',
      producto: 'Select a valid product.',
      cantidad: 'Invalid quantity. Use up to 2 decimals.',
      precio: 'Invalid price. Use up to 2 decimals.',
      cantidadFactura: 'Invalid invoice quantity.',
      cantidadFacturaExcede: 'Invoice quantity exceeds the order.',
      puntoEntrega: 'Select a delivery point.',
      ubigeo: 'Select department, province, and district.',
      direccion: 'Address required for Lima.',
      nombre: 'Invalid name.',
      dni: 'Invalid ID.',
      recibe: 'Select a receiver entry.',
      recibeNuevo: 'Complete receiver number and name.',
      pago: 'Provide a valid account and amount.',
      pagoFormato: 'Invalid amount format.',
      pagoVacio: 'Amount must be greater than 0.',
      pagoMayor: 'Payment cannot exceed pending amount.',
      cuenta: 'Select a bank account.',
      base: 'Select a base.',
      confirm: 'You must confirm the operation.'
    }
  }
};

new FormWizard();
