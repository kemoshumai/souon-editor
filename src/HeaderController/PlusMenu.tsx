import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { MdAddChart, MdMusicNote } from "react-icons/md";
import { PiPlus } from "react-icons/pi";
import { open } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import * as path from '@tauri-apps/api/path';
import store from "../store/store";
import Chart from "../store/chart";
import { toaster } from "../components/ui/toaster";
import { convertFileSrc } from "@tauri-apps/api/core";
import { LongNoteEvent, SingleNoteEvent } from "../store/noteEvent";
import TemporalPosition from "../store/temporalPosition";

enum PlusMenuSelection {
  SetMusicFile = "set_music_file",
  AddChart = "add_chart",
}

export default function PlusMenu() {

  const AddChart = () => {
    const chart: Chart = {
      uuid: crypto.randomUUID(),
      label: "新しい譜面",
      events: [
        new SingleNoteEvent(crypto.randomUUID(), TemporalPosition.createWithSeconds(2), 0),
        new SingleNoteEvent(crypto.randomUUID(), TemporalPosition.createWithSeconds(4), 0),
        new LongNoteEvent(crypto.randomUUID(), TemporalPosition.createWithSeconds(2), 2, TemporalPosition.createWithSeconds(4)),
        new LongNoteEvent(crypto.randomUUID(), TemporalPosition.createWithSeconds(2), 7, TemporalPosition.createWithSeconds(3)),
      ],
      laneNumber: 12
    };
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

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    switch (value) {
      case PlusMenuSelection.SetMusicFile:
        SetMusic();
        break;
      case PlusMenuSelection.AddChart:
        AddChart();
        break;
    }
  }

  return (<>
    <MenuRoot onSelect={onSelect} >
      <MenuTrigger as={Button} w="10" h="10"><PiPlus /></MenuTrigger>
      <MenuContent position={"absolute"} zIndex={10} top={10}>
        <MenuItem value={PlusMenuSelection.SetMusicFile}><MdMusicNote />音楽ファイル読み込み</MenuItem>
        <MenuItem value={PlusMenuSelection.AddChart}><MdAddChart />譜面追加</MenuItem>
      </MenuContent>
    </MenuRoot>
  </>);
}