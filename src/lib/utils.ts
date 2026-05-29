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
    // Remove all emojis (Unicode Extended Pictographic)
    .replace(/\p{Extended_Pictographic}/gu, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}
