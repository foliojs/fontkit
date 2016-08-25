let tables = {};
export default tables;

// Required Tables
tables.cmap = require('./cmap').default;
tables.head = require('./head').default;
tables.hhea = require('./hhea').default;
tables.hmtx = require('./hmtx').default;
tables.maxp = require('./maxp').default;
tables.name = require('./name').default;
tables['OS/2'] = require('./OS2').default;
tables.post = require('./post').default;

// TrueType Outlines
tables['cvt '] = require('./cvt').default;
tables.fpgm = require('./fpgm').default;
tables.loca = require('./loca').default;
tables.prep = require('./prep').default;
tables.glyf = require('./glyf').default;

// PostScript Outlines
tables['CFF '] = require('../cff/CFFFont').default;
tables.VORG = require('./VORG').default;

// Bitmap Glyphs
// tables.EBDT = require './EBDT'
// tables.CBDT = tables.EBDT
tables.EBLC = require('./EBLC').default;
tables.CBLC = tables.EBLC;
//tables.EBSC = require './EBSC'
tables.sbix = require('./sbix').default;

tables.COLR = require('./COLR').default;
tables.CPAL = require('./CPAL').default;

// Advanced OpenType Tables
tables.BASE = require('./BASE').default;
tables.GDEF = require('./GDEF').default;
tables.GPOS = require('./GPOS').default;
tables.GSUB = require('./GSUB').default;
tables.JSTF = require('./JSTF').default;

// Other OpenType Tables
tables.DSIG = require('./DSIG').default;
tables.gasp = require('./gasp').default;
tables.hdmx = require('./hdmx').default;
tables.kern = require('./kern').default;
tables.LTSH = require('./LTSH').default;
tables.PCLT = require('./PCLT').default;
tables.VDMX = require('./VDMX').default;
tables.vhea = require('./vhea').default;
tables.vmtx = require('./vmtx').default;

// Apple Advanced Typography Tables
//tables.acnt = require './acnt'
tables.avar = require('./avar').default;
//tables.bdat = require './bdat'
//tables.bhed = require './bhed'
//tables.bloc = require './bloc'
tables.bsln = require('./bsln').default;
//tables.cvar = require './cvar'
//tables.fdsc = require './fdsc'
tables.feat = require('./feat').default;
//tables.fmtx = require './fmtx'
tables.fvar = require('./fvar').default;
//tables.hsty = require './hsty'
tables.gvar = require('./gvar').default;
tables.just = require('./just').default;
//tables.lcar = require './lcar'
//tables.mort = require './mort'
tables.morx = require('./morx').default;
//tables.prop = require './prop'
//tables.trak = require './trak'
tables.opbd = require('./opbd').default;
//tables.Zapf = require './Zapf'
