import { Bleed, Center, For, HStack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "./store/store";
import Track from "./SequentialEditor/Track";
import { closestCenter, DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";

export default function SequentialEditor() {

  const snap = useSnapshot(store);

  const [items, setItems] = useState<string[]>([]);

  const sensors = useSensors( useSensor(PointerSensor), useSensor(TouchSensor) );

  useEffect(() => {
    setItems(snap.project.charts.map(c => c.uuid));
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

  const fallback = <Center w={"100vw"} h={"100%"} >
    <Text fontSize={"xl"} color={"gray.400"} >表示する譜面がありません</Text>
  </Center>;

  return (
    <Bleed flex={1} overflowX={"scroll"} overflowY={"scroll"} scrollbar={"hidden"}>
      <HStack minH={"100%"} >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={event => {console.log("onDragStart", event.active.data.current)}}
          onDragEnd={handleDragEnd}
          onDragCancel={event => {console.log("onDragCancel", event.active.data.current)}}
        >
          <SortableContext items={items} strategy={horizontalListSortingStrategy} >
            <For each={items} fallback={fallback} >
              {(chart) => (
                <Track key={chart} uuid={chart} />
              )}
            </For>
          </SortableContext>
        </DndContext>
      </HStack>
    </Bleed>
  );
}