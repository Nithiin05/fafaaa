# Lu Fafaaa — AAI JE Operations 2026 CBT Preparation

**Lu Fafaaa** is a full preparation platform for the **AAI Junior Executive (Operations) CBT on 21 October 2026**: full-length mocks in the exact exam pattern, previous papers, subject and topic practice, syllabus coverage, a mistake book, revision sheets, performance analytics and an admin panel.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS) · Recharts · Lucide.

---

## Exam pattern (built in)

| Part | Subject | Questions |
|---|---|---|
| A | English Language | 15 |
| A | Reasoning Aptitude | 15 |
| A | Quantitative Aptitude | 15 |
| A | General Awareness & Aviation | 15 |
| B | Physics | 24 |
| B | Mathematics | 24 |
| B | General Principles of Business Management | 12 |
| | **Total** | **120 questions · 120 marks · 120 minutes · no negative marking** |

Every full mock is exactly this split. Inside GA, mocks draw **11 aviation + 4 static GK**. That split matches the 2018 and 2021 Operations papers (see `docs/reference-analysis.md`), and admins can change it.

## Features

- **CBT test engine:** a real countdown timer, a question palette with 5 statuses (not visited, not answered, answered, marked, answered & marked), section tabs, Mark for review, Clear response, Save & next, and a submit summary. The test submits automatically at 00:00. On phones the palette opens as a drawer.
- **Answer safety:** every change is saved to the server. If the connection drops, answers are kept in the browser and re-synced. A page refresh or a closed tab resumes the same test with the timer still running on the server.
- **Randomisation:** question order and option order are shuffled for every attempt. The server records the mapping, so grading is always correct. Previous papers keep their official order.
- **Mocks:** 10 mocks in the series (Foundation → Final Simulation). Each is assembled fresh from the verified bank, weighted by its difficulty profile and preferring questions you haven't seen. There is also a separate **Real Exam Simulation** mode. Admins can also freeze a fixed 120-question set.
- **Results:** score, accuracy, correct / incorrect / unattempted, time taken, subject breakdown, subject accuracy chart, weakest and strongest topics, slow questions, and a full answer review with explanations. Buttons for **Retry incorrect** and **Practice weak topics**.
- **Practice:** Subject → Topic → Difficulty → Count (5 / 10 / 20 / 30 / 50), or jump straight to any topic.
- **Syllabus coverage:** all 198 topics with available / attempted / correct / accuracy / completion and a status (Not started, In progress, Completed, Needs revision). Click a topic to practise it.
- **Mistake book** (added automatically, filter by subject, mark as learned, remove, practise), **bookmarks** in 5 categories, and a **Revision centre**: revise today, weak topics, frequently incorrect, last 7 days, formula sheets and aviation fact sheets.
- **Performance:** score trend, accuracy trend, questions per day, subject accuracy, time per question, and a topic heatmap. Every chart has a table view.
- **Dashboard:** exam countdown (switches to "Exam completed" after the date), overall coverage, stats, subject progress, today's target, study streak, weak topics, recent mocks, and a resume banner for an unfinished test.
- **Search** across questions (answers are never exposed), topics, papers, mocks and revision notes.
- **Admin:** question CRUD with filters and pagination, **CSV / Excel bulk import** with per-row error reports, subjects & topics, mocks & previous papers (create, publish, fix 120 questions, blueprint check), user and question statistics, and settings (weak-topic thresholds, GA split, verified-only mocks, exam date).

### How the numbers are calculated

- **Coverage** = unique questions attempted ÷ questions available. Repeat attempts don't add coverage.
- **Accuracy** = correct ÷ attempted, using your latest attempt at each question.
- **Topic status:** *Needs revision* when accuracy is below 60% after at least 10 questions. *Strong* when accuracy is above 80%. Both thresholds are admin settings.
- Nothing on the dashboard is hard-coded. Everything comes from your attempts.

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run these files **in this order**:
   1. `supabase/migrations/20260926000001_core_schema.sql`
   2. `supabase/migrations/20260926000002_engine.sql`
   3. `supabase/seed/0001_syllabus.sql` (subjects, 198 topics, settings)
   4. `supabase/seed/0002_demo_content.sql` (226 demo questions, revision sheets, the 10-mock series)

   With the Supabase CLI you can instead run `supabase db push` for the migrations, then run the two seed files.
3. **Authentication → URL Configuration:** set **Site URL** to your app URL. Add `https://YOUR-APP/auth/callback` (and `http://localhost:3000/auth/callback`) to **Redirect URLs**.
4. Optional: for faster testing, turn off **Confirm email** under Authentication → Providers → Email.

### 2. App

```bash
cp .env.example .env.local   # fill in the project URL and anon key (Project Settings → API)
npm install
npm run dev                  # http://localhost:3000
```

### 3. Make yourself an admin

Sign up in the app, then run this in the SQL Editor:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Reload the app and **Admin** appears in the sidebar.

### 4. Deploy (Vercel)

Import the repository in Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables. Then add the deployed URL to Supabase's Site URL and Redirect URLs.

---

## Adding questions

- **One at a time:** Admin → Questions → *Add question*.
- **In bulk:** Admin → Bulk import. Upload a `.csv` or `.xlsx` file with these columns:
  `question, optionA, optionB, optionC, optionD, correctAnswer, explanation, subject, topic, difficulty, source, year`
  Optional columns: `exam, shift, subtopic, concept, tags, image, verified`. A template is at `public/question-import-template.csv`. Bad rows are listed with the reason and skipped. Duplicates are rejected automatically.
- **A previous paper:** Admin → Mocks & papers → create a *Previous paper* with year and shift. Then use Bulk import with *"Also add these questions to…"* set to that paper, and `source` set to `official` or `memory`. Questions keep the file order.
- **Editing the demo bank:** edit `content/demo_questions.py`, then run `npm run seed:build`. The script validates every question (topic exists, four distinct options, answer A–D, no duplicates, enough questions for a full mock) and regenerates the seed file.

### About the content

- The **226 demo questions are original**, written for this platform to match the syllabus and the difficulty seen in past papers. Every one is labelled *Demo* in the app. Numeric answers were recomputed programmatically. Still, have a subject expert review them before relying on them.
- The bank currently holds about one full mock's worth of questions per subject, so the 10 mocks repeat questions until more are added. **Admin → Overview → Mock readiness** shows how many distinct mocks the bank can fill.
- **No official previous papers are included.** The Previous Papers section stays empty until real papers are uploaded, and practice questions are never presented as official questions. The database enforces this: previous-paper questions must carry a year and exam name.
- `docs/reference-analysis.md` records the exam patterns observed in a published solved-papers book. It was used only to calibrate topics, weightage and difficulty. No questions were copied from it.

---

## Security model

- Students **cannot read the `questions` table**. They receive questions only through `get_attempt`, which returns correct answers and explanations **only after submission**.
- Scores, correctness, progress and mistakes are written only by `SECURITY DEFINER` functions. Students have no insert or update rights on those tables. Timing is enforced on the server: saves after the deadline plus a 60-second grace period are refused, and the attempt is auto-submitted.
- Row-level security is on for every table. Students can only see their own attempts, progress, mistakes, bookmarks and targets. Admin operations check `is_admin()` on the server.
- Students can edit only their own name (not their role) and their daily targets.

## Project structure

```
src/app/(auth)/        login, signup, forgot password
src/app/(app)/         dashboard, mocks, previous-papers, practice, topics, syllabus, mistakes,
                       bookmarks, revision, performance, search, profile, results/[id], admin/*
src/app/test/[id]/     the CBT test screen (full-screen, outside the app shell)
src/components/        UI kit, app shell, countdown, test runner, charts, question review, admin forms
src/lib/               Supabase clients, RPC helpers, types, exam constants, formatting
supabase/migrations/   schema + RLS, then the test engine / grading / reporting functions
supabase/seed/         syllabus + settings, generated demo content
supabase/tests/        SQL test suites and runner
content/               demo question source, revision notes, seed generator
docs/                  reference analysis of past-paper patterns
```

## Testing

- `npm run typecheck`, `npm run lint`, `npm run build`
- `npm run db:test` rebuilds a scratch Postgres database from the migrations and seeds and runs two suites: schema/RLS checks, and a **68-check engine suite**. The engine suite covers the mock blueprint, the GA split, answer hiding, grading with shuffled options, resume, deadline auto-submit, practice modes, bookmarks, cross-user isolation, blocked score tampering, admin import validation and blueprint checks. The runner expects a local Postgres at `$PGSOCK`/`$PGPORT` (defaults `/var/tmp/aaipg`, `5499`).

The app was also tested end to end in a browser against real Supabase Auth and PostgREST: sign-up, a full mock with a mid-test reload, submission and review, practice, every student page, admin import, phone layouts and simulation auto-submit.

---

*Lu Fafaaa is an independent preparation platform, not affiliated with the Airports Authority of India.*
