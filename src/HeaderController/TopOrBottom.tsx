import { Button } from "@chakra-ui/react";
import { PiArrowDown, PiArrowUp } from "react-icons/pi";
import { scrollTo } from "../eventBus";
import { useSnapshot } from "valtio";
import store from "../store/store";
import TemporalPosition from "../store/temporalPosition";

export default function TopOrBottom() {

  const snap = useSnapshot(store);

  const scrollToTop = () => {
    scrollTo.emit("pos", TemporalPosition.createWithSeconds(0));
  };

  const scrollToBottom = () => {
    const length = snap.project.musicLength;
    scrollTo.emit("pos", TemporalPosition.createWithSeconds(length));
  };

  return (<>
    <Button w="10" h="10" onClick={scrollToTop} ><PiArrowUp /></Button>
    <Button w="10" h="10" onClick={scrollToBottom}><PiArrowDown /></Button>
  </>);
}