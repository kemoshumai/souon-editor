import { Button, Center, HStack, Stack, Text, VStack } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import Track from "./Track";
import { useRef } from "react";
import { useAsync } from "react-use";

export default function StemTrack() {
  const snap = useSnapshot(store);

  const bassCanvasRef = useRef<HTMLCanvasElement>(null);
  const drumsCanvasRef = useRef<HTMLCanvasElement>(null);
  const otherCanvasRef = useRef<HTMLCanvasElement>(null);
  const vocalsCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawWaveform = async (canvas: HTMLCanvasElement, audioUrl: string) => {
    if (!canvas || !audioUrl) return;

    canvas.height = 8000;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const audio = await (await fetch(audioUrl)).arrayBuffer();
      const audioContext = new AudioContext();
      const buffer = await audioContext.decodeAudioData(audio);

      const channel = buffer.getChannelData(0);

      const centerX = canvas.width / 2;
      ctx.strokeStyle = "#fff";
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const totalSamples = channel.length;
      for (let i = 0; i < canvas.height; i += 1) {
        const percent = i / canvas.height;
        const sampleIndex = Math.floor(percent * totalSamples);
        const sample = channel[sampleIndex];
        const amplitude = Math.abs(sample);
        // Scale amplitude to half the canvas width
        const xOffset = amplitude * centerX;
        // Map i so that 0 is at the bottom and canvas.height at the top
        const y = canvas.height - i;
        
        ctx.beginPath();
        ctx.moveTo(centerX - xOffset, y);
        ctx.lineTo(centerX + xOffset, y);
        ctx.stroke();
      }
    } catch (error) {
      console.error("Error drawing waveform:", error);
    }
  };

  useAsync(async () => {
    if (bassCanvasRef.current && snap.project.stems.bass) {
      await drawWaveform(bassCanvasRef.current, snap.project.stems.bass);
    }
  }, [snap.project.stems.bass]);

  useAsync(async () => {
    if (drumsCanvasRef.current && snap.project.stems.drums) {
      await drawWaveform(drumsCanvasRef.current, snap.project.stems.drums);
    }
  }, [snap.project.stems.drums]);

  useAsync(async () => {
    if (otherCanvasRef.current && snap.project.stems.other) {
      await drawWaveform(otherCanvasRef.current, snap.project.stems.other);
    }
  }, [snap.project.stems.other]);

  useAsync(async () => {
    if (vocalsCanvasRef.current && snap.project.stems.vocals) {
      await drawWaveform(vocalsCanvasRef.current, snap.project.stems.vocals);
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