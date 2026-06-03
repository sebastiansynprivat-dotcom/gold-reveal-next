import { useLocation } from "react-router-dom";
import LanguageToggle from "./LanguageToggle";

// Hidden on admin / model / social media areas (they have their own language model).
const HIDDEN_PREFIXES = ["/admin", "/model", "/socialmedia"];

export default function FloatingLanguageToggle() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }
  return (
    <div
      className="fixed z-[60] top-2 right-2 sm:top-3 sm:right-3"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="backdrop-blur-md bg-background/70 rounded-full shadow-lg">
        <LanguageToggle />
      </div>
    </div>
  );
}
