// Frontend en JavaScript moderno (ES6+), sin frameworks:
// módulos, async/await, fetch, template literals, desestructuración.

const API = '/api';

const $ = (selector) => document.querySelector(selector);

const escapeHtml = (texto = '') =>
  String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);

const ETIQUETAS = { pendiente: 'Por vencer', vencida: 'Vencida', presentada: 'Presentada' };

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // FastAPI devuelve {detail: "..."} o {detail: [{msg: ...}]} en errores de validación
    const { detail } = data ?? {};
    const mensaje = Array.isArray(detail) ? detail.map((d) => d.msg).join('; ') : detail;
    throw new Error(mensaje || `Error ${res.status}`);
  }
  return data;
}

function toast(mensaje, tipo = 'ok') {
  const el = $('#toast');
  el.textContent = mensaje;
  el.className = `show ${tipo}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = ''), 3000);
}

function textoDias(dias, estado) {
  if (estado === 'presentada') return '';
  if (dias === 0) return 'vence hoy';
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
}

async function cargarResumen() {
  const filas = await api('/clientes/resumen');
  $('#tabla-resumen tbody').innerHTML = filas.length
    ? filas.map(({ razon_social, ruc, por_vencer, vencidas, presentadas }) => `
        <tr>
          <td>${escapeHtml(razon_social)}</td>
          <td class="mono">${escapeHtml(ruc)}</td>
          <td class="num">${por_vencer}</td>
          <td class="num ${vencidas ? 'alerta' : ''}">${vencidas}</td>
          <td class="num">${presentadas}</td>
        </tr>`).join('')
    : '<tr><td colspan="5" class="vacio">Sin clientes.</td></tr>';
}

async function cargarObligaciones() {
  const estado = $('#filtro-estado').value;
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  const filas = await api(`/obligaciones${query}`);
  $('#tabla-obligaciones tbody').innerHTML = filas.length
    ? filas.map((o) => `
        <tr>
          <td>${o.fecha_vencimiento}<small>${textoDias(o.dias_restantes, o.estado)}</small></td>
          <td>${escapeHtml(o.razon_social)}</td>
          <td title="${escapeHtml(o.tipo_nombre)}">${escapeHtml(o.tipo)}</td>
          <td class="mono">${o.periodo}</td>
          <td><span class="badge ${o.estado}">${ETIQUETAS[o.estado]}</span></td>
          <td>${o.estado === 'presentada' ? '' : `<button class="small" data-id="${o.id}">Marcar presentada</button>`}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="vacio">No hay obligaciones con ese filtro.</td></tr>';
}

const refrescar = () => Promise.all([cargarResumen(), cargarObligaciones()]);

// --- Eventos ---------------------------------------------------------------

$('#filtro-estado').addEventListener('change', () => cargarObligaciones().catch((e) => toast(e.message, 'error')));

// Delegación de eventos: un solo listener para todos los botones de la tabla.
$('#tabla-obligaciones').addEventListener('click', async (ev) => {
  const boton = ev.target.closest('button[data-id]');
  if (!boton) return;
  boton.disabled = true;
  try {
    await api(`/obligaciones/${boton.dataset.id}/presentar`, { method: 'POST' });
    toast('Obligación marcada como presentada');
    await refrescar();
  } catch (e) {
    toast(e.message, 'error');
    boton.disabled = false;
  }
});

$('#form-cliente').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const form = ev.target;
  const { ruc, razon_social, email } = Object.fromEntries(new FormData(form));
  try {
    const cliente = await api('/clientes', {
      method: 'POST',
      body: { ruc, razon_social, email: email || null },
    });
    toast(`Cliente creado con ${cliente.obligaciones_generadas} obligaciones`);
    form.reset();
    await refrescar();
  } catch (e) {
    toast(e.message, 'error');
  }
});

$('#form-generar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try {
    const { creadas, periodo } = await api('/obligaciones/generar', {
      method: 'POST',
      body: { periodo: $('#periodo').value },
    });
    toast(creadas ? `${creadas} obligaciones creadas para ${periodo}` : `El período ${periodo} ya estaba generado`);
    await refrescar();
  } catch (e) {
    toast(e.message, 'error');
  }
});

// Período por defecto: el mes anterior (último mes cerrado).
const hoy = new Date();
const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
$('#periodo').value = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`;

refrescar().catch((e) => toast(e.message, 'error'));
