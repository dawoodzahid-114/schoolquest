"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/authContext";
import {
  loadStudentData,
  saveTimetableConfig,
  addFixedCommitment,
  deleteFixedCommitment,
  generateAndSaveTimetable,
  StudentPortalData,
} from "@/lib/storage/studentStore";
import {
  DayOfWeek,
  FixedCommitment,
  CommitmentCategory,
  TimetableConfig,
} from "@/types";
import {
  DEFAULT_TIMETABLE_CONFIG,
  DAYS_OF_WEEK,
  formatTime12h,
  timeToMinutes,
} from "@/lib/planning/timetableEngine";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Calendar,
  School,
  Moon,
  Clock,
  Coffee,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function TimetableSetupPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [data, setData] = useState<StudentPortalData | null>(null);

  // Wizard Step: 1 to 6
  const [step, setStep] = useState<number>(1);

  // Step 1: School Hours
  const [schoolStart, setSchoolStart] = useState("07:30");
  const [schoolEnd, setSchoolEnd] = useState("14:00");
  const [includeTravelTo, setIncludeTravelTo] = useState(true);
  const [travelToSchool, setTravelToSchool] = useState(30);
  const [includeTravelHome, setIncludeTravelHome] = useState(true);
  const [travelHome, setTravelHome] = useState(30);

  // Step 2: Sleep Schedule
  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("06:30");

  // Step 3: Fixed Commitments
  const [commitments, setCommitments] = useState<FixedCommitment[]>([]);
  const [newCommTitle, setNewCommTitle] = useState("");
  const [newCommCategory, setNewCommCategory] = useState<CommitmentCategory>("Tuition");
  const [newCommDays, setNewCommDays] = useState<DayOfWeek[]>(["Monday", "Wednesday"]);
  const [newCommStart, setNewCommStart] = useState("17:00");
  const [newCommEnd, setNewCommEnd] = useState("18:00");

  // Step 4: Study Preferences
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState<number>(90);
  const [isCustomStudy, setIsCustomStudy] = useState(false);
  const [customStudyMinutes, setCustomStudyMinutes] = useState(120);
  const [preferredPeriods, setPreferredPeriods] = useState<
    Array<"morning" | "after_school" | "evening" | "night">
  >(["after_school", "evening"]);

  // Step 5: Break Preference
  const [focusDuration, setFocusDuration] = useState<number>(45);
  const [breakDuration, setBreakDuration] = useState<number>(10);
  const [isCustomBreak, setIsCustomBreak] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const studentData = loadStudentData(user.id);
      setData(studentData);

      const cfg = studentData.timetableConfig || DEFAULT_TIMETABLE_CONFIG;
      setSchoolStart(cfg.school_start || "07:30");
      setSchoolEnd(cfg.school_end || "14:00");
      setTravelToSchool(cfg.travel_to_school_minutes || 0);
      setIncludeTravelTo((cfg.travel_to_school_minutes || 0) > 0);
      setTravelHome(cfg.travel_home_minutes || 0);
      setIncludeTravelHome((cfg.travel_home_minutes || 0) > 0);
      setSleepTime(cfg.sleep_time || "23:00");
      setWakeTime(cfg.wake_time || "06:30");
      setDailyStudyMinutes(cfg.daily_study_minutes || 90);
      setPreferredPeriods(cfg.preferred_study_periods || ["after_school", "evening"]);
      setFocusDuration(cfg.focus_duration_minutes || 45);
      setBreakDuration(cfg.break_duration_minutes || 10);
      setCommitments(studentData.fixedCommitments || []);
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !data) {
    return (
      <div className="flex min-h-screen bg-[#050505] items-center justify-center text-[#737373] text-sm">
        Loading Timetable Setup...
      </div>
    );
  }

  // Add commitment helper
  const handleAddCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommTitle.trim() || newCommDays.length === 0) return;

    const newComm: FixedCommitment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user.id,
      title: newCommTitle.trim(),
      category: newCommCategory,
      days: [...newCommDays],
      start_time: newCommStart,
      end_time: newCommEnd,
    };

    const updated = [...commitments, newComm];
    setCommitments(updated);
    setNewCommTitle("");
  };

  const handleDeleteCommitment = (id: string) => {
    setCommitments(commitments.filter((c) => c.id !== id));
  };

  const toggleDayInNewCommitment = (day: DayOfWeek) => {
    if (newCommDays.includes(day)) {
      setNewCommDays(newCommDays.filter((d) => d !== day));
    } else {
      setNewCommDays([...newCommDays, day]);
    }
  };

  const togglePeriod = (p: "morning" | "after_school" | "evening" | "night") => {
    if (preferredPeriods.includes(p)) {
      if (preferredPeriods.length > 1) {
        setPreferredPeriods(preferredPeriods.filter((item) => item !== p));
      }
    } else {
      setPreferredPeriods([...preferredPeriods, p]);
    }
  };

  // Final Generation
  const handleGenerate = () => {
    const finalConfig: TimetableConfig = {
      school_start: schoolStart,
      school_end: schoolEnd,
      travel_to_school_minutes: includeTravelTo ? travelToSchool : 0,
      travel_home_minutes: includeTravelHome ? travelHome : 0,
      sleep_time: sleepTime,
      wake_time: wakeTime,
      daily_study_minutes: isCustomStudy ? customStudyMinutes : dailyStudyMinutes,
      preferred_study_periods: preferredPeriods,
      focus_duration_minutes: focusDuration,
      break_duration_minutes: breakDuration,
    };

    let updated = saveTimetableConfig(data, finalConfig);
    updated = {
      ...updated,
      fixedCommitments: commitments,
    };

    const finalData = generateAndSaveTimetable(updated, finalConfig);
    setData(finalData);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    router.push("/timetable");
  };

  // Calculate available daily study hours estimation for Step 6 preview
  const wakeMin = timeToMinutes(wakeTime);
  const sleepMin = timeToMinutes(sleepTime);
  const schoolTotalMins =
    timeToMinutes(schoolEnd) -
    timeToMinutes(schoolStart) +
    (includeTravelTo ? travelToSchool : 0) +
    (includeTravelHome ? travelHome : 0) +
    60; // 60 min lunch
  const wakingMins = (sleepMin > wakeMin ? sleepMin - wakeMin : 1440 - wakeMin + sleepMin);
  const freeWeekdayMins = Math.max(0, wakingMins - schoolTotalMins);

  const stepsList = [
    "School Hours",
    "Sleep Schedule",
    "Commitments",
    "Study Target",
    "Break Rules",
    "Generate",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full space-y-7">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-[#A1A1A1]">
                Automatic Timetable Builder
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              Build Your Realistic Study Timetable
            </h1>
          </div>
          <Link
            href="/timetable"
            className="text-xs text-[#737373] hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>

        {/* Stepper Progress Header */}
        <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#1E1E1E]">
          <div className="flex items-center justify-between text-xs text-[#888888] font-mono mb-2">
            <span>
              STEP {step} OF {stepsList.length}: {stepsList[step - 1].toUpperCase()}
            </span>
            <span>{Math.round((step / stepsList.length) * 100)}%</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {stepsList.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx + 1 <= step ? "bg-white" : "bg-[#1E1E1E]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] space-y-6">
          {/* ================= STEP 1: SCHOOL HOURS ================= */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                  <School className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">What are your school hours?</h2>
                  <p className="text-xs text-[#737373] mt-0.5">
                    SchoolQuest never schedules study during classes or your commute.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
                  <label className="block text-xs font-semibold text-[#CCCCCC]">
                    What time does school start?
                  </label>
                  <input
                    type="time"
                    value={schoolStart}
                    onChange={(e) => setSchoolStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white font-mono"
                  />
                  <span className="text-[11px] text-[#737373]">
                    Display: {formatTime12h(schoolStart)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
                  <label className="block text-xs font-semibold text-[#CCCCCC]">
                    What time does school end?
                  </label>
                  <input
                    type="time"
                    value={schoolEnd}
                    onChange={(e) => setSchoolEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white font-mono"
                  />
                  <span className="text-[11px] text-[#737373]">
                    Display: {formatTime12h(schoolEnd)}
                  </span>
                </div>
              </div>

              {/* Commute Times */}
              <div className="space-y-3 pt-2 border-t border-[#1A1A1A]">
                <span className="text-xs font-semibold text-[#CCCCCC] block">
                  Optional Commute / Travel Time:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white">Travel to school</label>
                      <button
                        type="button"
                        onClick={() => setIncludeTravelTo(!includeTravelTo)}
                        className="text-[11px] text-[#737373] hover:text-white"
                      >
                        {includeTravelTo ? "Skip" : "Add"}
                      </button>
                    </div>
                    {includeTravelTo ? (
                      <select
                        value={travelToSchool}
                        onChange={(e) => setTravelToSchool(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    ) : (
                      <div className="text-xs text-[#666666] italic py-1">Skipped (0 min)</div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white">Travel time home</label>
                      <button
                        type="button"
                        onClick={() => setIncludeTravelHome(!includeTravelHome)}
                        className="text-[11px] text-[#737373] hover:text-white"
                      >
                        {includeTravelHome ? "Skip" : "Add"}
                      </button>
                    </div>
                    {includeTravelHome ? (
                      <select
                        value={travelHome}
                        onChange={(e) => setTravelHome(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    ) : (
                      <div className="text-xs text-[#666666] italic py-1">Skipped (0 min)</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: SLEEP SCHEDULE ================= */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                  <Moon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Sleep & Recovery Schedule</h2>
                  <p className="text-xs text-[#737373] mt-0.5">
                    SchoolQuest never schedules study during your sleep hours.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
                  <label className="block text-xs font-semibold text-[#CCCCCC]">
                    What time do you usually sleep?
                  </label>
                  <input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white font-mono"
                  />
                  <span className="text-[11px] text-[#737373]">
                    Display: {formatTime12h(sleepTime)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
                  <label className="block text-xs font-semibold text-[#CCCCCC]">
                    What time do you usually wake up?
                  </label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#181818] border border-[#282828] text-white text-sm focus:outline-none focus:border-white font-mono"
                  />
                  <span className="text-[11px] text-[#737373]">
                    Display: {formatTime12h(wakeTime)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#101010] border border-[#1E1E1E] flex items-center gap-2.5 text-xs text-[#888888]">
                <Clock className="w-4 h-4 text-white shrink-0" />
                <span>
                  Waking window: {formatTime12h(wakeTime)} to {formatTime12h(sleepTime)} daily.
                </span>
              </div>
            </div>
          )}

          {/* ================= STEP 3: FIXED COMMITMENTS ================= */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Fixed Recurring Commitments</h2>
                  <p className="text-xs text-[#737373] mt-0.5">
                    Tuition, sports, prayer, academy, or family events. The timetable treats these
                    as strictly unavailable.
                  </p>
                </div>
              </div>

              {/* Form to add a commitment */}
              <form onSubmit={handleAddCommitment} className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  + Add Commitment
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#A1A1A1] mb-1">Commitment Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Math Tuition, Football Practice"
                      value={newCommTitle}
                      onChange={(e) => setNewCommTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#A1A1A1] mb-1">Category</label>
                    <select
                      value={newCommCategory}
                      onChange={(e) => setNewCommCategory(e.target.value as CommitmentCategory)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none"
                    >
                      <option value="Tuition">Tuition</option>
                      <option value="Academy">Academy</option>
                      <option value="Sports">Sports</option>
                      <option value="Prayer">Prayer</option>
                      <option value="Family">Family commitments</option>
                      <option value="Extracurricular">Extracurricular</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Days of week picker */}
                <div>
                  <label className="block text-[11px] text-[#A1A1A1] mb-1.5">Days of Week</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = newCommDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDayInNewCommitment(d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-white text-[#050505]"
                              : "bg-[#181818] text-[#888888] hover:text-white"
                          }`}
                        >
                          {d.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#A1A1A1] mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newCommStart}
                      onChange={(e) => setNewCommStart(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#A1A1A1] mb-1">End Time</label>
                    <input
                      type="time"
                      value={newCommEnd}
                      onChange={(e) => setNewCommEnd(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-[#050505] text-xs font-semibold hover:bg-[#E5E5E5] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Commitment</span>
                  </button>
                </div>
              </form>

              {/* Commitments List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#888888] block">
                  Current Commitments ({commitments.length})
                </span>

                {commitments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#666666] rounded-xl bg-[#0E0E0E] border border-dashed border-[#222222]">
                    No fixed commitments added yet. (You can proceed if you have none).
                  </div>
                ) : (
                  commitments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-[#101010] border border-[#222222] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{c.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#181818] text-[#A1A1A1]">
                            {c.category}
                          </span>
                        </div>
                        <div className="text-[#737373] text-[11px] mt-0.5">
                          {c.days.map((d) => d.slice(0, 3)).join(", ")} •{" "}
                          {formatTime12h(c.start_time)} – {formatTime12h(c.end_time)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCommitment(c.id)}
                        className="text-[#666666] hover:text-white p-1"
                        title="Remove commitment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 4: STUDY PREFERENCES ================= */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Daily Study Targets & Window</h2>
                  <p className="text-xs text-[#737373] mt-0.5">
                    How much study time would you ideally like per day?
                  </p>
                </div>
              </div>

              {/* Daily minutes options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#CCCCCC]">
                  Daily Study Goal
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[30, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setDailyStudyMinutes(mins);
                        setIsCustomStudy(false);
                      }}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        !isCustomStudy && dailyStudyMinutes === mins
                          ? "bg-white text-[#050505] border-white font-bold"
                          : "bg-[#101010] text-[#A1A1A1] border-[#222222] hover:border-[#383838]"
                      }`}
                    >
                      <div className="text-base">{mins}m</div>
                      <div className="text-[10px] mt-0.5 opacity-80">
                        {mins >= 60 ? `${mins / 60} hrs` : "30 min"}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomStudy(!isCustomStudy)}
                    className="text-xs text-[#888888] hover:text-white underline font-medium"
                  >
                    {isCustomStudy ? "Use standard presets" : "Need custom duration?"}
                  </button>

                  {isCustomStudy && (
                    <div className="flex items-center gap-2 mt-2 max-w-xs">
                      <input
                        type="number"
                        min="15"
                        max="360"
                        step="15"
                        value={customStudyMinutes}
                        onChange={(e) => setCustomStudyMinutes(Number(e.target.value))}
                        className="px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs font-mono w-32"
                      />
                      <span className="text-xs text-[#888888]">minutes per day</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferred study periods */}
              <div className="space-y-2 pt-2 border-t border-[#1A1A1A]">
                <label className="block text-xs font-semibold text-[#CCCCCC]">
                  Preferred Study Periods (select all that fit you)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "morning", label: "Morning", desc: "Before school starts" },
                    { id: "after_school", label: "After school", desc: "Right after lunch & rest" },
                    { id: "evening", label: "Evening", desc: "Between 5:00 PM – 8:30 PM" },
                    { id: "night", label: "Night", desc: "After 8:30 PM until sleep" },
                  ].map((item) => {
                    const isSelected = preferredPeriods.includes(item.id as "morning" | "after_school" | "evening" | "night");
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => togglePeriod(item.id as "morning" | "after_school" | "evening" | "night")}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-[#161616] text-white border-white"
                            : "bg-[#101010] text-[#737373] border-[#222222] hover:border-[#333333]"
                        }`}
                      >
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-[10px] text-[#666666] mt-0.5">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 5: BREAK PREFERENCE ================= */}
          {step === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">How do you prefer breaks?</h2>
                  <p className="text-xs text-[#737373] mt-0.5">
                    Breaks are scheduled automatically to prevent fatigue. Breaks are NOT counted as
                    study time.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { focus: 25, brk: 5, label: "Pomodoro", note: "25 min focus / 5 min break" },
                  { focus: 45, brk: 10, label: "Standard", note: "45 min focus / 10 min break" },
                  { focus: 60, brk: 10, label: "Deep Work", note: "60 min focus / 10 min break" },
                ].map((preset) => {
                  const isSelected =
                    !isCustomBreak &&
                    focusDuration === preset.focus &&
                    breakDuration === preset.brk;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setFocusDuration(preset.focus);
                        setBreakDuration(preset.brk);
                        setIsCustomBreak(false);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-white text-[#050505] border-white font-bold"
                          : "bg-[#101010] text-[#CCCCCC] border-[#222222] hover:border-[#383838]"
                      }`}
                    >
                      <div className="text-xs font-bold">{preset.label}</div>
                      <div className="text-sm font-semibold mt-1">
                        {preset.focus}m / {preset.brk}m
                      </div>
                      <div className="text-[10px] opacity-70 mt-1">{preset.note}</div>
                    </button>
                  );
                })}
              </div>

              {/* Custom break toggler */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomBreak(!isCustomBreak)}
                  className="text-xs text-[#888888] hover:text-white underline font-medium"
                >
                  {isCustomBreak ? "Use standard presets" : "Configure custom focus & break intervals"}
                </button>

                {isCustomBreak && (
                  <div className="grid grid-cols-2 gap-3 mt-3 max-w-sm">
                    <div>
                      <label className="block text-[11px] text-[#A1A1A1] mb-1">Focus Session (min)</label>
                      <input
                        type="number"
                        min="15"
                        max="120"
                        step="5"
                        value={focusDuration}
                        onChange={(e) => setFocusDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#A1A1A1] mb-1">Break Duration (min)</label>
                      <input
                        type="number"
                        min="5"
                        max="30"
                        step="5"
                        value={breakDuration}
                        onChange={(e) => setBreakDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 6: REVIEW & GENERATE ================= */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Rule-Based Generation Summary</h2>
                  <p className="text-xs text-[#737373] mt-0.5">
                    SchoolQuest will generate your full weekly timetable with zero conflicts.
                  </p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
                  <div className="text-[10px] text-[#737373] uppercase font-mono">SCHOOL HOURS</div>
                  <div className="font-semibold text-white">
                    {formatTime12h(schoolStart)} – {formatTime12h(schoolEnd)}
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Commute: {includeTravelTo ? `${travelToSchool}m to` : "None"}, {includeTravelHome ? `${travelHome}m home` : "None"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
                  <div className="text-[10px] text-[#737373] uppercase font-mono">SLEEP & WAKE</div>
                  <div className="font-semibold text-white">
                    {formatTime12h(sleepTime)} to {formatTime12h(wakeTime)}
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Sleep hours strictly blocked
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
                  <div className="text-[10px] text-[#737373] uppercase font-mono">STUDY TARGET</div>
                  <div className="font-semibold text-white">
                    {isCustomStudy ? customStudyMinutes : dailyStudyMinutes} minutes / day
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Chunck: {focusDuration}m focus / {breakDuration}m break
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#101010] border border-[#222222] space-y-1">
                  <div className="text-[10px] text-[#737373] uppercase font-mono">COMMITMENTS</div>
                  <div className="font-semibold text-white">
                    {commitments.length} recurring commitment{commitments.length === 1 ? "" : "s"}
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Treated as unavailable
                  </div>
                </div>
              </div>

              {/* Deterministic Priorities Alert */}
              <div className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Deterministic Scheduling Rules Applied:</span>
                </div>
                <ol className="list-decimal list-inside text-xs text-[#888888] space-y-1 pl-1">
                  <li>Upcoming tests with nearest dates (within 14 days prioritized first)</li>
                  <li>High-priority assessments scheduled with dedicated review chunks</li>
                  <li>Subjects with largest score gaps scheduled in high-focus slots</li>
                  <li>Weak topics highlighted directly on scheduled study blocks</li>
                  <li>Connected automatically to SchoolQuest Quests for seamless Focus Mode</li>
                </ol>
              </div>

              {/* Conflict handling check */}
              {freeWeekdayMins < (isCustomStudy ? customStudyMinutes : dailyStudyMinutes) && (
                <div className="p-3.5 rounded-xl bg-[#181206] border border-[#442F0F] text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Capacity Notice: </span>
                    You have approximately {freeWeekdayMins} free minutes available on weekdays. SchoolQuest
                    schedules the highest-priority study tasks first; remaining work will be scheduled
                    for subsequent free windows.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1C1C1C]">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] text-[#CCCCCC] text-xs font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-bold transition-all shadow-xl hover:scale-[1.01]"
              >
                <Sparkles className="w-4 h-4 text-[#050505]" />
                <span>Generate My Timetable</span>
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
