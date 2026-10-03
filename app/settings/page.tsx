"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import {
  loadStudentData,
  updateStudyPreferencesInStudent,
  updateInterestsInStudent,
} from "@/lib/storage/studentStore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  User,
  Settings,
  Clock,
  Heart,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const AVAILABLE_INTERESTS = [
  "Programming",
  "Cloud Computing",
  "Artificial Intelligence",
  "Mathematics",
  "Science & Physics",
  "Robotics",
  "Cybersecurity",
  "Writing & Literature",
  "Digital Art & Design",
  "Business & Economics",
  "Entrepreneurship",
  "Competitive Sports",
  "Music & Sound",
  "Scientific Research",
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, isLoading, signOut, updateProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [preferredStartTime, setPreferredStartTime] = useState("17:00");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    if (profile) {
      setUsername(profile.username || "");
      setGradeLevel(profile.grade_level || "");
      setCurriculum(profile.curriculum || "");
    }

    if (user) {
      const studentData = loadStudentData(user.id);
      setDailyMinutes(studentData.studyPreferences.daily_minutes || 60);
      setPreferredStartTime(studentData.studyPreferences.preferred_start_time || "17:00");
      setSelectedInterests(studentData.interests.map((i) => i.interest_name));
    }
  }, [user, profile, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen bg-[#050505] items-center justify-center text-[#737373] text-sm">
        Loading settings...
      </div>
    );
  }

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!username.trim()) {
      setErrorMsg("Display name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      // Update profile
      const profRes = await updateProfile({
        username: username.trim(),
        grade_level: gradeLevel,
        curriculum,
      });

      if (profRes.error) {
        setErrorMsg(profRes.error);
        setIsSaving(false);
        return;
      }

      // Update study preferences and interests in student store
      const currentData = loadStudentData(user.id);
      let updated = updateStudyPreferencesInStudent(currentData, {
        user_id: user.id,
        daily_minutes: dailyMinutes,
        preferred_start_time: preferredStartTime,
      });
      updated = updateInterestsInStudent(updated, selectedInterests);

      window.dispatchEvent(new Event("schoolquest_student_updated"));
      setSuccessMsg("Settings saved successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#262626] text-white flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Student Settings</h1>
              <p className="text-xs text-[#737373]">
                Configure your student profile, academic availability, and study preferences.
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#242424] text-[#A1A1A1] hover:text-white text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-[#0E1711] border border-[#1B3624] text-[#86EFAC] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#22C55E]" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#180E0E] border border-[#381A1A] text-[#FCA5A5] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* PROFILE CARD */}
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1A1A1A]">
              <User className="w-4 h-4 text-white" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Profile Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Display Name / Username *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#262626] text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Email (Account Identifier)
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email || ""}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0E0E0E] border border-[#1E1E1E] text-[#666666] text-sm cursor-not-allowed"
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
                  placeholder="e.g. Grade 10 / Year 11"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#262626] text-white text-sm focus:outline-none focus:border-white transition-colors"
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
                  placeholder="e.g. Cambridge, IB, AP"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#262626] text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* STUDY AVAILABILITY CARD */}
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1A1A1A]">
              <Clock className="w-4 h-4 text-white" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Daily Study Availability
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Available Minutes Per Day: {dailyMinutes} mins ({Math.floor(dailyMinutes / 30)} focused quests)
                </label>
                <input
                  type="range"
                  min="20"
                  max="180"
                  step="10"
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value))}
                  className="w-full accent-white"
                />
                <div className="flex justify-between text-[11px] text-[#666666] mt-1">
                  <span>20m</span>
                  <span>60m (Standard)</span>
                  <span>120m</span>
                  <span>180m</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                  Preferred Daily Start Time
                </label>
                <input
                  type="time"
                  value={preferredStartTime}
                  onChange={(e) => setPreferredStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#262626] text-white text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* EXTRACURRICULAR INTERESTS CARD */}
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1A1A1A]">
              <Heart className="w-4 h-4 text-white" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Extracurricular Passions
              </h2>
            </div>

            <p className="text-xs text-[#737373]">
              Select personal interests to receive deterministic synergy suggestions linking academic topics to real-world applications.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
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

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
