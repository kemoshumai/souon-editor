import { Button, Center, HStack, Stack, Text, VStack } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../store/store";
import Track from "./Track";
import { useRef } from "react";
import { useAsync } from "react-use";
import { drawWaveform } from "../utils/waveformRenderer";

export default function MusicTrack() {

  const snap = useSnapshot(store);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useAsync(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !snap.project.music) return;

    await drawWaveform(canvas, snap.project.music);
  }, [snap.project.music]);

  const handleClick = (e: React.MouseEvent) => {
    const height = e.currentTarget.clientHeight;
    const mouseY = e.nativeEvent.offsetY;
    const temporalPosition = snap.project.getTemporalPosition(height - mouseY);
    store.project.playingPosition = temporalPosition;
  };

  const header = <>
    <Stack>
      <Center><Text>波形</Text></Center>
      <VStack>
        {/* store.project.enabledStemsをトグルするボタン */}
        <HStack>
          { snap.project.stems.bass && <Button size="2xs" onClick={() => { store.enabledStems.bass = !store.enabledStems.bass; }} bgColor={snap.enabledStems.bass ? "blue.300" : "gray.500"}>B</Button>}
          { snap.project.stems.drums && <Button size="2xs" onClick={() => { store.enabledStems.drums = !store.enabledStems.drums; }} bgColor={snap.enabledStems.drums ? "blue.300" : "gray.500"}>D</Button>}
        </HStack>
        <HStack>
          { snap.project.stems.other && <Button size="2xs" onClick={() => { store.enabledStems.other = !store.enabledStems.other; }} bgColor={snap.enabledStems.other ? "blue.300" : "gray.500"}>O</Button>}
          { snap.project.stems.vocals && <Button size="2xs" onClick={() => { store.enabledStems.vocals = !store.enabledStems.vocals; }} bgColor={snap.enabledStems.vocals ? "blue.300" : "gray.500"}>V</Button>}
        </HStack>
      </VStack>
    </Stack>
  </>;

  return (
    <Track uuid={"MUSIC"} header={header} w={100} >
      <canvas 
        width={100} 
        style={{
          position: "relative",
          top: 0,
          left: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
        }}
        ref={canvasRef}
        onClick={handleClick}
      />
    </Track>
  );
}