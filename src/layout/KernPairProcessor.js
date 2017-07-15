import {binarySearch} from '../utils';

class KernPairProcessor {
  constructor(table) {
    this.version = table.version;
    this.format = table.format;
    this.coverage = table.coverage;
    this.subtable = table.subtable;
  }

  process(glyphs, positions) {
    let prop = this.coverage.crossStream ? 'yAdvance' : 'xAdvance';

    for (let glyphIndex = 0; glyphIndex < glyphs.length - 1; glyphIndex++) {
      let left = glyphs[glyphIndex].id;
      let right = glyphs[glyphIndex + 1].id;
      let val = this.getKernPair(left, right);

      // Microsoft supports the override flag, which resets the result.
      // Otherwise, the sum of the results from all subtables is returned.
      if (this.coverage.override) {
        positions[glyphIndex][prop] = val;
      } else {
        positions[glyphIndex][prop] += val;
      }
    }
  }

  getKernPair(left, right) {
    throw new Error(`Unsupported kerning sub-table format ${this.subtable.version}`);
  }
}

export class KernOrderedList extends KernPairProcessor {
  getKernPair(left, right) {
    let pairIdx = binarySearch(this.subtable.pairs, function (pair) {
      return (left - pair.left) || (right - pair.right);
    });

    if (pairIdx >= 0) {
      return this.subtable.pairs[pairIdx].value;
    }

    return 0;
  }
}

export class KernSimpleArray extends KernPairProcessor {
  getKernPair(left, right) {
    let leftOffset = 0, rightOffset = 0;
    let {leftTable, rightTable, array} = this.subtable;

    if (left >= leftTable.firstGlyph && left < leftTable.firstGlyph + leftTable.nGlyphs) {
      leftOffset = leftTable.offsets[left - leftTable.firstGlyph];
    } else {
      leftOffset = array.off;
    }

    if (right >= rightTable.firstGlyph && right < rightTable.firstGlyph + rightTable.nGlyphs) {
      rightOffset = rightTable.offsets[right - rightTable.firstGlyph];
    }

    let index = (leftOffset + rightOffset - array.off) / 2;
    return array.values.get(index);
  }
}

export class KernIndexArray extends KernPairProcessor {
  getKernPair(left, right) {
    let subtable = this.subtable;
    if (left >= subtable.glyphCount || right >= subtable.glyphCount) {
      return 0;
    }

    return subtable.kernValue[subtable.kernIndex[subtable.leftClass[left] * subtable.rightClassCount + subtable.rightClass[right]]];
  }
}
