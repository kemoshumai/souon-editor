import { Bleed, Center, Editable, Flex, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import { useState } from "react";
import Track from "./Track";
import { SegmentedControl } from "../components/ui/segmented-control";
import { SingleNoteEvent } from "../store/noteEvent";
import EventsView from "./ChartTrack/EventsView";
import ChartTrackBackground from "./ChartTrack/ChartTrackBackground";
import Chart from "../store/chart";

export default function ChartTrack(props: { uuid: string; }) {

  const snap = useSnapshot(store);

  const chart = snap.project.charts.find(c => c.uuid === props.uuid);
  const chartStore = store.project.charts.find(c => c.uuid === props.uuid);

  const [label, setLabel] = useState(chart?.label);
  const [laneNumber, setLaneNumber] = useState(chart?.laneNumber);

  const [mode, setMode] = useState<"Stripe" | "Order" | "Mirror">("Order");

  const pattern = mode == "Order" ? [0,1,0,1,0,0,1,0,1,0,1,0, 0,1,0,1,0,0,1,0,1,0,1,0]
    : mode == "Mirror" ? [0,1,0,1,0,1,0,0,1,0,1,0, 0,1,0,1,0,0,1,0,1,0,1,0]
    : [0,1,0,1,0,1,0,1,0,1,0,1, 0,1,0,1,0,1,0,1,0,1,0,1];

  const laneWidth = 350 / 12;

  const handleOnClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const temporalPosition = snap.project.getTemporalPosition(rect.height - e.nativeEvent.offsetY);
    const snappedTemporalPosition = snap.project.getSnappedTemporalPosition(temporalPosition);
    const lane = Math.floor(e.nativeEvent.offsetX / rect.width * (laneNumber! + 1)) - 1;
    if (0 <= lane && lane < (chart?.laneNumber ?? 0))
      chartStore?.events.push(new SingleNoteEvent(crypto.randomUUID(), snappedTemporalPosition, lane));
  }

  const header = <>
    <Stack gap={0}>
      <Bleed mr={10}>
        <Editable.Root textAlign={"start"} defaultValue={chart?.label} w={"100%"} onValueChange={e => setLabel(e.value)} onBlur={_ => {
          if (chartStore) {
            chartStore.label = label ?? "";
          }}} >
          <Editable.Preview />
          <Editable.Input />
        </Editable.Root>
      </Bleed>
      <Flex direction={"row"} alignItems={"center"} justifyContent={"space-between"} h={4} mb={2} ml={1}>
        <Text fontSize={"sm"}>レーン数: </Text>
        <Editable.Root flex={1} textAlign={"start"} defaultValue={chart?.laneNumber.toString()} pl={2} onValueChange={e => setLaneNumber(parseInt(e.value))} onBlur={_ => {
          if (chartStore) {
            chartStore.laneNumber = laneNumber ?? 0;
          }}} >
          <Editable.Preview w={"80%"} />
          <Editable.Input w={"80%"} />
        </Editable.Root>
      </Flex>
      <Center><SegmentedControl items={["Stripe", "Order", "Mirror"] } size={"xs"} w={12} defaultValue={"Order"} onValueChange={e => setMode(e.value as "Stripe" | "Order" | "Mirror")} /></Center>
    </Stack>
  </>;

  return (
    <Track uuid={props.uuid} header={header} w={laneWidth * ( (chart?.laneNumber ?? 1 ) + 1)} >
      <Bleed position={"relative"} w={"100%"} h={"100%"} onClick={handleOnClick} >
        <Bleed position={"absolute"} left={0} bottom={0} w={"100%"} h={"100%"} >
          <ChartTrackBackground chart={chart as Chart} pattern={pattern} />
        </Bleed>
        <Bleed position={"absolute"} left={0} bottom={0} w={"100%"} h={"100%"} >
          { chart && <EventsView chart={chart} laneWidth={laneWidth}  /> }
        </Bleed>
      </Bleed>
    </Track>
  );
}