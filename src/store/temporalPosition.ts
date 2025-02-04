export default class TemporalPosition {
  private _position: number;

  constructor(position: number) {
    this._position = position;
  }

  get position(): number {
    return this._position;
  }

  set position(position: number) {
    this._position = position;
  }
}