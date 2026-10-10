import assert from 'assert';
import { cache } from '../src/cache.js';

class CachedFixture {
  constructor(
    compute = function (key) {
      return { owner: this, key };
    },
  ) {
    this.compute = compute;
    this.calls = 0;
  }

  get property() {
    this.calls++;
    return this.compute();
  }

  once() {
    this.calls++;
    return this.compute();
  }

  keyed(key) {
    this.calls++;
    return this.compute(key);
  }
}

cache(CachedFixture, {
  property: 'once',
  once: 'once',
  keyed: 'key',
});

describe('lazy caching without decorators', function () {
  it('should defer computation until a getter is read or a method is called', function () {
    let fixture = new CachedFixture();
    let once = fixture.once;
    let keyed = fixture.keyed;
    assert.equal(fixture.calls, 0);
    assert.strictEqual(fixture.once, once);
    assert.strictEqual(fixture.keyed, keyed);

    fixture.property;
    once.call(fixture);
    keyed.call(fixture, 0);
    assert.equal(fixture.calls, 3);
  });

  it('should preserve the receiver and return the same result on cache hits', function () {
    let fixture = new CachedFixture();
    let property = fixture.property;
    let once = fixture.once();
    let keyed = fixture.keyed(0);

    assert.strictEqual(fixture.property, property);
    assert.strictEqual(fixture.once(), once);
    assert.strictEqual(fixture.keyed(0), keyed);
    assert.strictEqual(property.owner, fixture);
    assert.strictEqual(once.owner, fixture);
    assert.strictEqual(keyed.owner, fixture);
    assert.equal(fixture.calls, 3);
  });

  it('should keep caches separate for each instance and member', function () {
    let first = new CachedFixture();
    let second = new CachedFixture();
    assert.notStrictEqual(first.property, second.property);
    assert.notStrictEqual(first.once(), second.once());
    assert.notStrictEqual(first.keyed(0), second.keyed(0));
    assert.notStrictEqual(first.property, first.once());
    assert.notStrictEqual(first.once(), first.keyed(0));
    assert.equal(first.calls, 3);
    assert.equal(second.calls, 3);
  });

  it('should distinguish argument values and use object identity for keys', function () {
    let fixture = new CachedFixture();
    let keys = [0, '0', false, null, undefined, NaN, {}, {}, Symbol('key')];
    let results = keys.map((key) => fixture.keyed(key));
    assert.equal(new Set(results).size, keys.length);

    for (let i = 0; i < keys.length; i++) {
      assert.strictEqual(fixture.keyed(keys[i]), results[i]);
    }

    assert.equal(fixture.calls, keys.length);
  });

  it('should cache falsy results including undefined', function () {
    for (let value of [undefined, null, false, 0, '']) {
      let fixture = new CachedFixture(() => value);
      for (let i = 0; i < 3; i++) {
        assert.strictEqual(fixture.property, value);
        assert.strictEqual(fixture.once(), value);
        assert.strictEqual(fixture.keyed(0), value);
      }

      assert.equal(fixture.calls, 3);
    }
  });

  it('should retry computations that throw without caching the exception', function () {
    for (let member of ['property', 'once', 'keyed']) {
      let fixture = new CachedFixture(function () {
        if (this.calls === 1) {
          throw new Error('retry');
        }

        return {};
      });
      let read = () =>
        member === 'property' ? fixture.property : fixture[member](0);
      assert.throws(read, /retry/);
      let result = read();
      assert.strictEqual(read(), result);
      assert.equal(fixture.calls, 2);
    }
  });

  it('should preserve prototype attributes and define immutable, hidden own properties', function () {
    let fixture = new CachedFixture();
    fixture.property;
    fixture.once();
    fixture.keyed(0);

    for (let member of ['property', 'once', 'keyed']) {
      let prototype = Object.getOwnPropertyDescriptor(
        CachedFixture.prototype,
        member,
      );
      assert.equal(prototype.configurable, true);
      assert.equal(prototype.enumerable, false);

      let descriptor = Object.getOwnPropertyDescriptor(fixture, member);
      assert.equal(descriptor.configurable, false);
      assert.equal(descriptor.enumerable, false);
      assert.equal(descriptor.writable, false);
    }
  });

  it('should reject unsupported members and cache modes', function () {
    class Fixture {
      get property() {
        return 1;
      }
      method() {
        return 1;
      }
    }

    assert.throws(() => cache(Fixture, { method: 'unknown' }), TypeError);
    assert.throws(() => cache(Fixture, { missing: 'once' }), TypeError);
    assert.throws(() => cache(Fixture, { property: 'key' }), TypeError);
  });
});
