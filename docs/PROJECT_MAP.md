# GAYA Project Map

This file is the wall map for the little greenhouse. It explains which files own which behavior so future branch chats do not have to rediscover the goblin tunnel system from scratch.

## Current shape

GAYA is a static GitHub Pages app backed by Supabase. The frontend is plain HTML, CSS, and JavaScript. There is no build step, bundler, package manager, or framework.

`index.html` loads the base app and then a series of enhancement modules. Load order matters. Several files intentionally wrap or replace global functions from earlier files.

## Load order

Current script order in `index.html`:

1. Supabase browser client from CDN
2. `blooms.js`
3. `app.js`
4. `custom-css-scope.js`
5. `persona-secondary-banner.js`
6. `soft-actions.js`
7. `ownership.js`
8. `persona-studio.js`
9. `persona-help.js`
10. `persona-layouts.js`
11. `persona-polish.js`
12. `image-render-fix.js`
13. `image-upload.js`
14. `draft-guard.js`
15. `gaya-enhancements.js`
16. `moths.js`

Do not casually reorder these. Later files depend on functions, DOM structure, or globals created by earlier files.

## Core files

### `index.html`

Owns page shell, stylesheet loading, script loading, and cache-busting query strings.

When a CSS or JS change does not show up on GitHub Pages, bump the relevant `?v=` number here.

### `app.js`

Owns the base application:

- Supabase URL/key setup
- global `state`
- auth/session handling
- hash routing
- magic link login
- thread loading and creation
- post loading and creation
- persona loading, saving, and deleting
- base render functions
- base markdown-ish renderer
- base custom CSS helper functions

Important globals from `app.js` are used and/or wrapped by later modules:

- `renderPersonaEditor`
- `readPersonaForm`
- `defaultPersona`
- `renderPosts`
- `updatePersonaPreview`
- `safe`
- `deletePersona`

Treat edits to these functions as higher-risk.

### `soft-actions.js`

Wraps `safe()` so ordinary button/action failures do not replace the whole app with the fatal error screen. Hard failures such as boot, auth changes, hash navigation, runtime errors, and unhandled promises can still use the fatal screen.

### `ownership.js`

Hardens persona deletion so users can only delete personas they own.

## Persona editor modules

The persona editor is intentionally layered. The base editor exists in `app.js`, but the user-facing editor is built by enhancement modules.

### `persona-studio.js`

Owns the friendly persona editor surface:

- vibe presets
- friendlier font dropdown
- font sample/loading status
- top banner URL field
- bottom banner URL field
- hidden custom CSS field used by presets and controlled features
- save/reset/delete controls
- preview container

Presets fill existing persona fields. They do not overwrite name, avatar, banner images, or signature.

### `persona-help.js`

Adds the quick post-style guide to the persona editor.

### `persona-layouts.js`

Owns old-forum/Gaia-style layout controls:

- layout mode: standard or Gaia style
- portrait side: left, right, none
- banner placement: top, bottom, both, none

Saves structured fields on personas:

- `gaia_layout_enabled`
- `layout_side`
- `banner_position`

It also strips old legacy layout comment blocks from `custom_css`.

### `persona-polish.js`

Owns the finish controls:

- avatar/portrait focus
- top banner focus
- bottom banner focus
- signature alignment
- signature divider
- signature size
- duplicate persona button
- section labels inside the editor

Saves structured fields on personas:

- `avatar_position`
- `top_banner_position`
- `bottom_banner_position`
- `signature_align`
- `signature_divider`
- `signature_size`

### `image-upload.js`

Owns friendly image uploads for persona art.

- Uploads to Supabase Storage bucket: `gaya-images`
- Supports avatar, top banner, and bottom banner uploads
- Resizes PNG/JPG/WebP client-side before upload
- Keeps animated GIFs animated when under the GIF size limit
- Writes public URLs back into the corresponding persona fields

Requires Supabase Storage bucket and policies to allow the intended signed-in users to upload/read images.

## Rendering modules

### `custom-css-scope.js`

Replaces the simple base CSS scoper with a brace-aware custom CSS scoper.

Purpose: persona custom CSS should affect only that persona's posts/previews, not the whole app.

Supports:

- selector lists
- `&` for the persona post card itself
- nested rules inside `@media`, `@supports`, and `@container`
- keyframes without selector scoping

Ignores unknown at-rules rather than allowing global leakage.

### `image-render-fix.js`

Owns the final post and preview rendering.

It overrides:

- `renderPosts()`
- `updatePersonaPreview()`

Supports:

- safer CSS background URLs
- Gaia portrait layout rendering
- optional bottom banners
- top/bottom banner focus
- avatar/portrait focus
- signature classes
- persona accent/border CSS variables
- stripping layout metadata out of custom CSS before rendering

Before changing post or preview markup, check this file first. The base `app.js` renderers are no longer the final authority.

## Visual/theme files

### `styles.css`

Base layout and general app styling.

### `theme-natural-history.css`

Natural-history/GAYA theme foundation. Contains major page-level visual styling and shared layout variables.

### `theme-book-page.css`

Pale warm book-page background override. Used partly to blend fake-transparent image edges into the page color.

### `theme-landscape-strip.css`

Repeating landscape strip behind the masthead/banner gutter.

### `theme-thread-ornaments.css`

Thread-side ornaments such as shelves and decorative framing. Uses rail math to align ornaments with the banner/content rail.

### `persona-studio.css`

Persona editor UI, preset buttons, layout controls, help guide styling, persona polish controls, preview label, upload controls, and persona/post embellishments.

Also contains some post-level finish styling tied to persona CSS variables.

### `gaia-layout.css`

CSS for Gaia-style post layout: large portrait, banner behavior, post-head treatment, wrapping text around portraits, signature clearing.

### `draft-guard.css`

Styling for draft-guard features.

### `moths.css`

Styling for decorative moths.

## Decorative and enhancement scripts

### `blooms.js`

Owns the background bloom canvas.

### `gaya-enhancements.js`

General UI/decorative enhancements. Inspect before adding another broad enhancement file.

### `draft-guard.js`

Draft protection behavior. Check this before changing composer behavior.

### `moths.js`

Decorative moth placement/behavior.

## Supabase assumptions

The app assumes Supabase has at least these tables:

- `threads`
- `posts`
- `personas`

The persona feature set assumes the personas table includes the original style fields plus newer structured fields for layout, banners, focus, and signature options.

The image upload feature assumes a public/readable Supabase Storage bucket named `gaya-images`.

A separate schema checklist should eventually document exact columns, RLS policies, and storage policies.

## Change protocol

When adding or fixing a feature:

1. Identify the owner file first.
2. Prefer small feature modules or small CSS override files for isolated additions.
3. Avoid stacking more wrappers around the same global function unless there is a clear reason.
4. If touching `renderPersonaEditor`, `readPersonaForm`, `renderPosts`, or `updatePersonaPreview`, check all wrapper/override modules first.
5. Bump cache query strings in `index.html` for changed CSS/JS files.
6. Test by actual use in the browser after GitHub Pages deploys.

## Main risk zones

- Load order is architecture.
- Multiple modules wrap or replace the same global functions.
- GitHub Pages cache can make fixed files look stale.
- Supabase RLS/storage policies can look like frontend bugs.
- Custom CSS must remain scoped.
- Image files may have fake transparency or baked-in padding that needs CSS/page-color compensation.
- Mobile is not the primary target unless explicitly prioritized.

## Suggested next docs

- `docs/SUPABASE_SCHEMA.md`: exact tables, columns, RLS, storage bucket policies.
- `docs/SMOKE_TEST_NOTES.md`: short living record of what has been tested by actual use.
- `docs/ASSET_MAP.md`: what each asset is for, especially ornaments and repeating backgrounds.
