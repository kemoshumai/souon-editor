import ChartEventType from "./chartEventType";

export default interface Chart {
  uuid: string;
  events: ChartEventType[];
  laneNumber: number;
  label: string;
}