export default class TemporalPosition {
  private _nanoseconds: bigint;

  constructor(nanoseconds: bigint) {
    this._nanoseconds = nanoseconds;
  }

  get nanoseconds(): bigint {
    return this._nanoseconds;
  }

  set nanoseconds(nanoseconds: bigint) {
    this._nanoseconds = nanoseconds;
  }

  // 四則演算
  add(nanoseconds: bigint): TemporalPosition {
    return new TemporalPosition(this._nanoseconds + nanoseconds);
  }

  subtract(nanoseconds: bigint): TemporalPosition {
    return new TemporalPosition(this._nanoseconds - nanoseconds);
  }

  multiply(nanoseconds: bigint): TemporalPosition {
    return new TemporalPosition(this._nanoseconds * nanoseconds);
  }

  divide(nanoseconds: bigint): TemporalPosition {
    return new TemporalPosition(this._nanoseconds / nanoseconds);
  }
}