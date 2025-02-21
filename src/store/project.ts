import Chart from "./chart";
import TempoEvent from "./tempoEvent";
import TemporalPosition from "./temporalPosition";

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

  getTemporalPosition(y: number): TemporalPosition {
    const seconds = y / this.zoomScale / 100;
    const nanoseconds = BigInt(Math.floor(seconds * 1_000_000_000).toString());
    return new TemporalPosition(nanoseconds);
  }

  getTemporalPositionFromTempoEvent(tempoEvent: TempoEvent): TemporalPosition {
    const { uuid } = tempoEvent;
    const tempoEvents = this.musicTempoList;
    const currentTempoEventIndex = tempoEvents.findIndex(t => t.uuid === uuid);
    if (currentTempoEventIndex === -1) {
      throw new Error(`TempoEvent with uuid ${uuid} not found in musicTempoList`);
    }
    const previousTempoEvents = tempoEvents.slice(0, currentTempoEventIndex);

    let sum = TemporalPosition.createWithSeconds(0);
    for(const e of previousTempoEvents) {
      sum = sum.add(e.getTemporalLength().nanoseconds);
    }

    return sum;
  }

}