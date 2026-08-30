import React from "react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

import { OpenWithWatcher } from "@app/components/openWith/OpenWithWatcher";

/**
 * Pins the hand-off a double-clicked PDF depends on.
 *
 * The three things that can silently break it are all checked here: the loop must keep pulling
 * until the queue answers 204 (a batch opened together arrives one response at a time), the name
 * must survive the percent-encoding the server applies to fit it in a header, and the body must
 * reach the workbench as a File rather than a Blob - `addFiles` reads `name` off it, so a Blob
 * would land in the file manager as an untitled document.
 */

const addFiles = vi.fn();

vi.mock("@app/hooks/useFileHandler", () => ({
  useFileHandler: () => ({ addFiles }),
}));

vi.mock("@app/services/apiClientConfig", () => ({
  getApiBaseUrl: () => "/",
}));

// jsdom's Response stringifies a Blob body instead of carrying it, so the parts of the response
// the component actually touches are stubbed directly.
function risposta(nome: string, contenuto: string) {
  return {
    status: 200,
    headers: { get: (chiave: string) => (chiave === "X-File-Name" ? encodeURIComponent(nome) : null) },
    blob: async () => new Blob([contenuto], { type: "application/pdf" }),
  };
}

const codaVuota = () => ({ status: 204, headers: { get: () => null }, blob: async () => new Blob() });

beforeEach(() => {
  addFiles.mockReset();
  addFiles.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenWithWatcher", () => {
  test("empties the queue and hands every document to the workbench", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(risposta("atto di citazione.pdf", "primo"))
      .mockResolvedValueOnce(risposta("relata.pdf", "secondo"))
      .mockResolvedValue(codaVuota());
    vi.stubGlobal("fetch", fetchMock);

    render(<OpenWithWatcher />);

    await waitFor(() => expect(addFiles).toHaveBeenCalledTimes(2));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/local/pending",
      expect.objectContaining({ cache: "no-store" }),
    );

    const primo = addFiles.mock.calls[0][0][0] as File;
    expect(primo).toBeInstanceOf(File);
    // Spaces would come back as "+" if the name were read straight off the header.
    expect(primo.name).toBe("atto di citazione.pdf");
    // jsdom's File has no text(); size and type are enough to show the body came through.
    expect(primo.size).toBe("primo".length);
    expect(primo.type).toBe("application/pdf");
    expect(addFiles.mock.calls[0][1]).toEqual({ selectFiles: true });

    expect((addFiles.mock.calls[1][0][0] as File).name).toBe("relata.pdf");
  });

  test("stays quiet while the queue is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(codaVuota());
    vi.stubGlobal("fetch", fetchMock);

    render(<OpenWithWatcher />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(addFiles).not.toHaveBeenCalled();
  });

  test("survives a server that is not answering yet", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    render(<OpenWithWatcher />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(addFiles).not.toHaveBeenCalled();
  });
});
