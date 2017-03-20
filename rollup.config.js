import babel from 'rollup-plugin-babel';
import localResolve from 'rollup-plugin-local-resolve';
import json from 'rollup-plugin-json';

export default {
  format: 'cjs',
  plugins: [
    localResolve(),
    json(),
    babel({
      babelrc: false,
      presets: [['es2015', { modules: false, loose: true }]],
      plugins: ['transform-decorators-legacy', 'transform-class-properties', 'transform-runtime'],
      runtimeHelpers: true
    })
  ]
};
