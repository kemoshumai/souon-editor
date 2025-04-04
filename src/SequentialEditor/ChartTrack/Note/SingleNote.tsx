import { Bleed } from "@chakra-ui/react";
import { SingleNoteEvent } from "../../../store/noteEvent";

export default function SingleNote(props: {
  note: SingleNoteEvent;
  w: number;
  getYPosition: ({ seconds }: { seconds: number }) => number;
}) {
  const { note, w, getYPosition } = props;

  const h = 12;

  const left = (note.lane + 1) * w;
  const bottom = getYPosition(note.position) - h / 2;

  return (
    <Bleed
      position="absolute"
      w={w}
      h={`${h}px`}
      backgroundColor="white"
      border="solid 1px gray"
      left={`${left}px`}
      bottom={`${bottom}px`}
    />
  );
}