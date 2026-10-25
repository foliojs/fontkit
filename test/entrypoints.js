import { Worker } from 'node:worker_threads';

const formats = [
  ['TTFFont', 'data/OpenSans/OpenSans-Regular.ttf', 'TTF'],
  ['WOFFFont', 'data/SourceSansPro/SourceSansPro-Regular.woff', 'WOFF'],
  ['WOFF2Font', 'data/SourceSansPro/SourceSansPro-Regular.woff2', 'WOFF2'],
  ['TrueTypeCollection', 'data/NotoSans/NotoSans.ttc', 'TTC'],
  ['DFont', 'data/NotoSans/NotoSans.dfont', 'DFont'],
];

// Each worker gets a fresh registry, independent of tests importing fontkit.
function runModule(platform, code) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
        const assert = require('node:assert/strict');
        const { readFileSync } = require('node:fs');

        (async () => {
          const platform = ${JSON.stringify(platform)};
          const buildURL = new URL('../dist/', ${JSON.stringify(import.meta.url)});
          const loadModule = (entry) => import(platform === 'node'
            ? (entry === 'index' ? 'fontkit' : 'fontkit/' + entry)
            : new URL('browser/' + entry + '.js', buildURL));
          const formats = ${JSON.stringify(formats)};
          const readFont = (filename) => readFileSync(new URL(filename, ${JSON.stringify(import.meta.url)}));
          const buffers = formats.map(([, filename]) => readFont(filename));
          ${code}
        })();
      `,
      { eval: true },
    );
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Entry point worker exited with code ${code}`));
      }
    });
  });
}

describe('package entry points', function () {
  for (const platform of ['node', 'browser']) {
    describe(platform, function () {
      it('should expose the base API without registering formats', function () {
        return runModule(
          platform,
          `
      const core = await loadModule('core');
      assert.deepEqual(Object.keys(core), [
        'create', 'defaultLanguage', 'logErrors', 'registerFormat', 'setDefaultLanguage'
      ]);
      assert.equal(core.defaultLanguage, 'en');
      assert.equal(core.logErrors, false);
      for (const buffer of buffers) {
        assert.throws(() => core.create(buffer), /Unknown font format/);
      }
    `,
        );
      });

      for (const [name] of formats) {
        it(`should import and register ${name} independently`, function () {
          return runModule(
            platform,
            `
        const core = await loadModule('core');
        const formatModule = await loadModule('formats/${name}');
        const Format = formatModule.${name};
        assert.equal(typeof Format, 'function');
        assert(!('default' in formatModule));
        for (const buffer of buffers) {
          assert.throws(() => core.create(buffer), /Unknown font format/);
        }

        core.registerFormat(Format);
        const index = formats.findIndex(([name]) => name === '${name}');
        const font = core.create(buffers[index]);
        assert(font instanceof Format);
        assert.equal(font.type, formats[index][2]);
        if (font.type === 'TTC' || font.type === 'DFont') {
          assert.equal(core.create(buffers[index], 'NotoSans').postscriptName, 'NotoSans');
        } else {
          assert.equal(typeof font.postscriptName, 'string');
        }
      `,
          );
        });
      }

      it('should use core language settings without importing a default entry', function () {
        return runModule(
          platform,
          `
      const core = await loadModule('core');
      const { TTFFont } = await loadModule('formats/TTFFont');
      core.registerFormat(TTFFont);
      const font = core.create(readFont('data/amiri/amiri-regular.ttf'));
      assert.equal(font.subfamilyName, 'Regular');
      core.setDefaultLanguage('ar');
      assert.equal(font.subfamilyName, 'عادي');
      core.setDefaultLanguage();
      assert.equal(font.subfamilyName, 'Regular');
      assert.throws(() => core.create(buffers[1]), /Unknown font format/);
    `,
        );
      });

      for (const order of [
        ['core', 'index'],
        ['index', 'core'],
      ]) {
        it(`should share state when importing ${order.join(', ')}`, function () {
          return runModule(
            platform,
            `
        const entries = {};
        for (const entry of ${JSON.stringify(order)}) {
          entries[entry] = await loadModule(entry);
        }

        const { core, index: fontkit } = entries;
        assert.strictEqual(core, await import(new URL(platform + '/core.js', buildURL)));
        assert.strictEqual(fontkit, await import(new URL(platform + '/index.js', buildURL)));
        for (const key of Object.keys(core)) {
          assert.strictEqual(fontkit[key], core[key]);
        }
        const expectedKeys = [...Object.keys(core)];
        if (platform === 'node') expectedKeys.push('open', 'openSync');
        assert.deepEqual(Object.keys(fontkit), expectedKeys.sort());
        core.setDefaultLanguage('ar');
        assert.equal(fontkit.defaultLanguage, 'ar');
        fontkit.setDefaultLanguage('en');
        assert.equal(core.defaultLanguage, 'en');

        for (let i = 0; i < formats.length; i++) {
          const { [formats[i][0]]: Format } = await loadModule('formats/' + formats[i][0]);
          assert(core.create(buffers[i]) instanceof Format);
          assert(fontkit.create(buffers[i]) instanceof Format);
        }

        class CustomFont {
          static probe(buffer) { return buffer[0] === 42; }
        }
        fontkit.registerFormat(CustomFont);
        assert(core.create(Uint8Array.of(42)) instanceof CustomFont);

        const { TTFFont } = await loadModule('formats/TTFFont');
        let probes = 0;
        TTFFont.probe = () => { probes++; return false; };
        assert.throws(() => core.create(new Uint8Array()), /Unknown font format/);
        assert.equal(probes, 1, 'defaults should register each format only once');
      `,
          );
        });
      }

      it('should decode compressed metadata, outlines and variations', function () {
        return runModule(
          platform,
          `
      const fontkit = await loadModule('index');
      const expected = fontkit.create(readFont('data/fonttest/TestGVAROne.ttf'));
      for (const extension of ['woff', 'woff2', 'untransformed.woff2']) {
        const font = fontkit.create(readFont('data/fonttest/TestGVAROne.' + extension));
        assert.equal(font.postscriptName, expected.postscriptName);
        assert.deepEqual(font.characterSet, expected.characterSet);
        for (const settings of [null, { wght: 300 }, { wght: 650 }]) {
          const actual = settings ? font.getVariation(settings) : font;
          const reference = settings ? expected.getVariation(settings) : expected;
          assert.equal(actual.numGlyphs, reference.numGlyphs);
          for (let id = 0; id < actual.numGlyphs; id++) {
            const glyph = actual.getGlyph(id);
            const expectedGlyph = reference.getGlyph(id);
            assert.equal(glyph.path.toSVG(), expectedGlyph.path.toSVG());
            assert.equal(glyph.advanceWidth, expectedGlyph.advanceWidth);
          }
        }
      }
    `,
        );
      });
    });
  }

  it('should keep Node and browser registries and settings independent', function () {
    return runModule(
      'node',
      `
      const core = await loadModule('core');
      const browser = await import(new URL('browser/core.js', buildURL));
      assert.notStrictEqual(core.create, browser.create);
      core.setDefaultLanguage('ar');
      assert.equal(browser.defaultLanguage, 'en');
      browser.setDefaultLanguage('fr');
      assert.equal(core.defaultLanguage, 'ar');

      const { TTFFont } = await loadModule('formats/TTFFont');
      core.registerFormat(TTFFont);
      assert(core.create(buffers[0]) instanceof TTFFont);
      assert.throws(() => browser.create(buffers[0]), /Unknown font format/);
      await loadModule('index');
      for (const buffer of buffers) {
        assert.throws(() => browser.create(buffer), /Unknown font format/);
      }

      const fontkit = await import(new URL('browser/index.js', buildURL));
      const { TTFFont: BrowserTTFFont } = await import(new URL('browser/formats/TTFFont.js', buildURL));
      assert.strictEqual(fontkit.create, browser.create);
      assert.notStrictEqual(TTFFont, BrowserTTFFont);
      assert(browser.create(buffers[0]) instanceof BrowserTTFFont);
      assert(!(core.create(buffers[0]) instanceof BrowserTTFFont));
    `,
    );
  });
});
