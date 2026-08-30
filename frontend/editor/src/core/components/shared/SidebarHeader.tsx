import { SidebarToggleButton } from "@app/components/shared/SidebarToggleButton";

export interface SidebarHeaderProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  toggleAriaLabel?: string;
  toggleIcon?: React.ReactNode;
  className?: string;
}

/** The wordmark and the collapse toggle; the brand mark sits in the rail beside it. */
export function SidebarHeader({
  collapsed,
  onToggleCollapse,
  toggleAriaLabel,
  toggleIcon,
  className,
}: SidebarHeaderProps) {
  return (
    <div className={`file-sidebar-header${className ? ` ${className}` : ""}`}>
      {!collapsed && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}
        >
          {/* Own wordmark rather than the upstream logo: the Stirling terms of service
              reserve their marks ("You may not use our marks without permission"), and the
              MIT licence covers the code, not the branding. The line below is attribution,
              which MIT does require. */}
          <span
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "var(--c-text)",
              whiteSpace: "nowrap",
            }}
          >
            Lawyers-PDF
          </span>
          <span
            style={{
              fontSize: "0.62rem",
              lineHeight: 1.25,
              color: "var(--c-text-secondary)",
              whiteSpace: "nowrap",
            }}
          >
            Un fork di Stirling PDF · Avv. Roberto Arcella
          </span>
        </div>
      )}
      {onToggleCollapse && (
        <SidebarToggleButton
          collapsed={collapsed}
          onToggle={onToggleCollapse}
          ariaLabel={toggleAriaLabel}
          icon={toggleIcon}
        />
      )}
    </div>
  );
}
