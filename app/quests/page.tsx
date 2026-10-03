"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { useAuth } from "@/lib/auth/authContext";
import {
  loadStudentData,
  toggleQuestInStudent,
  regenerateStudentQuests,
  saveStudentData,
  StudentPortalData,
} from "@/lib/storage/studentStore";
import { Quest, QuestType, Subject } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Swords,
  Clock,
  Plus,
  RefreshCw,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  Play,
  CheckCircle2,
} from "lucide-react";

export default function QuestsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);

  // New Quest Form
  const [newQuestTitle, setNewQuestTitle] = useState("");
  const [newQuestSubject, setNewQuestSubject] = useState("");
  const [newQuestType, setNewQuestType] = useState<QuestType>("Practice");
  const [newQuestDuration, setNewQuestDuration] = useState(30);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const studentData = loadStudentData(user.id);
      setData(studentData);
      if (studentData.subjects.length > 0 && !newQuestSubject) {
        setNewQuestSubject(studentData.subjects[0].name);
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
        Loading Quests...
      </div>
    );
  }

  const handleToggle = (questId: string) => {
    const { updatedData, gainedXp } = toggleQuestInStudent(data, questId);
    setData(updatedData);
    window.dispatchEvent(new Event("schoolquest_student_updated"));

    if (gainedXp > 0) {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.85 } });
    }
  };

  const handleAddNewQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestTitle.trim()) return;

    const targetSubj = data.subjects.find((s: Subject) => s.name === newQuestSubject) || data.subjects[0];
    const createdQuest: Quest = {
      id: `quest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      subject_id: targetSubj ? targetSubj.id : "subj-manual",
      subject_name: newQuestSubject || "General",
      title: newQuestTitle.trim(),
      description: `Targeted study session for ${newQuestSubject}`,
      quest_type: newQuestType,
      scheduled_date: new Date().toISOString().split("T")[0],
      scheduled_time: "Now",
      duration_minutes: newQuestDuration,
      xp: Math.round(10 + newQuestDuration * 0.6),
      completed: false,
      why_this_quest: `Custom study session configured for ${newQuestSubject} (${newQuestDuration} mins).`,
    };

    const updated = {
      ...data,
      quests: [createdQuest, ...data.quests],
    };
    saveStudentData(updated);
    setData(updated);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    setNewQuestTitle("");
    setShowAddModal(false);
  };

  const filteredQuests = data.quests.filter((q: Quest) => {
    const matchType = selectedType === "All" || q.quest_type === selectedType;
    const matchSubj = selectedSubject === "All" || q.subject_name === selectedSubject;
    return matchType && matchSubj;
  });

  const questTypes = [
    "All",
    "Learn",
    "Review",
    "Practice",
    "Revision",
    "Mistake Review",
    "Test Preparation",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#262626] text-white flex items-center justify-center">
                <Swords className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Daily Quests</h1>
            </div>
            <p className="text-xs text-[#737373] mt-1">
              Deterministic daily study sessions. Complete them to earn XP and maintain your streak.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const refreshed = regenerateStudentQuests(data);
                setData(refreshed);
                window.dispatchEvent(new Event("schoolquest_student_updated"));
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#242424] text-[#CCCCCC] text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate Quests</span>
            </button>

            {data.subjects.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Custom Quest</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        {data.quests.length > 0 && (
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1E1E1E] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#737373] font-semibold uppercase tracking-wider">Subject:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626] text-white text-xs focus:outline-none focus:border-white"
              >
                <option value="All">All Subjects</option>
                {data.subjects.map((s: Subject) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {questTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedType === type
                      ? "bg-white text-[#050505]"
                      : "bg-[#141414] text-[#888888] hover:text-white border border-transparent hover:border-[#262626]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quests List */}
        <div className="space-y-3">
          {data.quests.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-[#0B0B0B] border border-dashed border-[#222222] p-6 space-y-3">
              <BookOpen className="w-8 h-8 text-[#444444] mx-auto" />
              <div className="text-sm font-bold text-white">
                No quests yet.
              </div>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                Add your subjects and study preferences to generate your first quests.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#050505] text-xs font-semibold hover:bg-[#E5E5E5] transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          ) : filteredQuests.length === 0 ? (
            <div className="py-12 text-center text-[#737373] text-xs rounded-xl bg-[#0B0B0B] border border-[#1E1E1E]">
              No quests match the selected filters.
            </div>
          ) : (
            filteredQuests.map((quest: Quest) => {
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
                            className={`text-sm font-semibold ${
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

                  {/* Expandable Explanation Drawer */}
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
            })
          )}
        </div>
      </main>

      {/* Add Custom Quest Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <h3 className="text-base font-bold text-white">Create Study Quest</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#737373] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewQuest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Quest Title
                </label>
                <input
                  type="text"
                  required
                  value={newQuestTitle}
                  onChange={(e) => setNewQuestTitle(e.target.value)}
                  placeholder="e.g. Practice 10 Exam Questions"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">Subject</label>
                  <select
                    value={newQuestSubject}
                    onChange={(e) => setNewQuestSubject(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none focus:border-white"
                  >
                    {data.subjects.map((s: Subject) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                    Quest Type
                  </label>
                  <select
                    value={newQuestType}
                    onChange={(e) => setNewQuestType(e.target.value as QuestType)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none focus:border-white"
                  >
                    <option value="Practice">Practice</option>
                    <option value="Review">Review</option>
                    <option value="Learn">Learn</option>
                    <option value="Revision">Revision</option>
                    <option value="Mistake Review">Mistake Review</option>
                    <option value="Test Preparation">Test Preparation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Duration: {newQuestDuration} mins (+{Math.round(10 + newQuestDuration * 0.6)} XP)
                </label>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={newQuestDuration}
                  onChange={(e) => setNewQuestDuration(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#202020] text-[#A1A1A1] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
                >
                  Add Quest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
