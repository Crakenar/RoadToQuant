import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { ROADMAP } from '../data/roadmap';
import { useAppStore } from '../../App';
import type { WeekStatus } from '../store/useStore';

const { width } = Dimensions.get('window');

const STATUS_CONFIG: Record<WeekStatus, { icon: string; color: string; label: string }> = {
  locked:      { icon: '🔒', color: '#2D3748', label: 'Locked' },
  available:   { icon: '▶',  color: '#4D8EF0', label: 'Start' },
  in_progress: { icon: '⚡',  color: '#FFD93D', label: 'Active' },
  done:        { icon: '✓',  color: '#00C47C', label: 'Done' },
};

function WeekCard({ weekNum, title, status, phaseColor, topics, gcCount, onPress }: {
  weekNum: number; title: string; status: WeekStatus;
  phaseColor: string; topics: string[]; gcCount: number;
  onPress: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const isDone = status === 'done';
  const isLocked = status === 'locked';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      disabled={isLocked}
      style={[
        styles.weekCard,
        isDone && styles.weekCardDone,
        isLocked && styles.weekCardLocked,
      ]}
    >
      <View style={styles.weekLeft}>
        <View style={[styles.weekNumBadge, { borderColor: isLocked ? '#2D3748' : phaseColor + '66' }]}>
          <Text style={[styles.weekNum, { color: isLocked ? '#4A5568' : phaseColor }]}>W{weekNum}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.weekTitle, isLocked && styles.lockedText]} numberOfLines={2}>{title}</Text>
          <View style={styles.topicRow}>
            {topics.slice(0, 2).map((t, i) => (
              <View key={i} style={[styles.topicChip, isLocked && styles.lockedChip]}>
                <Text style={[styles.topicText, isLocked && styles.lockedText]}>{t}</Text>
              </View>
            ))}
            {gcCount > 0 && !isLocked && (
              <View style={styles.gcChip}>
                <Text style={styles.gcText}>🎯 {gcCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '44' }]}>
        <Text style={styles.statusIcon}>{cfg.icon}</Text>
        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function PhaseHeader({ n, title, color, range, weeksTotal, weeksDone }: {
  n: number; title: string; color: string; range: string;
  weeksTotal: number; weeksDone: number;
}) {
  const pct = Math.round((weeksDone / weeksTotal) * 100);
  return (
    <View style={[phStyles.container, { borderLeftColor: color }]}>
      <View style={phStyles.row}>
        <View>
          <Text style={[phStyles.title, { color }]}>{title}</Text>
          <Text style={phStyles.range}>{range}</Text>
        </View>
        <Text style={phStyles.pct}>{pct}%</Text>
      </View>
      <View style={phStyles.track}>
        <View style={[phStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const phStyles = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 20, marginBottom: 12, paddingLeft: 12, borderLeftWidth: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 14, fontWeight: '800' },
  range: { color: '#4A5568', fontSize: 11, marginTop: 2 },
  pct: { color: '#718096', fontSize: 12, fontWeight: '700' },
  track: { height: 4, backgroundColor: '#1E2A3A', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});

export default function RoadmapScreen() {
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { state } = useAppStore();
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);

  const totalDone = Object.values(state.weekStatus).filter(s => s === 'done').length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>🗺️ Roadmap</Text>
        <Text style={styles.subtitle}>{totalDone}/29 weeks done</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {ROADMAP.map(phase => {
          const phaseDone = phase.weeks.filter(w => state.weekStatus[w.w] === 'done').length;
          const isExpanded = expandedPhase === null || expandedPhase === phase.n;

          return (
            <View key={phase.n}>
              <TouchableOpacity onPress={() => setExpandedPhase(isExpanded && expandedPhase !== null ? null : phase.n)}>
                <PhaseHeader
                  n={phase.n}
                  title={phase.title}
                  color={phase.color}
                  range={phase.range}
                  weeksTotal={phase.weeks.length}
                  weeksDone={phaseDone}
                />
              </TouchableOpacity>

              {isExpanded && phase.weeks.map(w => {
                const status = state.weekStatus[w.w] as WeekStatus || 'locked';
                return (
                  <WeekCard
                    key={w.w}
                    weekNum={w.w}
                    title={w.title}
                    status={status}
                    phaseColor={w.phaseColor}
                    topics={w.topics}
                    gcCount={w.gc.length}
                    onPress={() => nav.navigate('Week', { weekNum: w.w })}
                  />
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { color: '#E2E8F0', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#718096', fontSize: 12 },
  weekCard: {
    marginHorizontal: 16, marginBottom: 8, padding: 14,
    backgroundColor: '#0F1629', borderRadius: 14,
    borderWidth: 1, borderColor: '#1E2A3A',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  weekCardDone: { borderColor: '#00C47C22', backgroundColor: '#0A1F17' },
  weekCardLocked: { opacity: 0.45 },
  weekLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  weekNumBadge: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  weekNum: { fontSize: 11, fontWeight: '800' },
  weekTitle: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', lineHeight: 18, flex: 1, paddingRight: 8 },
  lockedText: { color: '#4A5568' },
  topicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  topicChip: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#1E2A3A', borderRadius: 4 },
  lockedChip: { backgroundColor: '#151E2E' },
  topicText: { color: '#718096', fontSize: 10 },
  gcChip: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(155,114,240,0.1)', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(155,114,240,0.25)' },
  gcText: { color: '#9B72F0', fontSize: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  statusIcon: { fontSize: 13 },
  statusText: { fontSize: 10, fontWeight: '700' },
});
