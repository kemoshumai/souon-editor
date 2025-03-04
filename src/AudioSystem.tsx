import { useSnapshot } from "valtio";
import store from "./store/store";
import { useEffect, useRef } from "react";
import { useInterval, useKeyPressEvent } from "react-use";
import TemporalPosition from "./store/temporalPosition";

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

  useEffect(() => {

    if(!audioRef.current) return;

    console.log("audioRef.current.currentTime", audioRef.current.currentTime);

    if(audioRef.current.paused) {
      audioRef.current.currentTime = snap.project.playingPosition.seconds;
    }

  }, [snap.project.playingPosition]);

  useKeyPressEvent(' ', () => {
    if(!audioRef.current) return;
    audioRef.current.currentTime = snap.project.playingPosition.seconds; 
    if(audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  });

  const updatePlayingPosition = () => {
    if(!audioRef.current) return;
    store.project.playingPosition = TemporalPosition.createWithSeconds(audioRef.current.currentTime);
  }

  useInterval(updatePlayingPosition, 50);

  if (!snap.project.music) return <></>;

  return <>
    <audio controls style={{display: "none"}} ref={audioRef} />
  </>;
}