import { useState, useEffect, useRef } from "react";
import styled, { createGlobalStyle, css } from "styled-components";
import React from "react";
import GNB from "../components/gnb";
import Footer from "../components/footer";

import heroBg from "../assets/homepage/hero_bg.jpg";
import wstPaper from "../assets/homepage/wst_paper.png";
import coffeeImage from "../assets/homepage/coffee_cup.png";
import kakaoLogo from "../assets/homepage/kakao_logo.png";
import kakaoNotification from "../assets/homepage/kakao_notification.png";
import meetupImage from "../assets/homepage/meetup.jpg";
import featureCard1 from "../assets/homepage/feature_card_1.png";
import featureCard2 from "../assets/homepage/feature_card_2.png";
import featureCard3 from "../assets/homepage/feature_card_3.png";
import oneCupCup from "../assets/homepage/1cup_cup.png";
import ceosImage from "../assets/homepage/ceos.png";

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
const HeroSection = styled.section<{ backgroundImage: string }>`
  background: url(${(props) => props.backgroundImage}) no-repeat center center;
  background-size: cover;
  color: white;
  padding: 6rem 0;
  position: relative;
  overflow: hidden;
  max-height: 450px;
  min-height: 450px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    min-height: 600px;
    background-size: cover;
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
    margin-bottom: 1rem;
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
    margin-top: 30px;
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
    text-align: center;
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
  bottom: -190px;
  width: 500px;
  z-index: 0;

  @media (max-width: 768px) {
    display: none;
  }
`;

const CoffeeImage = styled.img`
  position: absolute;
  height: auto;
  right: 260px;
  bottom: 30px;
  width: 220px;
  z-index: 1;

  @media (max-width: 768px) {
    display: none;
  }
`;

const CoffeeSteam = styled.div`
  position: absolute;
  right: 430px;
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

  @media (max-width: 768px) {
    display: none;
  }
`;

const KakaoContainer = styled.div`
  position: absolute;
  right: 0px;
  top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
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
    display: flex;
    justify-content: flex-start;
    width: 100%;
    animation: floatingLogo 6s ease-in-out infinite;
    will-change: transform;
  }

  @media (max-width: 768px) {
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    top: 10px;
    gap: 12px;
    transform-origin: center top;
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

// Problem Section
const ProblemSection = styled.section`
  ${SectionBase}
  background-color: ${colors.primaryBg};
  text-align: center;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding-top: 4rem;
    padding-bottom: 4rem;
  }
`;

const ProblemImageContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 700px;
  margin: 2rem auto 0;
  height: auto;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: linear-gradient(
      to bottom,
      rgba(253, 249, 246, 0),
      rgba(253, 249, 246, 0.85)
    );
    pointer-events: none;
    z-index: 2;
  }

  @media (max-width: 768px) {
    max-width: 85%;
  }
`;

const ProblemImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.8s ease-out, opacity 0.8s ease-out;
  will-change: transform, opacity;
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: ${colors.primary};
  margin-bottom: 1.5rem;
  font-weight: 800;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    font-size: 1.8rem;
    padding: 0 10px;
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
  max-width: 850px;
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
  max-width: 800px;
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

  @media (max-width: 768px) {
    padding: ${(props) => (props.isOpen ? "1rem" : "0 1rem")};
    font-size: 0.9rem;
    line-height: 1.5;
  }
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

export default function Home() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const problemSectionRef = useRef<HTMLElement>(null);

  // Reference to store the timer ID
  const featureTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Set up scroll animation
  useEffect(() => {
    const handleScroll = () => {
      if (!problemSectionRef.current) return;

      const image = problemSectionRef.current.querySelector("img");
      if (!image) return;

      const rect = problemSectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // When the section starts entering the viewport
      if (rect.top < windowHeight * 0.75) {
        const scrollProgress = Math.min(
          1,
          (windowHeight * 0.75 - rect.top) / (windowHeight * 0.25)
        );

        // Apply the animation effect as user scrolls
        image.style.transform = `translateY(${50 - scrollProgress * 50}px)`;
        image.style.opacity = `${scrollProgress}`;
      } else {
        // Reset when out of view
        image.style.transform = "translateY(50px)";
        image.style.opacity = "0";
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
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
        "영어 한잔은 다양한 레벨의 사용자를 위해 설계되었습니다. 초보자부터 고급자까지 모두 이용 가능하며, 각자의 수준에 맞게 콘텐츠를 제공합니다.",
    },
    {
      question: "모바일에서도 이용 가능한가요?",
      answer:
        "네, 영어 한잔은 모바일 환경에 최적화되어 있어 스마트폰이나 태블릿에서도 편리하게 이용할 수 있습니다.",
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
      <GNB />
      {/* Hero Section */}
      <HeroSection backgroundImage={heroBg}>
        <HeroContent>
          <HeroTextContent>
            <HeroTitle>영어 한잔</HeroTitle>
            <HeroSubtitle>
              매일 아침 영어 한잔으로
              <br />
              배우는 비즈니스 영어
            </HeroSubtitle>
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
      <ProblemSection ref={problemSectionRef}>
        <SectionTitle>전세계 상위 1%가 가장 주목하는 토픽</SectionTitle>
        <ProblemImageContainer>
          <ProblemImage
            src={ceosImage}
            alt="World's Top CEOs"
            style={{ transform: "translateY(50px)", opacity: 0 }}
          />
        </ProblemImageContainer>
      </ProblemSection>

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
        <div style={{ position: "relative", zIndex: 3 }}>
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
        </div>

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
