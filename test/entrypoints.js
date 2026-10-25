import { Worker } from 'node:worker_threads';

const formats = [
  ['TTFFont', 'data/OpenSans/OpenSans-Regular.ttf', 'TTF'],
  ['WOFFFont', 'data/SourceSansPro/SourceSansPro-Regular.woff', 'WOFF'],
  ['WOFF2Font', 'data/SourceSansPro/SourceSansPro-Regular.woff2', 'WOFF2'],
  ['TrueTypeCollection', 'data/NotoSans/NotoSans.ttc', 'TTC'],
  ['DFont', 'data/NotoSans/NotoSans.dfont', 'DFont'],
];

// Each worker gets a fresh registry, independent of tests importing fontkit.
function runModule(code) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
        const assert = require('node:assert/strict');
        const { readFileSync } = require('node:fs');

        (async () => {
          const core = await import('fontkit/core');
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
  it('should expose the base API without registering formats', function () {
    return runModule(`
      assert.deepEqual(Object.keys(core), [
        'create', 'defaultLanguage', 'logErrors', 'registerFormat', 'setDefaultLanguage'
      ]);
      assert.equal(core.defaultLanguage, 'en');
      assert.equal(core.logErrors, false);
      for (const buffer of buffers) {
        assert.throws(() => core.create(buffer), /Unknown font format/);
      }
    `);
  });

  for (const [name] of formats) {
    it(`should import and register ${name} independently`, function () {
      return runModule(`
        const formatModule = await import('fontkit/formats/${name}');
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
      `);
    });
  }

  it('should use core language settings without importing a default entry', function () {
    return runModule(`
      const { TTFFont } = await import('fontkit/formats/TTFFont');
      core.registerFormat(TTFFont);
      const font = core.create(readFont('data/amiri/amiri-regular.ttf'));
      assert.equal(font.subfamilyName, 'Regular');
      core.setDefaultLanguage('ar');
      assert.equal(font.subfamilyName, 'عادي');
      core.setDefaultLanguage();
      assert.equal(font.subfamilyName, 'Regular');
      assert.throws(() => core.create(buffers[1]), /Unknown font format/);
    `);
  });

  for (const order of [
    ['node', 'browser'],
    ['browser', 'node'],
  ]) {
    it(`should share core state with defaults imported in ${order.join(', ')} order`, function () {
      return runModule(`
        core.setDefaultLanguage('ar');
        const entries = {};
        for (const platform of ${JSON.stringify(order)}) {
          entries[platform] = await import(platform === 'node'
            ? 'fontkit'
            : './dist/fontkit.browser.esm.js');
          for (const key of Object.keys(core)) {
            assert.strictEqual(entries[platform][key], core[key]);
          }
        }

        const { node, browser } = entries;
        assert.deepEqual(Object.keys(browser), Object.keys(core));
        assert.deepEqual(Object.keys(node), [...Object.keys(core), 'open', 'openSync'].sort());
        browser.setDefaultLanguage('en');
        assert.equal(core.defaultLanguage, 'en');
        assert.equal(node.defaultLanguage, 'en');
        node.setDefaultLanguage('ar');
        assert.equal(core.defaultLanguage, 'ar');
        assert.equal(browser.defaultLanguage, 'ar');

        for (let i = 0; i < formats.length; i++) {
          const { [formats[i][0]]: Format } = await import('fontkit/formats/' + formats[i][0]);
          assert(core.create(buffers[i]) instanceof Format);
          assert(node.create(buffers[i]) instanceof Format);
          assert(browser.create(buffers[i]) instanceof Format);
        }

        class CustomFont {
          static probe(buffer) { return buffer[0] === 42; }
        }
        browser.registerFormat(CustomFont);
        assert(node.create(Uint8Array.of(42)) instanceof CustomFont);
        assert(core.create(Uint8Array.of(42)) instanceof CustomFont);

        const { TTFFont } = await import('fontkit/formats/TTFFont');
        let probes = 0;
        TTFFont.probe = () => { probes++; return false; };
        assert.throws(() => core.create(new Uint8Array()), /Unknown font format/);
        assert.equal(probes, 1, 'defaults should register each format only once');
      `);
    });
  }
});
