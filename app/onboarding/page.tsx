"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import {
  loadStudentData,
  saveStudentData,
  StudentPortalData,
} from "@/lib/storage/studentStore";
import { generateDailyQuests } from "@/lib/planning/studyPlanEngine";
import { generateDeterministicRecommendations } from "@/lib/planning/recommendationEngine";
import { Subject, AcademicHistory, Assessment, StudyPreference, PriorityLevel } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  BookOpen,
  Calendar,
  Clock,
  Heart,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Target,
} from "lucide-react";

const PRESET_INTERESTS = [
  "Programming",
  "Cloud Computing",
  "Mathematics",
  "Science & Physics",
  "Robotics",
  "Artificial Intelligence",
  "Cybersecurity",
  "Creative Writing",
  "Digital Art & Design",
  "Business & Economics",
  "Entrepreneurship",
  "Competitive Sports",
  "Music & Production",
  "Scientific Research",
];

const PRESET_TIME_OPTIONS = [
  { label: "30 Minutes", value: 30 },
  { label: "45 Minutes", value: 45 },
  { label: "1 Hour (Standard)", value: 60 },
  { label: "1.5 Hours", value: 90 },
  { label: "2 Hours", value: 120 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, isLoading, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 6;

  // Student Identity
  const [username, setUsername] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Grade 10 / Year 11");
  const [curriculum, setCurriculum] = useState("");

  // NO HARDCODED SUBJECTS! Starts completely empty!
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // History starts empty
  const [historyRecords, setHistoryRecords] = useState<AcademicHistory[]>([]);

  // Assessments start empty
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  // Study Availability
  const [studyPref, setStudyPref] = useState<StudyPreference>({
    daily_minutes: 60,
    preferred_start_time: "17:00",
  });

  // Extracurriculars
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (profile) {
      setUsername(profile.username || "");
      setGradeLevel(profile.grade_level || "Grade 10");
      setCurriculum(profile.curriculum || "");
    }

    if (user) {
      const existing = loadStudentData(user.id);
      if (existing.subjects.length > 0) {
        setSubjects(existing.subjects);
      }
      if (existing.assessments.length > 0) {
        setAssessments(existing.assessments);
      }
      if (existing.academicHistory.length > 0) {
        setHistoryRecords(existing.academicHistory);
      }
    }
  }, [user, profile, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen bg-[#050505] items-center justify-center text-[#737373] text-sm">
        Loading onboarding...
      </div>
    );
  }

  // Helper for adding a fresh subject
  const addSubject = () => {
    const newSubj: Subject = {
      id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      name: "",
      current_score: 60,
      current_grade: "B",
      target_score: 85,
      target_grade: "A",
      weak_topics: [],
    };
    setSubjects([...subjects, newSubj]);
  };

  const updateSubject = (id: string, field: keyof Subject, value: any) => {
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id));
  };

  // Helper for adding an assessment
  const addAssessment = () => {
    if (subjects.length === 0) {
      alert("Please add at least one subject first before adding upcoming tests.");
      return;
    }
    const defaultSubject = subjects[0];
    const newAsmt: Assessment = {
      id: `asmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      subject_id: defaultSubject.id,
      subject_name: defaultSubject.name || "Subject",
      name: "",
      assessment_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      topics: [],
      priority: "medium",
    };
    setAssessments([...assessments, newAsmt]);
  };

  const removeAssessment = (id: string) => {
    setAssessments(assessments.filter((a) => a.id !== id));
  };

  // Helper for adding history
  const addHistory = () => {
    if (subjects.length === 0) {
      alert("Please add at least one subject first before adding previous grades.");
      return;
    }
    const defaultSubj = subjects[0];
    const newHist: AcademicHistory = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      subject_id: defaultSubj.id,
      subject_name: defaultSubj.name || "Subject",
      exam_name: "Prior Exam / Midterm",
      score: 65,
      grade: "B",
      exam_date: new Date().toISOString().split("T")[0],
    };
    setHistoryRecords([...historyRecords, newHist]);
  };

  const removeHistory = (id: string) => {
    setHistoryRecords(historyRecords.filter((h) => h.id !== id));
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleFinishOnboarding = async () => {
    if (!username.trim()) {
      alert("Please enter a username or display name.");
      setCurrentStep(1);
      return;
    }

    // Filter out unnamed subjects
    const validSubjects = subjects.filter((s) => s.name.trim().length > 0);

    // Update profile
    await updateProfile({
      username: username.trim(),
      grade_level: gradeLevel,
      curriculum,
    });

    // Generate Quests deterministically
    const generatedQuests = generateDailyQuests(validSubjects, assessments, studyPref);

    const formattedInterests = selectedInterests.map((name) => ({
      user_id: user.id,
      interest_name: name,
    }));

    const finalStudentData: StudentPortalData = {
      userId: user.id,
      subjects: validSubjects,
      academicHistory: historyRecords,
      assessments,
      studyPreferences: {
        ...studyPref,
        user_id: user.id,
      },
      interests: formattedInterests,
      quests: generatedQuests,
      progress: {
        user_id: user.id,
        xp: 25, // initial reward
        level: 1,
        streak: 1,
        last_activity_date: new Date().toISOString().split("T")[0],
        total_quests_completed: 0,
        total_minutes_studied: 0,
      },
      recommendations: generateDeterministicRecommendations({
        subjects: validSubjects,
        assessments,
        preferences: studyPref,
        interests: formattedInterests,
      }),
    };

    saveStudentData(finalStudentData);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Step Indicator Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-[#737373] mb-2 font-medium">
            <span>
              STEP {currentStep} OF {totalSteps}
            </span>
            <span className="text-white font-semibold">
              {currentStep === 1 && "Profile & Academic Information"}
              {currentStep === 2 && "Your Subjects & Target Goals"}
              {currentStep === 3 && "Previous Exam Results"}
              {currentStep === 4 && "Upcoming Tests & Assessments"}
              {currentStep === 5 && "Daily Study Availability"}
              {currentStep === 6 && "Extracurricular Passions"}
            </span>
          </div>

          <div className="w-full bg-[#181818] h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 sm:p-8 shadow-xl">
          {/* STEP 1: Basic academic info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Student Profile</h2>
                <p className="text-[#737373] text-xs">
                  Your display name is shown in your portal. Account data is isolated to your credentials.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Username / Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-white placeholder-[#555555] text-sm focus:outline-none focus:border-white transition-colors"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Current Grade / Year
                  </label>
                  <input
                    type="text"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="e.g. Grade 10, Year 11, O-Level, AP"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-white placeholder-[#555555] text-sm focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Curriculum / Exam Board (Optional)
                  </label>
                  <input
                    type="text"
                    value={curriculum}
                    onChange={(e) => setCurriculum(e.target.value)}
                    placeholder="e.g. Cambridge IGCSE, IB, US Common Core, State Board"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-white placeholder-[#555555] text-sm focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111111] border border-[#222222] text-xs text-[#888888] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#CCCCCC]" />
                <span>
                  Secured account: Your data is isolated to your profile ({user.email}).
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Current Subjects & Target Gaps */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">What Subjects Do You Study?</h2>
                  <p className="text-[#737373] text-xs">
                    You decide your coursework. Enter current scores, target goals, and focal topics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSubject}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Subject</span>
                </button>
              </div>

              {subjects.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-6 space-y-3">
                  <BookOpen className="w-7 h-7 text-[#444444] mx-auto" />
                  <div className="text-sm font-semibold text-white">
                    Your academic journey starts here.
                  </div>
                  <p className="text-xs text-[#737373] max-w-sm mx-auto">
                    Add the subjects you are currently studying to start setting targets and generating quests.
                  </p>
                  <button
                    type="button"
                    onClick={addSubject}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#050505] text-xs font-semibold hover:bg-[#E5E5E5] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add First Subject</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjects.map((subj, index) => {
                    const gap = Math.max(0, subj.target_score - subj.current_score);
                    return (
                      <div
                        key={subj.id}
                        className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#888888] uppercase tracking-wider">
                            Subject #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSubject(subj.id)}
                            className="text-[#666666] hover:text-white p-1 transition-colors"
                            title="Remove Subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">
                              Subject Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={subj.name}
                              onChange={(e) => updateSubject(subj.id, "name", e.target.value)}
                              placeholder="e.g. Biology, Mathematics, History, Physics"
                              className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">
                              Weak Topics (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={subj.weak_topics?.join(", ") || ""}
                              onChange={(e) =>
                                updateSubject(
                                  subj.id,
                                  "weak_topics",
                                  e.target.value
                                    .split(",")
                                    .map((t) => t.trim())
                                    .filter(Boolean)
                                )
                              }
                              placeholder="e.g. Cell Division, Genetics"
                              className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#888888] mb-1">
                              Current Score (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={subj.current_score}
                              onChange={(e) =>
                                updateSubject(subj.id, "current_score", Number(e.target.value))
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-[#888888] mb-1">
                              Target Goal (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={subj.target_score}
                              onChange={(e) =>
                                updateSubject(subj.id, "target_score", Number(e.target.value))
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-[#888888] mb-1">
                              Current Grade
                            </label>
                            <input
                              type="text"
                              value={subj.current_grade || ""}
                              onChange={(e) => updateSubject(subj.id, "current_grade", e.target.value)}
                              placeholder="e.g. B"
                              className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-[#888888] mb-1">
                              Target Grade
                            </label>
                            <input
                              type="text"
                              value={subj.target_grade}
                              onChange={(e) => updateSubject(subj.id, "target_grade", e.target.value)}
                              placeholder="e.g. A*"
                              className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>
                        </div>

                        {/* Gap feedback */}
                        <div className="pt-2 flex items-center justify-between text-xs border-t border-[#1C1C1C]">
                          <span className="text-[#737373]">Target Score Gap:</span>
                          <span className="font-semibold text-white">
                            {gap > 0 ? `+${gap} pt target gap` : "Target reached"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Previous Exam Results (Optional) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Previous Exam Results</h2>
                  <p className="text-[#737373] text-xs">
                    Log prior scores from midterms or quizzes to record your historical performance trajectory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addHistory}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Result</span>
                </button>
              </div>

              {historyRecords.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-6 space-y-3">
                  <Target className="w-7 h-7 text-[#444444] mx-auto" />
                  <div className="text-sm font-semibold text-white">
                    No previous results added yet.
                  </div>
                  <p className="text-xs text-[#737373] max-w-sm mx-auto">
                    Adding previous results is optional. You can skip this step or add them later.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyRecords.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-4 rounded-xl bg-[#101010] border border-[#222222] grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                    >
                      <div>
                        <label className="block text-xs font-medium text-[#888888] mb-1">
                          Exam Name
                        </label>
                        <input
                          type="text"
                          value={hist.exam_name}
                          onChange={(e) =>
                            setHistoryRecords(
                              historyRecords.map((h) =>
                                h.id === hist.id ? { ...h, exam_name: e.target.value } : h
                              )
                            )
                          }
                          placeholder="e.g. Midterm 1"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#888888] mb-1">Subject</label>
                        <select
                          value={hist.subject_name}
                          onChange={(e) => {
                            const found = subjects.find((s) => s.name === e.target.value);
                            setHistoryRecords(
                              historyRecords.map((h) =>
                                h.id === hist.id
                                  ? {
                                      ...h,
                                      subject_name: e.target.value,
                                      subject_id: found ? found.id : h.subject_id,
                                    }
                                  : h
                              )
                            );
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name || "Untitled Subject"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#888888] mb-1">
                          Score (%) / Grade
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={hist.score}
                            onChange={(e) =>
                              setHistoryRecords(
                                historyRecords.map((h) =>
                                  h.id === hist.id ? { ...h, score: Number(e.target.value) } : h
                                )
                              )
                            }
                            className="w-20 px-2 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                          />
                          <input
                            type="text"
                            value={hist.grade || ""}
                            onChange={(e) =>
                              setHistoryRecords(
                                historyRecords.map((h) =>
                                  h.id === hist.id ? { ...h, grade: e.target.value } : h
                                )
                              )
                            }
                            placeholder="Grade"
                            className="w-16 px-2 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                        <input
                          type="date"
                          value={hist.exam_date || ""}
                          onChange={(e) =>
                            setHistoryRecords(
                              historyRecords.map((h) =>
                                h.id === hist.id ? { ...h, exam_date: e.target.value } : h
                              )
                            )
                          }
                          className="px-2 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none focus:border-white"
                        />
                        <button
                          type="button"
                          onClick={() => removeHistory(hist.id)}
                          className="text-[#666666] hover:text-white p-1.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Upcoming Tests & Exams */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Upcoming Tests & Exams</h2>
                  <p className="text-[#737373] text-xs">
                    SchoolQuest automatically calculates days remaining and prioritizes subjects with near-term assessments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAssessment}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Test</span>
                </button>
              </div>

              {assessments.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-6 space-y-3">
                  <Calendar className="w-7 h-7 text-[#444444] mx-auto" />
                  <div className="text-sm font-semibold text-white">
                    No upcoming assessments yet.
                  </div>
                  <p className="text-xs text-[#737373] max-w-sm mx-auto">
                    If you have a test coming up, add it to give that subject immediate study priority.
                  </p>
                  <button
                    type="button"
                    onClick={addAssessment}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#050505] text-xs font-semibold hover:bg-[#E5E5E5] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Test</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assessments.map((asmt) => {
                    const daysRemaining = Math.ceil(
                      (new Date(asmt.assessment_date).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={asmt.id}
                        className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#888888] uppercase tracking-wider">
                              Assessment
                            </span>
                            <span
                              className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                                daysRemaining <= 3
                                  ? "bg-[#251A08] text-[#F59E0B] border border-[#442F0F]"
                                  : "bg-[#181818] text-[#A1A1A1] border border-[#282828]"
                              }`}
                            >
                              {daysRemaining >= 0 ? `${daysRemaining} days remaining` : "Passed"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAssessment(asmt.id)}
                            className="text-[#666666] hover:text-white p-1 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">
                              Test / Exam Name *
                            </label>
                            <input
                              type="text"
                              value={asmt.name}
                              onChange={(e) =>
                                setAssessments(
                                  assessments.map((a) =>
                                    a.id === asmt.id ? { ...a, name: e.target.value } : a
                                  )
                                )
                              }
                              placeholder="e.g. Unit 2 Test"
                              className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">
                              Subject
                            </label>
                            <select
                              value={asmt.subject_name}
                              onChange={(e) => {
                                const found = subjects.find((s) => s.name === e.target.value);
                                setAssessments(
                                  assessments.map((a) =>
                                    a.id === asmt.id
                                      ? {
                                          ...a,
                                          subject_name: e.target.value,
                                          subject_id: found ? found.id : a.subject_id,
                                        }
                                      : a
                                  )
                                );
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            >
                              {subjects.map((s) => (
                                <option key={s.id} value={s.name}>
                                  {s.name || "Untitled"}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">
                              Exam Date *
                            </label>
                            <input
                              type="date"
                              value={asmt.assessment_date}
                              onChange={(e) =>
                                setAssessments(
                                  assessments.map((a) =>
                                    a.id === asmt.id ? { ...a, assessment_date: e.target.value } : a
                                  )
                                )
                              }
                              className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">
                              Topics Covered (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={asmt.topics.join(", ")}
                              onChange={(e) =>
                                setAssessments(
                                  assessments.map((a) =>
                                    a.id === asmt.id
                                      ? {
                                          ...a,
                                          topics: e.target.value
                                            .split(",")
                                            .map((t) => t.trim())
                                            .filter(Boolean),
                                        }
                                      : a
                                  )
                                )
                              }
                              placeholder="e.g. Chapter 4, Photosynthesis"
                              className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">
                              Priority
                            </label>
                            <select
                              value={asmt.priority}
                              onChange={(e) =>
                                setAssessments(
                                  assessments.map((a) =>
                                    a.id === asmt.id
                                      ? { ...a, priority: e.target.value as PriorityLevel }
                                      : a
                                  )
                                )
                              }
                              className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                            >
                              <option value="high">High Priority</option>
                              <option value="medium">Medium Priority</option>
                              <option value="low">Low Priority</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Study Availability */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Study Availability</h2>
                <p className="text-[#737373] text-xs">
                  How much time can you comfortably commit each day? The planner divides this into focused quests.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStudyPref({ ...studyPref, daily_minutes: opt.value })}
                    className={`p-4 rounded-xl text-left border transition-all flex items-center justify-between ${
                      studyPref.daily_minutes === opt.value
                        ? "bg-[#161616] border-white text-white"
                        : "bg-[#101010] border-[#222222] text-[#888888] hover:border-[#383838]"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm text-white">{opt.label}</div>
                      <div className="text-xs text-[#737373]">
                        {opt.value <= 45 ? "1-2 focused quests" : `${Math.round(opt.value / 30)} quests`}
                      </div>
                    </div>
                    {studyPref.daily_minutes === opt.value && (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Preferred Daily Study Start Time
                </label>
                <input
                  type="time"
                  value={studyPref.preferred_start_time}
                  onChange={(e) =>
                    setStudyPref({ ...studyPref, preferred_start_time: e.target.value })
                  }
                  className="px-4 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          )}

          {/* STEP 6: Extracurricular Interests */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Extracurricular Passions</h2>
                <p className="text-[#737373] text-xs">
                  Select personal interests to receive optional rule-based suggestions linking coursework to real-world applications.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {PRESET_INTERESTS.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-white border-white text-[#050505]"
                          : "bg-[#121212] border-[#222222] text-[#888888] hover:text-white hover:border-[#383838]"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wizard Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-[#1C1C1C] flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#242424] text-[#CCCCCC] text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !username.trim()) {
                    alert("Please enter your display name.");
                    return;
                  }
                  setCurrentStep((prev) => prev + 1);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
              >
                <span>Enter Your Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
