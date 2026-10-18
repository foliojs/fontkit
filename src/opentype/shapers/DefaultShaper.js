import { getCombiningClass, isDigit, isMark } from 'unicode-properties';
import GlyphInfo from '../GlyphInfo';

const VARIATION_FEATURES = ['rvrn'];
const COMMON_FEATURES = ['ccmp', 'locl', 'rlig', 'mark', 'mkmk'];
const FRACTIONAL_FEATURES = ['frac', 'numr', 'dnom'];
const HORIZONTAL_FEATURES = ['calt', 'clig', 'liga', 'rclt', 'curs', 'kern'];
const VERTICAL_FEATURES = ['vert'];
const DIRECTIONAL_FEATURES = {
  ltr: ['ltra', 'ltrm'],
  rtl: ['rtla', 'rtlm'],
};

export default class DefaultShaper {
  static zeroMarkWidths = 'AFTER_GPOS';
  static plan(plan, glyphs, features) {
    // Plan the features we want to apply
    this.planPreprocessing(plan);
    this.planFeatures(plan);
    this.planPostprocessing(plan, features);

    // Assign the global features to all the glyphs
    plan.assignGlobalFeatures(glyphs);

    // Assign local features to glyphs
    this.assignFeatures(plan, glyphs);
  }

  static planPreprocessing(plan) {
    plan.add({
      global: [...VARIATION_FEATURES, ...DIRECTIONAL_FEATURES[plan.direction]],
      local: FRACTIONAL_FEATURES,
    });
  }

  static planFeatures(plan) {
    // Do nothing by default. Let subclasses override this.
  }

  static planPostprocessing(plan, userFeatures) {
    plan.add([...COMMON_FEATURES, ...HORIZONTAL_FEATURES]);
    plan.setFeatureOverrides(userFeatures);
  }

  static assignFeatures(plan, glyphs) {
    // Compose canonical equivalents supported by the font before GSUB.
    composeGlyphs(plan.font, glyphs);

    // Enable contextual fractions
    for (let i = 0; i < glyphs.length; i++) {
      let glyph = glyphs[i];
      if (glyph.codePoints[0] === 0x2044) {
        // fraction slash
        let start = i;
        let end = i + 1;

        // Apply numerator
        while (start > 0 && isDigit(glyphs[start - 1].codePoints[0])) {
          glyphs[start - 1].features.numr = true;
          glyphs[start - 1].features.frac = true;
          start--;
        }

        // Apply denominator
        while (end < glyphs.length && isDigit(glyphs[end].codePoints[0])) {
          glyphs[end].features.dnom = true;
          glyphs[end].features.frac = true;
          end++;
        }

        // Apply fraction slash
        glyph.features.frac = true;
        i = end - 1;
      }
    }
  }
}

// Normalize each base + combining-mark cluster using the font's coverage.
// Preserve the order of surviving marks for downstream GSUB lookups.
function composeGlyphs(font, glyphs) {
  let i = 0;
  while (i < glyphs.length) {
    // A cluster starts at a non-mark base glyph...
    if (glyphs[i].codePoints.length !== 1 || isMark(glyphs[i].codePoints[0])) {
      i++;
      continue;
    }
    // ...and extends across the combining marks that follow it.
    let end = i + 1;
    while (
      end < glyphs.length &&
      glyphs[end].codePoints.length === 1 &&
      isMark(glyphs[end].codePoints[0])
    ) {
      end++;
    }
    let input = [];
    for (let j = i; j < end; j++) input.push(glyphs[j].codePoints[0]);
    let composed = composeCodePoints(font, input);
    if (
      composed.length !== input.length ||
      composed.some((cp, index) => cp !== input[index])
    ) {
      // The base's features are global at this stage, so the rebuilt cluster
      // (precomposed base + any leftover marks) inherits them uniformly.
      let features = glyphs[i].features;
      let replacement = composed.map(
        (cp) =>
          new GlyphInfo(font, font.glyphForCodePoint(cp).id, [cp], features),
      );
      glyphs.splice(i, end - i, ...replacement);
    }
    i += composed.length;
  }
}

function composeCodePoints(font, codePoints) {
  // A supported singleton should retain its glyph, including characters
  // excluded from canonical composition whose NFC spelling is different.
  if (codePoints.length === 1 && font.hasGlyphForCodePoint(codePoints[0])) {
    return codePoints;
  }

  let hasGlyph = (part) => font.hasGlyphForCodePoint(part.codePoint);
  let decomposed = [];
  for (let cp of codePoints) {
    let parts = Array.from(String.fromCodePoint(cp).normalize('NFD'), (c) =>
      normalizationChar(c.codePointAt(0)),
    );
    if (!parts.every(hasGlyph)) {
      // Some fonts only provide a partial composition (e.g. ccedilla but
      // no separate cedilla). Do not introduce missing glyphs by decomposing.
      parts = recompose(font, parts);
      if (!parts.every(hasGlyph)) parts = [normalizationChar(cp)];
    }
    for (let part of parts) {
      part.order = decomposed.length;
      decomposed.push(part);
    }
  }

  // Canonical ordering for composition, without moving marks across a starter
  // (class zero, including CGJ). Equal classes retain their relative order.
  for (let i = 1; i < decomposed.length; i++) {
    let current = decomposed[i];
    if (current.combiningClass === 0) continue;
    let j = i;
    while (j > 0 && decomposed[j - 1].combiningClass > current.combiningClass) {
      decomposed[j] = decomposed[j - 1];
      j--;
    }
    decomposed[j] = current;
  }

  // Composition may consume marks, but must not reorder the remaining ones:
  // for example, Amiri's calt expects shadda before a following vowel.
  return recompose(font, decomposed)
    .sort((a, b) => a.order - b.order)
    .map((part) => part.codePoint);
}

function recompose(font, characters) {
  let result = [];
  let starter = 0;
  let lastClass = 0;
  for (let character of characters) {
    let { codePoint, combiningClass } = character;
    if (
      result.length > 0 &&
      isMark(codePoint) &&
      (lastClass === 0 || lastClass < combiningClass)
    ) {
      let composite = Array.from(
        String.fromCodePoint(result[starter].codePoint, codePoint).normalize(
          'NFC',
        ),
        (c) => c.codePointAt(0),
      );
      if (composite.length === 1 && font.hasGlyphForCodePoint(composite[0])) {
        result[starter].codePoint = composite[0];
        continue;
      }
    }
    if (combiningClass === 0) starter = result.length;
    result.push(character);
    lastClass = combiningClass;
  }
  return result;
}

// unicode-properties exposes names; composition blocking needs numeric classes.
const COMBINING_CLASSES = {
  Not_Reordered: 0,
  Overlay: 1,
  Nukta: 7,
  Kana_Voicing: 8,
  Virama: 9,
  Attached_Below_Left: 200,
  Attached_Below: 202,
  Attached_Above: 214,
  Attached_Above_Right: 216,
  Below_Left: 218,
  Below: 220,
  Below_Right: 222,
  Left: 224,
  Right: 226,
  Above_Left: 228,
  Above: 230,
  Above_Right: 232,
  Double_Below: 233,
  Double_Above: 234,
  Iota_Subscript: 240,
};

function normalizationChar(codePoint) {
  let name = getCombiningClass(codePoint);
  let combiningClass = name.startsWith('CCC')
    ? Number(name.slice(3))
    : COMBINING_CLASSES[name];
  return { codePoint, combiningClass };
}
