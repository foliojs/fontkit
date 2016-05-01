import r from 'restructure';
import fontkit from '../base';
import Directory from './tables/directory';
import tables from './tables';
import CmapProcessor from './CmapProcessor';
import LayoutEngine from './layout/LayoutEngine';
import TTFGlyph from './glyph/TTFGlyph';
import CFFGlyph from './glyph/CFFGlyph';
import SBIXGlyph from './glyph/SBIXGlyph';
import COLRGlyph from './glyph/COLRGlyph';
import GlyphVariationProcessor from './glyph/GlyphVariationProcessor';
import TTFSubset from './subset/TTFSubset';
import CFFSubset from './subset/CFFSubset';
import BBox from './glyph/BBox';

class TTFFont {
  static probe(buffer) {
    return __in__(buffer.toString('ascii', 0, 4), ['true', 'OTTO', String.fromCharCode(0, 1, 0, 0)]);
  }
  
  constructor(stream, variationCoords = null) {
    this.stream = stream;
    this._directoryPos = this.stream.pos;
    this._tables = {};
    this._glyphs = {};
    this._decodeDirectory();
    
    // define properties for each table to lazily parse
    for (let tag in this.directory.tables) { 
      let table = this.directory.tables[tag];
      if (tables[tag] && table.length > 0) {
        Object.defineProperty(this, tag,
          {get: this._getTable.bind(this, table)});
      }
    }
    
    if (variationCoords) {
      this._variationProcessor = new GlyphVariationProcessor(this, variationCoords);
    }
  }
  
  _getTable(table) {
    if (!(table.tag in this._tables)) {
      try {
        this._tables[table.tag] = this._decodeTable(table);
      } catch (e) {
        // if (fontkit.logErrors) {
          console.error(`Error decoding table ${table.tag}`);
          console.error(e.stack);
        // }
      }
    }
      
    return this._tables[table.tag];
  }
    
  _getTableStream(tag) {
    let table = this.directory.tables[tag];
    if (table) {
      this.stream.pos = table.offset;
      return this.stream;
    }
      
    return null;
  }
    
  _decodeDirectory() {
    return this.directory = Directory.decode(this.stream, {_startOffset: 0});
  }
    
  _decodeTable(table) {
    let pos = this.stream.pos;
    
    let stream = this._getTableStream(table.tag);
    let result = tables[table.tag].decode(stream, this, table.length);
    
    this.stream.pos = pos;
    return result;
  }
  
  get postscriptName() {
    let name = this.name.records.postscriptName;
    let lang = Object.keys(name)[0];
    return name[lang];
  }
    
  _getNameRecord(key) {
    let record = this.name.records[key];
    if (record) {
      return record.English;
    }
      
    return null;
  }
    
  get fullName() {
    return this._getNameRecord('fullName');
  }
    
  get familyName() {
    return this._getNameRecord('fontFamily');
  }
    
  get subfamilyName() {
    return this._getNameRecord('fontSubfamily');
  }
    
  get copyright() {
    return this._getNameRecord('copyright');
  }
    
  get version() {
    return this._getNameRecord('version');
  }
    
  get ascent() {
    return this.hhea.ascent;
  }
    
  get descent() {
    return this.hhea.descent;
  }
    
  get lineGap() {
    return this.hhea.lineGap;
  }
    
  get underlinePosition() {
    return this.post.underlinePosition;
  }
    
  get underlineThickness() {
    return this.post.underlineThickness;
  }
    
  get italicAngle() {
    return this.post.italicAngle;
  }
    
  get capHeight() {
    let os2 = this['OS/2'];
    if (os2) {
      return os2.capHeight;
    }
      
    return this.ascent;
  }
    
  get xHeight() {
    let os2 = this['OS/2'];
    if (os2) {
      return os2.xHeight;
    }
      
    return 0;
  }
    
  get numGlyphs() {
    return this.maxp.numGlyphs;
  }
    
  get unitsPerEm() {
    return this.head.unitsPerEm;
  }
    
  get bbox() {
    return this._bbox != null ? this._bbox : (this._bbox = Object.freeze(new BBox(this.head.xMin, this.head.yMin, this.head.xMax, this.head.yMax)));
  }
    
  get characterSet() {
    if (this._cmapProcessor == null) { this._cmapProcessor = new CmapProcessor(this.cmap); }
    return this._cmapProcessor.getCharacterSet();
  }
        
  hasGlyphForCodePoint(codePoint) {
    if (this._cmapProcessor == null) { this._cmapProcessor = new CmapProcessor(this.cmap); }
    return !!this._cmapProcessor.lookup(codePoint);
  }
            
  glyphForCodePoint(codePoint) {
    if (this._cmapProcessor == null) { this._cmapProcessor = new CmapProcessor(this.cmap); }
    return this.getGlyph(this._cmapProcessor.lookup(codePoint), [codePoint]);
  }
    
  glyphsForString(string) {
    // Map character codes to glyph ids
    let glyphs = [];    
    let len = string.length;
    let idx = 0;
    while (idx < len) {
      let code = string.charCodeAt(idx++);
      if (0xd800 <= code && code <= 0xdbff && idx < len) {
        let next = string.charCodeAt(idx);
        if (0xdc00 <= next && next <= 0xdfff) {
          idx++;
          code = ((code & 0x3FF) << 10) + (next & 0x3FF) + 0x10000;
        }
      }
    
      glyphs.push(this.glyphForCodePoint(code));
    }
      
    return glyphs;
  }
    
  layout(string, userFeatures, script, language) {
    if (this._layoutEngine == null) { this._layoutEngine = new LayoutEngine(this); }
    return this._layoutEngine.layout(string, userFeatures, script, language);
  }
    
  get availableFeatures() {
    if (this._layoutEngine == null) { this._layoutEngine = new LayoutEngine(this); }
    return this._layoutEngine.getAvailableFeatures();
  }
            
  widthOfString(string, features, script, language) {
    if (this._layoutEngine == null) { this._layoutEngine = new LayoutEngine(this); }
    return this._layoutEngine.layout(string, features, script, language).advanceWidth;
  }
    
  _getBaseGlyph(glyph, characters = []) {
    if (!this._glyphs[glyph]) {
      if (this.directory.tables.glyf != null) {
        this._glyphs[glyph] = new TTFGlyph(glyph, characters, this);
      
      } else if (this.directory.tables['CFF '] != null) {
        this._glyphs[glyph] = new CFFGlyph(glyph, characters, this);
      }
    }
    
    return this._glyphs[glyph] || null;
  }
    
  getGlyph(glyph, characters = []) {
    if (!this._glyphs[glyph]) {
      if (this.directory.tables.sbix != null) {
        this._glyphs[glyph] = new SBIXGlyph(glyph, characters, this);
        
      } else if ((this.directory.tables.COLR != null) && (this.directory.tables.CPAL != null)) {
        this._glyphs[glyph] = new COLRGlyph(glyph, characters, this);
        
      } else {
        this._getBaseGlyph(glyph, characters);
      }
    }
    
    return this._glyphs[glyph] || null;
  }
    
  createSubset() {
    if (this.directory.tables['CFF '] != null) {
      return new CFFSubset(this);
    }
      
    return new TTFSubset(this);
  }
    
  // Returns an object describing the available variation axes
  // that this font supports. Keys are setting tags, and values
  // contain the axis name, range, and default value.
  get variationAxes() {
    let res = {};
    if (!this.fvar) { return res; }
    
    for (let i = 0; i < this.fvar.axis.length; i++) {
      let axis = this.fvar.axis[i];
      res[axis.axisTag] = { 
        name: axis.name,
        min: axis.minValue,
        default: axis.defaultValue,
        max: axis.maxValue
      };
    }
        
    return res;
  }
    
  // Returns an object describing the named variation instances
  // that the font designer has specified. Keys are variation names
  // and values are the variation settings for this instance.
  get namedVariations() {
    let res = {};
    if (!this.fvar) { return res; }
    
    for (let j = 0; j < this.fvar.instance.length; j++) {
      let instance = this.fvar.instance[j];
      let settings = {};
      for (let i = 0; i < this.fvar.axis.length; i++) {
        let axis = this.fvar.axis[i];
        settings[axis.axisTag] = instance.coord[i];
      }
      
      res[instance.name] = settings;
    }
        
    return res;
  }
    
  // Returns a new font with the given variation settings applied.
  // Settings can either be an instance name, or an object containing
  // variation tags as specified by the `variationAxes` property.
  getVariation(settings) {
    if (!this.directory.tables.fvar || !this.directory.tables.gvar || !this.directory.tables.glyf) {
      throw new Error('Variations require a font with the fvar, gvar, and glyf tables.');
    }
      
    if (typeof settings === 'string') {
      settings = this.namedVariations[settings];
    }
    
    if (typeof settings !== 'object') {
      throw new Error('Variation settings must be either a variation name or settings object.');  
    }
    
    // normalize the coordinates
    let coords = this.fvar.axis.map((axis, i) => {
      if (axis.axisTag in settings) {
        return Math.max(axis.minValue, Math.min(axis.maxValue, settings[axis.axisTag]));
      } else {
        return axis.defaultValue;
      }
    });
        
    let stream = new r.DecodeStream(this.stream.buffer);
    stream.pos = this._directoryPos;
    
    let font = new TTFFont(stream, coords);
    font._tables = this._tables;
    
    return font;
  }
    
  // Standardized format plugin API
  getFont(name) {
    return this.getVariation(name);
  }
}
    
export default TTFFont;

function __in__(needle, haystack) {
  return haystack.indexOf(needle) >= 0;
}