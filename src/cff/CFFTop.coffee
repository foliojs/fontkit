r = require 'restructure'
CFFDict = require './CFFDict'
CFFIndex = require './CFFIndex'

CFFTopDict = new CFFDict [
    # key       name                    type(s)                       default
    [0,         'version',              'sid',                        null]
    [1,         'Notice',               'sid',                        null]
    [[12, 0],   'Copyright',            'sid',                        null]
    [2,         'FullName',             'sid',                        null]
    [3,         'FamilyName',           'sid',                        null]
    [4,         'Weight',               'sid',                        null]
    [[12, 1],   'isFixedPitch',         'boolean',                    false]
    [[12, 2],   'ItalicAngle',          'number',                     0]
    [[12, 3],   'UnderlinePosition',    'number',                     -100]
    [[12, 4],   'UnderlineThickness',   'number',                     50]
    [[12, 5],   'PaintType',            'number',                     0]
    [[12, 6],   'CharstringType',       'number',                     2]
    [[12, 7],   'FontMatrix',           'array',                      [0.001, 0, 0, 0.001, 0, 0]]
    [13,        'UniqueID',             'number',                     null],
    [5,         'FontBBox',             'array',                      [0, 0, 0, 0]]
    [[12, 8],   'StrokeWidth',          'number',                     0]
    [14,        'XUID',                 'array',                      null]
    [15,        'charset',              'offset',                     0]
    [16,        'Encoding',             'offset',                     0]
    [17,        'CharStrings',          'offset',                     0]
    [18,        'Private',              ['number', 'offset'],         null]
    [[12, 20],  'SyntheticBase',        'number',                     null]
    [[12, 21],  'PostScript',           'sid',                        null]
    [[12, 22],  'BaseFontName',         'sid',                        null]
    [[12, 23],  'BaseFontBlend',        'delta',                      null]
    
    # CID font specific
    [[12, 30],  'ROS',                  ['sid', 'sid', 'number'],     null]
    [[12, 31],  'CIDFontVersion',       'number',                     0]
    [[12, 32],  'CIDFontRevision',      'number',                     0]
    [[12, 33],  'CIDFontType',          'number',                     0]
    [[12, 34],  'CIDCount',             'number',                     8720]
    [[12, 35],  'UIDBase',              'number',                     null]
    [[12, 36],  'FDArray',              'offset',                     null]
    [[12, 37],  'FDSelect',             'offset',                     null]
    [[12, 38],  'FontName',             'sid',                        null]
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
