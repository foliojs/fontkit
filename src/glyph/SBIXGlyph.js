import TTFGlyph from './TTFGlyph';
import r from 'restructure';

let SBIXImage = new r.Struct({
  originX: r.uint16,
  originY: r.uint16,
  type: new r.String(4),
  data: new r.Buffer(function() { return this.parent.buflen - this._currentOffset; })
});

export default class SBIXGlyph extends TTFGlyph {  
  getImageForSize(size) {
    for (let i = 0; i < this._font.sbix.imageTables.length; i++) {
      var table = this._font.sbix.imageTables[i];
      if (table.ppem >= size) { break; }
    }
    
    let offsets = table.imageOffsets;
    let start = offsets[this.id];
    let end = offsets[this.id + 1];
    
    if (start === end) {
      return null;
    }
      
    this._font.stream.pos = start;
    return SBIXImage.decode(this._font.stream, {buflen: end - start});
  }
    
  render(ctx, size) {
    let img = this.getImageForSize(size);
    if (img != null) {
      let scale = size / this._font.unitsPerEm;
      ctx.image(img.data, {height: size, x: img.originX, y: (this.bbox.minY - img.originY) * scale});
    }
      
    if (this._font.sbix.flags.renderOutlines) {
      super.render(ctx, size);
    }
  }
}
