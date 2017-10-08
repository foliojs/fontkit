import r from 'restructure';
import Subset from './Subset';
import CFFTop from '../cff/CFFTop';
import CFFPrivateDict from '../cff/CFFPrivateDict';
import standardStrings from '../cff/CFFStandardStrings';
import CFFOperand from '../cff/CFFOperand';

export default class CFFSubset extends Subset {
  constructor(font) {
    super(font);

    this.cff = this.font.CFF2 || this.font['CFF '];
    if (!this.cff) {
      throw new Error('Not a CFF Font');
    }
  }

  subsetCharstrings() {
    this.charstrings = [];
    let gsubrs = {};

    for (let gid of this.glyphs) {
      let charString = this.cff.getCharString(gid);
      if (this.cff.version >= 2) {
        charString = this.blendCharstring(gid, charString);
      }

      this.charstrings.push(charString);

      let glyph = this.font.getGlyph(gid);
      let path = glyph.path; // this causes the glyph to be parsed

      for (let subr in glyph._usedGsubrs) {
        gsubrs[subr] = true;
      }
    }

    this.gsubrs = this.subsetSubrs(this.cff.globalSubrIndex, gsubrs);
  }

  blendCharstring(gid, charString) {
    let stream = new r.DecodeStream(charString);
    let output = new r.EncodeStream(charString.length + 1);
    let stack = [];

    let privateDict = this.cff.privateDictForGlyph(gid);
    let vstore = this.cff.topDict.vstore && this.cff.topDict.vstore.itemVariationStore;
    let vsindex = privateDict.vsindex;
    let variationProcessor = this.font._variationProcessor;

    while (stream.pos < stream.length) {
      let op = stream.readUInt8();

      if (op < 32) {
        switch (op) {
          case 15: { // vsindex
            vsindex = stack.pop();
            break;
          }

          case 16: { // blend
            let blendVector = variationProcessor.getBlendVector(vstore, vsindex);
            let numBlends = stack.pop();
            let numOperands = numBlends * blendVector.length;
            let delta = stack.length - numOperands;
            let base = delta - numBlends;

            for (let i = 0; i < numBlends; i++) {
              let sum = stack[base + i];
              for (let j = 0; j < blendVector.length; j++) {
                sum += blendVector[j] * stack[delta++];
              }

              stack[base + i] = sum | 0;
            }

            while (numOperands--) {
              stack.pop();
            }

            break;
          }

          default: {
            for (let val of stack) {
              CFFOperand.encode(output, val, true);
            }

            output.writeUInt8(op);
            stack.length = 0;
          }
        }
      } else {
        stack.push(CFFOperand.decode(stream, op));
      }
    }

    output.writeUInt8(14); // endchar
    return output.buffer.slice(0, output.bufferOffset);
  }

  subsetSubrs(subrs, used) {
    let res = [];
    for (let i = 0; i < subrs.length; i++) {
      let subr = subrs[i];
      if (used[i]) {
        this.cff.stream.pos = subr.offset;
        res.push(this.cff.stream.readBuffer(subr.length));
      } else {
        res.push(new Buffer([11])); // return
      }
    }

    return res;
  }

  subsetFontdict(topDict) {
    topDict.FDArray = [];
    topDict.FDSelect = {
      version: 0,
      fds: []
    };

    let used_fds = {};
    let used_subrs = [];
    for (let gid of this.glyphs) {
      let fd = this.cff.fdForGlyph(gid);
      if (fd == null) {
        continue;
      }

      if (!used_fds[fd]) {
        topDict.FDArray.push(Object.assign({}, this.cff.topDict.FDArray[fd]));
        used_subrs.push({});
      }

      used_fds[fd] = true;
      topDict.FDSelect.fds.push(topDict.FDArray.length - 1);

      let glyph = this.font.getGlyph(gid);
      let path = glyph.path; // this causes the glyph to be parsed
      for (let subr in glyph._usedSubrs) {
        used_subrs[used_subrs.length - 1][subr] = true;
      }
    }

    for (let i = 0; i < topDict.FDArray.length; i++) {
      let dict = topDict.FDArray[i];
      delete dict.FontName;
      if (dict.Private && dict.Private.Subrs) {
        dict.Private = Object.assign({}, dict.Private);
        dict.Private.Subrs = this.subsetSubrs(dict.Private.Subrs, used_subrs[i]);
      }
    }

    return;
  }

  createCIDFontdict(topDict) {
    let used_subrs = {};
    for (let gid of this.glyphs) {
      let glyph = this.font.getGlyph(gid);
      let path = glyph.path; // this causes the glyph to be parsed

      for (let subr in glyph._usedSubrs) {
        used_subrs[subr] = true;
      }
    }

    let privateDict = Object.assign({}, this.cff.topDict.Private || this.cff.topDict.FDArray[0].Private);
    delete privateDict.vsindex;
    delete privateDict.blend;
    if (privateDict.Subrs) {
      privateDict.Subrs = this.subsetSubrs(privateDict.Subrs, used_subrs);
    }

    topDict.FDArray = [{ Private: privateDict }];
    return topDict.FDSelect = {
      version: 3,
      nRanges: 1,
      ranges: [{ first: 0, fd: 0 }],
      sentinel: this.charstrings.length
    };
  }

  addString(string) {
    if (!string) {
      return null;
    }

    if (!this.strings) {
      this.strings = [];
    }

    this.strings.push(string);
    return standardStrings.length + this.strings.length - 1;
  }

  encode(stream) {
    this.subsetCharstrings();

    let charset = {
      version: this.charstrings.length > 255 ? 2 : 1,
      ranges: [{ first: 1, nLeft: this.charstrings.length - 2 }]
    };

    let topDict = Object.assign({}, this.cff.topDict);
    topDict.Private = null;
    topDict.charset = charset;
    topDict.Encoding = null;
    topDict.CharStrings = this.charstrings;
    topDict.PostScript = this.addString(this.font.postscriptName);
    topDict.ROS = [this.addString('Adobe'), this.addString('Identity'), 0];
    topDict.CIDCount = this.charstrings.length;

    if (this.cff.topDict.FDSelect) {
      this.subsetFontdict(topDict);
    } else {
      this.createCIDFontdict(topDict);
    }

    let top = {
      version: 1,
      minorVersion: 0,
      hdrSize: 4,
      offSize: 4,
      nameIndex: [this.font.postscriptName],
      topDictIndex: [topDict],
      stringIndex: this.strings,
      globalSubrIndex: this.gsubrs
    };

    CFFTop.encode(stream, top);
  }
}
