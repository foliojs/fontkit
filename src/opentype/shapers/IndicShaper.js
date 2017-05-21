import DefaultShaper from './DefaultShaper';
import StateMachine from 'dfa';
import UnicodeTrie from 'unicode-trie';
import unicode from 'unicode-properties';
import GlyphInfo from '../GlyphInfo';
import indicData from './indic.json';
import useData from './use.json';
import {POSITIONS, IS_CONSONANT} from './indic-data';

const {categories} = indicData;
const {decompositions} = useData;
const trie = new UnicodeTrie(require('fs').readFileSync(__dirname + '/indic.trie'));
const stateMachine = new StateMachine(indicData);

export default class IndicShaper extends DefaultShaper {
  static zeroMarkWidths = 'NONE';
  static planFeatures(plan) {
    plan.addStage(setupSyllables);

    plan.addStage(['locl', 'ccmp']);

    plan.addStage(initialReordering);

    plan.addStage('nukt');
    plan.addStage('akhn');
    plan.addStage('rphf', false);
    plan.addStage('rkrf');
    plan.addStage('pref', false);
    plan.addStage('blwf', false);
    plan.addStage('abvf', false);
    plan.addStage('half', false);
    plan.addStage('pstf', false);
    plan.addStage('vatu');
    plan.addStage('cjct');
    plan.addStage('cfar', false);

    plan.addStage(finalReordering);

    plan.addStage({
      local: ['init'],
      global: ['pres', 'abvs', 'blws', 'psts', 'haln', 'dist', 'abvm', 'blwm', 'calt', 'clig']
    });

    // TODO: turn off kern (Khmer) and liga features.
  }

  static assignFeatures(plan, glyphs) {
    // Decompose split matras
    // TODO: do this in a more general unicode normalizer
    for (let i = glyphs.length - 1; i >= 0; i--) {
      let codepoint = glyphs[i].codePoints[0];
      if (decompositions[codepoint]) {
        let decomposed = decompositions[codepoint].map(c => {
          let g = plan.font.glyphForCodePoint(c);
          return new GlyphInfo(plan.font, g.id, [c], glyphs[i].features);
        });

        glyphs.splice(i, 1, ...decomposed);
      }
    }
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
  let last = 0;
  for (let [start, end, tags] of stateMachine.match(glyphs.map(indicCategory))) {
    if (start > last) {
      ++syllable;
      for (let i = last; i < start; i++) {
        glyphs[i].shaperInfo = new IndicInfo('X', POSITIONS.End, 'non_indic_cluster', syllable);
      }
    }

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

    last = end + 1;
    // console.log(start, end, tags, syllable, glyphs.slice(start, end + 1).map(g => g.shaperInfo));
  }

  if (last < glyphs.length) {
    ++syllable;
    for (let i = last; i < glyphs.length; i++) {
      glyphs[i].shaperInfo = new IndicInfo('X', POSITIONS.End, 'non_indic_cluster', syllable);
    }
  }
}

function isConsonant(glyph) {
  return IS_CONSONANT[glyph.shaperInfo.category] || false;
}

function isJoiner(glyph) {
  let c = glyph.shaperInfo.category;
  return c === 'ZWJ' || c === 'ZWNJ';
}

function wouldSubstitute(glyphs, feature) {
  for (let glyph of glyphs) {
    glyph.features = {[feature]: true};
  }

  let GSUB = glyphs[0]._font._layoutEngine.engine.GSUBProcessor;
  GSUB.applyFeatures([feature], glyphs);

  return glyphs.length === 1;
}

function consonantPosition(font, consonant, virama) {
  let glyphs = [virama, consonant, virama];
  if (wouldSubstitute(glyphs.slice(0, 2), 'blwf') || wouldSubstitute(glyphs.slice(1, 3), 'blwf')) {
    console.log('blwf Below_C');
    return POSITIONS.Below_C;
  } else if (wouldSubstitute(glyphs.slice(0, 2), 'pstf') || wouldSubstitute(glyphs.slice(1, 3), 'pstf')) {
    console.log('pstf Post_C')
    return POSITIONS.Post_C;
  } else if (wouldSubstitute(glyphs.slice(0, 2), 'pref') || wouldSubstitute(glyphs.slice(1, 3), 'pref')) {
    console.log('pref Post_C');
    return POSITIONS.Post_C;
  }

  console.log('Base_C')
  return POSITIONS.Base_C;
}

function initialReordering(font, glyphs) {
  let dottedCircle = font.glyphForCodePoint(0x25cc).id;
  let virama = font.glyphForCodePoint(0x0CCD).id;
  if (virama) {
    let info = new GlyphInfo(font, virama, [0x0CCD]);
    // info.
    for (let i = 0; i < glyphs.length; i++) {
      if (glyphs[i].shaperInfo.position === POSITIONS.Base_C) {
        let consonant = new GlyphInfo(font, glyphs[i].id);
        // TODO: consonant_position_from_face
        glyphs[i].shaperInfo.position = consonantPosition(font, consonant, info);
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

function finalReordering(font, glyphs) {
  for (let start = 0, end = nextSyllable(glyphs, 0); start < glyphs.length; start = end, end = nextSyllable(glyphs, start)) {
    // TODO: virama

    /* 4. Final reordering:
     *
     * After the localized forms and basic shaping forms GSUB features have been
     * applied (see below), the shaping engine performs some final glyph
     * reordering before applying all the remaining font features to the entire
     * cluster.
     */

    console.log(font.availableFeatures);

    let tryPref = false; // TODO

    // Find base again
    let base = start;
    for (; base < end; base++) {
      if (glyphs[base].shaperInfo.position === POSITIONS.Base_C) {
        if (tryPref && base + 1 < end) {
          // TODO
        }

        if (start < base && glyphs[base].shaperInfo.position > POSITIONS.Base_C) {
          base--;
        }

        break;
      }
    }

    if (base === end && start < base && glyphs[base].shaperInfo.category === 'ZWJ') {
      base--;
    }

    if (base < end) {
      while (start < base && (glyphs[base].shaperInfo.category === 'N' || glyphs[base].shaperInfo.category === 'H' || glyphs[base].shaperInfo.category === 'Coeng')) {
        base--;
      }
    }

    /*   o Reorder matras:
     *
     *     If a pre-base matra character had been reordered before applying basic
     *     features, the glyph can be moved closer to the main consonant based on
     *     whether half-forms had been formed. Actual position for the matra is
     *     defined as “after last standalone halant glyph, after initial matra
     *     position and before the main consonant”. If ZWJ or ZWNJ follow this
     *     halant, position is moved after it.
     */

    if (start + 1 < end && start < base) { // Otherwise there can't be any pre-base matra characters.
      // If we lost track of base, alas, position before last thingy.
      let newPos = base === end ? base - 2 : base - 1;

      if (true) { // script != Malayalam && script != Tamil
        while (newPos > start && glyphs[newPos].shaperInfo.category !== 'M' && glyphs[newPos].shaperInfo.category !== 'H' && glyphs[newPos].shaperInfo.category !== 'Coeng') {
          newPos--;
        }

        /* If we found no Halant we are done.
         * Otherwise only proceed if the Halant does
         * not belong to the Matra itself! */
        if ((glyphs[newPos].shaperInfo.category === 'H' || glyphs[newPos].shaperInfo.category === 'Coeng') && glyphs[newPos].shaperInfo.position !== POSITIONS.Pre_M) {
          // If ZWJ or ZWNJ follow this halant, position is moved after it.
          if (newPos + 1 < end && isJoiner(glyphs[newPos + 1])) {
            newPos++;
          }
        } else {
          newPos = start; // No move.
        }
      }

      if (start < newPos && glyphs[newPos].shaperInfo.position !== POSITIONS.Pre_M) {
        // Now go see if there's actually any matras...
        for (let i = newPos; i > start; i--) {
          if (glyphs[i - 1].shaperInfo.position === POSITIONS.Pre_M) {
            let oldPos = i - 1;
            if (oldPos < base && base <= newPos) {
              base--;
            }

            let tmp = glyphs[oldPos];
            glyph.splice(oldPos, 0, ...glyphs.splice(oldPos + 1, newPos - oldPos));
            glyphs[newPos] = tmp;

            newPos--;
          }
        }
      } else {
        // TODO
      }
    }

    /*   o Reorder reph:
     *
     *     Reph’s original position is always at the beginning of the syllable,
     *     (i.e. it is not reordered at the character reordering stage). However,
     *     it will be reordered according to the basic-forms shaping results.
     *     Possible positions for reph, depending on the script, are; after main,
     *     before post-base consonant forms, and after post-base consonant forms.
     */

    /* Two cases:
     *
     * - If repha is encoded as a sequence of characters (Ra,H or Ra,H,ZWJ), then
     *   we should only move it if the sequence ligated to the repha form.
     *
     * - If repha is encoded separately and in the logical position, we should only
     *   move it if it did NOT ligate.  If it ligated, it's probably the font trying
     *   to make it work without the reordering.
     */
    if (start + 1 < end && glyphs[start].shaperInfo.position === POSITIONS.Ra_To_Become_Reph && (glyphs[start].shaperInfo.category === 'Repha') !== glyphs[start].isLigated) {
      let newRephPos;
      let rephPos = POSITIONS.After_Post; // TODO: config

      /*       1. If reph should be positioned after post-base consonant forms,
       *          proceed to step 5.
       */
      if (rephPos === POSITIONS.After_Post) {

      }

      console.log("REPH")
    }

    /*   o Reorder pre-base reordering consonants:
     *
     *     If a pre-base reordering consonant is found, reorder it according to
     *     the following rules:
     */
    if (tryPref && base + 1 < end) {
      // TODO
    }

    // Apply 'init' to the Left Matra if it's a word start.
    if (glyphs[start].shaperInfo.position === POSITIONS.Pre_M && (!start || !['Cf', 'Mn'].includes(unicode.getCategory(glyphs[start - 1].codePoints[0])))) {
      console.log('init');
      glyphs[start].features.init = true;
    }
  }
}

function nextSyllable(glyphs, start) {
  if (start >= glyphs.length) return start;
  let syllable = glyphs[start].shaperInfo.syllable;
  while (++start < glyphs.length && glyphs[start].shaperInfo.syllable === syllable);
  return start;
}
