export type GradeSystem = "percentage" | "letter" | "gpa";

export interface Profile {
  id: string; // matches auth.users(id)
  username: string; // display name e.g. "Ahmed"
  email?: string;
  grade_level: string; // e.g. "Grade 10", "Year 11", "O-Level"
  curriculum?: string; // optional curriculum
  created_at?: string;
}

export interface Subject {
  id: string;
  user_id?: string;
  name: string;
  current_score: number; // 0 - 100
  current_grade?: string; // e.g. "B", "A-"
  target_score: number; // 0 - 100
  target_grade: string; // e.g. "A*"
  weak_topics: string[]; // e.g. ["Cell Division", "Photosynthesis"]
  color?: string;
  created_at?: string;
}

export interface AcademicHistory {
  id: string;
  user_id?: string;
  subject_id: string;
  subject_name: string;
  exam_name: string; // e.g. "Midterm", "Unit 1 Quiz"
  score: number;
  grade?: string;
  exam_date?: string;
}

export type PriorityLevel = "high" | "medium" | "low";

export interface Assessment {
  id: string;
  user_id?: string;
  subject_id: string;
  subject_name: string;
  name: string; // e.g. "Biology Unit Test"
  assessment_date: string; // YYYY-MM-DD
  topics: string[];
  priority: PriorityLevel;
  notes?: string;
}

export interface StudyPreference {
  id?: string;
  user_id?: string;
  daily_minutes: number; // e.g. 60
  preferred_start_time: string; // e.g. "17:00"
}

export interface Interest {
  id?: string;
  user_id?: string;
  interest_name: string;
}

export type QuestType =
  | "Learn"
  | "Review"
  | "Practice"
  | "Revision"
  | "Mistake Review"
  | "Test Preparation";

export interface Quest {
  id: string;
  user_id?: string;
  subject_id: string;
  subject_name: string;
  title: string;
  description: string;
  quest_type: QuestType;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // e.g. "5:00 PM"
  duration_minutes: number;
  xp: number;
  completed: boolean;
  completed_at?: string;
  topic?: string;
  accumulated_focus_seconds?: number;
  why_this_quest?: string;
}

export interface UserProgress {
  user_id?: string;
  xp: number;
  level: number;
  streak: number;
  last_activity_date?: string;
  total_quests_completed: number;
  total_minutes_studied: number;
}

export interface StudyRecommendation {
  id: string;
  title: string;
  category: "urgent_test" | "target_gap" | "weak_topic" | "time_allocation" | "extracurricular";
  content: string;
  subject?: string;
  actionable_step: string;
}

export type SessionStatus = "running" | "paused" | "break" | "completed" | "ended_early";

export interface StudySession {
  id: string;
  user_id: string;
  quest_id: string;
  quest_title: string;
  subject_name: string;
  status: SessionStatus;
  required_duration_seconds: number;
  accumulated_focus_seconds: number;
  focus_started_at: number | null; // epoch ms when current focus segment began
  paused_at: number | null; // epoch ms when paused
  break_started_at: number | null; // epoch ms when break began
  break_duration_seconds: number; // planned break duration in seconds
  accumulated_break_seconds: number; // total break time in seconds
  planned_break_used: boolean;
  session_started_at: number; // epoch ms when session was first launched
  completed_at?: string;
}

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type CommitmentCategory =
  | "Tuition"
  | "Academy"
  | "Sports"
  | "Prayer"
  | "Family"
  | "Extracurricular"
  | "Other";

export interface FixedCommitment {
  id: string;
  user_id?: string;
  title: string;
  category: CommitmentCategory;
  days: DayOfWeek[];
  start_time: string; // "HH:MM" 24h
  end_time: string; // "HH:MM" 24h
}

export type BlockType =
  | "study"
  | "school"
  | "travel"
  | "break"
  | "meal"
  | "commitment"
  | "sleep"
  | "custom";

export interface TimetableBlock {
  id: string;
  user_id?: string;
  title: string;
  block_type: BlockType;
  day_of_week: DayOfWeek;
  start_time: string; // "HH:MM" 24h
  end_time: string; // "HH:MM" 24h
  duration_minutes: number;
  subject_id?: string;
  subject_name?: string;
  quest_id?: string;
  is_completed?: boolean;
  notes?: string;
}

export interface TimetableConfig {
  school_start: string; // "07:30"
  school_end: string; // "14:00"
  travel_to_school_minutes: number;
  travel_home_minutes: number;
  sleep_time: string; // "23:00"
  wake_time: string; // "06:30"
  daily_study_minutes: number; // 30, 60, 90, 120, etc.
  preferred_study_periods: Array<"morning" | "after_school" | "evening" | "night">;
  focus_duration_minutes: number; // 25, 45, 60, etc.
  break_duration_minutes: number; // 5, 10, 15, etc.
}
