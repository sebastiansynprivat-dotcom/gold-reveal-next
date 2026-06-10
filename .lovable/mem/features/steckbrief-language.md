---
name: Steckbrief Language Logic
description: Model fills Steckbrief in their UI language (source_language stored); chatter view auto-translates via translate-batch when source differs from chatter UI language
type: feature
---
- `model_profiles.source_language` (text, default 'de') is written by `ModelProfileForm` on every save based on the form's active `lang`.
- Model UI language is driven by `profiles.language`/`ui_language` (and SYN agency forces 'en' in ModelDashboard).
- `ModelProfileViewDialog` defaults `language` to the viewer's `useUILanguage()` lang. When `source_language !== lang`, it calls the `translate-batch` edge function for the free-text fields (TRANSLATABLE_KEYS), with a small "Automatically translated" badge.
- Static labels (section titles, field labels) always render in the chatter's UI language from the SECTIONS map — they are never sent through the translator.
