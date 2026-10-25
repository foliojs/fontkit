import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';

async function bundleConsumer(platform, source) {
  const input = fileURLToPath(new URL('../consumer.js', import.meta.url));
  const build = await rolldown({
    platform,
    input,
    external: [
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
    const { output } = await build.generate({ format: 'esm' });
    const chunks = output.filter((chunk) => chunk.type === 'chunk');
    return {
      imports: chunks.flatMap((chunk) => chunk.imports),
      modules: chunks.flatMap((chunk) => Object.keys(chunk.modules)),
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
});
