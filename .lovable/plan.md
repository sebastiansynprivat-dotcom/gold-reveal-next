## Ziel

Im **Chatter Dashboard** (Mitarbeiter Dashboard) und in der **Provider Invoice** (Model + Mitarbeiter Dashboard) sollen zwei Probleme gelöst werden:

1. **Custom Platform** statt nur fixe Plattformen (4Based / Maloum / Brezzels) — damit z.B. Miami-Chatter ohne Plattform-Bezug erfasst werden können.
2. **Bidirektionale Währungsumrechnung** EUR ↔ USD (und die anderen verfügbaren Währungen) im Provider Invoice — heute funktioniert die Live-Rate nur „Fremdwährung → EUR".

---

### 1. Chatter-Anlage: „Custom" als zusätzliche Plattform-Option

Im Chatter-Detailbereich (`ChatterDashboardTab.tsx`) wird zusätzlich zu den 3 Plattform-Feldern (4Based / Maloum / Brezzels) ein **vierter Block „Custom Revenue"** ergänzt:

- Eingabe **Plattform-Name** (Freitext, z.B. „Miami", „OnlyFans", …)
- Eingabe **Total Revenue** (Zahl)
- Wird in `totalRevenue` und damit auch in den Verdienst-Anteil eingerechnet
- Wird in der Provider-Invoice-PDF in der Plattform-Aufschlüsselung als zusätzliche Zeile mit dem eingegebenen Namen angezeigt

So bleibt die saubere Aufschlüsselung („Plattform X: Revenue → Anteil") erhalten, auch wenn eine der Standardplattformen nicht passt.

### 2. Provider Invoice: Währungsumrechnung in beide Richtungen

Aktuell holt das Formular per Frankfurter-API nur den Kurs `Fremdwährung → EUR` (z.B. `USD → EUR`).

Erweiterung:

- Live-Kurs wird **immer** geladen, auch wenn die Hauptwährung EUR ist (dann z.B. `EUR → USD`)
- Im Formular erscheint ein neuer Bereich **„Umrechnung"**:
  - Auswahl **Zielwährung** (USD, EUR, GBP, CHF, AED — gleiches Set wie Chatter)
  - Anzeige des Live-Kurses (z.B. `1 EUR = 1,0850 USD`)
  - Anzeige der umgerechneten Beträge (Netto / Brutto) in Zielwährung
- Diese Umrechnung wird auch in die **PDF** übernommen (Hinweiszeile + ggf. Betrag in Zielwährung) — speziell für Krypto-Auszahlung in USDT, wenn die Buchhaltung in EUR / USD aufgeschlüsselt sein muss.

### 3. Konsistenz Model + Mitarbeiter Dashboard

Die Provider-Invoice-Komponente (`CreditNoteForm.tsx`) wird in beiden Bereichen verwendet — die Änderung wirkt automatisch in beiden Dashboards.

Die Custom-Platform-Erweiterung gilt für die Chatter/Mitarbeiter-Anlage; im Model Dashboard bleiben die plattformspezifischen Felder bestehen, da Models klar auf einer Plattform laufen.

---

## Technische Details

**Schema-Änderungen (Migration nötig):**
- `chatters`: Spalten `custom_platform_name TEXT DEFAULT ''` und `custom_revenue NUMERIC DEFAULT 0`

**Code-Änderungen:**
- `ChatterDashboardTab.tsx`: 4. Plattform-Block (Name + Revenue), `totalRevenue`-Berechnung erweitert, Save/Load erweitert, `platformRevenue`-Prop an `CreditNoteForm` erweitert um `{ name, rev }[]`-Liste
- `CreditNoteForm.tsx`:
  - `PlatformRevenue`-Typ erweitert um optionales `custom?: { name: string; rev: number }`
  - PDF-Aufschlüsselung rendert Custom-Zeile mit eingegebenem Namen
  - Frankfurter-Fetch funktioniert in beide Richtungen (Quelle = `currency`, Ziel = neue State `targetCurrency`)
  - Neues UI-Feld „Umrechnen in" + Anzeige Netto/Brutto in Zielwährung
  - PDF-Footer erhält Umrechnungs-Hinweis auch wenn Quelle EUR ist

**Was unverändert bleibt:**
- Bestehende Plattform-Felder, bestehende DB-Spalten, Collect Exchange ID, Crypto-Felder.