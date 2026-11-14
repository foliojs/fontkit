import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

async function bundleConsumer(
  platform,
  source,
  { external, ...outputOptions } = {},
) {
  const input = fileURLToPath(new URL('../consumer.js', import.meta.url));
  const moduleIds = [];
  const build = await rolldown({
    platform,
    input,
    external: external ?? [
      'fs',
      'node:zlib',
      'restructure',
      'dfa',
      'fflate',
      'unicode-properties',
      'unicode-trie',
      'brotli/decompress.js',
    ],
    plugins: [
      {
        name: 'test-consumer',
        moduleParsed({ id }) {
          moduleIds.push(id);
        },
        resolveId(id) {
          if (id === input) return id;
        },
        load(id) {
          if (id === input) return source;
        },
      },
    ],
  });

  try {
    const { output } = await build.generate({
      format: 'esm',
      ...outputOptions,
    });
    const chunks = output.filter((chunk) => chunk.type === 'chunk');
    return {
      code: chunks.map((chunk) => chunk.code).join('\n'),
      imports: chunks.flatMap((chunk) => chunk.imports),
      moduleIds,
      modules: chunks.flatMap((chunk) =>
        Object.entries(chunk.modules)
          .filter(([, module]) => module.renderedLength > 0)
          .map(([id]) => id),
      ),
    };
  } finally {
    await build.close();
  }
}

describe('platform-specific bundles', function () {
  for (const platform of ['node', 'browser']) {
    describe(platform, function () {
      it('should emit implementations without forwarding entry files', function () {
        const directory = new URL(`../dist/${platform}/`, import.meta.url);
        const files = readdirSync(directory, { recursive: true }).filter(
          (file) => file.endsWith('.js'),
        );
        for (const file of files) {
          const code = readFileSync(new URL(file, directory), 'utf8');
          assert.doesNotMatch(
            code,
            /^\s*export\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?\s*$/,
            `${file} should contain its implementation`,
          );
        }
      });

      it('should select the platform entry and compression backend', async function () {
        const { imports, modules } = await bundleConsumer(
          platform,
          "export * from 'fontkit';",
        );
        assert(modules.some((id) => id.endsWith(`/dist/${platform}/index.js`)));
        if (platform === 'node') {
          assert(imports.includes('node:zlib'));
          assert(imports.includes('fs'));
          assert(!imports.includes('fflate'));
          assert(!imports.includes('brotli/decompress.js'));
        } else {
          assert(imports.includes('fflate'));
          assert(imports.includes('brotli/decompress.js'));
          assert(!imports.includes('node:zlib'));
          assert(!imports.includes('fs'));
        }
      });

      it('should preserve default format and shaper registration after tree shaking', async function () {
        const { code } = await bundleConsumer(
          platform,
          "export { create } from 'fontkit';",
          { paths: (id) => import.meta.resolve(id) },
        );
        const fontkit = await import(
          'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
        );
        for (const [file, type] of [
          ['OpenSans/OpenSans-Regular.ttf', 'TTF'],
          ['SourceSansPro/SourceSansPro-Regular.woff', 'WOFF'],
          ['SourceSansPro/SourceSansPro-Regular.woff2', 'WOFF2'],
          ['NotoSans/NotoSans.ttc', 'TTC'],
          ['NotoSans/NotoSans.dfont', 'DFont'],
        ]) {
          let font = fontkit.create(
            readFileSync(new URL('data/' + file, import.meta.url)),
          );
          assert.equal(font.type, type);
          if (type === 'TTC' || type === 'DFont') {
            font = font.getFont('NotoSans');
          }
          assert.equal(typeof font.postscriptName, 'string');
        }

        for (const [file, text, ids] of [
          [
            'NotoSans/NotoKufiArabic-Regular.ttf',
            'سُلَّاِّمتی',
            [223, 143, 39, 270, 268, 51, 101, 15],
          ],
          ['NotoSans/NotoSerifKannada-Regular.ttf', 'ಲ್ಲಿ', [250, 126]],
          ['NotoSans/NotoSansBalinese-Regular.ttf', 'ᬶ', [128, 58]],
          [
            'NotoSansCJK/NotoSansCJKkr-Regular.otf',
            '\ua960\ud7b0\ud7cb',
            [64003, 64479, 64822],
          ],
          ['Hebrew/TaameyFrankCLM.ttf', 'אְַֽ', [11, 22, 17, 28]],
          [
            'NotoSans/NotoSansMyanmar-Regular.ttf',
            'မြန်မာ',
            [47, 29, 24, 381, 29, 368],
          ],
          ['NotoSans/NotoSansThai-Regular.ttf', 'น้ำ', [71, 59, 49, 86]],
        ]) {
          const font = fontkit.create(
            readFileSync(new URL('data/' + file, import.meta.url)),
          );
          assert.deepEqual(
            font.layout(text).glyphs.map((glyph) => glyph.id),
            ids,
          );
        }
      });

      for (const [name, source, entry] of [
        ['core', "export * from 'fontkit/core';", 'core'],
        [
          'TTF',
          "import { registerFormat } from 'fontkit/core'; import { TTFFont } from 'fontkit/formats/TTFFont'; registerFormat(TTFFont); export { create } from 'fontkit/core';",
          'formats/TTFFont',
        ],
      ]) {
        it(`should keep ${name} consumers free of compression and filesystem dependencies`, async function () {
          const { code, imports, moduleIds } = await bundleConsumer(
            platform,
            source,
          );
          assert(
            moduleIds.some((id) =>
              id.endsWith(`/dist/${platform}/${entry}.js`),
            ),
          );
          assert(!imports.includes('node:zlib'));
          assert(!imports.includes('fs'));
          assert(!imports.includes('fflate'));
          assert(!imports.includes('brotli/decompress.js'));
          assert(!imports.includes('dfa'));
          assert(!imports.includes('unicode-trie'));
          for (const name of [
            'UniversalShaper',
            'ArabicShaper',
            'IndicShaper',
            'HangulShaper',
            'HebrewShaper',
            'MyanmarShaper',
            'ThaiShaper',
          ]) {
            assert(!code.includes(name), name + ' should not be bundled');
          }
        });
      }

      it('should bundle and register only the requested specialized shaper', async function () {
        const { code, imports, moduleIds } = await bundleConsumer(
          platform,
          "import { registerFormat, registerShaper } from 'fontkit/core'; import { TTFFont } from 'fontkit/formats/TTFFont'; import { ArabicShaper } from 'fontkit/shapers/ArabicShaper'; registerFormat(TTFFont); registerShaper(ArabicShaper); export { create } from 'fontkit/core';",
          { paths: (id) => import.meta.resolve(id) },
        );
        assert(
          moduleIds.some((id) =>
            id.endsWith(`/dist/${platform}/shapers/ArabicShaper.js`),
          ),
        );
        assert(imports.includes(import.meta.resolve('unicode-trie')));
        assert(!imports.includes(import.meta.resolve('dfa')));
        for (const name of [
          'UniversalShaper',
          'IndicShaper',
          'HangulShaper',
          'HebrewShaper',
          'MyanmarShaper',
          'ThaiShaper',
        ]) {
          assert(!code.includes(name), name + ' should not be bundled');
        }
        const fontkit = await import(
          'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
        );
        const font = fontkit.create(
          readFileSync(
            new URL(
              'data/NotoSans/NotoKufiArabic-Regular.ttf',
              import.meta.url,
            ),
          ),
        );
        assert.deepEqual(
          font.layout('سُلَّاِّمتی').glyphs.map((glyph) => glyph.id),
          [223, 143, 39, 270, 268, 51, 101, 15],
        );
      });
    });
  }

  it('should exclude Brotli from a fully bundled browser WOFF consumer', async function () {
    const { code, modules } = await bundleConsumer(
      'browser',
      "import { registerFormat } from 'fontkit/core'; import { WOFFFont } from 'fontkit/formats/WOFFFont'; registerFormat(WOFFFont); export { create } from 'fontkit/core';",
      { external: [] },
    );
    assert(modules.some((id) => /node_modules[\\/]fflate[\\/]/.test(id)));
    assert(!modules.some((id) => /node_modules[\\/]brotli[\\/]/.test(id)));
    const fontkit = await import(
      'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
    );
    const font = fontkit.create(
      readFileSync(
        new URL(
          'data/SourceSansPro/SourceSansPro-Regular.woff',
          import.meta.url,
        ),
      ),
    );
    assert.equal(font.postscriptName, 'SourceSansPro-Regular');
    assert(font.glyphsForString('a')[0].path.toSVG().length > 0);
  });
});
