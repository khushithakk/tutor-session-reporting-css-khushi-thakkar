-- Run after 001. Do NOT rerun 001 if students/achievements already exist.
-- No records are seeded, deleted, merged, or renamed by this migration.
begin;

-- Fail safely if old data has duplicates: review these before retrying.
-- Case and repeated/leading/trailing whitespace are ignored.
create unique index students_normalized_name_key on public.students
  (lower(btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))));

-- A goal is attained once per student/category, regardless of attained date.
create unique index achievements_student_category_goal_key on public.achievements
  (student_id, category, lower(btrim(regexp_replace(goal, '[[:space:]]+', ' ', 'g'))));

-- Only the name can be supplied by an anonymous student insert.
-- All existing session and achievement policies/permissions stay unchanged.
grant insert (name) on public.students to anon;
create policy prototype_students_insert on public.students
  for insert to anon
  with check (length(btrim(name)) between 1 and 120);

commit;

-- If index creation reports duplicates, the transaction rolls back.
-- Inspect (do not automatically delete) existing records with these queries:
-- select lower(btrim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))) as name_key,
--   count(*), array_agg(id) as student_ids from public.students
-- group by 1 having count(*) > 1;
-- select student_id, category,
--   lower(btrim(regexp_replace(goal, '[[:space:]]+', ' ', 'g'))) as goal_key,
--   count(*), array_agg(id) as achievement_ids from public.achievements
-- group by 1, 2, 3 having count(*) > 1;
