import { Button, HStack, Separator, Stack } from "@chakra-ui/react";
import { PiPlay } from "react-icons/pi";

export default function HeaderController() {
  return (
    <Stack w={"100vw"} gap={0}>
      <HStack w={"100vw"} >
        <Button w={"10"} h={"10"}><PiPlay /></Button>
      </HStack>
      <Separator />
    </Stack>
  );
}
