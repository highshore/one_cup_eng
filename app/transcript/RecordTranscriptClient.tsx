'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useSpeechmatics } from './hooks/useSpeechmatics';
import { colors } from '../lib/constants/colors';

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
  margin-right: 0; /* spacing handled programmatically to avoid gaps before punctuation */
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
  padding-bottom: 80px; /* Add space for audio player */
`;

// Removed sticky header bar in favor of inline top controls

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${colors.text.dark};
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// Removed ProviderSelector (Speechmatics-only)

const StatusAndLegendSection = styled.div`
  padding: 1rem 2rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const StatusIndicator = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  background: transparent;
  color: ${props => props.$isActive ? '#166534' : '#991b1b'};
  border: 1px solid ${props => props.$isActive ? '#bbf7d0' : '#fecaca'};
`;

const StatusDot = styled.div<{ $isActive: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${props => props.$isActive ? '#22c55e' : '#ef4444'};
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
    background: #ef4444;
    color: white;
    &:hover {
      background: #dc2626;
    }
  ` : `
    background: ${colors.primary};
    color: white;
    &:hover {
      background: ${colors.primaryLight};
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

// Removed page title row for a cleaner look

const ErrorMessage = styled.div`
  margin-bottom: 2rem;
  padding: 1rem 1.5rem;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 8px;
  border: 1px solid #fecaca;
  font-size: 0.875rem;
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

const AudioPlayer = styled.audio`
  width: 100%;
  margin-top: 1rem;
  border-radius: 8px;
`;

const PlayButton = styled.button<{ $isPlaying: boolean }>`
  background: ${props => props.$isPlaying ? '#ef4444' : '#22c55e'};
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
  margin-left: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

// Audio Player Components
const AudioPlayerContainer = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) translateY(${props => props.$isVisible ? '0' : '100%'});
  width: 100%;
  max-width: 850px;
  background: ${colors.primaryDark};
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
  background: ${colors.accent};
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

export default function RecordTranscriptClient() {
  // Speechmatics-only
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
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
  const lastAudioSentAtRef = useRef<number>(0);
  const keepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Speechmatics hook
  const {
    speechmaticsResults: { activePartialSegment: speechmaticsPartial, finalTranscript: speechmaticsFinal },
    speechmaticsError,
    isSpeechmaticsSocketOpen,
    startSpeechmatics,
    stopSpeechmatics,
    sendSpeechmaticsAudio,
  } = useSpeechmatics();

  // Unified state (Speechmatics)
  const activePartialSegment = speechmaticsPartial;
  const finalTranscript = speechmaticsFinal;
  const transcriptionError = speechmaticsError;
  const isSocketOpen = isSpeechmaticsSocketOpen;

  // Request microphone permission on component mount
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
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
          lastAudioSentAtRef.current = Date.now();
          sendSpeechmaticsAudio(audioData);
        }
      };

      source.connect(workletNode);

      // Reacquire mic if track ends (e.g., device switch)
      const [track] = stream.getAudioTracks();
      if (track) {
        track.onended = async () => {
          if (!isRecording) return;
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = newStream;
            const newSource = audioContext.createMediaStreamSource(newStream);
            newSource.connect(workletNode);

            // Recreate MediaRecorder for local recording
            const newRecorder = new MediaRecorder(newStream, { mimeType: 'audio/webm;codecs=opus' });
            mediaRecorderRef.current = newRecorder;
            newRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) recordedAudioChunksRef.current.push(e.data);
            };
            newRecorder.start();
          } catch (reErr) {
            console.error('Failed to reacquire microphone after track ended:', reErr);
          }
        };
      }

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
      
      mediaRecorder.onstop = () => {
        // Create a single audio blob from all chunks
        const audioBlob = new Blob(recordedAudioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
      };
      
      // Start continuous recording
      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start();
      
      return true;
    } catch (error) {
      console.error('Error setting up audio processing:', error);
      return false;
    }
  }, [sendSpeechmaticsAudio, isRecording]);

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

  // Format time helper
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  };

  // Determine if a token is punctuation or should be attached to previous word
  const isPunctuationOrAttached = (word: { content: string; confidence?: number } | any): boolean => {
    if (!word || !word.content) return false;
    const punctuationPattern = /^[.,!?;:'")\]}>-]+$/;
    const contractionPattern = /^'[a-z]+$/i; // 's, 't, 'll, etc.
    return punctuationPattern.test(word.content) || contractionPattern.test(word.content);
  };

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

  // Toggle recording function
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
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
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    } else {
      // Start recording
      if (!hasPermission) {
        alert('Microphone permission is required for transcription.');
        return;
      }

      try {
        setIsStarting(true);
        
        // Clear previous recording data
        setRecordedAudioUrl(null);
        setCurrentlyHighlightedSnippet(null);
        setIsAudioPlaying(false);
        
        let providerStarted = await startSpeechmatics();
        
        if (!providerStarted) {
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

        // Start keepalive to avoid provider timeout when tab is backgrounded
        lastAudioSentAtRef.current = Date.now();
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }
        keepAliveIntervalRef.current = setInterval(() => {
          if (!isSpeechmaticsSocketOpen) return;
          const now = Date.now();
          if (now - lastAudioSentAtRef.current > 1500) {
            // Send ~256ms of silence
            const silent = new Float32Array(4096); // 4096 samples at 16kHz ≈ 256ms
            try {
              sendSpeechmaticsAudio(silent.buffer);
              lastAudioSentAtRef.current = now;
            } catch (e) {
              // noop
            }
          }
        }, 800);
      } catch (error) {
        console.error('Error starting recording:', error);
        setIsStarting(false);
      }
    }
  }, [isRecording, hasPermission, startSpeechmatics, setupAudioProcessing, stopSpeechmatics, isSpeechmaticsSocketOpen, sendSpeechmaticsAudio]);

  // Resume AudioContext when tab becomes visible
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
        lastAudioSentAtRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Speaker colors for diarization
  const getSpeakerColor = useCallback((speaker: string) => {
    // A more distinct and modern color palette
    const colors = {
      'S1': { bg: '#e0e7ff', text: '#4338ca', avatar: '#4f46e5' }, // Indigo
      'S2': { bg: '#ffe4e6', text: '#be123c', avatar: '#e11d48' }, // Rose
      'S3': { bg: '#d1fae5', text: '#047857', avatar: '#059669' }, // Emerald
      'S4': { bg: '#fef3c7', text: '#b45309', avatar: '#d97706' }, // Amber
      'S5': { bg: '#f3e8ff', text: '#7e22ce', avatar: '#9333ea' }, // Purple
      'UU': { bg: '#e5e7eb', text: '#4b5563', avatar: '#6b7280' }, // Gray
    };
    return colors[speaker as keyof typeof colors] || colors['UU'];
  }, []);

  // Group transcript results into snippets for rendering
  const createTranscriptSnippets = useCallback((results: any[]) => {
    const validResults = results.filter(result => result.alternatives && result.alternatives.length > 0 && result.alternatives[0].content);
    if (validResults.length === 0) return [];
    
    const snippets: Array<{ 
      speaker: string;
      startTime: number;
      words: Array<{ content: string; confidence?: number; }>; 
    }> = [];
    
    let currentSnippet: { 
      speaker: string;
      startTime: number;
      words: Array<{ content: string; confidence?: number; }>; 
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

  const formatTimestamp = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const finalSnippets = createTranscriptSnippets(finalTranscript);
  const partialSnippets = createTranscriptSnippets(activePartialSegment.map(r => ({...r, isPartial: true})));

  // Combine final and partial snippets for a seamless display
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

  // Handle audio time updates for transcript highlighting
  const handleAudioTimeUpdate = useCallback(() => {
    if (!audioPlayerRef.current) return;
    
    const currentTime = audioPlayerRef.current.currentTime;
    setAudioCurrentTime(currentTime);
    
    // Calculate progress
    const duration = audioPlayerRef.current.duration || 1;
    setAudioProgress((currentTime / duration) * 100);
    
    // Find which snippet should be highlighted based on current time
    const currentSnippetIndex = displaySnippets.findIndex((snippet, index) => {
      const nextSnippet = displaySnippets[index + 1];
      return currentTime >= snippet.startTime && 
             (!nextSnippet || currentTime < nextSnippet.startTime);
    });
    
    if (currentSnippetIndex !== -1 && currentSnippetIndex !== currentlyHighlightedSnippet) {
      setCurrentlyHighlightedSnippet(currentSnippetIndex);
    }
  }, [displaySnippets, currentlyHighlightedSnippet]);

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

  // Placeholder data for Keywords and Speakers sections
  const keywords = ["Speechmatics", "Real-time", "Diarization", "API", "Transcription"];
  const speakers = [{ name: "Speaker 1", percentage: "60%" }, { name: "Speaker 2", percentage: "40%" }];

  return (
    <Container>
      <Content>
        
        {transcriptionError && (
          <ErrorMessage>
            {transcriptionError}
          </ErrorMessage>
        )}

        <ConversationDetailContainer>
          <ConversationDetailLeft>
            <AppSpeechDetails>
              <SectionHeader>Keywords</SectionHeader>
              <KeywordsContainer>
                {keywords.map(kw => <KeywordTag key={kw}>{kw}</KeywordTag>)}
              </KeywordsContainer>
            </AppSpeechDetails>
            
            <AppSpeechDetails>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem'}}>
                <SectionHeader style={{margin:0,borderBottom:'none',paddingBottom:0}}>Speakers</SectionHeader>
                <Controls>
                  <RecordButton
                    $isRecording={isRecording}
                    onClick={toggleRecording}
                    disabled={hasPermission === false || isStarting}
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
                    ) : (
                      <>
                        <RecordIcon />
                        Start Recording
                      </>
                    )}
                  </RecordButton>
                </Controls>
              </div>
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
                  Low confidence words appear underlined • Click timestamps to jump to audio position
                </ConfidenceNote>
              </LegendContent>
            </AppSpeechDetails>

            {/* Render combined transcript snippets */}
            {displaySnippets.map((snippet, index) => {
              const speakerColor = getSpeakerColor(snippet.speaker);
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
                  <SpeakerAvatar $bgColor={speakerColor.avatar} $textColor="#ffffff">
                    {snippet.speaker === 'UU' ? 'U' : snippet.speaker.slice(1)}
                  </SpeakerAvatar>
                  <TranscriptContent>
                    <TranscriptHeadRow>
                      <SpeakerName $color={speakerColor.avatar}>
                        {snippet.speaker === 'UU' ? 'Unknown Speaker' : `Speaker ${snippet.speaker.slice(1)}`}
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
                          $isPartial={(word as any).isPartial}
                        >
                          {word.content}
                          {!isPunctuationOrAttached(word) ? ' ' : ''}
                        </WordSpan>
                      ))}
                    </TranscriptBody>
                  </TranscriptContent>
                </TranscriptSnippet>
              );
            })}

            {displaySnippets.length === 0 && (
              <EmptyState>
                {isRecording ? 'Listening...' : 'Click "Start Recording" to begin.'}
              </EmptyState>
            )}

          </ConversationDetailLeft>
        </ConversationDetailContainer>
      </Content>

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