import { useEffect, useRef } from "react";
import Chart from "../../store/chart";
import { useSnapshot } from "valtio";
import store from "../../store/store";

export default function ChartTrackBackground(props: { chart: Chart, pattern: number[] }) {

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { chart, pattern } = props;

  const snap = useSnapshot(store);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvasRef.current) return;
    if (!canvas) return;

    canvas.height = 60000;
    canvas.width = canvasRef.current.clientWidth;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#000";

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // レーンを描画
    const laneNumber = chart.laneNumber + 1;
    const laneWidth = canvas.width / laneNumber;

    // レーン背景描画
    for(let i = 0; i < laneNumber; i++) {
      if (i == 0)
        ctx.fillStyle = "#300";
      else
        ctx.fillStyle = pattern[(i - 1) % pattern.length] == 0 ? "#000" : "#222";
      ctx.fillRect(i * laneWidth, 0, laneWidth, canvas.height);
    }

    for (let i = 0; i < laneNumber; i++) {
      const x = i * laneWidth;
      ctx.fillStyle = "#eee";
      ctx.fillRect(x, 0, 2, canvas.height);
    }
    ctx.fillRect(canvas.width, 0, -2, canvas.height);

    // 小節線を描画
    const tempoEvents = snap.project.musicTempoList;

    for(const tempoEvent of tempoEvents) {
      const bottom = snap.project.getCoordinatePositionFromTemporalPosition(snap.project.getTemporalPositionFromTempoEvent(tempoEvent)) / canvasRef.current.clientHeight * canvas.height;
      const height = snap.project.getCoordinatePositionFromTemporalPosition(tempoEvent.getTemporalLength()) / canvasRef.current.clientHeight * canvas.height;
      const barNumber = tempoEvent.length;

      const barHeight = height / barNumber;

      for (let i = 0; i < barNumber; i++) {

        const y = canvas.height - (bottom + i * barHeight);
        const resolution = tempoEvent.beat * (snap.project.zoomScale < 3 ? 1 : 12);
        const unitHeight = barHeight / resolution;

        for(let j = 0; j < resolution; j++) {
          const unitY = y - (unitHeight * j);

          ctx.fillStyle = j == 0 ? "#fff" :
                          j % (resolution / tempoEvent.beat) == 0 ? "#888" :
                          "#444";

          ctx.fillRect(0, unitY, canvas.width, 2);
        }

        // 小節番号を描画
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText((i).toString(), laneWidth / 2 + 1, y-10);

      }
    }

  }, [canvasRef.current, snap.project.musicTempoList, snap.project.zoomScale, chart.laneNumber, canvasRef.current?.clientWidth, pattern, snap.project.music]);

  return (<canvas ref={canvasRef} style={{
    position: "relative",
    top: 0,
    left: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    imageRendering: "pixelated",
  }}>
    
  </canvas>);
}