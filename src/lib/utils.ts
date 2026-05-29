import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanDisplayName(name: string): string {
  if (!name) return "";
  return name
    // Remove parenthetical tags like (M), (Admin), etc.
    .replace(/\s*\([^)]*\)\s*/g, " ")
    // Remove emojis (covers most common ranges)
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2B06}]|[\u{2B07}]|[\u{2B11}]/gu, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}
