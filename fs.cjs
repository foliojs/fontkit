// This is a workaround to make it work in the browser where the 'fs'
// module does not exists.
try {
  module.exports = require('fs');
} catch (err) { }
