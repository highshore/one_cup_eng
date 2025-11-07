import { useState, useRef, useEffect, useCallback } from "react";
import { RealtimeClient } from "@speechmatics/real-time-client";

// Interfaces for Speechmatics data structures
export interface SpeechmaticsAlternative {
  content: string;
  confidence?: number;
  speaker?: string; // e.g., "S1", "S2", "UU"
}

export interface SpeechmaticsResult {
  alternatives?: SpeechmaticsAlternative[];
  start_time?: number;
  end_time?: number;
  type?: string; // e.g., "word", "punctuation"
}

export interface SpeechmaticsMessage {
  message: string; // e.g., "AddPartialTranscript", "AddTranscript", "EndOfTranscript", "Error"
  results?: SpeechmaticsResult[];
  code?: number;
  reason?: string;
}

// Speechmatics API Key from environment variables
const API_KEY = process.env.NEXT_PUBLIC_SPEECHMATICS_API_KEY;

/**
 * Fetches a temporary JWT from Speechmatics for real-time API access.
 * @returns {Promise<string>} A promise that resolves to the JWT key value.
 * @throws Will throw an error if the API key is not set or if the fetch fails.
 */
async function fetchJWT(): Promise<string> {
  if (!API_KEY) {
    throw new Error(
      "Speechmatics API key is not set (NEXT_PUBLIC_SPEECHMATICS_API_KEY)."
    );
  }
  const resp = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ ttl: 3600 }), // Token Time-To-Live: 1 hour
  });
  if (!resp.ok) {
    const errorBody = await resp.text();
    throw new Error(
      `Failed to fetch Speechmatics JWT: ${resp.status} ${errorBody}`
    );
  }
  const data = await resp.json();
  return data.key_value;
}

/**
 * Custom React Hook for managing Speechmatics real-time transcription.
 *
 * @param isPausedRef - Optional ref to track pause state for filtering incoming data
 * @returns An object containing:
 *  - `speechmaticsResults`: { activePartialSegment, finalTranscript }
 *  - `speechmaticsError`: Any error message from the Speechmatics service (null if no error).
 *  - `isSpeechmaticsSocketOpen`: Boolean indicating if the WebSocket is currently open.
 *  - `startSpeechmatics`: Async function to initialize and start the Speechmatics client.
 *  - `stopSpeechmatics`: Async function to stop the Speechmatics client.
 *  - `sendSpeechmaticsAudio`: Function to send an audio chunk (ArrayBuffer) to Speechmatics.
 */
export const useSpeechmatics = (isPausedRef?: React.RefObject<boolean>) => {
  // --- State ---
  const [activePartialSegment, setActivePartialSegment] = useState<
    SpeechmaticsResult[]
  >([]);
  const [finalTranscript, setFinalTranscript] = useState<SpeechmaticsResult[]>(
    []
  );
  const [speechmaticsError, setSpeechmaticsError] = useState<string | null>(
    null
  );
  const [isSpeechmaticsSocketOpen, setIsSpeechmaticsSocketOpen] =
    useState(false);

  // --- Refs ---
  // Ref for the Speechmatics RealtimeClient instance
  const clientRef = useRef<RealtimeClient | null>(null);
  // Ref to track the latest socket state for use in callbacks without causing re-renders/re-callbacks
  const isSocketOpenRef = useRef(isSpeechmaticsSocketOpen);
  // Ref to track the latest activePartialSegment for use in EndOfTranscript handling
  const activePartialSegmentRef = useRef(activePartialSegment);

  // --- Effects to keep refs in sync ---
  useEffect(() => {
    isSocketOpenRef.current = isSpeechmaticsSocketOpen;
  }, [isSpeechmaticsSocketOpen]);

  useEffect(() => {
    activePartialSegmentRef.current = activePartialSegment;
  }, [activePartialSegment]);

  // --- Internal Event Handlers for Speechmatics Client ---
  const handleReceivedMessage = useCallback(
    (data: SpeechmaticsMessage) => {
      // console.log("[SpeechmaticsService] Received message:", JSON.stringify(data, null, 2));

      // Drop data when paused (but keep speechmatics running)
      const isPaused = isPausedRef?.current;

      switch (data.message) {
        case "RecognitionStarted":
          setIsSpeechmaticsSocketOpen(true);
          break;
        case "AddPartialTranscript":
          // Only update partial transcripts when not paused
          if (!isPaused) {
            setActivePartialSegment(data.results || []);
          }
          break;
        case "AddTranscript": {
          // Only add final transcripts when not paused
          if (!isPaused) {
            const finalizedResults = data.results || [];
            if (finalizedResults.length > 0) {
              setFinalTranscript((prevFinal) => {
                const updatedFullTranscript = [
                  ...prevFinal,
                  ...finalizedResults,
                ];
                return updatedFullTranscript;
              });
            }
            setActivePartialSegment([]); // Clear partial segment as it's now final
          }
          break;
        }
        case "EndOfTranscript":
          setFinalTranscript((prevFinal) => {
            const currentActivePartial = activePartialSegmentRef.current;
            if (currentActivePartial.length > 0) {
              const updatedFullTranscript = [
                ...prevFinal,
                ...currentActivePartial,
              ];

              setActivePartialSegment([]); // Clear partial segment
              return updatedFullTranscript;
            }
            return prevFinal;
          });
          // The socket usually closes after EndOfTranscript.
          // isSpeechmaticsSocketOpen will be updated by handleSocketStateChange.
          break;
        case "Error":
          setSpeechmaticsError(
            `Speechmatics API Error: ${data.code} - ${data.reason}`
          );
          setIsSpeechmaticsSocketOpen(false); // Error usually implies socket closure
          break;
        default:
          // console.warn("[SpeechmaticsService] Unhandled message type:", data.message);
          break;
      }
    },
    [isPausedRef]
  ); // Callbacks use refs for pause state and stable state setters.

  const handleSocketStateChange = useCallback((eventData: unknown) => {
    const actualState = (
      eventData as { socketState: string; [key: string]: any }
    ).socketState;
    // console.log("[SpeechmaticsService] socketStateChange: actualState is '", actualState, "'.");

    switch (actualState) {
      case "open":
        setIsSpeechmaticsSocketOpen(true);
        setSpeechmaticsError(null); // Clear any previous connection errors
        break;
      case "closed":
        setIsSpeechmaticsSocketOpen(false);
        // Parent component can check `isSpeechmaticsSocketOpen` against its own `isRecording` state
        // to determine if the closure was unexpected.
        break;
      case "error":
        setIsSpeechmaticsSocketOpen(false);
        setSpeechmaticsError(
          "Speechmatics WebSocket connection error. Check console."
        );
        break;
      case "connecting":
        setIsSpeechmaticsSocketOpen(false); // Not truly open yet
        break;
      default:
        // console.warn("[SpeechmaticsService] Unhandled socketState:", actualState);
        setIsSpeechmaticsSocketOpen(false);
        break;
    }
  }, []); // Depends only on stable state setters.

  // --- Exposed Control Functions ---
  const setSavedTranscript = useCallback((savedData: SpeechmaticsResult[]) => {
    console.log(
      "[SpeechmaticsService] Loading saved transcript data:",
      savedData.length,
      "items"
    );
    setFinalTranscript(savedData);
    setActivePartialSegment([]); // Clear any partial segments when loading saved data
  }, []);

  const startSpeechmatics = useCallback(
    async (
      customDictionary?: Array<{ content: string; sounds_like?: string[] }>
    ) => {
      // Don't reset finalTranscript if we have saved data - we want to continue from where we left off
      setSpeechmaticsError(null);
      // Only reset finalTranscript if it's empty (no saved data)
      setFinalTranscript((prev) => (prev.length > 0 ? prev : []));
      setActivePartialSegment([]);
      setIsSpeechmaticsSocketOpen(false);

      try {
        const jwt = await fetchJWT();
        clientRef.current = new RealtimeClient();

        clientRef.current.addEventListener(
          "receiveMessage",
          ({ data }: { data: unknown }) =>
            handleReceivedMessage(data as SpeechmaticsMessage)
        );
        clientRef.current.addEventListener(
          "socketStateChange",
          handleSocketStateChange
        );

        const transcriptionConfig: any = {
          language: "en",
          diarization: "speaker",
          // channel_diarization_labels: ["Agent", "Caller"],
          operating_point: "enhanced",
          max_delay_mode: "flexible",
          enable_partials: true,
          enable_entities: true, // Can be useful for context
          output_locale: "en-US",
          transcript_filtering_config: {
            remove_disfluencies: true, // Removes fillers like "um", "uh"
          },
          speaker_diarization_config: {
            max_speakers: 8,
            speaker_sensitivity: 0.8, // Increased from default 0.5 for better speaker detection
          },
        };

        // Add custom dictionary if provided
        if (customDictionary && customDictionary.length > 0) {
          transcriptionConfig.additional_vocab = customDictionary;
          console.log(
            "[Speechmatics] Custom dictionary being sent:",
            JSON.stringify(customDictionary, null, 2)
          );
        } else {
          console.log("[Speechmatics] No custom dictionary provided");
        }

        console.log(
          "[Speechmatics] Full transcription config:",
          JSON.stringify(transcriptionConfig, null, 2)
        );

        await clientRef.current.start(jwt, {
          transcription_config: transcriptionConfig,
          audio_format: {
            type: "raw",
            encoding: "pcm_f32le",
            sample_rate: 16000,
          },
        });
        // isSpeechmaticsSocketOpen will be set to true by handleReceivedMessage (RecognitionStarted)
        // or handleSocketStateChange (open event).
        return true; // Indicate success
      } catch (err: any) {
        console.error("Error starting Speechmatics:", err);
        setSpeechmaticsError(err.message || "Failed to start Speechmatics.");
        return false; // Indicate failure
      }
    },
    [handleReceivedMessage, handleSocketStateChange]
  ); // Depends on stable callbacks.

  const sendSpeechmaticsAudio = useCallback((audioData: ArrayBuffer) => {
    if (
      clientRef.current &&
      isSocketOpenRef.current && // Use ref for the latest socket state
      audioData.byteLength > 0
    ) {
      try {
        clientRef.current.sendAudio(audioData);
      } catch (e: any) {
        // console.error("[SpeechmaticsService] Error sending audio:", e);
        setSpeechmaticsError(
          `Error sending audio to Speechmatics: ${e.message || "Unknown error"}`
        );
        // Depending on the error, might need to signal to stop or handle differently.
      }
    }
  }, []); // Uses refs and stable state setters.

  const stopSpeechmatics = useCallback(async (sendEndOfStreamCmd: boolean) => {
    if (clientRef.current && isSocketOpenRef.current && sendEndOfStreamCmd) {
      try {
        // console.log("[SpeechmaticsService] Calling stopRecognition.");
        await clientRef.current.stopRecognition(); // This should trigger EndOfTranscript and socket closure.
      } catch (e) {
        // console.error("[SpeechmaticsService] Error calling stopRecognition:", e);
        setSpeechmaticsError("Error stopping Speechmatics recognition.");
      }
    }

    // If stopRecognition is called, EndOfTranscript should handle final accuracy.
    // However, if called to abort (e.g. sendEndOfStreamCmd=false or due to an error before EndOfTranscript),
    // or if EndOfTranscript wasn't received for some reason, this provides a fallback.
    if (sendEndOfStreamCmd) {
      setFinalTranscript((prevFinal) => {
        // Access current active partial segment via ref for this final calculation if needed
        const currentActivePartial = activePartialSegmentRef.current;
        let fullTranscriptForCalc = prevFinal;
        if (currentActivePartial.length > 0) {
          fullTranscriptForCalc = [...prevFinal, ...currentActivePartial];
          setActivePartialSegment([]); // Clear it as we're stopping
        }
        return fullTranscriptForCalc; // Ensure finalTranscript state is comprehensively updated
      });
    }
    // Do not directly set setIsSpeechmaticsSocketOpen(false) here;
    // let the "closed" event from handleSocketStateChange manage this state for consistency.
  }, []); // Uses refs and stable state setters.

  // --- Lifecycle Effect for Cleanup ---
  useEffect(() => {
    const currentClient = clientRef.current;
    return () => {
      if (currentClient) {
        // console.log("[SpeechmaticsService] Cleaning up Speechmatics client on unmount.");
        // If the socket is still open and stopRecognition hasn't been called explicitly,
        // attempt to stop it to gracefully close the connection.
        if (isSocketOpenRef.current) {
          currentClient
            .stopRecognition()
            .catch((e) =>
              console.warn(
                "Speechmatics stopRecognition on unmount cleanup failed:",
                e
              )
            );
        }
        // RealtimeClient might not have an explicit general "close" or "removeAllListeners" method.
        // stopRecognition is the primary way to signal end of session. Event listeners
        // are typically managed by the lifecycle of the client instance itself.
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount.

  // --- Return Value ---
  return {
    speechmaticsResults: {
      activePartialSegment,
      finalTranscript,
    },
    speechmaticsError,
    isSpeechmaticsSocketOpen,
    startSpeechmatics,
    stopSpeechmatics,
    sendSpeechmaticsAudio,
    setSavedTranscript,
  };
};
