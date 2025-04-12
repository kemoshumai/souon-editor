import { useSnapshot } from "valtio";
import store from "../../store/store";
import TemporalPosition from "../../store/temporalPosition";
import { Bleed, Button, Popover, Slider } from "@chakra-ui/react";
import { SpeedChangeEvent } from "../../store/speedChangeEvent";
import { useState } from "react";

export default function ProposalSpeedChangeEvent( props: { temporalPosition: TemporalPosition | null, chart: string, cancel: () => void } ) {

  const snap = useSnapshot(store);

  const chart = store.project.charts.find(c => c.uuid === props.chart)!;

  const getYPosition = ({ seconds }: { seconds: number }) => snap.project.getYPosition({ seconds });

  const y = props.temporalPosition != null ? getYPosition(props.temporalPosition) : 0;

  const [speed, setSpeed] = useState(1.0);

  const handleOnClick  = (e: React.MouseEvent) => {
    console.log("handleOnClick", e);
    chart.events.push( new SpeedChangeEvent(crypto.randomUUID(), props.temporalPosition!, speed) );
    setSpeed(1.0); // スライダーを初期化
    props.cancel(); // 作成が終わったらPopoverをキャンセル
  }

  const popover = <Popover.Root open={true} onOpenChange={props.cancel} >
  <Popover.Positioner position={"absolute"} left={0} top={0} />
  <Popover.Content mt={2}>
    <Popover.Body> 
      <Popover.Title>
        速度変化点作成
      </Popover.Title>
      <Slider.Root value={[speed]} defaultValue={[1.0]} max={2.0} min={0} step={0.1} onValueChange={e => setSpeed(e.value[0])} >
        <Slider.Label />
        <Slider.ValueText textAlign={"center"} />
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumb index={0} />
        </Slider.Control>
      </Slider.Root>
      <Button w={"100%"} mt={2} onClick={handleOnClick}>作成</Button>
    </Popover.Body>
  </Popover.Content>
</Popover.Root>;

  if ( props.temporalPosition === null ) return <></>;

  return (
    <Bleed position={"absolute"} left={0} bottom={y-2+"px"} w={"100%"} h={"2px"} bgColor={"green.500"} zIndex={100} pointerEvents={"none"} onClick={e => e.stopPropagation()} >
        { popover }
    </Bleed>
  )
}