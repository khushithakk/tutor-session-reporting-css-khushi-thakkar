# Tutor Session Reporting

A sample-data prototype for a nonprofit literacy tutoring workflow. It replaces paper monthly attendance reports with saved sessions, totals, and a separate record of attained student goals.

## Features

- Add fictional students with trimmed names and duplicate checks; one shared roster updates both forms immediately. No preloaded roster on an empty database.
- Supabase-backed student records and tutoring sessions that survive refreshes.
- Month/year filters, total hours, session history, and per-student hours.
- The LVAEP FY 2026–2027 form’s 17 goals in a grouped checklist, including the original asterisks, plus an optional Other(s) entry. Multiple achievements save together; attained goals are marked and disabled.
- Required fields, positive numeric hours, save feedback, loading/error states, and responsive accessible forms.

## Stack and structure

React + JavaScript, Vite, plain CSS, and Supabase/PostgreSQL. No UI framework or extra backend.

- `src/App.jsx`: data loading, session form, monthly report.
- `src/AddStudent.jsx`: student entry and save feedback.
- `src/Achievements.jsx`: grouped achievement checklist and selected-student history.
- `src/reporting.js`: shared date/session validation, duplicate-text normalization, and the exact goal catalog.
- `src/supabaseClient.js`: shared client using Vite environment variables.
- `src/App.css` / `src/index.css`: page and shared styles.
- `supabase/migrations/001_students_and_achievements.sql`: initial relationship migration.
- `supabase/migrations/002_student_entry_and_achievement_duplicates.sql`: student insert access and duplicate indexes.

## Local setup

1. Use a current Node.js version supported by Vite 8 (Node 22.12+ recommended).
2. Run `npm ci`.
3. Copy `.env.example` to `.env` and supply your own Supabase project values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Complete the database migration below before using this version.
5. Run `npm run dev` and open the URL printed by Vite. Restart Vite after changing environment variables.

`.env` and its variants are ignored; `.env.example` contains names only. Never put database passwords or service-role/secret keys in frontend variables. Vite exposes `VITE_` values in browser builds; use only the publishable key here.

## Database migration — manual action required

The remote database has **not** been migrated by this code change. Export/back up existing records first. In Supabase SQL Editor:

- If migration `001` has already been applied (the students/achievements tables exist), run **only `002_student_entry_and_achievement_duplicates.sql`** once.
- If you still have the original sessions-only schema, run `001_students_and_achievements.sql`, then `002_student_entry_and_achievement_duplicates.sql`, once each.
- Reload the app after SQL succeeds. Do not rerun `001` on the migrated database.

Migration `002` adds anonymous INSERT permission for student names and unique indexes for normalized student names and each student/category/goal. Dates are intentionally excluded from achievement uniqueness. Existing duplicates cause a safe transaction rollback; inspection queries are included at the bottom of the file. Review conflicting records before retrying; nothing is silently removed or merged.

The migration assumes an existing `public.sessions` table with `id`, `student` (text), `date`, and `hours`, and a working ID default. It creates new `students` and `achievements` tables; if those already exist, stop and reconcile the schema rather than rerunning blindly. The transaction rolls back on failure.

It preserves session IDs, dates, and hours; creates students from distinct trimmed legacy names; and backfills a required `student_id` relationship. Blank legacy names get `Sample student (legacy)`. Confirm all existing names/data are fictional before migration. No rows or legacy name column are deleted. There are no explicit student seeds anymore: an empty sessions table produces an empty roster. Existing records, including previously seeded students, are preserved as requested; an existing populated database is not reset. Use Add New Student to build a new roster. The old `student` column becomes optional and is no longer read or written by the app. Existing names that differ only by surrounding whitespace are treated as the same student.

New session writes require positive hours; old zero-hour/invalid test rows are retained using a `NOT VALID` constraint. Invalid report records are excluded with a visible message. Zero-hour legacy records remain visible. If `created_at` did not exist, old rows receive the migration timestamp, not an invented historical creation time.

After running, use the verification queries at the bottom of the SQL file, compare session counts with your backup, and test saving/reloading both record types. Keep the legacy `student` column until verification is complete. An older frontend that inserts only a student name will no longer work after migration because `student_id` is required; coordinate the migration and frontend update.

| Table | Columns |
| --- | --- |
| `students` | UUID `id`, unique `name`, `created_at` |
| `sessions` | Existing `id`, `student_id` → students, `date`, `hours`, `created_at`, retained legacy `student` |
| `achievements` | UUID `id`, `student_id` → students, `category`, `goal`, `achieved_at`, `created_at` |

## Reporting and tradeoffs

The app fetches all three tables on load. Date strings use `YYYY-MM-DD`; month/year comparisons avoid local timezone shifts. “All Months” and “All Years” leave their respective filters unrestricted. Totals and per-student summaries are calculated from the same filtered list. Years come from valid saved sessions. Displayed totals are rounded to two decimal places.

Achievement history follows the student selected in its form and includes all dates; monthly attendance filters do not hide achievements. Goal wording and groupings match the supplied **LVAEP Student Monthly Attendance & Achievement Form, FY 2026–2027**. “Achieve work-based project learner goal” belongs to Educational. Only Other(s) permits free text and is stored as category `Other` for schema compatibility. Existing free-text achievements remain visible in history.

Each checked goal becomes one row with its category, student ID, and chosen date. A single bulk insert saves the whole submission atomically. Previously attained goals are checked/disabled; student switching clears unsaved goal selections. Success clears new selections and Other text but keeps the student/date. Database uniqueness protects against concurrent/retried duplicate inserts. A duplicate rejects the whole batch; refresh before retrying. Other goals are compared within the Other category. Case and whitespace differences do not bypass duplicate checks.

This is intentionally a small prototype: no pagination, realtime sync, student edit/delete UI, or authentication. Supabase's configured response limit applies, so larger datasets need server-side reporting or pagination. Names are unique for this fictional roster; production should support different students sharing a name. Quarter-hour session increments preserve the original form behavior. A lost network response can make a successful save uncertain; error feedback asks users to refresh before retrying to avoid duplicates.

## Security

**Use fake/sample data only.** Anonymous visitors can read the roster and all records and add students and insert sessions/achievements. Anyone with the public project URL/key can exercise those permissions outside this UI.

The migration enables Row Level Security (RLS), replaces existing session policies applying to `anon`/`PUBLIC`, and limits anonymous table grants to SELECT plus the specific INSERT columns needed. Migration `002` additionally grants INSERT on only the student `name` column, with a nonblank name of up to 120 characters. No anonymous update/delete permissions are added. Review existing custom column grants, other role policies, and database functions separately if your project has additional configuration; this migration targets the existing simple prototype.

Production requires authentication and role-based RLS to restrict tutors to authorized students, plus privacy controls, rate limits, and stronger auditing. Do not use this anonymous prototype for real student information.

## Checks and Vercel setup

```sh
npm run build
npm run lint
```

For Vercel, select the **Vite** framework preset, use `npm run build`, and set the output directory to `dist`. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project environment settings before building. Redeploy after changing them because Vite embeds them at build time. This single-page app has no custom routes requiring rewrite configuration. No deployment, commit, or push is performed by this change.

## Manual browser checklist

- Run the applicable migrations, verify old row counts and readable student names, then open the app.
- On a fresh empty database, confirm “No students added yet” appears and session/achievement forms are disabled while Add New Student remains usable.
- Add a fictional student with surrounding spaces; confirm the trimmed name appears in both dropdowns immediately and persists after refresh.
- Try a blank name and the same name with different capitalization/extra spaces; confirm helpful validation/duplicate feedback.
- Save a session with a fictional student, date, and 1.25 hours. Confirm success and persistence after refresh.
- Check blank fields and zero/negative hours cannot be submitted.
- Try month-only, year-only, combined, and All filters; verify session count, totals, and per-student hours agree.
- Select a period with no sessions; confirm zero totals and a helpful message.
- Select a student/date, check goals in several categories, add Other text, and save. Confirm one history record per goal with the right category/date.
- Confirm the student stays selected, Other clears, and saved goals become checked/disabled. Refresh and verify they remain attained.
- Switch students and confirm their histories/checklists are independent.
- Submit no new selections or only whitespace in Other; confirm an error. Test Other-only submission and a repeated Other goal.
- In two tabs, try saving the same goal for the same student. Confirm the duplicate is rejected without partially saving the second batch.
- Test a failed request (e.g. offline browser tools): confirm feedback and retained entries, then reconnect and refresh before retrying.
- Navigate forms by keyboard and check a narrow mobile viewport for readable controls and no horizontal overflow.

## Future improvements

Authentication and role-based access, student edit/delete workflows, exports, pagination/server-side reports, stronger auditing, and duplicate-safe save requests.

## Multiple tutors (migration 003)

After migrations 001 and 002, run `supabase/migrations/003_tutor_attribution.sql` once in Supabase SQL Editor. This migration has not been run remotely by the app update. Do not rerun earlier migrations. Existing student, session, and achievement records are preserved.

The migration creates `tutors` (`id`, `name`, nullable unique `auth_user_id`, `created_at`) and adds nullable `tutor_id` foreign keys to sessions and achievements. Historical rows retain NULL attribution and display “Not assigned.” No tutor is guessed or backfilled. The achievement uniqueness rule remains per student/category/goal, across all tutors.

Add fictional tutors through Supabase Table Editor (supply `name`, leave the generated ID/default timestamp and nullable `auth_user_id` alone), then refresh. Alternatively, the migration file includes a commented example INSERT to run separately. No tutor-management UI or anonymous tutor-insert permission is added.

Choose an active tutor before recording sessions or achievements. Selection applies to new records only, resets on page refresh, and is disabled while a session/achievement save is in progress. Switching tutors keeps student and goal selections; the form explicitly names the tutor who will receive credit. Students remain shared. Monthly reports and student achievement histories continue to show all tutors, including unassigned historical records; selecting a tutor does not change totals. History now displays tutor attribution.

Anonymous clients may read only tutor IDs/names and must supply a tutor ID for new session/achievement inserts. Foreign keys require that tutor to exist. This is attribution, **not authentication**: visitors can select any tutor and read existing prototype records. Deploy the matching frontend after migration because the old frontend does not send tutor IDs. `.env` and publishable-key usage are unchanged.

For future Supabase Auth, populate each tutor’s `auth_user_id` with the matching `auth.users.id`, derive the active tutor from the signed-in user, and replace anonymous policies with authenticated, role-based RLS. The session/achievement foreign keys can stay as they are. Auth is not implemented by this migration.

Tutor testing checklist:
- Add two fictional tutors and select each in turn; save a session and achievement for each, then refresh to verify attribution.
- Confirm a tutor must be selected for new activity, while adding students and viewing reports still work without one.
- Confirm switching tutors leaves monthly totals unchanged and old records remain visible as “Not assigned.”
- Confirm a goal recorded by one tutor remains attained for that student when another tutor is selected.
- Confirm tutor selection is disabled during saves and errors preserve form entries.
