Glyph = require './Glyph'
Path = require './Path'
BBox = require './BBox'
r = require 'restructure'

class TTFGlyph extends Glyph
  # The header for both simple and composite glyphs
  GlyfHeader = new r.Struct
    numberOfContours: r.int16 # if negative, this is a composite glyph
    xMin:             r.int16
    yMin:             r.int16
    xMax:             r.int16
    yMax:             r.int16
  
  # Flags for simple glyphs
  ON_CURVE        = 1 << 0
  X_SHORT_VECTOR  = 1 << 1
  Y_SHORT_VECTOR  = 1 << 2
  REPEAT          = 1 << 3
  SAME_X          = 1 << 4
  SAME_Y          = 1 << 5
  
  # Flags for composite glyphs
  ARG_1_AND_2_ARE_WORDS     = 1 << 0
  WE_HAVE_A_SCALE           = 1 << 3
  MORE_COMPONENTS           = 1 << 5
  WE_HAVE_AN_X_AND_Y_SCALE  = 1 << 6
  WE_HAVE_A_TWO_BY_TWO      = 1 << 7
  WE_HAVE_INSTRUCTIONS      = 1 << 8
  
  # Represents a point in a simple glyph
  class Point
    constructor: (@onCurve, @endContour, @x = 0, @y = 0) ->
    
  # Represents a component in a composite glyph
  class Component
    constructor: (@glyphID, @dx, @dy) ->
      @pos = 0
      @scale = @xScale = @yScale = @scale01 = @scale10 = null
          
  # Parses just the glyph header and returns the bounding box
  _getCBox: ->
    stream = @_font._getTableStream 'glyf'
    stream.pos += @_font.loca.offsets[@id]
    glyph = GlyfHeader.decode(stream)
    
    cbox = new BBox glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax
    return Object.freeze cbox
    
  # Parses a single glyph coordinate
  parseGlyphCoord = (stream, prev, short, same) ->
    if short
      val = stream.readUInt8()
      unless same
        val = -val
      
      val += prev
    else
      if same
        val = prev
      else
        val = prev + stream.readInt16BE()
      
    return val
  
  # Decodes the glyph data into points for simple glyphs, 
  # or components for composite glyphs
  _decode: ->
    stream = @_font._getTableStream 'glyf'
    stream.pos += @_font.loca.offsets[@id]
    startPos = stream.pos
    
    glyph = GlyfHeader.decode(stream)
    
    if glyph.numberOfContours > 0
      @_decodeSimple glyph, stream
      
    else if glyph.numberOfContours < 0
      @_decodeComposite glyph, stream, startPos
        
    return glyph
    
  _decodeSimple: (glyph, stream) ->
    # this is a simple glyph
    glyph.points = []
  
    endPtsOfContours = new r.Array(r.uint16, glyph.numberOfContours).decode(stream)
    instructions = new r.Array(r.uint8, r.uint16).decode(stream)
  
    flags = []
    numCoords = endPtsOfContours[endPtsOfContours.length - 1] + 1
    
    while flags.length < numCoords
      flag = stream.readUInt8()
      flags.push flag
    
      # check for repeat flag
      if flag & REPEAT
        count = stream.readUInt8()
        for j in [0...count] by 1
          flags.push flag
        
    for flag, i in flags
      point = new Point !!(flag & ON_CURVE), endPtsOfContours.indexOf(i) >= 0, 0, 0
      glyph.points.push point
    
    px = 0
    for flag, i in flags
      glyph.points[i].x = px = parseGlyphCoord stream, px, flag & X_SHORT_VECTOR, flag & SAME_X
    
    py = 0
    for flag, i in flags
      glyph.points[i].y = py = parseGlyphCoord stream, py, flag & Y_SHORT_VECTOR, flag & SAME_Y
      
    return
    
  _decodeComposite: (glyph, stream, offset = 0) ->
    # this is a composite glyph
    glyph.components = []
    haveInstructions = false
    flags = MORE_COMPONENTS
    
    while flags & MORE_COMPONENTS
      flags = stream.readUInt16BE()
      gPos = stream.pos - offset
      glyphID = stream.readUInt16BE()
      haveInstructions ||= (flags & WE_HAVE_INSTRUCTIONS) isnt 0
      
      if flags & ARG_1_AND_2_ARE_WORDS
        dx = stream.readInt16BE()
        dy = stream.readInt16BE()
      else 
        dx = stream.readInt8()
        dy = stream.readInt8()
      
      component = new Component glyphID, dx, dy
      component.pos = gPos
      component.scaleX = component.scaleY = 1
      component.scale01 = component.scale10 = 0
        
      if flags & WE_HAVE_A_SCALE
        # fixed number with 14 bits of fraction
        component.scaleX = 
        component.scaleY = ((stream.readUInt8() << 24) | (stream.readUInt8() << 16)) / 1073741824
      
      else if flags & WE_HAVE_AN_X_AND_Y_SCALE
        component.scaleX = ((stream.readUInt8() << 24) | (stream.readUInt8() << 16)) / 1073741824
        component.scaleY = ((stream.readUInt8() << 24) | (stream.readUInt8() << 16)) / 1073741824
      
      else if flags & WE_HAVE_A_TWO_BY_TWO
        component.scaleX  = ((stream.readUInt8() << 24) | (stream.readUInt8() << 16)) / 1073741824
        component.scale01 = ((stream.readUInt8() << 24) | (stream.readUInt8() << 16)) / 1073741824
        component.scale10 = ((stream.readUInt8() << 24) | (stream.readUInt8() << 16)) / 1073741824
        component.scaleY  = ((stream.readUInt8() << 24) | (stream.readUInt8() << 16)) / 1073741824
        
      glyph.components.push component
        
    return haveInstructions
  
  # Decodes font data, resolves composite glyphs, and returns an array of contours
  _getContours: ->
    glyph = @_decode()
    if glyph.numberOfContours < 0
      # resolve composite glyphs
      points = []
      for component in glyph.components
        glyph = @_font.getGlyph(component.glyphID)._decode()
        # TODO transform
        for point in glyph.points
          points.push new Point point.onCurve, point.endContour, point.x + component.dx, point.y + component.dy
    else
      points = glyph.points
          
    contours = []
    cur = []
    for point in points
      cur.push point
      if point.endContour
        contours.push cur
        cur = []
    
    return contours
    
  # Converts contours to a Path object that can be rendered
  _getPath: ->
    contours = @_getContours()
    path = new Path
      
    for contour in contours
      firstPt = contour[0]
      lastPt = contour[contour.length - 1]
      start = 0
      
      if firstPt.onCurve
        # The first point will be consumed by the moveTo command, so skip in the loop
        curvePt = null
        start = 1
      else
        if lastPt.onCurve
          # Start at the last point if the first point is off curve and the last point is on curve
          firstPt = lastPt
        else
          # Start at the middle if both the first and last points are off curve
          firstPt = new Point no, no, (firstPt.x + lastPt.x) / 2, (firstPt.y + lastPt.y) / 2
          
        curvePt = firstPt
        
      path.moveTo firstPt.x, firstPt.y
      
      for j in [start...contour.length] by 1
        pt = contour[j]
        prevPt = if j is 0 then firstPt else contour[j - 1]
        
        if prevPt.onCurve and pt.onCurve
          path.lineTo pt.x, pt.y
        
        else if prevPt.onCurve and not pt.onCurve
          curvePt = pt
          
        else if not prevPt.onCurve and not pt.onCurve
          midX = (prevPt.x + pt.x) / 2
          midY = (prevPt.y + pt.y) / 2
          path.quadraticCurveTo prevPt.x, prevPt.y, midX, midY
          curvePt = pt
          
        else if not prevPt.onCurve and pt.onCurve
          path.quadraticCurveTo curvePt.x, curvePt.y, pt.x, pt.y
          curvePt = null
          
        else
          throw new Error "Unknown TTF path state"
          
      # Connect the first and last points
      if firstPt isnt lastPt
        if curvePt
          path.quadraticCurveTo curvePt.x, curvePt.y, firstPt.x, firstPt.y
        else
          path.lineTo firstPt.x, firstPt.y
          
    path.closePath()
    return path
    
module.exports = TTFGlyph
