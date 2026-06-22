export interface Question {
  id: string;
  category: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface ShuffledQuestion extends Omit<Question, 'correct'> {
  correct: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  categoryIds: string[];
}

export interface QuestionStats {
  questionId: string;
  attempts: number;
  correct: number;
}

export type SRSRating = 0 | 1 | 2 | 3;

export interface SRSCard {
  questionId: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueDate: string | null;
}

export type QuizMode = 'quiz' | 'review';

export type RootStackParamList = {
  MainTabs: undefined;
  Subject: { subjectId: string; subjectName: string; subjectColor: string };
  Notes: { subjectId: string; subjectName: string; subjectColor: string };
  Quiz: { categoryId: string; categoryName: string; mode: QuizMode };
  Results: { score: number; total: number; wrongIds: string[]; categoryId: string; mode: QuizMode };
};

export type TabParamList = {
  Home: undefined;
  Stats: undefined;
};
