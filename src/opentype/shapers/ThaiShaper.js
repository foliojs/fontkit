import DefaultShaper from './DefaultShaper';
import GlyphInfo from '../GlyphInfo';

/**
 * Thai / Lao shaper, ported from HarfBuzz's hb-ot-shaper-thai.cc.
 *
 *   1. SARA AM decomposition + NIKHAHIT reorder (always-on)
 *   2. PUA fallback shaping for legacy fonts without Thai GSUB
 *
 * Step 1 is needed by every modern Thai font — without it the GSUB chain
 * rules for tone-mark shifting (e.g. `uni0E49.small`) never fire because
 * the buffer ends up with `[base, tone, NIKHAHIT, SARA AA]` instead of
 * `[base, NIKHAHIT, tone, SARA AA]`.
 *
 *   SARA AM (U+0E33)  -> NIKHAHIT (U+0E4D) + SARA AA (U+0E32)
 *   Lao SARA AM (U+0EB3) -> NIKHAHIT (U+0ECD) + SARA AA (U+0EB2)
 *
 * The NIKHAHIT then walks backward over any above-base marks so it sits
 * between the base and the existing tone-mark stack.
 *
 *   <0E14, 0E4B, 0E33> -> <0E14, 0E4D, 0E4B, 0E32>
 *
 * Step 2 walks an above/below state machine and remaps tone marks to PUA
 * codepoints when the font ships those (older Microsoft / Apple Thai
 * fonts). Modern fonts with GSUB don't need this; HarfBuzz gates it on
 * the absence of Thai GSUB and so do we.
 */
export default class ThaiShaper extends DefaultShaper {
  static assignFeatures(plan, glyphs) {
    super.assignFeatures(plan, glyphs);
    preprocessThai(glyphs, plan.font);
    if (plan.script === 'thai' && !hasThaiGsub(plan.font)) {
      applyThaiPuaShaping(glyphs, plan.font);
    }
  }
}

// Thai SARA AM is U+0E33; Lao SARA AM is U+0EB3 — they only differ in the
// 0x80 bit so HarfBuzz uses a script-agnostic mask. We do the same.
function isSaraAm(u) {
  return (u & ~0x0080) === 0x0E33;
}

function nikhahitFromSaraAm(u) {
  return u - 0x0E33 + 0x0E4D;
}

function saraAaFromSaraAm(u) {
  return u - 1;
}

// Marks that sit above the base. The script-agnostic mask applies the
// same set for both Thai and Lao (Lao codepoints are offset by 0x80).
//   Thai: U+0E31, U+0E34..U+0E37, U+0E47..U+0E4E, U+0E3B
//   Lao:  U+0EB1, U+0EB4..U+0EB7, U+0EC8..U+0ECE, U+0EBB
function isAboveBaseMark(u) {
  const c = u & ~0x0080;
  return c === 0x0E31
    || (c >= 0x0E34 && c <= 0x0E37)
    || (c >= 0x0E47 && c <= 0x0E4E)
    || c === 0x0E3B;
}

function preprocessThai(glyphs, font) {
  let i = 0;
  while (i < glyphs.length) {
    const u = glyphs[i].codePoints[0];
    if (!isSaraAm(u)) {
      i++;
      continue;
    }

    // Decompose SARA AM in place into NIKHAHIT + SARA AA. Both new
    // glyphs inherit the original GlyphInfo's feature flags.
    const features = glyphs[i].features;
    const nikhahit = makeGlyph(font, nikhahitFromSaraAm(u), features);
    const saraAa = makeGlyph(font, saraAaFromSaraAm(u), features);
    glyphs.splice(i, 1, nikhahit, saraAa);

    // Walk the NIKHAHIT backward over any above-base marks belonging to
    // the same base.
    let nikhahitIndex = i;
    let target = nikhahitIndex;
    while (target > 0 && isAboveBaseMark(glyphs[target - 1].codePoints[0])) {
      target--;
    }
    if (target !== nikhahitIndex) {
      const moved = glyphs.splice(nikhahitIndex, 1)[0];
      glyphs.splice(target, 0, moved);
    }

    // Advance past NIKHAHIT + SARA AA.
    i += 2;
  }
}

function makeGlyph(font, codePoint, features) {
  const id = font.glyphForCodePoint(codePoint).id;
  return new GlyphInfo(font, id, [codePoint], features);
}

// ── PUA fallback shaping ────────────────────────────────────────────────
//
// Walks an above-base state machine and a below-base state machine in
// parallel. Each tone/vowel mark may trigger one of the following
// actions:
//
//   NOP — leave the glyph alone
//   SD  — shift the mark DOWN to clear a descender
//   SL  — shift the mark LEFT to clear another above-base mark
//   SDL — shift the mark DOWN-LEFT (both)
//   RD  — remove the descender from the BASE consonant
//
// Each action is realised by replacing the mark (or base) codepoint with
// a private-use mapping, when the font ships that PUA glyph.

const NOP = 0;
const SD = 1;
const SL = 2;
const SDL = 3;
const RD = 4;

// Consonant types
const NC = 0; // normal consonant
const AC = 1; // consonant with ascender (1B/1D/1F)
const RC = 2; // consonant with removable descender (0D/10)
const DC = 3; // consonant with strict descender (0E/0F)
const NOT_CONSONANT = 4;

// Mark types
const AV = 0; // above-base vowel/mark
const BV = 1; // below-base vowel/mark
const T = 2;  // tone mark
const NOT_MARK = 3;

function getConsonantType(u) {
  if (u === 0x0E1B || u === 0x0E1D || u === 0x0E1F) return AC;
  if (u === 0x0E0D || u === 0x0E10) return RC;
  if (u === 0x0E0E || u === 0x0E0F) return DC;
  if (u >= 0x0E01 && u <= 0x0E2E) return NC;
  return NOT_CONSONANT;
}

function getMarkType(u) {
  if (
    u === 0x0E31 ||
    (u >= 0x0E34 && u <= 0x0E37) ||
    u === 0x0E47 ||
    (u >= 0x0E4D && u <= 0x0E4E)
  ) {
    return AV;
  }
  if (u >= 0x0E38 && u <= 0x0E3A) return BV;
  if (u >= 0x0E48 && u <= 0x0E4C) return T;
  return NOT_MARK;
}

// Above-base cluster state (T0..T3 = increasing stack height).
const T0 = 0, T1 = 1, T2 = 2, T3 = 3;
const ABOVE_START_STATE = [T0, T1, T0, T0, T3];
//                         NC  AC  RC  DC  NOT_CONSONANT
const ABOVE_STATE_MACHINE = [
  // AV          BV          T
  [[NOP, T3], [NOP, T0], [SD, T3]],   // T0
  [[SL, T2],  [NOP, T1], [SDL, T2]],  // T1
  [[NOP, T3], [NOP, T2], [SL, T3]],   // T2
  [[NOP, T3], [NOP, T3], [NOP, T3]]   // T3
];

// Below-base state (B0=none, B1=removable, B2=strict).
const B0 = 0, B1 = 1, B2 = 2;
const BELOW_START_STATE = [B0, B0, B1, B2, B2];
//                         NC  AC  RC  DC  NOT_CONSONANT
const BELOW_STATE_MACHINE = [
  // AV          BV          T
  [[NOP, B0], [NOP, B2], [NOP, B0]],  // B0
  [[NOP, B1], [RD, B2],  [NOP, B1]],  // B1
  [[NOP, B2], [SD, B2],  [NOP, B2]]   // B2
];

// PUA mappings (Windows and Mac private-use codepoints for shifted marks
// and descender-less base consonants). For each action we try the
// Windows PUA first, then the Mac PUA, then leave the codepoint alone.
const PUA_MAPPINGS = {
  [SD]: [
    [0x0E48, 0xF70A, 0xF88B], // MAI EK
    [0x0E49, 0xF70B, 0xF88E], // MAI THO
    [0x0E4A, 0xF70C, 0xF891], // MAI TRI
    [0x0E4B, 0xF70D, 0xF894], // MAI CHATTAWA
    [0x0E4C, 0xF70E, 0xF897], // THANTHAKHAT
    [0x0E38, 0xF718, 0xF89B], // SARA U
    [0x0E39, 0xF719, 0xF89C], // SARA UU
    [0x0E3A, 0xF71A, 0xF89D]  // PHINTHU
  ],
  [SDL]: [
    [0x0E48, 0xF705, 0xF88C], // MAI EK
    [0x0E49, 0xF706, 0xF88F], // MAI THO
    [0x0E4A, 0xF707, 0xF892], // MAI TRI
    [0x0E4B, 0xF708, 0xF895], // MAI CHATTAWA
    [0x0E4C, 0xF709, 0xF898]  // THANTHAKHAT
  ],
  [SL]: [
    [0x0E48, 0xF713, 0xF88A], // MAI EK
    [0x0E49, 0xF714, 0xF88D], // MAI THO
    [0x0E4A, 0xF715, 0xF890], // MAI TRI
    [0x0E4B, 0xF716, 0xF893], // MAI CHATTAWA
    [0x0E4C, 0xF717, 0xF896], // THANTHAKHAT
    [0x0E31, 0xF710, 0xF884], // MAI HAN-AKAT
    [0x0E34, 0xF701, 0xF885], // SARA I
    [0x0E35, 0xF702, 0xF886], // SARA II
    [0x0E36, 0xF703, 0xF887], // SARA UE
    [0x0E37, 0xF704, 0xF888], // SARA UEE
    [0x0E47, 0xF712, 0xF889], // MAITAIKHU
    [0x0E4D, 0xF711, 0xF899]  // NIKHAHIT
  ],
  [RD]: [
    [0x0E0D, 0xF70F, 0xF89A], // YO YING
    [0x0E10, 0xF700, 0xF89E]  // THO THAN
  ]
};

function thaiPuaShape(u, action, font) {
  if (action === NOP) return u;
  const mappings = PUA_MAPPINGS[action];
  if (!mappings) return u;
  for (const [orig, winPua, macPua] of mappings) {
    if (orig !== u) continue;
    if (font.hasGlyphForCodePoint(winPua)) return winPua;
    if (font.hasGlyphForCodePoint(macPua)) return macPua;
    break;
  }
  return u;
}

function applyThaiPuaShaping(glyphs, font) {
  let aboveState = ABOVE_START_STATE[NOT_CONSONANT];
  let belowState = BELOW_START_STATE[NOT_CONSONANT];
  let baseIndex = 0;

  for (let i = 0; i < glyphs.length; i++) {
    const u = glyphs[i].codePoints[0];
    const mt = getMarkType(u);

    if (mt === NOT_MARK) {
      const ct = getConsonantType(u);
      aboveState = ABOVE_START_STATE[ct];
      belowState = BELOW_START_STATE[ct];
      baseIndex = i;
      continue;
    }

    const [aboveAction, aboveNext] = ABOVE_STATE_MACHINE[aboveState][mt];
    const [belowAction, belowNext] = BELOW_STATE_MACHINE[belowState][mt];
    aboveState = aboveNext;
    belowState = belowNext;

    // At least one of the two actions is NOP; the other wins.
    const action = aboveAction !== NOP ? aboveAction : belowAction;
    if (action === NOP) continue;

    if (action === RD) {
      const target = glyphs[baseIndex];
      const newCp = thaiPuaShape(target.codePoints[0], action, font);
      if (newCp !== target.codePoints[0]) {
        target.id = font.glyphForCodePoint(newCp).id;
        target.codePoints = [newCp];
      }
    } else {
      const target = glyphs[i];
      const newCp = thaiPuaShape(u, action, font);
      if (newCp !== u) {
        target.id = font.glyphForCodePoint(newCp).id;
        target.codePoints = [newCp];
      }
    }
  }
}

// HarfBuzz gates PUA shaping on the font lacking a Thai GSUB script
// (`plan->map.found_script[0]` is false). For fontkit we check whether
// the GSUB script list contains `thai` or `thai2`.
function hasThaiGsub(font) {
  const gsub = font.GSUB;
  if (!gsub || !gsub.scriptList) return false;
  return gsub.scriptList.some(entry => entry.tag === 'thai' || entry.tag === 'tha2');
}
