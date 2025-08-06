import { useAsync } from "react-use";
import { useSnapshot } from "valtio";
import store from "./store/store";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Bleed } from "@chakra-ui/react";

export default function Background() {
  
  const snap = useSnapshot(store);

  const backgroundImage = useAsync(async () => {
    if (snap.userSettings.background) {
      return convertFileSrc(snap.userSettings.background);
    }
    return "";
  }, [snap.userSettings.background]);

  return (
    <>
      {backgroundImage.value && (
      <Bleed
        position="fixed"
        top={0}
        left={0}
        w={"100vw"}
        h={"100vh"}
        filter="blur(8px) brightness(0.7)"
        backgroundImage={`url('${backgroundImage.value}')`}
        backgroundSize="cover"
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        zIndex={0}
        overflow={"hidden"}
      />
      )}
    </>
  );
}