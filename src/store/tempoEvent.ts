import TemporalPosition from "./temporalPosition";

export default class TempoEvent {
  uuid: string;
  position: TemporalPosition;
  tempo: number;
  beat: number;

  constructor(uuid: string, position: TemporalPosition, tempo: number, beat: number) {
    this.uuid = uuid;
    this.position = position;
    this.tempo = tempo;
    this.beat = beat;
  }

  static createWithRandomUUID(position: TemporalPosition, tempo: number, beat: number): TempoEvent {
    const uuid = crypto.randomUUID();
    return new TempoEvent(uuid, position, tempo, beat);
  }

}