import { For } from "@chakra-ui/react";
import Note from "./Note";
import { useSnapshot } from "valtio";
import store from "../../store/store";
import ChartEventType from "../../store/chartEventType";
import SpeedChangeEventView from "./EventsView/SpeedChangeEventView";

export default function EventsView( props : { chart: { uuid: string }, laneWidth: number } ) {

  const snap = useSnapshot(store);

  const chart = snap.project.charts.find(c => c.uuid === props.chart.uuid)!;
  const events = chart.events;

  const laneWidth = props.laneWidth;

  return (
    <For each={events} fallback={<></>} >
      {(event, _)=> (
        (()=>{

          // レーンが範囲外のノーツは描画しない
          if((event as any).lane !== undefined) {
            if ((event as any).lane < 0 || (event as any).lane >= chart.laneNumber) {
              return null;
            }
          }

          switch (event.type) {
            case ChartEventType.SingleNote:
            case ChartEventType.LongNote:
              return <Note key={event.uuid} uuid={event.uuid} chart={chart.uuid} w={laneWidth}  />
            case ChartEventType.SpeedChange:
              return <SpeedChangeEventView key={event.uuid} uuid={event.uuid} chart={chart.uuid} w={laneWidth} />
            default:
              return null;
          }
        })()
      )}
    </For>
  );
}