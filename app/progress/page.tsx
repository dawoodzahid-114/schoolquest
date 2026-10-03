"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { loadStudentData, StudentPortalData } from "@/lib/storage/studentStore";
import { getLevelInfo } from "@/lib/gamification/levels";
import { getDaysRemaining } from "@/lib/planning/studyPlanEngine";
import { Quest, Subject, AcademicHistory } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  TrendingUp,
  Flame,
  Clock,
  CheckCircle2,
  Target,
  BarChart2,
  ShieldCheck,
  Zap,
  BookOpen,
} from "lucide-react";

export default function ProgressPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<StudentPortalData | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      setData(loadStudentData(user.id));
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
        Loading Progress Data...
      </div>
    );
  }

  const levelInfo = getLevelInfo(data.progress.xp);
  const totalQuests = data.quests.length;
  const completedQuests = data.quests.filter((q: Quest) => q.completed).length;
  const completionPercentage =
    totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

  const completedStudyMinutes = data.progress.total_minutes_studied;

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#262626] text-white flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Progress & Analytics
              </h1>
            </div>
            <p className="text-xs text-[#737373] mt-1">
              Objective operational tracking of study output, quest completion, and goal gaps.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#A1A1A1] bg-[#0E0E0E] border border-[#222222] px-3.5 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-[#888888] shrink-0" />
            <span>Metrics reflect logged study output, not predictive guarantees.</span>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Level & XP */}
          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#888888] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Zap className="w-3.5 h-3.5 text-[#CCCCCC]" />
                Level {levelInfo.level}
              </span>
              <span className="text-[10px] text-[#666666]">{levelInfo.title}</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{data.progress.xp} XP</div>
            <div className="w-full bg-[#1C1C1C] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${levelInfo.progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#666666]">
              <span>{levelInfo.currentLevelXp} XP in Tier</span>
              <span>{100 - levelInfo.currentLevelXp} XP to Next Lvl</span>
            </div>
          </div>

          {/* Daily Streak */}
          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#888888] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
                Streak
              </span>
              <span className="text-[10px] text-[#10B981]">Active</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{data.progress.streak} Days</div>
            <p className="text-[11px] text-[#666666]">
              Maintained by completing at least 1 quest daily.
            </p>
          </div>

          {/* Quest Completion */}
          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#888888] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                Quests Cleared
              </span>
              <span className="text-[10px] text-[#CCCCCC]">{completionPercentage}% Today</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {data.progress.total_quests_completed}
            </div>
            <p className="text-[11px] text-[#666666]">
              {completedQuests} of {totalQuests} quests completed today.
            </p>
          </div>

          {/* Study Time */}
          <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#888888] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Clock className="w-3.5 h-3.5 text-[#CCCCCC]" />
                Total Time
              </span>
              <span className="text-[10px] text-[#666666]">{data.studyPreferences.daily_minutes}m budget</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {Math.floor(completedStudyMinutes / 60)}h {completedStudyMinutes % 60}m
            </div>
            <p className="text-[11px] text-[#666666]">
              Logged across completed study sessions.
            </p>
          </div>
        </div>

        {/* SUBJECT GOAL GAP TRACKER */}
        <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-white" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Subject Goal Gap Breakdown
              </h2>
            </div>
            <Link href="/dashboard" className="text-xs text-[#A1A1A1] hover:text-white transition-colors">
              + Manage Subjects
            </Link>
          </div>

          {data.subjects.length === 0 ? (
            <div className="py-10 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-6 space-y-2">
              <BookOpen className="w-7 h-7 text-[#444444] mx-auto" />
              <div className="text-sm font-semibold text-white">No subjects configured.</div>
              <p className="text-xs text-[#737373]">
                Add your subjects in the dashboard to view target score analytics.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.subjects.map((subj: Subject) => {
                const gap = Math.max(0, subj.target_score - subj.current_score);
                const relatedTests = data.assessments
                  .filter((a) => a.subject_id === subj.id)
                  .map((a) => ({ ...a, days: getDaysRemaining(a.assessment_date) }))
                  .filter((a) => a.days >= 0);

                const nextTest = relatedTests[0];

                return (
                  <div
                    key={subj.id}
                    className="p-5 rounded-xl bg-[#101010] border border-[#222222] space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-white text-sm">{subj.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#181818] border border-[#282828] text-[#888888]">
                          Target: {subj.target_grade}
                        </span>
                      </div>

                      <div className="text-xs font-medium flex items-center gap-2">
                        <span className="text-[#888888]">Current: <strong className="text-white">{subj.current_score}%</strong></span>
                        <span className="text-[#444444]">•</span>
                        <span className="text-[#CCCCCC]">Target: <strong className="text-white">{subj.target_score}%</strong></span>
                        <span className="text-[#444444]">•</span>
                        <span className="text-[#A1A1A1] font-semibold">{gap} pt improvement gap</span>
                      </div>
                    </div>

                    {/* Monochrome Progress Bar */}
                    <div className="w-full bg-[#181818] h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-white h-full transition-all duration-300"
                        style={{ width: `${subj.current_score}%` }}
                      />
                      <div
                        className="bg-[#383838] h-full"
                        style={{ width: `${gap}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#737373]">
                      <div>
                        {subj.weak_topics && subj.weak_topics.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#555555]">Weak Topics:</span>
                            {subj.weak_topics.map((t: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-[#181818] border border-[#262626] text-[#CCCCCC]">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#555555]">No weak topics recorded.</span>
                        )}
                      </div>

                      {nextTest && (
                        <div className="text-[#A1A1A1] font-medium">
                          Next Assessment: {nextTest.name} ({nextTest.days} days remaining)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ACADEMIC HISTORY SECTION */}
        <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-white" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Academic History & Prior Results
              </h2>
            </div>
            <span className="text-xs text-[#737373]">Logged exam records</span>
          </div>

          {data.academicHistory.length === 0 ? (
            <div className="py-8 text-center rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222] p-4 space-y-2">
              <div className="text-xs font-semibold text-[#CCCCCC]">
                No previous results recorded yet.
              </div>
              <p className="text-[11px] text-[#737373]">
                You can add prior midterm or quiz scores in the onboarding wizard or settings.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.academicHistory.map((hist: AcademicHistory) => (
                <div
                  key={hist.id}
                  className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{hist.exam_name}</span>
                    {hist.grade && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#181818] text-[#CCCCCC] font-semibold border border-[#282828]">
                        Grade {hist.grade}
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold text-white">{hist.score}%</div>
                  <div className="text-[11px] text-[#737373] flex items-center justify-between pt-1">
                    <span>{hist.subject_name}</span>
                    <span>{hist.exam_date || "Prior exam"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
