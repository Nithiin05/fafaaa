\set ON_ERROR_STOP 0
\echo '== blueprint total (expect 120) =='
select sum(questions_in_exam) as total, count(*) as subjects from subjects;
\echo '== topics per subject =='
select s.short_name, count(t.*) from subjects s join topics t on t.subject_id = s.id group by s.id order by s.sort_order;

-- users
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', '{"full_name":"Admin"}'),
                              ('00000000-0000-0000-0000-00000000000b', '{"full_name":"Student"}');
update profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
\echo '== profile + targets auto-created (expect 2, 2) =='
select (select count(*) from profiles), (select count(*) from daily_targets);

-- a question (as superuser)
insert into questions (subject_id, topic_id, question_text, option_a, option_b, option_c, option_d,
                       correct_option, explanation)
select t.subject_id, t.id, 'Demo: SI unit of force?', 'Newton', 'Joule', 'Watt', 'Pascal', 'A', '1 N = 1 kg m/s^2'
from topics t where slug = 'units-measurements';

\echo '== duplicate question blocked (expect error) =='
insert into questions (subject_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
select t.subject_id, t.id, '  demo: SI unit   of force? ', 'a','b','c','d','A','x' from topics t where slug='units-measurements';

\echo '== topic/subject mismatch blocked (expect error) =='
insert into questions (subject_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
select 1, t.id, 'Mismatch', 'a','b','c','d','A','x' from topics t where slug='units-measurements';

\echo '== previous paper without year blocked (expect error) =='
insert into questions (subject_id, topic_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, source)
select t.subject_id, t.id, 'No year', 'a','b','c','d','A','x','previous_official' from topics t where slug='units-measurements';

-- ===== as student =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
\echo '== student reads questions (expect 0 rows) =='
select count(*) from questions;
\echo '== student reads topics (expect > 0) =='
select count(*) from topics;
\echo '== student promotes self to admin (expect permission error) =='
update profiles set role = 'admin' where id = auth.uid();
\echo '== student renames self (expect UPDATE 1) =='
update profiles set full_name = 'Chandra' where id = auth.uid();
\echo '== student inserts attempt directly (expect permission error) =='
insert into attempts (user_id, kind, score) values (auth.uid(), 'full_mock', 120);
\echo '== student inserts own mistake (expect permission error) =='
insert into mistakes (user_id, question_id) select auth.uid(), id from questions;
\echo '== student sets own daily target (expect UPDATE 1) =='
update daily_targets set questions_per_day = 150 where user_id = auth.uid();
\echo '== student edits another user target (expect UPDATE 0) =='
update daily_targets set questions_per_day = 1 where user_id = '00000000-0000-0000-0000-00000000000a';

-- ===== as admin =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
\echo '== admin reads questions (expect 227 = 226 seed + 1) =='
select count(*) from questions;
\echo '== admin reads all profiles (expect 2) =='
select count(*) from profiles;
reset role;

\echo '== blueprint check on empty mock (expect 7 rows of errors) =='
insert into tests (id, kind, title) values ('00000000-0000-0000-0000-0000000000f1', 'full_mock', 'Mock 01');
select * from mock_blueprint_errors('00000000-0000-0000-0000-0000000000f1');
