# Histok — app de repaso

Vive en el portal en `/kit/histok`. Tiene su propio layout raíz
(`app/(histok)/`), así que no hereda el look claro del portal: fondo negro,
Roboto Serif, su ícono y su `themeColor`.

| Qué | Dónde |
| --- | --- |
| Rutas | `app/(histok)/kit/histok/` (índice y `tema/[slug]`) |
| Componentes | `components/histok/` |
| Resortes y háptica | `lib/histok/` |
| Contenido | `data/histok/topics.ts` |
| Imágenes | `public/kit/histok/images/` (en el código: `/kit/histok/images/…`) |
| Generadores y auditor | `scripts/histok/` (correlos desde la raíz del repo) |

Antes de pushear a `main`: `npx tsc --noEmit`, `npx eslint .` y
`node scripts/histok/audit-content.mjs`.
Reels de estudio para una estudiante de décimo en Costa Rica. Lema: *Más
Historia, menos Tik Tok*. Se usa **en un iPhone**, así que tiene que sentirse
nativa: gestos, resortes, nada de esperas.

- **En vivo:** https://magi0s.vercel.app/kit/histok
- **Stack:** Next.js (App Router) · TypeScript · Tailwind v4 · `motion`
- Importá siempre desde `motion/react`, **nunca** de `framer-motion`.

```bash
npm run dev          # servidor local
npx tsc --noEmit     # tipos
npx eslint .         # lint
node scripts/histok/audit-content.mjs   # auditoría de contenido — corré esto SIEMPRE
```

## Modelo de contenido

Todo vive en `data/histok/topics.ts`: `Semestre` → `Materia` → `Topic` (sección) →
`Slide`. La app arranca en `semestres` (dos carpetas: 1 Semestre y 2
Semestre).

- Una sección puede aparecer en dos materias: 2 Semestre › Biología reusa la
  genética de Biología I con `deBiologiaI("slug")` — el mismo objeto, no una
  copia. Por eso `topics` (la lista plana) se deduplica por `slug`.
- El auditor recorre semestres → materias → secciones y audita cada sección
  una sola vez.

```ts
type BodyPart =
  | string              // texto normal
  | { term: string }    // término del glosario: rojo y tocable
  | { name: string }    // personaje histórico: resaltado, no tocable
```

- `slide.info` es el pie de foto que aparece al **mantener presionada** la
  imagen. Describe la foto real y su fuente.
- `slide.diagram` muestra la imagen **entera** (sin recorte ni parallax), en
  vez de a sangre completa. Es para los gráficos dibujados de Biología.

## Reglas de contenido (se aprendieron a golpes)

1. **Un término del glosario nunca lleva su definición en la misma
   diapositiva.** Si el texto ya explica la palabra, tocar el rojo no enseña
   nada. El auditor marca cualquier solapamiento ≥45 %.
2. **Toda diapositiva lleva `info`.** Escribilo contra la fuente real de la
   imagen, no de memoria.
3. **Las imágenes salen de Wikimedia Commons**, con licencia libre
   verificada (dominio público, CC0, CC BY, CC BY-SA) y con la identidad de
   lo que muestran confirmada en la página del archivo. Redimensionalas a
   ~1600 px de lado mayor antes de commitear.
4. **Ninguna imagen se repite** entre diapositivas.
5. **Seguí la estructura del profesor.** Si él ve cuatro casos por separado,
   son cuatro secciones o cuatro diapositivas — no una sola combinada.
6. Los gráficos dibujados son SVG a 1000×1450, fondo azul oscuro `#070d24`
   y trazos neón. El dibujo va arriba (y < ~880): en el teléfono el texto de
   la diapositiva cubre la parte de abajo. **Salen de un generador en el
   repo**, no se dibujan a mano: `scripts/histok/neon.py` (primitivas: tarjeta,
   flecha, texto, brillo) y `scripts/histok/diagramas-*.py` (uno por materia).
   Para cambiar uno, editá su función y corré
   `python3 scripts/histok/diagramas-biologia-2s.py` desde la raíz. No hay
   rasterizador de SVG en el Mac: para mirarlos, una página HTML temporal en
   `public/kit/histok/_sheet*.html` (ignorada por git) que los muestre con `<img>` en
   el server local.
7. Los datos de Sociales son los del curso, aunque estén desactualizados (es
   lo que se evalúa). Si el curso trae un dato equivocado, el texto no lo
   repite como cierto: lo dice ("según el libro", "en 2023 India la
   superó").

## Semestres

El índice tiene una capa de carpetas encima de las materias. Abrir un
semestre empuja la lista de carpetas a la izquierda y entra el estante de
materias desde la derecha: el mismo empuje de película que una materia, un
nivel más arriba, movido por **su propia** MotionValue (`semAmt`), así que el
drill-in de materias de abajo no se tocó. Atrás: la fila "‹ 2 Semestre" o
deslizar a la derecha sobre el estante. En escritorio no hay carpetas: un
selector de dos pestañas arriba de la columna de materias.

Dónde estás se recuerda en `localStorage` (`histok:semestre`) y la app
reabre adentro de ese semestre. Dos trampas que costaron:

- El servidor no sabe qué recuerda el teléfono: se lee con
  `useSyncExternalStore` (el servidor dice "nada", el cliente dice lo real) y
  el estante está invisible hasta hidratar, para que la lista de carpetas no
  aparezca un cuadro antes de saltar adentro.
- La posición restaurada se aplica en el **siguiente cuadro**
  (`requestAnimationFrame`), no dentro del efecto: en desarrollo, StrictMode
  desmonta y remonta los efectos, y esa limpieza cancela la actualización que
  los `useTransform` tenían programada. La opacidad también es un valor
  derivado, para que posición y visibilidad caigan en el mismo cuadro.

## Interacciones

`ONBOARDING.md` es el manual de interacciones (Losa Flotante): resortes con
nombre, el gesto de arrastre, el patrón de "una sola MotionValue manda", y
las trampas de depuración. **Leelo antes de tocar animaciones.**

Dos que cuestan horas si no las sabés:

- El preview oculto **congela `requestAnimationFrame`**. No podés juzgar una
  animación ahí: verificá por medición (DOM, `getComputedStyle`) y dejá el
  "cómo se siente" para un aparato real.
- **Nunca corrás `next build` con el `next dev` levantado**: corrompe el caché
  de Turbopack y salen errores fantasma. Parás el server, `rm -rf .next`,
  y volvés a arrancar.
