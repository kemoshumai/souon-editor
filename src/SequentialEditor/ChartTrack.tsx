import { Bleed, Center, Editable, Flex, For, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import { useState } from "react";
import Track from "./Track";
import { SegmentedControl } from "../components/ui/segmented-control";

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
    <Track uuid={props.uuid} header={header} w={350 / 12 * ( chart?.laneNumber ?? 1 )} >
      <Bleed position={"relative"} w={"100%"} h={"100%"} >
        <Flex position={"absolute"} top={0} h={"100%"} w={"100%"}>
          <Bleed borderLeft={"solid 1px"} borderRight={"solid 1px"} flex={1} bgColor={"red.800"}></Bleed>
          {[...Array(chart?.laneNumber ?? 0)].map((_, i) => <Bleed key={i} borderLeft={"solid 1px"} borderRight={"solid 1px"} flex={1} 
            bgColor={["gray.800", "gray.700"][pattern[i%24]]}
          ></Bleed>)}
        </Flex>
        <Bleed position={"absolute"} left={0} bottom={0} w={"100%"} h={"100%"} >
          <For each={snap.project.musicTempoList} fallback={<></>} >
            {(tempo, _) => (
              <Bleed key={tempo.uuid} w={"100%"} position={"absolute"} left={0} bottom={snap.project.getYPosition(tempo.position)} >
                {[...Array(100).keys()].map(i => (
                  <Flex direction={"column"} key={i} w={"100%"} h={snap.project.getYPosition(tempo.getBarTemporalUnit())} borderBottom={"solid 1px white"} position={"absolute"} bottom={snap.project.getYPosition(tempo.getBarTemporalUnit().multiply(BigInt(i)))} >
                    {[...Array(tempo.beat).keys()].map(i => <Bleed key={i} w={"100%"} flex={1} borderBottom={"solid 1px gray"} ></Bleed>)} 
                  </Flex>
                ))}
              </Bleed>
            )}
          </For>
        </Bleed>
      </Bleed>
    </Track>
  );
}