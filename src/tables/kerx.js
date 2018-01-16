import r from 'restructure';
import { LookupTable, StateTable, UnboundedArray } from './aat';

let KerxPair = new r.Struct({
  left:   r.uint16,
  right:  r.uint16,
  value:  r.int16,
  pad:    new r.Reserved(r.uint16)
});

let KerxAction = {
  index: r.uint16
};

let Kerx4Action = {

};

let KerxSubtable = new r.VersionedStruct('format', {
  0: { // Ordered List of Kerning Pairs
    nPairs:         r.uint32,
    searchRange:    r.uint32,
    entrySelector:  r.uint32,
    rangeShift:     r.uint32,
    pairs:          new r.Array(KerxPair, 'nPairs')
  },

  1: { // State Table for Contextual Kerning
    stateHeader: new StateTable(KerxAction),
    valueTable:  new r.Pointer(r.uint32, new UnboundedArray(r.uint16), {type: 'parent'})
  },

  2: { // Simple n x m Array of Kerning Values
    rowWidth:   r.uint32,
    leftTable:  new r.Pointer(r.uint32, new LookupTable, {type: 'parent'}),
    rightTable: new r.Pointer(r.uint32, new LookupTable, {type: 'parent'}),
    array:      new r.Pointer(r.uint32, new UnboundedArray(r.int16), {type: 'parent'})
  },

  4: { // State Table for Control Point/Anchor Point Positioning
    stateHeader: new StateTable,
    flags:       r.uint8,
    offset:      r.uint24
  },

  6: { // Simple Index-based Array Header
    flags:            r.uint32,
    rowCount:         r.uint16,
    columnCount:      r.uint16,
    rowIndexTable:    new r.Pointer(r.uint32, new LookupTable, {type: 'parent'}),
    columnIndexTable: new r.Pointer(r.uint32, new LookupTable, {type: 'parent'}),
    kerningArray:     new r.Pointer(r.uint32, new LookupTable, {type: 'parent'}),
    kerningVector:    new r.Pointer(r.uint32, new LookupTable, {type: 'parent'})
  }
});

let KerxTable = new r.Struct({
  length:     r.uint32,
  coverage:   new r.Bitfield(r.uint8, [
    null, null, null, null,
    'processDirection',
    'variation',     // Set if table has variation kerning values
    'crossStream',   // Set if table has cross-stream kerning values
    'vertical'       // Set if table has vertical kerning values
  ]),
  unused:     new r.Reserved(r.uint16),
  format:     r.uint8,
  tupleIndex: r.uint32,
  subtable:   KerxSubtable,
  padding:    new r.Reserved(r.uint8, t => t.length - t._currentOffset)
});

export default new r.VersionedStruct(r.uint16, {
  header: {
    padding:    new r.Reserved(r.uint16),
    nTables:    r.uint32,
    tables:     new r.Array(KerxTable, 'nTables')
  },

  2: {},

  3: {
    subtableOffsets:   new r.Array(r.uint32, 'nTables'),
    coverageBitfields: new UnboundedArray(r.uint8)
  }
});
