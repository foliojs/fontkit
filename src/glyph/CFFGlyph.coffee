Glyph = require './Glyph'
Path = require './Path'

class CFFGlyph extends Glyph
  bias = (s) ->
    if s.length < 1240
      return 107
    else if s.length < 33900
      return 1131
    else
      return 32768
    
  _getPath: ->
    stream = @_font.stream
    pos = stream.pos
    
    cff = @_font['CFF ']
    str = cff.topDict.CharStrings[@id]
    end = str.offset + str.length
    stream.pos = str.offset
    
    path = new Path
    stack = []
    trans = []
    
    width = null
    nStems = 0
    x = y = 0
        
    @_usedGsubrs = usedGsubrs = {}
    @_usedSubrs = usedSubrs = {}
    
    gsubrs = cff.globalSubrIndex or []
    gsubrsBias = bias gsubrs
    
    privateDict = cff.privateDictForGlyph @id
    subrs = privateDict.Subrs or []
    subrsBias = bias subrs
    
    parseStems = ->
      if stack.length % 2 isnt 0
        width ?= stack.shift() + privateDict.nominalWidthX
        
      nStems += stack.length >> 1
      stack.length = 0
    
    do parse = ->
      while stream.pos < end        
        op = stream.readUInt8()
        if op < 32
          switch op
            when 1, 3, 18, 23 # hstem, vstem, hstemhm, vstemhm
              parseStems()
          
            when 4 # vmoveto
              if stack.length > 1
                width ?= stack.shift() + privateDict.nominalWidthX
              
              y += stack.shift()
              path.moveTo x, y
          
            when 5 # rlineto
              while stack.length >= 2
                x += stack.shift()
                y += stack.shift()
                path.lineTo x, y
            
            when 6, 7 # hlineto, vlineto
              phase = op is 6
              while stack.length >= 1
                if phase
                  x += stack.shift()
                else
                  y += stack.shift()
                
                path.lineTo x, y
                phase = !phase
            
            when 8 # rrcurveto
              while stack.length > 0
                c1x = x + stack.shift()
                c1y = y + stack.shift()
                c2x = c1x + stack.shift()
                c2y = c1y + stack.shift()
                x = c2x + stack.shift()
                y = c2y + stack.shift()
                path.bezierCurveTo c1x, c1y, c2x, c2y, x, y
            
            when 10 # callsubr
              index = stack.pop() + subrsBias
              subr = subrs[index]
              if subr
                usedSubrs[index] = true
                p = stream.pos
                e = end
                stream.pos = subr.offset
                end = subr.offset + subr.length
                parse()
                stream.pos = p
                end = e
          
            when 11 # return
              return
          
            when 14 # endchar
              if stack.length > 0
                width ?= stack.shift() + privateDict.nominalWidthX
            
              path.closePath()
          
            when 19, 20 # hintmask, cntrmask
              parseStems()
              stream.pos += (nStems + 7) >> 3
          
            when 21 # rmoveto
              if stack.length > 2
                width ?= stack.shift() + privateDict.nominalWidthX
                haveWidth = true
            
              x += stack.shift()
              y += stack.shift()
              path.moveTo x, y
          
            when 22 # hmoveto
              if stack.length > 1
                width ?= stack.shift() + privateDict.nominalWidthX
            
              x += stack.shift()
              path.moveTo x, y
          
            when 24 # rcurveline
              while stack.length >= 8
                c1x = x + stack.shift()
                c1y = y + stack.shift()
                c2x = c1x + stack.shift()
                c2y = c1y + stack.shift()
                x = c2x + stack.shift()
                y = c2y + stack.shift()
                path.bezierCurveTo c1x, c1y, c2x, c2y, x, y
          
              x += stack.shift()
              y += stack.shift()
              path.lineTo x, y
          
            when 25 # rlinecurve
              while stack.length >= 8
                x += stack.shift()
                y += stack.shift()
                path.lineTo x, y
          
              c1x = x + stack.shift()
              c1y = y + stack.shift()
              c2x = c1x + stack.shift()
              c2y = c1y + stack.shift()
              x = c2x + stack.shift()
              y = c2y + stack.shift()
              path.bezierCurveTo c1x, c1y, c2x, c2y, x, y
          
            when 26 # vvcurveto
              if stack.length % 2
                x += stack.shift()
          
              while stack.length >= 4
                c1x = x
                c1y = y + stack.shift()
                c2x = c1x + stack.shift()
                c2y = c1y + stack.shift()
                x = c2x
                y = c2y + stack.shift()
                path.bezierCurveTo c1x, c1y, c2x, c2y, x, y
          
            when 27 # hhcurveto
              if stack.length % 2
                y += stack.shift()
          
              while stack.length >= 4
                c1x = x + stack.shift()
                c1y = y
                c2x = c1x + stack.shift()
                c2y = c1y + stack.shift()
                x = c2x + stack.shift()
                y = c2y
                path.bezierCurveTo c1x, c1y, c2x, c2y, x, y
          
            when 28 # shortint
              stack.push stream.readInt16BE()
          
            when 29 # callgsubr
              index = stack.pop() + gsubrsBias
              subr = gsubrs[index]
              if subr
                usedGsubrs[index] = true
                p = stream.pos
                e = end
                stream.pos = subr.offset
                end = subr.offset + subr.length
                parse()
                stream.pos = p
                end = e
          
            when 30, 31 # vhcurveto, hvcurveto
              phase = op is 31
              while stack.length >= 4
                if phase
                  c1x = x + stack.shift()
                  c1y = y
                  c2x = c1x + stack.shift()
                  c2y = c1y + stack.shift()
                  y = c2y + stack.shift()
                  x = c2x + (if stack.length is 1 then stack.shift() else 0)
                else
                  c1x = x
                  c1y = y + stack.shift()
                  c2x = c1x + stack.shift()
                  c2y = c1y + stack.shift()
                  x = c2x + stack.shift()
                  y = c2y + (if stack.length is 1 then stack.shift() else 0)
                
                path.bezierCurveTo c1x, c1y, c2x, c2y, x, y
                phase = !phase
              
            when 12
              op = stream.readUInt8()
              switch op
                when 3 # and
                  a = stack.pop()
                  b = stack.pop()
                  stack.push if a and b then 1 else 0
            
                when 4 # or
                  a = stack.pop()
                  b = stack.pop()
                  stack.push if a or b then 1 else 0
            
                when 5 # not
                  a = stack.pop()
                  stack.push if a then 0 else 1
            
                when 9 # abs
                  a = stack.pop()
                  stack.push Math.abs a
            
                when 10 # add
                  a = stack.pop()
                  b = stack.pop()
                  stack.push a + b
            
                when 11 # sub
                  a = stack.pop()
                  b = stack.pop()
                  stack.push a - b
            
                when 12 # div
                  a = stack.pop()
                  b = stack.pop()
                  stack.push a / b
            
                when 14 # neg
                  a = stack.pop()
                  stack.push -a
            
                when 15 # eq
                  a = stack.pop()
                  b = stack.pop()
                  stack.push if a is b then 1 else 0
            
                when 18 # drop
                  stack.pop()
            
                when 20 # put
                  val = stack.pop()
                  idx = stack.pop()
                  trans[idx] = val
            
                when 21 # get
                  idx = stack.pop()
                  stack.push trans[idx] or 0
            
                when 22 # ifelse
                  s1 = stack.pop()
                  s2 = stack.pop()
                  v1 = stack.pop()
                  v2 = stack.pop()
                  stack.push if v1 <= v2 then s1 else s2
            
                when 23 # random
                  stack.push Math.random()
            
                when 24 # mul
                  a = stack.pop()
                  b = stack.pop()
                  stack.push a * b
            
                when 26 # sqrt
                  a = stack.pop()
                  stack.push Math.sqrt a
            
                when 27 # dup
                  a = stack.pop()
                  stack.push a, a
            
                when 28 # exch
                  a = stack.pop()
                  b = stack.pop()
                  stack.push b, a
            
                when 29 # index
                  idx = stack.pop()
                  if idx < 0
                    idx = 0
                  else if idx > stack.length - 1
                    idx = stack.length - 1
                
                  stack.push stack[idx]
            
                when 30 # roll
                  n = stack.pop()
                  j = stack.pop()
                  
                  if j >= 0
                    while j > 0
                      t = stack[n - 1]
                      for i in [n - 2..0] by -1
                        stack[i + 1] = stack[i]
                        
                      stack[0] = t
                      j--
                  else
                    while j < 0
                      t = stack[0]
                      for i in [0..n] by 1
                        stack[i] = stack[i + 1]
                        
                      stack[n - 1] = t
                      j++
              
                when 34 # hflex
                  c1x = x + stack.shift()
                  c1y = y
                  c2x = c1x + stack.shift()
                  c2y = c1y + stack.shift()
                  c3x = c2x + stack.shift()
                  c3y = c2y
                  c4x = c3x + stack.shift()
                  c4y = c3y
                  c5x = c4x + stack.shift()
                  c5y = c4y
                  c6x = c5x + stack.shift()
                  c6y = c5y
                  x = c6x
                  y = c6y
              
                  path.bezierCurveTo c1x, c1y, c2x, c2y, c3x, c3y
                  path.bezierCurveTo c4x, c4y, c5x, c5y, c6x, c6y
              
                when 35 # flex
                  pts = []
                  for i in [0...6]
                    x += stack.shift()
                    y += stack.shift()
                    pts.push x, y
                
                  path.bezierCurveTo pts[0...6]...
                  path.bezierCurveTo pts[6...]...
                  stack.shift() # fd
              
                when 36 # hflex1
                  c1x = x + stack.shift()
                  c1y = y + stack.shift()
                  c2x = c1x + stack.shift()
                  c2y = c1y + stack.shift()
                  c3x = c2x + stack.shift()
                  c3y = c2y
                  c4x = c3x + stack.shift()
                  c4y = c3y
                  c5x = c4x + stack.shift()
                  c5y = c4y + stack.shift()
                  c6x = c5x + stack.shift()
                  c6y = c5y
                  x = c6x
                  y = c6y
              
                  path.bezierCurveTo c1x, c1y, c2x, c2y, c3x, c3y
                  path.bezierCurveTo c4x, c4y, c5x, c5y, c6x, c6y
              
                when 37 # flex1
                  startx = x
                  starty = y
            
                  pts = []
                  for i in [0...5]
                    x += stack.shift()
                    y += stack.shift()
                    pts.push x, y
                
                  if Math.abs(x - startx) > Math.abs(y - starty) # horizontal
                    x += stack.shift()
                    y = starty
                  else
                    x = startx
                    y += stack.shift()
                
                  pts.push x, y
                  path.bezierCurveTo pts[0...6]...
                  path.bezierCurveTo pts[6...]...
              
                else
                  throw new Error 'Unknown op: 12 ' + op
                  
            else
              throw new Error 'Unknown op: ' + op
          
        else if op < 247
          stack.push op - 139
        else if op < 251
          b1 = stream.readUInt8()
          stack.push (op - 247) * 256 + b1 + 108
        else if op < 255
          b1 = stream.readUInt8()
          stack.push -(op - 251) * 256 - b1 - 108
        else
          stack.push stream.readInt32BE() / 65536
            
    return path
    
module.exports = CFFGlyph
