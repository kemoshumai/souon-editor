import { useSnapshot } from "valtio";
import store from "./store/store";
import { Box, AbsoluteCenter, Text, VStack, Bleed } from "@chakra-ui/react";

export default function SplashScreen() {
  const snap = useSnapshot(store);

  const loading = !(snap.isUserSettingsLoaded && snap.isPythonEnvReady);

  console.log("loading:", loading);
  console.log("isUserSettingsLoaded:", snap.isUserSettingsLoaded);
  console.log("isPythonEnvReady:", snap.isPythonEnvReady);

  if (!loading) {
    return null; // スプラッシュスクリーンを非表示
  }

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      bg="black"
      zIndex="100000000000"
    >
      <AbsoluteCenter>
        <Bleed position={"relative"} w={"100vmin"} aspectRatio={"1.42"} >
          <Bleed
            position="absolute"
            top={0}
            left={0}
            w={"100%"}
            h={"100%"}
            bgImage={`url('SplashBackground.png')`}
            backgroundSize="contain"
            backgroundPosition="center"
            backgroundRepeat="no-repeat"
            zIndex={0}
            overflow={"hidden"}
          />
          <Bleed
            position="absolute"
            top={0}
            left={0}
            w={"100%"}
            h={"100%"}
            bgImage={`url('SOFEditorSplashLogo.png')`}
            backgroundSize="contain"
            backgroundPosition="center"
            backgroundRepeat="no-repeat"
            zIndex={0}
            overflow={"hidden"}
          />
            <VStack
            position="absolute"
            bottom={5}
            left={5}
            w={"100%"}
            h={"100%"}
            zIndex={0}
            overflow={"hidden"}
            justifyContent="flex-end"
            alignItems="flex-start"
            >
              {
                snap.splashScreenStack.map((message, index) => (
                  <Text key={index}>{message}</Text>
                ))
              }
            </VStack>
        </Bleed>
      </AbsoluteCenter>
    </Box>
  );

}