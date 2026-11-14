import { registerFormat, registerShaper } from './core';
import { TTFFont } from './TTFFont';
import { WOFFFont } from './WOFFFont';
import { WOFF2Font } from './WOFF2Font';
import { TrueTypeCollection } from './TrueTypeCollection';
import { DFont } from './DFont';
import { UniversalShaper } from './opentype/shapers/UniversalShaper';
import { ArabicShaper } from './opentype/shapers/ArabicShaper';
import { IndicShaper } from './opentype/shapers/IndicShaper';
import { HangulShaper } from './opentype/shapers/HangulShaper';
import { HebrewShaper } from './opentype/shapers/HebrewShaper';
import { MyanmarShaper } from './opentype/shapers/MyanmarShaper';
import { ThaiShaper } from './opentype/shapers/ThaiShaper';

// Register font formats
registerFormat(TTFFont);
registerFormat(WOFFFont);
registerFormat(WOFF2Font);
registerFormat(TrueTypeCollection);
registerFormat(DFont);

// Register all specialized shapers
registerShaper(UniversalShaper);
registerShaper(ArabicShaper);
registerShaper(IndicShaper);
registerShaper(HangulShaper);
registerShaper(HebrewShaper);
registerShaper(MyanmarShaper);
registerShaper(ThaiShaper);

export * from './core';
