import { useState, useEffect, useRef } from "react";
import styled, { createGlobalStyle, css } from "styled-components";
import React from "react";
import GNB from "../components/gnb";
import Footer from "../components/footer";
import kakaoLogo from "../assets/homepage/kakao_logo.png";
import kakaoNotification from "../assets/homepage/kakao_notification.png";
import meetupImage from "../assets/homepage/meetup.jpg";
import featureCard1 from "../assets/homepage/feature_card_1.png";
import featureCard2 from "../assets/homepage/feature_card_2.png";
import featureCard3 from "../assets/homepage/feature_card_3.png";
import oneCupCup from "../assets/homepage/1cup_cup.png";
import alphabetVideo from "../assets/homepage/alphabet.mp4";

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

const KakaoContainer = styled.div`
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 3;
  animation: floatingKakao 5s ease-in-out infinite;
  will-change: transform;

  @keyframes floatingKakao {
    0% {
      transform: translateX(-50%) translateY(0px);
    }
    50% {
      transform: translateX(-50%) translateY(-8px);
    }
    100% {
      transform: translateX(-50%) translateY(0px);
    }
  }

  .kakao-logo-wrapper {
    display: flex;
    justify-content: flex-start;
    width: 100%;
    animation: floatingLogo 6s ease-in-out infinite;
    will-change: transform;
  }

  @media (max-width: 768px) {
    bottom: 20px;
    gap: 12px;
    animation-duration: 4s;

    @keyframes floatingKakao {
      0% {
        transform: translateX(-50%) translateY(0px) scale(0.85);
      }
      50% {
        transform: translateX(-50%) translateY(-5px) scale(0.85);
      }
      100% {
        transform: translateX(-50%) translateY(0px) scale(0.85);
      }
    }

    .kakao-logo-wrapper {
      animation-duration: 3s;
    }
  }
`;

const KakaoIcon = styled.img<{ isNotification?: boolean }>`
  max-width: ${(props) => (props.isNotification ? "240px" : "80px")};
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  transition: transform 0.3s ease;

  @media (max-width: 768px) {
    ${(props) => !props.isNotification && "align-self: flex-start;"}
    max-width: ${(props) => (props.isNotification ? "300px" : "100px")};
  }
`;

const KakaoNotificationContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
  animation: fadeInOut 10s ease-in-out infinite;
  opacity: 0;

  @keyframes fadeInOut {
    0%,
    100% {
      opacity: 0;
    }
    10%,
    90% {
      opacity: 1;
    }
  }
`;

const KakaoNotificationButton = styled.a`
  position: absolute;
  top: 110px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #181818;
  color: white;
  border: none;
  border-radius: 10px;
  width: 220px;
  padding: 8px 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  z-index: 4;
  font-family: "Noto Sans KR", sans-serif;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  letter-spacing: -0.02em;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.15);
  text-decoration: none;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #4a2f23;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
    color: white;
  }

  &:active {
    transform: translateX(-50%) translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    font-size: 1.2rem;
    padding: 12px 20px;
    border-radius: 20px;
    top: 130px;
    width: 280px;
  }
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

const SectionSubText = styled.p`
  font-size: 1rem;
  color: ${colors.primary};
  font-weight: 600;
  margin-top: 1rem;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
`;

const PricingContent = styled.div`
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  position: relative; /* To keep content above the pseudo-element */
  z-index: 3; /* To keep content above the pseudo-element */
`;

// Pricing Section with Coffee Cup design
const PricingSection = styled.section`
  ${SectionBase}
  min-height: 600px;
  background: linear-gradient(
    to bottom,
    ${colors.primaryBg} 0%,
    ${colors.primaryBg} 60%,
    rgba(243, 111, 32, 0.1) 80%,
    rgba(243, 111, 32, 0.2) 100%
  );
  text-align: center;
  padding-bottom: 200px; /* Space for the cup and gradient */
  position: relative;

  &::before {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 120%; /* Increased height to move center lower */
    background: radial-gradient(
      circle at center 150%,
      /* Moved center point lower to 90% from top */ #f36f20 0%,
      rgba(243, 111, 32, 0.8) 25%,
      rgba(243, 111, 32, 0.4) 50%,
      rgba(243, 111, 32, 0) 75%
    );
    z-index: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    min-height: 500px;
    padding-bottom: 150px;
  }
`;

// Replace TabButton with ActionButton for navigation
const ActionButton = styled.a`
  background-color: ${colors.primary};
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  margin-top: 1.5rem;
  font-family: "Noto Sans KR", sans-serif;
  position: relative;
  z-index: 3;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 60%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(240, 212, 168, 0.1) 35%,
      rgba(200, 162, 122, 0.1) 50%,
      rgba(240, 212, 168, 0.1) 65%,
      transparent 100%
    );
    transform: translateX(-180%);
    animation: buttonShimmer 4s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes buttonShimmer {
    0% {
      transform: translateX(-180%);
    }
    100% {
      transform: translateX(280%);
    }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
  }

  @media (max-width: 768px) {
    padding: 0.7rem 1.2rem;
    font-size: 0.9rem;
    margin-top: 1rem;
  }
`;

const CircleCupImage = styled.img`
  width: 200px;
  height: auto;
  filter: drop-shadow(0 5px 25px rgba(0, 0, 0, 0.4));
  position: absolute;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;

  @media (max-width: 768px) {
    width: 150px;
    bottom: 0px;
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

// MeetupSection styled component
const MeetupSection = styled.section`
  ${SectionBase}
  background-color: #181818;
  color: white;
  text-align: center;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
  }
`;

const MeetupTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  position: relative;
  display: inline-block;
  background: linear-gradient(
    to right,
    #fff 20%,
    #c8a27a 40%,
    #f0d4a8 60%,
    #fff 80%
  );
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shine 3s linear infinite;
  overflow: hidden;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
  font-family: "Noto Sans KR", sans-serif;

  @keyframes shine {
    to {
      background-position: 200% center;
    }
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: shimmer 3s infinite;
    mix-blend-mode: overlay;
    pointer-events: none;
    background-clip: text;
    -webkit-background-clip: text;
  }

  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }

  @media (max-width: 768px) {
    font-size: 1.8rem;
    padding: 0 15px;
    margin-bottom: 1rem;
  }
`;

const MeetupSubtitle = styled.p`
  font-size: 1.6rem;
  margin-bottom: 2.5rem;
  font-weight: 600;
  color: #ddd;
  animation: fadeIn 1.5s ease-in-out;
  position: relative;
  max-width: 960px;
  margin-left: auto;
  margin-right: auto;
  font-family: "Noto Sans KR", sans-serif;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  line-height: 1.8;
  gap: 0.5rem;
  max-width: 1200px;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .changing-text-wrapper {
    position: relative;
    display: inline-flex;
    align-items: baseline;
    overflow: hidden;
    height: 1.8em;
  }

  .changing-text {
    position: relative;
    color: #f0f0a0;
    display: inline-block;
  }

  .changing-text span {
    position: absolute;
    top: 0;
    left: 0;
    white-space: nowrap;
    opacity: 0;
    transform: translateY(20px);
    animation: textFade 10s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .changing-text span:nth-child(1) {
    position: relative; /* First item serves as space holder */
    opacity: 0;
    animation-delay: 7.5s; /* This will be the last to show in the cycle */
  }

  .changing-text span:nth-child(2) {
    animation-delay: 0s;
  }

  .changing-text span:nth-child(3) {
    animation-delay: 2.5s;
  }

  .changing-text span:nth-child(4) {
    animation-delay: 5s;
  }

  @keyframes textFade {
    0%,
    5% {
      opacity: 0;
      transform: translateY(20px);
    }
    10%,
    22.5% {
      opacity: 1;
      transform: translateY(0);
    }
    27.5%,
    100% {
      opacity: 0;
      transform: translateY(-20px);
    }
  }

  @media (max-width: 768px) {
    font-size: 1.2rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    padding: 0 10px;

    .changing-text-wrapper {
      height: 1.6em;
    }
  }
`;

const MeetupImageContainer = styled.div`
  position: relative;
  max-width: 960px;
  max-height: 300px;
  margin: 0px auto 0;
  overflow: hidden;
  border-radius: 100px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  transform: translateZ(0);

  /* Separate the shadow animation from transform for better performance */
  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 100px;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: -1;
    pointer-events: none;
  }

  &:hover::after {
    opacity: 1;
  }

  /* Add hover effect directly here */
  &:hover img {
    transform: translateY(-105px);
  }

  @media (max-width: 768px) {
    max-width: 320px;
    max-height: 200px;
    border-radius: 50px;

    &::after {
      border-radius: 50px;
    }

    &:hover img {
      transform: translateY(-65px);
    }
  }
`;

const MeetupImage = styled.img`
  width: 100%;
  display: block;
  object-fit: cover;
  transform: translateY(-100px);
  transition: transform 0.3s ease;
  will-change: transform;

  @media (max-width: 768px) {
    transform: translateY(-60px);
  }
`;

const MeetupTextOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
`;

const MeetupComingSoon = styled.h3`
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 2rem;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  opacity: 0;
  transform: translateY(20px);
  animation: fadeSlideUp 0.8s forwards;
  animation-delay: 0.2s;
  font-family: "Noto Sans KR", sans-serif;

  @keyframes fadeSlideUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    font-size: 1.8rem;
    margin-bottom: 1rem;
  }
`;

const MeetupButton = styled.button`
  background-color: #c8a27a;
  color: #2c1810;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeSlideUp 0.8s forwards;
  animation-delay: 0.4s;
  font-family: "Noto Sans KR", sans-serif;

  &:hover {
    background-color: #d8b28a;
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
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

export default function Home() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isGnbTransparent, setIsGnbTransparent] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reference to store the timer ID
  const featureTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Effect to handle GNB transparency on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsGnbTransparent(false);
      } else {
        setIsGnbTransparent(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Effect to set video playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8; // Set to 0.5 for 2x slower
    }
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

  return (
    <PageWrapper>
      <GlobalStyle />
      <GNB variant="home" isAtTop={isGnbTransparent} />
      {/* Hero Section */}
      <HeroSection>
        <video autoPlay loop muted playsInline ref={videoRef}>
          <source src={alphabetVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <VideoOverlay />
        <HeroContent>
          {/* Added Marketing Text Elements */}
          <div>
            <MarketingText>
              조금씩 쌓아둔 영어가
              <br />
              커리어를 크게 열어줍니다
            </MarketingText>
            <MarketingSubText>
              국내파 통역사가 노하우를 담아 개발한
              <br />
              비즈니스 영어 습관 형성 서비스
            </MarketingSubText>
          </div>
          <KakaoContainer>
            <div className="kakao-logo-wrapper">
              <KakaoIcon src={kakaoLogo} alt="Kakao Logo" />
            </div>
            <KakaoNotificationContainer>
              <KakaoIcon
                src={kakaoNotification}
                alt="Kakao Notification"
                isNotification={true}
              />
              <KakaoNotificationButton
                href="/sample"
                target="_blank"
                rel="noopener noreferrer"
              >
                영어 한잔 체험하기
              </KakaoNotificationButton>
            </KakaoNotificationContainer>
          </KakaoContainer>
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
        <SectionSubText>* IT/비즈니스 중 관심분야 택1</SectionSubText>
      </FeaturesSection>

      {/* Pricing Section */}
      <PricingSection>
        <PricingContent>
          <SectionTitle>
            <span style={{ fontWeight: 600 }}>이 모든 것을 </span>
            커피 한 잔 가격으로
            <br />
            30일간
            <span style={{ fontWeight: 600 }}> 마음껏 누리세요</span>
          </SectionTitle>

          <ActionButton href="/subscribe" target="_blank">
            월 4,700원에 시작하기
          </ActionButton>
        </PricingContent>

        {/* Cup image positioned over the gradient */}
        <CircleCupImage src={oneCupCup} alt="1 Cup English Cup" />
      </PricingSection>

      {/* Meetup Section */}
      <MeetupSection>
        <MeetupTitle>AI 시대의 경쟁력, 대면 커뮤니케이션</MeetupTitle>
        <MeetupSubtitle>
          <span>영어로</span>
          <span className="changing-text-wrapper">
            <span className="changing-text">
              <span>라포를 형성하는</span>
              <span>신뢰를 얻는</span>
              <span>호감을 사는</span>
              <span>상대를 설득하는</span>
            </span>
          </span>
          <span>법, 영어 한잔 밋업에서 연마하세요</span>
        </MeetupSubtitle>
        <MeetupImageContainer>
          <MeetupImage src={meetupImage} alt="Offline Meetup" />
          <MeetupTextOverlay>
            <MeetupComingSoon>Coming Soon...</MeetupComingSoon>
            <MeetupButton>구독자 무료</MeetupButton>
          </MeetupTextOverlay>
        </MeetupImageContainer>
      </MeetupSection>
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
