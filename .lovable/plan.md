# Archive 8 "4Based" accounts of 4elements.digital

Archive every platform account that is on **4Based** and whose login email ends in **@4elements.digital**.

## What was found

Exactly 8 accounts match, none has a chatter assigned, and posting/messaging is already off on all of them:

- amateurshe, belen, jateen (gracy@), lysa, magic-mia, marketkaaaof, mayasinn, spicyvictoria

Two of them (amateurshe, magic-mia) already have a scheduled offboarding entry for tomorrow (26.09.2026).

## What happens

1. All 8 accounts are removed from the active account list. The existing archive mechanism keeps a full copy of each account, so they continue to show greyed out in the model card and in the "Archiv (Gelöscht)" section — nothing is lost.
2. The two open offboarding entries are marked "erledigt" with the archive date, so the nightly job does not touch them again.
3. The other 6 accounts have no offboarding entry; they are simply archived.

## Technical notes

- One data change via run_sql: `DELETE FROM public.accounts WHERE platform = '4Based' AND account_email ILIKE '%@4elements.digital'` — the existing `archive_deleted_record` trigger writes each row into `deleted_records` (same path as manual deletion and offboarding archival).
- Second statement: `UPDATE public.account_offboardings SET status = 'done', archived_at = now() WHERE account_id IN (the 2 ids) AND status <> 'done'`.
- No schema, RLS, or code changes. Related rows (revenue data, assignments) keep their account_id references and remain readable; the accounts themselves only live in the archive afterwards.
- Payout statements: none of these accounts has saved statements, and no new ones are fetched — say the word if you want a statement-fetch attempt before archiving instead.
