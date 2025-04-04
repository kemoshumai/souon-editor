import { useSnapshot } from "valtio";
import store from "../../../store/store";
import { Bleed, Button, Text } from "@chakra-ui/react";
import { SpeedChangeEvent } from "../../../store/speedChangeEvent";

export default function SpeedChangeEventView( props: { uuid: string; chart: string, w: number } ) {

  const snap = useSnapshot(store);
  const chart = snap.project.charts.find(c => c.uuid === props.chart)!;
  const event = chart.events.find(e => e.uuid === props.uuid)! as SpeedChangeEvent;
  const getYPosition = ({ seconds }: { seconds: number }) => snap.project.getYPosition({ seconds });

  const y = getYPosition(event.position);

  const w = props.w;
  const x = 0;

  const deleteMyself = () => {
    const storeChart = store.project.charts.find(c => c.uuid === props.chart)!;
    storeChart.events = storeChart.events.filter(e => e.uuid !== event.uuid);
  }

  return (
    <Bleed position={"absolute"} left={x+"px"} bottom={y-2+"px"} w={w+"px"} h={"2px"} bgColor={"green.500"} zIndex={100} onClick={e => e.stopPropagation()} >
      <Text fontSize={"xs"} color={"white"} textAlign={"center"} position={"absolute"} bottom={0} left={0} w={"100%"}>{event.speed}</Text>
      <Button size={"xs"} position={"absolute"} top={1} left={0} w={"100%"} h={"20px"} onClick={deleteMyself} >削除</Button>
    </Bleed>
  )
}