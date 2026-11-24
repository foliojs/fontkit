import type { FontCollection } from '../core.js';

export interface TrueTypeCollection extends FontCollection {}
export class TrueTypeCollection {
  type: 'TTC';
  static probe(buffer: Uint8Array): boolean;
}
