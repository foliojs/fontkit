import {isDigit, isMark} from 'unicode-properties';
import GlyphInfo from '../GlyphInfo';

const VARIATION_FEATURES = ['rvrn'];
const COMMON_FEATURES = ['ccmp', 'locl', 'rlig', 'mark', 'mkmk'];
const FRACTIONAL_FEATURES = ['frac', 'numr', 'dnom'];
const HORIZONTAL_FEATURES = ['calt', 'clig', 'liga', 'rclt', 'curs', 'kern'];
const VERTICAL_FEATURES = ['vert'];
const DIRECTIONAL_FEATURES = {
  ltr: ['ltra', 'ltrm'],
  rtl: ['rtla', 'rtlm']
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
      local: FRACTIONAL_FEATURES
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
    // Apply Unicode canonical composition (NFC) before GSUB, matching what
    // HarfBuzz does for non-complex scripts: when the font has a precomposed
    // glyph for a base + combining-mark sequence, use it. Decomposed input
    // (e.g. "i" + U+0300) otherwise shapes as separate glyphs ([i, gravecomb])
    // instead of the precomposed glyph the font intends ([igrave]).
    composeGlyphs(plan.font, glyphs);

    // Enable contextual fractions
    for (let i = 0; i < glyphs.length; i++) {
      let glyph = glyphs[i];
      if (glyph.codePoints[0] === 0x2044) { // fraction slash
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

// Apply Unicode canonical composition (NFC) to each base + combining-mark
// cluster, mirroring HarfBuzz's normalization before GSUB/GPOS: the marks are
// reordered by combining class and composed onto the base when the font has a
// precomposed glyph for the result. Without this, decomposed input shapes as
// separate glyphs (e.g. "i" + U+0300 -> [i, gravecomb], or Arabic alef +
// fathatan + hamza-above -> [alef, fathatan, hamza]) instead of the precomposed
// glyph ([igrave]; [alef-with-hamza, fathatan]) HarfBuzz and browsers produce.
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
    // Only rebuild when composition (or its decompose fallback) actually changed
    // the glyph count. NFC also canonically reorders marks, but applying a pure
    // reorder isn't needed to reach a precomposed glyph and would disturb the
    // order downstream GSUB expects (e.g. Arabic shadda + vowel calt lookups).
    if (composed.length !== input.length) {
      // The base's features are global at this stage, so the rebuilt cluster
      // (precomposed base + any leftover marks) inherits them uniformly.
      let features = glyphs[i].features;
      let replacement = composed.map(
        cp => new GlyphInfo(font, font.glyphForCodePoint(cp).id, [cp], features)
      );
      glyphs.splice(i, end - i, ...replacement);
      i += replacement.length;
    } else {
      i = end;
    }
  }
}

// Font-aware Unicode canonical composition for one cluster's codepoints: NFC
// reorders the combining marks by combining class and composes them, then any
// resulting codepoint the font can't render is decomposed again (NFD) so its
// marks stay separate for GPOS mark positioning — exactly HarfBuzz's behaviour.
function composeCodePoints(font, codePoints) {
  let result = [];
  for (let char of String.fromCodePoint(...codePoints).normalize('NFC')) {
    let cp = char.codePointAt(0);
    if (font.hasGlyphForCodePoint(cp)) {
      result.push(cp);
    } else {
      for (let part of char.normalize('NFD')) result.push(part.codePointAt(0));
    }
  }
  return result;
}
