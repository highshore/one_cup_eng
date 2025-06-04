import { useState, useEffect, useRef } from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";
import React from "react";
import GNB from "../components/gnb";
import Footer from "../components/footer";
import featureCard1 from "../assets/homepage/feature_card_1.png";
import featureCard2 from "../assets/homepage/feature_card_2.png";
import featureCard3 from "../assets/homepage/feature_card_3.png";
import alphabetVideo from "../assets/homepage/alphabet.mp4";

// Imports for Meetup Event Display
import { useNavigate } from "react-router-dom";
import { MeetupEvent } from "../../features/meetup/types/meetup_types";
import { fetchUpcomingMeetupEvents } from "../../features/meetup/services/meetup_service";
import {
  formatEventDateTime,
  formatEventTitleWithCountdown,
  isEventLocked
} from "../../features/meetup/utils/meetup_helpers";
import { PinIcon, CalendarIcon } from "../../features/meetup/components/meetup_icons";
import { UserAvatarStack } from "../../features/meetup/components/user_avatar";

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

// Add global style for Noto Sans KR font
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap');
  
  body, html {
    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  /* Ensure Korean text uses Noto Sans KR */
  :lang(ko) {
    font-family: 'Noto Sans KR', sans-serif;
  }
`;

// Define colors object since it's not exported from layout.tsx
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

// Common section styles
const SectionBase = css`
  min-height: 450px;
  padding: 5rem 2rem;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

// Hero Section
const HeroSection = styled.section`
  color: white;
  padding: 0rem 10rem;
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;

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
    padding: 4rem 0;
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 0 20px;
  height: 400px;

  @media (max-width: 768px) {
    padding: 0 10px;
    height: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
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
  color: ${colors.primary};
  margin-bottom: 1.2rem;
  font-weight: 800;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.8rem;
    padding: 0 10px;
  }
`;

// Features Section
const FeaturesSection = styled.section`
  ${SectionBase}
  background-color: white;
  text-align: center;
`;

// Feature slider layout with common utilities
const FeatureSlider = styled.div`
  ${flexCenter}
  gap: 1.5rem;
  padding: 2rem 0;
  margin: 0 auto;
  max-width: 960px;
  overflow: visible;
  will-change: contents;
  height: 450px; /* Add fixed height */

  ${media.mobile`
    flex-direction: column;
    gap: 1.5rem;
    height: auto; /* Allow height to adjust on mobile */
    padding: 1rem 0;
  `}
`;

// Styled image that will act as a feature card
const FeatureCard = styled.img<{ isActive?: boolean }>`
  width: ${(props) => (props.isActive ? "280px" : "240px")};
  height: auto;
  cursor: pointer;
  transition: all 0.3s ease-out;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.15));
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
  background-color: white;
  text-align: center;
`;

const FAQContainer = styled.div`
  max-width: 960px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 0 15px;
  }
`;

const FAQItem = styled.div`
  margin-bottom: 1.5rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 10px;
  overflow: hidden;

  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

interface FAQQuestionProps {
  isOpen: boolean;
}

const FAQQuestion = styled.div<FAQQuestionProps>`
  padding: 1.5rem;
  background-color: ${colors.primaryBg};
  font-weight: 600;
  color: ${colors.primary};
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: "Noto Sans KR", sans-serif;

  &::after {
    content: "${(props) => (props.isOpen ? "−" : "+")}";
    font-size: 1.5rem;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    font-size: 0.9rem;

    &::after {
      font-size: 1.2rem;
    }
  }
`;

interface FAQAnswerProps {
  isOpen: boolean;
}

const FAQAnswer = styled.div<FAQAnswerProps>`
  padding: ${(props) => (props.isOpen ? "1.5rem" : "0 1.5rem")};
  max-height: ${(props) => (props.isOpen ? "500px" : "0")};
  overflow: hidden;
  transition: all 0.3s ease;
  color: ${colors.text.medium};
  line-height: 1.6;
  font-family: "Noto Sans KR", sans-serif;
  text-align: left;

  @media (max-width: 768px) {
    padding: ${(props) => (props.isOpen ? "1rem" : "0 1rem")};
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

// Define styled component for page wrapper
const PageWrapper = styled.div`
  padding-top: 0; /* Always 0 for homepage */
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
  background-color: white; // Meetup card has a white background
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 1.5rem; // Added margin for spacing in hero
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  width: 100%;
  opacity: ${props => (props.$isPast ? 0.6 : 1)};
  text-align: left; // Ensure text is left-aligned

  ${props =>
    props.$isClosest
      ? css`
          animation: ${subtleGlow} 3s ease-in-out infinite;
          border: 1px solid rgba(76, 175, 80, 0.3);
        `
      : ''}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    opacity: ${props => (props.$isPast ? 0.8 : 1)};
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
  filter: ${props => (props.$isPast ? 'grayscale(50%)' : 'none')};

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
  color: ${props => (props.$isPast ? '#999' : colors.text.dark)}; // Use theme color
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
  color: ${props => (props.$isUrgent ? '#DC143C' : 'inherit')};
  font-weight: ${props => (props.$isUrgent ? 'bold' : 'inherit')};
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
  color: ${props => (props.$isPast ? '#999' : colors.text.medium)}; // Use theme color
  flex-shrink: 0;
  display: flex;
  align-items: center;

  svg {
    fill: currentColor; // Ensure SVG inherits color
  }
`;

const CopiedEventText = styled.span<{ $isPast?: boolean }>`
  color: ${props => (props.$isPast ? '#999' : colors.text.medium)}; // Use theme color
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
  background-color: ${props => props.$statusColor};
  border-radius: 20px;
  text-align: center;
  min-width: 80px;
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

export default function Home() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isGnbTransparent, setIsGnbTransparent] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const [closestEvent, setClosestEvent] = useState<MeetupEvent | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const featureTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Effect to handle GNB transparency on scroll
  useEffect(() => {
    const rootElement = document.getElementById("root");
    const isMobile = window.innerWidth <= 768;
    // Determine the target for scroll events.
    // On mobile, if #root exists, use it; otherwise, default to window.
    const scrollTarget = isMobile && rootElement ? rootElement : window;

    const handleScroll = () => {
      let scrollTop = 0;
      // Read scrollTop from the correct target.
      if (isMobile && rootElement) {
        scrollTop = rootElement.scrollTop;
      } else {
        // Default to window.scrollY for desktop or if rootElement is not found.
        scrollTop = window.scrollY;
      }

      if (scrollTop > 0) {
        setIsGnbTransparent(false);
      } else {
        setIsGnbTransparent(true);
      }
    };

    scrollTarget.addEventListener("scroll", handleScroll);
    handleScroll(); // Call once to set initial state based on current scroll position

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Effect to set video playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8; // Set to 0.5 for 2x slower
    }
  }, []);

  // Effect to fetch upcoming events
  useEffect(() => {
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
  }, []);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs = [
    {
      question: "영어 한잔은 어떤 서비스인가요?",
      answer:
        "영어 한잔은 하루 5분으로 영어 실력과 글로벌 감각을 키울 수 있는 서비스입니다. 월스트리트저널, 파이낸셜 타임즈 등에서 선별한 최신 영어 토픽을 제공하며, 속독 모드와 한글 번역, 주요 단어 정리까지 제공합니다.",
    },
    {
      question: "구독은 언제든 취소할 수 있나요?",
      answer:
        "네, 언제든지 구독을 취소할 수 있습니다. 구독 취소 시 다음 결제 주기부터 서비스가 중단됩니다.",
    },
    {
      question: "어떤 레벨의 영어 실력이 필요한가요?",
      answer:
        "영어 한잔은 다양한 레벨의 사용자를 위해 설계되었으나, 초보자의 경우 다소 어려우실 수도 있습니다. 토익 600점대 이상이신 분들에게 추천드립니다.",
    },
    {
      question: "모바일에서도 이용 가능한가요?",
      answer:
        "네, 영어 한잔은 모바일, PC 환경을 모두 고려하여 개발했습니다. 모바일/태블릿 이용 시 카카오톡 인앱 브라우저보다 크롬, 사파리 브라우저에서 작동이 더 잘될 수 있습니다.",
    },
    {
      question: "구독은 어떻게 할 수 있나요?",
      answer:
        "30일 기준 구독 비용은 4700원으로 네이버 스마트스토어, 혹은 웹사이트 내에서 결제 후 다음날부터 카카오톡을 통해 영어 뉴스를 받아보실 수 있습니다. 자세한 내용은 영어 한잔 가이드를 참조해 주세요!",
    },
    {
      question:
        "회원가입 하려니 외국 웹사이트에서 코드인증을 하라는 문자가 날아와요. 괜찮은건가요?",
      answer:
        "저희는 구글인증방식을 채택하여, 해당 문자는 구글 시스템을 통해 발송되는 것 입니다. 영어 한잔은 웹사이트 가입 시 휴대폰 번호 외의 어떤 개인정보도 받고 있지 않습니다. 안심하고 가입하셔도 됩니다.",
    },
    {
      question: "기사의 원본 출처는 어디인가요?",
      answer:
        "원본이 존재하지는 않고 월스트리트저널, 파이낸셜 타임즈와 같은 유수 언론지에서 가장 핫한 토픽을 학습용으로 제작하여 발송해 드립니다.",
    },
    {
      question: "영어 한잔 밋업은 뭔가요?",
      answer:
        "영어 한잔을 구독하시는 분들이 오프라인에서도 영어 커뮤니케이션 스킬을 향상시키실 수 있도록 기획하고 있는 모임입니다. 아직 시작 시기와 장소 등 구체적인 부분은 정해지지 않아서, 추후 홈페이지 공지사항을 참고 부탁드립니다.",
    },
    {
      question: "토픽을 중간에 변경할 수 있나요?",
      answer:
        "변경에 관한 문의는 영어한잔 카카오톡 채널을 통해 문의해주시면 변경을 도와드리겠습니다.",
    },
    {
      question: "회원 탈퇴는 어떻게 하나요?",
      answer:
        "회원 탈퇴에 관한 문의는 영어한잔 카카오톡 채널을 통해 문의 주시면 탈퇴 진행을 도와드리겠습니다.",
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
      image: featureCard1,
      alt: "최신 영어 토픽",
    },
    {
      image: featureCard2,
      alt: "속독 모드",
    },
    {
      image: featureCard3,
      alt: "한글 번역 및 단어 정리",
    },
  ];

  // Render logic for the closest event using copied styles
  const renderHeroEventCard = (meetup: MeetupEvent) => {
    if (!meetup) return null;

    const { countdownPrefix, eventTitle, isUrgent } = formatEventTitleWithCountdown(meetup);
    const lockStatus = isEventLocked(meetup);
    const isCurrentlyLocked = lockStatus.isLocked;
    const totalParticipants = meetup.leaders.length + meetup.participants.length;
    const isPast = false; // For hero, it's always an upcoming event

    const getStatusText = () => {
      // Simplified for hero: it's never past
      if (!isCurrentlyLocked) return '참가 가능';
      switch (lockStatus.reason) {
        case 'started': return '진행중'; // Should ideally not be the "closest" if already started and not shown
        case 'full': return '정원 마감';
        case 'lockdown': return '모집 종료';
        default: return '모집 종료';
      }
    };

    const statusColor = isCurrentlyLocked
      ? lockStatus.reason === 'full' ? '#ff4d4f' : '#888'
      : '#4CAF50';

    return (
      <CopiedEventCard
        onClick={() => navigate(`/meetup/${meetup.id}`)}
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
              <CopiedEventText $isPast={isPast}>{meetup.location_name}</CopiedEventText>
            </CopiedEventInfo>
            <CopiedEventInfo>
              <CopiedEventIcon $isPast={isPast}>
                <CalendarIcon width="16px" height="16px" />
              </CopiedEventIcon>
              <CopiedEventText $isPast={isPast}>{formatEventDateTime(meetup)}</CopiedEventText>
            </CopiedEventInfo>
            <CopiedEventBottom>
              <UserAvatarStack
                uids={[...meetup.leaders, ...meetup.participants]}
                maxAvatars={5} // Consistent with meetup.tsx or adjust as needed for hero
                size={30}
                isPast={isPast}
                // onAvatarClick can be omitted or a simple console.log for hero
              />
              <CopiedStatusBadge $statusColor={statusColor}>
                {getStatusText()} ({totalParticipants}/{meetup.max_participants})
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
      <GNB variant="home" isAtTop={isGnbTransparent} />
      <HeroSection>
        <video autoPlay loop muted playsInline ref={videoRef}>
          <source src={alphabetVideo} type="video/mp4" />
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
                <MobileBreak />
                {' '}영어 모임에 참여해보세요! ✨
              </EventCardPrompt>
              {renderHeroEventCard(closestEvent)}
            </HeroMeetupCardContainer>
          )}
        </HeroContent>
      </HeroSection>

      {/* Features Section */}
      <FeaturesSection>
        <SectionTitle>
          30일 하루 5분,
          <br />
          <span style={{ fontWeight: 600 }}> 내 영어 실력을 바꾸는 시간</span>
        </SectionTitle>
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
                  isOpen={openFAQ === index}
                >
                  {faq.question}
                </FAQQuestion>
                <FAQAnswer isOpen={openFAQ === index}>{faq.answer}</FAQAnswer>
              </FAQItem>
            )
          )}
        </FAQContainer>
      </FAQSection>

      {/* Using the imported Footer component */}
      <Footer />
    </PageWrapper>
  );
}
