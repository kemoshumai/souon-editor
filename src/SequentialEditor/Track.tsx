import { Bleed, Center, Input, Stack, Text } from "@chakra-ui/react";
import TrackHeader from "./TrackHeader";
import { useSnapshot } from "valtio";
import store from "../store/store";
import { useSortable } from "@dnd-kit/sortable";
import { Field } from "../components/ui/field";
import { useState } from "react";
import { GoGrabber } from "react-icons/go";

export default function Track(props: { uuid: string; headerOffsetY: number; }) {

  const snap = useSnapshot(store);

  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.uuid,
  });

  const chart = snap.project.charts.find(c => c.uuid === props.uuid);

  const [laneNumber, setLaneNumber] = useState(chart?.laneNumber);

  return (
    <Bleed minH={"200vh"} bgColor={"gray.800"} ref={setNodeRef} minW={350} w={350} {...attributes} opacity={isDragging ? 0.5 : 1.0} style={{
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
    }}>
      <TrackHeader headerOffsetY={props.headerOffsetY} >
        <Bleed position={"absolute"} right={0} top={0} {...listeners} cursor={"grab"} w={35} h={35}>
          <GoGrabber size={35} />
        </Bleed>
        <Stack>
          <Center h={"100%"} ><Text fontSize={"xl"}>{chart?.label}</Text></Center>
          <Field label={"レーン数"} required helperText={"1以上の整数"} >
            <Input type={"number"} value={laneNumber} onChange={e => setLaneNumber(parseInt(e.target.value))} onBlur={_ => {
              const chart = store.project.charts.find(c => c.uuid === props.uuid);
              if (chart) {
                chart.laneNumber = laneNumber ?? 12;
              }
            }} />
          </Field>
        </Stack>
      </TrackHeader>
    </Bleed>
  );
}