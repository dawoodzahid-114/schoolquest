"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/authContext";
import {
  loadStudentData,
  generateAndSaveTimetable,
  updateTimetableBlock,
  deleteTimetableBlock,
  addCustomTimetableBlock,
  StudentPortalData,
} from "@/lib/storage/studentStore";
import {
  DayOfWeek,
  TimetableBlock,
  BlockType,
  Quest,
} from "@/types";
import {
  DAYS_OF_WEEK,
  getCurrentDayOfWeek,
  formatTime12h,
  timeToMinutes,
} from "@/lib/planning/timetableEngine";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Sliders,
  Sparkles,
  BookOpen,
  Coffee,
  School,
  AlertCircle,
  Check,
} from "lucide-react";

export default function TimetablePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<StudentPortalData | null>(null);

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("Monday");
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(0);

  // Edit block modal
  const [editingBlock, setEditingBlock] = useState<TimetableBlock | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDay, setEditDay] = useState<DayOfWeek>("Monday");

  // Add custom block modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockType, setNewBlockType] = useState<BlockType>("study");
  const [newBlockDay, setNewBlockDay] = useState<DayOfWeek>("Monday");
  const [newBlockStart, setNewBlockStart] = useState("16:00");
  const [newBlockEnd, setNewBlockEnd] = useState("17:00");

  const todayDay = getCurrentDayOfWeek();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const studentData = loadStudentData(user.id);
      setData(studentData);
      setSelectedDay(todayDay);
    }

    // Keep current time in minutes synced for "▶ NOW" badge
    const updateTime = () => {
      const d = new Date();
      setCurrentTimeMinutes(d.getHours() * 60 + d.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    const handleUpdate = () => {
      if (user) setData(loadStudentData(user.id));
    };
    window.addEventListener("schoolquest_student_updated", handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("schoolquest_student_updated", handleUpdate);
    };
  }, [user, isLoading, router, todayDay]);

  if (isLoading || !user || !data) {
    return (
      <div className="flex min-h-screen bg-[#050505] items-center justify-center text-[#737373] text-sm">
        Loading Timetable...
      </div>
    );
  }

  const timetableBlocks = data.timetableBlocks || [];
  const hasTimetable = timetableBlocks.length > 0;

  // Filter blocks for selected day
  const dayBlocks = timetableBlocks
    .filter((b) => b.day_of_week === selectedDay)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.end_time));

  // Study stats for the selected day
  const studyBlocks = dayBlocks.filter((b) => b.block_type === "study");
  const totalDayStudyMins = studyBlocks.reduce((sum, b) => sum + b.duration_minutes, 0);

  // Status calculation for each block
  const getBlockTimeStatus = (block: TimetableBlock, isTodaySelected: boolean) => {
    if (!isTodaySelected) return "regular";
    const startM = timeToMinutes(block.start_time);
    const endM = timeToMinutes(block.end_time);

    if (currentTimeMinutes >= startM && currentTimeMinutes <= endM) {
      return "now";
    }
    if (currentTimeMinutes > endM) {
      return "past";
    }
    return "upcoming";
  };

  // Actions
  const handleRegenerate = () => {
    const updated = generateAndSaveTimetable(data);
    setData(updated);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
  };

  const handleOpenEdit = (block: TimetableBlock) => {
    setEditingBlock(block);
    setEditTitle(block.title);
    setEditStart(block.start_time);
    setEditEnd(block.end_time);
    setEditDay(block.day_of_week);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock || !editTitle.trim()) return;

    const startM = timeToMinutes(editStart);
    const endM = timeToMinutes(editEnd);
    const dur = Math.max(15, endM - startM);

    const updated = updateTimetableBlock(data, editingBlock.id, {
      title: editTitle.trim(),
      start_time: editStart,
      end_time: editEnd,
      day_of_week: editDay,
      duration_minutes: dur,
    });

    setData(updated);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    setEditingBlock(null);
  };

  const handleDelete = (blockId: string) => {
    if (confirm("Are you sure you want to remove this block from your timetable?")) {
      const updated = deleteTimetableBlock(data, blockId);
      setData(updated);
      window.dispatchEvent(new Event("schoolquest_student_updated"));
    }
  };

  const handleAddCustomBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockTitle.trim()) return;

    const startM = timeToMinutes(newBlockStart);
    const endM = timeToMinutes(newBlockEnd);
    const dur = Math.max(15, endM - startM);

    const updated = addCustomTimetableBlock(data, {
      title: newBlockTitle.trim(),
      block_type: newBlockType,
      day_of_week: newBlockDay,
      start_time: newBlockStart,
      end_time: newBlockEnd,
      duration_minutes: dur,
      is_completed: false,
    });

    setData(updated);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    setNewBlockTitle("");
    setShowAddModal(false);
  };

  // Get matching quest for a study block
  const getLinkedQuest = (block: TimetableBlock): Quest | undefined => {
    if (!block.quest_id) return undefined;
    return data.quests.find((q) => q.id === block.quest_id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#262626] text-white flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Academic Timetable</h1>
            </div>
            <p className="text-xs text-[#737373] mt-1">
              Rule-based daily schedule translating your school hours, sleep, and commitments into
              focused study blocks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/timetable/setup"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#242424] text-[#CCCCCC] text-xs font-medium transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{hasTimetable ? "Adjust Settings" : "Build My Timetable"}</span>
            </Link>

            {hasTimetable && (
              <>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#242424] text-[#CCCCCC] text-xs font-medium transition-colors"
                  title="Rebuild schedule from current constraints"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewBlockDay(selectedDay);
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Block</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* If NO timetable generated yet, show Onboarding Hero */}
        {!hasTimetable ? (
          <div className="py-20 text-center rounded-3xl bg-[#0B0B0B] border border-dashed border-[#222222] p-8 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#262626] flex items-center justify-center mx-auto text-white shadow-xl">
              <Calendar className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Generate Your Personalized Timetable
              </h2>
              <p className="text-xs text-[#737373] leading-relaxed">
                Input your school hours, sleep schedule, and recurring commitments (tuition, sports,
                prayers). SchoolQuest automatically generates a deterministic study timetable
                without conflicts.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/timetable/setup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-bold transition-all shadow-xl hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4 text-[#050505]" />
                <span>Build My Timetable</span>
              </Link>
            </div>
          </div>
        ) : (
          /* TIMETABLE VIEW */
          <div className="space-y-6">
            {/* Day of Week Tabs */}
            <div className="p-2 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] flex items-center gap-1.5 overflow-x-auto">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDay === day;
                const isToday = todayDay === day;
                const count = timetableBlocks.filter((b) => b.day_of_week === day).length;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 min-w-[95px] py-2 px-3 rounded-xl text-center transition-all ${
                      isSelected
                        ? "bg-white text-[#050505] font-bold shadow-sm"
                        : "text-[#888888] hover:text-white hover:bg-[#121212]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <span>{day.slice(0, 3)}</span>
                      {isToday && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-black" : "bg-emerald-400"
                          }`}
                        />
                      )}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5 font-mono">{count} blocks</div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Info Banner */}
            <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1E1E1E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  {selectedDay === todayDay ? `TODAY — ${selectedDay}` : selectedDay}
                </span>
                <span className="text-xs text-[#737373]">•</span>
                <span className="text-xs text-[#CCCCCC] font-mono">
                  {totalDayStudyMins} min study planned ({studyBlocks.length} sessions)
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#888888]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>▶ NOW</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Completed</span>
                </span>
              </div>
            </div>

            {/* Blocks Timeline List */}
            <div className="space-y-3">
              {dayBlocks.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-[#0B0B0B] border border-dashed border-[#222222] p-4 space-y-2">
                  <BookOpen className="w-6 h-6 text-[#555555] mx-auto" />
                  <div className="text-xs font-semibold text-white">No blocks scheduled for {selectedDay}.</div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBlockDay(selectedDay);
                      setShowAddModal(true);
                    }}
                    className="text-xs text-white hover:underline font-medium"
                  >
                    + Add a Block
                  </button>
                </div>
              ) : (
                dayBlocks.map((block) => {
                  const linkedQuest = getLinkedQuest(block);
                  const isCompleted = block.is_completed || linkedQuest?.completed;
                  const isTodaySelected = selectedDay === todayDay;
                  const timeStatus = getBlockTimeStatus(block, isTodaySelected);

                  // Colors by type
                  const isStudy = block.block_type === "study";
                  const isSchool = block.block_type === "school";
                  const isBreak = block.block_type === "break";
                  const isCommitment = block.block_type === "commitment";
                  const isMeal = block.block_type === "meal";

                  return (
                    <div
                      key={block.id}
                      className={`p-4 rounded-xl border transition-all ${
                        timeStatus === "now"
                          ? "bg-[#141414] border-white/40 ring-1 ring-white/20"
                          : isCompleted
                          ? "bg-[#0A0A0A] border-[#1C1C1C] opacity-75"
                          : "bg-[#101010] border-[#222222] hover:border-[#333333]"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Time & Title */}
                        <div className="flex items-start gap-3">
                          {/* Time badge */}
                          <div className="w-24 shrink-0 font-mono text-xs text-[#888888] pt-0.5">
                            <div>{formatTime12h(block.start_time)}</div>
                            <div className="text-[10px] text-[#555555]">
                              {formatTime12h(block.end_time)}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-semibold tracking-tight ${
                                  isCompleted ? "line-through text-[#737373]" : "text-white"
                                }`}
                              >
                                {block.title}
                              </span>

                              {timeStatus === "now" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>NOW</span>
                                </span>
                              )}

                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#181818] border border-[#282828] text-[#A1A1A1]">
                                {block.block_type}
                              </span>

                              {block.duration_minutes > 0 && (
                                <span className="text-[10px] text-[#737373] font-mono">
                                  {block.duration_minutes}m
                                </span>
                              )}
                            </div>

                            {block.notes && (
                              <p className="text-xs text-[#737373]">{block.notes}</p>
                            )}

                            {isStudy && linkedQuest && (
                              <div className="text-[11px] text-[#888888] flex items-center gap-2 pt-0.5">
                                <span>Quest: {linkedQuest.title}</span>
                                <span>•</span>
                                <span className="text-white font-medium">+{linkedQuest.xp} XP</span>
                                {linkedQuest.accumulated_focus_seconds &&
                                  linkedQuest.accumulated_focus_seconds > 0 &&
                                  !linkedQuest.completed && (
                                    <span className="text-amber-400 font-mono text-[10px]">
                                      ({Math.floor(linkedQuest.accumulated_focus_seconds / 60)} /{" "}
                                      {linkedQuest.duration_minutes}m saved)
                                    </span>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isStudy && linkedQuest && (
                            <>
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#161616] text-[#737373] border border-[#222222]">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Completed</span>
                                </span>
                              ) : (linkedQuest.accumulated_focus_seconds || 0) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(`/focus?questId=${linkedQuest.id}`)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#E5E5E5] text-[#050505] transition-all shadow-sm"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Resume Quest</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => router.push(`/focus?questId=${linkedQuest.id}`)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#E5E5E5] text-[#050505] transition-all shadow-sm"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Start Quest</span>
                                </button>
                              )}
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(block)}
                            className="p-1.5 rounded-lg text-[#666666] hover:text-white hover:bg-[#181818] transition-colors"
                            title="Edit Block"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(block.id)}
                            className="p-1.5 rounded-lg text-[#666666] hover:text-white hover:bg-[#181818] transition-colors"
                            title="Delete Block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* EDIT BLOCK MODAL */}
      {editingBlock && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <h3 className="text-base font-bold text-white">Edit Schedule Block</h3>
              <button onClick={() => setEditingBlock(null)} className="text-[#737373] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">Day of Week</label>
                <select
                  value={editDay}
                  onChange={(e) => setEditDay(e.target.value as DayOfWeek)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setEditingBlock(null)}
                  className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#202020] text-[#A1A1A1] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOM BLOCK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <h3 className="text-base font-bold text-white">Add Custom Schedule Block</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#737373] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">Block Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Problem Solving, Piano Practice"
                  value={newBlockTitle}
                  onChange={(e) => setNewBlockTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">Type</label>
                  <select
                    value={newBlockType}
                    onChange={(e) => setNewBlockType(e.target.value as BlockType)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none"
                  >
                    <option value="study">Study Session</option>
                    <option value="break">Break</option>
                    <option value="commitment">Commitment</option>
                    <option value="meal">Meal / Rest</option>
                    <option value="custom">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">Day of Week</label>
                  <select
                    value={newBlockDay}
                    onChange={(e) => setNewBlockDay(e.target.value as DayOfWeek)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newBlockStart}
                    onChange={(e) => setNewBlockStart(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#CCCCCC] mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newBlockEnd}
                    onChange={(e) => setNewBlockEnd(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs font-mono"
                  />
                </div>
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
                  Add Block
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
