-- Run once in Supabase SQL Editor on the existing SAMPLE-DATA prototype.
-- Assumes public.sessions has id, student (text), date and hours columns.
-- Back up/export sessions first. This transaction rolls back if any step fails.
-- Do not run on a database containing real student information.
begin;

create table public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

-- Preserve existing names; blank legacy names receive a fictional placeholder.
insert into public.students (name)
select distinct coalesce(nullif(btrim(student), ''), 'Sample student (legacy)')
from public.sessions;

-- No seeded roster: an empty sessions table produces an empty students table.

alter table public.sessions
  add column student_id uuid references public.students(id),
  add column if not exists created_at timestamptz not null default now();

update public.sessions as session
set student_id = student.id
from public.students as student
where student.name = coalesce(nullif(btrim(session.student), ''), 'Sample student (legacy)');

alter table public.sessions alter column student_id set not null;
-- Keep the legacy column for rollback/reference, but new inserts use student_id only.
alter table public.sessions alter column student drop not null;

create index sessions_student_id_idx on public.sessions(student_id);

-- NOT VALID preserves old test records (including zero hours), while enforcing
-- positive hours and a date on new/updated records. Existing data is not rewritten.
alter table public.sessions add constraint sessions_positive_hours
  check (hours is not null and hours::numeric > 0
    and hours::text not in ('NaN', 'Infinity', '-Infinity')) not valid;
alter table public.sessions add constraint sessions_date_required
  check (date is not null) not valid;

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  category text not null check (category in (
    'Economic', 'Educational', 'Family', 'Societal/Community', 'Other'
  )),
  goal text not null check (length(btrim(goal)) between 1 and 1000),
  achieved_at date not null,
  created_at timestamptz not null default now()
);
create index achievements_student_id_idx on public.achievements(student_id);

alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.achievements enable row level security;

-- Replace existing anonymous/public session policies rather than leaving an
-- older permissive policy in effect. Policies scoped only to other roles remain.
do $$
declare existing_policy record;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'sessions'
      and roles && array['anon', 'public']::name[]
  loop
    execute format('drop policy %I on public.sessions', existing_policy.policyname);
  end loop;
end $$;

revoke all privileges on public.students, public.sessions, public.achievements from anon, public;
grant usage on schema public to anon;
grant select on public.students, public.sessions, public.achievements to anon;
grant insert (student_id, date, hours) on public.sessions to anon;
grant insert (student_id, category, goal, achieved_at) on public.achievements to anon;

-- Older sessions tables may use a serial/identity ID instead of UUID.
do $$
declare session_sequence text;
begin
  session_sequence := pg_get_serial_sequence('public.sessions', 'id');
  if session_sequence is not null then
    execute format('grant usage on sequence %s to anon', session_sequence);
  end if;
end $$;

create policy prototype_students_read on public.students for select to anon using (true);
create policy prototype_sessions_read on public.sessions for select to anon using (true);
create policy prototype_sessions_insert on public.sessions for insert to anon
  with check (student_id is not null and date is not null and hours::numeric > 0);
create policy prototype_achievements_read on public.achievements for select to anon using (true);
create policy prototype_achievements_insert on public.achievements for insert to anon
  with check (student_id is not null);

commit;

-- Verify after success:
-- select count(*) from public.sessions where student_id is null; -- expect 0
-- select s.id, st.name, s.date, s.hours from public.sessions s
-- join public.students st on st.id = s.student_id;
-- Do not drop sessions.student until the migrated app is verified.
