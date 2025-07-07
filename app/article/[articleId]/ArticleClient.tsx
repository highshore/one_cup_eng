"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  Timestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase/firebase";
import styled from "styled-components";
import { useAuth } from "../../lib/contexts/auth_context";
import React from "react";

// Import modular components
import AudioPlayer from "./components/AudioPlayer";
import FloatingControls from "./components/FloatingControls";
import TranslationWarning from "./components/TranslationWarning";
import { colors } from "./constants/colors";

interface AudioTimestamp {
  start: number;
  end: number;
  character: string;
}

interface ArticleData {
  content: {
    english: string[];
    korean: string[];
  };
  keywords: string[]; // Changed to just array of word strings
  timestamp: Timestamp;
  title: {
    english: string;
    korean: string;
  };
  url: string;
  image_url?: string; // Added new optional field
  discussion_topics?: string[]; // Added new optional field
  source_url?: string; // Added new optional field
  audio?: {
    url: string;
    timestamps: AudioTimestamp[];
    characters?: string[];
    character_start_times_seconds?: number[];
    character_end_times_seconds?: number[];
  };
}

interface WordData {
  categories: {
    english: string[];
    korean: string[];
  };
  definitions: {
    english: string;
    korean: string;
  };
  examples: Array<{
    english: string[];
    korean: string[];
  }>;
  synonyms: string[];
  antonyms: string[];
}

const ArticleContainer = styled.div`
  max-width: 940px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  min-height: 100vh;
  font-family: "Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont,
    "Segoe UI", "Roboto", "Oxygen", "Ubuntu", sans-serif;
  position: relative;
  padding-top: 90px; /* Add space for the fixed GNB */
  padding-bottom: 70px; /* Add space for audio player */

  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
    padding-top: 80px; /* Adjust for smaller mobile navbar */
    width: 100%;
    min-height: auto; /* Fix for mobile height issues */
    overflow-x: hidden;
    padding-bottom: 70px; /* Add space for audio player */
  }

  @media (max-width: 480px) {
    padding: 1.2rem 0.8rem;
    padding-top: 70px; /* Further adjust for very small screens */
    padding-bottom: 70px; /* Add space for audio player */
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  color: ${colors.text.dark};
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  font-family: "Avenir", "Avenir Next", -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.7rem;
  }

  &:hover {
    color: ${colors.primary};
  }
`;

const Subtitle = styled.h2<{ isVisible: boolean }>`
  font-size: 1.6rem;
  margin-bottom: 1.5rem;
  color: ${colors.text.medium};
  font-weight: 500;
  line-height: 1.3;
  max-height: ${(props) => (props.isVisible ? "200px" : "0")};
  overflow: hidden;
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  transition: all 0.3s ease;
  margin-top: ${(props) => (props.isVisible ? "0.25rem" : "0")};

  @media (max-width: 768px) {
    font-size: 1.4rem;
    margin-bottom: 1.2rem;
  }
`;

const CalloutBox = styled.div`
  background: linear-gradient(
    135deg,
    ${colors.primaryPale} 0%,
    ${colors.primaryBg} 100%
  );
  padding: 1rem 1.2rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: ${colors.text.medium};
  border: 1px solid ${colors.primaryPale};
  display: flex;
  align-items: center;
  gap: 0.7rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 0.85rem;
    margin-bottom: 1.2rem;
    padding: 0.9rem 1rem;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  &::before {
    content: "✨";
    font-size: 1.2rem;
    padding: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;

    @media (max-width: 768px) {
      font-size: 1.1rem;
      padding: 0.3rem;
    }
  }
`;

const ReadingTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: ${colors.text.medium};
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  background: ${colors.primaryPale};
  border-radius: 16px;
  height: 2rem;
  box-sizing: border-box;

  &::before {
    content: "⏱";
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.35rem 0.7rem;
    height: 1.8rem;
  }
`;

const SourceTab = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: ${colors.text.medium};
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  background: ${colors.primaryPale};
  border-radius: 16px;
  height: 2rem;
  box-sizing: border-box;
  cursor: pointer;
  transition: all 0.2s ease;

  &::before {
    font-size: 1rem;
  }

  &:hover {
    background: ${colors.accent};
    color: white;
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.35rem 0.7rem;
    height: 1.8rem;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.3rem;
  margin-bottom: 1.2rem;
  color: ${colors.primary};
  font-weight: 600;
  padding-bottom: 0.4rem;
  border-bottom: 2px solid ${colors.primaryPale};

  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }
`;

const ContentSection = styled.div`
  margin-bottom: 1.5rem;
  width: 100%;
  background: ${colors.primaryBg};
`;

const Paragraph = styled.p`
  font-size: 1.1rem;
  line-height: 1.7;
  color: ${colors.text.dark};
  font-weight: 400;
  cursor: pointer;
  margin-bottom: 0;

  @media (max-width: 768px) {
    font-size: 1.05rem;
    line-height: 1.6;
  }

  &:hover {
    color: ${colors.primary};
  }
`;

const KoreanParagraph = styled.p<{ isVisible: boolean }>`
  font-size: 1.05rem;
  line-height: 1.7;
  margin-bottom: ${(props) => (props.isVisible ? "0.5rem" : "0")};
  color: ${colors.text.dark};
  font-weight: 400;
  background: ${colors.primaryPale};
  padding: 1rem;
  border-radius: 8px;
  max-height: ${(props) => (props.isVisible ? "auto" : "0")};
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  overflow-y: ${(props) => (props.isVisible ? "auto" : "hidden")};
  transition: all 0.3s ease;
  margin-top: ${(props) => (props.isVisible ? "0.15rem" : "0")};
  border-left: 3px solid ${colors.accent};

  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.6;
    padding: 0.9rem;
    max-height: ${(props) => (props.isVisible ? "none" : "0")};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2rem;
  color: ${colors.text.medium};
  background: ${colors.primaryBg};
`;

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-size: 1.2rem;
  color: ${colors.primary};
  background: ${colors.primaryBg};
`;

const KeywordsSection = styled.div`
  margin-bottom: 2.5rem;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  display: block;
`;

const KeywordsContainer = styled.div`
  position: relative;
  width: 100%;
  margin: 0;
  overflow: visible;
  box-sizing: border-box;
  display: block;
`;

const KeywordsSlider = styled.div`
  display: flex;
  overflow-x: hidden;
  scroll-behavior: smooth;
  padding: 0.8rem 0;
  width: 100%;
  box-sizing: border-box;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;

  @media (max-width: 768px) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  &:active {
    cursor: grabbing;
  }

  &::after {
    content: "";
    flex: 0 0 20px;
  }
`;

const KeywordCard = styled.div`
  flex: 0 0 240px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  padding: 1rem;
  margin-right: 0.4rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  border: 1px solid ${colors.primaryPale};
  border-left: 3px solid ${colors.accent};
  box-sizing: border-box;
  cursor: pointer;

  @media (max-width: 768px) {
    flex: 0 0 220px;
    padding: 0.9rem;
  }

  &:first-child {
    margin-left: 0;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const Word = styled.h4`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 0.5rem;
`;

const Meaning = styled.p`
  font-size: 0.8rem;
  color: ${colors.text.dark};
  line-height: 1.5;
  margin-bottom: 0.8rem;
`;

const Synonyms = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
`;

const Synonym = styled.span`
  font-size: 0.7rem;
  background: ${colors.primaryPale};
  color: ${colors.primaryDark};
  padding: 0.2rem 0.5rem;
  border-radius: 30px;
  font-weight: 500;
`;

const Example = styled.div`
  font-size: 0.8rem;
  font-style: italic;
  color: ${colors.text.medium};
  line-height: 1.5;
  padding-top: 0.6rem;
  border-top: 1px dashed ${colors.primaryPale};
`;

const SliderButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  color: ${colors.primary};
  border: 1px solid ${colors.primaryPale};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    width: 28px;
    height: 32px;
  }

  &:hover {
    background: white;
    color: ${colors.primaryLight};
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  }

  &:disabled {
    color: ${colors.text.light};
    border-color: #e0e0e0;
    cursor: not-allowed;
  }
`;

const NextButton = styled(SliderButton)`
  right: -16px;

  @media (max-width: 768px) {
    right: -14px;
  }

  &::after {
    content: "›";
    font-size: 1.3rem;
    line-height: 1;
    font-weight: 300;
  }
`;

const PrevButton = styled(SliderButton)`
  left: -16px;

  @media (max-width: 768px) {
    left: -14px;
  }

  &::after {
    content: "‹";
    font-size: 1.3rem;
    line-height: 1;
    font-weight: 300;
  }
`;

// Modal components for keyword popup
const ModalOverlay = styled.div<{ isOpen: boolean }>`
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
  -webkit-overflow-scrolling: touch; /* Better scrolling on iOS */
  touch-action: none; /* Prevent scrolling behind modal */
`;

const ModalContent = styled.div`
  background: ${colors.primaryBg};
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  max-width: 90%;
  width: 500px;
  position: relative;
  transform: scale(1);
  transition: transform 0.3s ease;
  border-left: 5px solid ${colors.accent};
  border: 1px solid ${colors.primaryPale};
  overflow-y: auto; /* Allow scrolling within modal if content is too tall */
  max-height: 90vh; /* Limit height on small screens */

  @media (max-width: 768px) {
    padding: 1.5rem;
    width: 85%;
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
  color: ${colors.text.medium};
  cursor: pointer;
  padding: 0.3rem;
  line-height: 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    top: 0.8rem;
    right: 0.8rem;
  }

  &:hover {
    color: ${colors.primary};
    background: ${colors.primaryPale};
  }
`;

// Add new styled components for the improved modal layout
const ModalSection = styled.div`
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    margin-bottom: 1.2rem;
  }
`;

const ModalSectionTitle = styled.div`
  font-size: 0.85rem;
  color: ${colors.text.light};
  margin-bottom: 0.5rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DualText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const KoreanText = styled.div`
  font-size: 0.95rem;
  color: ${colors.text.medium};
  line-height: 1.5;
  position: relative;
  padding-left: 0.8rem;
  font-family: "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${colors.accent};
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const ExampleKoreanText = styled(KoreanText)`
  font-style: normal;
  margin-top: 0.5rem;
  padding-left: 0.8rem;
  font-size: 0.9rem;
  opacity: 0.9;
`;

const ModalSynonyms = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`;

const ModalSynonym = styled.span`
  font-size: 0.9rem;
  background: ${colors.primaryPale};
  color: ${colors.primaryDark};
  padding: 0.3rem 0.8rem;
  border-radius: 30px;
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.25rem 0.6rem;
  }
`;

// Update the ModalWord component for better styling
const ModalWord = styled.h3`
  font-size: 2rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 0.3rem;

  @media (max-width: 768px) {
    font-size: 1.7rem;
  }
`;

// Update the ModalMeaning component
const ModalMeaning = styled.p`
  font-size: 1.1rem;
  color: ${colors.text.dark};
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

// Update the Example component
const ModalExample = styled.div`
  font-size: 1rem;
  font-style: italic;
  color: ${colors.text.medium};
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;
// Add InfoContainer styled component
const InfoContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;

  @media (max-width: 768px) {
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
`;

// Keywords display components
const Categories = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
`;

const Category = styled.span`
  font-size: 0.65rem;
  background: ${colors.accent};
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 30px;
  font-weight: 500;
`;

const SaveButton = styled.button`
  border: none;
  background-color: ${colors.primaryDark};
  color: white;
  font-size: 0.9rem;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  margin-left: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: ${colors.primary};
    transform: translateY(-1px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  }

  &:disabled {
    background-color: #cccccc;
    cursor: default;
    transform: none;
    box-shadow: none;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;
    padding: 0.3rem 0.7rem;
  }
`;

const SavedIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  color: ${colors.accent};
  font-size: 0.9rem;
  margin-left: 1rem;
  font-weight: 500;

  &::before {
    content: "✓";
    margin-right: 0.3rem;
    font-weight: bold;
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const WordTitleRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.3rem;
`;

// Add a helper function to better handle how words with hyphens are highlighted
const highlightWithHyphens = (text: string): string => {
  // Split text into words, preserving punctuation
  const words = text.split(/(\s+|[.,!?;:'"()[\]{}—])/);

  return words
    .map((word) => {
      // Skip if it's just whitespace or punctuation
      if (!word.trim() || /^[.,!?;:'"()[\]{}—]$/.test(word)) {
        return word;
      }

      // Check if this is a hyphenated word
      if (word.includes("-")) {
        // Split by hyphen and handle each part separately
        const parts = word.split("-");
        return parts
          .map((part) => {
            if (!part) return "";

            // Calculate how many letters to highlight for each part
            const highlightCount = Math.max(
              1,
              Math.min(3, Math.floor(part.length / 2))
            );

            // Split the part into highlighted and non-highlighted sections
            const highlighted = part.slice(0, highlightCount);
            const rest = part.slice(highlightCount);

            // Return the part with highlighted section
            return `<span class="highlighted">${highlighted}</span>${rest}`;
          })
          .join("-"); // Rejoin with hyphen
      }

      // Regular word (non-hyphenated) - original logic
      const highlightCount = Math.max(
        1,
        Math.min(5, Math.floor(word.length / 2))
      );
      const highlighted = word.slice(0, highlightCount);
      const rest = word.slice(highlightCount);

      return `<span class="highlighted">${highlighted}</span>${rest}`;
    })
    .join("");
};

// Update the highlightFirstLetters function to use the new helper
const highlightFirstLetters = (text: string): string => {
  return highlightWithHyphens(text);
};

// Add a helper function to extract a complete word from bionic reading mode text
const extractFullWordFromBionicText = (
  element: HTMLElement,
  clickX: number,
  clickY: number
): { word: string; rect?: DOMRect } => {
  try {
    // Get the range at the click point
    const range = document.caretRangeFromPoint(clickX, clickY);
    if (!range) return { word: "" };

    // Get the text container that holds all the text
    const textContainer = element.closest(".article-text");
    if (!textContainer) return { word: "" };

    // Get the original text without highlighting
    const originalText = textContainer.getAttribute("data-original-text") || "";
    if (!originalText) return { word: "" };

    // Extract all text from the DOM, preserving the structure without any spans
    let fullText = "";
    const collectText = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        fullText += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (const child of Array.from(node.childNodes)) {
          collectText(child);
        }
      }
    };
    collectText(textContainer);

    // Get the element and position at the clicked point
    const clickedNode = range.startContainer;
    const clickOffset = range.startOffset;

    // Find our exact position in the full text
    let currentPosition = 0;
    let clickPosition = -1;

    const findPosition = (node: Node) => {
      if (clickPosition >= 0) return; // Already found

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

    // If we couldn't find the exact position, exit
    if (clickPosition < 0) return { word: "" };

    // Now expand in both directions until we hit a space or em-dash
    let startPos = clickPosition;
    let endPos = clickPosition;

    // Expand backward until we hit a space or em-dash
    while (
      startPos > 0 &&
      fullText[startPos - 1] !== " " &&
      fullText[startPos - 1] !== "—"
    ) {
      startPos--;
    }

    // Expand forward until we hit a space or em-dash
    while (
      endPos < fullText.length &&
      fullText[endPos] !== " " &&
      fullText[endPos] !== "—"
    ) {
      endPos++;
    }

    // Extract the word at the click position
    let word = fullText.substring(startPos, endPos);

    // Clean it of punctuation but keep hyphens
    word = word.replace(/[.,!?;:'"()[\]{}]|…/g, "").trim();

    // Return the word and the clicked element's rect for positioning
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

// Update ArticlePageWrapper to accept isAudioMode prop
const ArticlePageWrapper = styled.div<{ isAudioMode?: boolean }>`
  min-height: 100vh;
  background-color: ${colors.primaryBg};
  width: 100%;
  padding-bottom: ${(props) => (props.isAudioMode ? "70px" : "0")};

  @media (max-width: 768px) {
    /* Ensure proper mobile scrolling */
    -webkit-overflow-scrolling: touch;
    overflow-y: auto;
  }
`;

// Define necessary styled components
const ParagraphContainer = styled.div`
  position: relative;
`;

// Add a styled component for the translation toggle button
const TranslationToggleButton = styled.button`
  background: ${colors.primaryBg};
  color: ${colors.text.medium};
  border: 1px solid ${colors.primaryPale};
  border-radius: 14px;
  padding: 0.25rem 0.6rem;
  font-size: 0.7rem;
  cursor: pointer;
  margin-top: 0.6rem;
  margin-bottom: 0.2rem;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
  box-shadow: none;

  &:hover {
    background: ${colors.primaryPale};
    color: ${colors.primary};
    border-color: ${colors.accent};
  }

  &::before {
    content: "🇰🇷";
    margin-right: 3px;
    font-size: 0.8rem;
  }

  &.active {
    background: ${colors.primaryPale};
    color: ${colors.primary};
    border-color: ${colors.accent};
  }
`;

// Define a new modal overlay for word definitions
const DefinitionModalOverlay = styled(ModalOverlay)`
  /* Inherit styles from ModalOverlay */
`;

// Define a new modal content for word definitions
const DefinitionModalContent = styled(ModalContent)`
  width: 450px;
  padding: 1.8rem;

  @media (max-width: 768px) {
    width: 80%;
  }
`;

// Update the word definition displays for the modal
const WordDefinitionTitle = styled.div`
  font-weight: bold;
  color: ${colors.primary};
  margin-bottom: 1rem;
  font-size: 1.5rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid ${colors.primaryPale};
`;

const WordDefinitionContent = styled.div`
  color: ${colors.text.medium};
  font-family: "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  line-height: 1.6;
  white-space: pre-line;
  font-size: 1rem;
`;

const LoadingDefinitionContent = styled.div`
  color: ${colors.text.light};
  font-style: italic;
  padding: 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
`;

const getWordDefinition = async (
  word: string,
  context: string,
  articleId: string
): Promise<string> => {
  try {
    // Normalize the word to lowercase for consistent storage
    const wordLower = word.toLowerCase();

    // First check if the definition exists in Firestore
    const meaningRef = doc(db, `articles/${articleId}/meanings/${wordLower}`);
    const meaningSnap = await getDoc(meaningRef);

    // If the definition exists in Firestore, return it
    if (meaningSnap.exists()) {
      return meaningSnap.data().definition;
    }

    // If not found in Firestore, call the GPT API
    const apiKey =
      "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";
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
        model: "gpt-4.1-nano",
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
    const definition = data.choices[0].message.content;

    // Store the result in Firestore for future use
    await setDoc(meaningRef, {
      word: wordLower,
      definition: definition,
    });

    return definition;
  } catch (error) {
    console.error("GPT API Error:", error);
    return `뜻풀이를 가져오는 중 오류가 발생했습니다: ${error}`;
  }
};

// Add audio player components
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

// Floating button container
const FloatingButtonContainer = styled.div<{ isAudioMode?: boolean }>`
  position: fixed;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
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
    transform: none;
    flex-direction: row;
    padding: 0.5rem;
    transition: all 0.3s ease;
  }

  &:hover {
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
    transform: translateY(-50%) scale(1.02);

    @media (max-width: 480px) {
      transform: scale(1.02);
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

const ArticleImage = styled.img`
  width: 100%;
  object-fit: cover;
  border-radius: 12px;
  margin: 1.5rem 0 0.5rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    margin: 1rem 0 0.5rem 0;
  }
`;

const ImageCaption = styled.p`
  font-size: 0.8rem;
  color: ${colors.text.light};
  text-align: left;
  margin: 0 0 1.5rem 0;

  @media (max-width: 768px) {
    font-size: 0.7rem;
    margin: 0 0 1rem 0;
  }
`;

// Discussion topics components
const DiscussionTopicsSection = styled.div`
  margin-top: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    margin-top: 1.8rem;
    margin-bottom: 1.8rem;
  }
`;

const DiscussionTopicsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  background: #ffffff;
  border-radius: 10px;
  padding: 1.2rem;
  border: 1px solid ${colors.primaryPale};
`;

const DiscussionTopicItem = styled.li`
  font-size: 1.1rem;
  color: ${colors.text.dark};
  line-height: 1.6;
  margin-bottom: 0.6rem;
  padding-left: 1rem;
  position: relative;
  cursor: pointer;
  transition: color 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &::before {
    content: "•";
    color: ${colors.accent};
    font-weight: bold;
    position: absolute;
    left: 0;
    font-size: 1.1rem;
  }

  &:hover {
    color: ${colors.primary};
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    padding-left: 0.9rem;
  }
`;

// Admin editing styled components
const AdminControlsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 0.6rem;
  }
`;

const AdminButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: ${colors.primary};
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;

  &:hover {
    background: ${colors.primaryLight};
    transform: translateY(-1px);
  }

  &:disabled {
    background: ${colors.text.light};
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    font-size: 0.75rem;
    padding: 0.35rem 0.7rem;
  }
`;

const EditableTopicInput = styled.input`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 8px;
  font-size: 0.95rem;
  color: ${colors.text.dark};
  background: white;
  margin-bottom: 0.5rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
`;

const EditableTopicContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
  padding: 0.6rem;
  background: ${colors.primaryBg};
  border-radius: 8px;
  border: 1px solid ${colors.primaryPale};

  @media (max-width: 768px) {
    gap: 0.4rem;
    padding: 0.5rem;
  }
`;

const RemoveTopicButton = styled.button`
  background: ${colors.text.light};
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: #e74c3c;
  }

  @media (max-width: 768px) {
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
  }
`;

const NewTopicContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  align-items: flex-start;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.4rem;
  }
`;

const NewTopicInput = styled.input`
  flex: 1;
  padding: 0.6rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 8px;
  font-size: 0.9rem;
  color: ${colors.text.dark};
  background: white;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${colors.accent};
  }

  @media (max-width: 768px) {
    width: 100%;
    font-size: 0.85rem;
    padding: 0.5rem;
  }
`;

const AddTopicButton = styled.button`
  background: ${colors.accent};
  color: white;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  white-space: nowrap;

  &:hover {
    background: ${colors.primary};
    transform: translateY(-1px);
  }

  &:disabled {
    background: ${colors.text.light};
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    width: 100%;
    font-size: 0.75rem;
    padding: 0.5rem 0.8rem;
  }
`;

const Article = () => {
  const params = useParams();
  const articleId = params.articleId as string;

  // Early return if no articleId
  if (!articleId) {
    return <ErrorContainer>Article ID not found</ErrorContainer>;
  }

  const { currentUser, accountStatus } = useAuth(); // Get the current user and account status from auth context
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isKoreanTitleVisible, setIsKoreanTitleVisible] = useState(false);
  const [visibleKoreanParagraphs, setVisibleKoreanParagraphs] = useState<
    number[]
  >([]);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedWordData, setSelectedWordData] = useState<WordData | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isQuickReading, setIsQuickReading] = useState(false);
  const [wordDetails, setWordDetails] = useState<Record<string, WordData>>({});
  const [wordLoading, setWordLoading] = useState<Record<string, boolean>>({});
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Admin discussion topics editing state
  const [isEditingTopics, setIsEditingTopics] = useState(false);
  const [editedTopics, setEditedTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [isSavingTopics, setIsSavingTopics] = useState(false);

  // Translation warning state
  const [translationClickCount, setTranslationClickCount] = useState(0);
  const [showTranslationWarning, setShowTranslationWarning] = useState(false);
  const [dontShowTranslationWarning, setDontShowTranslationWarning] =
    useState(false);

  // Floating controls visibility state
  const [isFloatingControlsVisible, setIsFloatingControlsVisible] =
    useState(true);

  // Load "don't show again" preference from localStorage
  useEffect(() => {
    const dontShowPref = localStorage.getItem("dontShowTranslationWarning");
    if (dontShowPref === "true") {
      setDontShowTranslationWarning(true);
    }
  }, []);

  // Update state for word definition modal
  const [wordDefinitionModal, setWordDefinitionModal] = useState({
    isOpen: false,
    word: "",
    definition: "",
    isLoading: false,
    wiktionaryData: null as any | null,
    isWiktionaryLoading: false,
  });

  // Add state for Wiktionary API data in keyword modal
  const [selectedWordWiktionaryData, setSelectedWordWiktionaryData] = useState<
    any | null
  >(null);

  // Audio player states
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioTimeUpdateRef = useRef<number | null>(null);

  // Character-word mapping for highlighting
  const [characterWordMap, setCharacterWordMap] = useState<{
    [charKey: string]: { paragraphIndex: number; wordIndex: number };
  }>({});

  // State for active character index
  const [activeCharIndex, setActiveCharIndex] = useState<number | null>(null);

  // Refs to store timestamps and paragraph character offsets
  const timestampsRef = useRef<AudioTimestamp[]>([]);
  const paragraphCharOffsetRef = useRef<number[]>([]);

  // Refs to store word ranges (global indices) per paragraph
  const paragraphWordRangesRef = useRef<Array<[number, number]>[]>([]);

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

  // Highlight words based on audio playback time
  const prepareParagraphText = (paragraph: string, paragraphIndex: number) => {
    if (!isAudioMode || timestampsRef.current.length === 0) {
      return paragraph;
    }
    const chars = paragraph.split("");
    const offset = paragraphCharOffsetRef.current[paragraphIndex] || 0;
    // Determine active word range for this paragraph
    const ranges = paragraphWordRangesRef.current[paragraphIndex] || [];
    const activeRange = ranges.find(
      ([s, e]) =>
        activeCharIndex !== null && activeCharIndex >= s && activeCharIndex <= e
    );
    return (
      <>
        {chars.map((char, i) => {
          const globalIdx = offset + i;
          // Highlight if within active word's range
          const shouldHighlight = activeRange
            ? globalIdx >= activeRange[0] && globalIdx <= activeRange[1]
            : false;
          // Highlight color applies to all chars in word; bold active char
          return (
            <span
              key={`char-${globalIdx}`}
              id={`char-${globalIdx}`}
              style={{
                backgroundColor: shouldHighlight ? "#FFF2CC" : "transparent",
              }}
            >
              {char}
            </span>
          );
        })}
      </>
    );
  };

  // Helper function to scroll to highlighted word
  const scrollToHighlightedWord = (
    paragraphIndex: number,
    wordIndex: number
  ) => {
    setTimeout(() => {
      // Find highlighted word by data attributes
      const highlightedElement = document.querySelector(
        `span[data-paragraph-index="${paragraphIndex}"][data-word-index="${wordIndex}"]`
      ) as HTMLElement;

      if (highlightedElement) {
        // Only scroll if the element is outside the viewport
        const rect = highlightedElement.getBoundingClientRect();
        const isInViewport =
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <=
            (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <=
            (window.innerWidth || document.documentElement.clientWidth);

        if (!isInViewport) {
          highlightedElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }
    }, 100);
  };

  // Define the time update handler before it's used
  const handleTimeUpdate = () => {
    if (audioTimeUpdateRef.current) {
      cancelAnimationFrame(audioTimeUpdateRef.current);
    }

    audioTimeUpdate();
  };

  // Separate function for audio updates to allow it to be called more frequently
  const audioTimeUpdate = () => {
    audioTimeUpdateRef.current = requestAnimationFrame(() => {
      if (audioRef.current) {
        const currentTime = audioRef.current.currentTime;
        // Update time display and progress bar
        setCurrentTime(currentTime);

        // Update progress percentage
        const progress = (currentTime / (audioRef.current.duration || 1)) * 100;
        setAudioProgress(isNaN(progress) ? 0 : progress);

        // Find active characters and words for debugging
        if (isAudioMode && article?.audio?.characters) {
          const {
            characters,
            character_start_times_seconds,
            character_end_times_seconds,
          } = article.audio;
          if (
            characters &&
            character_start_times_seconds &&
            character_end_times_seconds
          ) {
            // Track active character indices
            const activeCharIndices: number[] = [];

            // Find active characters based on timestamp
            for (let i = 0; i < characters.length; i++) {
              const start = character_start_times_seconds[i];
              const end = character_end_times_seconds[i];
              if (start <= currentTime && end >= currentTime) {
                activeCharIndices.push(i);
              }
            }

            // Find words corresponding to active characters
            const highlightedWords: {
              word: string;
              paraIndex: number;
              wordIndex: number;
            }[] = [];

            // Process each paragraph to find words with active characters
            article.content.english.forEach((paragraph, paragraphIndex) => {
              const words = paragraph.split(/\s+/);

              // Create a temporary lookup for this paragraph's words
              const wordLookup = new Map<number, string>();

              // Fill the word lookup
              words.forEach((word, idx) => {
                wordLookup.set(idx, word);
              });

              // Find active words based on character mapping
              Object.keys(characterWordMap).forEach((charKey) => {
                const keyParts = charKey.split("-");
                const charFromKey = keyParts[0];

                // Check if this character is active and in the current paragraph
                if (
                  activeCharIndices.some(
                    (idx) => characters[idx] === charFromKey
                  ) &&
                  characterWordMap[charKey].paragraphIndex === paragraphIndex
                ) {
                  const wordIdx = characterWordMap[charKey].wordIndex;
                  const word = wordLookup.get(wordIdx) || "";

                  // Avoid duplicates
                  if (
                    word &&
                    !highlightedWords.some(
                      (item) =>
                        item.paraIndex === paragraphIndex &&
                        item.wordIndex === wordIdx
                    )
                  ) {
                    highlightedWords.push({
                      word,
                      paraIndex: paragraphIndex,
                      wordIndex: wordIdx,
                    });
                  }
                }
              });
            });
            // Find the first active word and scroll to it when needed
            if (highlightedWords.length > 0 && isPlaying) {
              const activeWord = highlightedWords[0];
              scrollToHighlightedWord(
                activeWord.paraIndex,
                activeWord.wordIndex
              );
            }
          }
        } else if (isAudioMode && article?.content?.english) {
          // For articles without character data, use paragraph-based timing
          const totalDuration = audioRef.current.duration || 1;
          const totalParagraphs = article.content.english.length || 1;

          // Determine current paragraph based on time
          const progressPercent = currentTime / totalDuration;
          const currentParagraphIndex = Math.floor(
            progressPercent * totalParagraphs
          );

          if (
            currentParagraphIndex >= 0 &&
            currentParagraphIndex < totalParagraphs
          ) {
            // Calculate progress within paragraph
            const paragraphStartPercent =
              currentParagraphIndex / totalParagraphs;
            const paragraphEndPercent =
              (currentParagraphIndex + 1) / totalParagraphs;
            const paragraphProgress =
              (progressPercent - paragraphStartPercent) /
              (paragraphEndPercent - paragraphStartPercent);

            // Get words in paragraph
            const words =
              article.content.english[currentParagraphIndex].split(/\s+/);
            if (words.length > 0) {
              // Determine current word
              const currentWordIndex = Math.floor(
                paragraphProgress * words.length
              );
              if (
                currentWordIndex >= 0 &&
                currentWordIndex < words.length &&
                isPlaying
              ) {
                scrollToHighlightedWord(
                  currentParagraphIndex,
                  currentWordIndex
                );
              }
            }
          }
        }

        // Continue updating if playing
        if (isPlaying) {
          // Request the next frame for continuous updates
          audioTimeUpdate();
        }
      }
    });
  };

  // Handle audio ended event
  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  // Add audio context initialization
  useEffect(() => {
    // Try to resume audio context if it's suspended (needed for some browsers)
    const resumeAudioContext = () => {
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        if (audioContext.state === "suspended") {
          audioContext.resume();
        }
      } catch (e) {
        console.error("Error resuming audio context:", e);
      }
    };

    // Initialize on user interaction
    const handleUserInteraction = () => {
      resumeAudioContext();
      // Remove event listeners after first interaction
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;

      try {
        const articleRef = doc(db, "articles", articleId);
        const articleSnap = await getDoc(articleRef);

        if (articleSnap.exists()) {
          const data = articleSnap.data() as ArticleData;
          setArticle(data);

          // Prefetch word details for all keywords
          if (data.keywords && data.keywords.length > 0) {
            data.keywords.forEach((word) => {
              fetchWordDetails(word);
            });
          }
        } else {
          setError("Article not found");
        }
      } catch (err) {
        setError("Error fetching article");
        console.error("Error fetching article:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  // Initialize audio player when article data is loaded
  useEffect(() => {
    if (article?.audio?.url) {
      // Create a new audio element only if not already created or if URL has changed
      if (!audioRef.current || audioRef.current.src !== article.audio.url) {
        if (audioRef.current) {
          // Clean up existing audio element if we're creating a new one
          audioRef.current.pause();
          audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
          audioRef.current.removeEventListener("ended", handleAudioEnded);
        }

        audioRef.current = new Audio(article.audio.url);

        audioRef.current.addEventListener("loadedmetadata", () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        });

        audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
        audioRef.current.addEventListener("ended", handleAudioEnded);

        // Preload audio
        audioRef.current.load();
      }
    } else if (isAudioMode) {
      setIsAudioMode(false);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
        audioRef.current.removeEventListener("ended", handleAudioEnded);
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioTimeUpdateRef.current) {
        cancelAnimationFrame(audioTimeUpdateRef.current);
      }
    };
  }, [article?.audio?.url]); // Only depend on the audio URL

  // Toggle audio playback
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.error("Audio playback error:", error);
            // Reset playing state if there was an error
            setIsPlaying(false);
          });
        }
      }

      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error("Error toggling audio:", error);
      setIsPlaying(false);
    }
  };

  // Seek to a specific position in the audio
  const seekAudio = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const progressBar = e.currentTarget;
    const clickPosition =
      (e.clientX - progressBar.getBoundingClientRect().left) /
      progressBar.clientWidth;
    const seekTime = clickPosition * (audioRef.current.duration || 0);

    audioRef.current.currentTime = seekTime;

    // Manually update the progress bar immediately for better UX
    setCurrentTime(seekTime);
    setAudioProgress(clickPosition * 100);
  };

  // Change playback speed
  const changePlaybackSpeed = (speed: number) => {
    if (!audioRef.current) return;

    audioRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  // Format time for display (mm:ss)
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
  };

  // Toggle audio mode
  const toggleAudioMode = () => {
    // If turning on audio mode, disable quick reading mode
    if (!isAudioMode && isQuickReading) {
      setIsQuickReading(false);
    }

    // If turning on audio mode, prepare the audio
    if (!isAudioMode && article?.audio?.url) {
      // Initialize or re-initialize audio element
      if (!audioRef.current || audioRef.current.src !== article.audio.url) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
          audioRef.current.removeEventListener("ended", handleAudioEnded);
        }

        audioRef.current = new Audio(article.audio.url);
        audioRef.current.addEventListener("loadedmetadata", () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        });
        audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
        audioRef.current.addEventListener("ended", handleAudioEnded);

        // Preload audio
        audioRef.current.load();
      }
    } else if (isAudioMode && audioRef.current) {
      // If turning off audio mode, pause audio
      audioRef.current.pause();
      setIsPlaying(false);
    }

    setIsAudioMode(!isAudioMode);
  };

  // When toggling quick reading mode, disable audio mode if it's on
  useEffect(() => {
    if (isQuickReading && isAudioMode) {
      setIsAudioMode(false);

      // Stop audio if playing
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isQuickReading]);

  // Clean up audio when audio mode is turned off
  useEffect(() => {
    if (!isAudioMode && isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isAudioMode]);

  // Update playback rate when changing speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Fetch user's saved words when user changes
  useEffect(() => {
    const fetchSavedWords = async () => {
      if (!currentUser) {
        setSavedWords([]);
        return;
      }

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setSavedWords(userData.saved_words || []);
        } else {
          // Create user document if it doesn't exist
          await setDoc(userRef, {
            saved_words: [],
          });
          setSavedWords([]);
        }
      } catch (err) {
        console.error("Error fetching saved words:", err);
        setSavedWords([]);
      }
    };

    fetchSavedWords();
  }, [currentUser]);

  const fetchWordDetails = async (word: string) => {
    // Skip if already fetched or currently fetching
    if (wordDetails[word] || wordLoading[word]) return;

    setWordLoading((prev) => ({ ...prev, [word]: true }));

    // Set a timeout to ensure wordLoading is reset even if the fetch operation fails
    const timeoutId = setTimeout(() => {
      setWordLoading((prev) => {
        // Only reset if it's still loading (operation didn't complete)
        if (prev[word]) {
          console.error(`Fetch timeout for word "${word}"`);
          return { ...prev, [word]: false };
        }
        return prev;
      });
    }, 5000); // 5 seconds timeout

    try {
      const wordRef = doc(db, "words", word);
      const wordSnap = await getDoc(wordRef);

      if (wordSnap.exists()) {
        const wordData = wordSnap.data() as WordData;
        setWordDetails((prev) => ({ ...prev, [word]: wordData }));
      } else {
        console.error(`Word "${word}" not found in the database`);
      }
    } catch (err) {
      console.error(`Error fetching word "${word}":`, err);
    } finally {
      clearTimeout(timeoutId); // Clear the timeout as the operation completed
      setWordLoading((prev) => ({ ...prev, [word]: false }));
    }
  };

  useEffect(() => {
    if (isQuickReading && article && !isAudioMode) {
      // Get all text content elements
      const textElements = document.querySelectorAll(".article-text");

      textElements.forEach((element) => {
        const originalText =
          element.getAttribute("data-original-text") ||
          element.textContent ||
          "";
        element.innerHTML = highlightFirstLetters(originalText);
      });
    } else if (!isAudioMode) {
      // Restore original text when not in audio mode and not in quick reading mode
      const textElements = document.querySelectorAll(".article-text");
      textElements.forEach((element) => {
        const originalText = element.getAttribute("data-original-text") || "";
        element.textContent = originalText;
      });
    }
  }, [isQuickReading, article, isAudioMode]); // Fixed dependency array

  const toggleKoreanTitle = () => {
    setIsKoreanTitleVisible(!isKoreanTitleVisible);
  };

  // Handle "don't show again" preference for translation warning
  const handleDontShowTranslationWarning = (dontShow: boolean) => {
    setDontShowTranslationWarning(dontShow);
    localStorage.setItem("dontShowTranslationWarning", dontShow.toString());
  };

  const toggleKoreanParagraph = (index: number) => {
    const wasVisible = visibleKoreanParagraphs.includes(index);

    setVisibleKoreanParagraphs((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );

    // Only track translation clicks when EXPANDING (showing) Korean text, not when hiding
    if (!wasVisible) {
      const newClickCount = translationClickCount + 1;
      setTranslationClickCount(newClickCount);

      // Only show warning if user hasn't disabled it and we've reached 3 clicks
      if (
        newClickCount >= 3 &&
        !showTranslationWarning &&
        !dontShowTranslationWarning
      ) {
        setShowTranslationWarning(true);
      }
    }
  };

  const handleLastKeyword = () => {
    if (!article?.keywords || article.keywords.length <= 1) return;

    // Calculate exactly how many cards we need to show - set to the last keyword
    const totalCards = article.keywords.length;
    const lastIndex = totalCards - 1;

    setCurrentKeywordIndex(lastIndex);

    if (sliderRef.current) {
      // Determine card width based on screen size
      const isMobile = window.innerWidth <= 768;
      const cardWidth = isMobile ? 230 : 250;
      const marginWidth = 8;

      // Calculate exact position to show the last card at the left
      const scrollPosition = lastIndex * (cardWidth + marginWidth);

      sliderRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  const handleNextKeyword = () => {
    if (!article?.keywords) return;

    // Calculate the maximum index based on visible cards
    const maxIndex = Math.max(0, article.keywords.length - 1);

    // Special case for the second-to-last position
    if (currentKeywordIndex === maxIndex - 1) {
      return handleLastKeyword();
    }

    // Allow scrolling all the way to the last keyword
    if (currentKeywordIndex >= maxIndex) return;

    const nextIndex = currentKeywordIndex + 1;
    setCurrentKeywordIndex(nextIndex);

    if (sliderRef.current) {
      // Determine card width based on screen size
      const isMobile = window.innerWidth <= 768;
      const cardWidth = isMobile ? 230 : 250;
      const marginWidth = 8;

      // Calculate exact position (each card has margin-right except the last one)
      const scrollPosition = nextIndex * (cardWidth + marginWidth);

      sliderRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  const handlePrevKeyword = () => {
    if (currentKeywordIndex <= 0) return;

    const prevIndex = currentKeywordIndex - 1;
    setCurrentKeywordIndex(prevIndex);

    if (sliderRef.current) {
      // Determine card width based on screen size
      const isMobile = window.innerWidth <= 768;
      const cardWidth = isMobile ? 230 : 250;
      const marginWidth = 8;

      // Calculate exact position (each card has margin-right except the last one)
      const scrollPosition = prevIndex * (cardWidth + marginWidth);

      sliderRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  };

  const openKeywordModal = async (word: string) => {
    setSelectedKeyword(word);
    setSelectedWordWiktionaryData(null); // Reset Wiktionary data

    // Get word details if not already loaded
    if (!wordDetails[word]) {
      await fetchWordDetails(word);
    }

    setSelectedWordData(wordDetails[word] || null);
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";

    // Fetch Wiktionary data in parallel
    try {
      const wiktionaryData = await fetchWordFromWiktionaryApi(word);
      setSelectedWordWiktionaryData(wiktionaryData);
    } catch (error) {
      console.error("Error fetching Wiktionary data:", error);
      setSelectedWordWiktionaryData(null);
    }
  };

  const closeKeywordModal = () => {
    setIsModalOpen(false);
    // Re-enable scrolling when modal is closed
    document.body.style.overflow = "";
  };

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isModalOpen) {
        closeKeywordModal();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
      // Make sure to reset body overflow in case component unmounts while modal is open
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sliderRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;
    const x = e.touches[0].pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const calculateReadingTime = (content: string[]): string => {
    const totalWords = content.reduce((acc, paragraph) => {
      return acc + paragraph.split(/\s+/).length;
    }, 0);

    const readingTimeInSeconds = (totalWords / 150) * 60; // 150 words per minute
    const minutes = Math.floor(readingTimeInSeconds / 60);
    const seconds = Math.round(readingTimeInSeconds % 60);

    return `${minutes}분 ${seconds}초`;
  };

  // Function to fetch word definition from Wiktionary API
  const fetchWordFromWiktionaryApi = async (
    word: string
  ): Promise<any | null> => {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(
            `No definitions found for "${word}" from Wiktionary API.`
          );
          return null;
        }
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Wiktionary API Error:", error);
      return null;
    }
  };

  const handleSaveWord = async (word: string) => {
    if (!currentUser || isSaving) return;

    setIsSaving(true);

    try {
      const userRef = doc(db, "users", currentUser.uid);

      if (savedWords.includes(word)) {
        // Remove word if already saved
        await updateDoc(userRef, {
          saved_words: arrayRemove(word),
        });
        setSavedWords((prevWords) => prevWords.filter((w) => w !== word));
      } else {
        // Add word if not saved
        await updateDoc(userRef, {
          saved_words: arrayUnion(word),
        });
        setSavedWords((prevWords) => [...prevWords, word]);
      }
    } catch (err) {
      console.error("Error saving word:", err);
      alert("단어 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle word click for definition lookup or audio jumping
  const handleWordClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Get the clicked element - handle nested span structure
    let target = e.target as HTMLElement;
    if (
      target.parentElement &&
      target.id.startsWith("char-") &&
      target.parentElement.closest("[id^='char-']")
    ) {
      target = target.parentElement.closest("[id^='char-']") as HTMLElement;
    }

    const paragraphElement = target.closest(
      ".article-text"
    ) as HTMLElement | null;
    if (!paragraphElement) return;

    // If in audio mode, jump to the character's position
    if (isAudioMode && audioRef.current) {
      // CHAR-LEVEL CLICK: if we clicked on a char-<index> span, jump exactly to its timestamp
      const charEl = target.closest("[id^='char-']") as HTMLElement;
      if (charEl && charEl.id.startsWith("char-")) {
        const idx = parseInt(charEl.id.replace("char-", ""), 10);
        const timestamp = timestampsRef.current[idx];
        if (timestamp?.start !== undefined) {
          audioRef.current.currentTime = timestamp.start;
          if (!isPlaying) {
            const p = audioRef.current.play();
            if (p)
              p.then(() => setIsPlaying(true)).catch((err) =>
                console.error("Audio play error:", err)
              );
          }
        }
        return; // Handled character click
      }
      // Fallback: If somehow a char-<id> span wasn't clicked, do nothing for now in audio mode.
      // We could add word-level jump fallback here if needed later.
      return;
    }

    // If NOT in audio mode, continue with the word definition lookup
    // Always work with the original text rather than the HTML with highlights
    const originalText =
      paragraphElement.getAttribute("data-original-text") || "";
    if (!originalText) return;

    let selectedWord = "";

    // Clear any existing text selection first to prevent issues
    window.getSelection()?.removeAllRanges();

    // Use our extraction function for all modes - this helps with the single-click issue
    const { word } = extractFullWordFromBionicText(
      paragraphElement,
      e.clientX,
      e.clientY
    );

    if (word) {
      selectedWord = word;
    }

    // Clean up the selected word and ensure it's valid
    selectedWord = selectedWord
      // Keep regular hyphens but remove other punctuation
      .replace(/[.,!?;:'"()[\]{}]|…/g, "")
      .trim();

    // Don't proceed if we couldn't get a word or if it's too long/complex
    if (
      !selectedWord ||
      selectedWord.length > 30 ||
      // Allow hyphenated words (count as one term) but not multiple space-separated words
      (selectedWord.split(/\s+/).length > 1 && !selectedWord.includes("-"))
    ) {
      console.log("Invalid selection, not proceeding:", selectedWord);
      return;
    }

    console.log("Final selected word:", selectedWord);

    // Get the surrounding context (the sentence containing the word)
    const sentenceRegex = new RegExp(
      `[^.!?]*\\b${selectedWord.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}\\b[^.!?]*[.!?]`,
      "i"
    );
    const sentenceMatch = originalText.match(sentenceRegex);
    const context = sentenceMatch ? sentenceMatch[0].trim() : originalText;

    // Set loading state for the modal
    setWordDefinitionModal({
      isOpen: true,
      word: selectedWord,
      definition: "",
      isLoading: true,
      wiktionaryData: null,
      isWiktionaryLoading: true,
    });

    // Prevent scrolling while modal is open
    document.body.style.overflow = "hidden";

    // Get definition
    try {
      console.log("Requesting definition for:", selectedWord);
      if (!articleId) {
        throw new Error("Article ID is missing");
      }
      const definition = await getWordDefinition(
        selectedWord,
        context,
        articleId as string
      );
      console.log("Definition received:", definition);

      setWordDefinitionModal((prev) => ({
        ...prev,
        definition: definition,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Definition error:", error);
      setWordDefinitionModal((prev) => ({
        ...prev,
        definition: "뜻풀이를 가져오는 중 오류가 발생했습니다.",
        isLoading: false,
      }));
    }

    // Fetch Wiktionary data in parallel
    try {
      const wiktionaryData = await fetchWordFromWiktionaryApi(selectedWord);
      setWordDefinitionModal((prev) => ({
        ...prev,
        wiktionaryData: wiktionaryData,
        isWiktionaryLoading: false,
      }));
    } catch (error) {
      console.error("Error fetching Wiktionary data:", error);
      setWordDefinitionModal((prev) => ({
        ...prev,
        wiktionaryData: null,
        isWiktionaryLoading: false,
      }));
    }
  };

  // Close definition modal
  const closeDefinitionModal = () => {
    setWordDefinitionModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
    // Re-enable scrolling
    document.body.style.overflow = "";
  };

  // Add this effect to process and map all timestamps when article loads
  useEffect(() => {
    if (!article?.content?.english || !article.audio?.timestamps) return;

    // Store timestamps in ref for performance - this is still useful for other purposes
    if (article.audio?.timestamps) {
      // We don't need to process timestamps for highlighting anymore
      console.log(`Article has ${article.audio.timestamps.length} timestamps`);
    }
  }, [article]);

  // Add this effect to process article content and timestamps sequentially
  useEffect(() => {
    if (!article?.content?.english || !article?.audio?.timestamps) return;

    // We don't need sequential word processing anymore
    console.log("Audio content loaded");
  }, [article]);

  // Process article content and build character-to-word mapping
  useEffect(() => {
    // Handle articles with missing or partial timestamp data (for backward compatibility)
    if (!article) return;

    // Safely initialize audio data even if some fields are missing
    if (article.audio) {
      // Initialize missing audio fields for backward compatibility
      article.audio.characters = article.audio.characters || [];
      article.audio.character_start_times_seconds =
        article.audio.character_start_times_seconds || [];
      article.audio.character_end_times_seconds =
        article.audio.character_end_times_seconds || [];
    }

    // Only proceed with character mapping if we have content and characters
    if (
      !article?.content?.english ||
      !article?.audio?.characters ||
      article.audio.characters.length === 0
    )
      return;

    console.log("Building character-to-word mapping");
    const charToWordMap: {
      [charKey: string]: { paragraphIndex: number; wordIndex: number };
    } = {};

    // Process each paragraph to map characters to words
    let globalCharIndex = 0;

    article.content.english.forEach((paragraph, paragraphIndex) => {
      // Split paragraph into words with their positions
      const words = paragraph.split(/(\s+)/); // Split by whitespace, keeping separators
      let wordStart = 0;
      let wordIndex = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i];

        // Skip whitespace
        if (word.trim() === "") {
          continue;
        }

        // Find the word's start position in the paragraph
        const wordStartInParagraph = paragraph.indexOf(word, wordStart);
        if (wordStartInParagraph === -1) continue; // Word not found (shouldn't happen)

        wordStart = wordStartInParagraph + word.length;

        // Map each character in the word to this word's position
        for (let j = 0; j < word.length; j++) {
          const charGlobalIndex = globalCharIndex + wordStartInParagraph + j;

          // Create a key that includes the character itself for easier lookup
          const charKey = `${
            article?.audio?.characters?.[charGlobalIndex] || word[j]
          }-${charGlobalIndex}`;

          charToWordMap[charKey] = {
            paragraphIndex,
            wordIndex,
          };
        }

        wordIndex++;
      }

      globalCharIndex += paragraph.length + 1; // +1 for paragraph break
    });

    // Set the map in state for use during playback
    setCharacterWordMap(charToWordMap);
    console.log(
      `Built character-to-word mapping with ${
        Object.keys(charToWordMap).length
      } characters`
    );
  }, [article]);

  // Initialize timestamps and calculate paragraph character offsets once article data is available
  useEffect(() => {
    if (article && article.audio?.timestamps && article.content.english) {
      // Store timestamps
      timestampsRef.current = article.audio.timestamps;
      // Compute character offsets for each paragraph
      const offsets: number[] = [];
      let offset = 0;
      article.content.english.forEach((para) => {
        offsets.push(offset);
        offset += para.length;
      });
      paragraphCharOffsetRef.current = offsets;
      // Compute word ranges (global char index) per paragraph
      const allRanges: Array<[number, number]>[] = [];
      article.content.english.forEach((para, pIdx) => {
        const ranges: [number, number][] = [];
        let i = 0;
        while (i < para.length) {
          // skip spaces/newlines
          if (para[i].trim() === "") {
            i++;
            continue;
          }
          const localStart = i;
          while (i < para.length && para[i].trim() !== "") {
            i++;
          }
          const localEnd = i - 1;
          const globalStart = offsets[pIdx] + localStart;
          const globalEnd = offsets[pIdx] + localEnd;
          ranges.push([globalStart, globalEnd]);
        }
        allRanges[pIdx] = ranges;
      });
      paragraphWordRangesRef.current = allRanges;
    }
  }, [article]);

  // Update active character index based on current audio time and scroll into view
  useEffect(() => {
    if (audioRef.current && timestampsRef.current.length > 0) {
      const idx = timestampsRef.current.findIndex(
        (ts) => currentTime >= ts.start && currentTime <= ts.end
      );
      if (idx !== -1 && idx !== activeCharIndex) {
        setActiveCharIndex(idx);
        const el = document.getElementById(`char-${idx}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentTime]);

  // Admin discussion topics editing functions
  const startEditingTopics = () => {
    setEditedTopics([...(article?.discussion_topics || [])]);
    setIsEditingTopics(true);
  };

  const cancelEditingTopics = () => {
    setIsEditingTopics(false);
    setEditedTopics([]);
    setNewTopic("");
  };

  const addNewTopic = () => {
    if (newTopic.trim()) {
      setEditedTopics([...editedTopics, newTopic.trim()]);
      setNewTopic("");
    }
  };

  const removeTopic = (index: number) => {
    setEditedTopics(editedTopics.filter((_, i) => i !== index));
  };

  const updateTopic = (index: number, newValue: string) => {
    const updated = [...editedTopics];
    updated[index] = newValue;
    setEditedTopics(updated);
  };

  const saveTopics = async () => {
    if (!articleId || !currentUser || accountStatus !== "admin") return;

    setIsSavingTopics(true);
    try {
      const articleRef = doc(db, "articles", articleId);
      await updateDoc(articleRef, {
        discussion_topics: editedTopics,
      });

      // Update local state
      setArticle((prev) =>
        prev ? { ...prev, discussion_topics: editedTopics } : null
      );
      setIsEditingTopics(false);
      setEditedTopics([]);
      setNewTopic("");
    } catch (error) {
      console.error("Error saving discussion topics:", error);
      alert("토론 주제 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingTopics(false);
    }
  };

  if (loading) return <LoadingContainer>Loading article...</LoadingContainer>;
  if (error) return <ErrorContainer>Error: {error}</ErrorContainer>;
  if (!article) return <ErrorContainer>No article found</ErrorContainer>;

  const { content = { english: [], korean: [] }, keywords = [] } = article;

  // Update next button visibility logic to ensure it stays visible until the last card
  const hasMoreKeywords = currentKeywordIndex < keywords.length - 1;
  // Check if we're near the end but not at the very last card
  const isAtLastButNotEnd =
    currentKeywordIndex >= keywords.length - 3 &&
    currentKeywordIndex < keywords.length - 1;
  const hasPrevKeywords = currentKeywordIndex > 0;

  return (
    <ArticlePageWrapper isAudioMode={isAudioMode}>
      <ArticleContainer>
        <Title
          onClick={toggleKoreanTitle}
          className="article-text"
          data-original-text={article?.title.english}
        >
          {article?.title.english}
        </Title>

        <Subtitle
          isVisible={isKoreanTitleVisible}
          className="article-text"
          data-original-text={article?.title.korean}
        >
          {article?.title.korean}
        </Subtitle>
        <InfoContainer>
          <ReadingTime>
            예상 읽기 시간: {calculateReadingTime(content.english)}
          </ReadingTime>
          {article.source_url && (
            <SourceTab
              as="a"
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              밋업 참가자 전용, 외부 배포 금지: 출처 확인
            </SourceTab>
          )}
        </InfoContainer>

        <CalloutBox>
          {isAudioMode
            ? "단어를 클릭하면 해당 부분부터 오디오가 재생됩니다. 오디오와 함께 단어 하이라이트가 해당 위치로 이동합니다."
            : "단어를 클릭하면 단어 뜻풀이를 확인할 수 있습니다. 각 문단 아래 버튼을 클릭하면 전체 문단에 대한 한국어 번역을 확인할 수 있습니다."}
        </CalloutBox>

        {/* Display article image if available */}
        {article.image_url && (
          <>
            <ArticleImage
              src={article.image_url}
              alt={article.title.english}
              loading="lazy"
            />
            <ImageCaption>
              이 이미지는 기사 이해를 돕기 위한 이미지로, AI에 의해 생성되었으며
              실제와 다를 수 있습니다.
            </ImageCaption>
          </>
        )}

        {/* Discussion Topics */}
        {(article.discussion_topics && article.discussion_topics.length > 0) ||
        accountStatus === "admin" ? (
          <DiscussionTopicsSection>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <SectionTitle style={{ marginBottom: 0 }}>
                Discussion Topics
              </SectionTitle>
              {accountStatus === "admin" && !isEditingTopics && (
                <AdminButton onClick={startEditingTopics}>✏️ 편집</AdminButton>
              )}
            </div>

            {isEditingTopics ? (
              <div>
                <AdminControlsContainer>
                  <AdminButton onClick={saveTopics} disabled={isSavingTopics}>
                    {isSavingTopics ? "저장 중..." : "💾 저장"}
                  </AdminButton>
                  <AdminButton
                    onClick={cancelEditingTopics}
                    disabled={isSavingTopics}
                  >
                    ❌ 취소
                  </AdminButton>
                </AdminControlsContainer>

                {editedTopics.map((topic, index) => (
                  <EditableTopicContainer key={index}>
                    <EditableTopicInput
                      value={topic}
                      onChange={(e) => updateTopic(index, e.target.value)}
                      placeholder="토론 주제를 입력하세요"
                    />
                    <RemoveTopicButton
                      onClick={() => removeTopic(index)}
                      title="삭제"
                    >
                      ×
                    </RemoveTopicButton>
                  </EditableTopicContainer>
                ))}

                <NewTopicContainer>
                  <NewTopicInput
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="새 토론 주제 추가..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addNewTopic();
                      }
                    }}
                  />
                  <AddTopicButton
                    onClick={addNewTopic}
                    disabled={!newTopic.trim()}
                  >
                    ➕ 추가
                  </AddTopicButton>
                </NewTopicContainer>
              </div>
            ) : article.discussion_topics &&
              article.discussion_topics.length > 0 ? (
              <DiscussionTopicsList>
                {article.discussion_topics.map((topic, index) => (
                  <DiscussionTopicItem
                    key={index}
                    className="article-text"
                    data-original-text={topic}
                    onClick={handleWordClick}
                  >
                    {topic}
                  </DiscussionTopicItem>
                ))}
              </DiscussionTopicsList>
            ) : (
              accountStatus === "admin" && (
                <div
                  style={{
                    color: colors.text.light,
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "2rem",
                    background: colors.primaryBg,
                    borderRadius: "8px",
                    border: `1px dashed ${colors.primaryPale}`,
                  }}
                >
                  토론 주제가 없습니다. 편집 버튼을 눌러 추가해보세요.
                </div>
              )
            )}
          </DiscussionTopicsSection>
        ) : null}

        {content.english?.length > 0 && (
          <ContentSection>
            {content.english.map((paragraph, index) => (
              <ParagraphContainer key={index}>
                <Paragraph
                  className="article-text"
                  data-original-text={paragraph}
                  onClick={handleWordClick}
                >
                  {isAudioMode
                    ? prepareParagraphText(paragraph, index)
                    : paragraph}
                </Paragraph>
                <TranslationToggleButton
                  onClick={() => toggleKoreanParagraph(index)}
                  className={
                    visibleKoreanParagraphs.includes(index) ? "active" : ""
                  }
                >
                  {visibleKoreanParagraphs.includes(index)
                    ? "한국어 번역 숨기기"
                    : "한국어 번역 보기"}
                </TranslationToggleButton>
                {content.korean[index] && (
                  <KoreanParagraph
                    isVisible={visibleKoreanParagraphs.includes(index)}
                    className="article-text"
                    data-original-text={content.korean[index]}
                  >
                    {content.korean[index]}
                  </KoreanParagraph>
                )}
              </ParagraphContainer>
            ))}
          </ContentSection>
        )}

        {keywords && keywords.length > 0 && (
          <KeywordsSection>
            <SectionTitle>Key Vocabulary</SectionTitle>
            <KeywordsContainer>
              <KeywordsSlider
                ref={sliderRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {keywords.map((word, index) => {
                  const wordData = wordDetails[word];
                  // Skip rendering cards that have failed to load or are still loading
                  const isLoading = wordLoading[word];
                  if (!wordData && !isLoading) return null;

                  return (
                    <KeywordCard
                      key={index}
                      onClick={() => openKeywordModal(word)}
                    >
                      <Word>{word}</Word>
                      {wordData && (
                        <>
                          {wordData.categories?.english &&
                            wordData.categories.english.length > 0 && (
                              <Categories>
                                {wordData.categories.english
                                  .slice(0, 2)
                                  .map((cat, idx) => (
                                    <Category key={idx}>{cat}</Category>
                                  ))}
                              </Categories>
                            )}
                          <Meaning>{wordData.definitions.english}</Meaning>
                          {wordData.synonyms &&
                            wordData.synonyms.length > 0 && (
                              <Synonyms>
                                {wordData.synonyms
                                  .slice(0, 3)
                                  .map((syn, idx) => (
                                    <Synonym key={idx}>{syn}</Synonym>
                                  ))}
                              </Synonyms>
                            )}
                          {wordData.examples &&
                            wordData.examples.length > 0 &&
                            wordData.examples[0].english.length > 0 && (
                              <Example>
                                "{wordData.examples[0].english[0]}"
                              </Example>
                            )}
                        </>
                      )}
                      {isLoading && <Meaning>Loading word details...</Meaning>}
                    </KeywordCard>
                  );
                })}
              </KeywordsSlider>
              {hasPrevKeywords && (
                <PrevButton
                  onClick={handlePrevKeyword}
                  aria-label="Previous keyword"
                />
              )}
              {hasMoreKeywords && (
                <NextButton
                  onClick={
                    isAtLastButNotEnd ? handleLastKeyword : handleNextKeyword
                  }
                  aria-label="Next keyword"
                />
              )}
            </KeywordsContainer>
          </KeywordsSection>
        )}

        {/* Keyword modal */}
        <ModalOverlay isOpen={isModalOpen} onClick={closeKeywordModal}>
          <ModalContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <CloseButton onClick={closeKeywordModal}>×</CloseButton>
            {selectedKeyword && selectedWordData && (
              <>
                <WordTitleRow>
                  <ModalWord>{selectedKeyword}</ModalWord>
                  {currentUser ? (
                    savedWords.includes(selectedKeyword) ? (
                      <SavedIndicator>저장됨</SavedIndicator>
                    ) : (
                      <SaveButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveWord(selectedKeyword);
                        }}
                        disabled={isSaving}
                      >
                        {isSaving ? "저장 중..." : "⭐️ 단어장에 추가"}
                      </SaveButton>
                    )
                  ) : null}
                </WordTitleRow>

                {/* Categories */}
                {selectedWordData.categories?.english &&
                  selectedWordData.categories.english.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                        marginBottom: "1.2rem",
                      }}
                    >
                      {selectedWordData.categories.english.map(
                        (category, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "0.8rem",
                              color: colors.accent,
                              backgroundColor: colors.primaryPale,
                              padding: "0.2rem 0.6rem",
                              borderRadius: "4px",
                              fontStyle: "italic",
                            }}
                          >
                            {category}
                          </span>
                        )
                      )}
                    </div>
                  )}

                {/* Definition Section */}
                <ModalSection>
                  <ModalSectionTitle>Definition</ModalSectionTitle>
                  <DualText>
                    <ModalMeaning>
                      {selectedWordData.definitions.english}
                    </ModalMeaning>
                    <KoreanText>
                      {selectedWordData.definitions.korean}
                    </KoreanText>
                  </DualText>
                </ModalSection>

                {/* Synonyms Section */}
                {selectedWordData.synonyms &&
                  selectedWordData.synonyms.length > 0 && (
                    <ModalSection>
                      <ModalSectionTitle>Synonyms</ModalSectionTitle>
                      <ModalSynonyms>
                        {selectedWordData.synonyms.map((syn, idx) => (
                          <ModalSynonym key={idx}>{syn}</ModalSynonym>
                        ))}
                      </ModalSynonyms>
                    </ModalSection>
                  )}

                {/* Antonyms Section */}
                {selectedWordData.antonyms &&
                  selectedWordData.antonyms.length > 0 && (
                    <ModalSection>
                      <ModalSectionTitle>Antonyms</ModalSectionTitle>
                      <ModalSynonyms>
                        {selectedWordData.antonyms.map((ant, idx) => (
                          <ModalSynonym key={idx}>{ant}</ModalSynonym>
                        ))}
                      </ModalSynonyms>
                    </ModalSection>
                  )}

                {/* Examples Section */}
                {selectedWordData.examples &&
                  selectedWordData.examples.length > 0 && (
                    <ModalSection>
                      <ModalSectionTitle>Examples</ModalSectionTitle>
                      <div
                        style={{
                          borderRadius: "8px",
                          padding: "0.5rem 0",
                        }}
                      >
                        {selectedWordData.examples[0].english.map(
                          (example, idx) => (
                            <div
                              key={idx}
                              style={{
                                marginBottom:
                                  idx <
                                  selectedWordData.examples[0].english.length -
                                    1
                                    ? "1.2rem"
                                    : 0,
                                paddingBottom:
                                  idx <
                                  selectedWordData.examples[0].english.length -
                                    1
                                    ? "1.2rem"
                                    : 0,
                                borderBottom:
                                  idx <
                                  selectedWordData.examples[0].english.length -
                                    1
                                    ? `1px solid ${colors.primaryPale}`
                                    : "none",
                              }}
                            >
                              <ModalExample>"{example}"</ModalExample>
                              {selectedWordData.examples[0].korean &&
                                selectedWordData.examples[0].korean[idx] && (
                                  <ExampleKoreanText>
                                    {selectedWordData.examples[0].korean[idx]}
                                  </ExampleKoreanText>
                                )}
                            </div>
                          )
                        )}
                      </div>
                    </ModalSection>
                  )}

                {/* Wiktionary Section */}
                {selectedWordWiktionaryData &&
                  selectedWordWiktionaryData.length > 0 && (
                    <ModalSection>
                      <ModalSectionTitle>Wiktionary</ModalSectionTitle>
                      {selectedWordWiktionaryData[0].meanings
                        ?.slice(0, 3)
                        .map((meaning: any, idx: number) => (
                          <div key={idx} style={{ marginBottom: "1.2rem" }}>
                            <div
                              style={{
                                fontWeight: "bold",
                                color: colors.primaryDark,
                                marginBottom: "0.5rem",
                                fontSize: "1rem",
                                textTransform: "capitalize",
                              }}
                            >
                              {meaning.partOfSpeech}
                            </div>

                            {meaning.definitions &&
                              meaning.definitions.length > 0 && (
                                <ul
                                  style={{
                                    marginTop: "0.3rem",
                                    paddingLeft: "1.2rem",
                                    listStyleType: "disc",
                                    margin: "0 0 0.8rem 0",
                                  }}
                                >
                                  {meaning.definitions
                                    .slice(0, 2)
                                    .map((def: any, defIdx: number) => (
                                      <li
                                        key={defIdx}
                                        style={{
                                          marginBottom: "0.6rem",
                                          fontSize: "0.95rem",
                                          color: colors.text.dark,
                                          lineHeight: "1.5",
                                        }}
                                      >
                                        {def.definition}
                                        {def.example && (
                                          <div
                                            style={{
                                              fontStyle: "italic",
                                              color: colors.text.light,
                                              marginTop: "0.3rem",
                                              fontSize: "0.9rem",
                                              lineHeight: "1.4",
                                            }}
                                          >
                                            e.g. "{def.example}"
                                          </div>
                                        )}
                                        {def.synonyms &&
                                          def.synonyms.length > 0 && (
                                            <div
                                              style={{
                                                fontSize: "0.85rem",
                                                color: colors.text.medium,
                                                marginTop: "0.25rem",
                                                lineHeight: "1.4",
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
                                                fontSize: "0.85rem",
                                                color: colors.text.medium,
                                                marginTop: "0.25rem",
                                                lineHeight: "1.4",
                                              }}
                                            >
                                              <strong>Antonyms:</strong>{" "}
                                              {def.antonyms.join(", ")}
                                            </div>
                                          )}
                                      </li>
                                    ))}
                                </ul>
                              )}

                            {/* Display meaning-level synonyms */}
                            {meaning.synonyms &&
                              meaning.synonyms.length > 0 && (
                                <div
                                  style={{
                                    fontSize: "0.85rem",
                                    color: colors.text.medium,
                                    marginTop: "0.3rem",
                                    lineHeight: "1.4",
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
                                    fontSize: "0.85rem",
                                    color: colors.text.medium,
                                    marginTop: "0.3rem",
                                    lineHeight: "1.4",
                                  }}
                                >
                                  <strong>Antonyms:</strong>{" "}
                                  {meaning.antonyms.join(", ")}
                                </div>
                              )}
                          </div>
                        ))}
                    </ModalSection>
                  )}
              </>
            )}
            {selectedKeyword && !selectedWordData && (
              <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                <div
                  style={{
                    fontSize: "1.2rem",
                    color: colors.text.medium,
                    marginBottom: "0.5rem",
                  }}
                >
                  Loading details...
                </div>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    margin: "1rem auto",
                    border: `3px solid ${colors.primaryPale}`,
                    borderTop: `3px solid ${colors.accent}`,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                <style>
                  {`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}
                </style>
              </div>
            )}
          </ModalContent>
        </ModalOverlay>

        {/* Word definition modal (disabled in audio mode) */}
        <DefinitionModalOverlay
          isOpen={wordDefinitionModal.isOpen && !isAudioMode}
          onClick={closeDefinitionModal}
        >
          <DefinitionModalContent
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <CloseButton onClick={closeDefinitionModal}>×</CloseButton>
            <WordDefinitionTitle>
              {wordDefinitionModal.word}
            </WordDefinitionTitle>

            {/* GPT Definition Section */}
            {wordDefinitionModal.isLoading ? (
              <LoadingDefinitionContent>
                뜻풀이 생각 중...
              </LoadingDefinitionContent>
            ) : (
              <div style={{ marginBottom: "1.5rem" }}>
                <ModalSectionTitle>AI Definition</ModalSectionTitle>
                <WordDefinitionContent>
                  {wordDefinitionModal.definition}
                </WordDefinitionContent>
              </div>
            )}

            {/* Wiktionary Section */}
            {wordDefinitionModal.isWiktionaryLoading ? (
              <div style={{ marginTop: "1.5rem" }}>
                <ModalSectionTitle>Wiktionary</ModalSectionTitle>
                <LoadingDefinitionContent>
                  Wiktionary 정보 로딩 중...
                </LoadingDefinitionContent>
              </div>
            ) : (
              wordDefinitionModal.wiktionaryData &&
              wordDefinitionModal.wiktionaryData.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <ModalSectionTitle>Wiktionary</ModalSectionTitle>
                  {wordDefinitionModal.wiktionaryData[0].meanings
                    ?.slice(0, 3)
                    .map((meaning: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: "1.2rem" }}>
                        <div
                          style={{
                            fontWeight: "bold",
                            color: colors.primaryDark,
                            marginBottom: "0.5rem",
                            fontSize: "1rem",
                            textTransform: "capitalize",
                          }}
                        >
                          {meaning.partOfSpeech}
                        </div>

                        {meaning.definitions &&
                          meaning.definitions.length > 0 && (
                            <ul
                              style={{
                                marginTop: "0.3rem",
                                paddingLeft: "1.2rem",
                                listStyleType: "disc",
                                margin: "0 0 0.8rem 0",
                              }}
                            >
                              {meaning.definitions
                                .slice(0, 2)
                                .map((def: any, defIdx: number) => (
                                  <li
                                    key={defIdx}
                                    style={{
                                      marginBottom: "0.6rem",
                                      fontSize: "0.95rem",
                                      color: colors.text.dark,
                                      lineHeight: "1.5",
                                    }}
                                  >
                                    {def.definition}
                                    {def.example && (
                                      <div
                                        style={{
                                          fontStyle: "italic",
                                          color: colors.text.light,
                                          marginTop: "0.3rem",
                                          fontSize: "0.9rem",
                                          lineHeight: "1.4",
                                        }}
                                      >
                                        e.g. "{def.example}"
                                      </div>
                                    )}
                                    {def.synonyms &&
                                      def.synonyms.length > 0 && (
                                        <div
                                          style={{
                                            fontSize: "0.85rem",
                                            color: colors.text.medium,
                                            marginTop: "0.25rem",
                                            lineHeight: "1.4",
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
                                            fontSize: "0.85rem",
                                            color: colors.text.medium,
                                            marginTop: "0.25rem",
                                            lineHeight: "1.4",
                                          }}
                                        >
                                          <strong>Antonyms:</strong>{" "}
                                          {def.antonyms.join(", ")}
                                        </div>
                                      )}
                                  </li>
                                ))}
                            </ul>
                          )}

                        {/* Display meaning-level synonyms */}
                        {meaning.synonyms && meaning.synonyms.length > 0 && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: colors.text.medium,
                              marginTop: "0.3rem",
                              lineHeight: "1.4",
                            }}
                          >
                            <strong>Synonyms:</strong>{" "}
                            {meaning.synonyms.join(", ")}
                          </div>
                        )}

                        {/* Display meaning-level antonyms */}
                        {meaning.antonyms && meaning.antonyms.length > 0 && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: colors.text.medium,
                              marginTop: "0.3rem",
                              lineHeight: "1.4",
                            }}
                          >
                            <strong>Antonyms:</strong>{" "}
                            {meaning.antonyms.join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )
            )}
          </DefinitionModalContent>
        </DefinitionModalOverlay>

        {/* Translation Warning */}
        <TranslationWarning
          isVisible={showTranslationWarning}
          onClose={() => setShowTranslationWarning(false)}
          onDontShowAgain={handleDontShowTranslationWarning}
        />

        {/* Audio Player */}
        <AudioPlayer
          isVisible={isAudioMode}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          audioProgress={audioProgress}
          playbackSpeed={playbackSpeed}
          onTogglePlayPause={togglePlayPause}
          onSeekAudio={seekAudio}
          onChangePlaybackSpeed={changePlaybackSpeed}
          formatTime={formatTime}
        />

        {/* Floating Controls */}
        <FloatingControls
          isAudioMode={isAudioMode}
          hasAudio={!!article.audio?.url}
          onToggleAudioMode={toggleAudioMode}
          isVisible={isFloatingControlsVisible}
          onToggleVisibility={() =>
            setIsFloatingControlsVisible(!isFloatingControlsVisible)
          }
        />

        {/* Hidden audio element to drive time updates */}
        {article.audio?.url && (
          <audio
            ref={audioRef}
            src={article.audio.url}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
            preload="metadata"
            style={{ display: "none" }}
          />
        )}
      </ArticleContainer>
    </ArticlePageWrapper>
  );
};

export default Article;
