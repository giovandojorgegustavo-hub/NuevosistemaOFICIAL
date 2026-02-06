/*
SPs de lectura
vClientes = Llamada SP: get_clientes() (devuelve campo_visible)
Campos devueltos
vCodigo_cliente
vNombre
vNumero
Variables
vCodigo_cliente no visible editable
vNombreCliente visible editable

vPaquetesLlegados = Llamada SP: get_paquetes_por_estado(p_estado="llegado") (devuelve campo_visible)
Campos devueltos
vCodigo_paquete
vFecha_actualizado
vCodigo_cliente
vNombre_cliente
vNum_cliente
vCodigo_puntoentrega
vCodigo_base
vOrdinal_numrecibe
vConcatenarpuntoentrega
vRegion_entrega
vLatitud
vLongitud
vConcatenarnumrecibe
Variables
vCodigo_paquete visible editable
vFecha_actualizado visible no editable
vCodigo_base visible no editable
vRegion_entrega visible no editable

vDetalleFactura = Llamada SP: get_mov_contable_detalle(p_tipo_documento="FAC", p_numero_documento=vCodigo_paquete) (devuelve campo_visible)
Campos devueltos
vTipo_documento
vNumero_documento
vOrdinal
vCodigo_producto
vNombre_producto
vCantidad
vSaldo
vPrecio_total
Variables
vCodigo_producto no visible no editable
vNombreProducto visible no editable
vCantidad_original no visible no editable
vCantidad visible editable
vSaldo no visible no editable
vPrecio_unitario no visible no editable
vPrecio_total visible no editable
*/

class FormWizard {
  constructor() {
    this.currentStep = 1;
    this.state = {
      vFecha_emision: '',
      vClientes: [],
      vPaquetesLlegados: [],
      vCodigo_cliente: '',
      vNombreCliente: '',
      vCodigo_paquete: '',
      vFecha_actualizado: '',
      vCodigo_base: '',
      vRegion_entrega: '',
      vTipo_documento: 'NTC',
      vNumero_documento: '',
      vDetalleFactura: [],
      vTotalNota: 0
    };

    this.elements = {
      form: document.getElementById('wizardForm'),
      steps: document.querySelectorAll('.step-view'),
      stepChips: document.querySelectorAll('.step-chip'),
      progress: document.getElementById('wizardProgress'),
      alert: document.getElementById('alertArea'),
      fechaEmision: document.getElementById('fecha_emision'),
      nombreCliente: document.getElementById('nombre_cliente'),
      codigoCliente: document.getElementById('codigo_cliente'),
      clienteMenu: document.getElementById('clienteMenu'),
      clienteNombre: document.getElementById('clienteNombre'),
      codigoPaquete: document.getElementById('codigo_paquete'),
      paqueteMenu: document.getElementById('paqueteMenu'),
      paqueteDetalle: document.getElementById('paqueteDetalle'),
      fechaActualizado: document.getElementById('fecha_actualizado'),
      codigoBase: document.getElementById('codigo_base'),
      regionEntrega: document.getElementById('region_entrega'),
      detalleGrid: document.getElementById('detalleGrid'),
      totalNota: document.getElementById('totalNota'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      emitBtn: document.getElementById('emitBtn'),
      confirmCheck: document.getElementById('confirmCheck'),
      docTypeValue: document.getElementById('docTypeValue'),
      docNumberValue: document.getElementById('docNumberValue'),
      resCliente: document.getElementById('resCliente'),
      resFactura: document.getElementById('resFactura'),
      resFecha: document.getElementById('resFecha'),
      resBase: document.getElementById('resBase'),
      resTotal: document.getElementById('resTotal'),
      resItems: document.getElementById('resItems'),
      resDetalle: document.getElementById('resDetalle'),
      connectionBadge: document.getElementById('connectionBadge')
    };

    this.regex = {
      date: /^\d{4}-\d{2}-\d{2}$/,
      number: /^\d+(\.\d+)?$/
    };
  }

  init() {
    this.applyI18n();
    this.setToday();
    this.elements.docTypeValue.textContent = this.state.vTipo_documento;
    this.bindEvents();
    this.updateStepUI();
    this.loadInitialData();
  }

  applyI18n() {
    const lang = navigator.language && navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
    const dict = {
      es: {
        brandTitle: 'Nota de Credito',
        brandSubtitle: 'Operaciones financieras IaaS + PaaS',
        statusConnecting: 'Conectando',
        statusOnline: 'En linea',
        statusOffline: 'Sin conexion',
        wizardTitle: 'Emitir Nota de Credito',
        wizardSubtitle: 'Flujo de devolucion parcial con trazabilidad total',
        metaDocType: 'Tipo',
        metaDocNumber: 'Numero',
        labelFecha: 'Fecha emision',
        labelCliente: 'Cliente',
        labelFactura: 'Factura / Paquete llegado',
        labelFechaActualizado: 'Fecha actualizado',
        labelBase: 'Base',
        step2Note: 'Ajusta las cantidades para emitir una nota de credito parcial.',
        thProducto: 'Producto',
        thCantidad: 'Cantidad',
        thPrecio: 'Precio unitario',
        thTotal: 'Total',
        totalNota: 'Total nota',
        summaryHeader: 'Resumen cabecera',
        summaryCliente: 'Cliente',
        summaryFactura: 'Factura',
        summaryFecha: 'Fecha',
        summaryBase: 'Base',
        summaryTotals: 'Totales',
        summaryTotalNota: 'Total nota',
        summaryItems: 'Items',
        confirmLabel: 'Confirmo que los datos son correctos.',
        noResults: 'Sin resultados',
        prev: 'Anterior',
        next: 'Siguiente',
        emitir: 'Emitir Nota de Credito'
      },
      en: {
        brandTitle: 'Credit Note',
        brandSubtitle: 'IaaS + PaaS Finance Operations',
        statusConnecting: 'Connecting',
        statusOnline: 'Online',
        statusOffline: 'Offline',
        wizardTitle: 'Issue Credit Note',
        wizardSubtitle: 'Partial refund flow with full traceability',
        metaDocType: 'Type',
        metaDocNumber: 'Number',
        labelFecha: 'Issue date',
        labelCliente: 'Client',
        labelFactura: 'Invoice / Arrived package',
        labelFechaActualizado: 'Updated date',
        labelBase: 'Base',
        step2Note: 'Adjust quantities to issue a partial credit note.',
        thProducto: 'Product',
        thCantidad: 'Quantity',
        thPrecio: 'Unit price',
        thTotal: 'Total',
        totalNota: 'Credit total',
        summaryHeader: 'Header summary',
        summaryCliente: 'Client',
        summaryFactura: 'Invoice',
        summaryFecha: 'Date',
        summaryBase: 'Base',
        summaryTotals: 'Totals',
        summaryTotalNota: 'Credit total',
        summaryItems: 'Items',
        confirmLabel: 'I confirm that the data is correct.',
        noResults: 'No results',
        prev: 'Previous',
        next: 'Next',
        emitir: 'Issue Credit Note'
      }
    };

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[lang] && dict[lang][key]) {
        el.textContent = dict[lang][key];
      }
    });
  }

  setToday() {
    const today = new Date();
    const value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
    this.state.vFecha_emision = value;
    this.elements.fechaEmision.value = value;
  }

  bindEvents() {
    this.elements.prevBtn.addEventListener('click', () => this.prevStep());
    this.elements.nextBtn.addEventListener('click', () => this.nextStep());
    this.elements.emitBtn.addEventListener('click', () => this.emitNota());
    this.elements.confirmCheck.addEventListener('change', () => {
      this.elements.emitBtn.disabled = !this.elements.confirmCheck.checked;
    });

    this.elements.fechaEmision.addEventListener('change', (event) => {
      this.state.vFecha_emision = event.target.value;
    });

    this.setupTypeahead(
      this.elements.nombreCliente,
      this.elements.clienteMenu,
      () => this.state.vClientes,
      (item) => `${item.codigo_cliente} - ${item.nombre} (${item.numero})`,
      (item) => {
        this.state.vCodigo_cliente = item.codigo_cliente;
        this.state.vNombreCliente = item.nombre;
        this.elements.clienteNombre.textContent = `${item.nombre} (${item.numero})`;
        this.elements.nombreCliente.value = `${item.nombre} (${item.numero})`;
        this.elements.codigoCliente.value = item.codigo_cliente;
        this.filterPaquetes();
      }
    );

    this.setupTypeahead(
      this.elements.codigoPaquete,
      this.elements.paqueteMenu,
      () => this.state.filteredPaquetes || [],
      (item) => `${item.codigo_paquete} - ${item.nombre_cliente}`,
      (item) => {
        this.state.vCodigo_paquete = item.codigo_paquete;
        this.state.vFecha_actualizado = item.fecha_actualizado;
        this.state.vCodigo_base = item.codigo_base;
        this.state.vRegion_entrega = item.region_entrega;
        this.elements.codigoPaquete.value = item.codigo_paquete;
        this.elements.paqueteDetalle.textContent = `${item.nombre_cliente} | ${item.concatenarpuntoentrega}`;
        this.elements.fechaActualizado.value = item.fecha_actualizado || '';
        this.elements.codigoBase.value = item.codigo_base || '';
        this.elements.regionEntrega.textContent = item.region_entrega || '-';
        this.loadDetalleFactura();
      }
    );

    this.elements.nombreCliente.addEventListener('input', () => {
      this.state.vCodigo_cliente = '';
      this.state.vNombreCliente = '';
      this.elements.codigoCliente.value = '';
      this.elements.clienteNombre.textContent = '-';
      this.filterPaquetes();
    });

    this.elements.codigoPaquete.addEventListener('input', () => {
      this.state.vCodigo_paquete = '';
      this.state.vFecha_actualizado = '';
      this.elements.paqueteDetalle.textContent = '-';
      this.elements.fechaActualizado.value = '';
      this.state.vDetalleFactura = [];
      this.renderDetalle();
    });
  }

  async loadInitialData() {
    try {
      this.setLoading(true);
      const [health, clientes, paquetes, nextDoc] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/clientes'),
        fetch('/api/paquetes?estado=llegado'),
        fetch('/api/next-numero-documento')
      ]);
      if (!health.ok) {
        throw new Error('health');
      }
      this.elements.connectionBadge.className = 'badge rounded-pill text-bg-success';
      this.elements.connectionBadge.textContent = this.t('statusOnline', 'En linea');

      const clientesData = await clientes.json();
      this.state.vClientes = clientesData.data || [];

      const paquetesData = await paquetes.json();
      this.state.vPaquetesLlegados = paquetesData.data || [];
      this.filterPaquetes();

      const nextData = await nextDoc.json();
      this.state.vNumero_documento = String(nextData.next || '');
      this.elements.docNumberValue.textContent = this.state.vNumero_documento || '-';

      this.showAlert('', 'd-none');
    } catch (error) {
      this.elements.connectionBadge.className = 'badge rounded-pill text-bg-danger';
      this.elements.connectionBadge.textContent = this.t('statusOffline', 'Sin conexion');
      this.showAlert('No se pudo conectar con el servidor. Reintenta en unos minutos.', 'alert-danger');
    } finally {
      this.setLoading(false);
    }
  }

  filterPaquetes() {
    const codigoCliente = this.state.vCodigo_cliente;
    this.state.filteredPaquetes = this.state.vPaquetesLlegados.filter(
      (item) => String(item.codigo_cliente) === String(codigoCliente)
    );
    this.state.vCodigo_paquete = '';
    this.state.vFecha_actualizado = '';
    this.elements.codigoPaquete.value = '';
    this.elements.paqueteDetalle.textContent = '-';
    this.elements.fechaActualizado.value = '';
    this.state.vDetalleFactura = [];
    this.renderDetalle();
  }

  async loadDetalleFactura() {
    if (!this.state.vCodigo_paquete) {
      return;
    }
    try {
      this.setLoading(true);
      const response = await fetch(`/api/detalle-factura?codigo_paquete=${encodeURIComponent(this.state.vCodigo_paquete)}`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'detalle');
      }
      this.state.vDetalleFactura = (data.data || []).map((row, index) => {
        const cantidadOriginal = Number(row.cantidad) || 0;
        const precioTotal = Number(row.precio_total) || 0;
        const precioUnitario = cantidadOriginal ? precioTotal / cantidadOriginal : 0;
        return {
          vOrdinalDetMovCont: index + 1,
          vCodigo_producto: row.codigo_producto,
          vNombreProducto: row.nombre_producto,
          vCantidad_original: cantidadOriginal,
          vCantidad: cantidadOriginal,
          vSaldo: Number(row.saldo) || 0,
          vPrecio_unitario: precioUnitario,
          vPrecio_total: precioTotal
        };
      });
      this.renderDetalle();
    } catch (error) {
      this.showAlert('No se pudo cargar el detalle de factura.', 'alert-danger');
    } finally {
      this.setLoading(false);
    }
  }

  renderDetalle() {
    this.elements.detalleGrid.innerHTML = '';
    this.state.vDetalleFactura.forEach((item, index) => {
      const row = document.createElement('tr');

      const productoCell = document.createElement('td');
      productoCell.textContent = item.vNombreProducto;

      const cantidadCell = document.createElement('td');
      cantidadCell.className = 'text-center';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = item.vCantidad_original;
      input.step = '0.01';
      input.value = item.vCantidad;
      input.dataset.index = index;
      input.className = 'form-control form-control-sm';
      input.addEventListener('input', (event) => this.onCantidadChange(event));
      cantidadCell.appendChild(input);

      const precioCell = document.createElement('td');
      precioCell.className = 'text-end';
      precioCell.textContent = this.formatCurrency(item.vPrecio_unitario);

      const totalCell = document.createElement('td');
      totalCell.className = 'text-end';
      totalCell.textContent = this.formatCurrency(item.vPrecio_total);
      totalCell.dataset.totalIndex = index;

      row.appendChild(productoCell);
      row.appendChild(cantidadCell);
      row.appendChild(precioCell);
      row.appendChild(totalCell);
      this.elements.detalleGrid.appendChild(row);
    });
    this.updateTotals();
  }

  onCantidadChange(event) {
    const index = Number(event.target.dataset.index);
    const value = event.target.value;
    if (!this.regex.number.test(value)) {
      event.target.classList.add('is-invalid');
      return;
    }
    const cantidad = Math.max(0, Math.min(Number(value), this.state.vDetalleFactura[index].vCantidad_original));
    event.target.classList.remove('is-invalid');
    event.target.value = cantidad;
    const item = this.state.vDetalleFactura[index];
    item.vCantidad = cantidad;
    item.vPrecio_total = item.vPrecio_unitario * cantidad;
    const totalCell = this.elements.detalleGrid.querySelector(`[data-total-index="${index}"]`);
    if (totalCell) {
      totalCell.textContent = this.formatCurrency(item.vPrecio_total);
    }
    this.updateTotals();
  }

  updateTotals() {
    const total = this.state.vDetalleFactura.reduce((sum, item) => sum + (Number(item.vPrecio_total) || 0), 0);
    this.state.vTotalNota = total;
    this.elements.totalNota.textContent = this.formatCurrency(total);
  }

  refreshSummary() {
    this.elements.resCliente.textContent = this.state.vNombreCliente || '-';
    this.elements.resFactura.textContent = this.state.vCodigo_paquete || '-';
    this.elements.resFecha.textContent = this.state.vFecha_emision || '-';
    this.elements.resBase.textContent = this.state.vCodigo_base || '-';
    this.elements.resTotal.textContent = this.formatCurrency(this.state.vTotalNota);
    const items = this.state.vDetalleFactura.filter((item) => item.vCantidad > 0);
    this.elements.resItems.textContent = String(items.length);
    this.elements.resDetalle.innerHTML = '';
    items.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.vNombreProducto}</td>
        <td class="text-center">${item.vCantidad}</td>
        <td class="text-end">${this.formatCurrency(item.vPrecio_total)}</td>
      `;
      this.elements.resDetalle.appendChild(row);
    });
  }

  nextStep() {
    if (!this.validateStep(this.currentStep)) {
      return;
    }
    if (this.currentStep < 3) {
      this.currentStep += 1;
      if (this.currentStep === 3) {
        this.refreshSummary();
      }
      this.updateStepUI();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
      this.updateStepUI();
    }
  }

  updateStepUI() {
    this.elements.steps.forEach((step) => {
      step.classList.toggle('d-none', Number(step.dataset.step) !== this.currentStep);
    });
    this.elements.stepChips.forEach((chip) => {
      chip.classList.toggle('active', Number(chip.dataset.step) === this.currentStep);
    });
    this.elements.prevBtn.classList.toggle('d-none', this.currentStep === 1);
    this.elements.nextBtn.classList.toggle('d-none', this.currentStep === 3);
    this.elements.emitBtn.classList.toggle('d-none', this.currentStep !== 3);
    this.elements.emitBtn.disabled = this.currentStep !== 3 || !this.elements.confirmCheck.checked;

    const progress = (this.currentStep / 3) * 100;
    this.elements.progress.style.width = `${progress}%`;
  }

  validateStep(step) {
    this.showAlert('', 'd-none');
    if (step === 1) {
      if (!this.state.vCodigo_cliente) {
        this.showAlert('Selecciona un cliente.', 'alert-warning');
        return false;
      }
      if (!this.regex.date.test(this.state.vFecha_emision)) {
        this.showAlert('Fecha emision requerida.', 'alert-warning');
        return false;
      }
      if (!this.state.vCodigo_paquete) {
        this.showAlert('Selecciona una factura.', 'alert-warning');
        return false;
      }
      return true;
    }
    if (step === 2) {
      const validLines = this.state.vDetalleFactura.some((item) => item.vCantidad > 0);
      if (!validLines) {
        this.showAlert('Debe existir al menos una linea con cantidad mayor a cero.', 'alert-warning');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!this.elements.confirmCheck.checked) {
        this.showAlert('Confirma la operacion para continuar.', 'alert-warning');
        return false;
      }
      return true;
    }
    return true;
  }

  async emitNota() {
    if (!this.validateStep(3)) {
      return;
    }
    try {
      this.setLoading(true);
      const payload = {
        vFecha_emision: this.state.vFecha_emision,
        vTipo_documento: this.state.vTipo_documento,
        vNumero_documento: this.state.vNumero_documento,
        vCodigo_cliente: this.state.vCodigo_cliente,
        vCodigo_paquete: this.state.vCodigo_paquete,
        vCodigo_base: this.state.vCodigo_base,
        vTotalNota: this.state.vTotalNota,
        detalle: this.state.vDetalleFactura
          .filter((item) => item.vCantidad > 0)
          .map((item) => ({
            vOrdinalDetMovCont: item.vOrdinalDetMovCont,
            vCodigo_producto: item.vCodigo_producto,
            vCantidad: item.vCantidad,
            vSaldo: item.vSaldo,
            vPrecio_total: item.vPrecio_total
          }))
      };

      const response = await fetch('/api/emitir-nota-credito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'emitir');
      }
      this.showAlert('Nota de credito emitida con exito.', 'alert-success');
      this.resetWizard();
    } catch (error) {
      this.showAlert('No se pudo emitir la nota de credito.', 'alert-danger');
    } finally {
      this.setLoading(false);
    }
  }

  resetWizard() {
    this.currentStep = 1;
    this.state.vCodigo_cliente = '';
    this.state.vNombreCliente = '';
    this.state.vCodigo_paquete = '';
    this.state.vCodigo_base = '';
    this.state.vRegion_entrega = '';
    this.state.vDetalleFactura = [];
    this.state.vTotalNota = 0;
    this.elements.codigoCliente.value = '';
    this.elements.nombreCliente.value = '';
    this.elements.clienteNombre.textContent = '-';
    this.elements.codigoPaquete.value = '';
    this.elements.paqueteDetalle.textContent = '-';
    this.elements.fechaActualizado.value = '';
    this.elements.codigoBase.value = '';
    this.elements.regionEntrega.textContent = '-';
    this.elements.confirmCheck.checked = false;
    this.elements.emitBtn.disabled = true;
    this.renderDetalle();
    this.setToday();
    this.updateStepUI();
    this.loadInitialData();
  }

  setupTypeahead(input, menu, dataSource, labelFn, onSelect) {
    const closeMenu = () => {
      menu.style.display = 'none';
    };

    const openMenu = () => {
      menu.style.display = 'block';
    };

    const renderList = (items) => {
      menu.innerHTML = '';
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'typeahead-item';
        empty.textContent = this.t('noResults', 'Sin resultados');
        menu.appendChild(empty);
        return;
      }
      items.slice(0, 100).forEach((item) => {
        const option = document.createElement('div');
        option.className = 'typeahead-item';
        option.textContent = labelFn(item);
        option.addEventListener('click', () => {
          onSelect(item);
          closeMenu();
        });
        menu.appendChild(option);
      });
    };

    input.addEventListener('input', () => {
      const query = input.value.toLowerCase();
      const items = dataSource().filter((item) => labelFn(item).toLowerCase().includes(query));
      renderList(items);
      openMenu();
    });

    input.addEventListener('focus', () => {
      renderList(dataSource());
      openMenu();
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target) && event.target !== input) {
        closeMenu();
      }
    });
  }

  setLoading(isLoading) {
    [this.elements.nextBtn, this.elements.prevBtn, this.elements.emitBtn].forEach((btn) => {
      if (!btn) return;
      btn.disabled = isLoading || (btn === this.elements.emitBtn && !this.elements.confirmCheck.checked);
      btn.classList.toggle('disabled', isLoading);
    });
  }

  showAlert(message, className) {
    this.elements.alert.className = `alert ${className}`;
    if (!message) {
      this.elements.alert.classList.add('d-none');
      return;
    }
    this.elements.alert.textContent = message;
    this.elements.alert.classList.remove('d-none');
  }

  formatCurrency(value) {
    return Number(value || 0).toFixed(2);
  }

  t(key, fallback) {
    const el = document.querySelector(`[data-i18n="${key}"]`);
    return el ? el.textContent : fallback;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const wizard = new FormWizard();
  wizard.init();
});
