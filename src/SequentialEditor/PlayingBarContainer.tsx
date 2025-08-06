import { Bleed } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import PlayingBar from "./PlayingBarContainer/PlayingBar";
export default function PlayingBarContainer() {
  
  const snap = useSnapshot(store);
  const h = snap.project.getHeight();

  return (<Bleed position={"absolute"} top={0} zIndex={5} left={0} w={"100%"} h={100+h+"px"} style={{pointerEvents: "none"}} >
    <Bleed position={"absolute"} top={"100px"} left={0} w={"100%"} h={h+"px"}>
      <PlayingBar />
    </Bleed>
  </Bleed>);
}