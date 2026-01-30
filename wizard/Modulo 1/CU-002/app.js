class FormWizard {
  constructor() {
    this.steps = Array.from(document.querySelectorAll('.step'));
    this.currentStep = 0;
    this.progressBar = document.getElementById('progressBar');
    this.nextBtn = document.getElementById('nextBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.loadingState = document.getElementById('loadingState');
    this.alertArea = document.getElementById('alertArea');
    this.statusHint = document.getElementById('statusHint');
    this.paquetesBody = document.getElementById('paquetesBody');
    this.detalleBody = document.getElementById('detalleBody');
    this.puntoEntrega = document.getElementById('puntoEntrega');
    this.recibe = document.getElementById('recibe');
    this.summaryCard = document.getElementById('summaryCard');
    this.selectedBadge = document.getElementById('selectedBadge');

    this.selectedPaquete = null;
    this.selectedIndex = null;
    this.detalleRows = [];
    this.ordinal = null;

    this.init();
  }

  init() {
    this.setLanguage();
    this.applyLanguage();
    this.updateSelectedBadge();
    this.updateButtons();
    this.attachEvents();
    this.loadPaquetes();
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

  attachEvents() {
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.prevBtn.addEventListener('click', () => this.handlePrev());
    document.getElementById('refreshPaquetes').addEventListener('click', () => this.loadPaquetes());
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
    this.prevBtn.disabled = this.currentStep === 0;
    if (this.currentStep === 0) {
      this.nextBtn.disabled = !this.selectedPaquete;
    } else {
      this.nextBtn.disabled = false;
    }
    this.nextBtn.textContent = this.currentStep === this.steps.length - 1 ? this.dict.pack : this.dict.next;
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    this.progressBar.style.width = `${progress}%`;
  }

  goToStep(index) {
    this.steps[this.currentStep].classList.remove('active');
    this.currentStep = index;
    this.steps[this.currentStep].classList.add('active');
    this.updateButtons();
  }

  async handleNext() {
    const valid = this.validateStep();
    if (!valid) return;

    if (this.currentStep === this.steps.length - 1) {
      await this.saveEmpaque();
      return;
    }

    this.goToStep(this.currentStep + 1);
    if (this.currentStep === 1 && this.selectedPaquete) {
      await this.loadDetalle(this.selectedPaquete.codigo, this.selectedIndex);
    }
    if (this.currentStep === 2) {
      this.renderSummary();
    }
  }

  handlePrev() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  validateStep() {
    this.clearAlert();

    if (this.currentStep === 0) {
      const codeRegex = /^[A-Za-z0-9-]{1,}$/;
      if (!this.selectedPaquete || !codeRegex.test(this.selectedPaquete.codigo)) {
        this.showAlert('warning', this.dict.errors.selectPaquete);
        return false;
      }
      return true;
    }

    if (this.currentStep === 2) {
      const confirm = document.getElementById('confirmCheck').checked;
      if (!confirm) {
        this.showAlert('warning', this.dict.errors.confirm);
        return false;
      }
      return true;
    }

    return true;
  }

  async fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  }

  async postJson(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  }

  async loadPaquetes() {
    try {
      this.setLoading(this.dict.loadingPaquetes);
      const data = await this.fetchJson('/api/paquetes?estado=pendiente%20empacar');
      this.renderPaquetes(Array.isArray(data) ? data : []);
      this.statusHint.textContent = this.dict.statusHint;
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.errors.paquetesLoad);
    } finally {
      this.setLoading('');
    }
  }

  renderPaquetes(paquetes) {
    this.paquetesBody.innerHTML = '';
    if (!Array.isArray(paquetes) || paquetes.length === 0) {
      this.paquetesBody.innerHTML = `<tr><td colspan="6" class="text-muted">${this.dict.emptyPaquetes}</td></tr>`;
      return;
    }

    paquetes.forEach((paquete, index) => {
      const codigo = paquete.codigo_paquete || paquete.Vcodigo_paquete || paquete.vcodigo_paquete || '';
      const row = document.createElement('tr');
      row.dataset.codigo = codigo;
      row.dataset.index = String(index + 1);
      row.innerHTML = `
        <td>${codigo}</td>
        <td>${paquete.fecha_actualizado || paquete.vfecha || ''}</td>
        <td>${paquete.nombre_cliente || paquete.vnombre_cliente || ''}</td>
        <td>${paquete.num_cliente || paquete.vnum_cliente || ''}</td>
        <td>${paquete.concatenarpuntoentrega || paquete.vconcatenarpuntoentrega || ''}</td>
        <td>${paquete.concatenarnumrecibe || paquete.vconcatenarnumrecibe || ''}</td>
      `;
      row.addEventListener('click', () => this.selectPaquete(paquete, row, index + 1));
      if (this.selectedPaquete && this.selectedPaquete.codigo === codigo) {
        row.classList.add('selected');
      }
      this.paquetesBody.appendChild(row);
    });
  }

  selectPaquete(paquete, row, index) {
    const codigo = paquete.codigo_paquete || paquete.Vcodigo_paquete || paquete.vcodigo_paquete || '';
    if (!codigo) return;

    Array.from(this.paquetesBody.querySelectorAll('tr')).forEach((r) => r.classList.remove('selected'));
    row.classList.add('selected');

    this.selectedPaquete = {
      codigo,
      fecha: paquete.fecha_actualizado || paquete.vfecha || '',
      nombre_cliente: paquete.nombre_cliente || paquete.vnombre_cliente || '',
      num_cliente: paquete.num_cliente || paquete.vnum_cliente || '',
      entrega: paquete.concatenarpuntoentrega || paquete.vconcatenarpuntoentrega || '',
      recibe: paquete.concatenarnumrecibe || paquete.vconcatenarnumrecibe || ''
    };
    this.selectedIndex = Number(index) || Number(row.dataset.index) || null;
    this.updateSelectedBadge();
    this.updateButtons();
  }

  updateSelectedBadge() {
    if (this.selectedPaquete) {
      this.selectedBadge.textContent = `${this.dict.selected}: ${this.selectedPaquete.codigo}`;
      return;
    }
    this.selectedBadge.textContent = this.dict.noneSelected;
  }

  async loadDetalle(codigo, index) {
    try {
      this.setLoading(this.dict.loadingDetalle);
      const query = new URLSearchParams({ codigo });
      if (index) {
        query.set('index', String(index));
      }
      const data = await this.fetchJson(`/api/paquetes/detalle?${query.toString()}`);
      this.detalleRows = Array.isArray(data.detalle) ? data.detalle : [];
      this.ordinal = data.ordinal || 1;
      this.puntoEntrega.value = this.selectedPaquete?.entrega || '';
      this.recibe.value = this.selectedPaquete?.recibe || '';
      this.renderDetalle();
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.errors.detalleLoad);
    } finally {
      this.setLoading('');
    }
  }

  renderDetalle() {
    this.detalleBody.innerHTML = '';
    if (!Array.isArray(this.detalleRows) || this.detalleRows.length === 0) {
      this.detalleBody.innerHTML = `<tr><td colspan="2" class="text-muted">${this.dict.emptyDetalle}</td></tr>`;
      return;
    }

    this.detalleRows.forEach((row) => {
      const nombre = row.nombre_producto || row.Vnombre_producto || row.vnombre_producto || '';
      const cantidad = row.cantidad || row.vcantidad || '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${nombre}</td>
        <td>${cantidad}</td>
      `;
      this.detalleBody.appendChild(tr);
    });
  }

  renderSummary() {
    const items = this.detalleRows.length;
    this.summaryCard.innerHTML = `
      <div class="row g-3">
        <div class="col-md-4">
          <p class="text-muted mb-1">${this.dict.codigo}</p>
          <p>${this.selectedPaquete?.codigo || '-'}</p>
        </div>
        <div class="col-md-4">
          <p class="text-muted mb-1">${this.dict.entrega}</p>
          <p>${this.selectedPaquete?.entrega || '-'}</p>
        </div>
        <div class="col-md-4">
          <p class="text-muted mb-1">${this.dict.recibe}</p>
          <p>${this.selectedPaquete?.recibe || '-'}</p>
        </div>
        <div class="col-md-4">
          <p class="text-muted mb-1">${this.dict.ordinal}</p>
          <p>${this.ordinal || '-'}</p>
        </div>
        <div class="col-md-4">
          <p class="text-muted mb-1">${this.dict.items}</p>
          <p>${items}</p>
        </div>
      </div>
    `;
  }

  async saveEmpaque() {
    try {
      this.setLoading(this.dict.saving);
    const payload = {
        codigo_paquete: this.selectedPaquete?.codigo || '',
        ordinal_index: this.selectedIndex
      };
      const result = await this.postJson('/api/empaque', payload);
      this.showAlert('success', this.dict.success.replace('{id}', result.codigo_paquete || payload.codigo_paquete));
      await this.resetWizard();
    } catch (error) {
      this.showAlert('danger', error.message || this.dict.errors.save);
    } finally {
      this.setLoading('');
    }
  }

  async resetWizard() {
    this.selectedPaquete = null;
    this.selectedIndex = null;
    this.detalleRows = [];
    this.ordinal = null;
    document.getElementById('confirmCheck').checked = false;
    this.updateSelectedBadge();
    this.puntoEntrega.value = '';
    this.recibe.value = '';
    this.detalleBody.innerHTML = '';
    this.summaryCard.innerHTML = '';
    this.goToStep(0);
    await this.loadPaquetes();
  }
}

const translations = {
  es: {
    tag: 'IaaS + PaaS Global',
    title: 'Empaquetar',
    subtitle: 'Wizard multi-paso para empaquetar pedidos y registrar salidas.',
    status: 'Estado del flujo',
    statusHint: 'Selecciona un paquete pendiente para continuar.',
    refresh: 'Actualizar paquetes',
    step1Title: '1. Seleccionar paquete pendiente',
    step1Subtitle: 'Selecciona un paquete con estado pendiente de empacar.',
    step2Title: '2. Detalle del documento',
    step2Subtitle: 'Consulta los detalles del documento seleccionado.',
    step3Title: '3. Confirmar empaque',
    step3Subtitle: 'Verifica la informacion y confirma el empaque.',
    readonly: 'Solo lectura',
    ready: 'Listo para empacar',
    codigo: 'Codigo',
    fecha: 'Fecha',
    cliente: 'Cliente',
    telefono: 'Telefono',
    entrega: 'Punto entrega',
    recibe: 'Recibe',
    producto: 'Producto',
    cantidad: 'Cantidad',
    ordinal: 'Ordinal',
    items: 'Items',
    noneSelected: 'Sin seleccion',
    selected: 'Seleccionado',
    prev: 'Anterior',
    next: 'Siguiente',
    pack: 'Empacar',
    confirm: 'Confirmo la operacion.',
    loadingPaquetes: 'Cargando paquetes pendientes...',
    loadingDetalle: 'Cargando detalle del documento...',
    saving: 'Registrando empaque...',
    emptyPaquetes: 'No hay paquetes pendientes.',
    emptyDetalle: 'Sin detalle disponible.',
    success: 'Empaque registrado para paquete {id}.',
    errors: {
      selectPaquete: 'Selecciona un paquete valido antes de continuar.',
      paquetesLoad: 'No se pudieron cargar los paquetes.',
      detalleLoad: 'No se pudo cargar el detalle del documento.',
      confirm: 'Debes confirmar la operacion para continuar.',
      save: 'No se pudo registrar el empaque.'
    }
  },
  en: {
    tag: 'Global IaaS + PaaS',
    title: 'Packaging',
    subtitle: 'Multi-step wizard to package orders and register outputs.',
    status: 'Flow status',
    statusHint: 'Select a pending package to continue.',
    refresh: 'Refresh packages',
    step1Title: '1. Select pending package',
    step1Subtitle: 'Choose a package with pending packaging status.',
    step2Title: '2. Document detail',
    step2Subtitle: 'Review the selected document details.',
    step3Title: '3. Confirm packaging',
    step3Subtitle: 'Verify the information and confirm packaging.',
    readonly: 'Read-only',
    ready: 'Ready to package',
    codigo: 'Code',
    fecha: 'Date',
    cliente: 'Client',
    telefono: 'Phone',
    entrega: 'Delivery point',
    recibe: 'Receiver',
    producto: 'Product',
    cantidad: 'Quantity',
    ordinal: 'Ordinal',
    items: 'Items',
    noneSelected: 'No selection',
    selected: 'Selected',
    prev: 'Previous',
    next: 'Next',
    pack: 'Package',
    confirm: 'I confirm the operation.',
    loadingPaquetes: 'Loading pending packages...',
    loadingDetalle: 'Loading document details...',
    saving: 'Registering packaging...',
    emptyPaquetes: 'No pending packages found.',
    emptyDetalle: 'No detail available.',
    success: 'Packaging registered for package {id}.',
    errors: {
      selectPaquete: 'Select a valid package before continuing.',
      paquetesLoad: 'Unable to load packages.',
      detalleLoad: 'Unable to load document details.',
      confirm: 'You must confirm the operation to continue.',
      save: 'Unable to register packaging.'
    }
  }
};

new FormWizard();
