import { subscribe, useSnapshot } from "valtio"
import store from "./store/store"
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAsync } from "react-use";

export default function SaveSystem() {

  const snap = useSnapshot(store);

  // プロジェクトが変更されたら保存フラグをfalseにする
  useEffect(() => {
    const unsubscribe = subscribe(store.project, (ops) => {
      console.log('変更内容(project):', ops);
      store.saved = false;
    });

    return () => {
      unsubscribe();
    }
  }, [snap.project]);

  // プロジェクトの保存フラグに応じてタイトルを変更する
  useAsync(async () => {
    await invoke("set_title", { title: `総音エディタ - ${snap.project.name} ${snap.saved ? "" : "*"}` });
  }, [snap.saved, snap.project.name]);

  // ctrl + s で保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "KeyS") {
        e.preventDefault();
        store.project.saveNewFileOrOverwrite();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (<></>);
}