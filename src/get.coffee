module.exports = (self) ->
  return (key, fn) =>
    Object.defineProperty self.prototype, key,
      get: fn
      enumerable: true
