import { useEffect } from "react";

/**
 * Aktiviert das Admin-Design-Scope auf <body>, solange die Komponente gemountet ist.
 * Dadurch erben auch Portale (Toaster, Dialoge), die außerhalb des Page-Trees rendern,
 * die Champagner-Gold-Tokens.
 */
export function useAdminScope() {
  useEffect(() => {
    document.body.classList.add("admin-scope");
    return () => {
      document.body.classList.remove("admin-scope");
    };
  }, []);
}
