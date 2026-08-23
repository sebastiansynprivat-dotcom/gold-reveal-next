# Lowercase usernames on accounts

## Goal
Account usernames should always be stored in lowercase — existing entries converted, new/edited entries normalized automatically.

## Current state
- 686 accounts total; 48 have a username with uppercase characters.
- A trigger function `lowercase_account_email()` already normalizes `account_email` on insert/update, but it ignores `username`.

## Changes

1. Extend the existing normalization trigger function so it also lowercases `username` (when not null) on every insert and update. No new trigger needed — the existing one on `accounts` keeps firing.
2. One-time data update: set `username = lower(username)` for the 48 affected rows.

## Notes
- Lowercasing happens at the database level, so all writers (admin UI, ingest functions, `update-account`) are covered without frontend changes.
- No unique constraint exists on `username`, so the conversion cannot cause constraint conflicts.
