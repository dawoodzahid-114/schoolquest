-- =========================================================================
-- SchoolQuest Supabase PostgreSQL Migration (Production Schema)
-- Multi-Tenant Security, Idempotent XP, RLS, and Composite Foreign Keys
-- =========================================================================

-- Enable Extension for UUID Generation
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Profiles Table (Linked to auth.users)
-- -------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text not null,
  email text,
  grade_level text not null default 'Grade 10',
  curriculum text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -------------------------------------------------------------------------
-- 2. Subjects Table (User-owned)
-- -------------------------------------------------------------------------
create table if not exists public.subjects (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  current_score numeric(5,2) not null check (current_score >= 0 and current_score <= 100),
  current_grade text,
  target_score numeric(5,2) not null check (target_score >= 0 and target_score <= 100),
  target_grade text not null,
  weak_topics text[] not null default '{}'::text[],
  color text default '#3B82F6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint uq_subjects_id_user unique (id, user_id)
);

create index if not exists idx_subjects_user_id on public.subjects(user_id);

-- -------------------------------------------------------------------------
-- 3. Academic History Table (User-owned)
-- -------------------------------------------------------------------------
create table if not exists public.academic_history (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  subject_id text,
  subject_name text not null,
  exam_name text not null,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  grade text,
  exam_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint fk_academic_history_subject_user foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete set null
);

create index if not exists idx_academic_history_user_id on public.academic_history(user_id);

-- -------------------------------------------------------------------------
-- 4. Assessments Table (Upcoming Tests)
-- -------------------------------------------------------------------------
create table if not exists public.assessments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  subject_id text,
  subject_name text not null,
  name text not null,
  assessment_date date not null,
  topics text[] not null default '{}'::text[],
  priority text not null check (priority in ('high', 'medium', 'low')) default 'medium',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint fk_assessments_subject_user foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete cascade
);

create index if not exists idx_assessments_user_id on public.assessments(user_id);
create index if not exists idx_assessments_date on public.assessments(user_id, assessment_date);

-- -------------------------------------------------------------------------
-- 5. Study Preferences Table (User-owned)
-- -------------------------------------------------------------------------
create table if not exists public.study_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key default auth.uid(),
  daily_minutes integer not null default 60 check (daily_minutes > 0),
  preferred_start_time text not null default '17:00',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -------------------------------------------------------------------------
-- 6. Interests Table (User-owned)
-- -------------------------------------------------------------------------
create table if not exists public.interests (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  interest_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_interests_user_id on public.interests(user_id);

-- -------------------------------------------------------------------------
-- 7. Quests Table (User-owned)
-- -------------------------------------------------------------------------
create table if not exists public.quests (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  subject_id text,
  subject_name text not null,
  title text not null,
  description text not null,
  quest_type text not null check (quest_type in ('Learn', 'Review', 'Practice', 'Revision', 'Mistake Review', 'Test Preparation')),
  scheduled_date date not null,
  scheduled_time text not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  xp integer not null default 25 check (xp >= 0),
  completed boolean not null default false,
  completed_at timestamp with time zone,
  topic text,
  accumulated_focus_seconds integer not null default 0 check (accumulated_focus_seconds >= 0),
  why_this_quest text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint uq_quests_id_user unique (id, user_id),
  constraint fk_quests_subject_user foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete set null
);

create index if not exists idx_quests_user_date on public.quests(user_id, scheduled_date);

-- -------------------------------------------------------------------------
-- 8. User Progress Table (Gamification: XP, Levels, Streaks)
-- -------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id uuid references auth.users(id) on delete cascade primary key default auth.uid(),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak integer not null default 0 check (streak >= 0),
  last_activity_date date,
  total_quests_completed integer not null default 0 check (total_quests_completed >= 0),
  total_minutes_studied integer not null default 0 check (total_minutes_studied >= 0),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -------------------------------------------------------------------------
-- 9. Fixed Commitments Table (Tuition, Sports, Academy)
-- -------------------------------------------------------------------------
create table if not exists public.fixed_commitments (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  title text not null,
  category text not null check (category in ('Tuition', 'Academy', 'Sports', 'Prayer', 'Family', 'Extracurricular', 'Other')),
  days text[] not null default '{}'::text[],
  start_time text not null,
  end_time text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_fixed_commitments_user_id on public.fixed_commitments(user_id);

-- -------------------------------------------------------------------------
-- 10. Timetable Blocks Table (Weekly Timetable)
-- -------------------------------------------------------------------------
create table if not exists public.timetable_blocks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  title text not null,
  block_type text not null check (block_type in ('study', 'school', 'travel', 'break', 'meal', 'commitment', 'sleep', 'custom')),
  day_of_week text not null check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time text not null,
  end_time text not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  subject_id text,
  subject_name text,
  quest_id text,
  is_completed boolean not null default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint fk_timetable_subject_user foreign key (subject_id, user_id)
    references public.subjects(id, user_id) on delete set null,
  constraint fk_timetable_quest_user foreign key (quest_id, user_id)
    references public.quests(id, user_id) on delete set null
);

create index if not exists idx_timetable_blocks_user_id on public.timetable_blocks(user_id);
create index if not exists idx_timetable_blocks_day on public.timetable_blocks(user_id, day_of_week);

-- -------------------------------------------------------------------------
-- 11. Timetable Configurations Table
-- -------------------------------------------------------------------------
create table if not exists public.timetable_configs (
  user_id uuid references auth.users(id) on delete cascade primary key default auth.uid(),
  school_start text not null default '07:30',
  school_end text not null default '14:00',
  travel_to_school_minutes integer not null default 30 check (travel_to_school_minutes >= 0),
  travel_home_minutes integer not null default 30 check (travel_home_minutes >= 0),
  sleep_time text not null default '23:00',
  wake_time text not null default '06:30',
  daily_study_minutes integer not null default 90 check (daily_study_minutes > 0),
  preferred_study_periods text[] not null default '{"after_school", "evening"}'::text[],
  focus_duration_minutes integer not null default 45 check (focus_duration_minutes > 0),
  break_duration_minutes integer not null default 10 check (break_duration_minutes >= 0),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -------------------------------------------------------------------------
-- 12. Study Sessions Table (Focus Timer State)
-- -------------------------------------------------------------------------
create table if not exists public.study_sessions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  quest_id text not null,
  quest_title text not null,
  subject_name text not null,
  status text not null check (status in ('running', 'paused', 'break', 'completed', 'ended_early')),
  required_duration_seconds integer not null check (required_duration_seconds > 0),
  accumulated_focus_seconds integer not null default 0 check (accumulated_focus_seconds >= 0),
  focus_started_at bigint,
  paused_at bigint,
  break_started_at bigint,
  break_duration_seconds integer not null default 0 check (break_duration_seconds >= 0),
  accumulated_break_seconds integer not null default 0 check (accumulated_break_seconds >= 0),
  planned_break_used boolean not null default false,
  session_started_at bigint not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint fk_study_sessions_quest_user foreign key (quest_id, user_id)
    references public.quests(id, user_id) on delete cascade
);

create index if not exists idx_study_sessions_user_id on public.study_sessions(user_id);
create index if not exists idx_study_sessions_quest_id on public.study_sessions(quest_id);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: No cross-user access permitted
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.academic_history enable row level security;
alter table public.assessments enable row level security;
alter table public.study_preferences enable row level security;
alter table public.interests enable row level security;
alter table public.quests enable row level security;
alter table public.user_progress enable row level security;
alter table public.fixed_commitments enable row level security;
alter table public.timetable_blocks enable row level security;
alter table public.timetable_configs enable row level security;
alter table public.study_sessions enable row level security;

-- Profiles Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Standard User-Owned Policies (auth.uid() = user_id)
create policy "Users can manage own subjects"
  on public.subjects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own academic history"
  on public.academic_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own assessments"
  on public.assessments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own study preferences"
  on public.study_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own interests"
  on public.interests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own quests"
  on public.quests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own progress"
  on public.user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own fixed commitments"
  on public.fixed_commitments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own timetable blocks"
  on public.timetable_blocks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own timetable configs"
  on public.timetable_configs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own study sessions"
  on public.study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================================================
-- DATABASE FUNCTIONS & TRIGGERS (DATA INTEGRITY & IDEMPOTENT XP)
-- =========================================================================

-- 1. Idempotent Quest XP & Progress Trigger
create or replace function public.handle_quest_xp_and_progress()
returns trigger as $$
declare
  v_new_xp integer;
  v_new_level integer;
  v_curr record;
  v_new_streak integer;
  v_today date := current_date;
begin
  -- Idempotent check: ONLY awards XP on initial transition from completed = false to completed = true
  if (tg_op = 'UPDATE' and old.completed = false and new.completed = true) or
     (tg_op = 'INSERT' and new.completed = true) then

    -- Ensure completed_at is populated
    if new.completed_at is null then
      new.completed_at := timezone('utc'::text, now());
    end if;

    select * into v_curr from public.user_progress where user_id = new.user_id;

    if found then
      v_new_xp := v_curr.xp + new.xp;
      v_new_level := (v_new_xp / 100) + 1; -- 100 XP per level

      -- Streak calculation matching levels.ts
      if v_curr.last_activity_date is null then
        v_new_streak := 1;
      elsif v_curr.last_activity_date = v_today then
        v_new_streak := v_curr.streak;
      elsif v_curr.last_activity_date = v_today - interval '1 day' then
        v_new_streak := v_curr.streak + 1;
      else
        v_new_streak := 1;
      end if;

      update public.user_progress
      set xp = v_new_xp,
          level = v_new_level,
          streak = v_new_streak,
          last_activity_date = v_today,
          total_quests_completed = v_curr.total_quests_completed + 1,
          total_minutes_studied = v_curr.total_minutes_studied + new.duration_minutes,
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;
    end if;

  -- Reversing completion (untoggling quest in UI)
  elsif (tg_op = 'UPDATE' and old.completed = true and new.completed = false) then
    new.completed_at := null;

    select * into v_curr from public.user_progress where user_id = new.user_id;
    if found then
      v_new_xp := greatest(0, v_curr.xp - old.xp);
      v_new_level := (v_new_xp / 100) + 1;

      update public.user_progress
      set xp = v_new_xp,
          level = v_new_level,
          total_quests_completed = greatest(0, v_curr.total_quests_completed - 1),
          total_minutes_studied = greatest(0, v_curr.total_minutes_studied - old.duration_minutes),
          updated_at = timezone('utc'::text, now())
      where user_id = new.user_id;
    end if;

  -- Repeated update with completed = true: strictly preserve original completed_at, NO XP AWARDED
  elsif (tg_op = 'UPDATE' and old.completed = true and new.completed = true) then
    new.completed_at := old.completed_at;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_quest_xp_progress on public.quests;
create trigger trg_quest_xp_progress
  before insert or update on public.quests
  for each row execute function public.handle_quest_xp_and_progress();

-- 2. Conflict-free Profile Insertion Trigger
create or replace function public.handle_profile_insert_conflict()
returns trigger as $$
begin
  if exists (select 1 from public.profiles where id = new.id) then
    update public.profiles
    set username = coalesce(new.username, username),
        email = coalesce(new.email, email),
        grade_level = coalesce(new.grade_level, grade_level),
        curriculum = coalesce(new.curriculum, curriculum),
        updated_at = timezone('utc'::text, now())
    where id = new.id;
    return null; -- Prevents duplicate key violation error on client signup
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_handle_profile_insert_conflict on public.profiles;
create trigger trg_handle_profile_insert_conflict
  before insert on public.profiles
  for each row execute function public.handle_profile_insert_conflict();

-- 3. Automatic Auth User Account Setup Trigger
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  -- Initialize Profile
  insert into public.profiles (id, username, email, grade_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'Student'),
    new.email,
    'Grade 10'
  )
  on conflict (id) do nothing;

  -- Initialize User Progress
  insert into public.user_progress (user_id, xp, level, streak, total_quests_completed, total_minutes_studied)
  values (new.id, 0, 1, 0, 0, 0)
  on conflict (user_id) do nothing;

  -- Initialize Study Preferences
  insert into public.study_preferences (user_id, daily_minutes, preferred_start_time)
  values (new.id, 60, '17:00')
  on conflict (user_id) do nothing;

  -- Initialize Timetable Configuration
  insert into public.timetable_configs (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
