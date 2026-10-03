import {
  Profile,
  Subject,
  AcademicHistory,
  Assessment,
  StudyPreference,
  Interest,
  Quest,
  UserProgress,
  StudyRecommendation,
  StudySession,
  TimetableBlock,
  FixedCommitment,
  TimetableConfig,
} from "@/types";
import { generateDailyQuests } from "../planning/studyPlanEngine";
import { generateDeterministicRecommendations } from "../planning/recommendationEngine";
import { calculateNewStreak, getLevelInfo } from "../gamification/levels";
import {
  DEFAULT_TIMETABLE_CONFIG,
  generateFullTimetable,
} from "../planning/timetableEngine";

export interface StudentPortalData {
  userId: string;
  subjects: Subject[];
  academicHistory: AcademicHistory[];
  assessments: Assessment[];
  studyPreferences: StudyPreference;
  interests: Interest[];
  quests: Quest[];
  progress: UserProgress;
  recommendations: StudyRecommendation[];
  // Feature 1: Focus Timer Session
  activeSession?: StudySession | null;
  // Feature 2: Automatic Timetable Builder
  timetableConfig?: TimetableConfig;
  fixedCommitments?: FixedCommitment[];
  timetableBlocks?: TimetableBlock[];
}

/**
 * Returns an empty initial state for any new student account
 */
export function getInitialEmptyStudentData(userId: string): StudentPortalData {
  return {
    userId,
    subjects: [],
    academicHistory: [],
    assessments: [],
    studyPreferences: {
      user_id: userId,
      daily_minutes: 60,
      preferred_start_time: "17:00",
    },
    interests: [],
    quests: [],
    progress: {
      user_id: userId,
      xp: 0,
      level: 1,
      streak: 0,
      total_quests_completed: 0,
      total_minutes_studied: 0,
    },
    recommendations: [],
    activeSession: null,
    timetableConfig: DEFAULT_TIMETABLE_CONFIG,
    fixedCommitments: [],
    timetableBlocks: [],
  };
}

function getStorageKey(userId: string): string {
  return `schoolquest_student_data_${userId}`;
}

/**
 * Load student portal data strictly for the specified userId
 */
export function loadStudentData(userId: string): StudentPortalData {
  if (typeof window === "undefined" || !userId) {
    return getInitialEmptyStudentData(userId || "guest");
  }

  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      const fresh = getInitialEmptyStudentData(userId);
      saveStudentData(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      userId,
      activeSession: parsed.activeSession || null,
      timetableConfig: parsed.timetableConfig || DEFAULT_TIMETABLE_CONFIG,
      fixedCommitments: parsed.fixedCommitments || [],
      timetableBlocks: parsed.timetableBlocks || [],
      recommendations: generateDeterministicRecommendations({
        subjects: parsed.subjects || [],
        assessments: parsed.assessments || [],
        preferences: parsed.studyPreferences || { daily_minutes: 60, preferred_start_time: "17:00" },
        interests: parsed.interests || [],
      }),
    };
  } catch (err) {
    console.error("Error loading student data", err);
    return getInitialEmptyStudentData(userId);
  }
}

/**
 * Save student portal data strictly under the user's isolated key
 */
export function saveStudentData(data: StudentPortalData): void {
  if (typeof window === "undefined" || !data.userId) return;
  try {
    localStorage.setItem(getStorageKey(data.userId), JSON.stringify(data));
  } catch (err) {
    console.error("Error saving student data", err);
  }
}

// ==========================================
// CRUD: SUBJECTS
// ==========================================

export function addSubjectToStudent(
  current: StudentPortalData,
  subject: Omit<Subject, "id" | "user_id">
): StudentPortalData {
  const newSubject: Subject = {
    ...subject,
    id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: current.userId,
    weak_topics: subject.weak_topics || [],
    created_at: new Date().toISOString(),
  };

  const updatedSubjects = [...current.subjects, newSubject];
  const newQuests = generateDailyQuests(
    updatedSubjects,
    current.assessments,
    current.studyPreferences
  );

  const updated: StudentPortalData = {
    ...current,
    subjects: updatedSubjects,
    quests: newQuests,
    recommendations: generateDeterministicRecommendations({
      subjects: updatedSubjects,
      assessments: current.assessments,
      preferences: current.studyPreferences,
      interests: current.interests,
    }),
  };

  saveStudentData(updated);
  return updated;
}

export function updateSubjectInStudent(
  current: StudentPortalData,
  subjectId: string,
  updates: Partial<Subject>
): StudentPortalData {
  const updatedSubjects = current.subjects.map((s) =>
    s.id === subjectId ? { ...s, ...updates } : s
  );

  const newQuests = generateDailyQuests(
    updatedSubjects,
    current.assessments,
    current.studyPreferences
  );

  const updated: StudentPortalData = {
    ...current,
    subjects: updatedSubjects,
    quests: newQuests,
    recommendations: generateDeterministicRecommendations({
      subjects: updatedSubjects,
      assessments: current.assessments,
      preferences: current.studyPreferences,
      interests: current.interests,
    }),
  };

  saveStudentData(updated);
  return updated;
}

export function deleteSubjectFromStudent(
  current: StudentPortalData,
  subjectId: string
): StudentPortalData {
  const updatedSubjects = current.subjects.filter((s) => s.id !== subjectId);
  const updatedAssessments = current.assessments.filter((a) => a.subject_id !== subjectId);
  const updatedHistory = current.academicHistory.filter((h) => h.subject_id !== subjectId);
  const newQuests = generateDailyQuests(
    updatedSubjects,
    updatedAssessments,
    current.studyPreferences
  );

  const updated: StudentPortalData = {
    ...current,
    subjects: updatedSubjects,
    assessments: updatedAssessments,
    academicHistory: updatedHistory,
    quests: newQuests,
    recommendations: generateDeterministicRecommendations({
      subjects: updatedSubjects,
      assessments: updatedAssessments,
      preferences: current.studyPreferences,
      interests: current.interests,
    }),
  };

  saveStudentData(updated);
  return updated;
}

// ==========================================
// CRUD: ASSESSMENTS / UPCOMING TESTS
// ==========================================

export function addAssessmentToStudent(
  current: StudentPortalData,
  assessment: Omit<Assessment, "id" | "user_id">
): StudentPortalData {
  const newAsmt: Assessment = {
    ...assessment,
    id: `asmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: current.userId,
    topics: assessment.topics || [],
  };

  const updatedAssessments = [...current.assessments, newAsmt];
  const newQuests = generateDailyQuests(
    current.subjects,
    updatedAssessments,
    current.studyPreferences
  );

  const updated: StudentPortalData = {
    ...current,
    assessments: updatedAssessments,
    quests: newQuests,
    recommendations: generateDeterministicRecommendations({
      subjects: current.subjects,
      assessments: updatedAssessments,
      preferences: current.studyPreferences,
      interests: current.interests,
    }),
  };

  saveStudentData(updated);
  return updated;
}

export function deleteAssessmentFromStudent(
  current: StudentPortalData,
  assessmentId: string
): StudentPortalData {
  const updatedAssessments = current.assessments.filter((a) => a.id !== assessmentId);
  const newQuests = generateDailyQuests(
    current.subjects,
    updatedAssessments,
    current.studyPreferences
  );

  const updated: StudentPortalData = {
    ...current,
    assessments: updatedAssessments,
    quests: newQuests,
    recommendations: generateDeterministicRecommendations({
      subjects: current.subjects,
      assessments: updatedAssessments,
      preferences: current.studyPreferences,
      interests: current.interests,
    }),
  };

  saveStudentData(updated);
  return updated;
}

// ==========================================
// CRUD: ACADEMIC HISTORY
// ==========================================

export function addHistoryToStudent(
  current: StudentPortalData,
  history: Omit<AcademicHistory, "id" | "user_id">
): StudentPortalData {
  const newHist: AcademicHistory = {
    ...history,
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: current.userId,
  };

  const updatedHistory = [newHist, ...current.academicHistory];
  const updated: StudentPortalData = {
    ...current,
    academicHistory: updatedHistory,
  };

  saveStudentData(updated);
  return updated;
}

export function deleteHistoryFromStudent(
  current: StudentPortalData,
  historyId: string
): StudentPortalData {
  const updatedHistory = current.academicHistory.filter((h) => h.id !== historyId);
  const updated: StudentPortalData = {
    ...current,
    academicHistory: updatedHistory,
  };
  saveStudentData(updated);
  return updated;
}

// ==========================================
// PREFERENCES & INTERESTS
// ==========================================

export function updateStudyPreferencesInStudent(
  current: StudentPortalData,
  preferences: StudyPreference
): StudentPortalData {
  const newQuests = generateDailyQuests(
    current.subjects,
    current.assessments,
    preferences
  );

  const updated: StudentPortalData = {
    ...current,
    studyPreferences: preferences,
    quests: newQuests,
    recommendations: generateDeterministicRecommendations({
      subjects: current.subjects,
      assessments: current.assessments,
      preferences,
      interests: current.interests,
    }),
  };

  saveStudentData(updated);
  return updated;
}

export function updateInterestsInStudent(
  current: StudentPortalData,
  interestNames: string[]
): StudentPortalData {
  const newInterests: Interest[] = interestNames.map((name) => ({
    user_id: current.userId,
    interest_name: name,
  }));

  const updated: StudentPortalData = {
    ...current,
    interests: newInterests,
    recommendations: generateDeterministicRecommendations({
      subjects: current.subjects,
      assessments: current.assessments,
      preferences: current.studyPreferences,
      interests: newInterests,
    }),
  };

  saveStudentData(updated);
  return updated;
}

// ==========================================
// QUESTS & GAMIFICATION
// ==========================================

export function regenerateStudentQuests(current: StudentPortalData): StudentPortalData {
  const newQuests = generateDailyQuests(
    current.subjects,
    current.assessments,
    current.studyPreferences
  );

  const updated: StudentPortalData = {
    ...current,
    quests: newQuests,
  };
  saveStudentData(updated);
  return updated;
}

export function toggleQuestInStudent(
  current: StudentPortalData,
  questId: string
): { updatedData: StudentPortalData; gainedXp: number; leveledUp: boolean } {
  const questIndex = current.quests.findIndex((q) => q.id === questId);
  if (questIndex === -1) {
    return { updatedData: current, gainedXp: 0, leveledUp: false };
  }

  const targetQuest = current.quests[questIndex];
  const willBeCompleted = !targetQuest.completed;

  const xpDelta = willBeCompleted ? targetQuest.xp : -targetQuest.xp;
  const minutesDelta = willBeCompleted ? targetQuest.duration_minutes : -targetQuest.duration_minutes;
  const questCountDelta = willBeCompleted ? 1 : -1;

  const previousLevel = current.progress.level;
  const newXp = Math.max(0, current.progress.xp + xpDelta);
  const newLevelInfo = getLevelInfo(newXp);
  const leveledUp = willBeCompleted && newLevelInfo.level > previousLevel;

  const todayStr = new Date().toISOString().split("T")[0];
  let newStreak = current.progress.streak;
  if (willBeCompleted) {
    const streakResult = calculateNewStreak(
      current.progress.streak,
      current.progress.last_activity_date,
      todayStr
    );
    newStreak = streakResult.newStreak;
  }

  const updatedQuests = [...current.quests];
  updatedQuests[questIndex] = {
    ...targetQuest,
    completed: willBeCompleted,
    completed_at: willBeCompleted ? new Date().toISOString() : undefined,
    accumulated_focus_seconds: willBeCompleted ? targetQuest.duration_minutes * 60 : 0,
  };

  // Update matching timetable block
  const updatedBlocks = (current.timetableBlocks || []).map((b) =>
    b.quest_id === questId ? { ...b, is_completed: willBeCompleted } : b
  );

  const updatedData: StudentPortalData = {
    ...current,
    quests: updatedQuests,
    timetableBlocks: updatedBlocks,
    progress: {
      ...current.progress,
      xp: newXp,
      level: newLevelInfo.level,
      streak: newStreak,
      last_activity_date: willBeCompleted ? todayStr : current.progress.last_activity_date,
      total_quests_completed: Math.max(0, current.progress.total_quests_completed + questCountDelta),
      total_minutes_studied: Math.max(0, current.progress.total_minutes_studied + minutesDelta),
    },
  };

  saveStudentData(updatedData);
  return { updatedData, gainedXp: xpDelta, leveledUp };
}

// ==========================================
// FEATURE 1: FOCUS TIMER SESSION ACTIONS
// ==========================================

/**
 * Calculates current actual focus seconds for a session
 */
export function calculateCurrentFocusSeconds(session: StudySession): number {
  if (!session) return 0;
  let running = 0;
  if (session.status === "running" && session.focus_started_at) {
    running = Math.max(0, Math.floor((Date.now() - session.focus_started_at) / 1000));
  }
  return Math.min(
    session.required_duration_seconds,
    session.accumulated_focus_seconds + running
  );
}

/**
 * Calculates remaining focus seconds for a session
 */
export function calculateRemainingFocusSeconds(session: StudySession): number {
  if (!session) return 0;
  const currentFocus = calculateCurrentFocusSeconds(session);
  return Math.max(0, session.required_duration_seconds - currentFocus);
}

/**
 * Start or resume a focus session for a given quest
 */
export function startOrResumeStudySession(
  current: StudentPortalData,
  questId: string
): { updatedData: StudentPortalData; session: StudySession } {
  const quest = current.quests.find((q) => q.id === questId);
  const now = Date.now();

  // If active session matches this quest, recover/refresh it
  if (current.activeSession && current.activeSession.quest_id === questId) {
    const existing = current.activeSession;
    // If was running, keep running; if was completed, keep state
    return { updatedData: current, session: existing };
  }

  const durationMinutes = quest?.duration_minutes || 45;
  const requiredSeconds = durationMinutes * 60;
  const accumulated = quest?.accumulated_focus_seconds || 0;

  const newSession: StudySession = {
    id: `sess-${now}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: current.userId,
    quest_id: questId,
    quest_title: quest?.title || "Study Quest",
    subject_name: quest?.subject_name || "Study",
    status: "running",
    required_duration_seconds: requiredSeconds,
    accumulated_focus_seconds: accumulated,
    focus_started_at: now,
    paused_at: null,
    break_started_at: null,
    break_duration_seconds: (current.timetableConfig?.break_duration_minutes || 10) * 60,
    accumulated_break_seconds: 0,
    planned_break_used: false,
    session_started_at: now,
  };

  const updated: StudentPortalData = {
    ...current,
    activeSession: newSession,
  };

  saveStudentData(updated);
  return { updatedData: updated, session: newSession };
}

/**
 * Pause the active focus session
 */
export function pauseStudySession(
  current: StudentPortalData
): { updatedData: StudentPortalData; session: StudySession | null } {
  if (!current.activeSession || current.activeSession.status !== "running") {
    return { updatedData: current, session: current.activeSession || null };
  }

  const session = current.activeSession;
  const now = Date.now();
  const elapsed = session.focus_started_at
    ? Math.max(0, Math.floor((now - session.focus_started_at) / 1000))
    : 0;

  const updatedSession: StudySession = {
    ...session,
    status: "paused",
    accumulated_focus_seconds: Math.min(
      session.required_duration_seconds,
      session.accumulated_focus_seconds + elapsed
    ),
    focus_started_at: null,
    paused_at: now,
  };

  const updated: StudentPortalData = {
    ...current,
    activeSession: updatedSession,
  };

  saveStudentData(updated);
  return { updatedData: updated, session: updatedSession };
}

/**
 * Resume a paused or break focus session
 */
export function resumeStudySession(
  current: StudentPortalData
): { updatedData: StudentPortalData; session: StudySession | null } {
  if (!current.activeSession || current.activeSession.status === "running") {
    return { updatedData: current, session: current.activeSession || null };
  }

  const session = current.activeSession;
  const now = Date.now();
  let addedBreak = 0;

  if (session.status === "break" && session.break_started_at) {
    addedBreak = Math.max(0, Math.floor((now - session.break_started_at) / 1000));
  }

  const updatedSession: StudySession = {
    ...session,
    status: "running",
    accumulated_break_seconds: session.accumulated_break_seconds + addedBreak,
    break_started_at: null,
    focus_started_at: now,
    paused_at: null,
  };

  const updated: StudentPortalData = {
    ...current,
    activeSession: updatedSession,
  };

  saveStudentData(updated);
  return { updatedData: updated, session: updatedSession };
}

/**
 * Start a break during a focus session
 */
export function startStudySessionBreak(
  current: StudentPortalData,
  breakMinutes: number
): { updatedData: StudentPortalData; session: StudySession | null } {
  if (!current.activeSession) {
    return { updatedData: current, session: null };
  }

  const session = current.activeSession;
  const now = Date.now();
  let elapsedFocus = 0;

  if (session.status === "running" && session.focus_started_at) {
    elapsedFocus = Math.max(0, Math.floor((now - session.focus_started_at) / 1000));
  }

  const updatedSession: StudySession = {
    ...session,
    status: "break",
    accumulated_focus_seconds: Math.min(
      session.required_duration_seconds,
      session.accumulated_focus_seconds + elapsedFocus
    ),
    focus_started_at: null,
    paused_at: null,
    break_started_at: now,
    break_duration_seconds: breakMinutes * 60,
    planned_break_used: true,
  };

  const updated: StudentPortalData = {
    ...current,
    activeSession: updatedSession,
  };

  saveStudentData(updated);
  return { updatedData: updated, session: updatedSession };
}

/**
 * End a break early and return to focused study
 */
export function endStudySessionBreak(
  current: StudentPortalData
): { updatedData: StudentPortalData; session: StudySession | null } {
  if (!current.activeSession || current.activeSession.status !== "break") {
    return { updatedData: current, session: current.activeSession || null };
  }

  const session = current.activeSession;
  const now = Date.now();
  const breakElapsed = session.break_started_at
    ? Math.max(0, Math.floor((now - session.break_started_at) / 1000))
    : 0;

  const updatedSession: StudySession = {
    ...session,
    status: "running",
    accumulated_break_seconds: session.accumulated_break_seconds + breakElapsed,
    break_started_at: null,
    focus_started_at: now,
  };

  const updated: StudentPortalData = {
    ...current,
    activeSession: updatedSession,
  };

  saveStudentData(updated);
  return { updatedData: updated, session: updatedSession };
}

/**
 * End the focus session early:
 * Saves accumulated focus time to the quest, leaves quest incomplete, clears active session
 */
export function endStudySessionEarly(
  current: StudentPortalData
): { updatedData: StudentPortalData; savedMinutes: number } {
  if (!current.activeSession) {
    return { updatedData: current, savedMinutes: 0 };
  }

  const session = current.activeSession;
  const totalFocusSec = calculateCurrentFocusSeconds(session);
  const savedMinutes = Math.floor(totalFocusSec / 60);

  const updatedQuests = current.quests.map((q) =>
    q.id === session.quest_id
      ? {
          ...q,
          accumulated_focus_seconds: totalFocusSec,
          completed: false,
        }
      : q
  );

  const updated: StudentPortalData = {
    ...current,
    quests: updatedQuests,
    activeSession: null,
  };

  saveStudentData(updated);
  return { updatedData: updated, savedMinutes };
}

/**
 * Complete quest legitimately after required focus duration is reached
 * Strictly guards against double XP awards!
 */
export function completeQuestLegitimately(
  current: StudentPortalData,
  questId: string
): { updatedData: StudentPortalData; gainedXp: number; leveledUp: boolean; error?: string } {
  const questIndex = current.quests.findIndex((q) => q.id === questId);
  if (questIndex === -1) {
    return { updatedData: current, gainedXp: 0, leveledUp: false, error: "Quest not found" };
  }

  const quest = current.quests[questIndex];

  // Prevent double XP awards
  if (quest.completed) {
    return {
      updatedData: current,
      gainedXp: 0,
      leveledUp: false,
      error: "Quest has already been completed. XP was already awarded.",
    };
  }

  // Validate focus requirement
  let totalFocusSec = quest.accumulated_focus_seconds || 0;
  if (current.activeSession && current.activeSession.quest_id === questId) {
    totalFocusSec = calculateCurrentFocusSeconds(current.activeSession);
  }

  const requiredSeconds = quest.duration_minutes * 60;
  // 2s tolerance for sub-second precision
  if (totalFocusSec < requiredSeconds - 2) {
    return {
      updatedData: current,
      gainedXp: 0,
      leveledUp: false,
      error: `Focus requirement not yet met. Completed: ${Math.floor(totalFocusSec / 60)} / ${quest.duration_minutes} min.`,
    };
  }

  // Legitimate completion: award XP once
  const previousLevel = current.progress.level;
  const newXp = current.progress.xp + quest.xp;
  const newLevelInfo = getLevelInfo(newXp);
  const leveledUp = newLevelInfo.level > previousLevel;

  const todayStr = new Date().toISOString().split("T")[0];
  const streakResult = calculateNewStreak(
    current.progress.streak,
    current.progress.last_activity_date,
    todayStr
  );

  const updatedQuests = [...current.quests];
  updatedQuests[questIndex] = {
    ...quest,
    completed: true,
    completed_at: new Date().toISOString(),
    accumulated_focus_seconds: requiredSeconds,
  };

  // Mark linked timetable blocks completed
  const updatedBlocks = (current.timetableBlocks || []).map((b) =>
    b.quest_id === questId ? { ...b, is_completed: true } : b
  );

  const updated: StudentPortalData = {
    ...current,
    quests: updatedQuests,
    timetableBlocks: updatedBlocks,
    activeSession: null,
    progress: {
      ...current.progress,
      xp: newXp,
      level: newLevelInfo.level,
      streak: streakResult.newStreak,
      last_activity_date: todayStr,
      total_quests_completed: current.progress.total_quests_completed + 1,
      total_minutes_studied: current.progress.total_minutes_studied + quest.duration_minutes,
    },
  };

  saveStudentData(updated);
  return { updatedData: updated, gainedXp: quest.xp, leveledUp };
}

// ==========================================
// FEATURE 2: TIMETABLE BUILDER ACTIONS
// ==========================================

export function saveTimetableConfig(
  current: StudentPortalData,
  config: TimetableConfig
): StudentPortalData {
  const updated: StudentPortalData = {
    ...current,
    timetableConfig: config,
  };
  saveStudentData(updated);
  return updated;
}

export function addFixedCommitment(
  current: StudentPortalData,
  commitment: Omit<FixedCommitment, "id" | "user_id">
): StudentPortalData {
  const newCommitment: FixedCommitment = {
    ...commitment,
    id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: current.userId,
  };

  const updatedCommitments = [...(current.fixedCommitments || []), newCommitment];
  const updated: StudentPortalData = {
    ...current,
    fixedCommitments: updatedCommitments,
  };

  saveStudentData(updated);
  return updated;
}

export function updateFixedCommitment(
  current: StudentPortalData,
  commitmentId: string,
  updates: Partial<FixedCommitment>
): StudentPortalData {
  const updatedCommitments = (current.fixedCommitments || []).map((c) =>
    c.id === commitmentId ? { ...c, ...updates } : c
  );

  const updated: StudentPortalData = {
    ...current,
    fixedCommitments: updatedCommitments,
  };

  saveStudentData(updated);
  return updated;
}

export function deleteFixedCommitment(
  current: StudentPortalData,
  commitmentId: string
): StudentPortalData {
  const updatedCommitments = (current.fixedCommitments || []).filter((c) => c.id !== commitmentId);
  const updated: StudentPortalData = {
    ...current,
    fixedCommitments: updatedCommitments,
  };

  saveStudentData(updated);
  return updated;
}

export function generateAndSaveTimetable(
  current: StudentPortalData,
  customConfig?: TimetableConfig
): StudentPortalData {
  const config = customConfig || current.timetableConfig || DEFAULT_TIMETABLE_CONFIG;

  const { blocks, quests } = generateFullTimetable(
    current.subjects,
    current.assessments,
    config,
    current.fixedCommitments || [],
    current.quests
  );

  const updated: StudentPortalData = {
    ...current,
    timetableConfig: config,
    timetableBlocks: blocks,
    quests: quests,
  };

  saveStudentData(updated);
  return updated;
}

export function updateTimetableBlock(
  current: StudentPortalData,
  blockId: string,
  updates: Partial<TimetableBlock>
): StudentPortalData {
  const updatedBlocks = (current.timetableBlocks || []).map((b) =>
    b.id === blockId ? { ...b, ...updates } : b
  );

  const updated: StudentPortalData = {
    ...current,
    timetableBlocks: updatedBlocks,
  };

  saveStudentData(updated);
  return updated;
}

export function deleteTimetableBlock(
  current: StudentPortalData,
  blockId: string
): StudentPortalData {
  const updatedBlocks = (current.timetableBlocks || []).filter((b) => b.id !== blockId);
  const updated: StudentPortalData = {
    ...current,
    timetableBlocks: updatedBlocks,
  };

  saveStudentData(updated);
  return updated;
}

export function addCustomTimetableBlock(
  current: StudentPortalData,
  block: Omit<TimetableBlock, "id" | "user_id">
): StudentPortalData {
  const newBlock: TimetableBlock = {
    ...block,
    id: `block-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: current.userId,
  };

  const updated: StudentPortalData = {
    ...current,
    timetableBlocks: [...(current.timetableBlocks || []), newBlock],
  };

  saveStudentData(updated);
  return updated;
}
