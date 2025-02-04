import ChartEvent from "./chartEvent";
import { LongNoteEvent, SingleNoteEvent } from "./noteEvent";

type ChartEventType = ChartEvent | SingleNoteEvent | LongNoteEvent;

export default ChartEventType;