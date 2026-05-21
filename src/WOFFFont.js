import TTFFont from './TTFFont';
import WOFFDirectory from './tables/WOFFDirectory';
import tables from './tables';
import inflate from 'tiny-inflate';
import * as r from 'restructure';
import { asciiDecoder } from './utils';

export default class WOFFFont extends TTFFont {
  type = 'WOFF';

  static probe(buffer) {
    return asciiDecoder.decode(buffer.slice(0, 4)) === 'wOFF';
  }

  _decodeDirectory() {
    this.directory = WOFFDirectory.decode(this.stream, { _startOffset: 0 });
  }

  _decodeTable(table) {
    this._decompress();
    return super._decodeTable(table);
  }

  // Inflate all tables into a single contiguous stream so that table-internal
  // offsets remain valid against `this.stream` after decoding. Without this,
  // tables that are deflated in the WOFF file (e.g. `gvar`) would be decoded
  // from a temporary per-table inflate buffer, while code that later re-reads
  // the table (e.g. GlyphVariationProcessor) reads from `this.stream` — and
  // gets garbage. Mirrors WOFF2Font's _decompress for the same reason.
  _decompress() {
    if (this._decompressed) return;

    // Lay each table out at 4-byte aligned offsets and compute total size.
    let totalSize = 0;
    let layout = [];
    for (let tag in this.directory.tables) {
      let entry = this.directory.tables[tag];
      layout.push({ entry, newOffset: totalSize });
      totalSize += entry.length;
      totalSize = (totalSize + 3) & ~3;
    }

    let buffer = new Uint8Array(totalSize);
    for (let { entry, newOffset } of layout) {
      this.stream.pos = entry.offset;
      let data;
      if (entry.compLength < entry.length) {
        this.stream.pos += 2; // skip 2-byte zlib header
        data = new Uint8Array(entry.length);
        inflate(this.stream.readBuffer(entry.compLength - 2), data);
      } else {
        data = this.stream.readBuffer(entry.length);
      }
      buffer.set(data, newOffset);
      entry.offset = newOffset;
    }

    this.stream = new r.DecodeStream(buffer);
    this._decompressed = true;
  }
}
