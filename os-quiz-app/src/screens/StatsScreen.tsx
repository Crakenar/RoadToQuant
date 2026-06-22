import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { useStore } from '../store/useStore';
import questionsData from '../data/questions.json';

type StatsNavProp = NativeStackNavigationProp<RootStackParamList>;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function shortDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function StatsScreen() {
  const navigation = useNavigation<StatsNavProp>();
  const { stats, srs, recentWrong, reviewHistory, resetStats } = useStore();

  const questions = questionsData.questions;
  const today = todayStr();

  // ── Today ──────────────────────────────────────────────────────────
  const reviewedToday = reviewHistory[today] ?? 0;

  // Streak: consecutive days with at least 1 review
  const streak = (() => {
    let count = 0;
    let d = new Date();
    while (true) {
      const key = d.toISOString().split('T')[0];
      if ((reviewHistory[key] ?? 0) > 0) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  })();

  // ── Card states ─────────────────────────────────────────────────────
  let newCards = 0, learning = 0, young = 0, mature = 0;
  for (const q of questions) {
    const card = srs[q.id];
    if (!card || card.dueDate === null) {
      newCards++;
    } else if (card.repetitions < 3 || card.interval <= 1) {
      learning++;
    } else if (card.interval < 21) {
      young++;
    } else {
      mature++;
    }
  }

  // ── Due today ───────────────────────────────────────────────────────
  const dueToday = questions.filter((q) => {
    const card = srs[q.id];
    if (!card || card.dueDate === null) return false;
    return card.dueDate <= today;
  }).length;

  // ── 7-day forecast ──────────────────────────────────────────────────
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const date = offsetDate(i);
    const count = questions.filter((q) => {
      const card = srs[q.id];
      if (!card || card.dueDate === null) return false;
      return card.dueDate === date;
    }).length;
    return { date, count, label: i === 0 ? 'Today' : shortDay(date) };
  });
  const maxForecast = Math.max(...forecast.map((f) => f.count), 1);

  // ── Recent mistakes ─────────────────────────────────────────────────
  const recentWrongQuestions = recentWrong
    .slice(0, 15)
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as typeof questions;

  // ── Hardest cards (all-time, >= 1 attempt) ──────────────────────────
  const hardest = questions
    .map((q) => ({ q, s: stats[q.id] }))
    .filter((x) => x.s && x.s.attempts >= 1)
    .map((x) => ({ q: x.q, accuracy: Math.round((x.s!.correct / x.s!.attempts) * 100), attempts: x.s!.attempts }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 8);

  const handleReset = () => {
    Alert.alert('Reset stats', 'All your stats and SRS progress will be deleted. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetStats() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Statistics</Text>

        {/* ── Today row ────────────────────────────────────────────── */}
        <View style={styles.todayRow}>
          <View style={[styles.todayCard, { borderTopColor: '#F59E0B' }]}>
            <Text style={styles.todayEmoji}>🔥</Text>
            <Text style={styles.todayNumber}>{streak}</Text>
            <Text style={styles.todayLabel}>day streak</Text>
          </View>
          <View style={[styles.todayCard, { borderTopColor: '#4A90D9' }]}>
            <Text style={styles.todayEmoji}>✅</Text>
            <Text style={styles.todayNumber}>{reviewedToday}</Text>
            <Text style={styles.todayLabel}>today</Text>
          </View>
          <View style={[styles.todayCard, { borderTopColor: '#D97706' }]}>
            <Text style={styles.todayEmoji}>🗓</Text>
            <Text style={[styles.todayNumber, dueToday > 0 && { color: '#D97706' }]}>{dueToday}</Text>
            <Text style={styles.todayLabel}>due now</Text>
          </View>
          <View style={[styles.todayCard, { borderTopColor: '#059669' }]}>
            <Text style={styles.todayEmoji}>📚</Text>
            <Text style={styles.todayNumber}>{Object.keys(stats).length}</Text>
            <Text style={styles.todayLabel}>seen</Text>
          </View>
        </View>

        {/* ── Card states ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card states</Text>
          <View style={styles.statesRow}>
            <View style={[styles.stateChip, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.stateNum, { color: '#2563EB' }]}>{newCards}</Text>
              <Text style={[styles.stateLabel, { color: '#2563EB' }]}>New</Text>
            </View>
            <View style={[styles.stateChip, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.stateNum, { color: '#D97706' }]}>{learning}</Text>
              <Text style={[styles.stateLabel, { color: '#D97706' }]}>Learning</Text>
            </View>
            <View style={[styles.stateChip, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.stateNum, { color: '#059669' }]}>{young}</Text>
              <Text style={[styles.stateLabel, { color: '#059669' }]}>Young</Text>
            </View>
            <View style={[styles.stateChip, { backgroundColor: '#F5F3FF' }]}>
              <Text style={[styles.stateNum, { color: '#7C3AED' }]}>{mature}</Text>
              <Text style={[styles.stateLabel, { color: '#7C3AED' }]}>Mature</Text>
            </View>
          </View>
        </View>

        {/* ── 7-day forecast ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming reviews</Text>
          <View style={styles.forecastCard}>
            {forecast.map(({ date, count, label }) => (
              <View key={date} style={styles.forecastCol}>
                <Text style={styles.forecastCount}>{count > 0 ? count : ''}</Text>
                <View style={styles.forecastBarTrack}>
                  <View
                    style={[
                      styles.forecastBarFill,
                      {
                        height: `${Math.round((count / maxForecast) * 100)}%`,
                        backgroundColor: date === today ? '#4A90D9' : '#CBD5E1',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.forecastDay, date === today && { color: '#4A90D9', fontWeight: '700' }]}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Recent mistakes ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❌ Recent mistakes</Text>
          {recentWrongQuestions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No mistakes recorded yet — keep it up!</Text>
            </View>
          ) : (
            recentWrongQuestions.map((q) => {
              const acc = stats[q.id]
                ? Math.round((stats[q.id].correct / stats[q.id].attempts) * 100)
                : 0;
              return (
                <View key={q.id} style={styles.mistakeCard}>
                  <View style={styles.mistakeTop}>
                    <Text style={styles.mistakeQ} numberOfLines={2}>{q.question}</Text>
                    <View style={[styles.accBadge, { backgroundColor: acc >= 60 ? '#FEF3C7' : '#FEE2E2' }]}>
                      <Text style={[styles.accText, { color: acc >= 60 ? '#92400E' : '#991B1B' }]}>{acc}%</Text>
                    </View>
                  </View>
                  <View style={styles.correctAnswerRow}>
                    <Text style={styles.correctLabel}>Correct: </Text>
                    <Text style={styles.correctAnswer} numberOfLines={2}>{q.options[q.correct]}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Hardest cards ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📉 Hardest cards</Text>
          {hardest.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Answer questions to see your weak spots.</Text>
            </View>
          ) : (
            <>
              {hardest.map(({ q, accuracy, attempts }) => (
                <View key={q.id} style={styles.hardCard}>
                  <View style={styles.hardCardHeader}>
                    <Text style={styles.hardCardQ} numberOfLines={2}>{q.question}</Text>
                    <View style={[styles.accBadge, {
                      backgroundColor: accuracy >= 60 ? '#FFFBEB' : accuracy >= 30 ? '#FEF3C7' : '#FEE2E2',
                    }]}>
                      <Text style={[styles.accText, {
                        color: accuracy >= 60 ? '#92400E' : accuracy >= 30 ? '#B45309' : '#991B1B',
                      }]}>{accuracy}%</Text>
                    </View>
                  </View>
                  <Text style={styles.hardCardMeta}>{attempts} attempt{attempts !== 1 ? 's' : ''}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => navigation.navigate('Quiz', { categoryId: 'all', categoryName: 'Hard questions', mode: 'quiz' as const })}
                activeOpacity={0.85}
              >
                <Text style={styles.reviewButtonText}>Review these questions</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Reset ────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.85}>
          <Text style={styles.resetButtonText}>🗑️ Reset all stats</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EE' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', paddingTop: 20, paddingBottom: 16, letterSpacing: -0.5 },

  // Today row
  todayRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  todayCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  todayEmoji: { fontSize: 20, marginBottom: 4 },
  todayNumber: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  todayLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },

  // Card states
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  statesRow: { flexDirection: 'row', gap: 10 },
  stateChip: {
    flex: 1, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center',
  },
  stateNum: { fontSize: 20, fontWeight: '800' },
  stateLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Forecast
  forecastCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 130,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  forecastCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  forecastCount: { fontSize: 10, fontWeight: '700', color: '#6B7280', marginBottom: 2 },
  forecastBarTrack: {
    width: 18, height: 60, backgroundColor: '#F3F4F6', borderRadius: 4,
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  forecastBarFill: { width: '100%', borderRadius: 4, minHeight: 2 },
  forecastDay: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  // Recent mistakes
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, alignItems: 'center' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  mistakeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#EF4444',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  mistakeTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  mistakeQ: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1A1A1A', lineHeight: 18 },
  correctAnswerRow: { flexDirection: 'row', flexWrap: 'wrap' },
  correctLabel: { fontSize: 12, color: '#9CA3AF' },
  correctAnswer: { fontSize: 12, fontWeight: '700', color: '#059669', flex: 1 },

  // Hardest cards
  hardCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  hardCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  hardCardQ: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1A1A1A', lineHeight: 18 },
  hardCardMeta: { fontSize: 11, color: '#9CA3AF' },
  accBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexShrink: 0 },
  accText: { fontSize: 12, fontWeight: '700' },
  reviewButton: {
    backgroundColor: '#4A90D9', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  reviewButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Reset
  resetButton: {
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 2, borderColor: '#FEE2E2',
  },
  resetButtonText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});
