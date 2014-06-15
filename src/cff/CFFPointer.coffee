r = require 'restructure'

class CFFPointer extends r.Pointer
  constructor: (type, options = {}) ->
    options.type ?= 'global'
    super null, type, options
  
  decode: (stream, parent, operands) ->
    @offsetType = 
      decode: -> operands[0]
  
    super
    
  class Ptr
    constructor: (@val) ->
      @forceLarge = true
      
    valueOf: ->
      @val
  
  encode: (stream, value, ctx) ->
    unless stream
      return [new Ptr 0]
    
    ptr = null
    @offsetType =
      encode: (stream, val) ->
        ptr = val
      
    super
    return [new Ptr ptr]

module.exports = CFFPointer
