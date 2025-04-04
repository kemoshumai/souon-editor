import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { MdAddChart, MdMusicNote, MdSpeed } from "react-icons/md";
import { PiPlus } from "react-icons/pi";
import { open } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import * as path from '@tauri-apps/api/path';
import store from "../store/store";
import Chart from "../store/chart";
import { toaster } from "../components/ui/toaster";
import { convertFileSrc } from "@tauri-apps/api/core";
import TempoEvent from "../store/tempoEvent";

enum PlusMenuSelection {
  SetMusicFile = "set_music_file",
  AddChart = "add_chart",
  AddTempo = "add_tempo"
}

export default function PlusMenu() {

  const AddChart = () => {
    const chart = new Chart(crypto.randomUUID(), [], 12, "新しい譜面");
    store.project.charts.push(chart);

  };

  const SetMusic = async () => {
    const file = await open({
      multiple: false,
      filters: [
        {
          name: "音楽ファイル",
          extensions: ["mp3", "wav", "ogg", "flac"]
        }
      ]
    });

    if (file) {

      const musicUuid = crypto.randomUUID();
      const ext = file.toString().split('.').pop()!;

      const copyTo = await path.join(await path.appLocalDataDir(), musicUuid+"."+ext);
      await copyFile(file.toString(), copyTo);

      const assetUrl = await convertFileSrc(copyTo);

      store.project.music = assetUrl;
      
      toaster.create({ title: "音楽ファイルを読み込みました。", description: file, type: "info" });
    }
  }

  const AddTempo = () => {
    const tempoEvent = TempoEvent.createWithRandomUUID(120, 4, 100);
    store.project.musicTempoList.push(tempoEvent);
  }

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    switch (value) {
      case PlusMenuSelection.SetMusicFile:
        SetMusic();
        break;
      case PlusMenuSelection.AddChart:
        AddChart();
        break;
      case PlusMenuSelection.AddTempo:
        AddTempo();
        break;
    }
  }

  return (<>
    <MenuRoot onSelect={onSelect} >
      <MenuTrigger as={Button} w="10" h="10"><PiPlus /></MenuTrigger>
      <MenuContent position={"absolute"} zIndex={10} top={10}>
        <MenuItem value={PlusMenuSelection.SetMusicFile}><MdMusicNote />音楽ファイル読み込み</MenuItem>
        <MenuItem value={PlusMenuSelection.AddChart}><MdAddChart />譜面追加</MenuItem>
        <MenuItem value={PlusMenuSelection.AddTempo}><MdSpeed />テンポ情報追加</MenuItem>
      </MenuContent>
    </MenuRoot>
  </>);
}