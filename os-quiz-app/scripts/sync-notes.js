/**
 * sync-notes.js
 * Reads every .md file in src/data/notes/ and generates src/data/notesContent.ts
 * Run with: npm run sync-notes
 * The .md files are the source of truth — edit those, then re-run this script.
 */

const fs = require('fs');
const path = require('path');

const notesDir = path.join(__dirname, '../src/data/notes');
const outputFile = path.join(__dirname, '../src/data/notesContent.ts');

const files = fs.readdirSync(notesDir).filter((f) => f.endsWith('.md'));

if (files.length === 0) {
  console.error('No .md files found in', notesDir);
  process.exit(1);
}

const entries = files.map((file) => {
  const id = file.replace('.md', '');
  const content = fs.readFileSync(path.join(notesDir, file), 'utf-8');
  return `  ${JSON.stringify(id)}: ${JSON.stringify(content)}`;
});

const output = `// AUTO-GENERATED — do not edit directly.
// Source: src/data/notes/*.md
// To update: edit the .md files, then run: npm run sync-notes

const notesContent: Record<string, string> = {
${entries.join(',\n')}
};

export default notesContent;
`;

fs.writeFileSync(outputFile, output, 'utf-8');
console.log(`✓ Synced ${files.length} note(s):`, files.map((f) => f.replace('.md', '')).join(', '));
console.log(`  → ${outputFile}`);
