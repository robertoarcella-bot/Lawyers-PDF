/**
 * Reads the court and the docket number (R.G.) out of a PDF, so an attestation does not have
 * to be filled in by hand from a document that already states them.
 *
 * The patterns are deliberately conservative. What they produce is copied into a document the
 * lawyer signs, so a miss the user then types in is harmless, while a confident wrong match is
 * not: nothing is guessed from context, and only an explicit, well-formed reference is taken.
 */

import { pdfWorkerManager } from "@app/services/pdfWorkerManager";

export interface DatiFascicolo {
  ufficio?: string;
  rg?: string;
}

/** Courts that introduce a place, e.g. "Tribunale di Napoli". */
const UFFICI = [
  "Corte suprema di cassazione",
  "Corte di cassazione",
  "Corte d'appello",
  "Corte di appello",
  "Corte di giustizia tributaria di primo grado",
  "Corte di giustizia tributaria di secondo grado",
  "Tribunale per i minorenni",
  "Tribunale di sorveglianza",
  "Tribunale amministrativo regionale",
  "Giudice di pace",
  "Tribunale",
];

/**
 * Docket references, with or without stops: "R.G. n. 25215/2026", "RG 1234/2025",
 * "RGE N. 1841/2019", "R.G.Es. 55/2020", "R.G.N.R. 987/2024".
 *
 * The register suffix (E / Es for esecuzioni, N.R. for the penal register, Lav for labour) is
 * optional and must be tried longest-first: with "E" ahead of "ES", "R.G.Es." would consume
 * only the E and then fail on the stray "s" where the number is expected.
 *
 * The year is required. A bare number is far too common in a pleading to be read as a docket
 * reference, and a wrong one would be copied into a document the lawyer signs.
 */
const RE_RG =
  /\bR\.?\s?G\.?(?:\s?(?:ES|E|N\.?\s?R|LAV)\.?)?\s*(?:n\.?|numero)?\s*(\d{1,7})\s*\/\s*(\d{4})\b/i;

/** Up to four capitalised words after the court name: "Napoli", "Santa Maria Capua Vetere". */
const LUOGO = "([A-ZÀ-Ü][a-zà-ÿ']+(?:\\s+[A-ZÀ-Ü][a-zà-ÿ']+){0,3})";

function normalizza(testo: string): string {
  return testo.replace(/\s+/g, " ").trim();
}

/**
 * Tokens that can follow a place name and must not be swallowed into it. Because the court
 * pattern matches case-insensitively, its "capitalised word" classes also accept "RGEs" and
 * the like, so "Tribunale di Torino RGEs 77/2018" would otherwise yield the place
 * "Torino RGEs".
 */
const RE_TOKEN_RUOLO =
  /^(?:R\.?\s?G\.?(?:ES|E|N\.?\s?R|LAV)?\.?|n\.?|numero|-|–|—|,)$/i;

/**
 * Words that start the next element of a court heading rather than continuing the place name.
 * A heading is typically stacked over several lines - "TRIBUNALE DI NAPOLI / Sezione 14 -
 * Esecuzioni Mobiliari / RGE N. 1841/2019" - and pdf.js hands them back as one run, so
 * without this the place would come out as "Napoli Sezione".
 */
const RE_TOKEN_SEGUITO =
  /^(?:sezione|sez\.?|sezioni|ufficio|uff\.?|esecuzioni|esecuzione|mobiliari|immobiliari|civile|penale|lavoro|volontaria|giurisdizione|fallimentare|ruolo|generale|cronologico|reg\.?|registro|proc\.?|procedimento|cron\.?)$/i;

/**
 * Court headings are routinely set in full capitals ("TRIBUNALE DI NAPOLI"), and the patterns
 * match case-insensitively, so the captured place has to be recased rather than copied. Only
 * an all-caps word is touched: "Santa Maria Capua Vetere" is already right, and a name with
 * deliberate internal capitals should keep them.
 */
function normalizzaLuogo(luogo: string): string {
  const parole = luogo.split(/\s+/);
  // Drop trailing noise: docket markers, the next heading element, anything with a digit.
  while (
    parole.length > 0 &&
    (RE_TOKEN_RUOLO.test(parole[parole.length - 1]) ||
      RE_TOKEN_SEGUITO.test(parole[parole.length - 1]) ||
      /\d/.test(parole[parole.length - 1]))
  ) {
    parole.pop();
  }
  return parole
    .map((parola) =>
      parola.length > 1 && parola === parola.toUpperCase()
        ? parola.charAt(0) + parola.slice(1).toLowerCase()
        : parola,
    )
    .join(" ");
}

/**
 * Restores the capitalisation of the court name as it is conventionally written. The place is
 * expected to have been through {@link normalizzaLuogo} already.
 */
function componiUfficio(nome: string, luogo: string): string {
  const titolo = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
  return `${titolo} di ${luogo}`;
}

export function estraiDatiDaTesto(testoGrezzo: string): DatiFascicolo {
  const testo = normalizza(testoGrezzo);
  const dati: DatiFascicolo = {};

  const rg = RE_RG.exec(testo);
  if (rg) {
    dati.rg = `${rg[1]}/${rg[2]}`;
  }

  for (const ufficio of UFFICI) {
    // Escape the apostrophe-bearing names and allow either apostrophe character.
    const nome = ufficio
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/'/g, "['’]");
    const re = new RegExp(`\\b${nome}\\s+(?:di\\s+|del\\s+|della\\s+)?${LUOGO}`, "i");
    const m = re.exec(testo);
    if (m) {
      const luogo = normalizzaLuogo(m[1]);
      // If cleaning left nothing, the "place" was only noise: report no court rather than
      // an amputated one like "Tribunale di ".
      if (luogo) {
        dati.ufficio = componiUfficio(ufficio, luogo);
        break;
      }
    }
  }

  return dati;
}

/**
 * Extracts the text of the first few pages and mines it. Only the opening pages are read: the
 * court and docket number belong to the heading of a pleading or an order, and scanning a
 * 300-page exhibit would cost far more than it could find.
 */
export async function rilevaDatiFascicolo(
  file: File,
  paginaMax = 3,
): Promise<DatiFascicolo> {
  let pdf: Awaited<ReturnType<typeof pdfWorkerManager.createDocument>> | null =
    null;
  try {
    const buffer = await file.arrayBuffer();
    pdf = await pdfWorkerManager.createDocument(buffer, {
      disableAutoFetch: true,
      disableStream: true,
    });

    const pagine = Math.min(pdf.numPages, paginaMax);
    let testo = "";
    for (let i = 1; i <= pagine; i++) {
      const pagina = await pdf.getPage(i);
      const contenuto = await pagina.getTextContent();
      // pdf.js splits a line into many items; joining with a space keeps "R.G." and the
      // number that follows it adjacent, which is what the patterns rely on.
      testo += ` ${contenuto.items
        .map((item: unknown) =>
          typeof item === "object" && item !== null && "str" in item
            ? String((item as { str: unknown }).str)
            : "",
        )
        .join(" ")}`;
    }
    return estraiDatiDaTesto(testo);
  } catch {
    // A scanned or malformed file simply yields nothing to prefill.
    return {};
  } finally {
    if (pdf) pdfWorkerManager.destroyDocument(pdf);
  }
}
