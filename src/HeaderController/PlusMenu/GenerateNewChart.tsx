import { Button, Box, Spinner, Text, Input, HStack, Textarea } from "@chakra-ui/react";
import { DialogRoot, DialogContent, DialogHeader, DialogFooter, DialogBody, DialogTitle, DialogDescription, DialogCloseTrigger } from "../../components/ui/dialog";
import { Checkbox } from "../../components/ui/checkbox";
import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { toaster } from "../../components/ui/toaster";
import { invoke } from "@tauri-apps/api/core";
import { useSnapshot } from "valtio";
import store from "../../store/store";
import Chart from "../../store/chart";
import ChartEvent from "../../store/chartEvent";
import { SingleNoteEvent } from "../../store/noteEvent";
import Lane from "../../store/lane";
import TemporalPosition from "../../store/temporalPosition";

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
  const [selectedModel, setSelectedModel] = useState("phi4:14b");
  const [customModel, setCustomModel] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [barsPerBatch, setBarsPerBatch] = useState(1);
  const [googleAiApiKey, setGoogleAiApiKey] = useState("");
  
  // 利用可能なOllamaモデルのリスト
  const availableOllamaModels = [
    { value: "phi4:14b", label: "Phi-4 14B (推奨)", description: "バランスの良い高性能モデル" },
    { value: "llama3.2:3b", label: "Llama 3.2 3B", description: "軽量で高速" },
    { value: "llama3.2:1b", label: "Llama 3.2 1B", description: "最軽量" },
    { value: "qwen2.5:7b", label: "Qwen 2.5 7B", description: "中程度の性能" },
    { value: "codellama:7b", label: "CodeLlama 7B", description: "コード生成特化" },
    { value: "mistral:7b", label: "Mistral 7B", description: "汎用モデル" },
  ];

  // 利用可能なGoogle AI Studioモデルのリスト
  const availableGoogleModels = [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (推奨)", description: "ほぼ人間" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "バランスの良い高性能モデル" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", description: "まぁ、うん、軽いけど..." },
  ];

  // 実際に使用するモデル名を取得する関数
  const getActualModelName = () => {
    if (snap.userSettings.aiProvider === 'google-ai-studio') {
      return selectedModel; // Google AI Studioの場合はそのまま
    } else {
      return useCustomModel && customModel.trim() ? customModel.trim() : selectedModel;
    }
  };
  
  // プログレス関連のstate
  const [currentBar, setCurrentBar] = useState(0);
  const [totalBars, setTotalBars] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

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
    // ユーザー設定からAPIキーを読み込む
    setGoogleAiApiKey(snap.userSettings.googleAiApiKey || "");
    
    // 初期モデル選択を設定
    if (snap.userSettings.aiProvider === 'google-ai-studio') {
      setSelectedModel("gemini-2.0-flash-exp");
    } else {
      setSelectedModel("phi4:14b");
    }
  }, [snap.userSettings.aiProvider, snap.userSettings.googleAiApiKey]);

  // 鍵盤タイプの初期化
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

  // ダイアログが開かれるたびにVRAMとOllamaをチェック（Ollamaタブのみ）
  useEffect(() => {
    if (showNewChartConfirmDialog && (snap.userSettings.aiProvider || 'ollama') === 'ollama') {
      checkVram();
      checkOllama();
    }
  }, [showNewChartConfirmDialog, snap.userSettings.aiProvider]);

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
      
      // サンプル表示（最初の3小節）
      console.log("サンプル小節データ（最初の3小節）:", 
        quantizedBarData.slice(0, 3).map(bar => ({
          barIndex: bar.barIndex,
          totalNotes: Object.values(bar.notes).reduce((sum, notes) => sum + notes.length, 0),
          notesByInstrument: {
            drums: bar.notes.drums.length,
            bass: bar.notes.bass.length,
            vocals: bar.notes.vocals.length,
            other: bar.notes.other.length
          }
        }))
      );
      
      // LLMプロンプトを作成する関数（単一小節）
      const createPromptForBar = (
        barData: BarData, 
        barInfo: BarInfo,
        keyCount: number,
        enabledKeys: boolean[],
        allowSimultaneousWhiteBlack: boolean,
        keyTypes: ('white' | 'black')[],
        customInstructions: string
      ): string => {
        // 有効な鍵盤の情報を作成
        const enabledKeyInfo = enabledKeys
          .map((enabled, index) => enabled ? `Key${index + 1}(${keyTypes[index]})` : null)
          .filter(Boolean)
          .join(', ');
        
        const stemNotesText = JSON.stringify(barData.notes, null, 2);
        
        return `You are a professional rhythm game chart designer. Create a chart for bar ${barData.barIndex + 1}.

CONFIGURATION:
- Total keys: ${keyCount}
- Available keys: ${enabledKeyInfo}
- White/Black key simultaneous press: ${allowSimultaneousWhiteBlack ? 'Allowed' : 'Not allowed'}
- Time signature: ${barInfo.beat}/4
- Tempo: ${barInfo.tempo} BPM

STEM AUDIO DATA:
${stemNotesText}

RULES:
1. Output ONLY a valid JSON array of notes in this exact format:
   [{"key": 1, "beat": 1.0}, {"key": 3, "beat": 1.5}]
2. Key numbers range from 1 to ${keyCount}
3. Beat positions must be quantized to 16th notes (0.25 increments): 1.0, 1.25, 1.5, 1.75, 2.0, etc.
4. Beat positions must be within 1.0 to ${barInfo.beat}.0
5. Only use enabled keys: ${enabledKeys.map((enabled, i) => enabled ? i + 1 : null).filter(Boolean).join(', ')}
${!allowSimultaneousWhiteBlack ? `6. Do not place white and black keys simultaneously at the same beat position` : ''}
7. Multiple notes can have the same beat position if they use different keys
8. Ensure all JSON syntax is correct (proper commas, brackets, quotes)

DESIGN PHILOSOPHY:
- Follow the rhythm and intensity of the stem audio data
- Place notes where drums, bass, vocals, or other instruments have strong beats
- Create engaging patterns that match the musical flow
- Balance difficulty appropriately

${customInstructions ? `CUSTOM INSTRUCTIONS:
${customInstructions}` : ''}

IMPORTANT: Output ONLY the JSON array, no markdown formatting, no code blocks, no other text:`;
      };

      // LLMプロンプトを作成する関数（複数小節バッチ）
      const createPromptForBarBatch = (
        barDataList: BarData[],
        barInfoList: BarInfo[],
        keyCount: number,
        enabledKeys: boolean[],
        allowSimultaneousWhiteBlack: boolean,
        keyTypes: ('white' | 'black')[],
        customInstructions: string
      ): string => {
        // 有効な鍵盤の情報を作成
        const enabledKeyInfo = enabledKeys
          .map((enabled, index) => enabled ? `Key${index + 1}(${keyTypes[index]})` : null)
          .filter(Boolean)
          .join(', ');
        
        const barsText = barDataList.map((barData, index) => {
          const barInfo = barInfoList[index];
          const stemNotesText = JSON.stringify(barData.notes, null, 2);
          return `Bar ${barData.barIndex + 1} (${barInfo.beat}/4, ${barInfo.tempo} BPM):\n${stemNotesText}`;
        }).join('\n\n');
        
        const barNumbers = barDataList.map(b => b.barIndex + 1).join(', ');
        
        return `You are a professional rhythm game chart designer. Create charts for bars ${barNumbers}.

CONFIGURATION:
- Total keys: ${keyCount}
- Available keys: ${enabledKeyInfo}
- White/Black key simultaneous press: ${allowSimultaneousWhiteBlack ? 'Allowed' : 'Not allowed'}

STEM AUDIO DATA:
${barsText}

RULES:
1. Output ONLY a valid JSON object with bar numbers as keys, each containing an array of notes.
2. Format: {"1": [{"key": 1, "beat": 1.0}, {"key": 3, "beat": 1.5}], "2": [{"key": 2, "beat": 1.0}]}
3. Key numbers range from 1 to ${keyCount}
4. Beat positions must be quantized to 16th notes (0.25 increments): 1.0, 1.25, 1.5, 1.75, 2.0, etc.
5. Beat positions must be within 1.0 to the respective bar's beat count
6. Only use enabled keys: ${enabledKeys.map((enabled, i) => enabled ? i + 1 : null).filter(Boolean).join(', ')}
${!allowSimultaneousWhiteBlack ? `7. Do not place white and black keys simultaneously at the same beat position` : ''}
8. Multiple notes can have the same beat position if they use different keys
9. Ensure all JSON syntax is correct (proper commas, brackets, quotes)

DESIGN PHILOSOPHY:
- Follow the rhythm and intensity of the stem audio data
- Place notes where drums, bass, vocals, or other instruments have strong beats
- Create engaging patterns that match the musical flow
- Balance difficulty appropriately
- Consider musical continuity between bars

${customInstructions ? `CUSTOM INSTRUCTIONS:
${customInstructions}` : ''}

IMPORTANT: Output ONLY the JSON object, no markdown formatting, no code blocks, no other text:`;
      };
      
      // LLMからの出力をパースする関数
      const parseAIResponse = (response: string): { key: number; beat: number }[] => {
        try {
          // Markdownのコードブロックを除去
          let cleanedResponse = response;
          
          // ```json と ``` を削除
          cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
          cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
          
          // レスポンスからJSONを抽出
          const jsonMatch = cleanedResponse.match(/\[[\s\S]*?\]/);
          if (!jsonMatch) {
            console.warn("No JSON array found in AI response:", response);
            return [];
          }
          
          console.log("Attempting to parse JSON:", jsonMatch[0]);
          const parsed = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(parsed)) {
            console.warn("AI response is not an array:", parsed);
            return [];
          }
          
          // バリデーション
          const validNotes = parsed.filter(note => {
            if (typeof note.key !== 'number' || typeof note.beat !== 'number') {
              console.warn("Invalid note format:", note);
              return false;
            }
            if (note.key < 1 || note.key > keyCount) {
              console.warn("Invalid key number:", note.key);
              return false;
            }
            if (!enabledKeys[note.key - 1]) {
              console.warn("Key not enabled:", note.key);
              return false;
            }
            return true;
          });
          
          console.log(`Parsed ${validNotes.length} valid notes from ${parsed.length} total notes`);
          return validNotes;
        } catch (error) {
          console.error("Failed to parse AI response:", error);
          console.error("Original response:", response);
          return [];
        }
      };
      
      // バッチ応答のパース関数
      const parseAIBatchResponse = (response: string, barDataList: BarData[]): Map<number, { key: number; beat: number }[]> => {
        const result = new Map<number, { key: number; beat: number }[]>();
        
        try {
          // Markdownのコードブロックを除去
          let cleanedResponse = response.trim();
          
          // ```json と ``` を削除
          cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
          cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
          cleanedResponse = cleanedResponse.trim();
          
          console.log("Cleaned response for parsing:", cleanedResponse);
          
          // レスポンスからJSONを抽出（ネストしたオブジェクト対応）
          let jsonString = '';
          
          // まず、完全なJSONオブジェクトを見つけるために括弧をカウント
          const startIndex = cleanedResponse.indexOf('{');
          if (startIndex === -1) {
            console.error("No JSON object found in AI response:", response);
            return result;
          }
          
          let braceCount = 0;
          let endIndex = -1;
          
          for (let i = startIndex; i < cleanedResponse.length; i++) {
            const char = cleanedResponse[i];
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i;
                break;
              }
            }
          }
          
          if (endIndex === -1) {
            console.error("Incomplete JSON object in AI response:", response);
            return result;
          }
          
          jsonString = cleanedResponse.substring(startIndex, endIndex + 1);
          console.log("Extracted JSON string:", jsonString);
          
          // JSON文字列を段階的にクリーンアップ
          // 不正な文字を除去
          jsonString = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          
          // 末尾のカンマを除去
          jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
          
          console.log("Attempting to parse cleaned JSON:", jsonString);
          
          const parsed = JSON.parse(jsonString);
          if (typeof parsed !== 'object' || parsed === null) {
            console.warn("AI response is not an object:", parsed);
            return result;
          }
          
          console.log("Successfully parsed JSON:", parsed);
          console.log("Available keys in parsed JSON:", Object.keys(parsed));
          
          // 各小節のデータを処理
          for (const barData of barDataList) {
            const barKey = (barData.barIndex + 1).toString();
            console.log(`Looking for bar key: "${barKey}" in parsed data`);
            const barNotes = parsed[barKey];
            
            if (!Array.isArray(barNotes)) {
              console.warn(`No notes found for bar ${barData.barIndex + 1}, found:`, barNotes);
              console.warn(`Available keys:`, Object.keys(parsed));
              result.set(barData.barIndex, []);
              continue;
            }
            
            console.log(`Processing ${barNotes.length} notes for bar ${barData.barIndex + 1}:`, barNotes);
            
            // バリデーション
            const validNotes = barNotes.filter((note, index) => {
              if (typeof note !== 'object' || note === null) {
                console.warn(`Note ${index} is not an object:`, note);
                return false;
              }
              if (typeof note.key !== 'number' || typeof note.beat !== 'number') {
                console.warn(`Invalid note format at index ${index}:`, note);
                return false;
              }
              if (note.key < 1 || note.key > keyCount) {
                console.warn(`Invalid key number at index ${index}:`, note.key);
                return false;
              }
              if (!enabledKeys[note.key - 1]) {
                console.warn(`Key not enabled at index ${index}:`, note.key);
                return false;
              }
              return true;
            });
            
            result.set(barData.barIndex, validNotes);
            console.log(`Parsed ${validNotes.length} valid notes for bar ${barData.barIndex + 1}`);
          }
          
          return result;
        } catch (error) {
          console.error("Failed to parse AI batch response:", error);
          console.error("Original response:", response);
          
          // フォールバック：各小節を個別に空配列として設定
          for (const barData of barDataList) {
            result.set(barData.barIndex, []);
          }
          
          return result;
        }
      };
      
      // 譜面ノート（最終的な結果）
      interface ChartNote {
        key: number;
        time: number; // 秒単位の時間
        barIndex: number;
        beat: number;
      }
      
      const finalChartNotes: ChartNote[] = [];
      
      // 小節をバッチで処理
      let processedBars = 0;
      const totalBarsCount = quantizedBarData.length;
      
      // プログレス初期化
      setTotalBars(totalBarsCount);
      setCurrentBar(0);
      setProgressMessage("譜面生成を開始しています...");
      
      // バッチサイズで小節を分割して処理
      for (let i = 0; i < quantizedBarData.length; i += barsPerBatch) {
        const batchBarData = quantizedBarData.slice(i, i + barsPerBatch);
        const batchBarInfo = batchBarData.map(barData => {
          const barInfo = bars.find(b => b.barIndex === barData.barIndex);
          if (!barInfo) {
            console.warn(`Bar info not found for bar ${barData.barIndex}`);
          }
          return barInfo;
        }).filter(Boolean) as BarInfo[];
        
        if (batchBarInfo.length !== batchBarData.length) {
          console.warn("Some bar info missing, skipping batch");
          processedBars += batchBarData.length;
          continue;
        }
        
        try {
          // プログレス更新
          const batchStart = batchBarData[0].barIndex + 1;
          const batchEnd = batchBarData[batchBarData.length - 1].barIndex + 1;
          setCurrentBar(Math.min(processedBars + batchBarData.length, totalBarsCount));
          setProgressMessage(batchBarData.length === 1 ? 
            `小節 ${batchStart} を処理中...` : 
            `小節 ${batchStart}-${batchEnd} を処理中...`);
          
          let aiResponse: string;
          
          if (batchBarData.length === 1) {
            // 単一小節の場合は既存の関数を使用
            const prompt = createPromptForBar(
              batchBarData[0],
              batchBarInfo[0],
              keyCount,
              enabledKeys,
              allowSimultaneousWhiteBlack,
              keyTypes,
              customInstructions
            );
            
            console.log(`Processing single bar ${batchStart}/${totalBarsCount}...`);
            
            // LLMを呼び出し
            const actualModelName = getActualModelName();
            const provider = snap.userSettings.aiProvider || 'ollama';
            console.log(`Using provider: ${provider}, model: ${actualModelName}`);
            
            if (provider === 'google-ai-studio') {
              const apiKey = snap.userSettings.googleAiApiKey;
              if (!apiKey) {
                throw new Error("Google AI Studio APIキーが設定されていません。設定画面で設定してください。");
              }
              aiResponse = await invoke<string>("call_google_ai", {
                modelName: actualModelName,
                query: prompt,
                apiKey: apiKey
              });
            } else {
              aiResponse = await invoke<string>("call_llm", {
                modelName: actualModelName,
                query: prompt
              });
            }
            
            console.log(`AI response for bar ${batchStart}:`, aiResponse);
            
            // AIの出力をパース
            const barNotes = parseAIResponse(aiResponse);
            
            // 時間に変換して最終結果に追加
            for (const note of barNotes) {
              // 拍位置を時間に変換
              const beatDuration = 60 / batchBarInfo[0].tempo; // 1拍の秒数
              const timeInBar = (note.beat - 1) * beatDuration; // 小節内の時間（0基点）
              const absoluteTime = batchBarInfo[0].startTime + timeInBar; // 絶対時間
              
              finalChartNotes.push({
                key: note.key,
                time: absoluteTime,
                barIndex: batchBarData[0].barIndex,
                beat: note.beat
              });
            }
            
            console.log(`Completed bar ${batchStart}, generated ${barNotes.length} notes`);
            
          } else {
            // 複数小節の場合はバッチ関数を使用
            const prompt = createPromptForBarBatch(
              batchBarData,
              batchBarInfo,
              keyCount,
              enabledKeys,
              allowSimultaneousWhiteBlack,
              keyTypes,
              customInstructions
            );
            
            console.log(`Processing batch bars ${batchStart}-${batchEnd}/${totalBarsCount}...`);
            
            // LLMを呼び出し
            const actualModelName = getActualModelName();
            const provider = snap.userSettings.aiProvider || 'ollama';
            console.log(`Using provider: ${provider}, model: ${actualModelName}`);
            
            if (provider === 'google-ai-studio') {
              const apiKey = snap.userSettings.googleAiApiKey;
              if (!apiKey) {
                throw new Error("Google AI Studio APIキーが設定されていません。設定画面で設定してください。");
              }
              aiResponse = await invoke<string>("call_google_ai", {
                modelName: actualModelName,
                query: prompt,
                apiKey: apiKey
              });
            } else {
              aiResponse = await invoke<string>("call_llm", {
                modelName: actualModelName,
                query: prompt
              });
            }
            
            console.log(`AI response for bars ${batchStart}-${batchEnd}:`, aiResponse);
            
            // AIの出力をパース
            const batchNotes = parseAIBatchResponse(aiResponse, batchBarData);
            
            // 時間に変換して最終結果に追加
            for (const [barIndex, barNotes] of batchNotes.entries()) {
              const barInfo = batchBarInfo.find(b => b.barIndex === barIndex);
              if (!barInfo) continue;
              
              for (const note of barNotes) {
                // 拍位置を時間に変換
                const beatDuration = 60 / barInfo.tempo; // 1拍の秒数
                const timeInBar = (note.beat - 1) * beatDuration; // 小節内の時間（0基点）
                const absoluteTime = barInfo.startTime + timeInBar; // 絶対時間
                
                finalChartNotes.push({
                  key: note.key,
                  time: absoluteTime,
                  barIndex: barIndex,
                  beat: note.beat
                });
              }
            }
            
            const totalNotesGenerated = Array.from(batchNotes.values()).reduce((sum, notes) => sum + notes.length, 0);
            console.log(`Completed batch bars ${batchStart}-${batchEnd}, generated ${totalNotesGenerated} notes`);
          }
          
          processedBars += batchBarData.length;
          
        } catch (error) {
          const batchStartForError = batchBarData[0].barIndex + 1;
          console.error(`Error processing batch starting at bar ${batchStartForError}:`, error);
          // エラーがあっても処理を続行
          processedBars += batchBarData.length;
        }
      }
      
      // 最終処理のプログレス更新
      setProgressMessage("譜面データを統合しています...");
      
      // 時間順でソート
      finalChartNotes.sort((a, b) => a.time - b.time);
      
      console.log("=== 譜面生成完了 ===");
      console.log(`処理した小節数: ${processedBars}/${totalBarsCount}`);
      console.log(`生成されたノート数: ${finalChartNotes.length}`);
      console.log("最終的な譜面データ:", finalChartNotes);
      
      // 統計情報
      const notesByKey = finalChartNotes.reduce((acc, note) => {
        acc[note.key] = (acc[note.key] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      console.log("鍵盤別ノート数:", notesByKey);
      
      // 完了プログレス更新
      setProgressMessage("譜面生成が完了しました！");
      
      // finalChartNotesをもとにChartEvent[]を作り、Chartを作成、storeにpushする処理
      setProgressMessage("譜面をプロジェクトに追加しています...");
      
      // ChartEventの配列を作成
      const chartEvents: ChartEvent[] = [];
      
      for (const note of finalChartNotes) {
        // 時間をTemporalPositionに変換
        const position = TemporalPosition.createWithSeconds(note.time);
        
        // 鍵盤番号をLane（0ベース）に変換
        const lane: Lane = note.key - 1;
        
        // SingleNoteEventを作成
        const noteEvent = new SingleNoteEvent(
          crypto.randomUUID(),
          position,
          lane
        );
        
        chartEvents.push(noteEvent);
      }
      
      // 時間順でソート（念のため）
      chartEvents.sort((a, b) => Number(a.position.nanoseconds - b.position.nanoseconds));
      
      // 新しいChartを作成
      const newChart = new Chart(
        crypto.randomUUID(),
        chartEvents,
        keyCount, // laneNumber として鍵盤数を設定
        `自動生成${new Date().toLocaleString('ja-JP')}`,
        1 // デフォルト難易度
      );
      
      // storeのprojectのchartsに追加
      store.project.charts.push(newChart);
      
      console.log("新しい譜面をプロジェクトに追加しました:", {
        chartId: newChart.uuid,
        eventCount: chartEvents.length,
        laneCount: keyCount,
        label: newChart.label
      });
      

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
            {(snap.userSettings.aiProvider || 'ollama') === 'ollama' ? (
              <Text fontSize="sm" color="blue.600">
                初回実行時には、AIモデルのダウンロードのため約5GBの空き容量が必要です。
              </Text>
            ) : (
              <Text fontSize="sm" color="blue.600">
                Google AI Studio APIキーが必要です。設定画面でAPIキーを入力してください。
              </Text>
            )}
          </Box>
          
          {/* Ollamaタブ固有の情報表示 */}
          {(snap.userSettings.aiProvider || 'ollama') === 'ollama' && (
            <>
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
            </>
          )}

          {/* 譜面生成設定 */}
          <Box mt={3} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold" mb={3}>譜面生成設定</Text>
            
            {/* AIプロバイダー選択 */}
            <Box mb={4}>
              <Text fontSize="sm" mb={2}>AIプロバイダー</Text>
              <HStack gap={2}>
                <Button
                  size="sm"
                  variant={(snap.userSettings.aiProvider || 'ollama') === 'ollama' ? "solid" : "outline"}
                  colorScheme={(snap.userSettings.aiProvider || 'ollama') === 'ollama' ? "blue" : "gray"}
                  onClick={() => {
                    store.userSettings.setAiProvider('ollama');
                    store.userSettings.save();
                    setSelectedModel("phi4:14b");
                  }}
                >
                  Ollama
                </Button>
                <Button
                  size="sm"
                  variant={(snap.userSettings.aiProvider || 'ollama') === 'google-ai-studio' ? "solid" : "outline"}
                  colorScheme={(snap.userSettings.aiProvider || 'ollama') === 'google-ai-studio' ? "blue" : "gray"}
                  onClick={() => {
                    store.userSettings.setAiProvider('google-ai-studio');
                    store.userSettings.save();
                    setSelectedModel("gemini-2.0-flash-exp");
                  }}
                >
                  Google AI Studio
                </Button>
              </HStack>
            </Box>

            {/* AIモデル選択 */}
            <Box mb={4}>
              <Text fontSize="sm" mb={2}>AIモデル</Text>
              
              {/* Ollamaの場合 */}
              {(snap.userSettings.aiProvider || 'ollama') === 'ollama' && (
                <Box>
                  {availableOllamaModels.map((model) => (
                    <Box key={model.value} mb={2}>
                      <Button
                        size="sm"
                        variant={selectedModel === model.value && !useCustomModel ? "solid" : "outline"}
                        colorScheme={selectedModel === model.value && !useCustomModel ? "blue" : "gray"}
                        onClick={() => {
                          setSelectedModel(model.value);
                          setUseCustomModel(false);
                        }}
                        width="100%"
                        textAlign="left"
                        justifyContent="flex-start"
                        h="auto"
                        p={3}
                      >
                        <Box>
                          <Text fontSize="sm" fontWeight="bold">{model.label}</Text>
                          <Text fontSize="xs" color={selectedModel === model.value && !useCustomModel ? "blue.100" : "gray.500"}>
                            {model.description}
                          </Text>
                        </Box>
                      </Button>
                    </Box>
                  ))}
                  
                  {/* カスタムモデル入力 */}
                  <Box mt={3} p={3} border="1px solid" borderColor={useCustomModel ? "blue.300" : "gray.200"} borderRadius="md" bg={useCustomModel ? "blue.50" : "transparent"}>
                    <Checkbox
                      checked={useCustomModel}
                      onCheckedChange={(details) => setUseCustomModel(details.checked === true)}
                      mb={2}
                    >
                      <Text fontSize="sm" fontWeight="bold">カスタムモデル</Text>
                    </Checkbox>
                    
                    {useCustomModel && (
                      <Box mt={2}>
                        <Input
                          placeholder="例: llama3.2:7b, gemma2:9b, など"
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          size="sm"
                        />
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Ollamaで利用可能な任意のモデル名を入力してください
                        </Text>
                      </Box>
                    )}
                  </Box>
                  
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    選択したモデルが初回使用時に自動でダウンロードされます
                  </Text>
                  {useCustomModel && customModel.trim() && (
                    <Text fontSize="xs" color="blue.600" mt={1}>
                      使用予定モデル: {customModel.trim()}
                    </Text>
                  )}
                </Box>
              )}

              {/* Google AI Studioの場合 */}
              {(snap.userSettings.aiProvider || 'ollama') === 'google-ai-studio' && (
                <Box>
                  {/* APIキー設定 */}
                  <Box mb={3} p={3} border="1px solid" borderColor="blue.200" borderRadius="md" bg="blue.50">
                    <Text fontSize="sm" fontWeight="bold" mb={2}>APIキー設定</Text>
                    <Input
                      type="password"
                      placeholder="Google AI Studio APIキーを入力"
                      value={googleAiApiKey}
                      onChange={(e) => {
                        setGoogleAiApiKey(e.target.value);
                        store.userSettings.setGoogleAiApiKey(e.target.value);
                        store.userSettings.save();
                      }}
                      size="sm"
                    />
                    <Text fontSize="xs" color="gray.600" mt={1}>
                      Google AI StudioでAPIキーを取得してください
                    </Text>
                  </Box>

                  {availableGoogleModels.map((model) => (
                    <Box key={model.value} mb={2}>
                      <Button
                        size="sm"
                        variant={selectedModel === model.value ? "solid" : "outline"}
                        colorScheme={selectedModel === model.value ? "blue" : "gray"}
                        onClick={() => setSelectedModel(model.value)}
                        width="100%"
                        textAlign="left"
                        justifyContent="flex-start"
                        h="auto"
                        p={3}
                      >
                        <Box>
                          <Text fontSize="sm" fontWeight="bold">{model.label}</Text>
                          <Text fontSize="xs" color={selectedModel === model.value ? "blue.100" : "gray.500"}>
                            {model.description}
                          </Text>
                        </Box>
                      </Button>
                    </Box>
                  ))}
                  
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    使用予定モデル: {selectedModel}
                  </Text>
                </Box>
              )}
            </Box>
            
            {/* 小節バッチサイズ設定 */}
            <Box mb={4}>
              <Text fontSize="sm" mb={2}>小節処理バッチサイズ</Text>
              
              {/* プリセットボタン */}
              <HStack mb={2} gap={2}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((batchSize) => (
                  <Button
                    key={batchSize}
                    size="sm"
                    variant={barsPerBatch === batchSize ? "solid" : "outline"}
                    colorScheme={barsPerBatch === batchSize ? "blue" : "gray"}
                    onClick={() => setBarsPerBatch(batchSize)}
                    minW="40px"
                  >
                    {batchSize}
                  </Button>
                ))}
              </HStack>
              
              <Text fontSize="xs" color="gray.500" mb={1}>
                1小節ずつ: 最も精度が高いが時間がかかる
              </Text>
              <Text fontSize="xs" color="gray.500" mb={1}>
                2-4小節ずつ: バランスの取れた設定（推奨）
              </Text>
              <Text fontSize="xs" color="gray.500" mb={1}>
                5-8小節ずつ: 高速だが精度が下がる可能性
              </Text>
              <Text fontSize="xs" color="blue.600" mt={2}>
                現在の設定: {barsPerBatch}小節ずつ処理
              </Text>
            </Box>
            
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
            disabled={(snap.userSettings.aiProvider || 'ollama') === 'ollama' && vramGb !== null && vramGb <= 7}
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
          <Box display="flex" flexDirection="column" gap={4}>
            {/* プログレスバー */}
            {totalBars > 0 && (
              <Box>
                <Text fontSize="sm" mb={2}>
                  進行状況: {currentBar} / {totalBars} 小節
                </Text>
                {/* カスタムプログレスバー */}
                <Box 
                  w="100%" 
                  h="20px" 
                  bg="gray.200" 
                  borderRadius="md" 
                  overflow="hidden"
                  position="relative"
                >
                  <Box
                    h="100%"
                    bg="blue.500"
                    transition="width 0.3s ease"
                    width={`${(currentBar / totalBars) * 100}%`}
                  />
                  <Text 
                    position="absolute" 
                    top="50%" 
                    left="50%" 
                    transform="translate(-50%, -50%)"
                    fontSize="xs" 
                    color="white"
                    fontWeight="bold"
                    textShadow="1px 1px 1px rgba(0,0,0,0.5)"
                  >
                    {Math.round((currentBar / totalBars) * 100)}%
                  </Text>
                </Box>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {Math.round((currentBar / totalBars) * 100)}% 完了
                </Text>
              </Box>
            )}
            
            {/* メッセージとスピナー */}
            <Box display="flex" alignItems="center" gap={4}>
              <Spinner size="lg" />
              <Box>
                <Text>{progressMessage || "譜面を自動生成しています。緑茶でも飲んでてください..."}</Text>
                {totalBars > 0 && (
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    小節の処理には時間がかかる場合があります
                  </Text>
                )}
              </Box>
            </Box>
          </Box>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  </>)
});

GenerateNewChartDialog.displayName = "GenerateNewChartDialog";

export default GenerateNewChartDialog;