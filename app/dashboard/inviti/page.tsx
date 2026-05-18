create table public.join_codes (
  id         uuid primary key default uuid_generate_v4(),
  code       text not null unique,
  club_id    uuid not null references public.clubs(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  uses       int  not null default 0,
  max_uses   int  not null default 100,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.join_codes enable row level security;

create policy "instructors manage own codes"
  on public.join_codes for all
  to authenticated
  using (
    club_id in (
      select club_id from public.instructor_clubs
      where profile_id = auth.uid()
    )
  )
  with check (
    club_id in (
      select club_id from public.instructor_clubs
      where profile_id = auth.uid()
    )
  );

create policy "anyone can read active codes"
  on public.join_codes for select
  using (active = true);