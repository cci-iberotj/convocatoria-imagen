/* ═══════════════════════════════════════════════════════════
   Almacén · dónde viven las respuestas

   Una sola puerta para el formulario y para la vista del equipo.
   CONFIG.motor decide si se guarda en el navegador ('local') o en
   la base de LA PIZARRA ('supabase'). Las dos devuelven lo mismo,
   así que las páginas no saben ni les importa cuál está detrás.

   Forma de un registro:
     { folio, nombre, matricula, carrera, semestre, correo,
       telefono, instagram, foto (data URL JPEG),
       disponibilidad: ['2026-10-26|08', …],
       consentimientos: { datos: true, imagen: true },
       estado: 'nueva' | 'convocada' | 'descartada',
       nota: '', atendido_por: '', creado: ISO }
   ═══════════════════════════════════════════════════════════ */
'use strict';

const Almacen = (() => {
  const LLAVE_LOCAL  = 'casting.respuestas';
  const LLAVE_SESION = 'casting.sesion';
  /* La sesión de LA PIZARRA, en el mismo origen (cci-iberotj.github.io):
     cuando equipo.html va incrustado en LA PIZARRA se usa esa sesión y
     no se pide entrar otra vez. Se lee tal cual y NUNCA se refresca
     desde aquí: refrescarla rotaría su token y sacaría a LA PIZARRA. */
  const LLAVE_PIZARRA = 'la-pizarra-sesion';
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sin 0/O/1/I/L

  function folio() {
    const b = new Uint8Array(8);
    crypto.getRandomValues(b);
    return Array.from(b, x => ABC[x % ABC.length]).join('');
  }

  /* ── Local: el navegador ─────────────────────────────── */
  const local = {
    _leer() {
      try { return JSON.parse(localStorage.getItem(LLAVE_LOCAL) || '[]'); }
      catch (e) { return []; }
    },
    _escribir(lista) {
      localStorage.setItem(LLAVE_LOCAL, JSON.stringify(lista));
    },
    async guardar(r) {
      const lista = this._leer();
      const yo = lista.findIndex(x => x.correo === r.correo);
      if (yo >= 0) lista.splice(yo, 1);      // en local, repetir reemplaza
      lista.push(r);
      this._escribir(lista);
      return r;
    },
    async listar() {
      return this._leer().sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
    },
    async fotos() {
      return this._leer().map(r => ({ folio: r.folio, foto: r.foto }));
    },
    async actualizar(folio, cambios) {
      const lista = this._leer();
      const r = lista.find(x => x.folio === folio);
      if (!r) throw new Error('No existe ese registro.');
      Object.assign(r, cambios);
      this._escribir(lista);
      return r;
    },
    async borrar(folio) {
      this._escribir(this._leer().filter(x => x.folio !== folio));
    },
    async entrar() { return { nombre: 'Equipo (local)', correo: '' }; },
    salir() {},
    sesion() { return { nombre: 'Equipo (local)', correo: '' }; },
    necesitaSesion: false,
  };

  /* ── Supabase: la base de LA PIZARRA ─────────────────── */
  const nube = {
    get _base()  { return CONFIG.supabase.url; },
    get _llave() { return CONFIG.supabase.llave; },
    get _tabla() { return '/rest/v1/' + CONFIG.supabase.tabla; },
    necesitaSesion: true,

    _recordar(s) {
      try {
        if (s) localStorage.setItem(LLAVE_SESION, JSON.stringify(s));
        else localStorage.removeItem(LLAVE_SESION);
      } catch (e) {}
    },
    sesion() {
      try {
        const propia = JSON.parse(localStorage.getItem(LLAVE_SESION) || 'null');
        if (propia) return propia;
        const prestada = JSON.parse(localStorage.getItem(LLAVE_PIZARRA) || 'null');
        if (prestada && prestada.acceso) return Object.assign({ prestada: true }, prestada);
        return null;
      } catch (e) { return null; }
    },
    usuario() {
      const s = this.sesion();
      return s ? (s.usuario || null) : null;
    },

    async _auth(ruta, cuerpo) {
      const r = await fetch(this._base + '/auth/v1' + ruta, {
        method: 'POST',
        headers: { apikey: this._llave, 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        const e = new Error(d.error_description || d.msg || d.message || 'Error ' + r.status);
        e.codigo = r.status; throw e;
      }
      return d;
    },

    async _token() {
      const s = this.sesion();
      if (!s) throw new Error('SIN_SESION');
      if (Date.now() < s.expira - 60000) return s.acceso;
      /* Prestada y vencida: LA PIZARRA la refresca por su lado; al
         volver a leer el almacén saldrá la nueva. Aquí no se toca. */
      if (s.prestada) throw new Error('SIN_SESION');
      try {
        const d = await this._auth('/token?grant_type=refresh_token', { refresh_token: s.refresco });
        this._recordar({ acceso: d.access_token, refresco: d.refresh_token,
                         expira: Date.now() + (d.expires_in || 3600) * 1000, usuario: s.usuario });
        return d.access_token;
      } catch (e) { this._recordar(null); throw new Error('SIN_SESION'); }
    },

    async _rest(ruta, opciones = {}, conSesion = true) {
      const headers = { apikey: this._llave, 'Content-Type': 'application/json' };
      if (conSesion) headers.Authorization = 'Bearer ' + await this._token();
      else headers.Authorization = 'Bearer ' + this._llave;
      Object.assign(headers, opciones.headers || {});
      const r = await fetch(this._base + ruta, {
        method: opciones.method || 'GET', headers,
        body: opciones.body ? JSON.stringify(opciones.body) : undefined,
      });
      if (r.status === 401 && conSesion) { this._recordar(null); throw new Error('SIN_SESION'); }
      if (r.status === 204) return null;
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = (d && (d.message || d.hint)) || 'Error ' + r.status;
        if (r.status === 409 || /duplicate key/i.test(msg)) throw new Error('DUPLICADO');
        throw new Error(msg);
      }
      return d;
    },

    async guardar(r) {
      await this._rest(this._tabla, {
        method: 'POST', body: r, headers: { Prefer: 'return=minimal' },
      }, false);
      return r;
    },
    /* Sin fotos va en un instante; las fotos (varios MB) se piden aparte. */
    async listar(opciones = {}) {
      const campos = opciones.sinFotos
        ? 'folio,nombre,matricula,carrera,semestre,correo,telefono,instagram,disponibilidad,consentimientos,estado,nota,atendido_por,creado,genero,sesion,avisado'
        : '*';
      return await this._rest(this._tabla + '?select=' + campos + '&order=creado.desc') || [];
    },
    async fotos() {
      return await this._rest(this._tabla + '?select=folio,foto') || [];
    },
    async actualizar(folio, cambios) {
      const d = await this._rest(this._tabla + '?folio=eq.' + encodeURIComponent(folio), {
        method: 'PATCH', body: cambios, headers: { Prefer: 'return=representation' },
      });
      return (d || [])[0];
    },
    async borrar(folio) {
      await this._rest(this._tabla + '?folio=eq.' + encodeURIComponent(folio), { method: 'DELETE' });
    },
    async entrar(correo, clave) {
      let d;
      try { d = await this._auth('/token?grant_type=password', { email: correo.trim(), password: clave }); }
      catch (e) { if (e.codigo === 400) throw new Error('Correo o contraseña incorrectos.'); throw e; }
      const usuario = { correo: d.user.email, nombre: (d.user.email || '').split('@')[0], id: d.user.id };
      this._recordar({ acceso: d.access_token, refresco: d.refresh_token,
                       expira: Date.now() + (d.expires_in || 3600) * 1000, usuario });
      return usuario;
    },
    salir() { this._recordar(null); },
  };
  local.usuario = () => local.sesion();

  const motor = CONFIG.motor === 'supabase' ? nube : local;
  return Object.assign({ folio, modo: CONFIG.motor }, {
    guardar:    r => motor.guardar(r),
    listar:     o => motor.listar(o),
    fotos:      () => motor.fotos(),
    actualizar: (f, c) => motor.actualizar(f, c),
    borrar:     f => motor.borrar(f),
    entrar:     (c, k) => motor.entrar(c, k),
    salir:      () => motor.salir(),
    sesion:     () => motor.sesion(),
    usuario:    () => motor.usuario(),
    necesitaSesion: motor.necesitaSesion,
  });
})();

/* ── La semana, compartida por las dos páginas ─────────── */
/* Desde el 26-oct-2026 la disponibilidad es de una SEMANA TIPO (lunes a
   viernes, sin fechas): el registro queda abierto para futuras sesiones.
   Claves: 'lun|08'. Los registros anteriores se guardaron con fecha
   ('2026-10-26|08', de la semana del 26 al 30, que fue de lunes a
   viernes); normalizar() los convierte al día de la semana que les toca. */
const Semana = (() => {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const dias = [1, 2, 3, 4, 5].slice(0, CONFIG.semana.dias).map(i => ({ iso: CORTO[i], dia: DIAS[i], corto: CORTO[i], num: '' }));
  const horas = [];
  for (let h = CONFIG.semana.horaInicio; h < CONFIG.semana.horaFin; h++) horas.push(h);
  const clave = (dia, h) => dia + '|' + String(h).padStart(2, '0');
  const hh = h => String(h).padStart(2, '0') + ':00';
  const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);
  /* '2026-10-28' → 'mié' */
  function diaDeFecha(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return CORTO[new Date(y, m - 1, d).getDay()];
  }
  /* '2026-10-28|12' → 'mié|12'; 'mié|12' se queda igual */
  function normalizar(k) {
    const [a, h] = String(k).split('|');
    return /^\d{4}-\d{2}-\d{2}$/.test(a) ? diaDeFecha(a) + '|' + h : k;
  }
  return {
    dias, horas, clave, hh, diaDeFecha, normalizar,
    nombre: d => d.dia,                         // «lunes»
    breve:  d => mayus(d.corto),                // «Lun»
    cabeza: d => '<b>' + mayus(d.corto) + '</b>',
    rango:  () => 'lunes a viernes',
  };
})();
