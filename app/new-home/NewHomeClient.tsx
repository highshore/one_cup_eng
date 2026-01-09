"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";
import { colors } from "../lib/constants/colors";
import React from "react";
// GNB and Footer are now handled by the layout
import { useGnb } from "../lib/contexts/gnb_context";

// Imports for Meetup Event Display
import { useRouter } from "next/navigation";
import { MeetupEvent } from "../lib/features/meetup/types/meetup_types";
import { fetchUpcomingMeetupEvents } from "../lib/features/meetup/services/meetup_service";
import { fetchUserProfiles, UserProfile } from "../lib/features/meetup/services/user_service";
import {
  formatEventDateTime,
  formatEventTitleWithCountdown,
  isEventLocked,
} from "../lib/features/meetup/utils/meetup_helpers";
import { PinIcon, CalendarIcon } from "../lib/features/meetup/components/meetup_icons";
import { UserAvatarStack } from "../lib/features/meetup/components/user_avatar";
import StatsSection from "../lib/features/home/components/StatsSection";
import { HomeStats } from "../lib/features/home/services/stats_service";
import TopicsShowcase from "../lib/features/home/components/TopicsShowcase";
import { HomeTopicArticle } from "../lib/features/home/services/topics_service";
import {
  AcademicCapIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  PhotoIcon,
  RocketLaunchIcon,
  SparklesIcon,
  UsersIcon,
  MapPinIcon,
  CalendarIcon as CalendarIconOutline,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleIconSolid } from "@heroicons/react/24/solid";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db as clientDb } from "../lib/firebase/firebase";
import NewNavbar from "./components/NewNavbar";
import { useI18n } from "../lib/i18n/I18nProvider";

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
  padding: clamp(6rem, 5vw, 7.5rem) 0; /* Reduced vertical padding */
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;

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
    padding: clamp(6rem, 14vw, 5.5rem) 0 clamp(6rem, 30vw, 9rem);
    display: block; /* Stack on mobile */
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

const MobileBreak = styled.br`
  display: none;
  @media (max-width: ${breakpoints.mobile}) {
    display: block;
  }
`;

interface MemberProfile {
  id: string;
  label: string;
  bio: string;
  highlights: string[];
  linkedInUrl?: string;
  image?: string;
  background: string;
  accent: string;
  accentSoft: string;
  initials: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface PricingBenefit {
  title: string;
  description: string;
}

const SectionTitle = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  color: #0f172a;
  margin-bottom: 1.5rem;
  line-height: 1.2;
  font-family: "Noto Sans KR", sans-serif;
  text-align: center;
`;

const Highlight = styled.span`
  color: rgb(99, 0, 33);
`;

// Members Section
const MembersSection = styled.section`
  ${SectionBase}
  background: #f8fafc;
  height: 900px;
  display: flex;
  align-items: flex-start;
  padding: 0;
  overflow: hidden;

  @media (max-width: 1024px) {
    height: auto;
    min-height: auto;
    padding: clamp(4.5rem, 8vw, 6rem) 0 clamp(4rem, 8vw, 6rem);
    overflow: visible;
    align-items: stretch;
  }
`;

const MembersInner = styled.div`
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: clamp(2rem, 4vw, 3rem);
  padding: 0 1.5rem;
  width: 100%;

  @media (max-width: 768px) {
    padding: 0 1.25rem;
  }
`;

const MembersHeading = styled(SectionTitle)`
  text-align: center;
  margin: 0;
  color: #0f172a;
`;

const MembersIntro = styled.p`
  font-size: 1rem;
  color: #6b7280;
  margin: 0.5rem auto 0;
  max-width: 640px;
  line-height: 1.5;
  text-align: center;
`;

const MembersLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const MemberVisualPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const MemberVisualCard = styled.div<{ $background: string }>`
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  width: 100%;
  background: ${(props) => props.$background};
  display: flex;
  align-items: stretch;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
`;

const MemberVisualMedia = styled.div`
  position: relative;
  flex: 1;
`;

const MemberVisualImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MemberVisualFallback = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(2rem, 5vw, 2.6rem);
  font-weight: 700;
  color: rgba(248, 250, 252, 0.9);
`;


const MembersAccordion = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MemberAccordionItem = styled.div<{ $isActive: boolean }>`
  border-radius: 18px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid
    ${(props) => (props.$isActive ? colors.primary : "rgba(229, 231, 235, 1)")};
  box-shadow: ${(props) =>
    props.$isActive
      ? "0 18px 42px rgba(15, 23, 42, 0.12)"
      : "0 8px 22px rgba(15, 23, 42, 0.08)"};
  transition: all 0.25s ease;
`;

const MemberAccordionHeader = styled.button<{ $accent: string; $accentSoft: string; $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: ${(props) => (props.$isActive ? "1.5rem" : "1rem 1.5rem")};
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: padding 0.25s ease;

  @media (max-width: 768px) {
    padding: ${(props) => (props.$isActive ? "1.3rem" : "0.9rem 1.3rem")};
  }
`;

const MemberIconCircle = styled.span<{ $accent: string; $accentSoft: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${(props) => props.$accentSoft};
  color: ${(props) => props.$accent};

  svg {
    width: 20px;
    height: 20px;
  }
`;

const MemberHeaderTitle = styled.span`
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.4;
  flex: 1;
`;

const MemberAccordionContent = styled.div<{ $isActive: boolean }>`
  max-height: ${(props) => (props.$isActive ? "550px" : "0")};
  overflow: hidden;
  transition: max-height 0.35s ease;
`;

const MemberAccordionBody = styled.div`
  padding: 0 1.5rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (max-width: 768px) {
    padding: 0 1.3rem 1.3rem;
  }
`;

const MemberName = styled.h4`
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
`;

const MemberBio = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: #4b5563;
  line-height: 1.65;
`;

const MemberHighlights = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MemberHighlight = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  font-size: 0.92rem;
  color: #1f2937;
  line-height: 1.5;
`;

const MemberHighlightIcon = styled.span<{ $accent: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.2rem;
  color: ${(props) => props.$accent};

  svg {
    width: 18px;
    height: 18px;
  }
`;

const LinkedInButton = styled.a<{ $accent: string; $accentSoft: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: ${(props) => props.$accentSoft};
  color: ${(props) => props.$accent};
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  border: 1px solid ${(props) => props.$accent}33;

  &:hover {
    background: ${(props) => props.$accent};
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${(props) => props.$accent}40;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

// --- New Membership Section Styles ---
const MembershipSectionContainer = styled.div`
  padding: 5rem 0;
  background: #ffffff;
`;

const MembershipWrapper = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.25rem; /* 20px padding on left/right always */
`;

const MembershipCard = styled.div`
  background: #0f172a;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  isolation: isolate;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const DecorBlob = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  margin-right: -5rem;
  margin-top: -5rem;
  width: 20rem;
  height: 20rem;
  background: rgb(128, 0, 33);
  border-radius: 9999px;
  opacity: 0.15;
  filter: blur(80px);
  z-index: 0;
  pointer-events: none;
`;

const MembershipGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  
  @media (min-width: 768px) {
    grid-template-columns: 1.2fr 1fr;
  }
`;

const LeftCol = styled.div`
  padding: 3rem;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  z-index: 1;

  @media (min-width: 768px) {
    padding: 4rem;
    padding-right: 2rem;
  }
`;

const RightCol = styled.div`
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(30, 41, 59, 0.6) 100%);
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  z-index: 1;
  border-left: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);

  @media (min-width: 768px) {
    padding: 3.5rem;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: -20%;
    right: -20%;
    width: 140%;
    height: 140%;
    background: radial-gradient(circle at 50% 50%, rgba(128, 0, 33, 0.15) 0%, transparent 60%);
    z-index: -1;
    pointer-events: none;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.35rem 1rem;
  background: rgba(128, 0, 33, 0.2);
  color: rgb(255, 100, 130);
  border: 1px solid rgba(128, 0, 33, 0.4);
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 9999px;
  margin-bottom: 1.5rem;
  width: max-content;
  letter-spacing: 0.05em;
`;

const Heading = styled.h2`
  font-size: 2.25rem;
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.2;
  color: white;
  letter-spacing: -0.02em;
`;

const Description = styled.p`
  color: #9ca3af; /* gray-400 */
  margin-bottom: 2.5rem;
  line-height: 1.7;
  font-size: 1.05rem;
`;

const CtaButton = styled.button`
  background: rgb(128, 0, 33);
  color: white;
  font-weight: 700;
  padding: 1rem 2.5rem;
  border-radius: 9999px;
  transition: all 0.2s;
  box-shadow: 0 10px 15px -3px rgba(128, 0, 33, 0.3);
  width: max-content;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;

  &:hover {
    background: rgb(150, 0, 40);
    transform: translateY(-2px);
    box-shadow: 0 15px 20px -3px rgba(128, 0, 33, 0.4);
  }
`;

const ComparisonChart = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
  transform: perspective(1000px) rotateY(-5deg);
  transition: transform 0.5s ease;
  
  &:hover {
    transform: perspective(1000px) rotateY(0deg) scale(1.02);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 768px) {
    transform: none;
    &:hover {
      transform: none;
    }
  }
`;

const ChartTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1.5rem;
  text-align: center;
  letter-spacing: -0.01em;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.9rem;
  font-weight: 600;
  color: #9ca3af;
`;

const CostBarContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const CostItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CostLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: #e5e7eb;
  font-weight: 500;
`;

const CostBarWrapper = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  overflow: hidden;
`;

const CostBar = styled.div<{ $width: string; $color: string }>`
  height: 100%;
  width: ${props => props.$width};
  background: ${props => props.$color};
  border-radius: 9999px;
`;

const CostValue = styled.span<{ $highlight?: boolean }>`
  color: ${props => props.$highlight ? 'rgb(255, 100, 130)' : '#9ca3af'};
  font-weight: ${props => props.$highlight ? '700' : '400'};
  font-size: 0.85rem;
`;

// --- Hero Section 2-Column Styles ---
const HeroGrid = styled.div`
  max-width: 960px; /* Changed from 1024px to 960px to match content width */
  width: 100%;
  margin: 0 auto;
  display: grid;
  gap: 3rem;
  align-items: center;
  position: relative;
  z-index: 2;
  padding: 0 1.5rem; /* Add horizontal padding (24px) */
  
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
  }

  @media (max-width: 768px) {
    padding: 0 1.25rem; /* 20px padding on mobile */
  }
`;

const HeroLeft = styled.div`
  text-align: left;
  z-index: 10;
  
  @media (max-width: 768px) {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;

const HeroTitle = styled.h1`
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.2;
  color: white;
  margin-bottom: 1.5rem;
  white-space: pre-wrap;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const HeroSubtitle = styled.p`
  font-size: clamp(1.05rem, 1.8vw, 1.25rem);
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2.5rem;
  font-weight: 500;
  line-height: 1.6;
  max-width: 500px;
  white-space: pre-wrap;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const HeroRight = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0 clamp(1.25rem, 3vw, 1.5rem);
  
  @media (max-width: 768px) {
    margin-top: 2rem;
  }
`;

const StackContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 380px;
  display: grid;
  grid-template-columns: 1fr;
  justify-items: stretch;
  
  @media (max-width: 768px) {
    max-width: 320px;
  }
`;

const StackCardWrapper = styled.div<{
  $position: number;
  $isAnimating?: boolean;
  $isInteractive?: boolean;
}>`
  position: relative;
  grid-area: 1 / 1;
  transform-origin: center top;
  transform: ${({ $position }) => {
    switch ($position) {
      case 0:
        return "translate(0px, 0px)";
      case 1:
        return "translate(18px, 18px)";
      default:
        return "translate(36px, 36px)";
    }
  }};

  @media (max-width: 768px) {
    transform: ${({ $position }) => {
      switch ($position) {
        case 0:
          return "translate(0px, 0px)";
        case 1:
          return "translate(0px, 18px)";
        default:
          return "translate(0px, 36px)";
      }
    }};
  }

  z-index: ${({ $position }) => 3 - $position};
  opacity: ${({ $position }) => ($position === 2 ? 0.75 : 1)};
  transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
  pointer-events: ${({ $isInteractive }) =>
    $isInteractive ? "auto" : "none"};
  box-shadow: ${({ $position }) => {
    switch ($position) {
      case 0:
        return "0 35px 60px -22px rgba(15, 23, 42, 0.45)";
      case 1:
        return "0 28px 55px -25px rgba(15, 23, 42, 0.32)";
      default:
        return "0 22px 45px -30px rgba(15, 23, 42, 0.24)";
    }
  }};
  ${({ $isAnimating }) =>
    $isAnimating &&
    css`
      transform: translate(-18px, -22px);
      opacity: 0;
    `}
`;

const PlaceholderCardShell = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.99);
  box-shadow: inset 0 1px 8px rgba(0, 0, 0, 0.05);
`;

// ... [Existing FAQ and CTA Styles] ...

// FAQ Section
const FAQSection = styled.section`
  ${SectionBase}
  background: transparent;
  padding: 5rem 0 0;
  margin-bottom: 0;
`;

const FAQInner = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 1.5rem;

  @media (max-width: 768px) {
    padding: 0 1.25rem;
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

const CTAWrapper = styled.div`
  max-width: 960px;
  margin: 3rem auto 0;
  padding: 0;
  width: 100%;

  @media (max-width: 768px) {
    margin: 2rem auto 0;
  }
`;

const CTAInner = styled.div`
  padding: 0 1.5rem;

  @media (max-width: 768px) {
    padding: 0 1.25rem;
  }
`;

const CTASection = styled.div`
  position: relative;
  border-radius: 20px;
  padding: 3rem;
  text-align: center;
  width: 100%;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 2rem;
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
  max-width: 760px; /* Constrain width for better reading */
  margin: 0 auto;
`;

const CTATitle = styled.h3`
  font-size: 1.75rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1rem;
  font-family: inherit;
  white-space: pre-wrap; /* Allow newlines */

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
  white-space: pre-wrap; /* Allow newlines */

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

  svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  @media (max-width: 768px) {
    padding: 0.875rem 1.5rem;
    font-size: 0.9rem;
    gap: 0.375rem;
  }
`;

const HeroCTAButton = styled(CTAButton)`
  padding: 1rem 2.8rem;
  font-size: 1.15rem;
  background: rgba(246, 59, 59, 0.7);
  border-color: rgba(246, 59, 59, 0.7);
  color: #ffffff;

  &:hover {
    background: rgba(246, 59, 59, 1);
    border-color: rgba(246, 59, 59, 1);
  }
`;

const FAQContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
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
  white-space: pre-wrap; /* Allow newlines from locale */

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const MarketingSubText = styled.p`
  font-size: 1.3rem;
  font-weight: 500;
  color: #e0e0e0; /* Lighter than pure white for subtlety */
  text-align: center;
  line-height: 1.6;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  font-family: "Noto Sans KR", sans-serif;
  z-index: 2; /* Ensure it's above canvas */
  position: relative; /* For z-index to take effect */
  white-space: pre-wrap; /* Allow newlines from locale */

  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
`;

// ... [EventCard styles omitted for brevity as they are unchanged] ...
// --- START: Copied/Adapted Meetup Card Styles from meetup.tsx ---
// (Styles removed as requested)

// Removed unused CopiedEvent styles

// --- Hero Scroll Card Styles ---
const ScrollCard = styled.div`
  width: 100%;
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  position: relative;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
`;

const ScrollCardImageArea = styled.div`
  width: 100%;
  position: relative;
  background: #f3f4f6;
  overflow: hidden;

  &::before {
    content: "";
    display: block;
    padding-top: 75%; /* 4:3 ratio (height / width = 0.75) */
  }
  
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ScrollCardBadge = styled.div`
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #111827;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  
  span {
    box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
  }
`;

const ScrollCardContent = styled.div`
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: white;
`;

const ScrollCardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.35;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ScrollCardMetaContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const ScrollCardMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;

  svg {
    width: 0.9rem;
    height: 0.9rem;
    color: #9ca3af;
    flex-shrink: 0;
  }
`;

const ScrollCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
  gap: 0.75rem;
`;

// Removed JoinCta and ParticipantCount since they are replaced by UrgencyButton

interface ScrollCardProps {
  meetup: MeetupEvent;
  maxAvatars?: number;
  onNavigate: (eventId: string) => void;
  userProfilesMap?: Record<string, UserProfile>;
}

type StackLayer =
  | { type: "event"; event: MeetupEvent; instanceKey: string }
  | { type: "placeholder"; id: string; instanceKey: string };

const PLACEHOLDER_IDS = ["placeholder-1", "placeholder-2", "placeholder-3"];

const buildStackLayers = (
  events: MeetupEvent[],
  offset: number
): StackLayer[] => {
  if (!events || events.length === 0) {
    return PLACEHOLDER_IDS.map((id, i) => ({ 
      type: "placeholder", 
      id, 
      instanceKey: `${id}-${i}` 
    }));
  }

  const count = events.length;
  const layers: StackLayer[] = [];

  for (let i = 0; i < 3; i++) {
    const absoluteIndex = offset + i;
    
    if (count === 1 && i > 0) {
      layers.push({ 
        type: "placeholder", 
        id: `${PLACEHOLDER_IDS[i - 1]}-${i}`,
        instanceKey: `placeholder-${i}-${absoluteIndex}`
      });
      continue;
    }

    if (count === 2 && i === 2) {
      layers.push({ 
        type: "placeholder", 
        id: `${PLACEHOLDER_IDS[2]}-${i}`,
        instanceKey: `placeholder-${i}-${absoluteIndex}`
      });
      continue;
    }

    const index = absoluteIndex % count;
    const event = events[index];
    layers.push({ 
      type: "event", 
      event,
      instanceKey: `${event.id}-${absoluteIndex}`
    });
  }

  return layers;
};

const UrgencyButton = styled.button<{ $isHigh?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${props => props.$isHigh ? '#ef4444' : '#10b981'};
  color: white;
  padding: 0.6rem 1rem;
  border-radius: 12px;
  border: none;
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  text-transform: uppercase;
  letter-spacing: 0.025em;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 8px -1px rgba(0, 0, 0, 0.15);
  }
  
  span {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: white;
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
  }
`;

const HeroScrollCard = ({ meetup, maxAvatars = 5, onNavigate, userProfilesMap }: ScrollCardProps) => {
  const { t } = useI18n();
  const spotsTaken = meetup.leaders.length + meetup.participants.length;
  const spotsTotal = meetup.max_participants;
  const spotsLeft = Math.max(0, spotsTotal - spotsTaken);
  const isUrgent = spotsLeft <= 5; // Urgency threshold

  return (
    <ScrollCard onClick={() => onNavigate(meetup.id)}>
      <ScrollCardImageArea>
        <img 
          src={meetup.image_urls?.[0] || "/images/placeholder.jpg"} 
          alt={meetup.title}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.style.backgroundColor = '#e5e7eb';
          }}
        />
        <ScrollCardBadge>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          {t.home.meetupCard.join}
        </ScrollCardBadge>
      </ScrollCardImageArea>
      <ScrollCardContent>
        <div>
          <ScrollCardTitle>{meetup.title}</ScrollCardTitle>
          <ScrollCardMetaContainer style={{ marginTop: '0.5rem' }}>
            <ScrollCardMetaRow>
              <CalendarIconOutline />
              {formatEventDateTime(meetup)}
            </ScrollCardMetaRow>
            <ScrollCardMetaRow>
              <MapPinIcon />
              {meetup.location_name}
            </ScrollCardMetaRow>
          </ScrollCardMetaContainer>
        </div>
        <ScrollCardFooter>
           <UserAvatarStack
              uids={[...meetup.leaders, ...meetup.participants]}
              maxAvatars={maxAvatars}
              size={32}
              userProfilesMap={userProfilesMap}
            />
           <UrgencyButton $isHigh={isUrgent}>
             <span />
             {isUrgent
               ? t.home.meetupCard.almostFull
               : `${spotsTaken}/${spotsTotal} ${t.home.meetupCard.filled}`}
           </UrgencyButton>
        </ScrollCardFooter>
      </ScrollCardContent>
    </ScrollCard>
  );
};

// --- END: Hero Scroll Card Styles ---

interface HomePageClientProps {
  initialUpcomingEvents?: MeetupEvent[];
  initialStats?: HomeStats;
  initialTopics?: HomeTopicArticle[];
}

export default function NewHomeClient({
  initialUpcomingEvents,
  initialStats,
  initialTopics,
}: HomePageClientProps) {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const { setIsTransparent } = useGnb();
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { t } = useI18n();

  const handleEventNavigation = useCallback(
    (eventId: string) => {
      router.push(`/meetup/${eventId}`);
    },
    [router]
  );
  const [homeStats, setHomeStats] = useState<HomeStats | undefined>(
    initialStats
  );
  
  // Cache for user profiles
  const [userProfilesMap, setUserProfilesMap] = useState<Record<string, UserProfile>>({});

  // --- Hero Card Scrolling Logic ---
  const [upcomingEvents, setUpcomingEvents] = useState<MeetupEvent[]>(
    initialUpcomingEvents || []
  );
  
  // Effect to fetch upcoming events if not provided initially
  useEffect(() => {
    // Helper to fetch user profiles for events
    const loadUserProfiles = async (events: MeetupEvent[]) => {
      const allUids = new Set<string>();
      events.forEach(event => {
        event.leaders.forEach(uid => allUids.add(uid));
        event.participants.forEach(uid => allUids.add(uid));
      });

      if (allUids.size > 0) {
        try {
          const profiles = await fetchUserProfiles(Array.from(allUids));
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => {
            profileMap[p.uid] = p;
          });
          setUserProfilesMap(prev => ({ ...prev, ...profileMap }));
        } catch (error) {
          console.error("Failed to pre-fetch user profiles:", error);
        }
      }
    };

    // If we already have initial events, use them and fetch profiles
    if (initialUpcomingEvents && initialUpcomingEvents.length > 0) {
      setUpcomingEvents(initialUpcomingEvents);
      loadUserProfiles(initialUpcomingEvents);
      return;
    }

    const loadEvents = async () => {
      try {
        setLoadingEvent(true);
        const events = await fetchUpcomingMeetupEvents();
        if (events.length > 0) {
          setUpcomingEvents(events);
          setClosestEvent(events[0]);
          // Fetch profiles after events are loaded
          loadUserProfiles(events);
        }
      } catch (error) {
        console.error("Failed to fetch upcoming meetups for hero:", error);
      } finally {
        setLoadingEvent(false);
      }
    };
    loadEvents();
  }, [initialUpcomingEvents]);

  // Removed rotation effect


  const [closestEvent, setClosestEvent] = useState<MeetupEvent | null>(
    initialUpcomingEvents && initialUpcomingEvents.length > 0
      ? initialUpcomingEvents[0]
      : null
  );
  const [loadingEvent, setLoadingEvent] = useState(!initialUpcomingEvents);
  
  // Dynamically determine max avatars based on available space
  const [maxAvatars, setMaxAvatars] = useState(8);
  const [cardOffset, setCardOffset] = useState(0);
  const [isStackSwapping, setIsStackSwapping] = useState(false);
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const swapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stackLayers = useMemo(
    () => buildStackLayers(upcomingEvents, cardOffset),
    [upcomingEvents, cardOffset]
  );

  // Derived state for localized content
  const pricingBenefits: PricingBenefit[] = t.home.pricing.benefits;
  const FAQ_ITEMS = t.home.faq.items.map(item => ({ question: item.q, answer: item.a }));

  useEffect(() => {
    setCardOffset(0);
  }, [upcomingEvents.length]);

  useEffect(() => {
    if (upcomingEvents.length < 2) {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      if (swapTimeoutRef.current) {
        clearTimeout(swapTimeoutRef.current);
        swapTimeoutRef.current = null;
      }
      setIsStackSwapping(false);
      return;
    }

    rotationIntervalRef.current = setInterval(() => {
      setIsStackSwapping(true);
      swapTimeoutRef.current = setTimeout(() => {
        setCardOffset((prev) => prev + 1);
        setIsStackSwapping(false);
      }, 450);
    }, 5000);

    return () => {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      if (swapTimeoutRef.current) {
        clearTimeout(swapTimeoutRef.current);
        swapTimeoutRef.current = null;
      }
    };
  }, [upcomingEvents.length]);

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
  // Logic moved to the combined effect above
  /* 
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
  */

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <PageWrapper>
      <GlobalStyle />
      <NewNavbar />
      <HeroSection>
        <video autoPlay loop muted playsInline ref={videoRef}>
          <source src="/assets/homepage/alphabet.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <VideoOverlay />
        
        <HeroGrid>
          <HeroLeft>
            <HeroTitle>{t.home.hero.title}</HeroTitle>
            <HeroSubtitle>{t.home.hero.subtitle}</HeroSubtitle>
            <HeroCTAButton onClick={() => router.push("/meetup")}>
              {t.home.cta.button}
            </HeroCTAButton>
          </HeroLeft>

          <HeroRight>
            <StackContainer>
              {stackLayers.map((layer, index) => (
                <StackCardWrapper
                  key={layer.instanceKey}
                  $position={index}
                  $isAnimating={
                    isStackSwapping && index === 0 && upcomingEvents.length >= 2
                  }
                  $isInteractive={layer.type === "event" && index === 0}
                >
                  {layer.type === "event" ? (
                    <HeroScrollCard
                      meetup={layer.event}
                      maxAvatars={maxAvatars}
                      onNavigate={handleEventNavigation}
                      userProfilesMap={userProfilesMap}
                    />
                  ) : (
                    <PlaceholderCardShell />
                  )}
                </StackCardWrapper>
              ))}
            </StackContainer>
          </HeroRight>
        </HeroGrid>
      </HeroSection>

      <MainContent>

        <StatsSection stats={homeStats} />

        <TopicsShowcase topics={initialTopics || []} />

        <MembershipSectionContainer>
          <MembershipWrapper>
            <MembershipCard>
              <DecorBlob />
              <MembershipGrid>
                <LeftCol>
                  <Badge>{t.home.pricing.badge}</Badge>
                  <Heading>{t.home.pricing.title}</Heading>
                  <Description>{t.home.pricing.tagline}</Description>
                  <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white', lineHeight: 1.5 }}>
                        멤버십 유지 기간 동안 열리는<br />
                        모든 밋업 참여 가능 (주 1회 보장)
                      </p>
                      <p style={{ fontSize: '1rem', color: '#ffb7c5' }}>
                        지인 추천 시 추가 할인 가능
                      </p>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '1.5rem', lineHeight: 1.5, opacity: 0.8 }}>
                      * 운영진 귀책 사유로 밋업을 1주 진행하지 못할 경우 구독 기간을 2주 연장해드립니다. 멤버 분 귀책 사유로 밋업을 불참하실 경우 연장이 되지 않습니다. 비매너 등 운영 정책을 위반할 경우 강제 환불이 진행될 수 있습니다.
                    </p>
                  </div>
                  <CtaButton onClick={() => router.push("/payment")}>
                    {t.home.pricing.cta}
                  </CtaButton>
                </LeftCol>
                <RightCol>
                  <ChartTitle>월 9700원으로 누리는 압도적인 가성비</ChartTitle>
                  <ComparisonChart>
                    <ChartHeader>
                      <span>시간당 비용 비교</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b7280' }}>(단위: 원)</span>
                    </ChartHeader>
                    <CostBarContainer>
                      {/* 영어한잔 */}
                      <CostItem>
                        <CostLabelRow>
                          <span style={{ color: 'white', fontWeight: 700 }}>영어 한잔</span>
                          <CostValue $highlight>1,212원</CostValue>
                        </CostLabelRow>
                        <CostBarWrapper>
                          <CostBar $width="2%" $color="rgb(255, 100, 130)" />
                        </CostBarWrapper>
                      </CostItem>

                      {/* 언어교환 */}
                      <CostItem>
                        <CostLabelRow>
                          <span>언어교환 모임</span>
                          <CostValue>5,000원</CostValue>
                        </CostLabelRow>
                        <CostBarWrapper>
                          <CostBar $width="8%" $color="#4b5563" />
                        </CostBarWrapper>
                      </CostItem>

                      {/* 전화영어 */}
                      <CostItem>
                        <CostLabelRow>
                          <span>전화영어</span>
                          <CostValue>20,000원~</CostValue>
                        </CostLabelRow>
                        <CostBarWrapper>
                          <CostBar $width="33%" $color="#4b5563" />
                        </CostBarWrapper>
                      </CostItem>

                      {/* 영어학원 */}
                      <CostItem>
                        <CostLabelRow>
                          <span>영어학원</span>
                          <CostValue>35,000원~</CostValue>
                        </CostLabelRow>
                        <CostBarWrapper>
                          <CostBar $width="58%" $color="#4b5563" />
                        </CostBarWrapper>
                      </CostItem>

                      {/* 프리미엄 화상영어 */}
                      <CostItem>
                        <CostLabelRow>
                          <span>프리미엄 화상영어</span>
                          <CostValue>60,000원~</CostValue>
                        </CostLabelRow>
                        <CostBarWrapper>
                          <CostBar $width="100%" $color="#4b5563" />
                        </CostBarWrapper>
                      </CostItem>
                    </CostBarContainer>
                  </ComparisonChart>
                </RightCol>
              </MembershipGrid>
            </MembershipCard>
          </MembershipWrapper>
        </MembershipSectionContainer>

        {/* FAQ Section */}
        <FAQSection>
          <FAQInner>
            <SectionTitle>
              자주 묻는 <Highlight>질문</Highlight>
            </SectionTitle>
            <FAQContainer>
              {FAQ_ITEMS.map(
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
          </FAQInner>
        </FAQSection>

        {/* CTA Section */}
        <CTAWrapper>
          <CTAInner>
            <CTASection>
              <CTAVideoBackground autoPlay loop muted playsInline>
                <source src="/assets/blog/manhattan.mp4" type="video/mp4" />
              </CTAVideoBackground>
              <CTAOverlay />
              <CTAContent>
                <CTATitle>{t.home.cta.title}</CTATitle>
                <CTADescription>
                  {t.home.cta.description}
                </CTADescription>
                <CTAButton onClick={() => router.push("/meetup")}>
                  <RocketLaunchIcon />
                  {t.home.cta.button}
                </CTAButton>
              </CTAContent>
            </CTASection>
          </CTAInner>
        </CTAWrapper>
      </MainContent>
    </PageWrapper>
  );
}
