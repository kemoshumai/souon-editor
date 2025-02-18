import ChartEventType from "./chartEventType";
import TemporalPosition from "./temporalPosition";

export default class ChartEvent {
  type: ChartEventType;
  uuid: string;
  position: TemporalPosition;

  constructor(type: ChartEventType, uuid: string, position: TemporalPosition) {
    this.type = type;
    this.uuid = uuid;
    this.position = position;
  }

  createWithRandomUUID(type: ChartEventType,position: TemporalPosition): ChartEvent {
    const uuid = crypto.randomUUID();
    return new ChartEvent(type, uuid, position);
  }
}