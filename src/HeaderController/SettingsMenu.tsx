import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger, Box, Text, Input, HStack } from "@chakra-ui/react";
import { DialogRoot, DialogContent, DialogHeader, DialogFooter, DialogBody, DialogTitle } from "../components/ui/dialog";
import { open } from "@tauri-apps/plugin-dialog";
import { MdMusicNote } from "react-icons/md";
import { PiGear } from "react-icons/pi";
import * as path from '@tauri-apps/api/path';
import { copyFile } from "@tauri-apps/plugin-fs";
import store from "../store/store";
import { toaster } from "../components/ui/toaster";
import { useSnapshot } from "valtio";
import { useState } from "react";

enum PlusMenuSelection {
  SetBackground = "set_background",
  SetBackgroundBlur = "set_background_blur",
  ResetBackground = "reset_background",
  ToggleMoca = "toggle_moca",
  ConfigureAi = "configure_ai",
}

export default function SettingsMenu() {
  const snap = useSnapshot(store);
  const [showAiConfigDialog, setShowAiConfigDialog] = useState(false);
  const [tempGoogleApiKey, setTempGoogleApiKey] = useState("");

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    const SetBackground = async () => {
      const file = await open({
        multiple: false,
        filters: [
          {
            name: "画像ファイル",
            extensions: ["png", "jpg", "jpeg", "gif"]
          }
        ]
      });

      if (file) {
        const backgroundUuid = crypto.randomUUID();
        const ext = file.toString().split('.').pop()!;

        const copyTo = await path.join(await path.appLocalDataDir(), backgroundUuid+"."+ext);
        await copyFile(file.toString(), copyTo);

        console.log("背景画像のパス: ", copyTo);

        store.userSettings.background = copyTo;

        await store.userSettings.save();

        toaster.create({ title: "背景画像を設定しました。", description: file, type: "info" });
      }
    }

    const SetBackgroundBlur = async () => {
      store.userSettings.backgroundBlur = !store.userSettings.backgroundBlur;
      await store.userSettings.save();
      toaster.create({
        title: "背景のぼかし設定を変更しました",
        description: `背景のぼかしは${store.userSettings.backgroundBlur ? "有効" : "無効"}です`,
        type: "info"
      });
    }

    const ResetBackground = async () => {
      store.userSettings.background = "";
      store.userSettings.backgroundBlur = false;
      await store.userSettings.save();
      toaster.create({
        title: "背景設定をリセットしました",
        description: "背景画像とぼかし設定を初期化しました",
        type: "info"
      });
    }

    const ConfigureAi = () => {
      setTempGoogleApiKey(snap.userSettings.googleAiApiKey || "");
      setShowAiConfigDialog(true);
    }

    switch (value) {
      case PlusMenuSelection.SetBackground:
        SetBackground();
        break;

      case PlusMenuSelection.SetBackgroundBlur:
        SetBackgroundBlur();
        break;

      case PlusMenuSelection.ResetBackground:
        ResetBackground();
        break;

      case PlusMenuSelection.ToggleMoca:
        store.moca = !store.moca;
        break;

      case PlusMenuSelection.ConfigureAi:
        ConfigureAi();
        break;
    }
  }

  const saveAiSettings = async () => {
    store.userSettings.setGoogleAiApiKey(tempGoogleApiKey);
    await store.userSettings.save();
    setShowAiConfigDialog(false);
    toaster.create({ 
      title: "AI設定を保存しました", 
      type: "success" 
    });
  };

  return (<>
    <MenuRoot onSelect={onSelect} >
      <MenuTrigger as={Button} w="10" h="10"><PiGear /></MenuTrigger>
      <MenuContent position={"absolute"} zIndex={100} top={10} >
        <MenuItem value={PlusMenuSelection.SetBackground}><MdMusicNote />背景画像設定</MenuItem>
        <MenuItem value={PlusMenuSelection.SetBackgroundBlur}>背景のぼかし設定</MenuItem>
        <MenuItem value={PlusMenuSelection.ResetBackground}>背景設定をリセット</MenuItem>
        <MenuItem value={PlusMenuSelection.ToggleMoca}>宮舞を{snap.moca ? "消す" : "呼ぶ"}</MenuItem>
        <MenuItem value={PlusMenuSelection.ConfigureAi}>AI設定</MenuItem>
      </MenuContent>
    </MenuRoot>

    {/* AI設定ダイアログ */}
    <DialogRoot open={showAiConfigDialog} onOpenChange={() => setShowAiConfigDialog(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI設定</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Box mb={4}>
            <Text fontSize="sm" fontWeight="bold" mb={2}>AIプロバイダー</Text>
            <HStack gap={2}>
              <Button
                size="sm"
                variant={(snap.userSettings.aiProvider || 'ollama') === 'ollama' ? "solid" : "outline"}
                colorScheme={(snap.userSettings.aiProvider || 'ollama') === 'ollama' ? "blue" : "gray"}
                onClick={() => {
                  store.userSettings.setAiProvider('ollama');
                  store.userSettings.save();
                }}
              >
                Ollama (ローカル)
              </Button>
              <Button
                size="sm"
                variant={(snap.userSettings.aiProvider || 'ollama') === 'google-ai-studio' ? "solid" : "outline"}
                colorScheme={(snap.userSettings.aiProvider || 'ollama') === 'google-ai-studio' ? "blue" : "gray"}
                onClick={() => {
                  store.userSettings.setAiProvider('google-ai-studio');
                  store.userSettings.save();
                }}
              >
                Google AI Studio
              </Button>
            </HStack>
          </Box>

          {/* Google AI Studio設定 */}
          {(snap.userSettings.aiProvider || 'ollama') === 'google-ai-studio' && (
            <Box mb={4}>
              <Text fontSize="sm" fontWeight="bold" mb={2}>Google AI Studio APIキー</Text>
              <Input
                type="password"
                placeholder="Google AI Studio APIキーを入力"
                value={tempGoogleApiKey}
                onChange={(e) => setTempGoogleApiKey(e.target.value)}
                size="sm"
              />
              <Text fontSize="xs" color="gray.600" mt={1}>
                Google AI StudioでAPIキーを取得してください
              </Text>
            </Box>
          )}

          {/* Ollama情報 */}
          {(snap.userSettings.aiProvider || 'ollama') === 'ollama' && (
            <Box mb={4} p={3} border="1px solid" borderColor="blue.200" borderRadius="md" bg="blue.50">
              <Text fontSize="sm" fontWeight="bold" mb={2}>Ollama設定</Text>
              <Text fontSize="xs" color="blue.600">
                Ollamaをローカルにインストールして実行する必要があります。<br/>
                初回実行時には約5GBのモデルダウンロードが必要です。
              </Text>
            </Box>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAiConfigDialog(false)}>
            キャンセル
          </Button>
          <Button onClick={saveAiSettings}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  </>);
}