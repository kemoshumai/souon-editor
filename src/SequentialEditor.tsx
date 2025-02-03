import { HStack, Stack } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "./store/store";

export default function SequentialEditor() {

  const snap = useSnapshot(store);

  return (
    <Stack w={"100vw"} h={"100%"} gap={0} >
      <HStack w={"100vw"} h={"100%"} >
      </HStack>
    </Stack>
  );
}