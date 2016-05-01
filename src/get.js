export default self =>
  (key, fn) => {
    return Object.defineProperty(self.prototype, key, {
      get: fn,
      enumerable: true
    });
  }
;
