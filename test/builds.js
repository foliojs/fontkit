import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

async function bundleConsumer(
  platform,
  source,
  { external, ...outputOptions } = {},
) {
  const input = fileURLToPath(new URL('../consumer.js', import.meta.url));
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

      it('should preserve default format registration after tree shaking', async function () {
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
          const { imports, modules } = await bundleConsumer(platform, source);
          assert(
            modules.some((id) => id.endsWith(`/dist/${platform}/${entry}.js`)),
          );
          assert(!imports.includes('node:zlib'));
          assert(!imports.includes('fs'));
          assert(!imports.includes('fflate'));
          assert(!imports.includes('brotli/decompress.js'));
        });
      }
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
