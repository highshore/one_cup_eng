"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase/firebase";
import styled from "styled-components";

import GNB from "../../lib/components/gnb";
import React from "react";

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

// Color palette based on #2C1810 (Rich coffee brown)
const colors = {
  primary: "#2C1810",
  primaryLight: "#4A2F23",
  primaryDark: "#1A0F0A",
  primaryPale: "#F5EBE6",
  primaryBg: "#FDF9F6",
  accent: "#C8A27A",
  text: {
    dark: "#2C1810",
    medium: "#4A2F23",
    light: "#8B6B4F",
  },
};

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

// Additional styled components
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
  max-height: ${(props) => (props.isVisible ? "500px" : "0")};
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  overflow: hidden;
  transition: all 0.3s ease;
  margin-top: ${(props) => (props.isVisible ? "0.15rem" : "0")};
  border-left: 3px solid ${colors.accent};

  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.6;
    padding: 0.9rem;
  }
`;

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

const ParagraphContainer = styled.div`
  position: relative;
`;

const ContentSection = styled.div`
  margin-bottom: 1.5rem;
  width: 100%;
  background: ${colors.primaryBg};
`;

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

const ArticlePageWrapper = styled.div<{ isAudioMode?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${colors.primaryBg};
  z-index: 999;
  min-height: 100vh;
  width: 100vw;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: ${(props) => (props.isAudioMode ? "70px" : "0")};
`;

export function ArticleClient() {
  const params = useParams();
  const articleId = params.articleId as string;

  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isKoreanTitleVisible, setIsKoreanTitleVisible] = useState(false);

  // Additional state for full functionality
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [visibleKoreanParagraphs, setVisibleKoreanParagraphs] = useState<
    number[]
  >([]);
  const [isQuickReading, setIsQuickReading] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;

      try {
        const articleRef = doc(db, "articles", articleId);
        const articleSnap = await getDoc(articleRef);

        if (articleSnap.exists()) {
          const data = articleSnap.data() as ArticleData;
          setArticle(data);
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

  // Helper functions
  const calculateReadingTime = (content: string[]): string => {
    const totalWords = content.reduce((acc, paragraph) => {
      return acc + paragraph.split(/\s+/).length;
    }, 0);

    const readingTimeInSeconds = (totalWords / 150) * 60; // 150 words per minute
    const minutes = Math.floor(readingTimeInSeconds / 60);
    const seconds = Math.round(readingTimeInSeconds % 60);

    return `${minutes}분 ${seconds}초`;
  };

  const toggleKoreanTitle = () => {
    setIsKoreanTitleVisible(!isKoreanTitleVisible);
  };

  const toggleKoreanParagraph = (index: number) => {
    setVisibleKoreanParagraphs((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleAudioMode = () => {
    if (!isAudioMode && isQuickReading) {
      setIsQuickReading(false);
    }
    setIsAudioMode(!isAudioMode);
  };

  // Word click handler for definition lookup
  const handleWordClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    const paragraphElement = target.closest(
      ".article-text"
    ) as HTMLElement | null;
    if (!paragraphElement) return;

    // Basic word extraction from click position
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return;

    const textNode = range.startContainer;
    const offset = range.startOffset;
    const text = textNode.textContent || "";

    // Simple word boundary detection
    let start = offset;
    let end = offset;

    while (start > 0 && /\w/.test(text[start - 1])) start--;
    while (end < text.length && /\w/.test(text[end])) end++;

    const word = text.slice(start, end).toLowerCase();

    if (word && word.length > 2) {
      // For now, just show a simple alert - could be expanded to full definition modal
      console.log("Clicked word:", word);
    }
  };

  if (loading) return <LoadingContainer>Loading article...</LoadingContainer>;
  if (error) return <ErrorContainer>Error: {error}</ErrorContainer>;
  if (!article) return <ErrorContainer>No article found</ErrorContainer>;

  const { content = { english: [], korean: [] } } = article;

  return (
    <ArticlePageWrapper isAudioMode={isAudioMode}>
      <GNB />
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
        </InfoContainer>

        <CalloutBox>
          {isAudioMode
            ? "단어를 클릭하면 해당 부분부터 오디오가 재생됩니다. 오디오와 함께 단어 하이라이트가 해당 위치로 이동합니다."
            : "단어를 클릭하면 단어 뜻풀이를 확인할 수 있습니다. 각 문단 아래 버튼을 클릭하면 전체 문단에 대한 한국어 번역을 확인할 수 있습니다."}
        </CalloutBox>

        {/* Enhanced content display with translation toggles */}
        {content.english?.length > 0 && (
          <ContentSection>
            {content.english.map((paragraph, index) => (
              <ParagraphContainer key={index}>
                <Paragraph
                  className="article-text"
                  data-original-text={paragraph}
                  onClick={handleWordClick}
                >
                  {paragraph}
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

        {/* Floating Buttons */}
        <FloatingButtonContainer isAudioMode={isAudioMode}>
          <FloatingButton
            onClick={() => setIsQuickReading(!isQuickReading)}
            className={isQuickReading ? "active" : ""}
            disabled={isAudioMode}
          >
            {isQuickReading ? "✕ 속독 해제" : "⚡ 속독 모드"}
          </FloatingButton>
          {article.audio?.url && (
            <FloatingButton
              onClick={toggleAudioMode}
              className={isAudioMode ? "active" : ""}
              disabled={isQuickReading}
            >
              {isAudioMode ? "✕ 오디오 해제" : "🎧 오디오 모드"}
            </FloatingButton>
          )}
        </FloatingButtonContainer>
      </ArticleContainer>
    </ArticlePageWrapper>
  );
}
