r = require 'restructure'

class CFFIndex
  constructor: (@type) ->
  decode: (stream, parent) ->
    count = stream.readUInt16BE()
    return [] if count is 0
    
    offSize = stream.readUInt8()
    offsetType = switch offSize
      when 1 then r.uint8
      when 2 then r.uint16
      when 3 then r.uint24
      when 4 then r.uint32
      else throw new Error "Bad offset size in CFFIndex: " + offSize + " " + stream.pos
      
    ret = []
    startPos = stream.pos + ((count + 1) * offSize) - 1
    
    start = offsetType.decode(stream)
    for i in [0...count] by 1
      end = offsetType.decode(stream)
      
      if @type?
        pos = stream.pos
        stream.pos = startPos + start
                
        parent.length = end - start
        ret.push @type.decode(stream, parent)
        stream.pos = pos
      else
        ret.push
          offset: startPos + start
          length: end - start
          
      start = end
    
    stream.pos = startPos + start
    return ret
    
  size: (arr, parent) ->
    size = 2
    return size if arr.length is 0
    
    type = @type or new r.Buffer
    
    # find maximum offset to detminine offset type
    offset = 1
    for item in arr
      offset += type.size(item, parent)
    
    offsetType = if offset <= 0xff  then r.uint8
    else if offset <= 0xffff        then r.uint16
    else if offset <= 0xffffff      then r.uint24
    else if offset <= 0xffffffff    then r.uint32
    else throw new Error "Bad offset in CFFIndex"
    
    size += 1 + offsetType.size() * (arr.length + 1)
    size += offset - 1

    return size
  
  encode: (stream, arr, parent) ->
    stream.writeUInt16BE(arr.length)
    return if arr.length is 0
    
    type = @type or new r.Buffer
    
    # find maximum offset to detminine offset type
    sizes = []
    offset = 1
    for item in arr
      s = type.size(item, parent)
      sizes.push s
      offset += s
    
    offsetType = if offset <= 0xff  then r.uint8
    else if offset <= 0xffff        then r.uint16
    else if offset <= 0xffffff      then r.uint24
    else if offset <= 0xffffffff    then r.uint32
    else throw new Error "Bad offset in CFFIndex"
      
    # write offset size
    stream.writeUInt8(offsetType.size())
    
    # write elements
    offset = 1
    offsetType.encode(stream, offset)
    
    for item, i in arr
      offset += sizes[i]
      offsetType.encode(stream, offset)
      
    for item in arr
      type.encode(stream, item, parent)
      
    return
    
module.exports = CFFIndex
