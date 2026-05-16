# GAYA Changelog

Human-readable notes for the private writing garden.

## Current checkpoint

The app is live as a GitHub Pages static site backed by Supabase.

The early emergency-stabilization phase is complete: the app no longer relies on a fully single-file `index.html`, the visual system has a dedicated stylesheet layer, blossoms are externalized, and the repo has a design brief plus coordination notes.

### Working features

- Magic-link sign-in through Supabase.
- Thread list and individual thread pages.
- Real anchor-based thread navigation with JavaScript enhancement.
- New thread creation.
- Persona list and persona editor.
- Persona save/update/delete flow.
- Posting to a thread as a selected persona.
- Persona-specific colors, avatar/banner URLs, signatures, and font stacks.
- Basic markdown rendering for posts and summaries.
- Runtime error capture so the app shows an error panel instead of going fully blank.
- Ambient canvas blossom background across pages via `blooms.js`.
- Decorative glyph/bookplate ornaments.
- Natural-history/heirloom forum theme layer via `theme-natural-history.css`.

### Design checkpoint

- Site-wide main font: Sorts Mill Goudy.
- Accent/bookplate font: IM Fell English.
- Garamond is no longer part of the main house style.
- New personas default to Sorts Mill Goudy.
- Persona picker includes Sorts Mill Goudy, IM Fell English, Literata, Fixedsys stack, and system fallbacks.
- Reed's canvas blossoms remain as ambient atmosphere.
- Ion's glyph ornaments remain as bookplate/corner marks.
- The current direction is private heirloom forum + pastel natural history + grown-up Gaia successor.
- Babytooth-specific motif anchors live in `DESIGN.md`.

### Structure checkpoint

Current files of interest:

- `index.html` — page shell, script links, Supabase library load, remaining inline app script.
- `styles.css` — extracted base stylesheet plus heirloom forum styling pass.
- `theme-natural-history.css` — active natural-history override layer and ornament/masthead treatment.
- `blooms.js` — extracted canvas blossom background.
- `DESIGN.md` — design brief and motif anchors.
- `PROJECT.md` — coordinator notes and refactor plan.
- `CHANGELOG.md` — this narrative checkpoint.

### Known structural debt

- Core app logic still lives inline in `index.html`.
- Supabase setup/auth helpers are not yet split into `supabaseClient.js`.
- App state/routing/rendering are not yet split into `app.js`.
- Persona, thread, and markdown helpers can stay inline until the next split becomes useful.

### Next safe cleanup options

1. Stop and design/test visually before touching logic again.
2. Split Supabase setup/auth helpers into `supabaseClient.js`.
3. Split the remaining app script into `app.js` only after the current live site is confirmed stable.
4. Keep theme work in CSS layers rather than app logic.

## Commit notes

Use this file for narrative summaries when changes matter to future Kae/Reed/Ion. Git already tracks the exact diffs; this file tracks why the changes happened.