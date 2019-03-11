import assert from 'assert';
import fontkit from '../src';

describe('i18n', function() {
  describe('fontkit.setDefaultLanguage', function () {
    let font;
    before('load Amiri font', function() {
      font = fontkit.openSync(__dirname + '/data/amiri/amiri-regular.ttf');
    });

    after('reset default language', function () {
      fontkit.setDefaultLanguage();
    });

    it('font has "en" metadata properties', function() {
      assert.equal(font.fullName, 'Amiri');
      assert.equal(font.postscriptName, 'Amiri-Regular');
      assert.equal(font.familyName, 'Amiri');
      assert.equal(font.subfamilyName, 'Regular');
      assert.equal(font.copyright, 'Copyright (c) 2010-2017, Khaled Hosny <khaledhosny@eglug.org>.\nPortions copyright (c) 2010, Sebastian Kosch <sebastian@aldusleaf.org>.');
      assert.equal(font.version, 'Version 000.110 ');
    });

    it('can set global default language to "ar"', function () {
      fontkit.setDefaultLanguage('ar');
      assert.equal(fontkit.defaultLanguage, 'ar');
    });

    it('font now has "ar" metadata properties', function() {
      assert.equal(font.fullName, 'Amiri');
      assert.equal(font.postscriptName, 'Amiri-Regular');
      assert.equal(font.familyName, 'Amiri');
      assert.equal(font.subfamilyName, 'عادي');
      assert.equal(font.copyright, 'حقوق النشر 2010-2017، خالد حسني <khaledhosny@eglug.org>.');
      assert.equal(font.version, 'إصدارة 000٫110');
    });

    it('can reset default language back to "en"', function () {
      fontkit.setDefaultLanguage();
      assert.equal(fontkit.defaultLanguage, "en");
    });
  });

  describe('font.setDefaultLanguage', function () {
    let font;
    before('load Amiri font', function () {
      font = fontkit.openSync(__dirname + '/data/amiri/amiri-regular.ttf');
    });

    it('font has "en" metadata properties', function() {
      assert.equal(font.fullName, 'Amiri');
      assert.equal(font.postscriptName, 'Amiri-Regular');
      assert.equal(font.familyName, 'Amiri');
      assert.equal(font.subfamilyName, 'Regular');
      assert.equal(font.copyright, 'Copyright (c) 2010-2017, Khaled Hosny <khaledhosny@eglug.org>.\nPortions copyright (c) 2010, Sebastian Kosch <sebastian@aldusleaf.org>.');
      assert.equal(font.version, 'Version 000.110 ');
    });

    it('can set font\'s default language to "ar"', function () {
      font.setDefaultLanguage('ar');
      assert.equal(font.defaultLanguage, 'ar');
    });

    it('font now has "ar" metadata properties', function() {
      assert.equal(font.fullName, 'Amiri');
      assert.equal(font.postscriptName, 'Amiri-Regular');
      assert.equal(font.familyName, 'Amiri');
      assert.equal(font.subfamilyName, 'عادي');
      assert.equal(font.copyright, 'حقوق النشر 2010-2017، خالد حسني <khaledhosny@eglug.org>.');
      assert.equal(font.version, 'إصدارة 000٫110');
    });

    it('the font\'s language should not change when the global changes', function () {
      fontkit.setDefaultLanguage('en');

      assert.equal(font.defaultLanguage, 'ar');
      assert.equal(font.subfamilyName, 'عادي');
    });

    it('can reset default language back to "en"', function () {
      font.setDefaultLanguage();
      assert.equal(font.defaultLanguage, null);
      assert.equal(font.subfamilyName, 'Regular');
    });
  });

  describe('backup languages', function () {
    let font;
    before('load Amiri font', function () {
      font = fontkit.openSync(__dirname + '/data/amiri/amiri-regular.ttf');
    });
    
    after('reset default language', function () {
      fontkit.setDefaultLanguage();
    });

    it('if the font\'s default language isn\'t found, use the global language', function () {
      font.setDefaultLanguage('piglatin');
      fontkit.setDefaultLanguage('ar');

      assert.equal(font.subfamilyName, 'عادي');
    });
    it('if the global language isn\'t found, use "en"', function () {
      font.setDefaultLanguage('piglatin');
      fontkit.setDefaultLanguage('klingon');

      assert.equal(font.subfamilyName, 'Regular');
    });
  });
});
