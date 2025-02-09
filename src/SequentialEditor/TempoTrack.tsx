import { Bleed, Center, For, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import Track from "./Track";
export default function TempoTrack() {

  const snap = useSnapshot(store);

  const header = <>
    <Stack>
      <Center><Text>テンポ</Text></Center>
    </Stack>
  </>;

  return (
    <Track uuid={"TEMPO"} header={header} w={150} >
      <Bleed position={"relative"} w={"100%"} h={"100%"} >
        <For each={snap.project.musicTempoList} fallback={<Center><Text>テンポがありません</Text></Center>} >
          {(tempo, index) => (
            <Bleed key={index} borderBottom={"solid 1px white"} w={"100%"} h={50} position={"absolute"} left={0} bottom={snap.project.getYPosition(tempo.position)} >
              <Center position={"absolute"} bottom={0} w={"100%"} >
                <Text color={"gray.400"}>{tempo.tempo} BPM {tempo.beat} 拍</Text>
              </Center>
            </Bleed>
          )}
        </For>
      </Bleed>
    </Track>
  );
}