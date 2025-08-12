import { Bleed, Center, For, HStack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "./store/store";
import ChartTrack from "./SequentialEditor/ChartTrack";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useEffect, useRef } from "react";
import MusicTrack from "./SequentialEditor/MusicTrack";
import TempoTrack from "./SequentialEditor/TempoTrack";
import { toaster } from "./components/ui/toaster";
import PlayingBarContainer from "./SequentialEditor/PlayingBarContainer";
import { scrollTo, scrollToByPercent } from "./eventBus";
import Background from "./Background";
import StemTrack from "./SequentialEditor/StemTrack";

export default function SequentialEditor() {

  const snap = useSnapshot(store);

  const sensors = useSensors( useSensor(PointerSensor), useSensor(TouchSensor) );

  useEffect(() => {
    store.items = ["MUSIC", "TEMPO", "STEMS", ...snap.project.charts.map(c => c.uuid)];
  }, [snap.project.charts]);

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over) return;
    
    // itemsの順番を更新
    const oldIndex = snap.items.indexOf(active.id.toString());
    const newIndex = snap.items.indexOf(over.id.toString());
    const newItems = [...snap.items];
    newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, active.id.toString());
    store.items = newItems;
    
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

  // mittを使って、スクロール位置を同期する
  scrollTo.on("pos", temporalPosition => {
    if(scrollable.current) {
      const y = store.project.getCoordinatePositionFromTemporalPosition(temporalPosition);
      scrollable.current.scrollTop = y;
    }
  });
  scrollToByPercent.on("pos", percent => {
    if(scrollable.current) {
      const y = scrollable.current.scrollHeight * percent;
      scrollable.current.scrollTop = y;
    }
  });

  const fallback = <Center w={"100vw"} h={"100%"} >
    <Text fontSize={"xl"} color={"gray.400"} >表示する譜面がありません</Text>
  </Center>;

  return (
    <>
      <Background />
      <Bleed flex={1} overflowX={"scroll"} overflowY={"scroll"} ref={scrollable} position={"relative"} background={"transparent"} >
        <HStack minH={"100%"} >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis]}
          >
            <SortableContext items={[...snap.items]} strategy={horizontalListSortingStrategy} >
              <For each={snap.items} fallback={fallback} >
                {(chart) => (
                  chart === "MUSIC" ? <MusicTrack key={"MUSIC"} /> :
                  chart === "TEMPO" ? <TempoTrack key={"TEMPO"} /> :
                  chart === "STEMS" ? <StemTrack key={"STEMS"} /> :
                  <ChartTrack key={chart} uuid={chart} />
                )}
              </For>
            </SortableContext>
          </DndContext>
        </HStack>
        <PlayingBarContainer />
      </Bleed>
    </>
  );
}