import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { RealtimeClient } from "@speechmatics/real-time-client";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

// Interfaces for Speechmatics data structures
interface SpeechmaticsAlternative {
  content: string;
  confidence?: number;
}

interface SpeechmaticsResult {
  alternatives?: SpeechmaticsAlternative[];
  start_time?: number;
  end_time?: number;
  type?: string; // e.g., "word", "punctuation"
}

interface SpeechmaticsMessage {
  message: string; // e.g., "AddPartialTranscript", "AddTranscript", "EndOfTranscript", "Error"
  results?: SpeechmaticsResult[];
  // Fields for "Error" message type from Speechmatics service
  code?: number;
  reason?: string;
  // Add other potential fields based on documentation or observed data
}

const ShadowContainer = styled.div`
  padding: 20px;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`;

const Title = styled.h1`
  color: #333;
`;

const Input = styled.input`
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 80%;
  max-width: 500px;
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    background-color: #ccc;
  }
  &:hover:not(:disabled) {
    background-color: #0056b3;
  }
`;

const TranscriptArea = styled.div`
  width: 80%;
  max-width: 500px;
  min-height: 100px;
  border: 1px solid #eee;
  padding: 15px;
  background-color: #f9f9f9;
  white-space: pre-wrap;
  text-align: left;
  border-radius: 4px;
`;

const AzureResultsBox = styled(TranscriptArea)`
  margin-top: 20px;
  border-color: #0078d4; // Azure blue
`;

const AzureScoreArea = styled.div`
  font-size: 16px;
  margin-top: 10px;
  p {
    margin: 5px 0;
  }
`;

const ScoreArea = styled.div`
  font-size: 18px;
  font-weight: bold;
`;

const ErrorMessage = styled.p`
  color: red;
`;

const ShadowPage: React.FC = () => {
  const [targetSentence, setTargetSentence] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [activePartialSegment, setActivePartialSegment] = useState<
    SpeechmaticsResult[]
  >([]);
  const [finalTranscript, setFinalTranscript] = useState<SpeechmaticsResult[]>(
    []
  );
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const isSocketOpenRef = useRef(isSocketOpen);

  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null); // For playing back recorded audio
  const recordedAudioChunksRef = useRef<Float32Array[]>([]); // To store raw audio chunks

  // Azure specific state
  const [azureRecognizer, setAzureRecognizer] =
    useState<SpeechSDK.SpeechRecognizer | null>(null);
  const azurePushStreamRef = useRef<SpeechSDK.PushAudioInputStream | null>(
    null
  );
  const [azurePronunciationResult, setAzurePronunciationResult] = useState<
    any | null
  >(null);
  const [azureRecognizedText, setAzureRecognizedText] = useState<string>("");
  const [azureError, setAzureError] = useState<string | null>(null);

  const clientRef = useRef<RealtimeClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY;
  const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_PRIMARY_KEY;
  const AZURE_SPEECH_REGION = "koreacentral"; // As provided by user

  useEffect(() => {
    isSocketOpenRef.current = isSocketOpen;
  }, [isSocketOpen]);

  useEffect(() => {
    // Cleanup object URL when component unmounts or URL changes
    let currentUrl = recordedAudioUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [recordedAudioUrl]);

  useEffect(() => {
    return () => {
      stopRecordingInternal(false); // Ensure this is called with false to prevent recursive stop commands initially
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch(console.warn);
      }
      // Clean up Azure recognizer on unmount
      if (azureRecognizer) {
        console.log("[Cleanup] Closing Azure Recognizer on unmount.");
        azureRecognizer.close();
        setAzureRecognizer(null);
      }
      if (azurePushStreamRef.current) {
        console.log("[Cleanup] Closing Azure PushStream on unmount.");
        azurePushStreamRef.current.close();
        azurePushStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Add azureRecognizer to dependency array if its direct manipulation outside useEffect causes issues

  async function fetchJWT(): Promise<string> {
    if (!API_KEY) {
      throw new Error(
        "Speechmatics API key is not set (VITE_SPEECHMATICS_API_KEY)."
      );
    }
    const resp = await fetch(
      "https://mp.speechmatics.com/v1/api_keys?type=rt",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ ttl: 3600 }),
      }
    );
    if (!resp.ok) {
      const errorBody = await resp.text();
      throw new Error(`Failed to fetch JWT: ${resp.status} ${errorBody}`);
    }
    const data = await resp.json();
    return data.key_value;
  }

  const calculateAccuracy = (
    target: string,
    transcribedResults: SpeechmaticsResult[]
  ): number => {
    if (!target.trim() || transcribedResults.length === 0) return 0;
    const targetWords = target
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .split(/\s+/)
      .filter(Boolean);
    // Extract content from transcribedResults, filtering out any non-word types if necessary, though Speechmatics usually handles this.
    const transcribedWords = transcribedResults
      .filter(
        (r) => r.type === "word" && r.alternatives && r.alternatives.length > 0
      )
      .map((r) =>
        r.alternatives![0].content.toLowerCase().replace(/[^\w\s]/gi, "")
      )
      .filter(Boolean);

    if (transcribedWords.length === 0) return 0;

    let correctWords = 0;
    const minLength = Math.min(targetWords.length, transcribedWords.length);
    for (let i = 0; i < minLength; i++) {
      if (targetWords[i] === transcribedWords[i]) correctWords++;
    }
    return targetWords.length > 0
      ? (correctWords / targetWords.length) * 100
      : 0;
  };

  const handleReceivedMessage = (data: SpeechmaticsMessage) => {
    // console.log("[Speechmatics] Received message:", JSON.stringify(data, null, 2));

    if (data.message === "RecognitionStarted") {
      // console.log("[Speechmatics] RecognitionStarted received. Setting socket to open.");
      setIsSocketOpen(true);
    } else if (data.message === "AddPartialTranscript") {
      const newPartialResults = data.results || [];
      setActivePartialSegment(newPartialResults);
      // console.log("[Speechmatics] Updated active partial segment with:", newPartialResults.length, "results");
    } else if (data.message === "AddTranscript") {
      const finalizedResults = data.results || [];
      if (finalizedResults.length > 0) {
        setFinalTranscript((prevFinal) => [...prevFinal, ...finalizedResults]);
        const updatedFullTranscriptResults = [
          ...finalTranscript,
          ...finalizedResults,
        ];
        setAccuracyScore(
          calculateAccuracy(targetSentence, updatedFullTranscriptResults)
        );
      }
      setActivePartialSegment([]); // Clear active partial as it's now final
      // console.log("[Speechmatics] Finalized segment. Added:", finalizedResults.length, "results to final transcript.");
    } else if (data.message === "EndOfTranscript") {
      // console.log("EndOfTranscript received");
      const currentFinalTranscript = finalTranscript;
      const currentActivePartialSegment = activePartialSegment;

      if (currentActivePartialSegment.length > 0) {
        const updatedFullTranscriptResults = [
          ...currentFinalTranscript,
          ...currentActivePartialSegment,
        ];
        setFinalTranscript(updatedFullTranscriptResults);
        setAccuracyScore(
          calculateAccuracy(targetSentence, updatedFullTranscriptResults)
        );
        setActivePartialSegment([]);
        // console.log("[Speechmatics] EndOfTranscript: Moved", currentActivePartialSegment.length, "active partial results to final.");
      } else if (currentFinalTranscript.length > 0) {
        setAccuracyScore(
          calculateAccuracy(targetSentence, currentFinalTranscript)
        );
      }
    } else if (data.message === "Error") {
      // console.error("Speechmatics Service Error:", data);
      setError(`API Error: ${data.code} - ${data.reason}`);
      stopRecordingInternal(false);
    }
  };

  const handleSocketStateChange = (eventData: unknown) => {
    const actualState = (
      eventData as { socketState: string; [key: string]: any }
    ).socketState;
    // console.log("[Speechmatics] socketStateChange: actualState is '", actualState, "'. Raw eventData:", JSON.stringify(eventData, null, 2));

    if (actualState === "open") {
      setIsSocketOpen(true);
      // console.log("Speechmatics WebSocket OPENED (via socketStateChange).");
    } else if (actualState === "closed") {
      setIsSocketOpen(false);
      // console.log("Speechmatics WebSocket CLOSED.", (eventData as any).event);
      if (isRecording) {
        setError("WebSocket closed unexpectedly.");
        setIsRecording(false);
      }
    } else if (actualState === "error") {
      setIsSocketOpen(false);
      // console.error("Speechmatics WebSocket ERROR.", (eventData as any).event);
      setError("WebSocket connection error. See console.");
      setIsRecording(false);
    } else if (actualState === "connecting") {
      // console.log("Speechmatics WebSocket is CONNECTING...");
      setIsSocketOpen(false);
    } else {
      // console.warn("[Speechmatics] Unhandled socketState:", actualState, "Raw eventData:", eventData);
      setIsSocketOpen(false);
    }
  };

  // Helper function to convert Float32Array PCM data to WAV Blob
  function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    const numChannels = 1;
    const bitDepth = 16; // Convert Float32 to Int16 for WAV

    writeString(0, "RIFF"); // RIFF identifier
    view.setUint32(4, 36 + samples.length * 2, true); // RIFF chunk length
    writeString(8, "WAVE"); // WAVE identifier
    writeString(12, "fmt "); // fmt sub-chunk identifier
    view.setUint32(16, 16, true); // fmt chunk length
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // Byte rate
    view.setUint16(32, numChannels * (bitDepth / 8), true); // Block align
    view.setUint16(34, bitDepth, true); // Bits per sample
    writeString(36, "data"); // data sub-chunk identifier
    view.setUint32(40, samples.length * 2, true); // data chunk length

    // Convert Float32 samples to Int16
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
  }

  // Helper function to convert Float32Array PCM data to Int16Array ArrayBuffer
  function convertFloat32ToInt16(buffer: ArrayBuffer): ArrayBuffer {
    const l = buffer.byteLength / 4; // Float32 is 4 bytes
    const output = new Int16Array(l);
    const input = new Float32Array(buffer);
    for (let i = 0; i < l; i++) {
      output[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff; // Convert to 16-bit PCM
    }
    return output.buffer;
  }

  const startRecording = async () => {
    if (!targetSentence.trim()) {
      setError("Please enter target sentence.");
      return;
    }
    setError(null);
    setAzureError(null);
    setFinalTranscript([]);
    setActivePartialSegment([]);
    setAccuracyScore(null);
    setAzurePronunciationResult(null);
    setAzureRecognizedText("");
    setIsRecording(true);
    recordedAudioChunksRef.current = []; // Clear previous audio chunks
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl); // Revoke old URL
    }
    setRecordedAudioUrl(null); // Clear previous audio URL

    try {
      // Speechmatics setup
      const jwt = await fetchJWT();
      clientRef.current = new RealtimeClient();

      clientRef.current.addEventListener(
        "receiveMessage",
        ({ data }: { data: unknown }) =>
          handleReceivedMessage(data as SpeechmaticsMessage)
      );
      clientRef.current.addEventListener(
        "socketStateChange",
        (eventData: unknown) => {
          // console.log("[Speechmatics] Raw socketStateChange eventData:", JSON.stringify(eventData, null, 2));
          handleSocketStateChange(eventData);
        }
      );

      // The 'open' state will be handled by socketStateChange
      // 'error' and 'close' also via socketStateChange

      await clientRef.current.start(jwt, {
        transcription_config: {
          language: "en",
          diarization: "none",
          operating_point: "enhanced",
          max_delay_mode: "flexible",
          max_delay: 0.7,
          enable_partials: true,
          enable_entities: true,
          output_locale: "en-US",
          transcript_filtering_config: {
            remove_disfluencies: true,
          },
        },
        audio_format: {
          type: "raw",
          encoding: "pcm_f32le",
          sample_rate: 16000,
        },
      });
      // console.log("[AudioSetup] Speechmatics client started with updated config (disfluency removal, en-US). Waiting for socket open.");

      // Azure Speech SDK setup
      if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
        setAzureError("Azure Speech Key or Region is not configured.");
        console.error("Azure Speech Key or Region is not configured.");
      } else {
        try {
          console.log("[Azure] Setting up Azure Speech SDK...");
          const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
            AZURE_SPEECH_KEY,
            AZURE_SPEECH_REGION
          );
          speechConfig.speechRecognitionLanguage = "en-US";

          // Re-create push stream for each recording session
          if (azurePushStreamRef.current) azurePushStreamRef.current.close(); // Close if existing from previous run
          azurePushStreamRef.current =
            SpeechSDK.AudioInputStream.createPushStream(
              SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1) // 16kHz, 16-bit, mono
            );
          const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(
            azurePushStreamRef.current
          );

          const pronunciationAssessmentConfig =
            new SpeechSDK.PronunciationAssessmentConfig(
              targetSentence,
              SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
              SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
              true // enableMiscue
            );
          pronunciationAssessmentConfig.enableProsodyAssessment = true; // Optionally enable prosody

          // Close existing recognizer if any before creating a new one
          if (azureRecognizer) {
            azureRecognizer.close();
          }
          const recognizer = new SpeechSDK.SpeechRecognizer(
            speechConfig,
            audioConfig
          );
          pronunciationAssessmentConfig.applyTo(recognizer);

          recognizer.recognizing = (
            _s: SpeechSDK.Recognizer,
            _e: SpeechSDK.SpeechRecognitionEventArgs
          ) => {
            // console.log(`[Azure] RECOGNIZING: Text=${e.result.text}`);
          };

          recognizer.recognized = (
            _s: SpeechSDK.Recognizer,
            e: SpeechSDK.SpeechRecognitionEventArgs
          ) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
              console.log(`[Azure] RECOGNIZED: Text=${e.result.text}`);
              setAzureRecognizedText(
                (prev) => prev + (prev ? " " : "") + e.result.text
              );
              const pronAssessmentResultJson = e.result.properties.getProperty(
                SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
              );
              if (pronAssessmentResultJson) {
                console.log(
                  "[Azure] Pronunciation Assessment JSON:",
                  pronAssessmentResultJson
                );
                const result = JSON.parse(pronAssessmentResultJson);
                setAzurePronunciationResult(result); // This will be the full result including NBest
              }
            } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
              console.log("[Azure] NOMATCH: Speech could not be recognized.");
            }
          };

          recognizer.canceled = (
            _s: SpeechSDK.Recognizer,
            e: SpeechSDK.SpeechRecognitionCanceledEventArgs
          ) => {
            console.error(`[Azure] CANCELED: Reason=${e.reason}`);
            if (e.reason === SpeechSDK.CancellationReason.Error) {
              console.error(`[Azure] CANCELED: ErrorCode=${e.errorCode}`);
              console.error(`[Azure] CANCELED: ErrorDetails=${e.errorDetails}`);
              setAzureError(`Azure CANCELED: ${e.errorDetails}`);
            }
            // recognizer.stopContinuousRecognitionAsync(); // Should be handled by sessionStopped
          };

          recognizer.sessionStarted = (
            _s: SpeechSDK.Recognizer,
            _e: SpeechSDK.SessionEventArgs
          ) => {
            console.log("[Azure] Session STARTED");
          };

          recognizer.sessionStopped = (
            _s: SpeechSDK.Recognizer,
            _e: SpeechSDK.SessionEventArgs
          ) => {
            console.log("[Azure] Session STOPPED");
            // No need to call stopContinuousRecognitionAsync here, as it's the event indicating it has stopped.
            if (azurePushStreamRef.current) {
              console.log("[Azure] Closing push stream on session stop.");
              azurePushStreamRef.current.close();
            }
            // Don't nullify azureRecognizer here, allow explicit stop or unmount to handle it.
          };

          recognizer.startContinuousRecognitionAsync(
            () => {
              console.log(
                "[Azure] Continuous recognition successfully started."
              );
            },
            (err: string) => {
              console.error(
                `[Azure] Error starting Azure continuous recognition: ${err}`
              );
              setAzureError(`Azure SDK Error starting recognition: ${err}`);
              if (recognizer) recognizer.close();
              setAzureRecognizer(null);
              if (azurePushStreamRef.current)
                azurePushStreamRef.current.close();
            }
          );
          setAzureRecognizer(recognizer);
          console.log(
            "[Azure] Azure Recognizer instance created and recognition started."
          );
        } catch (azureErr: any) {
          console.error("Error setting up Azure Speech SDK:", azureErr);
          setAzureError(
            azureErr.message || "Failed to initialize Azure SDK. See console."
          );
        }
      }

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      // console.log("[AudioSetup] AudioContext created, requested 16000Hz, actual state:", audioContextRef.current.state, "actual sampleRate:", audioContextRef.current.sampleRate);

      // console.log("[AudioSetup] Attempting to add AudioWorklet module from /audio-processor.js");
      await audioContextRef.current.audioWorklet.addModule(
        "/audio-processor.js"
      );
      // console.log("[AudioSetup] AudioWorklet module added.");

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      // console.log("[AudioSetup] MediaStream obtained from microphone.");

      microphoneSourceRef.current =
        audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      // console.log("[AudioSetup] MediaStreamAudioSourceNode created.");

      audioWorkletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "audio-processor",
        {
          processorOptions: { sampleRate: audioContextRef.current.sampleRate },
        }
      );
      // console.log("[AudioSetup] AudioWorkletNode created.");

      audioWorkletNodeRef.current.port.onmessage = (
        event: MessageEvent<ArrayBuffer>
      ) => {
        const dataIsArrayBuffer = event.data instanceof ArrayBuffer;
        const bufferByteLength = dataIsArrayBuffer ? event.data.byteLength : 0;

        // Store a copy of the audio data for playback
        // The audio data from worklet is Float32Array
        if (dataIsArrayBuffer && bufferByteLength > 0) {
          const float32Data = new Float32Array(event.data.slice(0)); // Important to slice to make a copy
          recordedAudioChunksRef.current.push(float32Data);

          // Push to Azure stream if available and recognizer is active
          if (azurePushStreamRef.current && azureRecognizer && isRecording) {
            // check isRecording
            try {
              const int16Buffer = convertFloat32ToInt16(event.data.slice(0)); // Convert a copy
              azurePushStreamRef.current.write(int16Buffer);
            } catch (azurePushError: any) {
              console.error(
                "[AudioWorklet] Error pushing audio to Azure:",
                azurePushError
              );
              // Only set error if it's a critical push error, e.g. stream closed unexpectedly
              // if (azurePushError.message.includes("closed")) {
              //   setAzureError("Azure audio stream closed unexpectedly.");
              // }
            }
          }
        }

        // console.log(
        //   `[AudioWorklet] port.onmessage. client: ${!!clientRef.current}, socketOpenRef: ${isSocketOpenRef.current}, isBuffer: ${dataIsArrayBuffer}, length: ${bufferByteLength}`
        // );

        if (
          clientRef.current &&
          isSocketOpenRef.current &&
          dataIsArrayBuffer &&
          bufferByteLength > 0
        ) {
          // console.log(`[AudioWorklet] Attempting to send audio data chunk, size: ${bufferByteLength}`);
          try {
            clientRef.current.sendAudio(new Uint8Array(event.data));
            // console.log(`[AudioWorklet] Successfully called sendAudio.`); // Optional: too verbose if successful
          } catch (e: any) {
            // console.error("[AudioWorklet] Error calling sendAudio:", e);
            setError(`Error sending audio: ${e.message || "Unknown error"}`);
            // Consider implications for isRecording state here if errors are persistent
          }
        } else {
          // let reason = "[AudioWorklet] Not sending audio because:";
          // if (!clientRef.current) reason += " clientRef.current is not set;";
          // if (!isSocketOpenRef.current) reason += " isSocketOpenRef.current is false;";
          // if (!dataIsArrayBuffer) reason += " data is not an ArrayBuffer;";
          // if (dataIsArrayBuffer && bufferByteLength === 0) reason += " ArrayBuffer length is 0;";
          // console.log(reason);
        }
      };
      microphoneSourceRef.current.connect(audioWorkletNodeRef.current);
    } catch (err: any) {
      console.error("Error starting recording:", err);
      setError(err.message || "Failed to start. See console.");
      await stopRecordingInternal(false);
    }
  };

  const stopRecordingInternal = async (sendEndOfStreamCmd: boolean) => {
    if (clientRef.current && isSocketOpen && sendEndOfStreamCmd) {
      try {
        await clientRef.current.stopRecognition();
        // console.log("stopRecognition called for Speechmatics.");
      } catch (e) {
        // console.error("Error calling stopRecognition for Speechmatics:", e);
      }
    }

    // Stop Azure recognition
    if (azureRecognizer && sendEndOfStreamCmd) {
      // only if sendEndOfStreamCmd is true
      console.log("[Azure] Attempting to stop Azure recognizer...");
      azureRecognizer.stopContinuousRecognitionAsync(
        () => {
          console.log(
            "[Azure] Continuous recognition stopped command sent successfully."
          );
          // The sessionStopped event will handle stream closing and other cleanup.
        },
        (err: string) => {
          console.error(
            `[Azure] Error sending stop continuous recognition command: ${err}`
          );
          // If stopping fails, we might need to manually close resources
          if (azurePushStreamRef.current) azurePushStreamRef.current.close();
          if (azureRecognizer) azureRecognizer.close(); // Force close if stop command fails
          setAzureRecognizer(null);
        }
      );
    } else if (!sendEndOfStreamCmd && azureRecognizer) {
      console.log(
        "[Azure] stopRecordingInternal called with sendEndOfStreamCmd=false, Azure recognizer might still be active."
      );
    }

    // If not sending EndOfStream (e.g. due to Speechmatics EndOfTranscript or error),
    // Azure might still be running. User initiated stop (`handleStopRecording`) should handle Azure too.

    // Note: stopRecognition for Speechmatics should trigger EndOfTranscript and socket closure.
    // Actual client closure and resource cleanup should ideally happen upon 'socketStateChange' -> 'closed'.

    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.onmessage = null;
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (microphoneSourceRef.current) {
      microphoneSourceRef.current.disconnect();
      microphoneSourceRef.current = null;
    }
    // Don't stop mediaStream tracks here if Azure might still need them, or if stop is only for Speechmatics.
    // Let user-initiated full stop or component unmount handle global media stream track stopping.
    // if (mediaStreamRef.current && sendEndOfStreamCmd) { // Only stop tracks on explicit full stop
    //   mediaStreamRef.current.getTracks().forEach(track => track.stop());
    //   mediaStreamRef.current = null;
    // }
    if (
      audioContextRef.current &&
      audioContextRef.current.state !== "closed" &&
      sendEndOfStreamCmd
    ) {
      // only on full stop
      try {
        await audioContextRef.current.close();
      } catch (e) {
        console.warn("Error closing AudioContext:", e);
      }
      audioContextRef.current = null;
    }

    // Process recorded audio chunks to create a playable WAV file
    // This should probably happen only on a full stop (sendEndOfStreamCmd = true)
    if (sendEndOfStreamCmd && recordedAudioChunksRef.current.length > 0) {
      const totalLength = recordedAudioChunksRef.current.reduce(
        (acc, val) => acc + val.length,
        0
      );
      const concatenatedPcm = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of recordedAudioChunksRef.current) {
        concatenatedPcm.set(chunk, offset);
        offset += chunk.length;
      }

      // Assuming audioContextRef.current.sampleRate was 16000Hz, or use a fixed value if sure
      const sampleRate = 16000; // Use the sample rate we configured
      const wavBlob = encodeWAV(concatenatedPcm, sampleRate);
      const url = URL.createObjectURL(wavBlob);
      setRecordedAudioUrl(url);
      recordedAudioChunksRef.current = []; // Clear chunks after processing
    }

    setIsSocketOpen(false); // Reflect that we've initiated stop or it has closed (for Speechmatics)
    if (sendEndOfStreamCmd) {
      // Only set global isRecording to false on a full stop action
      setIsRecording(false);
    }

    if (finalTranscript.length > 0 && targetSentence) {
      setAccuracyScore(calculateAccuracy(targetSentence, finalTranscript));
    }
    // Azure results are updated via its 'recognized' event handler and set directly to state.
    // No specific action needed here for Azure scores unless re-calculation is needed post-stop.
  };

  const handleStopRecording = async () => {
    setIsRecording(false); // Immediately update UI to reflect stopping intention
    await stopRecordingInternal(true); // True indicates a user-initiated full stop
    // Clean up media stream tracks and audio context as this is a full stop
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        await audioContextRef.current.close();
      } catch (e) {
        console.warn("Error closing AudioContext on explicit stop:", e);
      }
      audioContextRef.current = null;
    }
  };

  // Function to get color based on confidence score
  const getConfidenceColor = (confidence?: number): string => {
    if (confidence === undefined) return "black"; // Default for words without confidence (e.g. punctuation)
    if (confidence >= 0.9) return "green";
    if (confidence >= 0.7) return "orange";
    return "red";
  };

  return (
    <ShadowContainer>
      <Title>Pronunciation Accuracy</Title>
      <Input
        type="text"
        value={targetSentence}
        onChange={(e) => setTargetSentence(e.target.value)}
        placeholder="Enter target sentence here"
        disabled={isRecording}
      />
      {!isRecording ? (
        <Button
          onClick={startRecording}
          disabled={!targetSentence.trim() || isRecording}
        >
          Start Recording
        </Button>
      ) : (
        <Button onClick={handleStopRecording} disabled={!isRecording}>
          Stop Recording
        </Button>
      )}
      {recordedAudioUrl && (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <audio controls src={recordedAudioUrl}>
            Your browser does not support the audio element.
          </audio>
          {/* <Button onClick={() => {
            const audioElement = document.querySelector("audio");
            if (audioElement) audioElement.play();
          }}>Replay Recording</Button> */}
        </div>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <TranscriptArea>
        <strong>Live Transcript (Speechmatics):</strong>
        <p>
          {[...finalTranscript, ...activePartialSegment].map(
            (result, index) => {
              if (!result.alternatives || result.alternatives.length === 0) {
                return null; // Should not happen with valid results
              }
              const mainAlternative = result.alternatives[0];
              // Add a space after each word, unless it's followed by punctuation that attaches to it.
              // This is a simplified approach; Speechmatics results can have `attaches_to: "previous" for punctuation.
              // For now, we will just add a space.
              const wordContent = mainAlternative.content;
              let displayContent = wordContent;

              // Check if next element is punctuation that attaches to previous, to avoid double spacing or space before punctuation.
              // This is a more complex formatting rule that depends on the structure of Speechmatics results
              // and how it handles spaces around punctuation. For simplicity now, always add a space, then trim.

              return (
                <span
                  key={`${result.start_time}-${index}`}
                  style={{
                    color: getConfidenceColor(mainAlternative.confidence),
                  }}
                >
                  {displayContent}
                  {result.type === "word" ? " " : ""}
                </span>
              );
            }
          )}
          {[...finalTranscript, ...activePartialSegment].length === 0 && "-"}
        </p>
      </TranscriptArea>
      {accuracyScore !== null && (
        <ScoreArea>
          Accuracy (Speechmatics): {accuracyScore.toFixed(2)}%
        </ScoreArea>
      )}

      {/* Microsoft Azure Box */}
      <AzureResultsBox>
        <strong>Microsoft Azure Pronunciation Assessment:</strong>
        {azureError && <ErrorMessage>Azure Error: {azureError}</ErrorMessage>}
        <p>Recognized Text (Azure): {azureRecognizedText || "-"}</p>
        {azurePronunciationResult && (
          <AzureScoreArea>
            <p>
              Pronunciation Score:{" "}
              {azurePronunciationResult.PronScore?.toFixed(1)}
            </p>
            <p>
              Accuracy Score:{" "}
              {azurePronunciationResult.AccuracyScore?.toFixed(1)}
            </p>
            <p>
              Fluency Score: {azurePronunciationResult.FluencyScore?.toFixed(1)}
            </p>
            <p>
              Completeness Score:{" "}
              {azurePronunciationResult.CompletenessScore?.toFixed(1)}
            </p>
            {/* Optional: Detailed word-level feedback can be added here */}
            {azurePronunciationResult.Words &&
              azurePronunciationResult.Words.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <p>
                    <strong>Word Details (Azure):</strong>
                  </p>
                  {azurePronunciationResult.Words.map(
                    (word: any, index: number) => (
                      <span
                        key={index}
                        style={{
                          color:
                            word.PronunciationAssessment?.ErrorType === "None"
                              ? "green"
                              : word.PronunciationAssessment?.ErrorType ===
                                "Mispronunciation"
                              ? "orange"
                              : "red",
                          marginRight: "5px",
                          display: "inline-block", // Ensures proper spacing and layout
                        }}
                      >
                        {word.Word} (
                        {word.PronunciationAssessment?.AccuracyScore?.toFixed(
                          0
                        )}
                        )
                      </span>
                    )
                  )}
                </div>
              )}
          </AzureScoreArea>
        )}
        {isRecording && !azurePronunciationResult && !azureError && (
          <p>Processing audio with Azure...</p>
        )}
        {!isRecording &&
          !azurePronunciationResult &&
          !azureError &&
          !azureRecognizedText &&
          targetSentence && (
            <p>
              Recording stopped. Waiting for final Azure assessment if
              applicable.
            </p>
          )}
        {!isRecording &&
          !azurePronunciationResult &&
          !azureError &&
          !azureRecognizedText &&
          !targetSentence && <p>-</p>}
      </AzureResultsBox>
    </ShadowContainer>
  );
};

export default ShadowPage;
