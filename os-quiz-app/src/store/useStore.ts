import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuestionStats, SRSCard, SRSRating } from '../types';

function sm2(
  rating: SRSRating,
  card: Pick<SRSCard, 'interval' | 'easeFactor' | 'repetitions'>
): Pick<SRSCard, 'interval' | 'easeFactor' | 'repetitions' | 'dueDate'> {
  let { interval, easeFactor, repetitions } = card;

  if (rating === 0) {
    interval = 1;
    repetitions = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 1) {
    interval = Math.max(1, Math.ceil(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === 2) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.ceil(interval * easeFactor);
    repetitions += 1;
  } else {
    if (repetitions === 0) interval = 4;
    else if (repetitions === 1) interval = 8;
    else interval = Math.ceil(interval * easeFactor * 1.3);
    repetitions += 1;
    easeFactor = Math.min(2.5, easeFactor + 0.15);
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);
  const dueDate = due.toISOString().split('T')[0];
  return { interval, easeFactor, repetitions, dueDate };
}

export function previewInterval(
  rating: SRSRating,
  card: Pick<SRSCard, 'interval' | 'easeFactor' | 'repetitions'>
): string {
  const { interval } = sm2(rating, card);
  if (interval <= 1) return '1 day';
  if (interval < 7) return `${interval}d`;
  if (interval < 30) return `${Math.round(interval / 7)}w`;
  return `${Math.round(interval / 30)}mo`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

interface StoreState {
  stats: Record<string, QuestionStats>;
  srs: Record<string, SRSCard>;
  recentWrong: string[];
  reviewHistory: Record<string, number>;
  loaded: boolean;
  loadStats: () => Promise<void>;
  recordAnswer: (questionId: string, wasCorrect: boolean) => Promise<void>;
  recordSRS: (questionId: string, rating: SRSRating) => Promise<void>;
  isDue: (questionId: string) => boolean;
  getDueIds: (questionIds: string[]) => string[];
  resetStats: () => Promise<void>;
}

const DEFAULT_EASE = 2.5;

export const useStore = create<StoreState>((set, get) => ({
  stats: {},
  srs: {},
  recentWrong: [],
  reviewHistory: {},
  loaded: false,

  loadStats: async () => {
    try {
      const [rawStats, rawSRS, rawWrong, rawHistory] = await Promise.all([
        AsyncStorage.getItem('devdrill_stats'),
        AsyncStorage.getItem('devdrill_srs'),
        AsyncStorage.getItem('devdrill_recent_wrong'),
        AsyncStorage.getItem('devdrill_review_history'),
      ]);
      set({
        stats: rawStats ? JSON.parse(rawStats) : {},
        srs: rawSRS ? JSON.parse(rawSRS) : {},
        recentWrong: rawWrong ? JSON.parse(rawWrong) : [],
        reviewHistory: rawHistory ? JSON.parse(rawHistory) : {},
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  recordAnswer: async (questionId, wasCorrect) => {
    const { stats, recentWrong, reviewHistory } = get();

    // Update cumulative stats
    const prev = stats[questionId] ?? { questionId, attempts: 0, correct: 0 };
    const updatedStats = {
      ...stats,
      [questionId]: {
        questionId,
        attempts: prev.attempts + 1,
        correct: prev.correct + (wasCorrect ? 1 : 0),
      },
    };

    // Track recent wrong (keep last 30, deduplicated, most recent first)
    const updatedWrong = wasCorrect
      ? recentWrong
      : [questionId, ...recentWrong.filter((id) => id !== questionId)].slice(0, 30);

    // Track daily review count for streak
    const today = todayStr();
    const updatedHistory = { ...reviewHistory, [today]: (reviewHistory[today] ?? 0) + 1 };

    set({ stats: updatedStats, recentWrong: updatedWrong, reviewHistory: updatedHistory });
    await Promise.all([
      AsyncStorage.setItem('devdrill_stats', JSON.stringify(updatedStats)),
      AsyncStorage.setItem('devdrill_recent_wrong', JSON.stringify(updatedWrong)),
      AsyncStorage.setItem('devdrill_review_history', JSON.stringify(updatedHistory)),
    ]);
  },

  recordSRS: async (questionId, rating) => {
    const currentSRS = get().srs;
    const prev = currentSRS[questionId] ?? {
      questionId,
      interval: 0,
      easeFactor: DEFAULT_EASE,
      repetitions: 0,
      dueDate: null,
    };
    const next = sm2(rating, prev);
    const updated = { ...currentSRS, [questionId]: { questionId, ...next } };
    set({ srs: updated });
    await AsyncStorage.setItem('devdrill_srs', JSON.stringify(updated));
  },

  isDue: (questionId) => {
    const card = get().srs[questionId];
    if (!card || card.dueDate === null) return true;
    return card.dueDate <= todayStr();
  },

  getDueIds: (questionIds) => {
    const { isDue } = get();
    return questionIds.filter(isDue);
  },

  resetStats: async () => {
    set({ stats: {}, srs: {}, recentWrong: [], reviewHistory: {} });
    await AsyncStorage.multiRemove([
      'devdrill_stats',
      'devdrill_srs',
      'devdrill_recent_wrong',
      'devdrill_review_history',
    ]);
  },
}));
