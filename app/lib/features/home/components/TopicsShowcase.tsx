"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { useRouter } from "next/navigation";
import { HomeTopicArticle, fetchHomeTopicsClient } from "../services/topics_service_client";

interface TopicsShowcaseProps {
  topics: HomeTopicArticle[];
}

const Section = styled.section`
  position: relative;
  padding: clamp(3rem, 6vw, 4.5rem) 0;
  background: transparent;
`;

const SectionContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(2rem, 4vw, 3rem);
  padding: 0 1.5rem;

  @media (max-width: 768px) {
    padding: 0 1.25rem;
  }
`;

const SectionTitle = styled.h2`
  font-size: clamp(1.8rem, 3.5vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #1f2937;
  margin: 0;
  text-align: center;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

const SectionSubtitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.1rem);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.5;
  color: #6b7280;
  margin: 0.5rem 0 0 0;
  text-align: center;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const TopicsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const TopicCard = styled.div`
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 180ms ease, box-shadow 180ms ease;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
  aspect-ratio: 4 / 3;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.3);
  }
`;

const TopicImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
`;

const TopicImagePlaceholder = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(100, 100, 100, 0.3), rgba(50, 50, 50, 0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  z-index: 0;
`;

const TopicContent = styled.div`
  position: relative;
  z-index: 5;
  padding: clamp(1rem, 2.5vw, 1.3rem);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
`;

const TopicTitle = styled.h3`
  margin: 0;
  font-size: clamp(0.9rem, 2vw, 1.05rem);
  font-weight: 700;
  letter-spacing: -0.015em;
  color: #ffffff;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
`;

export default function TopicsShowcase({ topics: initialTopics }: TopicsShowcaseProps) {
  const router = useRouter();
  const [topics, setTopics] = useState<HomeTopicArticle[]>(initialTopics || []);
  const [loading, setLoading] = useState(!initialTopics || initialTopics.length === 0);

  useEffect(() => {
    // Always fetch from client-side Firebase if no initial topics
    if (!initialTopics || initialTopics.length === 0) {
      console.log('Fetching topics from client-side Firebase...');
      fetchHomeTopicsClient()
        .then(data => {
          console.log('Topics fetched:', data);
          if (data && Array.isArray(data)) {
            setTopics(data);
          }
        })
        .catch(error => {
          console.error('Error fetching topics:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [initialTopics]);

  // Always render the section
  return (
    <Section>
      <SectionContent>
        <div>
          <SectionTitle>모임에서 어떤 토픽을 다루나요?</SectionTitle>
          <SectionSubtitle>월스트리트저널, 파이낸셜타임즈, 뉴욕타임즈 등에서 최신 토픽을 엄선합니다</SectionSubtitle>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Loading topics...
          </div>
        ) : topics.length > 0 ? (
          <TopicsGrid>
            {topics.map((topic) => (
              <TopicCard
                key={topic.id}
                onClick={() => router.push(`/article/${topic.id}`)}
              >
                {topic.imageUrl ? (
                  <TopicImage src={topic.imageUrl} alt={topic.titleEnglish || topic.titleKorean} />
                ) : (
                  <TopicImagePlaceholder>📰</TopicImagePlaceholder>
                )}
                <TopicContent>
                  <TopicTitle>{topic.titleEnglish || topic.titleKorean}</TopicTitle>
                </TopicContent>
              </TopicCard>
            ))}
          </TopicsGrid>
        ) : null}
      </SectionContent>
    </Section>
  );
}
