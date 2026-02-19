document.addEventListener('DOMContentLoaded', () => {
    fetchTablero();
});

async function fetchTablero() {
    const boardContainer = document.getElementById('board');
    
    try {
        const response = await fetch('/api/tablero');
        const data = await response.json();

        if (!data.columnas) return;

        // Limpiar tablero antes de renderizar
        boardContainer.innerHTML = '';

        // 1. Crear Columnas dinámicas ordenadas por el campo 'ordinal'
        data.columnas.sort((a, b) => a.ordinal - b.ordinal).forEach(col => {
            const columnHtml = `
                <div class="kanban-column" id="col-wrapper-${col.ordinal}">
                    <div class="column-header">
                        <span class="badge bg-primary me-2">${col.ordinal}</span>
                        <strong>${col.titulo.toUpperCase()}</strong>
                        <span class="badge bg-light text-dark border ms-auto counter" id="cnt-${col.ordinal}">0</span>
                    </div>
                    <div class="column-body" id="body-${col.ordinal}">
                        </div>
                </div>
            `;
            boardContainer.innerHTML += columnHtml;
        });

        // 2. Insertar Paquetes en sus respectivas columnas
        let counters = {};

        data.paquetes.forEach(paq => {
            const targetBody = document.getElementById(`body-${paq.ordinal}`);
            
            if (targetBody) {
                // Incrementar contador
                counters[paq.ordinal] = (counters[paq.ordinal] || 0) + 1;
                
                // Crear Card
                const card = document.createElement('div');
                card.className = 'card package-card shadow-sm border-0';
                card.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-info-subtle text-info-emphasis small">#${paq.codigo_paquete}</span>
                            <small class="text-muted">${formatTime(paq.fecha_actualizado)}</small>
                        </div>
                        <h6 class="mb-1 fw-bold">${paq.nombre_cliente}</h6>
                        <p class="mb-0 text-muted small">
                            <i class="bi bi-geo-alt-fill text-danger"></i> ${paq.concatenarpuntoentrega}
                        </p>
                    </div>
                `;
                targetBody.appendChild(card);
            }
        });

        // 3. Actualizar los contadores visuales
        Object.keys(counters).forEach(ordinal => {
            const badge = document.getElementById(`cnt-${ordinal}`);
            if (badge) badge.innerText = counters[ordinal];
        });

    } catch (error) {
        console.error("Error cargando el tablero:", error);
        boardContainer.innerHTML = `<div class="alert alert-danger">Error al conectar con el servidor.</div>`;
    }
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}