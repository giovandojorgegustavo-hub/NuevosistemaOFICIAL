class FormWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.state = {
      bases: [],
      paquetes: [],
      selected: new Map(),
      activePackage: null,
      codigoBase: null,
      google: {
        key: null,
        center: null,
        zoom: null
      }
    };

    this.cacheDom();
    this.bindEvents();
    this.init();
  }

  cacheDom() {
    this.steps = document.querySelectorAll('.wizard-step');
    this.progressBar = document.getElementById('progressBar');
    this.progressSteps = document.querySelectorAll('.progress-steps .step');
    this.alertContainer = document.getElementById('alertContainer');

    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.confirmCheck = document.getElementById('confirmCheck');

    this.vcodigoviaje = document.getElementById('vcodigoviaje');
    this.vfecha = document.getElementById('vfecha');

    this.vBaseNombre = document.getElementById('vBaseNombre');
    this.vcodigo_base = document.getElementById('vcodigo_base');
    this.basesList = document.getElementById('basesList');

    this.vnombre_motorizado = document.getElementById('vnombre_motorizado');
    this.vlink = document.getElementById('vlink');
    this.vnumero_wsp = document.getElementById('vnumero_wsp');
    this.vnum_llamadas = document.getElementById('vnum_llamadas');
    this.vnum_yape = document.getElementById('vnum_yape');
    this.vobservacion = document.getElementById('vobservacion');

    this.paquetesTableBody = document.querySelector('#paquetesTable tbody');
    this.refreshPaquetes = document.getElementById('refreshPaquetes');
    this.refreshPaquetes.disabled = true;

    this.detallePunto = document.getElementById('detallePunto');
    this.detalleRecibe = document.getElementById('detalleRecibe');
    this.detalleRegion = document.getElementById('detalleRegion');
    this.detalleLat = document.getElementById('detalleLat');
    this.detalleLng = document.getElementById('detalleLng');

    this.mapCard = document.getElementById('mapCard');
    this.mapPlaceholder = document.getElementById('mapPlaceholder');
    this.mapBadge = document.getElementById('mapBadge');

    this.sumCodigo = document.getElementById('sumCodigo');
    this.sumBase = document.getElementById('sumBase');
    this.sumMotorizado = document.getElementById('sumMotorizado');
    this.sumWsp = document.getElementById('sumWsp');
    this.sumLlamadas = document.getElementById('sumLlamadas');
    this.sumYape = document.getElementById('sumYape');
    this.sumLink = document.getElementById('sumLink');
    this.sumFecha = document.getElementById('sumFecha');
    this.sumCount = document.getElementById('sumCount');
    this.resumenTableBody = document.querySelector('#resumenTable tbody');

  }

  bindEvents() {
    this.prevBtn.addEventListener('click', () => this.prevStep());
    this.nextBtn.addEventListener('click', () => this.nextStep());
    this.saveBtn.addEventListener('click', () => this.save());

    this.vBaseNombre.addEventListener('input', (event) => this.filterBases(event.target.value));
    this.vBaseNombre.addEventListener('blur', () => this.syncBaseSelection());
    this.refreshPaquetes.addEventListener('click', () => {
      if (!this.state.codigoBase) {
        this.showAlert('Selecciona una base valida antes de actualizar paquetes.', 'warning');
        return;
      }
      this.loadPaquetes(this.state.codigoBase);
    });
    this.confirmCheck.addEventListener('change', () => {
      this.saveBtn.disabled = !this.confirmCheck.checked;
    });
  }

  async init() {
    document.documentElement.lang = navigator.language || 'es-PE';
    this.setDateTime();

    await Promise.all([this.loadBases(), this.loadNextViaje(), this.loadConfig()]);
  }

  setDateTime() {
    const now = new Date();
    const formatted = now.toLocaleString();
    this.vfecha.textContent = formatted;
  }

  async loadConfig() {
    try {
      const data = await this.fetchJSON('/api/config');
      if (data?.ok) {
        this.state.google = data.google;
      }
    } catch (error) {
      this.showAlert('No se pudo cargar configuracion de Google Maps.', 'warning');
    }
  }

  async loadBases() {
    try {
      this.setLoading(true);
      const data = await this.fetchJSON('/api/bases');
      this.state.bases = data?.data || [];
      this.renderBasesList(this.state.bases);
    } catch (error) {
      this.showAlert('Error al cargar bases.', 'danger');
    } finally {
      this.setLoading(false);
    }
  }

  async loadPaquetes(codigoBase) {
    if (!codigoBase) {
      this.paquetesTableBody.innerHTML = '';
      this.state.paquetes = [];
      this.state.selected.clear();
      this.updateSummary();
      return;
    }
    try {
      this.setLoading(true);
      const data = await this.fetchJSON(`/api/paquetes-empacados?codigo_base=${encodeURIComponent(codigoBase)}`);
      this.state.paquetes = data?.data || [];
      this.renderPaquetesTable(this.state.paquetes);
    } catch (error) {
      this.showAlert('Error al cargar paquetes empacados.', 'danger');
    } finally {
      this.setLoading(false);
    }
  }

  async loadNextViaje() {
    try {
      const data = await this.fetchJSON('/api/next-viaje');
      this.vcodigoviaje.textContent = data?.vcodigoviaje ?? '-';
    } catch (error) {
      this.vcodigoviaje.textContent = '-';
    }
  }

  renderBasesList(bases) {
    this.basesList.innerHTML = '';
    bases.forEach((base) => {
      const option = document.createElement('option');
      option.value = base.nombre;
      option.dataset.codigo = base.codigo_base;
      this.basesList.appendChild(option);
    });
  }

  filterBases(value) {
    const term = value.toLowerCase();
    const filtered = this.state.bases.filter((base) => base.nombre.toLowerCase().includes(term));
    this.renderBasesList(filtered);
    this.syncBaseSelection();
  }

  syncBaseSelection() {
    const selected = this.state.bases.find((base) => base.nombre === this.vBaseNombre.value);
    const nextCodigo = selected ? selected.codigo_base : '';
    this.vcodigo_base.value = nextCodigo;
    if (nextCodigo !== this.state.codigoBase) {
      this.state.codigoBase = nextCodigo || null;
      this.refreshPaquetes.disabled = !this.state.codigoBase;
      this.state.selected.clear();
      this.state.activePackage = null;
      this.updatePackageDetails({
        concatenarpuntoentrega: '-',
        concatenarnumrecibe: '-',
        region_entrega: '-',
        latitud: '-',
        longitud: '-'
      });
      this.loadPaquetes(this.state.codigoBase);
    }
  }

  renderPaquetesTable(paquetes) {
    this.paquetesTableBody.innerHTML = '';
    paquetes.forEach((paq) => {
      const row = document.createElement('tr');
      row.dataset.codigo = paq.codigo_paquete;
      row.innerHTML = `
        <td><input type="checkbox" class="form-check-input" data-codigo="${paq.codigo_paquete}" /></td>
        <td>${paq.codigo_paquete}</td>
        <td>${this.formatDate(paq.fecha_actualizado)}</td>
        <td>${paq.nombre_cliente}</td>
        <td>${paq.num_cliente}</td>
        <td>${paq.concatenarpuntoentrega}</td>
      `;
      row.addEventListener('click', (event) => this.onSelectPackage(paq, row, event));
      this.paquetesTableBody.appendChild(row);
    });
  }

  onSelectPackage(paquete, row, event) {
    if (event.target && event.target.type === 'checkbox') {
      this.togglePackageSelection(paquete, event.target.checked);
      event.stopPropagation();
      return;
    }

    this.paquetesTableBody.querySelectorAll('tr').forEach((tr) => tr.classList.remove('active'));
    row.classList.add('active');
    this.state.activePackage = paquete;
    this.updatePackageDetails(paquete);
  }

  togglePackageSelection(paquete, isChecked) {
    if (isChecked) {
      this.state.selected.set(paquete.codigo_paquete, paquete);
    } else {
      this.state.selected.delete(paquete.codigo_paquete);
    }
    this.updateSummary();
  }

  updatePackageDetails(paquete) {
    this.detallePunto.textContent = paquete.concatenarpuntoentrega || '-';
    this.detalleRecibe.textContent = paquete.concatenarnumrecibe || '-';
    this.detalleRegion.textContent = paquete.region_entrega || '-';
    this.detalleLat.textContent = paquete.latitud || '-';
    this.detalleLng.textContent = paquete.longitud || '-';

    const region = (paquete.region_entrega || '').toUpperCase();
    if (region === 'LIMA') {
      this.mapBadge.textContent = 'LIMA';
      this.mapCard.classList.remove('d-none');
      this.mapPlaceholder.classList.add('d-none');
      this.renderMap(paquete);
    } else {
      this.mapCard.classList.add('d-none');
      this.mapPlaceholder.classList.remove('d-none');
    }
  }

  async renderMap(paquete) {
    if (!this.state.google.key) {
      return;
    }

    await this.loadGoogleMaps();
    const lat = Number(paquete.latitud) || this.state.google.center?.lat || -12.0464;
    const lng = Number(paquete.longitud) || this.state.google.center?.lng || -77.0428;
    const center = { lat, lng };

    if (!this.mapInstance) {
      this.mapInstance = new window.google.maps.Map(document.getElementById('map'), {
        center,
        zoom: this.state.google.zoom || 12,
        disableDefaultUI: true,
        zoomControl: true,
        draggable: true
      });
      this.marker = new window.google.maps.Marker({
        position: center,
        map: this.mapInstance,
        title: 'Entrega'
      });
    } else {
      this.mapInstance.setCenter(center);
      this.marker.setPosition(center);
    }
  }

  loadGoogleMaps() {
    if (this.mapsLoaded) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.state.google.key}`;
      script.async = true;
      script.onload = () => {
        this.mapsLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  updateSummary() {
    const selected = Array.from(this.state.selected.values());
    this.sumCodigo.textContent = this.vcodigoviaje.textContent;
    this.sumBase.textContent = this.vBaseNombre.value || '-';
    this.sumMotorizado.textContent = this.vnombre_motorizado.value || '-';
    this.sumWsp.textContent = this.vnumero_wsp.value || '-';
    this.sumLlamadas.textContent = this.vnum_llamadas.value || '-';
    this.sumYape.textContent = this.vnum_yape.value || '-';
    this.sumLink.textContent = this.vlink.value || '-';
    this.sumFecha.textContent = this.vfecha.textContent;
    this.sumCount.textContent = selected.length;

    this.resumenTableBody.innerHTML = '';
    selected.forEach((paq) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${paq.codigo_paquete}</td>
        <td>${paq.nombre_cliente}</td>
        <td>${paq.concatenarpuntoentrega}</td>
      `;
      this.resumenTableBody.appendChild(row);
    });
  }

  nextStep() {
    if (!this.validateStep(this.currentStep)) {
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep += 1;
      this.updateStep();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
      this.updateStep();
    }
  }

  updateStep() {
    this.steps.forEach((step) => {
      step.classList.add('d-none');
      if (Number(step.dataset.step) === this.currentStep) {
        step.classList.remove('d-none');
      }
    });

    this.progressSteps.forEach((step, index) => {
      step.classList.toggle('active', index < this.currentStep);
    });

    const progress = (this.currentStep / this.totalSteps) * 100;
    this.progressBar.style.width = `${progress}%`;

    this.prevBtn.disabled = this.currentStep === 1;
    this.nextBtn.classList.toggle('d-none', this.currentStep === this.totalSteps);
    this.saveBtn.classList.toggle('d-none', this.currentStep !== this.totalSteps);

    if (this.currentStep === this.totalSteps) {
      this.updateSummary();
    }
  }

  validateStep(step) {
    this.clearAlert();
    if (step === 1) {
      const linkRegex = /^(https?:\/\/|www\.)\S+$/i;
      if (!this.vcodigo_base.value) {
        this.showAlert('Selecciona una base valida.', 'danger');
        return false;
      }
      if (!this.vnombre_motorizado.value.trim()) {
        this.showAlert('El nombre del motorizado es requerido.', 'danger');
        return false;
      }
      if (!linkRegex.test(this.vlink.value.trim())) {
        this.showAlert('El link debe iniciar con http://, https:// o www.', 'danger');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (this.state.selected.size === 0) {
        this.showAlert('Selecciona al menos un paquete.', 'danger');
        return false;
      }
      return true;
    }

    return true;
  }

  async save() {
    this.clearAlert();
    if (!this.confirmCheck.checked) {
      this.showAlert('Debes confirmar antes de guardar.', 'danger');
      return;
    }
    try {
      this.setLoading(true);
      const payload = {
        vcodigoviaje: this.vcodigoviaje.textContent,
        vcodigo_base: this.vcodigo_base.value,
        vBaseNombre: this.vBaseNombre.value,
        vnombre_motorizado: this.vnombre_motorizado.value.trim(),
        vnumero_wsp: this.vnumero_wsp.value.trim(),
        vnum_llamadas: this.vnum_llamadas.value.trim(),
        vnum_yape: this.vnum_yape.value.trim(),
        vlink: this.vlink.value.trim(),
        vobservacion: this.vobservacion.value.trim(),
        vfecha: new Date().toISOString(),
        paquetes: Array.from(this.state.selected.values()).map((paq, index) => ({
          vcodigo_paquete: paq.codigo_paquete,
          vregion_entrega: paq.region_entrega,
          vlatitud: paq.latitud,
          vlongitud: paq.longitud,
          vindex: index
        }))
      };

      const data = await this.fetchJSON('/api/guardar-viaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (data?.ok) {
        this.showAlert('Viaje guardado correctamente.', 'success');
        this.resetWizard();
      } else {
        this.showAlert(data?.message || 'No se pudo guardar el viaje.', 'danger');
      }
    } catch (error) {
      this.showAlert('Error al guardar el viaje.', 'danger');
    } finally {
      this.setLoading(false);
    }
  }

  resetWizard() {
    this.currentStep = 1;
    this.state.selected.clear();
    this.confirmCheck.checked = false;
    this.saveBtn.disabled = true;
    this.paquetesTableBody.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = false;
    });

    this.vBaseNombre.value = '';
    this.vcodigo_base.value = '';
    this.state.codigoBase = null;
    this.refreshPaquetes.disabled = true;
    this.paquetesTableBody.innerHTML = '';
    this.vnombre_motorizado.value = '';
    this.vnumero_wsp.value = '';
    this.vnum_llamadas.value = '';
    this.vnum_yape.value = '';
    this.vlink.value = '';
    this.vobservacion.value = '';
    this.setDateTime();
    this.updateSummary();
    this.updateStep();
    this.loadNextViaje();
  }

  showAlert(message, type) {
    this.alertContainer.innerHTML = `
      <div class="alert alert-${type}" role="alert">${message}</div>
    `;
  }

  clearAlert() {
    this.alertContainer.innerHTML = '';
  }

  setLoading(isLoading) {
    const buttons = [this.prevBtn, this.nextBtn, this.saveBtn, this.refreshPaquetes];
    buttons.forEach((btn) => {
      if (!btn) return;
      btn.disabled = isLoading;
      btn.classList.toggle('disabled', isLoading);
    });
  }

  async fetchJSON(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Network error');
    }
    return response.json();
  }

  formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
}

new FormWizard();
