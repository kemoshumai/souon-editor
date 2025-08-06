import * as path from '@tauri-apps/api/path';
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export default class UserSettings {
  background: string;
  backgroundBlur: boolean;

  constructor() {
    this.background = "";
    this.backgroundBlur = false;
  }

  setBackground(background: string): void {
    this.background = background;
  }

  setBackgroundBlur(blur: boolean): void {
    this.backgroundBlur = blur;
  }

  getBackground(): string {
    return this.background;
  }

  getBackgroundBlur(): boolean {
    return this.backgroundBlur;
  }
  
  static createDefault(): UserSettings {
    return new UserSettings();
  }

  toJSON(): string {
    return JSON.stringify({ background: this.background, backgroundBlur: this.backgroundBlur });
  }

  async save(): Promise<void> {
    const saveTo = await path.join(await path.appLocalDataDir(), "userSettings.json");
    await writeTextFile(saveTo, this.toJSON());
  }

  static async load(): Promise<UserSettings | null> {

    try {
      const loadFrom = await path.join(await path.appLocalDataDir(), "userSettings.json");
      const data = await readTextFile(loadFrom);
      const json = JSON.parse(data);
      const settings = new UserSettings();
      settings.background = json.background || "";
      settings.backgroundBlur = json.backgroundBlur || false;
      return settings;
    } catch (error) {
      console.error("Failed to load user settings:", error);
      return null;
    }
  }
}