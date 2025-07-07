"use client";

import React from "react";
import styled from "styled-components";

import { colors } from "../constants/colors";

const FloatingButtonContainer = styled.div<{
  isAudioMode?: boolean;
  isVisible: boolean;
}>`
  position: fixed;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%)
    translateX(${(props) => (props.isVisible ? "0" : "calc(100% + 1.5rem)")});
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid ${colors.primaryPale};
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    right: 1rem;
    padding: 0.6rem;
    gap: 0.4rem;
  }

  @media (max-width: 480px) {
    position: fixed;
    right: 1rem;
    bottom: ${(props) => (props.isAudioMode ? "90px" : "1rem")};
    top: auto;
    transform: translateX(
      ${(props) => (props.isVisible ? "0" : "calc(100% + 1rem)")}
    );
    flex-direction: row;
    padding: 0.5rem;
    transition: all 0.3s ease;
  }

  &:hover {
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
    transform: translateY(-50%) scale(1.02)
      translateX(${(props) => (props.isVisible ? "0" : "calc(100% + 1.5rem)")});

    @media (max-width: 480px) {
      transform: scale(1.02)
        translateX(${(props) => (props.isVisible ? "0" : "calc(100% + 1rem)")});
    }
  }
`;

const ToggleControlsButton = styled.button`
  position: fixed;
  right: 1rem;
  top: 45%;
  transform: translateY(-50%);
  z-index: 101;
  background: ${colors.primary};
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  &:hover {
    background: ${colors.primaryLight};
    transform: translateY(-50%) scale(1.1);
  }

  @media (max-width: 480px) {
    right: 1rem;
    bottom: 20px;
    top: auto;
    transform: none;

    &:hover {
      transform: scale(1.1);
    }
  }
`;

const FloatingButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  background: ${colors.primary};
  color: white;
  border: none;
  padding: 0.5rem 0.7rem;
  border-radius: 12px;
  font-size: 0.75rem;
  cursor: pointer;
  min-height: 2.2rem;
  box-sizing: border-box;
  transition: all 0.3s ease;
  white-space: nowrap;

  @media (max-width: 768px) {
    padding: 0.45rem 0.6rem;
    font-size: 0.7rem;
    min-height: 2rem;
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.5rem;
    font-size: 0.65rem;
    min-height: 1.8rem;
    gap: 0.2rem;
  }

  &:hover {
    background: ${colors.primaryLight};
    transform: translateY(-1px);
  }

  &.active {
    background: ${colors.accent};
  }

  &:disabled {
    background: ${colors.text.light};
    cursor: not-allowed;
    transform: none;
  }
`;

const FloatingAudioButton = styled(FloatingButton)`
  background: ${colors.primaryDark};

  &.active {
    background: ${colors.accent};
  }

  &:hover:not(:disabled) {
    background: ${colors.primary};
  }
`;

interface FloatingControlsProps {
  isAudioMode: boolean;
  hasAudio: boolean;
  onToggleAudioMode: () => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const FloatingControls: React.FC<FloatingControlsProps> = ({
  isAudioMode,
  hasAudio,
  onToggleAudioMode,
  isVisible,
  onToggleVisibility,
}) => {
  return (
    <>
      {/* Toggle Button */}
      <ToggleControlsButton onClick={onToggleVisibility}>
        {isVisible ? "✕" : "⚙️"}
      </ToggleControlsButton>

      {/* Floating Controls Container */}
      <FloatingButtonContainer isAudioMode={isAudioMode} isVisible={isVisible}>
        {hasAudio && (
          <FloatingAudioButton
            onClick={onToggleAudioMode}
            className={isAudioMode ? "active" : ""}
          >
            {isAudioMode ? "✕ 오디오 해제" : "🎧 오디오 모드"}
          </FloatingAudioButton>
        )}
      </FloatingButtonContainer>
    </>
  );
};

export default FloatingControls;
