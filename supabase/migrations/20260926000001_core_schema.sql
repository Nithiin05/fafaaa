-- AAI JE Operations prep platform — core schema
-- Security model: students never read `questions` directly (the correct answers live there).
-- They receive questions, save answers and get graded only through SECURITY DEFINER
-- functions (added in the mock-engine step). Scores, correctness and progress rows are
-- written only by those functions, so students cannot edit them.

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type user_role         as enum ('student', 'admin');
create type exam_part         as enum ('A', 'B');
create type difficulty_level  as enum ('easy', 'moderate', 'exam', 'challenging');
create type question_source   as enum ('demo', 'original', 'previous_official', 'previous_memory_based');
create type test_kind         as enum ('full_mock', 'exam_simulation', 'previous_paper',
                                       'subject_practice', 'topic_practice', 'mistake_practice');
create type attempt_status    as enum ('in_progress', 'submitted', 'auto_submitted');
create type palette_status    as enum ('not_visited', 'not_answered', 'answered',
                                       'marked', 'answered_marked');
create type bookmark_category as enum ('important', 'revise_later', 'difficult', 'formula', 'aviation');

-- ---------- helpers ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- users ----------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        user_role not null default 'student',
  created_at  timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.daily_targets (user_id) values (new.id);
  return new;
end $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- syllabus ----------
create table subjects (
  id                 smallint generated always as identity primary key,
  slug               text unique not null,
  name               text not null,
  short_name         text not null,
  part               exam_part not null,
  questions_in_exam  smallint not null check (questions_in_exam > 0),
  sort_order         smallint not null default 0
);

create table topics (
  id           int generated always as identity primary key,
  subject_id   smallint not null references subjects(id) on delete cascade,
  slug         text not null,
  name         text not null,
  topic_group  text,             -- e.g. 'Aviation' / 'Static GK' in GA, 'Motivation' in Management
  sort_order   smallint not null default 0,
  unique (subject_id, slug),
  unique (id, subject_id)        -- lets questions enforce topic/subject consistency
);

-- ---------- questions ----------
create table questions (
  id              uuid primary key default gen_random_uuid(),
  subject_id      smallint not null,
  topic_id        int not null,
  subtopic        text,
  question_text   text not null check (length(trim(question_text)) > 0),
  option_a        text not null,
  option_b        text not null,
  option_c        text not null,
  option_d        text not null,
  correct_option  char(1) not null check (correct_option in ('A','B','C','D')),
  explanation     text not null check (length(trim(explanation)) > 0),
  concept         text,
  difficulty      difficulty_level not null default 'exam',
  source          question_source not null default 'demo',
  is_verified     boolean not null default false,
  year            smallint,
  exam            text,
  shift           text,
  tags            text[] not null default '{}',
  image_url       text,
  is_active       boolean not null default true,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search          tsvector generated always as (
                    to_tsvector('english', coalesce(question_text,'') || ' ' ||
                                           coalesce(concept,'') || ' ' ||
                                           coalesce(subtopic,''))) stored,
  foreign key (topic_id, subject_id) references topics(id, subject_id),
  -- previous-paper questions must say which exam/year they came from
  check (source not in ('previous_official','previous_memory_based')
         or (year is not null and exam is not null)),
  -- four distinct options
  check (option_a <> option_b and option_a <> option_c and option_a <> option_d
     and option_b <> option_c and option_b <> option_d and option_c <> option_d)
);

create index questions_topic_idx   on questions (topic_id) where is_active;
create index questions_subject_idx on questions (subject_id, difficulty) where is_active;
create index questions_search_idx  on questions using gin (search);
-- blocks exact duplicates (ignores case and extra whitespace)
create unique index questions_dedupe_idx
  on questions (md5(lower(regexp_replace(trim(question_text), '\s+', ' ', 'g'))));

create trigger questions_updated_at before update on questions
  for each row execute function set_updated_at();

-- ---------- tests (fixed mocks & previous papers) ----------
create table tests (
  id                uuid primary key default gen_random_uuid(),
  kind              test_kind not null check (kind in ('full_mock','exam_simulation','previous_paper')),
  title             text not null,
  series_label      text,          -- Foundation / Standard / Exam Level / ...
  series_number     smallint,
  paper_year        smallint,
  paper_shift       text,
  duration_minutes  smallint not null default 120 check (duration_minutes > 0),
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  check (kind <> 'previous_paper' or paper_year is not null)
);

create table test_questions (
  test_id      uuid not null references tests(id) on delete cascade,
  question_id  uuid not null references questions(id),
  position     smallint not null check (position between 1 and 120),
  primary key (test_id, position),
  unique (test_id, question_id)
);

-- Lists subjects where a test deviates from the exam blueprint (empty result = valid).
create or replace function mock_blueprint_errors(p_test_id uuid)
returns table (subject text, expected int, actual int)
language sql stable as $$
  select s.name, s.questions_in_exam::int, coalesce(c.n, 0)::int
  from subjects s
  left join (
    select q.subject_id, count(*) as n
    from test_questions tq join questions q on q.id = tq.question_id
    where tq.test_id = p_test_id
    group by q.subject_id
  ) c on c.subject_id = s.id
  where coalesce(c.n, 0) <> s.questions_in_exam
  order by s.sort_order;
$$;

-- ---------- attempts ----------
create table attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  test_id             uuid references tests(id),
  kind                test_kind not null,
  status              attempt_status not null default 'in_progress',
  config              jsonb not null default '{}',   -- subject/topic/difficulty/count for practice
  started_at          timestamptz not null default now(),
  deadline_at         timestamptz,                   -- null = untimed practice
  submitted_at        timestamptz,
  score               smallint,
  correct_count       smallint,
  incorrect_count     smallint,
  unattempted_count   smallint,
  time_taken_seconds  int
);
create index attempts_user_idx on attempts (user_id, started_at desc);
-- one live full mock / simulation per student at a time
create unique index attempts_one_live_mock
  on attempts (user_id) where status = 'in_progress' and kind in ('full_mock','exam_simulation');

create table attempt_questions (
  attempt_id          uuid not null references attempts(id) on delete cascade,
  position            smallint not null,
  question_id         uuid not null references questions(id),
  -- option_order[i] = original option (1=A..4=D) shown in display slot i
  option_order        smallint[] not null
                      check (array_length(option_order, 1) = 4
                         and option_order @> '{1,2,3,4}' and option_order <@ '{1,2,3,4}'),
  selected_slot       smallint check (selected_slot between 1 and 4),
  palette             palette_status not null default 'not_visited',
  time_spent_seconds  int not null default 0 check (time_spent_seconds >= 0),
  is_correct          boolean,          -- set only at submission
  primary key (attempt_id, position),
  unique (attempt_id, question_id)
);

-- ---------- progress, mistakes, bookmarks, targets ----------
create table user_question_progress (   -- one row per unique question seen → coverage %
  user_id            uuid not null references profiles(id) on delete cascade,
  question_id        uuid not null references questions(id) on delete cascade,
  attempts_count     int not null default 0,
  correct_count      int not null default 0,
  last_correct       boolean,
  last_attempted_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table mistakes (
  user_id        uuid not null references profiles(id) on delete cascade,
  question_id    uuid not null references questions(id) on delete cascade,
  wrong_count    int not null default 1,
  last_wrong_at  timestamptz not null default now(),
  learned        boolean not null default false,
  primary key (user_id, question_id)
);

create table bookmarks (
  user_id      uuid not null references profiles(id) on delete cascade,
  question_id  uuid not null references questions(id) on delete cascade,
  category     bookmark_category not null default 'important',
  created_at   timestamptz not null default now(),
  primary key (user_id, question_id, category)
);

create table daily_targets (
  user_id            uuid primary key references profiles(id) on delete cascade,
  questions_per_day  smallint not null default 100 check (questions_per_day > 0),
  mocks_per_day      smallint not null default 1   check (mocks_per_day >= 0),
  topics_per_day     smallint not null default 2   check (topics_per_day >= 0)
);

create table app_settings (   -- admin-configurable: weak-topic thresholds, exam date, GA split
  key    text primary key,
  value  jsonb not null
);

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ---------- row-level security ----------
alter table profiles               enable row level security;
alter table subjects               enable row level security;
alter table topics                 enable row level security;
alter table questions              enable row level security;
alter table tests                  enable row level security;
alter table test_questions         enable row level security;
alter table attempts               enable row level security;
alter table attempt_questions      enable row level security;
alter table user_question_progress enable row level security;
alter table mistakes               enable row level security;
alter table bookmarks              enable row level security;
alter table daily_targets          enable row level security;
alter table app_settings           enable row level security;

-- profiles: read/update own name; admins read all. Role cannot be self-edited.
create policy profiles_read   on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update on profiles for update using (id = auth.uid());
revoke update on profiles from authenticated, anon;
grant  update (full_name) on profiles to authenticated;

-- syllabus & settings: any signed-in user reads; admins write
create policy subjects_read  on subjects     for select to authenticated using (true);
create policy topics_read    on topics       for select to authenticated using (true);
create policy settings_read  on app_settings for select to authenticated using (true);
create policy subjects_admin on subjects     for all using (is_admin()) with check (is_admin());
create policy topics_admin   on topics       for all using (is_admin()) with check (is_admin());
create policy settings_admin on app_settings for all using (is_admin()) with check (is_admin());

-- questions & test composition: admins only (students go through RPCs)
create policy questions_admin      on questions      for all using (is_admin()) with check (is_admin());
create policy test_questions_admin on test_questions for all using (is_admin()) with check (is_admin());

-- tests: students see published test cards; admins manage
create policy tests_read  on tests for select to authenticated using (is_published or is_admin());
create policy tests_admin on tests for all using (is_admin()) with check (is_admin());

-- attempts & results: read own only; every write happens inside RPCs
create policy attempts_read on attempts for select using (user_id = auth.uid() or is_admin());
create policy aq_read on attempt_questions for select
  using (exists (select 1 from attempts a where a.id = attempt_id
                 and (a.user_id = auth.uid() or is_admin())));
create policy progress_read on user_question_progress for select
  using (user_id = auth.uid() or is_admin());

-- mistakes: read own; may mark learned or remove, nothing else
create policy mistakes_read   on mistakes for select using (user_id = auth.uid());
create policy mistakes_update on mistakes for update using (user_id = auth.uid());
create policy mistakes_delete on mistakes for delete using (user_id = auth.uid());
revoke insert, update on mistakes from authenticated, anon;
grant  update (learned) on mistakes to authenticated;

-- bookmarks & targets: full control of own rows
create policy bookmarks_own on bookmarks     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy targets_own   on daily_targets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
