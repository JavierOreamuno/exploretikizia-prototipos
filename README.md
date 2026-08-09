# Explore Tikizia — prototipos de diseño

Prototipos públicos para la propuesta de rediseño de Explore Tikizia (San Ramón de Alajuela, Costa Rica).

**Este repositorio contiene únicamente los prototipos.** La auditoría, la evidencia, el registro de hallazgos y los documentos comerciales se mantienen fuera del repositorio.

## Tres direcciones

Cada una es una decisión de negocio distinta, no una variación estética. Las tres usan copy, precios e imágenes reales, e incluyen el catálogo de tours (propios y de reventa) con la distinción entre confirmación instantánea y reserva bajo solicitud.

| | Dirección | La apuesta |
|---|---|---|
| A | **The Local Expert** | Editorial y cálida. El viajero independiente que armó su itinerario y quiere que un local lo valide. |
| B | **The Chirripó Specialist** | Expedición, oscura, orientada a datos. El diferenciador defendible: el permiso de SINAC. |
| C | **The Commitment Ladder** | Clara, luminosa, orientada a producto. Cinco escalones con precio visible y catálogo de tours con filtros. |

Cada dirección incluye **portada** (`index.html`) y **ficha de tour** (`tour.html`), con un tour real distinto en cada una para cubrir ambos modos de confirmación de WooCommerce Bookings.

## Estructura

```
prototype/
├── index.html              índice comparador de las tres direcciones
├── assets/                  imágenes y tipografías auto-hospedadas
├── a-local-expert/          index.html (portada) · tour.html (ficha, bajo solicitud)
├── b-chirripo/               index.html (portada) · tour.html (ficha, instantánea)
└── c-ladder/                 index.html (portada) · tour.html (ficha, instantánea)
```

## Compilar

```bash
npm run build:pages   # prototype/ → dist/
```

El despliegue a GitHub Pages es automático desde `main` mediante GitHub Actions.

## Qué protege la compilación

`scripts/build-pages.mjs` **se niega a compilar** si en los archivos publicables aparece:

- el dominio de producción o rutas a `wp-content/uploads`
- enlaces `mailto:`, `tel:` o de WhatsApp reales
- direcciones de correo, teléfonos o perfiles sociales
- etiquetas de analítica
- nombres de reseñadores identificables

Las citas de las reseñas de Google se conservan porque demuestran el diseño; la atribución se generaliza a *"Verified traveller"*, ya que republicar personas identificables en un dominio de terceros es un acto distinto a que el cliente las publique en su propio sitio o en Google. Los nombres de Rodrigo Santamaria y Ligia Morera, dueños del negocio, no se tocan.

Además, cada página publicada debe declarar `noindex,nofollow` y no puede llevar `canonical`, `og:url` ni JSON-LD: son prototipos, no deben competir con el sitio real en buscadores.

## Aviso

Prototipos para evaluación. **No son páginas de reserva reales** y no procesan pagos.
