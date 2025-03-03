import { Bleed, HStack, Separator, Text } from "@chakra-ui/react";

export default function TitleBanner() {
  return (<Bleed position={"absolute"} top={0} right={0} w={"20vw"} h={"100%"}>
    <HStack>
      <Text fontStyle={"italic"} mt={2}>{"Souon Editor v0.00"}</Text>
      <Separator orientation={"vertical"} />
      <Text fontStyle={"italic"} mt={2}>{"CREATED BY Kemoshumai"}</Text>
    </HStack>
  </Bleed>)
}