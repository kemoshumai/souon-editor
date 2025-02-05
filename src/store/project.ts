import Chart from "./chart";

export default class Project {
  music: string;
  name: string;
  charts: Chart[];

  constructor(music: string, name: string, charts: Chart[]) {
    this.music = music;
    this.name = name;
    this.charts = charts;
  }
}