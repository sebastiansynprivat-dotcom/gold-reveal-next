// Server-Spiegel von src/lib/commitmentFlag.ts.
// Muss synchron gehalten werden — Edge Functions können nicht aus src/ importieren.

export const COMMITMENT_ALLOWLIST: string[] = [
  "d559bb8e-7883-48cc-bfa2-168225a96708", // sebastianpushtest@gmail.com
];

// 2026-07-09 07:00 Berlin (Sommerzeit UTC+2) → 05:00 UTC
export const COMMITMENT_RELEASE_AT = "2026-07-09T05:00:00Z";

export const COMMITMENT_RELEASE_TO_ALL = true;

export function isCommitmentTester(userId: string | null | undefined): boolean {
  if (!userId) return false;
  if (COMMITMENT_RELEASE_TO_ALL && Date.now() >= Date.parse(COMMITMENT_RELEASE_AT)) return true;
  return COMMITMENT_ALLOWLIST.includes(userId);
}
