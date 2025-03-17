import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { PiFile } from "react-icons/pi";
import store from "../store/store";
import Project from "../store/project";

enum FileMenuSelection {
  NewFile = "new_file",
  OpenFile = "open_file",
  SaveFile = "save_file",
}

export default function FileMenu() {

  const saveFile = async () => {
    if (!store.project) return;
    store.project.saveToFile();
  };

  const loadFile = async () => {
    if (!store.project) return;
    store.project.loadFromFile();
  }

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    switch (value) {
      case FileMenuSelection.NewFile: {
        store.project = new Project("", "New Project", [], []);
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