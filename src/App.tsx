import { Flex, HStack, Theme } from '@chakra-ui/react';
import HeaderController from './HeaderController';
import SequentialEditor from './SequentialEditor';
import { Toaster } from './components/ui/toaster';
import AudioSystem from './AudioSystem';
import { useEffect } from 'react';
import SaveSystem from './SaveSystem';
import SplashScreen from './SplashScreen';
import PythonEnv from './PythonEnv';
import Moca from './Moca';
import store from './store/store';
import { invoke } from '@tauri-apps/api/core';
import { useAsync } from 'react-use';
import { useSnapshot } from 'valtio';

function App() {

  const snap = useSnapshot(store);

  // スペースキーでのスクロールを無効化
  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
      }
    });

    return () => {
      window.removeEventListener("keydown", () => {});
    }
  });

  // ファイル関連付けで開かれた場合の処理
  useAsync(async () => {

    const loading = !(snap.isUserSettingsLoaded && snap.isPythonEnvReady);

    if (loading) return;
    if (!store.project) return;

    const filepath = await invoke<string | null>('get_preserved_opened_file');
    if (filepath) {
      store.project.loadFromFilePath(filepath);
    }
  }, [store.project, snap.isUserSettingsLoaded, snap.isPythonEnvReady]);

  return (<>
    <Theme appearance='dark'>
      <Toaster />
      <AudioSystem />
      <SaveSystem />
      <Flex h={"100vh"} w={"100vw"} direction={"column"} >
        <HStack w={"100vw"}>
          <HeaderController />
        </HStack>
        <SequentialEditor />
      </Flex>
      <PythonEnv />
      <SplashScreen />
      <Moca />
    </Theme>
  </>);
}

export default App;
