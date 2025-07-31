import TemporalPosition from "./temporalPosition";
import { safeBigInt } from '../utils/bigintHelpers';

export default class TempoEvent {
  uuid: string;
  tempo: number;
  beat: number;
  length: number;

  constructor(uuid: string, tempo: number, beat: number, length: number) {
    this.uuid = uuid;
    this.tempo = tempo;
    this.beat = beat;
    this.length = length;
  }

  static createWithRandomUUID(tempo: number, beat: number, length: number): TempoEvent {
    const uuid = crypto.randomUUID();
    return new TempoEvent(uuid, tempo, beat, length);
  }

  getBarTemporalUnit(): TemporalPosition {
    return TemporalPosition.createWithSeconds(60).divide(safeBigInt(this.tempo)).multiply(safeBigInt(this.beat));
  }

  getTemporalLength(): TemporalPosition {
    return this.getBarTemporalUnit().multiply(safeBigInt(this.length));
  }

}