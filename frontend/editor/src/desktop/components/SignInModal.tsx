/**
 * Global sign-in modal — disabled in this build.
 *
 * Upstream this listens for `stirling:open-sign-in` and opens the SetupWizard
 * (Stirling Cloud login / signup). This build has no account flow, so nothing
 * is rendered and the event is simply ignored.
 */
export function SignInModal() {
  return null;
}
