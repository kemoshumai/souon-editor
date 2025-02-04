import { Bleed, Center, Text } from "@chakra-ui/react";
import TrackHeader from "./TrackHeader";
import { useSnapshot } from "valtio";
import store from "../store/store";
import { useSortable } from "@dnd-kit/sortable";

export default function Track(props: { uuid: string; }) {

  const snap = useSnapshot(store);

  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.uuid,
  });

  return (
    <Bleed minH={"200vh"} bgColor={"gray.800"} ref={setNodeRef} minW={350} w={350} {...attributes} {...listeners} opacity={isDragging ? 0.5 : 1.0} style={{
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
    }}>
      <TrackHeader>
        <Center h={"100%"} >
          <Text>{snap.project.charts.find(c=>c.uuid == props.uuid)?.label}</Text>
          <Text>{props.uuid}</Text>
        </Center>
      </TrackHeader>
    </Bleed>
  );
}