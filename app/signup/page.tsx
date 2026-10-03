"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, isValidEmail } from "@/lib/auth/authContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Compass, Lock, Mail, User, BookOpen, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, user } = useAuth();
  const [username, setUsername] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Grade 10 / Year 11");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim()) {
      setErrorMsg("Please enter your display name or nickname.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMsg("Please enter a valid email address (e.g. name@example.com).");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    const res = await signUp(email, password, username, gradeLevel);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      router.push("/onboarding");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:px-8 py-12">
        <div className="max-w-md w-full rounded-2xl bg-[#0B0B0B] border border-[#1E1E1E] p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#262626] text-white flex items-center justify-center mx-auto mb-4">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Student Account</h1>
            <p className="text-xs text-[#737373] mt-1.5">
              Set up your private student portal to track score goals and generate daily quests.
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
                Display Name / Nickname *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-white placeholder-[#555555] text-sm focus:outline-none focus:border-white transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                Current Grade / Academic Level
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="e.g. Grade 10, O-Level, AP"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141414] border border-[#262626] text-white placeholder-[#555555] text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                Email Address *
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
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CCCCCC] mb-1.5">
                Password * (Minimum 6 characters)
              </label>
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
              <span>{isSubmitting ? "Creating Account..." : "Create Account & Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#181818] text-center text-xs text-[#737373]">
            <span>Already have an account? </span>
            <Link href="/login" className="text-white font-medium hover:underline">
              Log In
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#555555]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#737373]" />
            <span>Private data isolation • Zero AI tracking</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
