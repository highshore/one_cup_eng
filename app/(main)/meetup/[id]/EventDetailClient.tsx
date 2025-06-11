"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import styled, { keyframes, css } from "styled-components";
import {
  MeetupEvent,
  Article,
} from "../../../lib/features/meetup/types/meetup_types";
import {
  subscribeToEvent,
  joinEventAsRole,
  cancelParticipation,
  fetchArticlesByIds,
} from "../../../lib/features/meetup/services/meetup_service";
import {
  formatEventDateTime,
  isEventLocked,
  sampleTopics,
  formatEventTitleWithCountdown,
} from "../../../lib/features/meetup/utils/meetup_helpers";
import { UserAvatar } from "../../../lib/features/meetup/components/user_avatar";
import { hasActiveSubscription } from "../../../lib/features/meetup/services/user_service";
import { useAuth } from "../../../lib/contexts/auth_context";
import AdminEventDialog from "../../../lib/features/meetup/components/admin_event_dialog";
import {
  PinIcon,
  CalendarIcon,
  ClockIcon,
  JoinIcon,
  CancelIcon,
} from "../../../lib/features/meetup/components/meetup_icons";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase/firebase";

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
    overflow-x: hidden;
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

// Dialog components
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

export function EventDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, accountStatus } = useAuth();
  const [event, setEvent] = useState<MeetupEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const actionButtonRef = useRef<HTMLDivElement>(null);
  const [isButtonFloating, setIsButtonFloating] = useState(false);

  const eventId = params?.id as string;
  const isAdmin = accountStatus === "admin";
  const [showRoleChoiceDialog, setShowRoleChoiceDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [userHasSubscription, setUserHasSubscription] = useState<
    boolean | null
  >(null);

  const isCurrentUserParticipant = useMemo(() => {
    if (!currentUser || !event) return false;
    return (
      event.participants.includes(currentUser.uid) ||
      event.leaders.includes(currentUser.uid)
    );
  }, [currentUser, event]);

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

  const handleBack = () => {
    router.push("/meetup");
  };

  const handleJoin = async () => {
    if (!currentUser) {
      router.push("/auth");
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

  const handleGoToPayment = () => {
    setShowSubscriptionDialog(false);
    router.push("/payment");
  };

  // Loading state
  if (loading) {
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

  // Determine category for styling
  const eventCategory = event.title.toLowerCase().includes("movie")
    ? "Movie Night"
    : event.title.toLowerCase().includes("business")
    ? "Socializing"
    : "Discussion";

  // Get countdown information for the title
  const { countdownPrefix, eventTitle, isUrgent } =
    formatEventTitleWithCountdown(event);

  // Calculate total participants including leaders
  const totalParticipants = event.participants.length + event.leaders.length;

  // Determine button text based on lock reason and participation status
  const getButtonText = () => {
    if (!isLocked) {
      if (!currentUser) {
        return "로그인하고 참가하기";
      }
      if (userHasSubscription === false) {
        return "구독하고 참가하기";
      }
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
      router.push("/auth");
      return;
    }

    if (userHasSubscription === false) {
      setShowSubscriptionDialog(true);
      return;
    }

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

        <SectionTitle>
          참가 예정 ({totalParticipants}/{event.max_participants})
        </SectionTitle>
        <ParticipantsGrid>
          {event.participants.slice(0, 12).map((participantUid) => (
            <UserAvatar
              key={participantUid}
              uid={participantUid}
              size={40}
              isLeader={false}
              onClick={() => {}}
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
          {event.leaders.map((leaderUid) => (
            <UserAvatar
              key={leaderUid}
              uid={leaderUid}
              size={40}
              isLeader={true}
              onClick={() => {}}
            />
          ))}
        </ParticipantsGrid>

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
      </Content>

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
}
