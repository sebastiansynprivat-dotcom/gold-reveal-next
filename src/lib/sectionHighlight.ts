// Premium golden highlight + floating label when navigating via QuickActionBar.
// Adds a glowing ring around the target section and a top-floating gold badge
// briefly indicating where the user has just been taken.

let activeLabel: HTMLDivElement | null = null;
let labelTimer: number | null = null;

function ensureStyles() {
  if (document.getElementById("section-highlight-styles")) return;
  const style = document.createElement("style");
  style.id = "section-highlight-styles";
  style.textContent = `
    .section-highlight-pulse {
      position: relative;
      z-index: 1;
      animation: section-highlight-ring 2.2s ease-out;
      border-radius: 1rem;
    }
    @keyframes section-highlight-ring {
      0% {
        box-shadow:
          0 0 0 0 hsl(var(--accent) / 0.0),
          0 0 0 0 hsl(var(--accent) / 0.0);
      }
      20% {
        box-shadow:
          0 0 0 3px hsl(var(--accent) / 0.9),
          0 0 40px 8px hsl(var(--accent) / 0.55);
      }
      100% {
        box-shadow:
          0 0 0 0 hsl(var(--accent) / 0.0),
          0 0 0 0 hsl(var(--accent) / 0.0);
      }
    }

    .section-highlight-label {
      position: fixed;
      top: 1.25rem;
      left: 50%;
      transform: translate(-50%, -12px);
      z-index: 9999;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: hsl(var(--background));
      background: linear-gradient(
        135deg,
        hsl(var(--accent)) 0%,
        hsl(var(--accent) / 0.85) 50%,
        hsl(var(--accent)) 100%
      );
      border: 1px solid hsl(var(--accent) / 0.6);
      box-shadow:
        0 10px 30px -8px hsl(var(--accent) / 0.55),
        0 0 0 1px hsl(var(--accent) / 0.25) inset;
      opacity: 0;
      animation: section-highlight-label 2.4s ease-out forwards;
      pointer-events: none;
      white-space: nowrap;
    }
    .section-highlight-label::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: hsl(var(--background));
      box-shadow: 0 0 8px hsl(var(--background) / 0.8);
    }
    @keyframes section-highlight-label {
      0%   { opacity: 0; transform: translate(-50%, -12px) scale(0.96); }
      12%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
      80%  { opacity: 1; transform: translate(-50%, 0) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -8px) scale(0.98); }
    }
  `;
  document.head.appendChild(style);
}

export function highlightSection(
  el: Element | null | undefined,
  label: string,
) {
  ensureStyles();

  // Floating premium label
  if (activeLabel) {
    activeLabel.remove();
    activeLabel = null;
  }
  if (labelTimer) {
    window.clearTimeout(labelTimer);
    labelTimer = null;
  }
  const badge = document.createElement("div");
  badge.className = "section-highlight-label";
  badge.textContent = label;
  document.body.appendChild(badge);
  activeLabel = badge;
  labelTimer = window.setTimeout(() => {
    badge.remove();
    if (activeLabel === badge) activeLabel = null;
  }, 2500);

  // Ring pulse on the target element
  if (el instanceof HTMLElement) {
    el.classList.remove("section-highlight-pulse");
    // force reflow so the animation can restart if re-triggered
    void el.offsetWidth;
    el.classList.add("section-highlight-pulse");
    window.setTimeout(() => {
      el.classList.remove("section-highlight-pulse");
    }, 2400);
  }
}
