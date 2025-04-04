import ChartEvent from "./chartEvent";
import ChartEventType from "./chartEventType";
import TemporalPosition from "./temporalPosition";

export class SpeedChangeEvent extends ChartEvent {
  speed: number = 0;

  constructor(uuid: string, position: TemporalPosition, speed: number) {
    super(ChartEventType.SpeedChange, uuid, position);
    this.speed = speed;
  }

}
