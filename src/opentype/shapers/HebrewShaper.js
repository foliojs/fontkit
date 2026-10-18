import { getCombiningClass } from 'unicode-properties';
import DefaultShaper from './DefaultShaper';

/**
 * Hebrew shaper, ported from HarfBuzz's hb-ot-shaper-hebrew.cc.
 *
 *   - Compose Hebrew presentation forms not covered by canonical Unicode
 *     normalisation (base letter + nikud → FBxx range) when the font ships
 *     them. Only applied when the font lacks GPOS mark positioning for the
 *     Hebrew script, matching HarfBuzz's `has_gpos_mark` gate — modern
 *     fonts with GPOS marks should position the unprecomposed sequence.
 *   - Reorder the patah/qamats + sheva/hiriq + meteg/below combining-mark
 *     triplet so meteg / below marks settle next to the base, matching
 *     HarfBuzz's `reorder_marks_hebrew`.
 */
export default class HebrewShaper extends DefaultShaper {
  static assignFeatures(plan, glyphs) {
    super.assignFeatures(plan, glyphs);

    if (!hasGposMark(plan.font)) {
      composeHebrew(glyphs, plan.font);
    }
    reorderMarksHebrew(glyphs);
  }
}

// Hebrew presentation forms with dagesh, for letters U+05D0..U+05EA.
// Letters without an encoded precomposed dagesh form (HET, FINAL MEM,
// FINAL NUN, AYIN, FINAL TSADI) are omitted — `composeHebrewPair` will
// return `null` for them via the table lookup.
const DAGESH_FORMS = {
  0x05d0: 0xfb30, // ALEF
  0x05d1: 0xfb31, // BET
  0x05d2: 0xfb32, // GIMEL
  0x05d3: 0xfb33, // DALET
  0x05d4: 0xfb34, // HE
  0x05d5: 0xfb35, // VAV
  0x05d6: 0xfb36, // ZAYIN
  0x05d8: 0xfb38, // TET
  0x05d9: 0xfb39, // YOD
  0x05da: 0xfb3a, // FINAL KAF
  0x05db: 0xfb3b, // KAF
  0x05dc: 0xfb3c, // LAMED
  0x05de: 0xfb3e, // MEM
  0x05e0: 0xfb40, // NUN
  0x05e1: 0xfb41, // SAMEKH
  0x05e3: 0xfb43, // FINAL PE
  0x05e4: 0xfb44, // PE
  0x05e6: 0xfb46, // TSADI
  0x05e7: 0xfb47, // QOF
  0x05e8: 0xfb48, // RESH
  0x05e9: 0xfb49, // SHIN
  0x05ea: 0xfb4a, // TAV
};

// Return the precomposed Hebrew presentation form for `a + b`, or null.
// Mirrors the switch in HarfBuzz's compose_hebrew.
function composeHebrewPair(a, b) {
  switch (b) {
    case 0x05b4: // HIRIQ
      if (a === 0x05d9) return 0xfb1d; // YOD WITH HIRIQ
      return null;
    case 0x05b7: // PATAH
      if (a === 0x05f2) return 0xfb1f; // YIDDISH YOD YOD WITH PATAH
      if (a === 0x05d0) return 0xfb2e; // ALEF WITH PATAH
      return null;
    case 0x05b8: // QAMATS
      if (a === 0x05d0) return 0xfb2f; // ALEF WITH QAMATS
      return null;
    case 0x05b9: // HOLAM
      if (a === 0x05d5) return 0xfb4b; // VAV WITH HOLAM
      return null;
    case 0x05bc: // DAGESH
      if (a >= 0x05d0 && a <= 0x05ea) return DAGESH_FORMS[a] || null;
      if (a === 0xfb2a) return 0xfb2c; // SHIN WITH SHIN DOT
      if (a === 0xfb2b) return 0xfb2d; // SHIN WITH SIN DOT
      return null;
    case 0x05bf: // RAFE
      if (a === 0x05d1) return 0xfb4c; // BET WITH RAFE
      if (a === 0x05db) return 0xfb4d; // KAF WITH RAFE
      if (a === 0x05e4) return 0xfb4e; // PE WITH RAFE
      return null;
    case 0x05c1: // SHIN DOT (ABOVE LEFT)
      if (a === 0x05e9) return 0xfb2a; // SHIN WITH SHIN DOT
      if (a === 0xfb49) return 0xfb2c; // SHIN WITH DAGESH AND SHIN DOT
      return null;
    case 0x05c2: // SIN DOT (ABOVE RIGHT)
      if (a === 0x05e9) return 0xfb2b; // SHIN WITH SIN DOT
      if (a === 0xfb49) return 0xfb2d; // SHIN WITH DAGESH AND SIN DOT
      return null;
    default:
      return null;
  }
}

// Compose adjacent (base + nikud) pairs greedily, chaining through any
// run of marks the font supports. Each iteration tries to grow the
// composition at index `i` by one more codepoint until no further match
// exists (e.g. SHIN + SHIN_DOT first composes to FB2A, then FB2A +
// DAGESH composes to FB2C).
function composeHebrew(glyphs, font) {
  let i = 0;
  while (i + 1 < glyphs.length) {
    let composed = glyphs[i].codePoints[0];
    let consumed = 1;
    while (i + consumed < glyphs.length) {
      const b = glyphs[i + consumed].codePoints[0];
      const ab = composeHebrewPair(composed, b);
      if (ab == null || !font.hasGlyphForCodePoint(ab)) break;
      composed = ab;
      consumed++;
    }
    if (consumed > 1) {
      let cps = [];
      for (let j = 0; j < consumed; j++)
        cps = cps.concat(glyphs[i + j].codePoints);
      glyphs[i].id = font.glyphForCodePoint(composed).id;
      glyphs[i].codePoints = cps;
      glyphs.splice(i + 1, consumed - 1);
    }
    i++;
  }
}

// Hebrew codepoint sets used by the reorder rule. Detecting by codepoint
// (rather than HarfBuzz's modified combining class) lets us fire on both
// canonical NFC input (sheva/hiriq → patah/qamats → meteg) and on HB's
// post-modified-sort order (patah/qamats → sheva/hiriq → meteg); the rule
// catches the triplet regardless of how the host normalised the marks.
function isPatahOrQamats(cp) {
  return cp === 0x05b7 || cp === 0x05b8;
}
function isShevaOrHiriq(cp) {
  return cp === 0x05b0 || cp === 0x05b4;
}
function isMetegOrBelow(cp) {
  if (cp === 0x05bd) return true; // meteg
  const ccc = getCombiningClass(cp);
  // Hebrew taamim below the base: covers CCC=220 (Below) and the
  // attached/below-right classes used by U+059A/U+05AD etc.
  return (
    ccc === 'Below' ||
    ccc === 'Below_Right' ||
    ccc === 'Below_Left' ||
    ccc === 'Attached_Below'
  );
}

// Per `reorder_marks_hebrew`: when a patah/qamats, sheva/hiriq and
// meteg/below taam appear together as the last three marks of a syllable,
// reorder them so the meteg settles next to the base. The rule fires for
// any permutation of the three — HarfBuzz reaches this state after its
// modified-CCC normalisation, fontkit reaches it directly from NFC.
function reorderMarksHebrew(glyphs) {
  for (let i = 2; i < glyphs.length; i++) {
    const triplet = [glyphs[i - 2], glyphs[i - 1], glyphs[i]];
    const cps = triplet.map((g) => g.codePoints[0]);
    if (
      cps.some((cp) => isPatahOrQamats(cp)) &&
      cps.some((cp) => isShevaOrHiriq(cp)) &&
      cps.some((cp) => isMetegOrBelow(cp))
    ) {
      // Settle to [patah/qamats, meteg/below, sheva/hiriq] — the order
      // HarfBuzz emits after its swap.
      const patah = triplet.find((g) => isPatahOrQamats(g.codePoints[0]));
      const sheva = triplet.find((g) => isShevaOrHiriq(g.codePoints[0]));
      const meteg = triplet.find((g) => isMetegOrBelow(g.codePoints[0]));
      glyphs[i - 2] = patah;
      glyphs[i - 1] = meteg;
      glyphs[i] = sheva;
      break;
    }
  }
}

// HarfBuzz gates the Hebrew presentation-form fallback on `!has_gpos_mark`
// (set when the active script's GPOS has a `mark` feature). We mirror that
// by inspecting the Hebrew script's feature indexes specifically, not the
// global featureList — a font with `mark` under `latn` but not `hebr` must
// still get the fallback composition.
function hasGposMark(font) {
  const gpos = font.GPOS;
  if (!gpos || !gpos.scriptList || !gpos.featureList) return false;
  for (const entry of gpos.scriptList) {
    if (entry.tag !== 'hebr') continue;
    const langSyses = [];
    if (entry.script?.defaultLangSys)
      langSyses.push(entry.script.defaultLangSys);
    for (const lang of entry.script?.langSysRecords || []) {
      if (lang.langSys) langSyses.push(lang.langSys);
    }
    for (const langSys of langSyses) {
      for (const featureIndex of langSys.featureIndexes || []) {
        if (gpos.featureList[featureIndex]?.tag === 'mark') return true;
      }
    }
  }
  return false;
}
