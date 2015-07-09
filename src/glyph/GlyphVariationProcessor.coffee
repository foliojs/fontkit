#
# This class is transforms TrueType glyphs according to the data from
# the Apple Advanced Typography variation tables (fvar, gvar, and avar).
# These tables allow infinite adjustments to glyph weight, width, slant, 
# and optical size without the designer needing to specify every exact style.
#
# Apple's documentation for these tables is not great, so thanks to the 
# Freetype project for figuring much of this out.
#
class GlyphVariationProcessor
  constructor: (@font, coords) ->
    @normalizedCoords = @normalizeCoords coords
    
  TUPLES_SHARE_POINT_NUMBERS = 0x8000
  TUPLE_COUNT_MASK           = 0x0fff
  EMBEDDED_TUPLE_COORD       = 0x8000
  INTERMEDIATE_TUPLE         = 0x4000
  PRIVATE_POINT_NUMBERS      = 0x2000
  TUPLE_INDEX_MASK           = 0x0fff
  POINTS_ARE_WORDS           = 0x80
  POINT_RUN_COUNT_MASK       = 0x7f
  DELTAS_ARE_ZERO            = 0x80
  DELTAS_ARE_WORDS           = 0x40
  DELTA_RUN_COUNT_MASK       = 0x3f
  
  normalizeCoords: (coords) ->
    # the default mapping is linear along each axis, in two segments:
    # from the minValue to defaultValue, and from defaultValue to maxValue.
    normalized = for axis, i in @font.fvar.axis
      if coords[i] < axis.defaultValue
        (coords[i] - axis.defaultValue) / (axis.defaultValue - axis.minValue)
      else
        (coords[i] - axis.defaultValue) / (axis.maxValue - axis.defaultValue)
        
    # if there is an avar table, the normalized value is calculated
    # by interpolating between the two nearest mapped values.
    if @font.avar
      for segment, i in @font.avar.segment
        for pair, j in segment.correspondence
          if j >= 1 and normalized[i] < pair.fromCoord
            prev = segment.correspondence[j - 1]
            normalized[i] = (normalized[i] - prev.fromCoord) * 
              (pair.toCoord - prev.toCoord) / (pair.fromCoord - prev.fromCoord) +
              prev.toCoord
              
            break
                        
    return normalized
  
  transformPoints: (gid, glyphPoints) ->
    return unless @font.fvar and @font.gvar
    
    gvar = @font.gvar
    return if gid >= gvar.glyphCount
    
    offset = gvar.offsets[gid]
    return if offset is gvar.offsets[gid + 1]
    
    # Read the gvar data for this glyph
    stream = @font.stream
    stream.pos = offset
    
    tupleCount = stream.readUInt16BE()
    offsetToData = offset + stream.readUInt16BE()
    
    if tupleCount & TUPLES_SHARE_POINT_NUMBERS
      here = stream.pos
      stream.pos = offsetToData
      sharedPoints = @decodePoints()
      stream.pos = here
      
    for i in [0...tupleCount & TUPLE_COUNT_MASK] by 1
      tupleDataSize = stream.readUInt16BE()
      tupleIndex = stream.readUInt16BE()
      
      if tupleIndex & EMBEDDED_TUPLE_COORD
        tupleCoords = for a in [0...gvar.axisCount] by 1
          stream.readInt16BE() / 16384
          
      else
        if (tupleIndex & TUPLE_INDEX_MASK) >= gvar.globalCoordCount
          throw new Error 'Invalid gvar table'
          
        tupleCoords = gvar.globalCoords[tupleIndex & TUPLE_INDEX_MASK]
        
      if tupleIndex & INTERMEDIATE_TUPLE
        startCoords = for a in [0...gvar.axisCount] by 1
          stream.readInt16BE() / 16384
          
        endCoords = for a in [0...gvar.axisCount] by 1
          stream.readInt16BE() / 16384
          
      # Get the factor at which to apply this tuple
      factor = @tupleFactor tupleIndex, tupleCoords, startCoords, endCoords
      if factor is 0
        offsetToData += tupleDataSize
        continue
        
      here = stream.pos
      
      if tupleIndex & PRIVATE_POINT_NUMBERS
        stream.pos = offsetToData
        points = @decodePoints()
      else
        points = sharedPoints
      
      # points.length = 0 means there are deltas for all points
      nPoints = if points.length is 0 then glyphPoints.length else points.length
      xDeltas = @decodeDeltas nPoints
      yDeltas = @decodeDeltas nPoints
            
      if points.length is 0 # all points
        for point, i in glyphPoints
          point.x += xDeltas[i] * factor
          point.y += yDeltas[i] * factor
      else
        origPoints = glyphPoints.slice()
        hasDelta = (no for p in glyphPoints)
        
        for idx, i in points when idx < glyphPoints.length
          point = glyphPoints[idx]
          origPoints[idx] = point.copy()
          hasDelta[idx] = true
          
          point.x += xDeltas[i] * factor
          point.y += yDeltas[i] * factor
          
        @interpolateMissingDeltas glyphPoints, origPoints, hasDelta
          
      offsetToData += tupleDataSize
      stream.pos = here
      
    return
      
  decodePoints: ->
    stream = @font.stream
    count = stream.readUInt8()
      
    if count & POINTS_ARE_WORDS
      count = (count & POINT_RUN_COUNT_MASK) << 8 | stream.readUInt8()
        
    points = new Uint16Array count
    i = 0
    while i < count
      run = stream.readUInt8()
      runCount = (run & POINT_RUN_COUNT_MASK) + 1
      if i + runCount > count
        throw new Error 'Bad point run length'
      
      fn = if run & POINTS_ARE_WORDS then stream.readUInt16 else stream.readUInt8
      
      point = 0
      for j in [0...runCount] by 1
        point += fn.call stream
        points[i++] = point
          
    return points
    
  decodeDeltas: (count) ->
    stream = @font.stream
    i = 0
    deltas = new Int16Array count
    
    while i < count
      run = stream.readUInt8()
      runCount = (run & DELTA_RUN_COUNT_MASK) + 1
      if i + runCount > count
        throw new Error 'Bad delta run length'
      
      if run & DELTAS_ARE_ZERO
        i += runCount
          
      else 
        fn = if run & DELTAS_ARE_WORDS then stream.readInt16BE else stream.readInt8
        for j in [0...runCount] by 1
          deltas[i++] = fn.call stream
        
    return deltas
        
  tupleFactor: (tupleIndex, tupleCoords, startCoords, endCoords) ->   
    normalized = @normalizedCoords
    gvar = @font.gvar
    factor = 1
    
    for i in [0...gvar.axisCount] by 1
      if tupleCoords[i] is 0
        continue
        
      else if normalized[i] is 0
        return 0
        
      else if (normalized[i] < 0 and tupleCoords[i] > 0) or
              (normalized[i] > 0 and tupleCoords[i] < 0)
        return 0
        
      else if (tupleIndex & INTERMEDIATE_TUPLE) is 0
        factor *= Math.abs normalized[i]
        
      else if (normalized[i] < startCoords[i]) or
              (normalized[i] > endCoords[i])
        return 0
        
      else if normalized[i] < tupleCoords[i]
        factor = (factor * (normalized[i] - startCoords[i])) / (tupleCoords[i] - startCoords[i])
        
      else
        factor = (factor * (endCoords[i] - normalized[i]) / (endCoords[i] - tupleCoords[i]))
    
    return factor
      
  # Interpolates points without delta values.
  # Needed for the Ø and Q glyphs in Skia.
  # Algorithm from Freetype.
  interpolateMissingDeltas: (points, inPoints, hasDelta) ->
    if points.length is 0
      return
      
    point = 0
    while point < points.length
      firstPoint = point
      
      # find the end point of the contour
      endPoint = point
      pt = points[endPoint]
      while not pt.endContour
        pt = points[++endPoint]

      # find the first point that has a delta
      while point <= endPoint and not hasDelta[point]
        point++
        
      continue unless point <= endPoint
      
      firstDelta = point
      curDelta = point
      point++
      
      while point <= endPoint
        # find the next point with a delta, and interpolate intermediate points
        if hasDelta[point]
          @deltaInterpolate curDelta + 1, point - 1, curDelta, point, inPoints, points
          curDelta = point
          
        point++
        
      # shift contour if we only have a single delta
      if curDelta is firstDelta
        @deltaShift firstPoint, endPoint, curDelta, inPoints, points
      else
        # otherwise, handle the remaining points at the end and beginning of the contour
        @deltaInterpolate curDelta + 1, endPoint, curDelta, firstDelta, inPoints, points
        
        if firstDelta > 0
          @deltaInterpolate firstPoint, firstDelta - 1, curDelta, firstDelta, inPoints, points
          
      point = endPoint + 1
      
    return
      
  deltaInterpolate: (p1, p2, ref1, ref2, inPoints, outPoints) ->
    if p1 > p2
      return
      
    for k in ['x', 'y']
      if inPoints[ref1][k] > inPoints[ref2][k]
        p = ref1
        ref1 = ref2
        ref2 = p
        
      in1 = inPoints[ref1][k]
      in2 = inPoints[ref2][k]
      out1 = outPoints[ref1][k]
      out2 = outPoints[ref2][k]
      
      scale = if in1 is in2 then 0 else (out2 - out1) / (in2 - in1)
        
      for p in [p1..p2] by 1
        out = inPoints[p][k]
        
        if out <= in1
          out += out1 - in1
        else if out >= in2
          out += out2 - in2
        else
          out = out1 + (out - in1) * scale
          
        outPoints[p][k] = out
          
    return
    
  deltaShift: (p1, p2, ref, inPoints, outPoints) ->
    deltaX = outPoints[ref].x - inPoints[ref].x
    deltaY = outPoints[ref].y - inPoints[ref].y
    
    if deltaX is 0 and deltaY is 0
      return
      
    for p in [p1..p2] by 1 when p isnt ref
      outPoints[p].x += deltaX
      outPoints[p].y += deltaY
      
    return
    
module.exports = GlyphVariationProcessor
