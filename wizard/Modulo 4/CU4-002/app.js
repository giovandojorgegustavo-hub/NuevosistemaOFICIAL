/*
vBases = Llamada SP: get_bases() (devuelve campo_visible)
Campos devueltos
codigo_base
nombre
latitud
longitud
Variables
vCodigo_base no visible editable
vBaseNombre visible editable

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
      this.syncBaseCode(event.target.value);
      this.refreshSaldoForAllRows();
    });
  }

  setLangFromBrowser() {
    const lang = navigator.language || 'es';
    document.documentElement.setAttribute('lang', lang);
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
    document.getElementById('nextBtn').textContent = step === 2 ? 'Registrar Ajuste' : step === 3 ? 'Finalizar' : 'Siguiente';
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
      await this.submitAjuste();
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
        <input type="text" class="form-control form-control-sm text-end" name="Vcantidad_sistema" placeholder="0.00" readonly />
      </td>
      <td class="text-end">
        <input type="text" class="form-control form-control-sm text-end" name="Vcantidad_real" placeholder="0.00" />
      </td>
      <td class="text-end">
        <input type="text" class="form-control form-control-sm text-end" name="Vcantidad" placeholder="0.00" readonly />
      </td>
      <td class="text-end">
        <input type="text" class="form-control form-control-sm text-end" name="Vmonto" placeholder="0.00" />
      </td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-outline-light">Quitar</button>
      </td>
    `;
    row.querySelector('button').addEventListener('click', () => {
      row.remove();
    });
    const productoInput = row.querySelector('input[name="vNombreProducto"]');
    const cantidadRealInput = row.querySelector('input[name="Vcantidad_real"]');
    productoInput.addEventListener('input', (event) => {
      this.syncProductoLabel(event.target);
      this.updateSaldoForRow(row);
    });
    cantidadRealInput.addEventListener('input', () => {
      this.updateCantidadForRow(row);
    });
    this.setMontoVisibility(row, 0);
    this.detalleBody.appendChild(row);
  }

  syncProductoLabel(input) {
    const value = input.value.trim();
    const match = this.productos.find(
      (item) => this.equalsIgnoreCase(item.nombre, value) || String(item.codigo_producto) === value
    );
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

  syncBaseCode(value) {
    const match = this.bases.find((item) => this.equalsIgnoreCase(item.nombre, value) || String(item.codigo_base) === value);
    const target = document.getElementById('vCodigo_base');
    if (match) {
      target.value = match.codigo_base;
    } else {
      target.value = '';
    }
  }

  equalsIgnoreCase(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  refreshSaldoForAllRows() {
    const rows = Array.from(this.detalleBody.querySelectorAll('tr'));
    rows.forEach((row) => this.updateSaldoForRow(row));
  }

  async updateSaldoForRow(row) {
    const codigoBase = document.getElementById('vCodigo_base').value.trim();
    const codigoProducto = row.querySelector('input[name="vcodigo_producto"]').value.trim();
    const sistemaInput = row.querySelector('input[name="Vcantidad_sistema"]');
    if (!codigoBase || !codigoProducto) {
      sistemaInput.value = '0.00';
      this.updateCantidadForRow(row);
      return;
    }
    try {
      const response = await fetch(
        `/api/saldo-stock?codigo_base=${encodeURIComponent(codigoBase)}&codigo_producto=${encodeURIComponent(codigoProducto)}`
      );
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.message || 'No se pudo obtener saldo');
      }
      sistemaInput.value = Number(data.saldo || 0).toFixed(2);
      this.updateCantidadForRow(row);
    } catch (error) {
      this.showAlert(error.message || 'Error consultando saldo');
    }
  }

  updateCantidadForRow(row) {
    const sistema = Number(row.querySelector('input[name="Vcantidad_sistema"]').value || 0);
    const realInput = row.querySelector('input[name="Vcantidad_real"]');
    const cantidadInput = row.querySelector('input[name="Vcantidad"]');
    const realValue = Number(realInput.value || 0);
    const cantidad = realValue - sistema;
    cantidadInput.value = Number.isFinite(cantidad) ? cantidad.toFixed(2) : '0.00';
    this.setMontoVisibility(row, cantidad);
  }

  setMontoVisibility(row, cantidad) {
    const montoInput = row.querySelector('input[name="Vmonto"]');
    if (cantidad > 0) {
      montoInput.closest('td').classList.remove('d-none');
      montoInput.disabled = false;
    } else {
      montoInput.value = '0.00';
      montoInput.closest('td').classList.add('d-none');
      montoInput.disabled = true;
    }
  }

  validateStep1() {
    const errors = [];
    const vFecha = document.getElementById('vFecha').value.trim();
    const vBaseNombre = document.getElementById('vBaseNombre').value.trim();
    const vCodigo_base = document.getElementById('vCodigo_base').value.trim();

    if (!this.dateRegex.test(vFecha)) {
      errors.push('vFecha no es valida');
    }
    if (!vBaseNombre || !vCodigo_base) {
      errors.push('Selecciona una base valida');
    }

    const detalle = this.getDetalleItems();
    if (!detalle.length) {
      errors.push('Agrega al menos un producto en vDetalleAjuste');
    }

    const productosInvalidos = detalle.filter((item) => !this.productos.find((prod) => String(prod.codigo_producto) === String(item.vcodigo_producto)));
    if (productosInvalidos.length) {
      errors.push('vcodigo_producto debe existir en la lista de productos');
    }

    const cantidadRealErrores = detalle.filter((item) => !this.decimalRegex.test(String(item.Vcantidad_real)));
    if (cantidadRealErrores.length) {
      errors.push('Vcantidad_real debe ser un numero con hasta 2 decimales');
    }

    const montoErrores = detalle.filter(
      (item) => item.Vcantidad > 0 && !this.decimalRegex.test(String(item.Vmonto))
    );
    if (montoErrores.length) {
      errors.push('Vmonto es obligatorio para lineas AJE');
    }

    return errors;
  }

  getDetalleItems() {
    const rows = Array.from(this.detalleBody.querySelectorAll('tr'));
    return rows
      .map((row) => {
        const codigoProducto = row.querySelector('input[name="vcodigo_producto"]').value.trim();
        const nombreProducto = row.querySelector('input[name="vNombreProducto"]').value.trim();
        const cantidadSistema = row.querySelector('input[name="Vcantidad_sistema"]').value.trim();
        const cantidadReal = row.querySelector('input[name="Vcantidad_real"]').value.trim();
        const cantidad = row.querySelector('input[name="Vcantidad"]').value.trim();
        const monto = row.querySelector('input[name="Vmonto"]').value.trim();
        return {
          vcodigo_producto: codigoProducto,
          vNombreProducto: nombreProducto,
          Vcantidad_sistema: cantidadSistema,
          Vcantidad_real: cantidadReal,
          Vcantidad: cantidad,
          Vmonto: monto
        };
      })
      .filter((item) => item.vcodigo_producto || item.Vcantidad_real || item.vNombreProducto);
  }

  updateReview() {
    const detalle = this.getDetalleItems();
    const reviewDetalle = document.getElementById('reviewDetalle');
    reviewDetalle.innerHTML = '';

    let totalAje = 0;
    let totalAjs = 0;
    let totalCero = 0;
    let montoTotal = 0;

    detalle.forEach((item) => {
      const cantidad = Number(item.Vcantidad || 0);
      const monto = Number(item.Vmonto || 0);
      let tipo = 'AJS';
      if (cantidad > 0) {
        tipo = 'AJE';
        totalAje += 1;
        montoTotal += monto;
      } else if (cantidad < 0) {
        totalAjs += 1;
      } else {
        totalCero += 1;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.vNombreProducto || item.vcodigo_producto}</td>
        <td class="text-end">${cantidad.toFixed(2)}</td>
        <td class="text-end">${tipo === 'AJE' ? monto.toFixed(2) : '0.00'}</td>
        <td>${tipo}</td>
      `;
      reviewDetalle.appendChild(tr);
    });

    const reviewTotals = document.getElementById('reviewTotals');
    reviewTotals.innerHTML = `
      <div>Lineas AJE: <strong>${totalAje}</strong></div>
      <div>Lineas AJS: <strong>${totalAjs}</strong></div>
      <div>Lineas AJS (cantidad 0): <strong>${totalCero}</strong></div>
      <div>Monto total AJE: <strong>${montoTotal.toFixed(2)}</strong></div>
    `;
  }

  async loadInitialData() {
    try {
      this.setLoading(true, 'Cargando datos...');
      const [initRes, basesRes, productosRes] = await Promise.all([
        fetch('/api/init'),
        fetch('/api/bases'),
        fetch('/api/productos')
      ]);

      const initData = await initRes.json();
      if (!initData.ok) {
        throw new Error(initData.message || 'No se pudo inicializar');
      }
      document.getElementById('vFecha').value = initData.data.vFecha || '';
      document.getElementById('vNumdocumentostock_AJE').value = initData.data.vNumdocumentostock_AJE || '';
      document.getElementById('vNumdocumentostock_AJS').value = initData.data.vNumdocumentostock_AJS || '';

      const basesData = await basesRes.json();
      if (!basesData.ok) {
        throw new Error(basesData.message || 'No se pudieron cargar bases');
      }
      this.bases = basesData.data || [];
      this.fillDataList('basesList', this.bases, 'codigo_base');

      const productosData = await productosRes.json();
      if (!productosData.ok) {
        throw new Error(productosData.message || 'No se pudieron cargar productos');
      }
      this.productos = productosData.data || [];
      this.fillDataList('productosList', this.productos, 'codigo_producto');
    } catch (error) {
      this.showAlert(error.message || 'Error cargando datos');
    } finally {
      this.setLoading(false);
    }
  }

  fillDataList(listId, items, codeKey) {
    const dataList = document.getElementById(listId);
    dataList.innerHTML = '';
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.nombre;
      option.label = `${item[codeKey]} - ${item.nombre}`;
      dataList.appendChild(option);
    });
  }

  async submitAjuste() {
    try {
      this.setLoading(true, 'Registrando ajuste...');
      const payload = {
        vFecha: document.getElementById('vFecha').value.trim(),
        vCodigo_base: document.getElementById('vCodigo_base').value.trim(),
        vDetalleAjuste: this.getDetalleItems()
      };

      const response = await fetch('/api/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.message || 'Error registrando ajuste');
      }
      this.showResult('Ajuste registrado', 'El ajuste se registro correctamente.');
      this.setStep(3);
      await this.loadSqlLogs();
    } catch (error) {
      this.showResult('Error en el ajuste', error.message || 'No se pudo registrar el ajuste', true);
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
      const response = await fetch('/api/sql-logs');
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
    document.getElementById('ajusteForm').reset();
    document.getElementById('vCodigo_base').value = '';
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
