import r from 'restructure';

let Setting = new r.Struct({
  setting: r.uint16,
  nameIndex: r.int16,
  name() { return this.parent.parent.parent.name.records.fontFeatures.English[this.nameIndex] }
});

let FeatureName = new r.Struct({
  feature: r.uint16,
  nSettings: r.uint16,
  settingTable: new r.Pointer(r.uint32, new r.Array(Setting, 'nSettings'), { type: 'parent' }),
  featureFlags: new r.Bitfield(r.uint8, [
    null, null, null, null, null, null,
    'hasDefault', 'exclusive'
  ]),
  defaultSetting: r.uint8,
  nameIndex: r.int16,
  name() { return this.parent.parent.name.records.fontFeatures.English[this.nameIndex] }
});

export default new r.Struct({
  version: r.fixed32,
  featureNameCount: r.uint16,
  reserved1: new r.Reserved(r.uint16),
  reserved2: new r.Reserved(r.uint32),
  featureNames: new r.Array(FeatureName, 'featureNameCount')
});
