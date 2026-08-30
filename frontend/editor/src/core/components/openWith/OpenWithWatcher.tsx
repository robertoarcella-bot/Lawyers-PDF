import { useEffect, useRef } from "react";
import { useFileHandler } from "@app/hooks/useFileHandler";
import { getApiBaseUrl } from "@app/services/apiClientConfig";

/** Slow enough to be invisible in the log, quick enough to feel like the file just opened. */
const POLL_INTERVAL_MS = 2500;

const FILE_NAME_HEADER = "X-File-Name";

/**
 * Brings in documents opened from the desktop while this page is the one already up.
 *
 * <p>The server holds a double-clicked file only until someone asks for it, and it has no way to
 * push: a page that was opened minutes ago would otherwise never learn about it. Polling is the
 * modest price for that - one loopback request every few seconds.
 *
 * <p>It keeps polling while the window is in the background on purpose. The request doubles as the
 * sign of life the launcher looks for before deciding whether a document needs a new window, and a
 * minimised window that stopped answering would earn a duplicate one at every double click.
 */
export function OpenWithWatcher() {
  const { addFiles } = useFileHandler();

  // Kept in a ref so the polling loop is set up once and still calls the current handler.
  const addFilesRef = useRef(addFiles);
  addFilesRef.current = addFiles;

  useEffect(() => {
    const base = (getApiBaseUrl() ?? "/").replace(/\/$/, "");
    const endpoint = `${base}/api/v1/local/pending`;
    let stopped = false;
    let timer: number | undefined;

    // One document per response, so a batch selected together arrives in the order it was sent.
    const drain = async () => {
      while (!stopped) {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (response.status !== 200) {
          return;
        }
        const header = response.headers.get(FILE_NAME_HEADER);
        const name = header ? decodeURIComponent(header) : "documento.pdf";
        const blob = await response.blob();
        if (stopped) {
          return;
        }
        await addFilesRef.current(
          [new File([blob], name, { type: "application/pdf" })],
          { selectFiles: true },
        );
      }
    };

    const tick = async () => {
      try {
        await drain();
      } catch {
        // The server may be starting, restarting or gone; the next tick will find out.
      }
      if (!stopped) {
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    void tick();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
