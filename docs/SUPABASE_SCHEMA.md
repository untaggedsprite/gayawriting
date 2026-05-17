# Supabase Schema Notes

This document records the Supabase shape expected by the GAYA frontend. It is not a secret file. Do not add API keys, service role keys, database passwords, connection strings, JWT secrets, or SMTP/OAuth secrets here.

## Overview

GAYA uses Supabase for:

- magic-link authentication
- shared threads
- shared posts
- user-owned personas/post styles
- public image storage for avatars and banners

The app’s social model is a shared authenticated garden:

- authenticated users can read all threads, posts, and personas
- users create rows as themselves
- users can update/delete only rows they own
- uploaded images live in each user’s own storage folder

## Tables

### `public.threads`

| column | type | nullable | default | purpose |
|---|---:|---:|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `title` | `text` | no | none | Thread title. |
| `summary` | `text` | yes | none | Optional thread summary/blurb. |
| `created_by` | `uuid` | no | none | Owning user id. Must match `auth.uid()` on insert. |
| `created_at` | `timestamptz` | yes | `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | yes | `now()` | Activity timestamp. The frontend updates this when a post is added. |

Indexes:

- `threads_pkey` on `id`
- `threads_updated_idx` on `updated_at desc`

RLS policies:

- authenticated users can read all threads
- authenticated users can insert threads when `created_by = auth.uid()`
- users can update/delete only their own threads

Recommended/expected hardened update policy:

```sql
using (auth.uid() = created_by)
with check (auth.uid() = created_by)
```

### `public.posts`

| column | type | nullable | default | purpose |
|---|---:|---:|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `thread_id` | `uuid` | no | none | Parent thread. |
| `persona_id` | `uuid` | yes | none | Persona/style used by the post. May become null if persona is deleted. |
| `author_id` | `uuid` | no | none | Owning user id. Must match `auth.uid()` on insert. |
| `body` | `text` | no | none | Post body. |
| `created_at` | `timestamptz` | yes | `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | yes | `now()` | Post update timestamp. |

Foreign keys:

- `posts.thread_id -> threads.id` with `on delete cascade`
- `posts.persona_id -> personas.id` with `on delete set null`

This means deleting a thread deletes its posts. Deleting a persona preserves old posts but removes the live persona reference.

Indexes:

- `posts_pkey` on `id`
- `posts_thread_created_idx` on `(thread_id, created_at)`
- `posts_author_idx` on `author_id`
- `posts_persona_idx` on `persona_id`

RLS policies:

- authenticated users can read all posts
- authenticated users can insert posts when `author_id = auth.uid()`
- users can update/delete only their own posts

Recommended/expected hardened update policy:

```sql
using (auth.uid() = author_id)
with check (auth.uid() = author_id)
```

### `public.personas`

| column | type | nullable | default | purpose |
|---|---:|---:|---|---|
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `user_id` | `uuid` | no | none | Owning user id. Must match `auth.uid()` on insert. |
| `name` | `text` | no | none | Persona display name. |
| `avatar_url` | `text` | yes | none | Avatar/portrait image URL. |
| `bg_color` | `text` | yes | `#ffffff` | Post background color. |
| `text_color` | `text` | yes | `#222222` | Post text color. |
| `accent_color` | `text` | yes | `#888888` | Accent/trim color. |
| `border_color` | `text` | yes | `#e0e0e0` | Border/frame color. |
| `font_family` | `text` | yes | `serif` | Saved CSS font stack. |
| `banner_url` | `text` | yes | none | Top banner image URL. |
| `signature` | `text` | yes | none | Signature markdown-ish content. |
| `custom_css` | `text` | yes | none | Scoped custom CSS/preset flourishes. |
| `created_at` | `timestamptz` | yes | `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | yes | `now()` | Persona update timestamp. The frontend writes this during save. |
| `gaia_layout_enabled` | `boolean` | no | `false` | Enables old-forum/Gaia-style post layout. |
| `layout_side` | `text` | no | `left` | Portrait side: `left`, `right`, or `none`. |
| `banner_position` | `text` | no | `top` | Banner mode: `top`, `bottom`, `both`, or `none`. |
| `bottom_banner_url` | `text` | yes | none | Optional bottom banner image URL. |
| `avatar_position` | `text` | yes | `top` | Avatar/portrait focus: `top`, `center`, or `bottom`. |
| `top_banner_position` | `text` | yes | `center` | Top banner focus: `left`, `center`, or `right`. |
| `bottom_banner_position` | `text` | yes | `center` | Bottom banner focus: `left`, `center`, or `right`. |
| `signature_align` | `text` | yes | `left` | Signature alignment: `left`, `center`, or `right`. |
| `signature_divider` | `text` | yes | `none` | Signature divider: `none`, `line`, or `dotted`. |
| `signature_size` | `text` | yes | `normal` | Signature size: `small`, `normal`, or `large`. |

Indexes:

- `personas_pkey` on `id`
- `personas_user_idx` on `user_id`

RLS policies:

- authenticated users can read all personas
- authenticated users can insert personas when `user_id = auth.uid()`
- users can update/delete only their own personas

Recommended/expected hardened update policy:

```sql
using (auth.uid() = user_id)
with check (auth.uid() = user_id)
```

## Storage

### Bucket: `gaya-images`

| setting | value |
|---|---|
| bucket id/name | `gaya-images` |
| public | `true` |
| file size limit | `26214400` bytes / 25 MiB |
| allowed MIME types | `image/*` |

The frontend upload module also applies its own client-side limits and resizing before upload.

Current frontend assumptions:

- uploads go to `gaya-images`
- image paths are stored under the signed-in user id as first folder segment
- public URLs are written into persona fields
- PNG/JPG/WebP uploads are resized/compressed client-side
- GIF uploads remain animated if under the GIF limit

Storage object policies on `storage.objects`:

- authenticated users can upload into their own folder in `gaya-images`
- authenticated users can update/delete objects in their own folder in `gaya-images`
- authenticated users can read object metadata for their own folder in `gaya-images`

Folder ownership condition:

```sql
bucket_id = 'gaya-images'
and (storage.foldername(name))[1] = auth.uid()::text
```

Because the bucket is public, image files can be served by public URL. This lets other authenticated users see avatar/banner images referenced by readable persona rows without granting them broad object-metadata permissions.

## Current behavior notes

### Deleted personas

`posts.persona_id` uses `on delete set null`, so deleting a persona preserves posts. Old posts may render with fallback/unknown persona styling unless a future snapshot system is added.

Do not add snapshot fields yet unless preserving historical post styling becomes important.

Possible future snapshot fields:

- `persona_name_snapshot`
- `persona_style_snapshot`
- `persona_avatar_snapshot`

### Text enum fields

Several persona option fields are plain text rather than database enums/check constraints. The frontend currently normalizes these values.

Possible future hardening: add check constraints for fields such as:

- `layout_side`
- `banner_position`
- `avatar_position`
- `top_banner_position`
- `bottom_banner_position`
- `signature_align`
- `signature_divider`
- `signature_size`

This is not urgent while the app is small and frontend controls are the primary write path.

### `updated_at`

The schema has `updated_at` columns, but this document does not currently record database triggers for automatic timestamp updates. The frontend manually updates important timestamps in current flows.

Future hardening: add database triggers if server-side automatic `updated_at` maintenance becomes useful.

## Quick health checks

Useful SQL snippets for future audits.

Columns:

```sql
select table_schema, table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('threads', 'posts', 'personas')
order by table_name, ordinal_position;
```

Policies:

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('threads', 'posts', 'personas')
order by tablename, policyname;
```

Foreign keys:

```sql
select tc.table_name, kcu.column_name, ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name, rc.update_rule, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
  and rc.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in ('threads', 'posts', 'personas')
order by tc.table_name, kcu.column_name;
```

Indexes:

```sql
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('threads', 'posts', 'personas')
order by tablename, indexname;
```

Storage bucket:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;
```

Storage policies:

```sql
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;
```
