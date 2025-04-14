import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { PiFile } from "react-icons/pi";
import store from "../store/store";
import Project from "../store/project";
import { toaster } from "../components/ui/toaster";

enum FileMenuSelection {
  NewFile = "new_file",
  OpenFile = "open_file",
  SaveFile = "save_file",
  SaveAsFile = "save_as_file"
}

export default function FileMenu() {

  const saveFile = async () => {
    if (!store.project) return;
    store.project.saveNewFileOrOverwrite();
  };

  const saveAsFile = async () => {
    if (!store.project) return;
    store.project.saveToFile();
  }

  const loadFile = async () => {
    if (!store.project) return;
    store.project.loadFromFile();
  }

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    switch (value) {
      case FileMenuSelection.NewFile: {
        store.project = new Project("", "New Project", [], []);
        store.saved = false;
        store.filepath = "";
        toaster.create({ title: "新規プロジェクトを作成しました", description: "新しいプロジェクトを作成しました", type: "info" });
        break;
      }
      case FileMenuSelection.OpenFile: {
        loadFile();
        break;
      }
      case FileMenuSelection.SaveFile: {
        saveFile();
        break;
      }
      case FileMenuSelection.SaveAsFile: {
        saveAsFile();
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
        <MenuItem value={FileMenuSelection.SaveAsFile}>名前を付けて保存</MenuItem>
      </MenuContent>
    </MenuRoot>
  </>);
}