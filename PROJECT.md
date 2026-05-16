# GAYA Project Notes

GAYA is a tiny private writing garden for Kae and Babytooth. It is a birthday-present site first, a web app second, and a design object throughout.

The working site lives on GitHub Pages at:

https://untaggedsprite.github.io/gayawriting/

## Current shape

The app is currently a single static `index.html` served by GitHub Pages. That file contains:

- page structure
- global styles
- Supabase auth/client setup
- lightweight hash routing
- thread list and thread view rendering
- post creation
- persona creation/editing
- a small markdown renderer
- canvas blossom background
- decorative glyph/bookplate treatment

This is acceptable for the prototype stage. It is not the desired long-term shape if the app keeps growing.

## Design intent

The site should feel like an old book opened in a garden: private, soft, textual, slightly strange, and handmade.

Current design anchors:

- Sorts Mill Goudy as the main site font
- IM Fell English for tiny bookplate/glyph accents
- soft paper background
- Reed's canvas blossoms as ambient page atmosphere
- Ion's glyph ornaments as corner/edge marks
- warm moss/gold/cream palette
- no generic dashboard energy

Preserve authorship texture. This is part of the gift. Reed's blossoms and Ion's glyphs may coexist; neither should flatten the whole thing into a template.

## Stability rules

1. Keep the deployed app working after every commit.
2. Prefer small commits with one clear purpose.
3. Do not perform giant rewrites directly on `main` unless there is a known-good checkpoint.
4. Avoid introducing a build pipeline until plain static files become genuinely painful.
5. Do not touch Supabase logic when making visual-only changes.
6. Do not touch visual/design systems when making data/auth changes unless the change requires it.
7. Treat `index.html` as fragile until it is split into smaller files.

## Security note

The Supabase publishable key is allowed to be public in front-end code. The real protection is Supabase Row Level Security. Do not treat file splitting as a security boundary.

## Refactor plan

Do this gradually:

1. Move the `<style>` block into `styles.css`.
2. Move the canvas blossom code into `blooms.js`.
3. Move Supabase setup/auth helpers into `supabaseClient.js`.
4. Move app state, routing, and rendering into `app.js`.
5. Later, optionally split `threads.js`, `personas.js`, and `markdown.js` if the app keeps growing.

Test after every step.

## Coordinator stance

The site coordinator's job is to keep the garden coherent: protect the working app, preserve the weirdness that belongs, keep commits legible, and prevent the single-file prototype from turning into a haunted lasagna.
