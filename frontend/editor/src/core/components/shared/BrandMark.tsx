import markUrl from "@app/assets/brand/branding-logo/logo-mark.svg";
import "@app/components/shared/BrandMark.css";

interface BrandMarkProps {
  /** Height of the mark (CSS length). */
  height?: string;
  className?: string;
}

/**
 * The application mark, shown in the quick-nav rail.
 *
 * Upstream this was the Stirling two-parallelogram logo drawn as inline SVG paths, with a CSS
 * morph into a chevron on hover. Those paths are the trademark itself, so they are replaced
 * here by this build's own mark; the morph went with them, being geometry specific to that
 * logo. The class name is kept so any layout rules in BrandMark.css still apply.
 */
export function BrandMark({ height = "1.6rem", className }: BrandMarkProps) {
  return (
    <img
      className={`sui-brandmark${className ? ` ${className}` : ""}`}
      src={markUrl}
      style={{ height, width: "auto", display: "block" }}
      alt=""
      aria-hidden="true"
    />
  );
}
