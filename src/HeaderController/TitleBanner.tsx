import { Flex, HStack, Text } from "@chakra-ui/react";
import kemoshumai from "./kemoshumai.svg";

export default function TitleBanner() {
  return (<Flex position={"absolute"} top={0} right={0} w={"100vw"} h={"100%"} pointerEvents={"none"} justify={"right"} pr={2} >
    <HStack>
      <Text fontStyle={"italic"} mt={2}>{"Souon Editor v0.00"}</Text>
      <img src={kemoshumai} width={"100px"} color="white" style={{filter: "invert(71%) sepia(0%) saturate(711%) hue-rotate(143deg) brightness(88%) contrast(80%)"}} />
    </HStack>
  </Flex>)
}