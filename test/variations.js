import fontkit from '../src';
import assert from 'assert';
import fs from 'fs';

describe('variations', function() {
  if (!fs.existsSync('/Library/Fonts/Skia.ttf')) { return; }
  let font = fontkit.openSync('/Library/Fonts/Skia.ttf');

  it('should get available variation axes', function() {
    let axes = font.variationAxes;
    assert.deepEqual(Object.keys(axes), ['wght', 'wdth']);
    assert.equal(axes.wght.name, 'Weight');
    assert.equal(axes.wdth.name, 'Width');
    assert.equal(Math.round(axes.wght.min * 100) / 100, 0.48);
    assert.equal(axes.wght.default, 1);
    return assert.equal(Math.round(axes.wght.max * 100) / 100, 3.2);
  });

  it('should get named variation instances', function() {
    let named = font.namedVariations;
    assert.deepEqual(Object.keys(named), [
      'Black', 'Extended', 'Condensed', 'Light', 'Regular',
      'Black Extended', 'Light Extended', 'Black Condensed',
      'Light Condensed', 'Bold'
    ]);

    assert.equal(Math.round(named.Bold.wght * 100) / 100, 1.95);
    return assert.equal(named.Bold.wdth, 1);
  });

  it('should get a variation by name', function() {
    let variation = font.getVariation('Bold');
    assert.equal(variation.constructor.name, 'TTFFont');

    let glyph = variation.getGlyph(68); // D
    return assert.equal(glyph.path.toSVG(), 'M1438 662Q1438 486 1351.5 353Q1265 220 1127 139Q1007 68 857 31Q707 -6 508 -6Q415 -6 303.5 -3.5Q192 -1 179 -1Q179 9 181 211Q183 413 183 683Q183 795 182 963Q181 1131 179 1339Q195 1339 312 1340Q429 1341 476 1341Q695 1341 859.5 1304Q1024 1267 1150 1187Q1296 1094 1367 963Q1438 832 1438 662ZM1098 673Q1098 773 1053.5 856Q1009 939 915 996Q831 1047 731.5 1066.5Q632 1086 543 1086Q533 1086 521.5 1086Q510 1086 507 1086Q506 984 506 892Q506 800 506 741Q506 689 506 572.5Q506 456 507 254Q516 254 523 254Q530 254 540 254Q630 254 730.5 276.5Q831 299 896 337Q997 395 1047.5 479Q1098 563 1098 673Z');
  });

  it('should get a variation by settings', function() {
    let variation = font.getVariation({wght: 0.5});
    assert.equal(variation.constructor.name, 'TTFFont');

    let glyph = variation.getGlyph(68); // D
    return assert.equal(glyph.path.toSVG(), 'M1259 662Q1259 496 1181.5 361.5Q1104 227 967 138Q848 64 716 29.5Q584 -5 408 -5Q365 -5 305.5 -4Q246 -3 220 -2Q220 42 221 207.5Q222 373 222 668Q222 853 221 1043.5Q220 1234 220 1339Q243 1340 288 1340Q333 1340 372 1340Q567 1340 721.5 1301.5Q876 1263 988 1188Q1125 1098 1192 964.5Q1259 831 1259 662ZM1175 662Q1175 813 1115 933.5Q1055 1054 922 1139Q813 1208 678 1240.5Q543 1273 371 1273Q355 1273 333.5 1273Q312 1273 303 1273Q303 1189 302 1047.5Q301 906 301 760Q301 510 301.5 351Q302 192 303 62Q320 62 337.5 62Q355 62 371 62Q532 62 665.5 89.5Q799 117 901 180Q1038 266 1106.5 388.5Q1175 511 1175 662Z');
  });

  it('interpolates points without delta values', function() {
    let variation = font.getVariation('Bold');
    let glyph = variation.glyphForCodePoint('Q'.charCodeAt());

    return assert.equal(glyph.path.toSVG(), 'M799 -39Q662 -39 538 4Q414 47 320 131Q213 227 152 365Q91 503 91 670Q91 825 141.5 952.5Q192 1080 295 1182Q389 1276 517 1326Q645 1376 795 1376Q942 1376 1067.5 1329.5Q1193 1283 1288 1193Q1395 1092 1448.5 957.5Q1502 823 1502 669Q1502 514 1434.5 366Q1367 218 1240 114Q1141 32 1030 -3.5Q919 -39 799 -39ZM1162 654Q1162 755 1128.5 856.5Q1095 958 1024 1024Q980 1066 923 1090Q866 1114 796 1114Q727 1114 669 1089.5Q611 1065 562 1017Q500 955 465.5 859Q431 763 431 665Q431 556 465.5 463Q500 370 566 307Q610 265 669 240Q728 215 797 215Q847 215 908 232.5Q969 250 1023 299Q1088 360 1125 457Q1162 554 1162 654ZM789 452L955 596Q1004.9 537.73 1170.53 350.36Q1336.15 163 1540 -53L1358 -210Q1146.97 32.91 994.12 211.7Q841.27 390.49 789 452Z');
  });

  it('recomputes cbox and advance width', function() {
    let variation = font.getVariation('Bold');
    let glyph = variation.getGlyph(68); // D

    assert.equal(Math.round(glyph.advanceWidth * 100) / 100, 1540);
    return assert.equal(Math.round(glyph.cbox.minX * 100) / 100, 179);
  });
});

