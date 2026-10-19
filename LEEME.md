# Convocatoria · La IBERO se ve como tú
### Casting de alumnos para fotos y video institucional · Comunicación Institucional, IBERO Tijuana

Tres piezas en una carpeta:

| Archivo | Qué es |
|---|---|
| `convocatoria.md` | El texto completo de la convocatoria para revisar con el equipo, con las decisiones pendientes marcadas **[así]** y una recomendación para cada una. |
| `index.html` | La página que ven los alumnos (celular primero): landing con portada a pantalla completa, cinta, galería, pasos, aviso de ropa; y luego el registro: nombre, carrera (con «Posgrados»), semestre, correo, teléfono; foto con la cámara, rejilla de disponibilidad y consentimiento. Sin matrícula ni Instagram (Leo, 19-oct); un registro por correo. Los estilos de la landing están en `inicio.css`; los del registro y la vista del equipo en `estilos.css`. |
| `equipo.html` | La vista del equipo: lista con foto, contacto, mapa de calor de disponibilidad, ficha con estado y nota, borrado y exportación a CSV. |

**Publicado:** https://cci-iberotj.github.io/convocatoria-imagen/ (equipo: `/equipo.html`). Las respuestas se guardan en la base de LA PIZARRA (tabla `casting`, creada el 19-oct-2026).

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
  número de semestres, dominio del correo institucional, tamaño y
  calidad de la foto.
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
