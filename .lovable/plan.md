# Telegram IDs: clean up and enforce numbers only

## What I found

Only 3 records currently hold an invalid Telegram ID (out of 400+ with a value). 344 more have an empty value, which is simply "not filled in yet".

Broken records:

| Name / group | Stored Telegram ID | Note |
| --- | --- | --- |
| Lawal Khadijat Olamide (SYN, 16.09.2026) | `748380353011:56 AM` | a timestamp got pasted onto the ID |
| 8850121397 (SheX, 31.08.2026) | `Makgodu Salome Madiege` | name and ID swapped into the wrong boxes |
| John (SheX, 29.08.2026) | ` 6386881027` (leading space) | valid number, just needs trimming |

All three are pre-registered entries (no login account attached yet).

**Who pre-registered them:** the pre-registration records themselves don't store an author, so there is no direct trace. The platform accounts linked to all three were created by **maxsandig@hotmail.de** (super admin), which is the strongest available indication. I'll add author tracking to pre-registrations as part of this work so this is answerable in future.

## What I will do

1. **Fix the three records**
   - John: trim the space, keep `6386881027`.
   - 8850121397: swap the two values back — Telegram ID `8850121397`, name `Makgodu Salome Madiege`.
   - Lawal Khadijat Olamide: the pasted text hides where the ID ends, so I will empty the field and flag it for re-entry rather than guess. Tell me if you'd rather I keep `7483803530`.

2. **Block bad values at the database level (final safety net)**
   - Trigger on the profiles table: strip spaces and a leading `@`, turn an empty result into "no value", and reject anything left over that isn't purely digits with a clear error message.
   - Applies to every path — app, admin screens, imports, automations.

3. **Reject bad values in every place an ID is typed or imported**
   - Registration screen: already enforced; keep as is.
   - Chatter dashboard (own ID): replace the loose "at least 7 digits anywhere" check with digits-only.
   - Admin: pre-register chatter dialog — digits-only check before saving, with an inline hint.
   - Admin: edit chatter record — same check before saving.
   - Number-only keyboard on mobile and live filtering so letters and symbols can't be typed into these fields.
   - Data-import endpoints that look up or store a Telegram ID get the same cleanup, so a bad value from an outside tool is rejected instead of stored.

## Technical notes

- Migration: `BEFORE INSERT OR UPDATE` trigger `normalize_telegram_id()` on `public.profiles` — `regexp_replace(telegram_id, '\s|^@', '', 'g')`, `NULLIF(...,'')`, then `RAISE EXCEPTION` when the result fails `^[0-9]+$`. Trigger rather than CHECK so existing rows and empty strings stay valid.
- Data fix runs as an UPDATE against the three rows before the trigger is added.
- Shared helper `sanitizeTelegramId()` in `src/lib/telegram.ts`; used by `src/pages/Dashboard.tsx` (`saveTelegram`), `src/components/admin/PreChattersDialog.tsx` (`add`), `src/pages/AdminDashboard.tsx` (chatter edit save), plus `inputMode="numeric"` and an `onChange` digit filter on those inputs.
- Edge functions `ingest-profiles-data`, `assign-chatter-accounts`, `verify-telegram-id`, `update-controlling`, `update-chatter-presence`: normalize incoming `telegram_id` to digits and return 400 on non-numeric input.
- Add `profiles.created_by uuid` (default `auth.uid()`) so future pre-registrations record their author; shown next to each entry in the pre-registration list.
