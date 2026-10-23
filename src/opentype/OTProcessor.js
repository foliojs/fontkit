import GlyphIterator from './GlyphIterator';
import * as Script from '../layout/Script';

const DEFAULT_SCRIPTS = ['DFLT', 'dflt', 'latn'];

export default class OTProcessor {
  constructor(font, table) {
    this.font = font;
    this.table = table;

    this.script = null;
    this.scriptTag = null;

    this.language = null;
    this.languageTag = null;

    this.features = {};
    this.lookups = {};

    // Setup variation substitutions. FeatureVariations apply at the font's
    // current location, defaulting to the normalized origin (all-zero coords)
    // when no variation is set — matching HarfBuzz, which always evaluates them.
    // fontkit only builds a _variationProcessor once coords are applied (or for
    // CFF2), so a plain variable font would otherwise skip FeatureVariations
    // (e.g. default-location bracket-layer substitutions) entirely.
    let variationCoords = font._variationProcessor
      ? font._variationProcessor.normalizedCoords
      : font.fvar
        ? new Array(font.fvar.axis.length).fill(0)
        : null;
    this.variationsIndex = variationCoords
      ? this.findVariationsIndex(variationCoords)
      : -1;

    // initialize to default script + language
    this.selectScript();

    // current context (set by applyFeatures)
    this.glyphs = [];
    this.positions = []; // only used by GPOS
    this.ligatureID = 1;
    this.currentFeature = null;
  }

  findScript(script) {
    if (this.table.scriptList == null) {
      return null;
    }

    if (!Array.isArray(script)) {
      script = [script];
    }

    for (let s of script) {
      for (let entry of this.table.scriptList) {
        if (entry.tag === s) {
          return entry;
        }
      }
    }

    return null;
  }

  selectScript(script, language, direction) {
    let changed = false;
    let entry;
    if (!this.script || script !== this.scriptTag) {
      entry = this.findScript(script);
      if (!entry) {
        entry = this.findScript(DEFAULT_SCRIPTS);
      }

      if (!entry) {
        return this.scriptTag;
      }

      this.scriptTag = entry.tag;
      this.script = entry.script;
      this.language = null;
      this.languageTag = null;
      changed = true;
    }

    if (!direction || direction !== this.direction) {
      this.direction = direction || Script.direction(script);
    }

    if (language && language.length < 4) {
      language += ' '.repeat(4 - language.length);
    }

    if (!language || language !== this.languageTag) {
      this.language = null;

      for (let lang of this.script.langSysRecords) {
        if (lang.tag === language) {
          this.language = lang.langSys;
          this.languageTag = lang.tag;
          break;
        }
      }

      if (!this.language) {
        this.language = this.script.defaultLangSys;
        this.languageTag = null;
      }

      changed = true;
    }

    // Build a feature lookup table
    if (changed) {
      this.features = {};
      if (this.language) {
        for (let featureIndex of this.language.featureIndexes) {
          let record = this.table.featureList[featureIndex];
          let substituteFeature =
            this.substituteFeatureForVariations(featureIndex);
          this.features[record.tag] = substituteFeature || record.feature;
        }
      }
    }

    return this.scriptTag;
  }

  lookupsForFeatures(userFeatures = [], exclude) {
    let lookups = [];
    for (let tag of userFeatures) {
      let feature = this.features[tag];
      if (!feature) {
        continue;
      }

      for (let lookupIndex of feature.lookupListIndexes) {
        if (exclude && exclude.indexOf(lookupIndex) !== -1) {
          continue;
        }

        lookups.push({
          feature: tag,
          index: lookupIndex,
          lookup: this.table.lookupList.get(lookupIndex),
        });
      }
    }

    lookups.sort((a, b) => a.index - b.index);
    return lookups;
  }

  substituteFeatureForVariations(featureIndex) {
    if (this.variationsIndex === -1) {
      return null;
    }

    let record =
      this.table.featureVariations.featureVariationRecords[
        this.variationsIndex
      ];
    let substitutions = record.featureTableSubstitution.substitutions;
    for (let substitution of substitutions) {
      if (substitution.featureIndex === featureIndex) {
        return substitution.alternateFeatureTable;
      }
    }

    return null;
  }

  findVariationsIndex(coords) {
    let variations = this.table.featureVariations;
    if (!variations) {
      return -1;
    }

    let records = variations.featureVariationRecords;
    for (let i = 0; i < records.length; i++) {
      let conditions = records[i].conditionSet.conditionTable;
      if (this.variationConditionsMatch(conditions, coords)) {
        return i;
      }
    }

    return -1;
  }

  variationConditionsMatch(conditions, coords) {
    return conditions.every((condition) => {
      let coord =
        condition.axisIndex < coords.length ? coords[condition.axisIndex] : 0;
      return (
        condition.filterRangeMinValue <= coord &&
        coord <= condition.filterRangeMaxValue
      );
    });
  }

  applyFeatures(featureTags, glyphs, advances, userFeatures) {
    this.userFeatures = userFeatures;
    let lookups = this.lookupsForFeatures(featureTags);
    this.applyLookups(lookups, glyphs, advances);
  }

  applyLookups(lookups, glyphs, positions) {
    this.glyphs = glyphs;
    this.positions = positions;
    this.glyphIterator = new GlyphIterator(glyphs);

    for (let { feature, lookup } of lookups) {
      this.currentFeature = feature;

      let direction = this.isReverseLookup(lookup) ? -1 : 1;
      let startIndex = direction === -1 ? glyphs.length - 1 : 0;

      this.glyphIterator.reset(lookup.flags, startIndex);

      while (
        this.glyphIterator.index >= 0 &&
        this.glyphIterator.index < glyphs.length
      ) {
        if (feature in this.glyphIterator.cur.features) {
          for (let table of lookup.subTables) {
            if (this.applyLookup(lookup.lookupType, table)) {
              break;
            }
          }
        }
        this.glyphIterator.move(direction);
      }
    }
  }

  // Return whether a subtable matched. On success, leave glyphIterator immediately
  // before the continuation position: applyLookups calls next() after the lookup.
  // Contextual lookups reset the cursor and flags before each nested lookup and
  // determine their own continuation after the matched input sequence.
  applyLookup(lookup, table) {
    throw new Error('applyLookup must be implemented by subclasses');
  }

  // Return whether a lookup is applied right-to-left
  isReverseLookup(lookup) {
    return false;
  }

  applyLookupList(lookupRecords, inputLength) {
    let options = this.glyphIterator.options;
    let glyphIndex = this.glyphIterator.index;

    // Index just past the matched input sequence, moved as the
    // lookups below insert or delete glyphs
    let end = this.glyphIterator.peekIndex(inputLength - 1) + 1;

    for (let lookupRecord of lookupRecords) {
      // Reset flags and find glyph index for this lookup record
      this.glyphIterator.reset(options, glyphIndex);
      this.glyphIterator.increment(lookupRecord.sequenceIndex);
      let index = this.glyphIterator.index;

      // Get the lookup and setup flags for subtables
      let lookup = this.table.lookupList.get(lookupRecord.lookupListIndex);
      this.glyphIterator.reset(lookup.flags, index);

      // Apply lookup subtables until one matches
      let length = this.glyphs.length;
      for (let table of lookup.subTables) {
        if (this.applyLookup(lookup.lookupType, table)) {
          break;
        }
      }

      // Like HarfBuzz, never move the end before the glyph this lookup applied to
      end = Math.max(end + this.glyphs.length - length, index);
    }

    // Continue after the input sequence, so this lookup is not applied
    // again to glyphs it already matched or produced
    this.glyphIterator.reset(options, end - 1);
    return true;
  }

  coverageIndex(coverage, glyph) {
    if (glyph == null) {
      glyph = this.glyphIterator.cur.id;
    }

    switch (coverage.version) {
      case 1:
        return coverage.glyphs.indexOf(glyph);

      case 2:
        for (let range of coverage.rangeRecords) {
          if (range.start <= glyph && glyph <= range.end) {
            return range.startCoverageIndex + glyph - range.start;
          }
        }

        break;
    }

    return -1;
  }

  match(sequenceIndex, sequence, fn, matched) {
    let pos = this.glyphIterator.index;
    let glyph = this.glyphIterator.increment(sequenceIndex);
    let idx = 0;

    while (idx < sequence.length && glyph && fn(sequence[idx], glyph)) {
      if (matched) {
        matched.push(this.glyphIterator.index);
      }

      idx++;
      glyph = this.glyphIterator.next();
    }

    this.glyphIterator.index = pos;
    if (idx < sequence.length) {
      return false;
    }

    return matched || true;
  }

  sequenceMatches(sequenceIndex, sequence) {
    return this.match(
      sequenceIndex,
      sequence,
      (component, glyph) => component === glyph.id,
    );
  }

  sequenceMatchIndices(sequenceIndex, sequence) {
    return this.match(
      sequenceIndex,
      sequence,
      (component, glyph) => {
        // If the current feature doesn't apply to this glyph,
        if (!(this.currentFeature in glyph.features)) {
          return false;
        }

        return component === glyph.id;
      },
      [],
    );
  }

  coverageSequenceMatches(sequenceIndex, sequence) {
    return this.match(
      sequenceIndex,
      sequence,
      (coverage, glyph) => this.coverageIndex(coverage, glyph.id) >= 0,
    );
  }

  getClassID(glyph, classDef) {
    switch (classDef.version) {
      case 1: // Class array
        let i = glyph - classDef.startGlyph;
        if (i >= 0 && i < classDef.classValueArray.length) {
          return classDef.classValueArray[i];
        }

        break;

      case 2:
        for (let range of classDef.classRangeRecord) {
          if (range.start <= glyph && glyph <= range.end) {
            return range.class;
          }
        }

        break;
    }

    return 0;
  }

  classSequenceMatches(sequenceIndex, sequence, classDef) {
    return this.match(
      sequenceIndex,
      sequence,
      (classID, glyph) => classID === this.getClassID(glyph.id, classDef),
    );
  }

  applyContext(table) {
    let index, set;
    switch (table.version) {
      case 1:
        index = this.coverageIndex(table.coverage);
        if (index === -1) {
          return false;
        }

        set = table.ruleSets[index];
        for (let rule of set) {
          if (this.sequenceMatches(1, rule.input)) {
            return this.applyLookupList(rule.lookupRecords, rule.glyphCount);
          }
        }

        break;

      case 2:
        if (this.coverageIndex(table.coverage) === -1) {
          return false;
        }

        index = this.getClassID(this.glyphIterator.cur.id, table.classDef);
        if (index === -1) {
          return false;
        }

        set = table.classSet[index];
        for (let rule of set) {
          if (this.classSequenceMatches(1, rule.classes, table.classDef)) {
            return this.applyLookupList(rule.lookupRecords, rule.glyphCount);
          }
        }

        break;

      case 3:
        if (this.coverageSequenceMatches(0, table.coverages)) {
          return this.applyLookupList(table.lookupRecords, table.glyphCount);
        }

        break;
    }

    return false;
  }

  applyChainingContext(table) {
    let index;
    switch (table.version) {
      case 1:
        index = this.coverageIndex(table.coverage);
        if (index === -1) {
          return false;
        }

        let set = table.chainRuleSets[index];
        for (let rule of set) {
          // Backtrack is stored in reverse order per OpenType spec, so reverse
          // it before matching forward from the start position.
          if (
            this.sequenceMatches(
              -rule.backtrack.length,
              [...rule.backtrack].reverse(),
            ) &&
            this.sequenceMatches(1, rule.input) &&
            this.sequenceMatches(1 + rule.input.length, rule.lookahead)
          ) {
            return this.applyLookupList(
              rule.lookupRecords,
              rule.inputGlyphCount,
            );
          }
        }

        break;

      case 2:
        if (this.coverageIndex(table.coverage) === -1) {
          return false;
        }

        index = this.getClassID(this.glyphIterator.cur.id, table.inputClassDef);
        let rules = table.chainClassSet[index];
        if (!rules) {
          return false;
        }

        for (let rule of rules) {
          // Backtrack is stored in reverse order per OpenType spec.
          if (
            this.classSequenceMatches(
              -rule.backtrack.length,
              [...rule.backtrack].reverse(),
              table.backtrackClassDef,
            ) &&
            this.classSequenceMatches(1, rule.input, table.inputClassDef) &&
            this.classSequenceMatches(
              1 + rule.input.length,
              rule.lookahead,
              table.lookaheadClassDef,
            )
          ) {
            return this.applyLookupList(
              rule.lookupRecords,
              rule.inputGlyphCount,
            );
          }
        }

        break;

      case 3:
        // Backtrack is stored in reverse order per OpenType spec.
        if (
          this.coverageSequenceMatches(
            -table.backtrackGlyphCount,
            [...table.backtrackCoverage].reverse(),
          ) &&
          this.coverageSequenceMatches(0, table.inputCoverage) &&
          this.coverageSequenceMatches(
            table.inputGlyphCount,
            table.lookaheadCoverage,
          )
        ) {
          return this.applyLookupList(
            table.lookupRecords,
            table.inputGlyphCount,
          );
        }

        break;
    }

    return false;
  }
}
