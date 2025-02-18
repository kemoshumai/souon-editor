import { useSnapshot } from "valtio";
import store from "../../store/store";
import ChartEventType from "../../store/chartEventType";
import SingleNote from "./Note/SingleNote";
import { SingleNoteEvent } from "../../store/noteEvent";

export default function Note( props: { uuid: string; chart: string, w: number } ) {

  const snap = useSnapshot(store);

  const chart = snap.project.charts.find(c => c.uuid === props.chart)!;
  const note = chart.events.find(n => n.uuid === props.uuid)!;

  if (note.type === ChartEventType.SingleNote)
    return (<SingleNote note={note as SingleNoteEvent} w={props.w} />);
}