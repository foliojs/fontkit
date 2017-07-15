import AATStateMachine from './AATStateMachine';
import AATLookupTable from './AATLookupTable';

const PUSH_MASK = 0x8000;
const VALUE_OFFSET_MASK = 0x3fff;
const RESET_CROSS_STREAM_KERNING = 0x8000;
const STACK_SIZE = 8;

export default class AATKernProcessor {
  constructor(table) {
    this.version = table.version;
    this.format = table.format;
    this.coverage = table.coverage;
    this.stateMachine = new AATStateMachine(table.subtable.stateTable);
    this.valueTable = table.subtable.valueTable;
    this.stateTableOffset = table.subtable._startOffset;
    this.valueTableBase = this.valueTable.base - table.subtable._startOffset;
  }

  process(glyphs, positions) {
    console.log('-----------')
    let prop = this.coverage.crossStream ? 'yAdvance' : 'xAdvance';

    let stack = [];
    let adjustments = [];
    for (let i = 0; i < glyphs.length; i++) {
      adjustments.push({ x: 0, y: 0 });
    }

    // glyphs.reverse();
    // positions.reverse();

    this.stateMachine.process(glyphs, false, (glyph, entry, index) => {
      if (entry.flags & PUSH_MASK) {
        console.log('push!', index);
        if (stack.length === STACK_SIZE) {
          console.log("MAX")
          stack.shift();
        }

        stack.push(index - 1);
      }

      let valueOffset = entry.flags & VALUE_OFFSET_MASK;
      if (valueOffset !== 0) {
        let actionIndex = ((this.stateTableOffset + valueOffset) - this.valueTable.base) >> 1;
        console.log('action!', valueOffset, actionIndex, stack.length)

        // let actionIndex = (valueOffset - this.valueTableBase) >> 1;
        let action = 0;

        while (stack.length > 0 && !(action & 1)) {
          action = this.valueTable.getItem(actionIndex++);
          let value = action & ~1;
          let glyphIndex = stack.pop();

          // if (!this.coverage.crossStream) {
            // glyphIndex--;
          // }

          if (this.coverage.crossStream && value === RESET_CROSS_STREAM_KERNING) {
            positions[glyphIndex][prop] = -positions[glyphIndex - 1][prop];
            console.log('RESET', glyphIndex, 0, positions[glyphIndex][prop])
          } else {
            positions[glyphIndex][prop] += value;
            // adjustments[glyphIndex][this.coverage.crossStream ? 'y' : 'x'] += value;
            console.log('pop', glyphIndex, prop, actionIndex, action, value, positions[glyphIndex][prop])
          }
        }
      }

      // if (entry.newState === 0 || entry.newState === 1) {
        stack.length = 0;
      // }
    });

    // glyphs.reverse();
    // positions.reverse();
    // console.log(adjustments)
  }
}
