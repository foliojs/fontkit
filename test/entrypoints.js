import { Worker } from 'node:worker_threads';

const formats = [
  ['TTFFont', 'data/OpenSans/OpenSans-Regular.ttf', 'TTF'],
  ['WOFFFont', 'data/SourceSansPro/SourceSansPro-Regular.woff', 'WOFF'],
  ['WOFF2Font', 'data/SourceSansPro/SourceSansPro-Regular.woff2', 'WOFF2'],
  ['TrueTypeCollection', 'data/NotoSans/NotoSans.ttc', 'TTC'],
  ['DFont', 'data/NotoSans/NotoSans.dfont', 'DFont'],
];

const shapers = {
  DefaultShaper: ['latn', 'DFLT'],
  ArabicShaper: [
    'arab',
    'mong',
    'syrc',
    'nko ',
    'phag',
    'mand',
    'mani',
    'phlp',
  ],
  IndicShaper: [
    'bng2',
    'beng',
    'dev2',
    'deva',
    'gjr2',
    'gujr',
    'guru',
    'gur2',
    'knda',
    'knd2',
    'mlm2',
    'mlym',
    'ory2',
    'orya',
    'taml',
    'tml2',
    'telu',
    'tel2',
    'khmr',
    'sinh',
  ],
  UniversalShaper: [
    'bali',
    'batk',
    'brah',
    'bugi',
    'buhd',
    'cakm',
    'cham',
    'dupl',
    'egyp',
    'gran',
    'hano',
    'java',
    'kthi',
    'kali',
    'khar',
    'khoj',
    'sind',
    'lepc',
    'limb',
    'mahj',
    'mtei',
    'modi',
    'hmng',
    'rjng',
    'saur',
    'shrd',
    'sidd',
    'sund',
    'sylo',
    'tglg',
    'tagb',
    'tale',
    'lana',
    'tavt',
    'takr',
    'tibt',
    'tfng',
    'tirh',
  ],
  HangulShaper: ['hang'],
  HebrewShaper: ['hebr'],
  MyanmarShaper: ['mym2'],
  ThaiShaper: ['thai', 'lao '],
};

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
          const shapers = ${JSON.stringify(shapers)};
          const readFont = (filename) => readFileSync(new URL(filename, ${JSON.stringify(import.meta.url)}));
          const buffers = formats.map(([, filename]) => readFont(filename));
          const makeShaperProbe = (font, DefaultShaper) => {
            // Keep the OT engine, but let the requested script reach the registry
            // rather than falling back to the font's Latin script table.
            font.GSUB.scriptList = [];
            font.GPOS.scriptList = [];
            let selected;
            const plan = DefaultShaper.plan;
            DefaultShaper.plan = function (...args) {
              selected = this;
              // Test selection independently of script-specific shaping algorithms.
              return plan.apply(DefaultShaper, args);
            };
            return (script) => {
              selected = null;
              font.layout('a', {}, script);
              assert(selected, 'layout should invoke a shaper');
              return selected;
            };
          };
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
        'create', 'defaultLanguage', 'logErrors', 'registerFormat', 'registerShaper', 'setDefaultLanguage'
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

      it('should import named shapers without registering them and register every declared script explicitly', function () {
        return runModule(
          platform,
          `
      const core = await loadModule('core');
      const { TTFFont } = await loadModule('formats/TTFFont');
      const { DefaultShaper } = await loadModule('shapers/DefaultShaper');
      core.registerFormat(TTFFont);
      const selectShaper = makeShaperProbe(core.create(buffers[0]), DefaultShaper);
      for (const [name, scripts] of Object.entries(shapers)) {
        const shaperModule = await loadModule('shapers/' + name);
        const Shaper = shaperModule[name];
        assert.equal(typeof Shaper, 'function');
        assert(!('default' in shaperModule));
        assert(Object.hasOwn(Shaper, 'scripts'));
        assert.deepEqual(Shaper.scripts, scripts);
        for (const script of scripts) {
          assert.strictEqual(selectShaper(script), DefaultShaper, name + ' imported without registration');
        }
        assert.equal(core.registerShaper(Shaper), undefined);
        core.registerShaper(Shaper);
        for (const script of scripts) {
          assert.strictEqual(selectShaper(script), Shaper, script);
        }
      }
      for (const script of ['zzzz', 'mymr', 'nko', 'lao', '__proto__', 'constructor']) {
        assert.strictEqual(selectShaper(script), DefaultShaper);
      }
    `,
        );
      });

      it('should override static scripts per registration without changing metadata or removing earlier mappings', function () {
        return runModule(
          platform,
          `
      const core = await loadModule('core');
      const { TTFFont } = await loadModule('formats/TTFFont');
      const { DefaultShaper } = await loadModule('shapers/DefaultShaper');
      core.registerFormat(TTFFont);
      const selectShaper = makeShaperProbe(core.create(buffers[0]), DefaultShaper);
      const staticScripts = Object.freeze(['stat']);
      class CustomShaper extends DefaultShaper {
        static scripts = staticScripts;
      }
      const overrides = Object.freeze(['one ', 'two ']);
      assert.equal(core.registerShaper(CustomShaper, overrides), undefined);
      assert.strictEqual(selectShaper('one '), CustomShaper);
      assert.strictEqual(selectShaper('two '), CustomShaper);
      assert.strictEqual(selectShaper('one'), DefaultShaper);
      assert.strictEqual(selectShaper('stat'), DefaultShaper);
      assert.strictEqual(CustomShaper.scripts, staticScripts);
      assert.deepEqual(CustomShaper.scripts, ['stat']);
      assert.deepEqual(overrides, ['one ', 'two ']);

      assert.equal(core.registerShaper(CustomShaper, []), undefined);
      assert.strictEqual(selectShaper('stat'), DefaultShaper);
      assert.strictEqual(selectShaper('one '), CustomShaper);
      assert.strictEqual(selectShaper('two '), CustomShaper);

      core.registerShaper(CustomShaper);
      assert.strictEqual(selectShaper('stat'), CustomShaper);
      core.registerShaper(DefaultShaper, ['stat']);
      assert.strictEqual(selectShaper('stat'), DefaultShaper);
      core.registerShaper(CustomShaper, undefined);
      assert.strictEqual(selectShaper('stat'), CustomShaper);
      assert.strictEqual(selectShaper('one '), CustomShaper);
      assert.strictEqual(selectShaper('two '), CustomShaper);

      class ReplacementShaper extends DefaultShaper {
        static scripts = undefined;
      }
      core.registerShaper(ReplacementShaper, []);
      core.registerShaper(ReplacementShaper, ['one ']);
      assert.strictEqual(selectShaper('one '), ReplacementShaper);
      assert.strictEqual(selectShaper('two '), CustomShaper);
      assert.strictEqual(selectShaper('stat'), CustomShaper);
    `,
        );
      });

      it('should replace shapers by script and select script arrays in order', function () {
        return runModule(
          platform,
          `
      const core = await loadModule('core');
      const { TTFFont } = await loadModule('formats/TTFFont');
      const { DefaultShaper } = await loadModule('shapers/DefaultShaper');
      core.registerFormat(TTFFont);
      const font = core.create(buffers[0]);
      // No matching OT script forces the buffer's requested script through to selection.
      font.GSUB.scriptList = [];
      font.GPOS.scriptList = [];
      class FirstShaper extends DefaultShaper {
        static scripts = ['one ', 'both'];
        static planFeatures(plan) { plan.add('tst1'); }
      }
      class SecondShaper extends DefaultShaper {
        static scripts = ['two ', 'both', 'latn', 'DFLT'];
        static planFeatures(plan) { plan.add('tst2'); }
      }
      core.registerShaper(FirstShaper);
      assert.equal(font.layout('a', {}, 'both').features.tst1, true);
      core.registerShaper(SecondShaper);
      core.registerShaper(SecondShaper);
      for (const script of ['both', 'latn', 'DFLT', ['zzzz', 'two ', 'one ']]) {
        const { features } = font.layout('a', {}, script);
        assert.equal(features.tst2, true);
        assert(!features.tst1);
      }
      const { features } = font.layout('a', {}, ['zzzz', 'one ', 'two ']);
      assert.equal(features.tst1, true);
      assert(!features.tst2);
      for (const script of ['zzzz', 'one', ['zzzz', 'nope']]) {
        const { features } = font.layout('a', {}, script);
        assert(!features.tst1);
        assert(!features.tst2);
      }
    `,
        );
      });

      it('should register all built-in shapers in the main entry', function () {
        return runModule(
          platform,
          `
      const core = await loadModule('core');
      const { TTFFont } = await loadModule('formats/TTFFont');
      const { DefaultShaper } = await loadModule('shapers/DefaultShaper');
      core.registerFormat(TTFFont);
      const selectShaper = makeShaperProbe(core.create(buffers[0]), DefaultShaper);
      for (const scripts of Object.values(shapers)) {
        for (const script of scripts) {
          assert.strictEqual(selectShaper(script), DefaultShaper);
        }
      }
      await loadModule('index');
      for (const [name, scripts] of Object.entries(shapers)) {
        const { [name]: Shaper } = await loadModule('shapers/' + name);
        for (const script of scripts) {
          assert.strictEqual(selectShaper(script), Shaper, script);
        }
      }
    `,
        );
      });

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

        const { DefaultShaper } = await loadModule('shapers/DefaultShaper');
        const selectShaper = makeShaperProbe(core.create(buffers[0]), DefaultShaper);
        class CustomShaper extends DefaultShaper { static scripts = ['latn']; }
        fontkit.registerShaper(CustomShaper);
        assert.strictEqual(selectShaper('latn'), CustomShaper);
        core.registerShaper(DefaultShaper);
        assert.strictEqual(selectShaper('latn'), DefaultShaper);

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

      const { TTFFont: BrowserTTFFont } = await import(new URL('browser/formats/TTFFont.js', buildURL));
      const { DefaultShaper } = await loadModule('shapers/DefaultShaper');
      const { DefaultShaper: BrowserDefaultShaper } = await import(new URL('browser/shapers/DefaultShaper.js', buildURL));
      const { ArabicShaper } = await loadModule('shapers/ArabicShaper');
      browser.registerFormat(BrowserTTFFont);
      const selectNodeShaper = makeShaperProbe(core.create(buffers[0]), DefaultShaper);
      const selectBrowserShaper = makeShaperProbe(browser.create(buffers[0]), BrowserDefaultShaper);
      assert.strictEqual(selectNodeShaper('arab'), ArabicShaper);
      assert.strictEqual(selectBrowserShaper('arab'), BrowserDefaultShaper);

      const fontkit = await import(new URL('browser/index.js', buildURL));
      const { ArabicShaper: BrowserArabicShaper } = await import(new URL('browser/shapers/ArabicShaper.js', buildURL));
      assert.strictEqual(selectBrowserShaper('arab'), BrowserArabicShaper);
      class NodeShaper extends DefaultShaper { static scripts = ['latn']; }
      core.registerShaper(NodeShaper);
      assert.strictEqual(selectNodeShaper('latn'), NodeShaper);
      assert.strictEqual(selectBrowserShaper('latn'), BrowserDefaultShaper);
      class BrowserShaper extends BrowserDefaultShaper { static scripts = ['latn']; }
      browser.registerShaper(BrowserShaper);
      assert.strictEqual(selectBrowserShaper('latn'), BrowserShaper);
      assert.strictEqual(selectNodeShaper('latn'), NodeShaper);
      assert.strictEqual(fontkit.create, browser.create);
      assert.notStrictEqual(TTFFont, BrowserTTFFont);
      assert(browser.create(buffers[0]) instanceof BrowserTTFFont);
      assert(!(core.create(buffers[0]) instanceof BrowserTTFFont));
    `,
    );
  });
});
