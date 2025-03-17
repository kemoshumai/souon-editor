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

  getSerialized(): string {
    return JSON.stringify({
      uuid: this.uuid,
      events: this.events.map(e => e.getSerialized()),
      laneNumber: this.laneNumber,
      label: this.label,
    });
  }
}