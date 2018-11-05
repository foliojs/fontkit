import fontkit from '../src';
import assert from 'assert';
import BBox from '../src/glyph/BBox';

describe('metadata', function() {
  let ttfFont = fontkit.openSync(__dirname + '/data/OpenSans/OpenSans-Regular.ttf');

  it('decodes SFNT directory values correctly', function() {
    let dir = ttfFont.directory;
    assert.equal(dir.numTables, 19);
    assert.equal(dir.searchRange, 256);
    assert.equal(dir.entrySelector, 4);
    assert.equal(dir.rangeShift, 48);
  });

  it('numTables matches table collection', function() {
    let dir = ttfFont.directory;
    assert.equal(Object.keys(dir.tables).length, dir.numTables);
  });

});
