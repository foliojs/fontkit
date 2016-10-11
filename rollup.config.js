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
      presets: [['es2015', { modules: false }]],
      plugins: ['transform-decorators-legacy', 'transform-runtime'],
      runtimeHelpers: true
    })
  ]
};
