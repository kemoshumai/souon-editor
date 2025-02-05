import { Center, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import Track from "./Track";

export default function MusicTrack() {

  const snap = useSnapshot(store);

  const header = <>
    <Stack>
      <Center><Text>Music Track</Text></Center>
    </Stack>
  </>;

  return (
    <Track uuid={"MUSIC"} header={header} w={100} >
      <Stack>
        <Text>Music: {snap.project.music}</Text>
        <Text>Length: {snap.project.musicLength}</Text>
      </Stack>
    </Track>
  );
}