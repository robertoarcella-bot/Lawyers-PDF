import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Stack,
  Select,
  TextInput,
  Textarea,
  Group,
  Text,
  Code,
  Alert,
} from "@mantine/core";
import { Button } from "@app/ui/Button";
import {
  AttestazioneTemplate,
  MODELLI_PREDEFINITI,
  segnapostiUsati,
} from "@app/data/attestazioni/attestazioniTemplates";
import {
  caricaModelli,
  eliminaModello,
  nuovoModello,
  ripristinaModello,
  salvaModello,
} from "@app/data/attestazioni/attestazioniStore";

interface Props {
  opened: boolean;
  onClose: () => void;
  modelloCorrenteId: string;
  onModelliChange: (
    modelli: AttestazioneTemplate[],
    idSelezionato?: string,
  ) => void;
}

const SEGNAPOSTI_PROFILO = [
  "difensore",
  "codiceFiscale",
  "foro",
  "studio",
  "pec",
  "luogo",
  "data",
  "elencoAtti",
];

const AttestazioniModelliEditor = ({
  opened,
  onClose,
  modelloCorrenteId,
  onModelliChange,
}: Props) => {
  const [modelli, setModelli] = useState<AttestazioneTemplate[]>([]);
  const [idScelto, setIdScelto] = useState(modelloCorrenteId);
  const [nome, setNome] = useState("");
  const [titolo, setTitolo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [salvato, setSalvato] = useState(false);

  const modello = useMemo(
    () => modelli.find((m) => m.id === idScelto),
    [modelli, idScelto],
  );

  // Reload from storage each time the dialog opens so it never shows a stale copy.
  useEffect(() => {
    if (!opened) return;
    const correnti = caricaModelli();
    setModelli(correnti);
    setIdScelto(modelloCorrenteId);
    setSalvato(false);
  }, [opened, modelloCorrenteId]);

  useEffect(() => {
    if (!modello) return;
    setNome(modello.nome);
    setTitolo(modello.titolo);
    setCorpo(modello.corpo);
    setSalvato(false);
  }, [modello]);

  const isPredefinito = MODELLI_PREDEFINITI.some((m) => m.id === idScelto);

  const applica = (aggiornati: AttestazioneTemplate[], id?: string) => {
    setModelli(aggiornati);
    onModelliChange(aggiornati, id);
  };

  const handleSalva = () => {
    if (!modello) return;
    const aggiornati = salvaModello({ ...modello, nome, titolo, corpo });
    applica(aggiornati, modello.id);
    setSalvato(true);
  };

  const handleNuovo = () => {
    const creato = nuovoModello("Nuovo modello");
    const aggiornati = salvaModello(creato);
    applica(aggiornati, creato.id);
    setIdScelto(creato.id);
  };

  const handleElimina = () => {
    if (!modello) return;
    const aggiornati = eliminaModello(modello.id);
    const prossimo = aggiornati[0]?.id;
    applica(aggiornati, prossimo);
    setIdScelto(prossimo ?? "");
  };

  const handleRipristina = () => {
    if (!modello) return;
    const aggiornati = ripristinaModello(modello.id);
    applica(aggiornati, modello.id);
    setIdScelto(modello.id);
  };

  const segnaposti = useMemo(
    () =>
      modello
        ? segnapostiUsati({ ...modello, titolo, corpo })
        : ([] as string[]),
    [modello, titolo, corpo],
  );

  const nonRiconosciuti = segnaposti.filter(
    (s) =>
      !SEGNAPOSTI_PROFILO.includes(s) &&
      !(modello?.campi ?? []).some((c) => c.chiave === s) &&
      s !== "riferimento",
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Modelli di attestazione"
      size="xl"
      centered
    >
      <Stack gap="md">
        <Select
          label="Modello"
          data={modelli.map((m) => ({ value: m.id, label: m.nome }))}
          value={idScelto}
          onChange={(v) => v && setIdScelto(v)}
          allowDeselect={false}
          searchable
        />

        <TextInput
          label="Nome (voce del menu)"
          value={nome}
          onChange={(e) => setNome(e.currentTarget.value)}
        />

        <TextInput
          label="Titolo (intestazione in grassetto)"
          value={titolo}
          onChange={(e) => setTitolo(e.currentTarget.value)}
        />

        <Textarea
          label="Testo"
          value={corpo}
          onChange={(e) => setCorpo(e.currentTarget.value)}
          autosize
          minRows={12}
          maxRows={24}
          styles={{ input: { fontFamily: "monospace", fontSize: "0.8rem" } }}
        />

        <Text size="xs" c="dimmed">
          Segnaposto disponibili:{" "}
          {SEGNAPOSTI_PROFILO.map((s) => (
            <Code key={s} mr={4}>{`{{${s}}}`}</Code>
          ))}
          {(modello?.campi ?? []).map((c) => (
            <Code key={c.chiave} mr={4}>{`{{${c.chiave}}}`}</Code>
          ))}
        </Text>

        {nonRiconosciuti.length > 0 && (
          <Alert color="yellow" variant="light">
            Questi segnaposto non corrispondono ad alcun campo e verranno
            lasciati vuoti:{" "}
            {nonRiconosciuti.map((s) => (
              <Code key={s} mr={4}>{`{{${s}}}`}</Code>
            ))}
          </Alert>
        )}

        {salvato && (
          <Alert color="green" variant="light">
            Modello salvato.
          </Alert>
        )}

        <Group justify="space-between">
          <Group gap="xs">
            <Button onClick={handleSalva}>Salva</Button>
            <Button variant="secondary" onClick={handleNuovo}>
              Nuovo modello
            </Button>
          </Group>
          <Group gap="xs">
            {isPredefinito ? (
              <Button variant="secondary" onClick={handleRipristina}>
                Ripristina originale
              </Button>
            ) : (
              <Button
                variant="secondary"
                accent="danger"
                onClick={handleElimina}
              >
                Elimina
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Chiudi
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AttestazioniModelliEditor;
