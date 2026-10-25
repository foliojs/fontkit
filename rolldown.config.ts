import { defineConfig } from 'rolldown';

const external = [
  'fs',
  'restructure',
  'dfa',
  'fflate',
  'unicode-properties',
  'unicode-trie',
  'brotli/decompress.js',
];

export default defineConfig({
  input: {
    'fontkit.node.esm': 'src/node.js',
    'fontkit.browser.esm': 'src/index.js',
    'fontkit.core.esm': 'src/core.js',
    'formats/TTFFont': 'src/TTFFont.js',
    'formats/WOFFFont': 'src/WOFFFont.js',
    'formats/WOFF2Font': 'src/WOFF2Font.js',
    'formats/TrueTypeCollection': 'src/TrueTypeCollection.js',
    'formats/DFont': 'src/DFont.js',
  },
  external,
  preserveEntrySignatures: 'allow-extension',
  transform: {
    target: ['node22', 'firefox115', 'safari16', 'chrome120'],
  },
  output: {
    format: 'esm',
    dir: 'dist',
    entryFileNames: '[name].js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    minifyInternalExports: false,
    cleanDir: true,
  },
});
