"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { useRouter } from "next/navigation";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { HomeTopicArticle, fetchHomeTopicsClient } from "../services/topics_service_client";
import { useI18n } from "../../../i18n/I18nProvider";

interface TopicsShowcaseProps {
  topics: HomeTopicArticle[];
}

const Section = styled.section`
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  padding: clamp(3.5rem, 7vw, 5rem) 0 clamp(4rem, 8vw, 6rem);
  background: rgb(128, 00, 33);
  color: #e5e7ff;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  max-width: 960px;
  margin: 0 auto clamp(2rem, 4vw, 3rem);
  padding: 0 clamp(1.25rem, 4vw, 1.5rem);
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-size: clamp(1.9rem, 3.6vw, 2.7rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #ffffff;
  margin: 0;
  font-family: "Noto Sans KR", sans-serif;
`;

const SectionSubtitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.15rem);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.5;
  color: #ffffff;
  margin: 0.65rem 0 0 0;
  font-family: "Noto Sans KR", sans-serif;
`;

const CarouselShell = styled.div`
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  padding: 0 clamp(1rem, 4vw, 3rem) 2rem;
`;

const CarouselViewport = styled.div`
  width: 100%;
  overflow: visible;
`;

const autoScroll = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
`;

const ManualViewport = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  padding-bottom: 1rem;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const CarouselTrack = styled.div`
  display: flex;
  gap: clamp(0.85rem, 3vw, 1.5rem);
`;

const AutoScrollWrapper = styled.div`
  width: 100%;
  overflow: visible;
  position: relative;
`;

const AutoScrollStrip = styled.div<{ $duration: number; $isPaused: boolean }>`
  display: flex;
  gap: clamp(0.85rem, 3vw, 1.5rem);
  animation: ${autoScroll} ${({ $duration }) => $duration}s linear infinite;
  animation-play-state: ${({ $isPaused }) => ($isPaused ? "paused" : "running")};
  min-width: max-content;

  @media (pointer: coarse) {
    animation: none;
  }
`;

const TopicCard = styled.div<{ $hovered: boolean }>`
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  cursor: pointer;
  scroll-snap-align: start;
  transition: transform 220ms ease;
  flex: 0 0 clamp(240px, 26vw, 320px);
  aspect-ratio: 1 / 1;
  isolation: isolate;

  &:hover {
    transform: perspective(900px) rotateY(-6deg) translateY(-3px);
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.18), rgba(59, 130, 246, 0.35));
    opacity: ${({ $hovered }) => ($hovered ? 1 : 0)};
    transition: opacity 200ms ease;
    pointer-events: none;
    z-index: 3;
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
  z-index: 4;
  padding: clamp(1rem, 2.5vw, 1.3rem);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0) 25%, rgba(2, 6, 23, 0.8) 100%);
`;

const TopicTitle = styled.h3`
  margin: 0;
  font-size: clamp(1rem, 2.2vw, 1.15rem);
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

const NavButton = styled.button<{ $align: "left" | "right" }>`
  position: absolute;
  top: 50%;
  ${({ $align }) => ($align === "left" ? "left: clamp(1rem, 4vw, 2.5rem);" : "right: clamp(1rem, 4vw, 2.5rem);")}
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.92);
  border: none;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.25);
  color: #0f172a;
  font-size: 1.5rem;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-50%) scale(1.05);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.3);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  @media (min-width: 768px) {
    display: inline-flex;
  }
`;

const ClickHint = styled.span<{ $visible: boolean }>`
  margin-top: 0.6rem;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateY(${({ $visible }) => ($visible ? "0" : "6px")});
  transition: opacity 200ms ease, transform 200ms ease;

  svg {
    width: 0.95rem;
    height: 0.95rem;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
  font-size: 1rem;
`;

export default function TopicsShowcase({ topics: initialTopics }: TopicsShowcaseProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [topics, setTopics] = useState<HomeTopicArticle[]>(initialTopics || []);
  const [loading, setLoading] = useState(!initialTopics || initialTopics.length === 0);

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [enableAutoScroll, setEnableAutoScroll] = useState(false);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const displayTopics = useMemo(
    () => (topics.length > 0 ? [...topics, ...topics] : []),
    [topics]
  );

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(hover: hover)");
    const update = () => setEnableAutoScroll(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollPrev(scrollLeft > 16);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 16);
  }, []);

  useEffect(() => {
    if (enableAutoScroll) return;
    const track = trackRef.current;
    if (!track) return;
    updateScrollState();
    track.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      track.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [enableAutoScroll, updateScrollState, topics.length]);

  const scrollByCards = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth =
      (track.firstElementChild as HTMLElement | null)?.clientWidth ?? 300;
    track.scrollBy({
      left: direction * (cardWidth + 20),
      behavior: "smooth",
    });
  };

  const handleAutoHover = () => {
    setIsCarouselHovered(true);
  };

  const handleAutoLeave = () => {
    setIsCarouselHovered(false);
  };

  const handleCardMouseEnter = (id: string) => {
    setHoveredCardId(id);
  };

  const handleCardMouseLeave = () => {
    setHoveredCardId(null);
  };

  const isAutoScrollEnabled = enableAutoScroll && displayTopics.length > 0;
  const autoDuration = Math.max(displayTopics.length * 3, 18);

  // Always render the section
  return (
    <Section>
      <SectionHeader>
        <SectionTitle>{t.home.topicsShowcase.title}</SectionTitle>
        <SectionSubtitle>{t.home.topicsShowcase.subtitle}</SectionSubtitle>
      </SectionHeader>

      {loading ? (
        <LoadingState>{t.common.loading}</LoadingState>
      ) : topics.length > 0 ? (
        <CarouselShell>
          {!isAutoScrollEnabled && (
            <>
              <NavButton
                type="button"
                $align="left"
                onClick={() => scrollByCards(-1)}
                disabled={!canScrollPrev}
              >
                ‹
              </NavButton>
              <NavButton
                type="button"
                $align="right"
                onClick={() => scrollByCards(1)}
                disabled={!canScrollNext}
              >
                ›
              </NavButton>
            </>
          )}
          <CarouselViewport>
            {isAutoScrollEnabled ? (
              <AutoScrollWrapper
                onMouseEnter={handleAutoHover}
                onMouseLeave={handleAutoLeave}
              >
                <AutoScrollStrip
                  $duration={autoDuration}
                  $isPaused={isCarouselHovered}
                >
                  {displayTopics.map((topic, idx) => (
                    <TopicCard
                      key={`${topic.id}-${idx}`}
                      onClick={() => router.push(`/article/${topic.id}`)}
                      onMouseEnter={() => handleCardMouseEnter(topic.id)}
                      onMouseLeave={handleCardMouseLeave}
                      $hovered={hoveredCardId === topic.id}
                    >
                      {topic.imageUrl ? (
                        <TopicImage
                          src={topic.imageUrl}
                          alt={topic.titleEnglish || topic.titleKorean}
                        />
                      ) : (
                        <TopicImagePlaceholder>📰</TopicImagePlaceholder>
                      )}
                      <TopicContent>
                        <TopicTitle>
                          {locale === "ko"
                            ? topic.titleKorean || topic.titleEnglish
                            : topic.titleEnglish || topic.titleKorean}
                        </TopicTitle>
                        <ClickHint $visible={hoveredCardId === topic.id}>
                          {t.home.topicsShowcase.hoverPrompt}
                          <ArrowUpRightIcon />
                        </ClickHint>
                      </TopicContent>
                    </TopicCard>
                  ))}
                </AutoScrollStrip>
              </AutoScrollWrapper>
            ) : (
              <ManualViewport ref={trackRef}>
                <CarouselTrack>
                  {topics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      onClick={() => router.push(`/article/${topic.id}`)}
                      onMouseEnter={() => handleCardMouseEnter(topic.id)}
                      onMouseLeave={handleCardMouseLeave}
                      $hovered={hoveredCardId === topic.id}
                    >
                      {topic.imageUrl ? (
                        <TopicImage
                          src={topic.imageUrl}
                          alt={topic.titleEnglish || topic.titleKorean}
                        />
                      ) : (
                        <TopicImagePlaceholder>📰</TopicImagePlaceholder>
                      )}
                      <TopicContent>
                        <TopicTitle>
                          {locale === "ko"
                            ? topic.titleKorean || topic.titleEnglish
                            : topic.titleEnglish || topic.titleKorean}
                        </TopicTitle>
                        <ClickHint $visible={hoveredCardId === topic.id}>
                          {t.home.topicsShowcase.hoverPrompt}
                          <ArrowUpRightIcon />
                        </ClickHint>
                      </TopicContent>
                    </TopicCard>
                  ))}
                </CarouselTrack>
              </ManualViewport>
            )}
          </CarouselViewport>
        </CarouselShell>
      ) : null}
    </Section>
  );
}
