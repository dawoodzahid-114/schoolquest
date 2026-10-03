import { Subject, Assessment, StudyPreference, Quest, QuestType } from "@/types";

export interface PriorityScore {
  subjectId: string;
  subjectName: string;
  gap: number;
  daysToTest: number | null;
  urgentTestName: string | null;
  weakTopicsCount: number;
  priorityScore: number;
  recommendedTimeShare: number; // percentage 0-1
}

/**
 * Calculates days remaining between today and the assessment date
 */
export function getDaysRemaining(assessmentDateStr: string): number {
  const target = new Date(assessmentDateStr);
  const now = new Date();
  // Strip time components
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates priority score for each subject based on score gap,
 * test proximity, and weak topics count.
 */
export function calculateSubjectPriorities(
  subjects: Subject[],
  assessments: Assessment[]
): PriorityScore[] {
  if (!subjects.length) return [];

  const scores: PriorityScore[] = subjects.map((subj) => {
    const gap = Math.max(0, subj.target_score - subj.current_score);
    
    // Find closest upcoming assessment for this subject
    const subjectTests = assessments
      .filter((a) => a.subject_id === subj.id || a.subject_name.toLowerCase() === subj.name.toLowerCase())
      .map((a) => ({
        ...a,
        days: getDaysRemaining(a.assessment_date),
      }))
      .filter((a) => a.days >= 0) // upcoming only
      .sort((a, b) => a.days - b.days);

    const closestTest = subjectTests[0] || null;
    const daysToTest = closestTest ? closestTest.days : null;

    // Proximity factor: Closer tests (under 14 days) provide large weight
    let urgencyFactor = 0;
    if (daysToTest !== null) {
      if (daysToTest <= 3) urgencyFactor = 60;
      else if (daysToTest <= 7) urgencyFactor = 45;
      else if (daysToTest <= 14) urgencyFactor = 30;
      else if (daysToTest <= 30) urgencyFactor = 15;
      else urgencyFactor = 5;

      // High priority boost
      if (closestTest.priority === "high") urgencyFactor *= 1.25;
    }

    const weakTopicsCount = subj.weak_topics ? subj.weak_topics.length : 0;
    const weaknessWeight = weakTopicsCount * 8;

    // Combined score: Gap + Urgency + Weakness
    const priorityScore = (gap * 1.5) + urgencyFactor + weaknessWeight + 10; // base 10

    return {
      subjectId: subj.id,
      subjectName: subj.name,
      gap,
      daysToTest,
      urgentTestName: closestTest ? closestTest.name : null,
      weakTopicsCount,
      priorityScore,
      recommendedTimeShare: 0,
    };
  });

  const totalScore = scores.reduce((sum, item) => sum + item.priorityScore, 0);
  return scores.map((item) => ({
    ...item,
    recommendedTimeShare: totalScore > 0 ? Number((item.priorityScore / totalScore).toFixed(2)) : 0,
  }));
}

/**
 * Slices a total available daily time (e.g. 60m) into quest sessions
 * between 20 and 35 minutes each.
 */
function sliceTimeIntoSessions(totalMinutes: number): number[] {
  if (totalMinutes <= 25) return [totalMinutes];
  if (totalMinutes <= 45) return [Math.floor(totalMinutes / 2), Math.ceil(totalMinutes / 2)];
  if (totalMinutes <= 70) return [30, totalMinutes - 30];
  if (totalMinutes <= 95) return [30, 30, totalMinutes - 60];
  if (totalMinutes <= 120) return [35, 30, 30, totalMinutes - 95];
  
  // For longer study times, partition into 30-35m chunks
  const sessions: number[] = [];
  let remaining = totalMinutes;
  while (remaining > 0) {
    const chunk = Math.min(35, remaining);
    sessions.push(chunk);
    remaining -= chunk;
  }
  return sessions;
}

/**
 * Format a start time like "17:00" and add minutes to get a 12-hour string
 */
function formatSessionTime(startTimeStr: string, minutesOffset: number): string {
  let [hours, mins] = startTimeStr.split(":").map(Number);
  if (isNaN(hours)) hours = 17;
  if (isNaN(mins)) mins = 0;

  const totalMinutes = hours * 60 + mins + minutesOffset;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;

  const period = newHours >= 12 ? "PM" : "AM";
  const displayHour = newHours % 12 === 0 ? 12 : newHours % 12;
  const displayMinutes = newMins < 10 ? `0${newMins}` : newMins;

  return `${displayHour}:${displayMinutes} ${period}`;
}

/**
 * Deterministically generates today's quests from student profile data
 */
export function generateDailyQuests(
  subjects: Subject[],
  assessments: Assessment[],
  preferences: StudyPreference,
  scheduledDate: string = new Date().toISOString().split("T")[0]
): Quest[] {
  if (!subjects.length) return [];

  const priorities = calculateSubjectPriorities(subjects, assessments);
  // Sort subjects by highest priority score
  priorities.sort((a, b) => b.priorityScore - a.priorityScore);

  const dailyMinutes = preferences.daily_minutes || 60;
  const sessions = sliceTimeIntoSessions(dailyMinutes);
  const startTime = preferences.preferred_start_time || "17:00";

  const quests: Quest[] = [];
  let currentOffset = 0;

  sessions.forEach((duration, index) => {
    // Pick subject cyclically prioritizing the top subjects
    const priorityIndex = index % priorities.length;
    const targetPriority = priorities[priorityIndex];
    const subject = subjects.find((s) => s.id === targetPriority.subjectId) || subjects[0];

    // Pick topic: prioritize weak topics if available
    const weakTopic = subject.weak_topics && subject.weak_topics.length > 0
      ? subject.weak_topics[index % subject.weak_topics.length]
      : "Core Concepts";

    // Determine quest type based on test proximity and session index
    let questType: QuestType = "Practice";
    let title = "";
    let description = "";

    if (targetPriority.daysToTest !== null && targetPriority.daysToTest <= 7) {
      if (index === 0) {
        questType = "Test Preparation";
        title = `${subject.name} — ${targetPriority.urgentTestName || "Exam"} Intensive Review`;
        description = `Targeted revision for ${subject.name} upcoming test in ${targetPriority.daysToTest} day(s). Focus on ${weakTopic}.`;
      } else {
        questType = "Practice";
        title = `${subject.name} — High-Yield Exam Practice`;
        description = `Complete exam-style sample questions covering ${weakTopic} under timed conditions.`;
      }
    } else if (subject.weak_topics && subject.weak_topics.length > 0 && index === 0) {
      questType = "Review";
      title = `${subject.name} — ${weakTopic} Concept Deep-Dive`;
      description = `Break down fundamental concepts and clear doubts in ${weakTopic} to close your score gap.`;
    } else if (index % 3 === 1) {
      questType = "Practice";
      title = `${subject.name} — Active Problem Solving`;
      description = `Solve practice problems on ${weakTopic} to reinforce application skills.`;
    } else if (index % 3 === 2) {
      questType = "Mistake Review";
      title = `${subject.name} — Error Analysis & Flash Revision`;
      description = `Review previous quiz errors and summarize key formulas / rules for ${weakTopic}.`;
    } else {
      questType = "Learn";
      title = `${subject.name} — Guided Syllabus Study`;
      description = `Advance forward through the syllabus with focused study on ${weakTopic}.`;
    }

    // Deterministic explanation for "Why this quest?"
    let whyReason = `Your ${subject.name} target gap is ${targetPriority.gap} points`;
    if (targetPriority.daysToTest !== null) {
      whyReason += ` and your ${targetPriority.urgentTestName || "test"} is in ${targetPriority.daysToTest} day${targetPriority.daysToTest === 1 ? "" : "s"}`;
    }
    if (subject.weak_topics && subject.weak_topics.length > 0) {
      whyReason += `, with "${weakTopic}" marked for improvement`;
    }
    whyReason += `. Therefore this topic received high priority.`;

    const xp = Math.round(10 + duration * 0.6);

    quests.push({
      id: `quest-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      subject_id: subject.id,
      subject_name: subject.name,
      title,
      description,
      quest_type: questType,
      scheduled_date: scheduledDate,
      scheduled_time: formatSessionTime(startTime, currentOffset),
      duration_minutes: duration,
      xp,
      completed: false,
      topic: weakTopic,
      why_this_quest: whyReason,
    });

    currentOffset += duration + 5; // 5-minute breather between quests
  });

  return quests;
}
