import Chart from "./chart";

export default class Project {
  name: string;
  charts: Chart[];

  constructor(name: string, charts: Chart[]) {
    this.name = name;
    this.charts = charts;
  }
}