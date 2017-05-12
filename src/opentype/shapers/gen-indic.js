import codepoints from 'codepoints';
import fs from 'fs';
import UnicodeTrieBuilder from 'unicode-trie/builder';
import compile from 'dfa/compile';

const CATEGORIES = {
  Avagraha: 'Symbol',
  Bindu: 'SM',
  Brahmi_Joining_Number: 'Placeholder',
  Cantillation_Mark: 'A',
  Consonant: 'C',
  Consonant_Dead: 'C',
  Consonant_Final: 'CM',
  Consonant_Head_Letter: 'C',
  Consonant_Killer: 'M',
  Consonant_Medial: 'CM',
  Consonant_Placeholder: 'Placeholder',
  Consonant_Preceding_Repha: 'Repha',
  Consonant_Prefixed: 'X',
  Consonant_Subjoined: 'CM',
  Consonant_Succeeding_Repha: 'N',
  Consonant_With_Stacker: 'Repha',
  Gemination_Mark: 'SM',
  Invisible_Stacker: 'Coeng',
  Joiner: 'ZWJ',
  Modifying_Letter: 'X',
  Non_Joiner: 'ZWNJ',
  Nukta: 'N',
  Number: 'Placeholder',
  Number_Joiner: 'Placeholder',
  Pure_Killer: 'M',
  Register_Shifter: 'RS',
  Syllable_Modifier: 'M',
  Tone_Letter: 'X',
  Tone_Mark: 'N',
  Virama: 'H',
  Visarga: 'SM',
  Vowel: 'V',
  Vowel_Dependent: 'M',
  Vowel_Independent: 'V'
};

const OVERRIDES = {
  0x0953: 'SM',
  0x0954: 'SM',
  0x0A72: 'C',
  0x0A73: 'C',
  0x1CF5: 'C',
  0x1CF6: 'C',
  0x1CE2: 'A',
  0x1CE3: 'A',
  0x1CE4: 'A',
  0x1CE5: 'A',
  0x1CE6: 'A',
  0x1CE7: 'A',
  0x1CE8: 'A',
  0x1CED: 'A',
  0xA8F2: 'Symbol',
  0xA8F3: 'Symbol',
  0xA8F4: 'Symbol',
  0xA8F5: 'Symbol',
  0xA8F6: 'Symbol',
  0xA8F7: 'Symbol',
  0x1CE9: 'Symbol',
  0x1CEA: 'Symbol',
  0x1CEB: 'Symbol',
  0x1CEC: 'Symbol',
  0x1CEE: 'Symbol',
  0x1CEF: 'Symbol',
  0x1CF0: 'Symbol',
  0x1CF1: 'Symbol',
  0x17C6: 'N',
  0x2010: 'Placeholder',
  0x2011: 'Placeholder',
  0x25CC: 'DOTTEDCIRCLE',



  // Ra
  0x0930: 'Ra', /* Devanagari */
  0x09B0: 'Ra', /* Bengali */
  0x09F0: 'Ra', /* Bengali */
  0x0A30: 'Ra', /* Gurmukhi */	/* No Reph */
  0x0AB0: 'Ra', /* Gujarati */
  0x0B30: 'Ra', /* Oriya */
  0x0BB0: 'Ra', /* Tamil */		/* No Reph */
  0x0C30: 'Ra', /* Telugu */		/* Reph formed only with ZWJ */
  0x0CB0: 'Ra', /* Kannada */
  0x0D30: 'Ra', /* Malayalam */	/* No Reph, Logical Repha */
  0x0DBB: 'Ra', /* Sinhala */		/* Reph formed only with ZWJ */
  0x179A: 'Ra', /* Khmer */		/* No Reph, Visual Repha */
};

let trie = new UnicodeTrieBuilder;
let symbols = {};
let numSymbols = 0;
let decompositions = {};
for (let i = 0; i < codepoints.length; i++) {
  let codepoint = codepoints[i];
  if (codepoint) {
    let category = OVERRIDES[codepoint.code] || CATEGORIES[codepoint.indicSyllabicCategory] || 'X';
    if (!(category in symbols)) {
      symbols[category] = numSymbols++;
    }

    trie.set(codepoint.code, symbols[category]);
  }
}

fs.writeFileSync(__dirname + '/indic.trie', trie.toBuffer());

let stateMachine = compile(fs.readFileSync(__dirname + '/indic.machine', 'utf8'), symbols);
let json = Object.assign({
  categories: Object.keys(symbols)
}, stateMachine);

fs.writeFileSync(__dirname + '/indic.json', JSON.stringify(json));
