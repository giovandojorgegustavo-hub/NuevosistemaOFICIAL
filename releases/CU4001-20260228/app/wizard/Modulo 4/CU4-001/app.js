/*
vBases = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
codigo_base
nombre
Variables
vCodigo_base no visible editable
vBaseNombre visible editable
vCodigo_basedestino no visible editable
vBaseNombreDestino visible editable

vProductos = Llamada SP: get_productos() (devuelve campo_visible)
Campos devueltos
codigo_producto
nombre
Variables
vcodigo_producto no visible editable
vNombreProducto visible editable
*/

class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.progressBar = document.querySelector('.progress-bar');
    this.stepLabels = Array.from(document.querySelectorAll('[data-step-label]'));
    this.alertArea = document.getElementById('alertArea');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.currentStep = 1;
    this.bases = [];
    this.productos = [];
    this.detalleBody = document.getElementById('detalleBody');
    this.decimalRegex = /^\d+(\.\d{1,2})?$/;
    this.dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    this.auth = this.extractAuthFromLocation();
  }

  async init() {
    this.bindEvents();
    this.setLangFromBrowser();
    this.addDetalleRow();
    await this.loadInitialData();
    this.setStep(1);
  }

  bindEvents() {
    document.getElementById('nextBtn').addEventListener('click', () => this.handleNext());
    document.getElementById('prevBtn').addEventListener('click', () => this.handlePrev());
    document.getElementById('resetBtn').addEventListener('click', () => this.resetForm());
    document.getElementById('addRowBtn').addEventListener('click', () => this.addDetalleRow());
    document.getElementById('refreshLogsBtn').addEventListener('click', () => this.loadSqlLogs());
    document.getElementById('vConfirmar').addEventListener('change', () => {
      if (this.currentStep === 2) {
        document.getElementById('nextBtn').disabled = !document.getElementById('vConfirmar').checked;
      }
    });

    document.getElementById('vBaseNombre').addEventListener('input', (event) => {
      this.syncBaseCode(event.target.value, 'vCodigo_base');
    });
    document.getElementById('vBaseNombreDestino').addEventListener('input', (event) => {
      this.syncBaseCode(event.target.value, 'vCodigo_basedestino');
    });
  }

  setLangFromBrowser() {
    const lang = navigator.language || 'es';
    document.documentElement.setAttribute('lang', lang);
  }

  extractAuthFromLocation() {
    const params = new URLSearchParams(window.location.search || '');
    const codigoUsuario =
      params.get('vUsuario') || params.get('Codigo_usuario') || params.get('codigo_usuario') || '';
    const otp = params.get('vOTP') || params.get('OTP') || params.get('otp') || '';
    return {
      codigoUsuario: String(codigoUsuario).trim(),
      otp: String(otp).trim()
    };
  }

  authHeaders() {
    const headers = {};
    if (this.auth.codigoUsuario) {
      headers['x-codigo-usuario'] = this.auth.codigoUsuario;
    }
    if (this.auth.otp) {
      headers['x-otp'] = this.auth.otp;
    }
    return headers;
  }

  withAuth(path) {
    const url = new URL(path, window.location.href);
    if (this.auth.codigoUsuario) {
      url.searchParams.set('vUsuario', this.auth.codigoUsuario);
    }
    if (this.auth.otp) {
      url.searchParams.set('vOTP', this.auth.otp);
    }
    return `${url.pathname}${url.search}`;
  }

  showAlert(message, type = 'danger') {
    this.alertArea.textContent = message;
    this.alertArea.className = `alert alert-${type}`;
    this.alertArea.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  hideAlert() {
    this.alertArea.classList.add('d-none');
  }

  setLoading(isLoading, message = 'Procesando...') {
    this.loadingText.textContent = message;
    this.loadingOverlay.classList.toggle('d-none', !isLoading);
  }

  setStep(step) {
    this.currentStep = step;
    this.steps.forEach((panel) => {
      panel.classList.toggle('d-none', Number(panel.dataset.step) !== step);
    });
    this.stepLabels.forEach((label) => {
      label.classList.toggle('active', Number(label.dataset.stepLabel) === step);
    });
    const progress = (step / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
    document.getElementById('prevBtn').disabled = step === 1;
    document.getElementById('nextBtn').textContent = step === 2 ? 'Registrar Transferencia' : step === 3 ? 'Finalizar' : 'Siguiente';
    if (step === 2) {
      document.getElementById('nextBtn').disabled = !document.getElementById('vConfirmar').checked;
    } else {
      document.getElementById('nextBtn').disabled = false;
    }
  }

  async handleNext() {
    this.hideAlert();

    if (this.currentStep === 1) {
      const errors = this.validateStep1();
      if (errors.length) {
        this.showAlert(errors.join(' | '));
        return;
      }
      this.updateReview();
      this.setStep(2);
      return;
    }

    if (this.currentStep === 2) {
      const confirmar = document.getElementById('vConfirmar').checked;
      if (!confirmar) {
        this.showAlert('Debes confirmar la operacion antes de continuar.');
        return;
      }
      await this.submitTransferencia();
      return;
    }

    if (this.currentStep === 3) {
      this.resetForm();
    }
  }

  handlePrev() {
    this.hideAlert();
    if (this.currentStep > 1) {
      this.setStep(this.currentStep - 1);
    }
  }

  addDetalleRow() {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input type="text" class="form-control form-control-sm" name="vNombreProducto" list="productosList" placeholder="Producto" />
        <input type="hidden" name="vcodigo_producto" />
        <small class="text-muted" data-producto-label>--</small>
      </td>
      <td class="text-end">
        <input type="text" class="form-control form-control-sm text-end" name="Vcantidad" placeholder="0.00" />
      </td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-outline-light">Quitar</button>
      </td>
    `;
    row.querySelector('button').addEventListener('click', () => {
      row.remove();
    });
    row.querySelector('input[name="vNombreProducto"]').addEventListener('input', (event) => {
      this.syncProductoLabel(event.target);
    });
    this.detalleBody.appendChild(row);
  }

  syncProductoLabel(input) {
    const value = input.value.trim();
    const match = this.productos.find((item) => this.equalsIgnoreCase(item.nombre, value) || String(item.codigo_producto) === value);
    const label = input.parentElement.querySelector('[data-producto-label]');
    const codigoField = input.parentElement.querySelector('input[name="vcodigo_producto"]');
    if (match) {
      label.textContent = `${match.codigo_producto} · ${match.nombre}`;
      codigoField.value = match.codigo_producto;
    } else {
      label.textContent = 'No reconocido';
      codigoField.value = '';
    }
  }

  syncBaseCode(value, targetId) {
    const match = this.bases.find((item) => this.equalsIgnoreCase(item.nombre, value) || String(item.codigo_base) === value);
    const target = document.getElementById(targetId);
    if (match) {
      target.value = match.codigo_base;
    } else {
      target.value = '';
    }
  }

  equalsIgnoreCase(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  setTextIfExists(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  validateStep1() {
    const errors = [];
    const vFecha = document.getElementById('vFecha').value.trim();
    const vBaseNombre = document.getElementById('vBaseNombre').value.trim();
    const vBaseNombreDestino = document.getElementById('vBaseNombreDestino').value.trim();
    const vCodigo_base = document.getElementById('vCodigo_base').value.trim();
    const vCodigo_basedestino = document.getElementById('vCodigo_basedestino').value.trim();

    if (!this.dateRegex.test(vFecha)) {
      errors.push('vFecha no es valida');
    }
    if (!vBaseNombre || !vCodigo_base) {
      errors.push('Selecciona una base de origen valida');
    }
    if (!vBaseNombreDestino || !vCodigo_basedestino) {
      errors.push('Selecciona una base de destino valida');
    }
    if (vCodigo_base && vCodigo_basedestino && vCodigo_base === vCodigo_basedestino) {
      errors.push('La base destino debe ser distinta a la base origen');
    }

    const detalle = this.getDetalleItems();
    if (!detalle.length) {
      errors.push('Agrega al menos un producto en vDetalleTransferencia');
    }

    const cantidadErrores = detalle.filter((item) => !this.decimalRegex.test(String(item.Vcantidad)) || Number(item.Vcantidad) <= 0);
    if (cantidadErrores.length) {
      errors.push('Vcantidad debe ser un numero mayor a 0 con hasta 2 decimales');
    }

    const productosInvalidos = detalle.filter((item) => !this.productos.find((prod) => String(prod.codigo_producto) === String(item.vcodigo_producto)));
    if (productosInvalidos.length) {
      errors.push('vcodigo_producto debe existir en la lista de productos');
    }

    return errors;
  }

  getDetalleItems() {
    const rows = Array.from(this.detalleBody.querySelectorAll('tr'));
    return rows
      .map((row) => {
        const nombreInput = row.querySelector('input[name="vNombreProducto"]');
        const codigoInput = row.querySelector('input[name="vcodigo_producto"]');
        const cantidadInput = row.querySelector('input[name="Vcantidad"]');
        const codigo = codigoInput.value.trim();
        const nombre = nombreInput.value.trim();
        const cantidad = cantidadInput.value.trim();
        return {
          vcodigo_producto: codigo,
          vNombreProducto: nombre,
          Vcantidad: cantidad
        };
      })
      .filter((item) => item.vcodigo_producto || item.vNombreProducto || item.Vcantidad);
  }

  updateReview() {
    this.setTextIfExists('reviewFecha', document.getElementById('vFecha').value);
    this.setTextIfExists('reviewSalida', document.getElementById('vNumdocumentostockSalida').value);
    this.setTextIfExists('reviewEntrada', document.getElementById('vNumdocumentostockEntrada').value);
    this.setTextIfExists('reviewBaseOrigen', document.getElementById('vBaseNombre').value);
    this.setTextIfExists('reviewBaseDestino', document.getElementById('vBaseNombreDestino').value);

    const detalle = this.getDetalleItems();
    const tbody = document.getElementById('reviewDetalle');
    tbody.innerHTML = '';
    detalle.forEach((item) => {
      const producto = this.productos.find((p) => String(p.codigo_producto) === String(item.vcodigo_producto));
      const nombre = producto ? producto.nombre : item.vNombreProducto || item.vcodigo_producto;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${nombre}</td>
        <td class="text-end">${item.Vcantidad}</td>
      `;
      tbody.appendChild(row);
    });
  }

  async loadInitialData() {
    this.setLoading(true, 'Cargando datos iniciales...');
    try {
      const [initResponse, basesResponse, productosResponse] = await Promise.all([
        fetch(this.withAuth('./api/init'), { headers: this.authHeaders() }),
        fetch(this.withAuth('./api/bases'), { headers: this.authHeaders() }),
        fetch(this.withAuth('./api/productos'), { headers: this.authHeaders() })
      ]);
      const initData = await initResponse.json();
      const basesData = await basesResponse.json();
      const productosData = await productosResponse.json();

      if (!initData.ok) {
        throw new Error(initData.message || 'Error al inicializar');
      }
      if (!basesData.ok) {
        throw new Error(basesData.message || 'Error cargando bases');
      }
      if (!productosData.ok) {
        throw new Error(productosData.message || 'Error cargando productos');
      }
      this.bases = basesData.data || [];
      this.productos = productosData.data || [];

      this.applyInitData(initData.data);
      this.renderDatalists();
    } catch (error) {
      this.showAlert(error.message || 'Error cargando datos');
    } finally {
      this.setLoading(false);
    }
  }

  applyInitData(data) {
    document.getElementById('vFecha').value = data.vFecha;
    document.getElementById('vTipodocumentostockSalida').value = data.vTipodocumentostockSalida;
    document.getElementById('vTipodocumentostockEntrada').value = data.vTipodocumentostockEntrada;
    document.getElementById('vNumdocumentostockSalida').value = data.vNumdocumentostockSalida;
    document.getElementById('vNumdocumentostockEntrada').value = data.vNumdocumentostockEntrada;
    this.setTextIfExists('metricSalida', data.vNumdocumentostockSalida);
    this.setTextIfExists('metricEntrada', data.vNumdocumentostockEntrada);
  }

  renderDatalists() {
    const basesList = document.getElementById('basesList');
    basesList.innerHTML = '';
    this.bases.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.nombre;
      option.dataset.codigo = item.codigo_base;
      basesList.appendChild(option);
    });

    const productosList = document.getElementById('productosList');
    productosList.innerHTML = '';
    this.productos.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.nombre;
      option.dataset.codigo = item.codigo_producto;
      productosList.appendChild(option);
    });
  }

  async submitTransferencia() {
    this.setLoading(true, 'Registrando transferencia...');
    try {
      const payload = {
        vFecha: document.getElementById('vFecha').value.trim(),
        vTipodocumentostockSalida: document.getElementById('vTipodocumentostockSalida').value.trim(),
        vTipodocumentostockEntrada: document.getElementById('vTipodocumentostockEntrada').value.trim(),
        vNumdocumentostockSalida: document.getElementById('vNumdocumentostockSalida').value.trim(),
        vNumdocumentostockEntrada: document.getElementById('vNumdocumentostockEntrada').value.trim(),
        vConfirmar: document.getElementById('vConfirmar').checked,
        vCodigo_base: document.getElementById('vCodigo_base').value.trim(),
        vCodigo_basedestino: document.getElementById('vCodigo_basedestino').value.trim(),
        vDetalleTransferencia: this.getDetalleItems()
      };

      const response = await fetch(this.withAuth('./api/transferencias'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders()
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.message || 'Error registrando transferencia');
      }
      this.showResult('Transferencia registrada', 'La transferencia se registro correctamente.');
      this.setStep(3);
      await this.loadSqlLogs();
    } catch (error) {
      this.showResult('Error en la transferencia', error.message || 'No se pudo registrar la transferencia', true);
      this.setStep(3);
    } finally {
      this.setLoading(false);
      document.getElementById('vConfirmar').checked = false;
    }
  }

  showResult(title, message, isError = false) {
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    resultTitle.textContent = title;
    resultMessage.textContent = message;
    resultTitle.classList.toggle('text-danger', isError);
  }

  async loadSqlLogs() {
    try {
      const response = await fetch(this.withAuth('./api/sql-logs'), { headers: this.authHeaders() });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || 'No se pudieron cargar los logs');
      }
      const logArea = document.getElementById('sqlLogs');
      logArea.textContent = data.lines && data.lines.length ? data.lines.join('\n') : 'Sin logs disponibles.';
    } catch (error) {
      this.showAlert(error.message || 'Error cargando logs');
    }
  }

  resetForm() {
    document.getElementById('transferForm').reset();
    document.getElementById('vCodigo_base').value = '';
    document.getElementById('vCodigo_basedestino').value = '';
    this.detalleBody.innerHTML = '';
    this.addDetalleRow();
    this.hideAlert();
    this.loadInitialData();
    this.setStep(1);
  }
}

const wizard = new FormWizard();
window.addEventListener('DOMContentLoaded', () => {
  wizard.init();
});
