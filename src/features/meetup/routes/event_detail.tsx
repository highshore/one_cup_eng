import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styled, { keyframes, css } from "styled-components";
import { MeetupEvent, Article } from "../types/meetup_types";
import {
  subscribeToEvent,
  joinEventAsRole,
  cancelParticipation,
  fetchArticlesByIds,
} from "../services/meetup_service";
import {
  formatEventDateTime,
  isEventLocked,
  sampleTopics,
  formatEventTitleWithCountdown,
} from "../utils/meetup_helpers";
import { UserAvatar } from "../components/user_avatar";
import { hasActiveSubscription } from "../services/user_service";
import { useAuth } from "../../../shared/contexts/auth_context";
import AdminEventDialog from "../components/admin_event_dialog";
import {
  PinIcon,
  CalendarIcon,
  ClockIcon,
  JoinIcon,
  CancelIcon,
} from "../components/meetup_icons";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebase";

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
    // Ensure no horizontal overflow
    overflow-x: hidden;
  }
`;

const PhotoSlider = styled.div`
  height: 40vh;
  position: relative;
  overflow: hidden;
  background-color: #000000; /* Black background for redundant space */
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
  object-fit: contain; /* Fits image within container without cropping */
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
  background-color: #000000; /* Black background to match the container */
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
  color: ${(props) =>
    props.$isUrgent ? "#DC143C" : "inherit"}; /* Crimson for urgent countdown */
  font-weight: ${(props) => (props.$isUrgent ? "bold" : "inherit")};
`;

const Description = styled.p`
  color: #333;
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
  white-space: pre-wrap; /* Preserves newlines, spaces, and tabs from the original text */
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
  max-width: 920px;
  transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
  z-index: 1000;

  ${({ $isFloating }) =>
    $isFloating
      ? css`
          position: fixed;
          bottom: 30px; /* Desktop floating bottom */
          left: 20px;
          right: 20px;
          margin: 0 auto; /* Center the fixed element */
          padding-bottom: 0;
          z-index: 1050; /* Higher z-index when floating */
        `
      : css`
          position: static;
          margin: 2rem auto 0 auto; /* Center static group on desktop */
          padding-bottom: 0;
          z-index: 1000;
        `}

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 12px;
    width: auto; /* Allow it to be constrained by left/right */

    ${({ $isFloating }) =>
      $isFloating
        ? css`
            position: fixed !important; /* Force fixed positioning for mobile floating */
            bottom: 20px !important; /* Mobile floating bottom */
            left: 16px !important;
            right: 16px !important;
            margin: 0 !important; /* Reset margin when floating */
            padding-bottom: 16px; /* Extra space below floating buttons on mobile */
            z-index: 1050 !important; /* Ensure high z-index on mobile */
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15); /* Add shadow to indicate floating */
            backdrop-filter: blur(
              10px
            ); /* Add backdrop blur for better visibility */
            -webkit-backdrop-filter: blur(10px); /* Safari support */
          `
        : css`
            position: static !important; /* Ensure static positioning for mobile non-floating */
            margin: 1.5rem auto 0 auto !important; /* Center static group on mobile */
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

  /* Background styles based on variant */
  background-color: ${(props) => {
    if (props.$variant === "locked") return "#e0e0e0";
    if (props.$variant === "cancel") return "#990033";
    return "#000000"; // Black for join button
  }};

  /* Gradient background specifically for join button */
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

// New Styled Components for Role Choice Dialog
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
  z-index: 1050; // Higher than GNB and floating buttons
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

const SessionCard = styled.div`
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
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

const GroupCard = styled.div`
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
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
    }, 100); // Small delay to ensure DOM is ready

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
        console.log("[NaverMapComponent] Naver Maps API already available");
        setIsApiReady(true);
        return;
      }

      // Always set up global callbacks first, regardless of script loading state
      window.initNaverMaps = () => {
        console.log("[NaverMapComponent] Naver Maps API loaded via callback");
        setIsApiReady(true);
      };

      window.navermap_authFailure = () => {
        console.error(
          "[NaverMapComponent] Naver Maps API Authentication Failed"
        );
        setLoadError("Naver Maps API Authentication Failed");
      };

      // Check if script is already loading
      const existingScript = document.querySelector(
        'script[src*="oapi.map.naver.com"]'
      );
      if (existingScript) {
        console.log(
          "[NaverMapComponent] Naver Maps API script already loading, waiting for callback..."
        );

        // Set up a fallback timer to check if API becomes available
        const checkTimer = setInterval(() => {
          if (
            window.naver &&
            window.naver.maps &&
            typeof window.naver.maps.Map === "function"
          ) {
            console.log(
              "[NaverMapComponent] Naver Maps API detected as ready (fallback check)"
            );
            setIsApiReady(true);
            clearInterval(checkTimer);
          }
        }, 500);

        // Give up after 10 seconds
        setTimeout(() => {
          clearInterval(checkTimer);
          if (!window.naver || !window.naver.maps) {
            console.error(
              "[NaverMapComponent] Timeout waiting for Naver Maps API"
            );
            setLoadError("Timeout loading Naver Maps API");
          }
        }, 10000);

        return;
      }

      // Create and inject script tag
      console.log("[NaverMapComponent] Creating new Naver Maps API script");
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=3cyz9x5q6l&submodules=geocoder&callback=initNaverMaps";
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log("[NaverMapComponent] Script onload event fired");
      };

      script.onerror = () => {
        console.error(
          "[NaverMapComponent] Failed to load Naver Maps API script"
        );
        setLoadError("Failed to load Naver Maps API");
      };

      document.head.appendChild(script);
      console.log("[NaverMapComponent] Naver Maps API script injected");
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
      console.log("[NaverMapComponent] Map initialization check:", {
        isApiReady,
        hasMapRef: !!mapRef.current,
        loadError,
        componentMounted,
      });
      return;
    }

    console.log(
      "[NaverMapComponent] Starting map initialization with coordinates:",
      { latitude, longitude }
    );
    console.log("[NaverMapComponent] Available Naver objects:", {
      hasNaver: !!window.naver,
      hasMaps: !!(window.naver && window.naver.maps),
      hasLatLng: !!(
        window.naver &&
        window.naver.maps &&
        window.naver.maps.LatLng
      ),
      hasMap: !!(window.naver && window.naver.maps && window.naver.maps.Map),
      hasMarker: !!(
        window.naver &&
        window.naver.maps &&
        window.naver.maps.Marker
      ),
    });

    try {
      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error(
          `Invalid coordinates: lat=${latitude}, lng=${longitude}`
        );
      }

      // Check if required Naver Maps classes are available
      if (!window.naver.maps.LatLng) {
        throw new Error("window.naver.maps.LatLng is not available");
      }
      if (!window.naver.maps.Map) {
        throw new Error("window.naver.maps.Map is not available");
      }
      if (!window.naver.maps.Marker) {
        throw new Error("window.naver.maps.Marker is not available");
      }

      console.log("[NaverMapComponent] Creating LatLng position...");
      const position = new window.naver.maps.LatLng(latitude, longitude);
      console.log("[NaverMapComponent] Position created:", position);

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

      console.log("[NaverMapComponent] Creating map with options:", mapOptions);
      console.log("[NaverMapComponent] Map container element:", mapRef.current);

      const map = new window.naver.maps.Map(mapRef.current, mapOptions);
      console.log("[NaverMapComponent] Map created successfully:", map);

      // Create custom marker
      console.log("[NaverMapComponent] Creating marker...");
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
      console.log("[NaverMapComponent] Marker created successfully:", marker);

      // Add click event handlers
      const handleMapClick = () => {
        console.log(
          "[NaverMapComponent] Map clicked, opening Naver Maps search..."
        );
        // Always use the search URL format, ignoring the mapUrl prop
        const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(
          locationName
        )}`;
        window.open(searchUrl, "_blank");
      };

      if (window.naver.maps.Event) {
        window.naver.maps.Event.addListener(marker, "click", handleMapClick);
        window.naver.maps.Event.addListener(map, "click", handleMapClick);
        console.log("[NaverMapComponent] Event listeners added");
      } else {
        console.warn(
          "[NaverMapComponent] window.naver.maps.Event not available"
        );
      }

      setMapLoaded(true);
      console.log(
        "[NaverMapComponent] Map initialization completed successfully"
      );
    } catch (error) {
      console.error(
        "[NaverMapComponent] Error during map initialization:",
        error
      );
      console.error(
        "[NaverMapComponent] Error stack:",
        error instanceof Error ? error.stack : "No stack available"
      );
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

  // Always render the MapContainer when API is ready, show loading overlay if needed
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

const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, accountStatus } = useAuth();
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
  // Use accountStatus from auth context instead of separate isAdmin state
  const isAdmin = accountStatus === 'admin';
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [dialogTemplateEvent, setDialogTemplateEvent] =
    useState<MeetupEvent | null>(null);
  const [dialogEditEvent, setDialogEditEvent] = useState<MeetupEvent | null>(
    null
  );
  const [showRoleChoiceDialog, setShowRoleChoiceDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [articleTopics, setArticleTopics] = useState<Article[]>([]);
  const [userHasSubscription, setUserHasSubscription] = useState<
    boolean | null
  >(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  
  // Seating arrangement state
  const [seatingAssignments, setSeatingAssignments] = useState<SeatingAssignment[]>([]);
  const [showSeatingTable, setShowSeatingTable] = useState(false);
  const [seatingLoading, setSeatingLoading] = useState(false);

  const isCurrentUserParticipant = useMemo(() => {
    if (!currentUser || !event) return false;
    return (
      event.participants.includes(currentUser.uid) ||
      event.leaders.includes(currentUser.uid)
    );
  }, [currentUser, event]);

  // No longer need to check admin status separately since we use accountStatus from auth context

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      // Only check subscription status for logged-in users
      if (!currentUser) {
        setUserHasSubscription(null); // Set to null for unlogged users
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
  }, [currentUser]);

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

  // Fetch articles for topics when event data changes
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

  // Load existing seating arrangement when event loads
  useEffect(() => {
    const loadExistingSeating = async () => {
      console.log('🔍 Seating load check:', { event: !!event, isAdmin, currentUser: !!currentUser });
      
      if (event && isAdmin) {
        console.log('📋 Attempting to load existing seating arrangement...');
        try {
          const savedSeating = await loadSeatingArrangement();
          console.log('💾 Loaded seating data:', savedSeating);
          
          if (savedSeating) {
            console.log('✅ Setting seating assignments and showing table');
            setSeatingAssignments(savedSeating.assignments);
            setShowSeatingTable(true);
          } else {
            console.log('❌ No saved seating arrangement found');
          }
        } catch (error) {
          console.error("Error loading existing seating arrangement:", error);
        }
      } else {
        console.log('⏸️ Seating load skipped - missing requirements');
      }
    };

    loadExistingSeating();
  }, [event, isAdmin]);

  // Additional effect to handle case where admin status is determined after event loads
  useEffect(() => {
    const loadSeatingOnAdminConfirmed = async () => {
      console.log('👑 Admin status changed:', { isAdmin, event: !!event, hasSeatingData: seatingAssignments.length > 0 });
      
      if (isAdmin && event && seatingAssignments.length === 0 && !showSeatingTable) {
        console.log('🔄 Trying to load seating after admin confirmation...');
        try {
          const savedSeating = await loadSeatingArrangement();
          console.log('💾 Late-loaded seating data:', savedSeating);
          
          if (savedSeating) {
            console.log('✅ Late-setting seating assignments and showing table');
            setSeatingAssignments(savedSeating.assignments);
            setShowSeatingTable(true);
          }
        } catch (error) {
          console.error("Error in late seating load:", error);
        }
      }
    };

    // Small delay to ensure event data is fully loaded
    const timeoutId = setTimeout(loadSeatingOnAdminConfirmed, 500);
    return () => clearTimeout(timeoutId);
  }, [isAdmin]);

  useEffect(() => {
    const calculatePositionAndCheckFloat = () => {
      if (!actionButtonRef.current) {
        setIsButtonFloating(false);
        return;
      }

      // Force recalculate static position if not floating or not cached
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

      // Increased buffer for mobile to ensure floating works
      const isMobile = window.innerWidth <= 768;
      const buffer = isMobile ? 80 : 50;

      // Check if we're near the bottom of the page - use smaller threshold for mobile
      const bottomThreshold = isMobile ? 50 : 150; // Reduced mobile threshold
      const isNearBottom =
        scrollY + windowHeight >= documentHeight - bottomThreshold;

      // Button should float when it would be out of viewport AND we're not near the bottom
      const wouldBeOutOfView = scrollY + windowHeight < staticBottom + buffer;
      const shouldFloat = wouldBeOutOfView && !isNearBottom;

      // Temporary debugging for mobile
      if (isMobile) {
        console.log("Mobile Debug:", {
          scrollY,
          windowHeight,
          documentHeight,
          staticBottom,
          wouldBeOutOfView,
          isNearBottom,
          shouldFloat,
          bottomThreshold,
        });
      }

      setIsButtonFloating(shouldFloat);
    };

    // Initial calculation
    calculatePositionAndCheckFloat();

    // Use requestAnimationFrame for smoother mobile performance
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
      // Reset static position on resize
      staticButtonPositionRef.current = null;
      setIsButtonFloating(false);
      setTimeout(calculatePositionAndCheckFloat, 100);
    };

    // Add both scroll and touchmove for mobile
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []); // Remove isButtonFloating dependency to prevent infinite loops

  const handleBack = () => {
    navigate("/meetup");
  };

  const handleJoin = async () => {
    if (!currentUser) {
      // Store the current path in localStorage for post-login redirect
      localStorage.setItem("returnUrl", location.pathname);
      // Redirect to auth page
      navigate("/auth");
      return;
    }

    if (!event) {
      alert("이벤트 정보가 없습니다.");
      return;
    }

    if (isCurrentUserParticipant) {
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
      // Check subscription status before allowing join
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

      if (accountStatus === "admin" || accountStatus === "leader") {
        setShowRoleChoiceDialog(true);
      } else {
        try {
          await joinEventAsRole(event.id, currentUser.uid, "participant");
          alert("밋업에 참가자로 등록되셨습니다!");
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

    // Check subscription status before allowing join
    try {
      const userHasActiveSubscription = await hasActiveSubscription(
        currentUser.uid
      );
      if (!userHasActiveSubscription) {
        setShowSubscriptionDialog(true);
        return;
      }
    } catch (err) {
      alert("구독 상태를 확인하는 중 오류가 발생했습니다. 다시 시도해주세요.");
      return;
    }

    try {
      await joinEventAsRole(event.id, currentUser.uid, role);
      alert(
        `밋업에 ${role === "leader" ? "리더" : "참가자"}로 등록되셨습니다!`
      );
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

  const handleAvatarClick = (_uid: string) => {
    // Handle avatar click - could show user profile modal, etc.
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
    navigate(`/meetup/${newEventId}`);
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
    navigate("/payment");
  };

  const handleArticleTopicClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

  // Function to save seating arrangement to Firestore
  const saveSeatingArrangement = async (assignments: SeatingAssignment[]) => {
    if (!event || !currentUser) {
      console.log('❌ Cannot save seating: missing event or user', { event: !!event, currentUser: !!currentUser });
      alert('Cannot save seating: missing event or user data');
      return;
    }

    try {
      console.log('💾 Starting save process for event:', event.id);
      console.log('👤 Current user:', currentUser.uid);
      console.log('📊 Assignments to save:', assignments.length);
      
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../../firebase');
      
      const eventRef = doc(db, 'meetup', event.id);
      const seatingData: SavedSeatingArrangement = {
        assignments,
        generatedAt: new Date(),
        generatedBy: currentUser.uid,
      };

      console.log('📝 Seating data structure:', {
        assignmentsCount: assignments.length,
        generatedBy: currentUser.uid,
        generatedAt: seatingData.generatedAt,
        firstAssignment: assignments[0] ? {
          sessionNumber: assignments[0].sessionNumber,
          leaderUid: assignments[0].leaderUid,
          participantCount: assignments[0].participants.length
        } : null
      });

      console.log('🔄 Calling updateDoc...');
      const updateResult = await updateDoc(eventRef, {
        seatingArrangement: seatingData
      });
      
      console.log('✅ UpdateDoc completed:', updateResult);
      console.log('✅ Seating arrangement saved to Firestore successfully');
      
      // Add user feedback
      alert('좌석 배치가 성공적으로 저장되었습니다!');
      
    } catch (error) {
      console.error('💥 Error saving seating arrangement:', error);
      console.error('💥 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      alert('좌석 배치 저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Function to load seating arrangement from Firestore
  const loadSeatingArrangement = async (): Promise<SavedSeatingArrangement | null> => {
    if (!event) {
      console.log('❌ Cannot load seating: no event');
      return null;
    }

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../../firebase');
      
      console.log('🔍 Loading seating for event:', event.id);
      const eventRef = doc(db, 'meetup', event.id);
      const eventDoc = await getDoc(eventRef);
      
      console.log('📄 Event doc exists:', eventDoc.exists());
      
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        console.log('📋 Event doc data keys:', Object.keys(data || {}));
        console.log('🪑 Has seatingArrangement:', !!data?.seatingArrangement);
        
        if (data.seatingArrangement) {
          console.log('🎯 Found seating arrangement:', data.seatingArrangement);
          
          // Re-fetch user details to ensure we have current data
          const allUserUids = [...event.leaders, ...event.participants];
          console.log('👥 Re-fetching details for users:', allUserUids);
          
          const userDetails = await fetchUserDetails(allUserUids);
          console.log('📞 Fetched user details:', userDetails.length, 'users');
          
          // Reconstruct assignments with fresh user details
          const reconstructedAssignments = data.seatingArrangement.assignments.map((assignment: any) => {
            const leaderDetails = userDetails.find(user => user.uid === assignment.leaderUid);
            const participantDetails = assignment.participants.map((p: any) => 
              userDetails.find(user => user.uid === p.uid) || p
            );
            
            console.log(`🔧 Reconstructed group for leader ${assignment.leaderUid}:`, {
              leader: leaderDetails?.displayName,
              participants: participantDetails.length
            });
            
            return {
              ...assignment,
              leaderDetails: leaderDetails || assignment.leaderDetails,
              participants: participantDetails
            };
          });
          
          const result = {
            assignments: reconstructedAssignments,
            generatedAt: data.seatingArrangement.generatedAt.toDate(),
            generatedBy: data.seatingArrangement.generatedBy,
          };
          
          console.log('✅ Successfully reconstructed seating data');
          return result;
        }
      }
      console.log('❌ No seating arrangement found in Firestore');
      return null;
    } catch (error) {
      console.error('💥 Error loading seating arrangement:', error);
      return null;
    }
  };

  // Function to check if a display name is valid (not auto-generated)
  const isValidDisplayName = (displayName?: string): boolean => {
    if (!displayName) return false;
    // Check if it matches the pattern "User xxxxxx" where x is alphanumeric
    const userPattern = /^User [a-zA-Z0-9]{6}$/;
    return !userPattern.test(displayName);
  };

  // Function to mask one character in a name
  const maskName = (name: string): string => {
    if (name.length <= 2) return name;
    const midIndex = Math.floor(name.length / 2);
    return name.substring(0, midIndex) + '*' + name.substring(midIndex + 1);
  };

  // Function to format participant display (with masked name and phone)
  const formatParticipantDisplay = (user: UserWithDetails): string => {
    const validName = isValidDisplayName(user.displayName);
    if (!validName) return `익명 (${user.phoneLast4 || '****'})`;
    
    const maskedName = maskName(user.displayName!);
    return `${maskedName} (${user.phoneLast4 || '****'})`;
  };

  // Function to format leader display (clean name only)
  const formatLeaderDisplay = (user: UserWithDetails): string => {
    const validName = isValidDisplayName(user.displayName);
    return validName ? user.displayName! : '익명';
  };

  // Function to get user details with phone numbers
  const fetchUserDetails = async (uids: string[]): Promise<UserWithDetails[]> => {
    try {
      const getUserDisplayNames = httpsCallable(functions, "getUserDisplayNames");
      const response = await getUserDisplayNames({ userIds: uids });
      const result = response.data as {
        displayNames: Record<string, string>;
        phoneNumbers: Record<string, string>;
      };

      return uids.map(uid => ({
        uid,
        displayName: result.displayNames[uid] || `User ${uid.substring(0, 6)}`,
        phoneNumber: result.phoneNumbers[uid] || "",
        phoneLast4: result.phoneNumbers[uid] 
          ? result.phoneNumbers[uid].replace(/\D/g, "").slice(-4)
          : "",
      }));
    } catch (error) {
      console.error("Error fetching user details:", error);
      return uids.map(uid => ({
        uid,
        displayName: `User ${uid.substring(0, 6)}`,
        phoneNumber: "",
        phoneLast4: "",
      }));
    }
  };

  // Function to evenly distribute participants among leaders
  const distributeParticipants = (participants: UserWithDetails[], leaders: UserWithDetails[]): UserWithDetails[][] => {
    if (leaders.length === 0) return [];
    
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
    const groups: UserWithDetails[][] = leaders.map(() => []);
    
    // Distribute participants evenly
    shuffledParticipants.forEach((participant, index) => {
      const groupIndex = index % leaders.length;
      groups[groupIndex].push(participant);
    });
    
    return groups;
  };

  // Function to generate seating arrangement
  const generateSeatingArrangement = async () => {
    if (!event) {
      console.log('❌ Cannot generate seating: no event');
      return;
    }
    
    console.log('🎲 Starting seating generation for event:', event.id);
    console.log('👥 Leaders:', event.leaders.length, 'Participants:', event.participants.length);
    
    setSeatingLoading(true);
    try {
      // Get all user UIDs
      const allUserUids = [...event.leaders, ...event.participants];
      console.log('📋 All user UIDs:', allUserUids);
      
      // Fetch user details
      console.log('📞 Fetching user details...');
      const userDetails = await fetchUserDetails(allUserUids);
      console.log('✅ User details fetched:', userDetails.length, 'users');
      
      // Separate leaders and participants
      const leaderDetails = userDetails.filter(user => event.leaders.includes(user.uid));
      const participantDetails = userDetails.filter(user => event.participants.includes(user.uid));
      
      console.log('👑 Leader details:', leaderDetails.length);
      console.log('👤 Participant details:', participantDetails.length);
      
      // Generate assignments for both sessions
      const assignments: SeatingAssignment[] = [];
      
      for (let session = 1; session <= 2; session++) {
        console.log(`🎯 Generating session ${session}...`);
        const distributedGroups = distributeParticipants(participantDetails, leaderDetails);
        
        leaderDetails.forEach((leader, index) => {
          const assignment: SeatingAssignment = {
            sessionNumber: session as 1 | 2,
            leaderUid: leader.uid,
            leaderDetails: leader,
            participants: distributedGroups[index] || [],
          };
          assignments.push(assignment);
          console.log(`   👑 Leader ${leader.displayName} (${leader.uid}) -> ${assignment.participants.length} participants`);
        });
      }
      
      console.log('✅ Generated assignments:', assignments.length, 'total assignments');
      
      setSeatingAssignments(assignments);
      setShowSeatingTable(true);
      
      // Save to Firestore
      console.log('💾 About to save to Firestore...');
      await saveSeatingArrangement(assignments);
      console.log('✅ Save process completed');
      
    } catch (error) {
      console.error("💥 Error generating seating arrangement:", error);
      console.error('💥 Generation error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack'
      });
      alert("좌석 배치 생성 중 오류가 발생했습니다: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSeatingLoading(false);
    }
  };

  // Function to refresh seating arrangement
  const refreshSeatingArrangement = () => {
    generateSeatingArrangement();
  };

  // Loading state
  if (loading || (currentUser && subscriptionLoading)) {
    return (
      <Container>
        <div
          style={{ paddingTop: "80px", textAlign: "center", padding: "2rem" }}
        >
          <div
            style={{ color: "#666", fontSize: "16px", marginBottom: "1rem" }}
          >
            Loading event details...
          </div>
        </div>
      </Container>
    );
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

  // Determine category for styling (you might want to add this field to your Firestore schema)
  const eventCategory = event.title.toLowerCase().includes("movie")
    ? "Movie Night"
    : event.title.toLowerCase().includes("business")
    ? "Socializing"
    : "Discussion";

  // Get topics data (in real app, you'd fetch this from Firestore)
  const eventTopics = event.topics
    .map(
      (topicRef) => sampleTopics[topicRef.topic_id as keyof typeof sampleTopics]
    )
    .filter(Boolean);

  // Get countdown information for the title
  const { countdownPrefix, eventTitle, isUrgent } =
    formatEventTitleWithCountdown(event);

  // Calculate total participants including leaders
  const totalParticipants = event.participants.length + event.leaders.length;

  // Determine button text based on lock reason and participation status
  const getButtonText = () => {
    if (!isLocked) {
      // If user is not logged in
      if (!currentUser) {
        return "로그인하고 참가하기";
      }
      // If user is logged in but doesn't have subscription
      if (userHasSubscription === false) {
        return "구독하고 참가하기";
      }
      // Normal logged-in user with subscription
      return isCurrentUserParticipant ? "취소" : "참가 신청하기";
    }

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
  };

  const handleJoinClick = async () => {
    if (!currentUser) {
      // Store the current path in localStorage for post-login redirect
      localStorage.setItem("returnUrl", location.pathname);
      // Redirect to auth page
      navigate("/auth");
      return;
    }

    // Check subscription status for logged-in users
    if (userHasSubscription === false) {
      setShowSubscriptionDialog(true);
      return;
    }

    // If user has subscription, proceed with normal join logic
    await handleJoin();
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
          {countdownPrefix && (
            <CountdownPrefix $isUrgent={isUrgent}>
              {countdownPrefix}
            </CountdownPrefix>
          )}
          {eventTitle}
        </Title>

        {articleTopics.length > 0 && isCurrentUserParticipant && (
          <ArticleTopicsSection>
            <SectionTitle>밋업 토픽</SectionTitle>
            {articleTopics.map((topic, index) => (
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
          {/* Real user avatars for participants */}
          {event.participants.slice(0, 12).map((participantUid) => (
            <UserAvatar
              key={participantUid}
              uid={participantUid}
              size={40}
              isLeader={false}
              onClick={() => handleAvatarClick(participantUid)}
            />
          ))}
          {event.participants.length > 12 && (
            <div
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
          {/* Real user avatars for leaders */}
          {event.leaders.map((leaderUid) => (
            <UserAvatar
              key={leaderUid}
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
              isLocked ? "locked" : isCurrentUserParticipant ? "cancel" : "join"
            }
            onClick={isLocked ? undefined : handleJoinClick}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isLocked ? (
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
        {isAdmin && (
          <ActionButtons ref={null} $isFloating={false}>
            <AdminButtons>
              <AdminButton onClick={handleEdit}>✏️ Edit Event</AdminButton>
              <AdminButton onClick={handleCreateNew}>
                🆕 Create New Event
              </AdminButton>
              <AdminButton onClick={handleDuplicate}>
                📋 Duplicate This Event
              </AdminButton>
              <AdminButton onClick={generateSeatingArrangement} disabled={seatingLoading}>
                {seatingLoading ? "⏳ Generating..." : "🪑 Generate Seating"}
              </AdminButton>
            </AdminButtons>
          </ActionButtons>
        )}

        {/* Seating Arrangement Section */}
        {isAdmin && showSeatingTable && (
          <SeatingSection>
            <SectionTitle>좌석 배치</SectionTitle>
            <SeatingControls>
              <SeatingButton onClick={refreshSeatingArrangement} disabled={seatingLoading}>
                {seatingLoading ? "⏳" : "🔄"} 다시 배치하기
              </SeatingButton>
              <SeatingButton onClick={() => setShowSeatingTable(false)}>
                ❌ 닫기
              </SeatingButton>
            </SeatingControls>
            
            <SeatingTable>
              {[1, 2].map(sessionNumber => (
                <SessionCard key={sessionNumber}>
                  <SessionTitle>세션 {sessionNumber}</SessionTitle>
                  {seatingAssignments
                    .filter(assignment => assignment.sessionNumber === sessionNumber)
                    .map((assignment) => (
                      <GroupCard key={`${sessionNumber}-${assignment.leaderUid}`}>
                        <LeaderInfo>
                          <UserAvatar 
                            uid={assignment.leaderDetails.uid} 
                            size={32} 
                            isLeader={true}
                          />
                          <UserName>{formatLeaderDisplay(assignment.leaderDetails)}</UserName>
                          <LeaderBadge>리더</LeaderBadge>
                        </LeaderInfo>
                        
                        <ParticipantsList>
                          {assignment.participants.map((participant) => (
                            <ParticipantItem key={participant.uid}>
                              <UserAvatar 
                                uid={participant.uid} 
                                size={24} 
                                isLeader={false}
                              />
                              <UserName>{formatParticipantDisplay(participant)}</UserName>
                            </ParticipantItem>
                          ))}
                        </ParticipantsList>
                      </GroupCard>
                    ))}
                </SessionCard>
              ))}
            </SeatingTable>
          </SeatingSection>
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
    </Container>
  );
};

export default EventDetailPage;
