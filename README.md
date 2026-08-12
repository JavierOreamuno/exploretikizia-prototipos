# Explore Tikizia — prototipos de diseño

Prototipos públicos para la propuesta de rediseño de Explore Tikizia (San Ramón de Alajuela, Costa Rica).

**Este repositorio contiene únicamente los prototipos.** La auditoría, la evidencia, el registro de hallazgos y los documentos comerciales se mantienen fuera del repositorio.

## Tres direcciones

Cada una es una decisión de negocio distinta, no una variación estética. **Las tres están sobre la Fase 1 del sitemap de handoff: La Fortuna.** A y B arrancan por la primera categoría, **Hiking & Trekking**, con los 8 productos reales de esa combinación destino × experiencia; C cubre el destino completo con su capa pilar.

| | Dirección | La apuesta | Pieza central |
|---|---|---|---|
| A | **The Local Expert** | Vende la escritura: el local que sabe cuál de los ocho vale tu martes. | Índice editorial de senderos con preview al puntero |
| B | **The Trail Data Specialist** | Vende la medición: publica distancia, desnivel, pendiente y perfil de los ocho. | Matriz comparativa filtrable + perfil de elevación |
| C | **The Commitment Ladder** | Vende la escalera: $0 → $10 → tour → combo → itinerario. | Hub de destino + página de atracción |

## Click-to-pay

A y B llevan el **funnel de reserva de cuatro pasos** que el proyecto necesita para WooCommerce Bookings: fecha con disponibilidad real, participantes con precio recalculado, extras y pago — todo en un panel, sin navegar fuera de la página.

Detalle que importa: el total del botón de pago y el del panel de resumen salen del **mismo objeto de estado**, así que no pueden discrepar. Los extras distinguen `por persona` de `por reserva`, y el cálculo está verificado de punta a punta: 2 adultos + 2 niños = $222, más almuerzo $14 × 4 y guía privado $20 = **$298**.

El calendario genera la disponibilidad a partir de la fecha, no al azar: el mismo mes se dibuja siempre igual, porque un demo que se rebaraja en cada recarga no se puede conversar con un cliente. Los días agotados y cerrados quedan tachados en vez de desaparecer.

Los campos de tarjeta son decorativos y lo dicen en pantalla. No hay procesador detrás.

## Estructura

```
a-local-expert/    index.html · tour.html          La Fortuna × Hiking & Trekking + funnel
b-chirripo/        index.html · tour.html          idem, en clave de datos medidos
c-ladder/          index.html · destination.html · attraction.html · tour.html
```

El nombre de carpeta `b-chirripo` se conserva para no romper enlaces ya compartidos; su contenido ya no es Chirripó.

## La capa pilar, en la dirección C

C es la única que además cubre la **capa informativa**, que es donde está el tráfico: `la fortuna waterfall` tiene 6.000 búsquedas y `la fortuna waterfall tour` tiene 60. El patrón `/{destino}/` = 1 hub + N atracciones se reusa sin cambios de arquitectura: abrir Monteverde o Chirripó es trabajo de contenido, no de desarrollo.

```
c-ladder/
├── index.html         portada · destinos, escalera, guías, catálogo filtrado por destino
├── destination.html   HUB  /la-fortuna/       · «things to do in la fortuna» + 5 atracciones
├── attraction.html    /la-fortuna/arenal-volcano/ · guía práctica + tours + enlace al blog
└── tour.html          /tours/arenal-volcano-hike/ · $66 · confirmación instantánea
```

El patrón `/{destino}/` = 1 hub + N atracciones se reusa sin cambios de arquitectura: abrir Monteverde o Chirripó es trabajo de contenido, no de desarrollo.

A y B cubren la misma Fase 1 desde la categoría Hiking & Trekking, sin hub ni página de atracción — su apuesta es el catálogo y la conversión, no la capa pilar.

## Falta fotografía de La Fortuna

El sitio actual tiene 505 imágenes y **cinco** son de La Fortuna. Las dos keywords más grandes de la Fase 1 no tienen ninguna:

| Página | Volumen | Fotos |
|---|---|---|
| Hub `/la-fortuna/` | 1,900 · TP 4,500 | 2 (una es la terminal de buses) |
| Arenal Volcano | 300 | 3 |
| La Fortuna Waterfall | **6,000** | **0** |
| Hanging Bridges | **2,900** | **0** |
| Río Celeste | 1,900 | 8 |
| Caño Negro | 250 | **0** |

Los prototipos lo muestran como un estado explícito —«Photograph needed», con el encuadre que falta— en vez de rellenar con imágenes de otro lugar. Ese estado es también la lista de tomas para la sesión previa al lanzamiento. Las imágenes que sí existen son de 800 px, así que como hero se ven blandas.

## Las dos líneas de producto

Un tour es una fecha y un asiento; un infoproducto es un archivo. Se venden, se entregan y se comercializan distinto, así que ninguna dirección los mezcla en la misma rejilla. Dónde discrepan es en **cómo conviven en la ficha de tour**, que es la decisión de negocio que hay que tomar:

| | Portada | Ficha de tour |
|---|---|---|
| A | Estantería editorial de guías | La guía se **adjunta** al viaje reservado: cubre los días que el tour no |
| B | Manifiesto: una guía por destino, con estado publicado o planificado | La guía como **especificación**, con la misma tabla de datos que usa para el permiso |
| C | Los escalones 1 y 2 de la escalera, desplegados | La guía como el **escalón de abajo**, con precio visible, para quien hoy no reserva |

Las tres incluyen la lista de equipaje gratuita con captura de correo, que es el mecanismo de lista: funciona para todos los destinos, y por eso es la única que se regala.

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
