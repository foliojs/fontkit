import type { FontCollection } from '../core.js';

export interface DFont extends FontCollection {}
export class DFont {
  type: 'DFont';
  static probe(buffer: Uint8Array): boolean;
}
