import { Button, Box, Spinner, Text, Input, HStack, Textarea } from "@chakra-ui/react";
import { DialogRoot, DialogContent, DialogHeader, DialogFooter, DialogBody, DialogTitle, DialogDescription, DialogCloseTrigger } from "../../components/ui/dialog";
import { Checkbox } from "../../components/ui/checkbox";
import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { toaster } from "../../components/ui/toaster";
import { invoke } from "@tauri-apps/api/core";
import { useSnapshot } from "valtio";
import store from "../../store/store";

export interface GenerateNewChartDialogRef {
  generateNewChart: () => void;
}

const GenerateNewChartDialog = forwardRef<GenerateNewChartDialogRef>((_props, ref) => {
  const snap = useSnapshot(store);
  const [showNewChartConfirmDialog, setShowNewChartConfirmDialog] = useState(false);
  const [isNewChartGenerating, setIsNewChartGenerating] = useState(false);
  const [vramGb, setVramGb] = useState<number | null>(null);
  const [vramError, setVramError] = useState<string | null>(null);
  const [isVramLoading, setIsVramLoading] = useState(false);
  const [isOllamaInstalled, setIsOllamaInstalled] = useState<boolean | null>(null);
  const [isOllamaLoading, setIsOllamaLoading] = useState(false);
  const [keyCount, setKeyCount] = useState(12);
  const [enabledKeys, setEnabledKeys] = useState<boolean[]>(Array(12).fill(true));
  const [allowSimultaneousWhiteBlack, setAllowSimultaneousWhiteBlack] = useState(true);
  const [keyTypes, setKeyTypes] = useState<('white' | 'black')[]>([]);
  const [customInstructions, setCustomInstructions] = useState("");

  // ピアノの白鍵・黒鍵配置を生成する関数
  const generatePianoLayout = (count: number): ('white' | 'black')[] => {
    // ピアノの1オクターブパターン: C C# D D# E F F# G G# A A# B
    const pattern: ('white' | 'black')[] = ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white'];
    const layout: ('white' | 'black')[] = [];
    
    for (let i = 0; i < count; i++) {
      layout.push(pattern[i % 12]);
    }
    
    return layout;
  };

  // VRAMを取得する関数
  const checkVram = async () => {
    setIsVramLoading(true);
    setVramError(null);
    try {
      const vram = await invoke<number>("get_vram");
      setVramGb(vram);
    } catch (error) {
      setVramError(error as string);
    } finally {
      setIsVramLoading(false);
    }
  };

  // Ollamaのインストール状態を確認する関数
  const checkOllama = async () => {
    setIsOllamaLoading(true);
    try {
      const installed = await invoke<boolean>("is_ollama_installed");
      setIsOllamaInstalled(installed);
    } catch (error) {
      setIsOllamaInstalled(null);
      console.error("Ollama check error:", error);
    } finally {
      setIsOllamaLoading(false);
    }
  };

  // 鍵盤数を変更する関数
  const handleKeyCountChange = (newCount: number) => {
    // 1から24の範囲で制限
    const clampedCount = Math.max(1, Math.min(24, newCount));
    setKeyCount(clampedCount);
    // 新しい鍵盤数に合わせてenabledKeysを調整
    const newEnabledKeys = Array(clampedCount).fill(true);
    // 既存の設定を可能な限り保持
    for (let i = 0; i < Math.min(enabledKeys.length, clampedCount); i++) {
      newEnabledKeys[i] = enabledKeys[i];
    }
    setEnabledKeys(newEnabledKeys);
    
    // 白鍵・黒鍵配置を更新
    setKeyTypes(generatePianoLayout(clampedCount));
  };

  // 特定の鍵盤のタイプを切り替える関数
  const toggleKeyType = (index: number) => {
    const newKeyTypes = [...keyTypes];
    newKeyTypes[index] = newKeyTypes[index] === 'white' ? 'black' : 'white';
    setKeyTypes(newKeyTypes);
  };

  // 初期化
  useEffect(() => {
    if (keyTypes.length === 0) {
      setKeyTypes(generatePianoLayout(keyCount));
    }
  }, [keyCount, keyTypes.length, generatePianoLayout]);

  // 鍵盤数の直接入力を処理する関数
  const handleKeyCountInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value)) {
      handleKeyCountChange(value);
    }
  };

  // 特定の鍵盤のトグルを切り替える関数
  const toggleKey = (index: number) => {
    const newEnabledKeys = [...enabledKeys];
    newEnabledKeys[index] = !newEnabledKeys[index];
    setEnabledKeys(newEnabledKeys);
  };

  // ダイアログが開かれるたびにVRAMとOllamaをチェック
  useEffect(() => {
    if (showNewChartConfirmDialog) {
      checkVram();
      checkOllama();
    }
  }, [showNewChartConfirmDialog]);

  // VRAMステータスを判定する関数
  const getVramStatus = () => {
    if (vramGb === null) return { canExecute: true, color: "gray", message: "VRAM情報を取得中..." };
    
    if (vramGb <= 7) {
      return { canExecute: false, color: "red", message: `使用不可 (${vramGb.toFixed(1)}GB)` };
    } else if (vramGb < 15) {
      return { canExecute: true, color: "orange", message: `使用可能だが推奨環境未満 (${vramGb.toFixed(1)}GB)` };
    } else {
      return { canExecute: true, color: "green", message: `推奨環境 (${vramGb.toFixed(1)}GB)` };
    }
  };

  const vramStatus = getVramStatus();

  // 譜面生成を実行する関数
  const generate = async (
    keyCount: number,
    enabledKeys: boolean[],
    allowSimultaneousWhiteBlack: boolean,
    keyTypes: ('white' | 'black')[],
    customInstructions: string,
    stemNotes: {
      readonly bass: readonly { readonly pitch: number; readonly velocity: number; readonly time: number }[],
      readonly drums: readonly { readonly pitch: number; readonly velocity: number; readonly time: number }[],
      readonly other: readonly { readonly pitch: number; readonly velocity: number; readonly time: number }[],
      readonly vocals: readonly { readonly pitch: number; readonly velocity: number; readonly time: number }[],
    }
  ) => {
    console.log("譜面生成開始:", {
      keyCount,
      enabledKeys,
      allowSimultaneousWhiteBlack,
      keyTypes,
      customInstructions,
      stemNotes
    });

    try {
      
      // stemNotesを[(base|drums|other|vocals), pitch, velocity, time]の形式に変換
      const formattedStemNotes = [
        ...stemNotes.bass.map(note => ['bass', note.pitch, note.velocity, note.time]),
        ...stemNotes.drums.map(note => ['drums', note.pitch, note.velocity, note.time]),
        ...stemNotes.other.map(note => ['other', note.pitch, note.velocity, note.time]),
        ...stemNotes.vocals.map(note => ['vocals', note.pitch, note.velocity, note.time]),
      ];

      // プロジェクトのテンポ情報を取得
      const tempoEvents = snap.project.musicTempoList;
      
      // 各小節の時間範囲を計算
      interface BarInfo {
        barIndex: number;
        startTime: number; // 秒
        endTime: number;   // 秒
        tempo: number;
        beat: number;
        barDuration: number; // 1小節の長さ（秒）
      }
      
      const bars: BarInfo[] = [];
      let currentTime = 0;
      let barIndex = 0;
      
      for (const tempoEvent of tempoEvents) {
        const barDuration = (60 / tempoEvent.tempo) * tempoEvent.beat; // 1小節の秒数
        
        for (let i = 0; i < tempoEvent.length; i++) {
          bars.push({
            barIndex: barIndex,
            startTime: currentTime,
            endTime: currentTime + barDuration,
            tempo: tempoEvent.tempo,
            beat: tempoEvent.beat,
            barDuration: barDuration
          });
          currentTime += barDuration;
          barIndex++;
        }
      }
      
      // クオンタイズ関数（16分音符を最小単位とする）
      const quantizeBeatPosition = (beatPosition: number): number => {
        // 16分音符を最小単位とする（1拍を4分割）
        const quantizeUnit = 0.25; // 16分音符
        return Math.round(beatPosition / quantizeUnit) * quantizeUnit;
      };
      
      // formattedStemNotesを小節ごとに分割し、timeを小節内の拍位置に変換
      interface ProcessedNote {
        instrument: string;
        pitch: number;
        velocity: number;
        barIndex: number;
        beatPosition: number; // 小節内の拍位置（クオンタイズ済み）
        originalTime: number; // 元の時間（秒）
      }
      
      const processedNotes: ProcessedNote[] = [];
      
      for (const note of formattedStemNotes) {
        const [instrument, pitch, velocity, originalTime] = note as [string, number, number, number];
        
        // velocity が 0 のノートは除外
        if (velocity === 0) {
          continue;
        }
        
        // このノートがどの小節に属するかを検索
        const bar = bars.find(b => originalTime >= b.startTime && originalTime < b.endTime);
        
        if (bar) {
          // 小節内での経過時間を計算
          const timeInBar = originalTime - bar.startTime;
          
          // 小節内の拍位置を計算（1拍 = 60/tempo秒）
          const beatDuration = 60 / bar.tempo; // 1拍の秒数
          const rawBeatPosition = timeInBar / beatDuration;
          
          // クオンタイズを適用
          const quantizedBeatPosition = quantizeBeatPosition(rawBeatPosition);
          
          // 小節の範囲内に収める（1拍目～beat拍目）
          if (quantizedBeatPosition >= 1 && quantizedBeatPosition <= bar.beat) {
            processedNotes.push({
              instrument,
              pitch,
              velocity,
              barIndex: bar.barIndex,
              beatPosition: quantizedBeatPosition,
              originalTime
            });
          }
        }
      }
      
      // 新しいデータ構造に変換
      interface QuantizedNote {
        beat: number;
        pitch: number;
        velocity: number;
      }
      
      interface BarData {
        barIndex: number;
        notes: {
          drums: QuantizedNote[];
          bass: QuantizedNote[];
          vocals: QuantizedNote[];
          other: QuantizedNote[];
        };
      }
      
      const quantizedBarData: BarData[] = [];
      
      // 小節ごとにグループ化
      const notesByBar = new Map<number, ProcessedNote[]>();
      for (const note of processedNotes) {
        if (!notesByBar.has(note.barIndex)) {
          notesByBar.set(note.barIndex, []);
        }
        notesByBar.get(note.barIndex)!.push(note);
      }
      
      // 各小節のデータを新しい構造に変換
      for (const [barIndex, notes] of notesByBar.entries()) {
        const barData: BarData = {
          barIndex,
          notes: {
            drums: [],
            bass: [],
            vocals: [],
            other: []
          }
        };
        
        // 楽器別にノートを分類
        for (const note of notes) {
          const quantizedNote: QuantizedNote = {
            beat: note.beatPosition,
            pitch: note.pitch,
            velocity: note.velocity
          };
          
          switch (note.instrument) {
            case 'drums':
              barData.notes.drums.push(quantizedNote);
              break;
            case 'bass':
              barData.notes.bass.push(quantizedNote);
              break;
            case 'vocals':
              barData.notes.vocals.push(quantizedNote);
              break;
            case 'other':
              barData.notes.other.push(quantizedNote);
              break;
          }
        }
        
        // 各楽器のノートを拍位置でソート
        barData.notes.drums.sort((a, b) => a.beat - b.beat);
        barData.notes.bass.sort((a, b) => a.beat - b.beat);
        barData.notes.vocals.sort((a, b) => a.beat - b.beat);
        barData.notes.other.sort((a, b) => a.beat - b.beat);
        
        quantizedBarData.push(barData);
      }
      
      // 小節番号でソート
      quantizedBarData.sort((a, b) => a.barIndex - b.barIndex);
      
      // デバッグ用ログ
      console.log("テンポ情報:", tempoEvents);
      console.log("小節情報:", bars);
      console.log("処理済みノート数（velocity > 0）:", processedNotes.length);
      console.log("クオンタイズ済み小節データ:", quantizedBarData);
      
      

      toaster.create({
        title: "譜面生成完了",
        description: "新しい譜面が生成されました。",
        type: "success"
      });
    } catch (error) {
      throw error;
    }
  };
  

  const GenerateNewChart = async () => {
    setShowNewChartConfirmDialog(true);
  }

  const handleConfirmNewChartGeneration = async () => {
    setShowNewChartConfirmDialog(false);
    setIsNewChartGenerating(true);

    try {
      // snapからstemNotesを取得
      const stemNotes = snap.project.stemNotes;
      
      // generate関数を呼び出し
      await generate(
        keyCount,
        enabledKeys,
        allowSimultaneousWhiteBlack,
        keyTypes,
        customInstructions,
        stemNotes
      );
    } catch (error) {
      toaster.create({
        title: "譜面生成エラー",
        description: "譜面の生成中にエラーが発生しました。",
        type: "error"
      });
      console.error("New chart generation error:", error);
    } finally {
      setIsNewChartGenerating(false);
    }
  }

  // 外部から呼び出し可能な関数を公開
  useImperativeHandle(ref, () => ({
    generateNewChart: GenerateNewChart
  }));

  return (<>
    
    {/* 譜面自動生成確認ダイアログ */}
    <DialogRoot open={showNewChartConfirmDialog} onOpenChange={(details) => setShowNewChartConfirmDialog(details.open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>譜面自動生成の確認</DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            譜面を自動生成しますか？この処理には時間がかかります。
          </DialogDescription>
          
          {/* 重要な注意事項 */}
          <Box mt={4} p={3} border="1px solid" borderColor="blue.200" borderRadius="md" bg="blue.50">
            <Text fontSize="sm" fontWeight="bold" mb={2} color="blue.700">⚠️ 初回実行時の注意</Text>
            <Text fontSize="sm" color="blue.600">
              初回実行時には、AIモデルのダウンロードのため約5GBの空き容量が必要です。
            </Text>
          </Box>
          
          {/* VRAM情報表示 */}
          <Box mt={4} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold" mb={2}>VRAM使用量チェック</Text>
            {isVramLoading ? (
              <Box display="flex" alignItems="center" gap={2}>
                <Spinner size="sm" />
                <Text fontSize="sm">VRAM情報を取得中...</Text>
              </Box>
            ) : vramError ? (
              <Text fontSize="sm" color="orange">
                VRAM情報の取得に失敗しました。目安として使用してください。
              </Text>
            ) : (
              <Text fontSize="sm" color={vramStatus.color}>
                {vramStatus.message}
              </Text>
            )}
            
            {vramGb !== null && vramGb < 15 && (
              <Text fontSize="xs" color="gray.500" mt={1}>
                ※ 15GB未満の場合でも実行可能ですが、処理に時間がかかる可能性があります。
              </Text>
            )}
            
            {vramGb !== null && vramGb <= 7 && (
              <Text fontSize="xs" color="red.500" mt={1}>
                ※ 7GB以下の環境では実行が制限されています。
              </Text>
            )}
          </Box>

          {/* Ollama情報表示 */}
          <Box mt={3} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold" mb={2}>Ollamaインストール確認</Text>
            {isOllamaLoading ? (
              <Box display="flex" alignItems="center" gap={2}>
                <Spinner size="sm" />
                <Text fontSize="sm">Ollamaを確認中...</Text>
              </Box>
            ) : isOllamaInstalled === null ? (
              <Box>
                <Text fontSize="sm" color="orange">
                  Ollamaの確認に失敗しました。
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  ※ インストールされていない場合は実行が失敗します。
                </Text>
                <Text fontSize="xs" color="blue.600" mt={1}>
                  ℹ️ Ollamaがインストール済みの場合、タスクトレイに常駐中またはGUIで実行中か確認してください。
                </Text>
              </Box>
            ) : isOllamaInstalled ? (
              <Box>
                <Text fontSize="sm" color="green" mb={1}>
                  インストール済み
                </Text>
                <Text fontSize="xs" color="blue.600" mt={1}>
                  ℹ️ Ollamaがタスクトレイに常駐中、またはGUIで実行中である必要があります。
                </Text>
              </Box>
            ) : (
              <Box>
                <Text fontSize="sm" color="red" mb={2}>
                  Ollamaがインストールされていません
                </Text>
                <Button 
                  size="sm" 
                  variant="outline" 
                  colorScheme="blue"
                  onClick={() => window.open('https://ollama.com/download', '_blank')}
                >
                  Ollamaをダウンロード
                </Button>
                <Text fontSize="xs" color="red.500" mt={2}>
                  ※ Ollamaがインストールされていない場合、実行は失敗します。
                </Text>
                <Text fontSize="xs" color="blue.600" mt={1}>
                  ℹ️ インストール後は、タスクトレイに常駐させるかGUIで実行する必要があります。
                </Text>
              </Box>
            )}
          </Box>

          {/* 譜面生成設定 */}
          <Box mt={3} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold" mb={3}>譜面生成設定</Text>
            
            {/* 鍵盤数設定 */}
            <Box mb={4}>
              <Text fontSize="sm" mb={2}>鍵盤数</Text>
              
              {/* プリセットボタン */}
              <HStack mb={2} gap={2}>
                {[4, 6, 7, 8, 12].map((presetCount) => (
                  <Button
                    key={presetCount}
                    size="sm"
                    variant={keyCount === presetCount ? "solid" : "outline"}
                    colorScheme={keyCount === presetCount ? "blue" : "gray"}
                    onClick={() => handleKeyCountChange(presetCount)}
                    minW="50px"
                  >
                    {presetCount}K
                  </Button>
                ))}
              </HStack>
              
              {/* カスタム数値入力 */}
              <HStack gap={2} alignItems="center">
                <Text fontSize="xs" color="gray.600">カスタム:</Text>
                <Input
                  type="number"
                  value={keyCount}
                  onChange={handleKeyCountInputChange}
                  min={1}
                  max={24}
                  size="sm"
                  width="80px"
                />
                <Text fontSize="xs" color="gray.500">鍵 (1-24)</Text>
              </HStack>
            </Box>

            {/* 鍵盤別ノーツ配置設定 */}
            <Box mb={4}>
              <Text fontSize="sm" mb={2}>ノーツ配置許可 (鍵盤別)</Text>
              <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(40px, 1fr))" gap={2} maxW="100%">
                {enabledKeys.map((enabled, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={enabled ? "solid" : "outline"}
                    colorScheme={enabled ? "blue" : "gray"}
                    onClick={() => toggleKey(index)}
                    minW="40px"
                    h="40px"
                  >
                    {index + 1}
                  </Button>
                ))}
              </Box>
              <Text fontSize="xs" color="gray.500" mt={2}>
                青色: ノーツ配置許可、グレー: ノーツ配置禁止
              </Text>
              <Text fontSize="xs" color="blue.600" mt={1}>
                現在の設定: {keyCount}鍵 ({enabledKeys.filter(Boolean).length}鍵にノーツ配置許可)
              </Text>
            </Box>

            {/* 白鍵・黒鍵設定 */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={3}>白鍵・黒鍵設定</Text>
              
              {/* 同時押し許可設定 */}
              <Box mb={4}>
                <Checkbox
                  checked={allowSimultaneousWhiteBlack}
                  onCheckedChange={(details) => setAllowSimultaneousWhiteBlack(details.checked === true)}
                >
                  <Text fontSize="sm">白鍵と黒鍵の同時押しを許可する</Text>
                </Checkbox>
              </Box>

              {/* 鍵盤タイプ設定 */}
              <Box>
                <Text fontSize="sm" mb={2}>鍵盤タイプ (クリックで白鍵↔黒鍵切り替え)</Text>
                <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(40px, 1fr))" gap={2} maxW="100%">
                  {keyTypes.map((keyType, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="solid"
                      colorScheme={keyType === 'white' ? "gray" : "blackAlpha"}
                      bg={keyType === 'white' ? "white" : "gray.800"}
                      color={keyType === 'white' ? "black" : "white"}
                      border="1px solid"
                      borderColor={keyType === 'white' ? "gray.300" : "gray.600"}
                      onClick={() => toggleKeyType(index)}
                      minW="40px"
                      h="40px"
                      _hover={{
                        bg: keyType === 'white' ? "gray.100" : "gray.700"
                      }}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </Box>
                <Text fontSize="xs" color="gray.500" mt={2}>
                  白色: 白鍵、黒色: 黒鍵 (ピアノ配置がデフォルト)
                </Text>
              </Box>
            </Box>

            {/* 自由記述欄 */}
            <Box mt={3} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" mb={2}>譜面生成への追加指示</Text>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="譜面生成に関する詳細な指示や要望を自由に記述してください...&#10;例：&#10;・曲の序盤は簡単で徐々に難しくしてほしい&#10;・白鍵を多めに使ってほしい&#10;・連打は控えめにしてほしい&#10;・メロディーに合わせた配置にしてほしい"
                rows={6}
                resize="vertical"
                fontSize="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={2}>
                ここに記述した内容はAIによる譜面生成の参考にされます。
              </Text>
            </Box>
          </Box>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewChartConfirmDialog(false)}>
            キャンセル
          </Button>
          <Button 
            onClick={handleConfirmNewChartGeneration}
            disabled={vramGb !== null && vramGb <= 7}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>

    {/* 譜面自動生成画面 */}
    <DialogRoot open={isNewChartGenerating} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>譜面を自動生成中</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Box display="flex" alignItems="center" gap={4}>
            <Spinner size="lg" />
            <Text>譜面を自動生成しています。緑茶でも飲んでてください...</Text>
          </Box>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  </>)
});

GenerateNewChartDialog.displayName = "GenerateNewChartDialog";

export default GenerateNewChartDialog;