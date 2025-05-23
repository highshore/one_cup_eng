import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { RealtimeClient } from "@speechmatics/real-time-client";

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
  const [activePartialSegment, setActivePartialSegment] = useState<SpeechmaticsResult[]>([]);
  const [finalTranscript, setFinalTranscript] = useState<SpeechmaticsResult[]>([]);
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const isSocketOpenRef = useRef(isSocketOpen);

  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null); // For playing back recorded audio
  const recordedAudioChunksRef = useRef<Float32Array[]>([]); // To store raw audio chunks

  const clientRef = useRef<RealtimeClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const API_KEY = import.meta.env.VITE_SPEECHMATICS_API_KEY;

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
      stopRecordingInternal(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.warn);
      }
    };
  }, []);

  async function fetchJWT(): Promise<string> {
    if (!API_KEY) {
      throw new Error("Speechmatics API key is not set (VITE_SPEECHMATICS_API_KEY).");
    }
    const resp = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ ttl: 3600 }),
    });
    if (!resp.ok) {
      const errorBody = await resp.text();
      throw new Error(`Failed to fetch JWT: ${resp.status} ${errorBody}`);
    }
    const data = await resp.json();
    return data.key_value;
  }

  const calculateAccuracy = (target: string, transcribedResults: SpeechmaticsResult[]): number => {
    if (!target.trim() || transcribedResults.length === 0) return 0;
    const targetWords = target.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(Boolean);
    // Extract content from transcribedResults, filtering out any non-word types if necessary, though Speechmatics usually handles this.
    const transcribedWords = transcribedResults
      .filter(r => r.type === "word" && r.alternatives && r.alternatives.length > 0)
      .map(r => r.alternatives![0].content.toLowerCase().replace(/[^\w\s]/gi, ''))
      .filter(Boolean);

    if (transcribedWords.length === 0) return 0;

    let correctWords = 0;
    const minLength = Math.min(targetWords.length, transcribedWords.length);
    for (let i = 0; i < minLength; i++) {
      if (targetWords[i] === transcribedWords[i]) correctWords++;
    }
    return targetWords.length > 0 ? (correctWords / targetWords.length) * 100 : 0;
  };

  const handleReceivedMessage = (data: SpeechmaticsMessage) => {
    console.log("[Speechmatics] Received message:", JSON.stringify(data, null, 2));

    if (data.message === "RecognitionStarted") {
      console.log("[Speechmatics] RecognitionStarted received. Setting socket to open.");
      setIsSocketOpen(true);
    } else if (data.message === "AddPartialTranscript") {
      const newPartialResults = data.results || [];
      setActivePartialSegment(newPartialResults);
      console.log("[Speechmatics] Updated active partial segment with:", newPartialResults.length, "results");
    } else if (data.message === "AddTranscript") {
      const finalizedResults = data.results || [];
      if (finalizedResults.length > 0) {
        setFinalTranscript(prevFinal => [...prevFinal, ...finalizedResults]);
        // Accuracy is now calculated based on the updated finalTranscript array
        // Need to ensure we use the most up-to-date finalTranscript for calculation.
        // Since setState is async, construct the new full transcript for calculation.
        const updatedFullTranscriptResults = [...finalTranscript, ...finalizedResults];
        setAccuracyScore(calculateAccuracy(targetSentence, updatedFullTranscriptResults));
      }
      setActivePartialSegment([]); // Clear active partial as it's now final
      console.log("[Speechmatics] Finalized segment. Added:", finalizedResults.length, "results to final transcript.");
    } else if (data.message === "EndOfTranscript") {
      console.log("EndOfTranscript received");
      // If there's any remaining activePartialSegment, consider it final.
      if (activePartialSegment.length > 0) {
        const updatedFullTranscriptResults = [...finalTranscript, ...activePartialSegment];
        setFinalTranscript(updatedFullTranscriptResults);
        setAccuracyScore(calculateAccuracy(targetSentence, updatedFullTranscriptResults));
        setActivePartialSegment([]);
        console.log("[Speechmatics] EndOfTranscript: Moved", activePartialSegment.length, "active partial results to final.");
      }
      stopRecordingInternal(false); 
    } else if (data.message === "Error") {
      console.error("Speechmatics Service Error:", data);
      setError(`API Error: ${data.code} - ${data.reason}`);
      stopRecordingInternal(false);
    }
  };

  const handleSocketStateChange = (eventData: unknown) => {
    const actualState = (eventData as { socketState: string; [key: string]: any }).socketState;
    console.log("[Speechmatics] socketStateChange: actualState is '", actualState, "'. Raw eventData:", JSON.stringify(eventData, null, 2));

    if (actualState === 'open') {
        setIsSocketOpen(true); 
        console.log("Speechmatics WebSocket OPENED (via socketStateChange).");
    } else if (actualState === 'closed') {
        setIsSocketOpen(false);
        console.log("Speechmatics WebSocket CLOSED.", (eventData as any).event);
        if(isRecording) {
            setError("WebSocket closed unexpectedly.");
            setIsRecording(false);
        }
    } else if (actualState === 'error') {
        setIsSocketOpen(false);
        console.error("Speechmatics WebSocket ERROR.", (eventData as any).event);
        setError("WebSocket connection error. See console.");
        setIsRecording(false);
    } else if (actualState === 'connecting') {
        console.log("Speechmatics WebSocket is CONNECTING...");
        setIsSocketOpen(false);
    } else {
      // This case should ideally not be hit if socketState is always one of the above
      console.warn("[Speechmatics] Unhandled socketState:", actualState, "Raw eventData:", eventData);
      setIsSocketOpen(false); // Default to not open for unknown states
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

  const startRecording = async () => {
    if (!targetSentence.trim()) {
      setError("Please enter target sentence.");
      return;
    }
    setError(null);
    setFinalTranscript([]);
    setActivePartialSegment([]);
    setAccuracyScore(null);
    setIsRecording(true);
    recordedAudioChunksRef.current = []; // Clear previous audio chunks
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl); // Revoke old URL
    }
    setRecordedAudioUrl(null); // Clear previous audio URL

    try {
      const jwt = await fetchJWT();
      clientRef.current = new RealtimeClient();
      
      clientRef.current.addEventListener("receiveMessage", 
        ({ data }: { data: unknown }) => handleReceivedMessage(data as SpeechmaticsMessage)
      );
      clientRef.current.addEventListener("socketStateChange", 
        (eventData: unknown) => {
          console.log("[Speechmatics] Raw socketStateChange eventData:", JSON.stringify(eventData, null, 2));
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
            remove_disfluencies: true
          }
        },
        audio_format: { type: "raw", encoding: "pcm_f32le", sample_rate: 16000 },
      });
      console.log("[AudioSetup] Speechmatics client started with updated config (disfluency removal, en-US). Waiting for socket open.");
      
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      console.log("[AudioSetup] AudioContext created, requested 16000Hz, actual state:", audioContextRef.current.state, "actual sampleRate:", audioContextRef.current.sampleRate);
      
      console.log("[AudioSetup] Attempting to add AudioWorklet module from /audio-processor.js");
      await audioContextRef.current.audioWorklet.addModule("/audio-processor.js");
      console.log("[AudioSetup] AudioWorklet module added.");
      
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[AudioSetup] MediaStream obtained from microphone.");
      
      microphoneSourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      console.log("[AudioSetup] MediaStreamAudioSourceNode created.");
      
      audioWorkletNodeRef.current = new AudioWorkletNode(audioContextRef.current, "audio-processor", {
         processorOptions: { sampleRate: audioContextRef.current.sampleRate }
      });
      console.log("[AudioSetup] AudioWorkletNode created.");

      audioWorkletNodeRef.current.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const dataIsArrayBuffer = event.data instanceof ArrayBuffer;
        const bufferByteLength = dataIsArrayBuffer ? event.data.byteLength : 0;

        // Store a copy of the audio data for playback
        // The audio data from worklet is Float32Array
        if (dataIsArrayBuffer && bufferByteLength > 0) {
            const float32Data = new Float32Array(event.data.slice(0)); // Important to slice to make a copy
            recordedAudioChunksRef.current.push(float32Data);
        }

        console.log(
          `[AudioWorklet] port.onmessage. client: ${!!clientRef.current}, socketOpenRef: ${isSocketOpenRef.current}, isBuffer: ${dataIsArrayBuffer}, length: ${bufferByteLength}`
        );

        if (clientRef.current && isSocketOpenRef.current && dataIsArrayBuffer && bufferByteLength > 0) {
          console.log(`[AudioWorklet] Attempting to send audio data chunk, size: ${bufferByteLength}`);
          try {
            clientRef.current.sendAudio(new Uint8Array(event.data));
            // console.log(`[AudioWorklet] Successfully called sendAudio.`); // Optional: too verbose if successful
          } catch (e: any) {
            console.error("[AudioWorklet] Error calling sendAudio:", e);
            setError(`Error sending audio: ${e.message || "Unknown error"}`);
            // Consider implications for isRecording state here if errors are persistent
          }
        } else {
          let reason = "[AudioWorklet] Not sending audio because:";
          if (!clientRef.current) reason += " clientRef.current is not set;";
          if (!isSocketOpenRef.current) reason += " isSocketOpenRef.current is false;";
          if (!dataIsArrayBuffer) reason += " data is not an ArrayBuffer;";
          if (dataIsArrayBuffer && bufferByteLength === 0) reason += " ArrayBuffer length is 0;";
          console.log(reason);
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
        console.log("stopRecognition called.");
      } catch (e) {
        console.error("Error calling stopRecognition:", e);
      }
    }
    // Note: stopRecognition should trigger EndOfTranscript and socket closure.
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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
            await audioContextRef.current.close();
        } catch (e) { console.warn("Error closing AudioContext:", e); }
        audioContextRef.current = null;
    }
    
    // Process recorded audio chunks to create a playable WAV file
    if (recordedAudioChunksRef.current.length > 0) {
      const totalLength = recordedAudioChunksRef.current.reduce((acc, val) => acc + val.length, 0);
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

    setIsSocketOpen(false); // Reflect that we've initiated stop or it has closed
    setIsRecording(false);
    if (finalTranscript.length > 0 && targetSentence) {
         setAccuracyScore(calculateAccuracy(targetSentence, finalTranscript));
    }
  };

  const handleStopRecording = async () => {
    await stopRecordingInternal(true);
  };

  // Function to get color based on confidence score
  const getConfidenceColor = (confidence?: number): string => {
    if (confidence === undefined) return 'black'; // Default for words without confidence (e.g. punctuation)
    if (confidence >= 0.9) return 'green';
    if (confidence >= 0.7) return 'orange';
    return 'red';
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
        <Button onClick={startRecording} disabled={!targetSentence.trim() || isRecording }>
          Start Recording
        </Button>
      ) : (
        <Button onClick={handleStopRecording} disabled={!isRecording}>
          Stop Recording
        </Button>
      )}
      {recordedAudioUrl && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
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
        <strong>Live Transcript:</strong>
        <p>
          {[...finalTranscript, ...activePartialSegment].map((result, index) => {
            if (!result.alternatives || result.alternatives.length === 0) {
              return null; // Should not happen with valid results
            }
            const mainAlternative = result.alternatives[0];
            // Add a space after each word, unless it's followed by punctuation that attaches to it.
            // This is a simplified approach; Speechmatics results can have `attaches_to: "previous"` for punctuation.
            // For now, we will just add a space.
            const wordContent = mainAlternative.content;
            let displayContent = wordContent;

            // Check if next element is punctuation that attaches to previous, to avoid double spacing or space before punctuation.
            // This is a more complex formatting rule that depends on the structure of Speechmatics results
            // and how it handles spaces around punctuation. For simplicity now, always add a space, then trim.

            return (
              <span key={`${result.start_time}-${index}`} style={{ color: getConfidenceColor(mainAlternative.confidence) }}>
                {displayContent}{result.type === 'word' ? ' ' : ''}
              </span>
            );
          })}
          {([...finalTranscript, ...activePartialSegment].length === 0) && "-"}
        </p>
      </TranscriptArea>
      {accuracyScore !== null && (
        <ScoreArea>
          Accuracy: {accuracyScore.toFixed(2)}%
        </ScoreArea>
      )}
    </ShadowContainer>
  );
};

export default ShadowPage;
