import ChartEvent from "./chartEvent";
import Lane from "./lane";
import TemporalPosition from "./temporalPosition";

export class SingleNoteEvent extends ChartEvent {
  lane: Lane = 0;
  
  constructor(uuid: string, position: TemporalPosition, lane: Lane) {
    super(uuid, position);
    this.lane = lane;
  }

}

export class LongNoteEvent extends ChartEvent {
  lane: Lane = 0;
  endPosition: TemporalPosition = new TemporalPosition(0);
  
  constructor(uuid: string, position: TemporalPosition, lane: Lane, endPosition: TemporalPosition) {
    super(uuid, position);
    this.lane = lane;
    this.endPosition = endPosition;
  }
}