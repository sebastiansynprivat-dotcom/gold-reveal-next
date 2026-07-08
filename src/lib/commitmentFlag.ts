// Feature-Flag: Wer sieht das Commitment-Ritual (Morgen-Dialog + Abend-Check-in)?
//
// Rollout-Strategie:
// 1. Bis `COMMITMENT_RELEASE_AT` sehen nur User in `COMMITMENT_ALLOWLIST` das Feature.
// 2. Ab `COMMITMENT_RELEASE_AT` (UTC-Zeitpunkt) ist es automatisch für ALLE Chatter aktiv —
//    kein Deploy nötig, passt sich zum ersten Morgen-Push an.
// 3. Für Notfall-Kill-Switch: `COMMITMENT_RELEASE_TO_ALL = false` und Datum in die Zukunft schieben.

export const COMMITMENT_ALLOWLIST: string[] = [
  "d559bb8e-7883-48cc-bfa2-168225a96708", // sebastianpushtest@gmail.com
];

// 2026-07-09 07:00 Berlin (Sommerzeit UTC+2) → 05:00 UTC
// Ab diesem Zeitpunkt bekommt jeder Chatter den Morgen-Dialog + Check-in.
export const COMMITMENT_RELEASE_AT = "2026-07-09T05:00:00Z";

export const COMMITMENT_RELEASE_TO_ALL = true;

export function isCommitmentTester(userId: string | null | undefined): boolean {
  if (!userId) return false;
  if (COMMITMENT_RELEASE_TO_ALL && Date.now() >= Date.parse(COMMITMENT_RELEASE_AT)) return true;
  return COMMITMENT_ALLOWLIST.includes(userId);
}
