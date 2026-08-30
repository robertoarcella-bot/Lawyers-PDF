package stirling.software.SPDF.openwith;

import java.net.InetAddress;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Hidden;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

/**
 * Carries a document from the desktop into the open workbench when the application is registered as
 * the system PDF handler.
 *
 * <p>Both ends of the exchange live on this machine - the launcher posts, the page served by this
 * same server fetches - so the endpoints refuse anything that does not arrive over the loopback
 * interface. That check is what keeps the pair harmless if the server is ever bound to a real
 * network interface: a remote caller can neither inject a document into someone's workbench nor
 * drain one that is waiting there.
 *
 * <p>The body is the raw document rather than a multipart part because the poster is a bare {@code
 * HttpClient} in the launcher, before any Spring machinery exists to build a form for it.
 */
@Hidden
@RestController
@RequestMapping("/api/v1/local")
@RequiredArgsConstructor
public class LocalOpenController {

    static final String FILE_NAME_HEADER = "X-File-Name";

    private static final String FALLBACK_NAME = "documento.pdf";

    /** Well above any brief, and low enough that a stray post cannot exhaust the heap. */
    private static final int MAX_DOCUMENT_BYTES = 300 * 1024 * 1024;

    private final LocalOpenQueue queue;

    @PostMapping(value = "/open", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Void> open(
            @RequestHeader(name = FILE_NAME_HEADER, required = false) String encodedName,
            @RequestBody byte[] content,
            HttpServletRequest request) {
        if (!isLoopback(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (content.length == 0 || content.length > MAX_DOCUMENT_BYTES) {
            return ResponseEntity.badRequest().build();
        }
        queue.offer(safeName(encodedName), content);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/pending")
    public ResponseEntity<byte[]> pending(HttpServletRequest request) {
        if (!isLoopback(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        LocalOpenQueue.PendingDocument document = queue.poll();
        if (document == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok()
                .header(
                        FILE_NAME_HEADER,
                        URLEncoder.encode(document.name(), StandardCharsets.UTF_8))
                .contentType(MediaType.APPLICATION_PDF)
                .body(document.content());
    }

    /** Lets the launcher decide whether a document needs a new window or already has one. */
    @GetMapping("/attached")
    public ResponseEntity<Boolean> attached(HttpServletRequest request) {
        if (!isLoopback(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(queue.hasOpenWindow());
    }

    private static boolean isLoopback(HttpServletRequest request) {
        try {
            return InetAddress.getByName(request.getRemoteAddr()).isLoopbackAddress();
        } catch (UnknownHostException e) {
            return false;
        }
    }

    /**
     * Keeps only the last segment of whatever the caller sent: the name is echoed back to the page
     * and becomes a label in the workbench, never a path to write to.
     */
    private static String safeName(String encodedName) {
        if (encodedName == null || encodedName.isBlank()) {
            return FALLBACK_NAME;
        }
        try {
            String decoded = URLDecoder.decode(encodedName, StandardCharsets.UTF_8);
            Path fileName = Path.of(decoded.replace('\\', '/')).getFileName();
            return fileName == null || fileName.toString().isBlank()
                    ? FALLBACK_NAME
                    : fileName.toString();
        } catch (IllegalArgumentException e) {
            return FALLBACK_NAME;
        }
    }
}
