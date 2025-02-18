import ChartEvent from "./chartEvent";
import ChartEventType from "./chartEventType";
import Lane from "./lane";
import TemporalPosition from "./temporalPosition";

export class SingleNoteEvent extends ChartEvent {
  lane: Lane = 0;
  
  constructor(uuid: string, position: TemporalPosition, lane: Lane) {
    super(ChartEventType.SingleNote, uuid, position);
    this.lane = lane;
  }

}

export class LongNoteEvent extends ChartEvent {
  lane: Lane = 0;
  endPosition: TemporalPosition = new TemporalPosition(0n);
  
  constructor(uuid: string, position: TemporalPosition, lane: Lane, endPosition: TemporalPosition) {
    super(ChartEventType.LongNote, uuid, position);
    this.lane = lane;
    this.endPosition = endPosition;
  }
}