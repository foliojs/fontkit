# Required Tables
exports.cmap    = require './ttf/cmap'
exports.head    = require './ttf/head'
exports.hhea    = require './ttf/hhea'
exports.hmtx    = require './ttf/hmtx'
exports.maxp    = require './ttf/maxp'
exports.name    = require './ttf/name'
exports['OS/2'] = require './ttf/OS2'
exports.post    = require './ttf/post'

# TrueType Outlines
exports['cvt '] = require './ttf/cvt'
exports.fpgm    = require './ttf/fpgm'
exports.loca    = require './ttf/loca'
exports.prep    = require './ttf/prep'
exports.glyf    = require './ttf/glyf'

# PostScript Outlines
exports['CFF '] = require './CFFFont'
exports.VORG    = require './ttf/VORG'

# Bitmap Glyphs
#exports.EBDT = require './ttf/EBDT'
#exports.EBLC = require './ttf/EBLC'
#exports.EBSC = require './ttf/EBSC'
exports.sbix = require './ttf/sbix'

# Advanced OpenType Tables
exports.BASE = require './ttf/BASE'
exports.GDEF = require './ttf/GDEF'
exports.GPOS = require './ttf/GPOS'
exports.GSUB = require './ttf/GSUB'
exports.JSTF = require './ttf/JSTF'

# Other OpenType Tables
exports.DSIG = require './ttf/DSIG'
exports.gasp = require './ttf/gasp'
exports.hdmx = require './ttf/hdmx'
exports.kern = require './ttf/kern'
exports.LTSH = require './ttf/LTSH'
exports.PCLT = require './ttf/PCLT'
exports.VDMX = require './ttf/VDMX'
exports.vhea = require './ttf/vhea'
exports.vmtx = require './ttf/vmtx'

# Apple Advanced Typography Tables
#exports.acnt = require './ttf/acnt'
#exports.avar = require './ttf/avar'
#exports.bdat = require './ttf/bdat'
#exports.bhed = require './ttf/bhed'
#exports.bloc = require './ttf/bloc'
#exports.bsln = require './ttf/bsln'
#exports.cvar = require './ttf/cvar'
#exports.fdsc = require './ttf/fdsc'
#exports.feat = require './ttf/feat'
#exports.fmtx = require './ttf/fmtx'
#exports.fvar = require './ttf/fvar'
#exports.gvar = require './ttf/gvar'
#exports.hsty = require './ttf/hsty'
#exports.just = require './ttf/just'
#exports.lcar = require './ttf/lcar'
#exports.mort = require './ttf/mort'
#exports.morx = require './ttf/morx'
#exports.opbd = require './ttf/opbd'
#exports.prop = require './ttf/prop'
#exports.trak = require './ttf/trak'
#exports.Zapf = require './ttf/Zapf'
