# Fontkit subset test font

Original geometric test outlines for this repository, distributed under the
repository's MIT license. No glyphs are derived from another font.

Regenerate with Python and `fonttools[woff]==4.60.1` and `brotli==1.2.1`:

```sh
python generate.py
```

The six glyphs cover instructions on simple and composite glyphs, an empty
glyph, an uninstructed glyph after instructed glyphs, an off-curve first point,
a 300-point repeated flag run, OVERLAP_SIMPLE, and mixed XY/point-index
component arguments. The WOFF2 variants transform glyf/loca, with the `.hmtx`
variant additionally transforming horizontal metrics.

The `.empty-composite` variant has a varied composite containing only an empty
component, with a nonzero horizontal bearing.

The variable variant moves the first composite component beyond signed-byte
range at weight 900, exercising argument widening and shared overlap state.

`FontkitSubsetTest.nonzero-empty-composite.woff2` retains an explicit nonzero
header box on a varied composite whose component has no outline points. It
checks that subsetting preserves the stored bounds and phantom-derived bearing.
