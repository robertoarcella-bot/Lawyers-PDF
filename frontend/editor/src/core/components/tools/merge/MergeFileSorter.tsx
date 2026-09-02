import React, { useState } from "react";
import { Group, Text, Stack, Select, Paper } from "@mantine/core";
import { Button } from "@app/ui/Button";
import { ActionIcon } from "@app/ui/ActionIcon";
import { useTranslation } from "react-i18next";
import SortIcon from "@mui/icons-material/Sort";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Z_INDEX_AUTOMATE_DROPDOWN } from "@app/styles/zIndex";

interface MergeFile {
  id: string;
  name: string;
}

interface MergeFileSorterProps {
  /** The files that will be merged, in the order they will be merged. */
  files: MergeFile[];
  onSortFiles: (
    sortType: "filename" | "dateModified",
    ascending: boolean,
  ) => void;
  /** Move the file at `index` one step up (-1) or down (+1) in the merge order. */
  onMoveFile: (index: number, direction: -1 | 1) => void;
  disabled?: boolean;
}

const MergeFileSorter: React.FC<MergeFileSorterProps> = ({
  files,
  onSortFiles,
  onMoveFile,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [sortType, setSortType] = useState<"filename" | "dateModified">(
    "filename",
  );
  const [ascending, setAscending] = useState(true);

  const sortOptions = [
    { value: "filename", label: t("merge.sortBy.filename", "Nome file") },
    {
      value: "dateModified",
      label: t("merge.sortBy.dateModified", "Data di modifica"),
    },
  ];

  const handleSort = () => {
    onSortFiles(sortType, ascending);
  };

  const handleDirectionToggle = () => {
    setAscending(!ascending);
  };

  return (
    <Stack gap="sm">
      <Text size="sm">
        {t(
          "merge.reorder.help",
          "I documenti saranno uniti dall'alto verso il basso. Usa le frecce per cambiare l'ordine, oppure ordina automaticamente qui sotto.",
        )}
      </Text>

      {/* The explicit, visible merge order: a numbered list the user can reorder in place. */}
      {files.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t(
            "merge.reorder.empty",
            "Seleziona i documenti da unire: compariranno qui, nell'ordine di unione.",
          )}
        </Text>
      ) : (
        <Paper withBorder radius="sm" p="xs">
          <Stack gap={4}>
            {files.map((file, index) => (
              <Group key={file.id} gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" w={22} ta="right">
                  {index + 1}.
                </Text>
                <Text
                  size="sm"
                  title={file.name}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.name}
                </Text>
                <ActionIcon
                  variant="secondary"
                  size="sm"
                  disabled={disabled || index === 0}
                  onClick={() => onMoveFile(index, -1)}
                  title={t("merge.reorder.up", "Sposta su")}
                  aria-label={t("merge.reorder.up", "Sposta su")}
                >
                  <KeyboardArrowUpIcon fontSize="small" />
                </ActionIcon>
                <ActionIcon
                  variant="secondary"
                  size="sm"
                  disabled={disabled || index === files.length - 1}
                  onClick={() => onMoveFile(index, 1)}
                  title={t("merge.reorder.down", "Sposta giù")}
                  aria-label={t("merge.reorder.down", "Sposta giù")}
                >
                  <KeyboardArrowDownIcon fontSize="small" />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      <Group gap="xs" align="end" justify="space-between">
        <Select
          data={sortOptions}
          value={sortType}
          onChange={(value) =>
            setSortType(value as "filename" | "dateModified")
          }
          disabled={disabled || files.length === 0}
          label={t("merge.sortBy.label", "Ordina per")}
          size="xs"
          style={{ flex: 1 }}
          comboboxProps={{
            withinPortal: true,
            zIndex: Z_INDEX_AUTOMATE_DROPDOWN,
          }}
        />

        <ActionIcon
          variant="secondary"
          size="sm"
          onClick={handleDirectionToggle}
          disabled={disabled || files.length === 0}
          title={
            ascending
              ? t("merge.sortBy.ascending", "Crescente")
              : t("merge.sortBy.descending", "Decrescente")
          }
          aria-label={
            ascending
              ? t("merge.sortBy.ascending", "Crescente")
              : t("merge.sortBy.descending", "Decrescente")
          }
        >
          {ascending ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
        </ActionIcon>
      </Group>

      <Button
        variant="secondary"
        size="sm"
        leftSection={<SortIcon />}
        onClick={handleSort}
        disabled={disabled || files.length === 0}
        fullWidth
      >
        {t("merge.sortBy.sort", "Ordina")}
      </Button>
    </Stack>
  );
};

export default MergeFileSorter;
