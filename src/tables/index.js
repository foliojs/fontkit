let tables = {};
export default tables;

// Required Tables
tables.cmap = require('./cmap');
tables.head = require('./head');
tables.hhea = require('./hhea');
tables.hmtx = require('./hmtx');
tables.maxp = require('./maxp');
tables.name = require('./name');
tables['OS/2']    = require('./OS2');
tables.post = require('./post');

// TrueType Outlines
tables['cvt ']    = require('./cvt');
tables.fpgm = require('./fpgm');
tables.loca = require('./loca');
tables.prep = require('./prep');
tables.glyf = require('./glyf');

// PostScript Outlines
tables['CFF ']    = require('../CFFFont');
tables.VORG = require('./VORG');

// Bitmap Glyphs
// tables.EBDT = require './EBDT'
// tables.CBDT = tables.EBDT
tables.EBLC = require('./EBLC');
tables.CBLC = tables.EBLC;
//tables.EBSC = require './EBSC'
tables.sbix = require('./sbix');

tables.COLR = require('./COLR');
tables.CPAL = require('./CPAL');

// Advanced OpenType Tables
tables.BASE = require('./BASE');
tables.GDEF = require('./GDEF');
tables.GPOS = require('./GPOS').default;
tables.GSUB = require('./GSUB');
tables.JSTF = require('./JSTF');

// Other OpenType Tables
tables.DSIG = require('./DSIG');
tables.gasp = require('./gasp');
tables.hdmx = require('./hdmx');
tables.kern = require('./kern');
tables.LTSH = require('./LTSH');
tables.PCLT = require('./PCLT');
tables.VDMX = require('./VDMX');
tables.vhea = require('./vhea');
tables.vmtx = require('./vmtx');

// Apple Advanced Typography Tables
//tables.acnt = require './acnt'
tables.avar = require('./avar');
//tables.bdat = require './bdat'
//tables.bhed = require './bhed'
//tables.bloc = require './bloc'
tables.bsln = require('./bsln');
//tables.cvar = require './cvar'
//tables.fdsc = require './fdsc'
tables.feat = require('./feat');
//tables.fmtx = require './fmtx'
tables.fvar = require('./fvar');
//tables.hsty = require './hsty'
tables.gvar = require('./gvar');
tables.just = require('./just');
//tables.lcar = require './lcar'
//tables.mort = require './mort'
tables.morx = require('./morx');
//tables.prop = require './prop'
//tables.trak = require './trak'
tables.opbd = require('./opbd');
//tables.Zapf = require './Zapf'
