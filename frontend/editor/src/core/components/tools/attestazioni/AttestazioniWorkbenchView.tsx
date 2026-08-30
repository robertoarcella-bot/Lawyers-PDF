import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Stack,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  NumberInput,
  Text,
  Divider,
  Group,
  Collapse,
  Paper,
  ScrollArea,
} from "@mantine/core";
import { Button } from "@app/ui/Button";
import { AttestazioniParameters } from "@app/hooks/tools/attestazioni/useAttestazioniParameters";
import { AttestazioneTemplate } from "@app/data/attestazioni/attestazioniTemplates";
import {
  ProfiloDifensore,
  salvaProfilo,
} from "@app/data/attestazioni/attestazioniStore";
import { componiAttestazione } from "@app/hooks/tools/attestazioni/useAttestazioniOperation";
import { rilevaDatiFascicolo } from "@app/data/attestazioni/rilevaDatiFascicolo";
import AttestazioniModelliEditor from "@app/components/tools/attestazioni/AttestazioniModelliEditor";

/** What the tool pushes into the view through setCustomWorkbenchViewData. */
export interface DatiVistaAttestazioni {
  parameters: AttestazioniParameters;
  onParameterChange: <K extends keyof AttestazioniParameters>(
    key: K,
    value: AttestazioniParameters[K],
  ) => void;
  files: File[];
  modelli: AttestazioneTemplate[];
  profilo: ProfiloDifensore;
  onProfiloChange: (profilo: ProfiloDifensore) => void;
  onModelliChange: (modelli: AttestazioneTemplate[]) => void;
}

const ETICHETTE_PROFILO: { chiave: keyof ProfiloDifensore; label: string }[] = [
  { chiave: "difensore", label: "Difensore (compare in firma)" },
  { chiave: "codiceFiscale", label: "Codice fiscale" },
  { chiave: "foro", label: "Foro" },
  { chiave: "studio", label: "Studio" },
  { chiave: "pec", label: "PEC" },
  { chiave: "luogo", label: "Luogo (per la data)" },
];

const AttestazioniWorkbenchView = ({ data }: { data: DatiVistaAttestazioni }) => {
  const [profiloAperto, setProfiloAperto] = useState(false);
  const [editorAperto, setEditorAperto] = useState(false);

  // The tool can render the view for a frame before pushing its data, so every hook below
  // has to tolerate `data` being absent - bailing out early would change the hook order.
  const modelli = data?.modelli;
  const parameters = data?.parameters;
  const files = data?.files;

  const modello = useMemo(() => {
    if (!modelli || modelli.length === 0) return undefined;
    return (
      modelli.find((m) => m.id === parameters?.modelloId) ?? modelli[0]
    );
  }, [modelli, parameters?.modelloId]);

  const anteprima = useMemo(() => {
    if (!modello || !parameters || !files) return null;
    try {
      // Compose against the real selection so the numbered list matches the output.
      const perAnteprima =
        files.length > 0
          ? (files as unknown as File[])
          : ([{ name: "documento.pdf" }] as unknown as File[]);
      return componiAttestazione(parameters, perAnteprima);
    } catch {
      return null;
    }
  }, [modello, parameters, files]);

  // Court and docket number are usually printed on the document itself; read them off it
  // instead of making the user retype what the PDF already says.
  const onParameterChangeRef = data?.onParameterChange;
  const [rilevamento, setRilevamento] = useState<
    "inattivo" | "corso" | "trovato" | "nulla"
  >("inattivo");

  const rileva = useCallback(
    async (soloSeVuoti: boolean) => {
      if (!files || files.length === 0 || !parameters || !onParameterChangeRef)
        return;
      setRilevamento("corso");
      const dati = await rilevaDatiFascicolo(files[0]);
      const valori = { ...parameters.valori };
      let cambiato = false;
      if (dati.ufficio && (!soloSeVuoti || !(valori.ufficio ?? "").trim())) {
        valori.ufficio = dati.ufficio;
        cambiato = true;
      }
      if (dati.rg && (!soloSeVuoti || !(valori.rg ?? "").trim())) {
        valori.rg = dati.rg;
        cambiato = true;
      }
      if (cambiato) onParameterChangeRef("valori", valori);
      setRilevamento(cambiato ? "trovato" : "nulla");
    },
    [files, parameters, onParameterChangeRef],
  );

  // Run once per selection, and only into fields the user has left empty.
  const ultimaSelezione = useRef("");
  useEffect(() => {
    const chiave = (files ?? []).map((f) => f.name).join("|");
    if (!chiave || chiave === ultimaSelezione.current) return;
    ultimaSelezione.current = chiave;
    void rileva(true);
  }, [files, rileva]);

  if (!data || !modello || !parameters || !files) return null;

  const { onParameterChange, profilo, onProfiloChange, onModelliChange } = data;

  const modificatoAMano = Boolean(
    parameters.titoloManuale.trim() || parameters.testoManuale.trim(),
  );

  const aggiornaProfilo = (chiave: keyof ProfiloDifensore, valore: string) => {
    const aggiornato = { ...profilo, [chiave]: valore };
    onProfiloChange(aggiornato);
    salvaProfilo(aggiornato);
  };

  const aggiornaValore = (chiave: string, valore: string) => {
    onParameterChange("valori", { ...parameters.valori, [chiave]: valore });
  };

  const aggiornaDescrizione = (nomeFile: string, valore: string) => {
    onParameterChange("descrizioni", {
      ...parameters.descrizioni,
      [nomeFile]: valore,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "1.5rem",
        height: "100%",
        padding: "1.25rem",
        boxSizing: "border-box",
        alignItems: "stretch",
        minHeight: 0,
      }}
    >
      {/* Compilation form */}
      <ScrollArea style={{ flex: "1 1 55%", minWidth: 0 }}>
        <Stack gap="md" pr="md">
          <Group justify="space-between" align="center">
            <Text fw={600}>{modello.nome}</Text>
            <Group gap="xs">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setProfiloAperto((v) => !v)}
              >
                {profiloAperto ? "Nascondi profilo" : "Profilo difensore"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditorAperto(true)}
              >
                Modelli
              </Button>
            </Group>
          </Group>

          <Collapse in={profiloAperto}>
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                Salvato solo su questo computer. Il nome del difensore compare
                in calce all&apos;attestazione.
              </Text>
              <Group grow align="flex-start">
                <Stack gap="xs">
                  {ETICHETTE_PROFILO.slice(0, 3).map(({ chiave, label }) => (
                    <TextInput
                      key={chiave}
                      label={label}
                      value={profilo[chiave]}
                      onChange={(e) =>
                        aggiornaProfilo(chiave, e.currentTarget.value)
                      }
                    />
                  ))}
                </Stack>
                <Stack gap="xs">
                  {ETICHETTE_PROFILO.slice(3).map(({ chiave, label }) => (
                    <TextInput
                      key={chiave}
                      label={label}
                      value={profilo[chiave]}
                      onChange={(e) =>
                        aggiornaProfilo(chiave, e.currentTarget.value)
                      }
                    />
                  ))}
                </Stack>
              </Group>
            </Stack>
          </Collapse>

          <Divider label="Dati dell'attestazione" labelPosition="left" />

          {modello.campi.map((campo) =>
            campo.multilinea ? (
              <Textarea
                key={campo.chiave}
                label={campo.etichetta}
                placeholder={campo.suggerimento}
                value={parameters.valori[campo.chiave] ?? ""}
                onChange={(e) =>
                  aggiornaValore(campo.chiave, e.currentTarget.value)
                }
                autosize
                minRows={3}
                maxRows={10}
              />
            ) : (
              <TextInput
                key={campo.chiave}
                label={campo.etichetta}
                placeholder={campo.suggerimento}
                value={parameters.valori[campo.chiave] ?? ""}
                onChange={(e) =>
                  aggiornaValore(campo.chiave, e.currentTarget.value)
                }
              />
            ),
          )}

          {files.length > 0 && (
            <Group gap="xs" align="center">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void rileva(false)}
                disabled={rilevamento === "corso"}
              >
                {rilevamento === "corso"
                  ? "Lettura in corso…"
                  : "Rileva ufficio e R.G. dal documento"}
              </Button>
              {rilevamento === "trovato" && (
                <Text size="xs" c="dimmed">
                  Rilevati dal testo del PDF: controllali.
                </Text>
              )}
              {rilevamento === "nulla" && (
                <Text size="xs" c="dimmed">
                  Nessun riferimento riconosciuto (documento scansionato?).
                </Text>
              )}
            </Group>
          )}

          <TextInput
            label="Data dell'attestazione"
            type="date"
            value={parameters.data}
            onChange={(e) => onParameterChange("data", e.currentTarget.value)}
            description="Vuoto = data odierna al momento della generazione"
          />

          {modello.usaElencoAtti && (
            <>
              <Divider
                label="Descrizione dei documenti"
                labelPosition="left"
              />
              {files.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Seleziona i documenti da attestare: compariranno qui,
                  numerati nell&apos;ordine in cui verranno uniti.
                </Text>
              ) : (
                <>
                  <Text size="xs" c="dimmed">
                    Il contenuto di ciascun documento, come comparirà
                    nell&apos;elenco numerato. Lasciando vuoto resta il solo
                    nome del file.
                  </Text>
                  {files.map((file, indice) => (
                    <TextInput
                      key={file.name}
                      label={`${indice + 1}) ${file.name}`}
                      placeholder="es. sentenza n. 1242/2016 del Tribunale di Nola"
                      value={parameters.descrizioni[file.name] ?? ""}
                      onChange={(e) =>
                        aggiornaDescrizione(file.name, e.currentTarget.value)
                      }
                    />
                  ))}
                </>
              )}
            </>
          )}

          <Divider label="Opzioni" labelPosition="left" />

          {files.length > 1 && (
            <Checkbox
              label="Unisci i documenti in un unico PDF con una sola attestazione"
              checked={parameters.unisci}
              onChange={(e) =>
                onParameterChange("unisci", e.currentTarget.checked)
              }
              description="Se disattivato, ogni documento riceve la propria attestazione separata."
            />
          )}

          <Group grow>
            <Select
              label="Posizione"
              data={[
                { value: "append", label: "In coda ai documenti" },
                { value: "prepend", label: "In testa ai documenti" },
              ]}
              value={parameters.posizione}
              onChange={(v) =>
                v && onParameterChange("posizione", v as "append" | "prepend")
              }
              allowDeselect={false}
            />
            <NumberInput
              label="Dimensione carattere"
              value={parameters.dimensioneCarattere}
              onChange={(v) =>
                onParameterChange(
                  "dimensioneCarattere",
                  typeof v === "number" ? v : 11,
                )
              }
              min={6}
              max={36}
            />
          </Group>
        </Stack>
      </ScrollArea>

      {/* Live preview of the page that will be generated */}
      <div
        style={{
          flex: "1 1 45%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Group justify="space-between" align="center" mb="xs">
          <Text size="sm" fw={600}>
            Pagina A4 — modificabile
          </Text>
          {modificatoAMano && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onParameterChange("titoloManuale", "");
                onParameterChange("testoManuale", "");
              }}
            >
              Ricomponi dal modello
            </Button>
          )}
        </Group>
        <Paper
          withBorder
          radius="sm"
          style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          <ScrollArea style={{ height: "100%" }}>
            {/* A4 proportions (1 : 1.414), so what is on screen is the sheet that comes out. */}
            <div
              style={{
                aspectRatio: "1 / 1.414",
                background: "var(--c-surface)",
                padding: "8% 9%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <Textarea
                value={anteprima?.titolo ?? ""}
                onChange={(e) =>
                  onParameterChange("titoloManuale", e.currentTarget.value)
                }
                autosize
                minRows={1}
                variant="unstyled"
                styles={{
                  input: {
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    lineHeight: 1.4,
                    padding: 0,
                    minHeight: 0,
                  },
                }}
              />
              <Textarea
                value={anteprima?.testo ?? ""}
                onChange={(e) =>
                  onParameterChange("testoManuale", e.currentTarget.value)
                }
                autosize
                minRows={10}
                variant="unstyled"
                styles={{
                  input: {
                    fontSize: "0.8rem",
                    lineHeight: 1.55,
                    padding: 0,
                  },
                }}
              />
            </div>
          </ScrollArea>
        </Paper>
        <Text size="xs" c="dimmed" mt="xs">
          {modificatoAMano
            ? "Testo modificato a mano: i campi qui accanto non lo aggiornano più."
            : "Scrivi qui per correggere al volo; le righe in maiuscolo restano centrate."}
        </Text>
      </div>

      <AttestazioniModelliEditor
        opened={editorAperto}
        onClose={() => setEditorAperto(false)}
        modelloCorrenteId={modello.id}
        onModelliChange={(aggiornati, idSelezionato) => {
          onModelliChange(aggiornati);
          if (idSelezionato) onParameterChange("modelloId", idSelezionato);
        }}
      />
    </div>
  );
};

export default AttestazioniWorkbenchView;
