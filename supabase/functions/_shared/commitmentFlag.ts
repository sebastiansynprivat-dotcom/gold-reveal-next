// Server-Spiegel von src/lib/commitmentFlag.ts.
// Muss synchron gehalten werden — Edge Functions können nicht aus src/ importieren.

export const COMMITMENT_ALLOWLIST: string[] = [
  // "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
];

export const COMMITMENT_RELEASE_TO_ALL = false;

export function isCommitmentTester(userId: string | null | undefined): boolean {
  if (!userId) return false;
  if (COMMITMENT_RELEASE_TO_ALL) return true;
  return COMMITMENT_ALLOWLIST.includes(userId);
}
