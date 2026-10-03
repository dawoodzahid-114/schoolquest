import {
  Subject,
  Assessment,
  DayOfWeek,
  FixedCommitment,
  TimetableBlock,
  TimetableConfig,
  Quest,
  QuestType,
} from "@/types";
import { calculateSubjectPriorities } from "./studyPlanEngine";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export interface TimeInterval {
  start: number; // minutes from 00:00 (0 - 1440)
  end: number;
  label?: string;
  type?: string;
}

export interface DayScheduleResult {
  day: DayOfWeek;
  blocks: TimetableBlock[];
  createdQuests: Quest[];
  totalStudyMinutes: number;
  targetStudyMinutes: number;
  conflictMessage?: string;
}

export const DEFAULT_TIMETABLE_CONFIG: TimetableConfig = {
  school_start: "07:30",
  school_end: "14:00",
  travel_to_school_minutes: 30,
  travel_home_minutes: 30,
  sleep_time: "23:00",
  wake_time: "06:30",
  daily_study_minutes: 90,
  preferred_study_periods: ["after_school", "evening"],
  focus_duration_minutes: 45,
  break_duration_minutes: 10,
};

/**
 * Convert "HH:MM" (24h) to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Convert minutes from midnight to "HH:MM" (24h)
 */
export function minutesToTime(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Convert "HH:MM" (24h) to 12h format e.g. "7:30 AM" or "5:00 PM"
 */
export function formatTime12h(timeStr: string): string {
  const mins = timeToMinutes(timeStr);
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const displayHour = h24 % 12 === 0 ? 12 : h24 % 12;
  const displayMinutes = m < 10 ? `0${m}` : m.toString();
  return `${displayHour}:${displayMinutes} ${period}`;
}

/**
 * Get current day of week in user's local time
 */
export function getCurrentDayOfWeek(): DayOfWeek {
  const dayNames: DayOfWeek[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const now = new Date();
  return dayNames[now.getDay()];
}

/**
 * Merge overlapping or contiguous time intervals
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: TimeInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];

    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      merged.push({ ...curr });
    }
  }
  return merged;
}

/**
 * Determine if a given day is a weekday (school day)
 */
export function isSchoolDay(day: DayOfWeek): boolean {
  return day !== "Saturday" && day !== "Sunday";
}

/**
 * Generate study timetable deterministically for all 7 days of the week
 */
export function generateFullTimetable(
  subjects: Subject[],
  assessments: Assessment[],
  config: TimetableConfig,
  commitments: FixedCommitment[],
  existingQuests: Quest[] = []
): {
  blocks: TimetableBlock[];
  quests: Quest[];
  daySummaries: Record<DayOfWeek, DayScheduleResult>;
} {
  const allBlocks: TimetableBlock[] = [];
  const allQuests: Quest[] = [...existingQuests];
  const daySummaries: Record<string, DayScheduleResult> = {};

  // Prioritize subjects once deterministically
  const priorities = calculateSubjectPriorities(subjects, assessments);
  priorities.sort((a, b) => b.priorityScore - a.priorityScore);

  let questCycleIndex = 0;

  DAYS_OF_WEEK.forEach((day, dayIndex) => {
    const result = generateDaySchedule(
      day,
      dayIndex,
      subjects,
      priorities,
      config,
      commitments,
      allQuests,
      questCycleIndex
    );

    daySummaries[day] = result;
    allBlocks.push(...result.blocks);
    result.createdQuests.forEach((q) => {
      if (!allQuests.some((existing) => existing.id === q.id)) {
        allQuests.push(q);
      }
    });

    questCycleIndex += result.blocks.filter((b) => b.block_type === "study").length;
  });

  return {
    blocks: allBlocks,
    quests: allQuests,
    daySummaries: daySummaries as Record<DayOfWeek, DayScheduleResult>,
  };
}

/**
 * Generate schedule for a single day
 */
export function generateDaySchedule(
  day: DayOfWeek,
  dayIndex: number,
  subjects: Subject[],
  priorities: ReturnType<typeof calculateSubjectPriorities>,
  config: TimetableConfig,
  commitments: FixedCommitment[],
  currentQuests: Quest[],
  questCycleStart: number
): DayScheduleResult {
  const blocks: TimetableBlock[] = [];
  const createdQuests: Quest[] = [];

  const sleepMin = timeToMinutes(config.sleep_time || "23:00");
  const wakeMin = timeToMinutes(config.wake_time || "06:30");
  const schoolStartMin = timeToMinutes(config.school_start || "07:30");
  const schoolEndMin = timeToMinutes(config.school_end || "14:00");
  const travelToSchool = config.travel_to_school_minutes || 0;
  const travelHome = config.travel_home_minutes || 0;

  // Block out unavailable intervals
  const unavailable: TimeInterval[] = [];

  // Sleep interval (waking hours: wakeMin to sleepMin)
  if (sleepMin > wakeMin) {
    // Standard night sleep (e.g. 23:00 to 06:30 next day)
    unavailable.push({ start: 0, end: wakeMin, label: "Sleep", type: "sleep" });
    unavailable.push({ start: sleepMin, end: 1440, label: "Sleep", type: "sleep" });
  } else {
    // Cross midnight inverted
    unavailable.push({ start: sleepMin, end: wakeMin, label: "Sleep", type: "sleep" });
  }

  // School interval on weekdays
  const hasSchool = isSchoolDay(day);
  let schoolEffectiveStart = schoolStartMin - travelToSchool;
  let schoolEffectiveEnd = schoolEndMin + travelHome;

  if (hasSchool) {
    unavailable.push({
      start: schoolEffectiveStart,
      end: schoolEffectiveEnd,
      label: "School & Commute",
      type: "school",
    });

    // Add school block to timetable
    blocks.push({
      id: `block-${day.toLowerCase()}-school`,
      title: "🏫 School",
      block_type: "school",
      day_of_week: day,
      start_time: config.school_start,
      end_time: config.school_end,
      duration_minutes: schoolEndMin - schoolStartMin,
    });

    // Add Lunch / Rest buffer after school
    const lunchStart = schoolEffectiveEnd;
    const lunchDuration = 60; // 1 hour buffer
    const lunchEnd = Math.min(lunchStart + lunchDuration, sleepMin - 60);

    if (lunchEnd > lunchStart) {
      unavailable.push({
        start: lunchStart,
        end: lunchEnd,
        label: "Lunch / Rest",
        type: "meal",
      });

      blocks.push({
        id: `block-${day.toLowerCase()}-lunch`,
        title: "🍽 Lunch / Rest",
        block_type: "meal",
        day_of_week: day,
        start_time: minutesToTime(lunchStart),
        end_time: minutesToTime(lunchEnd),
        duration_minutes: lunchEnd - lunchStart,
      });
    }
  }

  // Fixed commitments for this day
  const dayCommitments = commitments.filter((c) => c.days.includes(day));
  dayCommitments.forEach((c) => {
    const cStart = timeToMinutes(c.start_time);
    const cEnd = timeToMinutes(c.end_time);
    if (cEnd > cStart) {
      unavailable.push({
        start: cStart,
        end: cEnd,
        label: c.title,
        type: "commitment",
      });

      blocks.push({
        id: `block-${day.toLowerCase()}-${c.id}`,
        title: `📚 ${c.title}`,
        block_type: "commitment",
        day_of_week: day,
        start_time: c.start_time,
        end_time: c.end_time,
        duration_minutes: cEnd - cStart,
      });
    }
  });

  // Calculate available free time intervals
  const mergedUnavailable = mergeIntervals(unavailable);
  const freeIntervals: TimeInterval[] = [];

  let cursor = wakeMin;
  for (const un of mergedUnavailable) {
    if (un.start > cursor) {
      const freeStart = Math.max(cursor, wakeMin);
      const freeEnd = Math.min(un.start, sleepMin);
      if (freeEnd - freeStart >= 20) {
        freeIntervals.push({ start: freeStart, end: freeEnd });
      }
    }
    cursor = Math.max(cursor, un.end);
  }

  if (cursor < sleepMin && sleepMin - cursor >= 20) {
    freeIntervals.push({ start: cursor, end: sleepMin });
  }

  // Calculate total available free minutes
  const totalFreeMinutes = freeIntervals.reduce((sum, int) => sum + (int.end - int.start), 0);
  const requestedStudyMinutes = config.daily_study_minutes || 90;
  const focusChunkMinutes = Math.max(20, config.focus_duration_minutes || 45);
  const breakChunkMinutes = Math.max(5, config.break_duration_minutes || 10);

  let scheduledStudyMinutes = 0;
  let conflictMessage: string | undefined = undefined;

  if (totalFreeMinutes < requestedStudyMinutes) {
    conflictMessage = `You have ${totalFreeMinutes} minutes available on ${day}. SchoolQuest scheduled the highest-priority study tasks first. The remaining work can be scheduled tomorrow.`;
  }

  // Study slotting inside free intervals
  let cycleIndex = questCycleStart;

  if (subjects.length > 0) {
    for (const interval of freeIntervals) {
      let intervalCursor = interval.start;

      while (
        intervalCursor + 20 <= interval.end &&
        scheduledStudyMinutes < requestedStudyMinutes
      ) {
        // Remaining study quota for today
        const remainingQuota = requestedStudyMinutes - scheduledStudyMinutes;
        const availableInInterval = interval.end - intervalCursor;

        // Determine this session's study duration
        let sessionDuration = Math.min(focusChunkMinutes, remainingQuota, availableInInterval);

        // If very small sliver (< 20m) and we have already studied, break
        if (sessionDuration < 20) {
          if (scheduledStudyMinutes > 0) break;
          sessionDuration = Math.max(15, sessionDuration);
        }

        const studyStart = intervalCursor;
        const studyEnd = studyStart + sessionDuration;

        // Pick subject using priority ranking
        const priorityIndex = cycleIndex % (priorities.length || 1);
        const targetPriority = priorities[priorityIndex] || {
          subjectId: subjects[0].id,
          subjectName: subjects[0].name,
          gap: 15,
          daysToTest: null,
          urgentTestName: null,
          weakTopicsCount: 0,
        };

        const matchedSubject =
          subjects.find((s) => s.id === targetPriority.subjectId) || subjects[0];

        const weakTopic =
          matchedSubject.weak_topics && matchedSubject.weak_topics.length > 0
            ? matchedSubject.weak_topics[cycleIndex % matchedSubject.weak_topics.length]
            : "Core Concepts";

        // Determine study block and quest title
        let blockTitle = `${matchedSubject.name} — ${weakTopic}`;
        let questType: QuestType = "Practice";

        if (targetPriority.daysToTest !== null && targetPriority.daysToTest <= 7) {
          questType = "Test Preparation";
          blockTitle = `${matchedSubject.name} — ${targetPriority.urgentTestName || "Exam"} Prep (${weakTopic})`;
        } else if (cycleIndex % 3 === 0) {
          questType = "Review";
          blockTitle = `${matchedSubject.name} — ${weakTopic} Concept Review`;
        } else if (cycleIndex % 3 === 1) {
          questType = "Practice";
          blockTitle = `${matchedSubject.name} — ${weakTopic} Problem Solving`;
        } else {
          questType = "Revision";
          blockTitle = `${matchedSubject.name} — ${weakTopic} Revision`;
        }

        // Link to existing uncompleted quest or create new linked quest
        const existingQuest = currentQuests.find(
          (q) => !q.completed && q.subject_id === matchedSubject.id && q.duration_minutes === sessionDuration
        );

        let questId = existingQuest ? existingQuest.id : `quest-tt-${day.toLowerCase()}-${cycleIndex}`;

        if (!existingQuest) {
          const newQuest: Quest = {
            id: questId,
            subject_id: matchedSubject.id,
            subject_name: matchedSubject.name,
            title: blockTitle,
            description: `Targeted study block scheduled for ${day} at ${formatTime12h(minutesToTime(studyStart))}. Focus on ${weakTopic}.`,
            quest_type: questType,
            scheduled_date: new Date().toISOString().split("T")[0],
            scheduled_time: formatTime12h(minutesToTime(studyStart)),
            duration_minutes: sessionDuration,
            xp: Math.round(10 + sessionDuration * 0.6),
            completed: false,
            topic: weakTopic,
            accumulated_focus_seconds: 0,
            why_this_quest: `Prioritized for ${matchedSubject.name} (target gap: ${targetPriority.gap} points${
              targetPriority.daysToTest !== null ? `, test in ${targetPriority.daysToTest} days` : ""
            }). Scheduled in your daily study window.`,
          };
          createdQuests.push(newQuest);
        }

        // Add study block
        blocks.push({
          id: `block-${day.toLowerCase()}-study-${cycleIndex}`,
          title: blockTitle,
          block_type: "study",
          day_of_week: day,
          start_time: minutesToTime(studyStart),
          end_time: minutesToTime(studyEnd),
          duration_minutes: sessionDuration,
          subject_id: matchedSubject.id,
          subject_name: matchedSubject.name,
          quest_id: questId,
          is_completed: existingQuest ? existingQuest.completed : false,
          notes: `Focus duration: ${sessionDuration} min. Connects to Quest.`,
        });

        scheduledStudyMinutes += sessionDuration;
        cycleIndex++;
        intervalCursor = studyEnd;

        // Add break block if there's enough time before interval end
        if (
          intervalCursor + breakChunkMinutes <= interval.end &&
          scheduledStudyMinutes < requestedStudyMinutes
        ) {
          const breakStart = intervalCursor;
          const breakEnd = breakStart + breakChunkMinutes;

          blocks.push({
            id: `block-${day.toLowerCase()}-break-${cycleIndex}`,
            title: "☕ Break",
            block_type: "break",
            day_of_week: day,
            start_time: minutesToTime(breakStart),
            end_time: minutesToTime(breakEnd),
            duration_minutes: breakChunkMinutes,
            notes: "Break time is not counted as study time.",
          });

          intervalCursor = breakEnd;
        }
      }
    }
  }

  // Sort all blocks of the day chronologically
  blocks.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  return {
    day,
    blocks,
    createdQuests,
    totalStudyMinutes: scheduledStudyMinutes,
    targetStudyMinutes: requestedStudyMinutes,
    conflictMessage,
  };
}
