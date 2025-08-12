import { Center, HStack, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import Track from "./Track";
import { useRef } from "react";
import { useAsync } from "react-use";
import { drawWaveform } from "../utils/waveformRenderer";

export default function StemTrack() {
  const snap = useSnapshot(store);

  const bassCanvasRef = useRef<HTMLCanvasElement>(null);
  const drumsCanvasRef = useRef<HTMLCanvasElement>(null);
  const otherCanvasRef = useRef<HTMLCanvasElement>(null);
  const vocalsCanvasRef = useRef<HTMLCanvasElement>(null);



  useAsync(async () => {
    if (bassCanvasRef.current && snap.project.stems.bass) {
      await drawWaveform(bassCanvasRef.current, snap.project.stems.bass, "#ff6b6b"); // 赤系 - Bass
    }
  }, [snap.project.stems.bass]);

  useAsync(async () => {
    if (drumsCanvasRef.current && snap.project.stems.drums) {
      await drawWaveform(drumsCanvasRef.current, snap.project.stems.drums, "#4ecdc4"); // 青緑系 - Drums
    }
  }, [snap.project.stems.drums]);

  useAsync(async () => {
    if (otherCanvasRef.current && snap.project.stems.other) {
      await drawWaveform(otherCanvasRef.current, snap.project.stems.other, "#27ae60"); // 緑系 - Other
    }
  }, [snap.project.stems.other]);

  useAsync(async () => {
    if (vocalsCanvasRef.current && snap.project.stems.vocals) {
      await drawWaveform(vocalsCanvasRef.current, snap.project.stems.vocals, "#f9ca24"); // 黄色系 - Vocals
    }
  }, [snap.project.stems.vocals]);

  const handleClick = (e: React.MouseEvent) => {
    const height = e.currentTarget.clientHeight;
    const mouseY = e.nativeEvent.offsetY;
    const temporalPosition = snap.project.getTemporalPosition(height - mouseY);
    store.project.playingPosition = temporalPosition;
  };

  const header = (
    <Stack>
      <Center><Text>Stems</Text></Center>
      <HStack mt={10}>
        <Text w={25} textAlign={"center"}>B</Text>
        <Text w={25} textAlign={"center"}>D</Text>
        <Text w={25} textAlign={"center"}>O</Text>
        <Text w={25} textAlign={"center"}>V</Text>
      </HStack>
    </Stack>
  );

  return (
    <Track uuid={"STEMS"} header={header} w={100}>
      <div 
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
        }}
        onClick={handleClick}
      >
        {/* Bass - B */}
        <canvas 
          width={25} 
          style={{
            position: "relative",
            top: 0,
            left: 0,
            bottom: 0,
            width: "25%",
            height: "100%",
            imageRendering: "pixelated",
            backgroundColor: snap.project.stems.bass ? "transparent" : "#333",
          }}
          ref={bassCanvasRef}
        />
        
        {/* Drums - D */}
        <canvas 
          width={25} 
          style={{
            position: "relative",
            top: 0,
            left: 0,
            bottom: 0,
            width: "25%",
            height: "100%",
            imageRendering: "pixelated",
            backgroundColor: snap.project.stems.drums ? "transparent" : "#333",
          }}
          ref={drumsCanvasRef}
        />
        
        {/* Other - O */}
        <canvas 
          width={25} 
          style={{
            position: "relative",
            top: 0,
            left: 0,
            bottom: 0,
            width: "25%",
            height: "100%",
            imageRendering: "pixelated",
            backgroundColor: snap.project.stems.other ? "transparent" : "#333",
          }}
          ref={otherCanvasRef}
        />
        
        {/* Vocals - V */}
        <canvas 
          width={25} 
          style={{
            position: "relative",
            top: 0,
            left: 0,
            bottom: 0,
            width: "25%",
            height: "100%",
            imageRendering: "pixelated",
            backgroundColor: snap.project.stems.vocals ? "transparent" : "#333",
          }}
          ref={vocalsCanvasRef}
        />
      </div>
    </Track>
  );
}