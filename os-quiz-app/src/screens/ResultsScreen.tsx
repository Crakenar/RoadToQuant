import React from 'react';
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
import { RootStackParamList } from '../types';
import questionsData from '../data/questions.json';

type ResultsRouteProp = RouteProp<RootStackParamList, 'Results'>;
type ResultsNavProp = NativeStackNavigationProp<RootStackParamList>;

function getScoreEmoji(pct: number): string {
  if (pct === 100) return '\u{1F3C6}';
  if (pct >= 80) return '\u{1F389}';
  if (pct >= 60) return '\u{1F44D}';
  if (pct >= 40) return '\u{1F4DA}';
  return '\u{1F4AA}';
}

export default function ResultsScreen() {
  const navigation = useNavigation<ResultsNavProp>();
  const route = useRoute<ResultsRouteProp>();
  const { score, total, wrongIds, categoryId, mode } = route.params;

  const percentage = Math.round((score / total) * 100);
  const emoji = getScoreEmoji(percentage);

  const wrongQuestions = questionsData.questions.filter((q) => wrongIds.includes(q.id));

  const handleRetry = () => {
    const categoryName =
      categoryId === 'all'
        ? 'Tout réviser'
        : questionsData.categories.find((c) => c.id === categoryId)?.name ?? categoryId;
    navigation.replace('Quiz', { categoryId, categoryName, mode });
  };

  const handleHome = () => {
    navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreEmoji}>{emoji}</Text>
          <Text style={styles.scoreDisplay}>{score} / {total}</Text>
          <Text style={styles.scorePercent}>{percentage}% correct</Text>
          <View style={styles.accuracyBarContainer}>
            <View
              style={[
                styles.accuracyBarFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: percentage >= 70 ? '#4CAF50' : percentage >= 40 ? '#F59E0B' : '#FF5252',
                },
              ]}
            />
          </View>
          <Text style={styles.scoreMessage}>
            {percentage === 100
              ? 'Perfect! You\'ve mastered this section.'
              : percentage >= 80
              ? 'Excellent work!'
              : percentage >= 60
              ? 'Good, keep it up!'
              : percentage >= 40
              ? 'More work to do, but you\'re improving.'
              : 'Review this topic and try again!'}
          </Text>
        </View>

        {wrongQuestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incorrect answers ({wrongQuestions.length})</Text>
            {wrongQuestions.map((q) => (
              <View key={q.id} style={styles.wrongCard}>
                <Text style={styles.wrongQuestion}>{q.question}</Text>
                <View style={styles.correctAnswerRow}>
                  <Text style={styles.correctAnswerLabel}>Bonne réponse : </Text>
                  <Text style={styles.correctAnswerText}>{q.options[q.correct]}</Text>
                </View>
                <Text style={styles.explanationText}>{q.explanation}</Text>
              </View>
            ))}
          </View>
        )}

        {wrongQuestions.length === 0 && (
          <View style={styles.perfectSection}>
            <Text style={styles.perfectText}>Aucune erreur ! Chapeau 🎩</Text>
          </View>
        )}

        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>🔄 Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={handleHome} activeOpacity={0.85}>
            <Text style={styles.homeButtonText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EE' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 20 },
  scoreCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, alignItems: 'center',
    marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  scoreEmoji: { fontSize: 56, marginBottom: 12 },
  scoreDisplay: { fontSize: 48, fontWeight: '800', color: '#1A1A1A', letterSpacing: -1 },
  scorePercent: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 4, marginBottom: 20 },
  accuracyBarContainer: {
    width: '100%', height: 12, backgroundColor: '#F3F4F6',
    borderRadius: 6, overflow: 'hidden', marginBottom: 16,
  },
  accuracyBarFill: { height: '100%', borderRadius: 6 },
  scoreMessage: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  wrongCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: '#FF5252', shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  wrongQuestion: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, lineHeight: 20 },
  correctAnswerRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  correctAnswerLabel: { fontSize: 13, color: '#6B7280' },
  correctAnswerText: { fontSize: 13, fontWeight: '700', color: '#4CAF50', flex: 1 },
  explanationText: { fontSize: 13, color: '#6B7280', lineHeight: 18, fontStyle: 'italic' },
  perfectSection: {
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20,
  },
  perfectText: { fontSize: 16, fontWeight: '700', color: '#166534' },
  buttonsContainer: { gap: 12 },
  retryButton: {
    backgroundColor: '#4A90D9', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#4A90D9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  homeButton: {
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB',
  },
  homeButtonText: { color: '#1A1A1A', fontSize: 16, fontWeight: '700' },
});
