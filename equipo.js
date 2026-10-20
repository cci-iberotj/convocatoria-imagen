/* ═══════════════════════════════════════════════════════════
   Vista del equipo · respuestas de la convocatoria
   Lista con foto, mapa de calor de disponibilidad, ficha con
   estado y nota (se puede corregir y borrar) y exportación CSV.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let todos = [];            // lo que vino del almacén
let bloqueElegido = null;  // clave 'iso|HH' del mapa de calor, o null
let abierto = null;        // folio de la ficha abierta

/* ── Entrada ────────────────────────────────────────────── */
function pintarTextos() {
  $$('#rotulo-area, #rotulo-area-2').forEach(e => e.textContent = CONFIG.area);
  $('#titulo').textContent = CONFIG.titulo + ' · respuestas';
  CONFIG.carreras.forEach(c => $('#f-carrera').append(new Option(c, c)));
  CONFIG.estados.forEach(e => { $('#f-estado').append(new Option(e, e)); $('#ficha-estado').append(new Option(e, e)); });
  if (Almacen.modo === 'local') {
    const a = $('#aviso-motor');
    a.textContent = 'Modo local: las respuestas viven en este navegador (config.js → motor). Sirve para revisar el diseño; para la convocatoria real se cambia a Supabase.';
    a.classList.remove('oculto');
    $('#btn-muestra').classList.remove('oculto');
  } else {
    $('#btn-salir').classList.remove('oculto');
  }
}

/* Incrustado en LA PIZARRA (?incrustado): sin cabecera ni «Salir»,
   y con su sesión prestada; la pestaña de LA PIZARRA ya dice qué es. */
const INCRUSTADO = new URLSearchParams(location.search).has('incrustado');
if (INCRUSTADO) document.body.classList.add('incrustado');

async function arrancar() {
  pintarTextos();
  if (Almacen.necesitaSesion && !Almacen.sesion()) { $('#entrada').classList.remove('oculto'); return; }
  $('#entrada').classList.add('oculto');
  $('#tablero').classList.remove('oculto');
  await cargar();
}

$('#form-entrar').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target, err = $('#entrar-error');
  err.classList.add('oculto');
  try {
    await Almacen.entrar(f.elements.correo.value, f.elements.clave.value);
    await arrancar();
  } catch (e) { err.textContent = e.message; err.classList.remove('oculto'); }
});
$('#btn-salir').addEventListener('click', () => { Almacen.salir(); location.reload(); });

/* ── Datos ──────────────────────────────────────────────── */
async function cargar() {
  try {
    todos = await Almacen.listar();
  } catch (e) {
    if (e.message === 'SIN_SESION') { $('#tablero').classList.add('oculto'); $('#entrada').classList.remove('oculto'); return; }
    alert('No se pudieron leer las respuestas: ' + e.message);
    todos = [];
  }
  pintarTodo();
}
$('#btn-recargar').addEventListener('click', cargar);

function filtrados() {
  const q = $('#f-texto').value.trim().toLowerCase();
  const car = $('#f-carrera').value, est = $('#f-estado').value;
  return todos.filter(r =>
    (!q || [r.nombre, r.correo, r.telefono].some(v => String(v || '').toLowerCase().includes(q))) &&
    (!car || r.carrera === car) &&
    (!est || (r.estado || 'nueva') === est) &&
    (!bloqueElegido || (r.disponibilidad || []).includes(bloqueElegido)));
}
['#f-texto', '#f-carrera', '#f-estado'].forEach(s => $(s).addEventListener('input', pintarTodo));

function pintarTodo() {
  pintarCalor();
  pintarLista();
  const activos = todos.filter(r => r.estado !== 'descartada').length;
  $('#cuenta').textContent = todos.length + ' registros · ' + activos + ' en juego · ' +
    todos.filter(r => r.estado === 'convocada').length + ' convocados';
}

/* ── Mapa de calor ──────────────────────────────────────── */
function conteos() {
  const base = todos.filter(r => r.estado !== 'descartada');
  const c = {};
  base.forEach(r => (r.disponibilidad || []).forEach(k => { c[k] = (c[k] || 0) + 1; }));
  return c;
}
/* Escala de cuatro pasos sobre el máximo; el texto cambia a blanco
   cuando el fondo se oscurece (los dos tonos altos dan > 4.5:1). */
function tono(n, max) {
  if (!n) return ['var(--capa-1)', 'var(--tinta-tenue)'];
  const p = n / max;
  if (p <= .25) return ['var(--marca-velo)', 'var(--marca-tinta)'];
  if (p <= .5)  return ['#D9A7B0', '#191713'];
  if (p <= .75) return ['#A3505E', '#FFFFFF'];
  return ['var(--marca-solida)', '#FFFFFF'];
}
function pintarCalor() {
  const calor = $('#calor');
  calor.style.setProperty('--dias', Semana.dias.length);
  const c = conteos();
  const max = Math.max(1, ...Object.values(c));
  const frag = document.createDocumentFragment();
  frag.append(Object.assign(document.createElement('div'), { className: 'hora' }));
  Semana.dias.forEach(d => {
    const e = document.createElement('div'); e.className = 'cabeza'; e.innerHTML = d.corto + '<b>' + d.num + '</b>'; frag.append(e);
  });
  Semana.horas.forEach(h => {
    const eh = document.createElement('div'); eh.className = 'hora'; eh.textContent = Semana.hh(h); frag.append(eh);
    Semana.dias.forEach(d => {
      const k = Semana.clave(d.iso, h), n = c[k] || 0;
      const e = document.createElement('div');
      e.className = 'c' + (bloqueElegido === k ? ' elegida' : '');
      const [fondo, texto] = tono(n, max);
      e.style.background = fondo; e.style.color = texto;
      e.textContent = n || '';
      e.title = n + (n === 1 ? ' persona' : ' personas') + ' · ' + d.dia + ' ' + d.num + ', ' + Semana.hh(h);
      e.addEventListener('click', () => { bloqueElegido = bloqueElegido === k ? null : k; pintarTodo(); });
      frag.append(e);
    });
  });
  calor.replaceChildren(frag);
  const f = $('#calor-filtro');
  if (bloqueElegido) {
    const [iso, hh] = bloqueElegido.split('|');
    const d = Semana.dias.find(x => x.iso === iso);
    f.innerHTML = 'Viendo: <b>' + d.corto + ' ' + d.num + ' · ' + hh + ':00</b> <button class="btn suave chico" id="quitar-bloque">quitar</button>';
    $('#quitar-bloque').addEventListener('click', () => { bloqueElegido = null; pintarTodo(); });
  } else f.textContent = '';
}

/* ── Lista ──────────────────────────────────────────────── */
function pintarLista() {
  const lista = $('#lista');
  const vistos = filtrados();
  if (!vistos.length) {
    lista.innerHTML = '<div class="vacio">' + (todos.length ? 'Nada coincide con el filtro.' : 'Todavía no hay registros.') + '</div>';
    return;
  }
  lista.innerHTML = vistos.map(r => `
    <button class="alumno" data-folio="${esc(r.folio)}">
      ${r.foto ? `<img src="${r.foto}" alt="">` : `<div class="sinfoto">${esc((r.nombre || '?')[0])}</div>`}
      <div>
        <div class="nombre">${esc(r.nombre)} <span class="chip ${esc(r.estado || 'nueva')}">${esc(r.estado || 'nueva')}</span></div>
        <div class="linea">${esc(r.carrera)} · ${r.semestre}°</div>
        <div class="linea">${telefono(r.telefono)} · ${esc(r.correo)}</div>
      </div>
      <div class="horas"><b>${(r.disponibilidad || []).length}</b>horas</div>
    </button>`).join('');
  $$('#lista .alumno').forEach(b => b.addEventListener('click', () => abrirFicha(b.dataset.folio)));
}
const telefono = t => String(t || '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');

/* ── Ficha ──────────────────────────────────────────────── */
function abrirFicha(folio) {
  const r = todos.find(x => x.folio === folio);
  if (!r) return;
  abierto = folio;
  $('#ficha-foto').src = r.foto || '';
  $('#ficha-nombre').textContent = r.nombre;
  $('#ficha-datos').innerHTML =
    '<dt>Carrera · semestre</dt><dd>' + esc(r.carrera) + ' · ' + r.semestre + '°</dd>' +
    '<dt>Correo</dt><dd><a href="mailto:' + esc(r.correo) + '">' + esc(r.correo) + '</a></dd>' +
    '<dt>Teléfono · WhatsApp</dt><dd><a href="https://wa.me/52' + esc(r.telefono) + '" target="_blank" rel="noopener">' + telefono(r.telefono) + '</a></dd>' +
    '<dt>Registrado</dt><dd>' + fecha(r.creado) + '</dd>';
  const disp = new Set(r.disponibilidad || []);
  $('#ficha-horas').textContent = '· ' + disp.size + ' horas';
  const mini = $('#ficha-mini');
  mini.style.setProperty('--dias', Semana.dias.length);
  let h = '<div class="hora"></div>' + Semana.dias.map(d => '<div class="cabeza">' + d.corto + ' ' + d.num + '</div>').join('');
  Semana.horas.forEach(hora => {
    h += '<div class="hora">' + Semana.hh(hora) + '</div>';
    h += Semana.dias.map(d => '<div class="c' + (disp.has(Semana.clave(d.iso, hora)) ? ' si' : '') + '"></div>').join('');
  });
  mini.innerHTML = h;
  $('#ficha-estado').value = r.estado || 'nueva';
  $('#ficha-folio').value = r.folio;
  $('#ficha-nota').value = r.nota || '';
  $('#ficha-aviso').classList.add('oculto');
  $('#velo').classList.remove('oculto');
  document.body.style.overflow = 'hidden';
}
function cerrarFicha() { abierto = null; $('#velo').classList.add('oculto'); document.body.style.overflow = ''; }

/* La foto en grande: clic sobre la foto de la ficha; se cierra con
   clic en cualquier parte, con el botón o con Esc. */
function abrirLupa() {
  const r = todos.find(x => x.folio === abierto);
  if (!r || !r.foto) return;
  $('#lupa-foto').src = r.foto;
  $('#lupa-nombre').textContent = r.nombre + ' · ' + r.carrera + ' · ' + r.semestre + '°';
  $('#lupa').classList.remove('oculto');
}
function cerrarLupa() { $('#lupa').classList.add('oculto'); }
$('#ficha-foto-boton').addEventListener('click', abrirLupa);
$('#lupa').addEventListener('click', cerrarLupa);
$('#lupa-cerrar').addEventListener('click', cerrarLupa);
$('#ficha-cerrar').addEventListener('click', cerrarFicha);
$('#velo').addEventListener('click', ev => { if (ev.target === $('#velo')) cerrarFicha(); });
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  if (!$('#lupa').classList.contains('oculto')) cerrarLupa();
  else if (abierto) cerrarFicha();
});

$('#ficha-guardar').addEventListener('click', async () => {
  if (!abierto) return;
  const cambios = { estado: $('#ficha-estado').value, nota: $('#ficha-nota').value.trim(),
                    atendido_por: (Almacen.usuario() || {}).nombre || '' };
  try {
    await Almacen.actualizar(abierto, cambios);
    Object.assign(todos.find(x => x.folio === abierto), cambios);
    cerrarFicha(); pintarTodo();
  } catch (e) { const a = $('#ficha-aviso'); a.textContent = 'No se guardó: ' + e.message; a.classList.remove('oculto'); }
});
$('#ficha-borrar').addEventListener('click', async () => {
  if (!abierto) return;
  const r = todos.find(x => x.folio === abierto);
  if (!confirm('¿Borrar el registro de ' + r.nombre + '? No se puede deshacer.')) return;
  try {
    await Almacen.borrar(abierto);
    todos = todos.filter(x => x.folio !== abierto);
    cerrarFicha(); pintarTodo();
  } catch (e) { const a = $('#ficha-aviso'); a.textContent = 'No se borró: ' + e.message; a.classList.remove('oculto'); }
});

function fecha(iso) {
  if (!iso) return '';
  const f = new Date(iso);
  return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' ' + f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/* ── CSV (Excel lo abre con acentos gracias al BOM) ─────── */
$('#btn-csv').addEventListener('click', () => {
  const vistos = filtrados();
  const bloques = [];
  Semana.dias.forEach(d => Semana.horas.forEach(h => bloques.push({ k: Semana.clave(d.iso, h), t: d.corto + ' ' + d.num + ' ' + Semana.hh(h) })));
  const cab = ['folio', 'nombre', 'carrera', 'semestre', 'correo', 'telefono',
               'estado', 'nota', 'horas', 'registrado', ...bloques.map(b => b.t)];
  const filas = vistos.map(r => {
    const d = new Set(r.disponibilidad || []);
    return [r.folio, r.nombre, r.carrera, r.semestre, r.correo, r.telefono,
            r.estado || 'nueva', r.nota, d.size, r.creado, ...bloques.map(b => d.has(b.k) ? 'x' : '')];
  });
  const celda = v => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '﻿' + [cab, ...filas].map(f => f.map(celda).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'convocatoria-imagen-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

/* ── Datos de muestra (sólo modo local) ─────────────────── */
$('#btn-muestra').addEventListener('click', async () => {
  if (todos.length && !confirm('Ya hay ' + todos.length + ' registros en este navegador. ¿Borrarlos y cargar la muestra?')) return;
  localStorage.removeItem('casting.respuestas');
  const nombres = ['Ana Sofía Ramírez Torres', 'Diego Hernández Luna', 'Valeria Castillo Mora', 'Emiliano Ruiz Ochoa',
    'Regina Flores Beltrán', 'Santiago Mendoza Ríos', 'Camila Vázquez Soto', 'Mateo García Salinas',
    'Ximena López Carrillo', 'Sebastián Núñez Prado', 'Fernanda Ortiz Molina', 'Andrés Cervantes Lara',
    'Mariana Reyes Aguilar', 'Rodrigo Navarro Peña', 'Isabella Cruz Montes', 'Leonardo Gutiérrez Vela',
    'Natalia Jiménez Ponce', 'Alejandro Rojas Quintero'];
  const creado = Date.now() - 36e5 * 40;
  for (let i = 0; i < nombres.length; i++) {
    const disp = [];
    Semana.dias.forEach((d, di) => {
      /* cada quien tiene uno o dos días libres y bloques de mañana o tarde */
      if ((i + di) % 3 === 0) return;
      const manana = (i + di) % 2 === 0;
      Semana.horas.forEach(h => {
        const dentro = manana ? h < 13 : h >= 12;
        if (dentro && (h + i) % 5 !== 0) disp.push(Semana.clave(d.iso, h));
      });
    });
    const carrera = CONFIG.carreras[i % CONFIG.carreras.length];
    await Almacen.guardar({
      folio: Almacen.folio(), nombre: nombres[i], matricula: '',
      carrera, semestre: 1 + (i * 3) % CONFIG.semestres,
      correo: nombres[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ').slice(0, 2).join('.') + '@tijuana.ibero.mx',
      telefono: '664' + String(1000000 + i * 54321).slice(0, 7), instagram: '',
      foto: retrato(nombres[i], i), disponibilidad: disp,
      consentimientos: { datos: true, imagen: true }, estado: i % 7 === 6 ? 'descartada' : i % 5 === 4 ? 'convocada' : 'nueva',
      nota: '', atendido_por: '', creado: new Date(creado + i * 97e5).toISOString(),
    });
  }
  await cargar();
});
/* Un retrato inventado: iniciales sobre un tono de la paleta. */
function retrato(nombre, i) {
  const c = document.createElement('canvas'); c.width = 240; c.height = 320;
  const x = c.getContext('2d');
  const fondos = ['#7B1E2E', '#463F38', '#2F4E7A', '#106459', '#5F428A', '#75521C'];
  x.fillStyle = fondos[i % fondos.length]; x.fillRect(0, 0, 240, 320);
  x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(120, 125, 62, 0, 7); x.fill();
  x.beginPath(); x.ellipse(120, 300, 105, 95, 0, Math.PI, 0); x.fill();
  x.fillStyle = '#fff'; x.font = 'bold 64px Alverata, Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(nombre.split(' ').slice(0, 2).map(p => p[0]).join(''), 120, 128);
  return c.toDataURL('image/jpeg', .8);
}

arrancar();
