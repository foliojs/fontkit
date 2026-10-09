import {Feature} from './opentype';
import * as r from 'restructure';

/*******************
 * Variation Store *
 *******************/

let F2DOT14 = new r.Fixed(16, 'BE', 14);
let RegionAxisCoordinates = new r.Struct({
  startCoord: F2DOT14,
  peakCoord: F2DOT14,
  endCoord: F2DOT14
});

let VariationRegionList = new r.Struct({
  axisCount: r.uint16,
  regionCount: r.uint16,
  variationRegions: new r.Array(new r.Array(RegionAxisCoordinates, 'axisCount'), 'regionCount')
});

let shortDeltaSet = new r.Struct({
  shortDeltas: new r.Array(r.int16, t => t.parent.shortDeltaCount & 0x7FFF),
  regionDeltas: new r.Array(r.int8, t => t.parent.regionIndexCount - (t.parent.shortDeltaCount  & 0x7FFF)),
  deltas: t => t.shortDeltas.concat(t.regionDeltas)
});

let longDeltaSet = new r.Struct({
  shortDeltas: new r.Array(r.int32, t => t.parent.shortDeltaCount & 0x7FFF),
  regionDeltas: new r.Array(r.int16, t => t.parent.regionIndexCount - (t.parent.shortDeltaCount & 0x7FFF)),
  deltas: t => t.shortDeltas.concat(t.regionDeltas)
});

var DeltaSets = new r.Struct({})

DeltaSets.decode = function(stream, parent) {
  var decoder = new r.Array(
    (parent.shortDeltaCount & 0x8000) ? longDeltaSet : shortDeltaSet,
    parent.itemCount
  );
  return decoder.decode(stream, parent);
};

DeltaSets.encode = function(stream, array, parent) {
  for (var deltaset of array) {
    // Split deltas into short and long, if this hasn't been done already
    let shortDeltaCount = parent.val.shortDeltaCount & 0x7FFF;
    deltaset.shortDeltas = deltaset.deltas.slice(0, shortDeltaCount);
    deltaset.regionDeltas = deltaset.deltas.slice(shortDeltaCount);
    if (parent.val.shortDeltaCount & 0x8000) {
      longDeltaSet.encode(stream, deltaset, parent)
    } else {
      shortDeltaSet.encode(stream, deltaset, parent)
    }
  }
}

let ItemVariationData = new r.Struct({
  itemCount: r.uint16,
  shortDeltaCount: r.uint16,
  regionIndexCount: r.uint16,
  regionIndexes: new r.Array(r.uint16, 'regionIndexCount'),
  deltaSets: DeltaSets
});

ItemVariationData.size = function(array, ctx) {
  let headersize = 6 + 2 * array.regionIndexCount;
  let shortDeltaCount = array.shortDeltaCount;
  let deltasize = 0;
  for (var deltaset of array.deltaSets) {
    var shortDeltas = deltaset.deltas.slice(0, shortDeltaCount & 0x7FFF);
    var regionDeltas = deltaset.deltas.slice(shortDeltaCount & 0x7FFF);
    deltasize += shortDeltas.length * 2 + regionDeltas.length;
  }
  if (shortDeltaCount & 0x8000) {
    deltasize *= 2;
  }
  return headersize + deltasize;
}

export let ItemVariationStore = new r.Struct({
  format: r.uint16,
  variationRegionList: new r.Pointer(r.uint32, VariationRegionList),
  variationDataCount: r.uint16,
  itemVariationData: new r.Array(new r.Pointer(r.uint32, ItemVariationData), 'variationDataCount')
});

/***********************
 * Delta Set Index Map *
 ***********************/

// TODO: add this to restructure
class VariableSizeNumber {
  constructor(size) {
    this._size = size;
  }

  decode(stream, parent) {
    switch (this.size(0, parent)) {
      case 1: return stream.readUInt8();
      case 2: return stream.readUInt16BE();
      case 3: return stream.readUInt24BE();
      case 4: return stream.readUInt32BE();
    }
  }

  size(val, parent) {
    return r.resolveLength(this._size, null, parent);
  }
}

let MapDataEntry = new r.Struct({
  entry: new VariableSizeNumber(t => ((t.parent.entryFormat & 0x0030) >> 4) + 1),
  outerIndex: t => t.entry >> ((t.parent.entryFormat & 0x000F) + 1),
  innerIndex: t => t.entry & ((1 << ((t.parent.entryFormat & 0x000F) + 1)) - 1)
});

MapDataEntry.encode = function (stream, val, parent) {
  let fmt = (parent.val.entryFormat & 0x0030)
  let innerBits = 1 + (fmt & 0x000F);
  let innerMask = (1 << innerBits) - 1;
  let outerShift = 16 - innerBits;
  let entrySize = 1 + ((fmt & 0x0030) >> 4);
  let packed = (((val.entry & 0xFFFF0000) >> outerShift) | (val.entry & innerMask))
  switch(entrySize) {
    case 1: return stream.writeUInt8(packed);
    case 2: return stream.writeUInt16BE(packed);
    case 3: return stream.writeUInt24BE(packed);
    case 4: return stream.writeUInt32BE(packed);
  }
}

export let DeltaSetIndexMap = new r.VersionedStruct(r.uint8, {
  0: {
    entryFormat: r.uint8,
    mapCount: r.uint16,
    mapData: new r.Array(MapDataEntry, 'mapCount')
  },
  1: {
    entryFormat: r.uint8,
    mapCount: r.uint32,
    mapData: new r.Array(MapDataEntry, 'mapCount')
  }
});

DeltaSetIndexMap.preEncode = function (val, stream) {
  // Compute correct version and entry format
  let ored = 0;
  for (var idx of val.mapData) {
      ored |= idx.entry
  }
  let inner = ored & 0xFFFF
  let innerBits = 0
  while (inner) {
      innerBits += 1
      inner >>= 1
  }
  innerBits = Math.max(innerBits, 1)
  console.assert(innerBits <= 16)

  ored = (ored >> (16 - innerBits)) | (ored & ((1 << innerBits) - 1))
  let entrySize = 1;
  if (ored  <= 0x000000FF) {
      entrySize = 1
  } else if (ored <= 0x0000FFFF) {
      entrySize = 2
  } else if (ored <= 0x00FFFFFF) {
      entrySize = 3
  } else {
      entrySize = 4
  }

  val.entryFormat = ((entrySize - 1) << 4) | (innerBits - 1)
  val.mapCount = val.mapData.length
  if (val.mapCount > 0xFFFF) {
    val.version = 1
  } else {
    val.version = 0
  }
}

/**********************
 * Feature Variations *
 **********************/

let ConditionTable = new r.VersionedStruct(r.uint16, {
  1: {
    axisIndex: r.uint16,
    axisIndex: r.uint16,
    filterRangeMinValue: F2DOT14,
    filterRangeMaxValue: F2DOT14
  }
});

let ConditionSet = new r.Struct({
  conditionCount: r.uint16,
  conditionTable: new r.Array(new r.Pointer(r.uint32, ConditionTable), 'conditionCount')
});

let FeatureTableSubstitutionRecord = new r.Struct({
  featureIndex: r.uint16,
  alternateFeatureTable: new r.Pointer(r.uint32, Feature, {type: 'parent'})
});

let FeatureTableSubstitution = new r.Struct({
  version: r.fixed32,
  substitutionCount: r.uint16,
  substitutions: new r.Array(FeatureTableSubstitutionRecord, 'substitutionCount')
});

let FeatureVariationRecord = new r.Struct({
  conditionSet: new r.Pointer(r.uint32, ConditionSet, {type: 'parent'}),
  featureTableSubstitution: new r.Pointer(r.uint32, FeatureTableSubstitution, {type: 'parent'})
});

export let FeatureVariations = new r.Struct({
  majorVersion: r.uint16,
  minorVersion: r.uint16,
  featureVariationRecordCount: r.uint32,
  featureVariationRecords: new r.Array(FeatureVariationRecord, 'featureVariationRecordCount')
});
