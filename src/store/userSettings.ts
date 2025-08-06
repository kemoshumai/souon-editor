import * as path from '@tauri-apps/api/path';
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export default class UserSettings {
  background: string;

  constructor() {
    this.background = "";
  }

  setBackground(background: string): void {
    this.background = background;
  }

  getBackground(): string {
    return this.background;
  }

  toJSON(): string {
    return JSON.stringify({ background: this.background });
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
      return settings;
    } catch (error) {
      console.error("Failed to load user settings:", error);
      return null;
    }
  }
}