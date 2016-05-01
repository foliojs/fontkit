import BBox from '../glyph/BBox';

export default class GlyphRun {
  constructor(glyphs, positions) {
    this.glyphs = glyphs;
    this.positions = positions;
  }
    
  get advanceWidth() {
    let width = 0;
    for (let position of this.positions) {
      width += position.xAdvance;
    }
      
    return width;
  }
    
  get advanceHeight() {
    let height = 0;
    for (let position of this.positions) {
      height += position.yAdvance;
    }
      
    return height;
  }
      
  get bbox() {
    let bbox = new BBox;
    
    let x = 0;
    let y = 0;
    for (let index = 0; index < this.glyphs.length; index++) {
      let glyph = this.glyphs[index];
      let p = this.positions[index];
      let b = glyph.bbox;
      
      bbox.addPoint(b.minX + x + p.xOffset, b.minY + y + p.yOffset);
      bbox.addPoint(b.maxX + x + p.xOffset, b.maxY + y + p.yOffset);
      
      x += p.xAdvance;
      y += p.yAdvance;
    }
      
    return bbox;
  }
}
