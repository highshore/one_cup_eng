import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

// Interface for Azure Phoneme-level Pronunciation Result
interface AzurePhonemePronunciationResult {
  Phoneme?: string;
  PronunciationAssessment?: {
    AccuracyScore?: number;
  };
}

// Interface for Azure Syllable-level Pronunciation Result
interface AzureSyllablePronunciationResult {
  Syllable: string; // The phonemic representation of the syllable
  Grapheme?: string; // The written representation of the syllable
  PronunciationAssessment?: {
    AccuracyScore?: number;
  };
  Phonemes?: AzurePhonemePronunciationResult[];
}

// Interface for Azure Word-level Pronunciation Result
interface AzureWordPronunciationResult {
  Word: string;
  PronunciationAssessment?: {
    ErrorType?: string;
    AccuracyScore?: number;
  };
  Syllables?: AzureSyllablePronunciationResult[];
  Phonemes?: AzurePhonemePronunciationResult[];
  // Offset and Duration can be added if needed for other UI features later
  // Offset?: number;
  // Duration?: number;
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

const AzureDetailTable = styled.table`
  width: 100%;
  margin-top: 10px;
  border-collapse: collapse;
  font-size: 0.9em;
  th,
  td {
    border: 1px solid #ddd;
    padding: 4px;
    text-align: left;
  }
  th {
    background-color: #f2f2f2;
  }
`;

const AzureScoreArea = styled.div`
  font-size: 16px;
  margin-top: 10px;
  p {
    margin: 5px 0;
  }
`;

const ColorCodedSentence = styled.div`
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  line-height: 2;
  font-size: 18px;
`;

const SyllableSpan = styled.span<{ color: string }>`
  color: ${(props) => props.color};
  font-weight: 500;
  padding: 2px 4px;
  border-radius: 3px;
  margin: 0 2px;
  background-color: ${(props) => {
    switch (props.color) {
      case "green":
        return "#e6f4ea";
      case "orange":
        return "#fef3c7";
      case "red":
        return "#fee2e2";
      default:
        return "transparent";
    }
  }};
`;

const ErrorMessage = styled.p`
  color: red;
`;

const ShadowPage: React.FC = () => {
  const [targetSentence, setTargetSentence] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);

  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const recordedAudioChunksRef = useRef<Float32Array[]>([]);

  const [azureRecognizer, setAzureRecognizer] =
    useState<SpeechSDK.SpeechRecognizer | null>(null);
  const azurePushStreamRef = useRef<SpeechSDK.PushAudioInputStream | null>(
    null
  );
  const [azurePronunciationResult, setAzurePronunciationResult] =
    useState<SpeechSDK.PronunciationAssessmentResult | null>(null);
  const [azureRecognizedText, setAzureRecognizedText] = useState<string>("");
  const [azureError, setAzureError] = useState<string | null>(null);
  const [azureRawJson, setAzureRawJson] = useState<string | null>(null);

  const azureRecognizerRef = useRef(azureRecognizer);
  const isRecordingRef = useRef(isRecording);

  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_PRIMARY_KEY;
  const AZURE_SPEECH_REGION = "koreacentral";

  useEffect(() => {
    azureRecognizerRef.current = azureRecognizer;
  }, [azureRecognizer]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    let currentUrl = recordedAudioUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [recordedAudioUrl]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch(console.warn);
      }
      if (azureRecognizerRef.current) {
        console.log("[Cleanup] Closing Azure Recognizer on unmount.");
        azureRecognizerRef.current.close();
      }
      if (azurePushStreamRef.current) {
        console.log("[Cleanup] Closing Azure PushStream on unmount.");
        azurePushStreamRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    if (!targetSentence.trim()) {
      setOverallError("Please enter target sentence.");
      return;
    }
    setOverallError(null);
    setAzureError(null);
    setAzurePronunciationResult(null);
    setAzureRecognizedText("");
    setAzureRawJson(null);
    setIsRecording(true);
    recordedAudioChunksRef.current = [];
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);

    try {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      await audioContextRef.current.audioWorklet.addModule(
        "/audio-processor.js"
      );

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      microphoneSourceRef.current =
        audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);

      audioWorkletNodeRef.current = new AudioWorkletNode(
        audioContextRef.current,
        "audio-processor",
        {
          processorOptions: { sampleRate: audioContextRef.current.sampleRate },
        }
      );

      audioWorkletNodeRef.current.port.onmessage = (
        event: MessageEvent<ArrayBuffer>
      ) => {
        const dataIsArrayBuffer = event.data instanceof ArrayBuffer;
        const bufferByteLength = dataIsArrayBuffer ? event.data.byteLength : 0;

        if (dataIsArrayBuffer && bufferByteLength > 0) {
          const float32Data = new Float32Array(event.data.slice(0));
          recordedAudioChunksRef.current.push(float32Data);
        }
      };
      microphoneSourceRef.current.connect(audioWorkletNodeRef.current);
    } catch (err: any) {
      console.error("Error starting recording (main function):", err);
      setOverallError(err.message || "Failed to start. See console.");
      await stopRecordingInternal(false);
    }
  };

  const stopRecordingInternal = async (sendEndOfStreamCmd: boolean) => {
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.onmessage = null;
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }
    if (microphoneSourceRef.current) {
      microphoneSourceRef.current.disconnect();
      microphoneSourceRef.current = null;
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state !== "closed" &&
      sendEndOfStreamCmd
    ) {
      try {
        await audioContextRef.current.close();
      } catch (e) {
        console.warn("Error closing AudioContext:", e);
      }
      audioContextRef.current = null;
    }

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

      const sampleRate = 16000;
      const wavBlob = encodeWAV(concatenatedPcm, sampleRate);
      const url = URL.createObjectURL(wavBlob);
      setRecordedAudioUrl(url);
      recordedAudioChunksRef.current = [];
    }

    if (sendEndOfStreamCmd) {
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    await stopRecordingInternal(true);
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

  // Function to get color based on Azure pronunciation score
  const getAzurePronunciationColor = (score?: number): string => {
    if (score === undefined) return "gray";
    if (score >= 80) return "green";
    if (score >= 60) return "orange";
    return "red";
  };

  // Function to render color-coded sentence based on Azure results
  const renderColorCodedSentence = () => {
    if (!azurePronunciationResult?.detailResult?.Words || !targetSentence) {
      return null;
    }

    const words = azurePronunciationResult.detailResult
      .Words as any as AzureWordPronunciationResult[];

    return (
      <ColorCodedSentence>
        <p>
          <strong>Pronunciation Analysis (Color-coded by accuracy):</strong>
        </p>
        <div style={{ marginTop: "10px" }}>
          {words.map((word, wordIndex) => {
            // If word has error type (e.g., omission, insertion), show it differently
            const hasError =
              word.PronunciationAssessment?.ErrorType &&
              word.PronunciationAssessment.ErrorType !== "None";

            return (
              <span key={`color-word-${wordIndex}`}>
                {word.Syllables && word.Syllables.length > 0 ? (
                  word.Syllables.map((syllable, syllableIndex) => (
                    <SyllableSpan
                      key={`syllable-${wordIndex}-${syllableIndex}`}
                      color={getAzurePronunciationColor(
                        syllable.PronunciationAssessment?.AccuracyScore
                      )}
                      title={`Syllable: ${
                        syllable.Syllable || syllable.Grapheme
                      }\nScore: ${
                        syllable.PronunciationAssessment?.AccuracyScore?.toFixed(
                          0
                        ) || "N/A"
                      }`}
                      style={{
                        textDecoration: hasError ? "underline" : "none",
                        fontStyle: hasError ? "italic" : "normal",
                      }}
                    >
                      {syllable.Grapheme || syllable.Syllable}
                    </SyllableSpan>
                  ))
                ) : (
                  <SyllableSpan
                    color={getAzurePronunciationColor(
                      word.PronunciationAssessment?.AccuracyScore
                    )}
                    title={`Word: ${word.Word}\nScore: ${
                      word.PronunciationAssessment?.AccuracyScore?.toFixed(0) ||
                      "N/A"
                    }${
                      hasError
                        ? `\nError: ${word.PronunciationAssessment?.ErrorType}`
                        : ""
                    }`}
                    style={{
                      textDecoration: hasError ? "underline" : "none",
                      fontStyle: hasError ? "italic" : "normal",
                    }}
                  >
                    {word.Word}
                  </SyllableSpan>
                )}
                {wordIndex < words.length - 1 && " "}
              </span>
            );
          })}
        </div>

        {/* Display phoneme-level details if available */}
        {words.some((w) => w.Phonemes && w.Phonemes.length > 0) && (
          <div style={{ marginTop: "15px", fontSize: "14px" }}>
            <p>
              <strong>Phoneme-level breakdown:</strong>
            </p>
            <div style={{ marginTop: "5px" }}>
              {words.map(
                (word, wordIndex) =>
                  word.Phonemes &&
                  word.Phonemes.length > 0 && (
                    <div
                      key={`phoneme-word-${wordIndex}`}
                      style={{ marginBottom: "8px" }}
                    >
                      <span style={{ fontWeight: "500" }}>{word.Word}:</span>{" "}
                      {word.Phonemes.map((phoneme, phonemeIndex) => (
                        <span
                          key={`phoneme-${wordIndex}-${phonemeIndex}`}
                          style={{
                            color: getAzurePronunciationColor(
                              phoneme.PronunciationAssessment?.AccuracyScore
                            ),
                            marginLeft: phonemeIndex > 0 ? "4px" : "8px",
                            fontFamily: "monospace",
                            fontSize: "13px",
                          }}
                          title={`Score: ${
                            phoneme.PronunciationAssessment?.AccuracyScore?.toFixed(
                              0
                            ) || "N/A"
                          }`}
                        >
                          [{phoneme.Phoneme}]
                        </span>
                      ))}
                    </div>
                  )
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: "15px", fontSize: "14px", color: "#666" }}>
          <span style={{ color: "green", fontWeight: "bold" }}>
            ● Excellent (80-100)
          </span>
          <span
            style={{ color: "orange", fontWeight: "bold", marginLeft: "15px" }}
          >
            ● Good (60-79)
          </span>
          <span
            style={{ color: "red", fontWeight: "bold", marginLeft: "15px" }}
          >
            ● Needs Improvement (0-59)
          </span>
        </div>
      </ColorCodedSentence>
    );
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
        </div>
      )}
      {overallError && <ErrorMessage>{overallError}</ErrorMessage>}
      {/* SPEECHMATICS: Remove Speechmatics TranscriptArea by commenting it out fully */}
      {/* 
      <TranscriptArea>
        <strong>Live Transcript (Speechmatics):</strong>
        <p>
          {[...speechmaticsResults.finalTranscript, ...speechmaticsResults.activePartialSegment].map(
            (result, index) => {
              if (!result.alternatives || result.alternatives.length === 0) {
                return null;
              }
              const mainAlternative = result.alternatives[0];
              const wordContent = mainAlternative.content;
              let displayContent = wordContent;

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
          {[...speechmaticsResults.finalTranscript, ...speechmaticsResults.activePartialSegment].length === 0 && "-"}
        </p>
      </TranscriptArea>
      */}
      {/* SPEECHMATICS: Remove Speechmatics ScoreArea by commenting it out fully */}
      {/* 
      {speechmaticsAccuracy !== null && (
        <ScoreArea>
          Accuracy (Speechmatics): {speechmaticsAccuracy.toFixed(2)}%
        </ScoreArea>
      )}
      */}

      {/* Microsoft Azure Box */}
      <AzureResultsBox>
        <strong>Microsoft Azure Pronunciation Assessment:</strong>
        {azureError && <ErrorMessage>Azure Error: {azureError}</ErrorMessage>}

        {/* Display the input sentence */}
        {targetSentence && (
          <div
            style={{
              margin: "10px 0",
              padding: "10px",
              backgroundColor: "#f0f8ff",
              borderRadius: "4px",
            }}
          >
            <strong>Your Input Sentence:</strong>
            <p style={{ marginTop: "5px", fontSize: "16px" }}>
              {targetSentence}
            </p>
          </div>
        )}

        <p>Recognized Text (Azure): {azureRecognizedText || "-"}</p>

        {/* Color-coded sentence display */}
        {renderColorCodedSentence()}

        {azurePronunciationResult && (
          <AzureScoreArea>
            <p>
              Pronunciation Score:{" "}
              {azurePronunciationResult.pronunciationScore?.toFixed(1)}
            </p>
            <p>
              Accuracy Score:{" "}
              {azurePronunciationResult.accuracyScore?.toFixed(1)}
            </p>
            <p>
              Fluency Score: {azurePronunciationResult.fluencyScore?.toFixed(1)}
            </p>
            <p>
              Completeness Score:{" "}
              {azurePronunciationResult.completenessScore?.toFixed(1)}
            </p>
            <p>
              Prosody Score: {azurePronunciationResult.prosodyScore?.toFixed(1)}
            </p>
            {/* Detailed Syllable and Phoneme Table */}
            {azurePronunciationResult.detailResult?.Words &&
              azurePronunciationResult.detailResult.Words.length > 0 && (
                <div style={{ marginTop: "15px" }}>
                  <p>
                    <strong>Syllable & Phoneme Details:</strong>
                  </p>
                  {azurePronunciationResult.detailResult.Words.map(
                    (sdkWord, wordIndex: number) => {
                      const word =
                        sdkWord as any as AzureWordPronunciationResult;
                      console.log(
                        "[UI Render] Word object (after cast):",
                        JSON.stringify(word, null, 2)
                      );
                      return (
                        <div
                          key={`word-detail-${wordIndex}`}
                          style={{ marginBottom: "15px" }}
                        >
                          <h4>Word: {word.Word}</h4>
                          {word.Syllables && word.Syllables.length > 0 ? (
                            <AzureDetailTable>
                              <thead>
                                <tr>
                                  <th>Syllable</th>
                                  <th>Phoneme</th>
                                  <th>Score</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(word.Phonemes as any[])?.map(
                                  (
                                    phoneme: AzurePhonemePronunciationResult,
                                    phonemeIndex: number
                                  ) => (
                                    <tr
                                      key={`word-${wordIndex}-phoneme-${phonemeIndex}`}
                                    >
                                      <td>
                                        {phonemeIndex === 0 &&
                                          word.Syllables &&
                                          word.Syllables.length > 0 &&
                                          (word.Syllables[0].Grapheme ||
                                            word.Syllables[0].Syllable)}
                                      </td>
                                      <td>{phoneme.Phoneme || "N/A"}</td>
                                      <td>
                                        {phoneme.PronunciationAssessment?.AccuracyScore?.toFixed(
                                          0
                                        ) || "-"}
                                      </td>
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </AzureDetailTable>
                          ) : (
                            <p>
                              No syllable or phoneme data available for this
                              word.
                            </p>
                          )}
                        </div>
                      );
                    }
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

        {azureRawJson && (
          <div style={{ marginTop: "15px", textAlign: "left" }}>
            <strong>Raw Azure Response JSON:</strong>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                backgroundColor: "#f0f0f0",
                padding: "10px",
                borderRadius: "4px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {azureRawJson}
            </pre>
          </div>
        )}
      </AzureResultsBox>
    </ShadowContainer>
  );
};

export default ShadowPage;
