-- AAI JE Operations prep platform — test engine, grading, progress and reporting RPCs.
-- Every student-facing function is SECURITY DEFINER and scoped to auth.uid().
-- Correct answers are only returned for attempts that have been submitted.

-- ---------- schema additions ----------
alter table tests    add column description text,
                     add column config jsonb not null default '{}';  -- e.g. {"weights":{"easy":2,"moderate":1}}
alter table attempts add column title text;

drop index attempts_one_live_mock;
create unique index attempts_one_live_test
  on attempts (user_id)
  where status = 'in_progress' and kind in ('full_mock','exam_simulation','previous_paper');

create table revision_notes (
  id          int generated always as identity primary key,
  subject_id  smallint references subjects(id) on delete cascade,
  category    text not null check (category in ('formula','aviation_fact','concept')),
  title       text not null,
  body        text not null,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);
alter table revision_notes enable row level security;
create policy notes_read  on revision_notes for select to authenticated using (true);
create policy notes_admin on revision_notes for all using (is_admin()) with check (is_admin());

-- ---------- internal helpers (not callable by clients) ----------
create or replace function _uid() returns uuid
language plpgsql stable as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  return v;
end $$;

create or replace function _setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from app_settings where key = p_key;
$$;

create or replace function _today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

create or replace function _random_perm() returns smallint[]
language sql volatile as $$
  select array_agg(x::smallint order by random()) from generate_series(1, 4) x;
$$;

create or replace function _correct_index(p char) returns smallint
language sql immutable as $$ select (ascii(p) - 64)::smallint $$;

create or replace function _pct(n numeric, d numeric) returns numeric
language sql immutable as $$ select case when coalesce(d,0) = 0 then null else round(100.0 * n / d, 1) end $$;

-- Weighted random sample without replacement (exponential-key method).
-- Questions the student has already answered are down-weighted so new ones come first.
create or replace function _pick_questions(
  p_uid uuid, p_subject smallint, p_group text, p_topics int[], p_difficulty difficulty_level,
  p_n int, p_weights jsonb, p_verified_only boolean, p_exclude uuid[], p_previous_only boolean default false
) returns setof uuid
language sql volatile security definer set search_path = public as $$
  select q.id
  from questions q
  join topics t on t.id = q.topic_id
  left join user_question_progress p on p.user_id = p_uid and p.question_id = q.id
  where q.is_active
    and (p_subject    is null or q.subject_id = p_subject)
    and (p_group      is null or t.topic_group = p_group)
    and (p_topics     is null or q.topic_id = any(p_topics))
    and (p_difficulty is null or q.difficulty = p_difficulty)
    and (not p_verified_only or q.is_verified)
    and (not p_previous_only or q.source in ('previous_official','previous_memory_based'))
    and not (q.id = any(coalesce(p_exclude, '{}')))
  order by -ln(1 - random())
           / (coalesce((p_weights ->> q.difficulty::text)::numeric, 1)
              * case when p.question_id is null then 1 else 0.35 end + 1e-9)
  limit greatest(p_n, 0);
$$;

-- Per-topic stats for one student (coverage uses unique questions; accuracy uses latest outcome).
create or replace function _topic_stats(p_uid uuid)
returns table (topic_id int, subject_id smallint, topic_name text, topic_group text,
               sort_order smallint, total int, attempted int, correct int)
language sql stable security definer set search_path = public as $$
  select t.id, t.subject_id, t.name, t.topic_group, t.sort_order,
         count(q.id)::int,
         count(p.question_id)::int,
         (count(p.question_id) filter (where p.last_correct))::int
  from topics t
  left join questions q on q.topic_id = t.id and q.is_active
  left join user_question_progress p on p.question_id = q.id and p.user_id = p_uid
  group by t.id;
$$;

create or replace function _topic_status(p_total int, p_attempted int, p_correct int, p_th jsonb)
returns text language sql immutable as $$
  select case
    when p_attempted = 0 then 'not_started'
    when p_attempted >= coalesce((p_th->>'min_attempts')::int, 10)
         and 100.0 * p_correct / p_attempted < coalesce((p_th->>'needs_revision_below')::numeric, 60)
      then 'needs_revision'
    when p_attempted >= p_total then 'completed'
    else 'in_progress'
  end;
$$;

create or replace function _strength(p_attempted int, p_correct int, p_th jsonb)
returns text language sql immutable as $$
  select case
    when p_attempted < coalesce((p_th->>'min_attempts')::int, 10) then null
    when 100.0 * p_correct / p_attempted < coalesce((p_th->>'needs_revision_below')::numeric, 60) then 'weak'
    when 100.0 * p_correct / p_attempted > coalesce((p_th->>'strong_above')::numeric, 80) then 'strong'
    else 'average'
  end;
$$;

-- Grades an attempt, records progress and mistakes. Idempotent.
create or replace function _finalize(p_attempt uuid, p_status attempt_status)
returns void language plpgsql security definer set search_path = public as $$
declare a attempts;
begin
  select * into a from attempts where id = p_attempt for update;
  if a.status <> 'in_progress' then return; end if;

  update attempt_questions aq
     set is_correct = case when aq.selected_slot is null then null
                           else aq.option_order[aq.selected_slot] = _correct_index(q.correct_option) end
    from questions q
   where q.id = aq.question_id and aq.attempt_id = p_attempt;

  update attempts set
    status            = p_status,
    submitted_at      = case when deadline_at is not null then least(now(), deadline_at) else now() end,
    time_taken_seconds = extract(epoch from
                          (case when deadline_at is not null then least(now(), deadline_at) else now() end)
                          - started_at)::int,
    correct_count     = (select count(*) from attempt_questions where attempt_id = p_attempt and is_correct),
    incorrect_count   = (select count(*) from attempt_questions where attempt_id = p_attempt and not is_correct),
    unattempted_count = (select count(*) from attempt_questions where attempt_id = p_attempt and selected_slot is null),
    score             = (select count(*) from attempt_questions where attempt_id = p_attempt and is_correct)
  where id = p_attempt;

  insert into user_question_progress as p (user_id, question_id, attempts_count, correct_count, last_correct, last_attempted_at)
  select a.user_id, aq.question_id, 1, case when aq.is_correct then 1 else 0 end, aq.is_correct, now()
  from attempt_questions aq
  where aq.attempt_id = p_attempt and aq.selected_slot is not null
  on conflict (user_id, question_id) do update set
    attempts_count    = p.attempts_count + 1,
    correct_count     = p.correct_count + excluded.correct_count,
    last_correct      = excluded.last_correct,
    last_attempted_at = now();

  insert into mistakes as m (user_id, question_id)
  select a.user_id, aq.question_id
  from attempt_questions aq
  where aq.attempt_id = p_attempt and aq.is_correct = false
  on conflict (user_id, question_id) do update set
    wrong_count = m.wrong_count + 1, last_wrong_at = now(), learned = false;
end $$;

-- Auto-submits any of the student's timed attempts whose time has run out.
create or replace function _expire_attempts(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from attempts
           where user_id = p_uid and status = 'in_progress'
             and deadline_at is not null and now() > deadline_at + interval '60 seconds'
  loop
    perform _finalize(r.id, 'auto_submitted');
  end loop;
end $$;

create or replace function _own_attempt(p_attempt uuid) returns attempts
language plpgsql security definer set search_path = public as $$
declare a attempts;
begin
  select * into a from attempts where id = p_attempt and user_id = _uid();
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  return a;
end $$;

-- ================================================================
-- Student RPCs
-- ================================================================

-- Starts (or resumes) a test. Returns the attempt id.
-- p_config for practice: {subject_id, topic_id, topic_ids[], difficulty, count,
--                         question_ids[], from_attempt, mistakes:true}
create or replace function start_attempt(p_kind test_kind, p_test_id uuid default null, p_config jsonb default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := _uid();
  v_test      tests;
  v_kind      test_kind := p_kind;
  v_attempt   uuid;
  v_existing  uuid;
  v_title     text;
  v_duration  int;
  v_weights   jsonb := '{}';
  v_verified  boolean := coalesce((_setting('full_mock_verified_only'))::text::boolean, true);
  v_split     jsonb := _setting('ga_mock_split');
  v_ids       uuid[] := '{}';
  v_part      uuid[];
  v_all       uuid[];
  v_count     int;
  v_topics    int[];
  v_diff      difficulty_level;
  s           record;
  g           record;
  v_shuffle_options boolean := true;
begin
  perform _expire_attempts(v_uid);

  if p_test_id is not null then
    select * into v_test from tests where id = p_test_id and (is_published or is_admin());
    if not found then raise exception 'TEST_NOT_FOUND'; end if;
    v_kind := v_test.kind;
    v_weights := coalesce(v_test.config -> 'weights', '{}');
  end if;

  -- ---------- timed full-length tests ----------
  if v_kind in ('full_mock','exam_simulation','previous_paper') then
    select id into v_existing from attempts
     where user_id = v_uid and status = 'in_progress'
       and kind in ('full_mock','exam_simulation','previous_paper');
    if found then return v_existing; end if;  -- resume the unfinished test

    v_duration := coalesce(v_test.duration_minutes, (_setting('mock_duration_minutes'))::text::int, 120);
    v_title := coalesce(v_test.title,
                 case v_kind when 'exam_simulation' then 'Real Exam Simulation' else 'Full Mock Test' end);

    if p_test_id is not null and exists (select 1 from test_questions where test_id = p_test_id) then
      -- fixed paper: previous papers keep the official order and option order
      if v_kind = 'previous_paper' then
        select array_agg(question_id order by position) into v_ids from test_questions where test_id = p_test_id;
        v_shuffle_options := false;
      else
        -- fixed mock: keep section order, shuffle within each subject
        select array_agg(tq.question_id order by sj.sort_order, random()) into v_ids
          from test_questions tq join questions q on q.id = tq.question_id
          join subjects sj on sj.id = q.subject_id
         where tq.test_id = p_test_id;
      end if;
    elsif v_kind = 'previous_paper' then
      raise exception 'PAPER_HAS_NO_QUESTIONS';
    else
      -- generated mock: exact blueprint from the question bank
      for s in select * from subjects order by sort_order loop
        v_part := '{}';
        if s.slug = 'ga-aviation' and v_split is not null then
          for g in select key, value::text::int as n from jsonb_each(v_split) loop
            v_part := v_part || array(select _pick_questions(v_uid, s.id, g.key, null, null, g.n,
                                                             v_weights, v_verified, v_ids || v_part));
          end loop;
        end if;
        if coalesce(array_length(v_part,1),0) < s.questions_in_exam then
          v_part := v_part || array(select _pick_questions(v_uid, s.id, null, null, null,
                                    s.questions_in_exam - coalesce(array_length(v_part,1),0),
                                    v_weights, v_verified, v_ids || v_part));
        end if;
        v_count := coalesce(array_length(v_part,1),0);
        if v_count < s.questions_in_exam then
          raise exception 'NOT_ENOUGH_QUESTIONS: % needs %, the bank has % eligible',
            s.name, s.questions_in_exam, v_count;
        end if;
        v_ids := v_ids || v_part;
      end loop;
    end if;

    insert into attempts (user_id, test_id, kind, title, deadline_at)
    values (v_uid, p_test_id, v_kind, v_title, now() + make_interval(mins => v_duration))
    returning id into v_attempt;

  -- ---------- practice ----------
  else
    v_count := least(greatest(coalesce((p_config->>'count')::int, 10), 1), 100);
    v_diff  := nullif(p_config->>'difficulty', '')::difficulty_level;

    if p_config ? 'topic_ids' then
      select array_agg(x::int) into v_topics from jsonb_array_elements_text(p_config->'topic_ids') x;
    elsif p_config ? 'topic_id' then
      v_topics := array[(p_config->>'topic_id')::int];
    end if;

    if p_config ? 'question_ids' then
      select array_agg(q.id) into v_ids from questions q
       where q.is_active and q.id in (select x::uuid from jsonb_array_elements_text(p_config->'question_ids') x);
      v_title := 'Custom Practice';
    elsif p_config ? 'from_attempt' then
      select array_agg(aq.question_id order by aq.position) into v_ids
        from attempt_questions aq join attempts a on a.id = aq.attempt_id
       where a.id = (p_config->>'from_attempt')::uuid and a.user_id = v_uid
         and a.status <> 'in_progress' and aq.is_correct = false;
      v_title := 'Retry Incorrect Questions';
    elsif v_kind = 'mistake_practice' then
      select array_agg(id) into v_ids from (
        select m.question_id as id from mistakes m join questions q on q.id = m.question_id
         where m.user_id = v_uid and not m.learned and q.is_active
           and (p_config->>'subject_id' is null or q.subject_id = (p_config->>'subject_id')::smallint)
         order by m.wrong_count desc, m.last_wrong_at desc limit v_count) x;
      v_title := 'Mistake Practice';
    else
      v_ids := array(select _pick_questions(v_uid, nullif(p_config->>'subject_id','')::smallint, null,
                                            v_topics, v_diff, v_count, '{}', false, null,
                                            coalesce((p_config->>'previous_only')::boolean, false)));
      select case
               when v_topics is not null and array_length(v_topics,1) = 1
                 then (select name from topics where id = v_topics[1]) || ' Practice'
               when v_topics is not null then 'Weak Topics Practice'
               else coalesce((select name from subjects where id = (p_config->>'subject_id')::smallint), 'Mixed')
                    || case when (p_config->>'previous_only')::boolean then ' — Previous Questions' else ' Practice' end
             end into v_title;
    end if;

    if coalesce(array_length(v_ids,1),0) = 0 then raise exception 'NO_QUESTIONS_AVAILABLE'; end if;
    v_ids := v_ids[1:100];

    -- shuffle question order for practice
    select array_agg(x order by random()) into v_ids from unnest(v_ids) x;

    insert into attempts (user_id, kind, title, config)
    values (v_uid, v_kind, v_title, p_config)
    returning id into v_attempt;
  end if;

  insert into attempt_questions (attempt_id, position, question_id, option_order)
  select v_attempt, ord::smallint, qid,
         case when v_shuffle_options then _random_perm() else '{1,2,3,4}'::smallint[] end
  from unnest(v_ids) with ordinality as u(qid, ord);

  return v_attempt;
end $$;

-- Returns everything the test screen or review screen needs.
create or replace function get_attempt(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a attempts; v_revealed boolean;
begin
  a := _own_attempt(p_attempt);
  if a.status = 'in_progress' and a.deadline_at is not null
     and now() > a.deadline_at + interval '60 seconds' then
    perform _finalize(a.id, 'auto_submitted');
    a := _own_attempt(p_attempt);
  end if;
  v_revealed := a.status <> 'in_progress';

  return jsonb_build_object(
    'attempt', jsonb_build_object(
      'id', a.id, 'kind', a.kind, 'status', a.status, 'title', a.title, 'test_id', a.test_id,
      'started_at', a.started_at, 'deadline_at', a.deadline_at, 'submitted_at', a.submitted_at,
      'server_now', now(), 'score', a.score, 'correct', a.correct_count,
      'incorrect', a.incorrect_count, 'unattempted', a.unattempted_count,
      'time_taken_seconds', a.time_taken_seconds,
      'total', (select count(*) from attempt_questions where attempt_id = a.id)),
    'sections', (
      select coalesce(jsonb_agg(jsonb_build_object('subject_id', x.subject_id, 'name', x.short_name,
                                  'start', x.first_pos, 'count', x.n) order by x.first_pos), '[]')
      from (select q.subject_id, sj.short_name, min(aq.position) first_pos, count(*) n
              from attempt_questions aq join questions q on q.id = aq.question_id
              join subjects sj on sj.id = q.subject_id
             where aq.attempt_id = a.id group by q.subject_id, sj.short_name) x),
    'questions', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'position', aq.position, 'question_id', q.id, 'subject_id', q.subject_id,
          'subject', sj.short_name, 'topic_id', q.topic_id, 'topic', t.name,
          'text', q.question_text, 'image_url', q.image_url,
          'options', jsonb_build_array(
             (array[q.option_a,q.option_b,q.option_c,q.option_d])[aq.option_order[1]],
             (array[q.option_a,q.option_b,q.option_c,q.option_d])[aq.option_order[2]],
             (array[q.option_a,q.option_b,q.option_c,q.option_d])[aq.option_order[3]],
             (array[q.option_a,q.option_b,q.option_c,q.option_d])[aq.option_order[4]]),
          'selected', aq.selected_slot, 'palette', aq.palette,
          'time_spent', aq.time_spent_seconds,
          'source', q.source, 'year', q.year, 'exam', q.exam
        ) || case when v_revealed then jsonb_build_object(
          'correct', array_position(aq.option_order, _correct_index(q.correct_option)),
          'is_correct', aq.is_correct, 'explanation', q.explanation,
          'concept', q.concept, 'difficulty', q.difficulty)
        else '{}'::jsonb end
        order by aq.position), '[]')
      from attempt_questions aq
      join questions q on q.id = aq.question_id
      join subjects sj on sj.id = q.subject_id
      join topics t on t.id = q.topic_id
      where aq.attempt_id = a.id)
  );
end $$;

-- Saves a batch of answer/palette changes: [{position, selected (1-4|null), marked, time_delta}]
create or replace function save_answers(p_attempt uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a attempts;
begin
  a := _own_attempt(p_attempt);
  if a.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'status', a.status);
  end if;
  if a.deadline_at is not null and now() > a.deadline_at + interval '60 seconds' then
    perform _finalize(a.id, 'auto_submitted');
    return jsonb_build_object('ok', false, 'status', 'auto_submitted');
  end if;

  update attempt_questions aq set
    selected_slot = i.selected,
    palette = case
      when i.selected is not null and i.marked then 'answered_marked'
      when i.selected is not null then 'answered'
      when i.marked then 'marked'
      else 'not_answered' end::palette_status,
    time_spent_seconds = aq.time_spent_seconds + least(greatest(coalesce(i.time_delta, 0), 0), 900)
  from jsonb_to_recordset(p_items) as i(position int, selected int, marked boolean, time_delta int)
  where aq.attempt_id = a.id and aq.position = i.position
    and (i.selected is null or i.selected between 1 and 4);

  return jsonb_build_object('ok', true, 'status', 'in_progress', 'server_now', now());
end $$;

create or replace function submit_attempt(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a attempts;
begin
  a := _own_attempt(p_attempt);
  if a.status = 'in_progress' then
    perform _finalize(a.id, case when a.deadline_at is not null and now() > a.deadline_at
                                 then 'auto_submitted' else 'submitted' end::attempt_status);
  end if;
  a := _own_attempt(p_attempt);
  return jsonb_build_object('status', a.status, 'score', a.score);
end $$;

-- Result analysis for a submitted attempt.
create or replace function get_result(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a attempts; v_avg numeric;
begin
  a := _own_attempt(p_attempt);
  if a.status = 'in_progress' then raise exception 'ATTEMPT_NOT_SUBMITTED'; end if;
  select avg(time_spent_seconds) into v_avg from attempt_questions where attempt_id = a.id;

  return jsonb_build_object(
    'subjects', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'subject_id', sj.id, 'name', sj.short_name, 'total', x.total, 'correct', x.correct,
               'incorrect', x.incorrect, 'unattempted', x.unattempted,
               'accuracy', _pct(x.correct, x.correct + x.incorrect), 'time', x.time)
             order by sj.sort_order), '[]')
      from (select q.subject_id, count(*) total,
                   count(*) filter (where aq.is_correct) correct,
                   count(*) filter (where aq.is_correct = false) incorrect,
                   count(*) filter (where aq.selected_slot is null) unattempted,
                   sum(aq.time_spent_seconds) time
              from attempt_questions aq join questions q on q.id = aq.question_id
             where aq.attempt_id = a.id group by q.subject_id) x
      join subjects sj on sj.id = x.subject_id),
    'topics', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'topic_id', t.id, 'name', t.name, 'subject', sj.short_name, 'total', x.total,
               'correct', x.correct, 'attempted', x.attempted,
               'accuracy', _pct(x.correct, x.attempted))
             order by _pct(x.correct, x.attempted) nulls first, x.total desc), '[]')
      from (select q.topic_id, count(*) total,
                   count(*) filter (where aq.is_correct) correct,
                   count(*) filter (where aq.selected_slot is not null) attempted
              from attempt_questions aq join questions q on q.id = aq.question_id
             where aq.attempt_id = a.id group by q.topic_id) x
      join topics t on t.id = x.topic_id join subjects sj on sj.id = t.subject_id),
    'avg_time_per_question', round(coalesce(v_avg, 0)),
    'slow_questions', (
      select coalesce(jsonb_agg(jsonb_build_object('position', position, 'time', time_spent_seconds,
                                                   'is_correct', is_correct) order by time_spent_seconds desc), '[]')
      from (select * from attempt_questions
             where attempt_id = a.id and time_spent_seconds > greatest(2 * coalesce(v_avg,0), 90)
             order by time_spent_seconds desc limit 10) s)
  );
end $$;

-- Dashboard: everything computed from real attempts.
create or replace function get_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := _uid();
  v_th jsonb := _setting('topic_status_thresholds');
  v_today date := _today();
  v_res jsonb;
begin
  perform _expire_attempts(v_uid);

  with ts as (select * from _topic_stats(v_uid)),
  subj as (
    select sj.id, sj.short_name, sj.name, sj.part, sj.sort_order,
           sum(ts.total)::int total, sum(ts.attempted)::int attempted, sum(ts.correct)::int correct
    from subjects sj left join ts on ts.subject_id = sj.id group by sj.id),
  mocks as (
    select * from attempts where user_id = v_uid and status <> 'in_progress'
      and kind in ('full_mock','exam_simulation','previous_paper')),
  today_aq as (
    select aq.*, q.topic_id, a.kind from attempts a
    join attempt_questions aq on aq.attempt_id = a.id
    join questions q on q.id = aq.question_id
    where a.user_id = v_uid and a.status <> 'in_progress'
      and (a.submitted_at at time zone 'Asia/Kolkata')::date = v_today
      and aq.selected_slot is not null),
  days as (
    select distinct (a.submitted_at at time zone 'Asia/Kolkata')::date d
    from attempts a where a.user_id = v_uid and a.status <> 'in_progress'
      and exists (select 1 from attempt_questions aq where aq.attempt_id = a.id and aq.selected_slot is not null))
  select jsonb_build_object(
    'overall', (select jsonb_build_object(
        'total_questions', coalesce(sum(total),0), 'attempted', coalesce(sum(attempted),0),
        'correct', coalesce(sum(correct),0),
        'coverage', coalesce(_pct(sum(attempted), sum(total)), 0),
        'accuracy', _pct(sum(correct), sum(attempted))) from subj),
    'mocks', (select jsonb_build_object(
        'completed', count(*),
        'available', (select count(*) from tests where is_published and kind in ('full_mock','exam_simulation')),
        'avg_score', round(avg(score), 1),
        'avg_total', round(avg(correct_count + incorrect_count + unattempted_count), 0),
        'avg_minutes', round(avg(time_taken_seconds) / 60.0, 0)) from mocks),
    'subjects', (select jsonb_agg(jsonb_build_object(
        'subject_id', s.id, 'name', s.name, 'short_name', s.short_name, 'part', s.part,
        'total', s.total, 'attempted', s.attempted, 'remaining', s.total - s.attempted,
        'correct', s.correct, 'coverage', coalesce(_pct(s.attempted, s.total), 0),
        'accuracy', _pct(s.correct, s.attempted),
        'avg_mock_score', (
          select round(avg(c), 1) from (
            select count(*) filter (where aq.is_correct) c
            from attempt_questions aq join questions q on q.id = aq.question_id
            where q.subject_id = s.id
              and aq.attempt_id in (select id from mocks where kind <> 'previous_paper')
            group by aq.attempt_id) z),
        'strength', _strength(s.attempted, s.correct, v_th)) order by s.sort_order) from subj s),
    'weak_topics', (select coalesce(jsonb_agg(jsonb_build_object(
        'topic_id', w.topic_id, 'name', w.topic_name, 'subject', sj.short_name,
        'accuracy', _pct(w.correct, w.attempted), 'attempted', w.attempted)
        order by 100.0 * w.correct / w.attempted), '[]')
      from (select * from ts where _topic_status(total, attempted, correct, v_th) = 'needs_revision'
            order by 100.0 * correct / attempted limit 5) w
      join subjects sj on sj.id = w.subject_id),
    'recent_mocks', (select coalesce(jsonb_agg(jsonb_build_object(
        'attempt_id', id, 'title', title, 'score', score,
        'total', correct_count + incorrect_count + unattempted_count,
        'submitted_at', submitted_at) order by submitted_at desc), '[]')
      from (select * from mocks order by submitted_at desc limit 5) r),
    'today', jsonb_build_object(
        'questions', (select count(*) from today_aq),
        'mocks', (select count(*) from mocks where (submitted_at at time zone 'Asia/Kolkata')::date = v_today),
        -- topics practised today in practice sets (a full mock touches every topic, so it doesn't count)
        'topics', (select count(distinct topic_id) from today_aq
                    where kind not in ('full_mock','exam_simulation','previous_paper'))),
    'targets', (select to_jsonb(d) - 'user_id' from daily_targets d where user_id = v_uid),
    'streak', (
      select count(*) from (select d, row_number() over (order by d desc) rn from days) x
      where x.d = (case when exists (select 1 from days where d = v_today) then v_today else v_today - 1 end)
                  - (x.rn - 1)::int),
    'totals', jsonb_build_object(
        'answers', (select coalesce(sum(attempts_count),0) from user_question_progress where user_id = v_uid),
        'tests_completed', (select count(*) from mocks),
        'sessions', (select count(*) from attempts where user_id = v_uid and status <> 'in_progress'),
        'topics_completed', (select count(*) from ts where _topic_status(total, attempted, correct, v_th) = 'completed')),
    'live_attempt', (select jsonb_build_object('attempt_id', id, 'title', title, 'deadline_at', deadline_at)
                     from attempts where user_id = v_uid and status = 'in_progress'
                       and kind in ('full_mock','exam_simulation','previous_paper') limit 1)
  ) into v_res;
  return v_res;
end $$;

-- Syllabus coverage: every subject with every topic.
create or replace function get_syllabus_progress()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := _uid(); v_th jsonb := _setting('topic_status_thresholds');
begin
  return (
    select jsonb_agg(jsonb_build_object(
      'subject_id', sj.id, 'name', sj.name, 'short_name', sj.short_name, 'part', sj.part,
      'questions_in_exam', sj.questions_in_exam,
      'total', x.total, 'attempted', x.attempted, 'correct', x.correct,
      'coverage', coalesce(_pct(x.attempted, x.total), 0), 'accuracy', _pct(x.correct, x.attempted),
      'topics', x.topics) order by sj.sort_order)
    from subjects sj
    join (select ts.subject_id, sum(total)::int total, sum(attempted)::int attempted, sum(correct)::int correct,
                 jsonb_agg(jsonb_build_object(
                   'topic_id', ts.topic_id, 'name', ts.topic_name, 'group', ts.topic_group,
                   'total', ts.total, 'attempted', ts.attempted, 'correct', ts.correct,
                   'coverage', coalesce(_pct(ts.attempted, ts.total), 0),
                   'accuracy', _pct(ts.correct, ts.attempted),
                   'status', _topic_status(ts.total, ts.attempted, ts.correct, v_th),
                   'strength', _strength(ts.attempted, ts.correct, v_th))
                   order by ts.sort_order) topics
            from _topic_stats(v_uid) ts group by ts.subject_id) x on x.subject_id = sj.id);
end $$;

-- Performance analytics.
create or replace function get_analytics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := _uid(); v_th jsonb := _setting('topic_status_thresholds');
begin
  return jsonb_build_object(
    'mocks', (select coalesce(jsonb_agg(jsonb_build_object(
        'attempt_id', id, 'title', title, 'date', submitted_at, 'score', score,
        'total', correct_count + incorrect_count + unattempted_count,
        'accuracy', _pct(correct_count, correct_count + incorrect_count),
        'minutes', round(time_taken_seconds / 60.0)) order by submitted_at), '[]')
      from attempts where user_id = v_uid and status <> 'in_progress'
        and kind in ('full_mock','exam_simulation','previous_paper')),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', d, 'answered', n, 'correct', c,
                                                           'accuracy', _pct(c, n)) order by d), '[]')
      from (select (a.submitted_at at time zone 'Asia/Kolkata')::date d,
                   count(*) n, count(*) filter (where aq.is_correct) c
              from attempts a join attempt_questions aq on aq.attempt_id = a.id
             where a.user_id = v_uid and a.status <> 'in_progress' and aq.selected_slot is not null
               and a.submitted_at > now() - interval '60 days'
             group by 1) z),
    'subjects', (select jsonb_agg(jsonb_build_object(
        'name', sj.short_name, 'attempted', x.attempted, 'correct', x.correct,
        'accuracy', _pct(x.correct, x.attempted),
        'avg_seconds', (select round(avg(aq.time_spent_seconds))
                          from attempt_questions aq join attempts a on a.id = aq.attempt_id
                          join questions q on q.id = aq.question_id
                         where a.user_id = v_uid and a.status <> 'in_progress'
                           and aq.selected_slot is not null and q.subject_id = sj.id)
        ) order by sj.sort_order)
      from subjects sj join (select subject_id, sum(attempted)::int attempted, sum(correct)::int correct
                               from _topic_stats(v_uid) group by subject_id) x on x.subject_id = sj.id),
    'topics', (select coalesce(jsonb_agg(jsonb_build_object(
        'topic_id', ts.topic_id, 'name', ts.topic_name, 'subject', sj.short_name,
        'attempted', ts.attempted, 'accuracy', _pct(ts.correct, ts.attempted),
        'strength', _strength(ts.attempted, ts.correct, v_th)) order by sj.sort_order, ts.sort_order), '[]')
      from _topic_stats(v_uid) ts join subjects sj on sj.id = ts.subject_id where ts.attempted > 0)
  );
end $$;

-- Published tests of a kind with the student's history.
create or replace function list_tests(p_kind test_kind)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := _uid();
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'title', t.title, 'kind', t.kind, 'series_label', t.series_label,
      'series_number', t.series_number, 'description', t.description,
      'paper_year', t.paper_year, 'paper_shift', t.paper_shift, 'duration', t.duration_minutes,
      'question_count', coalesce(nullif((select count(*) from test_questions where test_id = t.id), 0),
                                 case when t.kind = 'previous_paper' then 0
                                      else (select sum(questions_in_exam) from subjects) end),
      'fixed', exists (select 1 from test_questions where test_id = t.id),
      'attempts', (select count(*) from attempts a where a.test_id = t.id and a.user_id = v_uid
                     and a.status <> 'in_progress'),
      'best_score', (select max(score) from attempts a where a.test_id = t.id and a.user_id = v_uid),
      'in_progress', (select a.id from attempts a where a.test_id = t.id and a.user_id = v_uid
                        and a.status = 'in_progress' limit 1),
      'sources', (select array_agg(distinct q.source) from test_questions tq
                    join questions q on q.id = tq.question_id where tq.test_id = t.id)
    ) order by t.series_number nulls last, t.paper_year desc nulls last, t.created_at), '[]')
    from tests t where t.kind = p_kind and (t.is_published or is_admin()));
end $$;

-- Mistake book (answers are shown: the student has already submitted these).
create or replace function get_mistakes(p_subject smallint default null, p_include_learned boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := _uid();
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'question_id', q.id, 'text', q.question_text, 'image_url', q.image_url,
      'options', jsonb_build_array(q.option_a, q.option_b, q.option_c, q.option_d),
      'correct', _correct_index(q.correct_option), 'explanation', q.explanation, 'concept', q.concept,
      'subject_id', q.subject_id, 'subject', sj.short_name, 'topic', t.name, 'topic_id', t.id,
      'wrong_count', m.wrong_count, 'last_wrong_at', m.last_wrong_at, 'learned', m.learned)
      order by m.last_wrong_at desc), '[]')
    from mistakes m join questions q on q.id = m.question_id
    join subjects sj on sj.id = q.subject_id join topics t on t.id = q.topic_id
    where m.user_id = v_uid and (p_subject is null or q.subject_id = p_subject)
      and (p_include_learned or not m.learned));
end $$;

-- Bookmarks. Answers are revealed only for questions the student has already submitted.
create or replace function get_bookmarks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := _uid();
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'question_id', q.id, 'category', b.category, 'created_at', b.created_at,
      'text', q.question_text, 'image_url', q.image_url,
      'options', jsonb_build_array(q.option_a, q.option_b, q.option_c, q.option_d),
      'subject', sj.short_name, 'topic', t.name, 'topic_id', t.id,
      'revealed', p.question_id is not null,
      'correct', case when p.question_id is not null then _correct_index(q.correct_option) end,
      'explanation', case when p.question_id is not null then q.explanation end)
      order by b.created_at desc), '[]')
    from bookmarks b join questions q on q.id = b.question_id
    join subjects sj on sj.id = q.subject_id join topics t on t.id = q.topic_id
    left join user_question_progress p on p.user_id = v_uid and p.question_id = q.id
    where b.user_id = v_uid);
end $$;

-- Revision centre data.
create or replace function get_revision()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := _uid(); v_th jsonb := _setting('topic_status_thresholds');
begin
  return jsonb_build_object(
    'revise_today', (select coalesce(jsonb_agg(x order by x->>'priority'), '[]') from (
        -- spaced revisit: mistakes made 1, 3 or 7+ days ago that are not yet learned
        select jsonb_build_object('question_id', q.id, 'text', left(q.question_text, 160),
                 'subject', sj.short_name, 'topic', t.name, 'wrong_count', m.wrong_count,
                 'days_ago', _today() - (m.last_wrong_at at time zone 'Asia/Kolkata')::date,
                 'priority', lpad((100 - least(m.wrong_count, 99))::text, 3, '0')) x
          from mistakes m join questions q on q.id = m.question_id
          join subjects sj on sj.id = q.subject_id join topics t on t.id = q.topic_id
         where m.user_id = v_uid and not m.learned
           and ((_today() - (m.last_wrong_at at time zone 'Asia/Kolkata')::date) in (0, 1, 3)
                or _today() - (m.last_wrong_at at time zone 'Asia/Kolkata')::date >= 7)
         order by m.wrong_count desc, m.last_wrong_at
         limit 15) r),
    'weak_topics', (select coalesce(jsonb_agg(jsonb_build_object(
        'topic_id', ts.topic_id, 'name', ts.topic_name, 'subject', sj.short_name,
        'accuracy', _pct(ts.correct, ts.attempted), 'attempted', ts.attempted,
        'status', _topic_status(ts.total, ts.attempted, ts.correct, v_th))
        order by 1.0 * ts.correct / ts.attempted), '[]')
      from _topic_stats(v_uid) ts join subjects sj on sj.id = ts.subject_id
      where ts.attempted >= 3 and 100.0 * ts.correct / ts.attempted
            < coalesce((v_th->>'strong_above')::numeric, 80)),
    'frequently_incorrect', (select coalesce(jsonb_agg(jsonb_build_object(
        'question_id', q.id, 'text', left(q.question_text, 160), 'subject', sj.short_name,
        'topic', t.name, 'wrong_count', m.wrong_count) order by m.wrong_count desc), '[]')
      from (select * from mistakes where user_id = v_uid and wrong_count >= 2 and not learned
             order by wrong_count desc limit 15) m
      join questions q on q.id = m.question_id join subjects sj on sj.id = q.subject_id
      join topics t on t.id = q.topic_id),
    'marked', (select coalesce(jsonb_object_agg(category, n), '{}')
      from (select category, count(*) n from bookmarks where user_id = v_uid group by category) b),
    'recently_practiced', (select coalesce(jsonb_agg(jsonb_build_object(
        'topic_id', r.topic_id, 'name', t.name, 'subject', sj.short_name, 'last', r.last,
        'answered', r.n, 'accuracy', _pct(r.c, r.n)) order by r.last desc), '[]')
      from (select q.topic_id, max(a.submitted_at) last, count(*) n, count(*) filter (where aq.is_correct) c
              from attempts a join attempt_questions aq on aq.attempt_id = a.id
              join questions q on q.id = aq.question_id
             where a.user_id = v_uid and a.status <> 'in_progress' and aq.selected_slot is not null
               and a.submitted_at > now() - interval '14 days'
             group by q.topic_id order by max(a.submitted_at) desc limit 10) r
      join topics t on t.id = r.topic_id join subjects sj on sj.id = t.subject_id),
    'last7_mistakes', (select coalesce(jsonb_agg(jsonb_build_object(
        'question_id', q.id, 'text', left(q.question_text, 160), 'subject', sj.short_name,
        'topic', t.name, 'last_wrong_at', m.last_wrong_at) order by m.last_wrong_at desc), '[]')
      from mistakes m join questions q on q.id = m.question_id
      join subjects sj on sj.id = q.subject_id join topics t on t.id = q.topic_id
      where m.user_id = v_uid and m.last_wrong_at > now() - interval '7 days')
  );
end $$;

-- Global search across questions (text only, never answers), topics, tests and notes.
create or replace function search_all(p_query text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_q text := trim(coalesce(p_query, '')); v_like text;
begin
  perform _uid();
  if length(v_q) < 2 then return jsonb_build_object('questions','[]'::jsonb,'topics','[]'::jsonb,
                                                    'tests','[]'::jsonb,'notes','[]'::jsonb); end if;
  v_like := '%' || replace(replace(v_q, '%', ''), '_', '') || '%';
  return jsonb_build_object(
    'topics', (select coalesce(jsonb_agg(jsonb_build_object('topic_id', t.id, 'name', t.name,
                 'subject', sj.short_name, 'subject_id', sj.id)), '[]')
               from (select * from topics where name ilike v_like limit 20) t
               join subjects sj on sj.id = t.subject_id),
    'questions', (select coalesce(jsonb_agg(jsonb_build_object('question_id', q.id,
                 'text', left(q.question_text, 200), 'subject', sj.short_name,
                 'topic', t.name, 'topic_id', t.id)), '[]')
               from (select * from questions
                      where is_active and (search @@ websearch_to_tsquery('english', v_q)
                                           or question_text ilike v_like)
                      limit 25) q
               join subjects sj on sj.id = q.subject_id join topics t on t.id = q.topic_id),
    'tests', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'kind', kind)), '[]')
               from (select * from tests where is_published and title ilike v_like limit 10) x),
    'notes', (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'title', n.title,
                 'category', n.category, 'subject', sj.short_name)), '[]')
               from (select * from revision_notes where title ilike v_like or body ilike v_like limit 10) n
               left join subjects sj on sj.id = n.subject_id)
  );
end $$;

-- Number of uploaded previous-paper questions per subject (for the Previous Papers page).
create or replace function get_previous_question_counts()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform _uid();
  return (select coalesce(jsonb_agg(jsonb_build_object('subject_id', sj.id, 'name', sj.short_name,
            'official', coalesce(x.official, 0), 'memory', coalesce(x.memory, 0)) order by sj.sort_order), '[]')
          from subjects sj
          left join (select subject_id,
                            count(*) filter (where source = 'previous_official') official,
                            count(*) filter (where source = 'previous_memory_based') memory
                       from questions where is_active group by subject_id) x on x.subject_id = sj.id);
end $$;

-- ================================================================
-- Admin RPCs
-- ================================================================
create or replace function _require_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
end $$;

-- Bulk import. Rows use the CSV headers: question, optionA..optionD, correctAnswer, explanation,
-- subject, topic, difficulty, source, year (+ optional exam, shift, subtopic, concept, tags, image, verified).
-- Each row is inserted independently; bad rows are reported, good rows are kept.
create or replace function admin_import_questions(p_rows jsonb, p_test_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r jsonb; i int := 0; v_ok int := 0; v_errors jsonb := '[]';
  v_subject smallint; v_topic int; v_correct text; v_diff text; v_source text; v_id uuid;
  v_pos int;
begin
  perform _require_admin();
  if p_test_id is not null then
    select coalesce(max(position), 0) into v_pos from test_questions where test_id = p_test_id;
  end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      select id into v_subject from subjects
       where lower(slug) = lower(trim(r->>'subject')) or lower(name) = lower(trim(r->>'subject'))
          or lower(short_name) = lower(trim(r->>'subject'));
      if v_subject is null then raise exception 'unknown subject "%"', r->>'subject'; end if;

      select id into v_topic from topics
       where subject_id = v_subject
         and (lower(slug) = lower(trim(r->>'topic')) or lower(name) = lower(trim(r->>'topic')));
      if v_topic is null then raise exception 'unknown topic "%" for %', r->>'topic', r->>'subject'; end if;

      v_correct := upper(trim(r->>'correctAnswer'));
      v_correct := case v_correct when '1' then 'A' when '2' then 'B' when '3' then 'C' when '4' then 'D'
                                  else v_correct end;
      if v_correct not in ('A','B','C','D') then
        raise exception 'correctAnswer must be A, B, C or D (got "%")', r->>'correctAnswer';
      end if;

      v_diff := lower(coalesce(nullif(trim(r->>'difficulty'), ''), 'exam'));
      v_diff := case when v_diff in ('exam level','exam-level') then 'exam' else v_diff end;
      v_source := lower(coalesce(nullif(trim(r->>'source'), ''), 'original'));
      v_source := case v_source when 'official' then 'previous_official'
                                when 'memory' then 'previous_memory_based'
                                when 'memory-based' then 'previous_memory_based'
                                else v_source end;

      insert into questions (subject_id, topic_id, subtopic, question_text, option_a, option_b, option_c,
                             option_d, correct_option, explanation, concept, difficulty, source,
                             is_verified, year, exam, shift, tags, image_url, created_by)
      values (v_subject, v_topic, nullif(trim(r->>'subtopic'), ''), trim(r->>'question'),
              trim(r->>'optionA'), trim(r->>'optionB'), trim(r->>'optionC'), trim(r->>'optionD'),
              v_correct, trim(r->>'explanation'), nullif(trim(r->>'concept'), ''),
              v_diff::difficulty_level, v_source::question_source,
              coalesce(lower(nullif(trim(r->>'verified'), '')) in ('true','yes','1','y'),
                       true),
              nullif(trim(r->>'year'), '')::smallint, nullif(trim(r->>'exam'), ''),
              nullif(trim(r->>'shift'), ''),
              coalesce(string_to_array(nullif(trim(r->>'tags'), ''), ','), '{}'),
              nullif(trim(r->>'image'), ''), auth.uid())
      returning id into v_id;

      if p_test_id is not null then
        v_pos := v_pos + 1;
        insert into test_questions (test_id, question_id, position) values (p_test_id, v_id, v_pos);
      end if;
      v_ok := v_ok + 1;
    exception when others then
      v_errors := v_errors || jsonb_build_object('row', i, 'message',
        case when sqlstate = '23505' then 'duplicate question (already in the bank)'
             when sqlstate = '23514' then 'failed a quality check (empty field, duplicate options, or previous-paper row without year/exam)'
             else sqlerrm end);
    end;
    v_subject := null; v_topic := null;
  end loop;

  return jsonb_build_object('inserted', v_ok, 'failed', jsonb_array_length(v_errors), 'errors', v_errors);
end $$;

create or replace function admin_list_questions(
  p_subject smallint default null, p_topic int default null, p_search text default null,
  p_source question_source default null, p_verified boolean default null,
  p_limit int default 25, p_offset int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  return (with f as (
      select q.* from questions q
      where (p_subject is null or q.subject_id = p_subject)
        and (p_topic   is null or q.topic_id = p_topic)
        and (p_source  is null or q.source = p_source)
        and (p_verified is null or q.is_verified = p_verified)
        and (coalesce(p_search, '') = '' or q.question_text ilike '%' || p_search || '%'))
    select jsonb_build_object(
      'total', (select count(*) from f),
      'rows', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]') from (
        select f.id, f.subject_id, f.topic_id, f.subtopic, f.question_text, f.option_a, f.option_b,
               f.option_c, f.option_d, f.correct_option, f.explanation, f.concept, f.difficulty,
               f.source, f.is_verified, f.year, f.exam, f.shift, f.tags, f.image_url, f.is_active,
               f.created_at, sj.short_name as subject, t.name as topic,
               coalesce(st.answers, 0) as answers, _pct(st.correct, st.answers) as accuracy
        from f join subjects sj on sj.id = f.subject_id join topics t on t.id = f.topic_id
        left join (select question_id, sum(attempts_count) answers, sum(correct_count) correct
                     from user_question_progress group by question_id) st on st.question_id = f.id
        order by f.created_at desc limit least(p_limit, 200) offset p_offset) x)));
end $$;

-- Hard-deletes an unused question; deactivates one that students have already attempted.
create or replace function admin_delete_question(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  begin
    delete from questions where id = p_id;
    return 'deleted';
  exception when foreign_key_violation then
    update questions set is_active = false where id = p_id;
    return 'deactivated';
  end;
end $$;

-- Fills a fixed mock with an exact 120-question blueprint drawn from verified questions.
create or replace function admin_fill_test(p_test_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare t tests; s record; g record; v_ids uuid[] := '{}'; v_part uuid[];
        v_split jsonb := _setting('ga_mock_split');
begin
  perform _require_admin();
  select * into t from tests where id = p_test_id;
  if t.kind not in ('full_mock','exam_simulation') then raise exception 'Only mocks can be auto-filled'; end if;
  delete from test_questions where test_id = p_test_id;
  for s in select * from subjects order by sort_order loop
    v_part := '{}';
    if s.slug = 'ga-aviation' and v_split is not null then
      for g in select key, value::text::int n from jsonb_each(v_split) loop
        v_part := v_part || array(select _pick_questions(null, s.id, g.key, null, null, g.n,
                                  coalesce(t.config->'weights','{}'), true, v_ids || v_part));
      end loop;
    end if;
    v_part := v_part || array(select _pick_questions(null, s.id, null, null, null,
                              s.questions_in_exam - coalesce(array_length(v_part,1),0),
                              coalesce(t.config->'weights','{}'), true, v_ids || v_part));
    if coalesce(array_length(v_part,1),0) < s.questions_in_exam then
      raise exception 'NOT_ENOUGH_QUESTIONS: % needs %, bank has %', s.name, s.questions_in_exam,
        coalesce(array_length(v_part,1),0);
    end if;
    v_ids := v_ids || v_part;
  end loop;
  insert into test_questions (test_id, question_id, position)
  select p_test_id, qid, ord from unnest(v_ids) with ordinality u(qid, ord);
  return array_length(v_ids, 1);
end $$;

create or replace function admin_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  return jsonb_build_object(
    'users', (select count(*) from profiles),
    'active_7d', (select count(distinct user_id) from attempts where started_at > now() - interval '7 days'),
    'attempts', (select count(*) from attempts where status <> 'in_progress'),
    'mocks', (select count(*) from attempts where status <> 'in_progress'
                and kind in ('full_mock','exam_simulation','previous_paper')),
    'questions', (select count(*) from questions where is_active),
    'unverified', (select count(*) from questions where is_active and not is_verified),
    'by_subject', (select jsonb_agg(jsonb_build_object('name', sj.short_name, 'needed', sj.questions_in_exam,
                     'total', (select count(*) from questions q where q.subject_id = sj.id and q.is_active),
                     'verified', (select count(*) from questions q where q.subject_id = sj.id
                                    and q.is_active and q.is_verified)) order by sj.sort_order)
                   from subjects sj),
    'by_source', (select coalesce(jsonb_object_agg(source, n), '{}')
                  from (select source, count(*) n from questions where is_active group by source) x),
    'by_difficulty', (select coalesce(jsonb_object_agg(difficulty, n), '{}')
                  from (select difficulty, count(*) n from questions where is_active group by difficulty) x),
    'hardest', (select coalesce(jsonb_agg(jsonb_build_object('question_id', q.id,
                   'text', left(q.question_text, 140), 'subject', sj.short_name,
                   'answers', x.answers, 'accuracy', _pct(x.correct, x.answers)) order by x.correct::numeric / x.answers), '[]')
                from (select question_id, sum(attempts_count) answers, sum(correct_count) correct
                        from user_question_progress group by question_id
                        having sum(attempts_count) >= 5 order by sum(correct_count)::numeric / sum(attempts_count)
                        limit 10) x
                join questions q on q.id = x.question_id join subjects sj on sj.id = q.subject_id),
    'user_rows', (select coalesce(jsonb_agg(u order by u->>'last_active' desc nulls last), '[]') from (
        select jsonb_build_object('id', p.id, 'name', p.full_name, 'email', au.email, 'role', p.role,
          'joined', p.created_at,
          'answered', (select count(*) from user_question_progress x where x.user_id = p.id),
          'accuracy', (select _pct(count(*) filter (where last_correct), count(*))
                         from user_question_progress x where x.user_id = p.id),
          'mocks', (select count(*) from attempts a where a.user_id = p.id and a.status <> 'in_progress'
                      and a.kind in ('full_mock','exam_simulation','previous_paper')),
          'last_active', (select max(started_at) from attempts a where a.user_id = p.id)) u
        from profiles p join auth.users au on au.id = p.id
        order by p.created_at desc limit 200) z)
  );
end $$;

-- ---------- privileges ----------
-- Attempts, answers and progress are written only by the SECURITY DEFINER functions above.
revoke insert, update, delete on attempts, attempt_questions, user_question_progress from authenticated, anon;

revoke execute on all functions in schema public from public, anon;
grant  execute on function
  start_attempt(test_kind, uuid, jsonb), get_attempt(uuid), save_answers(uuid, jsonb),
  submit_attempt(uuid), get_result(uuid), get_dashboard(), get_syllabus_progress(),
  get_analytics(), list_tests(test_kind), get_mistakes(smallint, boolean), get_bookmarks(),
  get_revision(), search_all(text), is_admin(), get_previous_question_counts(),
  admin_import_questions(jsonb, uuid), admin_list_questions(smallint, int, text, question_source, boolean, int, int),
  admin_delete_question(uuid), admin_fill_test(uuid), admin_stats(), mock_blueprint_errors(uuid)
to authenticated;
revoke execute on function
  _uid(), _setting(text), _pick_questions(uuid, smallint, text, int[], difficulty_level, int, jsonb, boolean, uuid[], boolean),
  _topic_stats(uuid), _finalize(uuid, attempt_status), _expire_attempts(uuid), _own_attempt(uuid),
  _require_admin(), handle_new_user()
from authenticated;
-- RLS policies call is_admin(), so every role must be able to execute it (it only reveals the caller's own role)
grant execute on function is_admin() to anon;
