export default class CmapProcessor {
  constructor(cmapTable) {
    this._characterSet = null;

    // find the unicode cmap
    // check for a 32-bit cmap first
    for (let cmap of cmapTable.tables) {
      // unicode or windows platform
      if ((cmap.platformID === 0 && (cmap.encodingID === 4 || cmap.encodingID === 6)) || (cmap.platformID === 3 && cmap.encodingID === 10)) {
        this.cmap = cmap.table;
        return;
      }
    }

    // try "old" 16-bit cmap
    for (let cmap of cmapTable.tables) {
      if (cmap.platformID === 0 || (cmap.platformID === 3 && cmap.encodingID === 1)) {
        this.cmap = cmap.table;
        return;
      }
    }

    throw new Error("Could not find a unicode cmap");
  }

  lookup(codepoint) {
    let cmap = this.cmap;
    switch (cmap.version) {
      case 0:
        return cmap.codeMap.get(codepoint) || 0;

      case 4: {
        let min = 0;
        let max = cmap.segCount - 1;
        while (min <= max) {
          let mid = (min + max) >> 1;

          if (codepoint < cmap.startCode.get(mid)) {
            max = mid - 1;
          } else if (codepoint > cmap.endCode.get(mid)) {
            min = mid + 1;
          } else {
            let rangeOffset = cmap.idRangeOffset.get(mid);
            let gid;

            if (rangeOffset === 0) {
              gid = codepoint + cmap.idDelta.get(mid);
            } else {
              let index = rangeOffset / 2 + (codepoint - cmap.startCode.get(mid)) - (cmap.segCount - mid);
              gid = cmap.glyphIndexArray.get(index) || 0;
              if (gid !== 0) {
                gid += cmap.idDelta.get(mid);
              }
            }

            return gid & 0xffff;
          }
        }

        return 0;
      }

      case 8:
        throw new Error('TODO: cmap format 8');

      case 6:
      case 10:
        return cmap.glyphIndices.get(codepoint - cmap.firstCode) || 0;

      case 12:
      case 13: {
        let min = 0;
        let max = cmap.nGroups - 1;
        while (min <= max) {
          let mid = (min + max) >> 1;
          let group = cmap.groups.get(mid);

          if (codepoint < group.startCharCode) {
            max = mid - 1;
          } else if (codepoint > group.endCharCode) {
            min = mid + 1;
          } else {
            if (cmap.version === 12) {
              return group.glyphID + (codepoint - group.startCharCode);
            } else {
              return group.glyphID;
            }
          }
        }

        return 0;
      }

      case 14:
        throw new Error('TODO: cmap format 14');

      default:
        throw new Error(`Unknown cmap format ${cmap.version}`);
    }
  }

  getCharacterSet() {
    if (this._characterSet) {
      return this._characterSet;
    }

    let cmap = this.cmap;
    switch (cmap.version) {
      case 0:
        return this._characterSet = range(0, cmap.codeMap.length);

      case 4: {
        let res = [];
        let endCodes = cmap.endCode.toArray();
        for (let i = 0; i < endCodes.length; i++) {
          let tail = endCodes[i] + 1;
          let start = cmap.startCode.get(i);
          res.push(...range(start, tail));
        }

        return this._characterSet = res;
      }

      case 8:
        throw new Error('TODO: cmap format 8');

      case 6:
      case 10:
        return this._characterSet = range(cmap.firstCode, cmap.firstCode + cmap.glyphIndices.length);

      case 12:
      case 13: {
        let res = [];
        for (let group of cmap.groups.toArray()) {
          res.push(...range(group.startCharCode, group.endCharCode + 1));
        }

        return this._characterSet = res;
      }

      case 14:
        throw new Error('TODO: cmap format 14');

      default:
        throw new Error(`Unknown cmap format ${cmap.version}`);
    }
  }
}

function range(index, end) {
  let range = [];
  while (index < end) {
    range.push(index++);
  }
  return range;
}
