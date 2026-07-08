export type TierKey = "rookie" | "trusted" | "priority" | "elite" | "legend";

export type Tier = {
  key: TierKey;
  min: number; // streak days required to enter
  de: string;
  en: string;
  perk_de: string;
  perk_en: string;
  color: string; // tailwind text color for accents
  glow: string; // rgba for drop-shadow
};

export const TIERS: Tier[] = [
  {
    key: "rookie",
    min: 0,
    de: "Rookie",
    en: "Rookie",
    perk_de: "Standard-Pool",
    perk_en: "Standard pool",
    color: "text-white/70",
    glow: "rgba(255,255,255,0.25)",
  },
  {
    key: "trusted",
    min: 3,
    de: "Trusted",
    en: "Trusted",
    perk_de: "Content-Drops früher",
    perk_en: "Early content drops",
    color: "text-emerald-300",
    glow: "rgba(52,211,153,0.55)",
  },
  {
    key: "priority",
    min: 7,
    de: "Priority Pool",
    en: "Priority Pool",
    perk_de: "Bessere Kunden zuerst",
    perk_en: "Better clients first",
    color: "text-yellow-300",
    glow: "rgba(234,179,8,0.7)",
  },
  {
    key: "elite",
    min: 14,
    de: "Elite",
    en: "Elite",
    perk_de: "VIP-Kunden & Top-Models",
    perk_en: "VIP clients & top models",
    color: "text-orange-300",
    glow: "rgba(251,146,60,0.75)",
  },
  {
    key: "legend",
    min: 30,
    de: "Legend",
    en: "Legend",
    perk_de: "Erste Wahl bei allem",
    perk_en: "First pick, always",
    color: "text-fuchsia-300",
    glow: "rgba(232,121,249,0.75)",
  },
];

export function getTierInfo(streak: number) {
  let currentIdx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (streak >= TIERS[i].min) currentIdx = i;
  }
  const current = TIERS[currentIdx];
  const next = TIERS[currentIdx + 1] ?? null;
  const progress = next
    ? Math.min(100, Math.round(((streak - current.min) / (next.min - current.min)) * 100))
    : 100;
  const daysToNext = next ? Math.max(0, next.min - streak) : 0;
  return { current, next, progress, daysToNext, index: currentIdx };
}
