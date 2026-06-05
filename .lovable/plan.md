## Add "name" (real name) field to chatter signup, profiles table, and dashboard header

### 1. Database
Migration on `public.profiles`:
- Add column `name text` (nullable).

### 2. Signup form (`src/pages/Auth.tsx`)
- Add new state `name` and a new input field at the top of the signup form (above the group name field), placeholder "Dein Name" / "Your name".
- Validate it's non-empty on submit (same pattern as `groupName`).
- Pass it through `signUp(email, password, { group_name, name })` so `handle_new_user_profile` trigger / metadata path stores it.
- Add translation keys: `auth.placeholder.name`, `auth.error.nameRequired`.

### 3. Persist into profiles
Update the `handle_new_user_profile` trigger to also read `raw_user_meta_data->>'name'` into `profiles.name` (done in the same migration).

### 4. Dashboard header (`src/pages/Dashboard.tsx`)
- Load `name` along with `telegram_id, group_name, offer` from profiles.
- Add a new section in the header (between logo/title and Telegram block, with a `User` icon + divider) showing the name — placeholder text "Name" when empty. Read-only display, matches existing header styling.
- Mobile variant: add the same compact row.

### Out of scope
- No edit-in-header UI for name (display only, placeholder when empty).
- No changes to admin views, RLS, or downstream tables.
