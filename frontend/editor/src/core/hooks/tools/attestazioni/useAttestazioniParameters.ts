import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";
import { MODELLI_PREDEFINITI } from "@app/data/attestazioni/attestazioniTemplates";

export interface AttestazioniParameters extends BaseParameters {
  /** Id of the template to compile. */
  modelloId: string;
  /**
   * Id of the difensore (from the rubrica) who signs this attestation. Empty means "whoever is
   * currently selected in the rubrica" - the natural default on a single-lawyer machine.
   */
  profiloId: string;
  /** Values for the template's own fields, keyed by placeholder. */
  valori: Record<string, string>;
  /** Description of each attested document, keyed by file name. */
  descrizioni: Record<string, string>;
  /** Where the generated page goes relative to the documents. */
  posizione: "append" | "prepend";
  /** Join several selected documents into one PDF before attaching the attestation. */
  unisci: boolean;
  /** Body font size in points. */
  dimensioneCarattere: number;
  /** Date of the attestation, ISO yyyy-mm-dd. Empty means "today, at run time". */
  data: string;
  /**
   * Hand-edited heading and body. Empty means "compose from the template"; once the user types
   * in the preview these win verbatim, so a last-minute wording change never has to go through
   * the template editor.
   */
  titoloManuale: string;
  testoManuale: string;
}

export const defaultParameters: AttestazioniParameters = {
  modelloId: MODELLI_PREDEFINITI[0].id,
  profiloId: "",
  valori: {},
  descrizioni: {},
  posizione: "append",
  unisci: true,
  dimensioneCarattere: 11,
  data: "",
  titoloManuale: "",
  testoManuale: "",
};

export type AttestazioniParametersHook =
  BaseParametersHook<AttestazioniParameters>;

/**
 * A template is runnable as soon as one is chosen. Required fields are surfaced in the UI as
 * hints rather than hard blocks: an attestation is often prepared with a detail still to
 * confirm, and refusing to generate the page would be more obstructive than helpful.
 */
export function validateAttestazioniParameters(
  params: AttestazioniParameters,
): boolean {
  return Boolean(params.modelloId);
}

export const useAttestazioniParameters = (): AttestazioniParametersHook => {
  return useBaseParameters({
    defaultParameters,
    endpointName: "append-text-page",
    validateFn: validateAttestazioniParameters,
  });
};
