import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, {keyframes } from 'styled-components';
import { MeetupEvent } from '../types/meetup_types';
import { fetchMeetupEvents } from '../services/meetup_service';
import { formatEventDateTime, isEventLocked, formatEventTitleWithCountdown } from '../utils/meetup_helpers';
import { UserAvatarStack } from '../components/user_avatar';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

// Shining animation keyframes
const shiningAnimation = keyframes`
  0% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 0 rgba(255, 215, 0, 0.4);
  }
  50% {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 0 20px 5px rgba(255, 215, 0, 0.6);
  }
  100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 0 rgba(255, 215, 0, 0.4);
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
    padding: 0 1rem; // Increased from 0.75rem for better spacing
    max-width: 100%;
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

const EventCard = styled.div<{ $isPast?: boolean; $isShining?: boolean }>`
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
  animation: ${props => props.$isShining ? shiningAnimation : 'none'} 2s infinite;
  
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
  font-size: 18px;
  flex-shrink: 0; // Prevents icons from shrinking
  
  @media (max-width: 768px) {
    font-size: 14px;
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
  margin-top: 12px;
  gap: 8px; // Adds gap to prevent overlap
  
  @media (max-width: 768px) {
    margin-top: 8px;
    gap: 6px;
  }
`;

const AvatarContainer = styled.div`
  display: flex;
  align-items: center;
  height: 30px;
  flex: 1;
  min-width: 0; // Allows container to shrink
  
  @media (max-width: 768px) {
    height: 24px;
  }
`;

const StatusContainer = styled.div<{ $fillRatio: number; $isFull: boolean; $isPast?: boolean }>`
  padding: 10px 20px;
  border-radius: 20px;
  background-color: ${props => {
    if (props.$isPast) return '#e0e0e0';
    if (props.$isFull) return '#9e9e9e';
    const blue = [33, 150, 243]; // Material Blue
    const orange = [255, 152, 0]; // Material Orange
    const ratio = props.$fillRatio;
    const r = Math.round(blue[0] + (orange[0] - blue[0]) * ratio);
    const g = Math.round(blue[1] + (orange[1] - blue[1]) * ratio);
    const b = Math.round(blue[2] + (orange[2] - blue[2]) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }};
  flex-shrink: 0; // Prevents status from shrinking
  
  @media (max-width: 768px) {
    padding: 6px 12px;
    border-radius: 12px;
  }
`;

const StatusText = styled.span<{ $isPast?: boolean }>`
  color: ${props => props.$isPast ? '#999' : 'white'};
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap; // Prevents text wrapping in status
  
  @media (max-width: 768px) {
    font-size: 11px;
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
  width: 100%;
  padding: 1rem;
  margin: 1rem 0;
  background-color: #f5f5f5;
  border: 2px solid #e0e0e0;
  border-radius: 20px;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #eeeeee;
    border-color: #cccccc;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    margin: 0.75rem 0;
    font-size: 13px;
    border-radius: 16px;
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

  const handleEventClick = (meetupId: string) => {
    navigate(`/meetup/${meetupId}`);
  };

  const handleAvatarClick = (uid: string) => {
    // Handle avatar click - could show user profile modal, etc.
    console.log('Avatar clicked for user:', uid);
  };

  // Find the most imminent upcoming event that's not full
  const getMostImminentNonFullEvent = (): MeetupEvent | null => {
    const nonFullUpcomingEvents = upcomingEvents.filter(event => {
      const totalOccupied = event.current_participants + event.leaders.length;
      return totalOccupied < event.max_participants;
    });
    
    return nonFullUpcomingEvents.length > 0 ? nonFullUpcomingEvents[0] : null;
  };

  const renderEventCard = (meetup: MeetupEvent, isPast: boolean = false) => {
    const joined = meetup.current_participants;
    const totalOccupied = joined + meetup.leaders.length; // Include leaders in the count
    const fillRatio = Math.min(totalOccupied / meetup.max_participants, 1.0);
    const lockStatus = isEventLocked(meetup);
    const isLocked = lockStatus.isLocked;

    // Get countdown information for the title
    const { countdownPrefix, eventTitle, isUrgent } = formatEventTitleWithCountdown(meetup);

    // Determine if this event should have the shining effect
    const mostImminentEvent = getMostImminentNonFullEvent();
    const shouldShine = !isPast && mostImminentEvent?.id === meetup.id;

    // Determine status text based on lock reason
    const getStatusText = () => {
      if (isPast) return '✅ Completed';
      if (!isLocked) return `${totalOccupied} / ${meetup.max_participants} Going`;
      
      switch (lockStatus.reason) {
        case 'started': return '🔒 Started';
        case 'full': return '🔒 Full';
        case 'lockdown': return '🔒 Locked';
        default: return '🔒 Locked';
      }
    };
    
    return (
      <EventCard key={meetup.id} onClick={() => handleEventClick(meetup.id)} $isPast={isPast} $isShining={shouldShine}>
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
              {isPast ? (
                meetup.title
              ) : (
                <>
                  {countdownPrefix && (
                    <CountdownPrefix $isUrgent={isUrgent}>
                      {countdownPrefix}
                    </CountdownPrefix>
                  )}
                  {eventTitle}
                </>
              )}
            </EventTitle>
            
            <EventInfo>
              <EventIcon $isPast={isPast}>📍</EventIcon>
              <EventText $isPast={isPast}>
                {meetup.location_name}
                {meetup.location_address ? `, ${meetup.location_address}` : ''}
              </EventText>
            </EventInfo>
            
            <EventInfo>
              <EventIcon $isPast={isPast}>📅</EventIcon>
              <EventText $isPast={isPast}>
                {formatEventDateTime(meetup)}
              </EventText>
            </EventInfo>
            
            <EventBottom>
              <AvatarContainer>
                {(meetup.participants.length > 0 || meetup.leaders.length > 0) && (
                  <UserAvatarStack
                    uids={[...meetup.leaders, ...meetup.participants]}
                    maxAvatars={5}
                    size={28}
                    isLeader={false}
                    isPast={isPast}
                    onAvatarClick={handleAvatarClick}
                  />
                )}
              </AvatarContainer>
              
              <StatusContainer $fillRatio={fillRatio} $isFull={lockStatus.reason === 'full' || isLocked} $isPast={isPast}>
                <StatusText $isPast={isPast}>
                  {getStatusText()}
                </StatusText>
              </StatusContainer>
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
                {upcomingEvents.map(meetup => renderEventCard(meetup, false))}
              </>
            )}

            {/* Past Events Section */}
            {pastEvents.length > 0 && (
              <>
                <SectionTitle>이전 밋업</SectionTitle>
                {pastEvents.map(meetup => renderEventCard(meetup, true))}
              </>
            )}

            {/* Load More Button / Infinite Scroll Trigger */}
            {hasMore && (
              <LoadMoreButton
                ref={loadMoreButtonRef}
                onClick={loadMoreEvents}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading more events...' : 'Load more events'}
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