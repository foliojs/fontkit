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
        
module.exports = Path
