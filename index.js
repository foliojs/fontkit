import fontkit from './base';
import TTFFont from './src/TTFFont';
import WOFFFont from './src/WOFFFont';
import WOFF2Font from './src/WOFF2Font';
import TrueTypeCollection from './src/TrueTypeCollection';
import DFont from './src/DFont';

// Register font formats
fontkit.registerFormat(TTFFont);
fontkit.registerFormat(WOFFFont);
fontkit.registerFormat(WOFF2Font);
fontkit.registerFormat(TrueTypeCollection);
fontkit.registerFormat(DFont);

export default fontkit;
