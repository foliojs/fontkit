(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('restructure')) :
  typeof define === 'function' && define.amd ? define(['restructure'], factory) :
  (global.fontkit = factory(global.r));
}(this, (function (r) { 'use strict';

r = 'default' in r ? r['default'] : r;

var fs = require('fs');

var fontkit = {};
fontkit.logErrors = false;

var formats = [];
fontkit.registerFormat = function (format) {
  formats.push(format);
};

fontkit.openSync = function (filename, postscriptName) {
  var buffer = fs.readFileSync(filename);
  return fontkit.create(buffer, postscriptName);
};

fontkit.open = function (filename, postscriptName, callback) {
  if (typeof postscriptName === 'function') {
    callback = postscriptName;
    postscriptName = null;
  }

  fs.readFile(filename, function (err, buffer) {
    if (err) {
      return callback(err);
    }

    try {
      var font = fontkit.create(buffer, postscriptName);
    } catch (e) {
      return callback(e);
    }

    return callback(null, font);
  });

  return;
};

fontkit.create = function (buffer, postscriptName) {
  for (var i = 0; i < formats.length; i++) {
    var format = formats[i];
    if (format.probe(buffer)) {
      var font = new format(new r.DecodeStream(buffer));
      if (postscriptName) {
        return font.getFont(postscriptName);
      }

      return font;
    }
  }

  throw new Error('Unknown font format');
};

return fontkit;

})));
//# sourceMappingURL=base-umd.js.map
