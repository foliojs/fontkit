import type { Font } from '../core.js';

/** TrueType and OpenType fonts, and the base class of the other single-font formats */
export interface TTFFont extends Font {}
export class TTFFont {
  static probe(buffer: Uint8Array): boolean;
}
