import assert from 'node:assert/strict';
import { brotliCompressSync, deflateSync } from 'node:zlib';
import * as node from '../src/compression/node.js';
import * as browser from '../src/compression/browser.js';

describe('compression adapters', function () {
  const data = Buffer.from('Fontkit WOFF and WOFF2 compression');

  for (const [platform, adapter] of [
    ['node', node],
    ['browser', browser],
  ]) {
    describe(platform, function () {
      it('should inflate WOFF data with its zlib header removed', function () {
        const compressed = deflateSync(data).subarray(2);
        const output = new Uint8Array(data.length);
        assert.deepEqual(
          Buffer.from(adapter.inflateSync(compressed, output)),
          data,
        );
      });

      it('should decompress WOFF2 data with the expected size argument', function () {
        const compressed = brotliCompressSync(data);
        assert.deepEqual(
          Buffer.from(adapter.brotliDecompressSync(compressed, data.length)),
          data,
        );
      });
    });
  }
});
