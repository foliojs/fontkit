import * as AATFeatureMap from './AATFeatureMap';
import * as Script from '../layout/Script';
import AATMorxProcessor from './AATMorxProcessor';

export default class AATLayoutEngine {
  constructor(font) {
    this.morxProcessor = new AATMorxProcessor(font);
  }

  substitute(glyphs, features, script, language) {
    // AAT expects the glyphs to be in visual order prior to morx processing,
    // so reverse the glyphs if the script is right-to-left.
    let isRTL = Script.direction(script) === 'rtl';
    if (isRTL) {
      glyphs.reverse();
    }

    this.morxProcessor.process(glyphs, AATFeatureMap.mapOTToAAT(features));
    return glyphs;
  }

  getAvailableFeatures(script, language) {
    return AATFeatureMap.mapAATToOT(this.morxProcessor.getSupportedFeatures());
  }
}
