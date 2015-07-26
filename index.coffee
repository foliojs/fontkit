fontkit = require './base'

# Register font formats
fontkit.registerFormat require './src/TTFFont'
fontkit.registerFormat require './src/WOFFFont'
fontkit.registerFormat require './src/WOFF2Font'
fontkit.registerFormat require './src/TrueTypeCollection'
fontkit.registerFormat require './src/DFont'

module.exports = fontkit
