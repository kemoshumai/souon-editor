import { Bleed, Center, Editable, HStack, Stack, Text } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../../store/store";
import { useEffect, useState } from "react";

export default function TempoMarker( props: { uuid: string} ) {

  const snap = useSnapshot(store);

  const tempo = snap.project.musicTempoList.find(t => t.uuid === props.uuid)!;

  const [bpm, setBpm] = useState(tempo.tempo);
  const [beat, setBeat] = useState(tempo.beat);
  const [length, setLength] = useState(tempo.length);

  useEffect(() => {
    const tempo = store.project.musicTempoList.find(t => t.uuid === props.uuid)!;
    tempo.beat = beat;
  }, [beat]);

  useEffect(() => {
    const tempo = store.project.musicTempoList.find(t => t.uuid === props.uuid)!;
    tempo.tempo = bpm;
  }, [bpm]);

  useEffect(() => {
    const tempo = store.project.musicTempoList.find(t => t.uuid === props.uuid)!;
    tempo.length = length;
  }, [length]);

  const crop = (value: number, defaultValue: number) => {
    if (value < 1) return 1;
    if (value > 999) return 999;
    if (isNaN(value)) return defaultValue;
    return value;
  }

  console.log(tempo.uuid, snap.project.getTemporalPositionFromTempoEvent(tempo));

  return (<>
    <Bleed borderBottom={"solid 1px white"} w={"100%"} h={50} position={"absolute"} left={0} bottom={snap.project.getYPosition(snap.project.getTemporalPositionFromTempoEvent(tempo))} >
      <Stack position={"absolute"} bottom={0} w={"100%"} gap={0} >
        <Center>
          <HStack>
            <Editable.Root textAlign={"center"} defaultValue={bpm.toString()} w={7} onValueChange={e => setBpm(crop(parseInt(e.value), 120))} value={bpm.toString()}>
              <Editable.Preview />
              <Editable.Input />
            </Editable.Root>
            <Text color={"gray.400"}>BPM</Text>
            <Editable.Root textAlign={"center"} defaultValue={beat.toString()} w={7} onValueChange={e => setBeat(crop(parseInt(e.value), 4))} value={beat.toString()}>
              <Editable.Preview />
              <Editable.Input />
            </Editable.Root>
            <Text color={"gray.400"}>拍子</Text>
          </HStack>
        </Center>
        <Center>
          <HStack>
            <Editable.Root textAlign={"center"} defaultValue={length.toString()} w={14} onValueChange={e => setLength(crop(parseInt(e.value), 999))} value={length.toString()}>
              <Editable.Preview />
              <Editable.Input />
            </Editable.Root>
            <Text color={"gray.400"}>小節</Text>
          </HStack>
        </Center>
      </Stack>
    </Bleed>
  </>);
}