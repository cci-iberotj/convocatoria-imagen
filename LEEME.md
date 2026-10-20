# Convocatoria · La IBERO se ve como tú
### Casting de alumnos para fotos y video institucional · Comunicación Institucional, IBERO Tijuana

Tres piezas en una carpeta:

| Archivo | Qué es |
|---|---|
| `convocatoria.md` | El texto completo de la convocatoria para revisar con el equipo, con las decisiones pendientes marcadas **[así]** y una recomendación para cada una. |
| `index.html` | La página que ven los alumnos (celular primero): landing con portada a pantalla completa, cinta, galería, pasos, aviso de ropa; y luego el registro: nombre, carrera (con «Posgrados»), semestre, correo, teléfono; foto con la cámara, rejilla de disponibilidad y consentimiento. Sin matrícula ni Instagram (Leo, 19-oct); un registro por correo. Abierta también a egresados (20-oct): cualquier correo y la opción «Egresado/a» en semestre (se guarda como semestre 0). Los estilos de la landing están en `inicio.css`; los del registro y la vista del equipo en `estilos.css`. |
| `equipo.html` | La vista del equipo: lista con foto, contacto, mapa de calor de disponibilidad, ficha con estado y nota, borrado y exportación a CSV. |

**Publicado:** https://cci-iberotj.github.io/convocatoria-imagen/. Los registros se ven en **LA PIZARRA → pestaña Convocatoria** (globo con los nuevos; la vista del equipo va incrustada con la misma sesión) o sueltos en `/equipo.html` con cuenta de LA PIZARRA. Las respuestas se guardan en la base de LA PIZARRA (tabla `casting`, creada el 19-oct-2026).

---

## Verlo ahora

Doble clic en **`ABRIR.bat`** (o `python servidor.py`). Abre
http://localhost:8791/ con el formulario; la vista del equipo está en
http://localhost:8791/equipo.html.

Hace falta el servidor porque la cámara sólo funciona en `localhost` o
en `https`, no abriendo el archivo directo.

En **modo local** (el de ahora) las respuestas viven en el navegador de
esta computadora: lo que llenes en el formulario aparece en la vista del
equipo. El botón **Cargar datos de muestra** mete 18 alumnos inventados
para ver el mapa de calor y la lista con algo adentro.

**Lo que NO se puede probar en local:** la cámara real de un teléfono.
Desde un celular en la misma red la página abre por `http://IP:8791`,
pero ahí el navegador bloquea la cámara (no es `https`); sólo funciona
«Subir una foto». La cámara de verdad se prueba cuando esté publicado.

## Modo prueba (mientras se construye)

`config.js` → `modoPrueba: true`: se puede recorrer el formulario completo
sin llenar nada; ningún paso detiene y, al enviar, si faltan datos enseña
la pantalla final con un aviso de que no se guardó. Abajo a la derecha
sale la etiqueta «Modo prueba» para que no se publique así por descuido.
**Antes de publicar: `modoPrueba: false`.**

## Fotos

Seis fotos de la sesión de estudiantes del 28 de septiembre de 2026
(`D:\Sesión Estudiantes GENERAL 28 Sep\Edited`), exportadas a 1400 px en
`fotos/`. En `config.js` → `fotos` se dice cuál es la portada (`portada`, con
`portadaFoco` para elegir qué parte se conserva al recortar), cuáles
las tres de la galería y cuál la de la pantalla final.

## Todo lo que se ajusta: `config.js`

- **Fechas** que salen en los textos (cierre de registro, aviso) y
  `cierreISO` para que el formulario cierre solo a una hora.
- **La semana de la rejilla**: lunes de inicio, cuántos días, hora
  inicial y final (8 → 18 son diez bloques de una hora).
- **Horas mínimas** que debe marcar un alumno.
- **Contacto** (correo, WhatsApp, liga al aviso de privacidad). Mientras
  estén vacíos no se muestran.
- **Incentivo**, título, bajada, carreras (las 11 del organigrama 2026),
  número de semestres, `egresado` (nombre de esa opción), `dominioCorreo`
  (vacío = cualquier correo; 'ibero.mx' = sólo institucionales), tamaño
  y calidad de la foto.
- **`motor`**: `'local'` o `'supabase'`.
- **`modoPrueba`** y **`fotos`** (ver arriba); **`cinta`** (las frases que corren en la franja roja) y **`ropa`** (título, texto y círculos de color del aviso de prendas).

## Dónde viven las respuestas

Es **una tabla `casting` en la base de LA PIZARRA**, con el
mismo patrón que `solicitudes` y `revisiones`: cualquiera puede dejar su
registro (anon sólo inserta, con forma y tamaño acotados); leer, cambiar
estado o borrar es sólo con cuenta de LA PIZARRA (Leo, Silvia, Sergio,
Sol ya la tienen). La foto va dentro del renglón como JPEG en base64
(~60 KB), así no hay cubeta de Storage con permisos para anónimos y
`respaldar.py` se la lleva junto con todo.

El SQL está en `supabase/casting.sql` y **ya se corrió** (19-oct-2026). Para volver a aplicarlo o cambiar algo:


```
python supabase/correr.py casting.sql
```

`config.js` ya tiene `motor: 'supabase'`. Para volver a revisar el diseño sin tocar la base, cambiarlo a `'local'`.

Por qué no un proyecto aparte de Supabase (como Nuestra Órbita): es
trabajo institucional, el equipo ya tiene cuentas en LA PIZARRA, y un
proyecto más es otro token, otro respaldo y otra contraseña que mantener.

## Cartel tabloide (difusión interna)

En `difusion/`, dos versiones de 11 × 17 in, cada una con sus controles
en el `:root` del HTML:

- `cartel-tabloide.html`: con la foto de portada, cinta, tres bloques,
  aviso de ropa y QR (la información completa).
- `cartel-tabloide-minimo.html`: sin foto; un círculo rojo con tres
  siluetas reales de la sesión (vector) adentro, un signo de
  interrogación en cada cara, el título «Sé parte de la imagen de IBERO
  Tijuana», una línea y el QR (sin liga escrita). Colores, círculo,
  altura y posición de cada figura y de cada signo, todo en el `:root`
  y en el `style` de cada figura.

  Las siluetas las hace `siluetas.py`: Canva quitó el fondo de tres
  fotos propias (su vista previa vuelve chica), esa máscara se escala y
  sirve de semilla a GrabCut (OpenCV) a tamaño real, y el contorno se
  traza a SVG en `siluetas/siluetas.js`. Para otra figura: subir la foto
  a Canva, quitar el fondo, guardar la vista previa y agregar el par en
  `PARES`.

- `pantalla.html`: la pieza para las pantallas del campus (16:9, se
  exporta a 3840 × 2160 en PNG y JPG como las de `2026/13_PANTALLAS`):
  foto a la izquierda, título «Sé parte de la imagen de IBERO Tijuana»,
  una línea con la fecha de cierre y el QR. Nada más, para leerse de paso.
- `story.html`: Story de Instagram (1080 × 1920): la foto vertical de la
  biblioteca (`story-foto.jpg`, DSC00133) a sangre, título, fecha y la
  pastilla «Me apunto · Toca el enlace». Sin QR: el enlace va en el
  sticker al subirla, por eso las franjas de arriba y abajo (≈250 px)
  quedan libres. `python construir.py story`.

`construir.py` genera el QR a la liga publicada y, por cada cartel, el
PDF con Chrome (fuentes a curvas, sin márgenes) y un PNG para mirarlo;
para la pantalla, la captura a 4K. `python construir.py pantalla` hace
sólo esa. Si un PDF está abierto en un visor, el nuevo queda como
«(nuevo).pdf». La carpeta no se sube al repositorio
(está en `.gitignore`): es material de impresión, no de la página.

```
python difusion/construir.py
```

## Avisos

- **En LA PIZARRA:** la pestaña Convocatoria trae un globo con los registros
  nuevos desde la última vez que se abrió; se refresca cada 20 s mientras LA
  PIZARRA está abierta.
- **Por correo (EmailJS):** `config.js → avisos` manda un correo por registro a
  Leo y Marysol con el mismo servicio de la plataforma de solicitudes. El
  19-oct-2026 la API aceptaba la petición pero el envío no terminaba (el
  servicio de correo conectado en la cuenta de EmailJS responde con error);
  se arregla reconectándolo en dashboard.emailjs.com → Email Services. El
  formulario no espera la respuesta, así que al alumno no lo detiene.

## Publicar

```
python publicar.py "qué cambió"
```

Sube la versión en `config.js`, la estampa como `?v=` en los dos HTML
(para que el navegador no se quede con la copia vieja de Pages), hace
el commit y lo empuja por la API de GitHub con `empujar.py` (la red
bloquea `github.com:443`). Repositorio `cci-iberotj/convocatoria-imagen`.
`publicar.py` se niega si `modoPrueba` está en `true`. La vista del
equipo se publica junto: no tiene nada secreto, y sin cuenta no lee nada.

## Tipografía y paleta

Alverata (títulos) y MyriadIbero (texto) van empotradas en
`tipografia.css`, copiadas tal cual del generador de piezas de LA
PIZARRA. El formulario (`body.alegre`) usa el rojo vivo de la rúbrica
(#E0202B, que con blanco mide 4.76:1; el #ea242f exacto da 4.38 y no
pasa para texto de botón), fondo casi blanco y las fotos; Leo pidió
(19-oct) un tono joven y menos serio. La vista del equipo se queda con la
paleta sobria de LA PIZARRA: rojos oscuros, grises, negro y blanco. Sin logotipo, por criterio de Leo: la identidad la cargan el rótulo
de área, la paleta y tijuana.ibero.mx. Todos los pares de color usados
miden ≥ 5.4:1.
