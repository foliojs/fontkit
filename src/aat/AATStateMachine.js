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

  /**
   * Runs the state machine over the glyphs. processEntry may return a new
   * index, e.g. after inserting glyphs. Transitions that don't advance use up
   * limits.ops; once it runs out, the machine advances anyway.
   */
  process(glyphs, reverse, processEntry, limits = { ops: Infinity }) {
    let currentState = START_OF_TEXT_STATE; // START_OF_LINE_STATE is used for kashida glyph insertions sometimes I think?
    let index = reverse ? glyphs.length - 1 : 0;
    let dir = reverse ? -1 : 1;

    while (
      (dir === 1 && index <= glyphs.length) ||
      (dir === -1 && index >= -1)
    ) {
      let glyph = null;
      let classCode = OUT_OF_BOUNDS_CLASS;
      let shouldAdvance = true;

      if (index === glyphs.length || index === -1) {
        classCode = END_OF_TEXT_CLASS;
      } else {
        glyph = glyphs[index];
        if (glyph.id === 0xffff) {
          // deleted glyph
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

      // The end-of-text transition (glyph is null) can still act on the
      // glyphs before it (#144, #147, #151), and insert glyphs at the end.
      if (classCode !== DELETED_GLYPH_CLASS) {
        let newIndex = processEntry(glyph, entry, index);
        if (newIndex != null) {
          index = newIndex;
        }

        // Like HarfBuzz, stop at the end of the text unless glyphs were
        // inserted there that the machine doesn't skip
        if (
          classCode === END_OF_TEXT_CLASS &&
          (index < 0 || index >= glyphs.length)
        ) {
          break;
        }

        shouldAdvance = !(entry.flags & DONT_ADVANCE) || limits.ops-- <= 0;
      }

      currentState = entry.newState;
      if (shouldAdvance) {
        index += dir;
      }
    }

    return glyphs;
  }

  /**
   * Performs a depth-first traversal of the glyph strings
   * represented by the state machine.
   */
  traverse(opts, state = 0, visited = new Set()) {
    if (visited.has(state)) {
      return;
    }

    visited.add(state);

    let { nClasses, stateArray, entryTable } = this.stateTable;
    let row = stateArray.getItem(state);

    // Skip predefined classes
    for (let classCode = 4; classCode < nClasses; classCode++) {
      let entryIndex = row[classCode];
      let entry = entryTable.getItem(entryIndex);

      // Try all glyphs in the class
      for (let glyph of this.lookupTable.glyphsForValue(classCode)) {
        if (opts.enter) {
          opts.enter(glyph, entry);
        }

        if (entry.newState !== 0) {
          this.traverse(opts, entry.newState, visited);
        }

        if (opts.exit) {
          opts.exit(glyph, entry);
        }
      }
    }
  }
}
