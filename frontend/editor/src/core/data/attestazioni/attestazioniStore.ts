/**
 * Local storage for the attestation feature: the signing lawyer's profile and any template
 * the user has edited or created.
 *
 * Deliberately browser-local. This is a single-user desktop build with no account and no
 * server-side user store, so there is nowhere else to put it; it also means the profile
 * never leaves the machine.
 */

import {
  AttestazioneTemplate,
  MODELLI_PREDEFINITI,
} from "@app/data/attestazioni/attestazioniTemplates";

const CHIAVE_PROFILO = "stirling-attestazioni-profilo";
const CHIAVE_MODELLI = "stirling-attestazioni-modelli";

export interface ProfiloDifensore {
  difensore: string;
  codiceFiscale: string;
  foro: string;
  studio: string;
  pec: string;
  luogo: string;
}

export const PROFILO_VUOTO: ProfiloDifensore = {
  difensore: "",
  codiceFiscale: "",
  foro: "",
  studio: "",
  pec: "",
  luogo: "",
};

/**
 * Shipped defaults: deliberately empty. The profile carries the personal data of whoever signs
 * the attestations - name, tax code, PEC - so a distributed build must not arrive with someone
 * else's details in it. Each user fills it once, from the tool, and it stays on their machine.
 */
export const PROFILO_PREDEFINITO: ProfiloDifensore = { ...PROFILO_VUOTO };

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

export function caricaProfilo(): ProfiloDifensore {
  const salvato = leggi<Partial<ProfiloDifensore>>(CHIAVE_PROFILO);
  if (!salvato) return { ...PROFILO_PREDEFINITO };
  return { ...PROFILO_PREDEFINITO, ...salvato };
}

export function salvaProfilo(profilo: ProfiloDifensore): void {
  scrivi(CHIAVE_PROFILO, profilo);
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
      "{{luogo}}, lÃ¬ {{data}}",
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
