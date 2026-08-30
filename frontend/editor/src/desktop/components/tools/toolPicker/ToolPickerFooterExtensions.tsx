/**
 * Desktop tool-list footer — disabled in this build.
 *
 * Upstream this renders a "Sign in to unlock all tools" prompt while in local
 * mode. This build is local-only by design and ships no sign-in flow, so the
 * footer renders nothing.
 */
export function ToolPickerFooterExtensions() {
  return null;
}
