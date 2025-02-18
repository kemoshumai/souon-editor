import { useSnapshot } from "valtio";
import store from "../../store/store";
import ChartEventType from "../../store/chartEventType";
import SingleNote from "./Note/SingleNote";
import { LongNoteEvent, SingleNoteEvent } from "../../store/noteEvent";
import LongNote from "./Note/LongNote";

export default function Note( props: { uuid: string; chart: string, w: number } ) {

  const snap = useSnapshot(store);

  const chart = snap.project.charts.find(c => c.uuid === props.chart)!;
  const note = chart.events.find(n => n.uuid === props.uuid)!;

  const getYPosition = ({ seconds }: { seconds: number }) => snap.project.getYPosition({ seconds });

  if (note.type === ChartEventType.SingleNote)
    return (<SingleNote note={note as SingleNoteEvent} w={props.w} getYPosition={getYPosition} />);

  if (note.type === ChartEventType.LongNote)
    return (<LongNote note={note as LongNoteEvent} w={props.w} getYPosition={getYPosition} />);

  return null;
}