"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, isValidEmail } from "@/lib/auth/authContext";
import { loadStudentData, saveStudentData } from "@/lib/storage/studentStore";
import { generateDailyQuests } from "@/lib/planning/studyPlanEngine";
import { generateDeterministicRecommendations } from "@/lib/planning/recommendationEngine";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Compass, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    setIsSubmitting(true);
    const res = await signIn(email, password);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      router.push("/dashboard");
    }
  };

  const handleExploreDemo = async () => {
    setIsDemoLoading(true);
    setErrorMsg("");
    const demoEmail = "demo@schoolquest.local";
    const demoPass = "demo1234";

    // Attempt sign in with fictional demo account
    let res = await signIn(demoEmail, demoPass);
    if (res.error) {
      // Create fictional demo account if not exists
      res = await signUp(demoEmail, demoPass, "Alex Morgan (Demo)", "Grade 10");
    }

    if (res.error) {
      setErrorMsg(res.error);
      setIsDemoLoading(false);
      return;
    }

    // Seed fictional demo data if empty
    setTimeout(() => {
      // Retrieve the current user from auth storage
      const activeId = localStorage.getItem("schoolquest_active_session_user_v1");
      if (activeId) {
        const existing = loadStudentData(activeId);
        if (existing.subjects.length === 0) {
          const sampleSubjects = [
            {
              id: `subj-demo-1`,
              name: "Mathematics",
              current_score: 72,
              target_score: 88,
              target_grade: "A*",
              weak_topics: ["Quadratic Equations", "Vectors"],
            },
            {
              id: `subj-demo-2`,
              name: "Physics",
              current_score: 65,
              target_score: 82,
              target_grade: "A",
              weak_topics: ["Forces & Momentum", "Electric Fields"],
            },
            {
              id: `subj-demo-3`,
              name: "Biology",
              current_score: 80,
              target_score: 90,
              target_grade: "A*",
              weak_topics: ["Cell Respiration"],
            },
          ];

          const sampleAssessments = [
            {
              id: `asmt-demo-1`,
              subject_id: `subj-demo-2`,
              subject_name: "Physics",
              name: "Unit 3 Midterm Test",
              assessment_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              topics: ["Forces & Momentum", "Energy"],
              priority: "high" as const,
            },
          ];

          const samplePrefs = {
            user_id: activeId,
            daily_minutes: 60,
            preferred_start_time: "17:00",
          };

          const quests = generateDailyQuests(sampleSubjects, sampleAssessments, samplePrefs);

          saveStudentData({
            userId: activeId,
            subjects: sampleSubjects,
            academicHistory: [
              {
                id: "hist-demo-1",
                subject_id: "subj-demo-1",
                subject_name: "Mathematics",
                exam_name: "Term 1 Exam",
                score: 70,
                grade: "B",
              },
            ],
            assessments: sampleAssessments,
            studyPreferences: samplePrefs,
            interests: [{ interest_name: "Robotics" }],
            quests,
            progress: {
              user_id: activeId,
              xp: 85,
              level: 1,
              streak: 3,
              last_activity_date: new Date().toISOString().split("T")[0],
              total_quests_completed: 6,
              total_minutes_studied: 150,
            },
            recommendations: generateDeterministicRecommendations({
              subjects: sampleSubjects,
              assessments: sampleAssessments,
              preferences: samplePrefs,
              interests: [{ interest_name: "Robotics" }],
            }),
          });
        }
      }
      setIsDemoLoading(false);
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#262626] text-white flex items-center justify-center mx-auto mb-4">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Student Portal Login</h1>
            <p className="text-xs text-[#737373] mt-1.5">
              Enter your credentials to access your private academic quests and dashboard.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-[#180E0E] border border-[#381A1A] text-[#FCA5A5] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@school.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-white placeholder-[#555555] text-sm focus:outline-none focus:border-white transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-white placeholder-[#555555] text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Logging in..." : "Log In to Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Fictional Demo Login Button */}
          <div className="mt-4 pt-4 border-t border-[#181818]">
            <button
              type="button"
              onClick={handleExploreDemo}
              disabled={isDemoLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#121212] hover:bg-[#1A1A1A] border border-[#262626] text-[#CCCCCC] hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#888888]" />
              <span>{isDemoLoading ? "Loading Demo..." : "Explore Fictional Demo Portal"}</span>
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-[#181818] text-center text-xs text-[#737373]">
            <span>Don&apos;t have an account yet? </span>
            <Link href="/signup" className="text-white font-medium hover:underline">
              Create Student Account
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#555555]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#737373]" />
            <span>Isolated student accounts • Row Level Security</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
