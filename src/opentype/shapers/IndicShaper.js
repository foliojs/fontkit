import DefaultShaper from './DefaultShaper';
import StateMachine from 'dfa';
import UnicodeTrie from 'unicode-trie';
import GlyphInfo from '../GlyphInfo';
import indicData from './indic.json';

const {categories} = indicData;
const trie = new UnicodeTrie(require('fs').readFileSync(__dirname + '/indic.trie'));
const stateMachine = new StateMachine(indicData);

// Visual positions in a syllable from left to right.
export const POSITIONS = {
  Start: 0,

  Ra_To_Become_Reph: 1,
  Pre_M: 2,
  Pre_C: 3,

  Base_C: 4,
  After_Main: 5,

  Above_C: 6,

  Before_Sub: 7,
  Below_C: 8,
  After_Sub: 9,

  Before_Post: 10,
  Post_C: 11,
  After_Post: 12,

  Final_C: 13,
  SMVD: 14,

  End: 15
};

export const IS_CONSONANT = {
  C: true,
  Ra: true,
  CM: true,
  V: true,
  Placeholder: true,
  Dotted_Circle: true
};

export default class IndicShaper extends DefaultShaper {
  static zeroMarkWidths = 'NONE';
  static planFeatures(plan) {
    plan.addStage(setupSyllables);

    plan.addStage(['locl', 'ccmp']);

    plan.addStage(initialReordering);

    plan.addStage(['nukt']);
    plan.addStage(['akhn']);
    plan.addStage(['rphf'], false);
    plan.addStage(['rkrf']);
    plan.addStage(['pref'], false);
    plan.addStage(['blwf'], false);
    // plan.addStage(['abvf'], false);
    plan.addStage(['half'], false);
    plan.addStage(['pstf'], false);
    // plan.addStage(['vatu']);
    plan.addStage(['cjct']);
    // plan.addStage(['cfar'], false);

    plan.addStage(finalReordering);

    // plan.addStage(['init'], false);
    plan.addStage(['pres', 'abvs', 'blws', 'psts', 'haln', 'dist', 'abvm', 'blwm', 'calt', 'clig']);

    // TODO: turn off kern (Khmer) and liga features.
  }

  static assignFeatures(plan, glyphs) {

  }
}

function indicCategory(glyph) {
  return trie.get(glyph.codePoints[0]);
}

class IndicInfo {
  constructor(category, syllableType, syllable) {
    this.category = category;
    this.syllableType = syllableType;
    this.syllable = syllable;
  }
}

function setupSyllables(font, glyphs) {
  let syllable = 0;
  for (let [start, end, tags] of stateMachine.match(glyphs.map(indicCategory))) {
    console.log(start, end, tags, syllable);
    ++syllable;

    // Create shaper info
    for (let i = start; i <= end; i++) {
      glyphs[i].shaperInfo = new IndicInfo(categories[indicCategory(glyphs[i])], tags[0], syllable);
    }
  }
}

function initialReordering() {

}

function finalReordering() {

}
