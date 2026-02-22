document.addEventListener('DOMContentLoaded', () => {
    const boardContainer = document.getElementById('board'); // CORREGIDO: 'board-container' a 'board'
    const refreshBtn = document.getElementById('btn-refresh');
    
    // Modal Elements
    let packageModal = null;
    const modalClient = document.getElementById('modal-client');
    const modalTime = document.getElementById('modal-time');
    const modalAddress = document.getElementById('modal-address');
    const modalGridBody = document.getElementById('modal-grid-body');
    const modalFooter = document.getElementById('modal-footer-actions');

    // State
    let columnsDef = [];

    // Initialize
    init();

    async function fetchWithFallback(urls, options) {
        let lastError = null;
        for (const url of urls) {
            try {
                const res = await fetch(url, options);
                if (!res.ok) {
                    if (res.status === 404) continue;
                    const text = await res.text();
                    throw new Error(text || `HTTP ${res.status}`);
                }
                return await res.json();
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('No disponible');
    }

    function init() {
        loadBoard();
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadBoard);
        }
    }

    async function loadBoard() {
        if (!boardContainer) {
            console.error("El contenedor del tablero ('#board') no fue encontrado.");
            return;
        }
        boardContainer.innerHTML = `
            <div class="d-flex justify-content-center w-100 align-items-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando tablero...</span>
                </div>
            </div>`;

        try {
            // 1. Load Columns (Tablero)
            const tabResponse = await fetch('/api/board-config');
            if (!tabResponse.ok) throw new Error('Error cargando tablero');
            columnsDef = await tabResponse.json();

            // 2. Load Packages
            const packages = await fetchWithFallback(['/api/packages', '/api/paquetes']);

            renderBoard(columnsDef, packages);

        } catch (error) {
            console.error(error);
            boardContainer.innerHTML = `
                <div class="alert alert-danger m-4" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    No se pudieron cargar los datos: ${error.message}
                </div>`;
        }
    }

    function renderBoard(columns, packages) {
        if (!boardContainer) return;
        boardContainer.innerHTML = '';

        // Create Columns
        columns.forEach(col => {
            const colDiv = document.createElement('div');
            colDiv.className = 'kanban-column';
            colDiv.dataset.ordinal = col.ordinal;

            // Header
            const header = document.createElement('div');
            header.className = 'column-header';
            header.innerHTML = `
                <h6>${col.titulo}</h6>
                <span class="badge bg-secondary rounded-pill count-badge">0</span>
            `;

            // Body (Container for cards)
            const body = document.createElement('div');
            body.className = 'column-body';
            body.id = `col-body-${col.ordinal}`;

            colDiv.appendChild(header);
            colDiv.appendChild(body);
            boardContainer.appendChild(colDiv);
        });

        // Distribute Packages into Columns
        packages.forEach(pkg => {
            // get_paquetes returns a field 'columna' which matches 'ordinal'
            const targetColId = pkg.columna; 
            const targetBody = document.getElementById(`col-body-${targetColId}`);

            if (targetBody) {
                const card = createPackageCard(pkg);
                targetBody.appendChild(card);
            }
        });

        // Update counts
        columns.forEach(col => {
            const body = document.getElementById(`col-body-${col.ordinal}`);
            const countBadge = body.previousElementSibling.querySelector('.count-badge');
            if(countBadge) countBadge.textContent = body.children.length;
        });
    }

    function createPackageCard(pkg) {
        const card = document.createElement('div');
        card.className = 'card package-card';
        // Store data for modal
        card.dataset.json = JSON.stringify(pkg);

        card.innerHTML = `
            <div class="card-body">
                <span class="card-id">#${pkg.codigo_paquete}</span>
                <div class="card-client">${pkg.nombre_cliente || 'Sin Nombre'}</div>
                <div class="card-address">
                    <i class="bi bi-geo-alt-fill text-danger small"></i> 
                    ${pkg.concatenarpuntoentrega || 'Sin Dirección'}
                </div>
            </div>
        `;

        // Double Click Event
        card.addEventListener('dblclick', () => openPackageModal(pkg));

        return card;
    }

    async function openPackageModal(pkg) {
        const modalEl = document.getElementById('packageModal');
        if (!packageModal && modalEl) {
            packageModal = new bootstrap.Modal(modalEl);
        }
        if (!packageModal) {
            console.error("El modal no pudo ser inicializado.");
            return;
        }

        // 1. Fill Basic Info
        if (modalClient) modalClient.textContent = pkg.nombre_cliente;
        
        // Format Time from fecha_registro
        const dateObj = new Date(pkg.fecha_registro);
        if (modalTime) modalTime.textContent = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (modalAddress) modalAddress.textContent = pkg.concatenarpuntoentrega;

        // 2. Load Grid (Products)
        if (modalGridBody) modalGridBody.innerHTML = '<tr><td colspan="3" class="text-center">Cargando productos...</td></tr>';
        
        try {
            const products = await fetchWithFallback([
                `/api/details/${pkg.tipo_documento}/${pkg.codigo_paquete}`,
                `/api/paquetes/${pkg.codigo_paquete}/productos?tipo_documento=${encodeURIComponent(pkg.tipo_documento)}`
            ]);
            
            renderProductGrid(products);
        } catch (e) {
            if (modalGridBody) modalGridBody.innerHTML = `<tr><td colspan="3" class="text-danger text-center">Error: ${e.message}</td></tr>`;
        }

        // 3. Render Buttons based on Column
        renderModalButtons(pkg.columna);

        // Show Modal
        packageModal.show();
    }

    function renderProductGrid(products) {
        if (!modalGridBody) return;
        modalGridBody.innerHTML = '';
        if (products.length === 0) {
            modalGridBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Sin productos</td></tr>';
            return;
        }

        products.forEach((prod, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prod.ordinal || (index + 1)}</td>
                <td>${prod.nombre}</td>
                <td class="text-end fw-bold">${prod.cantidad}</td>
            `;
            modalGridBody.appendChild(row);
        });
    }

    function renderModalButtons(colOrdinal) {
        if (!modalFooter) return;
        // Clear previous dynamic buttons
        modalFooter.innerHTML = '';

        let actionBtn = null;

        // Logic from requirements
        // 1: Empacar, 2: Despachar, 3: Liquidar, 4: Procesar Standby
        switch (parseInt(colOrdinal)) {
            case 1:
                actionBtn = createBtn('Empacar', 'btn-primary', 'bi-box-seam');
                break;
            case 2:
                actionBtn = createBtn('Despachar', 'btn-success', 'bi-truck');
                break;
            case 3:
                actionBtn = createBtn('Liquidar Paquete', 'btn-warning', 'bi-cash-coin', true);
                break;
            case 4:
                actionBtn = createBtn('Procesar Standby', 'btn-info text-white', 'bi-hourglass-split');
                break;
            default:
                // No specific action for 5, 6, etc.
                break;
        }

        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                if (parseInt(colOrdinal) === 3) {
                    liquidarpaquete();
                } else {
                    alert(`Acción "${actionBtn.textContent.trim()}" no implementada en este demo.`);
                }
            });
            modalFooter.appendChild(actionBtn);
        }

        // Always add Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn-secondary';
        closeBtn.dataset.bsDismiss = 'modal';
        closeBtn.textContent = 'Cerrar';
        modalFooter.appendChild(closeBtn);
    }

    function createBtn(text, classColor, iconClass, isLiquidate = false) {
        const btn = document.createElement('button');
        btn.className = `btn ${classColor} me-auto`; // me-auto pushes close button to right
        btn.innerHTML = `<i class="bi ${iconClass} me-2"></i>${text}`;
        if (isLiquidate) btn.id = 'btn-liquidar';
        return btn;
    }

    async function liquidarpaquete() {
        const btn = document.getElementById('btn-liquidar');
        const originalText = btn ? btn.innerHTML : '';
        
        if(btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...';
        }

        try {
            const response = await fetch('/api/liquidar', { method: 'POST' });
            if (!response.ok) throw new Error('Error al liquidar paquete');
            
            const data = await response.json();
            
            if (data.url) {
                // Open URL in new tab
                window.open(data.url, '_blank');
                // Close modal and refresh
                if (packageModal) packageModal.hide();
                loadBoard();
            }
        } catch (error) {
            console.error(error);
            alert('Error: ' + error.message);
            if(btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    }
});
