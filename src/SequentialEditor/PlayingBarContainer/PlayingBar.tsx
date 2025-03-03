import { Bleed } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../../store/store";
import TemporalPosition from "../../store/temporalPosition";

export default function PlayingBar() {

  const snap = useSnapshot(store);

  const temporalPosition = snap.project.playingPosition;
  const physicalPosition = snap.project.getCoordinatePositionFromTemporalPosition(temporalPosition as TemporalPosition);

  return (<Bleed position={"absolute"} bottom={physicalPosition} left={0} w={"100%"} h={"2px"} backgroundColor={"red.500"} />);
}