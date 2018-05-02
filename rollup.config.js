import babel from 'rollup-plugin-babel';
import localResolve from 'rollup-plugin-local-resolve';
import json from 'rollup-plugin-json';
import replace from 'rollup-plugin-re';

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
    }),
    replace({
      patterns:[{
        test: /function _applyDecoratedDescriptor[^]*return desc;[^]*?}/,
        replace: ''
      }]
    })
  ],
  intro: `function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object.keys(descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object.defineProperty(target, property, desc);
    desc = null;
  }

  return desc;
}
`
};
