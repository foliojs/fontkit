isEqual = require 'deep-equal'
r = require 'restructure'
CFFOperand = require './CFFOperand'

class CFFDict
  constructor: (@ops = []) ->
    @fields = {}
    for field in @ops
      key = if Array.isArray(field[0]) then field[0][0] << 8 | field[0][1] else field[0]
      @fields[key] = field
      
  decodeOperands = (type, stream, ret, operands) ->
    if Array.isArray(type)
      for op, i in operands
        decodeOperands type[i], stream, ret, [op]
    else if type.decode?
      type.decode(stream, ret, operands)
    else
      switch type
        when 'number', 'offset', 'sid'
          operands[0]
        when 'boolean'
          !!operands[0]
        else
          operands
          
  encodeOperands = (type, stream, ctx, operands) ->
    if Array.isArray(type)
      for op, i in operands
        encodeOperands(type[i], stream, ctx, op)[0]
    else if type.encode?
      type.encode(stream, operands, ctx)
    else if typeof operands is 'number'
      [operands]
    else if typeof operands is 'boolean'
      [+operands]
    else if Array.isArray(operands)
      operands
    else
      [operands]
              
  decode: (stream, parent) ->
    end = stream.pos + parent.length
    ret = {}
    operands = []
    
    # define hidden properties    
    Object.defineProperties ret,
      parent:         { value: parent }
      _startOffset:   { value: stream.pos }
    
    while stream.pos < end
      b = stream.readUInt8()
      if b <= 21
        if b is 12
          b = (b << 8) | stream.readUInt8()
          
        field = @fields[b]
        throw new Error "Unknown operator " + b unless field
        
        ret[field[1]] = decodeOperands field[2], stream, ret, operands
        operands = []
      else
        operands.push CFFOperand.decode(stream, b)
        
    # fill in defaults
    for key, field of @fields
      ret[field[1]] ?= field[3]
        
    return ret
    
  size: (dict, parent, includePointers = true) ->
    ctx = 
      parent: parent
      val: dict
      pointerSize: 0
      startOffset: parent.startOffset or 0
    
    len = 0
        
    for k, field of @fields
      val = dict[field[1]]
      continue if not val? or isEqual val, field[3]
      
      operands = encodeOperands field[2], null, ctx, val
      for op in operands
        len += CFFOperand.size op
        
      key = if Array.isArray(field[0]) then field[0] else [field[0]]
      len += key.length
      
    if includePointers
      len += ctx.pointerSize
        
    return len
    
  encode: (stream, dict, parent) ->
    ctx = 
      pointers: []
      startOffset: stream.pos
      parent: parent
      val: dict
      pointerSize: 0
      
    ctx.pointerOffset = stream.pos + @size(dict, ctx, false)
    
    for field in @ops
      val = dict[field[1]]
      continue if not val? or isEqual val, field[3]
              
      operands = encodeOperands field[2], stream, ctx, val
      for op in operands
        CFFOperand.encode stream, op
        
      key = if Array.isArray(field[0]) then field[0] else [field[0]]
      for op in key
        stream.writeUInt8 op
        
    i = 0
    while i < ctx.pointers.length
      ptr = ctx.pointers[i++]
      ptr.type.encode(stream, ptr.val, ptr.parent)
        
    return
    
module.exports = CFFDict
