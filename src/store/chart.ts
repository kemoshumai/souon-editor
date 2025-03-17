import ChartEvent from "./chartEvent";

export default class Chart {
  uuid: string;
  events: ChartEvent[];
  laneNumber: number;
  label: string;

  constructor(uuid: string, events: ChartEvent[], laneNumber: number, label: string) {
    this.uuid = uuid;
    this.events = events;
    this.laneNumber = laneNumber;
    this.label = label;
  }
}