import React from "react";
import Link from "next/link";
import { Compass, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#1A1A1A] bg-[#050505] text-[#737373] text-xs py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#242424] flex items-center justify-center text-white">
                <Compass className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight">
                School<span className="text-[#A1A1A1]">Quest</span>
              </span>
            </div>
            <p className="text-[#888888] max-w-md leading-relaxed text-xs">
              Turn your academic goals into manageable daily quests. SchoolQuest translates your
              target grades, upcoming exams, and available minutes into a focused study routine
              using deterministic, explainable algorithms.
            </p>
            <div className="flex items-start gap-2.5 text-[11px] text-[#A1A1A1] bg-[#0E0E0E] border border-[#222222] p-3 rounded-xl max-w-md">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#888888] mt-0.5" />
              <span>
                <strong className="text-white">Academic Notice:</strong> Target scores reflect student goals, not predictive guarantees. All accounts are isolated with private Row Level Security.
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-[#888888] hover:text-white transition-colors">
                  Student Portal
                </Link>
              </li>
              <li>
                <Link href="/quests" className="text-[#888888] hover:text-white transition-colors">
                  Daily Quests
                </Link>
              </li>
              <li>
                <Link href="/progress" className="text-[#888888] hover:text-white transition-colors">
                  Progress Analytics
                </Link>
              </li>
              <li>
                <Link href="/skill-tree" className="text-[#888888] hover:text-white transition-colors">
                  Academic Skill Tree
                </Link>
              </li>
              <li>
                <Link href="/settings" className="text-[#888888] hover:text-white transition-colors">
                  Student Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Engineering */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">
              Architecture & Privacy
            </h4>
            <ul className="space-y-2 text-[#888888]">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#444444]" />
                Next.js 16 + TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#444444]" />
                Supabase Auth & PostgreSQL
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#444444]" />
                Row Level Security (RLS)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#444444]" />
                Deterministic Study Logic
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#444444]" />
                100% Zero AI API Architecture
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#1A1A1A] pt-6 flex flex-col sm:flex-row items-center justify-between text-[#555555] gap-4">
          <p>© {new Date().getFullYear()} SchoolQuest. Private academic productivity platform.</p>
          <div className="flex items-center gap-2 text-[#737373]">
            <span>Focused, disciplined learning</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
