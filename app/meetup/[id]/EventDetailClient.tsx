"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import styled, { keyframes, css } from "styled-components";
import dynamic from "next/dynamic";
import {
  MeetupEvent,
  Article,
} from "../../lib/features/meetup/types/meetup_types";
import {
  subscribeToEvent,
  joinEventAsRole,
  cancelParticipation,
  fetchArticlesByIds,
  removeParticipant,
  changeUserRole,
} from "../../lib/features/meetup/services/meetup_service";
import { db } from "../../lib/firebase/firebase";
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import {
  formatEventDateTime,
  isEventLocked,
  sampleTopics,
  formatEventTitleWithCountdown,
} from "../../lib/features/meetup/utils/meetup_helpers";
import { UserAvatar } from "../../lib/features/meetup/components/user_avatar";
import { hasActiveSubscription } from "../../lib/features/meetup/services/user_service";
import { useAuth } from "../../lib/contexts/auth_context";
import AdminEventDialog from "../../lib/features/meetup/components/admin_event_dialog";
import {
  PinIcon,
  CalendarIcon,
  ClockIcon,
  JoinIcon,
  CancelIcon,
} from "../../lib/features/meetup/components/meetup_icons";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase/firebase";
import GlobalLoadingScreen from "../../lib/components/GlobalLoadingScreen";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragOverlay } from "@dnd-kit/core";

// TypeScript declarations for Naver Maps
declare global {
  interface Window {
    naver: any;
    initNaverMaps?: () => void;
    navermap_authFailure?: () => void;
  }
}

// Interface for user data including phone numbers
interface UserWithDetails {
  uid: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  phoneLast4?: string;
}

// Interface for seating arrangement
interface SeatingAssignment {
  sessionNumber: 1 | 2;
  leaderUid: string;
  leaderDetails: UserWithDetails;
  participants: UserWithDetails[];
  transcriptId?: string; // Optional transcript ID if one has been created
}

// Interface for saved seating data
interface SavedSeatingArrangement {
  assignments: SeatingAssignment[];
  generatedAt: Date;
  generatedBy: string;
}

// Gradient shining sweep animation for join button
const gradientShine = keyframes`
  0% {
    background-position: -100% center;
  }
  100% {
    background-position: 100% center;
  }
`;

// Styled components - Day Mode Theme
const Container = styled.div`
  min-height: 100vh;
  background-color: transparent;
  color: #333;

  @media (max-width: 768px) {
    overflow-x: hidden;
  }
`;

const LoadingContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const LoadingAnimation = styled.div`
  width: 200px;
  height: 200px;

  @media (max-width: 768px) {
    width: 150px;
    height: 150px;
  }
`;

const PhotoSlider = styled.div`
  height: 40vh;
  position: relative;
  overflow: hidden;
  background-color: #000000;
  border-radius: 20px;
  margin-top: 2rem;

  @media (max-width: 768px) {
    height: 35vh;
    margin-top: 1rem;
    border-radius: 12px;
  }
`;

const SliderImage = styled.img<{ $active: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: absolute;
  top: 0;
  left: 0;
  opacity: ${(props) => (props.$active ? 1 : 0)};
  transition: opacity 0.3s ease-in-out;
`;

const SliderPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000;
  color: #ccc;
  font-size: 3rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Content = styled.div`
  padding: 2.5rem 0 0 0;
  max-width: 960px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1.5rem 0 0 0;
    max-width: 100%;
  }
`;

const CategoryTag = styled.div<{ $category: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background-color: ${(props) => {
    switch (props.$category.toLowerCase()) {
      case "discussion":
        return "#e3f2fd";
      case "movie night":
        return "#ffebee";
      case "picnic":
        return "#e8f5e8";
      case "socializing":
        return "#fff3e0";
      default:
        return "#f5f5f5";
    }
  }};
  color: ${(props) => {
    switch (props.$category.toLowerCase()) {
      case "discussion":
        return "#1976d2";
      case "movie night":
        return "#d32f2f";
      case "picnic":
        return "#388e3c";
      case "socializing":
        return "#f57c00";
      default:
        return "#666";
    }
  }};
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 12px;
    padding: 0.375rem 0.75rem;
    margin-bottom: 0.75rem;
    border-radius: 12px;
  }
`;

const Title = styled.h1`
  color: #333;
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 1rem 0;
  line-height: 1.3;
  word-wrap: break-word;

  @media (max-width: 768px) {
    font-size: 22px;
    margin: 0 0 0.75rem 0;
    line-height: 1.2;
  }
`;

const CountdownPrefix = styled.span<{ $isUrgent?: boolean }>`
  color: ${(props) => (props.$isUrgent ? "#DC143C" : "inherit")};
  font-weight: ${(props) => (props.$isUrgent ? "bold" : "inherit")};
`;

const Description = styled.p`
  color: #333;
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
  white-space: pre-wrap;
  word-wrap: break-word;

  @media (max-width: 768px) {
    font-size: 14px;
    line-height: 1.5;
    margin: 0 0 1rem 0;
  }
`;

const SectionTitle = styled.h2`
  color: #333;
  font-size: 24px;
  font-weight: 700;
  margin: 1.5rem 0 1rem 0;

  @media (max-width: 768px) {
    font-size: 20px;
    margin: 1.25rem 0 0.75rem 0;
  }
`;

const DetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;

  @media (max-width: 768px) {
    gap: 6px;
    margin-bottom: 6px;
  }
`;

const DetailIcon = styled.span`
  color: #666;
  margin-top: 3px;
  flex-shrink: 0;
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    margin-top: 2px;
  }
`;

const DetailText = styled.span`
  color: #333;
  font-size: 16px;
  line-height: 1.4;
  word-wrap: break-word;

  @media (max-width: 768px) {
    font-size: 14px;
    line-height: 1.3;
  }
`;

const MapContainer = styled.div`
  height: 300px;
  border-radius: 12px;
  margin: 1rem 0;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  cursor: pointer;
  position: relative;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    height: 250px;
    margin: 0.75rem 0;
    border-radius: 8px;
  }
`;

const MapLoadingPlaceholder = styled.div`
  height: 300px;
  background-color: #f5f5f5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 1rem;
  margin: 1rem 0;
  border: 1px solid #e0e0e0;

  @media (max-width: 768px) {
    height: 250px;
    margin: 0.75rem 0;
    border-radius: 8px;
    font-size: 0.875rem;
  }
`;

const ParticipantsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0.5rem 0;

  @media (max-width: 768px) {
    gap: 6px;
    margin: 0.375rem 0;
  }
`;

const TopicsSection = styled.div`
  margin: 1rem 0;

  @media (max-width: 768px) {
    margin: 0.75rem 0;
  }
`;

const ArticleTopicsSection = styled.div`
  margin: 1.5rem 0;

  @media (max-width: 768px) {
    margin: 1.25rem 0;
  }
`;

const ArticleTopicCard = styled.div`
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1rem;
  margin: 0.5rem 0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    margin: 0.375rem 0;
    border-radius: 8px;
  }
`;

const ArticleTopicNumber = styled.span`
  display: inline-block;
  background-color: #333;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  text-align: center;
  line-height: 24px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 0.5rem;

  @media (max-width: 768px) {
    width: 20px;
    height: 20px;
    line-height: 20px;
    font-size: 11px;
  }
`;

const ArticleTopicTitle = styled.span`
  color: #333;
  font-size: 16px;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const TopicCard = styled.div`
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 1rem;
  margin: 0.5rem 0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
    margin: 0.375rem 0;
    border-radius: 8px;
  }
`;

const TopicTitle = styled.h3`
  color: #333;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    font-size: 14px;
    margin: 0 0 0.375rem 0;
  }
`;

const TopicContent = styled.div<{ $expanded: boolean }>`
  max-height: ${(props) => (props.$expanded ? "1000px" : "0")};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
`;

const DiscussionPoint = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0.5rem 0;
  color: #666;
  font-size: 14px;

  @media (max-width: 768px) {
    gap: 6px;
    margin: 0.375rem 0;
    font-size: 13px;
  }
`;

const ActionButtons = styled.div<{ $isFloating: boolean }>`
  display: flex;
  gap: 16px;
  max-width: 960px;
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
  z-index: 1000;

  ${({ $isFloating }) =>
    $isFloating
      ? css`
          position: fixed;
          bottom: 30px;
          left: 20px;
          right: 20px;
          margin: 0 auto;
          padding-bottom: 0;
          z-index: 1050;
        `
      : css`
          position: static;
          margin: 2rem auto 0 auto;
          padding-bottom: 0;
          z-index: 1000;
        `}

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
    width: auto;

    ${({ $isFloating }) =>
      $isFloating
        ? css`
            position: fixed !important;
            bottom: 20px !important;
            left: 16px !important;
            right: 16px !important;
            margin: 0 !important;
            padding-bottom: 16px;
            z-index: 1050 !important;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          `
        : css`
            position: static !important;
            margin: 1.5rem auto 0 auto !important;
            z-index: 1000;
            box-shadow: none;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          `}
  }
`;

const AdminButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 6px;
    margin-bottom: 0.75rem;
  }
`;

const AdminButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #181818;
  color: white;
  border: none;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #181818;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    padding: 0.375rem 0.75rem;
    font-size: 11px;
    border-radius: 12px;
    flex: 1;
  }
`;

const ActionButton = styled.button<{
  $variant: "join" | "cancel" | "locked";
  $saved?: boolean;
}>`
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 700;
  cursor: ${(props) =>
    props.$variant === "locked" ? "not-allowed" : "pointer"};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;

  background-color: ${(props) => {
    if (props.$variant === "locked") return "#e0e0e0";
    if (props.$variant === "cancel") return "#990033";
    return "#000000";
  }};

  ${(props) =>
    props.$variant === "join" &&
    css`
      background: linear-gradient(
        90deg,
        #000000 0%,
        #000000 25%,
        #1a0808 35%,
        #2a0808 45%,
        #3a1010 50%,
        #2a0808 55%,
        #1a0808 65%,
        #000000 75%,
        #000000 100%
      );
      background-size: 200% 100%;
      animation: ${gradientShine} 3s ease-in-out infinite;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    `}

  color: ${(props) => {
    if (props.$variant === "locked") return "#999";
    return "white";
  }};

  &:hover {
    transform: ${(props) =>
      props.$variant !== "locked" ? "translateY(-2px)" : "none"};
    box-shadow: ${(props) => {
      if (props.$variant === "locked") return "none";
      if (props.$variant === "join") return "0 8px 25px rgba(0, 0, 0, 0.4)";
      return "0 4px 12px rgba(0, 0, 0, 0.15)";
    }};
  }

  @media (max-width: 768px) {
    padding: 0.875rem;
    font-size: 14px;
    border-radius: 16px;
    gap: 6px;

    &:hover {
      transform: ${(props) =>
        props.$variant !== "locked" ? "translateY(-1px)" : "none"};
    }
  }
`;

// Dialog styled components
const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
`;

const DialogBox = styled.div`
  background-color: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 90%;
  max-width: 400px;
  text-align: center;

  h3 {
    margin-top: 0;
    font-size: 1.5rem;
    color: #333;
  }

  p {
    font-size: 1rem;
    color: #555;
    margin-bottom: 1rem;
  }
`;

const DialogButton = styled.button<{ $primary?: boolean }>`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid ${({ $primary }) => ($primary ? "#000" : "#ccc")};
  background-color: ${({ $primary }) => ($primary ? "#000" : "white")};
  color: ${({ $primary }) => ($primary ? "white" : "#333")};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
`;

// Participation Success Dialog styled components
const SuccessDialogBox = styled.div`
  background-color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 90%;
  max-width: 450px;
  text-align: center;

  @media (max-width: 768px) {
    padding: 1.5rem;
    gap: 1.25rem;
    max-width: 95%;
    border-radius: 12px;
  }
`;

const SuccessTitle = styled.h3`
  margin: 0;
  font-size: 1.5rem;
  color: #2e7d32;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

const SuccessContent = styled.div`
  color: #555;
  font-size: 1rem;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

const KakaoLink = styled.a`
  color: #1976d2;
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;

const SuccessDialogButton = styled.button`
  padding: 0.875rem 1.5rem;
  background-color: #2e7d32;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: #1b5e20;
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
  }
`;

// Seating arrangement styled components
const SeatingSection = styled.div`
  margin: 2rem 0;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;

  @media (max-width: 768px) {
    margin: 1.5rem 0;
    padding: 1rem;
    border-radius: 8px;
  }
`;

const SeatingControls = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
`;

const SeatingButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #333;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background-color: #555;
    transform: translateY(-1px);
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 768px) {
    padding: 0.625rem 1.25rem;
    font-size: 13px;
    border-radius: 6px;
  }
`;

const SeatingTable = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const SessionTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #333;

  @media (max-width: 768px) {
    font-size: 16px;
    margin: 0 0 0.75rem 0;
  }
`;

const GroupCard = styled.div<{ $hasTranscript?: boolean }>`
  background-color: white;
  border: 2px solid ${(props) => (props.$hasTranscript ? "#10b981" : "#e0e0e0")};
  border-radius: 25px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;

  ${(props) =>
    props.$hasTranscript &&
    `
    background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(props) =>
      props.$hasTranscript
        ? "0 8px 24px rgba(16, 185, 129, 0.25)"
        : "0 8px 24px rgba(0, 0, 0, 0.15)"};
    border-color: ${(props) => (props.$hasTranscript ? "#059669" : "#333")};
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 0.75rem;
    border-radius: 20px;
  }
`;

const LeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #eee;

  @media (max-width: 768px) {
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
  }
`;

const LeaderBadge = styled.span`
  background-color: #333;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 10px;
    padding: 0.2rem 0.4rem;
  }
`;

const UserName = styled.span`
  font-weight: 600;
  color: #333;
  font-size: 14px;
  flex: 1;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`;

const ParticipantsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const ParticipantItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;

  @media (max-width: 768px) {
    gap: 0.375rem;
  }
`;

const ParticipantItemWrapper = styled.div`
  /* Wrapper for dnd-kit sortable */
`;

// Draggable Participant Component
const DraggableParticipant: React.FC<{
  participant: UserWithDetails;
  onAvatarClick: (uid: string) => void;
  isLeader?: boolean;
  sessionNumber: number;
}> = ({ participant, onAvatarClick, isLeader = false, sessionNumber }) => {
  const uniqueId = `${sessionNumber}-${participant.uid}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: uniqueId, disabled: isLeader });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 9999 : "auto",
    cursor: isLeader ? "default" : "grab",
  };

  const formatParticipantDisplay = (user: UserWithDetails): string => {
    const isValidDisplayName = (displayName?: string): boolean => {
      if (!displayName) return false;
      const userPattern = /^User [a-zA-Z0-9]{6}$/;
      return !userPattern.test(displayName);
    };

    const maskName = (name: string): string => {
      if (name.length <= 2) return name;
      const midIndex = Math.floor(name.length / 2);
      return name.substring(0, midIndex) + "*" + name.substring(midIndex + 1);
    };

    const formatLeaderDisplay = (user: UserWithDetails): string => {
      const validName = isValidDisplayName(user.displayName);
      return validName ? user.displayName! : "익명";
    };

    if (isLeader) {
      return formatLeaderDisplay(user);
    }

    const validName = isValidDisplayName(user.displayName);
    if (!validName) return `익명 (${user.phoneLast4 || "****"})`;

    const maskedName = maskName(user.displayName!);
    return `${maskedName} (${user.phoneLast4 || "****"})`;
  };

  const itemContent = (
    <ParticipantItem>
      <UserAvatar
        uid={participant.uid}
        size={isLeader ? 32 : 24}
        isLeader={isLeader}
        onClick={() => onAvatarClick(participant.uid)}
      />
      <UserName>{formatParticipantDisplay(participant)}</UserName>
      {isLeader && <LeaderBadge>리더</LeaderBadge>}
    </ParticipantItem>
  );

  return isLeader ? (
    <>{itemContent}</>
  ) : (
    <ParticipantItemWrapper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {itemContent}
    </ParticipantItemWrapper>
  );
};

// Naver Map Component - Updated with dynamic script loading
interface NaverMapProps {
  latitude: number;
  longitude: number;
  locationName: string;
  mapUrl?: string;
}

const NaverMapComponent: React.FC<NaverMapProps> = ({
  latitude,
  longitude,
  locationName,
  mapUrl,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [componentMounted, setComponentMounted] = useState(false);

  // Ensure component is mounted before trying to access DOM
  useEffect(() => {
    const timer = setTimeout(() => {
      setComponentMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadNaverMapsAPI = () => {
      // Check if API is already loaded
      if (
        window.naver &&
        window.naver.maps &&
        typeof window.naver.maps.Map === "function"
      ) {
        setIsApiReady(true);
        return;
      }

      // Always set up global callbacks first, regardless of script loading state
      window.initNaverMaps = () => {
        setIsApiReady(true);
      };

      window.navermap_authFailure = () => {
        setLoadError("Naver Maps API Authentication Failed");
      };

      // Check if script is already loading
      const existingScript = document.querySelector(
        'script[src*="oapi.map.naver.com"]'
      );
      if (existingScript) {
        // Set up a fallback timer to check if API becomes available
        const checkTimer = setInterval(() => {
          if (
            window.naver &&
            window.naver.maps &&
            typeof window.naver.maps.Map === "function"
          ) {
            setIsApiReady(true);
            clearInterval(checkTimer);
          }
        }, 500);

        // Give up after 10 seconds
        setTimeout(() => {
          clearInterval(checkTimer);
          if (!window.naver || !window.naver.maps) {
            setLoadError("Timeout loading Naver Maps API");
          }
        }, 10000);

        return;
      }

      // Create and inject script tag
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=3cyz9x5q6l&submodules=geocoder&callback=initNaverMaps";
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        setLoadError("Failed to load Naver Maps API");
      };

      document.head.appendChild(script);
    };

    loadNaverMapsAPI();

    return () => {
      // Cleanup global callbacks
      delete window.initNaverMaps;
      delete window.navermap_authFailure;
    };
  }, []);

  useEffect(() => {
    if (!isApiReady || !mapRef.current || loadError || !componentMounted) {
      return;
    }

    try {
      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error(
          `Invalid coordinates: lat=${latitude}, lng=${longitude}`
        );
      }

      const position = new window.naver.maps.LatLng(latitude, longitude);

      const mapOptions = {
        center: position,
        zoom: 16,
        minZoom: 10,
        maxZoom: 20,
        mapTypeControl: false,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
      };

      const map = new window.naver.maps.Map(mapRef.current, mapOptions);

      // Create custom marker
      const marker = new window.naver.maps.Marker({
        position: position,
        map: map,
        title: locationName,
        icon: {
          content: `
            <div style="
              width: 30px; 
              height: 30px; 
              background-color: #181818; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              <span style="color: white; font-size: 16px;">📍</span>
            </div>
          `,
          size: new window.naver.maps.Size(30, 30),
          anchor: new window.naver.maps.Point(15, 15),
        },
      });

      // Add click event handlers
      const handleMapClick = () => {
        const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(
          locationName
        )}`;
        window.open(searchUrl, "_blank");
      };

      if (window.naver.maps.Event) {
        window.naver.maps.Event.addListener(marker, "click", handleMapClick);
        window.naver.maps.Event.addListener(map, "click", handleMapClick);
      }

      setMapLoaded(true);
    } catch (error) {
      setLoadError(
        `Error initializing map: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }, [
    isApiReady,
    latitude,
    longitude,
    locationName,
    mapUrl,
    loadError,
    componentMounted,
  ]);

  if (loadError) {
    return <MapLoadingPlaceholder>❌ {loadError}</MapLoadingPlaceholder>;
  }

  if (!isApiReady) {
    return (
      <MapLoadingPlaceholder>
        🗺️ Loading Naver Maps API...
      </MapLoadingPlaceholder>
    );
  }

  return (
    <MapContainer ref={mapRef}>
      {!mapLoaded && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f5f5f5",
            color: "#999",
            fontSize: "1rem",
            borderRadius: "12px",
            zIndex: 10,
          }}
        >
          🗺️ Initializing map...
        </div>
      )}
    </MapContainer>
  );
};

export function EventDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, accountStatus, isGdgMember } = useAuth();
  const [event, setEvent] = useState<MeetupEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    {}
  );
  const actionButtonRef = useRef<HTMLDivElement>(null);
  const [isButtonFloating, setIsButtonFloating] = useState(false);
  const staticButtonPositionRef = useRef<{
    top: number;
    height: number;
  } | null>(null);

  // Use accountStatus from auth context
  const isAdmin = accountStatus === "admin";
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [dialogTemplateEvent, setDialogTemplateEvent] =
    useState<MeetupEvent | null>(null);
  const [dialogEditEvent, setDialogEditEvent] = useState<MeetupEvent | null>(
    null
  );
  const [showRoleChoiceDialog, setShowRoleChoiceDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [showParticipationSuccessDialog, setShowParticipationSuccessDialog] =
    useState(false);
  const [articleTopics, setArticleTopics] = useState<Article[]>([]);
  const [userHasSubscription, setUserHasSubscription] = useState<
    boolean | null
  >(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Admin action dialogs state
  const [showAdminActionDialog, setShowAdminActionDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUserIsLeader, setSelectedUserIsLeader] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] =
    useState<UserWithDetails | null>(null);

  // Seating arrangement state
  const [seatingAssignments, setSeatingAssignments] = useState<
    SeatingAssignment[]
  >([]);
  const [showSeatingTable, setShowSeatingTable] = useState(() => {
    // In localhost mode, default to true so seating shows when data loads
    if (
      typeof window !== "undefined" &&
      window.location.hostname === "localhost"
    ) {
      return true;
    }
    return false;
  });
  const [seatingLoading, setSeatingLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const eventId = params?.id;

  const isCurrentUserParticipant = useMemo(() => {
    if (!currentUser || !event) return false;
    return (
      event.participants.includes(currentUser.uid) ||
      event.leaders.includes(currentUser.uid)
    );
  }, [currentUser, event]);

  // Function to save seating arrangement to Firestore
  const saveSeatingArrangement = async (assignments: SeatingAssignment[]) => {
    const isLocalhost =
      typeof window !== "undefined" && window.location.hostname === "localhost";

    if (!event || (!currentUser && !isLocalhost)) {
      alert("Cannot save seating: missing event or user data");
      return;
    }

    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase/firebase");

      const eventRef = doc(db, "meetup", event.id);

      // Sanitize only the assignments array to remove undefined values,
      // particularly from optional fields like photoURL in UserWithDetails.
      const cleanedAssignments = JSON.parse(JSON.stringify(assignments));

      const seatingData = {
        assignments: cleanedAssignments,
        generatedAt: new Date(),
        generatedBy: currentUser?.uid || "localhost-user",
      };

      await updateDoc(eventRef, {
        seatingArrangement: seatingData,
      });

      // No alert on drag-and-drop save for better UX
      // alert("좌석 배치가 성공적으로 저장되었습니다!");
    } catch (error) {
      alert(
        "좌석 배치 저장 중 오류가 발생했습니다: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  // Function to load seating arrangement from Firestore
  const loadSeatingArrangement =
    async (): Promise<SavedSeatingArrangement | null> => {
      if (!event) return null;

      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../../lib/firebase/firebase");

        const eventRef = doc(db, "meetup", event.id);
        const eventDoc = await getDoc(eventRef);

        if (eventDoc.exists()) {
          const data = eventDoc.data();
          if (
            data.seatingArrangement &&
            data.seatingArrangement.assignments &&
            Array.isArray(data.seatingArrangement.assignments)
          ) {
            const allUserUids = [...event.leaders, ...event.participants];
            const userDetails = await fetchUserDetails(allUserUids);

            const reconstructedAssignments =
              data.seatingArrangement.assignments.map((assignment: any) => {
                const leaderDetails = userDetails.find(
                  (user) => user.uid === assignment.leaderUid
                );
                const participantDetails = assignment.participants.map(
                  (p: any) =>
                    userDetails.find((user) => user.uid === p.uid) || p
                );

                return {
                  sessionNumber: assignment.sessionNumber,
                  leaderUid: assignment.leaderUid,
                  leaderDetails: leaderDetails || assignment.leaderDetails,
                  participants: participantDetails,
                  transcriptId: assignment.transcriptId, // Preserve transcriptId
                };
              });

            // Robustly handle `generatedAt` which might be a Timestamp or a string
            const rawGeneratedAt = data.seatingArrangement.generatedAt;
            let generatedAtDate;
            if (rawGeneratedAt && typeof rawGeneratedAt.toDate === "function") {
              // It's a Firestore Timestamp
              generatedAtDate = rawGeneratedAt.toDate();
            } else if (typeof rawGeneratedAt === "string") {
              // It's likely an ISO string from previous broken saves
              generatedAtDate = new Date(rawGeneratedAt);
            } else {
              // Fallback for unexpected types
              generatedAtDate = new Date();
            }

            return {
              assignments: reconstructedAssignments,
              generatedAt: generatedAtDate,
              generatedBy: data.seatingArrangement.generatedBy,
            };
          }
        }
        return null;
      } catch (error) {
        console.error("Error loading seating arrangement:", error);
        return null;
      }
    };

  // Function to get user details with phone numbers
  const fetchUserDetails = async (
    uids: string[]
  ): Promise<UserWithDetails[]> => {
    try {
      const getUserDisplayNames = httpsCallable(
        functions,
        "getUserDisplayNames"
      );
      const response = await getUserDisplayNames({ userIds: uids });
      const result = response.data as {
        displayNames: Record<string, string>;
        phoneNumbers: Record<string, string>;
      };

      return uids.map((uid) => ({
        uid,
        displayName: result.displayNames[uid] || `User ${uid.substring(0, 6)}`,
        phoneNumber: result.phoneNumbers[uid] || "",
        phoneLast4: result.phoneNumbers[uid]
          ? result.phoneNumbers[uid].replace(/\D/g, "").slice(-4)
          : "",
      }));
    } catch (error) {
      console.error("Error fetching user details:", error);
      return uids.map((uid) => ({
        uid,
        displayName: `User ${uid.substring(0, 6)}`,
        phoneNumber: "",
        phoneLast4: "",
      }));
    }
  };

  // Function to evenly distribute participants among leaders
  const distributeParticipants = (
    participants: UserWithDetails[],
    leaders: UserWithDetails[]
  ): UserWithDetails[][] => {
    if (leaders.length === 0) return [];

    const shuffledParticipants = [...participants].sort(
      () => Math.random() - 0.5
    );
    const groups: UserWithDetails[][] = leaders.map(() => []);

    shuffledParticipants.forEach((participant, index) => {
      const groupIndex = index % leaders.length;
      groups[groupIndex].push(participant);
    });

    return groups;
  };

  // Function to generate seating arrangement
  const generateSeatingArrangement = async () => {
    if (!event) return;

    setSeatingLoading(true);
    try {
      const allUserUids = [...event.leaders, ...event.participants];
      const userDetails = await fetchUserDetails(allUserUids);

      const leaderDetails = userDetails.filter((user) =>
        event.leaders.includes(user.uid)
      );
      const participantDetails = userDetails.filter((user) =>
        event.participants.includes(user.uid)
      );

      const assignments: SeatingAssignment[] = [];

      for (let session = 1; session <= 2; session++) {
        const distributedGroups = distributeParticipants(
          participantDetails,
          leaderDetails
        );

        leaderDetails.forEach((leader, index) => {
          const assignment: SeatingAssignment = {
            sessionNumber: session as 1 | 2,
            leaderUid: leader.uid,
            leaderDetails: leader,
            participants: distributedGroups[index] || [],
          };
          assignments.push(assignment);
        });
      }

      setSeatingAssignments(assignments);
      setShowSeatingTable(true);
      await saveSeatingArrangement(assignments);
    } catch (error) {
      alert(
        "좌석 배치 생성 중 오류가 발생했습니다: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setSeatingLoading(false);
    }
  };

  // Function to refresh seating arrangement
  const refreshSeatingArrangement = () => {
    generateSeatingArrangement();
  };

  // Helper functions
  const isValidDisplayName = (displayName?: string): boolean => {
    if (!displayName) return false;
    const userPattern = /^User [a-zA-Z0-9]{6}$/;
    return !userPattern.test(displayName);
  };

  const maskName = (name: string): string => {
    if (name.length <= 2) return name;
    const midIndex = Math.floor(name.length / 2);
    return name.substring(0, midIndex) + "*" + name.substring(midIndex + 1);
  };

  const formatParticipantDisplay = (user: UserWithDetails): string => {
    const validName = isValidDisplayName(user.displayName);
    if (!validName) return `익명 (${user.phoneLast4 || "****"})`;

    const maskedName = maskName(user.displayName!);
    return `${maskedName} (${user.phoneLast4 || "****"})`;
  };

  const formatLeaderDisplay = (user: UserWithDetails): string => {
    const validName = isValidDisplayName(user.displayName);
    return validName ? user.displayName! : "익명";
  };

  // useEffect hooks
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!currentUser) {
        setUserHasSubscription(null);
        setSubscriptionLoading(false);
        return;
      }

      // Exempt admin/leader/GDG users from needing a subscription
      if (
        accountStatus === "admin" ||
        accountStatus === "leader" ||
        isGdgMember === true
      ) {
        setUserHasSubscription(true);
        setSubscriptionLoading(false);
        return;
      }

      try {
        const hasSubscription = await hasActiveSubscription(currentUser.uid);
        setUserHasSubscription(hasSubscription);
      } catch (error) {
        console.error("Error checking subscription status:", error);
        setUserHasSubscription(false);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    checkSubscriptionStatus();
  }, [currentUser, accountStatus, isGdgMember]);

  useEffect(() => {
    if (!eventId) {
      setError("Event ID is required");
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToEvent(eventId, (eventData) => {
      setEvent(eventData);
      setLoading(false);
      if (!eventData) {
        setError("Event not found");
      } else {
        setError(null);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [eventId]);

  useEffect(() => {
    if (event && event.image_urls.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % event.image_urls.length);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [event]);

  useEffect(() => {
    const fetchArticles = async () => {
      if (event && event.articles && event.articles.length > 0) {
        try {
          const articles = await fetchArticlesByIds(event.articles);
          setArticleTopics(articles);
        } catch (error) {
          console.error("Error fetching articles for topics:", error);
          setArticleTopics([]);
        }
      } else {
        setArticleTopics([]);
      }
    };

    fetchArticles();
  }, [event]);

  useEffect(() => {
    const loadExistingSeating = async () => {
      const isLocalhost =
        typeof window !== "undefined" &&
        window.location.hostname === "localhost";
      if (event && (isAdmin || isLocalhost)) {
        try {
          const savedSeating = await loadSeatingArrangement();
          if (savedSeating) {
            setSeatingAssignments(savedSeating.assignments);
            setShowSeatingTable(true);
          } else if (isLocalhost) {
            // In localhost mode, if no saved seating exists, keep table visible but empty
            setShowSeatingTable(true);
          }
        } catch (error) {
          console.error("Error loading existing seating arrangement:", error);
          // In localhost mode, still show the seating section even if loading fails
          if (isLocalhost) {
            setShowSeatingTable(true);
          }
        }
      }
    };

    loadExistingSeating();
  }, [event, isAdmin]);

  useEffect(() => {
    const loadSeatingOnAdminConfirmed = async () => {
      const isLocalhost =
        typeof window !== "undefined" &&
        window.location.hostname === "localhost";
      if (
        (isAdmin || isLocalhost) &&
        event &&
        seatingAssignments.length === 0 &&
        !showSeatingTable
      ) {
        try {
          const savedSeating = await loadSeatingArrangement();
          if (savedSeating) {
            setSeatingAssignments(savedSeating.assignments);
            setShowSeatingTable(true);
          }
        } catch (error) {
          console.error("Error in late seating load:", error);
        }
      }
    };

    const timeoutId = setTimeout(loadSeatingOnAdminConfirmed, 500);
    return () => clearTimeout(timeoutId);
  }, [isAdmin]);

  useEffect(() => {
    const calculatePositionAndCheckFloat = () => {
      if (!actionButtonRef.current) {
        setIsButtonFloating(false);
        return;
      }

      if (!isButtonFloating || !staticButtonPositionRef.current) {
        const rect = actionButtonRef.current.getBoundingClientRect();
        staticButtonPositionRef.current = {
          top: rect.top + window.scrollY,
          height: actionButtonRef.current.offsetHeight,
        };
      }

      if (!staticButtonPositionRef.current) {
        setIsButtonFloating(false);
        return;
      }

      const { top: staticTop, height: staticHeight } =
        staticButtonPositionRef.current;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const staticBottom = staticTop + staticHeight;

      const isMobile = window.innerWidth <= 768;
      const buffer = isMobile ? 80 : 50;
      const bottomThreshold = isMobile ? 50 : 150;
      const isNearBottom =
        scrollY + windowHeight >= documentHeight - bottomThreshold;
      const wouldBeOutOfView = scrollY + windowHeight < staticBottom + buffer;
      const shouldFloat = wouldBeOutOfView && !isNearBottom;

      setIsButtonFloating(shouldFloat);
    };

    calculatePositionAndCheckFloat();

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          calculatePositionAndCheckFloat();
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleResize = () => {
      staticButtonPositionRef.current = null;
      setIsButtonFloating(false);
      setTimeout(calculatePositionAndCheckFloat, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Handler functions
  const handleBack = () => {
    router.push("/meetup");
  };

  const handleJoin = async () => {
    if (!currentUser) {
      localStorage.setItem("returnUrl", pathname);
      router.push("/auth");
      return;
    }

    if (!event) {
      alert("이벤트 정보가 없습니다.");
      return;
    }

    if (isCurrentUserParticipant) {
      // Check if event is locked down - prevent cancellation after lockdown
      const lockStatus = isEventLocked(event);
      if (lockStatus.isLocked && lockStatus.reason === "lockdown") {
        alert("모집 마감 시간이 지나 더 이상 참가를 취소할 수 없습니다.");
        return;
      }
      if (lockStatus.isLocked && lockStatus.reason === "started") {
        alert("이미 시작된 모임의 참가를 취소할 수 없습니다.");
        return;
      }

      try {
        await cancelParticipation(event.id, currentUser.uid);
        alert("밋업 참가가 취소되었습니다.");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.";
        alert(`오류: 참가 취소에 실패했습니다. (${message})`);
      }
    } else {
      const isExempt =
        accountStatus === "admin" ||
        accountStatus === "leader" ||
        isGdgMember === true;

      if (!isExempt) {
        try {
          const userHasActiveSubscription = await hasActiveSubscription(
            currentUser.uid
          );
          if (!userHasActiveSubscription) {
            setShowSubscriptionDialog(true);
            return;
          }
        } catch (err) {
          alert(
            "구독 상태를 확인하는 중 오류가 발생했습니다. 다시 시도해주세요."
          );
          return;
        }
      }

      if (accountStatus === "admin" || accountStatus === "leader") {
        setShowRoleChoiceDialog(true);
      } else {
        try {
          await joinEventAsRole(event.id, currentUser.uid, "participant");
          setShowParticipationSuccessDialog(true);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "알 수 없는 오류가 발생했습니다.";
          alert(`오류: 참가 신청에 실패했습니다. (${message})`);
        }
      }
    }
  };

  const handleConfirmJoinAsRole = async (role: "leader" | "participant") => {
    setShowRoleChoiceDialog(false);
    if (!currentUser || !event) {
      alert("사용자 정보 또는 이벤트 정보가 없습니다.");
      return;
    }

    try {
      const isExempt =
        accountStatus === "admin" ||
        accountStatus === "leader" ||
        isGdgMember === true;
      if (!isExempt) {
        const userHasActiveSubscription = await hasActiveSubscription(
          currentUser.uid
        );
        if (!userHasActiveSubscription) {
          setShowSubscriptionDialog(true);
          return;
        }
      }
    } catch (err) {
      alert("구독 상태를 확인하는 중 오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }

    try {
      await joinEventAsRole(event.id, currentUser.uid, role);
      setShowParticipationSuccessDialog(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      alert(
        `오류: ${
          role === "leader" ? "리더" : "참가자"
        }로 참가 신청에 실패했습니다. (${message})`
      );
    }
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  const getCategoryEmoji = (categoryName: string): string => {
    switch (categoryName.toLowerCase()) {
      case "discussion":
        return "💬";
      case "movie night":
        return "🎬";
      case "picnic":
        return "🍉";
      case "socializing":
        return "👥";
      default:
        return "📅";
    }
  };

  const handleAvatarClick = async (uid: string) => {
    // Only allow admin actions if user is admin
    if (!isAdmin) return;

    if (!event) return;

    // Check if the clicked user is a leader or participant
    const isLeader = event.leaders.includes(uid);
    const isParticipant = event.participants.includes(uid);

    if (!isLeader && !isParticipant) return;

    // Don't allow admin to kick themselves out
    if (currentUser && uid === currentUser.uid) {
      alert("관리자는 자신을 제거할 수 없습니다.");
      return;
    }

    // Fetch user details properly
    let userDetails: UserWithDetails | null = null;

    // First try to find from seating assignments if available
    for (const assignment of seatingAssignments) {
      if (assignment.leaderDetails.uid === uid) {
        userDetails = assignment.leaderDetails;
        break;
      }
      const participant = assignment.participants.find((p) => p.uid === uid);
      if (participant) {
        userDetails = participant;
        break;
      }
    }

    // If not found in seating assignments, fetch directly
    if (!userDetails) {
      try {
        const fetchedDetails = await fetchUserDetails([uid]);
        if (fetchedDetails.length > 0) {
          userDetails = fetchedDetails[0];
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        // Fallback to basic info
        userDetails = {
          uid,
          displayName: `User ${uid.substring(0, 6)}`,
          phoneNumber: "",
          phoneLast4: "",
        };
      }
    }

    setSelectedUserId(uid);
    setSelectedUserIsLeader(isLeader);
    setSelectedUserDetails(userDetails); // Save details to state
    setShowAdminActionDialog(true);
  };

  const handleRemoveParticipant = async () => {
    if (!event || !selectedUserId || !currentUser) return;

    setAdminActionLoading(true);
    try {
      await removeParticipant(event.id, selectedUserId);
      alert("참가자가 성공적으로 제거되었습니다.");
      setShowAdminActionDialog(false);
    } catch (error) {
      console.error("Error removing participant:", error);
      alert(
        "참가자 제거 중 오류가 발생했습니다: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!event || !selectedUserId || !currentUser) return;

    const newRole = selectedUserIsLeader ? "participant" : "leader";

    setAdminActionLoading(true);
    try {
      await changeUserRole(event.id, selectedUserId, newRole);
      alert(
        `사용자 역할이 성공적으로 ${
          newRole === "leader" ? "리더" : "참가자"
        }로 변경되었습니다.`
      );
      setShowAdminActionDialog(false);
    } catch (error) {
      console.error("Error changing user role:", error);
      alert(
        "사용자 역할 변경 중 오류가 발생했습니다: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleCreateNew = () => {
    setDialogTemplateEvent(null);
    setDialogEditEvent(null);
    setShowAdminDialog(true);
  };

  const handleDuplicate = () => {
    setDialogTemplateEvent(event);
    setDialogEditEvent(null);
    setShowAdminDialog(true);
  };

  const handleEdit = () => {
    setDialogTemplateEvent(null);
    setDialogEditEvent(event);
    setShowAdminDialog(true);
  };

  const handleEventCreated = (newEventId: string) => {
    router.push(`/meetup/${newEventId}`);
    handleDialogClose();
  };

  const handleEventUpdated = () => {
    handleDialogClose();
  };

  const handleDialogClose = () => {
    setShowAdminDialog(false);
    setDialogTemplateEvent(null);
    setDialogEditEvent(null);
  };

  const handleGoToPayment = () => {
    setShowSubscriptionDialog(false);
    router.push("/payment");
  };

  const handleArticleTopicClick = (articleId: string) => {
    router.push(`/article/${articleId}`);
  };

  const handleSeatingGroupClick = async (assignment: SeatingAssignment) => {
    // Allow localhost access even without login for testing
    const isLocalhost =
      typeof window !== "undefined" && window.location.hostname === "localhost";
    if (!isLocalhost && (!currentUser?.uid || !isAdmin)) return;

    try {
      // Check if this assignment already has a transcript
      if (assignment.transcriptId) {
        console.log(
          `[Transcript] Using existing transcript: ${assignment.transcriptId}`
        );
        router.push(`/transcript/${assignment.transcriptId}`);
        return;
      }

      // Generate a new transcript ID if one doesn't exist
      const transcriptId = `${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      console.log(
        `[Transcript] Creating new transcript: ${transcriptId} for session ${assignment.sessionNumber}, leader ${assignment.leaderUid}`
      );

      // Determine the article ID based on session number
      const articleId =
        assignment.sessionNumber === 1
          ? articleTopics[0]?.id || ""
          : articleTopics[1]?.id || "";

      // Create transcript document in Firestore
      const transcriptData = {
        id: transcriptId,
        eventId: eventId,
        sessionNumber: assignment.sessionNumber,
        articleId: articleId,
        leaderUids: [assignment.leaderUid],
        participantUids: assignment.participants.map((p) => p.uid),
        createdAt: new Date(),
        createdBy: currentUser?.uid || "localhost-user",
      };

      await setDoc(doc(db, "transcripts", transcriptId), transcriptData);

      // Update the seating arrangement in the meetup collection to include transcript ID
      const eventDoc = doc(db, "meetup", eventId);
      const eventSnapshot = await getDoc(eventDoc);

      if (eventSnapshot.exists()) {
        const eventData = eventSnapshot.data();
        const currentSeatingArrangement = eventData.seatingArrangement;

        if (
          currentSeatingArrangement &&
          currentSeatingArrangement.assignments
        ) {
          // Find and update the specific assignment
          const updatedAssignments = currentSeatingArrangement.assignments.map(
            (assign: any) => {
              if (
                assign.sessionNumber === assignment.sessionNumber &&
                assign.leaderUid === assignment.leaderUid
              ) {
                return { ...assign, transcriptId: transcriptId };
              }
              return assign;
            }
          );

          // Update the entire seating arrangement with the modified assignments
          await updateDoc(eventDoc, {
            "seatingArrangement.assignments": updatedAssignments,
          });

          console.log(
            `[Transcript] Updated seating arrangement with transcript ID: ${transcriptId}`
          );
        }
      }

      // Navigate to the transcript page
      router.push(`/transcript/${transcriptId}`);
    } catch (error) {
      console.error("Error handling transcript:", error);
      alert("Failed to access transcript. Please try again.");
    }
  };

  const handleSendReminderToParticipants = async () => {
    if (!event) {
      alert("이벤트 정보가 없습니다.");
      return;
    }

    const totalParticipants = event.leaders.length + event.participants.length;
    if (totalParticipants === 0) {
      alert("이 이벤트에는 참가자가 없습니다.");
      return;
    }

    const confirmSend = window.confirm(
      `${totalParticipants}명의 모든 참가자(리더 ${event.leaders.length}명 + 참가자 ${event.participants.length}명)에게 밋업 리마인더를 보내시겠습니까?`
    );

    if (!confirmSend) {
      return;
    }

    try {
      const sendMeetupReminder = httpsCallable(functions, "sendMeetupReminder");

      const result = await sendMeetupReminder({ eventId: event.id });
      const data = result.data as {
        success: boolean;
        messagesSent: number;
        message: string;
      };

      if (data.success) {
        alert(
          `성공적으로 ${data.messagesSent}명의 참가자에게 리마인더를 보냈습니다.`
        );
      } else {
        alert("리마인더 전송에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error sending reminder to participants:", error);
      alert(
        "리마인더 전송 중 오류가 발생했습니다: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  };

  const handleJoinClick = async () => {
    if (!currentUser) {
      localStorage.setItem("returnUrl", pathname);
      router.push("/auth");
      return;
    }

    const isExempt =
      accountStatus === "admin" ||
      accountStatus === "leader" ||
      isGdgMember === true;

    if (userHasSubscription === false && !isExempt) {
      setShowSubscriptionDialog(true);
      return;
    }

    await handleJoin();
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  // dnd-kit drag end handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Do nothing if dropped in the same place
    if (activeId === overId) {
      return;
    }

    const [activeSessionStr, activeUid] = activeId.split("-");
    const [overSessionStr, _] = overId.split("-");

    const activeSession = parseInt(activeSessionStr, 10);
    const overSession = parseInt(overSessionStr, 10);

    // Prevent dragging between sessions
    if (activeSession !== overSession) {
      return;
    }

    setSeatingAssignments((prevAssignments) => {
      let sourceGroupIndex = -1;
      let draggedItemIndex = -1;
      let draggedItem: UserWithDetails | undefined;

      // Find the source group and the dragged participant within the correct session
      prevAssignments.forEach((group, groupIndex) => {
        if (group.sessionNumber === activeSession) {
          const itemIndex = group.participants.findIndex(
            (p) => p.uid === activeUid
          );
          if (itemIndex !== -1) {
            sourceGroupIndex = groupIndex;
            draggedItemIndex = itemIndex;
            draggedItem = group.participants[itemIndex];
          }
        }
      });

      // If we didn't find the dragged item, something is wrong.
      if (sourceGroupIndex === -1 || !draggedItem) {
        return prevAssignments;
      }

      // Find the destination group within the same session
      let destGroupIndex = -1;

      // The `over.id` can be a participant's unique ID or a leader's unique ID
      const [__, overUid] = overId.split("-");
      prevAssignments.forEach((group, groupIndex) => {
        if (group.sessionNumber === overSession) {
          if (
            group.leaderUid === overUid ||
            group.participants.some((p) => p.uid === overUid)
          ) {
            destGroupIndex = groupIndex;
          }
        }
      });

      if (destGroupIndex === -1) {
        return prevAssignments;
      }

      const newAssignments = [...prevAssignments];

      // Remove from source group
      const sourceGroup = { ...newAssignments[sourceGroupIndex] };
      sourceGroup.participants = [...sourceGroup.participants];
      sourceGroup.participants.splice(draggedItemIndex, 1);
      newAssignments[sourceGroupIndex] = sourceGroup;

      // Add to destination group
      const destGroup = { ...newAssignments[destGroupIndex] };
      destGroup.participants = [...destGroup.participants];

      // Find drop position
      const overItemIndex = destGroup.participants.findIndex(
        (p) => p.uid === overUid
      );

      if (overItemIndex !== -1) {
        // Insert before the "over" item
        destGroup.participants.splice(overItemIndex, 0, draggedItem);
      } else {
        // Dropped on the group card (leader) or an empty list
        destGroup.participants.push(draggedItem);
      }
      newAssignments[destGroupIndex] = destGroup;

      // Save the updated arrangement to Firestore
      saveSeatingArrangement(newAssignments);

      return newAssignments;
    });
  };

  const activeParticipantData = useMemo(() => {
    if (!activeId) return null;
    const [sessionStr, uid] = activeId.split("-");
    const session = parseInt(sessionStr, 10);

    for (const assignment of seatingAssignments) {
      if (assignment.sessionNumber === session) {
        if (assignment.leaderDetails.uid === uid) {
          return {
            participant: assignment.leaderDetails,
            isLeader: true,
            session,
          };
        }
        const participant = assignment.participants.find((p) => p.uid === uid);
        if (participant) {
          return { participant, isLeader: false, session };
        }
      }
    }
    return null;
  }, [activeId, seatingAssignments]);

  // Loading state
  if (loading || (currentUser && subscriptionLoading)) {
    return <GlobalLoadingScreen />;
  }

  // Error state
  if (error || !event) {
    return (
      <Container>
        <div
          style={{ paddingTop: "80px", textAlign: "center", padding: "2rem" }}
        >
          <div
            style={{ color: "#666", fontSize: "16px", marginBottom: "1rem" }}
          >
            {error || `Event with ID "${eventId}" was not found.`}
          </div>
          <ActionButton
            $variant="join"
            onClick={handleBack}
            style={{ position: "static", margin: "0 auto", maxWidth: "200px" }}
          >
            ← Back to Events
          </ActionButton>
        </div>
      </Container>
    );
  }

  const lockStatus = isEventLocked(event);
  const isLocked = lockStatus.isLocked;

  const eventCategory = event.title.toLowerCase().includes("movie")
    ? "Movie Night"
    : event.title.toLowerCase().includes("business")
    ? "Socializing"
    : "Discussion";

  const eventTopics = event.topics
    .map(
      (topicRef) => sampleTopics[topicRef.topic_id as keyof typeof sampleTopics]
    )
    .filter(Boolean);

  const { countdownPrefix, eventTitle, isUrgent } =
    formatEventTitleWithCountdown(event);
  const totalParticipants = event.participants.length + event.leaders.length;

  // Check if event is past (has started or is completed)
  const isEventPast =
    lockStatus.reason === "started" ||
    new Date(`${event.date}T${event.time}`) < new Date();

  // Determine if the button should be disabled
  const shouldDisableButton = () => {
    if (!isLocked) return false;

    // If user is already enrolled, check if they can still cancel
    if (isCurrentUserParticipant) {
      // Allow cancellation if event is only full, but not if locked down or started
      return (
        lockStatus.reason === "lockdown" || lockStatus.reason === "started"
      );
    }

    // For non-enrolled users, disable for any lock reason
    return true;
  };

  const isButtonDisabled = shouldDisableButton();

  const getButtonText = () => {
    if (!isButtonDisabled) {
      if (!currentUser) {
        return "로그인하고 참가하기";
      }
      const isExempt =
        accountStatus === "admin" ||
        accountStatus === "leader" ||
        isGdgMember === true;
      if (userHasSubscription === false && !isExempt) {
        return "구독하고 참가하기";
      }
      return isCurrentUserParticipant ? "취소" : "참가 신청하기";
    }

    // Button is disabled - show appropriate locked message
    if (isCurrentUserParticipant) {
      // User is enrolled but can't cancel
      switch (lockStatus.reason) {
        case "started":
          return "참가 완료";
        case "lockdown":
          return "참가 확정 (마감됨)";
        default:
          return "모집 종료";
      }
    } else {
      // User is not enrolled and can't join
      switch (lockStatus.reason) {
        case "started":
          return "모집 종료";
        case "full":
          return "참가 인원 초과";
        case "lockdown":
          return "모집 종료";
        default:
          return "모집 종료";
      }
    }
  };

  return (
    <Container>
      <PhotoSlider>
        {event.image_urls.length > 0 ? (
          event.image_urls.map((url, index) => (
            <SliderImage
              key={index}
              src={url}
              alt={`Event ${index + 1}`}
              $active={index === currentImageIndex}
            />
          ))
        ) : (
          <SliderPlaceholder>🖼️</SliderPlaceholder>
        )}
      </PhotoSlider>

      <Content>
        <CategoryTag $category={eventCategory}>
          <span>{getCategoryEmoji(eventCategory)}</span>
          {eventCategory}
        </CategoryTag>

        <Title>
          {!isEventPast && countdownPrefix && (
            <CountdownPrefix $isUrgent={isUrgent}>
              {countdownPrefix}
            </CountdownPrefix>
          )}
          {eventTitle}
        </Title>

        {articleTopics.length > 0 && isCurrentUserParticipant && (
          <ArticleTopicsSection>
            <SectionTitle>밋업 토픽</SectionTitle>
            {articleTopics.slice(0, 2).map((topic, index) => (
              <ArticleTopicCard
                key={topic.id}
                onClick={() => handleArticleTopicClick(topic.id)}
              >
                <ArticleTopicNumber>{index + 1}</ArticleTopicNumber>
                <ArticleTopicTitle>{topic.title.english}</ArticleTopicTitle>
              </ArticleTopicCard>
            ))}
          </ArticleTopicsSection>
        )}

        {isGdgMember && articleTopics.length >= 3 && (
          <ArticleTopicsSection>
            <SectionTitle>
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <span
                  style={{
                    background:
                      "linear-gradient(90deg, #4285F4 0%, #DB4437 100%)",
                    color: "white",
                    borderRadius: 12,
                    padding: "4px 10px",
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: 0.4,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  GDG Topic
                </span>
              </span>
              - GDG 멤버는 첫 세션에서 1번 토픽 대신 아래 토픽으로 진행합니다
            </SectionTitle>
            <ArticleTopicCard
              onClick={() => handleArticleTopicClick(articleTopics[2].id)}
            >
              <ArticleTopicNumber>G</ArticleTopicNumber>
              <ArticleTopicTitle>
                {articleTopics[2].title.english}
              </ArticleTopicTitle>
            </ArticleTopicCard>
          </ArticleTopicsSection>
        )}

        <Description>{event.description}</Description>

        <SectionTitle>세부 사항</SectionTitle>
        <DetailRow>
          <DetailIcon>
            <ClockIcon width="18px" height="18px" />
          </DetailIcon>
          <DetailText>일정 시간: {event.duration_minutes}분</DetailText>
        </DetailRow>
        <DetailRow>
          <DetailIcon>
            <CalendarIcon width="18px" height="18px" />
          </DetailIcon>
          <DetailText>시작 시간: {formatEventDateTime(event)}</DetailText>
        </DetailRow>
        <DetailRow>
          <DetailIcon>
            <PinIcon width="18px" height="18px" />
          </DetailIcon>
          <DetailText>
            {event.location_name} ({event.location_address},{" "}
            {event.location_extra_info})
          </DetailText>
        </DetailRow>

        {event.latitude && event.longitude && (
          <NaverMapComponent
            latitude={event.latitude}
            longitude={event.longitude}
            locationName={event.location_name}
            mapUrl={event.location_map_url}
          />
        )}

        <SectionTitle>
          참가 예정 ({totalParticipants}/{event.max_participants})
        </SectionTitle>
        <ParticipantsGrid>
          {Array.from(
            new Set(
              event.participants.filter((uid) => uid && uid.trim() !== "")
            )
          )
            .slice(0, 12)
            .map((participantUid, index) => (
              <UserAvatar
                key={`participant-${participantUid}-${index}`}
                uid={participantUid}
                size={40}
                isLeader={false}
                onClick={() => handleAvatarClick(participantUid)}
              />
            ))}
          {event.participants.length > 12 && (
            <div
              key="more-participants"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#666",
              }}
            >
              +{event.participants.length - 12}
            </div>
          )}
        </ParticipantsGrid>

        <SectionTitle>운영진 및 리더</SectionTitle>
        <ParticipantsGrid>
          {Array.from(
            new Set(event.leaders.filter((uid) => uid && uid.trim() !== ""))
          ).map((leaderUid, index) => (
            <UserAvatar
              key={`leader-${leaderUid}-${index}`}
              uid={leaderUid}
              size={40}
              isLeader={true}
              onClick={() => handleAvatarClick(leaderUid)}
            />
          ))}
        </ParticipantsGrid>

        {eventTopics.length > 0 && (
          <TopicsSection>
            <SectionTitle>Discussion Topics</SectionTitle>
            {eventTopics.map((topic, index) => (
              <TopicCard key={topic.id} onClick={() => toggleTopic(topic.id)}>
                <TopicTitle>
                  Topic {index + 1}: {topic.title}
                  <span>{expandedTopics[topic.id] ? "▲" : "▼"}</span>
                </TopicTitle>
                <TopicContent $expanded={expandedTopics[topic.id]}>
                  {"url" in topic && topic.url && (
                    <DetailRow style={{ marginBottom: "1rem" }}>
                      <DetailIcon>🔗</DetailIcon>
                      <DetailText>
                        <a
                          href={topic.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#2196f3" }}
                        >
                          {topic.url}
                        </a>
                      </DetailText>
                    </DetailRow>
                  )}
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    Discussion Points:
                  </div>
                  {topic.discussion_points.map(
                    (point: string, pointIndex: number) => (
                      <DiscussionPoint key={pointIndex}>
                        <span>•</span>
                        <span>{point}</span>
                      </DiscussionPoint>
                    )
                  )}
                </TopicContent>
              </TopicCard>
            ))}
          </TopicsSection>
        )}

        <ActionButtons ref={actionButtonRef} $isFloating={isButtonFloating}>
          <ActionButton
            $variant={
              isButtonDisabled
                ? "locked"
                : isCurrentUserParticipant
                ? "cancel"
                : "join"
            }
            onClick={isButtonDisabled ? undefined : handleJoinClick}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isButtonDisabled ? (
                "🔒"
              ) : isCurrentUserParticipant ? (
                <CancelIcon fillColor="#FFFFFF" width="20px" height="20px" />
              ) : (
                <JoinIcon fillColor="#FFFFFF" width="20px" height="20px" />
              )}
            </span>
            {getButtonText()}
          </ActionButton>
        </ActionButtons>

        {(isAdmin ||
          (typeof window !== "undefined" &&
            window.location.hostname === "localhost")) && (
          <ActionButtons ref={null} $isFloating={false}>
            <AdminButtons>
              <AdminButton onClick={handleEdit}>✏️ Edit Event</AdminButton>
              <AdminButton onClick={handleCreateNew}>
                🆕 Create New Event
              </AdminButton>
              <AdminButton onClick={handleDuplicate}>
                📋 Duplicate This Event
              </AdminButton>
              <AdminButton
                onClick={generateSeatingArrangement}
                disabled={seatingLoading}
              >
                {seatingLoading ? "⏳ Generating..." : "🪑 Generate Seating"}
              </AdminButton>
              <AdminButton onClick={handleSendReminderToParticipants}>
                📱 Send Reminder to All
              </AdminButton>
            </AdminButtons>
          </ActionButtons>
        )}

        {/* Seating Arrangement Section */}
        {(isAdmin ||
          (typeof window !== "undefined" &&
            window.location.hostname === "localhost")) &&
          showSeatingTable && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SeatingSection>
                <SectionTitle>좌석 배치</SectionTitle>
                {typeof window !== "undefined" &&
                  window.location.hostname === "localhost" &&
                  !isAdmin && (
                    <div
                      style={{
                        background: "#fff3cd",
                        border: "1px solid #ffc107",
                        borderRadius: "8px",
                        padding: "0.75rem",
                        marginBottom: "1rem",
                        color: "#856404",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      🚧 Testing Mode: Seating arrangement visible for localhost
                      development
                    </div>
                  )}
                <SeatingControls>
                  <SeatingButton
                    onClick={refreshSeatingArrangement}
                    disabled={seatingLoading}
                  >
                    {seatingLoading ? "⏳" : "🔄"} 다시 배치하기
                  </SeatingButton>
                  <SeatingButton onClick={() => setShowSeatingTable(false)}>
                    ❌ 닫기
                  </SeatingButton>
                </SeatingControls>

                {seatingAssignments.length > 0 ? (
                  <SeatingTable>
                    {[1, 2].map((sessionNumber) => (
                      <div key={sessionNumber}>
                        <SessionTitle>세션 {sessionNumber}</SessionTitle>
                        {seatingAssignments
                          .filter(
                            (assignment) =>
                              assignment.sessionNumber === sessionNumber
                          )
                          .map((assignment) => (
                            <SortableContext
                              key={`${sessionNumber}-${assignment.leaderUid}`}
                              items={assignment.participants.map(
                                (p) => `${sessionNumber}-${p.uid}`
                              )}
                              strategy={verticalListSortingStrategy}
                            >
                              <GroupCard
                                key={`${sessionNumber}-${assignment.leaderUid}`}
                                $hasTranscript={!!assignment.transcriptId}
                                onClick={() =>
                                  handleSeatingGroupClick(assignment)
                                }
                              >
                                <LeaderInfo>
                                  <DraggableParticipant
                                    participant={assignment.leaderDetails}
                                    onAvatarClick={handleAvatarClick}
                                    isLeader={true}
                                    sessionNumber={sessionNumber}
                                  />
                                </LeaderInfo>

                                <ParticipantsList>
                                  {assignment.participants.map(
                                    (participant) => (
                                      <DraggableParticipant
                                        key={`${sessionNumber}-${participant.uid}`}
                                        participant={participant}
                                        onAvatarClick={handleAvatarClick}
                                        sessionNumber={sessionNumber}
                                      />
                                    )
                                  )}
                                </ParticipantsList>
                              </GroupCard>
                            </SortableContext>
                          ))}
                      </div>
                    ))}
                  </SeatingTable>
                ) : (
                  <div
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#64748b",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    좌석 배치가 아직 생성되지 않았습니다.
                    <br />
                    "🪑 Generate Seating" 버튼을 클릭하여 좌석을 배치하세요.
                  </div>
                )}
              </SeatingSection>
              <DragOverlay>
                {activeId && activeParticipantData ? (
                  <DraggableParticipant
                    participant={activeParticipantData.participant}
                    onAvatarClick={() => {}} // No action on overlay
                    isLeader={activeParticipantData.isLeader}
                    sessionNumber={activeParticipantData.session}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
      </Content>

      <AdminEventDialog
        isOpen={showAdminDialog}
        onClose={handleDialogClose}
        templateEvent={dialogTemplateEvent}
        editEvent={dialogEditEvent}
        creatorUid={currentUser?.uid || ""}
        onEventCreated={handleEventCreated}
        onEventUpdated={handleEventUpdated}
      />

      {showRoleChoiceDialog && (
        <DialogOverlay onClick={() => setShowRoleChoiceDialog(false)}>
          <DialogBox onClick={(e) => e.stopPropagation()}>
            <h3>참여 방식 선택</h3>
            <p>이 밋업에 어떤 역할로 참여하시겠습니까?</p>
            <DialogButton
              $primary
              onClick={() => handleConfirmJoinAsRole("leader")}
            >
              리더로 참여
            </DialogButton>
            <DialogButton
              onClick={() => handleConfirmJoinAsRole("participant")}
            >
              참가자로 참여
            </DialogButton>
            <DialogButton
              onClick={() => setShowRoleChoiceDialog(false)}
              style={{ marginTop: "0.5rem" }}
            >
              취소
            </DialogButton>
          </DialogBox>
        </DialogOverlay>
      )}

      {showSubscriptionDialog && (
        <DialogOverlay onClick={() => setShowSubscriptionDialog(false)}>
          <DialogBox onClick={(e) => e.stopPropagation()}>
            <h3>구독이 필요합니다</h3>
            <p>밋업에 참가하시려면 활성화된 구독이 필요합니다.</p>
            <p>결제 페이지에서 구독을 시작하시겠습니까?</p>
            <DialogButton $primary onClick={handleGoToPayment}>
              결제 페이지로 이동
            </DialogButton>
            <DialogButton
              onClick={() => setShowSubscriptionDialog(false)}
              style={{ marginTop: "0.5rem" }}
            >
              취소
            </DialogButton>
          </DialogBox>
        </DialogOverlay>
      )}

      {showParticipationSuccessDialog && (
        <DialogOverlay onClick={() => setShowParticipationSuccessDialog(false)}>
          <SuccessDialogBox onClick={(e) => e.stopPropagation()}>
            <SuccessTitle>
              <span>✔️</span> 모임 신청이 완료되었습니다!
            </SuccessTitle>
            <SuccessContent>
              <p>밋업 참가 신청이 성공적으로 완료되었습니다.</p>
              <p>
                궁금한 점이 있으시면 언제든지{" "}
                <KakaoLink
                  href="https://open.kakao.com/o/gtuiIuvh"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  오픈챗
                </KakaoLink>
                으로 문의해 주세요!
              </p>
              <p
                style={{
                  color: "#2e7d32",
                  fontWeight: "600",
                  fontSize: "1.1em",
                }}
              >
                그럼 모임에서 뵙겠습니다! ☕️😊
              </p>
            </SuccessContent>
            <SuccessDialogButton
              onClick={() => setShowParticipationSuccessDialog(false)}
            >
              확인
            </SuccessDialogButton>
          </SuccessDialogBox>
        </DialogOverlay>
      )}

      {showAdminActionDialog && (
        <DialogOverlay onClick={() => setShowAdminActionDialog(false)}>
          <DialogBox onClick={(e) => e.stopPropagation()}>
            <h3>사용자 관리</h3>
            <p>
              이 사용자에 대해 어떤 작업을 하시겠습니까?
              <br />
              <strong>
                {selectedUserDetails
                  ? `${selectedUserDetails.displayName || "익명"} (${
                      selectedUserDetails.phoneLast4 || "****"
                    })`
                  : `User ID: ${selectedUserId}`}
              </strong>
              <br />
              현재 역할: {selectedUserIsLeader ? "리더" : "참가자"}
            </p>

            <DialogButton
              $primary
              onClick={handleChangeRole}
              disabled={adminActionLoading}
            >
              {adminActionLoading
                ? "처리 중..."
                : `${selectedUserIsLeader ? "참가자" : "리더"}로 변경`}
            </DialogButton>

            <DialogButton
              onClick={handleRemoveParticipant}
              disabled={adminActionLoading}
              style={{
                backgroundColor: "#d32f2f",
                color: "white",
                marginTop: "0.5rem",
              }}
            >
              {adminActionLoading ? "처리 중..." : "밋업에서 제거"}
            </DialogButton>

            <DialogButton
              onClick={() => setShowAdminActionDialog(false)}
              style={{ marginTop: "0.5rem" }}
            >
              취소
            </DialogButton>
          </DialogBox>
        </DialogOverlay>
      )}
    </Container>
  );
}
