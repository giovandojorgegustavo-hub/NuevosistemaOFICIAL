const i18n = {
  es: {
    title: 'Borrar FCC',
    subtitle: 'Control transaccional de facturas de compra',
    statusReady: 'Ready',
    wizardTitle: 'CU3004 - Borrar FCC',
    wizardHint: 'Selecciona una FCC vigente y eliminala si no tiene referencias.',
    searchLabel: 'Buscar FCC / proveedor',
    searchPlaceholder: 'Numero FCC o proveedor',
    refresh: 'Actualizar',
    colFecha: 'Fecha',
    colNumero: 'Numero FCC',
    colProveedor: 'Proveedor',
    colMonto: 'Monto',
    colSaldo: 'Saldo',
    colAccion: 'Accion',
    delete: 'Borrar',
    empty: 'No hay FCC pendientes para el filtro actual.',
    loading: 'Procesando...',
    confirmTitle: 'Confirmar borrado',
    confirmText: 'Se eliminara la FCC {doc} del proveedor {prov}. Esta accion es irreversible.',
    motivoLabel: 'Motivo (opcional)',
    cancel: 'Cancelar',
    confirmDelete: 'Borrar FCC',
    okDeleted: 'FCC eliminada correctamente.',
    fetchError: 'No se pudo cargar el listado de FCC.',
    deleteError: 'No se pudo borrar la FCC.',
    refPartidas: 'No se puede borrar: la FCC tiene notas/partidas relacionadas.',
    refPagos: 'No se puede borrar: la FCC tiene pagos aplicados.',
    refStock: 'No se puede borrar: la FCC tiene movimientos de stock vinculados.',
    refGastos: 'No se puede borrar: la FCC esta vinculada a gastos.',
    notFound: 'La FCC ya no existe o fue borrada por otro usuario.'
  },
  en: {
    title: 'Delete FCC',
    subtitle: 'Transactional purchase invoice control',
    statusReady: 'Ready',
    wizardTitle: 'CU3004 - Delete FCC',
    wizardHint: 'Pick an active FCC and delete it if it has no references.',
    searchLabel: 'Search FCC / supplier',
    searchPlaceholder: 'FCC number or supplier',
    refresh: 'Refresh',
    colFecha: 'Date',
    colNumero: 'FCC Number',
    colProveedor: 'Supplier',
    colMonto: 'Amount',
    colSaldo: 'Balance',
    colAccion: 'Action',
    delete: 'Delete',
    empty: 'No pending FCC for the current filter.',
    loading: 'Processing...',
    confirmTitle: 'Confirm deletion',
    confirmText: 'FCC {doc} for supplier {prov} will be deleted. This action is irreversible.',
    motivoLabel: 'Reason (optional)',
    cancel: 'Cancel',
    confirmDelete: 'Delete FCC',
    okDeleted: 'FCC deleted successfully.',
    fetchError: 'Could not load FCC list.',
    deleteError: 'Could not delete FCC.',
    refPartidas: 'Cannot delete: FCC has related notes/partitions.',
    refPagos: 'Cannot delete: FCC has applied payments.',
    refStock: 'Cannot delete: FCC has stock movements.',
    refGastos: 'Cannot delete: FCC is linked to expenses.',
    notFound: 'FCC no longer exists or was removed by another user.'
  }
};

class BorrarFCCApp {
  constructor() {
    this.state = {
      lang: this.detectLang(),
      selected: null,
      rows: []
    };

    this.dom = {
      formAlert: document.getElementById('formAlert'),
      formSuccess: document.getElementById('formSuccess'),
      searchInput: document.getElementById('searchInput'),
      refreshBtn: document.getElementById('refreshBtn'),
      fccBody: document.getElementById('fccBody'),
      loadingOverlay: document.getElementById('loadingOverlay'),
      confirmText: document.getElementById('confirmText'),
      motivoInput: document.getElementById('motivoInput'),
      confirmDeleteBtn: document.getElementById('confirmDeleteBtn')
    };

    this.confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    this.applyTranslations();
    this.bindEvents();
    this.loadFCC();
  }

  detectLang() {
    const lang = (navigator.language || 'es').toLowerCase();
    return lang.startsWith('es') ? 'es' : 'en';
  }

  t(key) {
    return i18n[this.state.lang][key] || i18n.es[key] || key;
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = this.t(el.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = this.t(el.dataset.i18nPlaceholder);
    });
  }

  bindEvents() {
    this.dom.refreshBtn.addEventListener('click', () => this.loadFCC());
    this.dom.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.loadFCC();
      }
    });

    this.dom.confirmDeleteBtn.addEventListener('click', () => this.submitDelete());

    this.dom.fccBody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-action="delete"]');
      if (!btn) return;

      const idx = Number(btn.dataset.idx);
      const row = this.state.rows[idx];
      if (!row) return;
      this.openConfirm(row);
    });
  }

  setLoading(isLoading) {
    this.dom.loadingOverlay.classList.toggle('d-none', !isLoading);
    this.dom.refreshBtn.disabled = isLoading;
    this.dom.confirmDeleteBtn.disabled = isLoading;
  }

  clearMessages() {
    this.dom.formAlert.classList.add('d-none');
    this.dom.formSuccess.classList.add('d-none');
    this.dom.formAlert.textContent = '';
    this.dom.formSuccess.textContent = '';
  }

  showError(message) {
    this.dom.formSuccess.classList.add('d-none');
    this.dom.formAlert.textContent = message;
    this.dom.formAlert.classList.remove('d-none');
  }

  showSuccess(message) {
    this.dom.formAlert.classList.add('d-none');
    this.dom.formSuccess.textContent = message;
    this.dom.formSuccess.classList.remove('d-none');
  }

  formatMoney(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(this.state.lang === 'es' ? 'es-PE' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderRows() {
    if (!this.state.rows.length) {
      this.dom.fccBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">${this.escapeHtml(this.t('empty'))}</td>
        </tr>
      `;
      return;
    }

    this.dom.fccBody.innerHTML = this.state.rows
      .map((row, idx) => {
        const proveedor = `${row.codigo_provedor} - ${row.nombre_provedor || ''}`;
        return `
          <tr>
            <td>${this.escapeHtml(row.fecha || '')}</td>
            <td>${this.escapeHtml(row.num_documento_compra)}</td>
            <td>${this.escapeHtml(proveedor)}</td>
            <td class="text-end">${this.escapeHtml(this.formatMoney(row.monto))}</td>
            <td class="text-end">${this.escapeHtml(this.formatMoney(row.saldo))}</td>
            <td>
              <button class="btn btn-sm btn-danger" data-action="delete" data-idx="${idx}">${this.escapeHtml(this.t('delete'))}</button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  async loadFCC() {
    this.clearMessages();
    this.setLoading(true);

    try {
      const params = new URLSearchParams();
      const search = this.dom.searchInput.value.trim();
      if (search) params.set('search', search);

      const response = await fetch(`./api/fcc-disponibles?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'ERROR_FCC_LISTADO');
      }

      this.state.rows = Array.isArray(payload.data) ? payload.data : [];
      this.renderRows();
    } catch (error) {
      this.showError(this.t('fetchError'));
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }

  openConfirm(row) {
    this.state.selected = row;
    this.dom.motivoInput.value = '';
    const text = this.t('confirmText')
      .replace('{doc}', String(row.num_documento_compra || ''))
      .replace('{prov}', String(row.codigo_provedor || ''));
    this.dom.confirmText.textContent = text;
    this.confirmModal.show();
  }

  mapDeleteError(code) {
    if (code === 'REFERENCIADA_PARTIDAS') return this.t('refPartidas');
    if (code === 'REFERENCIADA_PAGOS') return this.t('refPagos');
    if (code === 'REFERENCIADA_STOCK') return this.t('refStock');
    if (code === 'REFERENCIADA_GASTOS') return this.t('refGastos');
    if (code === 'FCC_NO_ENCONTRADA') return this.t('notFound');
    return this.t('deleteError');
  }

  async submitDelete() {
    const selected = this.state.selected;
    if (!selected) return;

    this.clearMessages();
    this.setLoading(true);

    try {
      const response = await fetch('./api/borrar-fcc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_documento_compra: selected.tipo_documento_compra,
          num_documento_compra: selected.num_documento_compra,
          codigo_provedor: selected.codigo_provedor,
          motivo: this.dom.motivoInput.value.trim()
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || 'ERROR_BORRAR_FCC');
      }

      this.confirmModal.hide();
      this.showSuccess(this.t('okDeleted'));
      await this.loadFCC();
    } catch (error) {
      this.confirmModal.hide();
      this.showError(this.mapDeleteError(error.message));
      console.error(error);
    } finally {
      this.setLoading(false);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new BorrarFCCApp();
});
