import { useSnapshot } from "valtio";
import store from "../../../store/store";
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei';
import { Box } from "@chakra-ui/react";
import { SingleNoteEvent, LongNoteEvent } from "../../../store/noteEvent";
import ChartEventType from "../../../store/chartEventType";

interface PreviewCanvasProps {
  chartUuid: string;
}

export default function PreviewCanvas({ chartUuid }: PreviewCanvasProps) {
  const snap = useSnapshot(store);
  const chart = snap.project.charts.find(c => c.uuid === chartUuid);
  const playingPosition = snap.project.playingPosition;

  const numberOfLanes = chart?.laneNumber ?? 12;
  const offsetZ = -3;
  const laneLength = 100;
  const highSpeed = 0.2;

  // ピアノの黒鍵の位置（0-indexed）: C#, D#, F#, G#, A#
  const blackKeys = new Set([1, 3, 6, 8, 10]);

  // ノーツの色を取得する関数
  const getNoteColor = (lane: number): string => {
    // レーン番号を12で割った余りでピアノキーにマッピング
    const pianoKey = lane % 12;
    return blackKeys.has(pianoKey) ? "blue" : "white";
  };

  // 表示範囲を計算（playingPositionの前後の時間）
  const viewRangeSeconds = 5; // 5秒先まで表示
  const viewPastSeconds = 2; // 2秒前まで表示（判定線を過ぎた後も表示）
  const viewStartSeconds = playingPosition.seconds - viewPastSeconds;
  const viewEndSeconds = playingPosition.seconds + viewRangeSeconds;

  // 表示範囲内のノーツをフィルタリング
  const visibleNotes = chart?.events.filter(event => {
    if (event.type === ChartEventType.SingleNote || event.type === ChartEventType.LongNote) {
      const noteSeconds = event.position.seconds;
      return noteSeconds >= viewStartSeconds && noteSeconds <= viewEndSeconds;
    }
    return false;
  }) || [];

  // 秒数からZ座標に変換する関数
  const secondsToZ = (seconds: number): number => {
    const relativeSeconds = seconds - playingPosition.seconds;
    return -(relativeSeconds / viewRangeSeconds) * laneLength * highSpeed;
  };

  return (
    <Box width={400} height={1080/1920*400}>
      <Canvas
        camera={{ position: [0, 5, 2], fov: 30 }}
        shadows
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <OrbitControls />

        {/* レーン数ぶん描画 */}
        {
          Array.from({ length: numberOfLanes }).map((_, i) => {
            const laneWidth = 4 / numberOfLanes;
            return (
              <>
                {/* 背景 */}
                <mesh key={i} position={[-2 + laneWidth / 2 + i * laneWidth, 0, offsetZ]}>
                  <boxGeometry args={[laneWidth, 0.1, laneLength]} />
                  <meshStandardMaterial color={"black"} />
                </mesh>

                {/* レーン端 */}
                <mesh key={i + numberOfLanes} position={[-2 + i * laneWidth, 0.05, offsetZ]}>
                  <boxGeometry args={[0.02, 0.02, laneLength]} />
                  <meshStandardMaterial color={"white"} />
                </mesh>
              </>
            );
          })
        }

        {/* レーン端 */}
        <mesh position={[2, 0.05, offsetZ]}>
          <boxGeometry args={[0.02, 0.02, laneLength]} />
          <meshStandardMaterial color={"white"} />
        </mesh>

        {/* 判定線 */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[4, 0.02, 0.1]} />
          <meshStandardMaterial color={"red"} />
        </mesh>

        {/* ノーツの描画 */}
        {visibleNotes.map((event) => {
          if (event.type === ChartEventType.SingleNote) {
            const noteEvent = event as SingleNoteEvent;
            const laneWidth = 4 / numberOfLanes;
            const x = -2 + laneWidth / 2 + noteEvent.lane * laneWidth;
            const z = secondsToZ(noteEvent.position.seconds);
            const color = getNoteColor(noteEvent.lane);

            return (
              <mesh key={event.uuid} position={[x, 0.1, z+0.1]}>
                <boxGeometry args={[laneWidth * 0.9, 0.1, 0.2]} />
                <meshStandardMaterial color={color} />
              </mesh>
            );
          } else if (event.type === ChartEventType.LongNote) {
            const noteEvent = event as LongNoteEvent;
            const laneWidth = 4 / numberOfLanes;
            const x = -2 + laneWidth / 2 + noteEvent.lane * laneWidth;
            const startZ = secondsToZ(noteEvent.position.seconds);
            const endZ = secondsToZ(noteEvent.endPosition.seconds);
            const centerZ = (startZ + endZ) / 2;
            const length = Math.abs(startZ - endZ);
            const color = getNoteColor(noteEvent.lane);

            return (
              <mesh key={event.uuid} position={[x, 0.2, centerZ]}>
                <boxGeometry args={[laneWidth * 0.9, 0.2, length]} />
                <meshStandardMaterial color={color} />
              </mesh>
            );
          }
          return null;
        })}
      </Canvas>
    </Box>
  );
}
