import { defineConfig } from 'rolldown';

const external = [
  'fs',
  'fast-deep-equal',
  'restructure',
  'dfa',
  'clone',
  'tiny-inflate',
  'unicode-properties',
  'unicode-trie',
  'brotli/decompress.js',
];

export default defineConfig([
  {
    input: 'src/node.js',
    external,
    output: {
      format: 'cjs',
      file: 'dist/fontkit.node.cjs',
    },
  },
  {
    input: 'src/node.js',
    external,
    output: {
      format: 'esm',
      file: 'dist/fontkit.node.esm.js',
    },
  },
  {
    input: 'src/index.js',
    external,
    output: {
      format: 'esm',
      file: 'dist/fontkit.browser.esm.js',
    },
  },
]);
