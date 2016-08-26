import unicode from 'unicode-properties';

export default class GlyphInfo {
  constructor(id, codePoints = [], features = []) {
    this.id = id;
    this.codePoints = codePoints;

    // TODO: get this info from GDEF if available
    this.isMark = this.codePoints.every(unicode.isMark);
    this.isLigature = this.codePoints.length > 1;

    this.features = {};
    if (Array.isArray(features)) {
      for (let i = 0; i < features.length; i++) {
        let feature = features[i];
        this.features[feature] = true;
      }
    } else if (typeof features === 'object') {
      Object.assign(this.features, features);
    }

    this.ligatureID = null;
    this.ligatureComponent = null;
    this.cursiveAttachment = null;
    this.markAttachment = null;
  }
}
