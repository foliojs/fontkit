# Required Tables
exports.cmap    = require './cmap'
exports.head    = require './head'
exports.hhea    = require './hhea'
exports.hmtx    = require './hmtx'
exports.maxp    = require './maxp'
exports.name    = require './name'
exports['OS/2'] = require './OS2'
exports.post    = require './post'

# TrueType Outlines
exports['cvt '] = require './cvt'
exports.fpgm    = require './fpgm'
exports.loca    = require './loca'
exports.prep    = require './prep'
exports.glyf    = require './glyf'

# PostScript Outlines
exports['CFF '] = require '../CFFFont'
exports.VORG    = require './VORG'

# Bitmap Glyphs
# exports.EBDT = require './EBDT'
# exports.CBDT = exports.EBDT
exports.EBLC = require './EBLC'
exports.CBLC = exports.EBLC
#exports.EBSC = require './EBSC'
exports.sbix = require './sbix'

exports.COLR = require './COLR'
exports.CPAL = require './CPAL'

# Advanced OpenType Tables
exports.BASE = require './BASE'
exports.GDEF = require './GDEF'
exports.GPOS = require './GPOS'
exports.GSUB = require './GSUB'
exports.JSTF = require './JSTF'

# Other OpenType Tables
exports.DSIG = require './DSIG'
exports.gasp = require './gasp'
exports.hdmx = require './hdmx'
exports.kern = require './kern'
exports.LTSH = require './LTSH'
exports.PCLT = require './PCLT'
exports.VDMX = require './VDMX'
exports.vhea = require './vhea'
exports.vmtx = require './vmtx'

# Apple Advanced Typography Tables
#exports.acnt = require './acnt'
exports.avar = require './avar'
#exports.bdat = require './bdat'
#exports.bhed = require './bhed'
#exports.bloc = require './bloc'
exports.bsln = require './bsln'
#exports.cvar = require './cvar'
#exports.fdsc = require './fdsc'
exports.feat = require './feat'
#exports.fmtx = require './fmtx'
exports.fvar = require './fvar'
#exports.hsty = require './hsty'
exports.gvar = require './gvar'
exports.just = require './just'
#exports.lcar = require './lcar'
#exports.mort = require './mort'
exports.morx = require './morx'
#exports.prop = require './prop'
#exports.trak = require './trak'
exports.opbd = require './opbd'
#exports.Zapf = require './Zapf'
