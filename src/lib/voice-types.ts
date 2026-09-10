export enum ConversationStatus {
  Idle = "idle",
  Connecting = "connecting",
  Listening = "listening",
  Thinking = "thinking",
  Speaking = "speaking",
  Disconnected = "disconnected",
  Error = "error",
}

export enum SpeakerRole {
  User = "user",
  Assistant = "assistant",
}

export interface TranscriptEntry {
  id: string;
  role: SpeakerRole;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export type SessionAgent = {
  id: string;
  name: string;
  description: string;
};

export type ClientToServerMessage =
  | {
      type: "start_session";
      agentId?: string;
      sessionId?: string;
      conversationId?: string;
      speakModel?: string;
    }
  | { type: "stop_session" }
  | { type: "audio"; data: string }
  | { type: "user_text"; text: string };

export type ServerToClientMessage =
  | {
      type: "session_started";
      sessionId: string;
      conversationId: string;
      agent: SessionAgent;
    }
  | { type: "session_stopped" }
  | { type: "status"; status: ConversationStatus }
  | { type: "user_started_speaking" }
  | {
      type: "transcript";
      role: SpeakerRole;
      text: string;
      isFinal: boolean;
      entryId: string;
    }
  | { type: "audio"; data: string; sampleRate: number }
  | { type: "clear_audio" }
  | {
      type: "turn_latency";
      query: string;
      sttFinalMs: number | null;
      llmFirstTextMs: number | null;
      ttsFirstAudioMs: number | null;
      totalMs: number;
      reason: string;
    }
  | { type: "error"; message: string }
  | { type: "pong" };
