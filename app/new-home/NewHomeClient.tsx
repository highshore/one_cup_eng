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

// Gallery Section Styles
const GallerySection = styled.section`
  padding: clamp(3rem, 6vw, 4.5rem) 0 clamp(1.5rem, 3vw, 2rem);
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  overflow: visible; /* Allow shadows to show */
`;

const GalleryInner = styled.div`
  padding: 0 1.5rem;

  @media (max-width: 768px) {
    padding: 0 1.25rem;
  }
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
  white-space: pre-wrap;

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
  max-width: 1024px;
  margin: 0 auto;
  padding: 0 1.5rem;
  
  @media (max-width: 768px) {
    padding: 0 1.25rem;
  }
`;

const MembershipCard = styled.div`
  background: #000000;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  isolation: isolate;
`;

const DecorBlob = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  margin-right: -5rem;
  margin-top: -5rem;
  width: 16rem;
  height: 16rem;
  background: #22c55e;
  border-radius: 9999px;
  opacity: 0.2;
  filter: blur(64px);
  z-index: 0;
  pointer-events: none;
`;

const MembershipGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const LeftCol = styled.div`
  padding: 2.5rem;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  z-index: 1;

  @media (min-width: 768px) {
    padding: 3.5rem;
  }
`;

const RightCol = styled.div`
  background: #111827; /* gray-900 */
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  z-index: 1;

  @media (min-width: 768px) {
    padding: 3.5rem;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #22c55e; /* green-500 */
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 9999px;
  margin-bottom: 1rem;
  width: max-content;
`;

const Heading = styled.h2`
  font-size: 1.875rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.25;
  color: white;
`;

const Description = styled.p`
  color: #9ca3af; /* gray-400 */
  margin-bottom: 2rem;
  line-height: 1.625;
`;

const CtaButton = styled.button`
  background: white;
  color: black;
  font-weight: 700;
  padding: 0.75rem 2rem;
  border-radius: 9999px;
  transition: all 0.2s;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  width: max-content;
  border: none;
  cursor: pointer;
  font-size: 1.05rem;

  &:hover {
    background: #f3f4f6;
  }
`;

const PriceTag = styled.p`
  color: #4ade80; /* green-400 */
  font-weight: 500;
  font-size: 0.875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 0.5rem;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-top: 0.5rem;
`;

const PriceAmount = styled.span`
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: -0.025em;
`;

const PricePeriod = styled.span`
  font-size: 1.25rem;
  color: #6b7280; /* gray-500 */
  margin-left: 0.5rem;
`;

const FeatureList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: flex-start;
`;

const CheckIcon = styled(CheckCircleIconSolid)`
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: #22c55e; /* green-500 */
  margin-top: 0.125rem;
`;

const FeatureText = styled.span`
  margin-left: 0.75rem;
  color: #d1d5db; /* gray-300 */
  font-size: 0.875rem;
  line-height: 1.5;
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
  z-index: ${({ $position }) => 3 - $position};
  opacity: ${({ $position }) => ($position === 2 ? 0.75 : 1)};
  transition: transform 0.6s ease, opacity 0.6s ease, box-shadow 0.6s ease;
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
  background: rgba(246, 59, 59, 0.5);
  border-color: rgba(246, 59, 59, 0.5);
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
}

type StackLayer =
  | { type: "event"; event: MeetupEvent }
  | { type: "placeholder"; id: string };

const PLACEHOLDER_IDS = ["placeholder-1", "placeholder-2", "placeholder-3"];

const buildStackLayers = (
  events: MeetupEvent[],
  offset: number
): StackLayer[] => {
  if (!events || events.length === 0) {
    return PLACEHOLDER_IDS.map((id) => ({ type: "placeholder", id }));
  }

  const count = events.length;
  const layers: StackLayer[] = [];

  for (let i = 0; i < 3; i++) {
    if (count === 1 && i > 0) {
      layers.push({ type: "placeholder", id: `${PLACEHOLDER_IDS[i - 1]}-${i}` });
      continue;
    }

    if (count === 2 && i === 2) {
      layers.push({ type: "placeholder", id: `${PLACEHOLDER_IDS[2]}-${i}` });
      continue;
    }

    const index = (offset + i) % count;
    layers.push({ type: "event", event: events[index] });
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

const HeroScrollCard = ({ meetup, maxAvatars = 5, onNavigate }: ScrollCardProps) => {
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
  const [activeMemberIndex, setActiveMemberIndex] = useState(0);
  const memberRotationRef = useRef<NodeJS.Timeout | null>(null);
  const isMemberPointerActive = useRef(false);
  const isMemberFocusActive = useRef(false);

  // --- Hero Card Scrolling Logic ---
  const [upcomingEvents, setUpcomingEvents] = useState<MeetupEvent[]>(
    initialUpcomingEvents || []
  );
  
  // Effect to fetch upcoming events if not provided initially
  useEffect(() => {
    // If we already have initial events, don't fetch again
    if (initialUpcomingEvents && initialUpcomingEvents.length > 0) {
      setUpcomingEvents(initialUpcomingEvents);
      return;
    }

    const loadEvents = async () => {
      try {
        setLoadingEvent(true);
        const events = await fetchUpcomingMeetupEvents();
        if (events.length > 0) {
          setUpcomingEvents(events);
          setClosestEvent(events[0]);
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
  const memberProfiles: MemberProfile[] = [
    {
      id: "founder",
      label: t.home.members.founder.label,
      bio: t.home.members.founder.bio,
      highlights: t.home.members.founder.highlights,
      linkedInUrl: "https://www.linkedin.com/in/sk-kyle-kim/",
      image: "/assets/homepage/member1.JPG",
      background:
        "linear-gradient(135deg, rgba(17, 24, 39, 0.88) 0%, rgba(30, 64, 175, 0.78) 100%)",
      accent: "#3b82f6",
      accentSoft: "rgba(59, 130, 246, 0.18)",
      initials: "모임장",
      icon: UsersIcon,
    },
    {
      id: "professionals",
      label: t.home.members.professionals.label,
      bio: t.home.members.professionals.bio,
      highlights: t.home.members.professionals.highlights,
      image: "/assets/homepage/member2.jpg",
      background:
        "linear-gradient(135deg, rgba(15, 118, 110, 0.88) 0%, rgba(22, 163, 74, 0.75) 100%)",
      accent: "#10b981",
      accentSoft: "rgba(16, 185, 129, 0.18)",
      initials: "프로",
      icon: BriefcaseIcon,
    },
    {
      id: "students",
      label: t.home.members.students.label,
      bio: t.home.members.students.bio,
      highlights: t.home.members.students.highlights,
      image: "/assets/homepage/member3.jpg",
      background:
        "linear-gradient(135deg, rgba(76, 29, 149, 0.88) 0%, rgba(124, 58, 237, 0.72) 100%)",
      accent: "#a855f7",
      accentSoft: "rgba(168, 85, 247, 0.18)",
      initials: "학생",
      icon: AcademicCapIcon,
    },
  ];

  const pricingBenefits: PricingBenefit[] = t.home.pricing.benefits;
  const FAQ_ITEMS = t.home.faq.items.map(item => ({ question: item.q, answer: item.a }));

  const startMemberRotation = useCallback(() => {
    if (memberRotationRef.current) {
      clearInterval(memberRotationRef.current);
    }

    memberRotationRef.current = setInterval(() => {
      setActiveMemberIndex((prevIndex) => (prevIndex + 1) % memberProfiles.length);
    }, 5000);
  }, [memberProfiles.length]);

  const pauseMemberRotation = useCallback(() => {
    if (memberRotationRef.current) {
      clearInterval(memberRotationRef.current);
      memberRotationRef.current = null;
    }
  }, []);

  const resumeMemberRotation = useCallback(() => {
    if (isMemberPointerActive.current || isMemberFocusActive.current) {
      return;
    }
    startMemberRotation();
  }, [startMemberRotation]);

  const handleMemberSelect = useCallback((index: number) => {
    setActiveMemberIndex(index);
  }, []);

  const handleMemberHover = useCallback((index: number) => {
    setActiveMemberIndex(index);
  }, []);

  const handleMemberFocus = useCallback(
    (index: number) => {
      setActiveMemberIndex(index);
      isMemberFocusActive.current = true;
      pauseMemberRotation();
    },
    [pauseMemberRotation]
  );

  const handleMemberBlur = useCallback(() => {
    isMemberFocusActive.current = false;
    resumeMemberRotation();
  }, [resumeMemberRotation]);

  const handleMemberMouseEnter = useCallback(() => {
    isMemberPointerActive.current = true;
    pauseMemberRotation();
  }, [pauseMemberRotation]);

  const handleMemberMouseLeave = useCallback(() => {
    isMemberPointerActive.current = false;
    resumeMemberRotation();
  }, [resumeMemberRotation]);

  useEffect(() => {
    startMemberRotation();

    return () => {
      if (memberRotationRef.current) {
        clearInterval(memberRotationRef.current);
      }
    };
  }, [startMemberRotation]);

  const activeMember = memberProfiles[activeMemberIndex];

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
        setCardOffset((prev) => (prev + 1) % upcomingEvents.length);
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
                  key={
                    layer.type === "event"
                      ? `event-${layer.event.id}-${index}`
                      : `${layer.id}-${index}`
                  }
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
        {/* Gallery Section */}
        <GallerySection>
          <GalleryInner>
            <GalleryTitle>
              {t.home.gallery.title}
            </GalleryTitle>
            <GalleryGrid>
              <GalleryImageLarge 
                src="/assets/homepage/gallery1.JPG" 
                alt="Gallery 1"
                loading="lazy"
              />
              <GalleryImageSmall 
                src="/assets/homepage/gallery2.JPG" 
                alt="Gallery 2"
                loading="lazy"
              />
              <GalleryImageSmall 
                src="/assets/homepage/gallery3.JPG" 
                alt="Gallery 3"
                loading="lazy"
              />
            </GalleryGrid>
          </GalleryInner>
        </GallerySection>

        <StatsSection stats={homeStats} />

        <TopicsShowcase topics={initialTopics || []} />

        <MembersSection>
          <MembersInner>
            <MembersHeading>{t.home.members.title}</MembersHeading>
            <MembersIntro>{t.home.members.intro}</MembersIntro>
            <MembersLayout
              onMouseEnter={handleMemberMouseEnter}
              onMouseLeave={handleMemberMouseLeave}
              onTouchStart={handleMemberMouseEnter}
              onTouchEnd={handleMemberMouseLeave}
              onTouchCancel={handleMemberMouseLeave}
            >
              <MemberVisualPanel>
                <MemberVisualCard $background={activeMember.background}>
                  <MemberVisualMedia>
                    {activeMember.image ? (
                      <MemberVisualImage
                        src={activeMember.image}
                        alt={`${activeMember.label} Visual`}
                        loading="lazy"
                      />
                    ) : (
                      <MemberVisualFallback>{activeMember.initials}</MemberVisualFallback>
                    )}
                  </MemberVisualMedia>
                </MemberVisualCard>
              </MemberVisualPanel>

              <MembersAccordion>
                {memberProfiles.map((member, index) => {
                  const Icon = member.icon;
                  return (
                    <MemberAccordionItem
                      key={member.id}
                      $isActive={activeMemberIndex === index}
                    >
                      <MemberAccordionHeader
                        onClick={() => handleMemberSelect(index)}
                        onFocus={() => handleMemberFocus(index)}
                        onBlur={handleMemberBlur}
                        onMouseEnter={() => handleMemberHover(index)}
                        $accent={member.accent}
                        $accentSoft={member.accentSoft}
                        $isActive={activeMemberIndex === index}
                      >
                        <MemberIconCircle
                          $accent={member.accent}
                          $accentSoft={member.accentSoft}
                        >
                          <Icon />
                        </MemberIconCircle>
                        <MemberHeaderTitle>{member.label}</MemberHeaderTitle>
                      </MemberAccordionHeader>
                      <MemberAccordionContent $isActive={activeMemberIndex === index}>
                        <MemberAccordionBody>
                          <MemberBio>{member.bio}</MemberBio>
                          {member.linkedInUrl && (
                            <LinkedInButton
                              href={member.linkedInUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              $accent={member.accent}
                              $accentSoft={member.accentSoft}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                              {t.home.members.linkedIn}
                            </LinkedInButton>
                          )}
                          <MemberHighlights>
                            {member.highlights.map((highlight, highlightIndex) => (
                              <MemberHighlight key={highlightIndex}>
                                <MemberHighlightIcon $accent={member.accent}>
                                  <CheckCircleIcon />
                                </MemberHighlightIcon>
                                <span>{highlight}</span>
                              </MemberHighlight>
                            ))}
                          </MemberHighlights>
                        </MemberAccordionBody>
                      </MemberAccordionContent>
                    </MemberAccordionItem>
                  );
                })}
              </MembersAccordion>
            </MembersLayout>
          </MembersInner>
        </MembersSection>

        <MembershipSectionContainer>
          <MembershipWrapper>
            <MembershipCard>
              <DecorBlob />
              <MembershipGrid>
                <LeftCol>
                  <Badge>{t.home.pricing.badge}</Badge>
                  <Heading>{t.home.pricing.title}</Heading>
                  <Description>{t.home.pricing.tagline}</Description>
                  <CtaButton onClick={() => router.push("/payment")}>
                    {t.home.pricing.cta}
                  </CtaButton>
                </LeftCol>
                <RightCol>
                  <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <PriceTag>{t.home.pricing.price_label}</PriceTag>
                    <PriceContainer>
                      <PriceAmount>₩9,700</PriceAmount>
                      <PricePeriod>{t.home.pricing.period}</PricePeriod>
                    </PriceContainer>
                  </div>
                  <FeatureList>
                    {pricingBenefits.map((benefit, index) => (
                      <FeatureItem key={index}>
                        <CheckIcon />
                        <FeatureText>{benefit.title}</FeatureText>
                      </FeatureItem>
                    ))}
                  </FeatureList>
                </RightCol>
              </MembershipGrid>
            </MembershipCard>
          </MembershipWrapper>
        </MembershipSectionContainer>

        {/* FAQ Section */}
        <FAQSection>
          <FAQInner>
            <SectionTitle>{t.home.faq.title}</SectionTitle>
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
