"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { loadStudentData, StudentPortalData } from "@/lib/storage/studentStore";
import { Subject } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  GitFork,
  Target,
  Zap,
  Award,
  Plus,
  Compass,
} from "lucide-react";

export default function SkillTreePage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [selectedNode, setSelectedNode] = useState<{
    title: string;
    subject: string;
    status: string;
    description: string;
    xpValue: number;
  } | null>(null);

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
        Loading Skill Tree...
      </div>
    );
  }

  const studentName = profile?.username || user.email?.split("@")[0] || "Student";

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#262626] text-white flex items-center justify-center">
                <GitFork className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Academic Progression Map</h1>
            </div>
            <p className="text-xs text-[#737373] mt-1">
              Hierarchical academic roadmap generated dynamically from your enrolled subjects and weak topics.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0B0B] border border-[#1E1E1E] text-xs text-[#888888]">
            <Compass className="w-3.5 h-3.5 text-white" />
            <span>Dynamic subject-linked hierarchy</span>
          </div>
        </div>

        {/* Tree Canvas */}
        {data.subjects.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-[#0B0B0B] border border-dashed border-[#222222] p-8 space-y-4">
            <GitFork className="w-10 h-10 text-[#444444] mx-auto" />
            <div className="text-base font-bold text-white">
              Add your subjects to generate your academic tree.
            </div>
            <p className="text-xs text-[#737373] max-w-md mx-auto">
              Your academic progression map visualizes your actual subjects, focal concepts, and mastery practice nodes.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#050505] text-xs font-semibold hover:bg-[#E5E5E5] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subjects in Dashboard</span>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-6 sm:p-10 shadow-2xl overflow-x-auto relative space-y-6">
            {/* Section 11: Academic Node State Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] pb-4 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-white border border-white" />
                <span className="text-white font-medium">Completed / Target Reached</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#2A2A2A] border border-[#444444]" />
                <span className="text-[#CCCCCC]">Developing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#101010] border-2 border-white" />
                <span className="text-white font-medium">Needs Attention (Gap &gt; 15)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0A0A0A] border border-[#1C1C1C]" />
                <span className="text-[#666666]">Not Assessed</span>
              </div>
            </div>

            {/* ROOT NODE: STUDENT'S ACADEMIC FOUNDATION */}
            <div className="flex flex-col items-center">
              <div
                onClick={() =>
                  setSelectedNode({
                    title: `${studentName}'s Academic Foundation`,
                    subject: "General",
                    status: "Core Foundation",
                    description: `Active study roadmap tracking ${data.subjects.length} enrolled subjects. Level ${data.progress.level} with ${data.progress.xp} total XP.`,
                    xpValue: data.progress.xp,
                  })
                }
                className="cursor-pointer p-4 rounded-xl bg-[#141414] border border-[#2D2D2D] hover:border-[#4A4A4A] text-white font-semibold text-sm flex items-center gap-2.5 transition-all shadow-md"
              >
                <Award className="w-4 h-4 text-white" />
                <span>{studentName}&apos;s Academic Foundation</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#202020] border border-[#333333] text-[#A1A1A1]">
                  Lvl {data.progress.level}
                </span>
              </div>

              {/* Connecting Trunk */}
              <div className="w-px h-8 bg-[#242424]" />
            </div>

            {/* BRANCHES: STUDENT'S ACTUAL SUBJECTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative mt-1">
              {data.subjects.map((subj: Subject, idx: number) => {
                const gap = Math.max(0, subj.target_score - subj.current_score);
                const isCompleted = gap === 0 || subj.current_score >= subj.target_score;
                const needsAttention = gap > 15;
                const hasWeakTopics = subj.weak_topics && subj.weak_topics.length > 0;

                return (
                  <div key={subj.id} className="flex flex-col items-center">
                    {/* Subject Node with 4-state monochrome styling */}
                    <div
                      onClick={() =>
                        setSelectedNode({
                          title: subj.name,
                          subject: subj.name,
                          status: isCompleted ? "Completed (Target Reached)" : needsAttention ? "Needs Attention" : "Developing",
                          description: `Current: ${subj.current_score}% | Target Goal: ${subj.target_score}%. Score gap: ${gap} points.`,
                          xpValue: 40,
                        })
                      }
                      className={`cursor-pointer w-full max-w-[230px] p-4 rounded-xl transition-all text-center space-y-2 shadow-sm ${
                        isCompleted
                          ? "bg-white text-[#050505] border border-white"
                          : needsAttention
                          ? "bg-[#101010] border-2 border-white text-white"
                          : "bg-[#1C1C1C] border border-[#383838] text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isCompleted ? "text-[#555555]" : "text-[#888888]"
                        }`}>
                          Branch {idx + 1}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          isCompleted ? "bg-[#ECECEC] text-[#050505]" : "bg-[#141414] text-[#CCCCCC] border border-[#242424]"
                        }`}>
                          {subj.current_score}% → {subj.target_score}%
                        </span>
                      </div>
                      <div className="text-sm font-bold tracking-tight">{subj.name}</div>
                      <div className={`text-[11px] ${isCompleted ? "text-[#555555]" : "text-[#888888]"}`}>
                        Target: {subj.target_grade} {gap > 0 ? `(${gap}pt gap)` : "• Met"}
                      </div>
                    </div>

                    {/* Stem */}
                    <div className="w-px h-7 bg-[#242424]" />

                    {/* Sub-node 1: Weak Topic or Core Theory */}
                    <div
                      onClick={() =>
                        setSelectedNode({
                          title: subj.weak_topics?.[0] || "Core Concepts",
                          subject: subj.name,
                          status: hasWeakTopics ? "Needs Attention (Focal Topic)" : "Developing",
                          description: hasWeakTopics
                            ? `Identified focal topics: ${subj.weak_topics.join(", ")}.`
                            : `Core syllabus revision for ${subj.name}.`,
                          xpValue: 25,
                        })
                      }
                      className={`cursor-pointer w-full max-w-[200px] p-3 rounded-lg transition-all text-center space-y-1 ${
                        hasWeakTopics
                          ? "bg-[#101010] border-2 border-[#555555] hover:border-white text-white"
                          : "bg-[#0E0E0E] border border-[#222222] hover:border-[#383838] text-[#A1A1A1]"
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center justify-center gap-1.5">
                        <Target className="w-3.5 h-3.5 shrink-0 text-[#888888]" />
                        <span className="truncate">{subj.weak_topics?.[0] || "Core Syllabus"}</span>
                      </div>
                      <div className="text-[10px] text-[#666666]">Concept Review</div>
                    </div>

                    {/* Stem */}
                    <div className="w-px h-7 bg-[#242424]" />

                    {/* Sub-node 2: Practice Drills */}
                    <div
                      onClick={() =>
                        setSelectedNode({
                          title: `${subj.name} Practice Drills`,
                          subject: subj.name,
                          status: "Active Practice",
                          description: `Timed practice problem sets and past paper questions for ${subj.name}.`,
                          xpValue: 35,
                        })
                      }
                      className="cursor-pointer w-full max-w-[200px] p-3 rounded-lg bg-[#0E0E0E] border border-[#222222] hover:border-[#383838] transition-all text-center space-y-1"
                    >
                      <div className="text-xs font-semibold text-white flex items-center justify-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 shrink-0 text-[#888888]" />
                        <span>Practice Drills</span>
                      </div>
                      <div className="text-[10px] text-[#666666]">Exam-Style Questions</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Node Detail Drawer */}
        {selectedNode && (
          <div className="p-5 rounded-xl bg-[#0E0E0E] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#A1A1A1]">
                  {selectedNode.subject}
                </span>
                <span className="text-[#333333]">•</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#181818] border border-[#262626] text-[#CCCCCC]">
                  {selectedNode.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{selectedNode.title}</h3>
              <p className="text-xs text-[#737373]">{selectedNode.description}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-semibold text-white bg-[#181818] border border-[#282828] px-3 py-1 rounded-lg">
                +{selectedNode.xpValue} XP
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#242424] text-[#A1A1A1] hover:text-white text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
