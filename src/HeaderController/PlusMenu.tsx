import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { MdAddChart, MdMusicNote } from "react-icons/md";
import { PiPlus } from "react-icons/pi";
import store from "../store/store";
import Chart from "../store/chart";

enum PlusMenuSelection {
  SetMusicFile = "set_music_file",
  AddChart = "add_chart",
}

export default function PlusMenu() {

  const AddChart = () => {
    const chart: Chart = {
      uuid: crypto.randomUUID(),
      label: "新しい譜面",
      events: [],
      laneNumber: 12
    };
    store.project.charts.push(chart);

  };

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    switch (value) {
      case PlusMenuSelection.SetMusicFile:
        console.log("SetMusicFile");
        break;
      case PlusMenuSelection.AddChart:
        AddChart();
        break;
    }
  }

  return (<>
    <MenuRoot onSelect={onSelect} >
      <MenuTrigger as={Button} w="10" h="10"><PiPlus /></MenuTrigger>
      <MenuContent position={"absolute"} zIndex={1} top={10}>
        <MenuItem value={PlusMenuSelection.SetMusicFile}><MdMusicNote />音楽ファイル読み込み</MenuItem>
        <MenuItem value={PlusMenuSelection.AddChart}><MdAddChart />譜面追加</MenuItem>
      </MenuContent>
    </MenuRoot>
  </>);
}