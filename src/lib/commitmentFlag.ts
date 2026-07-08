// Feature-Flag: Nur diese User sehen das Commitment-Ritual (Morgen-Dialog + Abend-Check-in).
// Für den Rollout an alle: einfach `RELEASE_TO_ALL` auf `true` setzen.
//
// Zum Freischalten: Auth-User-ID (aus Supabase auth.users) hier eintragen.
// Deine eigene ID findest du im Browser mit:
//   (await window.supabase?.auth.getUser())?.data.user?.id
// oder im Admin unter Chatter → Detailansicht → User-ID kopieren.

export const COMMITMENT_ALLOWLIST: string[] = [
  // "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
];

export const COMMITMENT_RELEASE_TO_ALL = false;

export function isCommitmentTester(userId: string | null | undefined): boolean {
  if (!userId) return false;
  if (COMMITMENT_RELEASE_TO_ALL) return true;
  return COMMITMENT_ALLOWLIST.includes(userId);
}
