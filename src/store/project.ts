import Chart from "./chart";
import TempoEvent from "./tempoEvent";

export default class Project {
  music: string;
  musicLength: number;
  zoomScale: number;
  name: string;
  charts: Chart[];
  musicTempoList: TempoEvent[];

  constructor(music: string, name: string, charts: Chart[], musicTempoList: TempoEvent[]) {
    this.music = music;
    this.name = name;
    this.charts = charts;

    this.musicLength = 0;
    this.zoomScale = 1.0;
    this.musicTempoList = musicTempoList;
  }

  getHeight(): number {
    return this.musicLength * this.zoomScale * 100;
  }

  getYPosition(position: { seconds: number }): number {
    return position.seconds * this.zoomScale * 100;
  }

}