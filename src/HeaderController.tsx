import { Button, HStack, Input, Separator, Stack, Text } from "@chakra-ui/react";
import { PiPlay } from "react-icons/pi";
import { useSnapshot } from "valtio";
import store from "./store/store";
import { useState } from "react";
import PlusMenu from "./HeaderController/PlusMenu";

export default function HeaderController() {

  const snap = useSnapshot(store);
  
  const [inputName, setInputName] = useState(snap.project.name);

  return (
    <Stack w={"100vw"} gap={0}>
      <HStack w={"100vw"}>
        <PlusMenu />
        <Button w="10" h="10"><PiPlay /></Button>
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
