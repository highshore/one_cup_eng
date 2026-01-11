import React from "react";
import styled from "styled-components";

interface FloatingControlsProps {
  isAudioMode: boolean;
  hasAudio: boolean;
  onToggleAudioMode: () => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const Container = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  bottom: 80px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: ${props => props.$isVisible ? 1 : 0};
  pointer-events: ${props => props.$isVisible ? 'auto' : 'none'};
  transition: opacity 0.3s ease;
  z-index: 99;
`;

const Button = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
`;

export default function FloatingControls({
  hasAudio,
  onToggleAudioMode,
  isVisible
}: FloatingControlsProps) {
  if (!hasAudio) return null;

  return (
    <Container $isVisible={isVisible}>
      <Button onClick={onToggleAudioMode}>🎧</Button>
    </Container>
  );
}
