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
    async listar() {
      return await this._rest(this._tabla + '?select=*&order=creado.desc') || [];
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
    listar:     () => motor.listar(),
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
const Semana = (() => {
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const CORTO = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function fecha(i) {
    const [y, m, d] = CONFIG.semana.inicio.split('-').map(Number);
    const f = new Date(y, m - 1, d + i);
    const iso = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0');
    return { iso, dia: DIAS[f.getDay()], corto: CORTO[f.getDay()], num: f.getDate(), mes: MESES[f.getMonth()] };
  }
  const dias = Array.from({ length: CONFIG.semana.dias }, (_, i) => fecha(i));
  const horas = [];
  for (let h = CONFIG.semana.horaInicio; h < CONFIG.semana.horaFin; h++) horas.push(h);
  const clave = (iso, h) => iso + '|' + String(h).padStart(2, '0');
  const hh = h => String(h).padStart(2, '0') + ':00';
  const rango = () => `${dias[0].dia} ${dias[0].num} al ${dias[dias.length - 1].dia} ${dias[dias.length - 1].num} de ${dias[dias.length - 1].mes}`;
  return { dias, horas, clave, hh, rango };
})();
