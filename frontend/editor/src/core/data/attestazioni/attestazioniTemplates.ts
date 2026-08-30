/**
 * Attestazioni di conformita - default templates for the Italian legal edition.
 *
 * Wording follows the statutory text of each provision. Every template is editable and new
 * ones can be added from the tool, so these are a starting point, not a fixed set: the
 * lawyer signing the attestation is the one responsible for its content.
 *
 * Placeholders are `{{chiave}}`. Profile keys (difensore, codiceFiscale, foro, studio, pec)
 * come from the stored difensore profile; `elencoAtti` is built from the per-document
 * descriptions; the rest are declared per template in `campi`.
 */

export interface CampoModello {
  chiave: string;
  etichetta: string;
  multilinea?: boolean;
  obbligatorio?: boolean;
  suggerimento?: string;
}

export interface AttestazioneTemplate {
  id: string;
  nome: string;
  gruppo: string;
  titolo: string;
  corpo: string;
  campi: CampoModello[];
  /** Whether the numbered list of attested documents is part of this template. */
  usaElencoAtti: boolean;
  /**
   * Set when the statutory citation depends on the date of the attestation. Resolved by
   * {@link risolviRiferimento} so a template never carries a citation that has lapsed.
   */
  riferimentoDinamico?: "tributario";
  /** True for templates the user created; defaults can be edited but not deleted. */
  personalizzato?: boolean;
}

const CAMPO_PARTE: CampoModello = {
  chiave: "parte",
  etichetta: "Parte assistita",
  obbligatorio: true,
  suggerimento: "Mario Rossi, C.F. ...",
};

const CAMPO_UFFICIO: CampoModello = {
  chiave: "ufficio",
  etichetta: "Ufficio giudiziario",
  obbligatorio: true,
  suggerimento: "Tribunale di Napoli",
};

const CAMPO_RG: CampoModello = {
  chiave: "rg",
  etichetta: "R.G. n.",
  obbligatorio: true,
  suggerimento: "1234/2026",
};

const CAMPO_NOTE: CampoModello = {
  chiave: "note",
  etichetta: "Note finali (facoltative)",
  multilinea: true,
  suggerimento:
    "Es.: Le presenti copie sono estratte ai fini della notificazione a mezzo Ufficiale Giudiziario.",
};

const FIRMA = "{{luogo}}, lì {{data}}\n\n{{difensore}}\n(firmato digitalmente)";

const INTESTAZIONE =
  "Il sottoscritto {{difensore}} (C.F. {{codiceFiscale}}), del Foro di {{foro}}, " +
  "con studio in {{studio}}, PEC {{pec}}, quale difensore di {{parte}}, " +
  "nel procedimento pendente dinanzi al {{ufficio}}, R.G. n. {{rg}},";

export const MODELLI_PREDEFINITI: AttestazioneTemplate[] = [
  {
    id: "196-octies",
    nome: "Copie da fascicolo informatico o comunicazioni telematiche",
    gruppo: "Civile",
    titolo: "ATTESTAZIONE DI CONFORMITÀ (art. 196-octies disp. att. c.p.c.)",
    corpo: [
      INTESTAZIONE,
      "",
      "A T T E S T A",
      "",
      "ai sensi e per gli effetti dell'art. 196-octies disp. att. c.p.c., che le copie degli atti e dei provvedimenti di seguito indicati, che precedono la presente attestazione, sono conformi ai corrispondenti documenti informatici presenti nel fascicolo informatico del procedimento ovvero a quelli contenuti nelle comunicazioni telematiche trasmesse dalla cancelleria o dall'UNEP, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [CAMPO_PARTE, CAMPO_UFFICIO, CAMPO_RG, CAMPO_NOTE],
    usaElencoAtti: true,
  },
  {
    id: "196-novies-1",
    nome: "Deposito telematico di copia di atto analogico",
    gruppo: "Civile",
    titolo:
      "ATTESTAZIONE DI CONFORMITÀ (art. 196-novies, primo comma, disp. att. c.p.c.)",
    corpo: [
      INTESTAZIONE,
      "",
      "A T T E S T A",
      "",
      "ai sensi e per gli effetti dell'art. 196-novies, primo comma, disp. att. c.p.c., che le copie informatiche, anche per immagine, degli atti e dei provvedimenti di seguito indicati, che precedono la presente attestazione e che vengono depositate con modalità telematiche, sono conformi ai corrispondenti atti formati su supporto analogico e detenuti dal sottoscritto in originale ovvero in copia conforme, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [CAMPO_PARTE, CAMPO_UFFICIO, CAMPO_RG, CAMPO_NOTE],
    usaElencoAtti: true,
  },
  {
    id: "196-novies-2",
    nome: "Espropriazione forzata - iscrizione a ruolo",
    gruppo: "Civile",
    titolo:
      "ATTESTAZIONE DI CONFORMITÀ (art. 196-novies, secondo comma, disp. att. c.p.c.)",
    corpo: [
      INTESTAZIONE,
      "",
      "A T T E S T A",
      "",
      "ai sensi e per gli effetti dell'art. 196-novies, secondo comma, disp. att. c.p.c., in relazione al deposito della nota di iscrizione a ruolo, che le copie informatiche degli atti indicati dagli articoli 518, sesto comma, 543, quarto comma, e 557, secondo comma, del codice di procedura civile, di seguito elencate e che precedono la presente attestazione, sono conformi ai corrispondenti originali, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [CAMPO_PARTE, CAMPO_UFFICIO, CAMPO_RG, CAMPO_NOTE],
    usaElencoAtti: true,
  },
  {
    id: "196-decies",
    nome: "Trasmissione all'ufficiale giudiziario",
    gruppo: "Notificazioni",
    titolo: "ATTESTAZIONE DI CONFORMITÀ (art. 196-decies disp. att. c.p.c.)",
    corpo: [
      INTESTAZIONE,
      "",
      "A T T E S T A",
      "",
      "ai sensi e per gli effetti dell'art. 196-decies disp. att. c.p.c., che le copie informatiche, anche per immagine, degli atti, dei provvedimenti e dei documenti di seguito indicati, trasmesse con modalità telematiche all'ufficiale giudiziario e che precedono la presente attestazione, sono conformi ai corrispondenti atti formati su supporto analogico e detenuti dal sottoscritto in originale ovvero in copia conforme, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [CAMPO_PARTE, CAMPO_UFFICIO, CAMPO_RG, CAMPO_NOTE],
    usaElencoAtti: true,
  },
  {
    id: "richiesta-notifica",
    nome: "Richiesta di notificazione all'ufficiale giudiziario",
    gruppo: "Notificazioni",
    titolo: "RICHIESTA DI NOTIFICAZIONE",
    corpo: [
      "Il sottoscritto {{difensore}} (C.F. {{codiceFiscale}}), del Foro di {{foro}}, con studio in {{studio}}, PEC {{pec}}, quale difensore di {{parte}},",
      "",
      "D I C H I A R A",
      "",
      "ai sensi dell'art. 137, ultimo comma, c.p.c., che la notificazione a mezzo di posta elettronica certificata o di servizio elettronico di recapito certificato qualificato non è possibile, in quanto {{clausolaDestinatari}},",
      "",
      "e conseguentemente",
      "",
      "C H I E D E",
      "",
      "che l'Ill.mo Sig. Ufficiale Giudiziario voglia procedere alla notificazione dell'atto che precede nei confronti di:",
      "",
      "{{destinatari}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [
      CAMPO_PARTE,
      {
        chiave: "destinatari",
        etichetta: "Destinatari della notifica",
        multilinea: true,
        obbligatorio: true,
        suggerimento:
          "Cognome Nome, nato a ... il ..., C.F. ..., residente in ...",
      },
      CAMPO_NOTE,
    ],
    usaElencoAtti: false,
  },
  {
    id: "tributario",
    nome: "Processo tributario telematico",
    gruppo: "Tributario",
    titolo: "ATTESTAZIONE DI CONFORMITÀ ({{riferimento}})",
    corpo: [
      "Il sottoscritto {{difensore}} (C.F. {{codiceFiscale}}), del Foro di {{foro}}, con studio in {{studio}}, PEC {{pec}}, quale difensore di {{parte}}, nel ricorso pendente dinanzi alla {{ufficio}}, R.G. n. {{rg}},",
      "",
      "A T T E S T A",
      "",
      "ai sensi e per gli effetti del {{riferimento}}, che le copie informatiche, anche per immagine, degli atti, dei provvedimenti e dei documenti di seguito indicati, che precedono la presente attestazione, sono conformi ai corrispondenti atti formati su supporto analogico e detenuti dal sottoscritto in originale ovvero in copia conforme, ovvero ai corrispondenti documenti presenti nel fascicolo informatico o trasmessi in allegato alle comunicazioni telematiche dell'ufficio di segreteria, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [
      CAMPO_PARTE,
      {
        chiave: "ufficio",
        etichetta: "Corte di giustizia tributaria",
        obbligatorio: true,
        suggerimento: "Corte di giustizia tributaria di primo grado di Napoli",
      },
      CAMPO_RG,
      CAMPO_NOTE,
    ],
    usaElencoAtti: true,
    riferimentoDinamico: "tributario",
  },
  {
    id: "penale",
    nome: "Processo penale telematico",
    gruppo: "Penale",
    titolo: "ATTESTAZIONE DI CONFORMITÀ (art. 111-ter c.p.p.)",
    corpo: [
      "Il sottoscritto {{difensore}} (C.F. {{codiceFiscale}}), del Foro di {{foro}}, con studio in {{studio}}, PEC {{pec}}, quale difensore di {{parte}}, nel procedimento penale pendente dinanzi al {{ufficio}}, n. {{rg}},",
      "",
      "A T T E S T A",
      "",
      "ai sensi dell'art. 111-ter c.p.p., che le copie informatiche, anche per immagine, degli atti e dei documenti di seguito indicati, che precedono la presente attestazione, sono conformi ai corrispondenti atti presenti nel fascicolo informatico del procedimento, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [
      CAMPO_PARTE,
      {
        chiave: "ufficio",
        etichetta: "Autorità giudiziaria",
        obbligatorio: true,
        suggerimento: "Tribunale di Napoli - Sezione ...",
      },
      { ...CAMPO_RG, etichetta: "N. procedimento (R.G.N.R. / R.G. Trib.)" },
      CAMPO_NOTE,
    ],
    usaElencoAtti: true,
  },
  {
    id: "cad-22",
    nome: "Copia informatica di documento analogico (art. 22 CAD)",
    gruppo: "Amministrativo e CAD",
    titolo:
      "ATTESTAZIONE DI CONFORMITÀ DI COPIA INFORMATICA (art. 22 d.lgs. 82/2005)",
    corpo: [
      INTESTAZIONE,
      "",
      "A T T E S T A",
      "",
      "ai sensi dell'art. 22 del d.lgs. 7 marzo 2005, n. 82, che le copie informatiche, anche per immagine, dei documenti di seguito indicati, che precedono la presente attestazione, sono conformi ai corrispondenti documenti analogici detenuti dal sottoscritto in originale ovvero in copia conforme, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [CAMPO_PARTE, CAMPO_UFFICIO, CAMPO_RG, CAMPO_NOTE],
    usaElencoAtti: true,
  },
  {
    id: "duplicato",
    nome: "Duplicato informatico - dichiarazione",
    gruppo: "Amministrativo e CAD",
    titolo: "DICHIARAZIONE DI DEPOSITO DI DUPLICATO INFORMATICO",
    corpo: [
      INTESTAZIONE,
      "",
      "D I C H I A R A",
      "",
      "che i documenti informatici di seguito indicati, che precedono la presente dichiarazione, costituiscono duplicati informatici ai sensi dell'art. 1, comma 1, lettera i-quinquies), del d.lgs. 7 marzo 2005, n. 82, essendo stati ottenuti mediante memorizzazione della medesima sequenza di valori binari dei documenti informatici di origine, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "I predetti duplicati hanno, ai sensi dell'art. 23-bis, comma 1, del d.lgs. n. 82 del 2005, il medesimo valore giuridico, ad ogni effetto di legge, dei documenti informatici da cui sono tratti; non ricorre pertanto il presupposto dell'attestazione di conformità, istituto proprio delle sole copie ai sensi del comma 2 del medesimo articolo.",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [CAMPO_PARTE, CAMPO_UFFICIO, CAMPO_RG, CAMPO_NOTE],
    usaElencoAtti: true,
  },
  {
    id: "copia-analogica",
    nome: "Copia analogica di documento informatico",
    gruppo: "Amministrativo e CAD",
    titolo: "ATTESTAZIONE DI CONFORMITÀ DI COPIA ANALOGICA (art. 23 CAD)",
    corpo: [
      INTESTAZIONE,
      "",
      "A T T E S T A",
      "",
      "ai sensi dell'art. 23 del d.lgs. 7 marzo 2005, n. 82, che le copie analogiche degli atti e dei documenti di seguito indicati, che precedono la presente attestazione, sono conformi ai corrispondenti documenti informatici, sottoscritti con firma digitale, dai quali sono state tratte, e precisamente:",
      "",
      "{{elencoAtti}}",
      "",
      "{{note}}",
      "",
      FIRMA,
    ].join("\n"),
    campi: [CAMPO_PARTE, CAMPO_UFFICIO, CAMPO_RG, CAMPO_NOTE],
    usaElencoAtti: true,
  },
];

/**
 * The tax-process citation moved: art. 25-bis d.lgs. 546/1992 governs until 31 December 2026,
 * and art. 72 d.lgs. 175/2024 (as amended by d.lgs. 81/2025) from 1 January 2027. Resolving it
 * from the date of the attestation keeps a stored template from going stale.
 */
export function risolviRiferimento(
  template: AttestazioneTemplate,
  dataAttestazione: Date,
): string | null {
  if (template.riferimentoDinamico !== "tributario") return null;
  return dataAttestazione.getFullYear() >= 2027
    ? "art. 72 del d.lgs. 14 novembre 2024, n. 175"
    : "art. 25-bis del d.lgs. 31 dicembre 1992, n. 546";
}

/** Every placeholder the template actually references, in order of first appearance. */
export function segnapostiUsati(template: AttestazioneTemplate): string[] {
  const trovati: string[] = [];
  const testo = `${template.titolo}\n${template.corpo}`;
  const re = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;
  let m = re.exec(testo);
  while (m !== null) {
    if (!trovati.includes(m[1])) trovati.push(m[1]);
    m = re.exec(testo);
  }
  return trovati;
}

/**
 * Substitutes `{{chiave}}` with the supplied values. Unresolved placeholders are dropped
 * rather than printed verbatim - a stray `{{rg}}` in a filed attestation is worse than a gap -
 * and the blank lines they leave behind are collapsed.
 */
export function componiTesto(
  modello: string,
  valori: Record<string, string>,
): string {
  const sostituito = modello.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g,
    (_intero, chiave: string) => (valori[chiave] ?? "").trim(),
  );
  return sostituito
    .split("\n")
    .map((riga) => riga.replace(/[ \t]+$/, ""))
    // Three or more blank lines collapse to one: removing an optional field should not
    // leave a hole in the middle of the page.
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
