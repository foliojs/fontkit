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

    describe('#154 - Glyph cache issue', function () {
        it('should retain code points after a composite glyph caches a component', function () {
            let font = fontkit.openSync(new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url));
            let composite = font.layout('ç').glyphs[0];

            composite.path.commands;

            let glyph = font.layout('c').glyphs[0];
            assert.deepEqual(glyph.codePoints, [99]);
        });
    });
});
