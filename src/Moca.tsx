import { useRef, useState } from "react";
import { useSnapshot } from "valtio";
import store from "./store/store";

export default function Moca() {

  const snap = useSnapshot(store);

  const styles = [
    ["smile", "00-えへへ-セリフ.wav"],
    ["musu", "01-進捗どうですか？-セリフ.wav"],
    ["smile", "02-何やってるんですか？制作してください！-セリフ.wav"],
    ["yandere", "03-マスターは私のことだけ見てればいいんです-セリフ.wav"],
    ["yandere", "04-早く進捗出してください-セリフ.wav"],
    ["musu", "05-埼玉にも海があるんですか？-セリフ.wav"],
    ["smile", "06-さっさと始めていればとっくに終わってたん-セリフ.wav"],
    ["musu", "07-もっと前からやっときゃよかった-セリフ.wav"],
    ["musu", "08-ああ土砂ぶり、心しょんぼりなり-セリフ.wav"],
    ["smile", "09-他の作業も今から終わらせちゃいましょうね-セリフ.wav"]
  ];

  const [emotion, setEmotion] = useState("default");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<number | null>(null);

  const handleClick = () => {
    // ドラッグ中またはドラッグ直後はクリックイベントを無視
    if (isDragging || hasDragged) return;

    // 既存のタイマーをクリア
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const randomIndex = Math.floor(Math.random() * styles.length);
    const [newEmotion, audioFile] = styles[randomIndex];
    setEmotion(newEmotion);
    if (audioRef.current) {
      audioRef.current.src = `moca/voice/${audioFile}`;
      audioRef.current.play();
    }

    // 3秒後にdefaultに戻すタイマーを設定
    timerRef.current = setTimeout(() => {
      setEmotion("default");
    }, 3000);
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasDragged(false);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setHasDragged(true);
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // ドラッグ後のクリックを防ぐため、少し遅延してからhasDraggedをリセット
    if (hasDragged) {
      setTimeout(() => setHasDragged(false), 50);
    }
  };

  if (snap.moca === false) {
    return null;
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img 
        src={`moca/${emotion}.png`} 
        width={1288/6} 
        height={2370/6} 
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          zIndex: 1000000000000000000
        }}
        draggable={false}
      />
      <audio ref={audioRef} />
    </div>
  );
}
