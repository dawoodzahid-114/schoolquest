"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/authContext";
import { loadStudentData, StudentPortalData } from "@/lib/storage/studentStore";
import { getLevelInfo } from "@/lib/gamification/levels";
import {
  Compass,
  LayoutDashboard,
  Swords,
  TrendingUp,
  GitFork,
  Calendar,
  Flame,
  Zap,
  Settings,
  LogOut,
  User,
  LogIn,
  UserPlus,
  Timer,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [data, setData] = useState<StudentPortalData | null>(null);

  useEffect(() => {
    if (user) {
      setData(loadStudentData(user.id));
    } else {
      setData(null);
    }

    const handleUpdate = () => {
      if (user) setData(loadStudentData(user.id));
    };

    window.addEventListener("schoolquest_student_updated", handleUpdate);
    window.addEventListener("schoolquest_auth_changed", handleUpdate);
    return () => {
      window.removeEventListener("schoolquest_student_updated", handleUpdate);
      window.removeEventListener("schoolquest_auth_changed", handleUpdate);
    };
  }, [user, pathname]);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/timetable", label: "Timetable", icon: Calendar },
    { href: "/quests", label: "Quests", icon: Swords },
    { href: "/progress", label: "Progress", icon: TrendingUp },
    { href: "/skill-tree", label: "Skill Tree", icon: GitFork },
  ];

  const levelInfo = data ? getLevelInfo(data.progress.xp) : null;
  const displayName = profile?.username || user?.email?.split("@")[0] || "Student";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1A1A1A] bg-[#050505]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center text-white group-hover:border-[#404040] transition-colors">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1">
              School<span className="text-[#A1A1A1]">Quest</span>
            </span>
            <span className="text-[10px] text-[#666666] font-medium -mt-0.5 hidden sm:inline tracking-wider uppercase">
              Academic Portal
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Visible when logged in) */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-[#0B0B0B] p-1 rounded-xl border border-[#1E1E1E]">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#1C1C1C] text-white border border-[#2D2D2D] shadow-sm"
                      : "text-[#8E8E8E] hover:text-white hover:bg-[#121212]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Status / Actions */}
        <div className="flex items-center gap-2.5">
          {user && data ? (
            <div className="flex items-center gap-2">
              {/* Active Focus Session Badge if currently active */}
              {data.activeSession && (
                <Link
                  href={`/focus?questId=${data.activeSession.quest_id}`}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-medium transition-colors"
                  title="Return to active focus timer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[110px]">{data.activeSession.subject_name}</span>
                </Link>
              )}

              {/* Streak Badge */}
              <div
                title="Current Daily Streak"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111111] border border-[#222222] text-[#D4D4D4] text-xs font-medium"
              >
                <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>{data.progress.streak}d</span>
              </div>

              {/* Level & XP Pill */}
              <Link
                href="/progress"
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#111111] border border-[#222222] text-xs hover:border-[#383838] transition-colors"
                title={`${data.progress.xp} Total XP • Level ${levelInfo?.level} (${levelInfo?.title})`}
              >
                <div className="flex items-center gap-1 text-white font-medium">
                  <Zap className="w-3 h-3 text-[#A1A1A1]" />
                  <span>Lvl {levelInfo?.level}</span>
                </div>
                <div className="w-10 h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden hidden sm:block">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${levelInfo?.progressPercentage || 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#737373] hidden sm:inline">{data.progress.xp} XP</span>
              </Link>

              {/* User Settings */}
              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111111] hover:bg-[#181818] border border-[#222222] text-white text-xs font-medium transition-colors"
                title="Account Settings"
              >
                <User className="w-3 h-3 text-[#8E8E8E]" />
                <span className="max-w-[85px] truncate">{displayName}</span>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 rounded-lg text-[#737373] hover:text-white hover:bg-[#141414] border border-transparent hover:border-[#242424] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#A1A1A1] hover:text-white text-xs font-medium transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#E5E5E5] text-[#050505] text-xs font-semibold transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar when logged in */}
      {user && (
        <div className="md:hidden border-t border-[#1A1A1A] bg-[#070707] px-4 py-2 flex items-center justify-around">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 text-xs font-medium rounded-lg transition-colors ${
                  isActive ? "text-white bg-[#141414]" : "text-[#737373] hover:text-[#A1A1A1]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
