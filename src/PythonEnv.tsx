import { useSnapshot } from "valtio";
import store from "./store/store";
import { useAsync } from "react-use";
import { invoke } from "@tauri-apps/api/core";

export default function PythonEnv() {

  const snap = useSnapshot(store);

  useAsync(async () => {

    if (snap.isPythonEnvReady) return;

    store.splashScreenStack.push("ランタイムをセットアップしています。");

    store.splashScreenStack.push("これには数分かかる場合があります。");

    await invoke("check_python");

    store.splashScreenStack.push("ライブラリを設定しています。");

    await invoke("check_demucs");

    store.splashScreenStack.push("FFmpegを設定しています。");

    await invoke("check_ffmpeg");

    store.splashScreenStack.push("セットアップが完了しました。");

    store.isPythonEnvReady = true;

  }, [snap.isPythonEnvReady])

  return (<></>);

}