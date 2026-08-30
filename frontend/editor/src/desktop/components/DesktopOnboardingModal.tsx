import { useEffect } from "react";
import { connectionModeService } from "@app/services/connectionModeService";

const ONBOARDING_KEY = "stirling-desktop-onboarding-seen";

/**
 * Desktop onboarding modal — disabled in this build.
 *
 * Upstream this renders a welcome slide followed by a sign-in slide
 * (SetupWizard: Stirling Cloud login / signup). This build ships without any
 * account flow, so the modal renders nothing and simply pins the app to local
 * mode, where the bundled backend serves every tool.
 */
export function DesktopOnboardingModal() {
  useEffect(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    connectionModeService.switchToLocal().catch(console.error);
  }, []);

  return null;
}
