import { Button } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../../store/store";
import { HiEye } from "react-icons/hi2";
import DraggableWindow from "../../components/DraggableWindow";
import { useState } from "react";
import PreviewCanvas from "./ChartTrackPreview/PreviewCanvas";

interface ChartTrackPreview {
  chartUuid: string;
}

export default function ChartTrackPreview({ chartUuid }: ChartTrackPreview) {
  const [visible, setVisible] = useState(false);
  const snap = useSnapshot(store);
  const chart = snap.project.charts.find(c => c.uuid === chartUuid);
  const title = chart?.label + "のプレビュー";

  return (
    <>
      <Button variant="ghost" size="sm" p={1} onClick={() => setVisible(!visible)}>
        <HiEye size={16} />
      </Button>

      {
        visible && (
          <DraggableWindow title={title} width="400px" onClose={() => setVisible(false)}>
            <PreviewCanvas chartUuid={chartUuid} />
          </DraggableWindow>
        )
      }
    </>
  );
}
