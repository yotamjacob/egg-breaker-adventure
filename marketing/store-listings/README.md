# Play Store listings

Ready-to-paste Google Play store listings. One file per locale.

`en-US.md` is the **source of truth** — change it first, then update the
translations so they do not drift.

## How to use (TODO(owner) — manual step, cannot be done from the repo)

1. Play Console → your app → **Grow → Store presence → Main store listing**
2. Use the language selector → **Add language** → pick the locale below
3. Paste **Title**, **Short description** and **Full description** from the file
4. Graphics (icon, feature graphic, screenshots) are shared across locales —
   they only need uploading once unless you want localised screenshots
5. Save → the listing goes live after review (usually a few hours)

## Locales

| File | Play Console locale | Language |
|------|--------------------|----------|
| `en-US.md` | English (United States) | English |
| `he-IL.md` | Hebrew | עברית |
| `es-ES.md` | Spanish (Spain) | Español |
| `pt-BR.md` | Portuguese (Brazil) | Português (Brasil) |
| `de-DE.md` | German (Germany) | Deutsch |
| `fr-FR.md` | French (France) | Français |

## Play Console field limits

| Field | Limit |
|-------|-------|
| Title | 30 characters |
| Short description | 80 characters |
| Full description | 4000 characters |

Every file in this directory is checked against those limits by
`node tools/check-listings.js`. Run it after editing — Play Console rejects
an over-length field on save, and it is easier to catch here.

## Notes on the translations

- **"Egg Breaker" is kept untranslated in every title.** It is the search
  term people actually type when looking for the original game, and
  translating it would forfeit the one keyword this whole effort is built
  around. Only the descriptor after it is localised.
- Emoji section markers are kept identical across locales so the listings
  stay visually consistent and are easy to diff.
- The closing line points at the free web version in every locale — it is
  the zero-friction entry point for anyone who reads the listing and does
  not want to install yet.
