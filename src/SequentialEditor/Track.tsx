import { Bleed } from "@chakra-ui/react";
import TrackHeader from "./TrackHeader";
import { useSortable } from "@dnd-kit/sortable";
import { GoGrabber } from "react-icons/go";
import { useSnapshot } from "valtio";
import store from "../store/store";

export default function Track(props: { uuid: string; children: React.ReactNode; header: React.ReactNode; w: number }) {

  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.uuid,
  });

  const snap = useSnapshot(store);
  const { musicLength, zoomScale } = snap.project;
  const h = musicLength * zoomScale * 100;

  return (
    <Bleed minH={"100vh"} h={`${100+h}px`} bgColor={"gray.800"} ref={setNodeRef} minW={props.w} w={props.w} {...attributes} opacity={isDragging ? 0.5 : 1.0} style={{
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
    }}>
      <TrackHeader>
        <Bleed position={"absolute"} right={0} top={0} {...listeners} cursor={"grab"} w={35} h={35}>
          <GoGrabber size={35} />
        </Bleed>
        {props.header}
      </TrackHeader>
      <Bleed h={`${h}px`} w={props.w} >
        {props.children}
      </Bleed>
    </Bleed>
  );
}