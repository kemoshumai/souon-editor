import { Bleed } from "@chakra-ui/react";
import { SingleNoteEvent } from "../../../store/noteEvent";

export default function SingleNote( props: { note: SingleNoteEvent, w: number } ) {

  const { note, w } = props;

  return (<Bleed position={"absolute"} w={w} h={10} backgroundColor={"white"} border={"solid 1px gray"} />)
}