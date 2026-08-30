/**
 * Policies (Processor) availability — disabled in this build.
 *
 * Policies are the paid automation product: the ingestion, security,
 * classification, compliance, routing and retention categories. Upstream the
 * desktop app enables them only in a confirmed Stirling Cloud session. This
 * build ships no account flow, so they are switched off outright.
 */
export function usePoliciesEnabled(): boolean {
  return false;
}
