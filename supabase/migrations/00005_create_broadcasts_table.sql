
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  type text not null default 'info' check (type in ('info','warning','success','urgent')),
  sent_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.broadcasts enable row level security;

-- Admins: full access
create policy "Admins can do everything on broadcasts"
  on public.broadcasts for all
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Users: read only
create policy "Users can read broadcasts"
  on public.broadcasts for select
  to authenticated
  using (true);

-- Anon: no access
-- (no policy = deny)

-- Enable Realtime
alter publication supabase_realtime add table public.broadcasts;
