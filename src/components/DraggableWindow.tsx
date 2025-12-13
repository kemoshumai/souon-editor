import { useState, useRef, useEffect, ReactNode } from "react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { CloseButton } from "./ui/close-button";

interface DraggableWindowProps {
  title: string;
  initialPosition?: { x: number; y: number };
  width?: string;
  onClose?: () => void;
  children: ReactNode;
}

export default function DraggableWindow({
  title,
  initialPosition = { x: 100, y: 100 },
  width = "400px",
  onClose,
  children,
}: DraggableWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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
  }, [isDragging, dragOffset]);

  return (
    <Box
      ref={windowRef}
      position="fixed"
      left={`${position.x}px`}
      top={`${position.y}px`}
      width={width}
      bg="gray.800"
      borderRadius="md"
      boxShadow="2xl"
      cursor={isDragging ? "grabbing" : "grab"}
      onMouseDown={handleMouseDown}
      zIndex={2000}
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
          {title}
        </Text>
        <CloseButton className="no-drag" size="sm" onClick={onClose} />
      </HStack>

      <Box p={4} className="no-drag">
        {children}
      </Box>
    </Box>
  );
}
