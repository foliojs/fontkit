import {DecodeStream} from 'restructure';

export let logErrors = false;

let formats = [];
export function registerFormat(format) {
  formats.push(format);
};

export function create(buffer, postscriptName) {
  for (let i = 0; i < formats.length; i++) {
    let format = formats[i];
    if (format.probe(buffer)) {
      let font = new format(new DecodeStream(buffer));
      if (postscriptName) {
        return font.getFont(postscriptName);
      }

      return font;
    }
  }

  throw new Error('Unknown font format');
};

let _defaultLanguage = 'en';

export function defaultLanguage() {
  return _defaultLanguage;
}

export function setDefaultLanguage(lang = 'en') {
  _defaultLanguage = lang;
};
