import { Bleed } from "@chakra-ui/react";
import TrackHeader from "./TrackHeader";
import { useSortable } from "@dnd-kit/sortable";
import { GoGrabber } from "react-icons/go";

export default function Track(props: { uuid: string; children: React.ReactNode; header: React.ReactNode; w: number }) {

  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.uuid,
  });

  return (
    <Bleed minH={"200vh"} bgColor={"gray.800"} ref={setNodeRef} minW={props.w} w={props.w} {...attributes} opacity={isDragging ? 0.5 : 1.0} style={{
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
    }}>
      <TrackHeader>
        <Bleed position={"absolute"} right={0} top={0} {...listeners} cursor={"grab"} w={35} h={35}>
          <GoGrabber size={35} />
        </Bleed>
        {props.header}
      </TrackHeader>
      {props.children}
    </Bleed>
  );
}