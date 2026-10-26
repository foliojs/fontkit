import DefaultShaper from './DefaultShaper';
import { StateMachine } from 'dfa';
import GlyphInfo from '../GlyphInfo';
import { CATEGORIES } from './myanmar-data';
import myanmarMachine from './generated/myanmar.js';

/**
 * Myanmar shaper, ported from HarfBuzz's hb-ot-shaper-myanmar.cc: finds the
 * syllables with myanmar.machine, inserts dotted circles into broken
 * clusters, reorders consonant syllables, and applies the features in
 * HarfBuzz's order. The categories follow HarfBuzz's Myanmar overrides of
 * the Unicode Indic categories.
 */

// Positions — sort order for the post-reordering glyph sequence. Values
// match the relevant subset of HarfBuzz's ot_position_t enum so the
// reordering rules in initial_reordering_consonant_syllable transcribe
// directly. Note that BEFORE_SUB < BELOW_C — anusvara-like A marks
// (categorized as BEFORE_SUB) sort before below-base vowels.
const POS = {
  PRE_M: 2,
  PRE_C: 3,
  BASE_C: 4,
  AFTER_MAIN: 5,
  BEFORE_SUB: 7,
  BELOW_C: 8,
  AFTER_SUB: 9,
};

// Per-codepoint category for the Myanmar block + its extensions. Built
// from the Unicode IndicSyllabicCategory + IndicPositionalCategory plus
// the Microsoft Myanmar overrides; see HarfBuzz's gen-indic-table.py for
// the source of truth. Generated once and inlined here — the data is
// stable across Unicode revisions for the Myanmar blocks.
const CATEGORY_DATA = buildCategoryData();

function buildCategoryData() {
  const data = Object.create(null);
  const set = (cp, cat) => {
    data[cp] = cat;
  };
  const range = (start, end, cat) => {
    for (let cp = start; cp <= end; cp++) data[cp] = cat;
  };

  // ---------- U+1000..U+109F (Myanmar) ----------
  range(0x1000, 0x1003, CATEGORIES.C); // KA..GHA
  set(0x1004, CATEGORIES.Ra); // NGA — forms kinzi
  range(0x1005, 0x1013, CATEGORIES.C); // CA..DHA
  range(0x1014, 0x101a, CATEGORIES.C); // NA..YA
  set(0x101b, CATEGORIES.Ra); // RA
  range(0x101c, 0x1020, CATEGORIES.C); // LA..LLA
  range(0x1021, 0x102a, CATEGORIES.IV); // A..AU (independent vowels)
  range(0x102b, 0x102c, CATEGORIES.VPst); // VOWEL SIGN TALL AA / AA
  range(0x102d, 0x102e, CATEGORIES.VAbv); // VOWEL SIGN I / II
  range(0x102f, 0x1030, CATEGORIES.VBlw); // VOWEL SIGN U / UU
  set(0x1031, CATEGORIES.VPre); // VOWEL SIGN E (left)
  set(0x1032, CATEGORIES.A); // VOWEL SIGN AI (HB override)
  range(0x1033, 0x1035, CATEGORIES.VAbv); // MON II / MON O / E ABOVE
  set(0x1036, CATEGORIES.A); // ANUSVARA (HB override)
  set(0x1037, CATEGORIES.DB); // DOT BELOW (Tone_Mark)
  set(0x1038, CATEGORIES.SM); // VISARGA
  set(0x1039, CATEGORIES.H); // VIRAMA
  set(0x103a, CATEGORIES.As); // ASAT
  set(0x103b, CATEGORIES.MY); // MEDIAL YA
  set(0x103c, CATEGORIES.MR); // MEDIAL RA (pre-base reordering)
  set(0x103d, CATEGORIES.MW); // MEDIAL WA
  set(0x103e, CATEGORIES.MH); // MEDIAL HA
  set(0x103f, CATEGORIES.C); // GREAT SA
  range(0x1040, 0x1049, CATEGORIES.GB); // DIGIT ZERO..NINE
  range(0x104a, 0x104b, CATEGORIES.GB); // LITTLE SECTION, SECTION (as in HB)
  set(0x104e, CATEGORIES.C); // AFOREMENTIONED (HB override)
  range(0x1050, 0x1051, CATEGORIES.C); // SHA / SSA
  range(0x1052, 0x1055, CATEGORIES.IV); // VOCALIC R..LL
  range(0x1056, 0x1057, CATEGORIES.VPst); // VOCALIC R / RR (right)
  range(0x1058, 0x1059, CATEGORIES.VBlw); // VOCALIC L / LL (bottom)
  set(0x105a, CATEGORIES.Ra); // MON NGA
  range(0x105b, 0x105d, CATEGORIES.C); // MON JHA / BBA / BBE
  range(0x105e, 0x105f, CATEGORIES.MY); // MON MEDIAL NA / MA
  set(0x1060, CATEGORIES.ML); // MON MEDIAL LA
  set(0x1061, CATEGORIES.C); // SGAW KAREN SHA
  set(0x1062, CATEGORIES.VPst); // SGAW KAREN EU
  range(0x1063, 0x1064, CATEGORIES.PT); // SGAW KAREN tones
  range(0x1065, 0x1066, CATEGORIES.C); // WESTERN PWO KAREN THA / PWA
  range(0x1067, 0x1068, CATEGORIES.VPst); // WESTERN PWO KAREN EU / UE
  range(0x1069, 0x106d, CATEGORIES.PT); // WESTERN PWO KAREN tones
  range(0x106e, 0x1070, CATEGORIES.C); // EASTERN PWO KAREN consonants
  range(0x1071, 0x1074, CATEGORIES.VAbv); // GEBA / KAYAH vowels
  range(0x1075, 0x1081, CATEGORIES.C); // SHAN consonants
  set(0x1082, CATEGORIES.MW); // SHAN MEDIAL WA
  set(0x1083, CATEGORIES.VPst); // SHAN AA
  set(0x1084, CATEGORIES.VPre); // SHAN E (left)
  range(0x1085, 0x1086, CATEGORIES.VAbv); // SHAN E ABOVE / FINAL Y
  range(0x1087, 0x108d, CATEGORIES.SM); // SHAN tones (HB override)
  set(0x108e, CATEGORIES.C); // RUMAI PALAUNG FA
  set(0x108f, CATEGORIES.SM); // RUMAI PALAUNG TONE-5 (HB override)
  range(0x1090, 0x1099, CATEGORIES.GB); // SHAN DIGIT ZERO..NINE
  range(0x109a, 0x109c, CATEGORIES.SM); // KHAMTI / AITON tones (HB override)
  set(0x109d, CATEGORIES.VAbv); // AITON AI

  // ---------- U+A9E0..U+A9FF (Myanmar Extended-B) ----------
  range(0xa9e0, 0xa9e4, CATEGORIES.C); // SHAN GHA..BHA
  set(0xa9e5, CATEGORIES.VAbv); // SHAN SAW
  range(0xa9e7, 0xa9ef, CATEGORIES.C); // TAI LAING NYA..NNA
  range(0xa9f0, 0xa9f9, CATEGORIES.GB); // TAI LAING DIGIT ZERO..NINE
  range(0xa9fa, 0xa9fe, CATEGORIES.C); // TAI LAING LLA..BHA

  // ---------- U+AA60..U+AA7F (Myanmar Extended-A) ----------
  range(0xaa60, 0xaa6f, CATEGORIES.C); // KHAMTI GA..FA
  range(0xaa71, 0xaa73, CATEGORIES.C); // KHAMTI XA / ZA / RA
  range(0xaa74, 0xaa76, CATEGORIES.GB); // KHAMTI logograms
  set(0xaa7a, CATEGORIES.C); // AITON RA
  set(0xaa7b, CATEGORIES.PT); // PAO KAREN TONE
  range(0xaa7c, 0xaa7d, CATEGORIES.SM); // TAI LAING tones (per HB)
  range(0xaa7e, 0xaa7f, CATEGORIES.C); // SHWE PALAUNG CHA / SHA

  // Myanmar Extended-C (U+116D0..U+116E3, Unicode 16) covers PAO KAREN
  // letters/marks. HarfBuzz includes the block in its ALLOWED_BLOCKS for
  // Myanmar categorization (gen-indic-table.py). The codepoints aren't
  // mapped here yet because the unicode-properties package shipped with
  // fontkit predates Unicode 16 and can't categorise them — PAO KAREN
  // runs currently fall through to non_myanmar_cluster. This is a known
  // gap; the script is rare in real text.

  // ---------- Non-Myanmar codepoints used inside Myanmar runs ----------
  set(0x00a0, CATEGORIES.GB); // NO-BREAK SPACE
  set(0x00d7, CATEGORIES.GB); // MULTIPLICATION SIGN
  range(0x2012, 0x2015, CATEGORIES.GB); // FIGURE DASH..HORIZONTAL BAR
  set(0x2022, CATEGORIES.GB); // BULLET
  set(0x25cc, CATEGORIES.DOTTEDCIRCLE); // DOTTED CIRCLE
  range(0x25fb, 0x25fe, CATEGORIES.GB); // GEOMETRIC SHAPES placeholders

  set(0x200c, CATEGORIES.ZWNJ);
  set(0x200d, CATEGORIES.ZWJ);

  // Variation selectors (Myanmar grammar uses them as VS).
  range(0xfe00, 0xfe0f, CATEGORIES.VS);

  return data;
}

function lookupCategory(cp) {
  const cat = CATEGORY_DATA[cp];
  return cat === undefined ? CATEGORIES.X : cat;
}

class MyanmarInfo {
  constructor(category, position, syllableType, syllable) {
    this.category = category;
    this.position = position;
    this.syllableType = syllableType;
    this.syllable = syllable;
  }
}

// Consonant-like categories that act as a base.
const CONSONANT_FLAGS = new Set([
  CATEGORIES.C,
  CATEGORIES.CS,
  CATEGORIES.Ra,
  CATEGORIES.IV,
  CATEGORIES.GB,
  CATEGORIES.DOTTEDCIRCLE,
]);

function isConsonant(info) {
  return CONSONANT_FLAGS.has(info.category);
}

export default class MyanmarShaper extends DefaultShaper {
  static zeroMarkWidths = 'BEFORE_GPOS';

  static planFeatures(plan) {
    plan.addStage(setupSyllables);

    plan.addStage(['locl', 'ccmp']);

    plan.addStage(reorderMyanmar);

    // Unlike Indic, HarfBuzz applies the basic features to all glyphs, each
    // in its own stage, then the other features together
    for (let feature of ['rphf', 'pref', 'blwf', 'pstf']) {
      plan.addStage(feature);
    }
    plan.addStage(['pres', 'abvs', 'blws', 'psts']);
  }
}

const stateMachine = new StateMachine(myanmarMachine);

// Where syllable types tie on length, HarfBuzz takes the first one listed
const SYLLABLE_TYPES = [
  'consonant_syllable',
  'non_myanmar_cluster',
  'broken_cluster',
];

function setupSyllables(font, glyphs) {
  let categories = glyphs.map((glyph) => lookupCategory(glyph.codePoints[0]));
  let syllable = 0;
  let setInfo = (start, end, syllableType) => {
    ++syllable;
    for (let i = start; i < end; i++) {
      glyphs[i].shaperInfo = new MyanmarInfo(
        categories[i],
        0,
        syllableType,
        syllable,
      );
    }
  };

  // Like HarfBuzz, any glyph outside a syllable is a cluster of its own
  let last = 0;
  for (let [start, end, tags] of stateMachine.match(categories)) {
    for (let i = last; i < start; i++) {
      setInfo(i, i + 1, 'non_myanmar_cluster');
    }
    setInfo(
      start,
      end + 1,
      SYLLABLE_TYPES.find((type) => tags.includes(type)),
    );
    last = end + 1;
  }
  for (let i = last; i < glyphs.length; i++) {
    setInfo(i, i + 1, 'non_myanmar_cluster');
  }
}

function reorderMyanmar(font, glyphs, plan) {
  const dottedCircleGlyph = font.glyphForCodePoint(0x25cc);
  if (dottedCircleGlyph) {
    insertDottedCircles(font, glyphs, dottedCircleGlyph.id);
  }

  let start = 0;
  while (start < glyphs.length) {
    const end = nextSyllable(glyphs, start);
    const type = glyphs[start].shaperInfo.syllableType;
    if (type === 'consonant_syllable' || type === 'broken_cluster') {
      reorderConsonantSyllable(glyphs, start, end);
    }
    start = end;
  }
}

function insertDottedCircles(font, glyphs, dottedCircleId) {
  for (let i = 0; i < glyphs.length; i++) {
    if (glyphs[i].shaperInfo.syllableType !== 'broken_cluster') continue;

    // HarfBuzz inserts the dotted circle at the very start of the
    // broken cluster (its `hb_syllabic_insert_dotted_circles` call for
    // Myanmar passes no repha_category, so the kinzi-skipping path is
    // not taken). Insert at `start` regardless of any leading kinzi.
    const start = i;
    const insertAt = start;

    const syllable = glyphs[start].shaperInfo.syllable;
    // Like HarfBuzz, give it the features of the glyph it precedes
    const g = new GlyphInfo(
      font,
      dottedCircleId,
      [0x25cc],
      glyphs[start].features,
    );
    g.shaperInfo = new MyanmarInfo(
      CATEGORIES.DOTTEDCIRCLE,
      0,
      'broken_cluster',
      syllable,
    );

    glyphs.splice(insertAt, 0, g);

    // Skip past the rest of the syllable.
    i = insertAt;
    while (i < glyphs.length && glyphs[i].shaperInfo.syllable === syllable) {
      i++;
    }
    i--; // Compensate for the loop's `i++`.
  }
}

function nextSyllable(glyphs, start) {
  if (start >= glyphs.length) return start;
  const syllable = glyphs[start].shaperInfo.syllable;
  while (
    ++start < glyphs.length &&
    glyphs[start].shaperInfo.syllable === syllable
  );
  return start;
}

// Direct port of HarfBuzz's initial_reordering_consonant_syllable.
function reorderConsonantSyllable(glyphs, start, end) {
  let base = end;
  let hasReph = false;
  let limit = start;

  // 1. Detect a kinzi prefix Ra+As+H and exclude it from base search.
  if (
    start + 3 <= end &&
    glyphs[start].shaperInfo.category === CATEGORIES.Ra &&
    glyphs[start + 1].shaperInfo.category === CATEGORIES.As &&
    glyphs[start + 2].shaperInfo.category === CATEGORIES.H
  ) {
    limit += 3;
    base = start;
    hasReph = true;
  }

  // 2. Find the first consonant in [limit, end) — that's the base.
  if (!hasReph) base = limit;
  for (let i = limit; i < end; i++) {
    if (isConsonant(glyphs[i].shaperInfo)) {
      base = i;
      break;
    }
  }

  // 3. Assign positions. The kinzi prefix goes AFTER_MAIN; anything
  //    else before base is PRE_C; base is BASE_C.
  let i = start;
  for (; i < start + (hasReph ? 3 : 0); i++) {
    glyphs[i].shaperInfo.position = POS.AFTER_MAIN;
  }
  for (; i < base; i++) {
    glyphs[i].shaperInfo.position = POS.PRE_C;
  }
  if (i < end) {
    glyphs[i].shaperInfo.position = POS.BASE_C;
    i++;
  }

  // 4. Walk forward from base, assigning positions for everything
  //    after the base. This loop implements the entirety of HarfBuzz's
  //    Myanmar reordering — the position transitions encode the spec.
  let pos = POS.AFTER_MAIN;
  for (; i < end; i++) {
    const info = glyphs[i].shaperInfo;

    if (info.category === CATEGORIES.MR) {
      info.position = POS.PRE_C; // pre-base reordering
      continue;
    }
    if (info.category === CATEGORIES.VPre) {
      info.position = POS.PRE_M; // left matra
      continue;
    }
    if (info.category === CATEGORIES.VS) {
      info.position = glyphs[i - 1].shaperInfo.position;
      continue;
    }

    if (pos === POS.AFTER_MAIN && info.category === CATEGORIES.VBlw) {
      pos = POS.BELOW_C;
      info.position = pos;
      continue;
    }

    if (pos === POS.BELOW_C && info.category === CATEGORIES.A) {
      info.position = POS.BEFORE_SUB;
      continue;
    }
    if (pos === POS.BELOW_C && info.category === CATEGORIES.VBlw) {
      info.position = pos;
      continue;
    }
    if (pos === POS.BELOW_C && info.category !== CATEGORIES.A) {
      pos = POS.AFTER_SUB;
      info.position = pos;
      continue;
    }

    info.position = pos;
  }

  // 5. Stable sort the syllable by position. Stable so that equal
  //    positions preserve their relative order.
  const slice = glyphs.slice(start, end);
  const indexed = slice.map((g, idx) => ({ g, idx }));
  indexed.sort((a, b) => {
    const d = a.g.shaperInfo.position - b.g.shaperInfo.position;
    return d !== 0 ? d : a.idx - b.idx;
  });
  for (let j = 0; j < indexed.length; j++) {
    glyphs[start + j] = indexed[j].g;
  }

  // 6. Flip the left-matra run. If multiple VPre marks ended up
  //    adjacent (with possible VS interleaved), they need to be in
  //    reversed input order — but each VPre's trailing VS should still
  //    follow the VPre, so we re-reverse each VPre..VPre slice.
  //    See https://github.com/harfbuzz/harfbuzz/issues/3863.
  let firstLeftMatra = end;
  let lastLeftMatra = end;
  for (let j = start; j < end; j++) {
    if (glyphs[j].shaperInfo.position === POS.PRE_M) {
      if (firstLeftMatra === end) firstLeftMatra = j;
      lastLeftMatra = j;
    }
  }

  if (firstLeftMatra < lastLeftMatra) {
    reverseRange(glyphs, firstLeftMatra, lastLeftMatra + 1);
    let k = firstLeftMatra;
    for (let j = k; j <= lastLeftMatra; j++) {
      if (glyphs[j].shaperInfo.category === CATEGORIES.VPre) {
        reverseRange(glyphs, k, j + 1);
        k = j + 1;
      }
    }
  }
}

function reverseRange(glyphs, start, end) {
  for (let i = start, j = end - 1; i < j; i++, j--) {
    const tmp = glyphs[i];
    glyphs[i] = glyphs[j];
    glyphs[j] = tmp;
  }
}
