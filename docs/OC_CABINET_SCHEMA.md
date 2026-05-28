# OC Cabinet Schema Notes

This is the database foundation for the OC Cabinet. It gives the frontend a real `oc_profiles` table without merging OC profiles into post styles/personas.

The rule of thumb:

- `personas` = post styling / how a post looks
- `oc_profiles` = character dossier / who the character is
- an OC profile may optionally point at a persona with `post_style_id`

## Install SQL

Run this in the Supabase SQL editor.

```sql
create table if not exists public.oc_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  aliases text,
  pronouns text,
  role text,
  species text,
  status text,

  blurb text,
  notes text,
  image_url text,
  tags text,
  color_note text,

  post_style_id uuid references public.personas(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oc_profiles_name_idx
  on public.oc_profiles (lower(name));

create index if not exists oc_profiles_user_idx
  on public.oc_profiles (user_id);

create index if not exists oc_profiles_post_style_idx
  on public.oc_profiles (post_style_id);

alter table public.oc_profiles enable row level security;

create policy "authenticated users can read oc profiles"
  on public.oc_profiles
  for select
  to authenticated
  using (true);

create policy "users can insert their own oc profiles"
  on public.oc_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own oc profiles"
  on public.oc_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own oc profiles"
  on public.oc_profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);
```

## Optional updated_at trigger

The frontend writes `updated_at` when saving. This trigger is optional hardening, not required for the first cabinet pass.

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_oc_profiles_updated_at on public.oc_profiles;

create trigger set_oc_profiles_updated_at
before update on public.oc_profiles
for each row
execute function public.set_updated_at();
```

## Frontend assumptions

The current cabinet code expects these fields:

| column | purpose |
|---|---|
| `name` | required display name |
| `aliases` | nicknames, titles, other names |
| `pronouns` | character pronouns |
| `role` | story function or archetype |
| `species` | species/type |
| `status` | alive/dead/complicated/etc. |
| `blurb` | short card text |
| `notes` | longer canon/reference notes |
| `image_url` | portrait/reference URL |
| `tags` | comma-style loose labels for later filtering |
| `color_note` | palette/mood note |
| `post_style_id` | optional link to a `personas.id` row |

## Why this is separate from personas

The Personas tab is already doing a lot of work: avatars, banners, signatures, colors, layout, font choices, and post rendering. The OC Cabinet should not duplicate that. It should hold character knowledge and only link to a post style when a character actually needs one.

That keeps future features clean:

- relationship maps can attach to OC profiles
- reference shelves can attach to OC profiles
- Chronicle events can later link to OC profiles
- thread appearances can still use personas/post styles without making every style a full dossier
