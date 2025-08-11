import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { open } from "@tauri-apps/plugin-dialog";
import { MdMusicNote } from "react-icons/md";
import { PiGear } from "react-icons/pi";
import * as path from '@tauri-apps/api/path';
import { copyFile } from "@tauri-apps/plugin-fs";
import store from "../store/store";
import { toaster } from "../components/ui/toaster";
import { useSnapshot } from "valtio";

enum PlusMenuSelection {
  SetBackground = "set_background",
  SetBackgroundBlur = "set_background_blur",
  ResetBackground = "reset_background",
  ToggleMoca = "toggle_moca",
}

export default function SettingsMenu() {

  const snap = useSnapshot(store);

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    const SetBackground = async () => {
      const file = await open({
        multiple: false,
        filters: [
          {
            name: "画像ファイル",
            extensions: ["png", "jpg", "jpeg", "gif"]
          }
        ]
      });

      if (file) {
        const backgroundUuid = crypto.randomUUID();
        const ext = file.toString().split('.').pop()!;

        const copyTo = await path.join(await path.appLocalDataDir(), backgroundUuid+"."+ext);
        await copyFile(file.toString(), copyTo);

        console.log("背景画像のパス: ", copyTo);

        store.userSettings.background = copyTo;

        await store.userSettings.save();

        toaster.create({ title: "背景画像を設定しました。", description: file, type: "info" });
      }
    }

    const SetBackgroundBlur = async () => {
      store.userSettings.backgroundBlur = !store.userSettings.backgroundBlur;
      await store.userSettings.save();
      toaster.create({
        title: "背景のぼかし設定を変更しました",
        description: `背景のぼかしは${store.userSettings.backgroundBlur ? "有効" : "無効"}です`,
        type: "info"
      });
    }

    const ResetBackground = async () => {
      store.userSettings.background = "";
      store.userSettings.backgroundBlur = false;
      await store.userSettings.save();
      toaster.create({
        title: "背景設定をリセットしました",
        description: "背景画像とぼかし設定を初期化しました",
        type: "info"
      });
    }

    switch (value) {
      case PlusMenuSelection.SetBackground:
        SetBackground();
        break;

      case PlusMenuSelection.SetBackgroundBlur:
        SetBackgroundBlur();
        break;

      case PlusMenuSelection.ResetBackground:
        ResetBackground();
        break;

      case PlusMenuSelection.ToggleMoca:
        store.moca = !store.moca;
        break;
    }
  }

  return (<>
    <MenuRoot onSelect={onSelect} >
      <MenuTrigger as={Button} w="10" h="10"><PiGear /></MenuTrigger>
      <MenuContent position={"absolute"} zIndex={100} top={10} >
        <MenuItem value={PlusMenuSelection.SetBackground}><MdMusicNote />背景画像設定</MenuItem>
        <MenuItem value={PlusMenuSelection.SetBackgroundBlur}>背景のぼかし設定</MenuItem>
        <MenuItem value={PlusMenuSelection.ResetBackground}>背景設定をリセット</MenuItem>
        <MenuItem value={PlusMenuSelection.ToggleMoca}>宮舞を{snap.moca ? "消す" : "呼ぶ"}</MenuItem>
      </MenuContent>
    </MenuRoot>
  </>);
}