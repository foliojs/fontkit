OpenTypeProcessor = require './OpenTypeProcessor'
GlyphInfo = require './GlyphInfo'

class GSUBProcessor extends OpenTypeProcessor
  applyLookup: (lookupType, table) ->
    switch lookupType
      when 1 # Single Substitution
        index = @coverageIndex table.coverage
        return false if index is -1
        
        glyph = @glyphIterator.cur
        switch table.version
          when 1
            glyph.id = (glyph.id + table.deltaGlyphID) & 0xffff
            
          when 2
            glyph.id = table.substitute.get(index)
            
        return true
            
      when 2 # Multiple Substitution
        index = @coverageIndex table.coverage
        unless index is -1
          sequence = table.sequences.get(index)
          @glyphIterator.cur.id = sequence[0]
          
          replacement = []
          for gid in sequence[1...]
            g = new GlyphInfo gid
            g.features = @glyphIterator.cur.features
            replacement.push g
          
          @glyphs.splice @glyphIterator.index + 1, 0, replacement...
          return true
          
      when 3 # Alternate Substitution
        index = @coverageIndex table.coverage
        unless index is -1
          USER_INDEX = 0 # TODO
          @glyphIterator.cur.id = table.alternateSet.get(index)[USER_INDEX]
          return true
    
      when 4 # Ligature Substitution
        index = @coverageIndex table.coverage
        return false if index is -1
        
        for ligature in table.ligatureSets.get(index)
          matched = @sequenceMatchIndices 1, ligature.components
          continue unless matched
          
          curGlyph = @glyphIterator.cur
          
          # Concatenate all of the characters the new ligature will represent
          characters = [curGlyph.codePoints...]
          for index in matched
            characters.push @glyphs[index].codePoints...
            
          # Create the replacement ligature glyph
          ligatureGlyph = new GlyphInfo ligature.glyph, characters
          ligatureGlyph.features = curGlyph.features
          
          # From Harfbuzz:
          # - If it *is* a mark ligature, we don't allocate a new ligature id, and leave
          #   the ligature to keep its old ligature id.  This will allow it to attach to
          #   a base ligature in GPOS.  Eg. if the sequence is: LAM,LAM,SHADDA,FATHA,HEH,
          #   and LAM,LAM,HEH for a ligature, they will leave SHADDA and FATHA with a
          #   ligature id and component value of 2.  Then if SHADDA,FATHA form a ligature
          #   later, we don't want them to lose their ligature id/component, otherwise
          #   GPOS will fail to correctly position the mark ligature on top of the
          #   LAM,LAM,HEH ligature. See https://bugzilla.gnome.org/show_bug.cgi?id=676343
          #
          # - If a ligature is formed of components that some of which are also ligatures
          #   themselves, and those ligature components had marks attached to *their*
          #   components, we have to attach the marks to the new ligature component
          #   positions!  Now *that*'s tricky!  And these marks may be following the
          #   last component of the whole sequence, so we should loop forward looking
          #   for them and update them.
          #
          #   Eg. the sequence is LAM,LAM,SHADDA,FATHA,HEH, and the font first forms a
          #   'calt' ligature of LAM,HEH, leaving the SHADDA and FATHA with a ligature
          #   id and component == 1.  Now, during 'liga', the LAM and the LAM-HEH ligature
          #   form a LAM-LAM-HEH ligature.  We need to reassign the SHADDA and FATHA to
          #   the new ligature with a component value of 2.
          #
          #   This in fact happened to a font...  See https://bugzilla.gnome.org/show_bug.cgi?id=437633
          ligatureGlyph.ligatureID = if ligatureGlyph.isMark then 0 else @ligatureID++
          
          lastLigID = curGlyph.ligatureID
          lastNumComps = curGlyph.codePoints.length
          curComps = lastNumComps
          idx = @glyphIterator.index + 1
          
          # Set ligatureID and ligatureComponent on glyphs that were skipped in the matched sequence.
          # This allows GPOS to attach marks to the correct ligature components.
          for matchIndex in matched
            # Don't assign new ligature components for mark ligatures (see above)
            if ligatureGlyph.isMark
              idx = matchIndex
            else
              while idx < matchIndex
                ligatureComponent = curComps - lastNumComps + Math.min @glyphs[idx].ligatureComponent or 1, lastNumComps
                @glyphs[idx].ligatureID = ligatureGlyph.ligatureID
                @glyphs[idx].ligatureComponent = ligatureComponent
                idx++
              
            lastLigID = @glyphs[idx].ligatureID
            lastNumComps = @glyphs[idx].codePoints.length
            curComps += lastNumComps
            idx++ # skip base glyph
            
          # Adjust ligature components for any marks following
          if lastLigID and not ligatureGlyph.isMark
            for i in [idx...@glyphs.length] by 1
              if @glyphs[i].ligatureID is lastLigID
                ligatureComponent = curComps - lastNumComps + Math.min @glyphs[i].ligatureComponent or 1, lastNumComps
                @glyphs[i].ligatureComponent = ligatureComponent
              else
                break
          
          # Delete the matched glyphs, and replace the current glyph with the ligature glyph
          for index in matched by -1
            @glyphs.splice index, 1
            
          @glyphs[@glyphIterator.index] = ligatureGlyph
          return true
                    
      when 5 # Contextual Substitution
        @applyContext table
            
      when 6 # Chaining Contextual Substitution
        @applyChainingContext table
            
      when 7 # Extension Substitution
        @applyLookup table.lookupType, table.extension
        
      else
        throw new Error "GSUB lookupType #{lookupType} is not supported"
        
    return false
        
module.exports = GSUBProcessor
