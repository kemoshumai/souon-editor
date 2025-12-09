import { useState, useRef, useEffect } from "react";
import { Box, Button, Input, VStack, HStack, Text, IconButton } from "@chakra-ui/react";
import { CloseButton } from "../../components/ui/close-button";

interface RouletteItem {
  id: number;
  text: string;
}

interface RouletteWindowProps {
  onClose?: () => void;
}

export default function RouletteWindow({ onClose }: RouletteWindowProps) {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState<RouletteItem[]>([
    { id: 1, text: "オプション1" },
    { id: 2, text: "オプション2" },
    { id: 3, text: "オプション3" },
  ]);
  const [newItemText, setNewItemText] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".no-drag")) return;
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  const addItem = () => {
    if (newItemText.trim()) {
      setItems([...items, { id: Date.now(), text: newItemText }]);
      setNewItemText("");
    }
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const spinRoulette = () => {
    if (items.length === 0 || isSpinning) return;
    
    setIsSpinning(true);
    setResult(null);
    
    const spins = 8 + Math.random() * 10;
    const randomAngle = Math.random() * 360;
    const duration = 3000 + Math.random() * 2000;
    const finalRotation = rotation + 360 * spins + randomAngle;
    setRotation(finalRotation);
    
    setTimeout(() => {
      // 矢印が上(270度の位置)を指しているので、270度からの相対角度を計算
      const normalizedRotation = finalRotation % 360;
      const arrowAngle = (270 - normalizedRotation + 360) % 360;
      const segmentAngle = 360 / items.length;
      const selectedIndex = Math.floor(arrowAngle / segmentAngle) % items.length;
      setResult(items[selectedIndex].text);
      setIsSpinning(false);
    }, duration);
  };

  const getSegmentColor = (index: number) => {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"];
    return colors[index % colors.length];
  };

  return (
    <Box
      ref={windowRef}
      position="fixed"
      left={`${position.x}px`}
      top={`${position.y}px`}
      width="400px"
      bg="gray.800"
      borderRadius="md"
      boxShadow="2xl"
      cursor={isDragging ? "grabbing" : "grab"}
      onMouseDown={handleMouseDown}
      zIndex={1000}
      border="1px solid"
      borderColor="gray.700"
      userSelect="none"
    >
      <HStack
        bg="gray.700"
        px={3}
        py={2}
        borderTopRadius="md"
        justifyContent="space-between"
      >
        <Text fontSize="sm" fontWeight="bold" color="white" userSelect="none">
          🎰 ルーレット
        </Text>
        <CloseButton className="no-drag" size="sm" onClick={onClose} />
      </HStack>

      <VStack p={4} gap={4} className="no-drag">
        <Box position="relative" width="250px" height="250px">
          <svg
            width="250"
            height="250"
            viewBox="0 0 250 250"
            style={{
              transition: isSpinning ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {items.length === 1 ? (
              <g key={items[0].id}>
                <circle
                  cx="125"
                  cy="125"
                  r="120"
                  fill={getSegmentColor(0)}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x="125"
                  y="125"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {items[0].text}
                </text>
              </g>
            ) : (
              items.map((item, index) => {
                const angle = (360 / items.length) * index;
                const nextAngle = (360 / items.length) * (index + 1);
                const startRad = (angle * Math.PI) / 180;
                const endRad = (nextAngle * Math.PI) / 180;
                const x1 = 125 + 120 * Math.cos(startRad);
                const y1 = 125 + 120 * Math.sin(startRad);
                const x2 = 125 + 120 * Math.cos(endRad);
                const y2 = 125 + 120 * Math.sin(endRad);
                const largeArc = 360 / items.length > 180 ? 1 : 0;

                const midAngle = (angle + nextAngle) / 2;
                const textX = 125 + 80 * Math.cos((midAngle * Math.PI) / 180);
                const textY = 125 + 80 * Math.sin((midAngle * Math.PI) / 180);

                return (
                  <g key={item.id}>
                    <path
                      d={`M 125 125 L ${x1} ${y1} A 120 120 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={getSegmentColor(index)}
                      stroke="white"
                      strokeWidth="2"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    >
                      {item.text}
                    </text>
                  </g>
                );
              })
            )}
          </svg>
          <Box
            position="absolute"
            top="-10px"
            left="50%"
            transform="translateX(-50%)"
            width="0"
            height="0"
            borderLeft="15px solid transparent"
            borderRight="15px solid transparent"
            borderTop="25px solid red"
          />
        </Box>

        {result && (
          <Box
            bg="green.600"
            color="white"
            px={4}
            py={2}
            borderRadius="md"
            fontWeight="bold"
            fontSize="lg"
          >
            結果: {result}
          </Box>
        )}

        <Button
          colorScheme="blue"
          onClick={spinRoulette}
          disabled={isSpinning || items.length === 0}
          width="full"
        >
          {isSpinning ? "回転中..." : "ルーレットを回す"}
        </Button>

        <VStack width="full" gap={2}>
          <HStack width="full">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="新しい項目"
              size="sm"
              onKeyPress={(e) => e.key === "Enter" && addItem()}
            />
            <Button onClick={addItem} size="sm" colorScheme="green">
              追加
            </Button>
          </HStack>

          <VStack width="full" maxHeight="150px" overflowY="auto" gap={1}>
            {items.map((item) => (
              <HStack
                key={item.id}
                width="full"
                bg="gray.700"
                px={2}
                py={1}
                borderRadius="sm"
                justifyContent="space-between"
              >
                <Text fontSize="sm" color="white">
                  {item.text}
                </Text>
                <IconButton
                  aria-label="削除"
                  size="xs"
                  colorScheme="red"
                  onClick={() => removeItem(item.id)}
                >
                  ×
                </IconButton>
              </HStack>
            ))}
          </VStack>
        </VStack>
      </VStack>
    </Box>
  );
}