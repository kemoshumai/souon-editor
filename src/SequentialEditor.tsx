import { Bleed, Center, For, HStack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "./store/store";
import Track from "./SequentialEditor/Track";

export default function SequentialEditor() {

  const snap = useSnapshot(store);

  const fallback = <Center w={"100vw"} h={"100%"} >
    <Text fontSize={"xl"} color={"gray.400"} >表示する譜面がありません</Text>
  </Center>;

  return (
    <Bleed flex={1} overflowX={"scroll"} overflowY={"scroll"} scrollbar={"hidden"}>
      <HStack minH={"100%"} >
        <For each={snap.project.charts} fallback={fallback} >
          {(chart) => (
            <Bleed key={chart.uuid} minW={350} w={350} minH={"100%"} >
              <Track uuid={chart.uuid} />
            </Bleed>
          )}
        </For>
      </HStack>
    </Bleed>
  );
}