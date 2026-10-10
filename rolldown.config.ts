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

const nodeTarget = ['node22'];
const browserTarget = ['firefox115', 'safari16', 'chrome120'];

export default defineConfig([
  {
    input: 'src/node.js',
    external,
    transform: {
      target: nodeTarget,
    },
    output: {
      format: 'cjs',
      file: 'dist/fontkit.node.cjs',
    },
  },
  {
    input: 'src/node.js',
    external,
    transform: {
      target: nodeTarget,
    },
    output: {
      format: 'esm',
      file: 'dist/fontkit.node.esm.js',
    },
  },
  {
    input: 'src/index.js',
    external,
    transform: {
      target: browserTarget,
    },
    output: {
      format: 'esm',
      file: 'dist/fontkit.browser.esm.js',
    },
  },
]);
