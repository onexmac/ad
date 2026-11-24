/**
 * Noticss: the model's part of an edition. Two calls on purpose:
 *
 *   1. research: web search, returns prose notes organised by storyline;
 *   2. structure: turns those notes into the brief (structured output).
 *
 * Keeping them apart keeps the search tool and the constrained output from
 * interacting, and the second call is cheap and deterministic.
 *
 * The brief is not a list of headlines: it clusters the news into storylines
 * and writes what each one means. Nothing is guessed: a value the sources do
 * not give is null.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { Brief, CATEGORIES, INDICATORS } from "./schema.mjs";

/** The model, overridable with the repository variable NOTICSS_MODEL. */
const MODEL = process.env.NOTICSS_MODEL || "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

const slotName = (slot) => (slot === "manana" ? "de la mañana" : "de la tarde");

const RESEARCH = ({ date, slot, previous }) => `Hoy es ${date} y estás preparando la edición ${slotName(slot)} de Noticss, un diario breve para un lector en Cartago, Costa Rica: dirige una empresa constructora y desarrolladora, y lee el país y el mundo, no solo su sector.

Buscá las noticias de las últimas ${slot === "manana" ? "24" : "12"} horas en cinco lentes. Cada una trae algo o dice explícitamente que no hubo nada:
1. POLÍTICA nacional seria (nada de farándula): Asamblea Legislativa, Ejecutivo, presupuesto, Contraloría, Sala IV, municipalidades.
2. ECONOMÍA: BCCR (tasa de política, inflación, tipo de cambio), Hacienda (déficit, deuda), empleo, crédito, INEC.
3. GEOPOLÍTICA: comercio y aranceles de EE. UU., inversión extranjera y zonas francas, precios internacionales de acero y combustible, Centroamérica, cualquier tensión externa con efecto trazable en Costa Rica.
4. CONSTRUCCIÓN: CFIA, permisos, SETENA, AyA, Cámara de la Construcción, vivienda y crédito hipotecario, e insumos (cemento, acero, agregados, combustible, flete).
5. TECNOLOGÍA, solo si pasó algo con efecto real en cómo o a qué costo se construye u opera un negocio (IA incluida). Si no, decilo.

${previous ? `La edición anterior (${previous.label}) ya contó estas historias:\n${previous.titles.map((t) => `- [${t.id}] ${t.title}`).join("\n")}\nRepetí una solo si hay novedades, y decí cuáles. ` : ""}${slot === "tarde" ? "Es la edición de la tarde: priorizá lo que cambió desde la mañana." : ""}

Organizá las notas POR HISTORIA, no por lente: una lente es un ángulo, una historia es una línea narrativa concreta. Para cada historia: un título de trabajo específico, su lente, los hechos, cifras, citas y fechas que la componen (cada uno con fuente, nombre y URL, y fecha), y qué significa para quien construye y vende vivienda en Cartago y qué vigilar.

Aparte, una RED MÁS ANCHA de 10 a 14 historias más para sugerencias, repartidas entre las cinco lentes y con más mundo: economía global, geopolítica, tecnología e IA, historia y sociedad cuando tengan relación con esas lentes, gestión de empresas. Menos urgentes, igual de sólidas, cada una con sus fuentes.

Además, las últimas observaciones (con fecha y fuente) de: tipo de cambio de venta del BCCR, Tasa Básica Pasiva, Drewry World Container Index (contenedor de 40 pies), e índices INEC de precios de construcción de cemento y de varilla. Si una serie no aparece, decí "serie no encontrada".

Reglas: solo lo que las fuentes respalden; no estimés, no interpolés, no rellenés; si un valor no aparece, "no encontrado". Separá el hecho de tu lectura. Nada de farándula, deportes ni sucesos, salvo efecto económico directo.

Devolvé notas en prosa, organizadas por historia. No devuelvas JSON.`;

const STRUCTURE = ({ date, slot, notes, previous }) => `Convertí estas notas en la edición ${slotName(slot)} del ${date} de Noticss.

NOTAS:
${notes}

Reglas:
- "subjects": entre 5 y 8 historias del día. UN SUBJECT ES UNA HISTORIA: si dos historias solo comparten la lente, son dos. Nunca agrupés por lente.
- "suggestions": entre 8 y 14 historias de la red más ancha, con el mismo formato. Ninguna repite un subject del día.
- "id" de un subject: corto, en minúsculas y con guiones (por ejemplo "jornadas-4x3"). ${previous ? `Si es la continuación de una historia de la edición anterior, usá exactamente su id: ${previous.titles.map((t) => t.id).join(", ")}.` : ""} Los ids de los snippets: el id del subject más un sufijo ("jornadas-4x3-votacion").
- "title": específico y corto. Nunca el nombre de la lente.
- "synopsis": el análisis en TRES frases y MÁXIMO 420 caracteres: qué pasa, por qué le importa a quien construye y vende vivienda en Cartago, qué vigilar. Concreto: costo, plazo, financiamiento, demanda.
- "scope": "cr" si la historia es costarricense, "mundo" si es internacional aunque tenga efecto local.
- "category": una de ${CATEGORIES.join(" | ")}.
- "importance" del subject: 3 si cambia una decisión esta semana, 2 si hay que saberlo, 1 si es contexto.
- "snippets": de 2 a 5 por historia, un átomo cada uno (un hecho, una cifra, una cita o una fecha). "kind": fact | quote | number | event. "headline" corto. "body" en una o dos frases. "why" solo si la implicación no es obvia; si no, null. "published": la fecha de la fuente (AAAA-MM-DD) o null. "tags": de 1 a 3, en minúsculas. "source": nombre del medio y URL de la nota.
- "image": siempre null en subjects y snippets (las fotos se resuelven después).
- "indicators": exactamente estos ids, en este orden: ${INDICATORS.map((i) => i.id).join(", ")}. "label", "unit" y "note" como en: ${JSON.stringify(INDICATORS)}. "value" como se lee en pantalla ("₡507,40", "3,66 %"), o null si las notas no lo traen. "delta": el cambio contra la observación anterior, o null. "series": la historia reciente en orden cronológico (mínimo 2 puntos) solo si las notas la traen con fuente; si no, null. "seriesNote": de dónde y de cuándo es la serie, o null. NUNCA inventés una cifra ni un punto.
- Español de Costa Rica, registro sobrio.`;

const text = (message) =>
  message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

function check(message, label) {
  if (message.stop_reason === "refusal") throw new Error(`${label}: refused (${message.stop_details?.category ?? "no category"})`);
  if (message.stop_reason === "max_tokens") throw new Error(`${label}: ran out of tokens`);
  // Server-tool errors arrive as results, not throws.
  const failed = message.content
    .filter((b) => b.type === "web_search_tool_result" && !Array.isArray(b.content))
    .map((b) => b.content?.error_code ?? "unknown");
  if (failed.length) console.warn(`${label}: web search reported ${failed.join(", ")}`);
}

async function research(client, ctx) {
  // No user_location: web search refuses country "CR" (400, "Country code CR
  // is not supported"), and the prompt already places the reader in Cartago.
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 24 }];
  let messages = [{ role: "user", content: RESEARCH(ctx) }];
  // The server's search loop can pause; resume it as it is, a few times at most.
  for (let turn = 0; turn < 5; turn++) {
    const message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 64000,
        betas: BETAS,
        fallbacks: "default",
        output_config: { effort: "high" },
        tools,
        messages,
      })
      .finalMessage();
    check(message, "research");
    if (message.stop_reason !== "pause_turn") {
      const notes = text(message);
      if (!notes) throw new Error("research: no text returned");
      return notes;
    }
    messages = [messages[0], { role: "assistant", content: message.content }];
  }
  throw new Error("research: still paused after 5 turns");
}

async function structure(client, ctx, notes) {
  const message = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 64000,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(Brief) },
      messages: [{ role: "user", content: STRUCTURE({ ...ctx, notes }) }],
    })
    .finalMessage();
  check(message, "structure");
  return Brief.parse(JSON.parse(text(message)));
}

/** Researches and writes the brief: { subjects, suggestions, indicators }. */
export async function generate(ctx) {
  const client = new Anthropic();
  console.log(`researching ${ctx.date} (${ctx.slot}) with ${MODEL}…`);
  const notes = await research(client, ctx);
  console.log(`notes: ${notes.length} chars; structuring…`);
  return structure(client, ctx, notes);
}
