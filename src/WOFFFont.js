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

  _getTableStream(tag) {
    let table = this.directory.tables[tag];
    if (table) {
      if (table.compLength < table.length) {
        // Inflated once, and kept: a glyph asks for `glyf`, and a variation
        // for `gvar`, once for every glyph.
        let inflated = this._inflated || (this._inflated = {});
        let buf = inflated[tag];
        if (!buf) {
          this.stream.pos = table.offset + 2; // skip deflate header
          let outBuffer = new Uint8Array(table.length);
          buf = inflated[tag] = inflate(this.stream.readBuffer(table.compLength - 2), outBuffer);
        }

        return new r.DecodeStream(buf);
      } else {
        this.stream.pos = table.offset;
        return this.stream;
      }
    }

    return null;
  }

  _createVariation(coords) {
    let font = super._createVariation(coords);

    // The tables are the same bytes at any coordinates
    font._inflated = this._inflated || (this._inflated = {});
    return font;
  }
}
