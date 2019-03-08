import babel from 'rollup-plugin-babel';
import localResolve from 'rollup-plugin-local-resolve';
import json from 'rollup-plugin-json';

export default {  
  output: {
    format: 'cjs',
    sourcemap: true
  },
  external: [
    'restructure',
    'tiny-inflate',
    'brotli/decompress',
    'unicode-properties',
    'clone',
    'deep-equal',
    'unicode-trie',
    'dfa',
    'restructure/src/utils'
  ],
  plugins: [
    localResolve(),
    json(),
    babel({
      presets: [
        [
          '@babel/preset-env', 
          {
            modules: false,
            targets: {
              node: '8.11',
              browsers: [
                'Firefox 57',
                'Chrome 60',
                'iOS 10',
                'Safari 10'
              ]
            }
          }
        ]
      ],
      plugins: [
        [
          '@babel/plugin-proposal-decorators',
          {
            legacy: true
          }
        ],
        '@babel/plugin-proposal-class-properties'
      ]
    })
  ]
};
