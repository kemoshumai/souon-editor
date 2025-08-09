import { proxy } from "valtio";
import Project from "./project";
import UserSettings from "./userSettings";

interface Store {
  project: Project;
  playing: boolean;
  items: string[];// DndKitのSortableContext用
  saved: boolean;// 保存されているかどうか
  filepath: string;// 保存先のファイルパス
  userSettings: UserSettings;
  isUserSettingsLoaded: boolean; // ユーザー設定がロードされたかどうか
  isPythonEnvReady: boolean; // Pythonのセットアップが完了したかどうか
  splashScreenStack: string[]; // スプラッシュスクリーンのスタック
}

const store = proxy<Store>({
  project: new Project("", "Default Project", [], []),
  playing: false,
  items: [],
  saved: false,
  filepath: "",
  userSettings: new UserSettings(), // ユーザー設定をロード、なければ新規作成
  isUserSettingsLoaded: false,
  isPythonEnvReady: false,
  splashScreenStack: []
});

(async () => {
  const loadedSettings = await UserSettings.load();
  if (loadedSettings) {
    store.userSettings = loadedSettings;
  }
  store.isUserSettingsLoaded = true;
})();

export default store;