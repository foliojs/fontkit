import { rmSync } from 'node:fs';

const pathsToRemove = [
  'src/opentype/shapers/generated',
  'src/opentype/shapers/data.trie',
  'src/opentype/shapers/use.trie',
  'src/opentype/shapers/use.json',
  'src/opentype/shapers/indic.trie',
  'src/opentype/shapers/indic.json',
  'dist',
];

for (const pathToRemove of pathsToRemove) {
  rmSync(pathToRemove, { recursive: true, force: true });
}
