import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SchoolQuest | Turn Your Academic Goals Into Quests",
  description:
    "Personalized academic planning and gamification platform for students. Transform study targets, upcoming tests, and weak topics into manageable daily quests with XP and streaks.",
  keywords: [
    "study planner",
    "academic gamification",
    "student productivity",
    "quest study",
    "exam prep",
    "XP learning",
  ],
};

import { AuthProvider } from "@/lib/auth/authContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark antialiased`}>
      <body className="min-h-screen flex flex-col bg-[#050505] text-[#ffffff] font-sans selection:bg-[#333333] selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
