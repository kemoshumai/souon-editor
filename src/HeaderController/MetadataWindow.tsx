import { VStack, Input, Text, HStack } from "@chakra-ui/react";
import DraggableWindow from "../components/DraggableWindow";
import { useSnapshot } from "valtio";
import store from "../store/store";
import { useState, useEffect } from "react";

interface MetadataWindowProps {
  onClose?: () => void;
}

export default function MetadataWindow({ onClose }: MetadataWindowProps) {
  const snap = useSnapshot(store);

  const [composer, setComposer] = useState(snap.project.metadata.composer);
  const [chartCreator, setChartCreator] = useState(
    snap.project.metadata.chartCreator,
  );

  useEffect(() => {
    setComposer(snap.project.metadata.composer);
  }, [snap.project.metadata.composer]);

  useEffect(() => {
    setChartCreator(snap.project.metadata.chartCreator);
  }, [snap.project.metadata.chartCreator]);

  return (
    <DraggableWindow title="📋 メタデータ" width="400px" onClose={onClose}>
      <VStack gap={4} p={4} align="stretch">
        <HStack>
          <Text whiteSpace="nowrap" minW="100px" fontSize="sm">
            作曲者
          </Text>
          <Input
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onBlur={() => (store.project.metadata.composer = composer)}
            placeholder="作曲者名を入力"
            size="sm"
          />
        </HStack>
        <HStack>
          <Text whiteSpace="nowrap" minW="100px" fontSize="sm">
            譜面制作者
          </Text>
          <Input
            value={chartCreator}
            onChange={(e) => setChartCreator(e.target.value)}
            onBlur={() => (store.project.metadata.chartCreator = chartCreator)}
            placeholder="譜面制作者名を入力"
            size="sm"
          />
        </HStack>
      </VStack>
    </DraggableWindow>
  );
}
