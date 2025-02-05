import { Bleed, Editable, Flex, Stack, Text } from "@chakra-ui/react";
import TrackHeader from "./TrackHeader";
import { useSnapshot } from "valtio";
import store from "../store/store";
import { useSortable } from "@dnd-kit/sortable";
import { useState } from "react";
import { GoGrabber } from "react-icons/go";

export default function Track(props: { uuid: string; }) {

  const snap = useSnapshot(store);

  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.uuid,
  });

  const chart = snap.project.charts.find(c => c.uuid === props.uuid);
  const chartStore = store.project.charts.find(c => c.uuid === props.uuid);

  const [label, setLabel] = useState(chart?.label);
  const [laneNumber, setLaneNumber] = useState(chart?.laneNumber);

  return (
    <Bleed minH={"200vh"} bgColor={"gray.800"} ref={setNodeRef} minW={350} w={350} {...attributes} opacity={isDragging ? 0.5 : 1.0} style={{
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
    }}>
      <TrackHeader>
        <Bleed position={"absolute"} right={0} top={0} {...listeners} cursor={"grab"} w={35} h={35}>
          <GoGrabber size={35} />
        </Bleed>
        <Stack>
          <Bleed mr={10}>
            <Editable.Root textAlign={"start"} defaultValue={chart?.label} w={"100%"} onValueChange={e => setLabel(e.value)} onBlur={_ => {
              if (chartStore) {
                chartStore.label = label ?? "";
              }}} >
              <Editable.Preview />
              <Editable.Input />
            </Editable.Root>
          </Bleed>
          <Flex direction={"row"} alignItems={"center"} justifyContent={"space-between"}>
            <Text>レーン数: </Text>
            <Editable.Root flex={1} textAlign={"start"} defaultValue={chart?.laneNumber.toString()} pl={2} onValueChange={e => setLaneNumber(parseInt(e.value))} onBlur={_ => {
              if (chartStore) {
                chartStore.laneNumber = laneNumber ?? 0;
              }}} >
              <Editable.Preview w={"80%"} />
              <Editable.Input w={"80%"} />
            </Editable.Root>
          </Flex>
        </Stack>
      </TrackHeader>
      <Bleed position={"relative"} top={700} left={10} w={300} h={300} bgColor={"red.300"} >
        <Stack>
          <Text>{chart?.label}</Text>
          <Text>{chart?.laneNumber}</Text>
        </Stack>
      </Bleed>
    </Bleed>
  );
}