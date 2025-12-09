import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { useState } from "react";
import { FaRegCircle } from "react-icons/fa6";
import { TbHorseToy } from "react-icons/tb";
import RouletteWindow from "./ToyMenu/RouletteWindow";

enum ToyMenuSelection {
  Roulette = "roulette",
}

export default function ToyMenu() {

  const [roulette, setRoulette] = useState(false);

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value as ToyMenuSelection;

    switch (value) {
      case ToyMenuSelection.Roulette:
        setRoulette(!roulette);
        break;
    }
  }

  return (<>
    <MenuRoot onSelect={onSelect}>
      <MenuTrigger as={Button} w="10" h="10"><TbHorseToy /></MenuTrigger>
      <MenuContent position={"absolute"} zIndex={100} top={10} >
        <MenuItem value={ToyMenuSelection.Roulette}><FaRegCircle />ルーレット</MenuItem>
      </MenuContent>
    </MenuRoot>

    {/* ルーレット表示 */}
    { roulette && <RouletteWindow onClose={() => setRoulette(false)} /> }

  </>);
}