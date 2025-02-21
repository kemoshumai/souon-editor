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

  getCoordinatePositionFromTemporalPosition(temporalPosition: TemporalPosition): number {
    return Number(temporalPosition.nanoseconds) / 1_000_000_000 * this.zoomScale * 100;
  }

  getSnappedTemporalPosition(temporalPosition: TemporalPosition): TemporalPosition {
    const tempoEvents = this.musicTempoList;
    const plannedSnappingPosition = [];

    for(const tempoEvent of tempoEvents) {
      
      // テンポ情報の始まりの位置を取得
      const basePosition = this.getTemporalPositionFromTempoEvent(tempoEvent);

      // 1小節の時間を取得
      const barTemporalUnit = tempoEvent.getBarTemporalUnit();

      // スナップ位置追加を小節数ぶん繰り返す
      for(let i = 0; i < tempoEvent.length; i++) {

        // 小節の始まる位置
        const position = basePosition.add(barTemporalUnit.multiply(BigInt(i)).nanoseconds);

        // 1小節を分割する回数を計算
        const resolution = tempoEvent.beat;

        // 1小節を分割した時間を計算
        const dividedTemporalUnit = barTemporalUnit.divide(BigInt(resolution));

        // 分割した時間を分割数ぶん繰り返す
        for(let j = 0; j < resolution; j++) {
          const snappingPosition = position.add(dividedTemporalUnit.multiply(BigInt(j)).nanoseconds);
          plannedSnappingPosition.push(snappingPosition);
        }
      }
      
    }

    if (plannedSnappingPosition.length === 0) {
      return temporalPosition;
    }

    const ns = temporalPosition.nanoseconds;
    const diffs = plannedSnappingPosition.map(p => Math.abs(Number(p.nanoseconds - ns)));
    const nearest = plannedSnappingPosition[diffs.indexOf(Math.min(...diffs))];
    
    return nearest;
  }

}