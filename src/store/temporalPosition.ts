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

  get seconds(): number {
    return Number(this._nanoseconds) / 1_000_000_000;
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

  static createWithSeconds(seconds: number): TemporalPosition {
    return new TemporalPosition(BigInt(seconds * 1_000_000_000));
  }

  asNumber(): number {
    return Number(this._nanoseconds);
  }

  getSerialized(): string {
    return this._nanoseconds.toString();
  }
}