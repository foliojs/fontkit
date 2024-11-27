import * as fontkit from 'fontkit';
import assert from 'assert';

describe('STAT table', function () {
  it('should have correct STAT table structure', function () {
    let font = fontkit.openSync(
      new URL('data/fonttest/STATTest.ttf', import.meta.url),
    );
    let stat = font.STAT;
    assert.deepEqual(stat, {
      version: 65538,
      designAxisSize: 8,
      designAxisCount: 4,
      designAxes: [
        {
          axisTag: 'opsz',
          axisNameID: 257,
          axisOrdering: 0,
        },
        {
          axisTag: 'wdth',
          axisNameID: 261,
          axisOrdering: 1,
        },
        {
          axisTag: 'wght',
          axisNameID: 266,
          axisOrdering: 2,
        },
        {
          axisTag: 'ital',
          axisNameID: 273,
          axisOrdering: 3,
        },
      ],
      axisValueCount: 15,
      elidedFallbackNameID: 256,
      axisValues: [
        {
          axisCount: 2,
          flags: 0,
          valueNameID: 275,
          axisValues: [
            {
              axisIndex: 0,
              value: 8,
            },
            {
              axisIndex: 1,
              value: 400,
            },
          ],
          format: 4,
        },
        {
          axisIndex: 0,
          flags: 3,
          valueNameID: 258,
          nominalValue: 11,
          rangeMinValue: 9,
          rangeMaxValue: 12,
          format: 2,
        },
        {
          axisIndex: 0,
          flags: 0,
          valueNameID: 259,
          nominalValue: 16.699996948242188,
          rangeMinValue: 12,
          rangeMaxValue: 24,
          format: 2,
        },
        {
          axisIndex: 0,
          flags: 0,
          valueNameID: 260,
          nominalValue: 72,
          rangeMinValue: 24,
          rangeMaxValue: 72,
          format: 2,
        },
        {
          axisIndex: 1,
          flags: 0,
          valueNameID: 262,
          nominalValue: 80,
          rangeMinValue: 80,
          rangeMaxValue: 89,
          format: 2,
        },
        {
          axisIndex: 1,
          flags: 0,
          valueNameID: 263,
          nominalValue: 90,
          rangeMinValue: 90,
          rangeMaxValue: 96,
          format: 2,
        },
        {
          axisIndex: 1,
          flags: 2,
          valueNameID: 264,
          nominalValue: 100,
          rangeMinValue: 97,
          rangeMaxValue: 101,
          format: 2,
        },
        {
          axisIndex: 1,
          flags: 0,
          valueNameID: 265,
          nominalValue: 125,
          rangeMinValue: 102,
          rangeMaxValue: 125,
          format: 2,
        },
        {
          axisIndex: 2,
          flags: 0,
          valueNameID: 267,
          nominalValue: 300,
          rangeMinValue: 300,
          rangeMaxValue: 349,
          format: 2,
        },
        {
          axisIndex: 2,
          flags: 2,
          valueNameID: 268,
          nominalValue: 400,
          rangeMinValue: 350,
          rangeMaxValue: 449,
          format: 2,
        },
        {
          axisIndex: 2,
          flags: 0,
          valueNameID: 269,
          nominalValue: 500,
          rangeMinValue: 450,
          rangeMaxValue: 549,
          format: 2,
        },
        {
          axisIndex: 2,
          flags: 0,
          valueNameID: 270,
          nominalValue: 600,
          rangeMinValue: 550,
          rangeMaxValue: 649,
          format: 2,
        },
        {
          axisIndex: 2,
          flags: 0,
          valueNameID: 271,
          nominalValue: 700,
          rangeMinValue: 650,
          rangeMaxValue: 749,
          format: 2,
        },
        {
          axisIndex: 2,
          flags: 0,
          valueNameID: 272,
          nominalValue: 900,
          rangeMinValue: 750,
          rangeMaxValue: 900,
          format: 2,
        },
        {
          axisIndex: 3,
          flags: 2,
          valueNameID: 274,
          value: 0,
          format: 1,
        },
      ],
    });
  });
});
