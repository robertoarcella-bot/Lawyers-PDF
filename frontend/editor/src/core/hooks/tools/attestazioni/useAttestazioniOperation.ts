import apiClient from "@app/services/apiClient";
import { useTranslation } from "react-i18next";
import {
  defineCustomTool,
  useToolOperation,
  CustomProcessorResult,
} from "@app/hooks/tools/shared/useToolOperation";
import { createStandardErrorHandler } from "@app/utils/toolErrorHandler";
import {
  AttestazioniParameters,
  defaultParameters,
  validateAttestazioniParameters,
} from "@app/hooks/tools/attestazioni/useAttestazioniParameters";
import {
  componiTesto,
  risolviRiferimento,
} from "@app/data/attestazioni/attestazioniTemplates";
import {
  caricaModelli,
  caricaProfilo,
} from "@app/data/attestazioni/attestazioniStore";

const ENDPOINT_ATTESTAZIONE = "/api/v1/misc/append-text-page";
const ENDPOINT_UNIONE = "/api/v1/general/merge-pdfs";

/** "31 agosto 2026" - the form used in the closing line of an Italian attestation. */
const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export function formattaData(data: Date): string {
  return `${data.getDate()} ${MESI[data.getMonth()]} ${data.getFullYear()}`;
}

function risolviData(iso: string): Date {
  if (!iso) return new Date();
  // Parse as local midnight; `new Date("2026-08-31")` is UTC and can slip a day westwards.
  const [anno, mese, giorno] = iso.split("-").map(Number);
  if (!anno || !mese || !giorno) return new Date();
  return new Date(anno, mese - 1, giorno);
}

function senzaEstensione(nome: string): string {
  return nome.replace(/\.[^.]+$/, "");
}

/**
 * The numbered list of attested documents. Each entry is the file name plus, when the user
 * supplied one, a description of what the document contains - which is what makes the
 * attestation identify its objects rather than just count them.
 */
export function componiElencoAtti(
  files: File[],
  descrizioni: Record<string, string>,
): string {
  return files
    .map((file, indice) => {
      const descrizione = (descrizioni[file.name] ?? "").trim();
      const suffisso = descrizione ? ` (${descrizione})` : "";
      return `${indice + 1}) ${file.name}${suffisso};`;
    })
    .join("\n")
    // The last entry closes the list with a full stop rather than a semicolon.
    .replace(/;$/, ".");
}

/** Builds the finished attestation text for the given files and parameters. */
export function componiAttestazione(
  parameters: AttestazioniParameters,
  files: File[],
): { titolo: string; testo: string } {
  const modelli = caricaModelli();
  const modello =
    modelli.find((m) => m.id === parameters.modelloId) ?? modelli[0];
  const profilo = caricaProfilo();
  const data = risolviData(parameters.data);

  const valori: Record<string, string> = {
    ...profilo,
    ...parameters.valori,
    data: formattaData(data),
    elencoAtti: modello.usaElencoAtti
      ? componiElencoAtti(files, parameters.descrizioni)
      : "",
  };

  const riferimento = risolviRiferimento(modello, data);
  if (riferimento) valori.riferimento = riferimento;

  // The art. 137 declaration has to state why PEC/SERCQ service is unavailable, and the
  // clause has to agree in number with the recipients. One recipient per line is how the
  // field is filled in, so the line count drives the agreement.
  const destinatari = (parameters.valori.destinatari ?? "").trim();
  const quanti = destinatari
    ? destinatari.split("\n").filter((riga) => riga.trim().length > 0).length
    : 1;
  valori.clausolaDestinatari =
    quanti > 1
      ? "i destinatari non sono muniti di domicilio digitale iscritto nei pubblici elenchi"
      : "il destinatario non è munito di domicilio digitale iscritto nei pubblici elenchi";

  // A hand-edited heading or body is used exactly as typed: the point of editing in the
  // preview is to say something the template does not.
  return {
    titolo: parameters.titoloManuale.trim()
      ? parameters.titoloManuale
      : componiTesto(modello.titolo, valori),
    testo: parameters.testoManuale.trim()
      ? parameters.testoManuale
      : componiTesto(modello.corpo, valori),
  };
}

async function unisciDocumenti(files: File[]): Promise<File> {
  const formData = new FormData();
  files.forEach((file) => formData.append("fileInput", file));
  // Keep the order the user arranged in the file list: it is the order the attestation
  // numbers the documents in, and the two must agree.
  formData.append("sortType", "orderProvided");
  // Never strip certification signatures: the documents being attested are precisely the
  // ones whose digital signatures matter.
  formData.append("removeCertSign", "false");

  const risposta = await apiClient.post(ENDPOINT_UNIONE, formData, {
    responseType: "blob",
  });
  return new File([risposta.data], "documenti_uniti.pdf", {
    type: "application/pdf",
  });
}

async function apponiAttestazione(
  file: File,
  parameters: AttestazioniParameters,
  titolo: string,
  testo: string,
  nomeUscita: string,
): Promise<File> {
  const formData = new FormData();
  formData.append("fileInput", file);
  formData.append("title", titolo);
  formData.append("text", testo);
  formData.append("position", parameters.posizione);
  formData.append("fontSize", String(parameters.dimensioneCarattere));

  const risposta = await apiClient.post(ENDPOINT_ATTESTAZIONE, formData, {
    responseType: "blob",
  });
  return new File([risposta.data], nomeUscita, { type: "application/pdf" });
}

export const attestazioniOperationConfig = defineCustomTool({
  validateParams: validateAttestazioniParameters,
  operationType: "attestazioni",
  // Declared so credit routing and backend-readiness checks see the real endpoint; the
  // processor below owns the actual calls.
  endpoint: ENDPOINT_ATTESTAZIONE,
  customProcessor: async (
    parameters: AttestazioniParameters,
    files: File[],
  ): Promise<CustomProcessorResult> => {
    if (files.length === 0) {
      return { files: [], consumedAllInputs: false };
    }

    // One attestation covering several documents only makes sense if those documents are a
    // single file: the text says the attested acts "precede the present attestation".
    if (files.length > 1 && parameters.unisci) {
      const { titolo, testo } = componiAttestazione(parameters, files);
      const unito = await unisciDocumenti(files);
      const nome = `${senzaEstensione(files[0].name)}_e_altri_attestato.pdf`;
      const risultato = await apponiAttestazione(
        unito,
        parameters,
        titolo,
        testo,
        nome,
      );
      return { files: [risultato], consumedAllInputs: true };
    }

    // Otherwise each document gets its own attestation, listing only itself.
    const usciti: File[] = [];
    for (const file of files) {
      const { titolo, testo } = componiAttestazione(parameters, [file]);
      usciti.push(
        await apponiAttestazione(
          file,
          parameters,
          titolo,
          testo,
          `${senzaEstensione(file.name)}_attestato.pdf`,
        ),
      );
    }
    return { files: usciti, consumedAllInputs: false };
  },
  defaultParameters,
});

export const useAttestazioniOperation = () => {
  const { t } = useTranslation();
  return useToolOperation<AttestazioniParameters>({
    ...attestazioniOperationConfig,
    getErrorMessage: createStandardErrorHandler(
      t("attestazioni.error.failed", "Impossibile generare l'attestazione"),
    ),
  });
};
