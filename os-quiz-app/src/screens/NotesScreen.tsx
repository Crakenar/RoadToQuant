import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
// @ts-ignore
import SyntaxHighlighter from 'react-native-syntax-highlighter';
// @ts-ignore
import { vs2015 } from 'react-syntax-highlighter/dist/styles/hljs';
import { RootStackParamList } from '../types';
import notesContent from '../data/notesContent';

type NotesRouteProp = RouteProp<RootStackParamList, 'Notes'>;

// Custom fence renderer: syntax-highlighted code blocks
const buildRules = (subjectColor: string) => ({
  fence: (node: any) => {
    const lang = (node.sourceInfo ?? '').trim() || 'text';
    const code = (node.content ?? '').trimEnd();
    return (
      <View key={node.key} style={codeStyles.container}>
        {lang !== 'text' && (
          <View style={codeStyles.langBadge}>
            <Text style={codeStyles.langText}>{lang}</Text>
          </View>
        )}
        <SyntaxHighlighter
          language={lang === 'text' ? 'plaintext' : lang}
          style={vs2015}
          customStyle={codeStyles.highlighter}
          fontSize={12.5}
          highlighter="hljs"
        >
          {code}
        </SyntaxHighlighter>
      </View>
    );
  },
});

export default function NotesScreen() {
  const navigation = useNavigation();
  const route = useRoute<NotesRouteProp>();
  const { subjectId, subjectName, subjectColor } = route.params;

  const content = (notesContent as Record<string, string>)[subjectId]
    ?? `# ${subjectName}\n\nNo notes yet.`;

  const rules = buildRules(subjectColor);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: subjectColor }]}>{'\u2190 Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notes</Text>
        <Text style={styles.subtitle}>{subjectName}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Markdown style={markdownStyles} rules={rules}>{content}</Markdown>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { paddingVertical: 4, marginBottom: 6 },
  backText: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 60 },
});

// Styles for the syntax highlighter wrapper
const codeStyles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
  },
  langBadge: {
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 6,
  },
  langText: {
    color: '#858585',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  highlighter: {
    margin: 0,
    padding: 14,
    backgroundColor: '#1E1E1E',
    borderRadius: 0,
  },
});

const markdownStyles = StyleSheet.create({
  heading1: {
    fontSize: 22, fontWeight: '800', color: '#1A1A1A',
    marginTop: 24, marginBottom: 8,
    borderBottomWidth: 2, borderBottomColor: '#E5E7EB', paddingBottom: 6,
  },
  heading2: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 20, marginBottom: 6 },
  heading3: { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 14, marginBottom: 4 },
  heading4: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginTop: 10, marginBottom: 4 },
  body: { fontSize: 14, color: '#374151', lineHeight: 22 },
  paragraph: { marginBottom: 10, lineHeight: 22 },
  strong: { fontWeight: '700', color: '#1A1A1A' },
  em: { fontStyle: 'italic', color: '#4B5563' },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  list_item: { marginBottom: 4, flexDirection: 'row' },
  bullet_list_icon: { color: '#4A90D9', fontWeight: '700', marginRight: 6 },
  ordered_list_icon: { color: '#4A90D9', fontWeight: '700', marginRight: 6 },
  code_inline: {
    fontFamily: 'monospace', fontSize: 13,
    backgroundColor: '#F3F4F6', color: '#E87040',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
  },
  fence: {
    marginVertical: 0,
  },
  blockquote: {
    backgroundColor: '#F0F7FF', borderLeftWidth: 4, borderLeftColor: '#4A90D9',
    paddingHorizontal: 14, paddingVertical: 8, marginVertical: 10, borderRadius: 4,
  },
  table: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginVertical: 12, overflow: 'hidden' },
  thead: { backgroundColor: '#F9FAFB' },
  tbody: {},
  th: {
    padding: 10, fontWeight: '700', fontSize: 12, color: '#374151',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    borderRightWidth: 1, borderRightColor: '#E5E7EB',
  },
  td: {
    padding: 10, fontSize: 12, color: '#374151',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    borderRightWidth: 1, borderRightColor: '#F3F4F6',
  },
  tr: { flexDirection: 'row' },
  hr: { backgroundColor: '#E5E7EB', height: 1, marginVertical: 16 },
  link: { color: '#4A90D9', textDecorationLine: 'underline' },
});
