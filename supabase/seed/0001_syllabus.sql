-- Syllabus seed: the 7 exam subjects with their question counts, and every topic.
-- Topics = the platform spec's list plus gaps found by analysing the 2016/2018/2021
-- Operations papers (marked "-- from papers"). See docs/reference-analysis.md.

insert into subjects (slug, name, short_name, part, questions_in_exam, sort_order) values
  ('english',      'English Language',                    'English',      'A', 15, 1),
  ('reasoning',    'Reasoning Aptitude',                  'Reasoning',    'A', 15, 2),
  ('quant',        'Quantitative Aptitude',               'Quantitative', 'A', 15, 3),
  ('ga-aviation',  'General Awareness & Aviation Industry','GA & Aviation','A', 15, 4),
  ('physics',      'Physics',                             'Physics',      'B', 24, 5),
  ('mathematics',  'Mathematics',                         'Mathematics',  'B', 24, 6),
  ('management',   'General Principles of Business Management', 'Management', 'B', 12, 7);

insert into topics (subject_id, slug, name, topic_group, sort_order)
select s.id, t.slug, t.name, t.grp, t.ord
from (values
  -- ================= English =================
  ('english','vocabulary','Vocabulary','Vocabulary',1),
  ('english','synonyms','Synonyms','Vocabulary',2),
  ('english','antonyms','Antonyms','Vocabulary',3),
  ('english','idioms-phrases','Idioms & Phrases','Vocabulary',4),              -- from papers
  ('english','one-word-substitution','One-Word Substitution','Vocabulary',5),  -- from papers
  ('english','spelling','Spelling','Vocabulary',6),                            -- from papers
  ('english','grammar','Grammar','Grammar',7),
  ('english','tenses','Tenses','Grammar',8),
  ('english','articles','Articles','Grammar',9),
  ('english','prepositions','Prepositions','Grammar',10),
  ('english','subject-verb-agreement','Subject-Verb Agreement','Grammar',11),
  ('english','active-passive','Active & Passive Voice','Grammar',12),
  ('english','direct-indirect','Direct & Indirect Speech','Grammar',13),
  ('english','error-detection','Error Detection','Sentence Skills',14),
  ('english','sentence-improvement','Sentence Improvement','Sentence Skills',15),
  ('english','fill-blanks','Fill in the Blanks','Sentence Skills',16),
  ('english','cloze-test','Cloze Test','Passages',17),
  ('english','reading-comprehension','Reading Comprehension','Passages',18),
  ('english','para-jumbles','Para Jumbles','Passages',19),

  -- ================= Reasoning =================
  ('reasoning','number-series','Number Series','Series',1),
  ('reasoning','alphabet-series','Alphabet Series','Series',2),
  ('reasoning','letter-number-symbol-series','Letter-Number-Symbol Series','Series',3), -- from papers
  ('reasoning','coding-decoding','Coding-Decoding','Verbal',4),
  ('reasoning','blood-relations','Blood Relations','Verbal',5),
  ('reasoning','direction-sense','Direction Sense','Verbal',6),
  ('reasoning','analogy','Analogy','Verbal',7),
  ('reasoning','classification','Classification','Verbal',8),
  ('reasoning','odd-one-out','Odd One Out','Verbal',9),
  ('reasoning','ranking','Ranking','Arrangement',10),
  ('reasoning','seating-arrangement','Seating Arrangement','Arrangement',11),
  ('reasoning','puzzles','Puzzles','Arrangement',12),
  ('reasoning','logical-word-order','Logical Word Order','Arrangement',13),    -- from papers
  ('reasoning','mathematical-operations','Mathematical Operations','Analytical',14), -- from papers
  ('reasoning','inequalities','Inequalities','Analytical',15),               -- from papers
  ('reasoning','syllogism','Syllogism','Logical',16),
  ('reasoning','statement-conclusions','Statement & Conclusions','Logical',17),
  ('reasoning','statement-arguments','Statement & Arguments','Logical',18),   -- from papers
  ('reasoning','logical-reasoning','Logical Reasoning','Logical',19),
  ('reasoning','visual-memory','Visual Memory','Non-Verbal',20),
  ('reasoning','non-verbal','Non-Verbal Reasoning','Non-Verbal',21),
  ('reasoning','mirror-water-images','Mirror & Water Images','Non-Verbal',22), -- from papers
  ('reasoning','figure-counting','Figure Counting','Non-Verbal',23),         -- from papers
  ('reasoning','dice-cubes','Dice & Cubes','Non-Verbal',24),                 -- from papers

  -- ================= Quantitative Aptitude =================
  ('quant','number-system','Number System','Arithmetic',1),
  ('quant','simplification','Simplification','Arithmetic',2),
  ('quant','percentage','Percentage','Arithmetic',3),
  ('quant','ratio-proportion','Ratio & Proportion','Arithmetic',4),
  ('quant','partnership','Partnership','Arithmetic',5),                 -- from papers
  ('quant','average','Average','Arithmetic',6),
  ('quant','ages','Problems on Ages','Arithmetic',7),                   -- from papers
  ('quant','mixture-alligation','Mixture & Alligation','Arithmetic',8), -- from papers
  ('quant','profit-loss','Profit & Loss','Commercial',9),
  ('quant','discount','Discount','Commercial',10),                      -- from papers
  ('quant','simple-interest','Simple Interest','Commercial',11),
  ('quant','compound-interest','Compound Interest','Commercial',12),
  ('quant','time-work','Time & Work','Rate Problems',13),
  ('quant','pipes-cisterns','Pipes & Cisterns','Rate Problems',14),
  ('quant','time-speed-distance','Time, Speed & Distance','Rate Problems',15),
  ('quant','boats-streams','Boats & Streams','Rate Problems',16),
  ('quant','algebra','Algebra','Advanced',17),
  ('quant','geometry','Geometry','Advanced',18),
  ('quant','mensuration','Mensuration','Advanced',19),
  ('quant','probability','Probability','Advanced',20),
  ('quant','permutation-combination','Permutation & Combination','Advanced',21),
  ('quant','data-interpretation','Data Interpretation','Data',22),

  -- ================= GA & Aviation =================
  -- topic_group 'Aviation' vs 'Static GK' drives the ~11 + 4 split in mocks
  ('ga-aviation','current-affairs','Current Affairs','Static GK',1),
  ('ga-aviation','indian-history','Indian History','Static GK',2),       -- from papers
  ('ga-aviation','indian-geography','Indian Geography','Static GK',3),
  ('ga-aviation','indian-economy','Indian Economy','Static GK',4),
  ('ga-aviation','indian-polity','Indian Polity','Static GK',5),
  ('ga-aviation','general-science','General Science','Static GK',6),
  ('ga-aviation','government-schemes','Important Government Schemes','Static GK',7),
  ('ga-aviation','aai','AAI','Aviation',8),
  ('ga-aviation','icao','ICAO','Aviation',9),
  ('ga-aviation','iata','IATA','Aviation',10),
  ('ga-aviation','dgca','DGCA','Aviation',11),
  ('ga-aviation','bcas','BCAS','Aviation',12),
  ('ga-aviation','aera','AERA','Aviation',13),                            -- from papers
  ('ga-aviation','intl-aviation-orgs','International Aviation Organizations','Aviation',14),
  ('ga-aviation','civil-aviation-policies','Civil Aviation Policies (incl. UDAN)','Aviation',15),
  ('ga-aviation','airports-india','Airports in India','Aviation',16),
  ('ga-aviation','major-indian-airports','Major Indian Airports','Aviation',17),
  ('ga-aviation','airport-codes','Indian Airport Codes','Aviation',18),
  ('ga-aviation','aviation-abbreviations','Aviation Abbreviations','Aviation',19),
  ('ga-aviation','airlines-manufacturers','Airlines & Aircraft Manufacturers','Aviation',20), -- from papers
  ('ga-aviation','airport-operations','Airport Operations','Aviation',21),
  ('ga-aviation','passenger-processing','Passenger Processing (incl. Customs)','Aviation',22),
  ('ga-aviation','check-in','Check-in Process','Aviation',23),
  ('ga-aviation','security-process','Security Process','Aviation',24),
  ('ga-aviation','boarding','Boarding Process','Aviation',25),
  ('ga-aviation','baggage','Baggage Handling','Aviation',26),
  ('ga-aviation','terminals','Airport Terminals','Aviation',27),
  ('ga-aviation','runways','Runways','Aviation',28),
  ('ga-aviation','aprons','Aprons & Taxiways','Aviation',29),
  ('ga-aviation','atc-basics','ATC Basics','Aviation',30),
  ('ga-aviation','cns-navaids','CNS & Navigation Aids (ILS, VOR, DME)','Aviation',31), -- from papers
  ('ga-aviation','aviation-meteorology','Aviation Meteorology (METAR)','Aviation',32),  -- from papers
  ('ga-aviation','flight-basics','Aircraft & Flight Basics','Aviation',33),             -- from papers
  ('ga-aviation','aviation-safety','Aviation Safety','Aviation',34),

  -- ================= Physics =================
  ('physics','units-measurements','Units & Measurements','Mechanics',1),
  ('physics','motion','Motion','Mechanics',2),
  ('physics','laws-of-motion','Laws of Motion','Mechanics',3),
  ('physics','work-energy-power','Work, Energy & Power','Mechanics',4),
  ('physics','system-of-particles','System of Particles','Mechanics',5),
  ('physics','rotational-motion','Rotational Motion','Mechanics',6),
  ('physics','gravitation','Gravitation','Mechanics',7),
  ('physics','properties-of-matter','Properties of Matter','Mechanics',8),
  ('physics','thermodynamics','Thermodynamics','Heat',9),
  ('physics','kinetic-theory','Kinetic Theory','Heat',10),
  ('physics','oscillations','Oscillations','Waves',11),
  ('physics','waves','Waves','Waves',12),
  ('physics','electrostatics','Electrostatics','Electricity & Magnetism',13),
  ('physics','current-electricity','Current Electricity','Electricity & Magnetism',14),
  ('physics','moving-charges-magnetism','Moving Charges & Magnetism','Electricity & Magnetism',15),
  ('physics','magnetism','Magnetism & Matter','Electricity & Magnetism',16),
  ('physics','emi','Electromagnetic Induction','Electricity & Magnetism',17),
  ('physics','alternating-current','Alternating Current','Electricity & Magnetism',18),
  ('physics','em-waves','Electromagnetic Waves','Electricity & Magnetism',19),
  ('physics','ray-optics','Ray Optics','Optics',20),
  ('physics','wave-optics','Wave Optics','Optics',21),
  ('physics','dual-nature','Dual Nature of Radiation & Matter','Modern Physics',22),
  ('physics','atoms','Atoms','Modern Physics',23),
  ('physics','nuclei','Nuclei','Modern Physics',24),
  ('physics','semiconductors','Semiconductor Electronics & Logic Gates','Modern Physics',25),
  ('physics','communication-systems','Communication Systems','Modern Physics',26),

  -- ================= Mathematics =================
  ('mathematics','sets','Sets','Algebra',1),
  ('mathematics','relations','Relations','Algebra',2),
  ('mathematics','functions','Functions','Algebra',3),
  ('mathematics','complex-numbers','Complex Numbers','Algebra',4),
  ('mathematics','quadratic-equations','Quadratic Equations','Algebra',5),
  ('mathematics','permutations-combinations','Permutations & Combinations','Algebra',6),
  ('mathematics','binomial-theorem','Binomial Theorem','Algebra',7),
  ('mathematics','sequences-series','Sequences & Series','Algebra',8),
  ('mathematics','matrices','Matrices','Algebra',9),
  ('mathematics','determinants','Determinants','Algebra',10),
  ('mathematics','trigonometry','Trigonometry','Trigonometry',11),
  ('mathematics','inverse-trigonometry','Inverse Trigonometric Functions','Trigonometry',12), -- from papers
  ('mathematics','straight-lines','Straight Lines','Coordinate Geometry',13),
  ('mathematics','circles','Circles','Coordinate Geometry',14),
  ('mathematics','conic-sections','Conic Sections','Coordinate Geometry',15),
  ('mathematics','vectors','Vectors','Vectors & 3D',16),
  ('mathematics','3d-geometry','Three-Dimensional Geometry','Vectors & 3D',17),
  ('mathematics','limits','Limits','Calculus',18),
  ('mathematics','continuity','Continuity & Differentiability','Calculus',19),
  ('mathematics','differentiation','Differentiation','Calculus',20),
  ('mathematics','applications-derivatives','Applications of Derivatives','Calculus',21),
  ('mathematics','indefinite-integration','Indefinite Integration','Calculus',22),
  ('mathematics','definite-integration','Definite Integration','Calculus',23),
  ('mathematics','applications-integration','Applications of Integration','Calculus',24),
  ('mathematics','differential-equations','Differential Equations','Calculus',25),
  ('mathematics','probability','Probability','Statistics & Probability',26),
  ('mathematics','statistics','Statistics','Statistics & Probability',27),

  -- ================= Management =================
  ('management','meaning-of-management','Meaning & Nature of Management','Management Fundamentals',1),
  ('management','levels-roles','Levels of Management & Managerial Roles','Management Fundamentals',2), -- from papers (Mintzberg)
  ('management','functions-of-management','Functions of Management','Management Fundamentals',3),
  ('management','planning','Planning (incl. MBO)','Management Fundamentals',4),
  ('management','organizing','Organizing, Delegation & Decentralisation','Management Fundamentals',5),
  ('management','staffing','Staffing','Management Fundamentals',6),
  ('management','directing','Directing','Management Fundamentals',7),
  ('management','controlling','Controlling','Management Fundamentals',8),
  ('management','coordination','Coordination','Management Fundamentals',9),
  ('management','decision-making','Decision Making','Management Fundamentals',10),
  ('management','scientific-management','Scientific Management (Taylor)','Management Thought',11),  -- from papers
  ('management','fayol-principles','Fayol''s Principles of Management','Management Thought',12),    -- from papers
  ('management','bureaucracy','Bureaucracy (Weber)','Management Thought',13),                       -- from papers
  ('management','human-relations','Human Relations & Hawthorne Studies','Management Thought',14),  -- from papers
  ('management','strategic-management','Strategic Management & Core Competence','Management Thought',15), -- from papers
  ('management','mis','Management Information Systems','Management Thought',16),                   -- from papers
  ('management','individual-behaviour','Individual Behaviour','Organizational Behaviour',17),
  ('management','group-behaviour','Group Behaviour','Organizational Behaviour',18),
  ('management','organizational-culture','Organizational Culture','Organizational Behaviour',19),
  ('management','communication','Communication','Organizational Behaviour',20),
  ('management','conflict','Conflict','Organizational Behaviour',21),
  ('management','teamwork','Teamwork','Organizational Behaviour',22),
  ('management','leadership-concepts','Leadership Concepts','Leadership',23),
  ('management','leadership-styles','Leadership Styles','Leadership',24),
  ('management','trait-theory','Trait Theory','Leadership',25),
  ('management','behavioural-theory','Behavioural Theory','Leadership',26),
  ('management','situational-leadership','Situational Leadership','Leadership',27),
  ('management','maslow','Maslow''s Theory','Motivation',28),
  ('management','herzberg','Herzberg''s Theory','Motivation',29),
  ('management','mcgregor','McGregor Theory X & Y','Motivation',30),
  ('management','theory-z','Ouchi''s Theory Z','Motivation',31),                                   -- from papers
  ('management','motivation-concepts','Motivation Concepts','Motivation',32),
  ('management','recruitment','Recruitment','Human Resource Management',33),
  ('management','selection','Selection','Human Resource Management',34),
  ('management','training','Training','Human Resource Management',35),
  ('management','performance-appraisal','Performance Appraisal','Human Resource Management',36),
  ('management','compensation','Compensation','Human Resource Management',37),
  ('management','employee-relations','Employee Relations','Human Resource Management',38),
  ('management','marketing-fundamentals','Marketing Fundamentals','Marketing',39),
  ('management','marketing-mix','Marketing Mix','Marketing',40),
  ('management','product','Product','Marketing',41),
  ('management','price','Price','Marketing',42),
  ('management','place','Place','Marketing',43),
  ('management','promotion','Promotion','Marketing',44),
  ('management','consumer-behaviour','Consumer Behaviour','Marketing',45),
  ('management','branding','Branding','Marketing',46)
) as t(subject_slug, slug, name, grp, ord)
join subjects s on s.slug = t.subject_slug;

insert into app_settings (key, value) values
  ('exam_datetime',        '"2026-10-21T00:00:00+05:30"'),
  ('mock_duration_minutes','120'),
  ('topic_status_thresholds', '{"needs_revision_below": 60, "strong_above": 80, "min_attempts": 10}'),
  ('ga_mock_split',        '{"Aviation": 11, "Static GK": 4}'),
  ('full_mock_verified_only', 'true');
