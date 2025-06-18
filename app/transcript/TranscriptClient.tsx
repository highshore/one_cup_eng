'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useSpeechmatics } from './hooks/useSpeechmatics';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Title = styled.h1`
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
`;

const InputSection = styled.div`
  margin-bottom: 2rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #34495e;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 1rem;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ControlsSection = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'danger' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background-color: #27ae60;
          color: white;
          &:hover { background-color: #229954; }
          &:disabled { background-color: #95a5a6; cursor: not-allowed; }
        `;
      case 'danger':
        return `
          background-color: #e74c3c;
          color: white;
          &:hover { background-color: #c0392b; }
          &:disabled { background-color: #95a5a6; cursor: not-allowed; }
        `;
      default:
        return `
          background-color: #3498db;
          color: white;
          &:hover { background-color: #2980b9; }
          &:disabled { background-color: #95a5a6; cursor: not-allowed; }
        `;
    }
  }}
`;

const StatusSection = styled.div`
  margin-bottom: 2rem;
`;

const StatusIndicator = styled.div<{ $isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  
  ${props => props.$isActive ? `
    background-color: #d5edda;
    color: #155724;
  ` : `
    background-color: #f8d7da;
    color: #721c24;
  `}
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: currentColor;
  }
`;

const ErrorMessage = styled.div`
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
`;

const TranscriptSection = styled.div`
  background-color: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  min-height: 200px;
`;

const TranscriptTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #495057;
`;

const TranscriptContent = styled.div`
  line-height: 1.6;
  color: #212529;
`;

const PartialTranscript = styled.span`
  color: #6c757d;
  font-style: italic;
`;

const FinalTranscript = styled.span`
  color: #212529;
  font-weight: 500;
`;

const WordSpan = styled.span<{ $lowConfidence?: boolean; $isPartial?: boolean }>`
  color: ${props => {
    if (props.$lowConfidence) return '#e74c3c';
    if (props.$isPartial) return '#6c757d';
    return '#212529';
  }};
  font-weight: ${props => props.$lowConfidence ? '600' : '500'};
  font-style: ${props => props.$isPartial ? 'italic' : 'normal'};
  text-decoration: ${props => props.$lowConfidence ? 'underline' : 'none'};
  text-decoration-color: ${props => props.$lowConfidence ? '#e74c3c' : 'transparent'};
  margin-right: 0.25rem;
  
  &:last-child {
    margin-right: 0;
  }
`;

const SpeakerSegment = styled.div<{ $speakerColor: string }>`
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-left: 4px solid ${props => props.$speakerColor};
  background-color: ${props => props.$speakerColor}15;
  border-radius: 4px;
`;

const SpeakerLabel = styled.span<{ $speakerColor: string }>`
  font-weight: 600;
  color: ${props => props.$speakerColor};
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  display: inline-block;
`;

const SpeakerLegend = styled.div`
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
`;

const LegendTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  color: #495057;
  font-size: 0.9rem;
`;

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  margin-right: 1rem;
  margin-bottom: 0.25rem;
`;

const LegendColor = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  background-color: ${props => props.$color};
  border-radius: 50%;
  margin-right: 0.5rem;
`;

const LegendText = styled.span`
  font-size: 0.85rem;
  color: #495057;
`;

export default function TranscriptClient() {
  // State for target sentence input
  const [targetSentence, setTargetSentence] = useState<string>('');
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  
  // Speechmatics hook
  const {
    speechmaticsResults: { activePartialSegment, finalTranscript },
    speechmaticsError,
    isSpeechmaticsSocketOpen,
    startSpeechmatics,
    stopSpeechmatics,
    sendSpeechmaticsAudio,
  } = useSpeechmatics(targetSentence);

  // Request microphone permission on component mount
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
  }, []);

  // Set up audio processing
  const setupAudioProcessing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Load the audio processor worklet
      await audioContext.audioWorklet.addModule('/scripts/audio-processor.js');

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor', {
        processorOptions: {
          sampleRate: 16000
        }
      });
      workletNodeRef.current = workletNode;

      // Handle processed audio data
      workletNode.port.onmessage = (event) => {
        const audioData = event.data;
        // console.log('[AudioProcessor] Received audio data:', audioData?.byteLength, 'bytes');
        if (audioData && audioData.byteLength > 0) {
          sendSpeechmaticsAudio(audioData);
        }
      };

      source.connect(workletNode);
      // Don't connect to destination to avoid feedback
      // workletNode.connect(audioContext.destination);

      return true;
    } catch (error) {
      console.error('Error setting up audio processing:', error);
      return false;
    }
  }, [sendSpeechmaticsAudio]);

  // Start recording function
  const startRecording = useCallback(async () => {
    if (!hasPermission) {
      alert('Microphone permission is required for transcription.');
      return;
    }

    try {
      // Start Speechmatics
      const speechmaticsStarted = await startSpeechmatics();
      if (!speechmaticsStarted) {
        return;
      }

      // Set up audio processing
      const audioSetup = await setupAudioProcessing();
      if (!audioSetup) {
        await stopSpeechmatics(false);
        return;
      }

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [targetSentence, hasPermission, startSpeechmatics, setupAudioProcessing, stopSpeechmatics]);

  // Stop recording function
  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    // Stop audio processing
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

    // Stop Speechmatics
    await stopSpeechmatics(true);
  }, [stopSpeechmatics]);

  // Speaker colors for diarization
  const getSpeakerColor = useCallback((speaker: string) => {
    const colors = {
      'S1': '#3498db', // Blue
      'S2': '#e74c3c', // Red
      'S3': '#2ecc71', // Green
      'S4': '#f39c12', // Orange
      'S5': '#9b59b6', // Purple
      'UU': '#95a5a6', // Gray for unknown
    };
    return colors[speaker as keyof typeof colors] || '#34495e';
  }, []);

  // Group transcript results by speaker with individual word data
  const groupBySpeaker = useCallback((results: any[]) => {
    const validResults = results.filter(result => result.alternatives && result.alternatives.length > 0);
    const groups: Array<{ 
      speaker: string; 
      words: Array<{ content: string; confidence?: number; }>; 
      isPartial: boolean 
    }> = [];
    
    let currentGroup: { 
      speaker: string; 
      words: Array<{ content: string; confidence?: number; }>; 
      isPartial: boolean 
    } | null = null;
    
    validResults.forEach(result => {
      const content = result.alternatives[0].content;
      const confidence = result.alternatives[0].confidence;
      const speaker = result.alternatives[0].speaker || 'UU';
      
      if (!currentGroup || currentGroup.speaker !== speaker) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = { speaker, words: [{ content, confidence }], isPartial: false };
      } else {
        currentGroup.words.push({ content, confidence });
      }
    });
    
    if (currentGroup) {
      groups.push(currentGroup);
    }
    
    return groups;
  }, []);

  // Format transcript for display with speaker diarization
  const formatTranscript = useCallback(() => {
    const finalGroups = groupBySpeaker(finalTranscript);
    const partialGroups = groupBySpeaker(activePartialSegment.map(result => ({
      ...result,
      isPartial: true
    })));

    return { finalGroups, partialGroups };
  }, [finalTranscript, activePartialSegment, groupBySpeaker]);

  const { finalGroups, partialGroups } = formatTranscript();

  return (
    <Container>
      <Title>Speech Transcription</Title>
      
      <InputSection>
        <Label htmlFor="target-sentence">Target Sentence (Optional)</Label>
        <TextArea
          id="target-sentence"
          value={targetSentence}
          onChange={(e) => setTargetSentence(e.target.value)}
          placeholder="Enter the sentence you want to practice speaking..."
          disabled={isRecording}
        />
      </InputSection>

      <ControlsSection>
        <Button
          variant="primary"
          onClick={startRecording}
          disabled={isRecording || hasPermission === false}
        >
          {isRecording ? 'Recording...' : 'Start Recording'}
        </Button>
        
        <Button
          variant="danger"
          onClick={stopRecording}
          disabled={!isRecording}
        >
          Stop Recording
        </Button>
      </ControlsSection>

             <StatusSection>
         <StatusIndicator $isActive={hasPermission === true}>
           Microphone: {hasPermission === null ? 'Checking...' : hasPermission ? 'Enabled' : 'Disabled'}
         </StatusIndicator>
         {' '}
         <StatusIndicator $isActive={isSpeechmaticsSocketOpen}>
           Speechmatics: {isSpeechmaticsSocketOpen ? 'Connected' : 'Disconnected'}
         </StatusIndicator>
       </StatusSection>

      {speechmaticsError && (
        <ErrorMessage>
          {speechmaticsError}
        </ErrorMessage>
      )}

      <TranscriptSection>
        <TranscriptTitle>Live Transcript with Speaker Diarization</TranscriptTitle>
        
        <SpeakerLegend>
          <LegendTitle>Legend</LegendTitle>
          <div style={{ marginBottom: '0.5rem' }}>
            <LegendItem>
              <LegendColor $color="#3498db" />
              <LegendText>Speaker 1</LegendText>
            </LegendItem>
            <LegendItem>
              <LegendColor $color="#e74c3c" />
              <LegendText>Speaker 2</LegendText>
            </LegendItem>
            <LegendItem>
              <LegendColor $color="#2ecc71" />
              <LegendText>Speaker 3</LegendText>
            </LegendItem>
            <LegendItem>
              <LegendColor $color="#f39c12" />
              <LegendText>Speaker 4</LegendText>
            </LegendItem>
            <LegendItem>
              <LegendColor $color="#9b59b6" />
              <LegendText>Speaker 5</LegendText>
            </LegendItem>
            <LegendItem>
              <LegendColor $color="#95a5a6" />
              <LegendText>Unknown</LegendText>
            </LegendItem>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
            <strong style={{ color: '#e74c3c' }}>Red underlined words</strong>: Confidence &lt; 70%
          </div>
        </SpeakerLegend>
        
        <TranscriptContent>
          {/* Render final transcript groups */}
          {finalGroups.map((group, index) => (
            <SpeakerSegment key={`final-${index}`} $speakerColor={getSpeakerColor(group.speaker)}>
              <SpeakerLabel $speakerColor={getSpeakerColor(group.speaker)}>
                {group.speaker === 'UU' ? 'Unknown Speaker' : `Speaker ${group.speaker.slice(1)}`}:
              </SpeakerLabel>
              <br />
              <div>
                {group.words.map((word, wordIndex) => (
                  <WordSpan
                    key={`final-word-${index}-${wordIndex}`}
                    $lowConfidence={word.confidence !== undefined && word.confidence < 0.7}
                    $isPartial={false}
                  >
                    {word.content}
                  </WordSpan>
                ))}
              </div>
            </SpeakerSegment>
          ))}
          
          {/* Render partial transcript groups */}
          {partialGroups.map((group, index) => (
            <SpeakerSegment key={`partial-${index}`} $speakerColor={getSpeakerColor(group.speaker)}>
              <SpeakerLabel $speakerColor={getSpeakerColor(group.speaker)}>
                {group.speaker === 'UU' ? 'Unknown Speaker' : `Speaker ${group.speaker.slice(1)}`}:
              </SpeakerLabel>
              <br />
              <div>
                {group.words.map((word, wordIndex) => (
                  <WordSpan
                    key={`partial-word-${index}-${wordIndex}`}
                    $lowConfidence={word.confidence !== undefined && word.confidence < 0.7}
                    $isPartial={true}
                  >
                    {word.content}
                  </WordSpan>
                ))}
              </div>
            </SpeakerSegment>
          ))}
          
          {finalGroups.length === 0 && partialGroups.length === 0 && (
            <span style={{ color: '#6c757d' }}>
              {isRecording ? 'Listening...' : 'Start recording to see transcript here'}
            </span>
          )}
        </TranscriptContent>
      </TranscriptSection>
    </Container>
  );
} 