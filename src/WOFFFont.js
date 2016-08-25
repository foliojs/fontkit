import TTFFont from './TTFFont';
import WOFFDirectory from './tables/WOFFDirectory';
import tables from './tables';
import pako from 'pako/lib/inflate';
import toBuffer from 'typedarray-to-buffer';
import r from 'restructure';

export default class WOFFFont extends TTFFont {
  static probe(buffer) {
    return buffer.toString('ascii', 0, 4) === 'wOFF';
  }

  _decodeDirectory() {
    this.directory = WOFFDirectory.decode(this.stream, { _startOffset: 0 });
  }

  _getTableStream(tag) {
    let table = this.directory.tables[tag];
    if (table) {
      this.stream.pos = table.offset;

      if (table.compLength < table.length) {
        let buf = toBuffer(pako.inflate(this.stream.readBuffer(table.compLength)));
        return new r.DecodeStream(buf);
      } else {
        return this.stream;
      }
    }

    return null;
  }
}
