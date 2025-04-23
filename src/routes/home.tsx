import { useState } from "react";
import styled, { createGlobalStyle } from "styled-components";
import React from "react";
import GNB from "../components/gnb";
import Footer from "../components/footer";

import heroBg from "../assets/homepage/hero_bg.jpg";
import wstPaper from "../assets/homepage/wst_paper.png";
import coffeeImage from "../assets/homepage/coffee_cup.png";
import coffeeTakeout from "../assets/homepage/coffee_takeout.png";
import kakaoLogo from "../assets/homepage/kakao_logo.png";
import kakaoNotification from "../assets/homepage/kakao_notification.png";
import meetupImage from "../assets/homepage/meetup.jpg";

// Add global style for Noto Sans KR font
const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
  
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

// Hero Section
const HeroSection = styled.section<{ backgroundImage: string }>`
  background: url(${(props) => props.backgroundImage}) no-repeat center center;
  background-size: cover;
  color: white;
  padding: 6rem 0;
  position: relative;
  overflow: hidden;
  max-height: 450px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    min-height: 500px;
    padding: 4rem 0;
  }
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 850px;
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

const HeroTextContent = styled.div`
  position: absolute;
  left: 20px;
  top: 15%;
  max-width: 300px;
  z-index: 2;

  @media (max-width: 768px) {
    position: relative;
    left: auto;
    top: 0;
    transform: none;
    max-width: 100%;
    text-align: center;
    margin-bottom: 2rem;
  }
`;

const HeroTitle = styled.h1`
  font-size: 3.6rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: #ffffff;
  position: relative;
  z-index: 1;
  text-align: left;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 3rem;
    text-align: center;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.5rem;
  line-height: 1.5;
  color: #ffffff;
  font-weight: 700;
  text-align: left;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.3rem;
    text-align: center;
    margin-bottom: 2rem;
  }

  @media (max-width: 480px) {
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
`;

const HeroImagesWrapper = styled.div`
  position: absolute;
  width: 450px;
  height: 100%;
  right: 20px;
  top: 0;

  @media (max-width: 768px) {
    position: relative;
    width: 100%;
    height: 280px;
    right: auto;
    display: flex;
    justify-content: center;
  }
`;

const WSTPaperImage = styled.img`
  position: absolute;
  height: auto;
  right: 400px;
  bottom: -180px;
  width: 500px;
  z-index: 0;

  @media (max-width: 768px) {
    width: 220px;
    left: 20px;
  }
`;

const CoffeeImage = styled.img`
  position: absolute;
  height: auto;
  right: 280px;
  bottom: 30px;
  width: 220px;
  z-index: 1;

  @media (max-width: 768px) {
    width: 180px;
    right: 20px;
  }
`;

const CoffeeSteam = styled.div`
  position: absolute;
  right: 450px;
  bottom: 240px;
  z-index: 2;
  pointer-events: none;

  &::before,
  &::after,
  & > span {
    content: "";
    position: absolute;
    width: 8px;
    height: 40px;
    background: white;
    border-radius: 50%;
    animation: steam 3s infinite ease-in-out;
    opacity: 0.8;
    filter: blur(7px);
  }

  &::before {
    left: 20px;
    animation-delay: 0.2s;
  }

  &::after {
    left: 60px;
    animation-delay: 0.5s;
    height: 35px;
  }

  & > span {
    left: 40px;
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

const KakaoContainer = styled.div`
  position: absolute;
  right: 0px;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 3;
  animation: floatingKakao 5s ease-in-out infinite;
  will-change: transform;

  @keyframes floatingKakao {
    0% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-8px);
    }
    100% {
      transform: translateY(0px);
    }
  }

  .kakao-logo-wrapper {
    animation: floatingLogo 6s ease-in-out infinite;
    will-change: transform;
  }

  @media (max-width: 768px) {
    right: -20px;
    gap: 15px;
    animation-duration: 4s;

    @keyframes floatingKakao {
      0% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-5px);
      }
      100% {
        transform: translateY(0px);
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
    max-width: ${(props) => (props.isNotification ? "70px" : "50px")};
  }
`;

const KakaoNotificationContainer = styled.div`
  position: relative;
  display: inline-block;
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
  left: 10px;
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
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    font-size: 0.7rem;
    padding: 4px 10px;
    top: 25px;
    left: 50%;
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
  font-family: "Noto Sans KR", sans-serif;

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
  font-family: "Noto Sans KR", sans-serif;
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
  font-family: "Noto Sans KR", sans-serif;
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
  font-family: "Noto Sans KR", sans-serif;
`;

const FeatureDescription = styled.p`
  color: ${colors.text.medium};
  line-height: 1.6;
  font-family: "Noto Sans KR", sans-serif;
`;

const FeatureCTA = styled.p`
  font-size: 1.2rem;
  color: ${colors.primary};
  font-weight: 600;
  margin-top: 2rem;
  font-family: "Noto Sans KR", sans-serif;
`;

// Pricing Section with Coffee Cup design
const PricingSection = styled.section`
  padding: 5rem 2rem;
  background-color: ${colors.primaryBg};
  text-align: center;
  position: relative;
  overflow: hidden;
`;

const PricingSectionTitle = styled.h2`
  font-size: 2.5rem;
  color: ${colors.primary};
  margin-bottom: 1.5rem;
  font-weight: 700;
  position: relative;
  display: inline-block;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const PricingSubtitle = styled.p`
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.5;
  color: ${colors.text.medium};
  margin-bottom: 2.5rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  font-family: "Noto Sans KR", sans-serif;
`;

const CoffeeCupImageContainer = styled.div`
  position: relative;
  width: 150px;
  margin: 0 auto 2rem;
`;

const CoffeeCupImg = styled.img`
  width: 100%;
  filter: drop-shadow(0 10px 15px rgba(44, 24, 16, 0.2));
`;

const SteamAnimation = styled.div`
  position: absolute;
  top: 0;
  left: 30px;
  right: 30px;

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 25px;
    background: white;
    border-radius: 50%;
    animation: steam 3s infinite ease-out;
    opacity: 0;
    filter: blur(5px);
  }

  &::before {
    left: 15px;
    animation-delay: 0.3s;
  }

  &::after {
    right: 15px;
    animation-delay: 0.6s;
    height: 35px;
  }

  @keyframes steam {
    0% {
      transform: translateY(0) scaleX(1);
      opacity: 0;
    }
    15% {
      opacity: 0.8;
    }
    50% {
      transform: translateY(-20px) scaleX(1.2);
      opacity: 0.4;
    }
    100% {
      transform: translateY(-40px) scaleX(0.6);
      opacity: 0;
    }
  }
`;

const PricingTabs = styled.div`
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
  font-family: "Noto Sans KR", sans-serif;

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
  font-family: "Noto Sans KR", sans-serif;
`;

// Define styled component for page wrapper
const PageWrapper = styled.div`
  padding-top: 60px; /* Add padding to account for fixed navbar */
  @media (max-width: 768px) {
    padding-top: 50px;
  }
`;

// MeetupSection styled component
const MeetupSection = styled.section`
  background-color: #181818;
  color: white;
  padding: 4rem 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;

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
`;

const MeetupSubtitle = styled.p`
  font-size: 1.6rem;
  margin-bottom: 2.5rem;
  font-weight: 600;
  color: #ddd;
  animation: fadeIn 1.5s ease-in-out;
  position: relative;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  font-family: "Noto Sans KR", sans-serif;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  line-height: 1.8;
  gap: 0.5rem;

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
`;

const MeetupImageContainer = styled.div`
  position: relative;
  max-width: 500px;
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
`;

const MeetupImage = styled.img`
  width: 100%;
  display: block;
  object-fit: cover;
  transform: translateY(-100px);
  transition: transform 0.3s ease;
  will-change: transform;

  ${MeetupImageContainer}:hover & {
    transform: translateY(-105px);
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
      <GlobalStyle />
      <GNB />
      {/* Hero Section */}
      <HeroSection backgroundImage={heroBg}>
        <HeroContent>
          <HeroTextContent>
            <HeroTitle>영어 한잔</HeroTitle>
            <HeroSubtitle>매일 아침 영어 한잔으로</HeroSubtitle>
            <HeroSubtitle>배우는 비즈니스 영어</HeroSubtitle>
          </HeroTextContent>

          <HeroImagesWrapper>
            <WSTPaperImage src={wstPaper} alt="WST Paper" />
            <CoffeeImage src={coffeeImage} alt="Coffee Cup" />
            <CoffeeSteam>
              <span></span>
            </CoffeeSteam>
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
                  href="https://1cupenglish.com/article/pK4BueOBgvHckajctRMH"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  아티클 확인하기
                </KakaoNotificationButton>
              </KakaoNotificationContainer>
            </KakaoContainer>
          </HeroImagesWrapper>
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

      {/* Pricing Section */}
      <PricingSection>
        <PricingSectionTitle>
          이 모든 것을 아메리카노 가격에 연동
        </PricingSectionTitle>
        <PricingTabs>
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
        </PricingTabs>
        <CoffeeCupImageContainer>
          <CoffeeCupImg src={coffeeTakeout} alt="Coffee Cup" />
          <SteamAnimation />
        </CoffeeCupImageContainer>
        <PricingSubtitle>4,500원으로 30일 간 마음껏 즐기세요.</PricingSubtitle>
      </PricingSection>

      {/* Meetup Section */}
      <MeetupSection>
        <MeetupTitle>AI 시대, 찐 커뮤니케이션 실력이 중요합니다</MeetupTitle>
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
