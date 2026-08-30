package stirling.software.SPDF.openwith;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;

import io.github.pixee.security.SystemCommand;

import lombok.extern.slf4j.Slf4j;

/**
 * Shows the interface in a window that looks like an application rather than a web page.
 *
 * <p>Chromium browsers opened with {@code --app=} drop the tab strip, the address bar and the
 * bookmarks, and take their own entry in the taskbar under the site's own icon. For a tool that
 * happens to be a local server this is the difference between "a program" and "a site the user must
 * not close by accident", and it costs one command-line switch.
 *
 * <p>When no Chromium browser is found the default browser is used as before: a tab is a poorer
 * frame, but a working one, and the alternative is showing nothing at all.
 */
@Slf4j
public final class AppWindowLauncher {

    private static final List<String> CHROMIUM_CANDIDATES =
            List.of(
                    "%ProgramFiles(x86)%/Microsoft/Edge/Application/msedge.exe",
                    "%ProgramFiles%/Microsoft/Edge/Application/msedge.exe",
                    "%ProgramFiles%/Google/Chrome/Application/chrome.exe",
                    "%ProgramFiles(x86)%/Google/Chrome/Application/chrome.exe",
                    "%LocalAppData%/Google/Chrome/Application/chrome.exe",
                    "%ProgramFiles%/BraveSoftware/Brave-Browser/Application/brave.exe",
                    "%ProgramFiles%/Vivaldi/Application/vivaldi.exe");

    private AppWindowLauncher() {}

    public static void open(String url) {
        Path chromium = findChromium();
        if (chromium != null) {
            try {
                new ProcessBuilder(chromium.toString(), "--app=" + url).start();
                return;
            } catch (IOException e) {
                log.error("Could not open the application window with {}", chromium, e);
            }
        }
        openInDefaultBrowser(url);
    }

    private static Path findChromium() {
        if (!System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win")) {
            return null;
        }
        for (String candidate : CHROMIUM_CANDIDATES) {
            Path resolved = expand(candidate);
            if (resolved != null && Files.isRegularFile(resolved)) {
                return resolved;
            }
        }
        return null;
    }

    /** Resolves the %VARIABLE% prefix these paths start with; null when the variable is not set. */
    private static Path expand(String candidate) {
        int end = candidate.indexOf('%', 1);
        if (!candidate.startsWith("%") || end < 0) {
            return Path.of(candidate);
        }
        String value = System.getenv(candidate.substring(1, end));
        return value == null || value.isBlank()
                ? null
                : Path.of(value + candidate.substring(end + 1));
    }

    private static void openInDefaultBrowser(String url) {
        try {
            String os = System.getProperty("os.name").toLowerCase(Locale.ROOT);
            Runtime runtime = Runtime.getRuntime();
            if (os.contains("win")) {
                SystemCommand.runCommand(runtime, "rundll32 url.dll,FileProtocolHandler " + url);
            } else if (os.contains("mac")) {
                SystemCommand.runCommand(runtime, "open " + url);
            } else {
                SystemCommand.runCommand(runtime, "xdg-open " + url);
            }
        } catch (IOException e) {
            log.error("Could not open the browser on {}", url, e);
        }
    }
}
