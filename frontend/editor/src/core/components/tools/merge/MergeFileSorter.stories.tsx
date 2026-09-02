import type { Meta, StoryObj } from "@storybook/react-vite";
import MergeFileSorter from "@app/components/tools/merge/MergeFileSorter";

const meta = {
  title: "Tools/Merge/MergeFileSorter",
  component: MergeFileSorter,
} satisfies Meta<typeof MergeFileSorter>;
export default meta;

type Story = StoryObj<typeof meta>;

const SAMPLE_FILES = [
  { id: "1", name: "atto-di-citazione.pdf" },
  { id: "2", name: "procura-alle-liti.pdf" },
  { id: "3", name: "doc-01-contratto.pdf" },
];

export const Default: Story = {
  args: {
    files: SAMPLE_FILES,
    onSortFiles: () => {},
    onMoveFile: () => {},
  },
};

export const Empty: Story = {
  args: {
    files: [],
    onSortFiles: () => {},
    onMoveFile: () => {},
  },
};

export const Disabled: Story = {
  args: {
    files: SAMPLE_FILES,
    onSortFiles: () => {},
    onMoveFile: () => {},
    disabled: true,
  },
};
