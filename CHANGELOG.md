## fontkit changelog

### Unreleased

- Reconstruct transformed WOFF2 TrueType glyphs when subsetting, preserving point indices, glyph instructions and component records
- Use decoded variation coordinates and phantom-derived horizontal bearings for transformed WOFF2 subsets
- Reject WOFF2 subsetting with transformed hmtx instead of emitting incorrect horizontal metrics
- Reject truncated WOFF2 glyph instruction data while decoding transformed glyphs
- Ignore the advances of marks zeroed after GPOS when positioning attached marks
- Position marks like HarfBuzz in fonts without GPOS (#409)
- Fix canonical composition fallback, Arabic mark ordering, and positioning in fonts without GSUB
- Reorder combining marks like HarfBuzz, with its modified combining classes and Arabic modifier marks first
- Fix extra quadratic segments in TrueType contours with off-curve endpoints
- [BREAKING] Browser build is now ESM-only
- [BREAKING] Node builds now targets Node 22+, Browser build targets Firefox 115+, Safari 16+, Chrome 120+
- Replace cache decorators with specialized lazy caching
- Fix crash when using TrueType font with empty glyphs (#353, #378, #303, #312). Based on #379
- Read hdmx device records at their padded size
- Encode subsets of fonts with set variations (#308)
- Map space and missing code points correctly with a legacy Mac cmap (#394)
- Keep a glyph's variation metrics stable when several composites use it
- Fix repha, pre-base vowel and dotted circle placement in the Universal Shaping Engine
- Return the requested code points for glyphs shared by several code points (#342) (#395)
- Map glyphs back to code points for cmap formats 6 and 10 (#392)
- Fix crash in the Universal Shaping Engine on characters outside a syllable, such as ZWNJ and ZWJ
- Size cmap format 10 glyph indices by entryCount (#391)
- Leave code points mapped to .notdef out of characterSet (#390)
- Fix glyph code point cache after composite decomposition (#387)
- Fix off-diagonal coefficients in composite glyph transforms (#388)
- Continue after the glyphs a lookup matched or inserted instead of applying it to them again (#383)

### [v2.0.4] - 08-09-2024
