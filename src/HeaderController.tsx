import { Button, HStack, Input, Separator, Stack, Text } from "@chakra-ui/react";
import { PiPause, PiPlay } from "react-icons/pi";
import { useSnapshot } from "valtio";
import store from "./store/store";
import { useState } from "react";
import PlusMenu from "./HeaderController/PlusMenu";
import TitleBanner from "./HeaderController/TitleBanner";
import FileMenu from "./HeaderController/FileMenu";
import TopOrBottom from "./HeaderController/TopOrBottom";

export default function HeaderController() {

  const snap = useSnapshot(store);
  
  const [inputName, setInputName] = useState(snap.project.name);

  return (
    <Stack w={"100vw"} gap={0} position={"relative"}>
      <TitleBanner />
      <HStack w={"100vw"}>
        <FileMenu />
        <PlusMenu />
        <Button w="10" h="10" onClick={_=>store.playing = !snap.playing}>{ snap.playing ? <PiPause /> :<PiPlay /> }</Button>
        <TopOrBottom />
        <Input
          w={300}
          value={inputName}
          onChange={e => setInputName(e.target.value)}
          onBlur={() => store.project.name = inputName}
        />
        <HStack mx={2}>
          <Text>秒尺：</Text>
          <Text>{snap.project.musicLength}</Text>
        </HStack>
      </HStack>
      <Separator />
    </Stack>
  );
}
