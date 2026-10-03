export const XP_PER_LEVEL = 100;

export interface LevelInfo {
  level: number;
  currentLevelXp: number; // XP accumulated inside current level (0-99)
  xpForNextLevel: number; // usually 100
  progressPercentage: number; // 0 to 100
  title: string;
}

export const LEVEL_TITLES: { [level: number]: string } = {
  1: "Novice Scholar",
  2: "Apprentice Learner",
  3: "Dedicated Student",
  4: "Knowledge Seeker",
  5: "Academic Adventurer",
  6: "Topic Strategist",
  7: "Discipline Master",
  8: "Grand Scholar",
  9: "Academic Champion",
  10: "Quest Legend",
};

export function getLevelInfo(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, totalXp);
  const level = Math.floor(safeXp / XP_PER_LEVEL) + 1;
  const currentLevelXp = safeXp % XP_PER_LEVEL;
  const progressPercentage = Math.min(100, Math.round((currentLevelXp / XP_PER_LEVEL) * 100));
  
  const title = LEVEL_TITLES[level] || `Scholar Tier ${level}`;

  return {
    level,
    currentLevelXp,
    xpForNextLevel: XP_PER_LEVEL,
    progressPercentage,
    title,
  };
}

export function calculateNewStreak(
  currentStreak: number,
  lastActivityDate?: string,
  today: string = new Date().toISOString().split("T")[0]
): { newStreak: number; streakIncreased: boolean } {
  if (!lastActivityDate) {
    return { newStreak: 1, streakIncreased: true };
  }

  if (lastActivityDate === today) {
    // Already completed something today; streak maintained
    return { newStreak: currentStreak, streakIncreased: false };
  }

  const lastDate = new Date(lastActivityDate);
  const currentDate = new Date(today);
  const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Consecutive day
    return { newStreak: currentStreak + 1, streakIncreased: true };
  } else if (diffDays > 1) {
    // Broken streak
    return { newStreak: 1, streakIncreased: true };
  }

  return { newStreak: currentStreak, streakIncreased: false };
}
