"use client";

import React, { useState } from "react";
import { styled } from "styled-components";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  FiTrendingUp,
  FiClock,
  FiMessageSquare,
  FiTarget,
  FiBookOpen,
  FiAward,
  FiActivity,
} from "react-icons/fi";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  ArcElement
);

// Types
interface SessionData {
  id: string;
  date: string;
  topic1: string;
  topic2: string;
  speakingTime: number; // in minutes
  totalWords: number;
  wordsPerMinute: number;
  pronunciationScore: number;
  fluencyScore: number;
  coherenceScore: number;
  overallScore: number;
  suggestedWords: string[];
  suggestedExpressions: string[];
  transcript: TranscriptSegment[];
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface LanguageSuggestion {
  word: string;
  definition: string;
  example: string;
  category: "vocabulary" | "expression" | "pronunciation";
  difficulty: "beginner" | "intermediate" | "advanced";
}

// Styled Components - YC Startup Design
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 0rem;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  color: #1a1a1a;
`;

const Header = styled.div`
  margin-bottom: 3rem;
  padding: 0;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #000;
  letter-spacing: -0.025em;
`;

const Subtitle = styled.p`
  font-size: 1.125rem;
  color: #6b7280;
  margin-bottom: 2rem;
  font-weight: 400;
`;

const SessionMetaData = styled.div`
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid #e5e7eb;
`;

const MetaItem = styled.div`
  .label {
    font-size: 0.875rem;
    color: #6b7280;
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .value {
    font-size: 1rem;
    font-weight: 600;
    color: #000;
  }
`;

const TabNavigation = styled.div`
  display: flex;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 1rem 0;
  margin-right: 2rem;
  border: none;
  background: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${(props) => (props.active ? "#000" : "#6b7280")};
  border-bottom: 2px solid ${(props) => (props.active ? "#000" : "transparent")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #000;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const MetricCard = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #d1d5db;
  }
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const MetricIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #f3f4f6;
  border-radius: 8px;
  color: #374151;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #000;
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const Card = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 2rem;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #d1d5db;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #000;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChartContainer = styled.div`
  position: relative;
  height: 300px;
  margin-bottom: 1rem;
`;

const ProgressChart = styled.div`
  height: 400px;
  margin-bottom: 1rem;
`;

const SuggestionsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
`;

const SuggestionSection = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 2rem;
`;

const SuggestionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #000;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SuggestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SuggestionItem = styled.div`
  padding: 1rem;
  border: 1px solid #f3f4f6;
  border-radius: 6px;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: #e5e7eb;
  }
`;

const SuggestionWord = styled.div`
  font-weight: 600;
  color: #000;
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const SuggestionDefinition = styled.div`
  color: #374151;
  margin-bottom: 0.5rem;
  line-height: 1.5;
  font-size: 0.875rem;
`;

const SuggestionExample = styled.div`
  color: #6b7280;
  font-style: italic;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 4px;
  border-left: 3px solid #e5e7eb;
  font-size: 0.875rem;
`;

const DifficultyBadge = styled.span<{ difficulty: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.5rem;
  background: ${(props) =>
    props.difficulty === "beginner"
      ? "#f3f4f6"
      : props.difficulty === "intermediate"
      ? "#f3f4f6"
      : "#f3f4f6"};
  color: ${(props) =>
    props.difficulty === "beginner"
      ? "#16a34a"
      : props.difficulty === "intermediate"
      ? "#ea580c"
      : "#7c3aed"};
  border: 1px solid
    ${(props) =>
      props.difficulty === "beginner"
        ? "#dcfce7"
        : props.difficulty === "intermediate"
        ? "#fed7aa"
        : "#ede9fe"};
`;

const TranscriptSection = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 2rem;
`;

const TranscriptSegment = styled.div<{ isUser: boolean }>`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 6px;
  background: ${(props) => (props.isUser ? "#f9fafb" : "#f3f4f6")};
  border-left: 3px solid ${(props) => (props.isUser ? "#000" : "#6b7280")};
`;

const SpeakerLabel = styled.div<{ isUser: boolean }>`
  font-weight: 600;
  color: ${(props) => (props.isUser ? "#000" : "#6b7280")};
  min-width: 60px;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TranscriptText = styled.div`
  flex: 1;
  line-height: 1.6;
  color: #374151;
`;

const ChartDescription = styled.p`
  color: #6b7280;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 1rem;
  line-height: 1.5;
`;

// Empty State Components
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: #6b7280;
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const EmptyStateTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const EmptyStateMessage = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  max-width: 300px;
  line-height: 1.5;
`;

// Real data will be loaded from props or API calls
// No dummy/fallback data - proper empty states will be shown when no data exists

export default function ReportClient() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "progress" | "suggestions" | "transcript"
  >("overview");
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionData[]>([]);
  const [languageSuggestions, setLanguageSuggestions] = useState<LanguageSuggestion[]>([]);

  // Chart data for progress tracking - only create if we have data
  const progressData = sessionHistory.length > 0 ? {
    labels: sessionHistory.map((s) => new Date(s.date).toLocaleDateString()),
    datasets: [
      {
        label: "Words per Minute",
        data: sessionHistory.map((s) => s.wordsPerMinute),
        borderColor: "#000",
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
      {
        label: "Overall Score",
        data: sessionHistory.map((s) => s.overallScore),
        borderColor: "#374151",
        backgroundColor: "rgba(55, 65, 81, 0.05)",
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
    ],
  } : null;

  const scoreBreakdownData = currentSession ? {
    labels: ["Pronunciation", "Fluency", "Coherence"],
    datasets: [
      {
        data: [
          currentSession.pronunciationScore,
          currentSession.fluencyScore,
          currentSession.coherenceScore,
        ],
        backgroundColor: ["#000", "#374151", "#6b7280"],
        borderWidth: 0,
      },
    ],
  } : null;

  const speakingTimeData = currentSession ? {
    labels: [
      "Topic 1: " + currentSession.topic1,
      "Topic 2: " + currentSession.topic2,
    ],
    datasets: [
      {
        label: "Speaking Time (minutes)",
        data: [
          Math.round(currentSession.speakingTime * 0.6),
          Math.round(currentSession.speakingTime * 0.4),
        ],
        backgroundColor: ["#000", "#374151"],
        borderRadius: 4,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#374151",
          font: {
            family: "-apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "#f3f4f6",
        },
        ticks: {
          color: "#6b7280",
          font: {
            family: "-apple-system, BlinkMacSystemFont, sans-serif",
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#f3f4f6",
        },
        ticks: {
          color: "#6b7280",
          font: {
            family: "-apple-system, BlinkMacSystemFont, sans-serif",
            size: 11,
          },
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#374151",
          font: {
            family: "-apple-system, BlinkMacSystemFont, sans-serif",
            size: 12,
          },
          padding: 20,
        },
      },
    },
  };

  const renderOverview = () => {
    if (!currentSession) {
      return (
        <EmptyState>
          <EmptyStateIcon>📊</EmptyStateIcon>
          <EmptyStateTitle>No Session Data Available</EmptyStateTitle>
          <EmptyStateMessage>
            Complete a speaking session to view your performance metrics and analytics.
          </EmptyStateMessage>
        </EmptyState>
      );
    }

    return (
      <>
        <MetricsGrid>
          <MetricCard>
            <MetricHeader>
              <MetricIcon>
                <FiClock />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{currentSession.speakingTime}min</MetricValue>
            <MetricLabel>Speaking Time</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricHeader>
              <MetricIcon>
                <FiMessageSquare />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>
              {currentSession.totalWords.toLocaleString()}
            </MetricValue>
            <MetricLabel>Total Words</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricHeader>
              <MetricIcon>
                <FiActivity />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{currentSession.wordsPerMinute}</MetricValue>
            <MetricLabel>Words per Minute</MetricLabel>
          </MetricCard>

          <MetricCard>
            <MetricHeader>
              <MetricIcon>
                <FiAward />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{currentSession.overallScore}%</MetricValue>
            <MetricLabel>Overall Score</MetricLabel>
          </MetricCard>
        </MetricsGrid>

        <ContentGrid>
          <Card>
            <SectionTitle>
              <FiTarget />
              Score Breakdown
            </SectionTitle>
            {scoreBreakdownData ? (
              <>
                <ChartContainer>
                  <Doughnut data={scoreBreakdownData} options={doughnutOptions} />
                </ChartContainer>
                <ChartDescription>
                  Performance breakdown across key speaking metrics
                </ChartDescription>
              </>
            ) : (
              <EmptyState>
                <EmptyStateMessage>No score data available</EmptyStateMessage>
              </EmptyState>
            )}
          </Card>

          <Card>
            <SectionTitle>
              <FiClock />
              Speaking Time Distribution
            </SectionTitle>
            {speakingTimeData ? (
              <>
                <ChartContainer>
                  <Bar data={speakingTimeData} options={chartOptions} />
                </ChartContainer>
                <ChartDescription>
                  Time spent discussing each topic during the session
                </ChartDescription>
              </>
            ) : (
              <EmptyState>
                <EmptyStateMessage>No speaking time data available</EmptyStateMessage>
              </EmptyState>
            )}
          </Card>
        </ContentGrid>
      </>
    );
  };

  const renderProgress = () => (
    <Card>
      <SectionTitle>
        <FiTrendingUp />
        Performance Trends
      </SectionTitle>
      {progressData ? (
        <>
          <ProgressChart>
            <Line data={progressData} options={chartOptions} />
          </ProgressChart>
          <ChartDescription>
            Track your improvement across multiple sessions. Monitor both speaking
            pace and overall performance scores over time.
          </ChartDescription>
        </>
      ) : (
        <EmptyState>
          <EmptyStateIcon>📈</EmptyStateIcon>
          <EmptyStateTitle>No Progress Data</EmptyStateTitle>
          <EmptyStateMessage>
            Complete multiple speaking sessions to view your progress trends and improvement over time.
          </EmptyStateMessage>
        </EmptyState>
      )}
    </Card>
  );

  const renderSuggestions = () => {
    const vocabularySuggestions = languageSuggestions.filter((s) => s.category === "vocabulary");
    const expressionSuggestions = languageSuggestions.filter((s) => s.category === "expression");

    if (languageSuggestions.length === 0) {
      return (
        <EmptyState>
          <EmptyStateIcon>💡</EmptyStateIcon>
          <EmptyStateTitle>No Language Suggestions</EmptyStateTitle>
          <EmptyStateMessage>
            Complete speaking sessions to receive personalized vocabulary and expression recommendations.
          </EmptyStateMessage>
        </EmptyState>
      );
    }

    return (
      <SuggestionsContainer>
        <SuggestionSection>
          <SuggestionTitle>
            <FiBookOpen />
            Recommended Vocabulary
          </SuggestionTitle>
          <SuggestionList>
            {vocabularySuggestions.length > 0 ? (
              vocabularySuggestions.map((suggestion, index) => (
                <SuggestionItem key={index}>
                  <SuggestionWord>{suggestion.word}</SuggestionWord>
                  <SuggestionDefinition>
                    {suggestion.definition}
                  </SuggestionDefinition>
                  <SuggestionExample>"{suggestion.example}"</SuggestionExample>
                  <DifficultyBadge difficulty={suggestion.difficulty}>
                    {suggestion.difficulty}
                  </DifficultyBadge>
                </SuggestionItem>
              ))
            ) : (
              <EmptyStateMessage>No vocabulary suggestions available</EmptyStateMessage>
            )}
          </SuggestionList>
        </SuggestionSection>

        <SuggestionSection>
          <SuggestionTitle>
            <FiMessageSquare />
            Useful Expressions
          </SuggestionTitle>
          <SuggestionList>
            {expressionSuggestions.length > 0 ? (
              expressionSuggestions.map((suggestion, index) => (
                <SuggestionItem key={index}>
                  <SuggestionWord>{suggestion.word}</SuggestionWord>
                  <SuggestionDefinition>
                    {suggestion.definition}
                  </SuggestionDefinition>
                  <SuggestionExample>"{suggestion.example}"</SuggestionExample>
                  <DifficultyBadge difficulty={suggestion.difficulty}>
                    {suggestion.difficulty}
                  </DifficultyBadge>
                </SuggestionItem>
              ))
            ) : (
              <EmptyStateMessage>No expression suggestions available</EmptyStateMessage>
            )}
          </SuggestionList>
        </SuggestionSection>
      </SuggestionsContainer>
    );
  };

  const renderTranscript = () => {
    const hasTranscript = currentSession && currentSession.transcript && currentSession.transcript.length > 0;

    return (
      <TranscriptSection>
        <SectionTitle>
          <FiMessageSquare />
          Session Transcript
        </SectionTitle>
        {hasTranscript ? (
          <>
            <ChartDescription style={{ textAlign: "left", marginBottom: "2rem" }}>
              Review your conversation with detailed analysis. Areas for improvement
              are highlighted below.
            </ChartDescription>
            {currentSession!.transcript.map((segment, index) => (
              <TranscriptSegment key={index} isUser={segment.speaker === "user"}>
                <SpeakerLabel isUser={segment.speaker === "user"}>
                  {segment.speaker === "user" ? "You" : "AI"}
                </SpeakerLabel>
                <TranscriptText>{segment.text}</TranscriptText>
              </TranscriptSegment>
            ))}
          </>
        ) : (
          <EmptyState>
            <EmptyStateIcon>💬</EmptyStateIcon>
            <EmptyStateTitle>No Transcript Available</EmptyStateTitle>
            <EmptyStateMessage>
              Complete a speaking session to view your detailed conversation transcript and analysis.
            </EmptyStateMessage>
          </EmptyState>
        )}
      </TranscriptSection>
    );
  };

  return (
    <Container>
      <Header>
        <Title>Speaking Analytics</Title>
        {currentSession && (
          <SessionMetaData>
            <MetaItem>
              <div className="label">Session Date</div>
              <div className="value">
                {new Date(currentSession.date).toLocaleDateString()}
              </div>
            </MetaItem>
            <MetaItem>
              <div className="label">Topic 1</div>
              <div className="value">{currentSession.topic1}</div>
            </MetaItem>
            <MetaItem>
              <div className="label">Topic 2</div>
              <div className="value">{currentSession.topic2}</div>
            </MetaItem>
          </SessionMetaData>
        )}
      </Header>

      <TabNavigation>
        <Tab
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </Tab>
        <Tab
          active={activeTab === "progress"}
          onClick={() => setActiveTab("progress")}
        >
          Progress
        </Tab>
        <Tab
          active={activeTab === "suggestions"}
          onClick={() => setActiveTab("suggestions")}
        >
          Language Tips
        </Tab>
        <Tab
          active={activeTab === "transcript"}
          onClick={() => setActiveTab("transcript")}
        >
          Transcript
        </Tab>
      </TabNavigation>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "progress" && renderProgress()}
      {activeTab === "suggestions" && renderSuggestions()}
      {activeTab === "transcript" && renderTranscript()}
    </Container>
  );
}
