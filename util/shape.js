#!/usr/bin/env node

var fontkit = require('fontkit');
var minimist = require('minimist');

function render() {
  var argv = minimist(process.argv.slice(2));
  if (!argv.font || !argv.text) {
    if (argv._.length >= 2) {
      argv.font = argv._[0];
      argv.text = argv._[1];
    } else {
      throw new Error('Missing font or text arguments');
    }
  }

  var font = fontkit.openSync(argv.font);

  if (argv.variation) {
    var settings = {};
    argv.variation.split(';').forEach(function (setting) {
      var parts = setting.split(':');
      settings[parts[0]] = parts[1];
    });

    font = font.getVariation(settings);
  }

  if (argv.features) {
    let features = {};
    argv.features.split(',').forEach(function (feature) {
      // TODO: support more of HarfBuzz/CSS syntax.
      var match = feature.match(/^(.+)=(.+)$/);
      if (match) {
        features[match[1]] = parseInt(match[2]);
      }
    });
    argv.features = features;
  }

  var run = font.layout(argv.text, argv.features, argv.script, argv.language, argv.direction);

  var glyphs = run.glyphs.map(function (glyph, index) {
    let out = (glyph.name || glyph.id);
    var pos = run.positions[index];
    if (pos.xOffset || pos.yOffset) {
      out += '@' + pos.xOffset + ',' + pos.yOffset;
    }
    out += '+' + pos.xAdvance;
    if (pos.yAdvance) {
      out += ',' + pos.yAdvance;
    }
    return out;
  });

  console.log('[' + glyphs.join('|') + ']');
}

try {
  render();
} catch (e) {
  console.error(e.stack);
  process.exit(1);
}
