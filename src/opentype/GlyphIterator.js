export default class GlyphIterator {
  constructor(glyphs, options, isSkippable) {
    this.glyphs = glyphs;
    this.isSkippable = isSkippable;
    this.reset(options);
  }

  reset(options = {}, index = 0, markFilteringSet = null) {
    this.options = options;
    this.flags = options.flags || {};
    this.markAttachmentType = options.markAttachmentType || 0;
    this.markFilteringSet = markFilteringSet;
    this.index = index;
  }

  get cur() {
    return this.glyphs[this.index] || null;
  }

  shouldIgnore(glyph) {
    // useMarkFilteringSet (lookup flag 0x10) overrides ignoreMarks and
    // markAttachmentType for marks: a mark is considered only if it is in
    // the filtering set, otherwise it is skipped.
    if (this.flags.useMarkFilteringSet && glyph.isMark) {
      return !this.markFilteringSet?.has(glyph.id);
    }
    return (
      (this.flags.ignoreMarks && glyph.isMark) ||
      (this.flags.ignoreBaseGlyphs && glyph.isBase) ||
      (this.flags.ignoreLigatures && glyph.isLigature) ||
      (this.markAttachmentType &&
        glyph.isMark &&
        glyph.markAttachmentType !== this.markAttachmentType)
    );
  }

  // Like HarfBuzz, skip the default ignorables that the processor allows, e.g. a
  // soft hyphen between a kerning pair, unless `accepts` takes them:
  shouldSkip(glyph, accepts) {
    return (
      this.shouldIgnore(glyph) || (this.isSkippable(glyph) && !accepts?.(glyph))
    );
  }

  move(dir, accepts) {
    this.index += dir;
    while (
      0 <= this.index &&
      this.index < this.glyphs.length &&
      this.shouldSkip(this.glyphs[this.index], accepts)
    ) {
      this.index += dir;
    }

    if (0 > this.index || this.index >= this.glyphs.length) {
      return null;
    }

    return this.glyphs[this.index];
  }

  next(accepts) {
    return this.move(+1, accepts);
  }

  prev() {
    return this.move(-1);
  }

  peek(count = 1) {
    let idx = this.index;
    let res = this.increment(count);
    this.index = idx;
    return res;
  }

  peekIndex(count = 1) {
    let idx = this.index;
    this.increment(count);
    let res = this.index;
    this.index = idx;
    return res;
  }

  // Only the glyph moved to last is one that `accepts` may take:
  increment(count = 1, accepts) {
    let dir = count < 0 ? -1 : 1;
    count = Math.abs(count);
    while (count--) {
      this.move(dir, count === 0 ? accepts : null);
    }

    return this.glyphs[this.index];
  }
}
