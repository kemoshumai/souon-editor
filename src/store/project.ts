import { open, save } from "@tauri-apps/plugin-dialog";
import Chart from "./chart";
import TempoEvent from "./tempoEvent";
import TemporalPosition from "./temporalPosition";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { toaster } from "../components/ui/toaster";
import ChartEventType from "./chartEventType";
import { LongNoteEvent, SingleNoteEvent } from "./noteEvent";
import Lane from "./lane";
import { SpeedChangeEvent } from "./speedChangeEvent";
import store from "./store";
import { secondsToNanosecondsBigInt, safeBigInt } from '../utils/bigintHelpers';

// プロジェクトごとのキャッシュを外部で管理
const snappingPositionsCache = new WeakMap<Project, {
  positions: TemporalPosition[];
  zoomScale: number;
  tempoListHash: string;
}>();

export default class Project {
  music: string;
  musicLength: number;
  zoomScale: number;
  name: string;
  charts: Chart[];
  musicTempoList: TempoEvent[];
  playingPosition: TemporalPosition;
  stems: {
    bass: string,
    drums: string,
    other: string,
    vocals: string
  };
  stemNotes: {
    bass: { pitch: number; velocity: number; time: number }[],
    drums: { pitch: number; velocity: number; time: number }[],
    other: { pitch: number; velocity: number; time: number }[],
    vocals: { pitch: number; velocity: number; time: number }[],
  };

  constructor(music: string, name: string, charts: Chart[], musicTempoList: TempoEvent[]) {
    this.music = music;
    this.name = name;
    this.charts = charts;

    this.musicLength = 0;
    this.zoomScale = 3.2;
    this.musicTempoList = musicTempoList;
    this.playingPosition = TemporalPosition.createWithSeconds(2);

    this.stems = {
      bass: "",
      drums: "",
      other: "",
      vocals: ""
    };

    this.stemNotes = {
      bass: [],
      drums: [],
      other: [],
      vocals: []
    };
  }

  getHeight(): number {
    return this.musicLength * this.zoomScale * 100;
  }

  getYPosition(position: { seconds: number }): number {
    return position.seconds * this.zoomScale * 100;
  }

  getTemporalPosition(y: number): TemporalPosition {
    const seconds = y / this.zoomScale / 100;
    return new TemporalPosition(secondsToNanosecondsBigInt(seconds));
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

  private _generateSnappingPositions(): TemporalPosition[] {
    const tempoEvents = this.musicTempoList;
    const plannedSnappingPosition: TemporalPosition[] = [];

    for(const tempoEvent of tempoEvents) {
      // テンポ情報の始まりの位置を取得
      const basePosition = this.getTemporalPositionFromTempoEvent(tempoEvent);

      // 1小節の時間を取得
      const barTemporalUnit = tempoEvent.getBarTemporalUnit();

      // スナップ位置追加を小節数ぶん繰り返す
      for(let i = 0; i < tempoEvent.length; i++) {
        // 小節の始まる位置
        const position = basePosition.add(barTemporalUnit.multiply(safeBigInt(i)).nanoseconds);

        // 1小節を分割する回数を計算
        const resolution = Math.floor(tempoEvent.beat) * ( this.zoomScale < 3 ? 1 : 12 );

        // 1小節を分割した時間を計算
        const dividedTemporalUnit = barTemporalUnit.divide(safeBigInt(resolution));

        // 分割した時間を分割数ぶん繰り返す
        for(let j = 0; j < resolution; j++) {
          const snappingPosition = position.add(dividedTemporalUnit.multiply(safeBigInt(j)).nanoseconds);
          plannedSnappingPosition.push(snappingPosition);
        }
      }
    }

    return plannedSnappingPosition;
  }

  private _getTempoListHash(): string {
    return JSON.stringify(this.musicTempoList.map(t => ({ uuid: t.uuid, tempo: t.tempo, beat: t.beat, length: t.length })));
  }

  clearSnappingCache(): void {
    snappingPositionsCache.delete(this);
  }

  getSnappedTemporalPosition(temporalPosition: TemporalPosition): TemporalPosition {
    // 外部キャッシュから取得
    const currentTempoListHash = this._getTempoListHash();
    let cache = snappingPositionsCache.get(this);
    
    // キャッシュが無効な場合は再生成
    if (!cache || cache.zoomScale !== this.zoomScale || cache.tempoListHash !== currentTempoListHash) {
      const positions = this._generateSnappingPositions();
      cache = {
        positions,
        zoomScale: this.zoomScale,
        tempoListHash: currentTempoListHash
      };
      snappingPositionsCache.set(this, cache);
    }

    const plannedSnappingPosition = cache.positions;

    if (plannedSnappingPosition.length === 0) {
      return temporalPosition;
    }

    const ns = temporalPosition.nanoseconds;
    let minDiff = Number.MAX_VALUE;
    let nearest = plannedSnappingPosition[0];
    
    // より効率的な最近隣探索
    for (const position of plannedSnappingPosition) {
      const diff = Math.abs(Number(position.nanoseconds - ns));
      if (diff < minDiff) {
        minDiff = diff;
        nearest = position;
      }
    }
    
    return nearest;
  }
  
  toBinaryString(u8Array: Uint8Array): string {
      const chunkSize = 0x8000;
      const c = [];
      for (let i = 0; i < u8Array.length; i += chunkSize) {
          c.push(String.fromCharCode(...u8Array.subarray(i, i + chunkSize)));
      }
      return c.join("");
  }

  async getMusicBase64(): Promise<[string, string]> {
    const data = await fetch(this.music);
    const blob = await data.blob();
    const buffer = await blob.arrayBuffer();
    const array = new Uint8Array(buffer);
    const binaryString = this.toBinaryString(array);
    return [btoa(binaryString), blob.type];
  }

  async getSerialized(): Promise<string> {

    const [base64, mimeType] = await this.getMusicBase64();
    const mimeTypeParts = mimeType.split("/");
    const mimeTypeFull = mimeTypeParts.length > 1 ? mimeType : "application/octet-stream"; // MIMEタイプが存在しない場合はデフォルトを使用
    const music = `data:${mimeTypeFull};base64,${base64}`; // MIMEタイプを追加

    return JSON.stringify({
      music: music,
      name: this.name,
      musicLength: this.musicLength,
      zoomScale: this.zoomScale,
      playingPosition: this.playingPosition.getSerialized(),
      charts: this.charts.map(c => ({
        uuid: c.uuid,
        label: c.label,
        laneNumber: c.laneNumber,
        level: c.level,
        events: c.events
      })),
      musicTempoList: this.musicTempoList,
      stems: this.stems,
      stemNotes: this.stemNotes
    });
  }

  async saveToFile() {
    const path = await save({
      filters: [
        {
          name: "SOF",
          extensions: ["sof"]
        }
      ]
    });

    if (!path) return;

    await writeTextFile(path, await this.getSerialized() , { create: true });

    store.saved = true;
    store.filepath = path;

    toaster.create({
      title: "ファイルを保存しました",
      description: "保存先：" + path,
      type: "info"
    });
  }

  async loadFromFile() {
    const path = await open({
      filters: [
        {
          name: "SOF",
          extensions: ["sof"]
        }
      ]
    });

    console.log("[loadFromFile] Selected file path:", path);

    if (!path) return;

    await this.loadFromFilePath(path);
  }

  async loadFromFilePath(path: string) {

    const data = await readTextFile(path);
    const json = JSON.parse(data);

    store.filepath = path;

    console.log(json);

    this.music = json.music;// 音声ファイルはそのままでOK
    this.name = json.name;// プロジェクト名もそのままでOK
    this.musicLength = json.musicLength;// 音声ファイルの長さもnumberなのでそのままでOK
    this.zoomScale = json.zoomScale;// ズーム倍率もnumberなのでそのままでOK
    this.playingPosition = TemporalPosition.fromJSON(json.playingPosition);// TemporalPositionはstringなのでfromJSONで変換
    this.charts = json.charts.map((c: any) => new Chart(c.uuid, c.events.map((e: any)=>{
      if (e.type === ChartEventType.SingleNote) {
        return new SingleNoteEvent(e.uuid, TemporalPosition.fromJSON(e.position), e.lane as Lane);
      } else if (e.type === ChartEventType.LongNote) {
        return new LongNoteEvent(e.uuid, TemporalPosition.fromJSON(e.position), e.lane as Lane, TemporalPosition.fromJSON(e.endPosition));
      } else if (e.type === ChartEventType.SpeedChange) {
        return new SpeedChangeEvent(e.uuid, TemporalPosition.fromJSON(e.position), e.speed);
      }
      throw new Error("Invalid ChartEventType");
    }), c.laneNumber, c.label, c.level ?? 1));// クラスに戻す（levelがない場合はデフォルト1）
    this.musicTempoList = json.musicTempoList.map((t: any) => new TempoEvent(t.uuid, t.tempo, t.beat, t.length));// クラスに戻す

    // ステム情報を復元
    this.stems = {
      bass: json.stems.bass,
      drums: json.stems.drums,
      other: json.stems.other,
      vocals: json.stems.vocals
    };

    this.stemNotes = {
      bass: json.stemNotes.bass,
      drums: json.stemNotes.drums,
      other: json.stemNotes.other,
      vocals: json.stemNotes.vocals
    };

    // 外部キャッシュをクリア
    snappingPositionsCache.delete(this);

    store.saved = true;

    console.log(this);

    toaster.create({
      title: "ファイルを読み込みました",
      description: "読み込み元：" + path,
      type: "info"
    });
  }

  async overwriteToFile() {
    const path = store.filepath;

    if (!path) return;

    await writeTextFile(path, await this.getSerialized() , { create: true });

    store.saved = true;

    toaster.create({
      title: "ファイルを上書き保存しました",
      description: "保存先：" + path,
      type: "info"
    });
  }

  saveNewFileOrOverwrite() {
    if (store.filepath === "") {
      this.saveToFile();
    } else {
      this.overwriteToFile();
    }
  }

  moveTempoEventUp(uuid: string) {
    const index = this.musicTempoList.findIndex(t => t.uuid === uuid);
    if (index < this.musicTempoList.length - 1 && index !== -1) {
      const tempoEvent = this.musicTempoList[index];
      this.musicTempoList.splice(index, 1);
      this.musicTempoList.splice(index + 1, 0, tempoEvent);
      this.clearSnappingCache();
    }
  }

  moveTempoEventDown(uuid: string) {
    const index = this.musicTempoList.findIndex(t => t.uuid === uuid);
    if (index > 0) {
      const tempoEvent = this.musicTempoList[index];
      this.musicTempoList.splice(index, 1);
      this.musicTempoList.splice(index - 1, 0, tempoEvent);
      this.clearSnappingCache();
    }
  }

  deleteTempoEvent(uuid: string) {
    const index = this.musicTempoList.findIndex(t => t.uuid === uuid);
    if (index !== -1) {
      this.musicTempoList.splice(index, 1);
      this.clearSnappingCache();
    }
  }

}