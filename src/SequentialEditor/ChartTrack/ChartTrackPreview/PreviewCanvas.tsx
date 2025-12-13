import { useSnapshot } from "valtio";
import store from "../../../store/store";

interface PreviewCanvasProps {
  chartUuid: string;
}

export default function PreviewCanvas({ chartUuid }: PreviewCanvasProps) {
  const snap = useSnapshot(store);
  const chart = snap.project.charts.find(c => c.uuid === chartUuid);

  

  return (
    <canvas width={400} height={1080/1920*400}></canvas>
  );
}
