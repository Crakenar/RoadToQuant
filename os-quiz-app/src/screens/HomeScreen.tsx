import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { useStore } from '../store/useStore';
import questionsData from '../data/questions.json';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { stats, getDueIds } = useStore();

  const subjects = questionsData.subjects;
  const questions = questionsData.questions;
  const categories = questionsData.categories;

  const totalQuestions = questions.length;
  const totalDue = getDueIds(questions.map((q) => q.id)).length;
  const totalAttempted = Object.values(stats).filter((s) => s.attempts > 0).length;
  const totalCorrect = Object.values(stats).reduce((sum, s) => sum + s.correct, 0);
  const totalAnswered = Object.values(stats).reduce((sum, s) => sum + s.attempts, 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const getSubjectStats = (categoryIds: string[]) => {
    const subjectQs = questions.filter((q) => categoryIds.includes(q.category));
    const attempted = subjectQs.filter((q) => stats[q.id]?.attempts > 0).length;
    const correct = subjectQs.reduce((sum, q) => sum + (stats[q.id]?.correct ?? 0), 0);
    const totalAtt = subjectQs.reduce((sum, q) => sum + (stats[q.id]?.attempts ?? 0), 0);
    const accuracy = totalAtt > 0 ? Math.round((correct / totalAtt) * 100) : null;
    return { total: subjectQs.length, attempted, accuracy };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F3EE" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>DevDrill</Text>
          <Text style={styles.subtitle}>{'Review and test your knowledge'}</Text>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{totalAttempted}</Text>
              <Text style={styles.progressLabel}>Vues</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{totalQuestions}</Text>
              <Text style={styles.progressLabel}>Total</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressItem}>
              <Text style={[styles.progressNumber, { color: '#4CAF50' }]}>{overallAccuracy}%</Text>
              <Text style={styles.progressLabel}>{'Accuracy'}</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${totalQuestions > 0 ? (totalAttempted / totalQuestions) * 100 : 0}%` },
              ]}
            />
          </View>
          <Text style={styles.progressBarLabel}>
            {totalAttempted}/{totalQuestions} questions {'attempted'}
          </Text>
          {totalDue > 0 && (
            <View style={styles.dueBanner}>
              <Text style={styles.dueBannerText}>
                {'🗓'} {totalDue} {'card'}{totalDue > 1 ? 's' : ''} {' due'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{'Subjects'}</Text>
        {subjects.map((subject) => {
          const subjectStats = getSubjectStats(subject.categoryIds);
          const subjectCats = categories.filter((c) => subject.categoryIds.includes(c.id));
          return (
            <TouchableOpacity
              key={subject.id}
              style={[styles.subjectCard, { borderLeftColor: subject.color, borderLeftWidth: 5 }]}
              onPress={() =>
                navigation.navigate('Subject', {
                  subjectId: subject.id,
                  subjectName: subject.name,
                  subjectColor: subject.color,
                })
              }
              activeOpacity={0.85}
            >
              <View style={styles.subjectTop}>
                <View style={[styles.subjectIconBg, { backgroundColor: subject.color + '20' }]}>
                  <Text style={styles.subjectIcon}>{subject.icon}</Text>
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectDesc}>{subject.description}</Text>
                </View>
                {subjectStats.accuracy !== null && (
                  <View style={[styles.accBadge, { backgroundColor: subject.color + '15' }]}>
                    <Text style={[styles.accText, { color: subject.color }]}>
                      {subjectStats.accuracy}%
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.catPills}>
                {subjectCats.map((c) => (
                  <View key={c.id} style={[styles.pill, { backgroundColor: c.color + '18' }]}>
                    <Text style={[styles.pillText, { color: c.color }]}>
                      {c.icon} {c.name}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.subjectFooter}>
                <Text style={styles.subjectProg}>
                  {subjectStats.attempted}/{subjectStats.total} {'questions attempted'}
                </Text>
                <Text style={[styles.subjectArrow, { color: subject.color }]}>{'→'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EE' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  progressCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  progressItem: { alignItems: 'center', flex: 1 },
  progressDivider: { width: 1, backgroundColor: '#E5E7EB' },
  progressNumber: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  progressLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  progressBarContainer: {
    height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#4A90D9', borderRadius: 4 },
  progressBarLabel: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  dueBanner: {
    marginTop: 10, backgroundColor: '#FEF3C7', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'center',
  },
  dueBannerText: { fontSize: 13, fontWeight: '700', color: '#D97706' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  subjectCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  subjectTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  subjectIconBg: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  subjectIcon: { fontSize: 24 },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  subjectDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  accBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  accText: { fontSize: 14, fontWeight: '700' },
  catPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '600' },
  subjectFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10,
  },
  subjectProg: { fontSize: 12, color: '#9CA3AF' },
  subjectArrow: { fontSize: 18, fontWeight: '700' },
});
