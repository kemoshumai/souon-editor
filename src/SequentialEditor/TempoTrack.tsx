import { Bleed, Center, For, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import Track from "./Track";
import TempoMarker from "./TempoTrack/TempoMarker";
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
          {(tempo, _) => <TempoMarker key={tempo.uuid} uuid={tempo.uuid} />}
        </For>
      </Bleed>
    </Track>
  );
}