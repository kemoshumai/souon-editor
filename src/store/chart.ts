import ChartEvent from "./chartEvent";

export default class Chart {
  uuid: string;
  events: ChartEvent[];
  laneNumber: number;
  label: string;
  level: number;

  constructor(uuid: string, events: ChartEvent[], laneNumber: number, label: string, level: number = 1) {
    this.uuid = uuid;
    this.events = events;
    this.laneNumber = laneNumber;
    this.label = label;
    this.level = level;
  }
}