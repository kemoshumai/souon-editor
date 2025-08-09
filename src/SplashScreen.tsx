import { useSnapshot } from "valtio";
import store from "./store/store";
import { Box, AbsoluteCenter, Text, VStack } from "@chakra-ui/react";

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
      zIndex="100000000000" // 必要に応じて調整
    >
      <AbsoluteCenter>
        <VStack>
          <Text>Loading...</Text>
          <Text>アプリケーションを起動しています。</Text>
          {!snap.isUserSettingsLoaded && <Text>ユーザー設定をロード中...</Text>}
          {!snap.isPythonEnvReady && <Text>Python環境をセットアップ中...</Text>}
          {
            snap.splashScreenStack.map((message, index) => (
              <Text key={index}>{message}</Text>
            ))
          }
        </VStack>
      </AbsoluteCenter>
    </Box>
  );

}