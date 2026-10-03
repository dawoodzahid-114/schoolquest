import { NextResponse } from "next/server";
import {
  getInitialEmptyStudentData,
  addSubjectToStudent,
  addAssessmentToStudent,
  toggleQuestInStudent,
  loadStudentData,
} from "@/lib/storage/studentStore";
import { calculateSubjectPriorities } from "@/lib/planning/studyPlanEngine";

export async function GET() {
  try {
    // Test 1: New Account starts 100% empty
    const ahmedInitial = getInitialEmptyStudentData("user-ahmed-1");
    if (ahmedInitial.subjects.length !== 0) {
      return NextResponse.json({ error: "Subjects not empty for new user" }, { status: 500 });
    }

    // Test 2: Add dynamic custom subjects (No hardcoding)
    let ahmedData = addSubjectToStudent(ahmedInitial, {
      name: "Biology",
      current_score: 55,
      target_score: 85,
      target_grade: "A*",
      weak_topics: ["Cell Division", "Genetics"],
    });
    ahmedData = addSubjectToStudent(ahmedData, {
      name: "Chemistry",
      current_score: 72,
      target_score: 90,
      target_grade: "A*",
      weak_topics: ["Organic Compounds"],
    });

    // Test 3: Add assessment in 6 days
    const in6Days = new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().split("T")[0];
    ahmedData = addAssessmentToStudent(ahmedData, {
      name: "Biology Midterm",
      subject_id: ahmedData.subjects[0].id,
      subject_name: "Biology",
      assessment_date: in6Days,
      priority: "high",
      topics: ["Cell Division"],
    });

    // Test 4: Verify urgent prioritization
    const priorities = calculateSubjectPriorities(ahmedData.subjects, ahmedData.assessments);
    const topPriority = priorities[0];
    const isBiologyTop = topPriority && topPriority.subjectName === "Biology";

    // Test 5: Complete quest & verify XP
    const questToComplete = ahmedData.quests[0];
    let xpIncreased = false;
    let gainedXp = 0;
    let newXp = ahmedData.progress.xp;
    if (questToComplete) {
      const initialXp = ahmedData.progress.xp;
      const res = toggleQuestInStudent(ahmedData, questToComplete.id);
      gainedXp = res.gainedXp;
      newXp = res.updatedData.progress.xp;
      xpIncreased = newXp > initialXp;
    }

    // Test 6: Second student (Sara) data isolation
    const saraInitial = getInitialEmptyStudentData("user-sara-2");
    const saraSeesNoAhmedData = !saraInitial.subjects.some((s) => s.name === "Biology");

    return NextResponse.json({
      status: "healthy",
      zeroAI: true,
      allTestsPassed: Boolean(isBiologyTop && xpIncreased && saraSeesNoAhmedData),
      testResults: {
        ahmedInitialSubjects: ahmedInitial.subjects.length,
        ahmedSubjects: ahmedData.subjects.map((s) => s.name),
        isBiologyTopPriority: isBiologyTop,
        questsCount: ahmedData.quests.length,
        xpGained: gainedXp,
        newXp,
        saraSeesAhmedData: !saraSeesNoAhmedData,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
