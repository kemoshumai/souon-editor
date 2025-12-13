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

  const zoom = (element: HTMLDivElement, delta: number, mouseY: number) => {
    const rect = element.getBoundingClientRect();
    const scrollTop = element.scrollTop;
    
    // マウス位置を要素内の相対座標に変換
    const relativeY = mouseY - rect.top;
    const absoluteY = relativeY + scrollTop;
    
    // 現在のマウス位置での時間位置を取得
    const oldTimePos = snap.project.getTemporalPosition(absoluteY);
    const oldZoomScale = store.project.zoomScale;

    // ズーム感度を少し上げて、レスポンシブに
    const zoomSensitivity = 0.003;
    const minZoom = 0.1;
    const maxZoom = 50;
    
    const zoomFactor = 1 - delta * zoomSensitivity;
    const newZoomScale = Math.max(minZoom, Math.min(maxZoom, oldZoomScale * zoomFactor));
    
    // 小さな変化は無視して無駄な再レンダリングを防ぐ（閾値を少し上げる）
    if (Math.abs(newZoomScale - oldZoomScale) < 0.005) {
      return;
    }
    
    // ズームスケールを更新
    store.project.zoomScale = newZoomScale;

    // 同じ時間位置での新しいY座標を計算
    const newAbsoluteY = store.project.getCoordinatePositionFromTemporalPosition(oldTimePos);
    
    // マウス位置が変わらないようにスクロール位置を調整
    const newScrollTop = newAbsoluteY - relativeY;
    
    // スクロール位置を設定
    element.scrollTop = Math.max(0, Math.round(newScrollTop));
  }

  const lastWheelRef = useRef<number>(0);

  const onWheel = (e: React.WheelEvent) => {
    // Ctrlキーが押されていない場合は何もしない
    if(!e.ctrlKey) return;
    
    // Ctrlキーが押されている場合のみpreventDefault
    e.preventDefault();
    
    const now = Date.now();
    
    // 前回のズーム処理から最低限の時間が経過していない場合はスキップ
    if (now - lastWheelRef.current < 32) { // 30FPSに緩和
      return;
    }
    
    lastWheelRef.current = now;
    
    // デルタが小さすぎる場合は処理をスキップ
    if (Math.abs(e.deltaY) < 2) {
      return;
    }
    
    const element = e.currentTarget as HTMLDivElement;
    const mouseY = e.clientY;
    
    // ズーム処理を実行
    zoom(element, e.deltaY, mouseY);
  }

  const scrollable = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // クリーンアップ処理は不要
  }, []);

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
      <Bleed flex={1} overflowX={"scroll"} overflowY={"scroll"} ref={scrollable} position={"relative"} background={"transparent"} onWheel={onWheel} >
        <PlayingBarContainer />
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
      </Bleed>
    </>
  );
}