unicode = require 'unicode-properties'

class GlyphInfo
  constructor: (@id, @codePoints = [], features = []) ->
    # TODO: get this info from GDEF if available
    @isMark = @codePoints.every unicode.isMark
    @isLigature = @codePoints.length > 1
    
    @features = {}
    for feature in features
      @features[feature] = true
      
    @ligatureID = null
    @ligatureComponent = null
    @cursiveAttachment = null
    @markAttachment = null
    
module.exports = GlyphInfo
