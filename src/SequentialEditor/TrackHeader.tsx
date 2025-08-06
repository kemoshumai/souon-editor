import { Bleed } from "@chakra-ui/react";

export default function TrackHeader(props: { children: React.ReactNode; }) {
  return (<Bleed position={"sticky"} w={"100%"} h={100} borderBottom={"solid 1px"} borderColor={"black"} top={0} zIndex={20} bgColor={"gray.800"}>
    {props.children}
  </Bleed>);
}