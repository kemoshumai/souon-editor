import { Button } from "@chakra-ui/react";
import { PiArrowDown, PiArrowUp } from "react-icons/pi";
import { scrollToByPercent } from "../eventBus";

export default function TopOrBottom() {

  const scrollToTop = () => {
    scrollToByPercent.emit("pos", 0);
  };

  const scrollToBottom = () => {
    scrollToByPercent.emit("pos", 1);
  };

  return (<>
    <Button w="10" h="10" onClick={scrollToTop} ><PiArrowUp /></Button>
    <Button w="10" h="10" onClick={scrollToBottom}><PiArrowDown /></Button>
  </>);
}