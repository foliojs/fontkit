/**
 * Registers lazy, per-instance caches without decorator syntax.
 * Use 'once' for getters and zero-argument methods, or 'key' for
 * methods whose result depends on a single argument.
 * @private
 */
export function cache(Class, members) {
  for (let [key, mode] of Object.entries(members)) {
    let descriptor = Object.getOwnPropertyDescriptor(Class.prototype, key);
    if (mode !== 'once' && mode !== 'key') {
      throw new TypeError(`Unknown cache mode for ${key}: ${mode}`);
    }

    if (!descriptor || (!descriptor.get && typeof descriptor.value !== 'function')) {
      throw new TypeError(`Cannot cache ${key}: expected an own getter or method`);
    }

    if (descriptor.get) {
      if (mode !== 'once') {
        throw new TypeError(`Cannot cache getter ${key} by argument`);
      }

      let get = descriptor.get;
      descriptor.get = function() {
        let value = get.call(this);
        Object.defineProperty(this, key, { value });
        return value;
      };
    } else {
      let fn = descriptor.value;
      descriptor = {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get() {
          let memoized;
          if (mode === 'once') {
            let computed = false;
            let value;
            memoized = function() {
              if (!computed) {
                value = fn.call(this);
                computed = true;
              }

              return value;
            };
          } else {
            let values = new Map();
            memoized = function(arg) {
              let value = values.get(arg);
              if (value !== undefined || values.has(arg)) {
                return value;
              }

              value = fn.call(this, arg);
              values.set(arg, value);
              return value;
            };
          }

          Object.defineProperty(this, key, { value: memoized });
          return memoized;
        }
      };
    }

    Object.defineProperty(Class.prototype, key, descriptor);
  }
}
