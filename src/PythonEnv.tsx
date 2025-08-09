import { useSnapshot } from "valtio";
import store from "./store/store";
import { useAsync } from "react-use";
import { invoke } from "@tauri-apps/api/core";

export default function PythonEnv() {

  const snap = useSnapshot(store);

  useAsync(async () => {

    if (snap.isPythonEnvReady) return;

    store.splashScreenStack.push("Pythonのセットアップを確認しています。");

    await invoke("check_python");

    store.splashScreenStack.push("Demucsのセットアップを確認しています。");

    await invoke("check_demucs");

    store.isPythonEnvReady = true;

  }, [snap.isPythonEnvReady])

  return (<></>);

}