

# Mitarbeiter-Dashboard: Persistente Speicherung in der Datenbank

## Problem
Das **Mitarbeiter-Dashboard (ChatterDashboardTab)** speichert alle Daten nur in `localStorage`. Das bedeutet:
- Daten gehen verloren, wenn der Browser-Cache geleert wird
- Daten sind geräteabhängig (nicht synchronisiert)
- Kein anderer Admin sieht die gleichen Daten

Das **Model-Dashboard** nutzt bereits Supabase korrekt mit Auto-Save -- dort besteht kein Problem.

## Lösung

### 1. Neue Datenbank-Tabelle `chatters` erstellen
Speichert alle Mitarbeiter/Chatter-Stammdaten persistent:

```text
chatters
├── id (uuid, PK)
├── name (text)
├── platform (text)
├── role (text: 'chatter' | 'mitarbeiter')
├── compensation_type (text: 'percentage' | 'hourly')
├── revenue_percentage (numeric)
├── hourly_rate (numeric)
├── hours_worked (numeric)
├── fourbased_revenue (numeric)
├── maloum_revenue (numeric)
├── brezzels_revenue (numeric)
├── currency (text, default 'EUR')
├── crypto_address (text)
├── created_at (timestamptz)
├── updated_at (timestamptz)
```

RLS: Nur Admins haben vollen Zugriff (SELECT/INSERT/UPDATE/DELETE).

### 2. ChatterDashboardTab umbauen
- `localStorage`-Logik komplett entfernen
- Daten beim Laden aus Supabase lesen
- Auto-Save mit Debounce (wie im ModelDashboardTab) bei jeder Änderung
- Neuen Eintrag per `INSERT` anlegen
- Löschen per `DELETE`
- Alle Felder (Name, Plattform, Rolle, Umsätze, Verdienst-Parameter, Crypto-Adresse) werden direkt in der DB gespeichert

### 3. Keine Änderungen am Model-Dashboard nötig
Das Model-Dashboard speichert bereits korrekt in `model_dashboard` via Supabase.

## Technische Details
- Migration: `CREATE TABLE public.chatters (...)` mit RLS-Policy für Admins
- Code: ~50 Zeilen Supabase-Logik ersetzen die localStorage-Zeilen
- Auto-Save-Debounce: 1200ms (gleich wie ModelDashboardTab)
- Bestehende localStorage-Daten werden beim ersten Laden einmalig migriert (falls vorhanden)

