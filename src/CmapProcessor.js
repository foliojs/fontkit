import {binarySearch} from './utils';

export default class CmapProcessor {
  constructor(cmapTable) {
    this._characterSet = null;

    // find the unicode cmap
    this.cmap = this.findSubtable(cmapTable, [
      // 32-bit subtables
      [3, 10],
      [0, 6],
      [0, 4],

      // 16-bit subtables
      [3, 1],
      [0, 3],
      [0, 2],
      [0, 1],
      [0, 0],
      [3, 0]
    ]);
    
    if (!this.cmap) {
      throw new Error("Could not find a unicode cmap");
    }
    
    this.uvs = this.findSubtable(cmapTable, [[0, 5]]);
    if (this.uvs && this.uvs.version !== 14) {
      this.uvs = null;
    }
  }
  
  findSubtable(cmapTable, pairs) {
    for (let [platformID, encodingID] of pairs) {
      for (let cmap of cmapTable.tables) {
        if (cmap.platformID === platformID && cmap.encodingID === encodingID) {
          return cmap.table;
        }
      }
    }
    
    return null;
  }

  lookup(codepoint, variationSelector) {
    if (variationSelector) {
      let gid = this.getVariationSelector(codepoint, variationSelector);
      if (gid) {
        return gid;
      }
    }
    
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
  
  getVariationSelector(codepoint, variationSelector) {
    if (!this.uvs) {
      return 0;
    }
    
    let selectors = this.uvs.varSelectors.toArray();
    let i = binarySearch(selectors, x => variationSelector - x.varSelector);
    let sel = selectors[i];
    
    if (i !== -1 && sel.defaultUVS) {
      i = binarySearch(sel.defaultUVS, x => 
        codepoint < x.startUnicodeValue ? -1 : codepoint > x.startUnicodeValue + x.additionalCount ? +1 : 0
      );
    }
    
    if (i !== -1 && sel.nonDefaultUVS) {
      i = binarySearch(sel.nonDefaultUVS, x => codepoint - x.unicodeValue);
      if (i !== -1) {
        return sel.nonDefaultUVS[i].glyphID;
      }
    }
    
    return 0;
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
