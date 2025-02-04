import ChartEventType from "./chartEventType";

export default class Chart {
  uuid: string;
  events: ChartEventType[];
  laneNumber: number;
  label: string;

  constructor(uuid: string, events: ChartEventType[], laneNumber: number, label: string) {
    this.uuid = uuid;
    this.events = events;
    this.laneNumber = laneNumber;
    this.label = label;
  }
}