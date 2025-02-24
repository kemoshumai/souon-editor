import { Bleed, Center, For, HStack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "./store/store";
import ChartTrack from "./SequentialEditor/ChartTrack";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useEffect, useRef, useState } from "react";
import MusicTrack from "./SequentialEditor/MusicTrack";
import TempoTrack from "./SequentialEditor/TempoTrack";
import { useKeyPress } from "react-use";

export default function SequentialEditor() {

  const snap = useSnapshot(store);

  const [items, setItems] = useState<string[]>([]);

  const sensors = useSensors( useSensor(PointerSensor), useSensor(TouchSensor) );

  useEffect(() => {
    setItems(["MUSIC", "TEMPO", ...snap.project.charts.map(c => c.uuid)]);
  }, [snap.project.charts]);

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over) return;
    
    // itemsの順番を更新
    const oldIndex = items.indexOf(active.id.toString());
    const newIndex = items.indexOf(over.id.toString());
    const newItems = [...items];
    newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, active.id.toString());
    setItems(newItems);
    
  };

  const ctrl = useKeyPress("Control");

  const zoom = (element: HTMLDivElement, delta: number, clientY: number) => {
    const rect = element.getBoundingClientRect();
    const scrollTop = element.scrollTop;
    const offsetY = clientY - rect.top + scrollTop;
    const oldTimePos = snap.project.getTemporalPosition(offsetY);

    store.project.zoomScale = Math.max(0.01, store.project.zoomScale - delta * 0.0005);

    const newOffsetY = store.project.getCoordinatePositionFromTemporalPosition(oldTimePos);
    element.scrollTop = Math.max(0, scrollTop + newOffsetY - offsetY);
  }

  const onWheel = (e: WheelEvent) => {
    if(!ctrl[0]) return;
    e.preventDefault();
    const delta = e.deltaY;
    const element = e.currentTarget as HTMLDivElement;
    zoom(element, delta, e.clientY);
  }

  const lastWheelRef = useRef<number>(0);

  const scrollable = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if(scrollable.current) {
      if (lastWheelRef.current !== 0 && Date.now() - lastWheelRef.current < 100) return;
      lastWheelRef.current = Date.now();
      scrollable.current.addEventListener("wheel", onWheel, {passive: false});
    }
    return () => {
      if(scrollable.current) {
        scrollable.current.removeEventListener("wheel", onWheel);
      }
    }
  }, [scrollable.current, onWheel]);

  const fallback = <Center w={"100vw"} h={"100%"} >
    <Text fontSize={"xl"} color={"gray.400"} >表示する譜面がありません</Text>
  </Center>;

  return (
    <Bleed flex={1} overflowX={"scroll"} overflowY={"scroll"} ref={scrollable} >
      <HStack minH={"100%"} >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={event => {console.log("onDragStart", event.active.data.current)}}
          onDragEnd={handleDragEnd}
          onDragCancel={event => {console.log("onDragCancel", event.active.data.current)}}
          modifiers={[restrictToHorizontalAxis]}
        >
          <SortableContext items={items} strategy={horizontalListSortingStrategy} >
            <For each={items} fallback={fallback} >
              {(chart) => (
                chart === "MUSIC" ? <MusicTrack key={"MUSIC"} /> :
                chart === "TEMPO" ? <TempoTrack key={"TEMPO"} /> :
                <ChartTrack key={chart} uuid={chart} />
              )}
            </For>
          </SortableContext>
        </DndContext>
      </HStack>
    </Bleed>
  );
}