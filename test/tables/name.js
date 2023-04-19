import * as fontkit from 'fontkit';
import assert from 'assert';

describe('nametable', function () {
  let font = fontkit.openSync(new URL('../data/Mada/Mada-VF.ttf', import.meta.url));
  let name = font['name'];

  it('name table exists', function () {
    assert.equal('name' in font, true);
  });

  it('check name table ID 0: copyright', function () {
    assert.equal(name.records.copyright.en, 
    'Copyright © 2015-2017 The Mada Project Authors, with Reserved Font Name "Source". Source is a trademark of Adobe Systems Incorporated in the United States and/or other countries.');
  });

  it('check name table ID 1: fontFamily', function () {
    assert.equal(name.records.fontFamily.en, 'Mada Medium');
  });

  it('check name table ID 2: fontSubfamily', function () {
    assert.equal(name.records.fontSubfamily.en, 'Regular');
  });

  it('check name table ID 3: uniqueSubfamily', function () {
    assert.equal(name.records.uniqueSubfamily.en, 'Version 1.004;ALIF;Mada Medium Regular');
  });

  it('check name table ID 4: fullName', function () {
    assert.equal(name.records.fullName.en, 'Mada Medium');
  });

  it('check name table ID 5: version', function () {
    assert.equal(name.records.version.en, 'Version 1.004');
  });

  it('check name table ID 6: postscriptName', function () {
    assert.equal(name.records.postscriptName.en, 'Mada-Medium');
  });

  const TM = 'This is a trademark.'
  name.records.trademark = {en: TM};
  it('check name table ID 7: trademark', function () {
    assert.equal(name.records.trademark.en, TM );
  });

  const M = 'This is a manufacturer.'
  name.records.manufacturer = {en: M};
  it('check name table ID 8: manufacturer', function () {
    assert.equal(name.records.manufacturer.en, M );
  });

  it('check name table ID 9: designer', function () {
    assert.equal(name.records.designer.en, 'Khaled Hosny');
  });

  it('check name table ID 10: description', function () {
    assert.equal(name.records.description.en, 
      'Mada is a geometric, unmodulted Arabic display typeface inspired by Cairo road signage.');
  });

  const URL_V = 'This is a vendorURL.'
  name.records.vendorURL = {en: URL_V};
  it('check name table ID 11: vendorURL', function () {
    assert.equal(name.records.vendorURL.en, URL_V );
  });

  const URL_D = 'This is a designerURL.'
  name.records.designerURL = {en: URL_D};
  it('check name table ID 12: designerURL', function () {
    assert.equal(name.records.designerURL.en, URL_D );
  });

  it('check name table ID 13: license', function () {
    assert.equal(name.records.license.en, 
      'This Font Software is licensed under the SIL Open Font License, Version 1.1. This license is available with a FAQ at: http://scripts.sil.org/OFL');
  });

  it('check name table ID 14: licenseURL', function () {
    assert.equal(name.records.licenseURL.en, 
      'http://scripts.sil.org/OFL');
  });

  it('check name table ID 16: preferredFamily', function () {
    assert.equal(name.records.preferredFamily.en, 'Mada');
  });

  it('check name table ID 17: preferredSubfamily', function () {
    assert.equal(name.records.preferredSubfamily.en, 'Medium');
  });

  const CF = 'This is a compatibleFull.'
  name.records.compatibleFull = {en: CF};
  it('check name table ID 18: compatibleFull', function () {
    assert.equal(name.records.compatibleFull.en, CF );
  });

  const ST = 'This is a sampleText.'
  name.records.sampleText = {en: ST};
  it('check name table ID 19: sampleText', function () {
    assert.equal(name.records.sampleText.en, ST );
  });

  const PSCID = 'This is a postscriptCIDFontName.'
  name.records.postscriptCIDFontName = {en: PSCID};
  it('check name table ID 20: postscriptCIDFontName', function () {
    assert.equal(name.records.postscriptCIDFontName.en, PSCID );
  });

  const WWSFAM = 'This is a wwsFamilyName.'
  name.records.wwsFamilyName = {en: WWSFAM};
  it('check name table ID 21: wwsFamilyName', function () {
    assert.equal(name.records.wwsFamilyName.en, WWSFAM );
  });

  const WWSSUB = 'This is a wwsSubfamilyName.'
  name.records.wwsSubfamilyName = {en: WWSSUB};
  it('check name table ID 22: wwsSubfamilyName', function () {
    assert.equal(name.records.wwsSubfamilyName.en, WWSSUB );
  });

  const LBG = 'This is a lightBackgroundPalette.'
  name.records.lightBackgroundPalette = {en: LBG};
  it('check name table ID 23: lightBackgroundPalette', function () {
    assert.equal(name.records.lightBackgroundPalette.en, LBG );
  });

  const DBG = 'This is a darkBackgroundPalette.'
  name.records.darkBackgroundPalette = {en: DBG};
  it('check name table ID 24: darkBackgroundPalette', function () {
    assert.equal(name.records.darkBackgroundPalette.en, DBG );
  });

  const VAR = 'This is a variationsPostScriptName.'
  name.records.variationsPostScriptName = {en: VAR};
  it('check name table ID 25: variationsPostScriptName', function () {
    assert.equal(name.records.variationsPostScriptName.en, VAR );
  });

});
