import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../App';
import { XP_ACTIONS } from '../store/useStore';

const MODES = [
  { label: 'Focus',      duration: 25 * 60, color: '#4D8EF0', icon: '🧠', desc: '25 min deep work' },
  { label: 'Short Break', duration: 5 * 60,  color: '#00C47C', icon: '☕', desc: '5 min rest' },
  { label: 'Long Break',  duration: 15 * 60, color: '#C77DFF', icon: '🌿', desc: '15 min recharge' },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const CIRCLE_R = 110;
const CIRCLE_CIRC = 2 * Math.PI * CIRCLE_R;

export default function TimerScreen() {
  const { recordPomodoro, state } = useAppStore();
  const [modeIdx, setModeIdx] = useState(0);
  const mode = MODES[modeIdx];
  const [timeLeft, setTimeLeft] = useState(mode.duration);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const xpPopAnim = useRef(new Animated.Value(0)).current;
  const [showXPPop, setShowXPPop] = useState(false);

  useEffect(() => {
    setTimeLeft(mode.duration);
    setRunning(false);
    progressAnim.setValue(1);
  }, [modeIdx]);

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const next = prev - 1;
          Animated.timing(progressAnim, {
            toValue: next / mode.duration,
            duration: 900,
            useNativeDriver: false,
          }).start();
          if (next <= 0) {
            clearInterval(tickRef.current!);
            setRunning(false);
            handleComplete();
            return 0;
          }
          return next;
        });
      }, 1000);

      // Pulse animation while running
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();

      return () => {
        clearInterval(tickRef.current!);
        pulse.stop();
        pulseAnim.setValue(1);
      };
    }
  }, [running, modeIdx]);

  async function handleComplete() {
    Vibration.vibrate([0, 400, 200, 400]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (modeIdx === 0) {
      // Focus session done
      setCompleted(c => c + 1);
      await recordPomodoro();
      showXP();
    }
  }

  function showXP() {
    setShowXPPop(true);
    xpPopAnim.setValue(0);
    Animated.sequence([
      Animated.timing(xpPopAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(xpPopAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowXPPop(false));
  }

  function toggle() {
    if (timeLeft === 0) {
      setTimeLeft(mode.duration);
      progressAnim.setValue(1);
      return;
    }
    setRunning(r => !r);
  }

  function reset() {
    clearInterval(tickRef.current!);
    setRunning(false);
    setTimeLeft(mode.duration);
    progressAnim.setValue(1);
  }

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_CIRC, 0],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>🍅 Focus Timer</Text>

      {/* Mode selector */}
      <View style={styles.modeRow}>
        {MODES.map((m, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { setModeIdx(i); }}
            style={[styles.modeBtn, modeIdx === i && { backgroundColor: m.color + '22', borderColor: m.color + '66' }]}
          >
            <Text style={styles.modeIcon}>{m.icon}</Text>
            <Text style={[styles.modeLabel, modeIdx === i && { color: m.color }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Circle timer */}
      <View style={styles.circleContainer}>
        <Animated.View style={[styles.circleOuter, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.circleInner, { borderColor: mode.color + '22' }]}>
            {/* SVG-style ring via border trick — just a styled View circle for simplicity */}
            <View style={[styles.ringTrack, { borderColor: '#1E2A3A' }]} />
            <View style={styles.timerContent}>
              <Text style={[styles.timerText, { color: mode.color }]}>{formatTime(timeLeft)}</Text>
              <Text style={styles.timerDesc}>{mode.desc}</Text>
            </View>
          </View>
          {/* Animated arc progress ring */}
          <Animated.View
            style={[
              styles.progressRing,
              {
                borderColor: mode.color,
                transform: [{ rotate: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
              },
            ]}
          />
        </Animated.View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.resetBtn} onPress={reset}>
          <Text style={styles.resetText}>↺</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.playBtn, { backgroundColor: running ? '#FF6B6B' : mode.color }]}
          onPress={toggle}
        >
          <Text style={styles.playBtnText}>{timeLeft === 0 ? '↺ Restart' : running ? '⏸ Pause' : '▶ Start'}</Text>
        </TouchableOpacity>
        <View style={styles.resetBtn} />
      </View>

      {/* Session count */}
      <View style={styles.sessionRow}>
        {Array.from({ length: Math.max(4, completed + 1) }).map((_, i) => (
          <View key={i} style={[styles.sessionDot, i < completed && { backgroundColor: mode.color }]} />
        ))}
        <Text style={styles.sessionText}>{completed} session{completed !== 1 ? 's' : ''} done today</Text>
      </View>

      {/* All-time stats */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{state.pomodoroCount}</Text>
          <Text style={styles.statLbl}>Total 🍅</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{Math.floor(state.pomodoroCount * 25 / 60)}h</Text>
          <Text style={styles.statLbl}>Focus time</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{state.pomodoroCount * XP_ACTIONS.pomodoro_done}</Text>
          <Text style={styles.statLbl}>XP earned</Text>
        </View>
      </View>

      {/* XP pop */}
      {showXPPop && (
        <Animated.View style={[styles.xpPop, { opacity: xpPopAnim, transform: [{ translateY: xpPopAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -10] }) }] }]}>
          <Text style={styles.xpPopText}>+{XP_ACTIONS.pomodoro_done} XP 🎯</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A', alignItems: 'center' },
  title: { color: '#E2E8F0', fontSize: 22, fontWeight: '800', marginTop: 8, marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 30, paddingHorizontal: 16 },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1E2A3A', backgroundColor: '#0F1629' },
  modeIcon: { fontSize: 18, marginBottom: 2 },
  modeLabel: { color: '#718096', fontSize: 10, fontWeight: '700' },
  circleContainer: { marginBottom: 30, alignItems: 'center', justifyContent: 'center' },
  circleOuter: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  circleInner: { width: 240, height: 240, borderRadius: 120, borderWidth: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1629' },
  ringTrack: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 8 },
  progressRing: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 8, borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent' },
  timerContent: { alignItems: 'center' },
  timerText: { fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  timerDesc: { color: '#4A5568', fontSize: 12, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  resetBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0F1629', borderWidth: 1, borderColor: '#1E2A3A', alignItems: 'center', justifyContent: 'center' },
  resetText: { color: '#718096', fontSize: 22 },
  playBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 50 },
  playBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  sessionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1E2A3A', borderWidth: 1, borderColor: '#2D3748' },
  sessionText: { color: '#4A5568', fontSize: 12, marginLeft: 6 },
  statsCard: { flexDirection: 'row', backgroundColor: '#0F1629', borderRadius: 20, borderWidth: 1, borderColor: '#1E2A3A', paddingVertical: 20, paddingHorizontal: 30, gap: 20, alignItems: 'center' },
  statItem: { alignItems: 'center', minWidth: 60 },
  statVal: { color: '#E2E8F0', fontSize: 22, fontWeight: '900' },
  statLbl: { color: '#4A5568', fontSize: 11, marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: '#1E2A3A' },
  xpPop: { position: 'absolute', bottom: 160, backgroundColor: '#4D8EF0', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },
  xpPopText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
