import Chart from "./chart";
import TempoEvent from "./tempoEvent";

export default class Project {
  music: string;
  musicLength: number;
  zoomScale: number;
  name: string;
  charts: Chart[];
  musicTempo: TempoEvent[];

  constructor(music: string, name: string, charts: Chart[], musicTempo: TempoEvent[]) {
    this.music = music;
    this.name = name;
    this.charts = charts;

    this.musicLength = 0;
    this.zoomScale = 1.0;
    this.musicTempo = musicTempo;
  }
}