import React, { useState, useRef, useEffect, useCallback } from "react";
import styled from "styled-components";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

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

interface VideoTimestamp {
  start: number;
  end: number;
  word: string;
}

interface SentenceForAssessment {
  id: string;
  text: string;
  words: VideoTimestamp[];
  assessmentResult: SpeechSDK.PronunciationAssessmentResult | null;
  recordedSentenceAudioUrl: string | null;
  isAssessing: boolean;
  assessmentError: string | null;
  recognizedText?: string;
  rawJson?: string;
}

// Modern color palette
const colors = {
  primary: "#3c2e26",
  primaryDark: "#2c1810",
  primaryLight: "#5d4037",
  secondary: "#8d6e63",
  accent: "#d4a574",
  success: "#4e7c59",
  warning: "#c17817",
  error: "#a8423f",
  background: "#faf8f6",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  text: {
    primary: "#2c1810",
    secondary: "#3c2e26",
    muted: "#8d6e63",
    inverse: "#ffffff",
  },
  border: {
    light: "#e8ddd4",
    medium: "#d7c7b8",
    dark: "#a69080",
  },
  shadow: {
    sm: "0 1px 3px rgba(44, 24, 16, 0.1), 0 1px 2px rgba(44, 24, 16, 0.06)",
    md: "0 4px 6px rgba(44, 24, 16, 0.07), 0 2px 4px rgba(44, 24, 16, 0.06)",
    lg: "0 10px 15px rgba(44, 24, 16, 0.1), 0 4px 6px rgba(44, 24, 16, 0.05)",
    xl: "0 20px 25px rgba(44, 24, 16, 0.1), 0 10px 10px rgba(44, 24, 16, 0.04)",
  },
};

const ShadowContainer = styled.div`
  width: 100%;
  padding: 2rem 0rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  max-width: 960px;
  margin: 0 auto;
  min-height: 100vh;
`;

const Title = styled.h1`
  color: ${colors.text.primary};
  width: 100%;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(
    135deg,
    ${colors.primary},
    ${colors.primaryLight}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  background: linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark});
  color: ${colors.text.inverse};
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${colors.shadow.sm};
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      ${colors.primaryLight},
      ${colors.accent}
    );
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: ${colors.shadow.lg};

    &::before {
      opacity: 1;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: ${colors.shadow.md};
  }

  &:disabled {
    background: ${colors.border.medium};
    color: ${colors.text.muted};
    cursor: not-allowed;
    transform: none;
    box-shadow: none;

    &::before {
      display: none;
    }
  }

  span {
    position: relative;
    z-index: 1;
  }
`;

const TranscriptArea = styled.div`
  width: 100%;
  min-height: 120px;
  padding: 1.5rem;
  background: ${colors.surface};
  white-space: pre-wrap;
  text-align: left;
  font-size: 0.9rem;
  line-height: 1.6;
  color: ${colors.text.secondary};
  box-shadow: ${colors.shadow.sm};

  &:hover {
    border-color: ${colors.border.medium};
    box-shadow: ${colors.shadow.md};
  }
`;

const AzureResultsBox = styled(TranscriptArea)`
  background: linear-gradient(135deg, ${colors.surface}, ${colors.background});
  border: 1px solid ${colors.primary}33;
  border-left: 4px solid ${colors.primary};
  box-shadow: ${colors.shadow.md};
`;

const AzureScoreArea = styled.div`
  font-size: 0.875rem;
  margin-top: 1rem;
  padding: 1rem;
  background: ${colors.background};
  border-radius: 12px;
  border: 1px solid ${colors.border.light};

  p {
    margin: 0.5rem 0;
    color: ${colors.text.secondary};
    font-weight: 500;
  }
`;

const ColorCodedSentence = styled.div`
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, ${colors.surface}, ${colors.background});
  border-radius: 16px;
  line-height: 2;
  font-size: 1.1rem;
  box-shadow: ${colors.shadow.md};
  border: 1px solid ${colors.border.light};
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${colors.shadow.lg};
  }
`;

const SyllableSpan = styled.span<{
  color: string;
  isOmitted?: boolean;
  isInserted?: boolean;
}>`
  color: ${(props) => {
    if (props.isOmitted) return colors.text.muted;
    switch (props.color) {
      case "green":
        return colors.success;
      case "orange":
        return colors.warning;
      case "red":
        return colors.error;
      default:
        return colors.text.muted;
    }
  }};
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 8px;
  margin: 0 2px;
  background: ${(props) => {
    if (props.isInserted) return `${colors.accent}20`;
    if (props.isOmitted) return `${colors.text.muted}10`;
    switch (props.color) {
      case "green":
        return `${colors.success}15`;
      case "orange":
        return `${colors.warning}15`;
      case "red":
        return `${colors.error}15`;
      default:
        return "transparent";
    }
  }};
  border: 1px solid
    ${(props) => {
      if (props.isInserted) return `${colors.accent}50`;
      if (props.isOmitted) return `${colors.text.muted}30`;
      switch (props.color) {
        case "green":
          return `${colors.success}30`;
        case "orange":
          return `${colors.warning}30`;
        case "red":
          return `${colors.error}30`;
        default:
          return "transparent";
      }
    }};
  transition: all 0.2s ease;
  text-decoration: ${(props) => (props.isOmitted ? "line-through" : "none")};
  font-style: ${(props) => (props.isOmitted ? "italic" : "normal")};
  opacity: ${(props) => (props.isOmitted ? 0.7 : 1)};

  &:hover {
    transform: scale(1.05);
  }
`;

const ErrorMessage = styled.p`
  color: ${colors.error};
  width: 100%;
  text-align: center;
  font-weight: 500;
  padding: 1rem;
  background: ${colors.error}10;
  border: 1px solid ${colors.error}30;
  border-radius: 12px;
  margin: 1rem 0;
  box-shadow: ${colors.shadow.sm};
`;

const TranscriptContainer = styled.div`
  width: 100%;
  margin-top: 1rem;
  background: ${colors.surface};
  border-radius: 20px;
  line-height: 1.8;
  text-align: left;
  padding: 1.5rem;
  box-shadow: ${colors.shadow.sm};
`;

const TranscriptWord = styled.span<{ isActive: boolean }>`
  transition: all 0s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${(props) => (props.isActive ? "#fafa00" : "transparent")};
  color: ${(props) => (props.isActive ? "#000000" : colors.text.secondary)};
  font-weight: ${(props) => (props.isActive ? "400" : "400")};
  cursor: pointer;
  position: relative;
  padding: 0.1em 0.1em; // Added padding for buffer
  border-radius: 4px; // Added border-radius for the active highlight

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: ${colors.primary};
    opacity: 0;
    border-radius: 8px;
    transition: opacity 0.2s ease;
    z-index: -1;
  }

  &:hover {
    &::before {
      opacity: ${(props) => (props.isActive ? "0" : "0.1")};
    }
    transform: ${(props) => (props.isActive ? "none" : "translateY(-1px)")};
  }
`;

const SentenceRow = styled.div`
  padding: 2rem;
  border: 1px solid ${colors.border.light};
  border-radius: 20px;
  background: ${colors.surface};
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: ${colors.shadow.md};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: linear-gradient(180deg, ${colors.primary}, ${colors.accent});
    transition: width 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${colors.shadow.xl};
    border-color: ${colors.primary}30;

    &::before {
      width: 8px;
    }
  }
`;

const SentenceTextDisplay = styled.div`
  font-size: 1.15rem;
  line-height: 1.7;
  margin-bottom: 1rem;
  color: ${colors.text.primary};
  font-weight: 400;
  letter-spacing: 0.01em;
`;

const SentenceControls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

// Add modern YouTube container styling
const VideoContainer = styled.div`
  margin-bottom: 2rem;
  width: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: ${colors.shadow.xl};
  background: linear-gradient(135deg, ${colors.background}, ${colors.surface});
  border: 1px solid ${colors.border.light};
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${colors.shadow.xl}, 0 0 0 1px ${colors.primary}20;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 20px;
  }
`;

// Add loading spinner component
const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid ${colors.border.light};
  border-radius: 50%;
  border-top-color: ${colors.primary};
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Add loading state for page
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid ${colors.border.light};
    border-radius: 50%;
    border-top-color: ${colors.primary};
    animation: spin 1s ease-in-out infinite;
  }

  .text {
    font-size: 1.1rem;
    color: ${colors.text.secondary};
    font-weight: 500;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// Add modern audio controls styling
const AudioControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  audio {
    border-radius: 12px;
    height: 40px;
    background: ${colors.surface};
    border: 1px solid ${colors.border.light};
    box-shadow: ${colors.shadow.sm};

    &::-webkit-media-controls-panel {
      background: ${colors.surface};
      border-radius: 12px;
    }
  }
`;

// Carousel components
const CarouselContainer = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
`;

const CarouselContent = styled.div`
  display: flex;
  width: 100%;
  min-height: 400px;
`;

const CarouselSlide = styled.div<{ isActive: boolean }>`
  width: 100%;
  flex-shrink: 0;
  display: ${(props) => (props.isActive ? "block" : "none")};
  animation: ${(props) => (props.isActive ? "slideIn 0.3s ease-out" : "none")};

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const CarouselNavigation = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1rem; // Reduced from 2rem
  gap: 1rem;
`;

const NavigationButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;

  &:disabled {
    opacity: 0.5;
  }
`;

const ProgressBarContainer = styled.div`
  flex: 1;
  height: 8px;
  background: ${colors.border.light};
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const ProgressBarFill = styled.div<{ progress: number }>`
  height: 100%;
  width: ${(props) => props.progress}%;
  background: linear-gradient(90deg, ${colors.primary}, ${colors.accent});
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 20px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-20px);
    }
    100% {
      transform: translateX(20px);
    }
  }
`;

const ProgressInfo = styled.div`
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: ${colors.text.muted};
  font-weight: 500;
`;

// Step indicator components
const StepProgressContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  // border-radius: 12px;
  // padding: 3rem 3rem;
  // background: ${colors.surface};
  // box-shadow: ${colors.shadow.sm};
`;

const StepItem = styled.div<{ isActive: boolean; isCompleted: boolean }>`
  display: flex;
  align-items: center;
  position: relative;

  &:not(:last-child) {
    margin-right: 2rem;

    &::after {
      content: "";
      position: absolute;
      right: -2rem;
      top: 50%;
      transform: translateY(-50%);
      width: 2rem;
      height: 2px;
      background: ${(props) =>
        props.isCompleted ? colors.primary : colors.border.light};
      transition: background 0.3s ease;
    }
  }
`;

const StepCircle = styled.div<{ isActive: boolean; isCompleted: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  z-index: 1;

  ${(props) => {
    if (props.isActive) {
      return `
        background: linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark});
        color: ${colors.text.inverse};
        box-shadow: ${colors.shadow.md};
        transform: scale(1.1);
      `;
    } else if (props.isCompleted) {
      return `
        background: ${colors.primary};
        color: ${colors.text.inverse};
        &:hover {
          transform: scale(1.05);
          box-shadow: ${colors.shadow.sm};
        }
      `;
    } else {
      return `
        background: ${colors.border.light};
        color: ${colors.text.muted};
        &:hover {
          background: ${colors.border.medium};
        }
      `;
    }
  }}
`;

const StepLabel = styled.div<{ isActive: boolean }>`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: ${(props) => (props.isActive ? colors.primary : colors.text.muted)};
  white-space: nowrap;
  opacity: ${(props) => (props.isActive ? 1 : 0)};
  transition: opacity 0.3s ease;

  ${StepItem}:hover & {
    opacity: 1;
  }
`;

const StepContent = styled.div`
  width: 100%;
  margin-top: 1rem;
`;

const AudioModeToggle = styled(Button)`
  background: ${colors.primaryDark};
  margin-bottom: 1rem;

  &.active {
    background: ${colors.accent};
  }
`;

// Word definition modal components
const DefinitionModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: ${(props) => (props.isOpen ? 1 : 0)};
  visibility: ${(props) => (props.isOpen ? "visible" : "hidden")};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const DefinitionModalContent = styled.div`
  background: ${colors.background};
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  padding: 1.8rem;
  max-width: 90%;
  width: 450px;
  position: relative;
  transform: scale(1);
  transition: transform 0.3s ease;
  border-left: 5px solid ${colors.accent};
  border: 1px solid ${colors.border.light};
  overflow-y: auto;
  max-height: 90vh;

  @media (max-width: 768px) {
    padding: 1.5rem;
    width: 80%;
    max-height: 80vh;
  }

  @media (max-width: 480px) {
    padding: 1.2rem;
    width: 90%;
    max-height: 75vh;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${colors.text.muted};
  cursor: pointer;
  width: 2.1rem; // Explicit width
  height: 2.1rem; // Explicit height, same as width
  padding: 0; // Remove padding, flexbox will center content
  line-height: 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    top: 0.8rem;
    right: 0.8rem;
    width: 2rem; // Adjust size for smaller screens
    height: 2rem; // Adjust size for smaller screens
  }

  &:hover {
    color: ${colors.primary};
    background: ${colors.border.light};
  }
`;

const WordDefinitionTitle = styled.div`
  font-weight: bold;
  color: ${colors.primary};
  margin-bottom: 1rem;
  font-size: 1.5rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid ${colors.border.light};
`;

const WordDefinitionContent = styled.div`
  color: ${colors.text.secondary};
  font-family: "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  line-height: 1.6;
  white-space: pre-line;
  font-size: 1rem;
`;

const LoadingDefinitionContent = styled.div`
  color: ${colors.text.muted};
  font-style: italic;
  padding: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
`;

// Define styled sections for definitions
const DefinitionSection = styled.div`
  margin-bottom: 1.5rem;
`;

const DefinitionLabel = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${colors.primary};
  margin-bottom: 0.5rem;
`;

const Collapsible = styled.details`
  margin-top: 1rem;

  summary {
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    list-style: none;
    margin: 0;
    padding: 0;
    &:hover {
      color: ${colors.primaryDark};
    }
  }

  ul {
    padding-left: 1.2rem;
    margin: 0.5rem 0;
    list-style: disc;
    font-size: 0.9rem;
    color: ${colors.text.secondary};
  }
`;

// Modern status indicators
const StatusIndicator = styled.div<{
  type: "success" | "warning" | "error" | "info";
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 0.5rem;
  border: 1px solid;

  ${(props) => {
    switch (props.type) {
      case "success":
        return `
          background: ${colors.success}10;
          border-color: ${colors.success}30;
          color: ${colors.success};
        `;
      case "warning":
        return `
          background: ${colors.warning}10;
          border-color: ${colors.warning}30;
          color: ${colors.warning};
        `;
      case "error":
        return `
          background: ${colors.error}10;
          border-color: ${colors.error}30;
          color: ${colors.error};
        `;
      case "info":
      default:
        return `
          background: ${colors.primary}10;
          border-color: ${colors.primary}30;
          color: ${colors.primary};
        `;
    }
  }}
`;

const ShadowPage: React.FC = () => {
  const [overallError, setOverallError] = useState<string | null>(null);

  // YouTube Player State
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [youtubeLoading, setYoutubeLoading] = useState<boolean>(true);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Transcript & Sentence Assessment State
  const [videoTimestamps, setVideoTimestamps] = useState<VideoTimestamp[]>([]);
  const [activeTimestampIndex, setActiveTimestampIndex] = useState<
    number | null
  >(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const timeUpdateIntervalRef = useRef<number | null>(null);
  const [sentencesToAssess, setSentencesToAssess] = useState<
    SentenceForAssessment[]
  >([]);
  const [currentRecordingSentenceIndex, setCurrentRecordingSentenceIndex] =
    useState<number | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [audioToAutoplay, setAudioToAutoplay] = useState<number | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [wordDefinitionModal, setWordDefinitionModal] = useState({
    isOpen: false,
    word: "",
    apiData: null as any | null,
    gptDefinition: "", // Added to store Korean definition from GPT
    isLoading: false,
  });

  const recordedAudioChunksRef = useRef<Float32Array[]>([]);

  // Azure SDK state (recognizer and push stream)
  const [azureRecognizer, setAzureRecognizer] =
    useState<SpeechSDK.SpeechRecognizer | null>(null);
  const azurePushStreamRef = useRef<SpeechSDK.PushAudioInputStream | null>(
    null
  );

  // Refs for Azure SDK and recording state
  const azureRecognizerRef = useRef(azureRecognizer);
  const isRecordingRef = useRef(isRecordingActive);

  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_PRIMARY_KEY;
  const AZURE_SPEECH_REGION = "koreacentral";

  // Step definitions
  const steps = [
    { id: 1, name: "스크립트 공부", label: "Script Study" },
    { id: 2, name: "쉐도잉", label: "Shadowing" },
    { id: 3, name: "내재화", label: "Internalization" },
    { id: 4, name: "분석", label: "Analysis" },
  ];

  useEffect(() => {
    azureRecognizerRef.current = azureRecognizer;
  }, [azureRecognizer]);
  useEffect(() => {
    isRecordingRef.current = isRecordingActive;
  }, [isRecordingActive]);

  // Autoplay effect
  useEffect(() => {
    if (audioToAutoplay !== null) {
      const audioElement = document.getElementById(
        `sentence-audio-${audioToAutoplay}`
      ) as HTMLAudioElement;
      if (audioElement) {
        audioElement.play().catch((err) => {
          console.error("Autoplay failed:", err);
        });
      }
      // Reset after attempting to play
      setAudioToAutoplay(null);
    }
  }, [audioToAutoplay]);

  const convertToEmbedUrl = useCallback((url: string): string | null => {
    try {
      const urlObj = new URL(url);
      let videoId: string | null = null;
      if (urlObj.hostname === "youtu.be")
        videoId = urlObj.pathname.substring(1);
      else if (
        urlObj.hostname === "www.youtube.com" ||
        urlObj.hostname === "youtube.com"
      ) {
        if (urlObj.pathname === "/embed") {
          const pathPart = urlObj.pathname.split("/").pop(); // .pop() can return undefined
          videoId = pathPart !== undefined ? pathPart : null; // Explicitly handle undefined
        } else if (urlObj.pathname === "/watch")
          videoId = urlObj.searchParams.get("v");
      }
      if (videoId) {
        const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
        embedUrl.searchParams.set("enablejsapi", "1");
        urlObj.searchParams.forEach((value, key) => {
          const lowerKey = key.toLowerCase();
          if (!["v", "feature", "si", "enablejsapi"].includes(lowerKey))
            embedUrl.searchParams.set(key, value);
        });
        return embedUrl.toString();
      }
      console.warn("Could not extract videoId from URL:", url);
      return null;
    } catch (e) {
      console.error("Error parsing YouTube URL for embed:", e);
      return null;
    }
  }, []);

  useEffect(() => {
    const segmentSentences = (
      timestamps: VideoTimestamp[]
    ): SentenceForAssessment[] => {
      if (!timestamps || timestamps.length === 0) return [];
      const sentences: SentenceForAssessment[] = [];
      let currentSentenceText = "";
      let currentSentenceWords: VideoTimestamp[] = [];
      const sentenceEndPunctuations = [".", "?", "!"];
      timestamps.forEach((ts, index) => {
        currentSentenceText +=
          (currentSentenceWords.length > 0 ? " " : "") + ts.word;
        currentSentenceWords.push(ts);
        const lastChar = ts.word.charAt(ts.word.length - 1);
        const isEndOfSentence = sentenceEndPunctuations.includes(lastChar);
        const isLastTimestamp = index === timestamps.length - 1;
        if (
          (isEndOfSentence && currentSentenceWords.length > 0) ||
          (isLastTimestamp && currentSentenceWords.length > 0)
        ) {
          sentences.push({
            id: `sentence-${sentences.length}-${Date.now()}`,
            text: currentSentenceText.trim(),
            words: [...currentSentenceWords],
            assessmentResult: null,
            recordedSentenceAudioUrl: null,
            isAssessing: false,
            assessmentError: null,
            recognizedText: "",
            rawJson: "",
          });
          currentSentenceText = "";
          currentSentenceWords = [];
        }
      });
      return sentences;
    };
    const fetchYoutubeDataAndSegment = async () => {
      setYoutubeLoading(true);
      setYoutubeError(null);
      setVideoTimestamps([]);
      setSentencesToAssess([]);
      setActiveTimestampIndex(null);
      setIsPlayerReady(false);
      if (
        playerRef.current &&
        typeof playerRef.current.destroy === "function"
      ) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      try {
        const docRef = doc(db, "shadow", "sample");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.youtube_url) {
            const embedUrl = convertToEmbedUrl(data.youtube_url as string);
            if (embedUrl) setYoutubeUrl(embedUrl);
            else setYoutubeError("Invalid YouTube URL in Firestore.");
          } else
            setYoutubeError(
              "youtube_url field not found in Firestore document."
            );
          if (
            data &&
            data.audio_timestamps &&
            Array.isArray(data.audio_timestamps)
          ) {
            const ts = (data.audio_timestamps as VideoTimestamp[]).sort(
              (a, b) => a.start - b.start
            );
            setVideoTimestamps(ts);
            setSentencesToAssess(segmentSentences(ts));
          } else {
            setVideoTimestamps([]);
            setSentencesToAssess([]);
            console.warn(
              "audio_timestamps not found or not an array in Firestore."
            );
          }
        } else setYoutubeError("Firestore document 'shadow/sample' not found.");
      } catch (error: any) {
        console.error("Firestore fetch error:", error);
        setYoutubeError(`Firestore Error: ${error.message}`);
      } finally {
        setYoutubeLoading(false);
      }
    };
    fetchYoutubeDataAndSegment();
    return () => {
      if (timeUpdateIntervalRef.current)
        clearInterval(timeUpdateIntervalRef.current);
    };
  }, [convertToEmbedUrl]);

  useEffect(() => {
    if (!youtubeUrl || youtubeLoading || youtubeError) {
      if (
        playerRef.current &&
        typeof playerRef.current.destroy === "function"
      ) {
        playerRef.current.destroy();
        playerRef.current = null;
        setIsPlayerReady(false);
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      return;
    }

    const manageTimeUpdates = () => {
      if (
        !playerRef.current ||
        typeof playerRef.current.getCurrentTime !== "function" ||
        videoTimestamps.length === 0
      )
        return;
      const currentTime = playerRef.current.getCurrentTime();
      let newActiveIndex: number | null = null;
      // Find the first timestamp that matches the current time
      for (let i = 0; i < videoTimestamps.length; i++) {
        if (
          currentTime >= videoTimestamps[i].start &&
          currentTime <= videoTimestamps[i].end
        ) {
          newActiveIndex = i;
          break;
        }
      }

      if (activeTimestampIndex !== newActiveIndex) {
        // Check if update is needed
        setActiveTimestampIndex(newActiveIndex);
        if (newActiveIndex !== null && transcriptContainerRef.current) {
          const activeWordElement = transcriptContainerRef.current.children[
            newActiveIndex
          ] as HTMLElement;
          if (activeWordElement) {
            activeWordElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }
        }
      }
    };

    const onPlayerReady = () => {
      setIsPlayerReady(true);
    };

    const onPlayerStateChange = (event: any) => {
      if (event.data === (window as any).YT.PlayerState.PLAYING) {
        if (timeUpdateIntervalRef.current)
          clearInterval(timeUpdateIntervalRef.current);
        // Only start interval if there are timestamps to sync with
        if (videoTimestamps.length > 0) {
          timeUpdateIntervalRef.current = window.setInterval(
            manageTimeUpdates,
            250
          ); // Check time frequently
        }
      } else {
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
          timeUpdateIntervalRef.current = null;
        }
        if (
          event.data === (window as any).YT.PlayerState.PAUSED ||
          event.data === (window as any).YT.PlayerState.ENDED
        ) {
          if (videoTimestamps.length > 0) manageTimeUpdates();
        }
      }
    };

    const initializePlayer = () => {
      if (playerRef.current && typeof playerRef.current.destroy === "function")
        playerRef.current.destroy();
      playerRef.current = new (window as any).YT.Player(
        "youtube-player-iframe",
        {
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        }
      );
    };

    if (!(window as any).YT || !(window as any).YT.Player) {
      (window as any).onYouTubeIframeAPIReady = initializePlayer;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode)
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      else document.head.appendChild(tag);
    } else {
      if (document.getElementById("youtube-player-iframe")) initializePlayer();
    }

    return () => {
      delete (window as any).onYouTubeIframeAPIReady;
      if (playerRef.current && typeof playerRef.current.destroy === "function")
        playerRef.current.destroy();
      playerRef.current = null;
      setIsPlayerReady(false);
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    };
  }, [youtubeUrl, youtubeLoading, youtubeError, videoTimestamps.length]);

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
  const renderSentenceWithAssessment = (sentence: SentenceForAssessment) => {
    // Log the assessment result received by this function
    // console.log(`[Render] Sentence ID: ${sentence.id}, Assessment Result:`, sentence.assessmentResult);
    // console.log(`[Render] Sentence ID: ${sentence.id}, DetailResult Words:`, sentence.assessmentResult?.detailResult?.Words);

    if (!sentence.assessmentResult?.detailResult?.Words || !sentence.text) {
      return <SentenceTextDisplay>{sentence.text}</SentenceTextDisplay>;
    }
    const words = sentence.assessmentResult.detailResult
      .Words as any as AzureWordPronunciationResult[];
    return (
      <ColorCodedSentence>
        {words.map((word, wordIndex) => {
          const errorType = word.PronunciationAssessment?.ErrorType;
          const isOmission = errorType === "Omission";
          const isInsertion = errorType === "Insertion";
          const isMispronunciation = errorType === "Mispronunciation";

          let wordDisplayText = word.Word;
          if (isInsertion) {
            wordDisplayText = `+ ${word.Word}`;
          }

          return (
            <span key={`s-${sentence.id}-w-${wordIndex}`}>
              {word.Syllables &&
              word.Syllables.length > 0 &&
              !isOmission &&
              !isInsertion ? (
                word.Syllables.map((syllable, syllableIndex) => {
                  if (!syllable) return null;
                  const syllableDisplayText =
                    syllable.Grapheme || syllable.Syllable;
                  let titleText = `Syllable: ${syllableDisplayText}\nSyllable Score: ${
                    syllable.PronunciationAssessment?.AccuracyScore?.toFixed(
                      0
                    ) || "N/A"
                  }`;

                  if (syllable.Phonemes && syllable.Phonemes.length > 0) {
                    titleText += "\nPhonemes:";
                    for (const phoneme of syllable.Phonemes) {
                      if (!phoneme) continue;
                      const phonemeName = phoneme.Phoneme || "Unknown";
                      const phonemeScore =
                        typeof phoneme.PronunciationAssessment
                          ?.AccuracyScore === "number"
                          ? phoneme.PronunciationAssessment.AccuracyScore.toFixed(
                              0
                            ) + "%"
                          : "N/A";
                      titleText += `\n  - ${phonemeName}: ${phonemeScore}`;
                    }
                  }

                  return (
                    <SyllableSpan
                      key={`s-${sentence.id}-syl-${syllableIndex}`}
                      color={getAzurePronunciationColor(
                        syllable.PronunciationAssessment?.AccuracyScore
                      )}
                      title={titleText}
                      style={
                        {
                          // textDecoration: hasError ? "underline" : "none", // Handled by isOmitted now
                          // fontStyle: hasError ? "italic" : "normal", // Handled by isOmitted now
                        }
                      }
                    >
                      {syllableDisplayText}
                    </SyllableSpan>
                  );
                })
              ) : word.Word ? ( // Check if word.Word exists before rendering
                <SyllableSpan
                  color={getAzurePronunciationColor(
                    word.PronunciationAssessment?.AccuracyScore
                  )}
                  title={`Word: ${word.Word}\nScore: ${
                    word.PronunciationAssessment?.AccuracyScore?.toFixed(0) ||
                    "N/A"
                  }${
                    isOmission
                      ? "\nError: Omitted"
                      : isInsertion
                      ? "\nType: Inserted Word"
                      : isMispronunciation
                      ? `\nError: ${word.PronunciationAssessment?.ErrorType}`
                      : ""
                  }`}
                  isOmitted={isOmission}
                  isInserted={isInsertion}
                >
                  {wordDisplayText}
                </SyllableSpan>
              ) : null}{" "}
              {/* If no syllables and no word.Word, render nothing */}
              {/* Conditionally render space only if it's not the last word or if the next word is not an insertion */}
              {/* This logic might need refinement based on how Azure structures insertions adjacent to other words */}
              {wordIndex < words.length - 1 &&
                !(
                  words[wordIndex + 1]?.PronunciationAssessment?.ErrorType ===
                  "Insertion"
                ) &&
                " "}
            </span>
          );
        })}
      </ColorCodedSentence>
    );
  };

  // Function to convert Float32Array PCM data to Int16Array ArrayBuffer (needed for Azure)
  function convertFloat32ToInt16(buffer: ArrayBuffer): ArrayBuffer {
    const l = buffer.byteLength / 4; // Float32 is 4 bytes
    const output = new Int16Array(l);
    const input = new Float32Array(buffer);
    for (let i = 0; i < l; i++) {
      output[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff; // Convert to 16-bit PCM
    }
    return output.buffer;
  }

  // Placeholder for startSentenceRecording - to be implemented in Step 2
  const startSentenceRecording = async (sentenceIndex: number) => {
    if (isRecordingActive) return;
    const sentenceToRecord = sentencesToAssess[sentenceIndex];
    if (!sentenceToRecord) {
      setOverallError("Cannot find sentence to record.");
      return;
    }

    setOverallError(null);
    setCurrentRecordingSentenceIndex(sentenceIndex);
    setIsRecordingActive(true);
    recordedAudioChunksRef.current = []; // Clear previous chunks

    // Update sentence state: clear previous results, set assessing flag
    setSentencesToAssess((prev) =>
      prev.map((s, i) =>
        i === sentenceIndex
          ? {
              ...s,
              assessmentResult: null,
              recordedSentenceAudioUrl: null,
              assessmentError: null,
              recognizedText: "",
              rawJson: "",
              isAssessing: true,
            }
          : s
      )
    );

    try {
      // 1. Azure Speech SDK Setup
      if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
        throw new Error("Azure Speech Key or Region is not configured.");
      }

      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION
      );
      speechConfig.speechRecognitionLanguage = "en-US";

      if (azurePushStreamRef.current) azurePushStreamRef.current.close();
      azurePushStreamRef.current = SpeechSDK.AudioInputStream.createPushStream(
        SpeechSDK.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1)
      );
      const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(
        azurePushStreamRef.current
      );

      // CRUCIAL: Ensure PronunciationAssessmentConfig is created and applied BEFORE starting recognition
      const pronunciationAssessmentConfig =
        new SpeechSDK.PronunciationAssessmentConfig(
          sentenceToRecord.text,
          SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
          SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
          true
        );
      pronunciationAssessmentConfig.enableProsodyAssessment = true;
      pronunciationAssessmentConfig.enableMiscue = true; // Enable miscue calculation

      if (azureRecognizerRef.current) azureRecognizerRef.current.close();
      const recognizer = new SpeechSDK.SpeechRecognizer(
        speechConfig,
        audioConfig
      );
      pronunciationAssessmentConfig.applyTo(recognizer);

      recognizer.recognizing = (_s, _e) => {
        /* console.log(`RECOGNIZING: Text=${_e.result.text}`); */
      };

      recognizer.recognized = (_s, e) => {
        console.log(
          `[Azure Recognized Event] Result reason: ${
            SpeechSDK.ResultReason[e.result.reason]
          }`
        );
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          console.log(`[Azure Recognized] Text: ${e.result.text}`);
          const pronunciationResult =
            SpeechSDK.PronunciationAssessmentResult.fromResult(e.result);

          // --- Detailed Logging ---
          console.log(
            "[Azure Recognized] Full e.result Object:",
            JSON.stringify(e.result)
          ); // Log the whole result object if possible (might be large)
          console.log(
            "[Azure Recognized] PronunciationAssessmentResult Object:",
            pronunciationResult
          );
          if (pronunciationResult && pronunciationResult.detailResult) {
            console.log(
              "[Azure Recognized] pronunciationResult.detailResult:",
              pronunciationResult.detailResult
            );
            console.log(
              "[Azure Recognized] pronunciationResult.detailResult.Words:",
              pronunciationResult.detailResult.Words
            );
          } else {
            console.warn(
              "[Azure Recognized] pronunciationResult OR detailResult is missing!"
            );
          }
          // --- End Detailed Logging ---

          const resultJson = e.result.properties.getProperty(
            SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
          );
          setSentencesToAssess((prev) =>
            prev.map((s, i) =>
              i === sentenceIndex
                ? {
                    ...s,
                    assessmentResult: pronunciationResult,
                    recognizedText: e.result.text,
                    rawJson: resultJson,
                  }
                : s
            )
          );
        } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
          console.warn(
            "[Azure Recognized] NoMatch: Speech could not be recognized."
          );
          setSentencesToAssess((prev) =>
            prev.map((s, i) =>
              i === sentenceIndex
                ? {
                    ...s,
                    assessmentError: "Speech could not be recognized by Azure.",
                  }
                : s
            )
          );
        } else {
          console.log(
            `[Azure Recognized] Other reason: ${
              SpeechSDK.ResultReason[e.result.reason]
            }`
          );
        }
      };

      recognizer.canceled = (
        _s: SpeechSDK.Recognizer,
        e: SpeechSDK.SpeechRecognitionCanceledEventArgs
      ) => {
        console.error(
          `[Azure] CANCELED event. Reason: ${
            SpeechSDK.CancellationReason[e.reason]
          }`
        );
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          console.error(
            `[Azure] CANCELED: ErrorCode=${e.errorCode} ( ${
              SpeechSDK.CancellationErrorCode[e.errorCode]
            } )`
          );
          console.error(`[Azure] CANCELED: ErrorDetails=${e.errorDetails}`);
          console.error(
            `[Azure] CANCELED: Did you set the speech resource key and region values?`
          );
          setSentencesToAssess((prev) =>
            prev.map((s, i) =>
              i === sentenceIndex
                ? {
                    ...s,
                    assessmentError: `Azure CANCELED: ${e.errorDetails} (Code: ${e.errorCode})`,
                  }
                : s
            )
          );
        }
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
        if (azurePushStreamRef.current) {
          console.log("[Azure] Closing push stream on session stop.");
          azurePushStreamRef.current.close();
        }
      };

      await recognizer.startContinuousRecognitionAsync(
        () => {
          console.log("[Azure] Continuous recognition successfully started.");
        },
        (err: string) => {
          console.error(
            `[Azure] Error starting Azure continuous recognition: ${err}`
          );
          setSentencesToAssess((prev) =>
            prev.map((s, i) =>
              i === sentenceIndex
                ? {
                    ...s,
                    assessmentError: `Azure SDK Error starting recognition: ${err}`,
                    isAssessing: false,
                  }
                : s
            )
          );
          if (azurePushStreamRef.current) azurePushStreamRef.current.close();
        }
      );
      setAzureRecognizer(recognizer); // Set the new recognizer instance
      console.log(
        "[Azure] Azure Recognizer instance created and recognition started."
      );

      // 2. Web Audio API Setup
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

          // Push to Azure stream - THIS BLOCK NEEDS TO BE RESTORED/ENSURED
          if (
            azurePushStreamRef.current &&
            azureRecognizerRef.current && // Check if recognizer is active
            isRecordingRef.current &&
            bufferByteLength > 0
          ) {
            try {
              const int16Buffer = convertFloat32ToInt16(event.data.slice(0));
              azurePushStreamRef.current.write(int16Buffer);
            } catch (azurePushError: any) {
              console.error(
                "[AudioWorklet] Error writing audio to Azure push stream:",
                azurePushError.toString()
              );
              if (azurePushError.message?.includes("closed")) {
                setSentencesToAssess((prev) =>
                  prev.map((s, i) =>
                    i === sentenceIndex
                      ? {
                          ...s,
                          assessmentError:
                            "Azure audio stream closed unexpectedly during write.",
                        }
                      : s
                  )
                );
              }
            }
          } else {
            // console.log(
            //   "[AudioWorklet] Conditions not met for pushing audio to Azure."
            // );
          }
        }
      };
      microphoneSourceRef.current.connect(audioWorkletNodeRef.current);
    } catch (err: any) {
      console.error("Error starting sentence recording:", err);
      const errorMsg = err.message || "Failed to start recording.";
      setOverallError(errorMsg); // General error for now
      setSentencesToAssess((prev) =>
        prev.map((s, i) =>
          i === sentenceIndex
            ? { ...s, assessmentError: errorMsg, isAssessing: false }
            : s
        )
      );
      setIsRecordingActive(false);
      setCurrentRecordingSentenceIndex(null);
      // Clean up Azure SDK resources if they were partially initialized
      if (azureRecognizerRef.current) azureRecognizerRef.current.close();
      if (azurePushStreamRef.current) azurePushStreamRef.current.close();
    }
  };

  const stopCurrentSentenceRecording = async () => {
    if (!isRecordingActive || currentRecordingSentenceIndex === null) {
      console.warn("Stop called but no active recording or sentence index.");
      return;
    }

    const recordingIdx = currentRecordingSentenceIndex; // Capture before resetting
    console.log(
      `[Stop] Attempting to stop recording for sentence index: ${recordingIdx}`
    );

    // 1. Stop Azure continuous recognition
    if (
      azureRecognizerRef.current &&
      typeof azureRecognizerRef.current.stopContinuousRecognitionAsync ===
        "function"
    ) {
      console.log("[Azure] Sending stopContinuousRecognitionAsync command.");
      try {
        await azureRecognizerRef.current.stopContinuousRecognitionAsync(
          () => {
            console.log(
              "[Azure] Continuous recognition stopped command sent successfully."
            );
          },
          (err: string) => {
            console.error(
              `[Azure] Error SENDING stop continuous recognition: ${err}`
            );
          }
        );
      } catch (err) {
        console.error(
          "[Azure] Exception during stopContinuousRecognitionAsync call:",
          err
        );
      }
    } else {
      console.warn(
        "[Azure] Recognizer or stopContinuousRecognitionAsync not available to stop."
      );
    }
    // The azureRecognizerRef.current.sessionStopped event should handle closing the pushStream.
    // azureRecognizerRef.current.close() will be called in general cleanup or before starting new recognition.

    // 2. Stop Web Audio API recording parts
    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.port.onmessage = null; // Remove listener
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
      console.log("[WebAudio] AudioWorkletNode disconnected.");
    }
    if (microphoneSourceRef.current) {
      microphoneSourceRef.current.disconnect();
      microphoneSourceRef.current = null;
      console.log("[WebAudio] MicrophoneSourceNode disconnected.");
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      console.log("[WebAudio] MediaStream tracks stopped.");
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        await audioContextRef.current.close();
        console.log("[WebAudio] AudioContext closed.");
      } catch (e) {
        console.warn("[WebAudio] Error closing AudioContext:", e);
      }
      audioContextRef.current = null;
    }

    // 3. Process recorded audio chunks to create WAV and get URL
    let newAudioUrl: string | null = null;
    if (recordedAudioChunksRef.current.length > 0) {
      try {
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
        newAudioUrl = URL.createObjectURL(wavBlob);
        console.log(`[WebAudio] Recorded audio URL created: ${newAudioUrl}`);
      } catch (wavError) {
        console.error("Error encoding WAV:", wavError);
        setSentencesToAssess((prev) =>
          prev.map((s, i) =>
            i === recordingIdx
              ? { ...s, assessmentError: "Failed to process recorded audio." }
              : s
          )
        );
      }
    }
    recordedAudioChunksRef.current = []; // Clear chunks after processing

    // 4. Update state
    setIsRecordingActive(false);
    setCurrentRecordingSentenceIndex(null);
    setSentencesToAssess((prev) =>
      prev.map((s, i) =>
        i === recordingIdx
          ? {
              ...s,
              isAssessing: false, // Assessment attempt is complete
              recordedSentenceAudioUrl: newAudioUrl, // Set the new audio URL (or null if WAV failed)
            }
          : s
      )
    );

    // 5. Autoplay the recorded audio for the specific sentence
    if (newAudioUrl) {
      console.log(
        `[Autoplay] Triggering autoplay for sentence ${recordingIdx}`
      );
      // Trigger autoplay using state
      setAudioToAutoplay(recordingIdx);
    }
  };

  // Get word definition function
  const getWordDefinition = async (
    word: string,
    context: string
  ): Promise<string> => {
    try {
      // For shadow page, we'll use a simpler approach without Firestore caching
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        return "API 키가 설정되지 않았습니다.";
      }

      const url = "https://api.openai.com/v1/chat/completions";

      const prompt = `다음 문장에서 '${word}'의 정의를 한국어로 제공해주세요. 단어의 의미를 문장의 맥락에 맞게 설명해주세요. 반드시 존대말로 작성해주세요.

문장: "${context}"

* 결과 형식:
뜻풀이: [문장 문맥에 맞는 단어 정의]
`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("GPT API Error:", error);
      return `뜻풀이를 가져오는 중 오류가 발생했습니다: ${error}`;
    }
  };

  // Function to fetch word definition from Free Dictionary API
  const fetchWordFromDictionaryApi = async (
    word: string
  ): Promise<any | null> => {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      if (!response.ok) {
        // The API returns a specific JSON structure for "No Definitions Found"
        if (response.status === 404) {
          console.warn(`No definitions found for "${word}" from API.`);
          return null; // Or you could return the error JSON if you want to display it
        }
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return data; // This will be an array of entries
    } catch (error) {
      console.error("Free Dictionary API Error:", error);
      return null;
    }
  };

  // Extract word from clicked position
  const extractWordFromText = (
    element: HTMLElement,
    clickX: number,
    clickY: number
  ): { word: string; rect?: DOMRect } => {
    try {
      const range = document.caretRangeFromPoint(clickX, clickY);
      if (!range) return { word: "" };

      const textContainer = element.closest(".transcript-text");
      if (!textContainer) return { word: "" };

      const fullText = textContainer.textContent || "";
      const clickedNode = range.startContainer;
      const clickOffset = range.startOffset;

      let currentPosition = 0;
      let clickPosition = -1;

      const findPosition = (node: Node) => {
        if (clickPosition >= 0) return;

        if (node === clickedNode) {
          clickPosition = currentPosition + clickOffset;
          return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          currentPosition += node.textContent?.length || 0;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          for (const child of Array.from(node.childNodes)) {
            findPosition(child);
          }
        }
      };

      findPosition(textContainer);

      if (clickPosition < 0) return { word: "" };

      let startPos = clickPosition;
      let endPos = clickPosition;

      while (
        startPos > 0 &&
        fullText[startPos - 1] !== " " &&
        fullText[startPos - 1] !== "—"
      ) {
        startPos--;
      }

      while (
        endPos < fullText.length &&
        fullText[endPos] !== " " &&
        fullText[endPos] !== "—"
      ) {
        endPos++;
      }

      let word = fullText.substring(startPos, endPos);
      word = word.replace(/[.,!?;:'"()[\]{}]|…/g, "").trim();

      return {
        word,
        rect:
          (range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : (range.startContainer as Element)
          )?.getBoundingClientRect() || undefined,
      };
    } catch (error) {
      console.error("Error extracting word from text:", error);
      return { word: "" };
    }
  };

  // Handle word click in transcript
  const handleTranscriptWordClick = async (e: React.MouseEvent) => {
    if (isAudioMode) {
      // In audio mode, handle YouTube seeking (existing functionality)
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    const transcriptContainer = target.closest(
      ".transcript-text"
    ) as HTMLElement | null;
    if (!transcriptContainer) return;

    const fullText = transcriptContainer.textContent || "";
    if (!fullText) return;

    window.getSelection()?.removeAllRanges();

    const { word: clickedWord } = extractWordFromText(
      transcriptContainer,
      e.clientX,
      e.clientY
    );
    // Determine original form (lemma)
    const originalWord = getOriginalForm(clickedWord);

    if (
      !originalWord ||
      originalWord.length > 30 ||
      originalWord.split(/\s+/).length > 1
    ) {
      return;
    }

    // Get surrounding context
    const sentenceRegex = new RegExp(
      `[^.!?]*\b${originalWord.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}\b[^.!?]*[.!?]`,
      "i"
    );
    const sentenceMatch = fullText.match(sentenceRegex);
    const context = sentenceMatch ? sentenceMatch[0].trim() : fullText;

    // Open modal with original word
    setWordDefinitionModal({
      isOpen: true,
      word: originalWord,
      apiData: null,
      gptDefinition: "", // Initialize GPT definition
      isLoading: true,
    });

    document.body.style.overflow = "hidden";

    try {
      // Fetch definition from GPT (Korean)
      const gptDefinition = await getWordDefinition(originalWord, context);
      // Fetch dictionary data from the new API
      const dictionaryApiData = await fetchWordFromDictionaryApi(originalWord);

      setWordDefinitionModal((prev) => ({
        ...prev,
        gptDefinition: gptDefinition,
        apiData: dictionaryApiData,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Definition or API error:", error);
      setWordDefinitionModal((prev) => ({
        ...prev,
        gptDefinition:
          prev.gptDefinition || "뜻풀이를 가져오는 중 오류가 발생했습니다.",
        apiData: null,
        isLoading: false,
      }));
    }
  };

  // Close definition modal
  const closeDefinitionModal = () => {
    setWordDefinitionModal((prev) => ({
      ...prev,
      isOpen: false,
      apiData: null,
      gptDefinition: "", // Reset GPT definition as well
    }));
    document.body.style.overflow = "";
  };

  // Toggle audio mode
  const toggleAudioMode = () => {
    setIsAudioMode(!isAudioMode);
  };

  // Clear highlight when audio mode is turned off
  useEffect(() => {
    if (!isAudioMode) {
      setActiveTimestampIndex(null);
    }
  }, [isAudioMode]);

  // Helper to get original form (basic lemmatization)
  const getOriginalForm = (word: string): string => {
    const w = word.toLowerCase();
    if (w.endsWith("ies") && w.length > 3) return w.slice(0, -3) + "y";
    if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3)
      return w.slice(0, -1);
    return w;
  };

  return (
    <ShadowContainer>
      <VideoContainer>
        {youtubeLoading && (
          <LoadingContainer>
            <div className="spinner"></div>
            <div className="text">Loading YouTube video...</div>
          </LoadingContainer>
        )}
        {youtubeError && (
          <ErrorMessage>Error loading video: {youtubeError}</ErrorMessage>
        )}
        {!youtubeLoading && !youtubeError && youtubeUrl && (
          <iframe
            id="youtube-player-iframe"
            width="100%"
            height="100%"
            src={youtubeUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        )}
        {!youtubeLoading && !youtubeError && !youtubeUrl && (
          <StatusIndicator type="info">
            YouTube video URL not available.
          </StatusIndicator>
        )}
      </VideoContainer>

      {/* Step Progress Indicator */}
      <StepProgressContainer>
        {steps.map((step, _index) => (
          <StepItem
            key={step.id}
            isActive={currentStep === step.id}
            isCompleted={currentStep > step.id}
          >
            <StepCircle
              isActive={currentStep === step.id}
              isCompleted={currentStep > step.id}
              onClick={() => setCurrentStep(step.id)}
            >
              {step.id}
            </StepCircle>
            <StepLabel isActive={currentStep === step.id}>
              {step.name}
            </StepLabel>
          </StepItem>
        ))}
      </StepProgressContainer>

      {/* Step-based Content */}
      <StepContent>
        {/* Step 1: Script Study */}
        {currentStep === 1 &&
          !youtubeLoading &&
          !youtubeError &&
          videoTimestamps.length > 0 && (
            <>
              <AudioModeToggle
                onClick={toggleAudioMode}
                className={isAudioMode ? "active" : ""}
              >
                <span>
                  {isAudioMode ? "✕ 오디오 모드 해제" : "🎧 오디오 모드"}
                </span>
              </AudioModeToggle>
              <TranscriptContainer
                ref={transcriptContainerRef}
                className="transcript-text"
                onClick={handleTranscriptWordClick}
              >
                {videoTimestamps.map((item, index) => (
                  <React.Fragment key={`${item.word}-${index}-${item.start}`}>
                    <TranscriptWord
                      isActive={index === activeTimestampIndex}
                      onClick={(e) => {
                        if (isAudioMode && playerRef.current && isPlayerReady) {
                          e.stopPropagation();
                          playerRef.current.seekTo(item.start, true);
                          setActiveTimestampIndex(index);
                        }
                      }}
                    >
                      {item.word}
                    </TranscriptWord>
                    {index < videoTimestamps.length - 1 && " "}
                  </React.Fragment>
                ))}
              </TranscriptContainer>
            </>
          )}

        {/* Step 2: Shadowing Practice */}
        {currentStep === 2 && sentencesToAssess.length > 0 && (
          <>
            <CarouselContainer>
              <CarouselContent>
                {sentencesToAssess.map((sentence, index) => (
                  <CarouselSlide
                    key={sentence.id}
                    isActive={index === currentSentenceIndex}
                  >
                    <SentenceRow>
                      {renderSentenceWithAssessment(sentence)}
                      <SentenceControls>
                        <Button
                          onClick={() => {
                            if (
                              isRecordingActive &&
                              currentRecordingSentenceIndex ===
                                currentSentenceIndex
                            ) {
                              stopCurrentSentenceRecording();
                            } else if (!isRecordingActive) {
                              startSentenceRecording(currentSentenceIndex);
                            }
                          }}
                          disabled={
                            isRecordingActive &&
                            currentRecordingSentenceIndex !==
                              currentSentenceIndex
                          }
                        >
                          <span>
                            {isRecordingActive &&
                            currentRecordingSentenceIndex ===
                              currentSentenceIndex ? (
                              <>
                                <LoadingSpinner />
                                Stop Recording
                              </>
                            ) : (
                              "Start Recording"
                            )}
                          </span>
                        </Button>
                        {sentence.recordedSentenceAudioUrl && (
                          <AudioControls>
                            <audio
                              id={`sentence-audio-${index}`}
                              controls
                              src={sentence.recordedSentenceAudioUrl}
                            />
                          </AudioControls>
                        )}
                      </SentenceControls>
                      {sentence.assessmentError && (
                        <StatusIndicator type="error">
                          {sentence.assessmentError}
                        </StatusIndicator>
                      )}
                      {sentence.isAssessing && (
                        <StatusIndicator type="info">
                          <LoadingSpinner />
                          Processing pronunciation assessment...
                        </StatusIndicator>
                      )}
                      {sentence.assessmentResult && (
                        <AzureResultsBox>
                          <p>
                            <strong>Recognized:</strong> "
                            <em>
                              {sentence.recognizedText ||
                                "(No speech recognized)"}
                            </em>
                            "
                          </p>
                          <AzureScoreArea>
                            <p>
                              <strong>Pronunciation:</strong>{" "}
                              {sentence.assessmentResult.pronunciationScore?.toFixed(
                                1
                              )}
                              %{" | "}
                              <strong>Accuracy:</strong>{" "}
                              {sentence.assessmentResult.accuracyScore?.toFixed(
                                1
                              )}
                              %{" | "}
                              <strong>Fluency:</strong>{" "}
                              {sentence.assessmentResult.fluencyScore?.toFixed(
                                1
                              )}
                              %{" | "}
                              <strong>Completeness:</strong>{" "}
                              {sentence.assessmentResult.completenessScore?.toFixed(
                                1
                              )}
                              %
                              {sentence.assessmentResult.prosodyScore &&
                                ` | Prosody: ${sentence.assessmentResult.prosodyScore.toFixed(
                                  1
                                )}%`}
                            </p>
                          </AzureScoreArea>
                        </AzureResultsBox>
                      )}
                    </SentenceRow>
                  </CarouselSlide>
                ))}
              </CarouselContent>
            </CarouselContainer>

            <CarouselNavigation>
              <NavigationButton
                onClick={() =>
                  setCurrentSentenceIndex(Math.max(0, currentSentenceIndex - 1))
                }
                disabled={currentSentenceIndex === 0}
              >
                <span>← Previous</span>
              </NavigationButton>

              <ProgressBarContainer>
                <ProgressBarFill
                  progress={
                    ((currentSentenceIndex + 1) / sentencesToAssess.length) *
                    100
                  }
                />
              </ProgressBarContainer>

              <NavigationButton
                onClick={() =>
                  setCurrentSentenceIndex(
                    Math.min(
                      sentencesToAssess.length - 1,
                      currentSentenceIndex + 1
                    )
                  )
                }
                disabled={currentSentenceIndex === sentencesToAssess.length - 1}
              >
                <span>Next →</span>
              </NavigationButton>
            </CarouselNavigation>

            <ProgressInfo>
              Sentence {currentSentenceIndex + 1} of {sentencesToAssess.length}
            </ProgressInfo>
          </>
        )}

        {/* Step 3: Internalization */}
        {currentStep === 3 && (
          <>
            <Title>내재화</Title>
            <StatusIndicator type="info">
              내재화 기능은 준비 중입니다.
            </StatusIndicator>
          </>
        )}

        {/* Step 4: Analysis */}
        {currentStep === 4 && (
          <>
            <Title>분석</Title>
            <StatusIndicator type="info">
              분석 기능은 준비 중입니다.
            </StatusIndicator>
          </>
        )}
      </StepContent>

      {overallError && <ErrorMessage>{overallError}</ErrorMessage>}

      {/* Word definition modal */}
      <DefinitionModalOverlay
        isOpen={wordDefinitionModal.isOpen}
        onClick={closeDefinitionModal}
      >
        <DefinitionModalContent
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <CloseButton onClick={closeDefinitionModal}>×</CloseButton>
          <WordDefinitionTitle>{wordDefinitionModal.word}</WordDefinitionTitle>
          {/* Combined loading state for initial fetch */}
          {wordDefinitionModal.isLoading &&
          !wordDefinitionModal.apiData &&
          !wordDefinitionModal.gptDefinition ? (
            <LoadingDefinitionContent>
              뜻풀이 및 영어 정의 검색 중...
            </LoadingDefinitionContent>
          ) : (
            <>
              {/* Korean Definition (GPT) Section */}
              <DefinitionSection>
                {wordDefinitionModal.isLoading &&
                !wordDefinitionModal.gptDefinition ? (
                  <LoadingDefinitionContent>
                    GPT 뜻풀이 검색 중...
                  </LoadingDefinitionContent>
                ) : wordDefinitionModal.gptDefinition ? (
                  <WordDefinitionContent>
                    {wordDefinitionModal.gptDefinition}
                  </WordDefinitionContent>
                ) : (
                  <WordDefinitionContent>
                    한국어 뜻풀이를 가져오지 못했습니다.
                  </WordDefinitionContent>
                )}
              </DefinitionSection>

              {/* English Definitions (Dictionary API) Section */}
              {wordDefinitionModal.isLoading && !wordDefinitionModal.apiData ? (
                <LoadingDefinitionContent>
                  Loading English definitions from API...
                </LoadingDefinitionContent>
              ) : wordDefinitionModal.apiData &&
                Array.isArray(wordDefinitionModal.apiData) &&
                wordDefinitionModal.apiData.length > 0 ? (
                <Collapsible>
                  <summary>📖 영어 사전 확인하기</summary>

                  {wordDefinitionModal.apiData.map(
                    (entry: any, entryIdx: number) => (
                      <div
                        key={`entry-${entryIdx}`}
                        style={{
                          marginTop: "1rem",
                          borderBottom:
                            entryIdx < wordDefinitionModal.apiData.length - 1
                              ? "1px solid #eee"
                              : "none",
                          paddingBottom:
                            entryIdx < wordDefinitionModal.apiData.length - 1
                              ? "1rem"
                              : "0",
                        }}
                      >
                        {/* All Phonetics with Audio */}
                        {entry.phonetics &&
                          entry.phonetics.filter((p: any) => p.text).length >
                            0 && (
                            <DefinitionSection>
                              <DefinitionLabel style={{ fontSize: "0.9rem" }}>
                                Pronunciation
                              </DefinitionLabel>
                              {entry.phonetics.map(
                                (p: any, pIdx: number) =>
                                  p.text && ( // Only render if phonetic text exists
                                    <div
                                      key={`phonetic-${pIdx}`}
                                      style={{
                                        marginBottom: "0.3rem",
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      {p.audio && (
                                        <audio
                                          controls
                                          src={p.audio}
                                          style={{
                                            height: "30px",
                                            minWidth: "100%",
                                          }}
                                        />
                                      )}
                                    </div>
                                  )
                              )}
                            </DefinitionSection>
                          )}

                        {/* Meanings */}
                        {entry.meanings && entry.meanings.length > 0 && (
                          <DefinitionSection>
                            <DefinitionLabel style={{ fontSize: "0.9rem" }}>
                              Meanings
                            </DefinitionLabel>
                            {entry.meanings.map(
                              (meaning: any, mIdx: number) => (
                                <div
                                  key={`meaning-${mIdx}`}
                                  style={{ marginBottom: "0.8rem" }}
                                >
                                  <WordDefinitionContent
                                    style={{
                                      fontWeight: "bold",
                                      color: colors.primaryDark,
                                    }}
                                  >
                                    {meaning.partOfSpeech}
                                  </WordDefinitionContent>

                                  {meaning.definitions &&
                                    meaning.definitions.length > 0 && (
                                      <ul
                                        style={{
                                          marginTop: "0.3rem",
                                          paddingLeft: "0px", // Changed from "20px"
                                          listStyleType: "disc",
                                        }}
                                      >
                                        {meaning.definitions.map(
                                          (def: any, dIdx: number) => (
                                            <li
                                              key={`def-${dIdx}`}
                                              style={{ marginBottom: "0.4rem" }}
                                            >
                                              {def.definition}
                                              {def.example && (
                                                <div
                                                  style={{
                                                    fontStyle: "italic",
                                                    color: colors.text.muted,
                                                    fontSize: "0.9em",
                                                    marginLeft: "0px", // Changed from "10px"
                                                    overflowWrap: "break-word",
                                                    wordBreak: "break-word",
                                                  }}
                                                >
                                                  e.g. "{def.example}"
                                                </div>
                                              )}
                                              {def.synonyms &&
                                                def.synonyms.length > 0 && (
                                                  <div
                                                    style={{
                                                      fontSize: "0.85em",
                                                      color:
                                                        colors.text.secondary,
                                                      marginTop: "0.2rem",
                                                      overflowWrap:
                                                        "break-word",
                                                      wordBreak: "break-word",
                                                    }}
                                                  >
                                                    <strong>Synonyms:</strong>{" "}
                                                    {def.synonyms.join(", ")}
                                                  </div>
                                                )}
                                              {def.antonyms &&
                                                def.antonyms.length > 0 && (
                                                  <div
                                                    style={{
                                                      fontSize: "0.85em",
                                                      color:
                                                        colors.text.secondary,
                                                      marginTop: "0.2rem",
                                                      overflowWrap:
                                                        "break-word",
                                                      wordBreak: "break-word",
                                                    }}
                                                  >
                                                    <strong>Antonyms:</strong>{" "}
                                                    {def.antonyms.join(", ")}
                                                  </div>
                                                )}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    )}
                                  {/* Display meaning-level synonyms */}
                                  {meaning.synonyms &&
                                    meaning.synonyms.length > 0 && (
                                      <div
                                        style={{
                                          fontSize: "0.85em",
                                          color: colors.text.secondary,
                                          marginTop: "0.3rem",
                                          paddingLeft: "0px", // Changed from "20px"
                                          overflowWrap: "break-word",
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        <strong>Synonyms:</strong>{" "}
                                        {meaning.synonyms.join(", ")}
                                      </div>
                                    )}

                                  {/* Display meaning-level antonyms */}
                                  {meaning.antonyms &&
                                    meaning.antonyms.length > 0 && (
                                      <div
                                        style={{
                                          fontSize: "0.85em",
                                          color: colors.text.secondary,
                                          marginTop: "0.3rem",
                                          paddingLeft: "0px", // Changed from "20px"
                                          overflowWrap: "break-word",
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        <strong>Antonyms:</strong>{" "}
                                        {meaning.antonyms.join(", ")}
                                      </div>
                                    )}
                                </div>
                              )
                            )}
                          </DefinitionSection>
                        )}
                        {/* Source URLs */}
                        {entry.sourceUrls && entry.sourceUrls.length > 0 && (
                          <DefinitionSection>
                            <DefinitionLabel style={{ fontSize: "0.9rem" }}>
                              Source: Wikitionary
                            </DefinitionLabel>
                          </DefinitionSection>
                        )}
                      </div>
                    )
                  )}
                </Collapsible>
              ) : /* Check for the specific "No Definitions Found" title from the API response */
              wordDefinitionModal.apiData &&
                wordDefinitionModal.apiData.title === "No Definitions Found" ? (
                <LoadingDefinitionContent>
                  No English definitions found for "{wordDefinitionModal.word}"
                  via API.
                </LoadingDefinitionContent>
              ) : (
                !wordDefinitionModal.isLoading && ( // Only show if not loading
                  <LoadingDefinitionContent>
                    Could not load English definitions for "
                    {wordDefinitionModal.word}".
                  </LoadingDefinitionContent>
                )
              )}
            </>
          )}
        </DefinitionModalContent>
      </DefinitionModalOverlay>
    </ShadowContainer>
  );
};

export default ShadowPage;
