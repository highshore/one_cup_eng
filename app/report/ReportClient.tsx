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

// Styled Components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 100vh;
  font-family: "Avenir", -apple-system, BlinkMacSystemFont, sans-serif;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  color: white;
  box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  opacity: 0.9;
  margin-bottom: 1rem;
`;

const SessionInfo = styled.div`
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

const SessionDetail = styled.div`
  text-align: center;

  .label {
    font-size: 0.9rem;
    opacity: 0.8;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .value {
    font-size: 1.1rem;
    font-weight: 600;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const MetricCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
`;

const MetricIcon = styled.div<{ color: string }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    ${(props) => props.color}20,
    ${(props) => props.color}40
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: ${(props) => props.color};
`;

const MetricContent = styled.div`
  flex: 1;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.25rem;
`;

const MetricLabel = styled.div`
  font-size: 0.9rem;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ChartContainer = styled.div`
  position: relative;
  height: 300px;
  margin-bottom: 2rem;
`;

const ProgressChart = styled.div`
  height: 400px;
  margin-bottom: 2rem;
`;

const LanguageSuggestionsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
`;

const SuggestionCategory = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid #667eea;
`;

const CategoryTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1rem;
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
  background: white;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;

  &:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  }
`;

const SuggestionWord = styled.div`
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
`;

const SuggestionDefinition = styled.div`
  color: #4a5568;
  margin-bottom: 0.5rem;
  line-height: 1.5;
`;

const SuggestionExample = styled.div`
  color: #718096;
  font-style: italic;
  padding: 0.5rem;
  background: #f7fafc;
  border-radius: 6px;
  border-left: 3px solid #667eea;
`;

const DifficultyBadge = styled.span<{ difficulty: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${(props) =>
    props.difficulty === "beginner"
      ? "#48bb78"
      : props.difficulty === "intermediate"
      ? "#ed8936"
      : "#9f7aea"};
  color: white;
  margin-top: 0.5rem;
`;

const TranscriptSection = styled.div`
  background: white;
  border-radius: 16px;
  padding: 2rem;
  margin-top: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
`;

const TranscriptSegment = styled.div<{ isUser: boolean }>`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  background: ${(props) => (props.isUser ? "#e6f7ff" : "#f0f8e6")};
  border-left: 4px solid ${(props) => (props.isUser ? "#1890ff" : "#52c41a")};
`;

const SpeakerLabel = styled.div<{ isUser: boolean }>`
  font-weight: 600;
  color: ${(props) => (props.isUser ? "#1890ff" : "#52c41a")};
  min-width: 80px;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TranscriptText = styled.div`
  flex: 1;
  line-height: 1.6;
  color: #2d3748;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e2e8f0;
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 1rem 2rem;
  border: none;
  background: ${(props) => (props.active ? "#667eea" : "transparent")};
  color: ${(props) => (props.active ? "white" : "#718096")};
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.active ? "#667eea" : "#f7fafc")};
  }
`;

// Sample data for demonstration
const SAMPLE_SESSIONS: SessionData[] = [
  {
    id: "1",
    date: "2024-01-15",
    topic1: "Career Development",
    topic2: "International Business",
    speakingTime: 45,
    totalWords: 850,
    wordsPerMinute: 120,
    pronunciationScore: 85,
    fluencyScore: 78,
    coherenceScore: 82,
    overallScore: 82,
    suggestedWords: ["articulate", "leverage", "synergize"],
    suggestedExpressions: [
      "on the other hand",
      "needless to say",
      "by and large",
    ],
    transcript: [],
  },
  {
    id: "2",
    date: "2024-01-08",
    topic1: "Technology Trends",
    topic2: "Remote Work",
    speakingTime: 42,
    totalWords: 780,
    wordsPerMinute: 115,
    pronunciationScore: 80,
    fluencyScore: 75,
    coherenceScore: 78,
    overallScore: 78,
    suggestedWords: ["innovative", "facilitate", "optimize"],
    suggestedExpressions: [
      "in my opinion",
      "as a matter of fact",
      "to put it simply",
    ],
    transcript: [],
  },
  {
    id: "3",
    date: "2024-01-01",
    topic1: "Leadership Skills",
    topic2: "Team Management",
    speakingTime: 38,
    totalWords: 720,
    wordsPerMinute: 110,
    pronunciationScore: 82,
    fluencyScore: 72,
    coherenceScore: 75,
    overallScore: 76,
    suggestedWords: ["delegate", "collaborate", "motivate"],
    suggestedExpressions: [
      "in terms of",
      "with regard to",
      "speaking of which",
    ],
    transcript: [],
  },
];

const LANGUAGE_SUGGESTIONS: LanguageSuggestion[] = [
  {
    word: "articulate",
    definition: "To express thoughts and ideas clearly and effectively",
    example:
      "She was able to articulate her vision for the company during the presentation.",
    category: "vocabulary",
    difficulty: "intermediate",
  },
  {
    word: "on the other hand",
    definition:
      "Used to present a contrasting point or alternative perspective",
    example:
      "The project was expensive. On the other hand, it delivered excellent results.",
    category: "expression",
    difficulty: "intermediate",
  },
  {
    word: "synergize",
    definition:
      "To combine efforts or resources to achieve greater effectiveness",
    example:
      "The two departments need to synergize their efforts for this project.",
    category: "vocabulary",
    difficulty: "advanced",
  },
  {
    word: "facilitate",
    definition: "To make an action or process easier or help bring about",
    example:
      "The new software will facilitate communication between remote teams.",
    category: "vocabulary",
    difficulty: "intermediate",
  },
  {
    word: "needless to say",
    definition:
      "Used to indicate that something is obvious and doesn't need explanation",
    example: "Needless to say, punctuality is important in business meetings.",
    category: "expression",
    difficulty: "beginner",
  },
  {
    word: "leverage",
    definition: "To use something to maximum advantage",
    example: "We can leverage our existing network to expand into new markets.",
    category: "vocabulary",
    difficulty: "advanced",
  },
];

export default function ReportClient() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "progress" | "suggestions" | "transcript"
  >("overview");
  const [currentSession] = useState<SessionData>(SAMPLE_SESSIONS[0]);
  const [sessionHistory] = useState<SessionData[]>(SAMPLE_SESSIONS);

  // Chart data for progress tracking
  const progressData = {
    labels: sessionHistory.map((s) => new Date(s.date).toLocaleDateString()),
    datasets: [
      {
        label: "Words per Minute",
        data: sessionHistory.map((s) => s.wordsPerMinute),
        borderColor: "#667eea",
        backgroundColor: "rgba(102, 126, 234, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Overall Score",
        data: sessionHistory.map((s) => s.overallScore),
        borderColor: "#48bb78",
        backgroundColor: "rgba(72, 187, 120, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const scoreBreakdownData = {
    labels: ["Pronunciation", "Fluency", "Coherence"],
    datasets: [
      {
        data: [
          currentSession.pronunciationScore,
          currentSession.fluencyScore,
          currentSession.coherenceScore,
        ],
        backgroundColor: ["#667eea", "#48bb78", "#ed8936"],
        borderWidth: 0,
      },
    ],
  };

  const speakingTimeData = {
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
        backgroundColor: ["#667eea", "#9f7aea"],
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
    },
  };

  const renderOverview = () => (
    <>
      <MetricsGrid>
        <MetricCard>
          <MetricIcon color="#667eea">
            <FiClock />
          </MetricIcon>
          <MetricContent>
            <MetricValue>{currentSession.speakingTime}min</MetricValue>
            <MetricLabel>Speaking Time</MetricLabel>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <MetricIcon color="#48bb78">
            <FiMessageSquare />
          </MetricIcon>
          <MetricContent>
            <MetricValue>{currentSession.totalWords}</MetricValue>
            <MetricLabel>Total Words</MetricLabel>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <MetricIcon color="#ed8936">
            <FiTrendingUp />
          </MetricIcon>
          <MetricContent>
            <MetricValue>{currentSession.wordsPerMinute}</MetricValue>
            <MetricLabel>Words per Minute</MetricLabel>
          </MetricContent>
        </MetricCard>

        <MetricCard>
          <MetricIcon color="#9f7aea">
            <FiAward />
          </MetricIcon>
          <MetricContent>
            <MetricValue>{currentSession.overallScore}%</MetricValue>
            <MetricLabel>Overall Score</MetricLabel>
          </MetricContent>
        </MetricCard>
      </MetricsGrid>

      <Grid>
        <Card>
          <SectionTitle>
            <FiTarget />
            Score Breakdown
          </SectionTitle>
          <ChartContainer>
            <Doughnut data={scoreBreakdownData} options={doughnutOptions} />
          </ChartContainer>
        </Card>

        <Card>
          <SectionTitle>
            <FiClock />
            Speaking Time by Topic
          </SectionTitle>
          <ChartContainer>
            <Bar data={speakingTimeData} options={chartOptions} />
          </ChartContainer>
        </Card>
      </Grid>
    </>
  );

  const renderProgress = () => (
    <Card>
      <SectionTitle>
        <FiTrendingUp />
        Progress Over Time
      </SectionTitle>
      <ProgressChart>
        <Line data={progressData} options={chartOptions} />
      </ProgressChart>
      <p style={{ color: "#718096", textAlign: "center", marginTop: "1rem" }}>
        Track your improvement across multiple sessions. The blue line shows
        your speaking pace, while the green line represents your overall
        performance score.
      </p>
    </Card>
  );

  const renderSuggestions = () => (
    <LanguageSuggestionsContainer>
      <SuggestionCategory>
        <CategoryTitle>
          <FiBookOpen />
          Recommended Vocabulary
        </CategoryTitle>
        <SuggestionList>
          {LANGUAGE_SUGGESTIONS.filter((s) => s.category === "vocabulary").map(
            (suggestion, index) => (
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
            )
          )}
        </SuggestionList>
      </SuggestionCategory>

      <SuggestionCategory>
        <CategoryTitle>
          <FiMessageSquare />
          Useful Expressions
        </CategoryTitle>
        <SuggestionList>
          {LANGUAGE_SUGGESTIONS.filter((s) => s.category === "expression").map(
            (suggestion, index) => (
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
            )
          )}
        </SuggestionList>
      </SuggestionCategory>
    </LanguageSuggestionsContainer>
  );

  const renderTranscript = () => (
    <TranscriptSection>
      <SectionTitle>
        <FiMessageSquare />
        Session Transcript
      </SectionTitle>
      <p style={{ color: "#718096", marginBottom: "2rem" }}>
        Review your conversation with AI-powered analysis. Areas for improvement
        are highlighted.
      </p>

      {/* Sample transcript segments */}
      <TranscriptSegment isUser={true}>
        <SpeakerLabel isUser={true}>You</SpeakerLabel>
        <TranscriptText>
          I think career development is really important for professionals who
          want to advance in their field. It requires continuous learning and
          adapting to new challenges in the workplace.
        </TranscriptText>
      </TranscriptSegment>

      <TranscriptSegment isUser={false}>
        <SpeakerLabel isUser={false}>Partner</SpeakerLabel>
        <TranscriptText>
          I completely agree. What specific strategies do you think are most
          effective for career growth?
        </TranscriptText>
      </TranscriptSegment>

      <TranscriptSegment isUser={true}>
        <SpeakerLabel isUser={true}>You</SpeakerLabel>
        <TranscriptText>
          Well, I believe networking is crucial. Building relationships with
          colleagues and industry professionals can open up new opportunities.
          Also, seeking feedback and being open to constructive criticism helps
          us grow.
        </TranscriptText>
      </TranscriptSegment>

      <TranscriptSegment isUser={false}>
        <SpeakerLabel isUser={false}>Partner</SpeakerLabel>
        <TranscriptText>
          That's a great point about feedback. How do you handle situations
          where the feedback is difficult to hear?
        </TranscriptText>
      </TranscriptSegment>

      <TranscriptSegment isUser={true}>
        <SpeakerLabel isUser={true}>You</SpeakerLabel>
        <TranscriptText>
          It's challenging, but I try to approach it with an open mind. I remind
          myself that the goal is improvement, not personal criticism. Taking
          time to reflect on the feedback before responding emotionally is
          important.
        </TranscriptText>
      </TranscriptSegment>
    </TranscriptSection>
  );

  return (
    <Container>
      <Header>
        <Title>English Speaking Report</Title>
        <Subtitle>Comprehensive analysis of your speaking session</Subtitle>
        <SessionInfo>
          <SessionDetail>
            <div className="label">Session Date</div>
            <div className="value">
              {new Date(currentSession.date).toLocaleDateString()}
            </div>
          </SessionDetail>
          <SessionDetail>
            <div className="label">Topic 1</div>
            <div className="value">{currentSession.topic1}</div>
          </SessionDetail>
          <SessionDetail>
            <div className="label">Topic 2</div>
            <div className="value">{currentSession.topic2}</div>
          </SessionDetail>
        </SessionInfo>
      </Header>

      <TabContainer>
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
      </TabContainer>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "progress" && renderProgress()}
      {activeTab === "suggestions" && renderSuggestions()}
      {activeTab === "transcript" && renderTranscript()}
    </Container>
  );
}
