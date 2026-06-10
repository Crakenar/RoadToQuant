import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

export type WeekStatus = 'locked' | 'available' | 'in_progress' | 'done';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlockedAt?: string;
}

export interface AppState {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  weekStatus: Record<number, WeekStatus>;
  achievements: Achievement[];
  totalSessions: number;
  pomodoroCount: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_week', title: 'First Step', desc: 'Complete your first week', icon: '🎯' },
  { id: 'phase1', title: 'Foundation Laid', desc: 'Complete Phase 1', icon: '🏗️' },
  { id: 'phase2', title: 'Portfolio Built', desc: 'Complete Phase 2', icon: '💼' },
  { id: 'phase3', title: 'Employed', desc: 'Complete Phase 3', icon: '🏦' },
  { id: 'phase5', title: 'Tier 1 Ready', desc: 'Complete the full roadmap', icon: '🏆' },
  { id: 'streak_3', title: 'On Fire', desc: '3-day streak', icon: '🔥' },
  { id: 'streak_7', title: 'Weekly Warrior', desc: '7-day streak', icon: '⚡' },
  { id: 'streak_30', title: 'Unstoppable', desc: '30-day streak', icon: '💎' },
  { id: 'level_5', title: 'Level 5', desc: 'Reach level 5', icon: '⭐' },
  { id: 'level_10', title: 'Level 10', desc: 'Reach level 10', icon: '🌟' },
  { id: 'pomodoro_10', title: 'Focus Machine', desc: '10 Pomodoro sessions', icon: '🍅' },
  { id: 'pomodoro_50', title: 'Deep Work Demon', desc: '50 Pomodoro sessions', icon: '🧠' },
  { id: 'xp_500', title: '500 XP Club', desc: 'Earn 500 XP', icon: '💫' },
  { id: 'xp_1000', title: 'Grand', desc: 'Earn 1000 XP', icon: '👑' },
];

export const XP_PER_LEVEL = 150;
export const XP_ACTIONS = {
  week_start: 25,
  week_done: 100,
  pomodoro_done: 15,
  daily_checkin: 10,
} as const;

const STORE_KEY = '@quant_state_v2';

const defaultState = (): AppState => ({
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: '',
  weekStatus: { 1: 'available' },
  achievements: [],
  totalSessions: 0,
  pomodoroCount: 0,
});

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function computeLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function xpInLevel(xp: number) {
  return xp % XP_PER_LEVEL;
}

function checkAchievements(state: AppState, weeksDone: number[]): Achievement[] {
  const existing = new Set(state.achievements.map(a => a.id));
  const now = new Date().toISOString();
  const newUnlocked: Achievement[] = [];

  function maybe(id: string, condition: boolean) {
    if (condition && !existing.has(id)) {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) newUnlocked.push({ ...a, unlockedAt: now });
    }
  }

  maybe('first_week', weeksDone.length >= 1);
  maybe('phase1', weeksDone.filter(w => w <= 17).length === 17);
  maybe('phase2', weeksDone.filter(w => w >= 18 && w <= 23).length === 6);
  maybe('phase3', weeksDone.filter(w => w >= 24 && w <= 26).length === 3);
  maybe('phase5', weeksDone.length === 29);
  maybe('streak_3', state.streak >= 3);
  maybe('streak_7', state.streak >= 7);
  maybe('streak_30', state.streak >= 30);
  maybe('level_5', state.level >= 5);
  maybe('level_10', state.level >= 10);
  maybe('pomodoro_10', state.pomodoroCount >= 10);
  maybe('pomodoro_50', state.pomodoroCount >= 50);
  maybe('xp_500', state.xp >= 500);
  maybe('xp_1000', state.xp >= 1000);

  return newUnlocked;
}

export function useStore() {
  const [state, setState] = useState<AppState>(defaultState());
  const [loaded, setLoaded] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as AppState;
          setState(saved);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (next: AppState) => {
    setState(next);
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
  }, []);

  const updateStreak = useCallback(async (current: AppState): Promise<AppState> => {
    const today = getTodayStr();
    if (current.lastActiveDate === today) return current;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const newStreak = current.lastActiveDate === yesterdayStr
      ? current.streak + 1
      : 1;

    return { ...current, streak: newStreak, lastActiveDate: today };
  }, []);

  const addXP = useCallback(async (amount: number) => {
    setState(prev => {
      const next = { ...prev };
      next.xp = prev.xp + amount;
      next.level = computeLevel(next.xp);
      const weeksDone = Object.entries(next.weekStatus)
        .filter(([, v]) => v === 'done')
        .map(([k]) => Number(k));
      const unlocked = checkAchievements(next, weeksDone);
      if (unlocked.length > 0) {
        next.achievements = [...prev.achievements, ...unlocked];
        setNewAchievements(unlocked);
      }
      AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setWeekStatus = useCallback(async (weekNum: number, status: WeekStatus) => {
    setState(prev => {
      const next = { ...prev, weekStatus: { ...prev.weekStatus, [weekNum]: status } };
      // unlock next week
      if (status === 'done' && weekNum < 29) {
        if (!next.weekStatus[weekNum + 1] || next.weekStatus[weekNum + 1] === 'locked') {
          next.weekStatus[weekNum + 1] = 'available';
        }
      }
      const weeksDone = Object.entries(next.weekStatus)
        .filter(([, v]) => v === 'done')
        .map(([k]) => Number(k));
      const unlocked = checkAchievements(next, weeksDone);
      if (unlocked.length > 0) {
        next.achievements = [...prev.achievements, ...unlocked];
        setNewAchievements(unlocked);
      }
      AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const recordPomodoro = useCallback(async () => {
    setState(prev => {
      const next = { ...prev, pomodoroCount: prev.pomodoroCount + 1, totalSessions: prev.totalSessions + 1 };
      AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
      return next;
    });
    await addXP(XP_ACTIONS.pomodoro_done);
  }, [addXP]);

  const dailyCheckin = useCallback(async () => {
    const today = getTodayStr();
    setState(prev => {
      if (prev.lastActiveDate === today) return prev;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = prev.lastActiveDate === yesterdayStr ? prev.streak + 1 : 1;
      const next = { ...prev, streak: newStreak, lastActiveDate: today };
      AsyncStorage.setItem(STORE_KEY, JSON.stringify(next));
      return next;
    });
    await addXP(XP_ACTIONS.daily_checkin);
  }, [addXP]);

  const clearNewAchievements = useCallback(() => setNewAchievements([]), []);

  const weeksDone = Object.entries(state.weekStatus)
    .filter(([, v]) => v === 'done')
    .map(([k]) => Number(k));

  return {
    state,
    loaded,
    newAchievements,
    clearNewAchievements,
    addXP,
    setWeekStatus,
    recordPomodoro,
    dailyCheckin,
    xpInLevel: xpInLevel(state.xp),
    xpPerLevel: XP_PER_LEVEL,
    weeksDone,
  };
}

export { ACHIEVEMENTS };
