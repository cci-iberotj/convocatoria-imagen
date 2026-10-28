/* ═══════════════════════════════════════════════════════════
   Vista del equipo · respuestas de la convocatoria
   Lista con foto, mapa de calor de disponibilidad, ficha con
   estado y nota (se puede corregir y borrar) y exportación CSV.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const semestreTexto = n => Number(n) === 0 ? CONFIG.egresado : n + '°';
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let todos = [];            // lo que vino del almacén
let bloqueElegido = null;  // clave 'iso|HH' del mapa de calor, o null
let filtroCarrera = '';    // carrera elegida en el panel de arriba, o ''
let filtroGenero = '';     // 'mujer' | 'hombre' | 'otro' | 'sin' | ''
const GENEROS = Object.fromEntries((CONFIG.generos || []).map(g => [g.id, g.nombre]));
const generoDe = r => r.genero || 'sin';
const COLORES = CONFIG.coloresCarreras || [];
const colorDe = carrera => COLORES[CONFIG.carreras.indexOf(carrera)] || '#655C54';
let abierto = null;        // folio de la ficha abierta

/* ── Entrada ────────────────────────────────────────────── */
function pintarTextos() {
  $$('#rotulo-area, #rotulo-area-2').forEach(e => e.textContent = CONFIG.area);
  $('#titulo').textContent = CONFIG.titulo + ' · respuestas';
  CONFIG.estados.forEach(e => { $('#f-estado').append(new Option(e, e)); $('#ficha-estado').append(new Option(e, e)); });
  $('#ficha-sesion').append(new Option('Sin sesión', ''));
  (CONFIG.sesiones || []).forEach(s => $('#ficha-sesion').append(new Option(sesionTitulo(s), s.id)));
  $('#ficha-genero').append(new Option('Sin dato', ''));
  (CONFIG.generos || []).forEach(g => $('#ficha-genero').append(new Option(g.nombre, g.id)));
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
/* Aviso de arriba: «Cargando…», o el error si algo falla (en vez de
   quedarse en blanco sin decir nada). */
function estadoCarga(texto, error) {
  const e = $('#estado-carga');
  if (!e) return;
  e.textContent = texto || '';
  e.classList.toggle('oculto', !texto);
  e.classList.toggle('peligro', !!error);
  e.classList.toggle('info', !error);
}
function pintarSeguro() {
  try { pintarTodo(); return true; }
  catch (e) {
    console.error(e);
    estadoCarga('Algo falló al mostrar las respuestas: ' + e.message + '. Toca «Actualizar»; si sigue, manda captura de este aviso.', true);
    return false;
  }
}
/* Primero los datos sin fotos (rápido) y se pinta; luego las fotos. */
async function cargar() {
  estadoCarga('Cargando respuestas…');
  try {
    todos = await Almacen.listar({ sinFotos: true });
    /* Las horas de los registros viejos venían con fecha: se pasan a día de la semana. */
    todos.forEach(r => { r.disponibilidad = (r.disponibilidad || []).map(Semana.normalizar); });
  } catch (e) {
    if (e.message === 'SIN_SESION') { estadoCarga(''); $('#tablero').classList.add('oculto'); $('#entrada').classList.remove('oculto'); return; }
    estadoCarga('No se pudieron leer las respuestas: ' + e.message + '. Toca «Actualizar».', true);
    todos = [];
    pintarSeguro();
    return;
  }
  if (!pintarSeguro()) return;
  estadoCarga('Cargando fotos…');
  try {
    const fotos = new Map((await Almacen.fotos()).map(f => [f.folio, f.foto]));
    todos.forEach(r => { if (fotos.has(r.folio)) r.foto = fotos.get(r.folio); });
    if (pintarSeguro()) estadoCarga('');
  } catch (e) {
    estadoCarga('Las respuestas están completas, pero las fotos no cargaron: ' + e.message + '. Toca «Actualizar».', true);
  }
}
$('#btn-recargar').addEventListener('click', cargar);

function filtrados() {
  const q = $('#f-texto').value.trim().toLowerCase();
  const car = filtroCarrera, est = $('#f-estado').value;
  return todos.filter(r =>
    (!q || [r.nombre, r.correo, r.telefono].some(v => String(v || '').toLowerCase().includes(q))) &&
    (!car || r.carrera === car) &&
    (!filtroGenero || generoDe(r) === filtroGenero) &&
    (!est || (r.estado || 'nueva') === est) &&
    (!bloqueElegido || (r.disponibilidad || []).includes(bloqueElegido)));
}
['#f-texto', '#f-estado', '#f-orden'].forEach(s => $(s).addEventListener('input', pintarTodo));

/* ── Sesiones ───────────────────────────────────────────── */
function sesionTitulo(s) {
  return fechaLarga(s.dia) + ' · ' + s.hora + ' · ' + s.nombre;
}
/* Horas de la sesión (desde la cadena '12:00–14:00') que el alumno marcó. */
function horasEn(r, s) {
  const [a, b] = s.hora.split('–').map(x => parseInt(x, 10));
  const disp = new Set(r.disponibilidad || []);
  const puede = [];
  for (let h = a; h < b; h++) if (disp.has(Semana.clave(Semana.diaDeFecha(s.dia), h))) puede.push(h);
  return { total: b - a, puede };
}
/* ── WhatsApp ───────────────────────────────────────────── */
const ICONO_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* Número completo para wa.me: 52 + 10 dígitos, o 1 si la lada es de EE. UU. */
function numeroWA(t) {
  const d = String(t || '').replace(/\D/g, '');
  if (d.length > 10) return d;                                  // ya trae país
  return ((CONFIG.ladasEstadosUnidos || []).includes(d.slice(0, 3)) ? '1' : '52') + d;
}
function primerNombre(r) {
  const n = String(r.nombre || '').trim().split(/\s+/)[0] || '';
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}
/* Sus horas dentro de la sesión: si puede todas, la de la sesión; si es
   escalonada, de su primera hora marcada a la última. */
function horarioDe(r, s) {
  const h = horasEn(r, s);
  const [a, b] = s.hora.split('–').map(x => parseInt(x, 10));
  const ini = h.puede.length && h.puede.length < h.total ? Math.min(...h.puede) : a;
  const fin = h.puede.length && h.puede.length < h.total ? Math.max(...h.puede) + 1 : b;
  return String(ini).padStart(2, '0') + ':00 a ' + String(fin).padStart(2, '0') + ':00 h';
}
function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  const dia = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][f.getDay()];
  return dia.charAt(0).toUpperCase() + dia.slice(1) + ' ' + d + ' de ' + MESES[m - 1];
}
function tipoMensaje(r) { return r.sesion ? 'convocado' : 'no-convocado'; }
function mensajeDe(r) {
  const s = (CONFIG.sesiones || []).find(x => x.id === r.sesion);
  if (s) {
    return CONFIG.mensajes.convocado
      .replaceAll('{nombre}', primerNombre(r))
      .replaceAll('{fecha}', fechaLarga(s.dia))
      .replaceAll('{horario}', horarioDe(r, s))
      .replaceAll('{lugar}', s.lugar || 'te lo confirmamos por aquí')
      .replaceAll('{ropa}', s.ropa || CONFIG.mensajes.ropa || '');
  }
  /* No convocado: si su carrera ni siquiera tiene sesión todavía, el
     mensaje lo dice así; si sí tiene y no coincidió, el de horario. */
  const plantilla = carreraTieneSesion(r.carrera) ? CONFIG.mensajes.noConvocado
    : (CONFIG.mensajes.carreraSinSesion || CONFIG.mensajes.noConvocado);
  return plantilla.replaceAll('{nombre}', primerNombre(r)).replaceAll('{carrera}', r.carrera);
}
function carreraTieneSesion(carrera) {
  return (CONFIG.sesiones || []).some(s => s.carreras.includes(carrera));
}
/* ¿Ya se le mandó el mensaje que le toca ahora? Si cambió de convocado a
   no convocado (o al revés), el aviso anterior ya no cuenta. */
function avisadoAhora(r) {
  const [tipo, cuando] = String(r.avisado || '').split('|');
  return tipo === tipoMensaje(r) ? cuando : '';
}
/* Abrir WhatsApp no quiere decir que se mandó: después de abrirlo, el
   botón pregunta «¿Se envió?» y sólo el «Sí» lo marca en la base. */
const porConfirmar = new Map();   // folio → 'whatsapp' | 'correo'
function botonWA(r, grande) {
  if (porConfirmar.has(r.folio)) {
    return `<span class="wa-confirma" data-wa-caja="${esc(r.folio)}">¿Se envió?
      <button type="button" class="wa si" data-wa-si="${esc(r.folio)}">Sí</button>
      <button type="button" class="wa no" data-wa-no="${esc(r.folio)}">No</button></span>`;
  }
  const cuando = avisadoAhora(r);
  const canal = String(r.avisado || '').split('|')[2] === 'correo' ? 'correo' : 'WhatsApp';
  const titulo = 'WhatsApp +' + numeroWA(r.telefono) + ' · mensaje de ' + (r.sesion ? 'convocado' : 'no convocado');
  const correo = `<button type="button" class="wa correo" data-correo="${esc(r.folio)}" title="Correo a ${esc(r.correo)} (abre Outlook y copia el mensaje)">✉${grande ? ' Por correo' : ''}</button>`;
  if (cuando) {
    return `<button type="button" class="wa hecho" data-wa="${esc(r.folio)}" title="${esc(titulo)} · enviado por ${canal} ${esc(fecha(cuando))}. Clic para abrirlo otra vez.">${ICONO_WA}${grande ? 'Enviado por ' + canal + ' ' + esc(fecha(cuando)) + ' · reenviar' : '✓ Avisado'}</button>${correo}`;
  }
  return `<button type="button" class="wa" data-wa="${esc(r.folio)}" title="${esc(titulo)}">${ICONO_WA}${grande ? (r.sesion ? 'Mandar convocatoria por WhatsApp' : 'Mandar aviso de no convocado') : 'Avisar'}</button>${correo}`;
}
/* Abre WhatsApp con el mensaje; queda «por confirmar» hasta el Sí. */
function mandarWA(folio) {
  const r = todos.find(x => x.folio === folio);
  if (!r) return;
  /* Directo a api.whatsapp.com y no a wa.me: el enlace corto, al redirigir,
     cambia cada emoji por «�» (comprobado el 23-oct-2026). */
  window.open('https://api.whatsapp.com/send?phone=' + numeroWA(r.telefono) + '&text=' + encodeURIComponent(mensajeDe(r)), '_blank', 'noopener');
  porConfirmar.set(folio, 'whatsapp');
  pintarTodo();
  if (abierto === folio) pintarWAFicha(r);
}
/* Correo: abre un correo nuevo en Outlook (o el programa de correo de la
   computadora) con asunto y mensaje, y además copia el mensaje al
   portapapeles, porque algunos Outlook descomponen acentos y emojis que
   llegan por la liga: en ese caso se borra el cuerpo y se pega. */
function mandarCorreo(folio) {
  const r = todos.find(x => x.folio === folio);
  if (!r) return;
  const asunto = r.sesion ? CONFIG.mensajes.asuntoConvocado : CONFIG.mensajes.asuntoNoConvocado;
  const cuerpo = mensajeDe(r);
  try { navigator.clipboard.writeText(cuerpo).catch(() => {}); } catch (e) {}
  const a = document.createElement('a');
  a.href = 'mailto:' + encodeURIComponent(r.correo) + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
  document.body.append(a); a.click(); a.remove();
  aviso('Se abrió el correo para ' + r.correo + '. El mensaje también quedó copiado: si en Outlook se ve raro, bórralo y pega con Ctrl + V.');
  porConfirmar.set(folio, 'correo');
  pintarTodo();
  if (abierto === folio) pintarWAFicha(r);
}
/* ── Recordatorio ──────────────────────────────────────────
   Se guarda en la misma columna «avisado», como cuarto dato:
   'convocado|fecha del aviso|canal|fecha del recordatorio'. Igual que el
   aviso, abrir WhatsApp no lo marca: hay que confirmar con «Sí». */
const porRecordar = new Set();
let colaRecordar = null;   // { sesion, folio } mientras se recorre una sesión
function recordadoAhora(r) {
  const p = String(r.avisado || '').split('|');
  return r.sesion && p[0] === 'convocado' ? (p[3] || '') : '';
}
function cuandoEs(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dias = Math.round((new Date(y, m - 1, d) - new Date(new Date().toDateString())) / 864e5);
  return dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : 'el ' + fechaLarga(iso).toLowerCase();
}
function mensajeRecordatorio(r) {
  const s = (CONFIG.sesiones || []).find(x => x.id === r.sesion);
  if (!s) return '';
  const cuando = cuandoEs(s.dia);
  const ropa = (s.ropa || CONFIG.mensajes.ropa || '')
    .replace('para ese día', cuando === 'hoy' ? 'para hoy' : cuando === 'mañana' ? 'para mañana' : 'para ese día');
  return CONFIG.mensajes.recordatorio
    .replaceAll('{nombre}', primerNombre(r))
    .replaceAll('{cuando}', cuando)
    .replaceAll('{fecha}', fechaLarga(s.dia))
    .replaceAll('{horario}', horarioDe(r, s))
    .replaceAll('{lugar}', s.lugar || 'te lo confirmamos por aquí')
    .replaceAll('{ropa}', ropa);
}
function abrirRecordatorio(r) {
  window.open('https://api.whatsapp.com/send?phone=' + numeroWA(r.telefono) + '&text=' + encodeURIComponent(mensajeRecordatorio(r)), '_blank', 'noopener');
  porRecordar.add(r.folio);
}
function mandarRecordatorio(folio) {
  const r = todos.find(x => x.folio === folio);
  if (!r) return;
  abrirRecordatorio(r);
  pintarTodo();
}
async function marcarRecordado(folio, si) {
  const r = todos.find(x => x.folio === folio);
  porRecordar.delete(folio);
  if (!r) return;
  const p = String(r.avisado || '').split('|');
  const ahora = new Date().toISOString();
  /* Si nunca se le marcó el aviso, el recordatorio también lo cuenta como avisado. */
  const cambios = { avisado: si
    ? ['convocado', p[0] === 'convocado' && p[1] ? p[1] : ahora, p[0] === 'convocado' && p[2] ? p[2] : 'whatsapp', ahora].join('|')
    : p.slice(0, 3).join('|') };
  try {
    await Almacen.actualizar(folio, cambios);
    Object.assign(r, cambios);
  } catch (e) { alert('No se guardó la marca: ' + e.message); }
  pintarTodo();
}
function botonRecordar(r) {
  if (colaRecordar && colaRecordar.folio === r.folio) {
    return `<span class="wa-confirma" title="Contesta en la barra de abajo">🔔 …</span>`;
  }
  if (porRecordar.has(r.folio)) {
    return `<span class="wa-confirma" title="¿Se envió el recordatorio?">🔔
      <button type="button" class="wa si" data-rec-si="${esc(r.folio)}">Sí</button>
      <button type="button" class="wa no" data-rec-no="${esc(r.folio)}">No</button></span>`;
  }
  const cuando = recordadoAhora(r);
  return cuando
    ? `<button type="button" class="wa recordar hecho" data-recordar="${esc(r.folio)}" title="Recordatorio enviado ${esc(fecha(cuando))}. Clic para abrirlo otra vez.">🔔✓</button>`
    : `<button type="button" class="wa recordar" data-recordar="${esc(r.folio)}" title="Mandar el recordatorio de la sesión por WhatsApp">🔔</button>`;
}
/* «Recordar a todos»: abre al primero que falta; la barra de abajo pregunta
   si se envió y, con «Sí, siguiente», lo marca y abre al que sigue. */
function pendientesRecordar(sesionId) {
  return todos.filter(r => r.sesion === sesionId && r.estado !== 'descartada' && !recordadoAhora(r))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
function siguienteRecordar(sesionId, saltar) {
  const pend = pendientesRecordar(sesionId).filter(r => !(saltar || []).includes(r.folio));
  const r = pend[0];
  if (!r) { colaRecordar = null; pintarTodo(); aviso('Listo: ya no queda nadie de esta sesión sin recordatorio.'); return; }
  abrirRecordatorio(r);
  colaRecordar = { sesion: sesionId, folio: r.folio, saltados: saltar || [] };
  pintarTodo();
}
function pintarColaRecordar() {
  let b = $('#cola-recordar');
  if (!colaRecordar) { if (b) b.remove(); return; }
  const s = (CONFIG.sesiones || []).find(x => x.id === colaRecordar.sesion);
  const r = todos.find(x => x.folio === colaRecordar.folio);
  if (!s || !r) { colaRecordar = null; if (b) b.remove(); return; }
  const total = todos.filter(x => x.sesion === s.id && x.estado !== 'descartada').length;
  const listos = total - pendientesRecordar(s.id).length;
  if (!b) { b = document.createElement('div'); b.id = 'cola-recordar'; document.body.append(b); }
  b.innerHTML = `<div><small>Recordatorio · ${esc(s.nombre)} · ${listos} de ${total}</small>
      <b>¿Se le envió a ${esc(primerNombre(r))}?</b></div>
    <button type="button" class="btn primario chico" data-cola="si">Sí, siguiente</button>
    <button type="button" class="btn secundario chico" data-cola="no">No, saltar</button>
    <button type="button" class="btn suave chico" data-cola="fin">Terminar</button>`;
  b.querySelector('[data-cola="si"]').onclick = () => {
    const c = colaRecordar;
    marcarRecordado(c.folio, true);                  // se guarda mientras
    siguienteRecordar(c.sesion, c.saltados.concat(c.folio));   // abre al siguiente ya
  };
  b.querySelector('[data-cola="no"]').onclick = () => {
    const c = colaRecordar;
    porRecordar.delete(c.folio);
    siguienteRecordar(c.sesion, c.saltados.concat(c.folio));
  };
  b.querySelector('[data-cola="fin"]').onclick = () => {
    porRecordar.delete(colaRecordar.folio); colaRecordar = null; pintarTodo();
  };
}
function aviso(texto) {
  let t = $('#aviso-flotante');
  if (!t) { t = document.createElement('div'); t.id = 'aviso-flotante'; document.body.append(t); }
  t.textContent = texto; t.classList.add('visible');
  clearTimeout(aviso.reloj); aviso.reloj = setTimeout(() => t.classList.remove('visible'), 6000);
}
/* Guarda (o quita) la marca de avisado. */
async function marcarAvisado(folio, si) {
  const r = todos.find(x => x.folio === folio);
  const canal = porConfirmar.get(folio) || 'whatsapp';
  porConfirmar.delete(folio);
  if (!r) return;
  const cambios = { avisado: si ? tipoMensaje(r) + '|' + new Date().toISOString() + '|' + canal : '' };
  try {
    await Almacen.actualizar(folio, cambios);
    Object.assign(r, cambios);
  } catch (e) { alert('No se guardó la marca: ' + e.message); }
  pintarTodo();
  if (abierto === folio) pintarWAFicha(r);
}
function conectarWA(raiz) {
  const parar = (b, fn) => b.addEventListener('click', ev => { ev.stopPropagation(); fn(); });
  $$('[data-wa]', raiz).forEach(b => parar(b, () => mandarWA(b.dataset.wa)));
  $$('[data-correo]', raiz).forEach(b => parar(b, () => mandarCorreo(b.dataset.correo)));
  $$('[data-recordar]', raiz).forEach(b => parar(b, () => mandarRecordatorio(b.dataset.recordar)));
  $$('[data-rec-si]', raiz).forEach(b => parar(b, () => marcarRecordado(b.dataset.recSi, true)));
  $$('[data-rec-no]', raiz).forEach(b => parar(b, () => { porRecordar.delete(b.dataset.recNo); pintarTodo(); }));
  $$('[data-recordar-todos]', raiz).forEach(b => parar(b, () => siguienteRecordar(b.dataset.recordarTodos)));
  $$('[data-wa-si]', raiz).forEach(b => parar(b, () => marcarAvisado(b.dataset.waSi, true)));
  $$('[data-wa-no]', raiz).forEach(b => parar(b, () => { porConfirmar.delete(b.dataset.waNo); pintarTodo(); const r = todos.find(x => x.folio === b.dataset.waNo); if (r && abierto === r.folio) pintarWAFicha(r); }));
  $$('[data-wa-quitar]', raiz).forEach(b => parar(b, () => marcarAvisado(b.dataset.waQuitar, false)));
}
function pintarWAFicha(r) {
  const caja = $('#ficha-wa');
  if (!caja) return;
  caja.innerHTML = botonWA(r, true) + '<small>+' + esc(numeroWA(r.telefono)) + ' · ' + esc(r.correo) + '</small>'
    + (avisadoAhora(r) && !porConfirmar.has(r.folio) ? '<button type="button" class="btn suave chico" data-wa-quitar="' + esc(r.folio) + '">Desmarcar</button>' : '');
  conectarWA(caja);
}

function pintarSesiones() {
  const caja = $('#sesiones');
  if (!caja) return;
  caja.innerHTML = (CONFIG.sesiones || []).map(s => {
    const d = Semana.dias.find(x => x.iso === s.dia);
    const gente = todos.filter(r => r.sesion === s.id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const candidatos = todos.filter(r => r.sesion !== s.id && r.estado !== 'descartada')
      .sort((a, b) => (s.carreras.includes(b.carrera) - s.carreras.includes(a.carrera)) || (horasEn(b, s).puede.length - horasEn(a, s).puede.length) || a.nombre.localeCompare(b.nombre, 'es'));
    const filas = gente.map(r => {
      const h = horasEn(r, s);
      const texto = h.puede.length === h.total ? '<i>todas las horas</i>'
        : h.puede.length ? '<i class="ojo">sólo ' + h.puede.map(x => x + ':00').join(', ') + '</i>'
        : '<i class="ojo">no marcó estas horas</i>';
      return `<div class="persona" data-folio="${esc(r.folio)}" title="Abrir ficha">
        ${r.foto ? `<img src="${r.foto}" alt="">` : `<div class="sinfoto">${esc((r.nombre || '?')[0])}</div>`}
        <div class="quien"><b>${esc(r.nombre)}</b><small>${esc(r.carrera)} · ${texto}</small></div>
        ${botonWA(r)}
        ${botonRecordar(r)}
        <button type="button" class="quitar" data-quitar="${esc(r.folio)}" title="Quitar de esta sesión">×</button>
      </div>`;
    }).join('');
    const opciones = candidatos.map(r => {
      const h = horasEn(r, s);
      const marca = h.puede.length === h.total ? '✓' : h.puede.length ? '~' : '·';
      return `<option value="${esc(r.folio)}">${marca} ${esc(r.nombre)} · ${esc(r.carrera)}${r.sesion ? ' (ya en otra sesión)' : ''}</option>`;
    }).join('');
    return `<div class="sesion" data-sesion="${esc(s.id)}">
      <div class="cuando"><b>${esc(fechaLarga(s.dia))}</b><span>${esc(s.hora)}</span><span>${esc(s.nombre)}</span><span>· ${gente.length}</span></div>
      ${gente.length ? `<div class="recordar-todos">${(() => {
        const vivos = gente.filter(r => r.estado !== 'descartada'), listos = vivos.filter(recordadoAhora).length;
        return listos === vivos.length
          ? `<span class="hecho">🔔 Recordatorio enviado a los ${vivos.length}</span>`
          : `<button type="button" class="wa recordar" data-recordar-todos="${esc(s.id)}">🔔 Recordar a todos · ${listos} de ${vivos.length}</button>`;
      })()}</div>` : ''}
      <div class="quienes">${filas || '<div class="vacia">Nadie todavía.</div>'}</div>
      <div class="agregar"><select data-agregar="${esc(s.id)}"><option value="">Agregar a alguien… (✓ puede todas las horas, ~ algunas)</option>${opciones}</select></div>
    </div>`;
  }).join('');
  $$('#sesiones .persona').forEach(p => p.addEventListener('click', ev => { if (!ev.target.closest('.quitar') && !ev.target.closest('.wa') && !ev.target.closest('.wa-confirma')) abrirFicha(p.dataset.folio); }));
  $$('#sesiones [data-quitar]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); asignar(b.dataset.quitar, ''); }));
  $$('#sesiones [data-agregar]').forEach(sel => sel.addEventListener('change', () => { if (sel.value) asignar(sel.value, sel.dataset.agregar); }));

  /* Los que no quedaron, de cualquier carrera, sin descartados. Todos
     reciben el mensaje de no convocado. */
  const fuera = todos.filter(r => !r.sesion && r.estado !== 'descartada')
    .sort((a, b) => a.carrera.localeCompare(b.carrera, 'es') || a.nombre.localeCompare(b.nombre, 'es'));
  if (fuera.length) {
    const div = document.createElement('div');
    div.className = 'sesion no-convocados';
    div.innerHTML = `<div class="cuando"><b>No convocados</b><span>todas las carreras</span><span>· ${fuera.length}</span></div>
      <div class="quienes">${fuera.map(r => `<div class="persona" data-folio="${esc(r.folio)}" title="Abrir ficha">
        ${r.foto ? `<img src="${r.foto}" alt="">` : `<div class="sinfoto">${esc((r.nombre || '?')[0])}</div>`}
        <div class="quien"><b>${esc(r.nombre)}</b><small>${esc(r.carrera)} · <i class="${carreraTieneSesion(r.carrera) ? 'ojo' : ''}">${carreraTieneSesion(r.carrera) ? 'no coincidió el horario' : 'su carrera aún sin sesión'}</i></small></div>
        ${botonWA(r)}<span></span></div>`).join('')}</div>`;
    caja.append(div);
    $$('.persona', div).forEach(p => p.addEventListener('click', ev => { if (!ev.target.closest('.wa') && !ev.target.closest('.wa-confirma')) abrirFicha(p.dataset.folio); }));
  }
  conectarWA(caja);

  const conv = todos.filter(r => r.sesion);
  const resumen = $('#avisos-resumen');
  if (resumen) resumen.innerHTML = 'Avisados por WhatsApp: <b>' + conv.filter(avisadoAhora).length + ' de ' + conv.length + '</b> convocados · <b>'
    + fuera.filter(avisadoAhora).length + ' de ' + fuera.length + '</b> no convocados. El botón abre WhatsApp con el mensaje ya escrito; al volver, confirma con «Sí» si lo enviaste.';
}
/* Poner (o quitar) a un alumno en una sesión. Con sesión queda
   convocado; sin sesión vuelve a «nueva» salvo que esté descartado. */
async function asignar(folio, sesion) {
  const r = todos.find(x => x.folio === folio);
  if (!r) return;
  const cambios = { sesion, estado: sesion ? 'convocada' : (r.estado === 'descartada' ? 'descartada' : 'nueva'),
                    atendido_por: (Almacen.usuario() || {}).nombre || '' };
  try {
    await Almacen.actualizar(folio, cambios);
    Object.assign(r, cambios);
    pintarTodo();
  } catch (e) { alert('No se guardó: ' + e.message); }
}

function pintarTodo() {
  pintarSesiones();
  pintarColaRecordar();
  pintarCifras();
  pintarCarreras();
  pintarGenero();
  pintarCalor();
  pintarMejores();
  pintarLista();
}

/* ── Cifras y carreras ──────────────────────────────────── */
function pintarCifras() {
  const n = todos.length;
  const activos = todos.filter(r => r.estado !== 'descartada').length;
  const conv = todos.filter(r => r.estado === 'convocada').length;
  const egr = todos.filter(r => Number(r.semestre) === 0).length;
  const carrerasCon = new Set(todos.map(r => r.carrera)).size;
  $('#cifras').innerHTML =
    `<div><b>${n}</b><span>registro${n === 1 ? '' : 's'}</span></div>` +
    `<div><b>${activos}</b><span>en juego</span></div>` +
    `<div><b>${conv}</b><span>convocado${conv === 1 ? '' : 's'}</span></div>` +
    `<div><b>${egr}</b><span>egresado${egr === 1 ? '' : 's'}</span></div>` +
    `<div><b>${carrerasCon}</b><span>de ${CONFIG.carreras.length} carreras</span></div>`;
  const sinDato = todos.filter(r => !r.genero).length;
  $('#genero-nota').textContent = sinDato
    ? sinDato + (sinDato === 1 ? ' registro sin dato de género: se completa desde su ficha.' : ' registros sin dato de género: se completan desde su ficha.')
    : '';
}

/* Un chip por carrera con su color y cuántos van (sin descartados);
   tocarlo filtra las fichas y el mapa de calor. */
function pintarCarreras() {
  const caja = $('#carreras');
  const cuenta = {};
  todos.filter(r => r.estado !== 'descartada').forEach(r => { cuenta[r.carrera] = (cuenta[r.carrera] || 0) + 1; });
  const total = Object.values(cuenta).reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(1, ...Object.values(cuenta));
  const orden = CONFIG.carreras.slice().sort((a, b) => (cuenta[b] || 0) - (cuenta[a] || 0) || CONFIG.carreras.indexOf(a) - CONFIG.carreras.indexOf(b));
  caja.innerHTML = orden.map(c => {
    const n = cuenta[c] || 0;
    const pct = Math.round(100 * n / total);
    return `<button type="button" class="fila-carrera${n ? '' : ' cero'}${filtroCarrera === c ? ' activo' : ''}" data-carrera="${esc(c)}" style="--tono:${colorDe(c)}" title="${esc(c)}: ${n} (${pct}%)">
      <span class="nombre"><i></i>${esc(c)}</span>
      <span class="pista"><b style="width:${Math.round(100 * n / max)}%"></b></span>
      <span class="n">${n} <small>${n ? pct + '%' : ''}</small></span>
    </button>`;
  }).join('');
  $$('#carreras .fila-carrera').forEach(b => b.addEventListener('click', () => {
    filtroCarrera = filtroCarrera === b.dataset.carrera ? '' : b.dataset.carrera;
    pintarTodo();
  }));
  const faltan = CONFIG.carreras.filter(c => !cuenta[c]);
  $('#faltan').innerHTML = faltan.length
    ? '<b>Sin registros:</b> ' + faltan.map(esc).join(', ') + '.'
    : 'Todas las carreras tienen al menos un registro.';
}

/* ── Género: una barra apilada; tocar un tramo filtra ───── */
function pintarGenero() {
  const base = todos.filter(r => r.estado !== 'descartada' && (!filtroCarrera || r.carrera === filtroCarrera));
  const cuenta = { mujer: 0, hombre: 0, otro: 0, sin: 0 };
  base.forEach(r => { cuenta[generoDe(r)] = (cuenta[generoDe(r)] || 0) + 1; });
  const total = base.length || 1;
  const nombres = { mujer: 'Mujeres', hombre: 'Hombres', otro: 'Sin decir', sin: 'Sin dato' };
  $('#genero').innerHTML = ['mujer', 'hombre', 'otro', 'sin'].filter(k => cuenta[k]).map(k =>
    `<button type="button" class="${k}${filtroGenero === k ? ' activo' : ''}" data-genero="${k}" style="flex:${cuenta[k]}" title="${nombres[k]}: ${cuenta[k]} (${Math.round(100 * cuenta[k] / total)}%)">${cuenta[k] / total < 0.18 ? cuenta[k] : nombres[k] + ' ' + cuenta[k] + ' · ' + Math.round(100 * cuenta[k] / total) + '%'}</button>`
  ).join('') || '<span class="meta" style="padding:4px 10px">Sin registros</span>';
  $$('#genero button').forEach(b => b.addEventListener('click', () => {
    filtroGenero = filtroGenero === b.dataset.genero ? '' : b.dataset.genero;
    pintarTodo();
  }));
}

/* ── Mejores bloques: los cinco con más gente ───────────── */
function pintarMejores() {
  const c = conteos();
  const lista = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $('#mejores').innerHTML = lista.map(([k, n]) => {
    const [iso, hh] = k.split('|');
    const d = Semana.dias.find(x => x.iso === iso);
    return `<li data-bloque="${k}"><b>${n}</b> <span>personas ·</span> ${Semana.nombre(d)}, ${hh}:00–${String(Number(hh) + 1).padStart(2, '0')}:00</li>`;
  }).join('') || '<li class="meta">Todavía no hay disponibilidad registrada.</li>';
  $$('#mejores li[data-bloque]').forEach(li => li.addEventListener('click', () => {
    bloqueElegido = bloqueElegido === li.dataset.bloque ? null : li.dataset.bloque;
    pintarTodo();
  }));
}

/* ── Mapa de calor ──────────────────────────────────────── */
function conteos() {
  const base = todos.filter(r => r.estado !== 'descartada' && (!filtroCarrera || r.carrera === filtroCarrera));
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
    const e = document.createElement('div'); e.className = 'cabeza'; e.innerHTML = Semana.cabeza(d); frag.append(e);
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
      e.title = n + (n === 1 ? ' persona' : ' personas') + ' · ' + Semana.nombre(d) + ', ' + Semana.hh(h);
      e.addEventListener('click', () => { bloqueElegido = bloqueElegido === k ? null : k; pintarTodo(); });
      frag.append(e);
    });
  });
  calor.replaceChildren(frag);
  const f = $('#calor-filtro');
  if (bloqueElegido) {
    const [iso, hh] = bloqueElegido.split('|');
    const d = Semana.dias.find(x => x.iso === iso);
    f.innerHTML = 'Viendo: <b>' + Semana.nombre(d) + ' · ' + hh + ':00</b> <button class="btn suave chico" id="quitar-bloque">quitar</button>';
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
  const orden = $('#f-orden').value;
  const ordenados = vistos.slice().sort((a, b) => {
    if (orden === 'horas') return (b.disponibilidad || []).length - (a.disponibilidad || []).length;
    if (orden === 'nombre') return a.nombre.localeCompare(b.nombre, 'es');
    if (orden === 'carrera') return a.carrera.localeCompare(b.carrera, 'es') || a.nombre.localeCompare(b.nombre, 'es');
    return (b.creado || '').localeCompare(a.creado || '');
  });
  $('#titulo-fichas').textContent = 'Fichas · ' + ordenados.length;
  lista.innerHTML = ordenados.map(r => {
    const disp = new Set(r.disponibilidad || []);
    const dias = Semana.dias.map(d => {
      const n = Semana.horas.filter(h => disp.has(Semana.clave(d.iso, h))).length;
      return `<i class="${n ? 'si' : ''}" title="${Semana.nombre(d)}: ${n} h">${d.corto === 'mié' ? 'X' : d.corto[0].toUpperCase()}</i>`;
    }).join('');
    return `
    <button class="ficha-mini" data-folio="${esc(r.folio)}" style="--tono:${colorDe(r.carrera)}">
      <div class="retrato">
        ${r.foto ? `<img src="${r.foto}" alt="" loading="lazy">` : `<div class="sinfoto">${esc((r.nombre || '?')[0])}</div>`}
        <span class="chip ${esc(r.estado || 'nueva')}">${esc(r.estado || 'nueva')}</span>
        <span class="horas">${disp.size} h</span>
      </div>
      <div class="cuerpo">
        <div class="nombre">${esc(r.nombre)}</div>
        <div class="carrera"><i></i><span>${esc(r.carrera)} · ${semestreTexto(r.semestre)}</span></div>
        <div class="contacto">${telefono(r.telefono)}${r.genero ? ' · ' + esc(GENEROS[r.genero] || r.genero) : ''}</div>
        <div class="dias">${dias}</div>
      </div>
    </button>`;
  }).join('');
  $$('#lista .ficha-mini').forEach(b => b.addEventListener('click', () => abrirFicha(b.dataset.folio)));
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
    '<dt>Carrera · semestre</dt><dd>' + esc(r.carrera) + ' · ' + semestreTexto(r.semestre) + '</dd>' +
    '<dt>Correo</dt><dd><a href="mailto:' + esc(r.correo) + '">' + esc(r.correo) + '</a></dd>' +
    '<dt>Teléfono · WhatsApp</dt><dd><a href="https://api.whatsapp.com/send?phone=' + esc(numeroWA(r.telefono)) + '" target="_blank" rel="noopener">' + telefono(r.telefono) + '</a></dd>' +
    '<dt>Registrado</dt><dd>' + fecha(r.creado) + '</dd>';
  const disp = new Set(r.disponibilidad || []);
  $('#ficha-horas').textContent = '· ' + disp.size + ' horas';
  const mini = $('#ficha-mini');
  mini.style.setProperty('--dias', Semana.dias.length);
  let h = '<div class="hora"></div>' + Semana.dias.map(d => '<div class="cabeza">' + Semana.breve(d) + '</div>').join('');
  Semana.horas.forEach(hora => {
    h += '<div class="hora">' + Semana.hh(hora) + '</div>';
    h += Semana.dias.map(d => '<div class="c' + (disp.has(Semana.clave(d.iso, hora)) ? ' si' : '') + '"></div>').join('');
  });
  mini.innerHTML = h;
  $('#ficha-estado').value = r.estado || 'nueva';
  $('#ficha-genero').value = r.genero || '';
  $('#ficha-sesion').value = r.sesion || '';
  pintarWAFicha(r);
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
  $('#lupa-nombre').textContent = r.nombre + ' · ' + r.carrera + ' · ' + semestreTexto(r.semestre);
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
  const cambios = { estado: $('#ficha-estado').value, nota: $('#ficha-nota').value.trim(), genero: $('#ficha-genero').value, sesion: $('#ficha-sesion').value,
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
  Semana.dias.forEach(d => Semana.horas.forEach(h => bloques.push({ k: Semana.clave(d.iso, h), t: Semana.breve(d) + ' ' + Semana.hh(h) })));
  const cab = ['folio', 'nombre', 'carrera', 'semestre', 'genero', 'correo', 'telefono',
               'estado', 'sesion', 'nota', 'horas', 'registrado', ...bloques.map(b => b.t)];
  const filas = vistos.map(r => {
    const d = new Set(r.disponibilidad || []);
    return [r.folio, r.nombre, r.carrera, semestreTexto(r.semestre), GENEROS[r.genero] || '', r.correo, r.telefono,
            r.estado || 'nueva', (CONFIG.sesiones.find(s => s.id === r.sesion) || {}).nombre || '', r.nota, d.size, r.creado, ...bloques.map(b => d.has(b.k) ? 'x' : '')];
  });
  const celda = v => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '﻿' + [cab, ...filas].map(f => f.map(celda).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'convocatoria-imagen-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

/* ── Contactos para el celular (.vcf, vCard 3.0) ────────── */
const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);
function nombrePropio(n) {
  return String(n || '').trim().split(/\s+/).map((p, i) => {
    const b = p.toLowerCase();
    return i && MINUSCULAS.has(b) ? b : b.charAt(0).toUpperCase() + b.slice(1);
  }).join(' ');
}
/* «Christian Gael Morán Landín» → «Christian Morán». Con cuatro palabras o
   más, el primer apellido es la penúltima; con tres, la segunda. */
function nombreCorto(n) {
  const p = nombrePropio(n).split(' ').filter(x => !MINUSCULAS.has(x.toLowerCase()));
  if (p.length >= 4) return p[0] + ' ' + p[p.length - 2];
  if (p.length === 3) return p[0] + ' ' + p[1];
  return p.join(' ');
}
function sesionCorta(s) {
  const [y, m, d] = s.dia.split('-').map(Number);
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date(y, m - 1, d).getDay()] + ' ' + d;
}
function opcionesContactos() {
  return { quienes: $('#ct-quienes').value, corto: $('#ct-corto').checked, carrera: $('#ct-carrera').checked,
           sesion: $('#ct-sesion').checked, foto: $('#ct-foto').checked };
}
function genteContactos(o) {
  const vivos = todos.filter(r => r.estado !== 'descartada');
  if (o.quienes === 'convocados') return vivos.filter(r => r.sesion);
  if (o.quienes === 'lista') return filtrados();
  if (o.quienes === 'no-convocados') return vivos.filter(r => !r.sesion);
  return vivos.filter(r => r.sesion === o.quienes.slice(2));   // 's:mar-com'
}
function nombreContacto(r, o) {
  const s = (CONFIG.sesiones || []).find(x => x.id === r.sesion);
  const cortas = (CONFIG.contactos || {}).carrerasCortas || {};
  return [o.corto ? nombreCorto(r.nombre) : nombrePropio(r.nombre),
          o.carrera ? (cortas[r.carrera] || r.carrera) : '',
          o.sesion && s ? sesionCorta(s) : ''].filter(Boolean).join(' · ');
}
function vcard(r, o) {
  const s = (CONFIG.sesiones || []).find(x => x.id === r.sesion);
  const grupo = (CONFIG.contactos || {}).grupo || 'Casting IBERO';
  const txt = v => String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const nombre = nombreContacto(r, o);
  const nota = [nombrePropio(r.nombre), r.carrera + ' · ' + semestreTexto(r.semestre),
                s ? 'Sesión: ' + fechaLarga(s.dia) + ', ' + horarioDe(r, s) + ', ' + (s.lugar || '') : 'Sin sesión asignada',
                r.nota || ''].filter(Boolean).join('\n');
  const lineas = ['BEGIN:VCARD', 'VERSION:3.0',
    'N:;' + txt(nombre) + ';;;', 'FN:' + txt(nombre), 'ORG:' + txt(grupo), 'TITLE:' + txt(r.carrera),
    'TEL;TYPE=CELL:+' + numeroWA(r.telefono)];
  if (r.correo) lineas.push('EMAIL;TYPE=INTERNET:' + txt(r.correo));
  lineas.push('NOTE:' + txt(nota), 'CATEGORIES:' + txt(grupo), 'UID:casting-' + txt(r.folio));
  const foto = o.foto && /^data:image\/(\w+);base64,(.+)$/.exec(r.foto || '');
  if (foto) lineas.push('PHOTO;ENCODING=b;TYPE=' + (foto[1] === 'png' ? 'PNG' : 'JPEG') + ':' + foto[2]);
  lineas.push('END:VCARD');
  /* Renglones de más de 75 caracteres se doblan: salto + espacio. */
  return lineas.map(l => {
    const c = Array.from(l), partes = [];
    for (let i = 0; i < c.length;) {
      let n = Math.min(74, c.length - i);
      if (c[i + n - 1] === '\\' && i + n < c.length) n--;   // no partir «\,» ni «\n»
      partes.push(c.slice(i, i + n).join('')); i += n;
    }
    return partes.join('\r\n ');
  }).join('\r\n');
}
function pintarContactos() {
  const o = opcionesContactos(), gente = genteContactos(o);
  $('#ct-cuenta').textContent = gente.length ? 'Así quedan · ' + gente.length + (gente.length === 1 ? ' contacto' : ' contactos') : 'Nadie en este grupo.';
  $('#ct-lista').innerHTML = gente.map(r => `<li>${r.foto && o.foto ? `<img src="${r.foto}" alt="">` : `<i>${esc((r.nombre || '?')[0])}</i>`}<span><b>${esc(nombreContacto(r, o))}</b><small>+${esc(numeroWA(r.telefono))}</small></span></li>`).join('');
  $('#ct-descargar').disabled = !gente.length;
}
function abrirContactos() {
  const sel = $('#ct-quienes'), antes = sel.value;
  const vivos = todos.filter(r => r.estado !== 'descartada');
  const cuenta = f => ' (' + vivos.filter(f).length + ')';
  sel.innerHTML = `<option value="convocados">Convocados de todas las sesiones${cuenta(r => r.sesion)}</option>`
    + (CONFIG.sesiones || []).map(s => `<option value="s:${esc(s.id)}">${esc(sesionTitulo(s))}${cuenta(r => r.sesion === s.id)}</option>`).join('')
    + `<option value="no-convocados">No convocados${cuenta(r => !r.sesion)}</option>`
    + `<option value="lista">Lo que muestra la lista de fichas (${filtrados().length})</option>`;
  if (antes && [...sel.options].some(x => x.value === antes)) sel.value = antes;
  pintarContactos();
  $('#velo-contactos').classList.remove('oculto');
}
function cerrarContactos() { $('#velo-contactos').classList.add('oculto'); }
$('#btn-contactos').addEventListener('click', abrirContactos);
$('#ct-cerrar').addEventListener('click', cerrarContactos);
$('#velo-contactos').addEventListener('click', ev => { if (ev.target === $('#velo-contactos')) cerrarContactos(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') cerrarContactos(); });
['#ct-quienes', '#ct-corto', '#ct-carrera', '#ct-sesion', '#ct-foto'].forEach(id => $(id).addEventListener('change', pintarContactos));
$('#ct-descargar').addEventListener('click', () => {
  const o = opcionesContactos(), gente = genteContactos(o);
  if (!gente.length) return;
  const vcf = gente.map(r => vcard(r, o)).join('\r\n') + '\r\n';
  const nombre = o.quienes.startsWith('s:') ? o.quienes.slice(2) : o.quienes;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard;charset=utf-8' }));
  a.download = 'contactos-casting-' + nombre + '-' + new Date().toISOString().slice(0, 10) + '.vcf';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  aviso('Se descargaron ' + gente.length + ' contactos. Mándate el archivo por correo y ábrelo en el celular.');
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
