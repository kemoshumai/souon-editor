import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger } from "@chakra-ui/react";
import { FaRegCircle } from "react-icons/fa6";
import { TbHorseToy } from "react-icons/tb";
import store from "../store/store";

enum ToyMenuSelection {
  Roulette = "roulette",
}

export default function ToyMenu() {

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value as ToyMenuSelection;

    switch (value) {
      case ToyMenuSelection.Roulette:
        store.rouletteWindow = !store.rouletteWindow;
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
  </>);
}