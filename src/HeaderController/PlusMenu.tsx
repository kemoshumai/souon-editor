import { Button, MenuContent, MenuItem, MenuRoot, MenuSelectionDetails, MenuTrigger, Text, Box, Spinner } from "@chakra-ui/react";
import { MdAddChart, MdAutoFixHigh, MdMusicNote, MdSpeed } from "react-icons/md";
import { PiPlus } from "react-icons/pi";
import { open } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import * as path from '@tauri-apps/api/path';
import store from "../store/store";
import Chart from "../store/chart";
import { toaster } from "../components/ui/toaster";
import { convertFileSrc } from "@tauri-apps/api/core";
import TempoEvent from "../store/tempoEvent";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { DialogRoot, DialogContent, DialogHeader, DialogFooter, DialogBody, DialogTitle, DialogDescription, DialogCloseTrigger } from "../components/ui/dialog";

enum PlusMenuSelection {
  SetMusicFile = "set_music_file",
  AddChart = "add_chart",
  AddTempo = "add_tempo",
  GenerateStems = "generate_stems",
}

export default function PlusMenu() {
  const [showStemConfirmDialog, setShowStemConfirmDialog] = useState(false);
  const [isStemGenerating, setIsStemGenerating] = useState(false);

  const AddChart = () => {
    const chart = new Chart(crypto.randomUUID(), [], 12, "新しい譜面");
    store.project.charts.push(chart);

  };

  const SetMusic = async () => {
    const file = await open({
      multiple: false,
      filters: [
        {
          name: "音楽ファイル",
          extensions: ["mp3", "wav", "ogg", "flac"]
        }
      ]
    });

    if (file) {

      const musicUuid = crypto.randomUUID();
      const ext = file.toString().split('.').pop()!;

      const copyTo = await path.join(await path.appLocalDataDir(), musicUuid+"."+ext);
      await copyFile(file.toString(), copyTo);

      const assetUrl = await convertFileSrc(copyTo);

      store.project.music = assetUrl;
      
      toaster.create({ title: "音楽ファイルを読み込みました。", description: file, type: "info" });
    }
  }

  const AddTempo = () => {
    const tempoEvent = TempoEvent.createWithRandomUUID(120, 4, 100);
    store.project.musicTempoList.push(tempoEvent);
  }

  const GenerateStems = async () => {
    setShowStemConfirmDialog(true);
  }

  const handleConfirmStemGeneration = async () => {
    setShowStemConfirmDialog(false);
    setIsStemGenerating(true);

    try {
      const [base64, mimeType] = await store.project.getMusicBase64();

      const result: string = await invoke("demucs", {
        inputBase64: base64,
        mimeType: mimeType,
      });

      const stems = result.split("\n").map((s: string) => "data:audio/ogg;base64," + s);
      store.project.stems.bass = stems[0];
      store.project.stems.drums = stems[1];
      store.project.stems.other = stems[2];
      store.project.stems.vocals = stems[3];

      toaster.create({ 
        title: "ステム生成完了", 
        description: "ステムの生成が正常に完了しました。", 
        type: "success" 
      });
    } catch (error) {
      toaster.create({ 
        title: "ステム生成エラー", 
        description: "ステムの生成中にエラーが発生しました。", 
        type: "error" 
      });
      console.error("Stem generation error:", error);
    } finally {
      setIsStemGenerating(false);
    }
  }

  const onSelect = (d: MenuSelectionDetails) => {
    const value = d.value;

    switch (value) {
      case PlusMenuSelection.SetMusicFile:
        SetMusic();
        break;
      case PlusMenuSelection.AddChart:
        AddChart();
        break;
      case PlusMenuSelection.AddTempo:
        AddTempo();
        break;
      case PlusMenuSelection.GenerateStems:
        GenerateStems();
        break;
    }
  }

  return (<>
    <MenuRoot onSelect={onSelect} >
      <MenuTrigger as={Button} w="10" h="10"><PiPlus /></MenuTrigger>
      <MenuContent position={"absolute"} zIndex={100} top={10}>
        <MenuItem value={PlusMenuSelection.SetMusicFile}><MdMusicNote />音楽ファイル読み込み</MenuItem>
        <MenuItem value={PlusMenuSelection.AddChart}><MdAddChart />譜面追加</MenuItem>
        <MenuItem value={PlusMenuSelection.AddTempo}><MdSpeed />テンポ情報追加</MenuItem>
        <MenuItem value={PlusMenuSelection.GenerateStems}><MdAutoFixHigh />ステムを生成する</MenuItem>
      </MenuContent>
    </MenuRoot>

    {/* ステム生成確認ダイアログ */}
    <DialogRoot open={showStemConfirmDialog} onOpenChange={(details) => setShowStemConfirmDialog(details.open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ステム生成の確認</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            ステムを生成しますか？この処理には時間がかかる場合があります。
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowStemConfirmDialog(false)}>
            キャンセル
          </Button>
          <Button onClick={handleConfirmStemGeneration}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>

    {/* ステム生成中画面 */}
    <DialogRoot open={isStemGenerating} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ステムを作成中</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Box display="flex" alignItems="center" gap={4}>
            <Spinner size="lg" />
            <Text>ステムを作成しています。コーヒーでも飲んでてください...</Text>
          </Box>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  </>);
}