-- End-to-end engine test. Every check prints PASS or FAIL.
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function t_check(label text, ok boolean) returns text
language plpgsql as $$ begin return case when ok then 'PASS  ' else 'FAIL  ' end || label; end $$;
grant execute on function t_check(text, boolean) to authenticated;

create or replace function t_raises(label text, stmt text, expect text) returns text
language plpgsql as $$
begin
  execute stmt;
  return 'FAIL  ' || label || ' (no error)';
exception when others then
  return case when sqlerrm ilike '%' || expect || '%' then 'PASS  ' else 'FAIL  ' end || label || ' → ' || sqlerrm;
end $$;
grant execute on function t_raises(text, text, text) to authenticated;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'stu@test',   '{"full_name":"Student"}'),
  ('00000000-0000-0000-0000-00000000000c', 'stu2@test',  '{"full_name":"Other"}');
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';

select id as mock1 from tests where series_number = 1 \gset

-- ================= student takes Mock 01 =================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false) \gset x
select start_attempt('full_mock', :'mock1') as aid \gset
select t_check('mock has exactly 120 questions', (get_attempt(:'aid')->'attempt'->>'total')::int = 120);
select t_check('sections follow blueprint 15/15/15/15/24/24/12',
  (select string_agg(s->>'count', '/' order by (s->>'start')::int) from jsonb_array_elements(get_attempt(:'aid')->'sections') s)
  = '15/15/15/15/24/24/12');
select t_check('no correct answer exposed while in progress',
  not exists (select 1 from jsonb_array_elements(get_attempt(:'aid')->'questions') q
              where q ? 'correct' or q ? 'explanation'));
select t_check('deadline is 120 minutes after start',
  (select a.deadline_at - a.started_at = interval '120 minutes' from attempts a where a.id = :'aid'));
select t_check('starting another mock resumes the same attempt', start_attempt('full_mock', null) = :'aid');
select t_check('student cannot read attempt_questions of others (sees own only)',
  (select count(*) from attempt_questions) = 120);
reset role;

select t_check('GA section is 11 aviation + 4 static GK',
  (select count(*) filter (where t.topic_group = 'Aviation') = 11 and count(*) filter (where t.topic_group = 'Static GK') = 4
     from attempt_questions aq join questions q on q.id = aq.question_id join topics t on t.id = q.topic_id
    where aq.attempt_id = :'aid' and q.subject_id = (select id from subjects where slug = 'ga-aviation')));
select t_check('no duplicate questions in the mock',
  (select count(distinct question_id) from attempt_questions where attempt_id = :'aid') = 120);
select t_check('options are shuffled (not all in original order)',
  (select count(*) from attempt_questions where attempt_id = :'aid' and option_order <> '{1,2,3,4}') > 60);

-- build answers: positions 1-60 correct, 61-70 wrong, rest blank; mark 5 for review
select jsonb_agg(jsonb_build_object(
         'position', aq.position,
         'selected', case when aq.position <= 60 then array_position(aq.option_order, (ascii(q.correct_option) - 64)::smallint)
                          else (array_position(aq.option_order, (ascii(q.correct_option) - 64)::smallint) % 4) + 1 end,
         'marked', aq.position between 56 and 60,
         'time_delta', case when aq.position = 7 then 400 else 30 end)) as items
from attempt_questions aq join questions q on q.id = aq.question_id
where aq.attempt_id = :'aid' and aq.position <= 70 \gset

set role authenticated;
select t_check('save_answers accepted', (save_answers(:'aid', :'items')->>'ok')::boolean);
select t_check('palette answered_marked for 56-60',
  (select count(*) from jsonb_array_elements(get_attempt(:'aid')->'questions') q where q->>'palette' = 'answered_marked') = 5);
select t_check('invalid option 7 is ignored',
  (save_answers(:'aid', '[{"position":71,"selected":7,"marked":false,"time_delta":5}]')->>'ok')::boolean
  and (select q->>'selected' is null from jsonb_array_elements(get_attempt(:'aid')->'questions') q where (q->>'position')::int = 71));
select t_check('submit returns score 60', (submit_attempt(:'aid')->>'score')::int = 60);
select t_check('attempt counts 60/10/50',
  (select correct_count = 60 and incorrect_count = 10 and unattempted_count = 50 from attempts where id = :'aid'));
select t_check('answers revealed after submit',
  (select bool_and(q ? 'correct' and q ? 'explanation') from jsonb_array_elements(get_attempt(:'aid')->'questions') q));
select t_check('revealed correct slot matches what we selected for 1-60',
  (select bool_and((q->>'correct')::int = (q->>'selected')::int)
     from jsonb_array_elements(get_attempt(:'aid')->'questions') q where (q->>'position')::int <= 60));
select t_check('resubmitting is harmless', (submit_attempt(:'aid')->>'score')::int = 60);
select t_check('saving after submit is refused', not (save_answers(:'aid', '[]')->>'ok')::boolean);
select t_check('progress rows = 70 (unique answered)', (select count(*) from user_question_progress) = 70);
select t_check('mistake book has 10', jsonb_array_length(get_mistakes()) = 10);
select t_check('result subjects sum to 60 correct',
  (select sum((s->>'correct')::int) from jsonb_array_elements(get_result(:'aid')->'subjects') s) = 60);
select t_check('slow question #7 flagged',
  exists (select 1 from jsonb_array_elements(get_result(:'aid')->'slow_questions') s where (s->>'position')::int = 7));

-- dashboard
select get_dashboard() as dash \gset
select t_check('dashboard attempted = 70', (:'dash'::jsonb->'overall'->>'attempted')::int = 70);
select t_check('dashboard accuracy = 85.7', (:'dash'::jsonb->'overall'->>'accuracy')::numeric = 85.7);
select t_check('dashboard mocks completed = 1, avg score 60',
  (:'dash'::jsonb->'mocks'->>'completed')::int = 1 and (:'dash'::jsonb->'mocks'->>'avg_score')::numeric = 60);
select t_check('dashboard today = 70 questions, 1 mock',
  (:'dash'::jsonb->'today'->>'questions')::int = 70 and (:'dash'::jsonb->'today'->>'mocks')::int = 1);
select t_check('streak = 1', (:'dash'::jsonb->>'streak')::int = 1);
select t_check('7 subjects on dashboard', jsonb_array_length(:'dash'::jsonb->'subjects') = 7);
select t_check('no live attempt after submit', :'dash'::jsonb->'live_attempt' = 'null'::jsonb);
select t_check('syllabus has 198 topics',
  (select sum(jsonb_array_length(s->'topics')) from jsonb_array_elements(get_syllabus_progress()) s) = 198);
select t_check('analytics has 1 mock', jsonb_array_length(get_analytics()->'mocks') = 1);
select t_check('revision: last 7 days mistakes = 10', jsonb_array_length(get_revision()->'last7_mistakes') = 10);
select t_check('list_tests shows best score 60 for mock 1',
  (select (t->>'best_score')::int = 60 from jsonb_array_elements(list_tests('full_mock')) t where t->>'id' = :'mock1'));
select t_check('search Bernoulli finds a physics question',
  exists (select 1 from jsonb_array_elements(search_all('Bernoulli')->'questions') q where q->>'subject' = 'Physics'));
select t_check('search results never include answers',
  not exists (select 1 from jsonb_array_elements(search_all('the')->'questions') q where q ? 'correct'));

-- practice
select id as topic_id from topics where slug = 'current-electricity' \gset
select start_attempt('topic_practice', null, jsonb_build_object('topic_id', :topic_id, 'count', 5)) as pid \gset
select t_check('topic practice has the topic''s questions (<=5)',
  (select (get_attempt(:'pid')->'attempt'->>'total')::int between 1 and 5));
select t_check('practice is untimed', get_attempt(:'pid')->'attempt'->'deadline_at' = 'null'::jsonb);
select submit_attempt(:'pid') \gset x
select start_attempt('mistake_practice', null, jsonb_build_object('from_attempt', :'aid')) as rid \gset
select t_check('retry-incorrect has 10 questions', (get_attempt(:'rid')->'attempt'->>'total')::int = 10);
select t_check('mistake practice from book works',
  (get_attempt(start_attempt('mistake_practice', null, '{"count":20}'))->'attempt'->>'total')::int = 10);
select t_raises('empty topic practice raises NO_QUESTIONS_AVAILABLE',
  format('select start_attempt(''topic_practice'', null, ''{"topic_id": %s}'')', (select id from topics where slug = 'current-affairs')),
  'NO_QUESTIONS_AVAILABLE');

select t_raises('previous-only practice with no uploaded papers raises',
  'select start_attempt(''subject_practice'', null, ''{"subject_id":5,"previous_only":true}'')', 'NO_QUESTIONS_AVAILABLE');
select t_check('previous question counts has 7 subjects', jsonb_array_length(get_previous_question_counts()) = 7);
-- bookmarks: answer hidden for an unseen question
reset role;
select q.id as unseen from questions q where not exists (select 1 from user_question_progress p where p.question_id = q.id) limit 1 \gset
set role authenticated;
insert into bookmarks (user_id, question_id, category) values (auth.uid(), :'unseen', 'difficult');
select t_check('bookmark of unseen question hides answer',
  (select b->'correct' = 'null'::jsonb and not (b->>'revealed')::boolean from jsonb_array_elements(get_bookmarks()) b));
update mistakes set learned = true where user_id = auth.uid();
select t_check('mark mistake learned via column grant', (select count(*) filter (where learned) from mistakes) = 10);
select t_raises('student cannot change own score', format('update attempts set score = 120 where id = %L', :'aid'), 'permission denied');
select t_raises('student cannot fake progress', 'insert into user_question_progress (user_id, question_id) select auth.uid(), question_id from bookmarks', 'permission denied');
select t_raises('student cannot change wrong_count', 'update mistakes set wrong_count = 0', 'permission denied');

-- ================= security =================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false) \gset x
select t_raises('other student cannot open the attempt', format('select get_attempt(%L)', :'aid'), 'ATTEMPT_NOT_FOUND');
select t_raises('other student cannot submit it', format('select submit_attempt(%L)', :'aid'), 'ATTEMPT_NOT_FOUND');
select t_check('other student sees no attempts', (select count(*) from attempts) = 0);
select t_raises('student cannot call admin_stats', 'select admin_stats()', 'ADMIN_ONLY');
select t_raises('student cannot import questions', 'select admin_import_questions(''[]'')', 'ADMIN_ONLY');
select t_raises('student cannot call _finalize', format('select _finalize(%L, ''submitted'')', :'aid'), 'permission denied');
select t_raises('student cannot edit scores', format('update attempts set score = 120 where id = %L', :'aid'), 'permission denied');
select t_check('student update of other''s attempt affects 0 rows',
  (select count(*) from attempts where id = :'aid') = 0);
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false) \gset x
select t_raises('anonymous cannot start a test', 'select start_attempt(''full_mock'')', 'permission denied');
reset role;

-- ================= timer expiry =================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false) \gset x
select start_attempt('exam_simulation') as sim \gset
reset role;
update attempts set started_at = now() - interval '125 minutes', deadline_at = now() - interval '5 minutes' where id = :'sim';
set role authenticated;
select t_check('save after deadline auto-submits', save_answers(:'sim', '[]')->>'status' = 'auto_submitted');
select t_check('auto-submitted time capped at 120 min',
  (select time_taken_seconds = 7200 and status = 'auto_submitted' from attempts where id = :'sim'));
select t_check('generated simulation title', (select title = 'Real Exam Simulation' from attempts where id = :'sim'));
reset role;

-- ================= admin =================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false) \gset x
select admin_import_questions('[
 {"question":"Test import Q1?","optionA":"a1","optionB":"b1","optionC":"c1","optionD":"d1","correctAnswer":"c","explanation":"because","subject":"Physics","topic":"Waves","difficulty":"Exam Level","source":"original","year":""},
 {"question":"Test import Q2?","optionA":"a","optionB":"a","optionC":"c","optionD":"d","correctAnswer":"A","explanation":"x","subject":"physics","topic":"waves"},
 {"question":"Test import Q3?","optionA":"a","optionB":"b","optionC":"c","optionD":"d","correctAnswer":"E","explanation":"x","subject":"physics","topic":"waves"},
 {"question":"Test import Q4?","optionA":"a","optionB":"b","optionC":"c","optionD":"d","correctAnswer":"2","explanation":"x","subject":"Nope","topic":"waves"},
 {"question":"test import q1?","optionA":"a","optionB":"b","optionC":"c","optionD":"d","correctAnswer":"B","explanation":"x","subject":"physics","topic":"waves"},
 {"question":"Official Q?","optionA":"a","optionB":"b","optionC":"c","optionD":"d","correctAnswer":"B","explanation":"x","subject":"physics","topic":"waves","source":"official"}
]') as imp \gset
select t_check('import: 1 inserted, 5 rejected with reasons',
  (:'imp'::jsonb->>'inserted')::int = 1 and (:'imp'::jsonb->>'failed')::int = 5);
select string_agg('      row ' || (e->>'row') || ': ' || (e->>'message'), E'\n') from jsonb_array_elements(:'imp'::jsonb->'errors') e;
select t_check('admin list total = 227', (admin_list_questions()->>'total')::int = 227);
insert into tests (id, kind, title, is_published) values ('00000000-0000-0000-0000-0000000000f2', 'full_mock', 'Fixed Mock', true);
select t_check('admin_fill_test fills 120', admin_fill_test('00000000-0000-0000-0000-0000000000f2') = 120);
select t_check('filled mock passes blueprint check',
  not exists (select 1 from mock_blueprint_errors('00000000-0000-0000-0000-0000000000f2')));
select t_check('deleting an attempted question deactivates it',
  admin_delete_question((select question_id from user_question_progress limit 1)) = 'deactivated');
select t_check('deleting an unused question deletes it',
  admin_delete_question((select id from questions q where not exists (select 1 from attempt_questions a where a.question_id = q.id)
                           and not exists (select 1 from test_questions t where t.question_id = q.id) limit 1)) = 'deleted');
select t_check('admin_stats sees 3 users', (admin_stats()->>'users')::int = 3);
insert into tests (id, kind, title, paper_year, is_published) values
  ('00000000-0000-0000-0000-0000000000f3', 'previous_paper', 'Empty Paper', 2024, true);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false) \gset x
select t_raises('paper with no questions cannot start',
  'select start_attempt(''previous_paper'', ''00000000-0000-0000-0000-0000000000f3'')', 'PAPER_HAS_NO_QUESTIONS');
select start_attempt('full_mock', '00000000-0000-0000-0000-0000000000f2') as fx \gset
select t_check('fixed mock keeps its 120 questions in section order',
  (select string_agg(s->>'count', '/' order by (s->>'start')::int) from jsonb_array_elements(get_attempt(:'fx')->'sections') s)
  = '15/15/15/15/24/24/12');
reset role;
