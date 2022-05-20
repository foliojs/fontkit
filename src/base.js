import r from 'restructure';
const fs = require('fs');

export let logErrors = false;

let formats = [];
export function registerFormat(format) {
  formats.push(format);
};

export function openSync(filename, postscriptName) {
  let buffer = fs.readFileSync(filename);
  return create(buffer, postscriptName);
};

export function open(filename, postscriptName, callback) {
  if (typeof postscriptName === 'function') {
    callback = postscriptName;
    postscriptName = null;
  }

  fs.readFile(filename, function (err, buffer) {
    if (err) { return callback(err); }

    try {
      var font = create(buffer, postscriptName);
    } catch (e) {
      return callback(e);
    }

    return callback(null, font);
  });

  return;
};

export function create(buffer, postscriptName) {
  for (let i = 0; i < formats.length; i++) {
    let format = formats[i];
    if (format.probe(buffer)) {
      let font = new format(new r.DecodeStream(buffer));
      if (postscriptName) {
        return font.getFont(postscriptName);
      }

      return font;
    }
  }

  throw new Error('Unknown font format');
};

export let defaultLanguage = 'en';
export function setDefaultLanguage(lang = 'en') {
  defaultLanguage = lang;
};