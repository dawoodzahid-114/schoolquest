"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/authContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Swords,
  Target,
  Clock,
  Flame,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const { user, profile } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 border-b border-[#1A1A1A]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            {/* Top Monochrome Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111] border border-[#242424] text-[#CCCCCC] text-xs font-medium mb-8">
              <span>🔒</span>
              <span>Personal Student Portals • Individual Data Isolation • Zero AI APIs</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.12]">
              Turn your academic goals{" "}
              <br className="hidden sm:inline" />
              <span className="text-[#8E8E8E]">into actionable quests.</span>
            </h1>

            {/* Subheading */}
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#888888] font-normal mb-10 leading-relaxed">
              Every student gets a private, isolated workspace. Enter your subjects, target scores,
              exam dates, and daily availability. SchoolQuest&apos;s deterministic algorithms
              schedule structured study sessions with clear progression and zero guesswork.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
              <Link
                href={user ? "/dashboard" : "/signup"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-white hover:bg-[#E5E5E5] text-[#050505] font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-white/5"
              >
                <span>Go to Your Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              {!user && (
                <>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#111111] hover:bg-[#181818] border border-[#242424] hover:border-[#383838] text-[#CCCCCC] hover:text-white font-medium text-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#888888]" />
                    <span>Explore Demo</span>
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#111111] hover:bg-[#181818] border border-[#242424] hover:border-[#383838] text-white font-medium text-sm transition-all"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#888888]" />
                    <span>Log In to Portal</span>
                  </Link>
                </>
              )}
            </div>

            {/* THREE CORE ARCHITECTURE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto text-left">
              <div className="p-6 rounded-2xl bg-[#101010] border border-[#242424] hover:border-[#383838] transition-all space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#2A2A2A] text-white flex items-center justify-center font-mono font-bold text-xs">
                  01
                </div>
                <h3 className="text-sm font-bold text-white">Your Subjects, Your Targets</h3>
                <p className="text-[#888888] text-xs leading-relaxed">
                  No hardcoded coursework. Add your actual subjects, specify current grades, and set target scores with custom weak topic priorities.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101010] border border-[#242424] hover:border-[#383838] transition-all space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#2A2A2A] text-white flex items-center justify-center font-mono font-bold text-xs">
                  02
                </div>
                <h3 className="text-sm font-bold text-white">Deterministic Study Planning</h3>
                <p className="text-[#888888] text-xs leading-relaxed">
                  Pure rule-based algorithms compute score gaps, test deadlines, and topic weights to slice study hours into focused 20–35 minute sessions.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101010] border border-[#242424] hover:border-[#383838] transition-all space-y-3">
                <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#2A2A2A] text-white flex items-center justify-center font-mono font-bold text-xs">
                  03
                </div>
                <h3 className="text-sm font-bold text-white">Private & Secure Accounts</h3>
                <p className="text-[#888888] text-xs leading-relaxed">
                  Secured by Row Level Security. Your grades, assessments, and study quests are private and visible solely to your authenticated account.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES SECTION */}
        <section className="py-20 bg-[#070707]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#737373] mb-2 block">
                Platform Overview
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Designed for real academic focus
              </h2>
              <p className="text-[#888888] text-xs sm:text-sm mt-2">
                Personalized study sessions, transparent rule-based logic, and streak discipline without distractions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl bg-[#101010] border border-[#242424] hover:border-[#383838] transition-colors space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#181818] border border-[#282828] text-white flex items-center justify-center">
                  <Swords className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white">Daily Quests</h3>
                <p className="text-[#888888] text-xs leading-relaxed">
                  Slices study time into 20–35 minute focused sessions: Learn, Review, Practice, Revision, Mistake Review, and Test Prep.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101010] border border-[#242424] hover:border-[#383838] transition-colors space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#181818] border border-[#282828] text-white flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white">Goal Gap Analytics</h3>
                <p className="text-[#888888] text-xs leading-relaxed">
                  Quantifies the delta between current scores and target goals. Subjects with larger gaps and closer test dates receive automatic priority.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#101010] border border-[#242424] hover:border-[#383838] transition-colors space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#181818] border border-[#282828] text-white flex items-center justify-center">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-white">XP & Streaks</h3>
                <p className="text-[#888888] text-xs leading-relaxed">
                  Earn XP upon completing sessions, advance through academic tiers every 100 XP, and maintain daily discipline with streak tracking.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
