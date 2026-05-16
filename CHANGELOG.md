# GAYA Changelog

Human-readable notes for the private writing garden.

## Current prototype checkpoint

The app is live as a GitHub Pages static site backed by Supabase.

### Working features

- Magic-link sign-in through Supabase.
- Thread list and individual thread pages.
- New thread creation.
- Persona list and persona editor.
- Persona save/update/delete flow.
- Posting to a thread as a selected persona.
- Persona-specific colors, avatar/banner URLs, signatures, and font stacks.
- Basic markdown rendering for posts and summaries.
- Runtime error capture so the app shows an error panel instead of going fully blank.
- Ambient canvas blossom background across pages.
- Decorative glyph/bookplate ornaments.

### Design checkpoint

- Site-wide main font: Sorts Mill Goudy.
- Accent/bookplate font: IM Fell English.
- Garamond is no longer part of the main house style.
- New personas default to Sorts Mill Goudy.
- Persona picker includes Sorts Mill Goudy, IM Fell English, Literata, Fixedsys stack, and system fallbacks.

### Known structural debt

- Most of the app still lives in one `index.html` file.
- The next safe cleanup step is moving CSS into `styles.css` without changing behavior.
- After that, move blossom code into `blooms.js`.

## Commit notes

Use this file for narrative summaries when changes matter to future Kae/Reed/Ion. Git already tracks the exact diffs; this file tracks why the changes happened.
