import r from 'restructure';

let TrackTableEntry = new r.Struct({
  track: r.fixed32,
  nameIndex: r.uint16,
  name: t => t.parent.parent.parent.name.records.fontFeatures[t.nameIndex],
  // offset: r.uint16
  values: new r.Pointer(r.uint16, new r.Array(r.int16, t => t.parent.nSizes), {type: 'parent'})
});

let TrackData = new r.Struct({
  nTracks: r.uint16,
  nSizes: r.uint16,
  sizeTableOffset: r.uint32,
  trackTable: new r.Array(TrackTableEntry, 'nTracks'),
  sizeTable: new r.Array(r.fixed32, 'nSizes')
});

export default new r.Struct({
  version: r.fixed32,
  format: r.uint16,
  horizontal: new r.Pointer(r.uint16, TrackData),
  vertical: new r.Pointer(r.uint16, TrackData),
  reserved: new r.Reserved(r.uint16)
});
