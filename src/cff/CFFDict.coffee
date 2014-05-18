class CFFDict
  constructor: (fields = []) ->
    @fields = {}    
    for field in fields
      key = if Array.isArray(field[0]) then field[0][0] << 8 | field[0][1] else field[0]
      @fields[key] = field
  
  FLOAT_EOF = 0xf  
  FLOAT_LOOKUP = [
    '0', '1', '2', '3', '4', '5', '6', '7', 
    '8', '9', '.', 'E', 'E-', null, '-'
  ]
  
  parseOperand = (value, stream) ->
    if 32 <= value <= 246
      return value - 139
      
    if 247 <= value <= 250
      return (value - 247) * 256 + stream.readUInt8() + 108
      
    if 251 <= value <= 254
      return -(value - 251) * 256 - stream.readUInt8() - 108
      
    if value is 28
      return stream.readInt16BE()
      
    if value is 29
      return stream.readInt32BE()
      
    if value is 30
      str = ''
      loop
        b = stream.readUInt8()
        
        n1 = b >> 4
        break if n1 is FLOAT_EOF
        str += FLOAT_LOOKUP[n1]
        
        n2 = b & 15
        break if n2 is FLOAT_EOF
        str += FLOAT_LOOKUP[n2]
        
      return parseFloat(str)
      
    return -1
    
  decode: (stream, parent) ->
    end = stream.pos + parent.length
    ret = {}
    operands = []
    
    while stream.pos < end
      b = stream.readUInt8()
      if b <= 21
        if b is 12
          b = (b << 8) | stream.readUInt8()
          
        field = @fields[b]
        value = if field[2] in ['number', 'boolean', 'sid', 'offset'] then operands[0] else operands
        
        ret[field[1]] = value
        operands = []
      else
        operands.push parseOperand(b, stream)
        
    # fill in defaults
    for key, field of @fields
      ret[field[1]] ?= field[3]
        
    return ret
    
module.exports = CFFDict
