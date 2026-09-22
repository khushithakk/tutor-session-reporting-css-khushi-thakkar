-- Run once after 001 and 002. No existing records are deleted or reassigned.
begin;

create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  -- Reserved for future Auth integration; no login is implemented now.
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- NULL preserves historical records whose tutor is unknown.
alter table public.sessions add column tutor_id uuid references public.tutors(id);
alter table public.achievements add column tutor_id uuid references public.tutors(id);
create index sessions_tutor_id_idx on public.sessions(tutor_id);
create index achievements_tutor_id_idx on public.achievements(tutor_id);

alter table public.tutors enable row level security;
revoke all privileges on public.tutors from anon, public;
-- Auth identifiers do not need to be visible to anonymous clients.
grant select (id, name) on public.tutors to anon;
create policy prototype_tutors_read on public.tutors
  for select to anon using (true);

-- Extend existing column-level insert permissions without granting update/delete.
grant insert (tutor_id) on public.sessions, public.achievements to anon;
-- Restrictive policies add to the existing insert policies; they do not replace
-- student/goal/hour checks. Historical NULL rows remain readable and unchanged.
create policy prototype_sessions_require_tutor on public.sessions
  as restrictive for insert to anon with check (tutor_id is not null);
create policy prototype_achievements_require_tutor on public.achievements
  as restrictive for insert to anon with check (tutor_id is not null);

commit;

-- Add fictional tutors manually via Table Editor, or run a separate insert:
-- insert into public.tutors (name) values ('Sample Tutor A'), ('Sample Tutor B');
-- Leave auth_user_id empty. Refresh the app after adding tutors.
-- Do not guess ownership of historical rows. Their NULL tutor_id is intentional.
