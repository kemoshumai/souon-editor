import { useSnapshot } from "valtio";
import store from "./store/store";
import { useEffect, useRef } from "react";

export default function AudioSystem() {

  const snap = useSnapshot(store);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {

    if(!audioRef.current) return;

    audioRef.current.src = snap.project.music;

    audioRef.current.load();
    audioRef.current.addEventListener("loadedmetadata", () => {
      if (audioRef.current) {
        const length = audioRef.current.duration;
        store.project.musicLength = length;
      }
    });

    return () => {
      audioRef.current?.pause();
      audioRef.current?.removeEventListener("loadedmetadata", () => {});
    }

  }, [snap.project.music]);

  if (!snap.project.music) return <></>;

  return <>
    <audio controls style={{display: "none"}} ref={audioRef} />
  </>;
}