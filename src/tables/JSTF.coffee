r = require 'restructure'
{ScriptList, FeatureList, LookupList, Coverage, ClassDef, Device} = require './opentype'
{GPOSLookup} = require './GPOS'

JstfMax = new r.Array(new r.Pointer(r.uint16, GPOSLookup))
JstfGSUBModList = new r.Array(r.uint16, r.uint16)

JstfPriority = new r.Struct
  shrinkageEnableGSUB:    new r.Pointer(r.uint16, JstfGSUBModList)
  shrinkageDisableGSUB:   new r.Pointer(r.uint16, JstfGSUBModList)
  shrinkageEnableGPOS:    new r.Pointer(r.uint16, JstfGSUBModList)
  shrinkageDisableGPOS:   new r.Pointer(r.uint16, JstfGSUBModList)
  shrinkageJstfMax:       new r.Pointer(r.uint16, JstfMax)
  extensionEnableGSUB:    new r.Pointer(r.uint16, JstfGSUBModList)
  extensionDisableGSUB:   new r.Pointer(r.uint16, JstfGSUBModList)
  extensionEnableGPOS:    new r.Pointer(r.uint16, JstfGSUBModList)
  extensionDisableGPOS:   new r.Pointer(r.uint16, JstfGSUBModList)
  extensionJstfMax:       new r.Pointer(r.uint16, JstfMax)

JstfLangSys = new r.Array(new r.Pointer(r.uint16, JstfPriority), r.uint16)

JstfLangSysRecord = new r.Struct
  tag:         new r.String(4)
  jstfLangSys: new r.Pointer(r.uint16, JstfLangSys)

JstfScript = new r.Struct
  extenderGlyphs:     new r.Pointer(r.uint16, new r.Array(r.uint16, r.uint16)) # array of glyphs to extend line length
  defaultJstfLangSys: new r.Pointer(r.uint16, JstfLangSys)
  jstfLangSysCount:   r.uint16
  jstfLangSysRecords: new r.Array(JstfLangSysRecord, 'jstfLangSysCount')

JstfScriptRecord = new r.Struct
  tag:        new r.String(4)
  jstfScript: new r.Pointer(r.uint16, JstfScript, type: 'parent')

module.exports = new r.Struct
  version:            r.uint32  # should be 0x00010000
  jstfScriptCount:    r.uint16
  jstfScriptRecords:  new r.Array(JstfScriptRecord, 'jstfScriptCount')