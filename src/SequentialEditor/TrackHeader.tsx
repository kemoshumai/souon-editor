import { Bleed } from "@chakra-ui/react";

export default function TrackHeader(props: { children: React.ReactNode; headerOffsetY: number; }) {
  return (<Bleed position={"relative"} w={"100%"} h={100} borderBottom={"solid 1px"} borderColor={"black"} top={props.headerOffsetY} >
    {props.children}
  </Bleed>);
}