import { Center, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import Track from "./Track";
import { useRef } from "react";
import { useAsync } from "react-use";

export default function MusicTrack() {

  const snap = useSnapshot(store);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useAsync(async () => {
    
    const canvas = canvasRef.current;

    if (!canvas) return;

    canvas.height = 8000;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audio = await (await fetch(snap.project.music)).arrayBuffer();
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

  }, [snap.project.music]);

  const header = <>
    <Stack>
      <Center><Text>楽曲</Text></Center>
    </Stack>
  </>;

  return (
    <Track uuid={"MUSIC"} header={header} w={100} >
      <canvas width={100} style={{
        position: "relative",
        top: 0,
        left: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
      }} ref={canvasRef} />
    </Track>
  );
}