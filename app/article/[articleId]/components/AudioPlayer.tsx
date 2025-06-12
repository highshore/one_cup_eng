"use client";

import React from "react";
import styled from "styled-components";

import { colors } from "../constants/colors";

const AudioPlayerContainer = styled.div<{ isVisible: boolean }>`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%)
    translateY(${(props) => (props.isVisible ? "0" : "100%")});
  width: 100%;
  max-width: 850px;
  background: ${colors.primary};
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
  -webkit-tap-highlight-color: transparent;

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

const AudioProgressFill = styled.div<{ progress: number }>`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: ${(props) => props.progress}%;
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

const SpeedButton = styled.button<{ active: boolean }>`
  background: ${(props) => (props.active ? colors.accent : "transparent")};
  color: white;
  border: 1px solid ${colors.accent};
  border-radius: 20px;
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${colors.accent};
  }

  &:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
`;

interface AudioPlayerProps {
  isVisible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioProgress: number;
  playbackSpeed: number;
  onTogglePlayPause: () => void;
  onSeekAudio: (e: React.MouseEvent<HTMLDivElement>) => void;
  onChangePlaybackSpeed: (speed: number) => void;
  formatTime: (time: number) => string;
}

// SVG components for play/pause
const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    style={{ width: "1.5rem", height: "1.5rem" }}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
    />
  </svg>
);

const PauseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    style={{ width: "1.5rem", height: "1.5rem" }}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 5.25v13.5m-7.5-13.5v13.5"
    />
  </svg>
);

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isVisible,
  isPlaying,
  currentTime,
  duration,
  audioProgress,
  playbackSpeed,
  onTogglePlayPause,
  onSeekAudio,
  onChangePlaybackSpeed,
  formatTime,
}) => {
  return (
    <AudioPlayerContainer isVisible={isVisible}>
      <AudioControls>
        <AudioButton onClick={onTogglePlayPause}>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </AudioButton>
        <AudioTime>{formatTime(currentTime)}</AudioTime>
      </AudioControls>

      <AudioProgress onClick={onSeekAudio}>
        <AudioProgressFill progress={audioProgress} />
      </AudioProgress>

      <AudioControls>
        <AudioTime>{formatTime(duration)}</AudioTime>
        <SpeedButton
          onClick={() => onChangePlaybackSpeed(0.75)}
          active={playbackSpeed === 0.75}
        >
          Slower
        </SpeedButton>
        <SpeedButton
          onClick={() => onChangePlaybackSpeed(1)}
          active={playbackSpeed === 1}
        >
          Normal
        </SpeedButton>
      </AudioControls>
    </AudioPlayerContainer>
  );
};

export default AudioPlayer;
