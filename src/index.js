import { registerFormat, openSync, open, create, defaultLanguage, setDefaultLanguage } from './base';
import TTFFont from './TTFFont';
import WOFFFont from './WOFFFont';
import WOFF2Font from './WOFF2Font';
import TrueTypeCollection from './TrueTypeCollection';
import DFont from './DFont';

// Register font formats
registerFormat(TTFFont);
registerFormat(WOFFFont);
registerFormat(WOFF2Font);
registerFormat(TrueTypeCollection);
registerFormat(DFont);

export * from './base';

// Legacy default export for backward compatibility.
export default {
  registerFormat,
  openSync,
  open,
  create,
  defaultLanguage,
  setDefaultLanguage
};
