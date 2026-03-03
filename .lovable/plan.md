

## Plan: System-Prompt im KI-Chat ersetzen

Der bestehende `SYSTEM_PROMPT` in `supabase/functions/chat/index.ts` (Zeilen 9–36) wird komplett durch den neuen SheX Agency Prompt ersetzt.

### Änderung

**Datei:** `supabase/functions/chat/index.ts`

- Der alte Brezzels-Prompt (FAQ zu Auszahlung, Provision, Telegram-ID etc.) wird entfernt
- Der neue SheX Agency Prompt mit allen 35 Wissenspunkten wird als `SYSTEM_PROMPT` eingesetzt
- Alle 5 Kategorien (Vergütung, Abrechnung, Gewerbe, Arbeitsweise, Vertrag) werden übernommen
- Die strikte Grundregel ("nur aus Wissensdatenbank antworten") bleibt erhalten
- Rest der Edge Function (Streaming, CORS, Error-Handling) bleibt unverändert

