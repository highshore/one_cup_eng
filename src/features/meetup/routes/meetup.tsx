import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// Styled components - Day Mode Theme
const MeetupContainer = styled.div`
  min-height: 100vh;
  background-color: transparent;
  color: #333;
  padding-top: 80px;
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
`;

const Logo = styled.h1`
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
`;

const ContentContainer = styled.div`
  padding: 0 1rem;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  
  @media (max-width: 768px) {
    padding: 0 0.75rem;
  }
`;

const SectionTitle = styled.h2`
  color: #333;
  font-size: 1.125rem;
  font-weight: 800;
  margin: 1.5rem 0 0.5rem 0;
  
  @media (max-width: 768px) {
    margin: 1rem 0 0.5rem 0;
  }
`;

const EventCard = styled.div`
  background-color: white;
  border-radius: 20px;
  padding: 24px;
  margin: 12px 0;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  width: 100%;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
  
  @media (max-width: 768px) {
    padding: 20px;
    margin: 8px 0;
  }
`;

const EventContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  
  @media (max-width: 768px) {
    gap: 15px;
  }
`;

const EventImageContainer = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 20px;
  overflow: hidden;
  background-color: #f5f5f5;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
  }
`;

const EventImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const EventImagePlaceholder = styled.div`
  color: #ccc;
  font-size: 2.5rem;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const EventDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const EventTitle = styled.h3`
  color: #333;
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 8px 0;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 14px;
    margin: 0 0 5px 0;
  }
`;

const EventInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  
  @media (max-width: 768px) {
    gap: 4px;
    margin-bottom: 3px;
  }
`;

const EventIcon = styled.span`
  color: #666;
  font-size: 16px;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const EventText = styled.span`
  color: #666;
  font-size: 14px;
  letter-spacing: 0;
  
  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const EventBottom = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  
  @media (max-width: 768px) {
    margin-top: 8px;
  }
`;

const AvatarContainer = styled.div`
  display: flex;
  align-items: center;
  height: 22px;
  flex: 1;
`;

const AvatarStack = styled.div`
  display: flex;
  position: relative;
  height: 22px;
`;

const Avatar = styled.div<{ $index: number; $imageUrl?: string }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #e0e0e0;
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};
  background-size: cover;
  background-position: center;
  position: absolute;
  left: ${props => props.$index * 16.5}px;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:after {
    content: ${props => !props.$imageUrl ? '"👤"' : '""'};
    color: #666;
    font-size: 10px;
  }
`;

const MoreAvatars = styled.div<{ $index: number }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #f0f0f0;
  position: absolute;
  left: ${props => props.$index * 16.5}px;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: #666;
  font-weight: bold;
`;

const StatusContainer = styled.div<{ $fillRatio: number; $isFull: boolean }>`
  padding: 5px 10px;
  border-radius: 10px;
  background-color: ${props => {
    if (props.$isFull) return '#9e9e9e';
    const blue = [33, 150, 243]; // Material Blue
    const orange = [255, 152, 0]; // Material Orange
    const ratio = props.$fillRatio;
    const r = Math.round(blue[0] + (orange[0] - blue[0]) * ratio);
    const g = Math.round(blue[1] + (orange[1] - blue[1]) * ratio);
    const b = Math.round(blue[2] + (orange[2] - blue[2]) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }};
`;

const StatusText = styled.span`
  color: white;
  font-size: 12px;
  font-weight: bold;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #666;
`;

// Sample data with placeholder avatars
const upcomingMeetups = [
  {
    id: 1,
    title: "English Speaking Practice - Beginner Friendly",
    date: "2024-01-15",
    time: "19:00",
    description: "Join us for a relaxed English conversation practice session. Perfect for beginners who want to improve their speaking confidence.",
    location: "Gangnam Station Exit 2",
    address: "Seoul, South Korea",
    latitude: 37.4979,
    longitude: 127.0276,
    mapUrl: "https://map.naver.com/v5/search/강남역%202번출구",
    maxParticipants: 15,
    currentParticipants: 8,
    imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=400&fit=crop",
    participants: [
      { id: '1', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
      { id: '2', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b187?w=150&h=150&fit=crop&crop=face' },
      { id: '3', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
      { id: '4', avatar: '' },
      { id: '5', avatar: '' },
    ]
  },
  {
    id: 2,
    title: "Business English Workshop",
    date: "2024-01-20", 
    time: "14:00",
    description: "Learn essential business English phrases and practice professional communication skills. Great for working professionals.",
    location: "Hongdae Culture Space",
    address: "Seoul, South Korea",
    latitude: 37.5563,
    longitude: 126.9234,
    mapUrl: "https://map.naver.com/v5/search/홍대문화공간",
    maxParticipants: 12,
    currentParticipants: 5,
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop",
    participants: [
      { id: '1', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
      { id: '2', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face' },
      { id: '3', avatar: '' },
    ]
  },
  {
    id: 3,
    title: "English Movie Night & Discussion",
    date: "2024-01-25",
    time: "18:30",
    description: "Watch an English movie together and discuss it afterwards. Improve your listening skills while having fun!",
    location: "Myeongdong Community Center",
    address: "Seoul, South Korea",
    latitude: 37.5636,
    longitude: 126.9831,
    mapUrl: "https://map.naver.com/v5/search/명동커뮤니티센터",
    maxParticipants: 20,
    currentParticipants: 20,
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=400&fit=crop",
    participants: [
      { id: '1', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
      { id: '2', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b187?w=150&h=150&fit=crop&crop=face' },
      { id: '3', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
      { id: '4', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
      { id: '5', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face' },
      { id: '6', avatar: '' },
      { id: '7', avatar: '' },
    ]
  }
];

const MeetupPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleEventClick = (meetupId: number) => {
    navigate(`/meetup/${meetupId}`);
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString + 'T' + timeString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
        {/* Upcoming Events Section */}
        <SectionTitle>Upcoming 🥳</SectionTitle>
        
        {upcomingMeetups.length === 0 ? (
          <EmptyState>
            No upcoming events found.
          </EmptyState>
        ) : (
          upcomingMeetups.map((meetup) => {
            const joined = meetup.currentParticipants;
            const fillRatio = Math.min(joined / meetup.maxParticipants, 1.0);
            const isFull = joined >= meetup.maxParticipants;
            const maxAvatars = 5;
            const displayedParticipants = meetup.participants.slice(0, maxAvatars);
            const hasMoreParticipants = meetup.participants.length > maxAvatars;
            
            return (
              <EventCard key={meetup.id} onClick={() => handleEventClick(meetup.id)}>
                <EventContent>
                  <EventImageContainer>
                    {meetup.imageUrl ? (
                      <EventImage src={meetup.imageUrl} alt={meetup.title} />
                    ) : (
                      <EventImagePlaceholder>🖼️</EventImagePlaceholder>
                    )}
                  </EventImageContainer>
                  
                  <EventDetails>
                    <EventTitle>{meetup.title}</EventTitle>
                    
                    <EventInfo>
                      <EventIcon>📍</EventIcon>
                      <EventText>
                        {meetup.location}{meetup.address ? `, ${meetup.address}` : ''}
                      </EventText>
                    </EventInfo>
                    
                    <EventInfo>
                      <EventIcon>📅</EventIcon>
                      <EventText>
                        {formatDateTime(meetup.date, meetup.time)}
                      </EventText>
                    </EventInfo>
                    
                    <EventBottom>
                      <AvatarContainer>
                        {displayedParticipants.length > 0 && (
                          <AvatarStack>
                            {displayedParticipants.map((participant, index) => (
                              <Avatar 
                                key={participant.id} 
                                $index={index}
                                $imageUrl={participant.avatar}
                              />
                            ))}
                            {hasMoreParticipants && (
                              <MoreAvatars $index={displayedParticipants.length}>
                                ···
                              </MoreAvatars>
                            )}
                          </AvatarStack>
                        )}
                      </AvatarContainer>
                      
                      <StatusContainer $fillRatio={fillRatio} $isFull={isFull}>
                        <StatusText>
                          {isFull ? '🔒 Full' : `${joined} / ${meetup.maxParticipants} Going`}
                        </StatusText>
                      </StatusContainer>
                    </EventBottom>
                  </EventDetails>
                </EventContent>
              </EventCard>
            );
          })
        )}
      </ContentContainer>
    </MeetupContainer>
  );
};

export default MeetupPage; 