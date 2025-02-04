import TemporalPosition from "./temporalPosition";

export default class ChartEvent {
  uuid: string;
  position: TemporalPosition;

  constructor(uuid: string, position: TemporalPosition) {
    this.uuid = uuid;
    this.position = position;
  }

  createWithRandomUUID(position: TemporalPosition): ChartEvent {
    const uuid = crypto.randomUUID();
    return new ChartEvent(uuid, position);
  }
}