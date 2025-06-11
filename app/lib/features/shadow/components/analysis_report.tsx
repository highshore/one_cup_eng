import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import Lottie from "lottie-react";
import {
  SentenceForAssessment,
  AzureWordPronunciationResult,
} from "../types/shadow";
import { colors } from "../styles/shadow_styles";
import CompletionModal from "./completion_modal";

interface AnalysisReportProps {
  sentences: SentenceForAssessment[];
}

const floatingAnimation = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const pulseAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

const gradientMove = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const ReportContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  background: linear-gradient(
    135deg,
    ${colors.surface} 0%,
    ${colors.background} 50%,
    ${colors.surface} 100%
  );
  border-radius: 24px;
  box-shadow: ${colors.shadow.xl}, 0 0 40px rgba(60, 46, 38, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid ${colors.border.light};
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(
      90deg,
      ${colors.primary},
      ${colors.accent},
      ${colors.primary}
    );
    background-size: 200% 100%;
    animation: ${gradientMove} 3s ease infinite;
  }
`;

const LottieContainer = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
  pointer-events: none;
  z-index: 5;
  margin: 0 auto 1rem auto;
`;

const ReportHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid ${colors.border.light};
  position: relative;
`;

const ReportTitle = styled.h1`
  font-size: 2.8rem;
  font-weight: 800;
  background: linear-gradient(
    135deg,
    ${colors.primary} 0%,
    ${colors.accent} 30%,
    ${colors.primaryLight} 60%,
    ${colors.primary} 100%
  );
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  animation: ${gradientMove} 4s ease infinite;
  letter-spacing: -0.02em;
`;

const ReportSubtitle = styled.p`
  font-size: 1.5rem;
  color: ${colors.text.muted};
  margin: 20px 0;
  font-weight: 500;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const MetricCard = styled.div<{ highlight?: boolean }>`
  background: ${(props) =>
    props.highlight
      ? `linear-gradient(135deg, 
          ${colors.primary}15 0%, 
          ${colors.accent}10 50%, 
          ${colors.primary}15 100%)`
      : `linear-gradient(135deg, 
          ${colors.surface} 0%, 
          ${colors.background} 100%)`};
  border: 2px solid
    ${(props) => (props.highlight ? colors.primary : colors.border.light)};
  border-radius: 20px;
  padding: 2rem 1.5rem;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: ${floatingAnimation} 3s ease-in-out infinite;

  &::before {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: ${(props) =>
      props.highlight
        ? `linear-gradient(45deg, transparent, ${colors.primary}20, transparent)`
        : "none"};
    transform: rotate(-45deg);
    transition: all 0.6s ease;
    opacity: 0;
  }

  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: ${colors.shadow.xl}, 0 20px 40px rgba(60, 46, 38, 0.15);
    border-color: ${colors.primary};

    &::before {
      opacity: 1;
      animation: ${gradientMove} 2s linear infinite;
    }
  }

  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.4s;
  }
  &:nth-child(4) {
    animation-delay: 0.6s;
  }
`;

const MetricValue = styled.div`
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, ${colors.primary}, ${colors.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  position: relative;
  z-index: 2;
`;

const MetricLabel = styled.div`
  font-size: 0.95rem;
  color: ${colors.text.muted};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  position: relative;
  z-index: 2;
`;

const Section = styled.div`
  margin-bottom: 3rem;
  padding: 1.5rem;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.02) 100%
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 1.6rem;
  font-weight: 700;
  color: ${colors.text.primary};
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &::before {
    content: "";
    width: 6px;
    height: 32px;
    background: linear-gradient(180deg, ${colors.primary}, ${colors.accent});
    border-radius: 3px;
    box-shadow: 0 2px 8px rgba(60, 46, 38, 0.3);
  }
`;

const ProgressBar = styled.div<{ percentage: number; color?: string }>`
  width: 100%;
  height: 16px;
  background: linear-gradient(
    90deg,
    ${colors.border.light},
    ${colors.border.medium}
  );
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${(props) => props.percentage}%;
    background: ${(props) => {
      if (props.color) return props.color;
      if (props.percentage >= 80)
        return `linear-gradient(90deg, ${colors.success}, #6fd46f)`;
      if (props.percentage >= 60)
        return `linear-gradient(90deg, ${colors.warning}, #f4c430)`;
      return `linear-gradient(90deg, ${colors.error}, #ff6b6b)`;
    }};
    border-radius: 8px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      animation: ${gradientMove} 2s ease infinite;
    }
  }
`;

const ImprovementCard = styled.div`
  background: linear-gradient(
    135deg,
    ${colors.surface} 0%,
    ${colors.background} 100%
  );
  border: 1px solid ${colors.border.light};
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 1rem;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(60, 46, 38, 0.05),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${colors.shadow.lg};
    border-color: ${colors.primary}50;

    &::before {
      left: 100%;
    }
  }
`;

const ImprovementTitle = styled.h4`
  font-size: 1.2rem;
  font-weight: 700;
  background: linear-gradient(
    135deg,
    ${colors.text.primary},
    ${colors.primary}
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
`;

const ImprovementDescription = styled.p`
  color: ${colors.text.secondary};
  line-height: 1.7;
  margin-bottom: 1rem;
  font-weight: 500;
`;

const WordList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const WordChip = styled.span<{ score: number }>`
  padding: 0.5rem 1rem;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  background: ${(props) => {
    if (props.score >= 80)
      return `linear-gradient(135deg, ${colors.success}20, ${colors.success}10)`;
    if (props.score >= 60)
      return `linear-gradient(135deg, ${colors.warning}20, ${colors.warning}10)`;
    return `linear-gradient(135deg, ${colors.error}20, ${colors.error}10)`;
  }};
  color: ${(props) => {
    if (props.score >= 80) return colors.success;
    if (props.score >= 60) return colors.warning;
    return colors.error;
  }};
  border: 2px solid
    ${(props) => {
      if (props.score >= 80) return `${colors.success}40`;
      if (props.score >= 60) return `${colors.warning}40`;
      return `${colors.error}40`;
    }};
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.4s ease;
  }

  &:hover {
    transform: translateY(-2px);
    &::before {
      left: 100%;
    }
  }
`;

const RecommendationBox = styled.div`
  background: linear-gradient(
    135deg,
    ${colors.primary}08 0%,
    ${colors.accent}05 50%,
    ${colors.primary}08 100%
  );
  border: 2px solid ${colors.primary}30;
  border-radius: 20px;
  padding: 2.5rem;
  margin-top: 2rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent,
      ${colors.primary}10,
      transparent
    );
    animation: ${pulseAnimation} 4s ease-in-out infinite;
  }
`;

const RecommendationTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, ${colors.primary}, ${colors.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 2;

  &::before {
    content: "💡";
    font-size: 1.8rem;
    animation: ${pulseAnimation} 2s ease-in-out infinite;
  }
`;

const RecommendationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
  z-index: 2;
`;

const RecommendationItem = styled.li`
  padding: 1rem 0;
  color: ${colors.text.secondary};
  line-height: 1.7;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;

  &::before {
    content: "→";
    color: ${colors.primary};
    font-weight: bold;
    font-size: 1.2rem;
    margin-top: 0.1rem;
    transition: transform 0.3s ease;
  }

  &:hover {
    transform: translateX(8px);
    &::before {
      transform: scale(1.2);
    }
  }
`;

const FinishButton = styled.button`
  margin-top: 2rem;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 1rem 3rem;
  font-size: 1rem;
  font-weight: 700;
  background: linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark});
  color: ${colors.text.inverse};
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${colors.shadow.lg};
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
      ${colors.accent},
      ${colors.primaryLight}
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: ${colors.shadow.xl};

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(-2px) scale(1.01);
  }

  span {
    position: relative;
    z-index: 1;
  }
`;

const AnalysisReport: React.FC<AnalysisReportProps> = ({ sentences }) => {
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [welcomeAnimation, setWelcomeAnimation] = useState<any>(null);

  // Load Lottie animation
  useEffect(() => {
    fetch("/animations/complete.json")
      .then((response) => response.json())
      .then((data) => setWelcomeAnimation(data))
      .catch((error) => console.error("Error loading animation:", error));
  }, []);

  // Handle AI chat option
  const handleAIChat = () => {
    setIsCompletionModalOpen(false);
    // TODO: Navigate to AI chat or implement AI chat functionality
    console.log("AI Chat selected");
  };

  // Handle finish option
  const handleFinish = () => {
    setIsCompletionModalOpen(false);
    // TODO: Navigate back to home or close the app
    console.log("Finish selected");
  };

  // Calculate overall metrics
  const assessedSentences = sentences.filter((s) => s.assessmentResult);

  // Show sample data instead of empty state
  const useSampleData = assessedSentences.length === 0;

  // Sample data for demonstration
  const sampleData = {
    totalSentences: 8,
    avgPronunciation: 82,
    avgAccuracy: 85,
    avgFluency: 78,
    avgCompleteness: 83,
    wordIssues: [
      { word: "expectations", score: 65, error: "Mispronunciation", count: 2 },
      { word: "resilience", score: 58, error: "Accuracy", count: 1 },
      { word: "character", score: 72, error: "Fluency", count: 1 },
      { word: "refine", score: 68, error: "Pronunciation", count: 1 },
      { word: "company", score: 74, error: "Accent", count: 1 },
      { word: "greatness", score: 69, error: "Stress", count: 1 },
      { word: "train", score: 76, error: "Speed", count: 1 },
    ],
  };

  let totalSentences,
    avgPronunciation,
    avgAccuracy,
    avgFluency,
    avgCompleteness,
    wordIssues;

  if (useSampleData) {
    totalSentences = sampleData.totalSentences;
    avgPronunciation = sampleData.avgPronunciation;
    avgAccuracy = sampleData.avgAccuracy;
    avgFluency = sampleData.avgFluency;
    avgCompleteness = sampleData.avgCompleteness;
    wordIssues = sampleData.wordIssues;
  } else {
    totalSentences = assessedSentences.length;
    avgPronunciation =
      assessedSentences.reduce(
        (sum, s) => sum + (s.assessmentResult?.pronunciationScore || 0),
        0
      ) / totalSentences;
    avgAccuracy =
      assessedSentences.reduce(
        (sum, s) => sum + (s.assessmentResult?.accuracyScore || 0),
        0
      ) / totalSentences;
    avgFluency =
      assessedSentences.reduce(
        (sum, s) => sum + (s.assessmentResult?.fluencyScore || 0),
        0
      ) / totalSentences;
    avgCompleteness =
      assessedSentences.reduce(
        (sum, s) => sum + (s.assessmentResult?.completenessScore || 0),
        0
      ) / totalSentences;

    // Analyze word-level issues from real data
    const realWordIssues: {
      word: string;
      score: number;
      error: string;
      count: number;
    }[] = [];
    const wordMap = new Map();

    assessedSentences.forEach((sentence) => {
      const words =
        (sentence.assessmentResult?.detailResult
          ?.Words as AzureWordPronunciationResult[]) || [];
      words.forEach((word) => {
        const score = word.PronunciationAssessment?.AccuracyScore || 0;
        const error = word.PronunciationAssessment?.ErrorType || "None";

        if (score < 70 || error !== "None") {
          const key = word.Word.toLowerCase();
          if (wordMap.has(key)) {
            const existing = wordMap.get(key);
            existing.count++;
            existing.score = Math.min(existing.score, score);
          } else {
            wordMap.set(key, { word: word.Word, score, error, count: 1 });
          }
        }
      });
    });

    realWordIssues.push(...Array.from(wordMap.values()));
    realWordIssues.sort((a, b) => a.score - b.score);
    wordIssues = realWordIssues;
  }

  // Generate improvement areas
  const improvementAreas = [];

  if (avgPronunciation < 70) {
    improvementAreas.push({
      title: "전체적인 발음",
      description:
        "명확한 발음과 정확한 소리 생성에 집중하세요. 원어민 오디오와 함께 연습해보세요.",
    });
  }

  if (avgFluency < 70) {
    improvementAreas.push({
      title: "말하기 유창성",
      description:
        "부드럽고 자연스러운 말의 리듬을 연습하세요. 매일 소리내어 읽기와 쉐도잉 연습을 해보세요.",
    });
  }

  if (avgAccuracy < 70) {
    improvementAreas.push({
      title: "단어 정확성",
      description:
        "개별 단어의 정확한 발음에 집중하세요. 발음 기호를 가이드로 활용해보세요.",
    });
  }

  // Add sample improvement areas if using sample data and no real issues found
  if (useSampleData && improvementAreas.length === 0) {
    improvementAreas.push({
      title: "말하기 유창성",
      description:
        "부드럽고 자연스러운 말의 리듬을 연습하세요. 매일 소리내어 읽기와 쉐도잉 연습을 해보세요.",
    });
  }

  const overallScore =
    (avgPronunciation + avgAccuracy + avgFluency + avgCompleteness) / 4;

  // Show firework animation for good scores
  const showFireworks = overallScore >= 80;

  return (
    <ReportContainer>
      <ReportHeader>
        {showFireworks && welcomeAnimation && (
          <LottieContainer>
            <Lottie
              animationData={welcomeAnimation}
              loop={true}
              style={{ width: "100%", height: "100%" }}
            />
          </LottieContainer>
        )}
        <ReportTitle>고생하셨습니다!</ReportTitle>
        <ReportSubtitle>
          {useSampleData
            ? "스터디 분석 결과"
            : `총 ${totalSentences}개 문장 분석 결과`}
        </ReportSubtitle>
      </ReportHeader>

      {/* Overall Metrics */}
      <MetricsGrid>
        <MetricCard highlight>
          <MetricValue>{Math.round(overallScore)}</MetricValue>
          <MetricLabel>종합 점수</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{Math.round(avgPronunciation)}</MetricValue>
          <MetricLabel>발음</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{Math.round(avgAccuracy)}</MetricValue>
          <MetricLabel>정확성</MetricLabel>
        </MetricCard>
        <MetricCard>
          <MetricValue>{Math.round(avgFluency)}</MetricValue>
          <MetricLabel>유창성</MetricLabel>
        </MetricCard>
      </MetricsGrid>

      {/* Detailed Scores */}
      <Section>
        <SectionTitle>📈 세부 성과 분석</SectionTitle>
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
                fontSize: "1.1rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>발음 점수</span>
              <span style={{ color: colors.text.muted, fontWeight: 600 }}>
                {Math.round(avgPronunciation)}%
              </span>
            </div>
            <ProgressBar percentage={avgPronunciation} />
          </div>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
                fontSize: "1.1rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>정확성 점수</span>
              <span style={{ color: colors.text.muted, fontWeight: 600 }}>
                {Math.round(avgAccuracy)}%
              </span>
            </div>
            <ProgressBar percentage={avgAccuracy} />
          </div>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
                fontSize: "1.1rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>유창성 점수</span>
              <span style={{ color: colors.text.muted, fontWeight: 600 }}>
                {Math.round(avgFluency)}%
              </span>
            </div>
            <ProgressBar percentage={avgFluency} />
          </div>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
                fontSize: "1.1rem",
              }}
            >
              <span style={{ fontWeight: 600 }}>완성도 점수</span>
              <span style={{ color: colors.text.muted, fontWeight: 600 }}>
                {Math.round(avgCompleteness)}%
              </span>
            </div>
            <ProgressBar percentage={avgCompleteness} />
          </div>
        </div>
      </Section>

      {/* Words to Practice */}
      {wordIssues.length > 0 && (
        <Section>
          <SectionTitle>🎯 집중 연습 단어</SectionTitle>
          <p
            style={{
              color: colors.text.secondary,
              marginBottom: "1.5rem",
              fontSize: "1.1rem",
              lineHeight: "1.6",
            }}
          >
            다음 단어들의 정확도가 낮게 나타났습니다. 이 단어들의 발음 연습에
            집중해보세요:
          </p>
          <WordList>
            {wordIssues.slice(0, 15).map((issue, index) => (
              <WordChip key={index} score={issue.score}>
                {issue.word} ({Math.round(issue.score)}%)
              </WordChip>
            ))}
          </WordList>
        </Section>
      )}

      {/* Improvement Areas */}
      {improvementAreas.length > 0 && (
        <Section>
          <SectionTitle>💪 개선이 필요한 영역</SectionTitle>
          {improvementAreas.map((area, index) => (
            <ImprovementCard key={index}>
              <ImprovementTitle>{area.title}</ImprovementTitle>
              <ImprovementDescription>
                {area.description}
              </ImprovementDescription>
            </ImprovementCard>
          ))}
        </Section>
      )}

      {/* Recommendations */}
      <RecommendationBox>
        <RecommendationTitle>다음 단계 추천</RecommendationTitle>
        <RecommendationList>
          {overallScore >= 80 ? (
            <>
              <RecommendationItem>
                훌륭합니다! 높은 수준의 실력을 유지하기 위해 꾸준히 연습을
                계속하세요.
              </RecommendationItem>
              <RecommendationItem>
                더 어려운 콘텐츠에 도전하거나 말하기 속도와 자연스러움에
                집중해보세요.
              </RecommendationItem>
              <RecommendationItem>
                다양한 억양과 말하기 스타일을 연습하여 실력의 폭을 넓혀보세요.
              </RecommendationItem>
            </>
          ) : overallScore >= 60 ? (
            <>
              <RecommendationItem>
                좋은 진전입니다! 개선이 필요한 특정 단어와 소리에 집중해보세요.
              </RecommendationItem>
              <RecommendationItem>
                일관성을 위해 매일 10-15분씩 쉐도잉 연습을 해보세요.
              </RecommendationItem>
              <RecommendationItem>
                자신의 말하기를 녹음하고 원어민과 비교해보세요.
              </RecommendationItem>
            </>
          ) : (
            <>
              <RecommendationItem>
                천천히 말하기부터 시작하여 각 단어의 명확한 발음에 집중하세요.
              </RecommendationItem>
              <RecommendationItem>
                전체 문장으로 넘어가기 전에 기본적인 소리와 발음을 연습하세요.
              </RecommendationItem>
              <RecommendationItem>
                발음 앱을 사용하거나 말하기 코치와 함께 개인별 맞춤 피드백을
                받아보세요.
              </RecommendationItem>
            </>
          )}
          <RecommendationItem>
            위에 강조된 단어들을 먼저 개별적으로 연습해보세요.
          </RecommendationItem>
          <RecommendationItem>
            내일 다시 돌아와서 이 연습을 반복하여 향상 정도를 확인해보세요!
          </RecommendationItem>
        </RecommendationList>
      </RecommendationBox>

      <FinishButton onClick={() => setIsCompletionModalOpen(true)}>
        <span>🎯 마무리하기</span>
      </FinishButton>

      {isCompletionModalOpen && (
        <CompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => setIsCompletionModalOpen(false)}
          onAIChat={handleAIChat}
          onFinish={handleFinish}
        />
      )}
    </ReportContainer>
  );
};

export default AnalysisReport;
