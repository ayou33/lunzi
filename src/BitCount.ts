/**
 * File: BitCount.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/9/2 11:49
 *
 * A linked-list based multi-digit counter in an arbitrary radix.
 * Each BitCount instance represents one digit; more-significant digits
 * are chained via the `parent` reference, created on-demand when a carry occurs.
 *
 * `_value`  — running total of all `add()` steps applied to THIS node
 *             (only meaningful on the root / least-significant node).
 * `_number` — the current face value of this single digit (0 … radix-1).
 */
export type BitCountOptions = {
  /** Base of the number system (must be ≥ 2). */
  radix: number;
  /** `onComplete` fires when `_value` reaches this number. */
  target?: number;
  autoPrune?: boolean; // for auto-removing leading zeros on borrow
  /** Called once when the cumulative value matches `target`. */
  onComplete?: () => void
}

class BitCount {
  readonly options: BitCountOptions;
  /** The more-significant digit; created automatically on carry. */
  parent: BitCount | null
  /** Cumulative total of all `add()` calls (root node only). */
  _value: number = 0
  /** Current value of this digit (always in the range [0, radix)). */
  _number: number = 0

  constructor (number: number, parent?: BitCount | null, options?: Partial<BitCountOptions> | number) {
    this.options = Object.assign({
      radix: 10,
      target: 0,
    }, typeof options === 'number' ? { radix: options } : options)

    if (this.options.radix < 2) {
      throw new Error('Radix must be greater than 1')
    }

    if (number < 0) {
      throw new Error('Number must be a non-negative integer')
    }

    this.parent = parent ?? null
    this._number = number
    this.carryCheck(this._number)
    this._value = this.value()
    this.checkValue()
  }

  private checkValue () {
    if (this._value === this.options.target) {
      this.options.onComplete?.()
    }
  }

  /**
   * If `next` overflows the current digit, reduce it modulo the radix and
   * propagate the carry to the parent digit (creating one if needed).
   *
   * Note: `onComplete` is intentionally NOT forwarded to auto-created parent
   * nodes — the callback should only fire on the root node where `add()` is
   * called by the caller.
   */
  private carryCheck (next: number) {
    if (next >= this.options.radix) {
      this._number = next % this.options.radix
      if (this.parent) {
        this.parent.add(1)
      } else {
        this.parent = new BitCount(Math.floor(next / this.options.radix), null, {
          radix: this.options.radix,
          target: this.options.target,
          // onComplete is not passed: only the root node owns the completion callback
        })
      }
    }
  }

  /**
   * Add `step` to this digit and propagate carry / borrow as needed.
   * Always call this on the least-significant (root) node.
   *
   * FIX: `checkValue()` is now called **after** all digit state is updated so
   * that `values()` / `value()` reflect the new state inside the callback.
   */
  add (step: number): BitCount {
    this._value += step

    const number = this._number + step

    if (number >= 0 && number < this.options.radix) {
      // Common case: no carry or borrow needed
      this._number = number
    } else if (number >= this.options.radix) {
      // 进位：digit overflowed, propagate to the more-significant parent
      this.carryCheck(number)
    } else {
      // 借位：digit underflowed (number < 0)
      if (this.parent) {
        // Restore this digit using the radix complement and borrow 1 from parent.
        // The parent will recursively borrow further up the chain if its own digit
        // is also 0 — no need to pre-check parent._value here.
        this._number = this.options.radix + number
        this.parent.add(-1)
        // Prune leading-zero most-significant digit:
        // after the borrow, if the parent's only remaining value is 0 and it has
        // no further parent, it is a redundant leading zero and should be removed.
        if (this.options.autoPrune && this.parent._number === 0 && this.parent.parent === null) {
          this.parent = null
        }
      } else {
        // Underflow at the most-significant digit: the overall value would go
        // negative, which is not supported. Clamp to 0 and warn.
        console.warn('BitCount: underflow — attempted to subtract below zero, clamped to 0.')
        this._number = 0
      }
    }

    // Check AFTER state is fully updated so callbacks see consistent digit values
    this.checkValue()

    return this
  }

  /** Returns all digit values from most-significant to least-significant. */
  values (prune = this.options.autoPrune) {
    const values: number[] = [this._number]
    let parent = this.parent

    while (parent) {
      values.unshift(parent._number)
      parent = parent.parent
    }

    if (prune) {
      // Remove leading zeros, but leave at least one digit if the value is zero.
      while (values.length > 1 && values[0] === 0) {
        values.shift()
      }
    }

    return values
  }

  /** Returns only this digit's face value (0 … radix-1). */
  bitValue () {
    return this._number
  }

  /**
   * Returns the full numeric value represented by this node and all its parents.
   * Example (base-10): parent._number = 2, this._number = 3 → returns 23.
   */
  value (): number {
    let value = this._number

    // `placeValue` tracks the positional weight of each parent digit
    // (10, 100, 1000, … for base-10).
    let placeValue = 1
    let parent = this.parent

    while (parent) {
      placeValue *= parent.options.radix
      value += parent._number * placeValue
      parent = parent.parent
    }

    if (Number.isNaN(value)) {
      console.error('BitCount: value() produced NaN', {
        radix: this.options.radix,
        number: this._number,
      })
      return 0
    }

    return value
  }
}

export default BitCount
