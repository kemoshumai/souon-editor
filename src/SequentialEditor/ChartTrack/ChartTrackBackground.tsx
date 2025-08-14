import { useEffect, useRef, memo, useMemo } from "react";
import Chart from "../../store/chart";
import { useSnapshot } from "valtio";
import store from "../../store/store";

function ChartTrackBackground(props: { chart: Chart, pattern: number[] }) {

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { chart, pattern } = props;

  const snap = useSnapshot(store);
  
  // 描画に必要な値のみを依存関係に含める
  const { zoomScale, musicTempoList } = snap.project;
  const laneNumber = chart?.laneNumber || 0;

  // ズームスケールの変化を制限して描画頻度を下げる
  const throttledZoomScale = useMemo(() => {
    // ズームスケールを段階的に制限（0.1刻み）
    return Math.round(zoomScale * 10) / 10;
  }, [zoomScale]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvasRef.current) return;
    if (!canvas) return;
    if (!chart) return;

    // キャンバスサイズの最適化 - 必要最小限の高さに設定
    const containerHeight = canvasRef.current.clientHeight;
    const optimalHeight = Math.min(60000, Math.max(containerHeight * 3, 10000));
    
    canvas.height = optimalHeight;
    canvas.width = canvasRef.current.clientWidth;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 描画の高速化のためのオプション設定
    ctx.imageSmoothingEnabled = false;
    
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#000";

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // レーンを描画
    const lanes = laneNumber + 1;
    const laneWidth = canvas.width / lanes;

    // レーン背景描画
    for(let i = 0; i < lanes; i++) {
      if (i == 0)
        ctx.fillStyle = "#300";
      else
        ctx.fillStyle = pattern[(i - 1) % pattern.length] == 0 ? "#000" : "#222";
      ctx.fillRect(i * laneWidth, 0, laneWidth, canvas.height);
    }

    for (let i = 0; i < lanes; i++) {
      const x = i * laneWidth;
      ctx.fillStyle = "#eee";
      ctx.fillRect(x, 0, 2, canvas.height);
    }
    ctx.fillRect(canvas.width, 0, -2, canvas.height);

    // 小節線を描画
    const tempoEvents = musicTempoList;

    for(const tempoEvent of tempoEvents) {
      const bottom = snap.project.getCoordinatePositionFromTemporalPosition(snap.project.getTemporalPositionFromTempoEvent(tempoEvent)) / canvasRef.current.clientHeight * canvas.height;
      const height = snap.project.getCoordinatePositionFromTemporalPosition(tempoEvent.getTemporalLength()) / canvasRef.current.clientHeight * canvas.height;
      const barNumber = tempoEvent.length;

      const barHeight = height / barNumber;

      for (let i = 0; i < barNumber; i++) {

        const y = canvas.height - (bottom + i * barHeight);
        const resolution = tempoEvent.beat * (throttledZoomScale < 3 ? 1 : 4);
        const unitHeight = barHeight / resolution;

        for(let j = 0; j < resolution; j++) {
          const unitY = y - (unitHeight * j);

          ctx.fillStyle = j == 0 ? "#fff" :
                          j % (resolution / tempoEvent.beat) == 0 ? "#888" :
                          "#444";

          ctx.fillRect(0, unitY, canvas.width, 2);
        }

        // 小節番号を描画 - ズームレベルが低い場合のみ描画
        if (throttledZoomScale > 1) {
          ctx.fillStyle = "#fff";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText((i).toString(), laneWidth / 2 + 1, y-10);
        }
      }
    }

  }, [canvasRef.current, musicTempoList, throttledZoomScale, laneNumber, canvasRef.current?.clientWidth, pattern, snap.project.music]);

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

// メモ化してパフォーマンス向上
export default memo(ChartTrackBackground, (prevProps, nextProps) => {
  // 深い比較を避けて、必要な場合のみ再レンダリング
  return prevProps.chart === nextProps.chart &&
         JSON.stringify(prevProps.pattern) === JSON.stringify(nextProps.pattern);
});