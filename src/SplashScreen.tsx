import { useSnapshot } from "valtio";
import store from "./store/store";
import { Box, AbsoluteCenter, Text, VStack, Bleed, Spinner, Show } from "@chakra-ui/react";
import { useState, useEffect } from "react";

export default function SplashScreen() {
  const snap = useSnapshot(store);
  const [shouldShow, setShouldShow] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [loadingSpinner, setLoadingSpinner] = useState(false);

  const loading = !(snap.isUserSettingsLoaded && snap.isPythonEnvReady);

  useEffect(() => {
    if (!loading && shouldShow) {
      const timer = setTimeout(() => {
        setIsVisible(false); // フェードアウト開始
        setTimeout(() => {
          setShouldShow(false); // フェードアウト完了後に非表示
        }, 500); // フェードアウトの持続時間
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading, shouldShow]);

  // 5秒まではスピナーを非表示。5秒後に表示。
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingSpinner(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  console.log("loading:", loading);
  console.log("isUserSettingsLoaded:", snap.isUserSettingsLoaded);
  console.log("isPythonEnvReady:", snap.isPythonEnvReady);

  if (!shouldShow) {
    return null; // スプラッシュスクリーンを非表示
  }

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      bg="blackAlpha.700"
      zIndex="100000000000"
      opacity={isVisible ? 1 : 0}
      transition="opacity 0.5s ease-out"
    >
      <AbsoluteCenter>
        <Bleed position={"relative"} w={"100vmin"} aspectRatio={"1.42"} bgColor={"transparent"}>
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
              <Show when={loadingSpinner} >
                <Box display="flex" alignItems="center" gap={4}>
                  <Spinner size="lg" />
                  <Text fontWeight={"bold"}>時間がかかりそうです。コーヒーでも飲んで待っててください...</Text>
                </Box>
              </Show>
            </VStack>
        </Bleed>
      </AbsoluteCenter>
    </Box>
  );

}