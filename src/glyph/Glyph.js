import Path from './Path';
import unicode from 'unicode-properties';
import StandardNames from './StandardNames';

export default class Glyph {
  constructor(id, codePoints, font) {
    this.id = id;
    this.codePoints = codePoints;
    this._font = font;
    
    // TODO: get this info from GDEF if available
    this.isMark = this.codePoints.every(unicode.isMark);
    this.isLigature = this.codePoints.length > 1;
  }
      
  _getPath() {
    return new Path();
  }
      
  _getCBox() {
    return this.path.cbox;
  }
    
  _getBBox() {
    return this.path.bbox;
  }
    
  _getTableMetrics(table) {
    if (this.id < table.metrics.length) {
      return table.metrics.get(this.id);
    }
    
    let metric = table.metrics.get(table.metrics.length - 1);
    let res = { 
      advance: metric ? metric.advance : 0,
      bearing: table.bearings.get(this.id - table.metrics.length) || 0
    };
      
    return res;
  }
    
  _getMetrics(cbox) {
    if (this._metrics) { return this._metrics; }
      
    let {advance:advanceWidth, bearing:leftBearing} = this._getTableMetrics(this._font.hmtx);
    
    // For vertical metrics, use vmtx if available, or fall back to global data from OS/2 or hhea
    if (this._font.vmtx) {
      var {advance:advanceHeight, bearing:topBearing} = this._getTableMetrics(this._font.vmtx);
      
    } else {
      let os2;
      if (typeof cbox === 'undefined' || cbox === null) { ({ cbox } = this); }
      
      if ((os2 = this._font['OS/2']) && os2.version > 0) {
        var advanceHeight = Math.abs(os2.typoAscender - os2.typoDescender);
        var topBearing = os2.typoAscender - cbox.maxY;
    
      } else {
        let { hhea } = this._font;
        var advanceHeight = Math.abs(hhea.ascent - hhea.descent);
        var topBearing = hhea.ascent - cbox.maxY;
      }
    }
    
    return this._metrics = { advanceWidth, advanceHeight, leftBearing, topBearing };
  }
      
  get cbox() {
    return this._cbox != null ? this._cbox : (this._cbox = this._getCBox());
  }
      
  get bbox() {
    return this._bbox != null ? this._bbox : (this._bbox = this._getBBox());
  }
    
  get path() {
    // Cache the path so we only decode it once
    // Decoding is actually performed by subclasses
    return this._path != null ? this._path : (this._path = this._getPath());
  }
    
  get advanceWidth() {
    return this._advanceWidth != null ? this._advanceWidth : (this._advanceWidth = this._getMetrics().advanceWidth);
  }
    
  get advanceHeight() {
    return this._advanceHeight != null ? this._advanceHeight : (this._advanceHeight = this._getMetrics().advanceHeight);
  }
    
  get ligatureCaretPositions() {}
    
  _getName() {
    let { post } = this._font;
    if (!post) {
      return null;
    }
    
    switch (post.version) {
      case 1:
        return StandardNames[this.id];
        
      case 2:
        let id = post.glyphNameIndex[this.id];
        if (id < StandardNames.length) {
          return StandardNames[id];
        } else {
          return post.names[id - StandardNames.length];
        }
          
      case 2.5:
        return StandardNames[this.id + post.offsets[this.id]];
        
      case 4:
        return String.fromCharCode(post.map[this.id]);
    }
  }
    
  get name() {
    return this._name != null ? this._name : (this._name = this._getName());
  }
    
  render(ctx, size) {
    ctx.save();
    
    let scale = 1 / this._font.head.unitsPerEm * size;
    ctx.scale(scale, scale);

    let fn = this.path.toFunction();
    fn(ctx);
    ctx.fill();
    
    return ctx.restore();
  }
}
