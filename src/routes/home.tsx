import { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import React from "react";
import GNB from "../components/gnb";
import Footer from "../components/footer";
// Import the hero image
import heroImage from "../assets/homepage/one-cup-eng-hero.png";

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

// Hero Section
const HeroSection = styled.section<{ backgroundImage: string }>`
  background: url(${(props) => props.backgroundImage}) no-repeat center center;
  background-size: cover;
  color: white;
  padding: 6rem 2rem;
  position: relative;
  overflow: hidden;
  text-align: left;
`;

// Background bubbles effect
const BubbleBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 300px;
    height: 300px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    filter: blur(20px);
  }

  &::before {
    top: -100px;
    left: -50px;
    width: 600px;
    height: 600px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.12) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0) 70%
    );
  }

  &::after {
    bottom: -150px;
    right: -50px;
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.03) 60%,
      rgba(255, 255, 255, 0) 70%
    );
  }
`;

// Additional bubble elements with more dynamic movement
const Bubble = styled.div<{
  size: number;
  top: number;
  left: number;
  delay: number;
  opacity?: number;
}>`
  position: absolute;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  top: ${(props) => props.top}%;
  left: ${(props) => props.left}%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, ${(props) => props.opacity || 0.15}) 0%,
    rgba(
        255,
        255,
        255,
        ${(props) => (props.opacity ? props.opacity / 3 : 0.05)}
      )
      60%,
    rgba(255, 255, 255, 0) 70%
  );
  border-radius: 50%;
  filter: blur(${(props) => Math.min(props.size / 40, 4)}px);
  animation: float-${(props) => Math.floor(props.delay) % 4} ${(props) =>
        12 + props.delay}s ease-in-out infinite,
    pulse-${(props) => Math.floor(props.delay) % 3} ${(props) =>
        6 + props.delay / 2}s ease-in-out infinite;
  animation-delay: ${(props) => props.delay}s, ${(props) => props.delay / 2}s;

  /* Multiple animation patterns for different bubbles */
  @keyframes float-0 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    25% {
      transform: translate(30px, -25px) scale(1.08);
    }
    50% {
      transform: translate(60px, -30px) scale(1.15);
    }
    75% {
      transform: translate(30px, -10px) scale(1.08);
    }
    100% {
      transform: translate(0, 0) scale(1);
    }
  }

  @keyframes float-1 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(-35px, -30px) scale(1.1);
    }
    66% {
      transform: translate(-25px, -60px) scale(1.15);
    }
    100% {
      transform: translate(0, 0) scale(1);
    }
  }

  @keyframes float-2 {
    0% {
      transform: translate(0, 0) scale(1);
    }
    20% {
      transform: translate(25px, -20px) scale(1.05);
    }
    40% {
      transform: translate(45px, -35px) scale(1.1);
    }
    60% {
      transform: translate(25px, -60px) scale(1.12);
    }
    80% {
      transform: translate(-15px, -30px) scale(1.08);
    }
    100% {
      transform: translate(0, 0) scale(1);
    }
  }

  @keyframes float-3 {
    0% {
      transform: translate(0, 0) scale(1) rotate(0deg);
    }
    30% {
      transform: translate(-30px, -40px) scale(1.1) rotate(5deg);
    }
    50% {
      transform: translate(-45px, -30px) scale(1.15) rotate(10deg);
    }
    70% {
      transform: translate(-60px, -15px) scale(1.1) rotate(5deg);
    }
    100% {
      transform: translate(0, 0) scale(1) rotate(0deg);
    }
  }

  /* Enhanced pulsating effects */
  @keyframes pulse-0 {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  @keyframes pulse-1 {
    0%,
    100% {
      opacity: 0.9;
    }
    30% {
      opacity: 0.5;
    }
    70% {
      opacity: 0.7;
    }
  }

  @keyframes pulse-2 {
    0%,
    100% {
      opacity: 0.85;
    }
    25% {
      opacity: 1;
    }
    75% {
      opacity: 0.6;
    }
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
  text-align: left;

  /* Add text shadow for better contrast */
  & h1,
  & p {
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }
`;

const HeroTitle = styled.h1`
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  color: white;
  position: relative;
  z-index: 1;
  text-align: left;

  @media (max-width: 768px) {
    font-size: 3rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.5rem;
  line-height: 1.4;
  margin-bottom: 2.5rem;
  color: white;
  font-weight: 700;
  text-align: left;

  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

// Create a coffee cup shaped button with steam
const CoffeeButton = styled.div`
  position: relative;
  display: inline-block;
  margin-top: 1.5rem;
  cursor: pointer;
  z-index: 10;
  text-align: left;
`;

const CupShape = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  color: black;
  font-weight: 800;
  font-size: 1.2rem;
  text-decoration: none;
  width: 150px;
  height: 75px;
  border-radius: 8px 8px 35px 35px;
  position: relative;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
  transition: all 0.3s ease;
  overflow: visible;
  border: 1px solid rgba(0, 0, 0, 0.05);

  /* Cup handle */
  &::after {
    content: "";
    position: absolute;
    right: -40px;
    top: 0px;
    width: 40px;
    height: 40px;
    border: 10px solid white;
    border-radius: 25px;
    border-left: none;
    transition: all 0.3s ease;
    border-top-color: white;
    border-bottom-color: white;
    border-right-color: white;
  }

  &:hover {
    transform: translateY(-5px);
  }
`;

// Steam animation
const Steam = styled.div`
  position: absolute;
  top: 0px;
  left: 20px;
  z-index: 2;
  pointer-events: none;

  &::before,
  &::after,
  & > span {
    content: "";
    position: absolute;
    width: 10px;
    height: 35px;
    background: white;
    border-radius: 50%;
    animation: steam 3s infinite ease-in-out;
    opacity: 0.7;
    filter: blur(7px);
  }

  &::before {
    left: 30px;
    animation-delay: 0.2s;
  }

  &::after {
    left: 90px;
    animation-delay: 0.5s;
    height: 45px;
  }

  & > span {
    left: 55px;
    animation-delay: 0s;
    height: 30px;
  }

  @keyframes steam {
    0% {
      transform: translateY(0) scaleX(0.8);
      opacity: 0.7;
    }
    50% {
      transform: translateY(-35px) scaleX(1.2) rotate(5deg);
      opacity: 0.4;
    }
    100% {
      transform: translateY(-70px) scaleX(0.4) rotate(-5deg);
      opacity: 0;
    }
  }
`;

// Problem Section
const ProblemSection = styled.section`
  padding: 5rem 2rem;
  background-color: ${colors.primaryBg};
  text-align: center;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  color: ${colors.primary};
  margin-bottom: 1.5rem;
  font-weight: 700;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

// Adding card deck related components
const NewsCardDeck = styled.div`
  position: relative;
  width: 480px;
  height: 350px;
  margin: 0 auto 3rem;
  perspective: 1000px;

  @media (max-width: 768px) {
    width: 340px;
    height: 330px;
  }
`;

interface CardProps {
  index: number;
  isActive: boolean;
  isDragging: boolean;
  totalCards: number;
  zIndex: number;
}

const NewsCard = styled.div<CardProps>`
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: #f9f7f1; /* Off-white newspaper color */
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23e6e0d4' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E");
  border-radius: 10px;
  box-shadow: ${(props) =>
    props.isDragging
      ? "0 30px 50px rgba(0, 0, 0, 0.25)"
      : props.isActive
      ? "0 10px 20px rgba(0, 0, 0, 0.15)"
      : "0 2px 8px rgba(0, 0, 0, 0.08)"};
  padding: 1.5rem 1.5rem 0.8rem;
  backface-visibility: hidden;
  transform-origin: center bottom;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: ${(props) =>
    props.isDragging
      ? `translateY(150px) translateX(10px) rotate(10deg) scale(0.9)`
      : `translateY(${props.index * 2}px) rotate(${props.index * 0.8}deg)`};
  opacity: 1;
  z-index: ${(props) => (props.isDragging ? 1000 : props.zIndex)};
  border: 1px solid rgba(0, 0, 0, 0.05);
  will-change: transform;

  &:hover {
    transform: ${(props) =>
      props.isActive && !props.isDragging
        ? `translateY(${props.index * 2 - 5}px) rotate(${props.index * 0.8}deg)`
        : props.isDragging
        ? `translateY(150px) translateX(10px) rotate(10deg) scale(0.9)`
        : `translateY(${props.index * 2}px) rotate(${props.index * 0.8}deg)`};
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background-color: #1a1a1a;
  }
`;

const CardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const CardSource = styled.div`
  font-family: "Georgia", serif;
  font-weight: 700;
  color: #1a1a1a;
  font-size: 1.1rem;
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 0.8rem;
  position: relative;
  padding-bottom: 0.5rem;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 25%;
    right: 25%;
    height: 1px;
    background-color: #424242;
  }
`;

const CardTitle = styled.h3`
  font-family: "Noto Sans Korean", sans-serif;
  font-size: 1.4rem;
  color: #1a1a1a;
  margin-bottom: 1rem;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.03em;
  text-align: left;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    bottom: -0.5rem;
    left: 0;
    right: 0;
    height: 1px;
    background-color: rgba(0, 0, 0, 0.1);
  }
`;

const CardMain = styled.div`
  display: flex;
  gap: 1.2rem;
  flex: 1 1 auto;
  min-height: 0;
  margin-bottom: 0;
  height: 140px; /* Specifically set the height to match the image */
`;

const CardImage = styled.div<{ imageUrl: string }>`
  width: 140px;
  min-width: 140px;
  height: 140px;
  background-image: url(${(props) => props.imageUrl});
  background-size: cover;
  background-position: center;
  border-radius: 10px;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  /* Newspaper style image treatment */
  filter: grayscale(10%) contrast(1.1) brightness(1.05);
`;

const CardText = styled.p`
  text-align: left;
  font-family: "Georgia", serif;
  font-size: 0.95rem;
  color: #444;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  margin: 0;

  /* Newspaper-style first letter */
  &::first-letter {
    font-size: 1.2em;
    font-weight: 600;
  }

  /* Add hyphenation for newspaper feel */
  hyphens: auto;
`;

const CardDate = styled.div`
  font-family: "Georgia", serif;
  font-size: 0.8rem;
  color: #666;
  letter-spacing: 0.5px;
  text-align: right;
  padding-right: 0.2rem;
  margin-top: 0.3rem;
  font-style: italic;
`;

const SolutionStatement = styled.p`
  font-size: 1.5rem;
  color: ${colors.primary};
  font-weight: 600;
  margin-bottom: 2rem;
`;

// Features Section
const FeaturesSection = styled.section`
  padding: 5rem 2rem;
  background-color: white;
  text-align: center;
`;

const FeatureSlider = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 2rem;
  padding: 2rem 0;
  margin: 0 auto 3rem;
  max-width: 1200px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const FeatureCard = styled.div`
  min-width: 300px;
  background-color: ${colors.primaryBg};
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  text-align: left;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-10px);
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  color: ${colors.primary};
  margin-bottom: 1rem;
`;

const FeatureDescription = styled.p`
  color: ${colors.text.medium};
  line-height: 1.6;
`;

const FeatureCTA = styled.p`
  font-size: 1.2rem;
  color: ${colors.primary};
  font-weight: 600;
  margin-top: 2rem;
`;

// Testimonials Section
const TestimonialsSection = styled.section`
  padding: 5rem 2rem;
  background-color: ${colors.primaryBg};
  text-align: center;
`;

const TestimonialTabs = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
`;

const TabButton = styled.button<{ active: boolean }>`
  background-color: ${(props) => (props.active ? colors.primary : "white")};
  color: ${(props) => (props.active ? "white" : colors.primary)};
  border: 2px solid ${colors.primary};
  padding: 0.8rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: ${(props) =>
      props.active ? colors.primaryDark : colors.primaryPale};
  }
`;

const PricingTable = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 0 auto 3rem;
  max-width: 1000px;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5rem;
  }
`;

const PricingCard = styled.div`
  background-color: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-10px);
  }
`;

const PricingTitle = styled.h3`
  font-size: 1.5rem;
  color: ${colors.primary};
  margin-bottom: 1rem;
`;

const PricingPrice = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${colors.primary};
  margin-bottom: 1rem;
`;

const PricingPeriod = styled.div`
  font-size: 1rem;
  color: ${colors.text.light};
  margin-bottom: 1.5rem;
`;

const PricingFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
  text-align: left;
  width: 100%;
`;

const PricingFeature = styled.li`
  margin-bottom: 0.8rem;
  color: ${colors.text.medium};
  display: flex;
  align-items: center;

  &::before {
    content: "✓";
    color: ${colors.accent};
    margin-right: 0.5rem;
    font-weight: bold;
  }
`;

// FAQ Section
const FAQSection = styled.section`
  padding: 5rem 2rem;
  background-color: white;
  text-align: center;
`;

const FAQContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const FAQItem = styled.div`
  margin-bottom: 1.5rem;
  border: 1px solid ${colors.primaryPale};
  border-radius: 10px;
  overflow: hidden;
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

  &::after {
    content: "${(props) => (props.isOpen ? "−" : "+")}";
    font-size: 1.5rem;
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
`;

// Standard button for other sections
const SubscribeButton = styled(Link)`
  display: inline-block;
  background-color: white;
  color: black;
  font-weight: 700;
  padding: 1rem 2.5rem;
  border-radius: 20px;
  text-decoration: none;
  font-size: 1.4rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);

  &:hover {
    background-color: rgba(255, 255, 255, 0.9);
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
`;

// Define styled component for page wrapper
const PageWrapper = styled.div`
  padding-top: 60px; /* Add padding to account for fixed navbar */
  @media (max-width: 768px) {
    padding-top: 50px;
  }
`;

export default function Home() {
  const [activeTab, setActiveTab] = useState<"IT" | "Business">("IT");
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previousCardIndex, setPreviousCardIndex] = useState<number | null>(
    null
  );
  const [isPaused, setIsPaused] = useState(false);

  // Reference to store the timer ID
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sample news data - replace with your actual content
  const newsCards = [
    {
      date: "2024-12-21",
      title: "트럼프, EU에 미국산 석유와 가스를 구매하지 않으면 관세 경고",
      content:
        "Donald Trump emphasizes the necessity for the European Union to address its significant trade imbalance with the United States, urging European leaders to boost their purchases of American oil and gas to avoid punitive tariffs.",
      source: "Wall Street Journal",
      image:
        "https://images.unsplash.com/photo-1580128660010-fd027e1e587a?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=400&q=80",
    },
    {
      date: "2024-12-02",
      title: "오픈AI, 사용자 수 10억 명 노린다",
      content:
        "Adding momentum to OpenAI's aspirations, SoftBank Group Corp is preparing to enhance its stake in the company with a substantial investment potentially reaching $1.5 billion. Such financial backing signals strong confidence in OpenAI's innovative capabilities and market prospects.",
      source: "New York Times",
      image:
        "https://images.unsplash.com/photo-1676299081847-824916de030a?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=400&q=80",
    },
    {
      date: "2024-10-26",
      title: "일론 머스크, 매출 반등 언급 후 테슬라 주가 22% 급등",
      content:
        "Tesla's narrative as more than just a car manufacturer continues to evolve, even as it faces skepticism regarding its ambitious robotaxi plans. Investors should remain cautious about the company's promises in this emerging sector.",
      source: "Bloomberg",
      image:
        "https://images.unsplash.com/photo-1617704548623-340376564e68?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=400&q=80",
    },
    {
      date: "2023-05-07",
      title: "Renewable Energy Investments Surge",
      content:
        "Investment in renewable energy infrastructure has reached record levels this quarter. Analysts project this trend will continue as countries pursue ambitious climate goals.",
      source: "Reuters",
      image:
        "https://images.unsplash.com/photo-1716967318503-05b7064afa41?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=400&q=80",
    },
    {
      date: "2023-05-06",
      title: "AI Adoption Accelerates in Finance",
      content:
        "Financial institutions are increasingly implementing AI solutions to streamline operations and enhance customer experiences. Early adopters report significant efficiency gains.",
      source: "The Economist",
      image:
        "https://images.unsplash.com/photo-1488229297570-58520851e868?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&h=400&q=80",
    },
  ];

  const handleCardClick = () => {
    // Don't allow clicking if animation is in progress
    if (isDragging) return;

    // Pause the automatic animation for a while when user interacts
    setIsPaused(true);

    // Resume after 6 seconds of inactivity (2 animation cycles)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setTimeout(() => {
      setIsPaused(false);
    }, 6000);

    animateNextCard();
  };

  const animateNextCard = () => {
    // Store the current active card index as the one to animate
    setPreviousCardIndex(activeCardIndex);
    setIsDragging(true);

    // Change to next card immediately, but only animate the previous one
    setActiveCardIndex((prevIndex) => (prevIndex + 1) % newsCards.length);

    // Clear the animation state after animation completes
    setTimeout(() => {
      setPreviousCardIndex(null);
      setIsDragging(false);
    }, 500);
  };

  // Set up automatic animation
  React.useEffect(() => {
    // Function to handle the automatic card animation
    const autoAnimate = () => {
      if (!isPaused && !isDragging) {
        animateNextCard();
      }

      // Schedule the next animation
      timerRef.current = setTimeout(autoAnimate, 3000);
    };

    // Start the automatic animation
    timerRef.current = setTimeout(autoAnimate, 3000);

    // Cleanup function to clear the timeout when component unmounts
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPaused, isDragging, activeCardIndex]);

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
        "영어 한잔은 다양한 레벨의 사용자를 위해 설계되었습니다. 초보자부터 고급자까지 모두 이용 가능하며, 각자의 수준에 맞게 콘텐츠를 제공합니다.",
    },
    {
      question: "모바일에서도 이용 가능한가요?",
      answer:
        "네, 영어 한잔은 모바일 환경에 최적화되어 있어 스마트폰이나 태블릿에서도 편리하게 이용할 수 있습니다.",
    },
  ];

  return (
    <PageWrapper>
      <GNB />
      {/* Hero Section */}
      <HeroSection backgroundImage={heroImage}>
        <BubbleBackground>
          <Bubble size={200} top={20} left={20} delay={0} opacity={0.25} />
          <Bubble size={150} top={60} left={70} delay={2} opacity={0.22} />
          <Bubble size={180} top={30} left={60} delay={1} opacity={0.24} />
          <Bubble size={120} top={70} left={30} delay={3} opacity={0.28} />
          <Bubble size={250} top={10} left={80} delay={2} opacity={0.2} />
          <Bubble size={140} top={80} left={50} delay={2.5} opacity={0.26} />
        </BubbleBackground>
          <HeroContent>
            <HeroTitle>영어 한잔</HeroTitle>
            <HeroSubtitle>
              아메리카노 한잔 값으로 배우는 비즈니스 영어
            </HeroSubtitle>
            <CoffeeButton>
              <Steam>
                <span></span>
              </Steam>
              <CupShape to="/auth">Start Now</CupShape>
            </CoffeeButton>
          </HeroContent>
      </HeroSection>

      {/* Problem Section */}
      <ProblemSection>
          <SectionTitle>
            영미권 엘리트의 관심사, 궁금하지 않으신가요?
          </SectionTitle>
          <SolutionStatement>
            저희도 그랬습니다. 그래서 '영어 한잔'을 만들었습니다.
          </SolutionStatement>

          {/* Replace ProblemList with NewsCardDeck */}
          <NewsCardDeck>
            {newsCards.map((card, index) => {
              // Calculate if this card should be active based on current activeCardIndex
              const cardPosition =
                (index - activeCardIndex + newsCards.length) % newsCards.length;
              const isActive = cardPosition === 0;
              // Only animate the card that was previously active
              const isAnimating =
                previousCardIndex !== null && index === previousCardIndex;

              return (
                <NewsCard
                  key={index}
                  index={cardPosition}
                  isActive={isActive}
                  isDragging={isAnimating}
                  totalCards={newsCards.length}
                  zIndex={newsCards.length - cardPosition}
                  onClick={isActive ? handleCardClick : undefined}
                >
                  <CardWrapper>
                    <CardSource>{card.source}</CardSource>
                    <CardTitle>{card.title}</CardTitle>
                    <CardMain>
                      <CardImage imageUrl={card.image} />
                      <CardText>{card.content}</CardText>
                    </CardMain>
                    <CardDate>{card.date}</CardDate>
                  </CardWrapper>
                </NewsCard>
              );
            })}
          </NewsCardDeck>
      </ProblemSection>

      {/* Features Section */}
      <FeaturesSection>
          <SectionTitle>하루 5분, 내 영어 실력을 바꾸는 시간</SectionTitle>
          <FeatureSlider>
            <FeatureCard>
              <FeatureTitle>최신 영어 토픽</FeatureTitle>
              <FeatureDescription>
                Fortune 500 기업 임원들이 가장 즐겨 읽는 Wall Street Journal,
                Financial Times에서 이 순간 가장 핫한 영어 토픽을 기반으로
                콘텐츠를 제작합니다.
              </FeatureDescription>
            </FeatureCard>
            <FeatureCard>
              <FeatureTitle>속독 모드</FeatureTitle>
              <FeatureDescription>
                본문을 쉽게 읽을 수 있도록 도와주는 속독 모드로 빠르게 내용을
                파악할 수 있습니다.
              </FeatureDescription>
            </FeatureCard>
            <FeatureCard>
              <FeatureTitle>한글 번역 및 단어 정리</FeatureTitle>
              <FeatureDescription>
                한글 번역 및 주요 단어 정리까지 제공하여 더욱 효과적인 학습이
                가능합니다.
              </FeatureDescription>
            </FeatureCard>
          </FeatureSlider>
          <FeatureCTA>
            하루 5분으로 영어 실력과 글로벌 감각을 동시에 키워보세요!
          </FeatureCTA>
      </FeaturesSection>

      {/* Testimonials Section */}
      <TestimonialsSection>
          <SectionTitle>이용 후기</SectionTitle>
          <TestimonialTabs>
            <TabButton
              active={activeTab === "IT"}
              onClick={() => setActiveTab("IT")}
            >
              IT
            </TabButton>
            <TabButton
              active={activeTab === "Business"}
              onClick={() => setActiveTab("Business")}
            >
              Business
            </TabButton>
          </TestimonialTabs>
          <PricingTable>
            <PricingCard>
              <PricingTitle>30일</PricingTitle>
              <PricingPrice>4,500원</PricingPrice>
              <PricingPeriod>월</PricingPeriod>
              <PricingFeatures>
                <PricingFeature>하루 5분 영어 학습</PricingFeature>
                <PricingFeature>최신 영어 토픽 제공</PricingFeature>
                <PricingFeature>속독 모드</PricingFeature>
                <PricingFeature>한글 번역 및 단어 정리</PricingFeature>
              </PricingFeatures>
              <SubscribeButton to="/payment">지금 구독하기</SubscribeButton>
            </PricingCard>
            <PricingCard>
              <PricingTitle>90일</PricingTitle>
              <PricingPrice>12,500원</PricingPrice>
              <PricingPeriod>3개월</PricingPeriod>
              <PricingFeatures>
                <PricingFeature>하루 5분 영어 학습</PricingFeature>
                <PricingFeature>최신 영어 토픽 제공</PricingFeature>
                <PricingFeature>속독 모드</PricingFeature>
                <PricingFeature>한글 번역 및 단어 정리</PricingFeature>
                <PricingFeature>학습 진도 추적</PricingFeature>
              </PricingFeatures>
              <SubscribeButton to="/payment">지금 구독하기</SubscribeButton>
            </PricingCard>
            <PricingCard>
              <PricingTitle>180일</PricingTitle>
              <PricingPrice>24,000원</PricingPrice>
              <PricingPeriod>6개월</PricingPeriod>
              <PricingFeatures>
                <PricingFeature>하루 5분 영어 학습</PricingFeature>
                <PricingFeature>최신 영어 토픽 제공</PricingFeature>
                <PricingFeature>속독 모드</PricingFeature>
                <PricingFeature>한글 번역 및 단어 정리</PricingFeature>
                <PricingFeature>학습 진도 추적</PricingFeature>
                <PricingFeature>맞춤형 학습 추천</PricingFeature>
              </PricingFeatures>
              <SubscribeButton to="/payment">지금 구독하기</SubscribeButton>
            </PricingCard>
          </PricingTable>
      </TestimonialsSection>

      {/* FAQ Section */}
      <FAQSection>
          <SectionTitle>자주 묻는 질문</SectionTitle>
          <FAQContainer>
            {faqs.map((faq, index) => (
              <FAQItem key={index}>
                <FAQQuestion
                  onClick={() => toggleFAQ(index)}
                  isOpen={openFAQ === index}
                >
                  {faq.question}
                </FAQQuestion>
                <FAQAnswer isOpen={openFAQ === index}>{faq.answer}</FAQAnswer>
              </FAQItem>
            ))}
          </FAQContainer>
      </FAQSection>

      {/* Using the imported Footer component */}
      <Footer />
    </PageWrapper>
  );
}
