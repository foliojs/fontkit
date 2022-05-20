// iconv-lite is an optional dependency.
// This is a hack to make that work with Node native ESM by creating a CJS module
// that can be imported from ESM. This also works in bundlers which support try..catch
// blocks to mark optional dependencies.
try {
  module.exports = require('iconv-lite');
} catch (err) { }
