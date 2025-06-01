import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

// Interface for Azure Phoneme-level Pronunciation Result
export interface AzurePhonemePronunciationResult {
  Phoneme?: string;
  PronunciationAssessment?: {
    AccuracyScore?: number;
  };
}

// Interface for Azure Syllable-level Pronunciation Result
export interface AzureSyllablePronunciationResult {
  Syllable: string; // The phonemic representation of the syllable
  Grapheme?: string; // The written representation of the syllable
  PronunciationAssessment?: {
    AccuracyScore?: number;
  };
  Phonemes?: AzurePhonemePronunciationResult[];
}

// Interface for Azure Word-level Pronunciation Result
export interface AzureWordPronunciationResult {
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

export interface VideoTimestamp {
  start: number;
  end: number;
  word: string;
}

export interface SentenceForAssessment {
  id: string;
  text: string;
  words: VideoTimestamp[];
  assessmentResult: SpeechSDK.PronunciationAssessmentResult | null;
  recordedSentenceAudioUrl: string | null;
  isAssessing: boolean;
  assessmentError: string | null;
  recognizedText?: string;
  rawJson?: string;
  isAssessmentFinalized?: boolean; // New flag
}

// Interface for internalization sentences with blanks
export interface InternalizationSentence {
  id: string;
  text: string;
  blankIndex: number; // 0-based index of word to be blanked
  originalWord: string; // The word that should be replaced
  userResponse?: string; // What the user said
  isRecording?: boolean;
  recordedAudioUrl?: string | null; // Changed to match usage
  transcriptionError?: string;
  isCorrect?: boolean; // Whether user provided a different word
}

// Interface for sentence creation exercise
export interface SentenceCreationWord {
  id: string;
  word: string;
  userSentence?: string; // Written sentence
  spokenSentence?: string; // Transcribed spoken sentence
  inputMode: "write" | "speak"; // Current input mode
  isRecording?: boolean;
  recordedAudioUrl?: string | null;
  transcriptionError?: string;
  isCompleted?: boolean;
}

// Step definition interface
export interface Step {
  id: number;
  name: string;
  label: string;
}

// Word definition modal state interface
export interface WordDefinitionModalState {
  isOpen: boolean;
  word: string;
  apiData: any | null;
  gptDefinition: string;
  isLoading: boolean;
}
