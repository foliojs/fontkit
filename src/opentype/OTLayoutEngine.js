import ShapingPlan from './ShapingPlan';
import * as Shapers from './shapers';
import GlyphInfo from './GlyphInfo';
import GSUBProcessor from './GSUBProcessor';
import GPOSProcessor from './GPOSProcessor';

export default class OTLayoutEngine {
  constructor(font) {
    this.font = font;
    this.glyphInfos = null;
    this.plan = null;
    this.GSUBProcessor = null;
    this.GPOSProcessor = null;

    if (font.GSUB) {
      this.GSUBProcessor = new GSUBProcessor(font, font.GSUB);
    }

    if (font.GPOS) {
      this.GPOSProcessor = new GPOSProcessor(font, font.GPOS);
    }
  }

  setup(glyphs, features, script, language) {
    // Map glyphs to GlyphInfo objects so data can be passed between
    // GSUB and GPOS without mutating the real (shared) Glyph objects.
    this.glyphInfos = glyphs.map(glyph => new GlyphInfo(glyph.id, [...glyph.codePoints]));

    // Choose a shaper based on the script, and setup a shaping plan.
    // This determines which features to apply to which glyphs.
    let shaper = Shapers.choose(script);
    this.plan = new ShapingPlan(this.font, script, language);
    return shaper.plan(this.plan, this.glyphInfos, features);
  }

  substitute(glyphs) {
    if (this.GSUBProcessor) {
      this.plan.process(this.GSUBProcessor, this.glyphInfos);

      // Map glyph infos back to normal Glyph objects
      glyphs = this.glyphInfos.map(glyphInfo => this.font.getGlyph(glyphInfo.id, glyphInfo.codePoints));
    }

    return glyphs;
  }

  position(glyphs, positions) {
    if (this.GPOSProcessor) {
      this.plan.process(this.GPOSProcessor, this.glyphInfos, positions);
    }

    // Reverse the glyphs and positions if the script is right-to-left
    if (this.plan.direction === 'rtl') {
      glyphs.reverse();
      positions.reverse();
    }

    return this.GPOSProcessor && this.GPOSProcessor.features;
  }

  cleanup() {
    this.glyphInfos = null;
    this.plan = null;
  }

  getAvailableFeatures(script, language) {
    let features = [];

    if (this.GSUBProcessor) {
      this.GSUBProcessor.selectScript(script, language);
      features.push(...Object.keys(this.GSUBProcessor.features));
    }

    if (this.GPOSProcessor) {
      this.GPOSProcessor.selectScript(script, language);
      features.push(...Object.keys(this.GPOSProcessor.features));
    }

    return features;
  }
}
