# Chronicle Supabase setup

Run this once in the Supabase SQL Editor, then refresh GAYA.

```sql
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  date_label text,
  sort_key numeric,
  era text,
  arc text,
  location text,
  characters text,
  summary text,
  notes text,
  canon_status text not null default 'canon',
  related_thread_id uuid references public.threads(id) on delete set null,
  created_by uuid not null,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timeline_events_status_check check (canon_status in ('canon','draft','revised','retired','contradiction'))
);

create index if not exists timeline_events_sort_idx on public.timeline_events (sort_key asc nulls last, event_date asc nulls last, created_at asc);
create index if not exists timeline_events_date_idx on public.timeline_events (event_date);
create index if not exists timeline_events_status_idx on public.timeline_events (canon_status);
create index if not exists timeline_events_thread_idx on public.timeline_events (related_thread_id);

alter table public.timeline_events enable row level security;

drop policy if exists "timeline events are readable by authenticated users" on public.timeline_events;
create policy "timeline events are readable by authenticated users"
  on public.timeline_events for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can create timeline events" on public.timeline_events;
create policy "authenticated users can create timeline events"
  on public.timeline_events for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "authenticated users can update timeline events" on public.timeline_events;
create policy "authenticated users can update timeline events"
  on public.timeline_events for update
  to authenticated
  using (true)
  with check (updated_by is null or updated_by = auth.uid());

drop policy if exists "authenticated users can delete timeline events" on public.timeline_events;
create policy "authenticated users can delete timeline events"
  on public.timeline_events for delete
  to authenticated
  using (true);
```
