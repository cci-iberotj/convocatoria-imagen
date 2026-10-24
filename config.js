/* ═══════════════════════════════════════════════════════════
   Convocatoria · La IBERO se ve como tú
   Comunicación Institucional · IBERO Tijuana

   TODO LO QUE SE AJUSTA VIVE AQUÍ. Fechas, horario de la
   rejilla, textos de contacto, carreras, fotos y dónde se guardan
   las respuestas. El formulario (index.html) y la vista del equipo
   (equipo.html) leen este archivo; no hay que tocar nada más.
   ═══════════════════════════════════════════════════════════ */
'use strict';

const CONFIG = {

  /* ── Modo prueba ───────────────────────────────────────
     true  → se puede recorrer el formulario completo sin llenar
             nada: ningún paso detiene, y al enviar, si faltan
             datos, enseña la pantalla final sin guardar. Abajo a
             la derecha sale una etiqueta «MODO PRUEBA» para que no
             se publique así por descuido.
     false → el formulario de verdad. */
  modoPrueba: false,

  /* ── Dónde se guardan las respuestas ───────────────────
     'local'    → en el navegador de esta computadora (localStorage).
     'supabase' → en la base de LA PIZARRA, tabla `casting`
                  (supabase/casting.sql, ya creada). El equipo entra
                  con su correo y contraseña de LA PIZARRA. */
  motor: 'supabase',

  supabase: {
    /* El proyecto de LA PIZARRA. La llave publicable está hecha
       para vivir en el navegador: lo que protege los datos son
       las reglas de la tabla (anon sólo inserta; leer, cambiar y
       borrar es sólo con cuenta). */
    url:   'https://wrezcukptrtmnhnlxmao.supabase.co',
    llave: 'sb_publishable_XTkkarWw-P3Ls31g5ZDTOA_ZghkWshN',
    tabla: 'casting',
  },

  /* ── Avisos por correo ─────────────────────────────────
     Cada registro nuevo manda un correo con los datos del alumno y
     una liga a la vista del equipo. Sale por EmailJS, con el mismo
     servicio y plantilla que usa la plataforma de solicitudes (las
     llaves son públicas: viven en el navegador). El plan gratuito da
     200 correos al mes entre las dos plataformas; si la convocatoria
     se llena, poner activo: false y revisar equipo.html.
     OJO (19-oct-2026): en las pruebas la API aceptaba la petición pero
     tardaba más de 40 s en contestar; el formulario no espera la
     respuesta, así que al alumno no lo detiene. */
  avisos: {
    activo:  true,
    correos: ['leonardo.gonzalez@tijuana.ibero.mx', 'marysol.castro@tijuana.ibero.mx'],   // a quién le llega
    emailjs: {
      publica:   'OsE5ud5yypn13z0FL',
      servicio:  'service_dixokk6',
      plantilla: 'template_3ibijhm',
    },
    vistaEquipo: 'https://cci-iberotj.github.io/convocatoria-imagen/equipo.html',
  },

  /* ── La convocatoria ───────────────────────────────────── */
  titulo:   'La IBERO se ve como tú',
  bajada:   'Buscamos alumnas y alumnos de todas las carreras para ser la imagen de la IBERO en fotos y video. ¿Te animas?',
  area:     'Comunicación Institucional',
  sitio:    'tijuana.ibero.mx',

  /* Lo que se lleva quien participa. Sale en la pantalla de inicio,
     después de «Te llevas…». */
  incentivo: 'tus fotos editadas y una constancia de participación',

  /* ── Fotos ─────────────────────────────────────────────
     Viven en fotos/ (sesión de estudiantes del 28 de septiembre,
     exportadas a 1400 px). Las de inicio forman el mosaico de
     arriba: la primera sale grande a la izquierda y las otras dos
     apiladas a la derecha. Con la lista vacía no sale mosaico. */
  fotos: {
    portada: 'fotos/dsc00055.jpg',          // la de pantalla completa al abrir (la 00058 traía gente atrás)
    portadaFoco: '58% 28%',                 // qué parte de la foto se conserva al recortar (x% y%)
    galeria: ['fotos/dsc00177.jpg', 'fotos/dsc00133.jpg', 'fotos/dsc00195.jpg'],
    listo:   'fotos/dsc00123.jpg',          // cabecera de la pantalla final
    /* las otras exportadas, por si se quieren cambiar:
       fotos/dsc00087.jpg (alumna con libro bajo el árbol)
       fotos/dsc00123.jpg (alumno con suéter rojo en biblioteca) */
  },

  /* La cinta roja que corre debajo de la portada. */
  cinta: ['Sesiones del 26 al 30 de octubre', 'Todas las carreras', 'Son tres minutos', 'Te llevas tus fotos'],

  /* El aviso de ropa. Sale grande en la página y se repite al final. */
  ropa: {
    titulo: 'Ese día ponte algo claro… y algo rojo.',
    texto:  'Camisa, playera o sudadera en blanco, beige o gris claro, y un detalle rojo: suéter, gorra, chamarra, lo que tengas. Sin logotipos de otras marcas.',
    /* los círculos de color que acompañan al aviso */
    muestras: ['#FFFFFF', '#F3EDE4', '#DDD7D0', '#E0202B'],
  },

  /* Contacto. Mientras estén vacíos, el formulario no los muestra. */
  contacto: {
    correo:   '',        // p. ej. 'comunicacion@tijuana.ibero.mx'
    whatsapp: '',        // p. ej. '664 123 4567'
    avisoPrivacidad: '', // URL del aviso integral; vacío = no se liga
  },

  /* Fechas que salen en los textos. Se escriben como se leen. */
  fechas: {
    cierreRegistro: 'jueves 22 de octubre',
    aviso:          'viernes 23 de octubre',
    /* Si se pone una fecha ISO aquí, al pasar esa hora el
       formulario deja de aceptar registros y lo dice. Vacío = no
       cierra solo. Ejemplo: '2026-10-22T23:59:00-07:00' */
    cierreISO:      '',
  },

  /* ── La rejilla de disponibilidad ──────────────────────
     Cinco días a partir del lunes 26 de octubre de 2026.
     Bloques de una hora de horaInicio a horaFin (8 → 18 son diez
     bloques: 8:00-9:00 … 17:00-18:00). */
  semana: {
    inicio:     '2026-10-26',   // lunes
    dias:       5,
    horaInicio: 8,
    horaFin:    18,
  },

  /* Horas mínimas que debe marcar un alumno para poder enviar. */
  horasMinimas: 2,

  /* ── Carreras (organigrama oficial 2026) ────────────── */
  carreras: [
    'Arquitectura',
    'Ingeniería en Mecatrónica',
    'Ingeniería Industrial en Manufactura Inteligente',
    'Comunicación',
    'Derecho',
    'Administración de Negocios Internacionales',
    'Administración de Empresas',
    'Enfermería',
    'Nutrición',
    'Psicología',
    'Medicina',
    'Posgrados',
  ],
  semestres: 10,
  /* Un color por carrera, en el mismo orden que la lista de arriba. Se
     usa en la vista del equipo (panel de carreras y marca de cada ficha).
     Son los tonos de LA PIZARRA: todos aguantan texto blanco encima. */
  coloresCarreras: [
    '#A62E48', '#7A4E18', '#34527A', '#5C3F85', '#106459', '#3F5A37',
    '#96231F', '#2F4E7A', '#A32A6E', '#0A5AA8', '#4A5568', '#7B1E2E',
  ],
  /* Cómo se llama la opción de semestre para quien ya terminó; se guarda
     como semestre 0. */
  egresado: 'Egresado/a',
  /* Cómo se llama la opción de semestre para quien ya terminó; se guarda
     como semestre 0. */
  egresado: 'Egresado/a',

  /* Correo: si se pone un dominio (p. ej. 'ibero.mx') sólo se aceptan
     correos que terminen así. Vacío = cualquier correo, porque la
     convocatoria también es para egresados (Leo, 20-oct-2026). */
  dominioCorreo: '',

  /* ── La foto del registro ───────────────────────────────
     Se guarda a este tamaño (lado largo) y calidad JPEG. A 640 px
     y 0.82 pesa entre 40 y 80 KB: suficiente para reconocer una
     cara y ligero para la base. */
  foto: { lado: 640, calidad: 0.82 },

  /* Género: lo pregunta el formulario (para que el equipo pueda
     balancear) y se puede corregir desde la ficha. */
  generos: [
    { id: 'mujer',  nombre: 'Mujer' },
    { id: 'hombre', nombre: 'Hombre' },
    { id: 'otro',   nombre: 'Prefiero no decirlo' },
  ],

  /* ── Las sesiones ───────────────────────────────────────
     El plan de la semana (plan-sesiones.md). Cada una tiene un id
     corto (se guarda en el registro del alumno), día, hora, nombre,
     y las carreras que le tocan (sólo para sugerir a quién agregar;
     se puede meter a cualquiera). Si cambia el plan, se cambia aquí. */
  sesiones: [
    { id: 'mar-com', dia: '2026-10-27', hora: '14:00–17:00', lugar: '', nombre: 'Comunicación y Derecho',     carreras: ['Comunicación', 'Derecho'] },
    { id: 'mie-med', dia: '2026-10-28', hora: '12:00–14:00', lugar: '', nombre: 'Medicina y Enfermería',      carreras: ['Medicina', 'Enfermería'] },
    { id: 'vie-ing', dia: '2026-10-30', hora: '12:00–15:00', lugar: '', nombre: 'Ingenierías y Arquitectura', carreras: ['Arquitectura', 'Ingeniería en Mecatrónica', 'Ingeniería Industrial en Manufactura Inteligente'] },
  ],

  /* ── Mensajes por WhatsApp ──────────────────────────────
     Los redactó Marysol (23-oct-2026). El botón de cada alumno abre
     WhatsApp con el que le toca ya escrito; se puede retocar antes de
     mandarlo. Se rellenan solos:
       {nombre}   primer nombre del alumno
       {fecha}    «Lunes 26 de octubre»
       {horario}  sus horas dentro de la sesión (si es escalonada, las suyas)
       {lugar}    el lugar de la sesión (arriba, en sesiones → lugar);
                  vacío = «te lo confirmamos por aquí»  */
  mensajes: {
    convocado: `¡Hola, {nombre}! 👋

Muchas gracias por querer ser parte de nuestra próxima campaña de IBERO Tijuana. ❤️

Nos emociona muchísimo que nuestras y nuestros estudiantes sean quienes representen a la universidad y le den vida a esta campaña.

Para esta primera sesión, logramos hacer coincidir tu disponibilidad con uno de nuestros horarios de producción:

📅 Fecha: {fecha}
🕐 Horario: {horario}
📍 Lugar: {lugar}

👕 Un detalle para ese día: ven con ropa en tonos claros (blanco, beige o gris claro) y súmale algo rojo, como un suéter, una gorra o una chamarra. De preferencia sin logotipos de otras marcas.

Gracias por sumarte y por ayudarnos a mostrar a la comunidad que hace IBERO todos los días. ✨

¡Nos vemos pronto!`,
    noConvocado: `¡Hola, {nombre}! 👋

Muchas gracias por querer ser parte de nuestra próxima campaña de IBERO Tijuana. ❤️

Para esta primera ronda de sesiones estuvimos armando los grupos de acuerdo con la disponibilidad de horarios y, en esta ocasión, no logramos hacer coincidir los tiempos.

Pero queremos seguir contando contigo. Esta campaña busca construirse con nuestras y nuestros estudiantes, porque son ustedes quienes le dan vida y personalidad a IBERO.

Esperamos poder integrarte en las siguientes sesiones. ✨

Gracias por sumarte y por querer ser parte de la imagen de nuestra comunidad.`,
  },
  /* Ladas de Estados Unidos: esos números van con +1 y no con +52.
     (Varios alumnos de Tijuana tienen número de San Diego.) */
  ladasEstadosUnidos: ['619', '858', '760', '909', '951', '949', '714', '657', '562', '213', '310', '323', '424', '626', '818', '747'],

  /* Estados que el equipo le pone a cada registro. */
  estados: ['nueva', 'convocada', 'descartada'],

  version: '1.17',
};
