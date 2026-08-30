package stirling.software.SPDF.controller.api.misc;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;

import lombok.RequiredArgsConstructor;

import stirling.software.SPDF.model.api.misc.AppendTextPageRequest;
import stirling.software.common.annotations.AutoJobPostMapping;
import stirling.software.common.annotations.api.MiscApi;
import stirling.software.common.enumeration.ResourceWeight;
import stirling.software.common.model.tool.ToolFormat;
import stirling.software.common.model.tool.ToolIO;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.ExceptionUtils;
import stirling.software.common.util.WebResponseUtils;

/**
 * Generates one or more A4 text pages from plain text and joins them to an existing PDF.
 *
 * <p>Built for the Italian legal "attestazione di conformita", which must follow the documents it
 * refers to, but the endpoint itself is deliberately generic: the caller supplies text that is
 * already composed, so the wording and the templates stay entirely on the client and need no
 * redeploy to change.
 */
@MiscApi
@RequiredArgsConstructor
public class AppendTextPageController {

    private static final String REGULAR_FONT = "static/fonts/NotoSans-Regular.ttf";
    private static final String BOLD_FONT = "static/fonts/NotoSans-Bold.ttf";

    /** Multiplier applied to the font size to get the baseline-to-baseline distance. */
    private static final float LINE_SPACING = 1.45f;

    /** Gap between the heading and the first body line, as a multiple of the heading size. */
    private static final float TITLE_GAP = 1.8f;

    private static final float MIN_FONT_SIZE = 6f;
    private static final float MAX_FONT_SIZE = 36f;

    private final CustomPDFDocumentFactory pdfDocumentFactory;

    @AutoJobPostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            value = "/append-text-page",
            resourceWeight = ResourceWeight.SMALL_WEIGHT)
    @ToolIO(produces = ToolFormat.PDF)
    @Operation(
            summary = "Append (or prepend) a generated text page to a PDF",
            description =
                    "Renders the supplied text onto one or more A4 pages and joins them to the"
                            + " input document. Used for conformity attestations, which must follow"
                            + " the documents they certify. Input:PDF Output:PDF")
    public ResponseEntity<byte[]> appendTextPage(@ModelAttribute AppendTextPageRequest request)
            throws IOException {

        String text = request.getText();
        if (text == null || text.isBlank()) {
            throw ExceptionUtils.createIllegalArgumentException(
                    "error.invalidArgument", "The text to render must not be empty");
        }

        float fontSize = clamp(request.getFontSize(), MIN_FONT_SIZE, MAX_FONT_SIZE);
        // Keep the margin sane: it must leave a usable column on an A4 page.
        float margin = clamp(request.getMargin(), 20f, 200f);
        boolean prepend = "prepend".equalsIgnoreCase(request.getPosition());

        MultipartFile pdfFile = request.getFileInput();

        try (PDDocument document = pdfDocumentFactory.load(pdfFile)) {
            PDFont body = loadFont(document, REGULAR_FONT);
            PDFont heading = loadFont(document, BOLD_FONT);

            List<PDPage> generated =
                    renderPages(
                            document, text, request.getTitle(), body, heading, fontSize, margin);

            if (prepend) {
                // renderPages always appends. Walk the generated pages in order and move each one
                // ahead of the original block, which restores their relative order at the front.
                for (int i = 0; i < generated.size(); i++) {
                    PDPage generatedPage = generated.get(i);
                    document.getPages().remove(generatedPage);
                    document.getPages().insertBefore(generatedPage, document.getPage(i));
                }
            }

            return WebResponseUtils.pdfDocToWebResponse(
                    document, sanitiseName(pdfFile.getOriginalFilename()));
        }
    }

    /**
     * Lays the text out and adds the resulting pages to the end of {@code document}, returning them
     * in order so the caller can move them if the pages were requested up front.
     */
    private List<PDPage> renderPages(
            PDDocument document,
            String text,
            String title,
            PDFont body,
            PDFont heading,
            float fontSize,
            float margin)
            throws IOException {

        float pageWidth = PDRectangle.A4.getWidth();
        float pageHeight = PDRectangle.A4.getHeight();
        float usableWidth = pageWidth - (2 * margin);
        float lineHeight = fontSize * LINE_SPACING;
        float headingSize = fontSize * 1.15f;

        List<String> lines = wrap(text, body, fontSize, usableWidth);

        List<PDPage> pages = new ArrayList<>();
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        pages.add(page);

        PDPageContentStream stream = new PDPageContentStream(document, page);
        float y = pageHeight - margin;

        try {
            if (title != null && !title.isBlank()) {
                // Centre the heading; it is short enough that wrapping is not worth the complexity.
                String head = sanitiseGlyphs(heading, title.strip());
                float headWidth = stringWidth(heading, head, headingSize);
                stream.beginText();
                stream.setFont(heading, headingSize);
                stream.newLineAtOffset(Math.max(margin, (pageWidth - headWidth) / 2), y);
                stream.showText(head);
                stream.endText();
                y -= headingSize * TITLE_GAP;
            }

            for (String line : lines) {
                if (y < margin) {
                    stream.close();
                    page = new PDPage(PDRectangle.A4);
                    document.addPage(page);
                    pages.add(page);
                    stream = new PDPageContentStream(document, page);
                    y = pageHeight - margin;
                }
                if (!line.isEmpty()) {
                    float x = margin;
                    if (isHeadingLine(line)) {
                        float larghezza = stringWidth(body, line, fontSize);
                        x = Math.max(margin, (pageWidth - larghezza) / 2);
                    }
                    stream.beginText();
                    stream.setFont(body, fontSize);
                    stream.newLineAtOffset(x, y);
                    stream.showText(line);
                    stream.endText();
                }
                y -= lineHeight;
            }
        } finally {
            stream.close();
        }
        return pages;
    }

    /**
     * Whether a body line is a standalone heading and should be centred rather than set flush left.
     * This is what carries the "A T T E S T A" / "D I C H I A R A" / "C H I E D E" lines of an
     * Italian attestation, which are conventionally centred.
     *
     * <p>The rule is deliberately narrow - a short line whose letters are all upper case - so it
     * cannot swallow ordinary prose. A sentence has lower-case letters; a line like "R.G. N.
     * 1234/2026" is caught only if a user writes it alone and in capitals, which reads as a heading
     * anyway.
     */
    private boolean isHeadingLine(String line) {
        String compatto = line.replace(" ", "");
        if (compatto.length() == 0 || compatto.length() > 30) {
            return false;
        }
        boolean almenoUnaLettera = false;
        for (char c : compatto.toCharArray()) {
            if (Character.isLetter(c)) {
                if (Character.isLowerCase(c)) {
                    return false;
                }
                almenoUnaLettera = true;
            }
        }
        return almenoUnaLettera;
    }

    /**
     * Breaks {@code text} into rendered lines. Explicit newlines are honoured (a blank line stays a
     * blank line); anything wider than {@code maxWidth} is wrapped on word boundaries, and a single
     * word too long to fit is split rather than allowed to run past the margin.
     */
    private List<String> wrap(String text, PDFont font, float fontSize, float maxWidth)
            throws IOException {
        List<String> out = new ArrayList<>();
        String normalised = text.replace("\r\n", "\n").replace('\r', '\n');

        for (String paragraph : normalised.split("\n", -1)) {
            if (paragraph.isBlank()) {
                out.add("");
                continue;
            }
            StringBuilder line = new StringBuilder();
            for (String rawWord : paragraph.strip().split("\\s+")) {
                String word = sanitiseGlyphs(font, rawWord);
                String candidate = line.length() == 0 ? word : line + " " + word;
                if (stringWidth(font, candidate, fontSize) <= maxWidth) {
                    line.setLength(0);
                    line.append(candidate);
                    continue;
                }
                if (line.length() > 0) {
                    out.add(line.toString());
                    line.setLength(0);
                }
                if (stringWidth(font, word, fontSize) <= maxWidth) {
                    line.append(word);
                } else {
                    // A single token wider than the column: a long file name, a URL. Split it.
                    StringBuilder chunk = new StringBuilder();
                    for (char c : word.toCharArray()) {
                        if (chunk.length() > 0
                                && stringWidth(font, chunk.toString() + c, fontSize) > maxWidth) {
                            out.add(chunk.toString());
                            chunk.setLength(0);
                        }
                        chunk.append(c);
                    }
                    line.append(chunk);
                }
            }
            if (line.length() > 0) {
                out.add(line.toString());
            }
        }
        return out;
    }

    private float stringWidth(PDFont font, String s, float fontSize) throws IOException {
        return font.getStringWidth(s) / 1000 * fontSize;
    }

    /**
     * Replaces every character the font cannot encode with a space. Attestation text is routinely
     * pasted from Word and carries glyphs outside the font; PDFBox throws on those rather than
     * skipping them, which would fail the whole request over one stray character.
     */
    private String sanitiseGlyphs(PDFont font, String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            try {
                font.encode(String.valueOf(c));
                sb.append(c);
            } catch (IOException | IllegalArgumentException unsupported) {
                sb.append(' ');
            }
        }
        return sb.toString();
    }

    private PDFont loadFont(PDDocument document, String resourcePath) throws IOException {
        Resource resource = new ClassPathResource(resourcePath);
        try (InputStream in = resource.getInputStream()) {
            return PDType0Font.load(document, in);
        }
    }

    private static float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    private String sanitiseName(String original) {
        if (original == null || original.isBlank()) {
            return "documento_attestato.pdf";
        }
        String name = original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        String base =
                name.toLowerCase().endsWith(".pdf") ? name.substring(0, name.length() - 4) : name;
        if (base.isBlank()) {
            base = "documento";
        }
        return base + "_attestato.pdf";
    }
}
