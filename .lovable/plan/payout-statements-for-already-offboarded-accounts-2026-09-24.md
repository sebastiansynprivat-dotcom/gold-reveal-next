# Payout statements for already offboarded accounts

## What is going on
All 16 offboardings marked "erledigt" have 0 statements saved, and no files for them exist in storage. They were never downloaded, so this is not a display problem. The daily job deletes the account on the target date even when the platform sent back no statements. It only stops when the platform returns a real error. Why the platform sent nothing for these accounts isn't confirmed yet (maybe too early in the month, or it returned an empty result).

## Fix
1. **Stop archiving without statements.** On the target date, if months are still missing, the account stays and the job tries again the next day. The entry is marked "fehlgeschlagen" with a clear note ("Belege fehlen noch"). After 3 days of retries it archives anyway, with a note that some statements are missing, so nothing gets stuck forever.
2. **Recover the 16 finished ones.** The job loads the archived account's login details from the archive and downloads the missing statements for those accounts. The account itself stays archived. The files show up in the Offboarding section as usual.
3. **"Belege nachladen" button** on each entry in the Offboarding section (also for finished ones). It triggers this download right away instead of waiting for the next night.
4. First step while building: run the recovery for one archived account and check the job's log to confirm why statements were missing. If a platform truly has none, the entry will say so.

## Technical notes
- `process-offboardings`: add a `recover` mode (`offboarding_id` or all `done` rows with 0 files). Load credentials from `deleted_records.data` when `accounts` has no row. Treat an empty statement list with missing months as a retry, tracked via a retry count or the age of `last_run_at`. Log the upstream response size.
- Store the error text in `last_error` so it shows in the details.
- `OffboardingTab.tsx`: add a button that calls the function with `offboarding_id` and then reloads.
- No schema changes. If a retry counter column is cleaner, add `retry_count int default 0`.
