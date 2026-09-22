-- Read-only: run in Supabase SQL Editor. No schema/data changes.

-- Confirm the live column types and nullability.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('students', 'sessions')
order by table_name, ordinal_position;

-- Expect a foreign key from sessions.student_id to students.id.
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.sessions'::regclass and contype = 'f';

-- Expect zero rows. A NULL legacy student text value is not a problem;
-- only a missing relationship needs investigation/backfilling.
select s.id, s.student_id, s.student as legacy_student_name
from public.sessions s
left join public.students st on st.id = s.student_id
where st.id is null;

-- Display names using the relationship, including new records.
select s.id, s.student_id, st.name as student_name, s.date, s.hours
from public.sessions s
left join public.students st on st.id = s.student_id
order by s.date desc;
