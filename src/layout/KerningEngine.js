import {KernOrderedList, KernSimpleArray, KernIndexArray} from './KernPairProcessor';
import AATKernProcessor from '../aat/AATKernProcessor';

const KernTableProcessors = {
  0: KernOrderedList,
  1: AATKernProcessor,
  2: KernSimpleArray,
  3: KernIndexArray
};

export default class KerningEngine {
  constructor(font) {
    this.tables = [];
    for (let table of font.kern.tables) {
      let Processor = KernTableProcessors[table.format];
      this.tables.push(new Processor(table));
    }
  }

  process(glyphs, positions) {
    for (let table of this.tables) {
      if (this.shouldProcessTable(table)) {
        table.process(glyphs, positions);
      }
    }
  }

  shouldProcessTable(table) {
    switch (table.version) {
      case 0:
        return !table.coverage.horizontal;
      case 1:
        return !table.coverage.vertical && !table.coverage.variation;
      default:
        throw new Error(`Unsupported kerning table version ${table.version}`);
    }
  }
}
