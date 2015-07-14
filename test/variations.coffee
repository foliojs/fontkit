fontkit = require '../'
assert = require 'assert'
fs = require 'fs'

describe 'variations', ->
  return unless fs.existsSync '/Library/Fonts/Skia.ttf'
  font = fontkit.openSync '/Library/Fonts/Skia.ttf'
  
  it 'should get available variation axes', ->
    axes = font.variationAxes
    assert.deepEqual Object.keys(axes), ['wght', 'wdth']
    assert.equal axes.wght.name, 'Weight'
    assert.equal axes.wdth.name, 'Width'
    assert.equal Math.round(axes.wght.min * 100) / 100, 0.48
    assert.equal axes.wght.default, 1
    assert.equal Math.round(axes.wght.max * 100) / 100, 3.2
    
  it 'should get named variation instances', ->
    named = font.namedVariations
    assert.deepEqual Object.keys(named), [
      'Black', 'Extended', 'Condensed', 'Light', 'Regular', 
      'Black Extended', 'Light Extended', 'Black Condensed',
      'Light Condensed', 'Bold'
    ]
    
    assert.equal Math.round(named.Bold.wght * 100) / 100, 1.95
    assert.equal named.Bold.wdth, 1
    
  it 'should get a variation by name', ->
    variation = font.getVariation 'Bold'
    assert variation instanceof fontkit.TTFFont
    
    glyph = variation.getGlyph 68 # D
    assert.equal glyph.path.toSVG(), 'M1437.77 661.57Q1437.77 485.57 1351.27 352.78Q1264.77 220 1126.77 139Q1006.77 68 856.9 30.78Q707.02 -6.43 508.34 -6.43Q415.02 -6.43 303.33 -3.78Q191.64 -1.14 179.02 -1.14Q179.02 8.61 180.88 211.01Q182.73 413.41 182.73 682.77Q182.73 794.95 182.01 962.74Q181.3 1130.52 179.02 1339Q195.07 1339 312.19 1340.22Q429.32 1341.43 476.34 1341.43Q695 1341.43 859.39 1304.22Q1023.77 1267 1149.77 1187Q1295.77 1094 1366.77 963.07Q1437.77 832.14 1437.77 661.57M1097.5 673.36Q1097.5 773.14 1053.16 856.25Q1008.82 939.36 915.02 995.93Q831.39 1046.64 731.67 1066.22Q631.95 1085.8 542.84 1085.8Q532.73 1085.8 521.12 1085.8Q509.52 1085.8 507.25 1085.8Q506.11 983.93 505.83 891.81Q505.55 799.68 505.55 740.7Q505.55 688.5 505.83 572.13Q506.11 455.75 506.68 253.95Q515.93 253.95 523.11 253.95Q530.3 253.95 539.55 253.95Q630.25 253.95 730.81 276.68Q831.36 299.41 896.32 337.43Q996.93 395.5 1047.22 479.06Q1097.5 562.61 1097.5 673.36Z'
    
  it 'should get a variation by settings', ->
    variation = font.getVariation
      wght: 0.5
      
    assert variation instanceof fontkit.TTFFont
    
    glyph = variation.getGlyph 68 # D
    assert.equal glyph.path.toSVG(), 'M1258.81 662Q1258.81 495.62 1181.44 361.17Q1104.08 226.73 967.04 138.04Q848 64.15 715.89 29.56Q583.77 -5.04 408.42 -5.04Q365.35 -5.04 305.56 -4Q245.77 -2.96 219.54 -2Q219.54 42.42 220.6 207.83Q221.65 373.23 221.65 667.54Q221.65 853.38 220.67 1043.5Q219.69 1233.61 219.54 1339Q243 1339.96 287.96 1340Q332.92 1340.04 371.62 1340.04Q567.08 1340.04 721.33 1301.6Q875.58 1263.15 988.12 1187.96Q1124.5 1097.85 1191.65 964.46Q1258.81 831.08 1258.81 662M1175.31 662.04Q1175.31 813.19 1114.98 933.62Q1054.65 1054.04 922.12 1138.69Q812.96 1207.77 677.87 1240.58Q542.77 1273.38 371.15 1273.38Q355.23 1273.38 333.42 1273.38Q311.62 1273.38 302.81 1273.38Q302.73 1189.42 301.75 1047.92Q300.77 906.42 300.77 759.81Q300.77 510.04 301.27 350.94Q301.77 191.85 302.77 61.62Q319.65 61.62 337.4 61.62Q355.15 61.62 371.08 61.62Q531.85 61.62 665.25 89.23Q798.65 116.85 901.15 180.46Q1038.23 265.77 1106.77 388.54Q1175.31 511.31 1175.31 662.04Z'
    
  it 'interpolates points without delta values', ->
    variation = font.getVariation 'Bold'
    glyph = variation.glyphForCodePoint 'Q'.charCodeAt()
    
    assert.equal glyph.path.toSVG(), 'M799.5 -39.43Q661.82 -39.43 538.01 3.92Q414.2 47.27 320.43 130.86Q212.64 227.48 151.63 365.11Q90.61 502.75 90.61 670.14Q90.61 824.57 141.5 952.15Q192.39 1079.73 294.59 1181.59Q388.93 1275.59 517.14 1326.01Q645.34 1376.43 795.18 1376.43Q942.27 1376.43 1067.42 1329.87Q1192.57 1283.32 1287.8 1193.43Q1395.3 1091.7 1448.6 957.5Q1501.91 823.3 1501.91 669Q1501.91 514.27 1434.57 365.92Q1367.23 217.57 1240.09 113.55Q1141.23 32.09 1030.05 -3.67Q918.86 -39.43 799.5 -39.43M1161.64 654.3Q1161.64 754.5 1128.28 856.25Q1094.93 958 1023.64 1024Q979.61 1065.59 923.03 1089.6Q866.45 1113.61 795.61 1113.61Q726.77 1113.61 668.92 1089.32Q611.07 1065.02 561.89 1016.7Q499.59 954.84 465.24 859.08Q430.89 763.32 430.89 665.11Q430.89 556.09 465.37 462.82Q499.86 369.55 566.02 306.95Q609.64 264.91 668.64 240.05Q727.64 215.18 796.77 215.18Q846.7 215.18 908.05 232.66Q969.39 250.14 1022.52 299.14Q1088.09 359.57 1124.86 456.9Q1161.64 554.23 1161.64 654.3M789.34 451.86L955.9 596.84Q1005.73 538.53 1171.15 351.03Q1336.57 163.53 1540.16 -52.61L1357.8 -210Q1146.96 32.85 994.26 211.61Q841.56 390.36 789.34 451.86Z'
    
  it 'recomputes cbox and advance width', ->
    variation = font.getVariation 'Bold'
    glyph = variation.getGlyph 68 # D
    
    assert.equal Math.round(glyph.advanceWidth * 100) / 100, 1540.18
    assert.equal Math.round(glyph.cbox.minX * 100) / 100, 179.02
    