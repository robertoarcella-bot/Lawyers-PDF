import { useEffect, useMemo } from "react";
import { Stack, Select, Text } from "@mantine/core";
import { AttestazioniParameters } from "@app/hooks/tools/attestazioni/useAttestazioniParameters";
import { AttestazioneTemplate } from "@app/data/attestazioni/attestazioniTemplates";

interface AttestazioniSettingsProps {
  parameters: AttestazioniParameters;
  onParameterChange: <K extends keyof AttestazioniParameters>(
    key: K,
    value: AttestazioniParameters[K],
  ) => void;
  modelli: AttestazioneTemplate[];
  fileCount: number;
}

/**
 * Side panel for the attestation tool: template choice only.
 *
 * The compilation form, the document descriptions and the live preview live in the
 * workbench view - the panel is ~300px wide and this tool has too many fields for it.
 */
const AttestazioniSettings = ({
  parameters,
  onParameterChange,
  modelli,
  fileCount,
}: AttestazioniSettingsProps) => {
  const modello = useMemo(
    () => modelli.find((m) => m.id === parameters.modelloId) ?? modelli[0],
    [modelli, parameters.modelloId],
  );

  // A template deleted from the editor must not leave the tool pointing at nothing.
  useEffect(() => {
    if (modello && modello.id !== parameters.modelloId) {
      onParameterChange("modelloId", modello.id);
    }
  }, [modello, parameters.modelloId, onParameterChange]);

  const datiSelect = useMemo(() => {
    const gruppi = new Map<string, { value: string; label: string }[]>();
    modelli.forEach((m) => {
      const voci = gruppi.get(m.gruppo) ?? [];
      voci.push({ value: m.id, label: m.nome });
      gruppi.set(m.gruppo, voci);
    });
    return Array.from(gruppi.entries()).map(([group, items]) => ({
      group,
      items,
    }));
  }, [modelli]);

  if (!modello) return null;

  return (
    <Stack gap="md">
      <Select
        label="Modello di attestazione"
        data={datiSelect}
        value={modello.id}
        onChange={(v) => v && onParameterChange("modelloId", v)}
        allowDeselect={false}
        // Ten entries across five groups: the 220px default cut the list off after the
        // first group.
        maxDropdownHeight={440}
        styles={{
          // Mantine's group label is faint by default, so the sections read as one flat
          // list. Make them legible headings.
          groupLabel: {
            fontWeight: 700,
            fontSize: "0.7rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--c-text)",
            paddingTop: "0.5rem",
            borderTop: "1px solid var(--c-border)",
            marginTop: "0.25rem",
          },
        }}
      />

      <Text size="xs" c="dimmed">
        Compila i dati e controlla l&apos;anteprima nell&apos;area centrale.
      </Text>

      {fileCount === 0 && (
        <Text size="xs" c="dimmed">
          Seleziona i documenti da attestare, nell&apos;ordine in cui devono
          comparire.
        </Text>
      )}
    </Stack>
  );
};

export default AttestazioniSettings;
