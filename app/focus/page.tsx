"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useAuth } from "@/lib/auth/authContext";
import {
  loadStudentData,
  startOrResumeStudySession,
  pauseStudySession,
  resumeStudySession,
  startStudySessionBreak,
  endStudySessionBreak,
  endStudySessionEarly,
  completeQuestLegitimately,
  calculateCurrentFocusSeconds,
  calculateRemainingFocusSeconds,
  StudentPortalData,
} from "@/lib/storage/studentStore";
import { StudySession, Quest } from "@/types";
import {
  Play,
  Pause,
  Coffee,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Compass,
} from "lucide-react";

// Web Audio synthesizer for clean chime when focus or break ends
function playTone(freq: number, durationSec: number = 0.4) {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch {
    // Ignore audio permission restrictions
  }
}

function FocusTimerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questIdParam = searchParams.get("questId");
  const { user, isLoading } = useAuth();

  const [data, setData] = useState<StudentPortalData | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);

  // Real-time ticking state
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Dialogs
  const [showBreakDialog, setShowBreakDialog] = useState<boolean>(false);
  const [customBreakMinutes, setCustomBreakMinutes] = useState<number>(10);
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [completionResult, setCompletionResult] = useState<{
    gainedXp: number;
    leveledUp: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasNotifiedCompletionRef = useRef(false);

  // Load user data and initialize session
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const studentData = loadStudentData(user.id);
      setData(studentData);

      // Determine target quest ID
      let targetQuestId = questIdParam;
      if (!targetQuestId && studentData.activeSession) {
        targetQuestId = studentData.activeSession.quest_id;
      }
      if (!targetQuestId && studentData.quests.length > 0) {
        const firstIncomplete = studentData.quests.find((q) => !q.completed);
        targetQuestId = firstIncomplete ? firstIncomplete.id : studentData.quests[0].id;
      }

      if (targetQuestId) {
        const foundQuest = studentData.quests.find((q) => q.id === targetQuestId);
        setQuest(foundQuest || null);

        // Start or resume session
        const { updatedData, session: activeSess } = startOrResumeStudySession(
          studentData,
          targetQuestId
        );
        setData(updatedData);
        setSession(activeSess);
      }
    }
  }, [user, isLoading, questIdParam, router]);

  // Real-time ticker effect (every 500ms using real timestamps)
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Sync session state from data whenever updated
  useEffect(() => {
    if (data && session) {
      const currentQuest = data.quests.find((q) => q.id === session.quest_id);
      if (currentQuest) setQuest(currentQuest);
    }
  }, [data, session]);

  if (isLoading || !user || !data || !session || !quest) {
    return (
      <div className="flex min-h-screen bg-[#050505] items-center justify-center text-[#737373] text-sm">
        Initializing Focus Mode...
      </div>
    );
  }

  // Calculate elapsed and remaining focus seconds dynamically using timestamps
  const totalFocusSeconds = calculateCurrentFocusSeconds(session);
  const remainingFocusSeconds = Math.max(0, session.required_duration_seconds - totalFocusSeconds);
  const focusMinutesCompleted = Math.floor(totalFocusSeconds / 60);
  const requiredMinutes = quest.duration_minutes;
  const isGoalReached = totalFocusSeconds >= session.required_duration_seconds;

  // Calculate break time remaining if on break
  let breakSecondsRemaining = 0;
  if (session.status === "break" && session.break_started_at) {
    const breakElapsed = Math.max(0, Math.floor((nowTimestamp - session.break_started_at) / 1000));
    breakSecondsRemaining = Math.max(0, session.break_duration_seconds - breakElapsed);
  }

  // Trigger sound when focus is complete
  if (isGoalReached && !hasNotifiedCompletionRef.current) {
    hasNotifiedCompletionRef.current = true;
    if (soundEnabled) {
      playTone(587.33); // D5
      setTimeout(() => playTone(880), 180); // A5
    }
  }

  // Formatting helpers
  const formatTimeMinutesSeconds = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Progress percentage
  const progressPercent = Math.min(
    100,
    Math.round((totalFocusSeconds / session.required_duration_seconds) * 100)
  );

  // Actions
  const handlePause = () => {
    const { updatedData, session: updatedSession } = pauseStudySession(data);
    setData(updatedData);
    setSession(updatedSession);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
  };

  const handleResume = () => {
    const { updatedData, session: updatedSession } = resumeStudySession(data);
    setData(updatedData);
    setSession(updatedSession);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
  };

  const handleSelectBreak = (mins: number) => {
    const { updatedData, session: updatedSession } = startStudySessionBreak(data, mins);
    setData(updatedData);
    setSession(updatedSession);
    setShowBreakDialog(false);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
  };

  const handleEndBreakEarly = () => {
    const { updatedData, session: updatedSession } = endStudySessionBreak(data);
    setData(updatedData);
    setSession(updatedSession);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
  };

  const handleEndSessionEarly = () => {
    const { updatedData } = endStudySessionEarly(data);
    setData(updatedData);
    setSession(null);
    window.dispatchEvent(new Event("schoolquest_student_updated"));
    router.push("/quests");
  };

  const handleCompleteQuest = () => {
    if (!isGoalReached) {
      setErrorMessage(
        `Focus time requirement not yet met (${focusMinutesCompleted} / ${requiredMinutes} minutes).`
      );
      return;
    }

    const res = completeQuestLegitimately(data, quest.id);
    if (res.error) {
      setErrorMessage(res.error);
      return;
    }

    setData(res.updatedData);
    setCompletionResult({ gainedXp: res.gainedXp, leveledUp: res.leveledUp });
    window.dispatchEvent(new Event("schoolquest_student_updated"));

    if (soundEnabled) {
      playTone(523.25);
      setTimeout(() => playTone(659.25), 150);
      setTimeout(() => playTone(783.99), 300);
    }
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-[#1A1A1A] flex items-center justify-between">
        <Link
          href="/quests"
          className="inline-flex items-center gap-2 text-xs text-[#888888] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Quests</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-[#111111] hover:bg-[#1A1A1A] border border-[#222222] text-[#888888] hover:text-white transition-colors"
            title={soundEnabled ? "Mute chimes" : "Enable chimes"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111111] border border-[#222222] text-xs font-mono text-[#CCCCCC]">
            <Compass className="w-3 h-3 text-[#737373]" />
            <span>Focus Mode</span>
          </div>
        </div>
      </header>

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-xl mx-auto w-full">
        {completionResult ? (
          /* COMPLETION CELEBRATION SCREEN */
          <div className="w-full text-center space-y-6 animate-in fade-in zoom-in duration-300 p-8 rounded-2xl bg-[#0B0B0B] border border-[#222222]">
            <div className="w-16 h-16 rounded-full bg-white text-[#050505] flex items-center justify-center mx-auto shadow-2xl">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#888888]">
                Quest Completed
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">{quest.title}</h2>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                You logged {requiredMinutes} minutes of uninterrupted study for {quest.subject_name}.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#121212] border border-[#242424] inline-flex items-center gap-4 text-left">
              <div>
                <div className="text-[10px] text-[#737373] uppercase font-mono tracking-wider">
                  XP AWARDED
                </div>
                <div className="text-xl font-bold text-white flex items-center gap-1 mt-0.5">
                  <Zap className="w-4 h-4 text-white" />
                  <span>+{completionResult.gainedXp} XP</span>
                </div>
              </div>

              {completionResult.leveledUp && (
                <div className="border-l border-[#242424] pl-4">
                  <div className="text-[10px] text-[#737373] uppercase font-mono tracking-wider">
                    NEW STATUS
                  </div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">Level Up! 🎉</div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/quests"
                className="px-6 py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all text-center"
              >
                Back to Quests
              </Link>
              <Link
                href="/timetable"
                className="px-6 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#262626] text-white text-xs font-medium transition-colors text-center"
              >
                View Timetable
              </Link>
            </div>
          </div>
        ) : (
          /* ACTIVE TIMER CARD */
          <div className="w-full space-y-7">
            {/* Quest Details Header */}
            <div className="text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A1] px-2.5 py-0.5 rounded bg-[#121212] border border-[#242424]">
                  {quest.subject_name}
                </span>
                <span className="text-[11px] text-[#555555] font-mono uppercase">
                  {quest.quest_type}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {quest.title}
              </h1>
              <p className="text-xs text-[#737373] max-w-md mx-auto">{quest.description}</p>
            </div>

            {/* Error Message if Any */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs text-center">
                {errorMessage}
              </div>
            )}

            {/* The Main Timer Display */}
            <div className="p-8 sm:p-10 rounded-3xl bg-[#0B0B0B] border border-[#1E1E1E] text-center space-y-6 relative overflow-hidden shadow-2xl">
              {/* Subtle top status badge */}
              <div className="flex items-center justify-center">
                {session.status === "running" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] border border-[#2A2A2A] text-white text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>FOCUSING</span>
                  </span>
                )}
                {session.status === "paused" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181818] border border-[#333333] text-[#F59E0B] text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <span>PAUSED</span>
                  </span>
                )}
                {session.status === "break" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181818] border border-[#333333] text-[#38BDF8] text-xs font-mono">
                    <Coffee className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>ON BREAK</span>
                  </span>
                )}
              </div>

              {/* Large Digital Countdown Clock */}
              <div>
                {session.status === "break" ? (
                  <div className="space-y-1">
                    <div className="text-xs font-mono uppercase text-[#737373] tracking-widest">
                      BREAK REMAINING
                    </div>
                    <div className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono text-white">
                      {formatTimeMinutesSeconds(breakSecondsRemaining)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs font-mono uppercase text-[#737373] tracking-widest">
                      {isGoalReached ? "GOAL REACHED" : "REMAINING TIME"}
                    </div>
                    <div className="text-5xl sm:text-6xl font-extrabold tracking-tight font-mono text-white">
                      {formatTimeMinutesSeconds(remainingFocusSeconds)}
                    </div>
                  </div>
                )}
              </div>

              {/* Monochrome Progress Bar */}
              <div className="space-y-2 max-w-md mx-auto">
                <div className="flex items-center justify-between text-xs text-[#737373] font-mono">
                  <span>
                    {focusMinutesCompleted} / {requiredMinutes} min completed
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-[#181818] rounded-full overflow-hidden p-0.5 border border-[#242424]">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Session Meta */}
              <div className="flex items-center justify-center gap-4 text-xs text-[#666666] pt-1 border-t border-[#161616]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Required: {requiredMinutes}m
                </span>
                <span>•</span>
                <span className="text-[#A1A1A1] font-semibold">+{quest.xp} XP when completed</span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col gap-3">
              {/* Primary Action Button */}
              {isGoalReached ? (
                <button
                  type="button"
                  onClick={handleCompleteQuest}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-sm font-bold tracking-tight shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4 text-[#050505]" />
                  <span>Complete Quest & Claim +{quest.xp} XP</span>
                </button>
              ) : session.status === "break" ? (
                <button
                  type="button"
                  onClick={handleEndBreakEarly}
                  className="w-full py-3.5 rounded-2xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>End Break Early & Resume Focus</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {session.status === "running" ? (
                    <button
                      type="button"
                      onClick={handlePause}
                      className="py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#282828] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResume}
                      className="py-3 px-4 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowBreakDialog(true)}
                    className="py-3 px-4 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] border border-[#282828] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Take a Break</span>
                  </button>
                </div>
              )}

              {/* End Session Button */}
              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                className="py-2.5 text-xs text-[#737373] hover:text-[#CCCCCC] transition-colors text-center"
              >
                End Session
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="px-6 py-4 text-center text-[11px] text-[#555555]">
        Deterministic Focus Session • SchoolQuest saves your progress dynamically.
      </footer>

      {/* TAKE A BREAK DIALOG */}
      {showBreakDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#262626] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white">TAKE A BREAK?</h3>
              </div>
              <button
                onClick={() => setShowBreakDialog(false)}
                className="text-[#737373] hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#888888] leading-relaxed">
              Taking a break pauses the focus timer. Breaks do not count towards your required study
              duration.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectBreak(mins)}
                  className="py-2.5 rounded-xl bg-[#181818] hover:bg-white hover:text-[#050505] border border-[#282828] text-xs font-semibold transition-all"
                >
                  {mins} min
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-[#888888] mb-1">
                Custom Duration (minutes)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={customBreakMinutes}
                  onChange={(e) => setCustomBreakMinutes(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#181818] border border-[#282828] text-white text-xs focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => handleSelectBreak(customBreakMinutes)}
                  className="px-4 py-1.5 rounded-xl bg-white text-[#050505] text-xs font-semibold hover:bg-[#E5E5E5] transition-all shrink-0"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* END SESSION CONFIRMATION MODAL */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#262626] rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-[#222222]">
              END SESSION?
            </h3>

            <div className="space-y-2 text-xs text-[#888888]">
              <p>You&apos;ve completed:</p>
              <div className="text-base font-bold text-white font-mono">
                {focusMinutesCompleted} / {requiredMinutes} minutes
              </div>
              <p className="text-[#666666]">
                Your progress will be saved. The quest remains incomplete until the remaining{" "}
                {Math.max(0, requiredMinutes - focusMinutesCompleted)} minutes are finished.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#222222]">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="px-4 py-2 rounded-xl bg-[#181818] hover:bg-[#202020] text-[#CCCCCC] text-xs font-medium"
              >
                Continue Quest
              </button>
              <button
                type="button"
                onClick={handleEndSessionEarly}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-[#050505] items-center justify-center text-[#737373] text-sm">
          Loading Focus Mode...
        </div>
      }
    >
      <FocusTimerContent />
    </Suspense>
  );
}
