import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList, SRSRating } from '../types';
import { useStore, previewInterval } from '../store/useStore';
import questionsData from '../data/questions.json';

type QuizRouteProp = RouteProp<RootStackParamList, 'Quiz'>;
type QuizNavProp = NativeStackNavigationProp<RootStackParamList>;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface ShuffledQ {
  id: string;
  category: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

function shuffleOptions(q: (typeof questionsData.questions)[0]): ShuffledQ {
  const correctText = q.options[q.correct];
  const shuffled = shuffleArray(q.options);
  return { ...q, options: shuffled, correct: shuffled.indexOf(correctText) };
}

const RATINGS: { rating: SRSRating; label: string; color: string; bg: string }[] = [
  { rating: 0, label: 'Again',    color: '#DC2626', bg: '#FEF2F2' },
  { rating: 1, label: 'Hard', color: '#D97706', bg: '#FFFBEB' },
  { rating: 2, label: 'Good',      color: '#059669', bg: '#F0FDF4' },
  { rating: 3, label: 'Easy',    color: '#4A90D9', bg: '#EFF6FF' },
];

export default function QuizScreen() {
  const navigation = useNavigation<QuizNavProp>();
  const route = useRoute<QuizRouteProp>();
  const { categoryId, categoryName, mode } = route.params;
  const { recordAnswer, recordSRS, getDueIds, srs } = useStore();

  const allQuestions = questionsData.questions;
  const allSubjects = questionsData.subjects;

  const [questions] = useState<ShuffledQ[]>(() => {
    let pool: typeof allQuestions;
    if (categoryId === 'all') {
      pool = allQuestions;
    } else if (categoryId.startsWith('subject:')) {
      const subjectId = categoryId.replace('subject:', '');
      const subject = allSubjects.find((s) => s.id === subjectId);
      const ids = subject?.categoryIds ?? [];
      pool = allQuestions.filter((q) => ids.includes(q.category));
    } else {
      pool = allQuestions.filter((q) => q.category === categoryId);
    }
    if (mode === 'review') {
      const dueIds = new Set(getDueIds(pool.map((q) => q.id)));
      pool = pool.filter((q) => dueIds.has(q.id));
      pool = [...pool].sort((a, b) => {
        const da = srs[a.id]?.dueDate ?? '9999-99-99';
        const db = srs[b.id]?.dueDate ?? '9999-99-99';
        return da.localeCompare(db);
      });
    } else {
      pool = shuffleArray(pool);
    }
    return pool.map(shuffleOptions);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  const currentQuestion = questions[currentIndex];

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            No cards due right now.{'\n'}Come back later or start a quiz.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleOptionPress = useCallback(
    async (optionIndex: number) => {
      if (answered) return;
      setSelectedOption(optionIndex);
      setAnswered(true);
      const isCorrect = optionIndex === currentQuestion.correct;
      if (isCorrect) setScore((s) => s + 1);
      else setWrongIds((ids) => [...ids, currentQuestion.id]);
      await recordAnswer(currentQuestion.id, isCorrect);
    },
    [answered, currentQuestion, recordAnswer]
  );

  const handleRating = useCallback(
    async (rating: SRSRating) => {
      await recordSRS(currentQuestion.id, rating);
      if (currentIndex + 1 >= questions.length) {
        navigation.replace('Results', {
          score,
          total: questions.length,
          wrongIds,
          categoryId,
          mode,
        });
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        setAnswered(false);
      }
    },
    [currentQuestion, currentIndex, questions.length, navigation, score, wrongIds, categoryId, mode, recordSRS]
  );

  const getOptionStyle = (index: number) => {
    if (!answered) return styles.optionDefault;
    if (index === currentQuestion.correct) return styles.optionCorrect;
    if (index === selectedOption) return styles.optionWrong;
    return styles.optionDefault;
  };

  const getOptionTextStyle = (index: number) => {
    if (!answered) return styles.optionTextDefault;
    if (index === currentQuestion.correct) return styles.optionTextCorrect;
    if (index === selectedOption) return styles.optionTextWrong;
    return styles.optionTextDefault;
  };

  const progress = (currentIndex / questions.length) * 100;
  const currentSRS = srs[currentQuestion.id] ?? {
    interval: 0, easeFactor: 2.5, repetitions: 0, dueDate: null,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.categoryLabel}>{categoryName}</Text>
          {mode === 'review' && (
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>🗓 Révision</Text>
            </View>
          )}
        </View>
        <Text style={styles.counter}>{currentIndex + 1}/{questions.length}</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question {currentIndex + 1}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.optionBase, getOptionStyle(index)]}
              onPress={() => handleOptionPress(index)}
              activeOpacity={answered ? 1 : 0.8}
              disabled={answered}
            >
              <View style={styles.optionInner}>
                <View
                  style={[
                    styles.optionBullet,
                    answered && index === currentQuestion.correct && styles.optionBulletCorrect,
                    answered && index === selectedOption && index !== currentQuestion.correct && styles.optionBulletWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionBulletText,
                      answered && (index === currentQuestion.correct || (index === selectedOption && index !== currentQuestion.correct)) && styles.optionBulletTextActive,
                    ]}
                  >
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={[styles.optionTextBase, getOptionTextStyle(index)]}>{option}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {answered && (
          <View
            style={[
              styles.explanationCard,
              selectedOption === currentQuestion.correct ? styles.explanationCorrect : styles.explanationWrong,
            ]}
          >
            <Text style={styles.explanationTitle}>
              {selectedOption === currentQuestion.correct ? '✓ Correct !' : '✗ Incorrect'}
            </Text>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}

        {answered && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>How was it?</Text>
            <View style={styles.ratingRow}>
              {RATINGS.map(({ rating, label, color, bg }) => {
                const preview = previewInterval(rating, currentSRS);
                return (
                  <TouchableOpacity
                    key={rating}
                    style={[styles.ratingButton, { backgroundColor: bg, borderColor: color }]}
                    onPress={() => handleRating(rating)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.ratingButtonLabel, { color }]}>{label}</Text>
                    <Text style={[styles.ratingButtonInterval, { color }]}>{preview}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EE' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between',
  },
  backButton: { paddingVertical: 4 },
  backText: { fontSize: 14, color: '#4A90D9', fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  reviewBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2, marginTop: 2,
  },
  reviewBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  counter: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  progressBarContainer: {
    height: 4, backgroundColor: '#E5E7EB',
    marginHorizontal: 16, borderRadius: 2, overflow: 'hidden', marginBottom: 8,
  },
  progressBarFill: { height: '100%', backgroundColor: '#4A90D9', borderRadius: 2 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  questionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    marginTop: 12, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  questionNumber: {
    fontSize: 12, fontWeight: '600', color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },
  questionText: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', lineHeight: 26 },
  optionsContainer: { gap: 10, marginBottom: 16 },
  optionBase: { borderRadius: 14, padding: 16, borderWidth: 2 },
  optionDefault: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
  optionCorrect: { backgroundColor: '#F0FDF4', borderColor: '#4CAF50' },
  optionWrong: { backgroundColor: '#FFE4E4', borderColor: '#FF5252' },
  optionInner: { flexDirection: 'row', alignItems: 'center' },
  optionBullet: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  optionBulletCorrect: { backgroundColor: '#4CAF50' },
  optionBulletWrong: { backgroundColor: '#FF5252' },
  optionBulletText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  optionBulletTextActive: { color: '#FFFFFF' },
  optionTextBase: { flex: 1, fontSize: 15, lineHeight: 22 },
  optionTextDefault: { color: '#1A1A1A' },
  optionTextCorrect: { color: '#166534', fontWeight: '600' },
  optionTextWrong: { color: '#991B1B', fontWeight: '600' },
  explanationCard: { borderRadius: 14, padding: 16, marginBottom: 16, borderLeftWidth: 4 },
  explanationCorrect: { backgroundColor: '#F0FDF4', borderLeftColor: '#4CAF50' },
  explanationWrong: { backgroundColor: '#FFF5F5', borderLeftColor: '#FF5252' },
  explanationTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  explanationText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  ratingContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  ratingLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textAlign: 'center', marginBottom: 12 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingButton: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center' },
  ratingButtonLabel: { fontSize: 13, fontWeight: '700' },
  ratingButtonInterval: { fontSize: 11, marginTop: 2, opacity: 0.8 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  emptyButton: { backgroundColor: '#4A90D9', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
