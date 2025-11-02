"use client";

import { useState, useEffect, useRef } from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";
import { colors } from "../../../constants/colors";
import React from "react";
// GNB and Footer are now handled by the layout
import { useGnb } from "../../../contexts/gnb_context";

// Imports for Meetup Event Display
import { useRouter } from "next/navigation";
import { MeetupEvent } from "../../meetup/types/meetup_types";
import { fetchUpcomingMeetupEvents } from "../../meetup/services/meetup_service";
import {
  formatEventDateTime,
  formatEventTitleWithCountdown,
  isEventLocked,
} from "../../meetup/utils/meetup_helpers";
import { PinIcon, CalendarIcon } from "../../meetup/components/meetup_icons";
import { UserAvatarStack } from "../../meetup/components/user_avatar";
import StatsSection from "./StatsSection";
import { HomeStats } from "../services/stats_service";
import TopicsShowcase from "./TopicsShowcase";
import { HomeTopicArticle } from "../services/topics_service";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db as clientDb } from "../../../firebase/firebase";

// Bubble type definition
// interface Bubble {
//   x: number;
//   y: number;
//   radius: number;
//   dx: number;
//   dy: number;
//   color: string;
//   opacity: number;
//   pulseSpeed: number;
//   pulseAmount: number;
//   pulseOffset: number;
// }

// Local global style removed; fonts are injected via <head>
const GlobalStyle = createGlobalStyle``;

// Use shared colors

// Common section styles
const SectionBase = css`
  min-height: 450px;
  padding: 5rem 2rem;
  position: relative;
  overflow: hidden;
  margin-bottom: 0;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

// Hero Section
const HeroSection = styled.section`
  color: white;
  padding: clamp(6rem, 10vw, 7.5rem) clamp(1.5rem, 8vw, 10rem) clamp(4.5rem, 10vw, 6.5rem);
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;

  video {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: translate(-50%, -50%);
    z-index: 0;
  }

  @media (max-width: 768px) {
    min-height: 100vh;
    padding: clamp(4rem, 14vw, 5.5rem) 1.25rem clamp(6rem, 30vw, 9rem);
  }
`;

const MainContent = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  background: #ffffff;
  isolation: isolate;
`;

// Gallery Section Styles
const GallerySection = styled.section`
  padding: clamp(3rem, 6vw, 4.5rem) 1.5rem clamp(1.5rem, 3vw, 2rem);
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  overflow: visible; /* Allow shadows to show */
`;

const GalleryTitle = styled.h2`
  font-size: clamp(1.8rem, 3.5vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #1f2937;
  margin-bottom: clamp(2rem, 4vw, 3rem);
  text-align: center;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.6rem;
    margin-bottom: 1.5rem;
  }
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 0.8fr;
  gap: 1rem;
  width: 100%;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const GalleryImageBase = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  }
`;

const GalleryImageLarge = styled(GalleryImageBase)`
  grid-row: span 2;
  aspect-ratio: 1 / 1;

  @media (max-width: 768px) {
    grid-row: span 1;
    aspect-ratio: 1 / 1;
  }
`;

const GalleryImageSmall = styled(GalleryImageBase)`
  aspect-ratio: 16 / 9;

  @media (max-width: 768px) {
    aspect-ratio: 16 / 9;
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  max-width: 960px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(2.4rem, 6vw, 3.4rem);
  padding: 0 clamp(0.75rem, 3vw, 2rem);

  > div {
    max-width: 640px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    padding: 0 0.75rem;
  }
`;

// New styled component for the video overlay
const VideoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(4, 4, 20, 0.5);
  backdrop-filter: blur(2px);
  z-index: 1;
`;

// Common style utilities
const breakpoints = {
  mobile: "768px",
};
// Media query mixin
const media = {
  mobile: (strings: TemplateStringsArray, ...interpolations: any[]) => css`
    @media (max-width: ${breakpoints.mobile}) {
      ${css(strings, ...interpolations)}
    }
  `,
};
// Flex center mixin
const flexCenter = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MobileBreak = styled.br`
  display: none;
  @media (max-width: ${breakpoints.mobile}) {
    display: block;
  }
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #1f2937;
  margin-bottom: 3rem;
  font-weight: 800;
  font-family: "Noto Sans KR", sans-serif;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.8rem;
    padding: 0 10px;
    margin-bottom: 2rem;
  }
`;

// Features Section
const FeaturesSection = styled.section`
  ${SectionBase}
  background: transparent;
  text-align: center;
  
  & > * {
    max-width: 960px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
`;

// Feature slider layout with common utilities
const FeatureSlider = styled.div`
  ${flexCenter}
  gap: 3rem;
  margin: 0 auto;
  max-width: 960px;
  overflow: visible;
  will-change: contents;
  height: 400px; /* Add fixed height */

  ${media.mobile`
    flex-direction: column;
    gap: 1.5rem;
    height: auto; /* Allow height to adjust on mobile */
    padding: 1rem 0;
  `}
`;

// Styled image that will act as a feature card
const FeatureCard = styled.img.withConfig({
  shouldForwardProp: (prop) => prop !== "isActive",
})<{ isActive?: boolean }>`
  width: ${(props) => (props.isActive ? "280px" : "240px")};
  height: auto;
  cursor: pointer;
  transition: all 0.3s ease-out;
  filter: drop-shadow(0 10px 5px rgba(0, 0, 0, 0.15));
  opacity: ${(props) => (props.isActive ? 1 : 0.85)};
  transform: ${(props) => (props.isActive ? "scale(1.05)" : "scale(1)")};
  will-change: transform, opacity, filter;

  &:hover {
    transform: ${(props) => (props.isActive ? "scale(1.05)" : "scale(1.02)")};
    filter: drop-shadow(0 15px 20px rgba(0, 0, 0, 0.2));
  }

  @media (max-width: 768px) {
    width: ${(props) => (props.isActive ? "280px" : "250px")};
    margin-bottom: 0.5rem;
    transform: ${(props) => (props.isActive ? "scale(1.02)" : "scale(1)")};
  }
`;

// FAQ Section
const FAQSection = styled.section`
  ${SectionBase}
  background: transparent;
  padding-bottom: 0;
  margin-bottom: 0;
  
  & > * {
    max-width: 960px;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
`;

// Gradient shining sweep animation for CTA button
const gradientShine = keyframes`
  0% {
    background-position: -100% center;
  }
  100% {
    background-position: 100% center;
  }
`;

const CTASection = styled.div`
  position: relative;
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  margin: 3rem auto;
  width: 100%;
  max-width: 960px;
  overflow: hidden;

  @media (min-width: 1024px) {
    width: 960px;
  }

  @media (max-width: 1023px) {
    margin-left: 1.5rem;
    margin-right: 1.5rem;
    width: calc(100% - 3rem);
  }

  @media (max-width: 768px) {
    padding: 2rem;
    margin: 2rem 1.5rem;
  }
`;

const CTAVideoBackground = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
`;

const CTAOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1;
`;

const CTAContent = styled.div`
  position: relative;
  z-index: 2;
`;

const CTATitle = styled.h3`
  font-size: 1.75rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1rem;
  font-family: inherit;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const CTADescription = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 1.5rem;
  line-height: 1.5;
  font-family: inherit;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const CTAButton = styled.button`
  padding: 0.85rem 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  overflow: hidden;
  color: white;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0) 15%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0) 85%
    );
    background-size: 200% 100%;
    animation: ${gradientShine} 2.5s linear infinite;
    pointer-events: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 0.9rem;
    gap: 0.375rem;
  }
`;

const FAQContainer = styled.div`
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 0 1.5rem;

  @media (min-width: 1024px) {
    padding: 0;
    width: 960px;
  }
`;

const FAQItem = styled.div`
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
`;

interface FAQQuestionProps {
  $isOpen: boolean;
}

const FAQQuestion = styled.button<FAQQuestionProps>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1.5rem;
  background: transparent;
  border: none;
  font-size: 1.05rem;
  font-weight: 600;
  color: #1f2937;
  cursor: pointer;
  font-family: "Noto Sans KR", sans-serif;
  text-align: left;
  transition: color 0.2s ease;

  &:hover {
    color: ${colors.primary};
  }

  span {
    font-size: 1.4rem;
    font-weight: 400;
    color: ${colors.primary};
    transition: transform 0.25s ease;
    transform: ${(props) => (props.$isOpen ? "rotate(180deg)" : "none")};
    flex-shrink: 0;
    margin-left: 1rem;
  }

  @media (max-width: 768px) {
    padding: 1.2rem;
    font-size: 0.95rem;
  }
`;

const FAQAnswer = styled.div<{ $isOpen: boolean }>`
  max-height: ${(props) => (props.$isOpen ? "500px" : "0")};
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding: ${(props) => (props.$isOpen ? "0 1.5rem 1.5rem" : "0 1.5rem")};
  font-size: 0.95rem;
  color: #6b7280;
  line-height: 1.7;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: ${(props) => (props.$isOpen ? "0 1.2rem 1.2rem" : "0 1.2rem")};
  }
`;

// Define styled component for page wrapper
const PageWrapper = styled.div`
  padding-top: 0; /* Always 0 for homepage */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

// New styled components for marketing text
const MarketingText = styled.h2`
  font-size: 2.8rem;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  margin-bottom: 1rem;
  line-height: 1.3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  font-family: "Noto Sans KR", sans-serif;
  z-index: 2; /* Ensure it's above canvas */
  position: relative; /* For z-index to take effect */

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const MarketingSubText = styled.p`
  font-size: 1.3rem;
  font-weight: 500;
  color: #e0e0e0; /* Lighter than pure white for subtlety */
  text-align: center;
  margin-bottom: 2.5rem; /* Space before Kakao elements */
  line-height: 1.6;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  font-family: "Noto Sans KR", sans-serif;
  z-index: 2; /* Ensure it's above canvas */
  position: relative; /* For z-index to take effect */

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

// --- START: Copied/Adapted Meetup Card Styles from meetup.tsx ---
const subtleGlow = keyframes`
  0% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow: 0 4px 20px rgba(76, 175, 80, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const CopiedEventCard = styled.div<{ $isPast?: boolean; $isClosest?: boolean }>`
  position: relative;
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 14px 36px rgba(84, 103, 168, 0.22);
  width: 100%;
  opacity: ${(props) => (props.$isPast ? 0.6 : 1)};
  overflow: hidden;
  background: #ffffff; /* Solid white background */
  border: 1px solid rgba(220, 220, 220, 0.5); /* Subtle border */

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 18px 42px rgba(70, 92, 170, 0.28);
  }

  & > * {
    position: relative;
    z-index: 2;
  };
  text-align: left; // Ensure text is left-aligned

  ${(props) =>
    props.$isClosest
      ? css`
          animation: ${subtleGlow} 3s ease-in-out infinite;
          border: 1px solid rgba(76, 175, 80, 0.3);
        `
      : ""}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    opacity: ${(props) => (props.$isPast ? 0.8 : 1)};
  }

  @media (max-width: 768px) {
    padding: 16px;
    border-radius: 16px;
  }
`;

const CopiedEventContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const CopiedEventImageContainer = styled.div<{ $isPast?: boolean }>`
  width: 120px;
  height: 120px;
  border-radius: 20px;
  overflow: hidden;
  background-color: #000000;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: ${(props) => (props.$isPast ? "grayscale(50%)" : "none")};

  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
    border-radius: 12px;
  }
`;

const CopiedEventImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const CopiedEventImagePlaceholder = styled.div`
  color: #ccc;
  font-size: 2.5rem;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const CopiedEventDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const CopiedEventTitle = styled.h3<{ $isPast?: boolean }>`
  color: ${(props) =>
    props.$isPast ? "#999" : colors.text.dark}; // Use theme color
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px 0;
  line-height: 1.3;
  word-wrap: break-word;

  @media (max-width: 768px) {
    font-size: 15px;
    margin: 0 0 6px 0;
    line-height: 1.2;
  }
`;

// Using this for CountdownPrefix as it's identical to the one in meetup.tsx
const CopiedCountdownPrefix = styled.span<{ $isUrgent?: boolean }>`
  color: ${(props) => (props.$isUrgent ? "#DC143C" : "inherit")};
  font-weight: ${(props) => (props.$isUrgent ? "bold" : "inherit")};
`;

const CopiedEventInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  @media (max-width: 768px) {
    gap: 6px;
    margin-bottom: 4px;
  }
`;

const CopiedEventIcon = styled.span<{ $isPast?: boolean }>`
  color: ${(props) =>
    props.$isPast ? "#999" : colors.text.medium}; // Use theme color
  flex-shrink: 0;
  display: flex;
  align-items: center;

  svg {
    fill: currentColor; // Ensure SVG inherits color
  }
`;

const CopiedEventText = styled.span<{ $isPast?: boolean }>`
  color: ${(props) =>
    props.$isPast ? "#999" : colors.text.medium}; // Use theme color
  font-size: 16px;
  letter-spacing: 0;
  word-wrap: break-word;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`;

const CopiedEventBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  gap: 8px;
  min-height: 30px; /* Ensure consistent height */

  @media (max-width: 768px) {
    margin-top: 4px;
    gap: 6px;
  }
`;

const CopiedStatusBadge = styled.span<{ $statusColor: string }>`
  display: inline-block;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  background-color: ${(props) => props.$statusColor};
  border-radius: 20px;
  text-align: center;
  min-width: 80px;
  flex-shrink: 0; /* Prevent badge from shrinking */
  white-space: nowrap; /* Keep badge text on one line */
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    font-size: 12px;
    padding: 6px 12px;
    min-width: 80px;
  }
`;
// --- END: Copied/Adapted Meetup Card Styles ---

// New Styled component for the enticing text/design element
const EventCardPrompt = styled.div`
  background: linear-gradient(135deg, ${colors.primaryPale} 0%, #ffffff 100%);
  color: ${colors.primaryDark};
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  margin-bottom: 1rem; // Space between this prompt and the card
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  border: 1px solid ${colors.primaryPale};

  @media (max-width: ${breakpoints.mobile}) {
    font-size: 0.9rem;
    padding: 0.6rem 1rem;
    line-height: 1.3;
  }
`;

// Wrapper for the copied event card in the hero section
const HeroMeetupCardContainer = styled.div`
  max-width: 550px;
  width: 100%;
  margin: 2rem auto 0 auto;
  z-index: 2;
  position: relative;

  @media (max-width: 768px) {
    max-width: 90%;
  }
`;

// New styled component for the MeetupButton
const MeetupButton = styled.button`
  background-color: ${colors.primary};
  color: white;
  border: none;
  border-radius: 30px;
  padding: 12px 30px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: ${colors.primaryLight};
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 10px 24px;
    font-size: 0.9rem;
  }
`;

// New styled component for the caveat text
const CaveatText = styled.p`
  font-size: 0.85rem;
  color: ${colors.text.light};
  text-align: center;
  margin: 1.5rem auto 0 auto;
  max-width: 600px;
  line-height: 1.4;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin: 1rem auto 0 auto;
    padding: 0 20px;
    line-height: 1.3;
  }
`;

interface HomePageClientProps {
  initialUpcomingEvents?: MeetupEvent[];
  initialStats?: HomeStats;
  initialTopics?: HomeTopicArticle[];
}

export default function HomePageClient({
  initialUpcomingEvents,
  initialStats,
  initialTopics,
}: HomePageClientProps) {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const { setIsTransparent } = useGnb();
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [homeStats, setHomeStats] = useState<HomeStats | undefined>(
    initialStats
  );

  const [closestEvent, setClosestEvent] = useState<MeetupEvent | null>(
    initialUpcomingEvents && initialUpcomingEvents.length > 0
      ? initialUpcomingEvents[0]
      : null
  );
  const [loadingEvent, setLoadingEvent] = useState(!initialUpcomingEvents);

  const featureTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Set initial transparency for homepage
  useEffect(() => {
    setIsTransparent(true);
  }, [setIsTransparent]);

  useEffect(() => {
    setHomeStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    let ignore = false;

    const fetchClientFallbackStats = async (): Promise<HomeStats | null> => {
      if (!clientDb) {
        return null;
      }

      const countCollections = async (names: string[]): Promise<number> => {
        for (const name of names) {
          try {
            const collRef = collection(clientDb, name);
            const countSnapshot = await getCountFromServer(collRef);
            const count = countSnapshot.data().count ?? 0;
            if (count > 0) {
              return count;
            }
          } catch (countError) {
            console.warn(`Client count failed for ${name}, attempting doc fetch.`, countError);
            try {
              const limitedSnapshot = await getDocs(query(collection(clientDb, name), limit(1)));
              if (!limitedSnapshot.empty) {
                const fullSnapshot = await getDocs(collection(clientDb, name));
                return fullSnapshot.size;
              }
            } catch (docError) {
              console.error(`Client fetch failed for ${name}:`, docError);
            }
          }
        }
        return 0;
      };

      try {
        const [meetups, members, articles] = await Promise.all([
          countCollections(["events", "meetups", "meetup"]),
          countCollections(["users", "members"]),
          countCollections(["articles", "articleEntries", "posts"]),
        ]);

        const derived: HomeStats = {
          totalMeetups: meetups,
          totalMembers: members,
          totalArticles: articles,
        };

        if (meetups || members || articles) {
          return derived;
        }

        return null;
      } catch (error) {
        console.error("Client fallback stats fetch failed:", error);
        return null;
      }
    };

    const fetchLiveStats = async () => {
      try {
        const response = await fetch("/api/home-stats", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch live stats: ${response.status}`);
        }
        const payload: HomeStats = await response.json();
        if (!ignore) {
          setHomeStats(payload);

          if (
            payload.totalMeetups === 0 &&
            payload.totalMembers === 0 &&
            payload.totalArticles === 0
          ) {
            const fallback = await fetchClientFallbackStats();
            if (fallback && !ignore) {
              setHomeStats(fallback);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch live home stats:", error);
        if (!ignore) {
          const fallback = await fetchClientFallbackStats();
          if (fallback) {
            setHomeStats(fallback);
          }
        }
      }
    };

    fetchLiveStats();

    return () => {
      ignore = true;
    };
  }, [initialStats?.totalMeetups, initialStats?.totalMembers, initialStats?.totalArticles]);

  // Effect to set video playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8; // Set to 0.5 for 2x slower
    }
  }, []);

  // Effect to fetch upcoming events
  useEffect(() => {
    // If we already have initial events, don't fetch again
    if (initialUpcomingEvents && initialUpcomingEvents.length > 0) {
      return;
    }

    const loadClosestEvent = async () => {
      try {
        setLoadingEvent(true);
        const upcomingEvents = await fetchUpcomingMeetupEvents();
        if (upcomingEvents.length > 0) {
          setClosestEvent(upcomingEvents[0]);
        }
      } catch (error) {
        console.error("Failed to fetch upcoming meetups for hero:", error);
        setClosestEvent(null);
      } finally {
        setLoadingEvent(false);
      }
    };
    loadClosestEvent();
  }, [initialUpcomingEvents]);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs = [
    {
      question: "영어 한잔 밋업은 뭔가요?",
      answer:
        "영어 한잔 밋업은 통번역사 출신의 운영자가 직접 리딩하는 영어 모임입니다. 자세한 일정 및 참여 방법은 밋업 메뉴를 참고해 주세요.",
    },
    {
      question: "구독은 언제든 취소할 수 있나요?",
      answer:
        "네, 언제든지 구독을 취소할 수 있습니다. 구독 취소 시 다음 결제 주기부터 서비스가 중단됩니다.",
    },
    {
      question: "모바일에서도 이용 가능한가요?",
      answer:
        "네, 영어 한잔은 모바일, PC 환경을 모두 고려하여 개발했습니다. 모바일/태블릿 이용 시 카카오톡 인앱 브라우저보다 크롬, 사파리 브라우저에서 작동이 더 잘될 수 있습니다.",
    },
    {
      question:
        "회원가입 하려니 외국 웹사이트에서 코드인증을 하라는 문자가 날아와요. 괜찮은건가요?",
      answer:
        "저희는 Google의 인증 방식을 채택하여, 해당 문자는 Google 시스템을 통해 발송되는 것 입니다. 영어 한잔은 웹사이트 가입 시 휴대폰 번호 외의 어떤 개인정보도 받고 있지 않습니다. 안심하고 가입하셔도 됩니다.",
    },
    {
      question: "회원 탈퇴는 어떻게 하나요?",
      answer:
        "회원 탈퇴에 관한 문의는 영어한잔 카카오톡 채널을 통해 문의 주시면 탈퇴 진행을 도와드리겠습니다.",
    },
    {
      question: "서비스에 대한 문의 사항이 있어요",
      answer:
        "각종 문의는 영어한잔 카카오톡(링크 추가)로 연락 주시면 성심껏 응답하도록 하겠습니다.",
    },
  ];

  // Set up automatic feature card rotation
  React.useEffect(() => {
    // Function to handle automatic feature highlight
    const rotateFeatures = () => {
      setActiveFeature((prevIndex) => (prevIndex + 1) % 3);
    };

    // Start the automatic rotation with a longer interval to reduce strain
    featureTimerRef.current = setInterval(rotateFeatures, 5000);

    // Initial card highlight
    setActiveFeature(0);

    // Pause rotation when user hovers or interacts with cards
    const pauseRotation = () => {
      if (featureTimerRef.current) {
        clearInterval(featureTimerRef.current);
      }
    };

    // Resume rotation after delay
    const resumeRotation = () => {
      if (featureTimerRef.current) {
        clearInterval(featureTimerRef.current);
      }
      featureTimerRef.current = setInterval(rotateFeatures, 5000);
    };

    // Add event listeners to the feature slider
    const featureSlider = document.querySelector(".feature-slider");
    if (featureSlider) {
      featureSlider.addEventListener("mouseenter", pauseRotation);
      featureSlider.addEventListener("mouseleave", resumeRotation);
      featureSlider.addEventListener("touchstart", pauseRotation, {
        passive: true,
      });
      featureSlider.addEventListener("touchend", resumeRotation);
    }

    // Cleanup function to clear the interval when component unmounts
    return () => {
      if (featureTimerRef.current) {
        clearInterval(featureTimerRef.current);
      }

      if (featureSlider) {
        featureSlider.removeEventListener("mouseenter", pauseRotation);
        featureSlider.removeEventListener("mouseleave", resumeRotation);
        featureSlider.removeEventListener("touchstart", pauseRotation);
        featureSlider.removeEventListener("touchend", resumeRotation);
      }
    };
  }, [setActiveFeature]); // Add dependency to fix linter warning

  // Feature card images
  const featureCards = [
    {
      image: "/assets/homepage/feature_card_1.png",
      alt: "최신 영어 토픽",
    },
    {
      image: "/assets/homepage/feature_card_2.png",
      alt: "속독 모드",
    },
    {
      image: "/assets/homepage/feature_card_3.png",
      alt: "한글 번역 및 단어 정리",
    },
  ];

  // Render logic for the closest event using copied styles
  const renderHeroEventCard = (meetup: MeetupEvent) => {
    if (!meetup) return null;

    const { countdownPrefix, eventTitle, isUrgent } =
      formatEventTitleWithCountdown(meetup);
    const lockStatus = isEventLocked(meetup);
    const isCurrentlyLocked = lockStatus.isLocked;
    const totalParticipants =
      meetup.leaders.length + meetup.participants.length;
    const isPast = false; // For hero, it's always an upcoming event

    const getStatusText = () => {
      // Simplified for hero: it's never past
      if (!isCurrentlyLocked) return "참가 가능";
      switch (lockStatus.reason) {
        case "started":
          return "진행중"; // Should ideally not be the "closest" if already started and not shown
        case "full":
          return "정원 마감";
        case "lockdown":
          return "모집 종료";
        default:
          return "모집 종료";
      }
    };

    const statusColor = isCurrentlyLocked
      ? lockStatus.reason === "full"
        ? "#ff4d4f"
        : "#888"
      : "#4CAF50";

    return (
      <CopiedEventCard
        onClick={() => router.push(`/meetup/${meetup.id}`)}
        $isPast={isPast}
        $isClosest={true}
      >
        <CopiedEventContent>
          <CopiedEventImageContainer $isPast={isPast}>
            {meetup.image_urls && meetup.image_urls.length > 0 ? (
              <CopiedEventImage src={meetup.image_urls[0]} alt={meetup.title} />
            ) : (
              <CopiedEventImagePlaceholder>🖼️</CopiedEventImagePlaceholder>
            )}
          </CopiedEventImageContainer>
          <CopiedEventDetails>
            <CopiedEventTitle $isPast={isPast}>
              {countdownPrefix && (
                <CopiedCountdownPrefix $isUrgent={isUrgent}>
                  {countdownPrefix}
                </CopiedCountdownPrefix>
              )}
              {eventTitle}
            </CopiedEventTitle>
            <CopiedEventInfo>
              <CopiedEventIcon $isPast={isPast}>
                <PinIcon width="16px" height="16px" />
              </CopiedEventIcon>
              <CopiedEventText $isPast={isPast}>
                {meetup.location_name}
              </CopiedEventText>
            </CopiedEventInfo>
            <CopiedEventInfo>
              <CopiedEventIcon $isPast={isPast}>
                <CalendarIcon width="16px" height="16px" />
              </CopiedEventIcon>
              <CopiedEventText $isPast={isPast}>
                {formatEventDateTime(meetup)}
              </CopiedEventText>
            </CopiedEventInfo>
            <CopiedEventBottom>
              <UserAvatarStack
                uids={[...meetup.leaders, ...meetup.participants]}
                maxAvatars={8} // Balanced threshold to prevent overflow on smaller cards
                size={30}
                isPast={isPast}
                // onAvatarClick can be omitted or a simple console.log for hero
              />
              <CopiedStatusBadge $statusColor={statusColor}>
                {getStatusText()} ({totalParticipants}/{meetup.max_participants}
                )
              </CopiedStatusBadge>
            </CopiedEventBottom>
          </CopiedEventDetails>
        </CopiedEventContent>
      </CopiedEventCard>
    );
  };

  return (
    <PageWrapper>
      <GlobalStyle />
      <HeroSection>
        <video autoPlay loop muted playsInline ref={videoRef}>
          <source src="/assets/homepage/alphabet.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <VideoOverlay />
        <HeroContent>
          <div>
            <MarketingText>
              조금씩 쌓아둔 영어가
              <br />
              커리어를 활짝 열어줍니다
            </MarketingText>
            <MarketingSubText>
              국내파 통역사가 노하우를 담아 개발한
              <br />
              비즈니스 영어 습관 형성 서비스
            </MarketingSubText>
          </div>
          {!loadingEvent && closestEvent && (
            <HeroMeetupCardContainer>
              <EventCardPrompt>
                ✨ 바로 지금! 통역사가 직접 리딩하는
                <MobileBreak /> 영어 모임에 참여해보세요! ✨
              </EventCardPrompt>
              {renderHeroEventCard(closestEvent)}
            </HeroMeetupCardContainer>
          )}
        </HeroContent>
      </HeroSection>

      <MainContent>
        {/* Gallery Section */}
        <GallerySection>
          <GalleryTitle>
            매주 일요일 오전 11시,
            <br />
            통역사 출신이 리딩하는 영어 모임
          </GalleryTitle>
          <GalleryGrid>
            <GalleryImageLarge 
              src="/assets/homepage/gallery1.JPG" 
              alt="영어 한잔 밋업 현장 1"
              loading="lazy"
            />
            <GalleryImageSmall 
              src="/assets/homepage/gallery2.JPG" 
              alt="영어 한잔 밋업 현장 2"
              loading="lazy"
            />
            <GalleryImageSmall 
              src="/assets/homepage/gallery3.JPG" 
              alt="영어 한잔 밋업 현장 3"
              loading="lazy"
            />
          </GalleryGrid>
        </GallerySection>

        <StatsSection stats={homeStats} />

        <TopicsShowcase topics={initialTopics || []} />

        {/* Features Section */}
        <FeaturesSection>
          <FeatureSlider className="feature-slider">
            {featureCards.map((card, index) => (
              <FeatureCard
                key={index}
                src={card.image}
                alt={card.alt}
                isActive={activeFeature === index}
                onClick={() => setActiveFeature(index)}
                onMouseEnter={() => setActiveFeature(index)}
              />
            ))}
          </FeatureSlider>

          {/* Add caveat text */}
          <CaveatText>
            *1주에 1회 진행하는 밋업에 모두 참여 시 4회입니다. 운영진 귀책 사유로
            밋업을 1주 진행하지 못할 경우 구독 기간을 2주 연장해드립니다. 멤버 분
            귀책 사유로 밋업을 불참하실 경우 연장이 되지는 않습니다.
          </CaveatText>

          {/* Add this button below the feature slider */}
          <MeetupButton onClick={() => router.push("/meetup")}>
            밋업 일정 확인하기
          </MeetupButton>
        </FeaturesSection>

        {/* FAQ Section */}
        <FAQSection>
          <SectionTitle>자주 묻는 질문</SectionTitle>
          <FAQContainer>
            {faqs.map(
              (faq: { question: string; answer: string }, index: number) => (
                <FAQItem key={index}>
                  <FAQQuestion
                    onClick={() => toggleFAQ(index)}
                    $isOpen={openFAQ === index}
                  >
                    {faq.question}
                    <span>{openFAQ === index ? "−" : "+"}</span>
                  </FAQQuestion>
                  <FAQAnswer $isOpen={openFAQ === index}>
                    {faq.answer}
                  </FAQAnswer>
                </FAQItem>
              )
            )}
          </FAQContainer>
        </FAQSection>

        {/* CTA Section */}
        <CTASection>
          <CTAVideoBackground autoPlay loop muted playsInline>
            <source src="/assets/blog/manhattan.mp4" type="video/mp4" />
          </CTAVideoBackground>
          <CTAOverlay />
          <CTAContent>
            <CTATitle>영어 소통 능력을 키우고 싶다면?</CTATitle>
            <CTADescription>
              통역사, 직장인, 대학생, 전문가 등 다양한 백그라운드를 가진 <br />
              멤버들과 함께하는 영어 밋업에 참여해보세요. 🚀
              <br />
            </CTADescription>
            <CTAButton onClick={() => router.push("/meetup")}>
              <span>🚀</span>
              밋업 확인하기
            </CTAButton>
          </CTAContent>
        </CTASection>
      </MainContent>
    </PageWrapper>
  );
}
