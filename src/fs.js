import { create } from './base';
import fs from 'fs';

export function openSync(filename, postscriptName) {
  let buffer = fs.readFileSync(filename);
  return create(buffer, postscriptName);
}

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
}
