import { Center, Stack, Text } from "@chakra-ui/react";
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
      <Center>
        <Text>{snap.project.name}</Text>
      </Center>
    </Track>
  );
}