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
import { toaster } from "./components/ui/toaster";
import PlayingBarContainer from "./SequentialEditor/PlayingBarContainer";

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

  const zoom = (element: HTMLDivElement, delta: number, clientY: number) => {

    toaster.create({
      title: "ズームしました",
      description: "マウスの位置を中心に拡大・縮小します",
      type: "info"
    });

    const rect = element.getBoundingClientRect();
    const scrollTop = element.scrollTop;
    const offsetY = clientY - rect.top + scrollTop;
    const oldTimePos = snap.project.getTemporalPosition(offsetY);

    store.project.zoomScale = Math.max(0.01, store.project.zoomScale - delta * 0.001);

    const newOffsetY = store.project.getCoordinatePositionFromTemporalPosition(oldTimePos);
    element.scrollTop = Math.max(0, scrollTop + newOffsetY - offsetY);
  }

  const lastWheelRef = useRef<number>(0);

  const onWheel = (e: WheelEvent) => {
    if (Date.now() - lastWheelRef.current < 100) return;
    lastWheelRef.current = Date.now();
    if(!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY;
    const element = e.currentTarget as HTMLDivElement;
    zoom(element, delta, e.clientY);
  }

  const scrollable = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if(scrollable.current) {
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
    <Bleed flex={1} overflowX={"scroll"} overflowY={"scroll"} ref={scrollable} position={"relative"} >
      <HStack minH={"100%"} >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
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
      <PlayingBarContainer />
    </Bleed>
  );
}