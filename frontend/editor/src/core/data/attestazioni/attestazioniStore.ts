/**
 * Local storage for the attestation feature: the address book of signing lawyers and any
 * template the user has edited or created.
 *
 * Deliberately browser-local. This desktop build has no account and no server-side user
 * store, so there is nowhere else to put it; it also means the data never leaves the machine.
 *
 * Multi-lawyer studios can register several difensori (see the "rubrica" below) and pick, per
 * attestation, who signs it - the case a secretary preparing attestations for several lawyers
 * needs. A single previously-saved profile is migrated into the rubrica as its first entry, so
 * upgrading never loses the data already on the machine.
 */

import {
  AttestazioneTemplate,
  MODELLI_PREDEFINITI,
} from "@app/data/attestazioni/attestazioniTemplates";

const CHIAVE_PROFILO = "stirling-attestazioni-profilo";
const CHIAVE_MODELLI = "stirling-attestazioni-modelli";
const CHIAVE_RUBRICA = "stirling-attestazioni-rubrica";

export interface ProfiloDifensore {
  difensore: string;
  codiceFiscale: string;
  foro: string;
  studio: string;
  pec: string;
  luogo: string;
}

/** A profile plus the stable id the rubrica and the parameters refer to it by. */
export interface DifensoreRubrica extends ProfiloDifensore {
  id: string;
}

/** The saved list of difensori together with which one is currently the signer. */
export interface RubricaDifensori {
  difensori: DifensoreRubrica[];
  selezionatoId: string;
}

/** Stable id given to the entry migrated from the legacy single profile / shipped default. */
const ID_DIFENSORE_INIZIALE = "difensore-iniziale";

export const PROFILO_VUOTO: ProfiloDifensore = {
  difensore: "",
  codiceFiscale: "",
  foro: "",
  studio: "",
  pec: "",
  luogo: "",
};

/**
 * Shipped default for a fresh install: intentionally blank. This is a public build, so it must
 * carry no one's personal data; each user fills in their own difensore once, and it is then kept
 * locally on their machine (never in the source or the distributed binary).
 */
export const PROFILO_PREDEFINITO: ProfiloDifensore = {
  difensore: "",
  codiceFiscale: "",
  foro: "",
  studio: "",
  pec: "",
  luogo: "",
};

function leggi<T>(chiave: string): T | null {
  try {
    const grezzo = localStorage.getItem(chiave);
    return grezzo ? (JSON.parse(grezzo) as T) : null;
  } catch {
    // Private windows and cleared site data both land here; fall back to defaults.
    return null;
  }
}

function scrivi(chiave: string, valore: unknown): void {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    // Storage full or blocked: the current session still works, the change just is not kept.
  }
}

function generaId(): string {
  return `difensore-${Date.now()}`;
}

/** Keeps only the profile fields, for callers that don't need the rubrica id. */
function soloProfilo(d: DifensoreRubrica): ProfiloDifensore {
  return {
    difensore: d.difensore,
    codiceFiscale: d.codiceFiscale,
    foro: d.foro,
    studio: d.studio,
    pec: d.pec,
    luogo: d.luogo,
  };
}

/**
 * The starting rubrica for a machine that has never used it: the legacy single profile if one
 * was saved, otherwise the shipped default. Either way it becomes the first, selected entry.
 */
function rubricaIniziale(): RubricaDifensori {
  const legacy = leggi<Partial<ProfiloDifensore>>(CHIAVE_PROFILO);
  const base: DifensoreRubrica = {
    id: ID_DIFENSORE_INIZIALE,
    ...PROFILO_PREDEFINITO,
    ...(legacy ?? {}),
  };
  return { difensori: [base], selezionatoId: base.id };
}

/** Guarantees a non-empty list and a selezionatoId that actually points at an entry. */
function normalizzaRubrica(rubrica: RubricaDifensori): RubricaDifensori {
  const difensori =
    rubrica.difensori.length > 0
      ? rubrica.difensori
      : [{ id: ID_DIFENSORE_INIZIALE, ...PROFILO_VUOTO }];
  const selezionatoId = difensori.some((d) => d.id === rubrica.selezionatoId)
    ? rubrica.selezionatoId
    : difensori[0].id;
  return { difensori, selezionatoId };
}

export function caricaRubrica(): RubricaDifensori {
  const salvata = leggi<RubricaDifensori>(CHIAVE_RUBRICA);
  if (salvata && Array.isArray(salvata.difensori)) {
    return normalizzaRubrica(salvata);
  }
  // First run after the upgrade: derive the rubrica from whatever single profile exists.
  return rubricaIniziale();
}

export function salvaRubrica(rubrica: RubricaDifensori): void {
  scrivi(CHIAVE_RUBRICA, normalizzaRubrica(rubrica));
}

/** The difensore who currently signs: the selected one, with the first as a fallback. */
export function difensoreSelezionato(
  rubrica: RubricaDifensori,
): DifensoreRubrica {
  const norm = normalizzaRubrica(rubrica);
  return (
    norm.difensori.find((d) => d.id === norm.selezionatoId) ?? norm.difensori[0]
  );
}

/** The difensore an attestation carries, resolved from the id stored in its parameters. */
export function difensorePerId(
  rubrica: RubricaDifensori,
  id: string | undefined,
): DifensoreRubrica {
  const norm = normalizzaRubrica(rubrica);
  return norm.difensori.find((d) => d.id === id) ?? difensoreSelezionato(norm);
}

/** Adds a blank difensore and makes it the signer, ready for its fields to be filled in. */
export function aggiungiDifensore(rubrica: RubricaDifensori): RubricaDifensori {
  const nuovo: DifensoreRubrica = { id: generaId(), ...PROFILO_VUOTO };
  return normalizzaRubrica({
    difensori: [...rubrica.difensori, nuovo],
    selezionatoId: nuovo.id,
  });
}

export function aggiornaDifensore(
  rubrica: RubricaDifensori,
  id: string,
  campo: keyof ProfiloDifensore,
  valore: string,
): RubricaDifensori {
  return normalizzaRubrica({
    ...rubrica,
    difensori: rubrica.difensori.map((d) =>
      d.id === id ? { ...d, [campo]: valore } : d,
    ),
  });
}

export function eliminaDifensore(
  rubrica: RubricaDifensori,
  id: string,
): RubricaDifensori {
  const difensori = rubrica.difensori.filter((d) => d.id !== id);
  return normalizzaRubrica({
    difensori,
    selezionatoId:
      rubrica.selezionatoId === id
        ? (difensori[0]?.id ?? "")
        : rubrica.selezionatoId,
  });
}

export function selezionaDifensore(
  rubrica: RubricaDifensori,
  id: string,
): RubricaDifensori {
  return normalizzaRubrica({ ...rubrica, selezionatoId: id });
}

// --- Backwards-compatible single-profile helpers -------------------------------------------
// Kept so any caller that only wants "the current signer" keeps working; they now read and
// write the selected entry of the rubrica.

export function caricaProfilo(): ProfiloDifensore {
  return soloProfilo(difensoreSelezionato(caricaRubrica()));
}

export function salvaProfilo(profilo: ProfiloDifensore): void {
  const rubrica = caricaRubrica();
  salvaRubrica({
    ...rubrica,
    difensori: rubrica.difensori.map((d) =>
      d.id === rubrica.selezionatoId ? { ...d, ...profilo } : d,
    ),
  });
}

/**
 * Templates as the user sees them: the shipped set, with any edits applied in place, followed
 * by the ones the user added. A stored entry whose id matches a default overrides it, so a
 * later change to the shipped wording never silently replaces an edited template.
 */
export function caricaModelli(): AttestazioneTemplate[] {
  const salvati = leggi<AttestazioneTemplate[]>(CHIAVE_MODELLI) ?? [];
  const perId = new Map(salvati.map((m) => [m.id, m]));

  const predefinitiAggiornati = MODELLI_PREDEFINITI.map(
    (base) => perId.get(base.id) ?? base,
  );
  const idPredefiniti = new Set(MODELLI_PREDEFINITI.map((m) => m.id));
  const personalizzati = salvati.filter((m) => !idPredefiniti.has(m.id));

  return [...predefinitiAggiornati, ...personalizzati];
}

/** Persists only what differs from the shipped set, so defaults stay upgradeable. */
function salvaModificati(modelli: AttestazioneTemplate[]): void {
  const perIdPredefinito = new Map(MODELLI_PREDEFINITI.map((m) => [m.id, m]));
  const daSalvare = modelli.filter((m) => {
    const base = perIdPredefinito.get(m.id);
    if (!base) return true;
    return (
      base.titolo !== m.titolo ||
      base.corpo !== m.corpo ||
      base.nome !== m.nome
    );
  });
  scrivi(CHIAVE_MODELLI, daSalvare);
}

export function salvaModello(modello: AttestazioneTemplate): AttestazioneTemplate[] {
  const attuali = caricaModelli();
  const indice = attuali.findIndex((m) => m.id === modello.id);
  const aggiornati =
    indice >= 0
      ? attuali.map((m) => (m.id === modello.id ? modello : m))
      : [...attuali, modello];
  salvaModificati(aggiornati);
  return aggiornati;
}

/** Removes a user-created template. Shipped templates are reset instead of deleted. */
export function eliminaModello(id: string): AttestazioneTemplate[] {
  const idPredefiniti = new Set(MODELLI_PREDEFINITI.map((m) => m.id));
  if (idPredefiniti.has(id)) return ripristinaModello(id);
  const aggiornati = caricaModelli().filter((m) => m.id !== id);
  salvaModificati(aggiornati);
  return aggiornati;
}

/** Drops the user's edits to a shipped template, restoring the wording this build ships. */
export function ripristinaModello(id: string): AttestazioneTemplate[] {
  const base = MODELLI_PREDEFINITI.find((m) => m.id === id);
  if (!base) return caricaModelli();
  const aggiornati = caricaModelli().map((m) => (m.id === id ? base : m));
  salvaModificati(aggiornati);
  return aggiornati;
}

export function nuovoModello(nome: string): AttestazioneTemplate {
  return {
    // Date-based id: unique per creation and stable once stored.
    id: `personalizzato-${Date.now()}`,
    nome: nome.trim() || "Nuovo modello",
    gruppo: "Modelli personalizzati",
    titolo: "ATTESTAZIONE",
    corpo: [
      "Il sottoscritto {{difensore}}, del Foro di {{foro}},",
      "",
      "A T T E S T A",
      "",
      "{{elencoAtti}}",
      "",
      "{{luogo}}, lì {{data}}",
      "",
      "{{difensore}}",
      "(firmato digitalmente)",
    ].join("\n"),
    campi: [
      {
        chiave: "parte",
        etichetta: "Parte assistita",
      },
    ],
    usaElencoAtti: true,
    personalizzato: true,
  };
}
