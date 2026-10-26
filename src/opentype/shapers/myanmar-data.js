// Categories of HarfBuzz's Myanmar shaper, numbered consecutively for the
// state machine:
// https://github.com/harfbuzz/harfbuzz/blob/main/src/hb-ot-shaper-myanmar-machine.rl
export const CATEGORIES = {
  X: 0,
  C: 1,
  IV: 2,
  DB: 3, // Dot below
  H: 4,
  ZWNJ: 5,
  ZWJ: 6,
  SM: 7, // Visarga and Shan tones
  A: 8,
  GB: 9, // Placeholder
  DOTTEDCIRCLE: 10,
  Ra: 11,
  CS: 12,
  VAbv: 13,
  VBlw: 14,
  VPre: 15,
  VPst: 16,
  As: 17, // Asat
  MH: 18, // Medial Ha
  MR: 19, // Medial Ra
  MW: 20, // Medial Wa, Shan Wa
  MY: 21, // Medial Ya, Mon Na, Mon Ma
  PT: 22, // Pwo and other tones
  VS: 23, // Variation selectors
  ML: 24, // Medial Mon La
  SMPst: 25,
};
