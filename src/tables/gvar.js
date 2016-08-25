import r from 'restructure';

let shortFrac = new r.Fixed(16, 'BE', 14);

let gvar = new r.Struct({
  version: r.uint16,
  reserved: new r.Reserved(r.uint16),
  axisCount: r.uint16,
  globalCoordCount: r.uint16,
  globalCoords: new r.Pointer(r.uint32, new r.Array(new r.Array(shortFrac, 'axisCount'), 'globalCoordCount')),
  glyphCount: r.uint16,
  flags: r.uint16,
  offsetToData: r.uint32
});

gvar.process = function(stream) {
  let type = this.flags === 1 ? r.uint32 : r.uint16;
  let ptr = new r.Pointer(type, 'void', { relativeTo: 'offsetToData', allowNull: false });
  this.offsets = new r.Array(ptr, this.glyphCount + 1).decode(stream, this);

  if (this.flags === 0) {
    // In short format, offsets are multiplied by 2.
    // This doesn't seem to be documented by Apple, but it
    // is implemented this way in Freetype.
    for (let i = 0; i < this.offsets.length; i++) {
      this.offsets[i] *= 2;
    }
  }

  return;
};

export default gvar;
