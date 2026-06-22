import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { useStore } from '../store/useStore';
import questionsData from '../data/questions.json';
import notesContent from '../data/notesContent';

type SubjectRouteProp = RouteProp<RootStackParamList, 'Subject'>;
type SubjectNavProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function SubjectScreen() {
  const navigation = useNavigation<SubjectNavProp>();
  const route = useRoute<SubjectRouteProp>();
  const { subjectId, subjectName, subjectColor } = route.params;
  const { stats, getDueIds } = useStore();

  const subject = questionsData.subjects.find((s) => s.id === subjectId)!;
  const categories = questionsData.categories.filter((c) =>
    subject.categoryIds.includes(c.id)
  );
  const questions = questionsData.questions;
  const subjectQuestions = questions.filter((q) => subject.categoryIds.includes(q.category));

  const hasNotes = !!(notesContent as Record<string, string>)[subjectId];
  const dueCount = getDueIds(subjectQuestions.map((q) => q.id)).length;

  const getCategoryStats = (categoryId: string) => {
    const catQuestions = questions.filter((q) => q.category === categoryId);
    const attempted = catQuestions.filter((q) => stats[q.id]?.attempts > 0).length;
    const correct = catQuestions.reduce((sum, q) => sum + (stats[q.id]?.correct ?? 0), 0);
    const totalAtt = catQuestions.reduce((sum, q) => sum + (stats[q.id]?.attempts ?? 0), 0);
    const accuracy = totalAtt > 0 ? Math.round((correct / totalAtt) * 100) : null;
    return { total: catQuestions.length, attempted, accuracy };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F3EE" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { color: subjectColor }]}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{subjectName}</Text>
            {hasNotes && (
              <TouchableOpacity
                style={[styles.notesButton, { backgroundColor: subjectColor + '18', borderColor: subjectColor + '40' }]}
                onPress={() => navigation.navigate('Notes', { subjectId, subjectName, subjectColor })}
                activeOpacity={0.75}
              >
                <Text style={[styles.notesButtonText, { color: subjectColor }]}>📖 Notes</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.subtitle}>{subjectQuestions.length} questions</Text>
        </View>

        <TouchableOpacity
          style={[styles.reviewCard, { borderColor: dueCount > 0 ? '#D97706' : '#D1FAE5' }]}
          onPress={() =>
            navigation.navigate('Quiz', {
              categoryId: `subject:${subjectId}`,
              categoryName: `${subjectName} — review`,
              mode: 'review',
            })
          }
          activeOpacity={0.85}
        >
          <View style={styles.reviewCardLeft}>
            <Text style={styles.reviewCardIcon}>{dueCount > 0 ? '🗓' : '✅'}</Text>
            <View>
              <Text style={styles.reviewCardTitle}>
                {dueCount > 0 ? `${dueCount} card${dueCount > 1 ? 's' : ''} due` : 'All caught up'}
              </Text>
              <Text style={styles.reviewCardSub}>
                {dueCount > 0 ? 'Spaced repetition · SM-2' : 'No reviews pending'}
              </Text>
            </View>
          </View>
          <View style={[styles.reviewCardBtn, { backgroundColor: dueCount > 0 ? '#D97706' : '#059669' }]}>
            <Text style={styles.reviewCardBtnText}>{dueCount > 0 ? 'Review →' : 'Browse →'}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.grid}>
          {categories.map((cat) => {
            const catStats = getCategoryStats(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, { borderTopColor: cat.color, borderTopWidth: 4 }]}
                onPress={() =>
                  navigation.navigate('Quiz', {
                    categoryId: cat.id,
                    categoryName: cat.name,
                    mode: 'quiz',
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryProgress}>{catStats.attempted}/{catStats.total}</Text>
                {catStats.accuracy !== null && (
                  <View style={[styles.accuracyBadge, { backgroundColor: cat.color + '20' }]}>
                    <Text style={[styles.accuracyText, { color: cat.color }]}>{catStats.accuracy}%</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.allButton, { backgroundColor: subjectColor }]}
          onPress={() =>
            navigation.navigate('Quiz', {
              categoryId: `subject:${subjectId}`,
              categoryName: `${subjectName} — practice all`,
              mode: 'quiz',
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.allButtonText}>🎯 Practice all — {subjectQuestions.length} questions</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EE' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingTop: 12, paddingBottom: 16 },
  backButton: { paddingVertical: 4, marginBottom: 8 },
  backText: { fontSize: 14, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  notesButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  notesButtonText: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  reviewCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  reviewCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  reviewCardIcon: { fontSize: 24 },
  reviewCardTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  reviewCardSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  reviewCardBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  reviewCardBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  categoryCard: {
    width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  categoryIcon: { fontSize: 28, marginBottom: 8 },
  categoryName: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  categoryProgress: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  accuracyBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  accuracyText: { fontSize: 12, fontWeight: '700' },
  allButton: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  allButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
