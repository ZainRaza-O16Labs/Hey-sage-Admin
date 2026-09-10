"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createMicrophoneStream,
  playPcmBase64,
  type MicrophoneStream,
} from "@/lib/audio";
import {
  ConversationStatus,
  SpeakerRole,
  type ClientToServerMessage,
  type ServerToClientMessage,
  type TranscriptEntry,
} from "@/lib/voice-types";

const DEFAULT_WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4111/ws";
const SPEAKING_TAIL_MS = 250;
const BROWSER_SESSION_ID_KEY = "hey-sage.browser-session-id";

function getBrowserSessionId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const existing = window.sessionStorage.getItem(BROWSER_SESSION_ID_KEY);
  if (existing?.trim()) return existing;
  const next = crypto.randomUUID();
  window.sessionStorage.setItem(BROWSER_SESSION_ID_KEY, next);
  return next;
}

function mergeTranscriptEntry(
  prev: TranscriptEntry[],
  next: Omit<TranscriptEntry, "timestamp"> & { timestamp?: number },
): TranscriptEntry[] {
  const idx = prev.findIndex((e) => e.id === next.id);
  if (idx === -1) return [...prev, { ...next, timestamp: next.timestamp ?? Date.now() }];
  const cur = prev[idx];
  if (!cur) return prev;
  if (cur.isFinal && next.isFinal && cur.role === SpeakerRole.Assistant && next.role === SpeakerRole.Assistant && cur.text !== next.text) {
    return [...prev, { ...next, id: crypto.randomUUID(), timestamp: next.timestamp ?? Date.now() }];
  }
  const out = [...prev];
  out[idx] = { ...cur, text: next.text, isFinal: next.isFinal };
  return out;
}

export function useVoiceConversation() {
  const [status, setStatus] = useState<ConversationStatus>(ConversationStatus.Idle);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<{ id: string; name: string; description: string } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicrophoneStream | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef(0);
  const pcmLeftoverRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0));
  const playbackRateRef = useRef(0);
  const speakingUntilRef = useRef(0);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<ConversationStatus>(ConversationStatus.Idle);
  const shouldReconnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const connectRef = useRef<(() => void) | null>(null);
  const agentIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const browserSessionIdRef = useRef<string>(getBrowserSessionId());
  const speakModelRef = useRef<string | undefined>(undefined);

  const stopPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    pcmLeftoverRef.current = new Uint8Array(0);
    playbackRateRef.current = 0;
    speakingUntilRef.current = 0;
    if (speakingTimerRef.current) { clearTimeout(speakingTimerRef.current); speakingTimerRef.current = null; }
  }, []);

  const cleanupMedia = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    stopPlayback();
    void playbackContextRef.current?.close();
    playbackContextRef.current = null;
  }, [stopPlayback]);

  const stillSpeaking = useCallback(() => Date.now() < speakingUntilRef.current + SPEAKING_TAIL_MS, []);

  const holdSpeaking = useCallback((ms: number) => {
    const now = Date.now();
    speakingUntilRef.current = Math.max(speakingUntilRef.current, now + ms);
    if (statusRef.current !== ConversationStatus.Speaking) { statusRef.current = ConversationStatus.Speaking; setStatus(ConversationStatus.Speaking); }
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    const fireIn = speakingUntilRef.current - now + SPEAKING_TAIL_MS + 30;
    speakingTimerRef.current = setTimeout(() => {
      if (!stillSpeaking() && statusRef.current === ConversationStatus.Speaking) { statusRef.current = ConversationStatus.Listening; setStatus(ConversationStatus.Listening); }
    }, fireIn);
  }, [stillSpeaking]);

  const sendMessage = useCallback((msg: ClientToServerMessage) => {
    const s = socketRef.current;
    if (s?.readyState === WebSocket.OPEN) s.send(JSON.stringify(msg));
  }, []);

  const ensureMicrophone = useCallback(async () => {
    if (micRef.current) return;
    const mic = createMicrophoneStream((pcm) => sendMessage({ type: "audio", data: pcm }));
    await mic.start();
    micRef.current = mic;
  }, [sendMessage]);

  const handleServerMessage = useCallback((msg: ServerToClientMessage) => {
    switch (msg.type) {
      case "session_started":
        setSessionId(msg.sessionId);
        conversationIdRef.current = msg.conversationId;
        setConversationId(msg.conversationId);
        setActiveAgent(msg.agent);
        statusRef.current = ConversationStatus.Listening;
        setStatus(ConversationStatus.Listening);
        void ensureMicrophone();
        break;
      case "session_stopped":
        if (!shouldReconnectRef.current) {
          statusRef.current = ConversationStatus.Idle;
          setStatus(ConversationStatus.Idle);
          setSessionId(null);
          setConversationId(null);
          cleanupMedia();
        }
        break;
      case "status":
        if (stillSpeaking() && (msg.status === ConversationStatus.Listening || msg.status === ConversationStatus.Thinking)) break;
        statusRef.current = msg.status;
        setStatus(msg.status);
        break;
      case "user_started_speaking":
        stopPlayback();
        break;
      case "clear_audio":
        stopPlayback();
        break;
      case "transcript":
        if (msg.role === SpeakerRole.Assistant && msg.text.trim().startsWith("{") && /"found"\s*:/.test(msg.text)) { stopPlayback(); break; }
        setTranscripts((prev) => mergeTranscriptEntry(prev, { id: msg.entryId, role: msg.role, text: msg.text, isFinal: msg.isFinal }));
        break;
      case "audio": {
        if (!playbackContextRef.current) playbackContextRef.current = new AudioContext();
        const ctx = playbackContextRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        if (playbackRateRef.current && playbackRateRef.current !== msg.sampleRate) stopPlayback();
        playbackRateRef.current = msg.sampleRate;
        const { source, endTime, leftover } = playPcmBase64(msg.data, msg.sampleRate, ctx, nextPlayTimeRef.current, pcmLeftoverRef.current);
        pcmLeftoverRef.current = leftover;
        nextPlayTimeRef.current = endTime;
        holdSpeaking(Math.max(80, (endTime - ctx.currentTime) * 1000));
        if (source) { activeSourcesRef.current.push(source); source.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source); }; }
        break;
      }
      case "error":
        setErrorMessage(msg.message);
        setStatus(ConversationStatus.Error);
        break;
    }
  }, [cleanupMedia, ensureMicrophone, holdSpeaking, stillSpeaking, stopPlayback]);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) return;
    setStatus(ConversationStatus.Connecting);
    setErrorMessage(null);
    const socket = new WebSocket(DEFAULT_WS_URL);
    socketRef.current = socket;
    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      sendMessage({
        type: "start_session",
        ...(agentIdRef.current ? { agentId: agentIdRef.current } : {}),
        sessionId: browserSessionIdRef.current,
        ...(conversationIdRef.current ? { conversationId: conversationIdRef.current } : {}),
        ...(speakModelRef.current ? { speakModel: speakModelRef.current } : {}),
      });
    };
    socket.onmessage = (e) => { try { handleServerMessage(JSON.parse(String(e.data)) as ServerToClientMessage); } catch { setErrorMessage("Received an invalid message from the server."); } };
    socket.onerror = () => { setErrorMessage("Unable to reach the voice server."); setStatus(ConversationStatus.Error); };
    socket.onclose = () => {
      socketRef.current = null;
      stopPlayback();
      if (!shouldReconnectRef.current) { cleanupMedia(); setStatus((c) => c === ConversationStatus.Error ? c : ConversationStatus.Disconnected); return; }
      const attempt = reconnectAttemptsRef.current + 1;
      reconnectAttemptsRef.current = attempt;
      if (attempt > 5) { shouldReconnectRef.current = false; setErrorMessage("Connection lost. Please start again."); setStatus(ConversationStatus.Error); return; }
      setStatus(ConversationStatus.Connecting);
      window.setTimeout(() => connectRef.current?.(), Math.min(1000 * attempt, 5000));
    };
  }, [cleanupMedia, handleServerMessage, sendMessage, stopPlayback]);

  useEffect(() => { connectRef.current = connect; return () => { connectRef.current = null; }; }, [connect]);

  const startConversation = useCallback(async (agentId: string | null, resumeConversationId?: string | null, speakModel?: string) => {
    try {
      agentIdRef.current = agentId;
      conversationIdRef.current = resumeConversationId ?? null;
      setConversationId(resumeConversationId ?? null);
      speakModelRef.current = speakModel;
      setTranscripts([]);
      setErrorMessage(null);
      shouldReconnectRef.current = true;
      await ensureMicrophone();
      connect();
    } catch (error) {
      const msg = error instanceof Error && error.name === "NotAllowedError" ? "Microphone permission was denied." : "Unable to access the microphone.";
      setErrorMessage(msg);
      setStatus(ConversationStatus.Error);
      shouldReconnectRef.current = false;
      cleanupMedia();
    }
  }, [cleanupMedia, connect, ensureMicrophone]);

  const stopConversation = useCallback(() => {
    shouldReconnectRef.current = false;
    sendMessage({ type: "stop_session" });
    cleanupMedia();
    if (socketRef.current) { socketRef.current.close(); socketRef.current = null; }
    setSessionId(null);
    setConversationId(null);
    setActiveAgent(null);
    setStatus(ConversationStatus.Idle);
  }, [cleanupMedia, sendMessage]);

  useEffect(() => () => { shouldReconnectRef.current = false; cleanupMedia(); socketRef.current?.close(); }, [cleanupMedia]);

  return {
    status, transcripts, errorMessage, sessionId, conversationId, activeAgent,
    isListening: status === ConversationStatus.Listening,
    isSpeaking: status === ConversationStatus.Speaking,
    isUserTurn: status === ConversationStatus.Listening || transcripts.some((e) => e.role === SpeakerRole.User && !e.isFinal),
    startConversation, stopConversation,
  };
}
