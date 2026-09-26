export type TestKind =
  | "full_mock" | "exam_simulation" | "previous_paper"
  | "subject_practice" | "topic_practice" | "mistake_practice";

export type Palette = "not_visited" | "not_answered" | "answered" | "marked" | "answered_marked";

export interface AttemptQuestion {
  position: number;
  question_id: string;
  subject_id: number;
  subject: string;
  topic_id: number;
  topic: string;
  text: string;
  image_url: string | null;
  options: string[];
  selected: number | null;
  palette: Palette;
  time_spent: number;
  source: string;
  year: number | null;
  exam: string | null;
  // revealed after submission
  correct?: number;
  is_correct?: boolean | null;
  explanation?: string;
  concept?: string | null;
  difficulty?: string;
}

export interface AttemptPayload {
  attempt: {
    id: string; kind: TestKind; status: "in_progress" | "submitted" | "auto_submitted";
    title: string | null; test_id: string | null; started_at: string; deadline_at: string | null;
    submitted_at: string | null; server_now: string; score: number | null; correct: number | null;
    incorrect: number | null; unattempted: number | null; time_taken_seconds: number | null; total: number;
  };
  sections: { subject_id: number; name: string; start: number; count: number }[];
  questions: AttemptQuestion[];
}

export interface ResultPayload {
  subjects: { subject_id: number; name: string; total: number; correct: number; incorrect: number;
              unattempted: number; accuracy: number | null; time: number }[];
  topics: { topic_id: number; name: string; subject: string; total: number; correct: number;
            attempted: number; accuracy: number | null }[];
  avg_time_per_question: number;
  slow_questions: { position: number; time: number; is_correct: boolean | null }[];
}

export interface SubjectProgress {
  subject_id: number; name: string; short_name: string; part: "A" | "B";
  total: number; attempted: number; remaining: number; correct: number;
  coverage: number; accuracy: number | null; avg_mock_score: number | null;
  strength: "strong" | "average" | "weak" | null;
}

export interface Dashboard {
  overall: { total_questions: number; attempted: number; correct: number; coverage: number; accuracy: number | null };
  mocks: { completed: number; available: number; avg_score: number | null; avg_total: number | null; avg_minutes: number | null };
  subjects: SubjectProgress[];
  weak_topics: { topic_id: number; name: string; subject: string; accuracy: number; attempted: number }[];
  recent_mocks: { attempt_id: string; title: string; score: number; total: number; submitted_at: string }[];
  today: { questions: number; mocks: number; topics: number };
  targets: { questions_per_day: number; mocks_per_day: number; topics_per_day: number } | null;
  streak: number;
  totals: { answers: number; tests_completed: number; sessions: number; topics_completed: number };
  live_attempt: { attempt_id: string; title: string; deadline_at: string } | null;
}

export interface TopicProgress {
  topic_id: number; name: string; group: string | null; total: number; attempted: number; correct: number;
  coverage: number; accuracy: number | null;
  status: "not_started" | "in_progress" | "completed" | "needs_revision";
  strength: "strong" | "average" | "weak" | null;
}

export interface SyllabusSubject {
  subject_id: number; name: string; short_name: string; part: "A" | "B"; questions_in_exam: number;
  total: number; attempted: number; correct: number; coverage: number; accuracy: number | null;
  topics: TopicProgress[];
}

export interface TestCard {
  id: string; title: string; kind: TestKind; series_label: string | null; series_number: number | null;
  description: string | null; paper_year: number | null; paper_shift: string | null; duration: number;
  question_count: number; fixed: boolean; attempts: number; best_score: number | null;
  in_progress: string | null; sources: string[] | null;
}

export interface ReviewQuestion {
  question_id: string; text: string; image_url: string | null; options: string[];
  correct: number | null; explanation?: string | null; concept?: string | null;
  subject: string; topic: string; topic_id: number;
}

export interface Mistake extends ReviewQuestion {
  subject_id: number; wrong_count: number; last_wrong_at: string; learned: boolean;
}

export interface Bookmark extends ReviewQuestion {
  category: string; created_at: string; revealed: boolean;
}
