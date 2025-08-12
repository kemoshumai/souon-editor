/**
 * 波形を描画する共通関数
 * @param canvas - 描画対象のcanvas要素
 * @param audioUrl - 音声ファイルのURL
 * @param strokeColor - 波形の色（デフォルト: "#fff"）
 * @param backgroundColor - 背景色（デフォルト: "#000"）
 */
export const drawWaveform = async (
  canvas: HTMLCanvasElement, 
  audioUrl: string,
  strokeColor: string = "#fff",
  backgroundColor: string = "#000"
): Promise<void> => {
  if (!canvas || !audioUrl) return;

  canvas.height = 16000;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  try {
    const audio = await (await fetch(audioUrl)).arrayBuffer();
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(audio);

    const channel = buffer.getChannelData(0);

    const centerX = canvas.width / 2;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const totalSamples = channel.length;
    for (let i = 0; i < canvas.height; i += 1) {
      const percent = i / canvas.height;
      const sampleIndex = Math.floor(percent * totalSamples);
      const sample = channel[sampleIndex];
      const amplitude = Math.abs(sample);
      // Scale amplitude to half the canvas width
      const xOffset = amplitude * centerX;
      // Map i so that 0 is at the bottom and canvas.height at the top
      const y = canvas.height - i;
      
      ctx.beginPath();
      ctx.moveTo(centerX - xOffset, y);
      ctx.lineTo(centerX + xOffset, y);
      ctx.stroke();
    }
  } catch (error) {
    console.error("Error drawing waveform:", error);
  }
};
