import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import type { RootStackParamList } from '../../App';
import { ALL_WEEKS } from '../data/roadmap';
import { useAppStore } from '../../App';
import { XP_ACTIONS } from '../store/useStore';
import type { WeekStatus } from '../store/useStore';

type WeekRouteProp = RouteProp<RootStackParamList, 'Week'>;

function ConfettiOverlay({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const particles = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * 380),
      y: new Animated.Value(-30),
      rot: new Animated.Value(0),
      color: ['#4D8EF0', '#00C47C', '#FFD93D', '#FF6B6B', '#C77DFF', '#FF9A3C'][i % 6],
      size: Math.random() * 9 + 5,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;
    const anims = particles.map(p => {
      p.y.setValue(-30);
      p.x.setValue(50 + Math.random() * 280);
      p.rot.setValue(0);
      return Animated.parallel([
        Animated.timing(p.y, { toValue: 900, duration: 1400 + Math.random() * 700, useNativeDriver: true }),
        Animated.timing(p.rot, { toValue: 720 + Math.random() * 360, duration: 1500, useNativeDriver: true }),
      ]);
    });
    Animated.stagger(15, anims).start(() => onDone());
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
            height: p.size * 0.6,
            borderRadius: 2,
            backgroundColor: p.color,
            transform: [{ rotate: p.rot.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] }) }],
          }}
        />
      ))}
    </View>
  );
}

export default function WeekScreen() {
  const nav = useNavigation();
  const route = useRoute<WeekRouteProp>();
  const { weekNum } = route.params;
  const store = useAppStore();
  const { state, setWeekStatus, addXP } = store;

  const week = ALL_WEEKS.find(w => w.w === weekNum);
  const [confetti, setConfetti] = useState(false);

  if (!week) return null;

  const status: WeekStatus = state.weekStatus[weekNum] || 'locked';

  async function handleStart() {
    await setWeekStatus(weekNum, 'in_progress');
    await addXP(XP_ACTIONS.week_start);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleComplete() {
    Alert.alert(
      '🏆 Complete W' + weekNum + '?',
      'Mark this week as done and earn 100 XP?',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: '✅ Mark Done!',
          onPress: async () => {
            await setWeekStatus(weekNum, 'done');
            await addXP(XP_ACTIONS.week_done);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setConfetti(true);
          },
        },
      ]
    );
  }

  const statusColor = {
    locked: '#4A5568',
    available: '#4D8EF0',
    in_progress: '#FFD93D',
    done: '#00C47C',
  }[status];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Nav bar */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={[styles.statusPill, { borderColor: statusColor + '55', backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        {/* Week header */}
        <View style={styles.header}>
          <View style={[styles.weekBadge, { borderColor: week.phaseColor + '88' }]}>
            <Text style={[styles.weekBadgeText, { color: week.phaseColor }]}>WEEK {week.w}</Text>
          </View>
          <Text style={styles.weekTitle}>{week.title}</Text>
        </View>

        {/* Topics */}
        {week.topics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📚 Topics</Text>
            <View style={styles.chipRow}>
              {week.topics.map((t, i) => (
                <View key={i} style={styles.topicChip}>
                  <Text style={styles.topicText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Project */}
        {week.project && (
          <View style={styles.projectCard}>
            <Text style={styles.projectLabel}>🚀 Week Project</Text>
            <Text style={styles.projectName}>{week.project}</Text>
          </View>
        )}

        {/* Goals */}
        {week.goals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🎯 Goals</Text>
            {week.goals.map((g, i) => (
              <View key={i} style={styles.goalRow}>
                <Text style={styles.goalBullet}>◆</Text>
                <Text style={styles.goalText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* getcracked.io practice */}
        {week.gc.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🎯 getcracked.io Practice</Text>
            <View style={styles.gcRow}>
              {week.gc.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.gcTag, q.t === 'q' ? styles.gcTagQ : styles.gcTagP]}
                  onPress={() => Linking.openURL('https://getcracked.io' + q.u)}
                >
                  <Text style={[styles.gcTagText, q.t === 'q' ? styles.gcTextQ : styles.gcTextP]}>{q.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Resources */}
        {week.resources.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📎 Resources</Text>
            {week.resources.map((r, i) => {
              const urlMatch = r.match(/https?:\/\/[^\s]+/);
              const cleanText = r.replace('🌐 ', '').replace(/https?:\/\/[^\s]+/, '').trim().replace(/—$/, '').trim();
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.resourceRow}
                  onPress={() => urlMatch && Linking.openURL(urlMatch[0])}
                  disabled={!urlMatch}
                >
                  <Text style={styles.resourceIcon}>{r.startsWith('🌐') ? '🌐' : '📄'}</Text>
                  <Text style={[styles.resourceText, urlMatch && styles.resourceLink]} numberOfLines={2}>
                    {cleanText || r}
                  </Text>
                  {urlMatch && <Text style={styles.extLink}>↗</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionArea}>
          {status === 'available' && (
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Text style={styles.startBtnText}>⚡ Start Week (+{XP_ACTIONS.week_start} XP)</Text>
            </TouchableOpacity>
          )}
          {status === 'in_progress' && (
            <TouchableOpacity style={styles.doneBtn} onPress={handleComplete}>
              <Text style={styles.doneBtnText}>✅ Mark Week Complete (+{XP_ACTIONS.week_done} XP)</Text>
            </TouchableOpacity>
          )}
          {status === 'done' && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedText}>🏆 Week Complete!</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfettiOverlay visible={confetti} onDone={() => setConfetti(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { color: '#4D8EF0', fontSize: 15, fontWeight: '600' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  weekBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, marginBottom: 10 },
  weekBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  weekTitle: { color: '#E2E8F0', fontSize: 20, fontWeight: '800', lineHeight: 28 },
  section: { marginHorizontal: 16, marginBottom: 20, padding: 16, backgroundColor: '#0F1629', borderRadius: 16, borderWidth: 1, borderColor: '#1E2A3A' },
  sectionLabel: { color: '#A0AEC0', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicChip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#1A2535', borderRadius: 8, borderWidth: 1, borderColor: '#2D3748' },
  topicText: { color: '#A0AEC0', fontSize: 12 },
  projectCard: { marginHorizontal: 16, marginBottom: 20, padding: 16, backgroundColor: '#0F1A2E', borderRadius: 16, borderWidth: 1, borderColor: '#4D8EF033' },
  projectLabel: { color: '#4D8EF0', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, textTransform: 'uppercase' },
  projectName: { color: '#E2E8F0', fontSize: 15, fontWeight: '700', lineHeight: 22 },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  goalBullet: { color: '#4D8EF0', fontSize: 8, marginRight: 8, marginTop: 5 },
  goalText: { flex: 1, color: '#CBD5E0', fontSize: 13, lineHeight: 19 },
  gcRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gcTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  gcTagQ: { backgroundColor: 'rgba(155,114,240,0.1)', borderColor: 'rgba(155,114,240,0.3)' },
  gcTagP: { backgroundColor: 'rgba(0,196,124,0.1)', borderColor: 'rgba(0,196,124,0.3)' },
  gcTagText: { fontSize: 12, fontWeight: '600' },
  gcTextQ: { color: '#9B72F0' },
  gcTextP: { color: '#00C47C' },
  resourceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1A2332' },
  resourceIcon: { fontSize: 16, marginRight: 10 },
  resourceText: { flex: 1, color: '#718096', fontSize: 13, lineHeight: 18 },
  resourceLink: { color: '#4D8EF0' },
  extLink: { color: '#4A5568', fontSize: 14, marginLeft: 6 },
  actionArea: { marginHorizontal: 16, marginTop: 4 },
  startBtn: { backgroundColor: '#4D8EF0', borderRadius: 16, padding: 18, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  doneBtn: { backgroundColor: '#00C47C', borderRadius: 16, padding: 18, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  completedBanner: { backgroundColor: 'rgba(0,196,124,0.12)', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,196,124,0.3)' },
  completedText: { color: '#00C47C', fontSize: 16, fontWeight: '800' },
});
