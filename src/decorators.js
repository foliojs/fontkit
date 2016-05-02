/**
 * This decorator caches the results of a getter such that
 * the results are lazily computed once, and then cached.
 * @private
 */
export function cache(target, key, descriptor) {
  var get = descriptor.get;
  descriptor.get = function() {
    let value = get.call(this);
    Object.defineProperty(this, key, { value });
    return value;
  };
}
