package stirling.software.SPDF.model.api.misc;

import io.swagger.v3.oas.annotations.media.Schema;

import lombok.Data;
import lombok.EqualsAndHashCode;

import stirling.software.common.model.api.PDFFile;

@Data
@EqualsAndHashCode(callSuper = true)
public class AppendTextPageRequest extends PDFFile {

    @Schema(
            description =
                    "Body text of the page to generate. Line breaks are preserved; long lines are"
                            + " wrapped to the page width and overflow onto further pages.",
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String text;

    @Schema(
            description = "Optional heading rendered in bold above the body text.",
            example = "ATTESTAZIONE DI CONFORMITA")
    private String title;

    @Schema(
            description = "Where the generated page(s) go relative to the input document.",
            allowableValues = {"append", "prepend"},
            defaultValue = "append")
    private String position = "append";

    @Schema(description = "Body font size in points.", defaultValue = "11")
    private float fontSize = 11f;

    @Schema(description = "Page margin in points.", defaultValue = "60")
    private float margin = 60f;
}
