import fontkit from '../src';
import assert from 'assert';

describe('opentype', function() {
  let font = fontkit.openSync(__dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf');

  it('Should get featureParams nameID of stylistic set', function() {
    assert.equal(font.GSUB.featureList[150].feature.featureParams.nameID, 257);
  });

  it('featureParams should be null of aalt opentype feature', function() {
    assert.equal(font.GSUB.featureList[1].feature.featureParams, null);
  });

});
