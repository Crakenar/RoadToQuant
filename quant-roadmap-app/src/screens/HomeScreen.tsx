import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../App';
import { ALL_WEEKS } from '../data/roadmap';
import { XP_PER_LEVEL } from '../store/useStore';
import type { RootStackParamList } from '../../App';
import type { StackNavigationProp } from '@react-navigation/stack';

const { width } = Dimensions.get('window');

function XPBar({ xp, level }: { xp: number; level: number }) {
  const progress = xp / XP_PER_LEVEL;
  const animW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animW, { toValue: progress, useNativeDriver: false, tension: 60 }).start();
  }, [progress]);

  const barWidth = animW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={xpStyles.container}>
      <View style={xpStyles.row}>
        <Text style={xpStyles.label}>LVL {level}</Text>
        <Text style={xpStyles.xpText}>{xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</Text>
      </View>
      <View style={xpStyles.track}>
        <Animated.View style={[xpStyles.fill, { width: barWidth }]} />
      </View>
    </View>
  );
}

const xpStyles = StyleSheet.create({
  container: { marginHorizontal: 20, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { color: '#4D8EF0', fontWeight: '800', fontSize: 13 },
  xpText: { color: '#718096', fontSize: 12 },
  track: { height: 8, backgroundColor: '#1E2A3A', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#4D8EF0', borderRadius: 4 },
});

function ConfettiOverlay({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const particles = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * width),
      y: new Animated.Value(-20),
      color: ['#4D8EF0', '#00C47C', '#FFD93D', '#FF6B6B', '#C77DFF'][i % 5],
      size: Math.random() * 8 + 4,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;
    const anims = particles.map(p => {
      p.y.setValue(-20);
      p.x.setValue(Math.random() * width);
      return Animated.timing(p.y, {
        toValue: 800,
        duration: 1200 + Math.random() * 600,
        useNativeDriver: false,
      });
    });
    Animated.stagger(20, anims).start(() => onDone());
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => (
        <Animated.View
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
          }}
        />
      ))}
    </View>
  );
}

function DailyNonNeg() {
  const quests = [
    { icon: '🎮', text: 'Optigames — 15 min mental warm-up', link: 'https://getcracked.io/games' },
    { icon: '📊', text: '3 probability puzzles', link: 'https://getcracked.io/questions' },
    { icon: '💻', text: 'Push at least 1 commit', link: null },
    { icon: '📖', text: 'Read 10 pages of quant material', link: null },
  ];
  return (
    <View style={dnStyles.card}>
      <Text style={dnStyles.title}>📋 Daily Non-Negotiables</Text>
      {quests.map((q, i) => (
        <TouchableOpacity
          key={i}
          style={dnStyles.row}
          onPress={() => q.link && Linking.openURL(q.link)}
        >
          <Text style={dnStyles.icon}>{q.icon}</Text>
          <Text style={[dnStyles.text, q.link && { color: '#4D8EF0' }]}>{q.text}</Text>
          {q.link && <Text style={dnStyles.arrow}>→</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const dnStyles = StyleSheet.create({
  card: { margin: 16, padding: 16, backgroundColor: '#0F1629', borderRadius: 16, borderWidth: 1, borderColor: '#1E2A3A' },
  title: { color: '#E2E8F0', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1A2332' },
  icon: { fontSize: 18, marginRight: 10 },
  text: { flex: 1, color: '#A0AEC0', fontSize: 13, lineHeight: 18 },
  arrow: { color: '#4D8EF0', fontSize: 16 },
});

export default function HomeScreen() {
  const store = useAppStore();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [showConfetti, setShowConfetti] = useState(false);
  const { state, weeksDone, xpInLevel } = store;

  // Find current week (first available or in_progress)
  const currentWeek = ALL_WEEKS.find(w => {
    const s = state.weekStatus[w.w];
    return s === 'in_progress' || s === 'available';
  });

  const progressPct = Math.round((weeksDone.length / 29) * 100);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>{greet()}, Teo 👋</Text>
            <Text style={styles.sub}>QuantPath · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakNum}>{state.streak}</Text>
            <Text style={styles.streakLabel}>days</Text>
          </View>
        </View>

        {/* XP Bar */}
        <XPBar xp={xpInLevel} level={state.level} />

        {/* Overall Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressSub}>{weeksDone.length} / 29 weeks completed</Text>
        </View>

        {/* Current week card */}
        {currentWeek && (
          <TouchableOpacity
            style={styles.currentCard}
            onPress={() => nav.navigate('Week', { weekNum: currentWeek.w })}
            activeOpacity={0.85}
          >
            <View style={styles.currentHeader}>
              <Text style={styles.currentBadge}>
                {state.weekStatus[currentWeek.w] === 'in_progress' ? '⚡ IN PROGRESS' : '▶ NEXT UP'}
              </Text>
              <Text style={styles.currentWeekNum}>W{currentWeek.w}</Text>
            </View>
            <Text style={styles.currentTitle}>{currentWeek.title}</Text>
            <View style={styles.topicRow}>
              {currentWeek.topics.slice(0, 3).map((t, i) => (
                <View key={i} style={styles.topicChip}>
                  <Text style={styles.topicText}>{t}</Text>
                </View>
              ))}
            </View>
            <View style={styles.tapHint}>
              <Text style={styles.tapText}>Tap to open →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Daily non-negotiables */}
        <DailyNonNeg />

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'XP Total', value: state.xp, icon: '💫' },
            { label: 'Pomodoros', value: state.pomodoroCount, icon: '🍅' },
            { label: 'Streak', value: `${state.streak}d`, icon: '🔥' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Recent achievements */}
        {state.achievements.length > 0 && (
          <View style={styles.achievCard}>
            <Text style={styles.achievTitle}>🏆 Recent Achievements</Text>
            {state.achievements.slice(-3).reverse().map((a, i) => (
              <View key={i} style={styles.achievRow}>
                <Text style={styles.achievIcon}>{a.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.achievName}>{a.title}</Text>
                  <Text style={styles.achievDesc}>{a.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
      <ConfettiOverlay visible={showConfetti} onDone={() => setShowConfetti(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  greet: { color: '#E2E8F0', fontSize: 22, fontWeight: '800' },
  sub: { color: '#718096', fontSize: 12, marginTop: 2 },
  streakBadge: { alignItems: 'center', backgroundColor: '#1A1F35', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#FF6B4A44' },
  streakFire: { fontSize: 20 },
  streakNum: { color: '#FF6B4A', fontSize: 22, fontWeight: '900' },
  streakLabel: { color: '#718096', fontSize: 10 },
  progressCard: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: '#0F1629', borderRadius: 16, borderWidth: 1, borderColor: '#1E2A3A' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { color: '#A0AEC0', fontSize: 13, fontWeight: '600' },
  progressPct: { color: '#4D8EF0', fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 10, backgroundColor: '#1E2A3A', borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#00C47C', borderRadius: 5 },
  progressSub: { color: '#4A5568', fontSize: 11 },
  currentCard: { margin: 16, padding: 16, backgroundColor: '#0F1629', borderRadius: 16, borderWidth: 1, borderColor: '#4D8EF044' },
  currentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  currentBadge: { color: '#4D8EF0', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  currentWeekNum: { color: '#4A5568', fontSize: 11, fontWeight: '700' },
  currentTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 10 },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  topicChip: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#1E2A3A', borderRadius: 6 },
  topicText: { color: '#718096', fontSize: 11 },
  tapHint: { alignItems: 'flex-end' },
  tapText: { color: '#4D8EF0', fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#0F1629', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E2A3A' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: '#E2E8F0', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#4A5568', fontSize: 10, marginTop: 2 },
  achievCard: { margin: 16, padding: 16, backgroundColor: '#0F1629', borderRadius: 16, borderWidth: 1, borderColor: '#1E2A3A' },
  achievTitle: { color: '#E2E8F0', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  achievRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  achievIcon: { fontSize: 24, marginRight: 12 },
  achievName: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  achievDesc: { color: '#718096', fontSize: 11, marginTop: 2 },
});
