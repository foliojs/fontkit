import DefaultShaper from './DefaultShaper';
import StateMachine from 'dfa';
import UnicodeTrie from 'unicode-trie';
import GlyphInfo from '../GlyphInfo';
import indicData from './indic.json';

const {categories} = indicData;
const trie = new UnicodeTrie(require('fs').readFileSync(__dirname + '/indic.trie'));
const stateMachine = new StateMachine(indicData);

// Visual positions in a syllable from left to right.
export const POSITIONS = {
  Start: 0,

  Ra_To_Become_Reph: 1,
  Pre_M: 2,
  Pre_C: 3,

  Base_C: 4,
  After_Main: 5,

  Above_C: 6,

  Before_Sub: 7,
  Below_C: 8,
  After_Sub: 9,

  Before_Post: 10,
  Post_C: 11,
  After_Post: 12,

  Final_C: 13,
  SMVD: 14,

  End: 15
};

export const IS_CONSONANT = {
  C: true,
  Ra: true,
  CM: true,
  V: true,
  Placeholder: true,
  Dotted_Circle: true
};

export default class IndicShaper extends DefaultShaper {
  static zeroMarkWidths = 'NONE';
  static planFeatures(plan) {
    plan.addStage(setupSyllables);

    plan.addStage(['locl', 'ccmp']);

    plan.addStage(initialReordering);

    plan.addStage(['nukt']);
    plan.addStage(['akhn']);
    plan.addStage(['rphf'], false);
    plan.addStage(['rkrf']);
    plan.addStage(['pref'], false);
    plan.addStage(['blwf'], false);
    plan.addStage(['abvf'], false);
    plan.addStage(['half'], false);
    plan.addStage(['pstf'], false);
    plan.addStage(['vatu']);
    plan.addStage(['cjct']);
    plan.addStage(['cfar'], false);

    plan.addStage(finalReordering);

    plan.addStage(['init'], false);
    plan.addStage(['pres', 'abvs', 'blws', 'psts', 'haln', 'dist', 'abvm', 'blwm', 'calt', 'clig']);

    // TODO: turn off kern (Khmer) and liga features.
  }

  static assignFeatures(plan, glyphs) {

  }
}

function indicCategory(glyph) {
  return trie.get(glyph.codePoints[0]) >> 8;
}

function indicPosition(glyph) {
  return trie.get(glyph.codePoints[0]) & 0xff;
}

class IndicInfo {
  constructor(category, position, syllableType, syllable) {
    this.category = category;
    this.position = position;
    this.syllableType = syllableType;
    this.syllable = syllable;
  }
}

function setupSyllables(font, glyphs) {
  let syllable = 0;
  for (let [start, end, tags] of stateMachine.match(glyphs.map(indicCategory))) {
    ++syllable;

    // Create shaper info
    for (let i = start; i <= end; i++) {
      glyphs[i].shaperInfo = new IndicInfo(
        categories[indicCategory(glyphs[i])],
        indicPosition(glyphs[i]),
        tags[0],
        syllable
      );
    }

    console.log(start, end, tags, syllable, glyphs.slice(start, end + 1).map(g => g.shaperInfo));
  }
}

function isConsonant(glyph) {
  return IS_CONSONANT[glyph.shaperInfo.category] || false;
}

function isJoiner(glyph) {
  let c = glyph.shaperInfo.category;
  return c === 'ZWJ' || c === 'ZWNJ';
}

function initialReordering(font, glyphs) {
  let virama = font.glyphForCodePoint(0x0CCD).id;
  if (virama) {
    // let info = new GlyphInfo(font, virama, [0x0CCD]);
    // info.
    for (let i = 0; i < glyphs.length; i++) {
      if (glyphs[i].shaperInfo.position === POSITIONS.Base_C) {
        let consonant = glyphs[i].id;
        // TODO: consonant_position_from_face
        glyphs[i].shaperInfo.position = POSITIONS.Below_C;
      }
    }
  }

  for (let start = 0, end = nextSyllable(glyphs, 0); start < glyphs.length; start = end, end = nextSyllable(glyphs, start)) {
    let {category, syllableType} = glyphs[start].shaperInfo;
    console.log(start, end, category, syllableType)

    if (syllableType === 'symbol_cluster') {
      continue;
    }

    console.log(start, end, glyphs.slice(start, end).map(g => [g.id, g.shaperInfo.category, g.shaperInfo.position]))

    let base = end;
    let limit = start;
    let hasReph = false;

    // 1. Find base consonant
    // if (start + 3 <= end && category === 'Ra' && glyphs[start + 1].shaperInfo.category === 'H') {
    //   console.log('HERE')
    // } else if ()

    if (start + 3 <= end && !isJoiner(glyphs[start + 2])) {
      if (category === 'Ra' && glyphs[start + 1].shaperInfo.category === 'H') {
        console.log("HERE")
      }
    }

    let i = end;
    let seenBelow = false;

    do {
      i--;

      let info = glyphs[i].shaperInfo;
      if (isConsonant(glyphs[i])) {
        if (info.position !== POSITIONS.Below_C && (info.position !== POSITIONS.Post_C || seenBelow)) {
          base = i;
          console.log('MATCH 3', i, info.position, seenBelow)
          break;
        }

        if (info.position === POSITIONS.Below_C) {
          seenBelow = true;
        }

        base = i;
        console.log('MATCH 4')
      } else if (start < i && info.category === 'ZWJ' && glyphs[i - 1].shaperInfo.category === 'H') {
        break;
      }
    } while (i > limit);

    if (hasReph && base === start && limit - base <= 2) {
      hasReph = false;
    }

    // 2. Decompose and reorder matras

    // 3. Reorder marks to canonical order

    // Reorder characters

    for (let i = start; i < base; i++) {
      let info = glyphs[i].shaperInfo;
      info.position = Math.min(POSITIONS.Pre_C, info.position);
    }

    if (base < end) {
      glyphs[i].shaperInfo.position = POSITIONS.Base_C;
    }

    // Mark final consonants.  A final consonant is one appearing after a matra,
    // like in Khmer.
    for (let i = base + 1; i < end; i++) {
      if (glyphs[i].shaperInfo.category === 'M') {
        for (let j = i + 1; j < end; j++) {
          if (isConsonant(glyphs[j])) {
            glyphs[j].shaperInfo.position = POSITIONS.Final_C;
            break;
          }
        }
        break;
      }
    }

    // Handle beginning Ra
    if (hasReph) {
      glyphs[start].shaperInfo.position = POSITIONS.Ra_To_Become_Reph;
    }

    // Attach misc marks to previous char to move with them.
    let lastPos = POSITIONS.Start;
    for (let i = start; i < end; i++) {
      // if ()
    }

    // For post-base consonants let them own anything before them
    // since the last consonant or matra.
    let last = base;
    for (let i = base + 1; i < end; i++) {
      if (isConsonant(glyphs[i])) {
        for (let j = last + 1; j < i; j++) {
          if (glyphs[j].shaperInfo.position < POSITIONS.SMVD) {
            glyphs[j].shaperInfo.position = glyphs[i].shaperInfo.position;
          }
        }
        last = i;
      } else if (glyphs[i].shaperInfo.category === 'M') {
        last = i;
      }
    }

    let arr = glyphs.slice(start, end);
    arr.sort((a, b) => a.shaperInfo.position - b.shaperInfo.position);
    glyphs.splice(start, arr.length, ...arr);

    // Find base again
    for (let i = start; i < end; i++) {
      if (glyphs[i].shaperInfo.position === POSITIONS.Base_C) {
        base = i;
        break;
      }
    }

    // Setup features now

    // Reph
    for (let i = start; i < end && glyphs[i].shaperInfo.position === POSITIONS.Ra_To_Become_Reph; i++) {
      glyphs[i].features.rphf = true;
    }

    // Pre-base
    for (let i = start; i < base; i++) {
      glyphs[i].features.half = true;
    }

    // Base
    if (base < end) {
      // glyphs[base].features
    }

    // Post-base
    for (let i = base + 1; i < end; i++) {
      glyphs[i].features.blwf = true;
      glyphs[i].features.abvf = true;
      glyphs[i].features.pstf = true;
    }

    let prefLen = 2;
    if (base + prefLen < end) {
      for (let i = base + 1; i + prefLen - 1 < end; i++) {
        // TODO
      }
    }

    // Apply ZWJ/ZWNJ effects
    for (let i = start + 1; i < end; i++) {
      if (isJoiner(glyphs[i])) {
        let nonJoiner = glyphs[i].shaperInfo.category === 'ZWNJ';
        let j = i;

        do {
          j--;

        	/* ZWJ/ZWNJ should disable CJCT.  They do that by simply
        	 * being there, since we don't skip them for the CJCT
        	 * feature (ie. F_MANUAL_ZWJ) */

        	/* A ZWNJ disables HALF. */
          if (nonJoiner) {
            glyphs[i].features.half = false;
          }
        } while (j > start && !isConsonant(glyphs[j]));
      }
    }

    console.log(base, start, end, glyphs.slice(start, end).map(g => [g.id, g.shaperInfo.category, g.shaperInfo.position]))
  }
}

function finalReordering() {
  // TODO: virama

  /* 4. Final reordering:
   *
   * After the localized forms and basic shaping forms GSUB features have been
   * applied (see below), the shaping engine performs some final glyph
   * reordering before applying all the remaining font features to the entire
   * cluster.
   */


}

function nextSyllable(glyphs, start) {
  if (start >= glyphs.length) return start;
  let syllable = glyphs[start].shaperInfo.syllable;
  while (++start < glyphs.length && glyphs[start].shaperInfo.syllable === syllable);
  return start;
}
