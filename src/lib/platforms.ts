// Zentrale Plattform-Liste. Neue Plattformen hier ergänzen, dann sind sie
// im Account-Pool, in Filtern und Plattform-Selects automatisch verfügbar.

export interface PlatformDef {
  /** Anzeigename, wird auch als accounts.platform Wert gespeichert */
  label: string;
  /** Lowercase Key (zum Lookup von Styles) */
  key: string;
  /** Hex-Farbe für Charts/Indikatoren */
  color: string;
  /** Tailwind-Style Tokens */
  styles: { bg: string; text: string; border: string; dot: string };
}

export const PLATFORMS: PlatformDef[] = [
  {
    label: "Maloum",
    key: "maloum",
    color: "#d4af37",
    styles: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-500" },
  },
  {
    label: "Brezzels",
    key: "brezzels",
    color: "#3b82f6",
    styles: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-500" },
  },
  {
    label: "4Based",
    key: "4based",
    color: "#22d3ee",
    styles: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-500" },
  },
  {
    label: "Admireme",
    key: "admireme",
    color: "#ec4899",
    styles: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", dot: "bg-pink-500" },
  },
  {
    label: "VisitX",
    key: "visitx",
    color: "#0ea5e9",
    styles: { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30", dot: "bg-sky-500" },
  },
  {
    label: "Slushy",
    key: "slushy",
    color: "#8b5cf6",
    styles: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", dot: "bg-violet-500" },
  },
];

export const PLATFORM_LABELS = PLATFORMS.map((p) => p.label);

export const PLATFORM_COLORS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p.color]),
);

export const PLATFORM_STYLES: Record<string, PlatformDef["styles"]> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p.styles]),
);

export const findPlatform = (value: string): PlatformDef | undefined =>
  PLATFORMS.find((p) => p.key === value.toLowerCase() || p.label.toLowerCase() === value.toLowerCase());
