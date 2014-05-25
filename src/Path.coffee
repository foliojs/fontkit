class Path
  constructor: ->
    @commands = []
    
  for command in ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'closePath']
    do (command) ->
      Path::[command] = (args...) ->
        @commands.push
          command: command
          args: args
          
        return this
        
  toFunction: ->
    cmds = []
    for c in @commands
      cmds.push "  ctx.#{c.command}(#{c.args.join(', ')});"
      
    return new Function 'ctx', cmds.join('\n')
        
module.exports = Path
