import { inflateRawSync, brotliDecompressSync } from 'node:zlib';

export function inflateSync(buffer) {
  return inflateRawSync(buffer);
}

export { brotliDecompressSync };
