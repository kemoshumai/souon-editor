import * as path from "@tauri-apps/api/path";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

export default class UserSettings {
  background: string;
  backgroundBlur: boolean;
  headerBlur: boolean;
  aiProvider: "ollama" | "google-ai-studio";
  googleAiApiKey: string;

  constructor() {
    this.background = "";
    this.backgroundBlur = false;
    this.headerBlur = false;
    this.aiProvider = "ollama";
    this.googleAiApiKey = "";
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

  setAiProvider(provider: "ollama" | "google-ai-studio"): void {
    this.aiProvider = provider;
  }

  getAiProvider(): "ollama" | "google-ai-studio" {
    return this.aiProvider;
  }

  setGoogleAiApiKey(apiKey: string): void {
    this.googleAiApiKey = apiKey;
  }

  getGoogleAiApiKey(): string {
    return this.googleAiApiKey;
  }

  static createDefault(): UserSettings {
    return new UserSettings();
  }

  toJSON(): string {
    return JSON.stringify({
      background: this.background,
      backgroundBlur: this.backgroundBlur,
      headerBlur: this.headerBlur,
      aiProvider: this.aiProvider,
      googleAiApiKey: this.googleAiApiKey,
    });
  }

  async save(): Promise<void> {
    const saveTo = await path.join(
      await path.appLocalDataDir(),
      "userSettings.json",
    );
    await writeTextFile(saveTo, this.toJSON());
  }

  static async load(): Promise<UserSettings | null> {
    try {
      const loadFrom = await path.join(
        await path.appLocalDataDir(),
        "userSettings.json",
      );
      const data = await readTextFile(loadFrom);
      const json = JSON.parse(data);
      const settings = new UserSettings();
      settings.background = json.background || "";
      settings.backgroundBlur = json.backgroundBlur || false;
      settings.headerBlur = json.headerBlur || false;
      settings.aiProvider = json.aiProvider || "ollama";
      settings.googleAiApiKey = json.googleAiApiKey || "";
      return settings;
    } catch (error) {
      console.error("Failed to load user settings:", error);
      return null;
    }
  }
}
