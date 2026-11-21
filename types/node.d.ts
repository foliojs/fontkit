import type { Font, FontCollection } from './core.js';

export * from './index.js';

/**
 * Opens a font file asynchronously, returning a promise that resolves with a font object.
 * For collection fonts (such as TrueType collection files),
 * you can pass a postscriptName to get that font out of the collection instead of a collection object.
 */
export function open(
  filename: string | URL,
  postscriptName?: null,
): Promise<Font | FontCollection>;
/** Resolves with the font with the given postscriptName, or null if the collection has none. */
export function open(
  filename: string | URL,
  postscriptName: string,
): Promise<Font | null>;
export function open(
  filename: string | URL,
  postscriptName?: string | null,
): Promise<Font | FontCollection | null>;

/**
 * Opens a font file synchronously, and returns a font object.
 * For collection fonts (such as TrueType collection files),
 * you can pass a postscriptName to get that font out of the collection instead of a collection object.
 */
export function openSync(
  filename: string | URL,
  postscriptName?: null,
): Font | FontCollection;
/** Returns the font with the given postscriptName, or null if the collection has none. */
export function openSync(
  filename: string | URL,
  postscriptName: string,
): Font | null;
export function openSync(
  filename: string | URL,
  postscriptName?: string | null,
): Font | FontCollection | null;
