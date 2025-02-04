import { Bleed, Separator } from "@chakra-ui/react";

export default function TrackHeader(props: { children: React.ReactNode; }) {
  return (<Bleed position={"relative"} w={"100%"} h={50}>
    {props.children}
    <Separator />
  </Bleed>);
}