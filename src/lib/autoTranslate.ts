// Lightweight runtime auto-translator: walks the DOM, collects German text,
// batch-translates via the `translate-batch` edge function, caches in localStorage,
// and swaps the text in-place. Activated only when ui_language === "en".
//
// Strategy:
// - Walk visible text nodes & a few attributes (placeholder, title, aria-label, alt).
// - Skip already-translated, code/svg/script/input-value, numbers-only, URLs, emails.
// - Cache by hashed original string in localStorage so re-renders are instant.
// - Debounced + batched (max 60 strings per request).

import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "auto_translate_cache_v1";
const MAX_BATCH = 60;
const DEBOUNCE_MS = 120;

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG", "PATH", "CANVAS", "IFRAME",
  "INPUT", "TEXTAREA", "SELECT", "OPTION",
]);

const ATTR_KEYS = ["placeholder", "title", "aria-label", "alt"] as const;

// We deliberately do NOT pre-filter for "German-looking" strings. Many UI strings
// are compound words (Monatsumsatz, Gesamtumsatz, Gruppenname) without umlauts or
// common German function words and would otherwise be skipped. The AI gateway
// reliably passes English strings through unchanged.
function looksGerman(_s: string): boolean {
  return true;
}

function isJunk(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 2) return true;
  if (trimmed.length > 1000) return true;
  if (/^[\s\d.,:;%/\\-_+*=<>(){}\[\]€$£¥•·–—…→←↑↓✓✗★☆♥♦♣♠]+$/.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[\w.\-]+@[\w.\-]+\.[a-z]{2,}$/i.test(trimmed)) return true;
  return false;
}

// ---------------- Cache ----------------
type Cache = Record<string, string>;
let cache: Cache | null = null;
function loadCache(): Cache {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    cache = raw ? JSON.parse(raw) : {};
  } catch {
    cache = {};
  }
  return cache!;
}
let saveScheduled = false;
function saveCacheSoon() {
  if (saveScheduled) return;
  saveScheduled = true;
  setTimeout(() => {
    saveScheduled = false;
    try { localStorage.setItem(LS_KEY, JSON.stringify(cache || {})); } catch { }
  }, 500);
}

// ---------------- State ----------------
let enabled = false;
let observer: MutationObserver | null = null;
let scanScheduled = false;
const pending = new Set<string>();
let flushTimer: number | null = null;
let flushing = false;

// Track original strings for swap. We store the original (German) on the node/attr.
// Text node: store original in a WeakMap.
const originalText = new WeakMap<Text, string>();
// Attr storage: we set data-orig-<attr> on the element.

function shouldSkipElement(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.hasAttribute("data-no-translate")) return true;
  // Skip anything inside an already-English context
  const lang = el.getAttribute("lang");
  if (lang && lang.toLowerCase().startsWith("en")) return true;
  return false;
}

function shouldSkipAncestors(node: Node): boolean {
  let p: Node | null = node.parentNode;
  // Stop at <body>; <html> has lang="en" (page is technically English-locale)
  // which would otherwise short-circuit the entire walk.
  while (p && p.nodeType === 1 && p !== document.body && p !== document.documentElement) {
    if (shouldSkipElement(p as Element)) return true;
    if ((p as Element).hasAttribute?.("data-no-translate")) return true;
    p = p.parentNode;
  }
  return false;
}

function applyTranslation(german: string, english: string) {
  if (!english || english === german) return;
  loadCache()[german] = english;
  saveCacheSoon();
  // Swap any text nodes we've seen with this original
  const dead: Text[] = [];
  recentTextNodes.forEach((node) => {
    if (!node.isConnected) { dead.push(node); return; }
    const orig = textNodeRegistry.get(node);
    if (orig === german && node.nodeValue !== english) {
      try { node.nodeValue = english; } catch { /* noop */ }
    }
  });
  dead.forEach((n) => recentTextNodes.delete(n));
  // Swap attributes
  document.querySelectorAll<HTMLElement>("[data-lt-orig]").forEach((el) => {
    for (const attr of ATTR_KEYS) {
      const stored = el.getAttribute(`data-lt-${attr}`);
      if (stored === german && el.getAttribute(attr) !== english) {
        el.setAttribute(attr, english);
      }
    }
  });
}

function cssEscape(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}
function hashShort(s: string) {
  // Simple non-crypto hash for marker
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return "h" + (h >>> 0).toString(36);
}

const textNodeRegistry = new WeakMap<Text, string>();
// Also keep a strong refs set so they can be re-checked; clean up periodically.
let recentTextNodes: Set<Text> = new Set();

function queueScan() {
  if (!enabled || scanScheduled) return;
  scanScheduled = true;
  requestAnimationFrame(() => {
    scanScheduled = false;
    scanDocument();
  });
}

function scanDocument() {
  if (!enabled) return;
  const c = loadCache();
  // Walk body
  const root = document.body;
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => {
      if (n.nodeType === 1) {
        return shouldSkipElement(n as Element) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((node = walker.nextNode())) {
    if (node.nodeType !== 3) continue;
    const text = node as Text;
    const raw = text.nodeValue ?? "";
    const trimmed = raw.trim();
    if (isJunk(trimmed)) continue;

    // Determine original German string for this node.
    // If we've translated it before, the current value will be the English; recover by registry.
    const known = textNodeRegistry.get(text);
    const candidate = known ?? trimmed;
    if (!known && !looksGerman(candidate)) continue;
    if (shouldSkipAncestors(text)) continue;

    if (!known) textNodeRegistry.set(text, candidate);
    recentTextNodes.add(text);

    const cached = c[candidate];
    if (cached) {
      if (text.nodeValue !== cached) {
        try { text.nodeValue = raw.replace(trimmed, cached); } catch { }
      }
    } else {
      pending.add(candidate);
    }
  }

  // Attribute walk (only elements that have any of our attrs)
  const sel = ATTR_KEYS.map((a) => `[${a}]`).join(",");
  document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
    if (shouldSkipElement(el)) return;
    if (shouldSkipAncestors(el)) return;
    for (const attr of ATTR_KEYS) {
      const val = el.getAttribute(attr);
      if (!val) continue;
      const trimmed = val.trim();
      if (isJunk(trimmed)) continue;

      const storedKey = `data-lt-${attr}`;
      const known = el.getAttribute(storedKey);
      const candidate = known ?? trimmed;
      if (!known && !looksGerman(candidate)) continue;
      if (!known) {
        el.setAttribute(storedKey, candidate);
        const markers = (el.getAttribute("data-lt-orig") || "").split(/\s+/).filter(Boolean);
        markers.push(hashShort(candidate));
        el.setAttribute("data-lt-orig", Array.from(new Set(markers)).join(" "));
      }
      const cached = c[candidate];
      if (cached) {
        if (el.getAttribute(attr) !== cached) el.setAttribute(attr, cached);
      } else {
        pending.add(candidate);
      }
    }
  });

  if (pending.size > 0) scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(flush, DEBOUNCE_MS);
}

async function flush() {
  flushTimer = null;
  if (flushing || pending.size === 0) return;
  flushing = true;
  try {
    const all = Array.from(pending);
    pending.clear();
    // Process in chunks of MAX_BATCH
    for (let i = 0; i < all.length; i += MAX_BATCH) {
      const chunk = all.slice(i, i + MAX_BATCH);
      try {
        const { data, error } = await supabase.functions.invoke("translate-batch", {
          body: { strings: chunk },
        });
        if (error) {
          console.warn("[auto-translate] error", error);
          continue;
        }
        const out = (data as any)?.translations as string[] | undefined;
        if (!Array.isArray(out)) continue;
        for (let j = 0; j < chunk.length; j++) {
          const g = chunk[j];
          const e = (out[j] ?? "").trim();
          if (e && e !== g) applyTranslation(g, e);
        }
      } catch (e) {
        console.warn("[auto-translate] invoke failed", e);
      }
    }
  } finally {
    flushing = false;
    // If new strings arrived while flushing, drain them.
    if (pending.size > 0) scheduleFlush();
  }
}

export function startAutoTranslate() {
  if (enabled) return;
  enabled = true;
  if (!observer) {
    observer = new MutationObserver(() => queueScan());
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTR_KEYS],
    });
  }
  // Initial scan after a tick so React has rendered
  setTimeout(queueScan, 50);
}

export function stopAutoTranslate() {
  if (!enabled) return;
  enabled = false;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  // Restore originals
  recentTextNodes.forEach((text) => {
    const orig = textNodeRegistry.get(text);
    if (orig && text.isConnected) {
      const current = text.nodeValue ?? "";
      // Only restore if the current value differs from original
      try { if (current.trim() !== orig) text.nodeValue = orig; } catch { }
    }
  });
  document.querySelectorAll<HTMLElement>("[data-lt-orig]").forEach((el) => {
    for (const attr of ATTR_KEYS) {
      const orig = el.getAttribute(`data-lt-${attr}`);
      if (orig && el.getAttribute(attr) !== orig) el.setAttribute(attr, orig);
    }
  });
}
