import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { PiFile } from "react-icons/pi";
import store from "../store/store";
import Project from "../store/project";
import { toaster } from "../components/ui/toaster";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

enum FileMenuSelection {
  NewFile = "new_file",
  OpenFile = "open_file",
  SaveFile = "save_file",
}

export default function FileMenu() {

  const saveFile = async () => {
    if (!store.project) return;
    
    const path = await save({
      filters: [
        {
          name: "SOF",
          extensions: ["sof"]
        }
      ]
    });

    if (!path) return;

    await writeTextFile(path, store.project.getSerialized() , { create: true });

    toaster.create({
      title: "ファイルを保存しました",
      description: "保存先：" + path,
      type: "info"
    });
  };

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    switch (value) {
      case FileMenuSelection.NewFile: {
        store.project = new Project("", "New Project", [], []);
        break;
      }
      case FileMenuSelection.OpenFile: {
        toaster.create({
          title: "未実装",
          description: "ファイルを開く機能は未実装です",
          type: "error"
        });
        break;
      }
      case FileMenuSelection.SaveFile: {
        saveFile();
        break;
      }
    }
  }

  return (<>
    <MenuRoot onSelect={onSelect} >
      <MenuTrigger as={Button} w="10" h="10"><PiFile /></MenuTrigger>
      <MenuContent position={"absolute"} zIndex={10} top={10}>
        <MenuItem value={FileMenuSelection.NewFile}>新規作成</MenuItem>
        <MenuItem value={FileMenuSelection.OpenFile}>開く</MenuItem>
        <MenuItem value={FileMenuSelection.SaveFile}>保存</MenuItem>
      </MenuContent>
    </MenuRoot>
  </>);
}