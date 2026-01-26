class FormWizard {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 5;
    this.locale = 'es';
    this.state = {
      fechaPedido: '',
      horaPedido: '',
      codigoPedido: '',
      fechaP: '',
      cliente: '',
      clientes: [],
      productos: [],
      bases: [],
      productosPedido: [],
      factura: {
        tipoDocumento: 'FAC',
        numeroDocumento: '',
        codigoBase: '',
        detalle: [],
        saldo: 0
      },
      entrega: {
        modo: 'existe',
        puntosEntrega: [],
        puntoSeleccionado: null,
        region: 'PROV',
        ubigeo: { dep: '', prov: '', dist: '' },
        direccion: '',
        referencia: '',
        nombre: '',
        dni: '',
        agencia: '',
        observaciones: ''
      },
      recibe: {
        modo: 'existe',
        lista: [],
        seleccionado: null,
        numero: '',
        nombre: ''
      }
    };

    this.progressEl = document.getElementById('wizardProgress');
    this.stepEls = document.querySelectorAll('.wizard-step');
    this.stepBadges = document.querySelectorAll('.step-badge');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.submitBtn = document.getElementById('submitBtn');
    this.errorAlert = document.getElementById('errorAlert');
    this.successAlert = document.getElementById('successAlert');

    this.fechaPedidoInput = document.getElementById('fechaPedido');
    this.horaPedidoInput = document.getElementById('horaPedido');
    this.codigoPedidoInput = document.getElementById('codigoPedido');
    this.clienteSelect = document.getElementById('clienteSelect');
    this.addPedidoLineBtn = document.getElementById('addPedidoLine');
    this.pedidoTableBody = document.querySelector('#pedidoTable tbody');

    this.fechaEmisionInput = document.getElementById('fechaEmision');
    this.horaEmisionInput = document.getElementById('horaEmision');
    this.tipoDocumentoInput = document.getElementById('tipoDocumento');
    this.numeroDocumentoInput = document.getElementById('numeroDocumento');
    this.baseSelect = document.getElementById('baseSelect');
    this.facturaTableBody = document.querySelector('#facturaTable tbody');
    this.saldoFacturaEl = document.getElementById('saldoFactura');

    this.entregaExisteRadio = document.getElementById('entregaExiste');
    this.entregaNuevoRadio = document.getElementById('entregaNuevo');
    this.entregaExisteGroup = document.getElementById('entregaExisteGroup');
    this.entregaNuevoGroup = document.getElementById('entregaNuevoGroup');
    this.puntoEntregaSelect = document.getElementById('puntoEntregaSelect');
    this.depSelect = document.getElementById('depSelect');
    this.provSelect = document.getElementById('provSelect');
    this.distSelect = document.getElementById('distSelect');
    this.limaFields = document.getElementById('limaFields');
    this.provFields = document.getElementById('provFields');
    this.regionEntregaInput = document.getElementById('regionEntrega');
    this.direccionLineaInput = document.getElementById('direccionLinea');
    this.referenciaInput = document.getElementById('referencia');
    this.entregaNombreInput = document.getElementById('entregaNombre');
    this.entregaDniInput = document.getElementById('entregaDni');
    this.agenciaInput = document.getElementById('agencia');
    this.observacionesInput = document.getElementById('observaciones');

    this.recibeExisteRadio = document.getElementById('recibeExiste');
    this.recibeNuevoRadio = document.getElementById('recibeNuevo');
    this.recibeExisteGroup = document.getElementById('recibeExisteGroup');
    this.recibeNuevoGroup = document.getElementById('recibeNuevoGroup');
    this.recibeSelect = document.getElementById('recibeSelect');
    this.numeroRecibeInput = document.getElementById('numeroRecibe');
    this.nombreRecibeInput = document.getElementById('nombreRecibe');

    this.summaryCliente = document.getElementById('summaryCliente');
    this.summaryFecha = document.getElementById('summaryFecha');
    this.summaryCodigo = document.getElementById('summaryCodigo');
    this.summaryNumero = document.getElementById('summaryNumero');
    this.summarySaldo = document.getElementById('summarySaldo');
    this.summaryBase = document.getElementById('summaryBase');
    this.summaryTipoEntrega = document.getElementById('summaryTipoEntrega');
    this.summaryPuntoEntrega = document.getElementById('summaryPuntoEntrega');
    this.summaryTipoRecibe = document.getElementById('summaryTipoRecibe');
    this.summaryRecibeDato = document.getElementById('summaryRecibeDato');
    this.confirmCheck = document.getElementById('confirmCheck');

    this.init();
  }

  init() {
    this.applyTranslations();
    this.bindEvents();
    this.updateStep();
    this.loadInitialData();
  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.goStep(this.getPrevStep()));
    this.nextBtn.addEventListener('click', () => this.handleNext());
    document.getElementById('wizardForm').addEventListener('submit', (event) => this.handleSubmit(event));

    this.addPedidoLineBtn.addEventListener('click', () => this.addPedidoLine());
    this.clienteSelect.addEventListener('change', () => this.handleClienteChange());
    this.baseSelect.addEventListener('change', () => this.baseSelect.classList.remove('is-invalid'));

    this.entregaExisteRadio.addEventListener('change', () => this.toggleEntregaMode());
    this.entregaNuevoRadio.addEventListener('change', () => this.toggleEntregaMode());
    this.puntoEntregaSelect.addEventListener('change', () => this.syncEntregaExistente());

    this.depSelect.addEventListener('change', () => this.handleDepChange());
    this.provSelect.addEventListener('change', () => this.handleProvChange());
    this.distSelect.addEventListener('change', () => {
      this.distSelect.classList.remove('is-invalid');
      this.updateRegion();
    });

    this.recibeExisteRadio.addEventListener('change', () => this.toggleRecibeMode());
    this.recibeNuevoRadio.addEventListener('change', () => this.toggleRecibeMode());
    this.recibeSelect.addEventListener('change', () => this.syncRecibeExistente());
  }

  async loadInitialData() {
    this.clearAlerts();
    try {
      const [now, clientes, productos, bases, codigoPedido, numeroDocumento, departamentos] = await Promise.all([
        this.fetchJson('/api/now'),
        this.fetchJson('/api/clientes'),
        this.fetchJson('/api/productos'),
        this.fetchJson('/api/bases'),
        this.fetchJson('/api/next/codigo-pedido'),
        this.fetchJson('/api/next/numero-documento?tipo=FAC'),
        this.fetchJson('/api/ubigeo/departamentos')
      ]);

      this.state.fechaPedido = now.fecha || '';
      this.state.horaPedido = now.hora || '';
      this.state.codigoPedido = String(codigoPedido.next || '');
      this.state.factura.numeroDocumento = String(numeroDocumento.next || '');
      this.state.clientes = Array.isArray(clientes) ? clientes : [];
      this.state.productos = Array.isArray(productos) ? productos : [];
      this.state.bases = Array.isArray(bases) ? bases : [];

      this.fechaPedidoInput.value = this.state.fechaPedido;
      this.horaPedidoInput.value = this.state.horaPedido;
      this.codigoPedidoInput.value = this.state.codigoPedido;
      this.fechaEmisionInput.value = this.state.fechaPedido;
      this.horaEmisionInput.value = this.state.horaPedido;
      this.tipoDocumentoInput.value = this.state.factura.tipoDocumento;
      this.numeroDocumentoInput.value = this.state.factura.numeroDocumento;

      this.renderClientes();
      this.renderBases();
      this.renderDepartamentos(departamentos);

      if (this.state.productos.length > 0) {
        this.addPedidoLine();
      }
    } catch (error) {
      this.showError(error.message || this.t('errorCarga'));
    }
  }

  async handleClienteChange() {
    this.state.cliente = this.clienteSelect.value;
    this.clienteSelect.classList.remove('is-invalid');
    if (!this.state.cliente) return;

    try {
      const [puntosEntrega, numrecibe] = await Promise.all([
        this.fetchJson(`/api/puntos-entrega?cliente=${encodeURIComponent(this.state.cliente)}`),
        this.fetchJson(`/api/numrecibe?cliente=${encodeURIComponent(this.state.cliente)}`)
      ]);
      this.state.entrega.puntosEntrega = Array.isArray(puntosEntrega) ? puntosEntrega : [];
      this.state.recibe.lista = Array.isArray(numrecibe) ? numrecibe : [];
      this.renderPuntosEntrega();
      this.renderNumRecibe();
    } catch (error) {
      this.showError(error.message || this.t('errorCarga'));
    }
  }

  renderClientes() {
    const placeholder = `<option value="">${this.t('seleccione')}</option>`;
    const options = this.state.clientes.map((row) => {
      const codigo = row.codigo_cliente || row.Vcodigo_cliente || row.vcodigo_cliente || row.codigo || '';
      const nombre = row.nombre_cliente || row.Vnombre_cliente || row.vnombre_cliente || row.nombre || '';
      return `<option value="${codigo}">${codigo} - ${nombre}</option>`;
    });
    this.clienteSelect.innerHTML = [placeholder, ...options].join('');
  }

  renderBases() {
    const placeholder = `<option value="">${this.t('seleccione')}</option>`;
    const options = this.state.bases.map((row) => {
      const codigo = row.codigo_base || row.Vcodigo_base || row.vcodigo_base || row.codigo || '';
      const nombre = row.descripcion || row.descripcion_base || row.vdescripcion || row.nombre || '';
      return `<option value="${codigo}">${codigo} - ${nombre}</option>`;
    });
    this.baseSelect.innerHTML = [placeholder, ...options].join('');
  }

  renderDepartamentos(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const placeholder = `<option value="">${this.t('seleccione')}</option>`;
    const options = list.map((row) => {
      const codigo = row.codigo_departamento || row.codigo || row.vcodigo || '';
      const nombre = row.nombre_departamento || row.nombre || row.vnombre || '';
      return `<option value="${codigo}">${codigo} - ${nombre}</option>`;
    });
    this.depSelect.innerHTML = [placeholder, ...options].join('');
  }

  renderProvincias(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const placeholder = `<option value="">${this.t('seleccione')}</option>`;
    const options = list.map((row) => {
      const codigo = row.codigo_provincia || row.codigo || row.vcodigo || '';
      const nombre = row.nombre_provincia || row.nombre || row.vnombre || '';
      return `<option value="${codigo}">${codigo} - ${nombre}</option>`;
    });
    this.provSelect.innerHTML = [placeholder, ...options].join('');
  }

  renderDistritos(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const placeholder = `<option value="">${this.t('seleccione')}</option>`;
    const options = list.map((row) => {
      const codigo = row.codigo_distrito || row.codigo || row.vcodigo || '';
      const nombre = row.nombre_distrito || row.nombre || row.vnombre || '';
      return `<option value="${codigo}">${codigo} - ${nombre}</option>`;
    });
    this.distSelect.innerHTML = [placeholder, ...options].join('');
  }

  renderPuntosEntrega() {
    const placeholder = `<option value="">${this.t('seleccione')}</option>`;
    const options = this.state.entrega.puntosEntrega.map((row, index) => {
      const codigo = row.codigo_puntoentrega || row.Vcodigo_puntoentrega || row.vcodigo_puntoentrega || row.codigo || index;
      const texto = row.concatenarpuntoentrega || row.Vconcatenarpuntoentrega || row.vconcatenarpuntoentrega || '';
      return `<option value="${codigo}">${texto}</option>`;
    });
    this.puntoEntregaSelect.innerHTML = [placeholder, ...options].join('');

    if (options.length === 0) {
      this.entregaExisteRadio.disabled = true;
      this.entregaNuevoRadio.checked = true;
      this.toggleEntregaMode();
    } else {
      this.entregaExisteRadio.disabled = false;
    }
  }

  renderNumRecibe() {
    const placeholder = `<option value="">${this.t('seleccione')}</option>`;
    const options = this.state.recibe.lista.map((row, index) => {
      const codigo = row.ordinal_numrecibe || row.Vordinal_numrecibe || row.vordinal_numrecibe || row.codigo_numrecibe || row.Vcodigo_numrecibe || row.vcodigo_numrecibe || row.codigo || index;
      const texto = row.concatenarnumrecibe || row.Vconcatenarnumrecibe || row.vconcatenarnumrecibe || '';
      return `<option value="${codigo}">${texto}</option>`;
    });
    this.recibeSelect.innerHTML = [placeholder, ...options].join('');

    if (options.length === 0) {
      this.recibeExisteRadio.disabled = true;
      this.recibeNuevoRadio.checked = true;
      this.toggleRecibeMode();
    } else {
      this.recibeExisteRadio.disabled = false;
    }
  }

  addPedidoLine() {
    const products = this.state.productos;
    if (!products.length) {
      this.showError(this.t('errorProductos'));
      return;
    }

    this.state.productosPedido.push({
      id: `p-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      producto: products[0].codigo_producto || products[0].Vcodigo_producto || products[0].vcodigo_producto || products[0].codigo || '',
      cantidad: '',
      precioTotal: ''
    });
    this.renderPedidoTable();
  }

  removePedidoLine(id) {
    this.state.productosPedido = this.state.productosPedido.filter((line) => line.id !== id);
    if (this.state.productosPedido.length === 0) {
      this.addPedidoLine();
      return;
    }
    this.renderPedidoTable();
  }

  renderPedidoTable() {
    if (!this.state.productosPedido.length) {
      this.pedidoTableBody.innerHTML = `<tr><td colspan="4">${this.t('sinLineas')}</td></tr>`;
      return;
    }

    const productOptions = this.state.productos
      .map((row) => {
        const codigo = row.codigo_producto || row.Vcodigo_producto || row.vcodigo_producto || row.codigo || '';
        const nombre = row.nombre_producto || row.Vnombre_producto || row.vnombre_producto || row.nombre || '';
        return `<option value="${codigo}">${codigo} - ${nombre}</option>`;
      })
      .join('');

    this.pedidoTableBody.innerHTML = this.state.productosPedido
      .map((line) => {
        return `
          <tr>
            <td>
              <select class="form-select form-select-sm" data-line="${line.id}" data-field="producto">
                ${productOptions}
              </select>
            </td>
            <td>
              <input type="text" class="form-control form-control-sm" data-line="${line.id}" data-field="cantidad" value="${line.cantidad}" />
            </td>
            <td>
              <input type="text" class="form-control form-control-sm" data-line="${line.id}" data-field="precioTotal" value="${line.precioTotal}" />
            </td>
            <td class="text-end">
              <button class="btn btn-sm btn-ghost" type="button" data-action="remove" data-line="${line.id}">${this.t('eliminar')}</button>
            </td>
          </tr>`;
      })
      .join('');

    this.pedidoTableBody.querySelectorAll('select').forEach((select) => {
      const line = this.findPedidoLine(select.dataset.line);
      if (line) select.value = line.producto;
      select.addEventListener('change', (event) => {
        const target = event.currentTarget;
        const lineItem = this.findPedidoLine(target.dataset.line);
        if (!lineItem) return;
        lineItem.producto = target.value;
      });
    });

    this.pedidoTableBody.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', (event) => {
        const target = event.currentTarget;
        const lineItem = this.findPedidoLine(target.dataset.line);
        if (!lineItem) return;
        lineItem[target.dataset.field] = target.value;
        target.classList.remove('is-invalid');
      });
    });

    this.pedidoTableBody.querySelectorAll('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener('click', () => this.removePedidoLine(btn.dataset.line));
    });
  }

  findPedidoLine(id) {
    return this.state.productosPedido.find((line) => line.id === id);
  }

  buildFacturaFromPedido() {
    this.state.factura.detalle = this.state.productosPedido.map((line) => {
      const cantidad = Number(line.cantidad || 0);
      const precioTotal = Number(line.precioTotal || 0);
      const precioUnitario = cantidad > 0 ? precioTotal / cantidad : 0;
      return {
        id: line.id,
        producto: line.producto,
        cantidad: line.cantidad,
        maxCantidad: line.cantidad,
        precioUnitario,
        precioTotal: precioTotal
      };
    });
    this.renderFacturaTable();
  }

  renderFacturaTable() {
    if (!this.state.factura.detalle.length) {
      this.facturaTableBody.innerHTML = `<tr><td colspan="4">${this.t('sinLineas')}</td></tr>`;
      return;
    }

    const productName = (codigo) => {
      const row = this.state.productos.find((p) => {
        const id = p.codigo_producto || p.Vcodigo_producto || p.vcodigo_producto || p.codigo;
        return String(id) === String(codigo);
      });
      return row ? row.nombre_producto || row.Vnombre_producto || row.vnombre_producto || row.nombre || codigo : codigo;
    };

    this.facturaTableBody.innerHTML = this.state.factura.detalle
      .map((line) => {
        return `
          <tr>
            <td>${productName(line.producto)}</td>
            <td>
              <input type="text" class="form-control form-control-sm" data-line="${line.id}" data-field="cantidad" value="${line.cantidad}" />
            </td>
            <td>
              <input type="text" class="form-control form-control-sm" data-line="${line.id}" data-field="precioTotal" value="${Number(line.precioTotal).toFixed(2)}" readonly />
            </td>
            <td class="text-end">
              <button class="btn btn-sm btn-ghost" type="button" data-action="remove" data-line="${line.id}" ${this.state.factura.detalle.length > 1 ? '' : 'disabled'}>${this.t('eliminar')}</button>
            </td>
          </tr>`;
      })
      .join('');

    this.facturaTableBody.querySelectorAll('input[data-field="cantidad"]').forEach((input) => {
      input.addEventListener('input', (event) => {
        const target = event.currentTarget;
        const lineItem = this.state.factura.detalle.find((line) => line.id === target.dataset.line);
        if (!lineItem) return;
        lineItem.cantidad = target.value;
        target.classList.remove('is-invalid');
        this.recalculateFacturaLine(lineItem);
        this.updateSaldo();
      });
    });

    this.facturaTableBody.querySelectorAll('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener('click', () => this.removeFacturaLine(btn.dataset.line));
    });

    this.updateSaldo();
  }

  recalculateFacturaLine(line) {
    const qty = Number(line.cantidad || 0);
    line.precioTotal = line.precioUnitario * qty;
    const priceInput = this.facturaTableBody.querySelector(`input[data-line="${line.id}"][data-field="precioTotal"]`);
    if (priceInput) {
      priceInput.value = Number(line.precioTotal || 0).toFixed(2);
    }
  }

  removeFacturaLine(id) {
    if (this.state.factura.detalle.length <= 1) return;
    this.state.factura.detalle = this.state.factura.detalle.filter((line) => line.id !== id);
    this.renderFacturaTable();
  }

  updateSaldo() {
    const total = this.state.factura.detalle.reduce((sum, line) => sum + Number(line.precioTotal || 0), 0);
    this.state.factura.saldo = total;
    this.saldoFacturaEl.textContent = total.toFixed(2);
  }

  toggleEntregaMode() {
    const modo = this.entregaNuevoRadio.checked ? 'nuevo' : 'existe';
    this.state.entrega.modo = modo;
    this.entregaExisteGroup.classList.toggle('d-none', modo !== 'existe');
    this.entregaNuevoGroup.classList.toggle('d-none', modo !== 'nuevo');
  }

  toggleRecibeMode() {
    const modo = this.recibeNuevoRadio.checked ? 'nuevo' : 'existe';
    this.state.recibe.modo = modo;
    this.recibeExisteGroup.classList.toggle('d-none', modo !== 'existe');
    this.recibeNuevoGroup.classList.toggle('d-none', modo !== 'nuevo');
  }

  async handleDepChange() {
    this.depSelect.classList.remove('is-invalid');
    const dep = this.depSelect.value;
    this.state.entrega.ubigeo.dep = dep;
    if (!dep) return;
    try {
      const provincias = await this.fetchJson(`/api/ubigeo/provincias?dep=${encodeURIComponent(dep)}`);
      this.renderProvincias(provincias);
      this.distSelect.innerHTML = `<option value="">${this.t('seleccione')}</option>`;
    } catch (error) {
      this.showError(error.message || this.t('errorCarga'));
    }
  }

  async handleProvChange() {
    this.provSelect.classList.remove('is-invalid');
    const dep = this.depSelect.value;
    const prov = this.provSelect.value;
    this.state.entrega.ubigeo.prov = prov;
    if (!dep || !prov) return;
    try {
      const distritos = await this.fetchJson(`/api/ubigeo/distritos?dep=${encodeURIComponent(dep)}&prov=${encodeURIComponent(prov)}`);
      this.renderDistritos(distritos);
    } catch (error) {
      this.showError(error.message || this.t('errorCarga'));
    }
    this.updateRegion();
  }

  updateRegion() {
    this.state.entrega.ubigeo.dist = this.distSelect.value;
    const dep = this.depSelect.value;
    const prov = this.provSelect.value;
    const isLima = dep === '15' && prov === '01';
    this.state.entrega.region = isLima ? 'LIMA' : 'PROV';
    this.limaFields.classList.toggle('d-none', !isLima);
    this.provFields.classList.toggle('d-none', isLima);
    this.regionEntregaInput.value = this.state.entrega.region;
    this.updateStep();
  }

  syncEntregaExistente() {
    this.puntoEntregaSelect.classList.remove('is-invalid');
    const codigo = this.puntoEntregaSelect.value;
    const row = this.state.entrega.puntosEntrega.find((item) => {
      const id = item.codigo_puntoentrega || item.Vcodigo_puntoentrega || item.vcodigo_puntoentrega || item.codigo;
      return String(id) === String(codigo);
    });
    this.state.entrega.puntoSeleccionado = row || null;
    if (row) {
      const region = row.region_entrega || row.Vregion_entrega || row.vregion_entrega || 'PROV';
      this.state.entrega.region = region;
    }
    this.updateStep();
  }

  syncRecibeExistente() {
    this.recibeSelect.classList.remove('is-invalid');
    const codigo = this.recibeSelect.value;
    const row = this.state.recibe.lista.find((item) => {
      const id = item.ordinal_numrecibe || item.Vordinal_numrecibe || item.vordinal_numrecibe || item.codigo_numrecibe || item.Vcodigo_numrecibe || item.vcodigo_numrecibe || item.codigo;
      return String(id) === String(codigo);
    });
    this.state.recibe.seleccionado = row || null;
  }

  getVisibleSteps() {
    const includeRecibe = this.state.entrega.region === 'LIMA';
    return includeRecibe ? [0, 1, 2, 3, 4] : [0, 1, 2, 4];
  }

  getNextStep() {
    const steps = this.getVisibleSteps();
    const index = steps.indexOf(this.currentStep);
    return steps[Math.min(index + 1, steps.length - 1)];
  }

  getPrevStep() {
    const steps = this.getVisibleSteps();
    const index = steps.indexOf(this.currentStep);
    return steps[Math.max(index - 1, 0)];
  }

  goStep(step) {
    const steps = this.getVisibleSteps();
    if (!steps.includes(step)) {
      this.currentStep = steps[steps.length - 1];
    } else {
      this.currentStep = step;
    }
    this.updateStep();
  }

  updateStep() {
    const steps = this.getVisibleSteps();
    const currentIndex = steps.indexOf(this.currentStep);

    this.stepEls.forEach((el) => el.classList.add('d-none'));
    const currentSection = this.stepEls[this.currentStep];
    if (currentSection) currentSection.classList.remove('d-none');

    this.stepBadges.forEach((badge) => {
      const stepIndex = Number(badge.dataset.step);
      badge.classList.toggle('d-none', !steps.includes(stepIndex));
      badge.classList.toggle('active', steps.includes(stepIndex) && steps.indexOf(stepIndex) <= currentIndex);
    });

    const progress = ((currentIndex + 1) / steps.length) * 100;
    this.progressEl.style.width = `${progress}%`;

    this.prevBtn.disabled = currentIndex === 0;
    const isLast = currentIndex === steps.length - 1;
    this.nextBtn.classList.toggle('d-none', isLast);
    this.submitBtn.classList.toggle('d-none', !isLast);

    if (this.currentStep === 4) {
      this.buildSummary();
    }
  }

  handleNext() {
    this.clearAlerts();
    if (this.currentStep === 0) {
      if (!this.validateStep1()) return;
      this.buildFacturaFromPedido();
      this.goStep(this.getNextStep());
      return;
    }
    if (this.currentStep === 1) {
      if (!this.validateStep2()) return;
      this.goStep(this.getNextStep());
      return;
    }
    if (this.currentStep === 2) {
      if (!this.validateStep3()) return;
      if (this.state.entrega.region !== 'LIMA') {
        this.goStep(4);
      } else {
        this.goStep(this.getNextStep());
      }
      return;
    }
    if (this.currentStep === 3) {
      if (!this.validateStep4()) return;
      this.goStep(this.getNextStep());
      return;
    }
    this.goStep(this.getNextStep());
  }

  validateStep1() {
    let valid = true;
    const quantityRegex = /^\d+$/;
    const moneyRegex = /^\d+(?:\.\d{1,2})?$/;

    if (!this.clienteSelect.value) {
      this.clienteSelect.classList.add('is-invalid');
      valid = false;
    }

    this.state.productosPedido.forEach((line) => {
      const qtyInput = this.pedidoTableBody.querySelector(`input[data-line="${line.id}"][data-field="cantidad"]`);
      const priceInput = this.pedidoTableBody.querySelector(`input[data-line="${line.id}"][data-field="precioTotal"]`);

      if (!quantityRegex.test(String(line.cantidad).trim()) || Number(line.cantidad) <= 0) {
        qtyInput.classList.add('is-invalid');
        valid = false;
      }
      if (!moneyRegex.test(String(line.precioTotal).trim()) || Number(line.precioTotal) <= 0) {
        priceInput.classList.add('is-invalid');
        valid = false;
      }
    });

    if (!valid) {
      this.showError(this.t('errorStep1'));
    }
    return valid;
  }

  validateStep2() {
    let valid = true;
    const quantityRegex = /^\d+$/;

    if (!this.baseSelect.value) {
      this.baseSelect.classList.add('is-invalid');
      valid = false;
    }

    this.state.factura.detalle.forEach((line) => {
      const input = this.facturaTableBody.querySelector(`input[data-line="${line.id}"]`);
      if (!quantityRegex.test(String(line.cantidad).trim()) || Number(line.cantidad) <= 0) {
        input.classList.add('is-invalid');
        valid = false;
        return;
      }
      if (Number(line.cantidad) > Number(line.maxCantidad)) {
        input.classList.add('is-invalid');
        valid = false;
      }
      this.recalculateFacturaLine(line);
    });

    this.updateSaldo();

    if (!valid) {
      this.showError(this.t('errorStep2'));
    }
    return valid;
  }

  validateStep3() {
    let valid = true;
    const nameRegex = /^[a-zA-ZÀ-ÿ\s.'-]{3,80}$/;
    const dniRegex = /^\d{6,12}$/;
    const addressRegex = /^[a-zA-Z0-9À-ÿ\s.,#/-]{4,120}$/;

    if (this.state.entrega.modo === 'existe') {
      if (!this.puntoEntregaSelect.value) {
        this.puntoEntregaSelect.classList.add('is-invalid');
        valid = false;
      }
    } else {
      if (!this.depSelect.value) {
        this.depSelect.classList.add('is-invalid');
        valid = false;
      }
      if (!this.provSelect.value) {
        this.provSelect.classList.add('is-invalid');
        valid = false;
      }
      if (!this.distSelect.value) {
        this.distSelect.classList.add('is-invalid');
        valid = false;
      }
      this.updateRegion();

      if (this.state.entrega.region === 'LIMA') {
        if (!addressRegex.test(this.direccionLineaInput.value.trim())) {
          this.direccionLineaInput.classList.add('is-invalid');
          valid = false;
        }
      } else {
        if (!nameRegex.test(this.entregaNombreInput.value.trim())) {
          this.entregaNombreInput.classList.add('is-invalid');
          valid = false;
        }
        if (!dniRegex.test(this.entregaDniInput.value.trim())) {
          this.entregaDniInput.classList.add('is-invalid');
          valid = false;
        }
      }
    }

    if (!valid) {
      this.showError(this.t('errorStep3'));
    }
    return valid;
  }

  validateStep4() {
    if (this.state.entrega.region !== 'LIMA') {
      return true;
    }
    let valid = true;
    const nameRegex = /^[a-zA-ZÀ-ÿ\s.'-]{3,80}$/;
    const numberRegex = /^\d{3,20}$/;

    if (this.state.recibe.modo === 'existe') {
      if (!this.recibeSelect.value) {
        this.recibeSelect.classList.add('is-invalid');
        valid = false;
      }
    } else {
      if (!numberRegex.test(this.numeroRecibeInput.value.trim())) {
        this.numeroRecibeInput.classList.add('is-invalid');
        valid = false;
      }
      if (!nameRegex.test(this.nombreRecibeInput.value.trim())) {
        this.nombreRecibeInput.classList.add('is-invalid');
        valid = false;
      }
    }

    if (!valid) {
      this.showError(this.t('errorStep4'));
    }
    return valid;
  }

  buildSummary() {
    const clienteRow = this.state.clientes.find((row) => {
      const codigo = row.codigo_cliente || row.Vcodigo_cliente || row.vcodigo_cliente || row.codigo || '';
      return String(codigo) === String(this.state.cliente);
    });
    const clienteNombre = clienteRow ? clienteRow.nombre_cliente || rowName(clienteRow) : '';

    this.summaryCliente.textContent = `${this.state.cliente} ${clienteNombre ? `- ${clienteNombre}` : ''}`.trim();
    this.summaryFecha.textContent = `${this.state.fechaPedido} ${this.state.horaPedido}`.trim();
    this.summaryCodigo.textContent = this.state.codigoPedido || '-';
    this.summaryNumero.textContent = this.state.factura.numeroDocumento || '-';
    this.summarySaldo.textContent = this.state.factura.saldo.toFixed(2);

    const baseRow = this.state.bases.find((row) => {
      const codigo = row.codigo_base || row.Vcodigo_base || row.vcodigo_base || row.codigo || '';
      return String(codigo) === String(this.baseSelect.value);
    });
    this.summaryBase.textContent = baseRow ? baseRow.codigo_base || baseRow.Vcodigo_base || baseRow.vcodigo_base || baseRow.codigo || '-' : '-';

    if (this.state.entrega.modo === 'existe') {
      const row = this.state.entrega.puntoSeleccionado;
      const texto = row ? row.concatenarpuntoentrega || row.Vconcatenarpuntoentrega || row.vconcatenarpuntoentrega || '' : '-';
      this.summaryTipoEntrega.textContent = this.t('existente');
      this.summaryPuntoEntrega.textContent = texto;
    } else {
      const concat = this.buildConcatenarPuntoEntrega();
      this.summaryTipoEntrega.textContent = this.t('nuevo');
      this.summaryPuntoEntrega.textContent = concat;
    }

    if (this.state.entrega.region !== 'LIMA') {
      this.summaryTipoRecibe.textContent = this.t('noAplica');
      this.summaryRecibeDato.textContent = '-';
      return;
    }

    if (this.state.recibe.modo === 'existe') {
      const row = this.state.recibe.seleccionado;
      const texto = row ? row.concatenarnumrecibe || row.Vconcatenarnumrecibe || row.vconcatenarnumrecibe || '' : '-';
      this.summaryTipoRecibe.textContent = this.t('existente');
      this.summaryRecibeDato.textContent = texto;
    } else {
      const concat = this.buildConcatenarNumRecibe();
      this.summaryTipoRecibe.textContent = this.t('nuevo');
      this.summaryRecibeDato.textContent = concat;
    }

    function rowName(row) {
      return row.nombre_cliente || row.Vnombre_cliente || row.vnombre_cliente || row.nombre || '';
    }
  }

  buildConcatenarPuntoEntrega() {
    const region = this.state.entrega.region;
    if (region === 'LIMA') {
      const referencia = this.referenciaInput.value.trim();
      const base = `${this.direccionLineaInput.value.trim()} | ${this.distSelect.options[this.distSelect.selectedIndex]?.text || ''}`;
      if (referencia) return `${base} | ${referencia}`;
      return base;
    }
    const nombre = this.entregaNombreInput.value.trim();
    const dni = this.entregaDniInput.value.trim();
    const agencia = this.agenciaInput.value.trim();
    const obs = this.observacionesInput.value.trim();
    return [nombre, dni, agencia, obs].filter(Boolean).join(' | ');
  }

  buildConcatenarNumRecibe() {
    const numero = this.numeroRecibeInput.value.trim();
    const nombre = this.nombreRecibeInput.value.trim();
    return [numero, nombre].filter(Boolean).join(' | ');
  }

  async handleSubmit(event) {
    event.preventDefault();
    this.clearAlerts();
    if (!this.confirmCheck.checked) {
      this.confirmCheck.classList.add('is-invalid');
      this.showError(this.t('confirmError'));
      return;
    }
    this.confirmCheck.classList.remove('is-invalid');
    this.buildSummary();

    const payload = this.buildPayload();
    const spinner = this.submitBtn.querySelector('.spinner-border');
    spinner.classList.remove('d-none');
    this.submitBtn.disabled = true;

    try {
      const response = await fetch('/api/emitir-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: this.t('errorServidor') }));
        throw new Error(err.message || this.t('errorServidor'));
      }
      const result = await response.json();
      this.successAlert.textContent = result.message || this.t('success');
      this.successAlert.classList.remove('d-none');
      this.resetWizard();
    } catch (error) {
      this.showError(error.message || this.t('errorServidor'));
    } finally {
      spinner.classList.add('d-none');
      this.submitBtn.disabled = false;
    }
  }

  buildPayload() {
    const fechaP = `${this.state.fechaPedido} ${this.state.horaPedido}`.trim();
    const pedidoDetalle = this.state.productosPedido.map((line) => {
      const cantidad = Number(line.cantidad || 0);
      const precioTotal = Number(line.precioTotal || 0);
      return {
        codigo_producto: line.producto,
        cantidad,
        precio_total: precioTotal
      };
    });

    const facturaDetalle = this.state.factura.detalle.map((line) => {
      return {
        codigo_producto: line.producto,
        cantidad: Number(line.cantidad || 0),
        precio_total: Number(line.precioTotal || 0)
      };
    });

    const entregaPayload = {
      modo: this.state.entrega.modo,
      region_entrega: this.state.entrega.region,
      ubigeo: `${this.depSelect.value}${this.provSelect.value}${this.distSelect.value}`,
      direccion_linea: this.direccionLineaInput.value.trim(),
      referencia: this.referenciaInput.value.trim(),
      nombre: this.entregaNombreInput.value.trim(),
      dni: this.entregaDniInput.value.trim(),
      agencia: this.agenciaInput.value.trim(),
      observaciones: this.observacionesInput.value.trim(),
      concatenarpuntoentrega: this.buildConcatenarPuntoEntrega(),
      punto_existente: this.puntoEntregaSelect.value
    };

    const recibePayload = {
      modo: this.state.recibe.modo,
      numero: this.numeroRecibeInput.value.trim(),
      nombre: this.nombreRecibeInput.value.trim(),
      concatenarnumrecibe: this.buildConcatenarNumRecibe(),
      existe_id: this.recibeSelect.value
    };

    return {
      codigo_pedido: this.state.codigoPedido,
      codigo_cliente: this.clienteSelect.value,
      fecha_pedido: fechaP,
      pedido_detalle: pedidoDetalle,
      factura: {
        tipo_documento: 'FAC',
        numero_documento: this.state.factura.numeroDocumento,
        codigo_base: this.baseSelect.value,
        saldo: this.state.factura.saldo,
        fecha: fechaP,
        detalle: facturaDetalle
      },
      entrega: entregaPayload,
      recibe: recibePayload
    };
  }

  resetWizard() {
    this.state.productosPedido = [];
    this.state.factura.detalle = [];
    this.state.factura.saldo = 0;
    this.pedidoTableBody.innerHTML = '';
    this.facturaTableBody.innerHTML = '';
    this.saldoFacturaEl.textContent = '0.00';
    this.confirmCheck.checked = false;
    this.loadInitialData();
    this.goStep(0);
  }

  applyTranslations() {
    const lang = (navigator.language || 'es').toLowerCase();
    this.locale = lang.startsWith('en') ? 'en' : 'es';

    const dict = {
      es: {
        eyebrow: 'IaaS + PaaS Global Commerce',
        title: 'Registro de Pedidos',
        subtitle: 'Orquesta pedidos, facturas y entregas con precisión global.',
        status: 'Operativo',
        step1Title: '1. Crear Pedido',
        step2Title: '2. Crear Factura',
        step3Title: '3. Datos Entrega',
        step4Title: '4. Datos Recibe',
        step5Title: '5. Resumen y Emitir Factura',
        fechaPedido: 'Fecha pedido',
        horaPedido: 'Hora pedido',
        codigoPedido: 'Código pedido',
        cliente: 'Cliente',
        addLine: 'Agregar línea',
        colProducto: 'Producto',
        colCantidad: 'Cantidad',
        colPrecioTotal: 'Precio total',
        step1Help: 'Defina los productos y cantidades del pedido.',
        fechaEmision: 'Fecha emisión',
        horaEmision: 'Hora emisión',
        tipoDocumento: 'Tipo documento',
        numeroDocumento: 'Número documento',
        codigoBase: 'Código base',
        saldo: 'Saldo',
        step2Help: 'Edite cantidades y verifique el saldo de la factura.',
        existe: 'Existe',
        nuevo: 'Nuevo',
        puntoEntrega: 'Punto de entrega',
        departamento: 'Departamento',
        provincia: 'Provincia',
        distrito: 'Distrito',
        direccionLinea: 'Dirección',
        referencia: 'Referencia',
        regionEntrega: 'Región entrega',
        agencia: 'Agencia',
        nombre: 'Nombre',
        dni: 'DNI',
        observaciones: 'Observaciones',
        step3Help: 'Seleccione un punto existente o registre uno nuevo.',
        numRecibe: 'Número recibe',
        numeroRecibe: 'Número recibe',
        nombreRecibe: 'Nombre recibe',
        step4Help: 'Complete los datos de quien recibe en Lima.',
        summaryPedido: 'Pedido',
        summaryFactura: 'Factura',
        summaryEntrega: 'Entrega',
        summaryRecibe: 'Recibe',
        summaryCliente: 'Cliente',
        summaryFecha: 'Fecha',
        summaryCodigo: 'Código',
        summaryNumero: 'Número',
        summarySaldo: 'Saldo',
        summaryBase: 'Base',
        summaryTipoEntrega: 'Tipo',
        summaryPuntoEntrega: 'Punto',
        summaryTipoRecibe: 'Tipo',
        summaryRecibeDato: 'Datos',
        confirm: 'Confirmo que los datos están correctos para emitir.',
        prev: 'Anterior',
        next: 'Siguiente',
        submit: 'Emitir Factura',
        eliminar: 'Eliminar',
        seleccione: 'Seleccione',
        sinLineas: 'Sin líneas.',
        errorStep1: 'Complete cliente, cantidad y precio total del pedido.',
        errorStep2: 'Verifique cantidades y base antes de continuar.',
        errorStep3: 'Complete los datos de entrega requeridos.',
        errorStep4: 'Complete los datos de recibe requeridos.',
        confirmError: 'Debe confirmar antes de emitir.',
        clienteError: 'Seleccione un cliente válido.',
        baseError: 'Seleccione una base válida.',
        puntoEntregaError: 'Seleccione un punto de entrega.',
        departamentoError: 'Seleccione un departamento.',
        provinciaError: 'Seleccione una provincia.',
        distritoError: 'Seleccione un distrito.',
        direccionError: 'Ingrese una dirección válida.',
        nombreError: 'Ingrese un nombre válido.',
        dniError: 'Ingrese un DNI válido.',
        numeroRecibeError: 'Ingrese un número válido.',
        nombreRecibeError: 'Ingrese un nombre válido.',
        recibeError: 'Seleccione un recibe válido.',
        errorCarga: 'Error al cargar datos.',
        errorServidor: 'Error en el servidor.',
        errorProductos: 'No hay productos disponibles.',
        existente: 'Existente',
        noAplica: 'No aplica',
        success: 'Factura emitida correctamente.'
      },
      en: {
        eyebrow: 'IaaS + PaaS Global Commerce',
        title: 'Order Registration',
        subtitle: 'Orchestrate orders, invoices, and deliveries with global precision.',
        status: 'Operational',
        step1Title: '1. Create Order',
        step2Title: '2. Create Invoice',
        step3Title: '3. Delivery Data',
        step4Title: '4. Receiver Data',
        step5Title: '5. Summary and Issue Invoice',
        fechaPedido: 'Order date',
        horaPedido: 'Order time',
        codigoPedido: 'Order code',
        cliente: 'Client',
        addLine: 'Add line',
        colProducto: 'Product',
        colCantidad: 'Quantity',
        colPrecioTotal: 'Total price',
        step1Help: 'Define products and quantities for the order.',
        fechaEmision: 'Issue date',
        horaEmision: 'Issue time',
        tipoDocumento: 'Document type',
        numeroDocumento: 'Document number',
        codigoBase: 'Base code',
        saldo: 'Balance',
        step2Help: 'Edit quantities and review invoice balance.',
        existe: 'Existing',
        nuevo: 'New',
        puntoEntrega: 'Delivery point',
        departamento: 'Department',
        provincia: 'Province',
        distrito: 'District',
        direccionLinea: 'Address',
        referencia: 'Reference',
        regionEntrega: 'Delivery region',
        agencia: 'Agency',
        nombre: 'Name',
        dni: 'ID',
        observaciones: 'Notes',
        step3Help: 'Choose an existing point or register a new one.',
        numRecibe: 'Receiver number',
        numeroRecibe: 'Receiver number',
        nombreRecibe: 'Receiver name',
        step4Help: 'Complete receiver data for Lima.',
        summaryPedido: 'Order',
        summaryFactura: 'Invoice',
        summaryEntrega: 'Delivery',
        summaryRecibe: 'Receiver',
        summaryCliente: 'Client',
        summaryFecha: 'Date',
        summaryCodigo: 'Code',
        summaryNumero: 'Number',
        summarySaldo: 'Balance',
        summaryBase: 'Base',
        summaryTipoEntrega: 'Type',
        summaryPuntoEntrega: 'Point',
        summaryTipoRecibe: 'Type',
        summaryRecibeDato: 'Data',
        confirm: 'I confirm the data is correct to issue.',
        prev: 'Back',
        next: 'Next',
        submit: 'Issue Invoice',
        eliminar: 'Remove',
        seleccione: 'Select',
        sinLineas: 'No lines.',
        errorStep1: 'Complete client, quantity and total price.',
        errorStep2: 'Review quantities and base before continuing.',
        errorStep3: 'Complete required delivery data.',
        errorStep4: 'Complete required receiver data.',
        confirmError: 'You must confirm before issuing.',
        clienteError: 'Select a valid client.',
        baseError: 'Select a valid base.',
        puntoEntregaError: 'Select a delivery point.',
        departamentoError: 'Select a department.',
        provinciaError: 'Select a province.',
        distritoError: 'Select a district.',
        direccionError: 'Enter a valid address.',
        nombreError: 'Enter a valid name.',
        dniError: 'Enter a valid ID.',
        numeroRecibeError: 'Enter a valid receiver number.',
        nombreRecibeError: 'Enter a valid receiver name.',
        recibeError: 'Select a valid receiver.',
        errorCarga: 'Error loading data.',
        errorServidor: 'Server error.',
        errorProductos: 'No products available.',
        existente: 'Existing',
        noAplica: 'Not applicable',
        success: 'Invoice issued successfully.'
      }
    };

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = dict[this.locale][key] || dict.es[key] || el.textContent;
    });
  }

  t(key) {
    const base = {
      es: {
        seleccione: 'Seleccione',
        sinLineas: 'Sin líneas.',
        errorCarga: 'Error al cargar datos.',
        errorServidor: 'Error en el servidor.',
        errorProductos: 'No hay productos disponibles.',
        errorStep1: 'Complete cliente, cantidad y precio total del pedido.',
        errorStep2: 'Verifique cantidades y base antes de continuar.',
        errorStep3: 'Complete los datos de entrega requeridos.',
        errorStep4: 'Complete los datos de recibe requeridos.',
        confirmError: 'Debe confirmar antes de emitir.',
        success: 'Factura emitida correctamente.',
        existente: 'Existente',
        nuevo: 'Nuevo',
        noAplica: 'No aplica',
        eliminar: 'Eliminar'
      },
      en: {
        seleccione: 'Select',
        sinLineas: 'No lines.',
        errorCarga: 'Error loading data.',
        errorServidor: 'Server error.',
        errorProductos: 'No products available.',
        errorStep1: 'Complete client, quantity and total price.',
        errorStep2: 'Review quantities and base before continuing.',
        errorStep3: 'Complete required delivery data.',
        errorStep4: 'Complete required receiver data.',
        confirmError: 'You must confirm before issuing.',
        success: 'Invoice issued successfully.',
        existente: 'Existing',
        nuevo: 'New',
        noAplica: 'Not applicable',
        eliminar: 'Remove'
      }
    };
    return base[this.locale][key] || base.es[key] || key;
  }

  async fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(this.t('errorCarga'));
    }
    return response.json();
  }

  showError(message) {
    this.errorAlert.textContent = message;
    this.errorAlert.classList.remove('d-none');
  }

  clearAlerts() {
    this.errorAlert.classList.add('d-none');
    this.successAlert.classList.add('d-none');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FormWizard();
});
