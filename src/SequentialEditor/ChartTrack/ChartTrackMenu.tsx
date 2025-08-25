import { Button, MenuContent, MenuItem, MenuRoot, MenuTrigger } from "@chakra-ui/react";
import { useSnapshot } from "valtio";
import store from "../../store/store";
import { useState } from "react";
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter, 
  DialogActionTrigger 
} from "../../components/ui/dialog";
import { HiCog6Tooth } from "react-icons/hi2";
import { HiTrash, HiClipboard, HiClipboardDocument } from "react-icons/hi2";
import { SingleNoteEvent, LongNoteEvent } from "../../store/noteEvent";
import { SpeedChangeEvent } from "../../store/speedChangeEvent";
import TemporalPosition from "../../store/temporalPosition";
import ChartEventType from "../../store/chartEventType";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";

interface ChartTrackMenuProps {
  chartUuid: string;
}

export default function ChartTrackMenu({ chartUuid }: ChartTrackMenuProps) {
  const snap = useSnapshot(store);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [clipboardData, setClipboardData] = useState<any>(null);

  const chart = snap.project.charts.find(c => c.uuid === chartUuid);
  const chartStore = store.project.charts.find(c => c.uuid === chartUuid);

  const handleDelete = () => {
    if (chartStore) {
      const index = store.project.charts.findIndex(c => c.uuid === chartUuid);
      if (index !== -1) {
        store.project.charts.splice(index, 1);
      }
    }
    setShowDeleteDialog(false);
  };

  const handleCopy = async () => {
    if (!chart) return;
    
    try {
      const chartData = {
        type: 'souon-editor-chart',
        version: '1.0.0',
        data: {
          uuid: chart.uuid,
          label: chart.label,
          laneNumber: chart.laneNumber,
          events: chart.events.map(event => {
            const baseEvent = {
              type: event.type,
              uuid: event.uuid,
              position: {
                seconds: event.position.seconds,
                nanoseconds: Number(event.position.nanoseconds)
              }
            };

            // イベント固有のプロパティを追加
            const eventData = event as any;
            if (eventData.lane !== undefined) {
              (baseEvent as any).lane = eventData.lane;
            }
            if (eventData.endPosition) {
              (baseEvent as any).endPosition = {
                seconds: eventData.endPosition.seconds,
                nanoseconds: Number(eventData.endPosition.nanoseconds)
              };
            }
            if (eventData.speed !== undefined) {
              (baseEvent as any).speed = eventData.speed;
            }

            return baseEvent;
          })
        }
      };
      
      await writeText(JSON.stringify(chartData, null, 2));
      console.log('Chart copied to clipboard');
    } catch (error) {
      console.error('Failed to copy chart to clipboard:', error);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await readText();
      const data = JSON.parse(text);
      
      if (data.type !== 'souon-editor-chart') {
        console.error('Invalid clipboard data format');
        return;
      }
      
      // クリップボードデータを保存してダイアログを表示
      setClipboardData(data);
      setShowPasteDialog(true);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleConfirmPaste = () => {
    if (!clipboardData || !chartStore) return;
    
    try {
      // クリップボードからのデータでチャートの内容を置き換え
      const chartData = clipboardData.data;
      chartStore.label = chartData.label;
      chartStore.laneNumber = chartData.laneNumber;
      
      // イベントを適切なクラスのインスタンスとして復元
      chartStore.events = chartData.events.map((eventData: any) => {
        // positionの処理を安全に行う
        const positionNanoseconds = eventData.position && eventData.position.nanoseconds !== undefined 
          ? BigInt(eventData.position.nanoseconds) 
          : BigInt(0);
        const position = new TemporalPosition(positionNanoseconds);
        const newUuid = crypto.randomUUID(); // 新しいUUIDを生成してペースト時の重複を避ける
        
        switch (eventData.type) {
          case ChartEventType.SingleNote:
            return new SingleNoteEvent(newUuid, position, eventData.lane || 0);
          case ChartEventType.LongNote:
            const endPositionNanoseconds = eventData.endPosition && eventData.endPosition.nanoseconds !== undefined
              ? BigInt(eventData.endPosition.nanoseconds)
              : BigInt(0);
            const endPosition = new TemporalPosition(endPositionNanoseconds);
            return new LongNoteEvent(newUuid, position, eventData.lane || 0, endPosition);
          case ChartEventType.SpeedChange:
            return new SpeedChangeEvent(newUuid, position, eventData.speed || 1.0);
          default:
            // 不明なイベントタイプの場合は基本的なオブジェクトとして保持
            return {
              ...eventData,
              position: position,
              uuid: newUuid
            };
        }
      });
      
      console.log('Chart pasted from clipboard');
      setShowPasteDialog(false);
      setClipboardData(null);
    } catch (error) {
      console.error('Failed to paste chart from clipboard:', error);
    }
  };

  return (
    <>
      <MenuRoot>
        <MenuTrigger asChild>
          <Button variant="ghost" size="sm" p={1}>
            <HiCog6Tooth size={16} />
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem value="copy" onClick={handleCopy}>
            <HiClipboard size={16} />
            コピー
          </MenuItem>
          <MenuItem value="paste" onClick={handlePaste}>
            <HiClipboardDocument size={16} />
            ペースト
          </MenuItem>
          <MenuItem value="delete" onClick={() => setShowDeleteDialog(true)} color="red.500">
            <HiTrash size={16} />
            削除
          </MenuItem>
        </MenuContent>
      </MenuRoot>

      <DialogRoot open={showDeleteDialog} onOpenChange={(details) => setShowDeleteDialog(details.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>譜面の削除</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>譜面「{chart?.label}」を削除しますか？この操作は取り消せません。</p>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                キャンセル
              </Button>
            </DialogActionTrigger>
            <Button colorScheme="red" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={showPasteDialog} onOpenChange={(details) => setShowPasteDialog(details.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>譜面のペースト</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p>現在の譜面「{chart?.label}」の内容を上書きしますか？</p>
            <p>クリップボードの譜面: 「{clipboardData?.data?.label || '不明'}」</p>
            <p style={{ color: 'orange', fontSize: 'small' }}>この操作は取り消せません。</p>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline" onClick={() => {
                setShowPasteDialog(false);
                setClipboardData(null);
              }}>
                キャンセル
              </Button>
            </DialogActionTrigger>
            <Button colorScheme="blue" onClick={handleConfirmPaste}>
              ペースト
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
