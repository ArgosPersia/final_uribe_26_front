const API_VENTAS = 'http://localhost:8080/api/ventas';

const CATALOGO = {
    "Camisa Polo Slim Fit Algodon":  200000,
    "Jeans Classic Blue Denim":       180000,
    "Chaqueta Bomber Impermeable":    350000,
    "Camiseta Basica Cuello V":        85000,
    "Bermuda Cargo Beige":            120000,
    "Saco Cuello Tortuga Lana":       220000,
};

let todasLasVentas = [];

// ── Al cargar la pagina ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }

    const nombre = localStorage.getItem('nombreUsuario');
    if (nombre) document.getElementById('topbarUser').textContent = nombre.toUpperCase();

    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    cargarVentas();
    document.getElementById('producto').addEventListener('change', calcularTotal);
});

// ── Cambiar entre vistas ──────────────────────────────────────
function cambiarVista(vista, btn) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById('vistaVentas').style.display   = vista === 'ventas'   ? 'flex' : 'none';
    document.getElementById('vistaAnalitica').style.display = vista === 'analitica' ? 'flex' : 'none';

    if (vista === 'analitica') {
        actualizarStats();
        ejecutarQuery('todas');
    }
}

// ── Calcula el total automaticamente ─────────────────────────
function calcularTotal() {
    const productoVal = document.getElementById('producto').value;
    const cantidadVal = parseInt(document.getElementById('cantidad').value) || 0;
    const precio      = CATALOGO[productoVal] || 0;
    document.getElementById('precioUnitario').value = precio;
    document.getElementById('total').value          = precio * cantidadVal;
}

// ── Registrar venta ───────────────────────────────────────────
async function registrarVenta() {
    const producto       = document.getElementById('producto').value;
    const talla          = document.getElementById('talla').value;
    const cantidadRaw    = document.getElementById('cantidad').value;
    const vendedor       = document.getElementById('vendedor').value.trim();
    const precioUnitario = parseInt(document.getElementById('precioUnitario').value);
    const total          = parseFloat(document.getElementById('total').value);
    const fecha          = document.getElementById('fecha').value;
    const cantidad       = parseInt(cantidadRaw);

    // Validaciones en el front antes de enviar
    if (!producto || !talla || !vendedor || !fecha) {
        showAlert('alertVenta', 'Complete todos los campos.', 'error'); return;
    }
    if (isNaN(cantidad) || cantidad < 1 || cantidad > 99) {
        showAlert('alertVenta', 'La cantidad debe ser entre 1 y 99.', 'error'); return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ ]{3,}$/.test(vendedor)) {
        showAlert('alertVenta', 'El nombre del vendedor solo puede contener letras (mínimo 3 caracteres).', 'error'); return;
    }

    const body = { producto, precioUnitario, talla, cantidad, vendedor, total, fecha };

    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(API_VENTAS, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
            body:    JSON.stringify(body)
        });
        const data = await res.json();

        if (res.ok || res.status === 201) {
            mostrarEstadoBadge(data.estado);
            showAlert('alertVenta', data.message, data.estado === 'LIMPIA' ? 'success' : 'error');
            limpiarFormulario();
            cargarVentas();
        } else {
            showAlert('alertVenta', data.message || 'Error al registrar la venta.', 'error');
        }
    } catch {
        showAlert('alertVenta', 'No se pudo conectar al servidor.', 'error');
    }
}

// ── Cargar ventas ─────────────────────────────────────────────
async function cargarVentas() {
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(API_VENTAS, {
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        if (res.ok) {
            todasLasVentas = await res.json();
            renderizarTabla(todasLasVentas);
        }
    } catch {
        console.warn('No se pudo cargar el historial.');
    }
}

// ── Filtrar ventas ────────────────────────────────────────────
function filtrarVentas(filtro, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (filtro === 'todas') renderizarTabla(todasLasVentas);
    else renderizarTabla(todasLasVentas.filter(v => v.estado === filtro));
}

// ── Renderizar tabla ventas ───────────────────────────────────
function renderizarTabla(ventas) {
    const tbody = document.getElementById('tablaBody');
    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = `<tr class="tabla-vacia"><td colspan="7">No hay ventas registradas aún</td></tr>`;
        return;
    }
    tbody.innerHTML = ventas.map(v => `
        <tr>
            <td>${v.producto || '—'}</td>
            <td>${v.talla    || '—'}</td>
            <td>${v.cantidad || '—'}</td>
            <td>${v.vendedor || '—'}</td>
            <td>$${Number(v.total || 0).toLocaleString('es-CO')}</td>
            <td>${v.fecha    || '—'}</td>
            <td><span class="pill pill-${(v.estado||'').toLowerCase()}">${v.estado || '—'}</span></td>
        </tr>`).join('');
}

// ══════════════════════════════════════════════════════════════
// ANALÍTICA — replica las queries del Python
// ══════════════════════════════════════════════════════════════

function actualizarStats() {
    const limpias   = todasLasVentas.filter(v => v.estado === 'LIMPIA');
    const invalidas = todasLasVentas.filter(v => v.estado === 'INVALIDA');
    const sumaLimpias = limpias.reduce((acc, v) => acc + (v.total || 0), 0);

    document.getElementById('statTotal').textContent     = todasLasVentas.length;
    document.getElementById('statLimpias').textContent   = limpias.length;
    document.getElementById('statInvalidas').textContent = invalidas.length;
    document.getElementById('statSuma').textContent      = '$' + sumaLimpias.toLocaleString('es-CO');
}

function ejecutarQuery(tipo) {
    let resultado = [];
    let label     = '';

    // Query 1 — ventas > 500k  (equivale al .query("total > 500000") del Python)
    if (tipo === 'mayores500k') {
        resultado = todasLasVentas.filter(v => v.total > 500000);
        label = 'Ventas con total > $500.000';
    }
    // Query 2 — talla M y total > 300k  (equivale al .query("total > 300000 and talla == 'M'"))
    else if (tipo === 'tallaM300k') {
        resultado = todasLasVentas.filter(v => v.total > 300000 && v.talla === 'M');
        label = 'Ventas talla M con total > $300.000';
    }
    else if (tipo === 'limpias') {
        resultado = todasLasVentas.filter(v => v.estado === 'LIMPIA');
        label = 'Ventas limpias (pasaron validación del analítico)';
    }
    else if (tipo === 'invalidas') {
        resultado = todasLasVentas.filter(v => v.estado === 'INVALIDA');
        label = 'Ventas inválidas (rechazadas por el analítico)';
    }
    else {
        resultado = todasLasVentas;
        label = 'Todas las ventas registradas';
    }

    document.getElementById('queryLabel').textContent = `Mostrando: ${label} (${resultado.length} registros)`;
    renderizarTablaAnalitica(resultado);
    actualizarStats();
}

// Query 3 — por vendedor (equivale al .query("vendedor == 'X' or vendedor == 'Y'"))
function buscarPorVendedor() {
    const v1 = document.getElementById('vendedor1').value.trim().toLowerCase();
    const v2 = document.getElementById('vendedor2').value.trim().toLowerCase();

    if (!v1) {
        document.getElementById('queryLabel').textContent = 'Ingrese al menos un nombre de vendedor.';
        return;
    }

    const resultado = todasLasVentas.filter(v => {
        const nombre = (v.vendedor || '').toLowerCase();
        return nombre.includes(v1) || (v2 && nombre.includes(v2));
    });

    const labelVend = v2 ? `"${v1}" o "${v2}"` : `"${v1}"`;
    document.getElementById('queryLabel').textContent =
        `Ventas de vendedor ${labelVend} (${resultado.length} registros)`;
    renderizarTablaAnalitica(resultado);
}

function renderizarTablaAnalitica(ventas) {
    const tbody = document.getElementById('analiticaBody');
    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = `<tr class="tabla-vacia"><td colspan="8">Sin resultados para esta consulta</td></tr>`;
        return;
    }
    tbody.innerHTML = ventas.map(v => `
        <tr>
            <td>${v.producto      || '—'}</td>
            <td>${v.talla         || '—'}</td>
            <td>${v.cantidad      || '—'}</td>
            <td>${v.vendedor      || '—'}</td>
            <td>$${Number(v.precioUnitario || 0).toLocaleString('es-CO')}</td>
            <td>$${Number(v.total || 0).toLocaleString('es-CO')}</td>
            <td>${v.fecha         || '—'}</td>
            <td><span class="pill pill-${(v.estado||'').toLowerCase()}">${v.estado || '—'}</span></td>
        </tr>`).join('');
}

// ── Utilidades ────────────────────────────────────────────────
function mostrarEstadoBadge(estado) {
    const badge = document.getElementById('estadoBadge');
    badge.style.display = 'flex';
    if (estado === 'LIMPIA') {
        badge.className = 'estado-badge limpia';
        badge.innerHTML = '✓ &nbsp;Venta validada por el analítico — LIMPIA';
    } else {
        badge.className = 'estado-badge invalida';
        badge.innerHTML = '✗ &nbsp;Venta con datos inválidos — INVALIDA';
    }
    setTimeout(() => { badge.style.display = 'none'; }, 5000);
}

function limpiarFormulario() {
    document.getElementById('producto').value       = '';
    document.getElementById('talla').value          = '';
    document.getElementById('cantidad').value       = '';
    document.getElementById('vendedor').value       = '';
    document.getElementById('precioUnitario').value = '';
    document.getElementById('total').value          = '';
    document.getElementById('fecha').value          = new Date().toISOString().split('T')[0];
}

function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('nombreUsuario');
    window.location.href = 'login.html';
}
// Variable para controlar la instancia del gráfico
let chartInstancia = null;

// 1. FUNCIÓN PARA ACTUALIZAR LA GRÁFICA
function actualizarGrafica(ventas) {
    const canvas = document.getElementById('miGrafica');
    if (!canvas) return; // Seguridad por si no ha cargado el HTML
    
    const ctx = canvas.getContext('2d');
    
    // Solo tomamos las ventas LIMPIAS para la estadística financiera
    const limpias = ventas.filter(v => v.estado === 'LIMPIA');

    // Agrupamos el total de dinero por vendedor
    const resumenVendedores = {};
    limpias.forEach(v => {
        const nombre = v.vendedor || 'Desconocido';
        resumenVendedores[nombre] = (resumenVendedores[nombre] || 0) + (v.total || 0);
    });

    const nombres = Object.keys(resumenVendedores);
    const totales = Object.values(resumenVendedores);

    // Si ya existe un gráfico, lo destruimos para que no se solape al actualizar
    if (chartInstancia) {
        chartInstancia.destroy();
    }

    // Creamos el nuevo gráfico
    chartInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nombres,
            datasets: [{
                label: 'Vendido en COP ($)',
                data: totales,
                backgroundColor: 'rgba(74, 144, 226, 0.7)',
                borderColor: 'rgba(74, 144, 226, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString('es-CO');
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// 2. FUNCIÓN PARA BORRAR EL HISTORIAL EN JAVA
async function confirmarBorrado() {
    if (confirm("¿Estás seguro de borrar TODAS las ventas? Esta acción limpiará la base de datos H2.")) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(API_VENTAS + '/borrar-todo', {
                method: 'DELETE',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            
            if (res.ok) {
                alert("Historial eliminado correctamente.");
                todasLasVentas = [];
                renderizarTabla([]);
                renderizarTablaAnalitica([]);
                actualizarStats();
                if (chartInstancia) chartInstancia.destroy();
            } else {
                alert("Error al intentar borrar el historial.");
            }
        } catch (error) {
            alert("No se pudo conectar con el servidor para borrar.");
        }
    }
}