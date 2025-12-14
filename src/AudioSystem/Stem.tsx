import { RefObject, useEffect, useRef } from "react";

export default function Stem({ audioSrc, audioRef, volume = 1.0 }: { audioSrc: string, audioRef: RefObject<HTMLAudioElement | null>, volume?: number }) {

  const stemRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (stemRef.current) {
      stemRef.current.src = audioSrc;
    }
  }, [audioSrc]);

  // 音量を設定
  useEffect(() => {
    if (stemRef.current) {
      stemRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  // audioRefの再生状態に同期
  useEffect(() => {
    if (!audioRef.current || !stemRef.current) return;

    const mainAudio = audioRef.current;
    const stemAudio = stemRef.current;

    const syncPlayback = () => {
      if (mainAudio.paused && !stemAudio.paused) {
        stemAudio.pause();
      } else if (!mainAudio.paused && stemAudio.paused) {
        stemAudio.currentTime = mainAudio.currentTime;
        stemAudio.play().catch(console.error);
      }
    };

    const syncTime = () => {
      if (mainAudio.paused) {
        stemAudio.currentTime = mainAudio.currentTime;
      }
    };

    const syncOnSeek = () => {
      stemAudio.currentTime = mainAudio.currentTime;
    };

    // イベントリスナーを追加
    mainAudio.addEventListener('play', syncPlayback);
    mainAudio.addEventListener('pause', syncPlayback);
    mainAudio.addEventListener('seeked', syncOnSeek);
    mainAudio.addEventListener('timeupdate', syncTime);

    // 初期同期
    syncPlayback();
    syncTime();

    return () => {
      mainAudio.removeEventListener('play', syncPlayback);
      mainAudio.removeEventListener('pause', syncPlayback);
      mainAudio.removeEventListener('seeked', syncOnSeek);
      mainAudio.removeEventListener('timeupdate', syncTime);
    };
  }, [audioRef]);
  

  return (
    <audio controls style={{display: "none"}} ref={stemRef} />
  );
}
