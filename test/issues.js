import * as fontkit from 'fontkit';
import assert from 'assert';

describe('issues', function () {
    describe('#282 - ReferenceError: Cannot access \'c3x\' before initialization', function () {
        it('should not throw a ReferenceError', function () {
            let font = fontkit.openSync(new URL('data/PlayfairDisplay/PlayfairDisplay-Regular.otf', import.meta.url));

            let glyph = font.getGlyph(5);

            glyph.path;
        });
    });

    describe('#353 - reading the cbox of an empty glyph', function () {
        it('returns an empty box instead of reading past the glyph data', function () {
            let font = fontkit.openSync(new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url));

            let glyph = font.glyphForCodePoint(0x20); // space: no outline, empty glyf entry

            // Before the fix this read the following glyph's header (a positive-area
            // box), or ran past the buffer for a trailing empty glyph. An empty
            // glyph has no extent. Asserting "no positive extent" rather than exact
            // zeros so the test holds whether the empty box is (0,0,0,0) or the
            // BBox sentinel.
            let cbox = glyph.cbox;
            assert.ok(cbox.width <= 0 && cbox.height <= 0);
        });
    });
});
