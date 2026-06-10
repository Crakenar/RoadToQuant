import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../App';
import { ACHIEVEMENTS, XP_PER_LEVEL } from '../store/useStore';
import { ALL_WEEKS } from '../data/roadmap';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PHASE_COLORS = ['#4D8EF0', '#00C47C', '#FFD93D', '#FF9A3C', '#C77DFF'];

function LevelBadge({ level, xp }: { level: number; xp: number }) {
  const pct = (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  return (
    <View style={lvlStyles.container}>
      <View style={lvlStyles.circle}>
        <Text style={lvlStyles.num}>{level}</Text>
        <Text style={lvlStyles.label}>LVL</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={lvlStyles.xpText}>{xp} XP total</Text>
        <View style={lvlStyles.track}>
          <View style={[lvlStyles.fill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={lvlStyles.nextText}>{XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP to next level</Text>
      </View>
    </View>
  );
}

const lvlStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, backgroundColor: '#0F1629', borderRadius: 20, margin: 16, borderWidth: 1, borderColor: '#4D8EF033' },
  circle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#4D8EF015', borderWidth: 2, borderColor: '#4D8EF0', alignItems: 'center', justifyContent: 'center' },
  num: { color: '#4D8EF0', fontSize: 26, fontWeight: '900' },
  label: { color: '#4D8EF066', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  xpText: { color: '#E2E8F0', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  track: { height: 6, backgroundColor: '#1E2A3A', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  fill: { height: '100%', backgroundColor: '#4D8EF0', borderRadius: 3 },
  nextText: { color: '#4A5568', fontSize: 11 },
});

export default function StatsScreen() {
  const { state, weeksDone } = useAppStore();

  // Phase completion
  const phaseStats = [
    { label: 'Phase 1', total: 17, done: weeksDone.filter(w => w <= 17).length },
    { label: 'Phase 2', total: 6, done: weeksDone.filter(w => w >= 18 && w <= 23).length },
    { label: 'Phase 3', total: 3, done: weeksDone.filter(w => w >= 24 && w <= 26).length },
    { label: 'Phase 4', total: 1, done: weeksDone.filter(w => w === 27).length },
    { label: 'Phase 5', total: 2, done: weeksDone.filter(w => w >= 28 && w <= 29).length },
  ];

  async function resetProgress() {
    Alert.alert(
      '⚠️ Reset Progress',
      'This will erase ALL progress, XP, streaks, and achievements. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@quant_state_v2');
            Alert.alert('Done', 'App will reset on next launch.');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>⭐ Stats & Achievements</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Level */}
        <LevelBadge level={state.level} xp={state.xp} />

        {/* Key stats */}
        <View style={styles.statsGrid}>
          {[
            { icon: '🔥', val: state.streak, label: 'Day Streak' },
            { icon: '🍅', val: state.pomodoroCount, label: 'Pomodoros' },
            { icon: '✅', val: weeksDone.length, label: 'Weeks Done' },
            { icon: '⏱️', val: `${Math.round(state.pomodoroCount * 25 / 60)}h`, label: 'Focus Time' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Phase progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Phase Progress</Text>
          {phaseStats.map((p, i) => {
            const pct = Math.round((p.done / p.total) * 100);
            return (
              <View key={i} style={styles.phaseRow}>
                <Text style={[styles.phaseLabel, { color: PHASE_COLORS[i] }]}>{p.label}</Text>
                <View style={styles.phaseTrack}>
                  <View style={[styles.phaseFill, { width: `${pct}%`, backgroundColor: PHASE_COLORS[i] }]} />
                </View>
                <Text style={styles.phasePct}>{p.done}/{p.total}</Text>
              </View>
            );
          })}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Achievements</Text>
          <View style={styles.achievGrid}>
            {ACHIEVEMENTS.map(a => {
              const unlocked = state.achievements.find(x => x.id === a.id);
              return (
                <View key={a.id} style={[styles.achievCard, unlocked && styles.achievUnlocked]}>
                  <Text style={[styles.achievIcon, !unlocked && { opacity: 0.25 }]}>{a.icon}</Text>
                  <Text style={[styles.achievName, !unlocked && styles.lockedText]}>{a.title}</Text>
                  <Text style={[styles.achievDesc, !unlocked && styles.lockedText]}>{a.desc}</Text>
                  {unlocked && <Text style={styles.achievDate}>✓ Unlocked</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {/* Reset */}
        <TouchableOpacity style={styles.resetBtn} onPress={resetProgress}>
          <Text style={styles.resetText}>🗑️ Reset All Progress</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  title: { color: '#E2E8F0', fontSize: 22, fontWeight: '800', paddingHorizontal: 20, paddingVertical: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 16 },
  statCard: { width: '47%', backgroundColor: '#0F1629', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1E2A3A' },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statVal: { color: '#E2E8F0', fontSize: 22, fontWeight: '900' },
  statLbl: { color: '#4A5568', fontSize: 11, marginTop: 2 },
  section: { marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: '#0F1629', borderRadius: 16, borderWidth: 1, borderColor: '#1E2A3A' },
  sectionTitle: { color: '#E2E8F0', fontWeight: '700', fontSize: 15, marginBottom: 14 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  phaseLabel: { width: 64, fontSize: 12, fontWeight: '700' },
  phaseTrack: { flex: 1, height: 6, backgroundColor: '#1E2A3A', borderRadius: 3, overflow: 'hidden', marginHorizontal: 10 },
  phaseFill: { height: '100%', borderRadius: 3 },
  phasePct: { width: 36, color: '#718096', fontSize: 11, textAlign: 'right' },
  achievGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievCard: { width: '47%', backgroundColor: '#0A0E1A', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E2A3A' },
  achievUnlocked: { borderColor: '#4D8EF044', backgroundColor: '#0F1629' },
  achievIcon: { fontSize: 26, marginBottom: 4 },
  achievName: { color: '#E2E8F0', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  achievDesc: { color: '#718096', fontSize: 10, textAlign: 'center' },
  achievDate: { color: '#4D8EF0', fontSize: 9, marginTop: 4, fontWeight: '700' },
  lockedText: { color: '#2D3748' },
  resetBtn: { marginHorizontal: 16, padding: 16, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#FF6B6B33', backgroundColor: '#FF6B6B11' },
  resetText: { color: '#FF6B6B', fontSize: 14, fontWeight: '600' },
});
