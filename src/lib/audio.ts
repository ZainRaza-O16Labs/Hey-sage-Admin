const SAMPLE_RATE = 16000;

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}

function downsampleBuffer(
  buffer: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (outputRate === inputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLen = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLen);
  let oR = 0;
  let oB = 0;
  while (oR < result.length) {
    const next = Math.round((oR + 1) * ratio);
    let sum = 0;
    let cnt = 0;
    for (let i = oB; i < next && i < buffer.length; i++) {
      sum += buffer[i] ?? 0;
      cnt++;
    }
    result[oR] = sum / cnt;
    oR++;
    oB = next;
  }
  return result;
}

export interface MicrophoneStream {
  start: () => Promise<void>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
}

export function createMicrophoneStream(
  onAudioChunk: (pcmBase64: string) => void,
): MicrophoneStream {
  let mediaStream: MediaStream | null = null;
  let audioCtx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let silentGain: GainNode | null = null;
  let muted = false;

  return {
    async start() {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      source = audioCtx.createMediaStreamSource(mediaStream);
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      processor.onaudioprocess = (e) => {
        if (muted) return;
        const input = e.inputBuffer.getChannelData(0);
        const ds = downsampleBuffer(input, audioCtx?.sampleRate ?? SAMPLE_RATE, SAMPLE_RATE);
        const pcm = floatTo16BitPCM(ds);
        const bytes = new Uint8Array(pcm);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] ?? 0);
        onAudioChunk(btoa(bin));
      };
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);
    },
    setMuted(v) {
      muted = v;
    },
    stop() {
      processor?.disconnect();
      source?.disconnect();
      silentGain?.disconnect();
      void audioCtx?.close();
      mediaStream?.getTracks().forEach((t) => t.stop());
      processor = null;
      source = null;
      silentGain = null;
      audioCtx = null;
      mediaStream = null;
    },
  };
}

export interface PcmPlaybackResult {
  source: AudioBufferSourceNode | null;
  endTime: number;
  leftover: Uint8Array<ArrayBuffer>;
}

function resampleToRate(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to || samples.length === 0) return new Float32Array(samples);
  const ratio = from / to;
  const newLen = Math.max(1, Math.round(samples.length / ratio));
  const result = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const src = i * ratio;
    const l = Math.min(Math.floor(src), samples.length - 1);
    const r = Math.min(l + 1, samples.length - 1);
    const f = src - l;
    result[i] = (samples[l] ?? 0) * (1 - f) + (samples[r] ?? 0) * f;
  }
  return result;
}

export function playPcmBase64(
  base64Audio: string,
  sampleRate: number,
  ctx: AudioContext,
  startAt: number,
  leftoverBytes: Uint8Array = new Uint8Array(0),
): PcmPlaybackResult {
  const binary = atob(base64Audio);
  const incoming = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) incoming[i] = binary.charCodeAt(i);
  const combined = new Uint8Array(leftoverBytes.length + incoming.length);
  combined.set(leftoverBytes);
  combined.set(incoming, leftoverBytes.length);
  const usable = combined.length - (combined.length % 2);
  const leftover: Uint8Array<ArrayBuffer> = new Uint8Array(combined.subarray(usable));
  if (usable === 0) return { source: null, endTime: startAt, leftover };
  const count = usable / 2;
  const floats = new Float32Array(count);
  const view = new DataView(combined.buffer, combined.byteOffset, usable);
  for (let i = 0; i < count; i++) floats[i] = view.getInt16(i * 2, true) / 0x8000;
  const resampled = resampleToRate(floats, sampleRate, ctx.sampleRate);
  const buf = ctx.createBuffer(1, resampled.length, ctx.sampleRate);
  buf.getChannelData(0).set(resampled);
  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.connect(ctx.destination);
  const now = ctx.currentTime;
  const when = startAt > now ? startAt : now;
  source.start(when);
  return { source, endTime: when + bufferDuration(buf), leftover };
}

function bufferDuration(b: AudioBuffer): number {
  return b.duration;
}
