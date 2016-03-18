r = require 'restructure'
{resolveLength} = require 'restructure/src/utils'
CFFDict = require './CFFDict'
CFFIndex = require './CFFIndex'
CFFPointer = require './CFFPointer'
CFFPrivateDict = require './CFFPrivateDict'
StandardStrings = require './CFFStandardStrings'
{StandardEncoding, ExpertEncoding} = require './CFFEncodings'
{ISOAdobeCharset, ExpertCharset, ExpertSubsetCharset} = require './CFFCharsets';

# Checks if an operand is an index of a predefined value,
# otherwise delegates to the provided type.
class PredefinedOp
  constructor: (@predefinedOps, @type) ->
  decode: (stream, parent, operands) ->
    if @predefinedOps[operands[0]]
      return @predefinedOps[operands[0]]
      
    return @type.decode(stream, parent, operands)
    
  size: (value, ctx) ->
    return @type.size(value, ctx)
    
  encode: (stream, value, ctx) ->
    index = @predefinedOps.indexOf(value)
    if index isnt -1
      return index
      
    return @type.encode(stream, value, ctx)
  
class CFFEncodingVersion extends r.Number
  constructor: ->
    super 'UInt8'
    
  decode: (stream) ->
    return r.uint8.decode(stream) & 0x7f
    
Range1 = new r.Struct
  first: r.uint16
  nLeft: r.uint8
  
Range2 = new r.Struct
  first: r.uint16
  nLeft: r.uint16

CFFCustomEncoding = new r.VersionedStruct new CFFEncodingVersion,
  0:
    nCodes: r.uint8
    codes: new r.Array(r.uint8, 'nCodes')
  
  1: 
    nRanges: r.uint8
    ranges: new r.Array(Range1, 'nRanges')
    
  # TODO: supplement?
  
CFFEncoding = new PredefinedOp [ StandardEncoding, ExpertEncoding ], new CFFPointer(CFFCustomEncoding, lazy: true)

# Decodes an array of ranges until the total
# length is equal to the provided length.
class RangeArray extends r.Array
  decode: (stream, parent) ->
    length = resolveLength @length, stream, parent
    count = 0
    res = []
    while count < length
      range = @type.decode(stream, parent)
      count += range.nLeft + 1
      res.push range
      
    return res

CFFCustomCharset = new r.VersionedStruct r.uint8,
  0:
    glyphs: new r.Array(r.uint16, -> @parent.CharStrings.length - 1)
    
  1:
    ranges: new RangeArray(Range1, -> @parent.CharStrings.length - 1)
    
  2:
    ranges: new RangeArray(Range2, -> @parent.CharStrings.length - 1)

CFFCharset = new PredefinedOp [ ISOAdobeCharset, ExpertCharset, ExpertSubsetCharset ], new CFFPointer(CFFCustomCharset, lazy: true)

FDRange = new r.Struct
  first: r.uint16
  fd: r.uint8

FDSelect = new r.VersionedStruct r.uint8,
  0:
    fds: new r.Array(r.uint8, -> @parent.CharStrings.length)
    
  3:
    nRanges: r.uint16
    ranges: new r.Array(FDRange, 'nRanges')
    sentinel: r.uint16
    
class CFFPrivateOp
  ptr = new CFFPointer(CFFPrivateDict)
  decode: (stream, parent, operands) ->
    parent.length = operands[0]
    return ptr.decode(stream, parent, [operands[1]])
    
  size: (dict, ctx) ->
    return [CFFPrivateDict.size(dict, ctx, false), ptr.size(dict, ctx)[0]]
    
  encode: (stream, dict, ctx) ->
    return [CFFPrivateDict.size(dict, ctx, false), ptr.encode(stream, dict, ctx)[0]]
    
FontDict = new CFFDict [
  # key       name                    type(s)                                 default
  [18,        'Private',              new CFFPrivateOp,                       null]
  [[12, 38],  'FontName',             'sid',                                  null]
]
    
CFFTopDict = new CFFDict [
  # key       name                    type(s)                                 default
  [[12, 30],  'ROS',                  ['sid', 'sid', 'number'],               null]
  
  [0,         'version',              'sid',                                  null]
  [1,         'Notice',               'sid',                                  null]
  [[12, 0],   'Copyright',            'sid',                                  null]
  [2,         'FullName',             'sid',                                  null]
  [3,         'FamilyName',           'sid',                                  null]
  [4,         'Weight',               'sid',                                  null]
  [[12, 1],   'isFixedPitch',         'boolean',                              false]
  [[12, 2],   'ItalicAngle',          'number',                               0]
  [[12, 3],   'UnderlinePosition',    'number',                               -100]
  [[12, 4],   'UnderlineThickness',   'number',                               50]
  [[12, 5],   'PaintType',            'number',                               0]
  [[12, 6],   'CharstringType',       'number',                               2]
  [[12, 7],   'FontMatrix',           'array',                                [0.001, 0, 0, 0.001, 0, 0]]
  [13,        'UniqueID',             'number',                               null],
  [5,         'FontBBox',             'array',                                [0, 0, 0, 0]]
  [[12, 8],   'StrokeWidth',          'number',                               0]
  [14,        'XUID',                 'array',                                null]
  [15,        'charset',              CFFCharset,                             ISOAdobeCharset]
  [16,        'Encoding',             CFFEncoding,                            StandardEncoding]
  [17,        'CharStrings',          new CFFPointer(new CFFIndex),           null]
  [18,        'Private',              new CFFPrivateOp,                       null]
  [[12, 20],  'SyntheticBase',        'number',                               null]
  [[12, 21],  'PostScript',           'sid',                                  null]
  [[12, 22],  'BaseFontName',         'sid',                                  null]
  [[12, 23],  'BaseFontBlend',        'delta',                                null]
  
  # CID font specific
  [[12, 31],  'CIDFontVersion',       'number',                               0]
  [[12, 32],  'CIDFontRevision',      'number',                               0]
  [[12, 33],  'CIDFontType',          'number',                               0]
  [[12, 34],  'CIDCount',             'number',                               8720]
  [[12, 35],  'UIDBase',              'number',                               null]
  [[12, 37],  'FDSelect',             new CFFPointer(FDSelect),               null]
  [[12, 36],  'FDArray',              new CFFPointer(new CFFIndex(FontDict)), null]
  [[12, 38],  'FontName',             'sid',                                  null]
]

CFFHeader = new r.Struct
  majorVersion:   r.uint8
  minorVersion:   r.uint8
  hdrSize:        r.uint8
  offSize:        r.uint8
  
CFFTop = new r.Struct
  header:             CFFHeader
  nameIndex:          new CFFIndex(new r.String('length'))
  topDictIndex:       new CFFIndex(CFFTopDict)
  stringIndex:        new CFFIndex(new r.String('length'))
  globalSubrIndex:    new CFFIndex
  
module.exports = CFFTop
