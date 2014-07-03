class CFFOperand
  FLOAT_EOF = 0xf
  FLOAT_LOOKUP = [
    '0', '1', '2', '3', '4', '5', '6', '7', 
    '8', '9', '.', 'E', 'E-', null, '-'
  ]
  
  FLOAT_ENCODE_LOOKUP = 
    '.': 10
    'E': 11
    'E-': 12
    '-': 14
  
  decode: (stream, value) ->
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
      
    return null
    
  size: (value) ->
    # if the value needs to be forced to the largest size (32 bit)
    # e.g. for unknown pointers, set to 32768
    if value.forceLarge
      value = 32768
    
    if (value | 0) isnt value # floating point
      str = '' + value
      return 1 + Math.ceil (str.length + 1) / 2
      
    else if -107 <= value <= 107
      return 1

    else if 108 <= value <= 1131 or -1131 <= value <= -108
      return 2

    else if -32768 <= value <= 32767
      return 3
      
    else
      return 5
          
  encode: (stream, value) ->
    # if the value needs to be forced to the largest size (32 bit)
    # e.g. for unknown pointers, save the old value and set to 32768
    val = Number(value)
    
    if value.forceLarge
      stream.writeUInt8 29
      stream.writeInt32BE val
    
    else if (val | 0) isnt val # floating point
      stream.writeUInt8 30
      
      str = '' + val
      for c1, i in str by 2
        n1 = FLOAT_ENCODE_LOOKUP[c1] or +c1
        
        if i is str.length - 1
          n2 = FLOAT_EOF
        else
          c2 = str[i + 1]
          n2 = FLOAT_ENCODE_LOOKUP[c2] or +c2
          
        stream.writeUInt8 (n1 << 4) | (n2 & 15)
        
      if n2 isnt FLOAT_EOF
        stream.writeUInt8 (FLOAT_EOF << 4)
        
    else if -107 <= val <= 107
      stream.writeUInt8 val + 139

    else if 108 <= val <= 1131
      val -= 108
      stream.writeUInt8 (val >> 8) + 247
      stream.writeUInt8 val & 0xff

    else if -1131 <= val <= -108
      val = -val - 108
      stream.writeUInt8 (val >> 8) + 251
      stream.writeUInt8 val & 0xff

    else if -32768 <= val <= 32767
      stream.writeUInt8 28
      stream.writeInt16BE val
      
    else
      stream.writeUInt8 29
      stream.writeInt32BE val

module.exports = new CFFOperand
