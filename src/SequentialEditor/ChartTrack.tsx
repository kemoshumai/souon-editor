import { Bleed, Editable, Flex, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import { useState } from "react";
import Track from "./Track";

export default function ChartTrack(props: { uuid: string; }) {

  const snap = useSnapshot(store);

  const chart = snap.project.charts.find(c => c.uuid === props.uuid);
  const chartStore = store.project.charts.find(c => c.uuid === props.uuid);

  const [label, setLabel] = useState(chart?.label);
  const [laneNumber, setLaneNumber] = useState(chart?.laneNumber);

  const header = <>
    <Stack>
      <Bleed mr={10}>
        <Editable.Root textAlign={"start"} defaultValue={chart?.label} w={"100%"} onValueChange={e => setLabel(e.value)} onBlur={_ => {
          if (chartStore) {
            chartStore.label = label ?? "";
          }}} >
          <Editable.Preview />
          <Editable.Input />
        </Editable.Root>
      </Bleed>
      <Flex direction={"row"} alignItems={"center"} justifyContent={"space-between"}>
        <Text>レーン数: </Text>
        <Editable.Root flex={1} textAlign={"start"} defaultValue={chart?.laneNumber.toString()} pl={2} onValueChange={e => setLaneNumber(parseInt(e.value))} onBlur={_ => {
          if (chartStore) {
            chartStore.laneNumber = laneNumber ?? 0;
          }}} >
          <Editable.Preview w={"80%"} />
          <Editable.Input w={"80%"} />
        </Editable.Root>
      </Flex>
    </Stack>
  </>;

  return (
    <Track uuid={props.uuid} header={header} w={350 / 12 * ( chart?.laneNumber ?? 1 )} >
      <Flex position={"relative"} top={0} h={"100%"} w={"100%"}>
        <Bleed borderLeft={"solid 1px"} borderRight={"solid 1px"} flex={1} bgColor={"red.800"}></Bleed>
        {[...Array(chart?.laneNumber ?? 0)].map((_, i) => <Bleed key={i} borderLeft={"solid 1px"} borderRight={"solid 1px"} flex={1} 
          bgColor={["gray.800", "gray.700"][[0,1,0,1,0,0,1,0,1,0,1,0][i%12]]}
        ></Bleed>)}
      </Flex>
    </Track>
  );
}