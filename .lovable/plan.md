

# Globale Firmendaten für Provider Invoice

## Problem
Die Issuer-Daten (Firmenname, Adresse, VAT ID) sind als Konstante hardcoded (`ISSUER_DEFAULTS`) und werden pro Account separat im localStorage gespeichert. Wenn du die Firmendaten änderst, gilt das nur für diesen einen Account -- nicht für alle anderen.

## Lösung

### 1. Neue DB-Tabelle `issuer_settings` (eine Zeile)
Speichert die globalen Firmendaten zentral:
- `name` (text) -- Firmenname
- `address` (text) -- Adresse
- `vat_id` (text) -- VAT ID
- `kvk` (text) -- KVK/Registernummer

RLS: Nur Admins können lesen und schreiben. Eine Zeile wird mit den aktuellen Defaults vorbelegt.

### 2. CreditNoteForm anpassen
- Beim Laden: Issuer-Daten aus `issuer_settings` laden statt aus `ISSUER_DEFAULTS`
- Beim Ändern der Issuer-Felder: Per Debounce automatisch in `issuer_settings` zurückschreiben
- localStorage-Persistierung der Issuer-Felder entfernen (nur noch DB)
- Provider-Felder bleiben weiterhin pro Account im localStorage

### Ergebnis
Wenn du in irgendeiner Provider Invoice die Firmendaten änderst, gilt die Änderung sofort überall -- Model Dashboard und Mitarbeiter Dashboard.

## Technische Details
- Migration: `CREATE TABLE issuer_settings` + `INSERT` mit aktuellen Defaults
- CreditNoteForm: `useEffect` zum Laden, Debounce-Save bei Issuer-Feldänderungen
- Keine neuen Komponenten nötig

