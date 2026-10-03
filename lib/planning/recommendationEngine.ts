import { Subject, Assessment, StudyPreference, Interest, StudyRecommendation } from "@/types";
import { getDaysRemaining } from "./studyPlanEngine";

export interface RecommendationContext {
  subjects: Subject[];
  assessments: Assessment[];
  preferences: StudyPreference;
  interests: Interest[];
}

/**
 * Purely deterministic, rule-based recommendation generator.
 * NO AI, NO external API calls.
 */
export function generateDeterministicRecommendations(
  context: RecommendationContext
): StudyRecommendation[] {
  const recommendations: StudyRecommendation[] = [];
  const { subjects, assessments, preferences, interests } = context;

  if (!subjects.length) {
    return [
      {
        id: "rec-no-subjects",
        title: "Add Your First Subjects to Begin Planning",
        category: "target_gap",
        content: "SchoolQuest needs your subject list and target goals to analyze score gaps and generate daily study quests.",
        actionable_step: "Click '+ Add Subject' to configure your coursework.",
      },
    ];
  }

  // Rule 1: Highest Urgency Assessment (Test within 7 days or closest upcoming test)
  const upcomingTests = assessments
    .map((a) => ({ ...a, daysRemaining: getDaysRemaining(a.assessment_date) }))
    .filter((a) => a.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  if (upcomingTests.length > 0) {
    const closest = upcomingTests[0];
    if (closest.daysRemaining <= 7) {
      recommendations.push({
        id: `rec-urgent-${closest.id}`,
        title: `Priority Exam Readiness: ${closest.name} (${closest.daysRemaining} days remaining)`,
        category: "urgent_test",
        content: `Your ${closest.subject_name} assessment (${closest.name}) is scheduled in ${
          closest.daysRemaining === 0 ? "today" : `${closest.daysRemaining} days`
        }. Allocate at least 60% of your upcoming study sessions to high-yield practice questions.`,
        subject: closest.subject_name,
        actionable_step: `Review ${closest.topics.slice(0, 2).join(" & ") || "key topics"} without notes under timed conditions.`,
      });
    } else if (closest.daysRemaining <= 14) {
      recommendations.push({
        id: `rec-near-${closest.id}`,
        title: `Upcoming Assessment: ${closest.name} in ${closest.daysRemaining} days`,
        category: "urgent_test",
        content: `Begin spaced review for ${closest.subject_name} to avoid last-minute cramming. Spacing practice over two weeks improves concept retention.`,
        subject: closest.subject_name,
        actionable_step: `Set aside 20 minutes to outline past exam questions for ${closest.topics.join(", ") || "the syllabus"}.`,
      });
    }
  }

  // Rule 2: Largest Subject Target Score Gap
  const subjectsWithGaps = subjects
    .map((s) => ({ ...s, gap: Math.max(0, s.target_score - s.current_score) }))
    .sort((a, b) => b.gap - a.gap);

  const largestGapSubject = subjectsWithGaps[0];
  if (largestGapSubject && largestGapSubject.gap > 0) {
    const weakTopic = largestGapSubject.weak_topics?.[0];
    recommendations.push({
      id: `rec-gap-${largestGapSubject.id}`,
      title: `${largestGapSubject.name}: Closing the ${largestGapSubject.gap} Percentage-Point Gap`,
      category: "target_gap",
      content: `${largestGapSubject.name} has your largest improvement gap (${largestGapSubject.current_score}% → ${largestGapSubject.target_score}%). Closing this requires targeted practice rather than general reading.`,
      subject: largestGapSubject.name,
      actionable_step: weakTopic
        ? `Focus today's practice session specifically on ${weakTopic}.`
        : `Break down ${largestGapSubject.name} into specific subtopics to identify knowledge gaps.`,
    });
  }

  // Rule 3: Weak Topic Focused Revision
  const subjectWithWeakTopics = subjects.find(
    (s) => s.weak_topics && s.weak_topics.length > 0 && s.id !== largestGapSubject?.id
  );
  if (subjectWithWeakTopics && subjectWithWeakTopics.weak_topics.length > 0) {
    const topic = subjectWithWeakTopics.weak_topics[0];
    recommendations.push({
      id: `rec-weak-${subjectWithWeakTopics.id}`,
      title: `${subjectWithWeakTopics.name} Concept Review: ${topic}`,
      category: "weak_topic",
      content: `You flagged "${topic}" as a challenging topic in ${subjectWithWeakTopics.name}. Reviewing previous mistakes and writing formula summaries will build confidence.`,
      subject: subjectWithWeakTopics.name,
      actionable_step: `Solve 3 targeted questions on ${topic} and record any errors in a mistake log.`,
    });
  }

  // Rule 4: Study Time Allocation Strategy
  const dailyMins = preferences.daily_minutes || 60;
  if (dailyMins < 45) {
    recommendations.push({
      id: "rec-time-compact",
      title: "High-Efficiency 30-Minute Study Strategy",
      category: "time_allocation",
      content: `With ${dailyMins} minutes available today, avoid multitasking across multiple subjects. Dedicate the entire window to your single highest-priority test or gap.`,
      actionable_step: "Set a single 25-minute timer and eliminate all mobile notifications.",
    });
  }

  // Rule 5: Extracurricular Academic Synergy (Optional)
  if (interests.length > 0 && subjects.length > 0) {
    const interest = interests[0].interest_name;
    const relatedSubject = subjects[0].name;
    recommendations.push({
      id: "rec-extra-synergy",
      title: `Optional Synergy: Linking ${relatedSubject} & ${interest}`,
      category: "extracurricular",
      content: `Connecting concepts from ${relatedSubject} to your interest in ${interest} reinforces long-term understanding through practical real-world context.`,
      actionable_step: `Think of 1 real-world application where ${relatedSubject} principles are used in ${interest}.`,
    });
  }

  return recommendations.slice(0, 4); // return top 2-4 most relevant
}
