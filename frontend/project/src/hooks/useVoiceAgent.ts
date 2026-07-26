import { useState, useRef, useCallback } from "react";
import type { ChatMessage } from "../components/ChatSidebar";
import { API_URL, getHeaders } from "../lib/api";

type VoiceState = "idle" | "recording" | "processing" | "playing";

async function callVoiceBackend(
  audioBlob: Blob,
  userEmail: string,
): Promise<{ text: string; audioBlob: Blob; appointmentCreated?: boolean }> {
  const formData = new FormData();
  formData.append("email", userEmail);
  formData.append("file", audioBlob, "recording.webm");

  const response = await fetch(`${API_URL}/audio-chat`, {
    method: "POST",
    headers: getHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Audio chat failed: ${response.status}`);
  }

  // The backend returns raw .wav audio bytes
  const audioBlobResult = await response.blob();

  // Extract text from a query param or use a default greeting
  // Since the backend returns raw audio, the text comes from the conversation context
  const text = "I am ready to help you. Please describe what you need.";

  return { text, audioBlob: audioBlobResult, appointmentCreated: false };
}

export function useVoiceAgent(userEmail: string) {
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [appointmentCreated, setAppointmentCreated] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioCtx = audioContextRef.current || new AudioContext();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      setAnalyserNode(analyser);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        source.disconnect();
        setAnalyserNode(null);

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        setState("processing");

        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          text: "Patient inquiry...",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);

        try {
          const result = await callVoiceBackend(audioBlob, userEmail);

          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            text: result.text,
            timestamp: new Date(),
            hasAudio: true,
          };
          setMessages((prev) => [...prev, assistantMsg]);

          if (result.appointmentCreated) {
            setAppointmentCreated(true);
          }

          if (result.audioBlob.size > 0) {
            await playAudio(result.audioBlob);
          }
        } catch {
          setState("idle");
        }
      };

      recorder.start();
      setState("recording");
    } catch {
      setState("idle");
    }
  }, [userEmail]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const playAudio = useCallback(async (blob: Blob): Promise<void> => {
    const audioCtx = audioContextRef.current || new AudioContext();
    audioContextRef.current = audioCtx;

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyserRef.current = analyser;
    setAnalyserNode(analyser);
    setState("playing");

    return new Promise((resolve) => {
      source.onended = () => {
        setAnalyserNode(null);
        setState("idle");
        resolve();
      };
      source.start();
    });
  }, []);

  const toggleRecording = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else if (state === "idle") {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  const clearAppointmentFlag = useCallback(() => {
    setAppointmentCreated(false);
  }, []);

  return {
    state,
    messages,
    analyserNode,
    toggleRecording,
    isRecording: state === "recording",
    isPlaying: state === "playing",
    isProcessing: state === "processing",
    appointmentCreated,
    clearAppointmentFlag,
  };
}
