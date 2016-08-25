import AATLookupTable from './AATLookupTable';

const START_OF_TEXT_STATE = 0;
const START_OF_LINE_STATE = 1;

const END_OF_TEXT_CLASS = 0;
const OUT_OF_BOUNDS_CLASS = 1;
const DELETED_GLYPH_CLASS = 2;
const END_OF_LINE_CLASS = 3;

const DONT_ADVANCE = 0x4000;

export default class AATStateMachine {
  constructor(stateTable) {
    this.stateTable = stateTable;
    this.lookupTable = new AATLookupTable(stateTable.classTable);
  }

  process(glyphs, reverse, processEntry) {
    let currentState = START_OF_TEXT_STATE; // START_OF_LINE_STATE is used for kashida glyph insertions sometimes I think?
    let index = reverse ? glyphs.length - 1 : 0;
    let dir = reverse ? -1 : 1;

    while ((dir === 1 && index <= glyphs.length) || (dir === -1 && index >= -1)) {
      let glyph = null;
      let classCode = OUT_OF_BOUNDS_CLASS;
      let shouldAdvance = true;

      if (index === glyphs.length || index === -1) {
        classCode = END_OF_TEXT_CLASS;
      } else {
        glyph = glyphs[index];
        if (glyph.id === 0xffff) { // deleted glyph
          classCode = DELETED_GLYPH_CLASS;
        } else {
          classCode = this.lookupTable.lookup(glyph.id);
          if (classCode == null) {
            classCode = OUT_OF_BOUNDS_CLASS;
          }
        }
      }

      let row = this.stateTable.stateArray.getItem(currentState);
      let entryIndex = row[classCode];
      let entry = this.stateTable.entryTable.getItem(entryIndex);

      if (classCode !== END_OF_TEXT_CLASS && classCode !==  DELETED_GLYPH_CLASS) {
        processEntry(glyph, entry, index);
        shouldAdvance = !(entry.flags & DONT_ADVANCE);
      }

      currentState = entry.newState;
      if (shouldAdvance) {
        index += dir;
      }
    }

    return glyphs;
  }
}
