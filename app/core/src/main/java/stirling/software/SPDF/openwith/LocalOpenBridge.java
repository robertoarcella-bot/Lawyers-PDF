package stirling.software.SPDF.openwith;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import lombok.extern.slf4j.Slf4j;

/**
 * Lets the packaged launcher double as the system PDF handler.
 *
 * <p>A double click in the file manager runs the same executable that runs the server, with the
 * document as its argument, so the two possible situations have to be told apart before Spring
 * starts - only one of them may boot a server:
 *
 * <ul>
 *   <li>a server is already listening: the document is posted to it and this process exits, which
 *       puts the file in the window the user already has open and avoids a second instance fighting
 *       for the port;
 *   <li>nothing is listening: the paths are held aside and handed to {@link LocalOpenQueue} once
 *       the context is ready, moments before the browser is opened.
 * </ul>
 */
@Slf4j
public final class LocalOpenBridge {

    /** Long enough for a loaded server to answer, short enough not to delay a cold start. */
    private static final Duration PROBE_TIMEOUT = Duration.ofSeconds(2);

    private static final Duration UPLOAD_TIMEOUT = Duration.ofSeconds(60);

    private static final int DEFAULT_PORT = 8080;

    private static final List<Path> startupDocuments = new ArrayList<>();

    private LocalOpenBridge() {}

    /**
     * Deals with any document named on the command line and returns the arguments Spring should
     * still see. May terminate the process, when a running instance has taken the document over.
     */
    public static String[] handleStartupArguments(String[] args) {
        List<Path> documents = new ArrayList<>();
        List<String> remaining = new ArrayList<>();
        for (String arg : args) {
            Path document = asExistingFile(arg);
            if (document == null) {
                remaining.add(arg);
            } else {
                documents.add(document);
            }
        }
        if (documents.isEmpty()) {
            // Empty launch, no document: closing the window leaves the server up in the
            // background, so a plain re-launch must reopen that window rather than boot a second
            // server - the second would fail to bind the port and the launcher would report it as
            // "Failed to launch JVM".
            if (focusRunningInstance()) {
                System.exit(0);
            }
            return args;
        }

        if (handOverToRunningInstance(documents)) {
            System.exit(0);
        }
        synchronized (LocalOpenBridge.class) {
            startupDocuments.addAll(documents);
        }
        return remaining.toArray(new String[0]);
    }

    static synchronized List<Path> consumeStartupFiles() {
        List<Path> documents = List.copyOf(startupDocuments);
        startupDocuments.clear();
        return documents;
    }

    /** Options keep their leading dash; anything else is a document only if it exists on disk. */
    private static Path asExistingFile(String arg) {
        if (arg == null || arg.isBlank() || arg.startsWith("-")) {
            return null;
        }
        try {
            Path candidate = Path.of(arg);
            return Files.isRegularFile(candidate) ? candidate.toAbsolutePath() : null;
        } catch (InvalidPathException e) {
            return null;
        }
    }

    /**
     * When a server is already listening, brings its window to the front (opening one if none is
     * attached) and reports that this process must not boot a second server. Returns false when
     * nothing is listening, so the first instance boots normally.
     */
    private static boolean focusRunningInstance() {
        String base = "http://127.0.0.1:" + resolvePort();
        HttpClient client = HttpClient.newBuilder().connectTimeout(PROBE_TIMEOUT).build();
        if (!isServerListening(client, base)) {
            return false;
        }
        if (!hasOpenWindow(client, base)) {
            AppWindowLauncher.open(base + "/");
        }
        return true;
    }

    private static boolean handOverToRunningInstance(List<Path> documents) {
        String base = "http://127.0.0.1:" + resolvePort();
        HttpClient client = HttpClient.newBuilder().connectTimeout(PROBE_TIMEOUT).build();
        if (!isServerListening(client, base)) {
            return false;
        }
        for (Path document : documents) {
            if (!post(client, base, document)) {
                // Something is listening but will not take the document; starting a second server
                // would not help either, so the user is better served by the window that is up.
                log.error("The running instance refused the document {}", document);
            }
        }
        if (!hasOpenWindow(client, base)) {
            AppWindowLauncher.open(base + "/");
        }
        return true;
    }

    /**
     * A document handed to a window that is already up needs no second window: opening one per
     * double click would scatter a batch of documents across a row of identical windows.
     */
    private static boolean hasOpenWindow(HttpClient client, String base) {
        HttpRequest request =
                HttpRequest.newBuilder(URI.create(base + "/api/v1/local/attached"))
                        .timeout(PROBE_TIMEOUT)
                        .GET()
                        .build();
        try {
            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200 && "true".equals(response.body().trim());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException e) {
            return false;
        }
    }

    private static boolean isServerListening(HttpClient client, String base) {
        HttpRequest probe =
                HttpRequest.newBuilder(URI.create(base + "/api/v1/info/status"))
                        .timeout(PROBE_TIMEOUT)
                        .GET()
                        .build();
        try {
            return client.send(probe, HttpResponse.BodyHandlers.discarding()).statusCode() == 200;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException e) {
            // Nothing is answering on the port: this process is the first instance.
            return false;
        }
    }

    private static boolean post(HttpClient client, String base, Path document) {
        try {
            HttpRequest request =
                    HttpRequest.newBuilder(URI.create(base + "/api/v1/local/open"))
                            .timeout(UPLOAD_TIMEOUT)
                            .header("Content-Type", "application/octet-stream")
                            .header(
                                    LocalOpenController.FILE_NAME_HEADER,
                                    URLEncoder.encode(
                                            document.getFileName().toString(),
                                            StandardCharsets.UTF_8))
                            .POST(HttpRequest.BodyPublishers.ofFile(document))
                            .build();
            return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() == 202;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException e) {
            log.error("Could not hand the document {} to the running instance", document, e);
            return false;
        }
    }

    private static int resolvePort() {
        String configured = System.getenv("SERVER_PORT");
        if (configured == null || configured.isBlank()) {
            configured = System.getProperty("server.port");
        }
        try {
            return Integer.parseInt(configured.trim());
        } catch (NullPointerException | NumberFormatException e) {
            return DEFAULT_PORT;
        }
    }
}
