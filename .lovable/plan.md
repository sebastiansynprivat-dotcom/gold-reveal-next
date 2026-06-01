# Englischer Sprachsupport für den Chatter-Bereich

Ziel: Komplette EN-Übersetzung des Chatter-Bereichs (UI, Dialoge, AI-Antworten, Push-Notifications). Default DE, Browser erkennt EN automatisch, User kann jederzeit überschreiben.

## Umsetzung in 3 Phasen

### Phase 1 — Sprach-Infrastruktur (diese Iteration)

1. **DB-Feld** `ui_language` (`'de' | 'en'`) auf `profiles` (Default `de`).
2. **`useUILanguage()` Hook** mit:
   - Initial: Wert aus `profiles.ui_language` falls gesetzt, sonst `navigator.language` → `en-*` ⇒ `en`, sonst `de`.
   - Realtime-Sync zur DB, Cache in `localStorage`.
   - Exportiert `lang`, `setLang`, `t(key)`.
3. **Translation-Dictionary** `src/i18n/translations.ts` mit allen DE/EN-Strings nach Bereichen (`dashboard.*`, `checklist.*`, `streak.*`, `chat.*`, …).
4. **Sprach-Toggle** in der Dashboard-Header-Zone (DE | EN Pill).

### Phase 2 — UI-Übersetzung (folgt direkt)

Dateien werden auf `t(...)` umgestellt:
- `src/pages/Dashboard.tsx`
- `src/components/ChatterDashboardTab.tsx`, `DailyChecklist.tsx`, `StreakTracker.tsx`, `MonthlyStreakTracker.tsx`, `ThirtyDayChallenge.tsx`, `MonthSummaryWidget.tsx`, `RevenueChart.tsx`, `QuickActionBar.tsx`, `DashboardOnboarding.tsx`, `DailyGoal.tsx`, `ProgressChecklist.tsx`, `LiveActivityTicker.tsx`, `SocialProofBar.tsx`, `LootBoxReward.tsx`, `PushNotificationDialog.tsx`, `NotificationBanner.tsx`, `BillingAudioDialog.tsx`, `GewerbeDialog.tsx`, `FrageMemoDialog.tsx`, `AccountMemoDialog.tsx`, `DashboardChat.tsx`, `ExitIntentPopup.tsx`, `HomescreenTutorial.tsx`, `InspirationLibrary.tsx`, `MassDmGenerator.tsx`
- Seiten: `Auth.tsx`, `Onboarding.tsx`, `Quiz.tsx`, `Library.tsx`, `Invoice.tsx`, `Leaderboard.tsx`, `SalesScripts.tsx`, `ResetPassword.tsx`, Offer-Pages, `Index.tsx`
- Date-fns Locale: `de` ↔ `enUS` dynamisch.

### Phase 3 — AI & Push (folgt)

- Edge Functions `chat`, `generate-massdm`, `generate-chatter-summary`, `translate-text`, `hourly-revenue-push`, `notify-account-assigned`, `process-scheduled-notifications`, `send-notification`, `ingest-revenue` (Sale-Push) bekommen System-Prompts/Templates mit Sprach-Switch basierend auf `profiles.ui_language` des Empfängers.
- `notifications`-Templates erweitert um `body_en`/`title_en` Spalten; Admin-UI bekommt EN-Tab.
- Push-Texte (BIG SALE, Streak, 24h-Follow-up) auf Empfänger-Sprache.

## Technische Details

- **Reaktivität**: Hook abonniert Realtime-Channel `profiles:user_id=eq.{uid}` → Sprachwechsel propagiert ohne Reload.
- **Mass DM/Inspiration**: Bleiben DE/EN je nach `model_language` des Accounts (das ist Content-Sprache, nicht UI).
- **Admin-Bereich**: Bleibt komplett DE (außerhalb Scope).
- **Model-Dashboard**: Hat schon eigenes Toggle via `model_language` — wird nicht angefasst.

## Was diese Iteration konkret ändert

- Migration `profiles.ui_language`
- `src/i18n/translations.ts` (initiale Keys für Dashboard-Kern)
- `src/hooks/useUILanguage.ts`
- Sprach-Toggle in `Dashboard.tsx` Header
- `Dashboard.tsx` + `ChatterDashboardTab.tsx` + `DailyChecklist.tsx` + `StreakTracker.tsx` + `QuickActionBar.tsx` + `MonthSummaryWidget.tsx` + `RevenueChart.tsx` als erste Übersetzungswelle

Phase 2 (restliche Widgets/Seiten) und Phase 3 (AI/Push) folgen in eigenen Nachrichten, damit Du jeweils das Ergebnis prüfen kannst.
