import babel from 'rollup-plugin-babel';
import localResolve from 'rollup-plugin-local-resolve';

export default {
  format: 'cjs',
  plugins: [
    localResolve(),
    babel({
      babelrc: false,
      presets: [['es2015', { modules: false }]],
      plugins: ['transform-decorators-legacy', 'transform-runtime'],
      runtimeHelpers: true
    })
  ]
};
