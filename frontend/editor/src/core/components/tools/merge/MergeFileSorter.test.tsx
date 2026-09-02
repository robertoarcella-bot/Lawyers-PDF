import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import MergeFileSorter from "@app/components/tools/merge/MergeFileSorter";

// Mock useTranslation with predictable return values
const mockT = vi.fn((key: string) => `mock-${key}`);
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

// Wrapper component to provide Mantine context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

const FILES = [
  { id: "a", name: "alpha.pdf" },
  { id: "b", name: "beta.pdf" },
  { id: "c", name: "gamma.pdf" },
];

describe("MergeFileSorter", () => {
  const mockOnSortFiles = vi.fn();
  const mockOnMoveFile = vi.fn();

  const renderSorter = (files = FILES) =>
    render(
      <TestWrapper>
        <MergeFileSorter
          files={files}
          onSortFiles={mockOnSortFiles}
          onMoveFile={mockOnMoveFile}
        />
      </TestWrapper>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should render the numbered list of files to merge, in order", () => {
    renderSorter();

    expect(screen.getByText("alpha.pdf")).toBeInTheDocument();
    expect(screen.getByText("beta.pdf")).toBeInTheDocument();
    expect(screen.getByText("gamma.pdf")).toBeInTheDocument();

    // The list is numbered so the merge order is explicit.
    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getByText("3.")).toBeInTheDocument();
  });

  test("should render sort dropdown, direction toggle and sort button", () => {
    renderSorter();

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("mock-merge.sortBy.sort")).toBeInTheDocument();
    expect(
      screen.getByLabelText("mock-merge.sortBy.ascending"),
    ).toBeInTheDocument();
  });

  test("should show the reorder help text", () => {
    renderSorter();

    expect(screen.getByText("mock-merge.reorder.help")).toBeInTheDocument();
  });

  test("should show an empty hint and no rows when there are no files", () => {
    renderSorter([]);

    expect(screen.getByText("mock-merge.reorder.empty")).toBeInTheDocument();
    expect(screen.queryByText("1.")).not.toBeInTheDocument();
  });

  test("first file cannot move up, last cannot move down", () => {
    renderSorter();

    const upButtons = screen.getAllByLabelText("mock-merge.reorder.up");
    const downButtons = screen.getAllByLabelText("mock-merge.reorder.down");

    expect(upButtons).toHaveLength(3);
    expect(downButtons).toHaveLength(3);
    // First row up disabled, last row down disabled.
    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[2]).toBeDisabled();
  });

  test("should call onMoveFile when a move button is clicked", () => {
    renderSorter();

    const downButtons = screen.getAllByLabelText("mock-merge.reorder.down");
    // Move the first file down.
    fireEvent.click(downButtons[0]);
    expect(mockOnMoveFile).toHaveBeenCalledWith(0, 1);

    const upButtons = screen.getAllByLabelText("mock-merge.reorder.up");
    // Move the last file up.
    fireEvent.click(upButtons[2]);
    expect(mockOnMoveFile).toHaveBeenCalledWith(2, -1);
  });

  test("should call onSortFiles with default values (filename, ascending)", () => {
    renderSorter();

    fireEvent.click(screen.getByText("mock-merge.sortBy.sort"));
    expect(mockOnSortFiles).toHaveBeenCalledWith("filename", true);
  });

  test("should toggle direction and sort descending", () => {
    renderSorter();

    fireEvent.click(screen.getByLabelText("mock-merge.sortBy.ascending"));
    // After toggling the accessible name flips to descending.
    expect(
      screen.getByLabelText("mock-merge.sortBy.descending"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("mock-merge.sortBy.sort"));
    expect(mockOnSortFiles).toHaveBeenCalledWith("filename", false);
  });

  test("should call onSortFiles with dateModified when dropdown is changed", () => {
    renderSorter();

    const currentSelection = screen.getByText("mock-merge.sortBy.filename");
    fireEvent.mouseDown(currentSelection);

    const dateModifiedOption = screen.getByText(
      "mock-merge.sortBy.dateModified",
    );
    fireEvent.click(dateModifiedOption);

    fireEvent.click(screen.getByText("mock-merge.sortBy.sort"));
    expect(mockOnSortFiles).toHaveBeenCalledWith("dateModified", true);
  });
});
