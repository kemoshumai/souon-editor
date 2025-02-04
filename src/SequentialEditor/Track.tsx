import { Bleed, Center, Text } from "@chakra-ui/react";
import TrackHeader from "./TrackHeader";
import { useSnapshot } from "valtio";
import store from "../store/store";

export default function Track(props: { uuid: string; }) {

  const snap = useSnapshot(store);

  return (
    <Bleed w={"100%"} minH={"200vh"} bgColor={"gray.800"} >
      <TrackHeader>
        <Center h={"100%"} >
          <Text>{snap.project.charts.find(c=>c.uuid == props.uuid)?.label}</Text>
        </Center>
      </TrackHeader>

    </Bleed>
  );
}