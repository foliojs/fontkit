## fontkit changelog

### Unreleased

 - Replace cache decorators with specialized lazy caching
 - Map space and missing code points correctly with a legacy Mac cmap (#394) 
 - Keep a glyph's variation metrics stable when several composites use it
 - Return the requested code points for glyphs shared by several code points (#342) (#395)
 - Map glyphs back to code points for cmap formats 6 and 10 (#392)
 - Size cmap format 10 glyph indices by entryCount (#391)
 - Leave code points mapped to .notdef out of characterSet (#390)
 - Fix glyph code point cache after composite decomposition (#387)
 - Fix off-diagonal coefficients in composite glyph transforms (#388)


### [v2.0.4] - 08-09-2024

