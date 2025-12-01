import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useEffect, useState } from "react";
import { Button } from "@chakra-ui/react";
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../components/ui/dialog";

export default function UpdateCheck() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [contentLength, setContentLength] = useState(0);

  useEffect(() => {
    checkForUpdates();
  }, []);

  async function checkForUpdates() {
    try {
      const updateInfo = await check();
      if (updateInfo) {
        console.log(`新しいバージョンが見つかりました: ${updateInfo.version}`);
        setUpdate(updateInfo);
      } else {
        console.log("最新バージョンです");
      }
    } catch (error) {
      console.error("アップデート確認エラー:", error);
    }
  }

  async function handleUpdate() {
    if (!update) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloaded(0);
    setContentLength(0);

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            const length = event.data.contentLength || 0;
            setContentLength(length);
            console.log(`ダウンロード開始: ${length} bytes`);
            break;
          case 'Progress':
            const chunkLength = event.data.chunkLength;
            setDownloaded((prev) => {
              const newDownloaded = prev + chunkLength;
              if (contentLength > 0) {
                setDownloadProgress((newDownloaded / contentLength) * 100);
              }
              return newDownloaded;
            });
            break;
          case 'Finished':
            console.log('ダウンロード完了');
            setDownloadProgress(100);
            break;
        }
      });

      // アプリを再起動して更新を適用
      await relaunch();
    } catch (error) {
      console.error("アップデートエラー:", error);
      setIsDownloading(false);
      alert("アップデート中にエラーが発生しました");
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!update) {
    return null;
  }

  return (
    <>
      <Button
        variant="solid"
        colorScheme="blue"
        backgroundColor={"green.300"}
        onClick={() => setIsDialogOpen(true)}
        size="sm"
      >
        アップデート可能: v{update.version}
      </Button>

      <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アップデート v{update.version}</DialogTitle>
            <DialogCloseTrigger disabled={isDownloading} />
          </DialogHeader>
          <DialogBody>
            {!isDownloading ? (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <strong>更新内容:</strong>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    marginTop: '8px',
                    padding: '8px',
                    background: '#f5f5f5',
                    borderRadius: '4px'
                  }}>
                    {update.body}
                  </pre>
                </div>
                <div style={{ 
                  padding: '12px',
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  color: '#856404'
                }}>
                  アップデートをすると保存していない変更は全て失われます。<br />
                  アップデート前に必ずプロジェクトを保存してください。
                </div>
              </>
            ) : (
              <div>
                <div style={{ marginBottom: '8px' }}>
                  ダウンロード中: {formatBytes(downloaded)} / {formatBytes(contentLength)}
                </div>
                <div style={{ 
                  width: '100%',
                  height: '20px',
                  background: '#e0e0e0',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${downloadProgress}%`,
                    height: '100%',
                    background: '#4CAF50',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{ marginTop: '8px', textAlign: 'center' }}>
                  {Math.round(downloadProgress)}%
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isDownloading}
            >
              キャンセル
            </Button>
            <Button
              variant="solid"
              colorScheme="blue"
              onClick={handleUpdate}
              disabled={isDownloading}
            >
              {isDownloading ? 'アップデート中...' : 'アップデート'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}