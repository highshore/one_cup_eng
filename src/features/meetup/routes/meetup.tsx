import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { MeetupEvent } from '../types/meetup_types';
import { fetchMeetupEvents } from '../services/meetup_service';
import { formatEventDateTime, isEventLocked, formatEventTitleWithCountdown } from '../utils/meetup_helpers';
import { UserAvatarStack } from '../components/user_avatar';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { PinIcon, CalendarIcon } from '../components/meetup_icons';

// Add subtle glow animation keyframes
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

// Styled components - Day Mode Theme
const MeetupContainer = styled.div`
  min-height: 100vh;
  background-color: transparent;
  color: #333;
  padding-top: 80px;
  
  @media (max-width: 768px) {
    padding-top: 60px; // Reduced for mobile
  }
`;

const Header = styled.header`
  background-color: transparent;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 80px;
  
  @media (max-width: 768px) {
    height: 60px;
    padding: 0.75rem;
  }
`;

const HeaderIcon = styled.button`
  background: none;
  border: none;
  color: #333;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
    padding: 0.375rem;
  }
`;

const Logo = styled.h1`
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ContentContainer = styled.div`
  padding: 0 1rem;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  
  @media (max-width: 768px) {
    max-width: 100%;
    padding: 0;
  }
`;

const SectionTitle = styled.h2`
  color: #333;
  font-size: 1.2rem;
  font-weight: 800;
  margin: 1.5rem 0 0.5rem 0;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin: 1.25rem 0 0.75rem 0;
  }
`;

const EventCard = styled.div<{ $isPast?: boolean; $isClosest?: boolean }>`
  background-color: white;
  border-radius: 20px;
  padding: 24px;
  margin: 20px 0;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  width: 100%;
  opacity: ${props => props.$isPast ? 0.6 : 1};
  
  /* Add subtle glow animation for closest upcoming event */
  ${props => props.$isClosest ? css`
    animation: ${subtleGlow} 3s ease-in-out infinite;
    border: 1px solid rgba(76, 175, 80, 0.3);
  ` : ''}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    opacity: ${props => props.$isPast ? 0.8 : 1};
  }
  
  @media (max-width: 768px) {
    padding: 16px;
    margin: 12px 0;
    border-radius: 16px;
  }
`;

const EventContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  
  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const EventImageContainer = styled.div<{ $isPast?: boolean }>`
  width: 120px;
  height: 120px;
  border-radius: 20px;
  overflow: hidden;
  background-color: #000000;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: ${props => props.$isPast ? 'grayscale(50%)' : 'none'};
  
  @media (max-width: 768px) {
    width: 80px;
    height: 80px;
    border-radius: 12px;
  }
`;

const EventImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const EventImagePlaceholder = styled.div`
  color: #ccc;
  font-size: 2.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const EventDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; // Prevents flex item from overflowing
`;

const EventTitle = styled.h3<{ $isPast?: boolean }>`
  color: ${props => props.$isPast ? '#999' : '#333'};
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px 0;
  line-height: 1.3;
  word-wrap: break-word; // Prevents long titles from overflowing
  
  @media (max-width: 768px) {
    font-size: 15px;
    margin: 0 0 6px 0;
    line-height: 1.2;
  }
`;

const CountdownPrefix = styled.span<{ $isUrgent?: boolean }>`
  color: ${props => props.$isUrgent ? '#DC143C' : 'inherit'}; /* Crimson for urgent countdown */
  font-weight: ${props => props.$isUrgent ? 'bold' : 'inherit'};
`;

const EventInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  
  @media (max-width: 768px) {
    gap: 6px;
    margin-bottom: 4px;
  }
`;

const EventIcon = styled.span<{ $isPast?: boolean }>`
  color: ${props => props.$isPast ? '#999' : '#666'};
  flex-shrink: 0; // Prevents icons from shrinking
  display: flex; // Added for better alignment of SVG
  align-items: center; // Added for better alignment of SVG
  
  @media (max-width: 768px) {
    /* font-size: 14px; // Removed */
  }
`;

const EventText = styled.span<{ $isPast?: boolean }>`
  color: ${props => props.$isPast ? '#999' : '#666'};
  font-size: 16px;
  letter-spacing: 0;
  word-wrap: break-word; // Prevents long text from overflowing
  
  @media (max-width: 768px) {
    font-size: 13px;
  }
`;

const EventBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  gap: 8px; // Adds gap to prevent overlap
  
  @media (max-width: 768px) {
    margin-top: 4px;
    gap: 6px;
  }
`;

// New StatusBadge styled component
const StatusBadge = styled.span<{ $statusColor: string }>`
  display: inline-block;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #FFFFFF; // White text for better contrast
  background-color: ${props => props.$statusColor};
  border-radius: 20px;
  text-align: center;
  min-width: 80px; // Minimum width for the badge
  transition: all 0.2s ease;

  @media (max-width: 768px) {
    font-size: 12px;
    padding: 6px 12px;
    min-width: 80px;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  color: #666;
  
  @media (max-width: 768px) {
    padding: 1.5rem 0.75rem;
    font-size: 14px;
  }
`;

const LoadMoreButton = styled.button`
  display: block;
  margin: 2rem auto 1rem auto;
  padding: 0.75rem 1.5rem;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 25px;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  
  &:hover {
    background-color: #eeeeee;
    border-color: #bbb;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem 1.25rem;
    margin: 1.5rem auto 0.75rem auto;
    font-size: 13px;
    border-radius: 20px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #666;
  
  @media (max-width: 768px) {
    padding: 2rem 1rem;
    font-size: 14px;
  }
`;

const MeetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState<MeetupEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<MeetupEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<MeetupEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreButtonRef = useRef<HTMLButtonElement>(null);

  // Helper function to convert MeetupEvent date and time to Date object
  const getEventDateTime = (event: MeetupEvent): Date => {
    return new Date(`${event.date}T${event.time}`);
  };

  // Separate events into upcoming and past
  const categorizeEvents = useCallback((events: MeetupEvent[]) => {
    const now = new Date();
    const upcoming: MeetupEvent[] = [];
    const past: MeetupEvent[] = [];
    
    events.forEach(event => {
      if (getEventDateTime(event) >= now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });
    
    // Sort upcoming events by date (ascending)
    upcoming.sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());
    
    // Sort past events by date (descending - most recent first)
    past.sort((a, b) => getEventDateTime(b).getTime() - getEventDateTime(a).getTime());
    
    setUpcomingEvents(upcoming);
    setPastEvents(past);
  }, []);

  // Load initial events
  const loadEvents = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setAllEvents([]);
        setLastDoc(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const result = await fetchMeetupEvents(reset ? undefined : (lastDoc ?? undefined));
      
      if (reset) {
        setAllEvents(result.events);
        categorizeEvents(result.events);
      } else {
        const newAllEvents = [...allEvents, ...result.events];
        setAllEvents(newAllEvents);
        categorizeEvents(newAllEvents);
      }
      
      setLastDoc(result.lastDoc);
      setHasMore(result.lastDoc !== null && result.events.length > 0);
      setError(null);
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc, allEvents, categorizeEvents]);

  // Load more events
  const loadMoreEvents = useCallback(() => {
    if (!loadingMore && hasMore && lastDoc) {
      loadEvents(false);
    }
  }, [loadingMore, hasMore, lastDoc, loadEvents]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loadingMore) {
          loadMoreEvents();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    if (loadMoreButtonRef.current) {
      observer.observe(loadMoreButtonRef.current);
    }

    return () => {
      if (loadMoreButtonRef.current) {
        observer.unobserve(loadMoreButtonRef.current);
      }
    };
  }, [hasMore, loadingMore, loadMoreEvents]);

  // Initial load
  useEffect(() => {
    loadEvents(true);
  }, []);

  // Scroll to top when component mounts or when filters change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleEventClick = (meetupId: string) => {
    navigate(`/meetup/${meetupId}`);
  };

  const handleAvatarClick = (uid: string) => {
    // Handle avatar click - could show user profile modal, etc.
    console.log('Avatar clicked for user:', uid);
  };

  const renderEventCard = (meetup: MeetupEvent, isPast: boolean = false, isClosest: boolean = false) => {
    const { countdownPrefix, eventTitle, isUrgent } = formatEventTitleWithCountdown(meetup);
    const lockStatus = isEventLocked(meetup);
    const isCurrentlyLocked = lockStatus.isLocked;
    
    // Calculate total participants (leaders + participants)
    const totalParticipants = meetup.leaders.length + meetup.participants.length;

    const getStatusText = () => {
      if (isPast) return '종료';
      if (!isCurrentlyLocked) return '참가 가능';
      switch (lockStatus.reason) {
        case 'started': return '진행중';
        case 'full': return '정원 마감';
        case 'lockdown': return '모집 종료';
        default: return '모집 종료';
      }
    };

    const statusColor = isPast ? '#757575' : (isCurrentlyLocked ? (lockStatus.reason === 'full' ? '#ff4d4f' : '#888') : '#4CAF50');
    
    return (
      <EventCard 
        key={meetup.id} 
        onClick={() => handleEventClick(meetup.id)}
        $isPast={isPast}
        $isClosest={isClosest}
      >
        <EventContent>
          <EventImageContainer $isPast={isPast}>
            {meetup.image_urls && meetup.image_urls.length > 0 ? (
              <EventImage src={meetup.image_urls[0]} alt={meetup.title} />
            ) : (
              <EventImagePlaceholder>🖼️</EventImagePlaceholder>
            )}
          </EventImageContainer>
          <EventDetails>
            <EventTitle $isPast={isPast}>
              {countdownPrefix && <CountdownPrefix $isUrgent={isUrgent}>{countdownPrefix}</CountdownPrefix>}
              {eventTitle}
            </EventTitle>
            <EventInfo>
              <EventIcon $isPast={isPast}><PinIcon width="16px" height="16px" /></EventIcon>
              <EventText $isPast={isPast}>{meetup.location_name}</EventText>
            </EventInfo>
            <EventInfo>
              <EventIcon $isPast={isPast}><CalendarIcon width="16px" height="16px" /></EventIcon>
              <EventText $isPast={isPast}>{formatEventDateTime(meetup)}</EventText>
            </EventInfo>
            <EventBottom>
          <UserAvatarStack 
            uids={[...meetup.leaders, ...meetup.participants]}
            maxAvatars={5}
            size={30}
            isPast={isPast}
            onAvatarClick={handleAvatarClick} 
          />
          <StatusBadge $statusColor={statusColor}>
            {getStatusText()} ({totalParticipants}/{meetup.max_participants})
          </StatusBadge>
        </EventBottom>
          </EventDetails>
  
        </EventContent>
        
      </EventCard>
    );
  };

  return (
    <MeetupContainer>
      <Header>
        <HeaderIcon>
          ❓
        </HeaderIcon>
        <Logo>English Meetups</Logo>
        <HeaderIcon>
          📱
        </HeaderIcon>
      </Header>

      <ContentContainer>
        {loading && (
          <LoadingContainer>
            Loading events...
          </LoadingContainer>
        )}

        {error && (
          <EmptyState>
            Error loading events: {error}
          </EmptyState>
        )}
        
        {!loading && !error && (
          <>
            {/* Upcoming Events Section */}
            {upcomingEvents.length > 0 && (
              <>
                <SectionTitle>현재 모집 중 🥳</SectionTitle>
                {upcomingEvents.map((meetup, index) => renderEventCard(meetup, false, index === 0))}
              </>
            )}

            {/* Past Events Section */}
            {pastEvents.length > 0 && (
              <>
                <SectionTitle>이전 밋업</SectionTitle>
                {pastEvents.map(meetup => renderEventCard(meetup, true, false))}
              </>
            )}

            {/* Load More Button */}
            {hasMore && (
              <LoadMoreButton
                ref={loadMoreButtonRef}
                onClick={loadMoreEvents}
                disabled={loadingMore}
              >
                {loadingMore ? '로딩 중...' : '더 보기'}
              </LoadMoreButton>
            )}

            {/* No Events Message */}
            {upcomingEvents.length === 0 && pastEvents.length === 0 && !loading && (
              <EmptyState>
                No events found.
              </EmptyState>
            )}
          </>
        )}
      </ContentContainer>
    </MeetupContainer>
  );
};

export default MeetupPage; 