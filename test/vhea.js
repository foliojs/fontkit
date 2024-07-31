import assert from 'assert';
import * as fontkit from 'fontkit';

describe('vhea table test', function () {
  const font = fontkit.openSync(new URL('data/NotoSansCJK/NotoSansCJKkr-Regular.otf', import.meta.url));

  it('should retrieve vhea table correctly', function () {
    const actualVheaObject = font.vhea;

    const expectedVheaObject = {
      version: 1.0625,
      ascent: 500,
      descent: -500,
      lineGap: 0,
      advanceHeightMax: 3000,
      minTopSideBearing: -1002,
      minBottomSideBearing: -677,
      yMaxExtent: 2928,
      caretSlopeRise: 0,
      caretSlopeRun: 1,
      caretOffset: 0,
      metricDataFormat: 0,
      numberOfMetrics: 65167,
    };

    assert.deepStrictEqual(actualVheaObject, expectedVheaObject, 'The vhea table does not match the expected format.');
  });
});
