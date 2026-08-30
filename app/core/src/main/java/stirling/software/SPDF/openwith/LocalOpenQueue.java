package stirling.software.SPDF.openwith;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * Hand-off point between a document opened from the file manager and the browser workbench.
 *
 * <p>Documents wait in memory rather than on disk: one sits here for the couple of seconds between
 * the double click and the page fetching it, so persistence would buy nothing and would instead
 * leave copies of client files outside the workspace the user chose for them.
 */
@Slf4j
@Component
public class LocalOpenQueue {

    /** Beyond this many waiting documents the oldest is dropped, so a stuck page cannot pile up. */
    private static final int MAX_WAITING = 20;

    public record PendingDocument(String name, byte[] content) {}

    /**
     * How long after its last request a page still counts as open. Three polling rounds: enough to
     * ride out a slow one, short enough that a closed window is noticed before the next document.
     */
    private static final long ATTACHED_WINDOW_MS = 8_000;

    private final Queue<PendingDocument> waiting = new ConcurrentLinkedQueue<>();

    private volatile long lastSeenPage;

    public void offer(String name, byte[] content) {
        while (waiting.size() >= MAX_WAITING) {
            waiting.poll();
        }
        waiting.add(new PendingDocument(name, content));
    }

    /** The next waiting document, removed from the queue, or {@code null} when there is none. */
    public PendingDocument poll() {
        lastSeenPage = System.currentTimeMillis();
        return waiting.poll();
    }

    /**
     * Whether an interface is currently open somewhere. Asking the queue is enough: the page polls
     * it, so a recent request is proof of a live window, and no separate heartbeat is needed.
     */
    public boolean hasOpenWindow() {
        return System.currentTimeMillis() - lastSeenPage < ATTACHED_WINDOW_MS;
    }

    /**
     * Files named on the command line join the queue only once the context is up: the launcher that
     * received them is this very process, so it has nobody to post them to.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void enqueueStartupFiles() {
        for (Path document : LocalOpenBridge.consumeStartupFiles()) {
            try {
                offer(document.getFileName().toString(), Files.readAllBytes(document));
            } catch (IOException e) {
                log.error("Could not read the document requested at startup {}", document, e);
            }
        }
    }
}
