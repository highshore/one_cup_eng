import { useState, useRef, useEffect, useCallback } from "react";

// Interfaces for AssemblyAI data structures matching their API
export interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  word_is_final: boolean;
}

export interface AssemblyAIMessage {
  type: string; // "Begin", "Turn", "Termination", "Error"
  turn_order?: number;
  turn_is_formatted?: boolean;
  end_of_turn?: boolean;
  transcript?: string;
  end_of_turn_confidence?: number;
  words?: AssemblyAIWord[];
  id?: string;
  audio_duration_seconds?: number;
  session_duration_seconds?: number;
  expires_at?: number;
  code?: number;
  reason?: string;
}

// Convert AssemblyAI format to our internal format for compatibility
export interface AssemblyAIResult {
  alternatives?: {
    content: string;
    confidence?: number;
    speaker?: string;
  }[];
  start_time?: number;
  end_time?: number;
  type?: string;
}

// Function to fetch temporary token from backend
async function fetchAssemblyAIToken(): Promise<string> {
  const response = await fetch('/api/assemblyai/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get AssemblyAI token');
  }

  const data = await response.json();
  return data.token;
}

/**
 * Custom React Hook for managing AssemblyAI real-time transcription.
 *
 * @param isPausedRef - Optional ref to track pause state for filtering incoming data
 * @returns An object containing:
 *  - `assemblyAIResults`: { activePartialSegment, finalTranscript }
 *  - `assemblyAIError`: Any error message from the AssemblyAI service (null if no error).
 *  - `isAssemblyAISocketOpen`: Boolean indicating if the WebSocket is currently open.
 *  - `startAssemblyAI`: Async function to initialize and start the AssemblyAI client.
 *  - `stopAssemblyAI`: Async function to stop the AssemblyAI client.
 *  - `sendAssemblyAIAudio`: Function to send an audio chunk (ArrayBuffer) to AssemblyAI.
 */
export const useAssemblyAI = (isPausedRef?: React.RefObject<boolean>) => {
  // --- State ---
  const [activePartialSegment, setActivePartialSegment] = useState<AssemblyAIResult[]>([]);
  const [finalTranscript, setFinalTranscript] = useState<AssemblyAIResult[]>([]);
  const [assemblyAIError, setAssemblyAIError] = useState<string | null>(null);
  const [isAssemblyAISocketOpen, setIsAssemblyAISocketOpen] = useState(false);

  // --- Refs ---
  const websocketRef = useRef<WebSocket | null>(null);
  const isSocketOpenRef = useRef(isAssemblyAISocketOpen);
  const activePartialSegmentRef = useRef(activePartialSegment);
  const currentSessionTranscript = useRef<string>("");
  const currentSpeaker = useRef<string>("S1");

  // --- Effects to keep refs in sync ---
  useEffect(() => {
    isSocketOpenRef.current = isAssemblyAISocketOpen;
  }, [isAssemblyAISocketOpen]);

  useEffect(() => {
    activePartialSegmentRef.current = activePartialSegment;
  }, [activePartialSegment]);

  // Helper function to convert AssemblyAI Turn message to result format
  const convertAssemblyAIToResults = useCallback((message: AssemblyAIMessage): AssemblyAIResult[] => {
    if (!message.words || message.words.length === 0) {
      // Fallback for messages without words array
      if (message.transcript && message.transcript.trim()) {
        const words = message.transcript.trim().split(/\s+/);
        return words.map((word, index) => ({
          alternatives: [{
            content: word,
            confidence: 0.95,
            speaker: currentSpeaker.current,
          }],
          start_time: index * 0.1, // Approximate timing
          end_time: (index + 1) * 0.1,
          type: "word"
        }));
      }
      return [];
    }

    // Convert AssemblyAI words to our format
    return message.words.map((word, index) => ({
      alternatives: [{
        content: word.text,
        confidence: word.confidence,
        speaker: currentSpeaker.current,
      }],
      start_time: word.start / 1000, // Convert ms to seconds
      end_time: word.end / 1000, // Convert ms to seconds
      type: "word"
    }));
  }, []);

  // --- Internal Event Handlers for AssemblyAI WebSocket ---
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data: AssemblyAIMessage = JSON.parse(event.data);
      console.log("[AssemblyAI] Received message:", data);

      // Drop data when paused (but keep AssemblyAI running)
      const isPaused = isPausedRef?.current;

      switch (data.type) {
        case "Begin":
          console.log(`[AssemblyAI] Session started: ${data.id}`);
          setIsAssemblyAISocketOpen(true);
          setAssemblyAIError(null);
          break;

        case "Turn":
          if (!isPaused && data.transcript) {
            const isFormatted = data.turn_is_formatted || false;
            
            if (isFormatted || data.end_of_turn) {
              // This is a final transcript
              const results = convertAssemblyAIToResults(data);
              if (results.length > 0) {
                setFinalTranscript((prevFinal) => {
                  const updatedTranscript = [...prevFinal, ...results];
                  currentSessionTranscript.current = updatedTranscript
                    .map(result => result.alternatives?.[0]?.content || "")
                    .join(" ");
                  return updatedTranscript;
                });
              }
              setActivePartialSegment([]); // Clear partial segment
            } else {
              // This is a partial transcript
              const results = convertAssemblyAIToResults(data);
              setActivePartialSegment(results);
            }
          }
          break;

        case "Termination":
          console.log(`[AssemblyAI] Session terminated: ${data.audio_duration_seconds}s`);
          setIsAssemblyAISocketOpen(false);
          // Finalize any remaining partial segments
          setFinalTranscript((prevFinal) => {
            const currentActivePartial = activePartialSegmentRef.current;
            if (currentActivePartial.length > 0) {
              const updatedTranscript = [...prevFinal, ...currentActivePartial];
              setActivePartialSegment([]);
              return updatedTranscript;
            }
            return prevFinal;
          });
          break;

        case "Error":
          console.error(`[AssemblyAI] Error: ${data.code} - ${data.reason}`);
          setAssemblyAIError(`AssemblyAI API Error: ${data.code} - ${data.reason}`);
          setIsAssemblyAISocketOpen(false);
          break;

        default:
          console.warn("[AssemblyAI] Unhandled message type:", data.type);
          break;
      }
    } catch (error) {
      console.error("[AssemblyAI] Error parsing message:", error);
      setAssemblyAIError("Error parsing AssemblyAI message");
    }
  }, [isPausedRef, convertAssemblyAIToResults]);

  const handleWebSocketOpen = useCallback(() => {
    console.log("[AssemblyAI] WebSocket connection opened");
    setIsAssemblyAISocketOpen(true);
    setAssemblyAIError(null);
  }, []);

  const handleWebSocketClose = useCallback((event: CloseEvent) => {
    console.log(`[AssemblyAI] WebSocket connection closed: ${event.code} ${event.reason}`);
    setIsAssemblyAISocketOpen(false);
  }, []);

  const handleWebSocketError = useCallback((event: Event) => {
    console.error("[AssemblyAI] WebSocket error:", event);
    setAssemblyAIError("AssemblyAI WebSocket connection error");
    setIsAssemblyAISocketOpen(false);
  }, []);

  // --- Exposed Control Functions ---
  const setSavedTranscript = useCallback((savedData: AssemblyAIResult[]) => {
    console.log("[AssemblyAI] Loading saved transcript data:", savedData.length, "items");
    setFinalTranscript(savedData);
    setActivePartialSegment([]);
    currentSessionTranscript.current = savedData
      .map(result => result.alternatives?.[0]?.content || "")
      .join(" ");
  }, []);

  const startAssemblyAI = useCallback(async () => {
    setAssemblyAIError(null);
    // Only reset finalTranscript if it's empty (no saved data)
    setFinalTranscript((prev) => (prev.length > 0 ? prev : []));
    setActivePartialSegment([]);
    setIsAssemblyAISocketOpen(false);
    currentSessionTranscript.current = "";

    try {
      // Get authentication token from backend
      const token = await fetchAssemblyAIToken();

      // Build connection parameters according to AssemblyAI docs
      const connectionParams = new URLSearchParams({
        token: token,
        sample_rate: "16000",
        encoding: "pcm_s16le", // Required parameter for AssemblyAI
        format_turns: "true",
      });

      // Connect directly to AssemblyAI with token in URL
      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?${connectionParams.toString()}`;
      console.log("[AssemblyAI] Connecting to:", wsUrl);
      
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.binaryType = "arraybuffer";

      websocketRef.current.onopen = (event) => {
        console.log("[AssemblyAI] WebSocket opened");
        handleWebSocketOpen();
      };
      
      websocketRef.current.onmessage = handleWebSocketMessage;
      websocketRef.current.onclose = handleWebSocketClose;
      websocketRef.current.onerror = handleWebSocketError;

      // Wait for connection to be established
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          setAssemblyAIError("Connection timeout");
          resolve(false);
        }, 10000);

        const checkConnection = () => {
          if (websocketRef.current?.readyState === WebSocket.OPEN) {
            clearTimeout(timeout);
            resolve(true);
          } else if (websocketRef.current?.readyState === WebSocket.CLOSED) {
            clearTimeout(timeout);
            resolve(false);
          } else {
            setTimeout(checkConnection, 100);
          }
        };

        checkConnection();
      });
    } catch (error: any) {
      console.error("Error starting AssemblyAI:", error);
      setAssemblyAIError(error.message || "Failed to start AssemblyAI");
      return false;
    }
  }, [handleWebSocketMessage, handleWebSocketOpen, handleWebSocketClose, handleWebSocketError]);

  const sendAssemblyAIAudio = useCallback((audioData: ArrayBuffer) => {
    if (
      websocketRef.current &&
      websocketRef.current.readyState === WebSocket.OPEN &&
      audioData.byteLength > 0
    ) {
      try {
        websocketRef.current.send(audioData);
      } catch (error: any) {
        console.error("[AssemblyAI] Error sending audio:", error);
        setAssemblyAIError(`Error sending audio to AssemblyAI: ${error.message || "Unknown error"}`);
      }
    }
  }, []);

  const stopAssemblyAI = useCallback(async (sendTerminationCmd: boolean) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN && sendTerminationCmd) {
      try {
        const terminateMessage = { type: "Terminate" };
        websocketRef.current.send(JSON.stringify(terminateMessage));
        console.log("[AssemblyAI] Sent termination message");
      } catch (error) {
        console.error("[AssemblyAI] Error sending termination message:", error);
        setAssemblyAIError("Error stopping AssemblyAI");
      }
    }

    // Finalize any remaining partial segments
    if (sendTerminationCmd) {
      setFinalTranscript((prevFinal) => {
        const currentActivePartial = activePartialSegmentRef.current;
        if (currentActivePartial.length > 0) {
          const updatedTranscript = [...prevFinal, ...currentActivePartial];
          setActivePartialSegment([]);
          return updatedTranscript;
        }
        return prevFinal;
      });
    }

    // Close the WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  // --- Lifecycle Effect for Cleanup ---
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        console.log("[AssemblyAI] Cleaning up WebSocket connection on unmount");
        if (websocketRef.current.readyState === WebSocket.OPEN) {
          const terminateMessage = { type: "Terminate" };
          try {
            websocketRef.current.send(JSON.stringify(terminateMessage));
          } catch (error) {
            console.warn("AssemblyAI termination on unmount cleanup failed:", error);
          }
        }
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, []);

  // --- Return Value ---
  return {
    assemblyAIResults: {
      activePartialSegment,
      finalTranscript,
    },
    assemblyAIError,
    isAssemblyAISocketOpen,
    startAssemblyAI,
    stopAssemblyAI,
    sendAssemblyAIAudio,
    setSavedTranscript,
  };
};