"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { useAuth } from "@/lib/auth/authContext";
import {
  loadStudentData,
  toggleQuestInStudent,
  regenerateStudentQuests,
  addSubjectToStudent,
  updateSubjectInStudent,
  deleteSubjectFromStudent,
  addAssessmentToStudent,
  deleteAssessmentFromStudent,
  StudentPortalData,
} from "@/lib/storage/studentStore";
import { getLevelInfo } from "@/lib/gamification/levels";
import { getDaysRemaining } from "@/lib/planning/studyPlanEngine";
import { Quest, Subject, PriorityLevel } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Swords,
  Flame,
  Zap,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  Plus,
  BookOpen,
  Award,
  Target,
  Lightbulb,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Play,
  CalendarDays,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [recentXpReward, setRecentXpReward] = useState<number | null>(null);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);

  // Modals for adding Subject and Assessment directly from Dashboard
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjCurrent, setNewSubjCurrent] = useState(65);
  const [newSubjTarget, setNewSubjTarget] = useState(85);
  const [newSubjWeakTopics, setNewSubjWeakTopics] = useState("");

  // Edit Subject Modal state
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editSubjName, setEditSubjName] = useState("");
  const [editSubjCurrent, setEditSubjCurrent] = useState(70);
  const [editSubjCurrentGrade, setEditSubjCurrentGrade] = useState("B");
  const [editSubjTarget, setEditSubjTarget] = useState(85);
  const [editSubjTargetGrade, setEditSubjTargetGrade] = useState("A*");
  const [editSubjWeakTopics, setEditSubjWeakTopics] = useState("");

  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [newTestSubjId, setNewTestSubjId] = useState("");
  const [newTestDate, setNewTestDate] = useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [newTestTopics, setNewTestTopics] = useState("");
  const [newTestPriority, setNewTestPriority] = useState<PriorityLevel>("medium");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const studentData = loadStudentData(user.id);
      setData(studentData);
      if (studentData.subjects.length > 0 && !newTestSubjId) {
        setNewTestSubjId(studentData.subjects[0].id);
      }
    }

    const handleUpdate = () => {
      if (user) setData(loadStudentData(user.id));
    };

    window.addEventListener("schoolquest_student_updated", handleUpdate);
    return () => window.removeEventListener("schoolquest_student_updated", handleUpdate);
  }, [user, isLoading, router]);

  if (isLoading || !user || !data) {
    return (
      <div className="flex min-h-screen bg-[#050505] items-center justify-center text-[#737373] text-sm">
        Loading Student Portal...
      </div>
    );
  }

  const levelInfo = getLevelInfo(data.progress.xp);
  const totalQuests = data.quests.length;
  const completedQuests = data.quests.filter((q: Quest) => q.completed).length;
  const completionRate = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

  // Upcoming assessments sorted by proximity
  const upcomingAssessments = [...data.assessments]
    .map((a) => ({ ...a, days: getDaysRemaining(a.assessment_date) }))
    .filter((a) => a.days >= 0)
    .sort((a, b) => a.days - b.days);

  const handleToggleQuest = (questId: string) => {
    const { updatedData, gainedXp, leveledUp } = toggleQuestInStudent(data, questId);
    setData(updatedData);
    window.dispatchEvent(new Event("schoolquest_student_updated"));

    if (gainedXp > 0) {
      setRecentXpReward(gainedXp);
      setTimeout(() => setRecentXpReward(null), 3000);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.85 } });
    }

    if (leveledUp) {
      const newLvl = getLevelInfo(updatedData.progress.xp).level;
      setLevelUpMessage(`LEVEL UP • Reached Level ${newLvl}`);
      setTimeout(() => setLevelUpMessage(null), 4500);
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.7 } });
    }
  };

  const handleRegenerateQuests = () => {
    const refreshed = regenerateStudentQuests(data);
    setData(refreshed);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;

    const updated = addSubjectToStudent(data, {
      name: newSubjName.trim(),
      current_score: newSubjCurrent,
      target_score: newSubjTarget,
      target_grade: "A*",
      weak_topics: newSubjWeakTopics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setData(updated);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    setNewSubjName("");
    setNewSubjWeakTopics("");
    setShowAddSubjectModal(false);
  };

  const handleOpenEditSubject = (subj: Subject) => {
    setEditingSubject(subj);
    setEditSubjName(subj.name);
    setEditSubjCurrent(subj.current_score);
    setEditSubjCurrentGrade(subj.current_grade || "B");
    setEditSubjTarget(subj.target_score);
    setEditSubjTargetGrade(subj.target_grade || "A*");
    setEditSubjWeakTopics(subj.weak_topics ? subj.weak_topics.join(", ") : "");
  };

  const handleSaveEditedSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editSubjName.trim()) return;

    const updated = updateSubjectInStudent(data, editingSubject.id, {
      name: editSubjName.trim(),
      current_score: editSubjCurrent,
      current_grade: editSubjCurrentGrade.trim(),
      target_score: editSubjTarget,
      target_grade: editSubjTargetGrade.trim(),
      weak_topics: editSubjWeakTopics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setData(updated);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    setEditingSubject(null);
  };

  const handleDeleteSubject = (subjId: string) => {
    if (confirm("Are you sure you want to remove this subject? Associated assessments will also be removed.")) {
      const updated = deleteSubjectFromStudent(data, subjId);
      setData(updated);
      window.dispatchEvent(new Event("schoolquest_student_updated"));
    }
  };

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim() || !newTestSubjId) return;

    const matchedSubj = data.subjects.find((s) => s.id === newTestSubjId);
    const updated = addAssessmentToStudent(data, {
      name: newTestName.trim(),
      subject_id: newTestSubjId,
      subject_name: matchedSubj?.name || "Subject",
      assessment_date: newTestDate,
      priority: newTestPriority,
      topics: newTestTopics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setData(updated);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    setNewTestName("");
    setNewTestTopics("");
    setShowAddTestModal(false);
  };

  const handleDeleteAssessment = (asmtId: string) => {
    const updated = deleteAssessmentFromStudent(data, asmtId);
    setData(updated);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
  };

  const studentName = profile?.username || user.email?.split("@")[0] || "Student";

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      {/* Floating XP / Level Notification Toast */}
      {(recentXpReward || levelUpMessage) && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="px-4 py-2.5 rounded-xl bg-[#141414] text-white font-medium text-xs shadow-2xl flex items-center gap-2.5 border border-[#333333]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {levelUpMessage || `Quest Completed • +${recentXpReward} XP`}
            </span>
          </div>
        </div>
      )}

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-7">
        {/* HEADER & STUDENT IDENTITY */}
        <section className="p-6 sm:p-7 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#A1A1A1]">
                  {profile?.grade_level || "Student Portal"}
                </span>
                <span className="text-[#333333]">•</span>
                <span className="text-xs text-[#737373]">
                  {data.studyPreferences.daily_minutes} mins/day study availability
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back, {studentName}
              </h1>
              <p className="text-xs sm:text-sm text-[#737373] mt-1 max-w-xl leading-relaxed">
                Your deterministic daily study roadmap. Quests are calculated from target score gaps, upcoming tests, and availability.
              </p>
            </div>

            {/* 4 TOP SUMMARY CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              {/* STREAK */}
              <div className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] min-w-[125px]">
                <div className="flex items-center gap-1.5 text-[#888888] text-[11px] font-semibold mb-1 uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>STREAK</span>
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {data.progress.streak} <span className="text-xs font-normal text-[#737373]">{data.progress.streak === 1 ? "day" : "days"}</span>
                </div>
                <span className="text-[10px] text-[#666666] mt-1.5 block">
                  {data.progress.streak > 0 ? "Active today" : "Complete 1 quest"}
                </span>
              </div>

              {/* XP */}
              <div className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] min-w-[125px]">
                <div className="flex items-center gap-1.5 text-[#888888] text-[11px] font-semibold mb-1 uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-[#CCCCCC]" />
                  <span>XP / LEVEL</span>
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {levelInfo.currentLevelXp} <span className="text-xs font-normal text-[#737373]">/ 100</span>
                </div>
                <div className="mt-2 w-full bg-[#1C1C1C] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300"
                    style={{ width: `${levelInfo.progressPercentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#666666] mt-1 block">
                  Level {levelInfo.level} ({data.progress.xp} total XP)
                </span>
              </div>

              {/* TODAY */}
              <div className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] min-w-[125px]">
                <div className="flex items-center gap-1.5 text-[#888888] text-[11px] font-semibold mb-1 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>TODAY</span>
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {completedQuests} <span className="text-xs font-normal text-[#737373]">/ {totalQuests} quests</span>
                </div>
                <div className="mt-2 w-full bg-[#1C1C1C] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#666666] mt-1 block">
                  {completionRate}% Completed
                </span>
              </div>

              {/* STUDY TIME */}
              <div className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] min-w-[125px]">
                <div className="flex items-center gap-1.5 text-[#888888] text-[11px] font-semibold mb-1 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-[#CCCCCC]" />
                  <span>STUDY TIME</span>
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {data.progress.total_minutes_studied} <span className="text-xs font-normal text-[#737373]">min</span>
                </div>
                <span className="text-[10px] text-[#666666] mt-1.5 block">
                  {data.progress.total_quests_completed} cleared quests
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2-COLUMN MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {/* LEFT 2 COLUMNS: QUESTS & SUBJECTS */}
          <div className="lg:col-span-2 space-y-7">
            {/* TODAY'S QUEST FEED */}
            <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#262626] text-white flex items-center justify-center">
                    <Swords className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">TODAY&apos;S QUESTS</h2>
                    <p className="text-[11px] text-[#737373]">
                      Scheduled from your {data.studyPreferences.daily_minutes}-minute daily study availability
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRegenerateQuests}
                  title="Recalculate study plan"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#242424] hover:border-[#333333] text-[#A1A1A1] hover:text-white text-xs font-medium transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Recalculate</span>
                </button>
              </div>

              {/* Quests List or Empty State */}
              {data.quests.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-6 space-y-3">
                  <Swords className="w-7 h-7 text-[#444444] mx-auto" />
                  <div className="text-sm font-semibold text-white">
                    No quests yet.
                  </div>
                  <p className="text-xs text-[#737373] max-w-sm mx-auto">
                    Add your subjects and study preferences to generate your first quests.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddSubjectModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-[#050505] text-xs font-semibold hover:bg-[#E5E5E5] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Subject</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.quests.map((quest: Quest) => {
                    const isExpanded = expandedQuestId === quest.id;
                    const explanation = quest.why_this_quest || `Target score gap and study schedule prioritize ${quest.subject_name} for high-yield mastery.`;

                    return (
                      <div
                        key={quest.id}
                        className={`rounded-xl border transition-all ${
                          quest.completed
                            ? "bg-[#0A0A0A] border-[#1C1C1C] opacity-60"
                            : "bg-[#101010] border-[#222222] hover:border-[#333333]"
                        }`}
                      >
                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (!quest.completed) {
                                  router.push(`/focus?questId=${quest.id}`);
                                }
                              }}
                              className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                quest.completed
                                  ? "bg-white text-[#050505] cursor-default"
                                  : "border border-[#383838] hover:border-white text-transparent cursor-pointer"
                              }`}
                              title={quest.completed ? "Quest completed" : "Start Quest with Focus Timer"}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-sm font-semibold tracking-tight ${
                                    quest.completed ? "line-through text-[#666666]" : "text-white"
                                  }`}
                                >
                                  {quest.title}
                                </span>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#181818] border border-[#282828] text-[#A1A1A1]">
                                  {quest.quest_type}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-[#141414] text-[#888888]">
                                  {quest.subject_name}
                                </span>
                                {!quest.completed && (quest.accumulated_focus_seconds || 0) > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#181818] border border-[#333333] text-amber-400 font-mono">
                                    {Math.floor((quest.accumulated_focus_seconds || 0) / 60)} / {quest.duration_minutes}m saved
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#737373]">{quest.description}</p>
                              <div className="flex items-center gap-3 text-[11px] text-[#666666] pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {quest.scheduled_time} • {quest.duration_minutes}m
                                </span>
                                <span>•</span>
                                <span className="text-[#A1A1A1] font-medium">+{quest.xp} XP</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* "Why this quest?" Expandable Explanation Toggle */}
                            <button
                              type="button"
                              onClick={() => setExpandedQuestId(isExpanded ? null : quest.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-[#888888] hover:text-white bg-[#141414] hover:bg-[#1A1A1A] border border-[#242424] transition-colors"
                            >
                              <Info className="w-3 h-3 text-[#737373]" />
                              <span>Why this quest?</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>

                            {quest.completed ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#161616] text-[#737373] border border-[#222222]">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Completed</span>
                              </span>
                            ) : (quest.accumulated_focus_seconds || 0) > 0 ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/focus?questId=${quest.id}`)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#E5E5E5] text-[#050505] transition-all shadow-sm"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Resume Quest</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => router.push(`/focus?questId=${quest.id}`)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#E5E5E5] text-[#050505] transition-all shadow-sm"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Start Quest</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Deterministic Explanation Drawer */}
                        {isExpanded && (
                          <div className="px-4 py-3 bg-[#0A0A0A] border-t border-[#1C1C1C] rounded-b-xl text-xs space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#CCCCCC]">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              <span>Deterministic Recommendation Logic</span>
                            </div>
                            <p className="text-[#888888] leading-relaxed pl-3 border-l border-[#242424]">
                              {explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* YOUR SUBJECTS & GOAL GAP TRACKER */}
            <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-white" />
                  <h2 className="text-base font-bold text-white tracking-tight">Your Subjects & Targets</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent hover:bg-[#141414] border border-[#333333] hover:border-white text-white text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Subject</span>
                </button>
              </div>

              {data.subjects.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-6 space-y-3">
                  <BookOpen className="w-7 h-7 text-[#444444] mx-auto" />
                  <div className="text-sm font-semibold text-white">
                    Your academic journey starts here.
                  </div>
                  <p className="text-xs text-[#737373] max-w-sm mx-auto">
                    Add your first subject to begin creating personalized quests.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddSubjectModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-transparent hover:bg-[#141414] border border-[#333333] hover:border-white text-white text-xs font-semibold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Subject</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.subjects.map((subj: Subject) => {
                    const gap = Math.max(0, subj.target_score - subj.current_score);
                    return (
                      <div
                        key={subj.id}
                        className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-sm">{subj.name}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSubject(subj)}
                              className="text-[#666666] hover:text-white p-1 transition-colors"
                              title="Edit Subject"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubject(subj.id)}
                              className="text-[#666666] hover:text-white p-1 transition-colors"
                              title="Delete Subject"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Section 10: Clear Score Gap Metrics */}
                        <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-[#0D0D0D] rounded-lg text-center border border-[#1A1A1A]">
                          <div>
                            <div className="text-[9px] text-[#666666] uppercase font-mono tracking-wider">CURRENT</div>
                            <div className="font-bold text-white text-sm mt-0.5">{subj.current_score}%</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-[#666666] uppercase font-mono tracking-wider">TARGET</div>
                            <div className="font-bold text-white text-sm mt-0.5">{subj.target_score}%</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-[#666666] uppercase font-mono tracking-wider">GAP</div>
                            <div className="font-bold text-[#CCCCCC] text-sm mt-0.5">{gap} points</div>
                          </div>
                        </div>

                        {/* Monochrome Progress Bar */}
                        <div>
                          <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden flex">
                            <div
                              className="bg-white h-full"
                              style={{ width: `${subj.current_score}%` }}
                            />
                            <div
                              className="bg-[#383838] h-full"
                              style={{ width: `${gap}%` }}
                            />
                          </div>
                        </div>

                        {/* Weak topics */}
                        {subj.weak_topics && subj.weak_topics.length > 0 && (
                          <div className="pt-2 border-t border-[#1C1C1C]">
                            <span className="text-[10px] font-semibold uppercase text-[#666666] block mb-1">
                              Weak Topics / Focus:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {subj.weak_topics.map((t: string, i: number) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded bg-[#181818] border border-[#282828] text-[#CCCCCC]"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: UPCOMING TESTS & DETERMINISTIC STUDY INSIGHTS */}
          <div className="space-y-7">
            {/* UPCOMING ASSESSMENTS */}
            <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Upcoming Assessments</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTestModal(true)}
                  className="text-xs text-[#A1A1A1] hover:text-white font-medium"
                >
                  + Add Test
                </button>
              </div>

              {upcomingAssessments.length === 0 ? (
                <div className="py-8 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-4 space-y-2">
                  <Calendar className="w-6 h-6 text-[#444444] mx-auto" />
                  <div className="text-xs font-semibold text-[#CCCCCC]">No upcoming assessments.</div>
                  <p className="text-[11px] text-[#737373]">
                    Add a test so SchoolQuest can prioritize your study time.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddTestModal(true)}
                    className="text-xs text-white hover:underline block mx-auto font-medium pt-1"
                  >
                    + Add Test
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingAssessments.map((asmt) => (
                    <div
                      key={asmt.id}
                      className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-white">{asmt.name}</div>
                          <div className="text-[11px] text-[#737373]">{formatDateDisplay(asmt.assessment_date)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              asmt.days <= 3
                                ? "bg-[#251A08] text-[#F59E0B] border border-[#442F0F]"
                                : "bg-[#181818] text-[#A1A1A1] border border-[#282828]"
                            }`}
                          >
                            {asmt.days === 0 ? "Today!" : `${asmt.days} days remaining`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteAssessment(asmt.id)}
                            className="text-[#666666] hover:text-white p-1 transition-colors"
                            title="Delete Test"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1C1C1C]">
                        <span className="text-[#888888]">{asmt.subject_name}</span>
                        <span className="text-[10px] uppercase font-mono text-[#CCCCCC]">
                          Priority: {asmt.priority}
                        </span>
                      </div>

                      {asmt.topics && asmt.topics.length > 0 && (
                        <div className="text-[11px] text-[#737373]">
                          <span className="text-[#555555]">Topics: </span>
                          {asmt.topics.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RULE-BASED RECOMMENDATIONS (ZERO AI) */}
            <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-white" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Study Insights</h3>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#181818] text-[#888888]">
                  Deterministic
                </span>
              </div>

              <div className="space-y-2.5">
                {data.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] space-y-1.5"
                  >
                    <div className="text-xs font-semibold text-white">{rec.title}</div>
                    <p className="text-xs text-[#888888] leading-relaxed">{rec.content}</p>
                    <div className="text-[11px] text-[#CCCCCC] bg-[#141414] border border-[#242424] p-2 rounded-lg font-medium">
                      <strong>Action:</strong> {rec.actionable_step}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TIMETABLE BUILDER / TODAY'S SCHEDULE TILE */}
            <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1A1A1A]">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-white" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider">Study Timetable</h3>
                </div>
                <Link
                  href="/timetable"
                  className="text-xs text-[#A1A1A1] hover:text-white font-medium flex items-center gap-1"
                >
                  View Schedule <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {(!data.timetableBlocks || data.timetableBlocks.length === 0) ? (
                <div className="py-6 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-4 space-y-2.5">
                  <CalendarDays className="w-6 h-6 text-[#555555] mx-auto" />
                  <div className="text-xs font-semibold text-white">No Timetable Generated Yet</div>
                  <p className="text-[11px] text-[#737373] max-w-xs mx-auto">
                    Input your school hours, sleep, and fixed commitments to build a realistic daily study schedule.
                  </p>
                  <Link
                    href="/timetable/setup"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all mt-1"
                  >
                    <span>Build My Timetable</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#888888]">
                    <span>{data.timetableConfig?.daily_study_minutes || 90}m study/day configured</span>
                    <Link href="/timetable/setup" className="text-white hover:underline text-[11px]">
                      Preferences
                    </Link>
                  </div>
                  <Link
                    href="/timetable"
                    className="block p-3.5 rounded-xl bg-[#121212] hover:bg-[#181818] border border-[#242424] transition-colors"
                  >
                    <div className="text-xs font-semibold text-white flex items-center justify-between">
                      <span>{data.timetableBlocks.length} Scheduled Blocks</span>
                      <span className="text-[10px] text-[#A1A1A1] font-mono">Today & Week</span>
                    </div>
                    <p className="text-[11px] text-[#737373] mt-1">
                      School, lunch buffer, study sessions & breaks scheduled with zero conflicts.
                    </p>
                  </Link>
                </div>
              )}
            </div>

            {/* QUICK TILES */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/skill-tree"
                className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1E1E1E] hover:border-[#383838] transition-colors flex flex-col justify-between"
              >
                <div>
                  <Award className="w-4 h-4 text-white mb-2" />
                  <div className="text-xs font-bold text-white">Skill Tree</div>
                  <p className="text-[11px] text-[#737373] mt-1">Academic roadmap</p>
                </div>
                <span className="text-[10px] text-[#A1A1A1] font-semibold mt-3 flex items-center gap-1">
                  View Tree <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>

              <Link
                href="/progress"
                className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1E1E1E] hover:border-[#383838] transition-colors flex flex-col justify-between"
              >
                <div>
                  <Target className="w-4 h-4 text-white mb-2" />
                  <div className="text-xs font-bold text-white">Progress Hub</div>
                  <p className="text-[11px] text-[#737373] mt-1">Hours & analytics</p>
                </div>
                <span className="text-[10px] text-[#A1A1A1] font-semibold mt-3 flex items-center gap-1">
                  View Analytics <ArrowUpRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ADD SUBJECT MODAL */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <h3 className="text-base font-bold text-white">Add Subject</h3>
              <button
                onClick={() => setShowAddSubjectModal(false)}
                className="text-[#737373] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  placeholder="e.g. Biology, History, Chemistry, Calculus"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Current Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newSubjCurrent}
                    onChange={(e) => setNewSubjCurrent(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Target Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newSubjTarget}
                    onChange={(e) => setNewSubjTarget(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Weak Topics (comma-separated)
                </label>
                <input
                  type="text"
                  value={newSubjWeakTopics}
                  onChange={(e) => setNewSubjWeakTopics(e.target.value)}
                  placeholder="e.g. Cell Division, Organic Reactions"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#202020] text-[#A1A1A1] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBJECT MODAL */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <h3 className="text-base font-bold text-white">Edit Subject: {editingSubject.name}</h3>
              <button
                onClick={() => setEditingSubject(null)}
                className="text-[#737373] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={editSubjName}
                  onChange={(e) => setEditSubjName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Current Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editSubjCurrent}
                    onChange={(e) => setEditSubjCurrent(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Target Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editSubjTarget}
                    onChange={(e) => setEditSubjTarget(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Current Grade
                  </label>
                  <input
                    type="text"
                    value={editSubjCurrentGrade}
                    onChange={(e) => setEditSubjCurrentGrade(e.target.value)}
                    placeholder="e.g. B"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Target Grade
                  </label>
                  <input
                    type="text"
                    value={editSubjTargetGrade}
                    onChange={(e) => setEditSubjTargetGrade(e.target.value)}
                    placeholder="e.g. A*"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Weak Topics (comma-separated)
                </label>
                <input
                  type="text"
                  value={editSubjWeakTopics}
                  onChange={(e) => setEditSubjWeakTopics(e.target.value)}
                  placeholder="e.g. Cell Division, Organic Reactions"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#202020] text-[#A1A1A1] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
                >
                  Update Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ASSESSMENT MODAL */}
      {showAddTestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <h3 className="text-base font-bold text-white">Add Upcoming Test</h3>
              <button
                onClick={() => setShowAddTestModal(false)}
                className="text-[#737373] hover:text-white"
              >
                ✕
              </button>
            </div>

            {data.subjects.length === 0 ? (
              <div className="text-xs text-[#888888] space-y-3">
                <p>Please add at least one subject before scheduling a test.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTestModal(false);
                    setShowAddSubjectModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-white text-[#050505] text-xs font-semibold"
                >
                  + Add Subject First
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateAssessment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Test / Exam Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    placeholder="e.g. Unit 3 Test, Midterm"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">Subject</label>
                    <select
                      value={newTestSubjId}
                      onChange={(e) => setNewTestSubjId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none focus:border-white"
                    >
                      {data.subjects.map((s: Subject) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">Date</label>
                    <input
                      type="date"
                      required
                      value={newTestDate}
                      onChange={(e) => setNewTestDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Topics Covered
                  </label>
                  <input
                    type="text"
                    value={newTestTopics}
                    onChange={(e) => setNewTestTopics(e.target.value)}
                    placeholder="e.g. Forces, Momentum, Energy"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">Priority</label>
                  <select
                    value={newTestPriority}
                    onChange={(e) => setNewTestPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none focus:border-white"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222222]">
                  <button
                    type="button"
                    onClick={() => setShowAddTestModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#202020] text-[#A1A1A1] text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
                  >
                    Save Test
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
