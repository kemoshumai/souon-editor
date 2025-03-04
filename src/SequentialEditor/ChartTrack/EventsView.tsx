import { For } from "@chakra-ui/react";
import Note from "./Note";
import { useSnapshot } from "valtio";
import store from "../../store/store";

export default function EventsView( props : { chart: { uuid: string }, laneWidth: number } ) {

  const snap = useSnapshot(store);

  const chart = snap.project.charts.find(c => c.uuid === props.chart.uuid)!;
  const events = chart.events;

  const laneWidth = props.laneWidth;

  return (
    <For each={events} fallback={<></>} >
      {(event, _)=> (
        (()=>{
          if((event as any).lane !== undefined) {
            if ((event as any).lane < 0 || (event as any).lane >= chart.laneNumber) {
              return null;
            }
          }

          return <Note key={event.uuid} uuid={event.uuid} chart={chart.uuid} w={laneWidth}  />
        })()
      )}
    </For>
  );
}