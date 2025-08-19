import { Button, Box, Spinner, Text } from "@chakra-ui/react";
import { DialogRoot, DialogContent, DialogHeader, DialogFooter, DialogBody, DialogTitle, DialogDescription, DialogCloseTrigger } from "../../components/ui/dialog";
import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { toaster } from "../../components/ui/toaster";
import { invoke } from "@tauri-apps/api/core";

export interface GenerateNewChartDialogRef {
  generateNewChart: () => void;
}

const GenerateNewChartDialog = forwardRef<GenerateNewChartDialogRef>((_props, ref) => {
  const [showNewChartConfirmDialog, setShowNewChartConfirmDialog] = useState(false);
  const [isNewChartGenerating, setIsNewChartGenerating] = useState(false);
  const [vramGb, setVramGb] = useState<number | null>(null);
  const [vramError, setVramError] = useState<string | null>(null);
  const [isVramLoading, setIsVramLoading] = useState(false);
  const [isOllamaInstalled, setIsOllamaInstalled] = useState<boolean | null>(null);
  const [isOllamaLoading, setIsOllamaLoading] = useState(false);

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
  

  const GenerateNewChart = async () => {
    setShowNewChartConfirmDialog(true);
  }

  const handleConfirmNewChartGeneration = async () => {
    setShowNewChartConfirmDialog(false);
    setIsNewChartGenerating(true);

    try {
      // 新しい譜面を生成する処理をここに追加
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