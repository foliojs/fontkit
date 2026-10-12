import * as fontkit from 'fontkit';
import assert from 'assert';

// Builds a minimal SFNT font that only holds the given tables
function buildFont(tables) {
  let tags = Object.keys(tables);
  let offset = 12 + tags.length * 16;
  let length = tags.reduce((sum, tag) => sum + tables[tag].length, offset);
  let buffer = new Uint8Array(length);
  let view = new DataView(buffer.buffer);

  view.setUint32(0, 0x00010000);
  view.setUint16(4, tags.length);

  tags.forEach((tag, i) => {
    let entry = 12 + i * 16;
    for (let j = 0; j < 4; j++) {
      buffer[entry + j] = tag.charCodeAt(j);
    }

    view.setUint32(entry + 8, offset);
    view.setUint32(entry + 12, tables[tag].length);
    buffer.set(tables[tag], offset);
    offset += tables[tag].length;
  });

  return buffer;
}

describe('device metrics', function () {
  it('should read hdmx records padded to sizeDeviceRecord', function () {
    // With 5 glyphs, a record holds 7 bytes of data and 1 byte of padding
    let maxp = new Uint8Array(32);
    new DataView(maxp.buffer).setUint16(4, 5);

    // prettier-ignore
    let hdmx = new Uint8Array([
      0, 0, // version
      0, 2, // numRecords
      0, 0, 0, 8, // sizeDeviceRecord
      11, 7, 3, 4, 5, 6, 7, 0, // pixelSize, maximumWidth, widths, padding
      12, 9, 5, 6, 7, 8, 9, 0,
    ]);

    let font = fontkit.create(buildFont({ maxp, hdmx }));

    assert.deepEqual(font.hdmx.records, [
      { pixelSize: 11, maximumWidth: 7, widths: [3, 4, 5, 6, 7] },
      { pixelSize: 12, maximumWidth: 9, widths: [5, 6, 7, 8, 9] },
    ]);
  });
});
