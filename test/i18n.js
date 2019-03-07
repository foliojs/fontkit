import assert from 'assert';

import fontkit from '../src';

describe('i18n', function() {
    describe('fontkit.setDefaultLanguage', function () {
        after(function () {
            fontkit.setDefaultLanguage();
        });

        it('has "en" metadata properties', function() {
            let font = fontkit.openSync(__dirname + '/data/amiri/amiri-regular.ttf');

            assert.equal(font.fullName, 'Amiri');
            assert.equal(font.postscriptName, 'Amiri-Regular');
            assert.equal(font.familyName, 'Amiri');
            assert.equal(font.subfamilyName, 'Regular');
            assert.equal(font.copyright, 'Copyright (c) 2010-2017, Khaled Hosny <khaledhosny@eglug.org>.\nPortions copyright (c) 2010, Sebastian Kosch <sebastian@aldusleaf.org>.');
            assert.equal(font.version, 'Version 000.110 ');
        });

        it('can set default language to "ar"', function () {
            fontkit.setDefaultLanguage('ar');
            assert.equal(fontkit.defaultLanguage, 'ar');
        });

        it('has "ar" metadata properties', function() {
            let font = fontkit.openSync(__dirname + '/data/amiri/amiri-regular.ttf');

            assert.equal(font.fullName, undefined,);
            assert.equal(font.postscriptName, 'Amiri-Regular',);
            assert.equal(font.familyName, undefined,);
            assert.equal(font.subfamilyName, 'عادي',);
            assert.equal(font.copyright, 'حقوق النشر 2010-2017، خالد حسني <khaledhosny@eglug.org>.',);
            assert.equal(font.version, 'إصدارة 000٫110');
        });

        it('can set default language back to "en"', function () {
            fontkit.setDefaultLanguage();
            assert.equal(fontkit.defaultLanguage, "en");
        });
    });

    describe('font.setDefaultLanguage', function () {
        let font;
        before('load Amiri font', function () {
            font = fontkit.openSync(__dirname + '/data/amiri/amiri-regular.ttf');
        });

        it('has "en" metadata properties', function() {
            assert.equal(font.fullName, 'Amiri');
            assert.equal(font.postscriptName, 'Amiri-Regular');
            assert.equal(font.familyName, 'Amiri');
            assert.equal(font.subfamilyName, 'Regular');
            assert.equal(font.copyright, 'Copyright (c) 2010-2017, Khaled Hosny <khaledhosny@eglug.org>.\nPortions copyright (c) 2010, Sebastian Kosch <sebastian@aldusleaf.org>.');
            assert.equal(font.version, 'Version 000.110 ');
        });

        it('has "ar" metadata properties', function() {
            font.setDefaultLanguage('ar');

            assert.equal(font.fullName, undefined,);
            assert.equal(font.postscriptName, 'Amiri-Regular',);
            assert.equal(font.familyName, undefined,);
            assert.equal(font.subfamilyName, 'عادي',);
            assert.equal(font.copyright, 'حقوق النشر 2010-2017، خالد حسني <khaledhosny@eglug.org>.',);
            assert.equal(font.version, 'إصدارة 000٫110');
        });

        it('can set default language back to "en"', function () {
            font.setDefaultLanguage();
            assert.equal(font.defaultLanguage, "en");

            assert.equal(font.subfamilyName, 'Regular');
        });
    });
});
