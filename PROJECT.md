# GAYA Project Notes

GAYA is a tiny private writing garden for Kae and Babytooth. It is a birthday-present site first, a web app second, and a design object throughout.

The working site lives on GitHub Pages at:

https://untaggedsprite.github.io/gayawriting/

## Current shape

The app is a static GitHub Pages site backed by Supabase. It has moved past the first single-file prototype stage, but the core app logic still intentionally stays simple.

Current structure:

- `index.html` holds the page shell, script links, Supabase browser library load, and the remaining inline app script.
- `styles.css` holds the extracted base stylesheet plus the first heirloom-forum styling pass.
- `theme-natural-history.css` is the active visual override layer: grey natural-history palette, contained greenhouse masthead, ornament assets, and Babytooth-specific motif direction.
- `blooms.js` holds the extracted ambient canvas blossom background and exposes `window.initPageBlooms` for the app.
- `DESIGN.md` holds the current design brief and Babytooth-specific motif anchors.
- `PROJECT.md` and `CHANGELOG.md` provide coordination memory for future Kae/Reed/Ion work.

Working app features:

- Supabase magic-link sign-in.
- Lightweight hash routing.
- Thread list and individual thread pages.
- Real anchor-based thread navigation with JavaScript enhancement.
- New thread creation.
- Post creation inside threads.
- Persona creation/editing/deletion.
- Persona-specific colors, avatars, banners, signatures, and font stacks.
- Basic markdown-ish rendering.
- Runtime error capture so failures show an error panel instead of a blank page.
- Ambient canvas blossoms.
- Decorative glyph/bookplate treatment.
- Layered natural-history/heirloom forum styling.

## Design intent

The site should feel like an old book opened inside a private garden forum: soft, textual, handmade, slightly strange, and specific to Kae and Babytooth.

Current design anchors:

- Sorts Mill Goudy as the main site font.
- IM Fell English for tiny bookplate/glyph accents.
- Grey natural-history palette with paper, moss, gold, pastel specimen tones, and softened stone/ash neutrals.
- Reed's canvas blossoms as ambient overgrowth/atmosphere.
- Ion's glyph ornaments as corner/edge marks.
- Gaia Online ancestry without cloning Gaia Online.
- Forum-board structure, post-style ceremony, and BBCode ghosts.
- Babytooth-specific motifs: Ohio river/woods/field edges, deer, ethical insect preservation, taxidermy-as-care/craft, pastel natural history, and handmade competence.

Preserve authorship texture. This is part of the gift. Reed's blossoms and Ion's glyphs may coexist; neither should flatten the whole thing into a template.

## Stability rules

1. Keep the deployed app working after every commit.
2. Prefer small commits with one clear purpose.
3. Do not perform giant rewrites directly on `main` unless there is a known-good checkpoint.
4. Avoid introducing a build pipeline until plain static files become genuinely painful.
5. Do not touch Supabase logic when making visual-only changes.
6. Do not touch visual/design systems when making data/auth changes unless the change requires it.
7. Treat the remaining inline app script in `index.html` as fragile until it is split into smaller files.
8. Test login, thread open, persona page, and post creation after any structural change.

## Security note

The Supabase publishable key is allowed to be public in front-end code. The real protection is Supabase Row Level Security. File splitting is maintainability work, not a security boundary.

## Refactor status

Completed:

1. Moved the main `<style>` block into `styles.css`.
2. Moved the canvas blossom code into `blooms.js`.
3. Added `theme-natural-history.css` as a separate override/theme layer.
4. Hardened thread navigation by making thread cards real links.
5. Added design and coordination docs.

Still pending, only when the live site is stable:

1. Move Supabase setup/auth helpers into `supabaseClient.js`.
2. Move app state, routing, and rendering into `app.js`.
3. Later, optionally split `threads.js`, `personas.js`, and `markdown.js` if the app keeps growing.
4. Update docs after each structural move.

Test after every step.

## Coordinator stance

The site coordinator's job is to keep the garden coherent: protect the working app, preserve the weirdness that belongs, keep commits legible, and prevent the prototype from turning into a haunted lasagna.

The repo only believes commits. The birthday garden believes in small, tested ones.