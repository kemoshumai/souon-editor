import { useSnapshot } from "valtio";
import store from "./store/store";
import { useEffect, useRef } from "react";
import { useInterval, useKeyPressEvent } from "react-use";
import TemporalPosition from "./store/temporalPosition";
import Stem from "./AudioSystem/Stem";

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

    if(audioRef.current.paused) {
      audioRef.current.currentTime = snap.project.playingPosition.seconds;
    }

  }, [snap.project.playingPosition]);

  useEffect(() => {
    if(!audioRef.current) return;
    if(snap.playing) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [snap.playing]);

  useKeyPressEvent(' ', () => {
    if(!audioRef.current) return;
    audioRef.current.currentTime = snap.project.playingPosition.seconds; 
    store.playing = !snap.playing;
  });

  const updatePlayingPosition = () => {
    if(!audioRef.current) return;
    if(snap.project.playingPosition.seconds === audioRef.current.currentTime) return;
    store.project.playingPosition = TemporalPosition.createWithSeconds(audioRef.current.currentTime);
  }

  useInterval(updatePlayingPosition, 50);

  useEffect(() => {

    if (!audioRef.current) return;

    // 全部がfalseの時だけメインの音量を1にする
    audioRef.current.volume = !snap.enabledStems.bass && !snap.enabledStems.drums && !snap.enabledStems.other && !snap.enabledStems.vocals ? 1 : 0;

  }, [snap.project.music, snap.enabledStems.bass, snap.enabledStems.drums, snap.enabledStems.other, snap.enabledStems.vocals]);

  if (!snap.project.music) return <></>;

  return <>
    <audio controls style={{display: "none"}} ref={audioRef} />

    {/* 以下stems */}
    <Stem audioSrc={snap.project.stems.bass} audioRef={audioRef} volume={snap.enabledStems.bass ? 1 : 0} />
    <Stem audioSrc={snap.project.stems.drums} audioRef={audioRef} volume={snap.enabledStems.drums ? 1 : 0} />
    <Stem audioSrc={snap.project.stems.other} audioRef={audioRef} volume={snap.enabledStems.other ? 1 : 0} />
    <Stem audioSrc={snap.project.stems.vocals} audioRef={audioRef} volume={snap.enabledStems.vocals ? 1 : 0} />
  </>;
}