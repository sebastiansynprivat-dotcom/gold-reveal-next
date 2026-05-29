// Zentrale Plattform-Registry. Wird beim App-Start aus der DB (`public.platforms`)
// geladen und ist überall in der App live verfügbar. Plattformen werden im
// Admin -> Setup -> Plattformen verwaltet.
//
// Wichtig: PLATFORMS / PLATFORM_LABELS / PLATFORM_COLORS / PLATFORM_STYLES sind
// MUTABLE Arrays/Objects. Sie behalten ihre Referenz, der Inhalt wird in-place
// aktualisiert, damit bestehende Imports weiter funktionieren. Für reaktive UI
// nutze den `usePlatforms()`-Hook.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformDef {
  id?: string;
  label: string;
  key: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  styles: { bg: string; text: string; border: string; dot: string };
}

// ---- Style-Generator (auto für neue Plattformen) ---------------------------

const STYLE_PRESETS: PlatformDef["styles"][] = [
  { bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/30",  dot: "bg-yellow-500" },
  { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30",    dot: "bg-blue-500" },
  { bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/30",    dot: "bg-cyan-500" },
  { bg: "bg-pink-500/10",    text: "text-pink-400",    border: "border-pink-500/30",    dot: "bg-pink-500" },
  { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/30",     dot: "bg-sky-500" },
  { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/30",  dot: "bg-violet-500" },
  { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-500" },
  { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/30",  dot: "bg-orange-500" },
  { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/30",    dot: "bg-rose-500" },
  { bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", border: "border-fuchsia-500/30", dot: "bg-fuchsia-500" },
];

function styleForIndex(i: number): PlatformDef["styles"] {
  return STYLE_PRESETS[i % STYLE_PRESETS.length];
}

// ---- Default Seed (Fallback bis DB geladen ist) ----------------------------

const DEFAULT_SEED: PlatformDef[] = [
  { label: "Maloum",   key: "maloum",   color: "#d4af37", isActive: true, sortOrder: 10, styles: styleForIndex(0) },
  { label: "Brezzels", key: "brezzels", color: "#3b82f6", isActive: true, sortOrder: 20, styles: styleForIndex(1) },
  { label: "4Based",   key: "4based",   color: "#22d3ee", isActive: true, sortOrder: 30, styles: styleForIndex(2) },
  { label: "Admireme", key: "admireme", color: "#ec4899", isActive: true, sortOrder: 40, styles: styleForIndex(3) },
  { label: "VisitX",   key: "visitx",   color: "#0ea5e9", isActive: true, sortOrder: 50, styles: styleForIndex(4) },
  { label: "Slushy",   key: "slushy",   color: "#8b5cf6", isActive: true, sortOrder: 60, styles: styleForIndex(5) },
];

// ---- Mutable Exports (Referenz bleibt erhalten) ----------------------------

export const PLATFORMS: PlatformDef[] = [...DEFAULT_SEED];
export const PLATFORM_LABELS: string[] = PLATFORMS.map((p) => p.label);
export const PLATFORM_COLORS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p.color]),
);
export const PLATFORM_STYLES: Record<string, PlatformDef["styles"]> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p.styles]),
);

function rebuildDerived() {
  PLATFORM_LABELS.length = 0;
  PLATFORMS.forEach((p) => PLATFORM_LABELS.push(p.label));

  for (const k of Object.keys(PLATFORM_COLORS)) delete PLATFORM_COLORS[k];
  for (const k of Object.keys(PLATFORM_STYLES)) delete PLATFORM_STYLES[k];

  PLATFORMS.forEach((p) => {
    PLATFORM_COLORS[p.key] = p.color;
    PLATFORM_STYLES[p.key] = p.styles;
  });
}

function replacePlatforms(next: PlatformDef[]) {
  PLATFORMS.length = 0;
  next.forEach((p) => PLATFORMS.push(p));
  rebuildDerived();
  subscribers.forEach((cb) => cb());
}

// ---- Subscription-Mechanik für React ---------------------------------------

const subscribers = new Set<() => void>();

export const findPlatform = (value: string): PlatformDef | undefined => {
  const v = value.toLowerCase();
  return PLATFORMS.find((p) => p.key === v || p.label.toLowerCase() === v);
};

// ---- DB-Loading ------------------------------------------------------------

let initialized = false;
let initialLoad: Promise<void> | null = null;

export async function loadPlatformsFromDB(): Promise<void> {
  try {
    const { data, error } = await (supabase.from("platforms") as any)
      .select("id, key, label, color, is_active, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    if (!data) return;

    const mapped: PlatformDef[] = data
      .filter((row: any) => row.is_active !== false)
      .map((row: any, i: number) => ({
        id: row.id,
        key: String(row.key).toLowerCase(),
        label: row.label,
        color: row.color || "#d4af37",
        isActive: row.is_active !== false,
        sortOrder: row.sort_order ?? 100,
        styles: styleForIndex(i),
      }));

    if (mapped.length > 0) replacePlatforms(mapped);
  } catch (err) {
    console.error("[platforms] load failed", err);
  }
}

export function ensurePlatformsLoaded(): Promise<void> {
  if (!initialLoad) {
    initialized = true;
    initialLoad = loadPlatformsFromDB();
  }
  return initialLoad;
}

export function refreshPlatforms(): Promise<void> {
  initialLoad = loadPlatformsFromDB();
  return initialLoad;
}

// ---- React Hook ------------------------------------------------------------

export function usePlatforms(): PlatformDef[] {
  const [, force] = useState(0);

  useEffect(() => {
    ensurePlatformsLoaded();
    const cb = () => force((n) => n + 1);
    subscribers.add(cb);

    // Realtime: bei DB-Änderungen sofort neu laden
    const channel = supabase
      .channel("platforms-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platforms" },
        () => { refreshPlatforms(); },
      )
      .subscribe();

    return () => {
      subscribers.delete(cb);
      supabase.removeChannel(channel);
    };
  }, []);

  return PLATFORMS;
}
