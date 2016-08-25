import DefaultShaper from './DefaultShaper';
import ArabicShaper from './ArabicShaper';
import HangulShaper from './HangulShaper';

const SHAPERS = {
  arab: ArabicShaper,    // Arabic
  mong: ArabicShaper,    // Mongolian
  syrc: ArabicShaper,    // Syriac
  'nko ': ArabicShaper,  // N'Ko
  phag: ArabicShaper,    // Phags Pa
  mand: ArabicShaper,    // Mandaic
  mani: ArabicShaper,    // Manichaean
  phlp: ArabicShaper,    // Psalter Pahlavi

  hang: HangulShaper,    // Hangul

  latn: DefaultShaper,   // Latin
  DFLT: DefaultShaper   // Default
};

export function choose(script) {
  let shaper = SHAPERS[script];
  if (shaper) { return shaper; }

  return DefaultShaper;
}
