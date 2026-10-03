# SchoolQuest 🎯⚔️
> **Turn your academic goals into manageable quests.**

SchoolQuest is a personalized academic planning and gamification platform for students. It translates grades, score targets, upcoming tests, weak topics, and daily study availability into prioritized, manageable daily quests that reward XP, track streaks, and visualize academic mastery.

---

## 🌟 The Core Idea

> *"Tell SchoolQuest where I am → where I want to go → what I have coming up → how much time I have → SchoolQuest tells me what I should work on and turns it into manageable quests."*

---

## 🚀 Key Features

- **Personalized Student Onboarding**: Guided multi-step flow capturing subjects, current vs. target scores, prior exam history, upcoming test dates, available daily minutes, and extracurricular passions.
- **Deterministic Study Planning Engine** (`lib/planning/studyPlanEngine.ts`): Intelligently calculates score gaps (`target_score - current_score`), test urgency (proximity in days), and weak topic multipliers to schedule high-yield study sessions.
- **Gamification Mechanics**:
  - **100 XP per Level Tier**: Clear, understandable progression (Novice Scholar → Apprentice Learner → Dedicated Student → Academic Champion).
  - **Daily Streaks**: Track daily study consistency.
  - **Confetti & Celebrations**: Instant visual rewards on quest completion.
- **Visual Academic Skill Tree** (`/skill-tree`): Hierarchical branch visualization mapping the academic journey to subjects, weak topics, and mastery practice nodes.
- **Progress & Analytics** (`/progress`): Operational metrics on quest completion rates, total minutes studied, and goal gap reduction.
- **Groq AI Service Architecture** (`lib/ai/`):
  - Server-side integration with Groq (`GROQ_API_KEY`) to suggest personalized study strategies and extracurricular synergy projects.
  - Built-in heuristic fallback engine ensuring 100% functionality even without an API key ($0 cost, zero dependencies).
- **Dual-Storage Strategy**:
  - **Zero-Config Local Demo**: Works immediately out-of-the-box for evaluation with realistic sample student data (Alex Morgan).
  - **Supabase PostgreSQL Schema** (`supabase/schema.sql`): Production-ready schema with Row Level Security (RLS) policies and indexes.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Icons & Effects**: `lucide-react`, `canvas-confetti`
- **Backend**: Next.js Server Route Handlers & Server-side Utilities
- **Database**: Supabase / PostgreSQL schema with LocalStorage fallback
- **AI Engine**: Groq API abstraction (`llama-3.3-70b-versatile`) with deterministic heuristics fallback

---

## 🏃 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Optional Environment Variables
Create `.env.local` to enable cloud database and live AI features (both optional):
```env
# Groq API Key (Free tier at console.groq.com)
GROQ_API_KEY=your_groq_api_key_here

# Supabase (Free tier at supabase.com)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🛡️ Academic Disclaimer & Privacy

- **Academic Goals, Not Predictions**: Target scores are student-defined goals, not scientific or probabilistic predictions. XP measures study output and habit consistency, not intrinsic intelligence.
- **Privacy by Design**: No passwords, phone numbers, home addresses, or sensitive school records are collected. Fictional demo data is provided for initial exploration.

---

## 🏆 Hackathon Highlights

1. **Working End-to-End**: A student can enter their grades, generate a prioritized plan, complete quests, earn XP, and see their stats update in real-time.
2. **Zero Setup Barrier**: Judges can immediately click **"Explore Interactive Demo"** on the landing page or test the 6-step onboarding wizard without needing database credentials or API keys.
