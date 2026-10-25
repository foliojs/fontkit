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

function createConfig(platform: 'node' | 'browser') {
  return defineConfig({
    platform,
    input: {
      index: platform === 'node' ? 'src/node.js' : 'src/index.js',
      core: 'src/core.js',
      'formats/TTFFont': 'src/TTFFont.js',
      'formats/WOFFFont': 'src/WOFFFont.js',
      'formats/WOFF2Font': 'src/WOFF2Font.js',
      'formats/TrueTypeCollection': 'src/TrueTypeCollection.js',
      'formats/DFont': 'src/DFont.js',
    },
    external,
    preserveEntrySignatures: 'allow-extension',
    transform: {
      target:
        platform === 'node'
          ? ['node22']
          : ['firefox115', 'safari16', 'chrome120'],
    },
    output: {
      format: 'esm',
      dir: `dist/${platform}`,
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      minifyInternalExports: false,
      cleanDir: true,
    },
  });
}

export default [createConfig('node'), createConfig('browser')];
