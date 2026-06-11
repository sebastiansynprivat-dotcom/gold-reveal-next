## Goal
Disable editing of **Group Name** and **Telegram ID** for signed-in chatters. Show both fields as read-only display-only pills.

## Changes

### `src/pages/Dashboard.tsx`
- **Desktop header pills** (around line 660–770): Replace the editable Input + Save button + Pencil toggle with a static display pill that only shows the saved value.
- **Mobile info rows** (around line 840–920): Same — replace the editable Input + Save/Ändern toggle with static text display.
- Remove or simplify the conditional `editingGroupName` / `telegramSaved` edit-mode branches; keep the saved-value branch as the only path.
- The help dialog for "Wo finde ich meine Telegram-ID?" can remain as a read-only helper.

## UI After Change
- Group Name: a rounded pill showing the saved group name, no pencil icon, no input field.
- Telegram ID: a rounded pill showing the saved Telegram ID with the green checkmark, no "Ändern" button, no input field.
- If the value is empty, show a muted placeholder (e.g. "—") instead of an input.

## Technical Notes
- Keep `useState` variables for the loaded values so the display still populates from Supabase on mount.
- Remove `saveGroupName`, `saveTelegram`, `editingGroupName`, `groupNameSaved`, `telegramSaved` state/setters that are only used for edit UX (or simplify to just track whether a value was loaded).
- Keep `groupName` usage in the billing/referral section intact.