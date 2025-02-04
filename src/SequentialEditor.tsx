import { Center, HStack, Show, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "./store/store";

export default function SequentialEditor() {

  const snap = useSnapshot(store);

  return (
    <Stack w={"100vw"} h={"100%"} gap={0} >
      <HStack w={"100vw"} h={"100%"} >
        <Show when={snap.project.charts.length == 0} >
          <Center w={"100vw"} h={"100%"} >
            <Stack>
              <Center><Text fontSize={"xl"} color={"gray.400"} >表示する譜面がありません</Text></Center>
            </Stack>
          </Center>
        </Show>
      </HStack>
    </Stack>
  );
}