import DefaultShaper from './DefaultShaper';
import StateMachine from '@devongovett/state-machine';
import UnicodeTrie from 'unicode-trie';
import fs from 'fs';
import GlyphInfo from '../GlyphInfo';
import useData from './use.json';

const {categories, decompositions} = useData;
const trie = new UnicodeTrie(fs.readFileSync(__dirname + '/use.trie'));
const stateMachine = new StateMachine(useData);

export default class UniversalShaper extends DefaultShaper {
  static planFeatures(plan) {
    plan.addStage(setupSyllables);

    // Default glyph pre-processing group
    plan.addStage(['locl', 'ccmp', 'nukt', 'akhn']);

    // Reordering group
    plan.addStage(clearSubstitutionFlags);
    plan.addStage(['rphf'], false);
    plan.addStage(recordRphf);
    plan.addStage(clearSubstitutionFlags);
    plan.addStage(['pref']);
    plan.addStage(recordPref);

    // Orthographic unit shaping group
    plan.addStage(['rkrf', 'abvf', 'blwf', 'half', 'pstf', 'vatu', 'cjct']);
    plan.addStage(reorder);

    // Topographical features
    plan.addStage(['isol', 'init', 'medi', 'fina', 'med2', 'fin2', 'fin3'], false);

    // Standard topographic presentation and positional feature application
    plan.addStage(['abvs', 'blws', 'pres', 'psts', 'dist', 'abvm', 'blwm']);
  }
}

function useCategory(glyph) {
  return trie.get(glyph.codePoints[0]);
}

class USEInfo {
  constructor(category, syllableType, syllable) {
    this.category = category;
    this.syllableType = syllableType;
    this.syllable = syllable;
  }
}

function setupSyllables(font, glyphs, positions) {
  if (positions) return;

  let syllable = 0;
  for (let [start, end, tags] of stateMachine.match(glyphs.map(useCategory))) {
    ++syllable;
    for (let i = start; i <= end; i++) {
      glyphs[i].shaperInfo = new USEInfo(categories[useCategory(glyphs[i])], tags[0], syllable);
    }
  }
}

// TODO
function clearSubstitutionFlags() {}
function recordRphf() {}
function recordPref() {}
function reorder() {}
