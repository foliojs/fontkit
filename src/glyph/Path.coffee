BBox = require './BBox'

class Path
  get = require('../get')(this)
  constructor: ->
    @commands = []
    @_bbox = @_cbox = null
    
  for command in ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'closePath']
    do (command) ->
      Path::[command] = (args...) ->
        @_bbox = @_cbox = null
        @commands.push
          command: command
          args: args
          
        return this
        
  # Compiles the path to a JavaScript function that can be applied with
  # a graphics context in order to render the path.
  toFunction: ->
    cmds = []
    for c in @commands
      cmds.push "  ctx.#{c.command}(#{c.args.join(', ')});"
      
    return new Function 'ctx', cmds.join('\n')
    
  SVG_COMMANDS =
    moveTo: 'M'
    lineTo: 'L'
    quadraticCurveTo: 'Q'
    bezierCurveTo: 'C'
    closePath: 'Z'
    
  # Converts the path to an SVG path data string
  toSVG: ->
    cmds = []
    for c in @commands
      args = (Math.round(arg * 100) / 100 for arg in c.args)
      cmds.push "#{SVG_COMMANDS[c.command]}#{args.join(' ')}"
      
    return cmds.join('')
    
  # Gets the "control box" of a path.
  # This is like the bounding box, but it includes all points including
  # control points of bezier segments and is much faster to compute than
  # the real bounding box.
  get 'cbox', ->
    if @_cbox
      return @_cbox
    
    cbox = new BBox
    for command in @commands
      for x, i in command.args by 2
        cbox.addPoint x, command.args[i + 1]
          
    @_cbox = Object.freeze cbox
    
  # Gets the exact bounding box of the path by evaluating curve segments.
  # Slower to compute than the control box, but more accurate.
  get 'bbox', ->
    if @_bbox
      return @_bbox
    
    bbox = new BBox        
    cx = cy = 0
    
    f = (t) ->
      Math.pow(1-t, 3) * p0[i] + 
        3 * Math.pow(1-t, 2) * t * p1[i] + 
        3 * (1-t) * Math.pow(t, 2) * p2[i] + 
        Math.pow(t, 3) * p3[i]
    
    for c in @commands
      switch c.command
        when 'moveTo', 'lineTo'
          [x, y] = c.args
          bbox.addPoint x, y
          cx = x
          cy = y
      
        when 'quadraticCurveTo', 'bezierCurveTo'
          if c.command is 'quadraticCurveTo'
            # http://fontforge.org/bezier.html
            [qp1x, qp1y, p3x, p3y] = c.args
            cp1x = cx + 2 / 3 * (qp1x - cx)    # CP1 = QP0 + 2/3 * (QP1-QP0)
            cp1y = cy + 2 / 3 * (qp1y - cy)
            cp2x = p3x + 2 / 3 * (qp1x - p3x)  # CP2 = QP2 + 2/3 * (QP1-QP2)
            cp2y = p3y + 2 / 3 * (qp1y - p3y)
          else
            [cp1x, cp1y, cp2x, cp2y, p3x, p3y] = c.args
            
          # http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
          bbox.addPoint p3x, p3y
          
          p0 = [cx, cy]
          p1 = [cp1x, cp1y]
          p2 = [cp2x, cp2y]
          p3 = [p3x, p3y]
                    
          for i in [0..1]
            b = 6 * p0[i] - 12 * p1[i] + 6 * p2[i]
            a = -3 * p0[i] + 9 * p1[i] - 9 * p2[i] + 3 * p3[i]
            c = 3 * p1[i] - 3 * p0[i]
          
            if a is 0
              continue if b is 0
              
              t = -c / b
              if 0 < t and t < 1
                bbox.addPoint f(t), bbox.maxY if i is 0
                bbox.addPoint bbox.maxX, f(t) if i is 1
              
              continue
          
            b2ac = Math.pow(b, 2) - 4 * c * a
            continue if b2ac < 0
            
            t1 = (-b + Math.sqrt(b2ac)) / (2 * a)
            if 0 < t1 and t1 < 1
              bbox.addPoint f(t1), bbox.maxY if i is 0
              bbox.addPoint bbox.maxX, f(t1) if i is 1
            
            t2 = (-b - Math.sqrt(b2ac)) / (2 * a)
            if 0 < t2 and t2 < 1
              bbox.addPoint f(t2), bbox.maxY if i is 0
              bbox.addPoint bbox.maxX, f(t2) if i is 1
              
          cx = p3x
          cy = p3y
                    
    @_bbox = Object.freeze bbox
        
module.exports = Path
