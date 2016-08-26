export default class AATLookupTable {
  constructor(table) {
    this.table = table;
  }

  lookup(glyph) {
    switch (this.table.version) {
      case 0: // simple array format
        return this.table.values.getItem(glyph);

      case 2: // segment format
      case 4: {
        let min = 0;
        let max = this.table.binarySearchHeader.nUnits - 1;

        while (min <= max) {
          var mid = (min + max) >> 1;
          var seg = this.table.segments[mid];

          // special end of search value
          if (seg.firstGlyph === 0xffff) {
            return null;
          }

          if (glyph < seg.firstGlyph) {
            max = mid - 1;
          } else if (glyph > seg.lastGlyph) {
            min = mid + 1;
          } else {
            if (this.table.version === 2) {
              return seg.value;
            } else {
              return seg.values[glyph - seg.firstGlyph];
            }
          }
        }

        return null;
      }

      case 6: { // lookup single
        let min = 0;
        let max = this.table.binarySearchHeader.nUnits - 1;

        while (min <= max) {
          var mid = (min + max) >> 1;
          var seg = this.table.segments[mid];

          // special end of search value
          if (seg.glyph === 0xffff) {
            return null;
          }

          if (glyph < seg.glyph) {
            max = mid - 1;
          } else if (glyph > seg.glyph) {
            min = mid + 1;
          } else {
            return seg.value;
          }
        }

        return null;
      }

      case 8: // lookup trimmed
        return this.table.values[glyph - this.table.firstGlyph];

      default:
        throw new Error(`Unknown lookup table format: ${this.table.version}`);
    }
  }
}
