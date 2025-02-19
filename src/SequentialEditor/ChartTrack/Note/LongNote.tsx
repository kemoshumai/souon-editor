import { Bleed } from "@chakra-ui/react";
import { LongNoteEvent } from "../../../store/noteEvent";

export default function LongNote(props: {
  note: LongNoteEvent;
  w: number;
  getYPosition: ({ seconds }: { seconds: number }) => number;
}) {
  const { note, w, getYPosition } = props;

  const length = getYPosition(note.endPosition) - getYPosition(note.position);

  const h = 12;

  const left = (note.lane + 1) * w * 0.918;
  const bottom = getYPosition(note.position) - h / 2;

  return (
    <Bleed
      position="absolute"
      w={w}
      h={`${h + length}px`}
      backgroundColor="white"
      border="solid 1px gray"
      left={left}
      bottom={bottom}
    />
  );
}