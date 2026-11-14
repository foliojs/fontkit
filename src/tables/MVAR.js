import * as r from 'restructure';
import { ItemVariationStore } from './variations';

let ValueRecord = new r.Struct({
  valueTag: new r.String(4),
  deltaSetOuterIndex: r.uint16,
  deltaSetInnerIndex: r.uint16,
});

let MVAR = new r.Struct({
  majorVersion: r.uint16,
  minorVersion: r.uint16,
  reserved: r.uint16,
  valueRecordSize: r.uint16,
  valueRecordCount: r.uint16,
  itemVariationStore: new r.Pointer(r.uint16, ItemVariationStore),
  valueRecords: new r.Array(ValueRecord, 'valueRecordCount'),
});

export default MVAR;
