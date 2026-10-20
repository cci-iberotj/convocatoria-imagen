/* ═══════════════════════════════════════════════════════════
   Formulario · La IBERO se ve como tú
   Cuatro pasos: datos → foto → disponibilidad → consentimiento.
   Todo lo que se puede ajustar está en config.js.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const semestreTexto = n => Number(n) === 0 ? CONFIG.egresado : n + '°';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const registro = {
  folio: '', nombre: '', matricula: '', carrera: '', semestre: 0,
  correo: '', telefono: '', instagram: '', genero: '', foto: '',
  disponibilidad: [], consentimientos: { datos: false, imagen: false },
  estado: 'nueva', nota: '', atendido_por: '', creado: '',
};
let paso = 0;

/* ── Textos desde config ─────────────────────────────────── */
function pintarTextos() {
  document.title = CONFIG.titulo + ' · Convocatoria';
  /* La última palabra del título va resaltada en rojo («…como tú»). */
  const palabras = CONFIG.titulo.trim().split(' ');
  const ultima = palabras.pop();
  $('#titulo').innerHTML = esc(palabras.join(' ')) + ' <em>' + esc(ultima) + '</em>';
  $('#bajada').textContent = CONFIG.bajada;
  $$('#rotulo-area, #rotulo-area-2, #rotulo-area-3').forEach(e => e.textContent = CONFIG.area);
  $$('#txt-rango, #txt-rango-2, #txt-rango-3').forEach(e => e.textContent = Semana.rango());
  $$('#txt-aviso, #txt-aviso-3').forEach(e => e.textContent = CONFIG.fechas.aviso);
  $('#txt-minimo').textContent = CONFIG.horasMinimas;
  $('#txt-incentivo').textContent = CONFIG.incentivo;
  $('#txt-cierre').textContent = CONFIG.fechas.cierreRegistro;
  $('#txt-aviso-2').textContent = CONFIG.fechas.aviso;
  if (CONFIG.contacto.avisoPrivacidad) {
    $('#liga-aviso').innerHTML = 'Aviso de privacidad integral: <a href="' + CONFIG.contacto.avisoPrivacidad + '" target="_blank" rel="noopener">' + CONFIG.contacto.avisoPrivacidad.replace(/^https?:\/\//, '') + '</a>';
  }
  const partes = [];
  if (CONFIG.contacto.correo) partes.push('<a href="mailto:' + CONFIG.contacto.correo + '">' + CONFIG.contacto.correo + '</a>');
  if (CONFIG.contacto.whatsapp) partes.push('WhatsApp ' + CONFIG.contacto.whatsapp);
  const pie = (partes.length ? 'Dudas: ' + partes.join(' · ') + '<br>' : '') +
              CONFIG.area + ' · <a href="https://' + CONFIG.sitio + '" target="_blank" rel="noopener">' + CONFIG.sitio + '</a>';
  $('#pie-inicio').innerHTML = pie;
  $('#pie-listo').innerHTML = pie;
  $('#ayuda-correo').textContent = CONFIG.dominioCorreo ? 'El que termina en ' + CONFIG.dominioCorreo + '.' : 'Si eres estudiante, el institucional; si eres egresado, el que uses.';

  /* Fotos de la sesión: portada, galería y cabecera de «listo». */
  if (CONFIG.fotos.portada) {
    const f = $('#portada-foto'); f.src = CONFIG.fotos.portada;
    f.style.objectPosition = CONFIG.fotos.portadaFoco || 'center';
  }
  const galeria = $('#galeria');
  (CONFIG.fotos.galeria || []).slice(0, 3).forEach(src => {
    const fig = document.createElement('figure');
    const img = new Image(); img.src = src; img.alt = ''; img.loading = 'lazy';
    fig.append(img); galeria.append(fig);
  });
  if (CONFIG.fotos.listo) $('#listo-foto').src = CONFIG.fotos.listo;

  /* La cinta: se repite dos veces para que corra sin cortes. */
  const items = (CONFIG.cinta || []).map(t => '<span>' + esc(t) + '</span>').join('');
  $('#cinta').innerHTML = items + items;

  /* El aviso de ropa, grande en la página y chico al final. */
  $('#ropa-titulo').textContent = CONFIG.ropa.titulo;
  $('#ropa-texto').textContent = CONFIG.ropa.texto;
  const muestras = (CONFIG.ropa.muestras || []).map(c => '<i style="background:' + esc(c) + '"></i>').join('');
  $('#ropa-muestras').innerHTML = muestras + '<small>claro + rojo</small>';
  $('#recordatorio-muestras').innerHTML = muestras;
  $('#recordatorio-titulo').textContent = CONFIG.ropa.titulo;

  if (CONFIG.modoPrueba) $('#etiqueta-prueba').classList.remove('oculto');

  const sel = $('select[name=semestre]');
  for (let i = 1; i <= CONFIG.semestres; i++) sel.append(new Option(i + '°', i));
  sel.append(new Option(CONFIG.egresado, 0));
  const gen = $('select[name=genero]');
  CONFIG.generos.forEach(g => gen.append(new Option(g.nombre, g.id)));
  const car = $('select[name=carrera]');
  CONFIG.carreras.forEach(c => car.append(new Option(c, c)));

  if (CONFIG.fechas.cierreISO && Date.now() > new Date(CONFIG.fechas.cierreISO).getTime()) {
    $('#aviso-cerrado').classList.remove('oculto');
    $$('#btn-empezar, [data-empezar]').forEach(b => b.disabled = true);
  }
}

/* ── Navegación entre pasos ─────────────────────────────── */
function irA(n) {
  paso = n;
  $('#inicio').classList.toggle('oculto', n !== 0);
  $('#pasos').classList.toggle('oculto', n < 1 || n > 4);
  $('#listo').classList.toggle('oculto', n !== 5);
  $$('.paso').forEach(p => p.classList.toggle('oculto', p.id !== 'paso-' + n));
  if (n >= 1 && n <= 4) {
    $('#paso-de').textContent = 'Paso ' + n + ' de 4';
    $('#barra-progreso').style.width = (n * 25) + '%';
  }
  if (n !== 0) $('#cta-fija').classList.remove('visible');
  if (n !== 2) apagarCamara();
  if (n === 4) pintarResumen();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('#btn-empezar, [data-empezar]').forEach(b => b.addEventListener('click', () => irA(1)));

/* Las secciones aparecen al entrar en pantalla, una sola vez. */
const observador = new IntersectionObserver(entradas => {
  entradas.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visto'); observador.unobserve(en.target); } });
}, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
$$('.revela').forEach(el => observador.observe(el));

/* El botón fijo al pie aparece cuando la portada ya se fue. */
const vigilaPortada = new IntersectionObserver(([en]) => {
  $('#cta-fija').classList.toggle('visible', !en.isIntersecting && paso === 0);
}, { threshold: .05 });
vigilaPortada.observe($('.portada'));
$$('[data-atras]').forEach(b => b.addEventListener('click', () => irA(paso - 1)));

/* ── Paso 1 · datos ─────────────────────────────────────── */
function marcar(campo, mal) { campo.closest('.campo').classList.toggle('mal', mal); return !mal; }

$('#paso-1').addEventListener('submit', ev => {
  ev.preventDefault();
  const f = ev.target;
  const v = n => f.elements[n].value.trim();
  let ok = true;
  ok &= marcar(f.elements.nombre, v('nombre').split(/\s+/).length < 2 || v('nombre').length < 5);
  ok &= marcar(f.elements.semestre, v('semestre') === '');
  ok &= marcar(f.elements.carrera, !v('carrera'));
  ok &= marcar(f.elements.genero, !v('genero'));
  const correo = v('correo').toLowerCase();
  const correoOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) &&
                   (!CONFIG.dominioCorreo || correo.endsWith(CONFIG.dominioCorreo));
  ok &= marcar(f.elements.correo, !correoOk);
  const tel = v('telefono').replace(/\D/g, '');
  ok &= marcar(f.elements.telefono, tel.length !== 10);
  if (!ok && !CONFIG.modoPrueba) { f.querySelector('.campo.mal input, .campo.mal select')?.focus(); return; }
  if (!ok) $$('#paso-1 .campo.mal').forEach(c => c.classList.remove('mal'));

  registro.nombre    = v('nombre').replace(/\s+/g, ' ');
  registro.semestre  = Number(v('semestre'));
  registro.carrera   = v('carrera');
  registro.correo    = correo;
  registro.telefono  = tel;
  registro.genero    = v('genero');
  irA(2);
});

/* ── Paso 2 · foto ──────────────────────────────────────── */
let flujo = null;
const video = $('#video');

async function abrirCamara() {
  $('#camara-error').classList.add('oculto');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return errorCamara('Este navegador no deja abrir la cámara desde aquí. Usa «Subir una foto».');
  }
  try {
    flujo = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 1280 } }, audio: false,
    });
  } catch (e) {
    const porque = e.name === 'NotAllowedError' ? 'No diste permiso para usar la cámara.'
                 : e.name === 'NotFoundError'   ? 'No se encontró una cámara en este dispositivo.'
                 : 'No se pudo abrir la cámara (' + (e.message || e.name) + ').';
    return errorCamara(porque + ' Puedes «Subir una foto» en su lugar.');
  }
  video.srcObject = flujo;
  video.classList.remove('oculto');
  $('#guia').classList.remove('oculto');
  $('#camara-vacio').classList.add('oculto');
  $('#foto-vista').classList.add('oculto');
  $('#btn-abrir-camara').classList.add('oculto');
  $('#btn-tomar').classList.remove('oculto');
  $('#btn-repetir').classList.add('oculto');
}
function errorCamara(msg) {
  const e = $('#camara-error'); e.textContent = msg; e.classList.remove('oculto');
}
function apagarCamara() {
  if (flujo) { flujo.getTracks().forEach(t => t.stop()); flujo = null; }
  video.srcObject = null;
  video.classList.add('oculto');
  $('#guia').classList.add('oculto');
}

/* Recorta al centro en proporción 3:4 y reduce al lado largo de config. */
function aJpeg(fuente, ancho, alto, espejo) {
  const lienzo = $('#lienzo');
  const lado = CONFIG.foto.lado;
  const prop = 3 / 4;
  let rw = ancho, rh = alto, rx = 0, ry = 0;
  if (ancho / alto > prop) { rw = alto * prop; rx = (ancho - rw) / 2; }
  else { rh = ancho / prop; ry = (alto - rh) / 2; }
  lienzo.width = Math.round(lado * prop); lienzo.height = lado;
  const ctx = lienzo.getContext('2d');
  if (espejo) { ctx.translate(lienzo.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(fuente, rx, ry, rw, rh, 0, 0, lienzo.width, lienzo.height);
  return lienzo.toDataURL('image/jpeg', CONFIG.foto.calidad);
}
function mostrarFoto(dataUrl) {
  registro.foto = dataUrl;
  $('#camara-error').classList.add('oculto');
  const img = $('#foto-vista'); img.src = dataUrl; img.classList.remove('oculto');
  $('#camara-vacio').classList.add('oculto');
  apagarCamara();
  $('#btn-abrir-camara').classList.add('oculto');
  $('#btn-tomar').classList.add('oculto');
  $('#btn-repetir').classList.remove('oculto');
  $('#btn-foto-sig').disabled = false;
}
$('#btn-abrir-camara').addEventListener('click', abrirCamara);
$('#btn-repetir').addEventListener('click', () => { registro.foto = ''; $('#btn-foto-sig').disabled = true; abrirCamara(); });
$('#btn-tomar').addEventListener('click', () => {
  if (!video.videoWidth) return errorCamara('La cámara todavía no está lista; espera un segundo.');
  mostrarFoto(aJpeg(video, video.videoWidth, video.videoHeight, true));
});
$('#btn-subir').addEventListener('click', () => $('#archivo').click());
$('#archivo').addEventListener('change', ev => {
  const archivo = ev.target.files && ev.target.files[0];
  if (!archivo) return;
  const url = URL.createObjectURL(archivo);
  const img = new Image();
  img.onload = () => { mostrarFoto(aJpeg(img, img.naturalWidth, img.naturalHeight, false)); URL.revokeObjectURL(url); };
  img.onerror = () => errorCamara('No se pudo leer esa imagen. Prueba con otra.');
  img.src = url;
  ev.target.value = '';
});
$('#btn-foto-sig').addEventListener('click', () => { if (registro.foto || CONFIG.modoPrueba) irA(3); });

/* ── Paso 3 · disponibilidad ────────────────────────────── */
const marcadas = new Set();
const rejilla = $('#rejilla');

function pintarRejilla() {
  rejilla.style.setProperty('--dias', Semana.dias.length);
  const frag = document.createDocumentFragment();
  frag.append(Object.assign(document.createElement('div'), { className: 'hora' }));
  Semana.dias.forEach(d => {
    const c = document.createElement('div');
    c.className = 'cabeza'; c.dataset.dia = d.iso;
    c.innerHTML = d.corto + '<b>' + d.num + '</b>';
    c.setAttribute('role', 'button'); c.tabIndex = 0;
    c.title = 'Marcar o quitar todo el ' + d.dia;
    frag.append(c);
  });
  Semana.horas.forEach(h => {
    const eh = document.createElement('div'); eh.className = 'hora'; eh.textContent = Semana.hh(h); frag.append(eh);
    Semana.dias.forEach(d => {
      const c = document.createElement('div');
      c.className = 'celda'; c.dataset.clave = Semana.clave(d.iso, h);
      c.setAttribute('role', 'checkbox'); c.setAttribute('aria-checked', 'false'); c.tabIndex = 0;
      c.setAttribute('aria-label', d.dia + ' ' + d.num + ', ' + Semana.hh(h));
      frag.append(c);
    });
  });
  rejilla.replaceChildren(frag);
}
function poner(celda, si) {
  if (!celda || !celda.dataset.clave) return;
  if (si) marcadas.add(celda.dataset.clave); else marcadas.delete(celda.dataset.clave);
  celda.classList.toggle('si', si);
  celda.setAttribute('aria-checked', String(si));
}
function refrescarCuenta() {
  $('#cuenta-horas').textContent = marcadas.size;
  $$('#rejilla .cabeza').forEach(c => {
    const llena = Semana.horas.every(h => marcadas.has(Semana.clave(c.dataset.dia, h)));
    c.classList.toggle('llena', llena);
  });
  $('#aviso-horas').classList.add('oculto');
}
function alternarDia(iso) {
  const todas = Semana.horas.every(h => marcadas.has(Semana.clave(iso, h)));
  Semana.horas.forEach(h => poner(rejilla.querySelector('[data-clave="' + Semana.clave(iso, h) + '"]'), !todas));
  refrescarCuenta();
}

/* Pintar arrastrando: el primer toque decide si se marca o se
   desmarca, y todo lo que se recorra con el dedo queda igual. */
let pintando = null, ultimo = null;
function pintarEn(x, y) {
  const el = document.elementFromPoint(x, y);
  const c = el && el.closest('.celda');
  if (c && marcadas.has(c.dataset.clave) !== pintando) { poner(c, pintando); refrescarCuenta(); }
}
rejilla.addEventListener('pointerdown', ev => {
  const c = ev.target.closest('.celda');
  if (c) {
    pintando = !marcadas.has(c.dataset.clave);
    ultimo = [ev.clientX, ev.clientY];
    poner(c, pintando); refrescarCuenta();
    rejilla.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    return;
  }
  const d = ev.target.closest('.cabeza');
  if (d) alternarDia(d.dataset.dia);
});
rejilla.addEventListener('pointermove', ev => {
  if (pintando === null) return;
  /* Un dedo rápido salta casillas entre dos eventos: se rellena el
     trayecto en pasos de 12 px para que no queden huecos. */
  const [x0, y0] = ultimo || [ev.clientX, ev.clientY];
  const dx = ev.clientX - x0, dy = ev.clientY - y0;
  const pasos = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 12));
  for (let i = 1; i <= pasos; i++) pintarEn(x0 + dx * i / pasos, y0 + dy * i / pasos);
  ultimo = [ev.clientX, ev.clientY];
});
['pointerup', 'pointercancel'].forEach(t => rejilla.addEventListener(t, () => { pintando = null; ultimo = null; }));
rejilla.addEventListener('keydown', ev => {
  if (ev.key !== ' ' && ev.key !== 'Enter') return;
  const c = ev.target.closest('.celda'); const d = ev.target.closest('.cabeza');
  if (c) { poner(c, !marcadas.has(c.dataset.clave)); refrescarCuenta(); ev.preventDefault(); }
  else if (d) { alternarDia(d.dataset.dia); ev.preventDefault(); }
});
$('#btn-limpiar').addEventListener('click', () => {
  marcadas.clear(); $$('#rejilla .celda').forEach(c => poner(c, false)); refrescarCuenta();
});
$('#btn-disp-sig').addEventListener('click', () => {
  if (marcadas.size < CONFIG.horasMinimas && !CONFIG.modoPrueba) {
    const a = $('#aviso-horas');
    a.textContent = 'Marca al menos ' + CONFIG.horasMinimas + ' horas: con menos no alcanza para una sesión.';
    a.classList.remove('oculto');
    return;
  }
  registro.disponibilidad = Array.from(marcadas).sort();
  irA(4);
});

/* ── Paso 4 · resumen y envío ──────────────────────────── */
function pintarResumen() {
  $('#resumen-foto').src = registro.foto;
  $('#resumen-datos').innerHTML =
    '<dt>Nombre</dt><dd>' + esc(registro.nombre) + '</dd>' +
    '<dt>Carrera · semestre</dt><dd>' + esc(registro.carrera) + ' · ' + semestreTexto(registro.semestre) + '</dd>' +
    '<dt>Contacto</dt><dd>' + esc(registro.correo) + '<br>' + registro.telefono.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') + '</dd>';
  const porDia = {};
  registro.disponibilidad.forEach(k => { const [iso] = k.split('|'); porDia[iso] = (porDia[iso] || 0) + 1; });
  $('#resumen-horas').textContent = registro.disponibilidad.length + ' horas en ' + Object.keys(porDia).length + ' días';
}

$('#btn-enviar').addEventListener('click', async () => {
  const d = $('#chk-datos').checked, i = $('#chk-imagen').checked;
  $('#casilla-datos').classList.toggle('mal', !d && !CONFIG.modoPrueba);
  $('#casilla-imagen').classList.toggle('mal', !i && !CONFIG.modoPrueba);
  if ((!d || !i) && !CONFIG.modoPrueba) return;
  registro.consentimientos = { datos: true, imagen: true };
  registro.folio  = Almacen.folio();
  registro.creado = new Date().toISOString();
  const btn = $('#btn-enviar'); btn.disabled = true; btn.textContent = 'Enviando…';
  const aviso = $('#aviso-envio'); aviso.classList.add('oculto');
  try {
    await Almacen.guardar(registro);
    avisar(registro);   // no se espera: el registro ya quedó
    $('#aviso-prueba').classList.add('oculto');
    saludar();
    irA(5);
  } catch (e) {
    if (CONFIG.modoPrueba) {
      /* En modo prueba lo que importa es ver la pantalla final. */
      saludar();
      const ap = $('#aviso-prueba');
      ap.textContent = 'Modo prueba: este registro NO se guardó (' + (e.message === 'DUPLICADO' ? 'correo repetido' : 'faltan datos o no pasó la base') + ').';
      ap.classList.remove('oculto');
      irA(5);
      return;
    }
    aviso.textContent = e.message === 'DUPLICADO'
      ? 'Ya tenemos un registro con ese correo. Si necesitas cambiar algo, escríbenos.'
      : 'No se pudo enviar (' + e.message + '). Revisa tu conexión e inténtalo de nuevo.';
    aviso.classList.remove('oculto');
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar mi registro';
  }
});

/* ── Aviso por correo al equipo (EmailJS) ──────────────────
   Se manda después de guardar y no detiene nada: si falla, el
   registro ya está en la base y se ve en equipo.html. */
async function avisar(r) {
  const av = CONFIG.avisos;
  if (!av || !av.activo || !av.correos.length) return;
  try {
    const porDia = {};
    r.disponibilidad.forEach(k => { const [iso] = k.split('|'); porDia[iso] = (porDia[iso] || 0) + 1; });
    const dias = Semana.dias.filter(d => porDia[d.iso]).map(d => d.corto + ' ' + d.num + ' (' + porDia[d.iso] + ' h)').join(', ');
    const fila = (k, v) => '<tr><td style="padding:4px 12px 4px 0;color:#655C54">' + k + '</td><td style="padding:4px 0"><b>' + esc(v) + '</b></td></tr>';
    const html =
      '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;color:#191713">' +
      '<p style="margin:0 0 10px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#E0202B"><b>Convocatoria · nuevo registro</b></p>' +
      '<h2 style="margin:0 0 14px;font-size:22px">' + esc(r.nombre) + '</h2>' +
      '<table style="border-collapse:collapse">' +
      fila('Carrera', r.carrera + ' · ' + semestreTexto(r.semestre)) +
      fila('Correo', r.correo) +
      fila('Teléfono', r.telefono.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')) +
      fila('Disponibilidad', r.disponibilidad.length + ' horas: ' + dias) +
      '</table>' +
      '<p style="margin:18px 0 0"><a href="' + av.vistaEquipo + '" style="color:#E0202B;font-weight:700">Ver todos los registros y la foto →</a></p>' +
      '<p style="margin:14px 0 0;font-size:12px;color:#655C54">Folio ' + r.folio + ' · ' + CONFIG.titulo + '</p></div>';
    /* Directo a la API de EmailJS (lo mismo que hace su SDK), con
       keepalive para que el envío siga aunque el alumno cierre la
       pestaña en cuanto ve «¡Ya quedó!». */
    const r2 = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: av.emailjs.servicio, template_id: av.emailjs.plantilla, user_id: av.emailjs.publica,
        template_params: {
          subject: 'Nuevo registro: ' + r.nombre + ' (' + r.carrera + ')',
          html_content: html,
          to_email: av.correos.join(','),
          cc_email: '', bcc_email: '',
          name: 'Convocatoria IBERO Tijuana',
        },
      }),
    });
    if (!r2.ok) throw new Error('HTTP ' + r2.status + ' ' + (await r2.text()).slice(0, 120));
  } catch (e) {
    console.warn('No salió el aviso por correo:', e && (e.text || e.message || e));
  }
}

/* «¡Ya quedó, Ana!» si hay nombre; «¡Ya quedó!» si no. */
function saludar() {
  const nombre = registro.nombre.trim().split(' ')[0];
  $('#listo-titulo').textContent = nombre ? '¡Ya quedó, ' + nombre + '!' : '¡Ya quedó!';
}

/* ── Arranque ───────────────────────────────────────────── */
pintarTextos();
pintarRejilla();
if (CONFIG.modoPrueba) $('#btn-foto-sig').disabled = false;
irA(0);
