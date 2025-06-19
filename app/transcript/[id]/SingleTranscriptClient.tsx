'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { db } from '../../lib/firebase/firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useSpeechmatics } from '../hooks/useSpeechmatics';
import { UserAvatar } from '../../lib/features/meetup/components/user_avatar';
import { fetchUserProfiles, UserProfile } from '../../lib/features/meetup/services/user_service';

// Styled components matching the original TranscriptClient
const ConversationDetailContainer = styled.div`
  width: 100%;
`;

const ConversationDetailLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
`;

const AppSpeechDetails = styled.section`
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  margin-bottom: 1.5rem;
`;

const SectionHeader = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const KeywordsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const KeywordTag = styled.span`
  background-color: #f1f5f9;
  color: #475569;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const SpeakersContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const SpeakerInfo = styled.div`
  font-size: 0.875rem;
  color: #475569;
`;

const TranscriptSnippet = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  width: 100%;
  transition: background-color 0.3s ease;
`;

const SpeakerAvatar = styled.button<{ $bgColor?: string; $textColor?: string }>`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  border: none;
  background-color: ${props => props.$bgColor || '#e5e7eb'};
  color: ${props => props.$textColor || '#4b5563'};
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: box-shadow 0.2s;

  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
`;

const TranscriptContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  min-width: 0;
`;

const TranscriptHeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const SpeakerName = styled.span<{ $color?: string }>`
  font-weight: 600;
  font-size: 1rem;
  color: ${props => props.$color || '#1e293b'};
`;

const Timestamp = styled.span`
  font-size: 0.875rem;
  color: #64748b;
`;

const TranscriptBody = styled.div`
  line-height: 1.7;
  color: #334155;
  cursor: default;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  margin-top: 0.5rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  width: 100%;
`;

const WordSpan = styled.span<{ $lowConfidence?: boolean; $isPartial?: boolean }>`
  color: ${props => {
    if (props.$lowConfidence) return '#b91c1c';
    if (props.$isPartial) return '#64748b';
    return 'inherit';
  }};
  font-weight: ${props => props.$lowConfidence ? '600' : 'normal'};
  font-style: ${props => props.$isPartial ? 'italic' : 'normal'};
  text-decoration: ${props => props.$lowConfidence ? 'underline' : 'none'};
  text-decoration-color: #fecaca;
  text-underline-offset: 2px;
  transition: background-color 0.2s ease;
  border-radius: 3px;
  margin-right: 0.25rem;
  word-break: break-word;
  opacity: ${props => props.$isPartial ? '0.7' : '1'};
  
  &:hover {
    background-color: #eff6ff;
  }
`;

const Container = styled.div`
  min-height: 100vh;
  color: #334155;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 80px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #ffffff;
  color: #475569;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    background-color: #f8fafc;
    border-color: #d1d5db;
  }
`;

const RecordButton = styled.button<{ $isRecording: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 25px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.$isRecording ? `
    background: #990033;
    color: white;
    &:hover {
      background: #c00044;
    }
  ` : `
    background: #000000;
    color: white;
    &:hover {
      background: #424242;
    }
  `}
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const Content = styled.div`
  padding: 2rem 0;
  max-width: 900px;
  margin: 0 auto;
  background: transparent;
`;

const SessionInfo = styled.div`
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 2rem;
`;

const SessionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
`;

const SessionDetail = styled.div`
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: #475569;

  strong {
    color: #1e293b;
  }
`;

const ParticipantsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ParticipantChip = styled.div<{ $isLeader?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${props => props.$isLeader ? '#dbeafe' : '#f1f5f9'};
  color: ${props => props.$isLeader ? '#1e40af' : '#475569'};
  border: 1px solid ${props => props.$isLeader ? '#93c5fd' : '#e2e8f0'};
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.$isLeader ? '#bfdbfe' : '#e2e8f0'};
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #64748b;
  font-size: 1rem;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`;

const ErrorMessage = styled.div`
  margin-bottom: 2rem;
  padding: 1rem 1.5rem;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 8px;
  border: 1px solid #fecaca;
  font-size: 0.875rem;
`;

const EmptyState = styled.div`
  text-align: center;
  color: #64748b;
  font-style: italic;
  padding: 4rem 2rem;
  font-size: 1rem;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
`;

const LegendContent = styled.div`
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 0.75rem;
`;

const LegendSpeakers = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #64748b;
`;

const LegendColor = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  background-color: ${props => props.$color};
  border-radius: 50%;
  margin-right: 0.375rem;
`;

const ConfidenceNote = styled.div`
  font-size: 0.6875rem;
  color: #94a3b8;
`;

// Audio Player Components
const AudioPlayerContainer = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) translateY(${props => props.$isVisible ? '0' : '100%'});
  width: 100%;
  max-width: 850px;
  background: #1e293b;
  color: white;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  z-index: 100;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0.8rem;
    flex-wrap: wrap;
  }
`;

const AudioControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 0 0.3rem;
  flex-wrap: nowrap;

  @media (max-width: 768px) {
    gap: 0.5rem;
    margin: 0 0.2rem;
  }
`;

const AudioButton = styled.button`
  background: transparent;
  color: white;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 40px;
  height: 40px;
  border-radius: 50%;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:active {
    background: rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 768px) {
    font-size: 1.3rem;
    width: 36px;
    height: 36px;
  }
`;

const AudioProgress = styled.div`
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  margin: 0 1rem;
  cursor: pointer;

  @media (max-width: 768px) {
    margin: 0 0.8rem;
  }
`;

const AudioProgressFill = styled.div<{ $progress: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${props => props.$progress}%;
  background: #3b82f6;
  border-radius: 3px;
`;

const AudioTime = styled.div`
  font-size: 0.9rem;
  color: white;
  margin: 0 0.5rem;
  min-width: 50px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 0.8rem;
    min-width: 44px;
  }
`;

const SpeedButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? '#3b82f6' : 'transparent'};
  color: white;
  border: 1px solid #3b82f6;
  border-radius: 20px;
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #3b82f6;
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
`;

// Keyword Management Components
const KeywordManagementSection = styled.div`
  margin-bottom: 1rem;
`;

const KeywordInputContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const KeywordInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const AddKeywordButton = styled.button`
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: #2563eb;
  }
  
  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
`;

const KeywordsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const KeywordChip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: #f1f5f9;
  color: #475569;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const RemoveKeywordButton = styled.button`
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }
`;

const ArticleLink = styled.a`
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

// Speaker Assignment Modal Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
  text-align: center;
`;

const ModalSubtitle = styled.p`
  color: #64748b;
  margin: 0 0 2rem 0;
  text-align: center;
  font-size: 0.875rem;
`;

const ParticipantGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  margin-bottom: 2rem;
`;

const ParticipantOption = styled.button`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: #3b82f6;
    background: #f8fafc;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ParticipantInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ParticipantName = styled.div`
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
`;

const ParticipantRole = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 500;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  ${props => props.$variant === 'primary' ? `
    background: #3b82f6;
    color: white;
    &:hover {
      background: #2563eb;
    }
  ` : `
    background: #f1f5f9;
    color: #475569;
    &:hover {
      background: #e2e8f0;
    }
  `}

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #d1d5db;
  
  ${props => props.$active ? `
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  ` : `
    background: white;
    color: #374151;
    &:hover {
      background: #f9fafb;
    }
  `}

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const AssignedSpeakerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #0369a1;
`;

// Icon components
const RecordIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="8"/>
  </svg>
);

const PulseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="3">
      <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
    </circle>
  </svg>
);

// Interfaces
interface TranscriptData {
  id: string;
  eventId: string;
  sessionNumber: number;
  articleId: string;
  leaderUids: string[];
  participantUids: string[];
  createdAt: Date;
  createdBy: string;
  speakerMappings?: Record<string, string>; // speaker ID -> participant UID
  customKeywords?: string[]; // Custom keywords for this transcript
  transcriptContent?: any[]; // Speechmatics results
  hideUnidentifiedSpeakers?: boolean; // UI preference
}

interface ArticleData {
  title: {
    english: string;
    korean: string;
  };
  pronunciation_keywords?: string[];
}

interface EnhancedUserProfile extends UserProfile {
  isLeader: boolean;
}

interface SpeakerMapping {
  speakerId: string;
  participantUid: string;
}

export default function SingleTranscriptClient() {
  const params = useParams();
  const router = useRouter();
  const transcriptId = params?.id as string;
  
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [participants, setParticipants] = useState<EnhancedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the existing speech hook
  const {
    speechmaticsResults,
    speechmaticsError,
    isSpeechmaticsSocketOpen,
    startSpeechmatics,
    stopSpeechmatics,
    sendSpeechmaticsAudio,
  } = useSpeechmatics();

  // Audio recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('');
  const [customSpeakers, setCustomSpeakers] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordsLoaded, setKeywordsLoaded] = useState<boolean>(false);
  const keywordsLoadedRef = useRef<boolean>(false);
  const keywordsRef = useRef<string[]>([]);
  const [newKeyword, setNewKeyword] = useState<string>('');
  
  // Audio storage and playback state
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentlyHighlightedSnippet, setCurrentlyHighlightedSnippet] = useState<number | null>(null);

  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);
  
  // Speaker assignment state
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, string>>({});
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [recentlyAssigned, setRecentlyAssigned] = useState<Set<string>>(new Set());
  const [hideUnidentifiedSpeakers, setHideUnidentifiedSpeakers] = useState(false);

  // Group transcript results into snippets for rendering (copied from original TranscriptClient)
  const createTranscriptSnippets = useCallback((results: any[]) => {
    const validResults = results.filter(result => result.alternatives && result.alternatives.length > 0 && result.alternatives[0].content);
    if (validResults.length === 0) return [];
    
    const snippets: Array<{ 
      speaker: string;
      startTime: number;
      words: Array<{ content: string; confidence?: number; isPartial?: boolean; }>; 
    }> = [];
    
    let currentSnippet: { 
      speaker: string;
      startTime: number;
      words: Array<{ content: string; confidence?: number; isPartial?: boolean; }>; 
    } | null = null;
    
    validResults.forEach(result => {
      const word = result.alternatives[0];
      const speaker = word.speaker || 'UU';

      if (!currentSnippet || currentSnippet.speaker !== speaker) {
        if (currentSnippet) {
          snippets.push(currentSnippet);
        }
        currentSnippet = { 
          speaker, 
          startTime: result.start_time,
          words: [{ content: word.content, confidence: word.confidence }]
        };
      } else {
        currentSnippet.words.push({ content: word.content, confidence: word.confidence });
      }
    });
    
    if (currentSnippet) {
      snippets.push(currentSnippet);
    }
    
    return snippets;
  }, []);

  const finalSnippets = createTranscriptSnippets(speechmaticsResults.finalTranscript || []);
  const partialSnippets = createTranscriptSnippets((speechmaticsResults.activePartialSegment || []).map(r => ({...r, isPartial: true})));

  // Combine final and partial snippets for a seamless display (copied from original TranscriptClient)
  const displaySnippets = useMemo(() => {
    // Start with a deep copy of final snippets to avoid mutation
    const combined = finalSnippets.map(snippet => ({
      ...snippet,
      words: [...snippet.words]
    }));
    
    // Only process partials if they exist
    if (partialSnippets.length === 0) {
      return combined;
    }
    
    const lastFinalSnippet = combined[combined.length - 1];
    const firstPartialSnippet = partialSnippets[0];

    if (lastFinalSnippet && firstPartialSnippet && lastFinalSnippet.speaker === firstPartialSnippet.speaker) {
      // If the same speaker is continuing, merge the words
      const partialWords = firstPartialSnippet.words.map(w => ({ 
        ...w, 
        isPartial: true 
      }));
      lastFinalSnippet.words = [...lastFinalSnippet.words, ...partialWords];
      
      // Add any additional partial snippets from other speakers
      for (let i = 1; i < partialSnippets.length; i++) {
        const additionalPartial = partialSnippets[i];
        combined.push({
          ...additionalPartial,
          words: additionalPartial.words.map(w => ({ ...w, isPartial: true }))
        });
      }
    } else {
      // If it's a new speaker or no final snippets, add all partial snippets
      partialSnippets.forEach(partialSnippet => {
        combined.push({
          ...partialSnippet,
          words: partialSnippet.words.map(w => ({ ...w, isPartial: true }))
        });
      });
    }

    return combined;
  }, [finalSnippets, partialSnippets]);

  // Speaker display info function
  const getSpeakerDisplayInfo = (speakerId: string) => {
    const participantUid = speakerMappings[speakerId];
    if (participantUid) {
      const participant = participants.find(p => p.uid === participantUid);
      if (participant) {
        return {
          name: participant.displayName || `User ${participant.uid.substring(0, 6)}`,
          avatar: participant.uid,
          isAssigned: true,
          isLeader: participant.isLeader
        };
      }
    }
    
    return {
      name: speakerId === 'UU' ? 'Unknown Speaker' : `Speaker ${speakerId.slice(1)}`,
      avatar: null,
      isAssigned: false,
      isLeader: false
    };
  };

  // Filter snippets based on hideUnidentifiedSpeakers setting
  const filteredDisplaySnippets = useMemo(() => {
    if (!hideUnidentifiedSpeakers) {
      return displaySnippets;
    }
    
    return displaySnippets.filter(snippet => {
      const speakerInfo = getSpeakerDisplayInfo(snippet.speaker);
      return speakerInfo.isAssigned;
    });
  }, [displaySnippets, hideUnidentifiedSpeakers, speakerMappings, participants]);

  // Speaker color mapping
  const getSpeakerColor = (speaker: string) => {
    const colors = {
      'S1': { avatar: '#4f46e5' },
      'S2': { avatar: '#e11d48' },
      'S3': { avatar: '#059669' },
      'S4': { avatar: '#d97706' },
      'S5': { avatar: '#9333ea' },
      'UU': { avatar: '#6b7280' }
    };
    return colors[speaker as keyof typeof colors] || { avatar: '#6b7280' };
  };

  // Check microphone permission on component mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // First check if we can get user media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the test stream
        setHasPermission(true);
      } catch (error) {
        console.error('Microphone permission denied:', error);
        setHasPermission(false);
      }
    };

    checkPermission();
  }, []);

  // Set up audio processing and recording
  const setupAudioProcessing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Set up audio context for Speechmatics
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule('/scripts/audio-processor.js');

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
        processorOptions: {
          sampleRate: 16000
        }
      });
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        const audioData = event.data;
        if (audioData && audioData.byteLength > 0) {
          sendSpeechmaticsAudio(audioData);
        }
      };

      source.connect(workletNode);

      // Set up MediaRecorder for continuous audio recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      // Clear previous recording chunks
      recordedAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedAudioChunksRef.current.push(event.data);
        }
      };
      
      // Start continuous recording
      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start();
      
      return true;
    } catch (error) {
      console.error('Error setting up audio processing:', error);
      return false;
    }
  }, [sendSpeechmaticsAudio]);

  const handleStartRecording = async () => {
    try {
      setIsStarting(true);
      
      // Re-check permission when user actually tries to record
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach(track => track.stop());
        setHasPermission(true);
      } catch (permError) {
        console.error('Microphone permission denied:', permError);
        setHasPermission(false);
        alert('Microphone permission is required for transcription. Please allow microphone access and try again.');
        setIsStarting(false);
        return;
      }
      
      // Wait for keywords to be loaded before starting recording
      if (!keywordsLoaded) {
        console.log("[Recording] Waiting for keywords to load...");
        // Wait up to 5 seconds for keywords to load
        const maxWaitTime = 5000;
        const checkInterval = 100;
        let waitTime = 0;
        
        while (!keywordsLoadedRef.current && waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitTime += checkInterval;
          console.log("[Recording] Waiting for keywords... time:", waitTime, "loaded:", keywordsLoadedRef.current);
        }
        
        if (!keywordsLoadedRef.current) {
          console.warn("[Recording] Keywords not loaded in time, starting without custom dictionary");
        } else {
          console.log("[Recording] Keywords loaded successfully after waiting");
        }
      }
      
      console.log("[Recording] Final keywordsLoaded state:", keywordsLoaded);
      console.log("[Recording] Current keywords state:", keywords);
      const customDictionary = prepareCustomDictionary();
      console.log("[Recording] Starting with custom dictionary length:", customDictionary.length);
      console.log("[Recording] Custom dictionary entries:", customDictionary);
      const speechmaticsStarted = await startSpeechmatics(customDictionary);
      if (!speechmaticsStarted) {
        setIsStarting(false);
        return;
      }

      const audioSetup = await setupAudioProcessing();
      if (!audioSetup) {
        await stopSpeechmatics(false);
        setIsStarting(false);
        return;
      }

      setIsRecording(true);
      setIsStarting(false);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsStarting(false);
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      
      // Set up the onstop handler to create the audio URL
      mediaRecorderRef.current.onstop = () => {
        // Create a single audio blob from all chunks
        const audioBlob = new Blob(recordedAudioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
      };
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    await stopSpeechmatics(true);
  };

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await handleStopRecording();
    } else {
      await handleStartRecording();
    }
  }, [isRecording]);

  // Speaker assignment functions
  const handleSpeakerClick = (speakerId: string) => {
    setSelectedSpeaker(speakerId);
    setShowSpeakerModal(true);
  };

  const handleAssignSpeaker = async (participantUid: string) => {
    if (!selectedSpeaker || !transcriptId) return;

    try {
      const newMappings = {
        ...speakerMappings,
        [selectedSpeaker]: participantUid
      };
      
      setSpeakerMappings(newMappings);
      
      // Show "assigned" indicator for this speaker
      setRecentlyAssigned(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedSpeaker);
        return newSet;
      });
      
      // Hide the indicator after 3 seconds
      setTimeout(() => {
        setRecentlyAssigned(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedSpeaker);
          return newSet;
        });
      }, 3000);
      
      // Save to Firestore
      const transcriptRef = doc(db, 'transcripts', transcriptId);
      await updateDoc(transcriptRef, {
        speakerMappings: newMappings
      });
      
      setShowSpeakerModal(false);
      setSelectedSpeaker(null);
    } catch (error) {
      console.error('Error saving speaker assignment:', error);
      alert('Failed to save speaker assignment. Please try again.');
    }
  };



  // Auto-save transcript to Firestore
  const saveTranscriptToFirestore = useCallback(async () => {
    if (!transcriptId || !speechmaticsResults.finalTranscript) return;
    
    try {
      const transcriptRef = doc(db, 'transcripts', transcriptId);
      await updateDoc(transcriptRef, {
        transcriptContent: speechmaticsResults.finalTranscript,
        lastUpdated: new Date()
      });
      console.log("[Auto-save] Transcript saved to Firestore");
    } catch (error) {
      console.error("[Auto-save] Error saving transcript:", error);
    }
  }, [transcriptId, speechmaticsResults.finalTranscript]);

  // Toggle hide unidentified speakers and save preference
  const toggleHideUnidentifiedSpeakers = useCallback(async () => {
    const newValue = !hideUnidentifiedSpeakers;
    setHideUnidentifiedSpeakers(newValue);
    
    if (transcriptId) {
      try {
        const transcriptRef = doc(db, 'transcripts', transcriptId);
        await updateDoc(transcriptRef, {
          hideUnidentifiedSpeakers: newValue
        });
      } catch (error) {
        console.error("Error saving hide preference:", error);
      }
    }
  }, [hideUnidentifiedSpeakers, transcriptId]);

  // Load transcript data
  useEffect(() => {
    if (!transcriptId) {
      setError('No transcript ID provided');
      setLoading(false);
      return;
    }

    const transcriptRef = doc(db, 'transcripts', transcriptId);
    
    const unsubscribe = onSnapshot(
      transcriptRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const transcriptInfo = {
            id: docSnapshot.id,
            eventId: data.eventId,
            sessionNumber: data.sessionNumber,
            articleId: data.articleId,
            leaderUids: data.leaderUids || [],
            participantUids: data.participantUids || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            speakerMappings: data.speakerMappings || {},
            transcriptContent: data.transcriptContent || [],
            hideUnidentifiedSpeakers: data.hideUnidentifiedSpeakers || false,
          };
          
          setTranscriptData(transcriptInfo);
          setSpeakerMappings(data.speakerMappings || {});
          setHideUnidentifiedSpeakers(data.hideUnidentifiedSpeakers || false);
          
          // Initialize keywords from transcript data and article
          const initializeKeywords = async () => {
            try {
              let allKeywords: string[] = [];
              
              // Get keywords from transcript custom keywords
              if (data.customKeywords && Array.isArray(data.customKeywords)) {
                allKeywords = [...data.customKeywords];
              }
              
              // Fetch article data and pronunciation keywords
              if (transcriptInfo.articleId) {
                const articleRef = doc(db, 'articles', transcriptInfo.articleId);
                const articleSnap = await getDoc(articleRef);
                
                if (articleSnap.exists()) {
                  const articleData = articleSnap.data() as ArticleData;
                  setArticleData(articleData);
                  
                  // Add pronunciation keywords from article
                  if (articleData.pronunciation_keywords && Array.isArray(articleData.pronunciation_keywords)) {
                    articleData.pronunciation_keywords.forEach(keyword => {
                      if (!allKeywords.includes(keyword)) {
                        allKeywords.push(keyword);
                      }
                    });
                  }
                }
              }
              
              // Add leader names as keywords
              if (transcriptInfo.leaderUids.length > 0) {
                const userProfiles = await fetchUserProfiles(transcriptInfo.leaderUids);
                userProfiles.forEach(profile => {
                  if (profile.displayName && !allKeywords.includes(profile.displayName)) {
                    allKeywords.push(profile.displayName);
                  }
                });
              }
              
              setKeywords(allKeywords);
              keywordsRef.current = allKeywords;
              console.log("[Keywords] Initialized keywords:", allKeywords);
              console.log("[Keywords] About to set keywordsLoaded to true");
              setKeywordsLoaded(true);
              keywordsLoadedRef.current = true;
              console.log("[Keywords] Keywords loaded state set to true");
            } catch (error) {
              console.error('Error initializing keywords:', error);
              // Even if there's an error, mark keywords as loaded so recording can proceed
              console.log("[Keywords] Error occurred, but marking keywords as loaded anyway");
              setKeywordsLoaded(true);
              keywordsLoadedRef.current = true;
            }
          };
          
          initializeKeywords();
          
          // Fetch user details for participants and leaders
          const fetchParticipantDetails = async () => {
            try {
              const allUids = [...transcriptInfo.leaderUids, ...transcriptInfo.participantUids];
              if (allUids.length > 0) {
                const userProfiles = await fetchUserProfiles(allUids);
                const enhancedProfiles = userProfiles.map(profile => ({
                  ...profile,
                  isLeader: transcriptInfo.leaderUids.includes(profile.uid)
                }));
                setParticipants(enhancedProfiles);
              }
            } catch (error) {
              console.error('Error fetching user details:', error);
            }
          };
          
          fetchParticipantDetails();
          
        } else {
          setError('Transcript not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching transcript:', err);
        setError('Failed to load transcript');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [transcriptId]);

  // Auto-save transcript when it changes
  useEffect(() => {
    if (speechmaticsResults.finalTranscript && speechmaticsResults.finalTranscript.length > 0) {
      // Debounce the save operation
      const saveTimer = setTimeout(() => {
        saveTranscriptToFirestore();
      }, 5000); // Save 5 seconds after last change

      return () => clearTimeout(saveTimer);
    }
  }, [speechmaticsResults.finalTranscript, saveTranscriptToFirestore]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio player control functions
  const toggleAudioPlayback = useCallback(() => {
    if (!audioPlayerRef.current) return;

    if (isAudioPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play();
    }
    setIsAudioPlaying(!isAudioPlaying);
  }, [isAudioPlaying]);

  const seekAudio = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioPlayerRef.current) return;
    
    const progressBar = e.currentTarget;
    const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.clientWidth;
    const seekTime = clickPosition * (audioPlayerRef.current.duration || 0);
    
    audioPlayerRef.current.currentTime = seekTime;
    setAudioCurrentTime(seekTime);
    setAudioProgress(clickPosition * 100);
  }, []);

  const changePlaybackSpeed = useCallback((speed: number) => {
    if (!audioPlayerRef.current) return;
    audioPlayerRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  }, []);

  // Jump to specific timestamp
  const jumpToTimestamp = useCallback((timestamp: number) => {
    if (!audioPlayerRef.current) return;
    audioPlayerRef.current.currentTime = timestamp;
    setAudioCurrentTime(timestamp);
    
    if (!isAudioPlaying) {
      audioPlayerRef.current.play();
      setIsAudioPlaying(true);
    }
  }, [isAudioPlaying]);

  // Handle audio time updates for transcript highlighting
  const handleAudioTimeUpdate = useCallback(() => {
    if (!audioPlayerRef.current) return;
    
    const currentTime = audioPlayerRef.current.currentTime;
    setAudioCurrentTime(currentTime);
    
    // Calculate progress
    const duration = audioPlayerRef.current.duration || 1;
    setAudioProgress((currentTime / duration) * 100);
    
    // Find which snippet should be highlighted based on current time
    // Use original displaySnippets for accurate timestamp mapping
    const currentSnippetIndex = displaySnippets.findIndex((snippet, index) => {
      const nextSnippet = displaySnippets[index + 1];
      return currentTime >= snippet.startTime && 
             (!nextSnippet || currentTime < nextSnippet.startTime);
    });
    
    // Map to filtered index if needed
    let mappedSnippetIndex = -1;
    if (currentSnippetIndex !== -1) {
      const currentSnippet = displaySnippets[currentSnippetIndex];
      mappedSnippetIndex = filteredDisplaySnippets.findIndex(snippet => 
        snippet.speaker === currentSnippet.speaker && 
        snippet.startTime === currentSnippet.startTime
      );
    }
    
    if (mappedSnippetIndex !== -1 && mappedSnippetIndex !== currentlyHighlightedSnippet) {
      setCurrentlyHighlightedSnippet(mappedSnippetIndex);
    }
  }, [displaySnippets, filteredDisplaySnippets, currentlyHighlightedSnippet]);

  // Set up audio player event listeners
  useEffect(() => {
    if (recordedAudioUrl && audioPlayerRef.current) {
      const audio = audioPlayerRef.current;
      
      const handleLoadedMetadata = () => {
        setAudioDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        handleAudioTimeUpdate();
      };

      const handleEnded = () => {
        setIsAudioPlaying(false);
        setCurrentlyHighlightedSnippet(null);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [recordedAudioUrl, handleAudioTimeUpdate]);

  // Keyword management functions
  const addKeyword = async () => {
    if (!newKeyword.trim() || !transcriptId) return;
    
    const trimmedKeyword = newKeyword.trim();
    if (keywords.includes(trimmedKeyword)) {
      alert('Keyword already exists!');
      return;
    }

    try {
      const updatedKeywords = [...keywords, trimmedKeyword];
      setKeywords(updatedKeywords);
      keywordsRef.current = updatedKeywords;
      setNewKeyword('');
      console.log("[Keywords] Added keyword:", trimmedKeyword, "Total keywords:", updatedKeywords.length);
      
      // Save to Firestore
      const transcriptRef = doc(db, 'transcripts', transcriptId);
      await updateDoc(transcriptRef, {
        customKeywords: updatedKeywords
      });
    } catch (error) {
      console.error('Error adding keyword:', error);
      alert('Failed to add keyword. Please try again.');
    }
  };

  const removeKeyword = async (keywordToRemove: string) => {
    if (!transcriptId) return;

    try {
      const updatedKeywords = keywords.filter(keyword => keyword !== keywordToRemove);
      setKeywords(updatedKeywords);
      keywordsRef.current = updatedKeywords;
      
      // Save to Firestore
      const transcriptRef = doc(db, 'transcripts', transcriptId);
      await updateDoc(transcriptRef, {
        customKeywords: updatedKeywords
      });
    } catch (error) {
      console.error('Error removing keyword:', error);
      alert('Failed to remove keyword. Please try again.');
    }
  };

  // Prepare custom dictionary for Speechmatics
  const prepareCustomDictionary = useCallback(() => {
    const currentKeywords = keywordsRef.current;
    console.log("[Custom Dictionary] Using keywords from ref:", currentKeywords);
    const dictionary = currentKeywords.map(keyword => {
      // Add sounds_like for better recognition
      const entry: { content: string; sounds_like?: string[] } = {
        content: keyword,
        sounds_like: [keyword] // Add the exact word as sounds_like
      };
      
      // Add common variations for better recognition
      if (keyword.includes(' ')) {
        // For phrases, add variations without spaces
        entry.sounds_like!.push(keyword.replace(/\s+/g, ''));
      }
      
      // Add variations for names (capitalize first letter)
      if (keyword.toLowerCase() !== keyword) {
        entry.sounds_like!.push(keyword.toLowerCase());
      }
      
      return entry;
    });
    
    console.log("[Custom Dictionary] Prepared dictionary:", JSON.stringify(dictionary, null, 2));
    return dictionary;
  }, []); // No longer depends on keywords state since we use ref

  if (loading) {
    return (
      <Container>
        <LoadingMessage>Loading transcript...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  if (!transcriptData) {
    return (
      <Container>
        <ErrorMessage>Transcript data not available</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>AI Transcript</Title>
        <Controls>
          <BackButton onClick={() => router.back()}>
            ← Back
          </BackButton>
          <RecordButton
            $isRecording={isRecording}
            onClick={toggleRecording}
            disabled={isStarting || !keywordsLoaded}
          >
            {isStarting ? (
              <>
                <PulseIcon />
                Starting...
              </>
            ) : isRecording ? (
              <>
                <PulseIcon />
                Stop Recording
              </>
            ) : !keywordsLoaded ? (
              <>
                <PulseIcon />
                Loading Keywords...
              </>
            ) : (
              <>
                <RecordIcon />
                Start Recording
              </>
            )}
          </RecordButton>
        </Controls>
      </Header>

      <Content>
        {speechmaticsError && (
          <ErrorMessage>
            {speechmaticsError}
          </ErrorMessage>
        )}

        <SessionInfo>
          <SessionTitle>Session {transcriptData.sessionNumber}</SessionTitle>
          <SessionDetail>
            <strong>Article:</strong>{' '}
            {articleData?.title?.english ? (
              <ArticleLink 
                href={`/article/${transcriptData.articleId}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {articleData.title.english}
              </ArticleLink>
            ) : (
              <ArticleLink 
                href={`/article/${transcriptData.articleId}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {transcriptData.articleId}
              </ArticleLink>
            )}
          </SessionDetail>
          <SessionDetail>
            <strong>Leaders:</strong>
            <ParticipantsList>
              {participants
                .filter(participant => participant.isLeader)
                .map(leader => (
                  <ParticipantChip key={leader.uid} $isLeader>
                    <UserAvatar uid={leader.uid} size={24} isLeader={true} />
                    <span>{leader.displayName || `User ${leader.uid.substring(0, 6)}`}</span>
                  </ParticipantChip>
                ))}
              {/* Fallback for UIDs that haven't loaded yet */}
              {participants.filter(p => p.isLeader).length === 0 && transcriptData.leaderUids.map(uid => (
                <ParticipantChip key={uid} $isLeader>
                  <UserAvatar uid={uid} size={24} isLeader={true} />
                  <span>Loading...</span>
                </ParticipantChip>
              ))}
            </ParticipantsList>
          </SessionDetail>
          <SessionDetail>
            <strong>Participants:</strong>
            <ParticipantsList>
              {participants
                .filter(participant => !participant.isLeader)
                .map(participant => (
                  <ParticipantChip key={participant.uid}>
                    <UserAvatar uid={participant.uid} size={24} isLeader={false} />
                    <span>{participant.displayName || `User ${participant.uid.substring(0, 6)}`}</span>
                  </ParticipantChip>
                ))}
              {/* Fallback for UIDs that haven't loaded yet */}
              {participants.filter(p => !p.isLeader).length === 0 && transcriptData.participantUids.map(uid => (
                <ParticipantChip key={uid}>
                  <UserAvatar uid={uid} size={24} isLeader={false} />
                  <span>Loading...</span>
                </ParticipantChip>
              ))}
            </ParticipantsList>
          </SessionDetail>
        </SessionInfo>

        <ConversationDetailContainer>
          <ConversationDetailLeft>
            <AppSpeechDetails>
              <SectionHeader>Keywords</SectionHeader>
              <KeywordManagementSection>
                <KeywordInputContainer>
                  <KeywordInput
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Add a custom keyword..."
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <AddKeywordButton 
                    onClick={addKeyword}
                    disabled={!newKeyword.trim()}
                  >
                    Add
                  </AddKeywordButton>
                </KeywordInputContainer>
                <KeywordsList>
                  {keywords.map(keyword => (
                    <KeywordChip key={keyword}>
                      {keyword}
                      <RemoveKeywordButton 
                        onClick={() => removeKeyword(keyword)}
                        title="Remove keyword"
                      >
                        ×
                      </RemoveKeywordButton>
                    </KeywordChip>
                  ))}
                </KeywordsList>
              </KeywordManagementSection>
            </AppSpeechDetails>
            
            <AppSpeechDetails>
              <SectionHeader>
                <span>Speakers</span>
                <ToggleButton 
                  $active={hideUnidentifiedSpeakers}
                  onClick={toggleHideUnidentifiedSpeakers}
                  title={hideUnidentifiedSpeakers ? "Show unidentified speakers" : "Hide unidentified speakers"}
                >
                  {hideUnidentifiedSpeakers ? "Show All" : "Hide Unknown"}
                </ToggleButton>
              </SectionHeader>
              <LegendContent>
                <LegendSpeakers>
                  <LegendItem>
                    <LegendColor $color="#4f46e5" />
                    Speaker 1
                  </LegendItem>
                  <LegendItem>
                    <LegendColor $color="#e11d48" />
                    Speaker 2
                  </LegendItem>
                  <LegendItem>
                    <LegendColor $color="#059669" />
                    Speaker 3
                  </LegendItem>
                  <LegendItem>
                    <LegendColor $color="#d97706" />
                    Speaker 4
                  </LegendItem>
                  <LegendItem>
                    <LegendColor $color="#9333ea" />
                    Speaker 5
                  </LegendItem>
                  <LegendItem>
                    <LegendColor $color="#6b7280" />
                    Unknown
                  </LegendItem>
                </LegendSpeakers>
                <ConfidenceNote>
                  Low confidence words appear underlined • Click timestamps to jump to audio position • Keywords are used as custom dictionary for better recognition
                  {hideUnidentifiedSpeakers && " • Unidentified speakers are hidden"}
                </ConfidenceNote>
              </LegendContent>
            </AppSpeechDetails>

                         {/* Render transcript snippets */}
             {filteredDisplaySnippets.map((snippet, index) => {
               const speakerColor = getSpeakerColor(snippet.speaker);
               const speakerInfo = getSpeakerDisplayInfo(snippet.speaker);
               const hasAudio = !!recordedAudioUrl;
               const isHighlighted = currentlyHighlightedSnippet === index;
               
               return (
                 <TranscriptSnippet 
                   key={`snippet-${index}`}
                   style={{ 
                     backgroundColor: isHighlighted ? '#fff2cc' : 'transparent',
                     transition: 'background-color 0.3s ease'
                   }}
                 >
                   <div>
                     {speakerInfo.isAssigned && speakerInfo.avatar ? (
                       <UserAvatar 
                         uid={speakerInfo.avatar} 
                         size={40} 
                         isLeader={speakerInfo.isLeader}
                         onClick={() => handleSpeakerClick(snippet.speaker)}
                       />
                     ) : (
                       <SpeakerAvatar 
                         $bgColor={speakerColor.avatar} 
                         $textColor="#ffffff"
                         onClick={() => handleSpeakerClick(snippet.speaker)}
                       >
                         {snippet.speaker === 'UU' ? 'U' : snippet.speaker.slice(1)}
                       </SpeakerAvatar>
                     )}
                     {speakerInfo.isAssigned && recentlyAssigned.has(snippet.speaker) && (
                       <AssignedSpeakerInfo>
                         ✓ Assigned
                       </AssignedSpeakerInfo>
                     )}
                   </div>
                   <TranscriptContent>
                     <TranscriptHeadRow>
                       <SpeakerName $color={speakerColor.avatar}>
                         {speakerInfo.name}
                       </SpeakerName>
                       <Timestamp 
                         style={{ cursor: hasAudio ? 'pointer' : 'default' }}
                         onClick={() => hasAudio && jumpToTimestamp(snippet.startTime)}
                       >
                         {formatTimestamp(snippet.startTime)}
                       </Timestamp>
                     </TranscriptHeadRow>
                     <TranscriptBody>
                       {snippet.words.map((word, wordIndex) => (
                         <WordSpan
                           key={`word-${index}-${wordIndex}`}
                           $lowConfidence={word.confidence !== undefined && word.confidence < 0.9}
                           $isPartial={word.isPartial}
                         >
                           {word.content}
                         </WordSpan>
                       ))}
                     </TranscriptBody>
                   </TranscriptContent>
                 </TranscriptSnippet>
               );
             })}

            {filteredDisplaySnippets.length === 0 && (
              <EmptyState>
                {displaySnippets.length === 0 
                  ? (isRecording ? 'Listening...' : 'Click "Start Recording" to begin.')
                  : 'All speakers are hidden. Toggle "Show All" to see unidentified speakers.'
                }
              </EmptyState>
            )}

          </ConversationDetailLeft>
        </ConversationDetailContainer>
      </Content>

      {/* Speaker Assignment Modal */}
      {showSpeakerModal && selectedSpeaker && (
        <ModalOverlay onClick={() => setShowSpeakerModal(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Assign Speaker</ModalTitle>
            <ModalSubtitle>
              Who is {selectedSpeaker === 'UU' ? 'Unknown Speaker' : `Speaker ${selectedSpeaker.slice(1)}`}? 
              Click on a participant to assign them to this speaker.
            </ModalSubtitle>
            
            <ParticipantGrid>
              {participants.map((participant) => (
                <ParticipantOption
                  key={participant.uid}
                  onClick={() => handleAssignSpeaker(participant.uid)}
                >
                  <UserAvatar 
                    uid={participant.uid} 
                    size={40} 
                    isLeader={participant.isLeader}
                  />
                  <ParticipantInfo>
                    <ParticipantName>
                      {participant.displayName || `User ${participant.uid.substring(0, 6)}`}
                    </ParticipantName>
                    <ParticipantRole>
                      {participant.isLeader ? 'Leader' : 'Participant'}
                    </ParticipantRole>
                  </ParticipantInfo>
                </ParticipantOption>
              ))}
            </ParticipantGrid>

            <ModalActions>
              <ModalButton onClick={() => setShowSpeakerModal(false)}>
                Cancel
              </ModalButton>
            </ModalActions>
          </ModalContainer>
        </ModalOverlay>
      )}

      {/* Audio Player */}
      {recordedAudioUrl && (
        <>
          <AudioPlayerContainer $isVisible={!!recordedAudioUrl}>
            <AudioControls>
              <AudioButton onClick={toggleAudioPlayback}>
                {isAudioPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '1.5rem', height: '1.5rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" style={{ width: '1.5rem', height: '1.5rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                )}
              </AudioButton>
              <AudioTime>{formatTime(audioCurrentTime)}</AudioTime>
            </AudioControls>

            <AudioProgress onClick={seekAudio}>
              <AudioProgressFill $progress={audioProgress} />
            </AudioProgress>

            <AudioControls>
              <AudioTime>{formatTime(audioDuration)}</AudioTime>
              <SpeedButton 
                $active={playbackSpeed === 0.75} 
                onClick={() => changePlaybackSpeed(0.75)}
              >
                0.75×
              </SpeedButton>
              <SpeedButton 
                $active={playbackSpeed === 1} 
                onClick={() => changePlaybackSpeed(1)}
              >
                1×
              </SpeedButton>
              <SpeedButton 
                $active={playbackSpeed === 1.25} 
                onClick={() => changePlaybackSpeed(1.25)}
              >
                1.25×
              </SpeedButton>
              <SpeedButton 
                $active={playbackSpeed === 1.5} 
                onClick={() => changePlaybackSpeed(1.5)}
              >
                1.5×
              </SpeedButton>
            </AudioControls>
          </AudioPlayerContainer>

          {/* Hidden audio element */}
          <audio
            ref={audioPlayerRef}
            src={recordedAudioUrl}
            preload="metadata"
            style={{ display: 'none' }}
          />
        </>
      )}
    </Container>
  );
} 