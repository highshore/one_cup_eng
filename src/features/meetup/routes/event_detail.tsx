import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

// TypeScript declarations for Naver Maps
declare global {
  interface Window {
    naver: any;
    initNaverMaps?: () => void;
    navermap_authFailure?: () => void;
  }
}

// Types
interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  description: string;
  location: string;
  address: string;
  latitude: number;
  longitude: number;
  mapUrl?: string;
  maxParticipants: number;
  currentParticipants: number;
  imageUrls: string[];
  participants: { id: string; avatar: string; name: string }[];
  leaders: { id: string; avatar: string; name: string }[];
  category: string;
  fee: string;
  currency: string;
  topics?: { id: string; title: string; url: string; discussion: string[] }[];
}

// Styled components - Day Mode Theme
const Container = styled.div`
  min-height: 100vh;
  background-color: transparent;
  color: #333;
`;

const PhotoSlider = styled.div`
  height: 40vh;
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;
`;

const SliderImage = styled.img<{ $active: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  opacity: ${props => props.$active ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
`;

const SliderPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: #ccc;
  font-size: 3rem;
`;

const AppBar = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 100;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
`;

const BackButton = styled.button`
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

const Content = styled.div`
  padding: 80px 1rem 120px 1rem;
  max-width: 960px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 80px 0.75rem 120px 0.75rem;
  }
`;

const InfoSection = styled.div`
  padding: 1.5rem 0;
`;

const CategoryTag = styled.div<{ $category: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background-color: ${props => {
    switch (props.$category.toLowerCase()) {
      case 'discussion': return '#e3f2fd';
      case 'movie night': return '#ffebee';
      case 'picnic': return '#e8f5e8';
      case 'socializing': return '#fff3e0';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.$category.toLowerCase()) {
      case 'discussion': return '#1976d2';
      case 'movie night': return '#d32f2f';
      case 'picnic': return '#388e3c';
      case 'socializing': return '#f57c00';
      default: return '#666';
    }
  }};
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  color: #333;
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 1rem 0;
  line-height: 1.3;
`;

const Description = styled.p`
  color: #333;
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
`;

const SectionTitle = styled.h2`
  color: #333;
  font-size: 18px;
  font-weight: 700;
  margin: 1.5rem 0 0.5rem 0;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
`;

const DetailIcon = styled.span`
  color: #666;
  font-size: 16px;
  margin-top: 2px;
`;

const DetailText = styled.span`
  color: #666;
  font-size: 14px;
  line-height: 1.4;
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
`;

const ParticipantsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0.5rem 0;
`;

const Avatar = styled.div<{ $imageUrl?: string; $bgColor?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${props => props.$bgColor || '#e0e0e0'};
  background-image: ${props => props.$imageUrl ? `url(${props.$imageUrl})` : 'none'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.1);
  }
  
  &:after {
    content: ${props => !props.$imageUrl ? '"👤"' : '""'};
    color: #666;
    font-size: 16px;
  }
`;

const TopicsSection = styled.div`
  margin: 1rem 0;
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
`;

const TopicTitle = styled.h3`
  color: #333;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const TopicContent = styled.div<{ $expanded: boolean }>`
  max-height: ${props => props.$expanded ? '1000px' : '0'};
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
`;

const ActionButtons = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  gap: 16px;
  max-width: 960px;
  margin: 0 auto;
  z-index: 50;
`;

const ActionButton = styled.button<{ $variant: 'save' | 'join' | 'cancel' | 'locked'; $saved?: boolean }>`
  flex: ${props => props.$variant === 'save' ? '1' : '2'};
  padding: 1rem;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${props => props.$variant === 'locked' ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  background-color: ${props => {
    if (props.$variant === 'locked') return '#e0e0e0';
    if (props.$variant === 'save') return props.$saved ? '#ff5722' : '#f5f5f5';
    if (props.$variant === 'cancel') return '#f44336';
    return '#2196f3';
  }};
  
  color: ${props => {
    if (props.$variant === 'locked') return '#999';
    if (props.$variant === 'save' && !props.$saved) return '#333';
    return 'white';
  }};
  
  &:hover {
    transform: ${props => props.$variant !== 'locked' ? 'translateY(-2px)' : 'none'};
    box-shadow: ${props => props.$variant !== 'locked' ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none'};
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
  mapUrl 
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
      if (window.naver && window.naver.maps && typeof window.naver.maps.Map === 'function') {
        console.log('[NaverMapComponent] Naver Maps API already available');
        setIsApiReady(true);
        return;
      }

      // Always set up global callbacks first, regardless of script loading state
      window.initNaverMaps = () => {
        console.log('[NaverMapComponent] Naver Maps API loaded via callback');
        setIsApiReady(true);
      };

      window.navermap_authFailure = () => {
        console.error('[NaverMapComponent] Naver Maps API Authentication Failed');
        setLoadError('Naver Maps API Authentication Failed');
      };

      // Check if script is already loading
      const existingScript = document.querySelector('script[src*="oapi.map.naver.com"]');
      if (existingScript) {
        console.log('[NaverMapComponent] Naver Maps API script already loading, waiting for callback...');
        
        // Set up a fallback timer to check if API becomes available
        const checkTimer = setInterval(() => {
          if (window.naver && window.naver.maps && typeof window.naver.maps.Map === 'function') {
            console.log('[NaverMapComponent] Naver Maps API detected as ready (fallback check)');
            setIsApiReady(true);
            clearInterval(checkTimer);
          }
        }, 500);
        
        // Give up after 10 seconds
        setTimeout(() => {
          clearInterval(checkTimer);
          if (!window.naver || !window.naver.maps) {
            console.error('[NaverMapComponent] Timeout waiting for Naver Maps API');
            setLoadError('Timeout loading Naver Maps API');
          }
        }, 10000);
        
        return;
      }

      // Create and inject script tag
      console.log('[NaverMapComponent] Creating new Naver Maps API script');
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=3cyz9x5q6l&submodules=geocoder&callback=initNaverMaps';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('[NaverMapComponent] Script onload event fired');
      };
      
      script.onerror = () => {
        console.error('[NaverMapComponent] Failed to load Naver Maps API script');
        setLoadError('Failed to load Naver Maps API');
      };

      document.head.appendChild(script);
      console.log('[NaverMapComponent] Naver Maps API script injected');
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
      console.log('[NaverMapComponent] Map initialization check:', {
        isApiReady,
        hasMapRef: !!mapRef.current,
        loadError,
        componentMounted
      });
      return;
    }

    console.log('[NaverMapComponent] Starting map initialization with coordinates:', { latitude, longitude });
    console.log('[NaverMapComponent] Available Naver objects:', {
      hasNaver: !!window.naver,
      hasMaps: !!(window.naver && window.naver.maps),
      hasLatLng: !!(window.naver && window.naver.maps && window.naver.maps.LatLng),
      hasMap: !!(window.naver && window.naver.maps && window.naver.maps.Map),
      hasMarker: !!(window.naver && window.naver.maps && window.naver.maps.Marker)
    });

    try {
      // Validate coordinates
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error(`Invalid coordinates: lat=${latitude}, lng=${longitude}`);
      }

      // Check if required Naver Maps classes are available
      if (!window.naver.maps.LatLng) {
        throw new Error('window.naver.maps.LatLng is not available');
      }
      if (!window.naver.maps.Map) {
        throw new Error('window.naver.maps.Map is not available');
      }
      if (!window.naver.maps.Marker) {
        throw new Error('window.naver.maps.Marker is not available');
      }

      console.log('[NaverMapComponent] Creating LatLng position...');
      const position = new window.naver.maps.LatLng(latitude, longitude);
      console.log('[NaverMapComponent] Position created:', position);
      
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

      console.log('[NaverMapComponent] Creating map with options:', mapOptions);
      console.log('[NaverMapComponent] Map container element:', mapRef.current);
      
      const map = new window.naver.maps.Map(mapRef.current, mapOptions);
      console.log('[NaverMapComponent] Map created successfully:', map);

      // Create custom marker
      console.log('[NaverMapComponent] Creating marker...');
      const marker = new window.naver.maps.Marker({
        position: position,
        map: map,
        title: locationName,
        icon: {
          content: `
            <div style="
              width: 30px; 
              height: 30px; 
              background-color: #ff5722; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 3px solid white;
              cursor: pointer;
            ">
              <span style="color: white; font-size: 16px;">📍</span>
            </div>
          `,
          size: new window.naver.maps.Size(30, 30),
          anchor: new window.naver.maps.Point(15, 15),
        }
      });
      console.log('[NaverMapComponent] Marker created successfully:', marker);

      // Add click event handlers
      const handleMapClick = () => {
        console.log('[NaverMapComponent] Map clicked, opening URL...');
        if (mapUrl) {
          window.open(mapUrl, '_blank');
        } else {
          // Fallback to Naver Map search
          const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(locationName)}`;
          window.open(searchUrl, '_blank');
        }
      };

      if (window.naver.maps.Event) {
        window.naver.maps.Event.addListener(marker, 'click', handleMapClick);
        window.naver.maps.Event.addListener(map, 'click', handleMapClick);
        console.log('[NaverMapComponent] Event listeners added');
      } else {
        console.warn('[NaverMapComponent] window.naver.maps.Event not available');
      }

      setMapLoaded(true);
      console.log('[NaverMapComponent] Map initialization completed successfully');
    } catch (error) {
      console.error('[NaverMapComponent] Error during map initialization:', error);
      console.error('[NaverMapComponent] Error stack:', error instanceof Error ? error.stack : 'No stack available');
      setLoadError(`Error initializing map: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [isApiReady, latitude, longitude, locationName, mapUrl, loadError, componentMounted]);

  if (loadError) {
    return (
      <MapLoadingPlaceholder>
        ❌ {loadError}
      </MapLoadingPlaceholder>
    );
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
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#999',
          fontSize: '1rem',
          borderRadius: '12px',
          zIndex: 10
        }}>
          🗺️ Initializing map...
        </div>
      )}
    </MapContainer>
  );
};

// Sample events data - in real app this would come from API
const sampleEvents: Record<string, Event> = {
  '1': {
    id: 1,
    title: "English Speaking Practice - Beginner Friendly",
    date: "2024-01-15",
    time: "19:00",
    description: "Join us for a relaxed English conversation practice session. Perfect for beginners who want to improve their speaking confidence. We'll cover everyday topics and provide a supportive environment for learning.",
    location: "Gangnam Station Exit 2",
    address: "Seoul, South Korea",
    latitude: 37.4979, // Gangnam Station coordinates
    longitude: 127.0276,
    mapUrl: "https://map.naver.com/v5/search/강남역%202번출구",
    maxParticipants: 15,
    currentParticipants: 8,
    imageUrls: [
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&h=600&fit=crop"
    ],
    participants: [
      { id: '1', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', name: 'John' },
      { id: '2', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b187?w=150&h=150&fit=crop&crop=face', name: 'Sarah' },
      { id: '3', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', name: 'Mike' },
      { id: '4', avatar: '', name: 'Anna' },
      { id: '5', avatar: '', name: 'Tom' },
    ],
    leaders: [
      { id: 'leader1', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', name: 'Emma' }
    ],
    category: 'Discussion',
    fee: '5000',
    currency: 'KRW',
    topics: [
      {
        id: 'topic1',
        title: 'Daily Routines and Habits',
        url: 'https://example.com/daily-routines',
        discussion: [
          'What time do you usually wake up and why?',
          'Describe your morning routine',
          'What habits would you like to develop?',
          'How do you stay productive during the day?'
        ]
      },
      {
        id: 'topic2', 
        title: 'Travel and Cultural Experiences',
        url: 'https://example.com/travel-culture',
        discussion: [
          'What is your favorite travel destination?',
          'Describe a cultural difference you found interesting',
          'What would you like to explore in other countries?'
        ]
      }
    ]
  },
  '2': {
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
    imageUrls: [
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop"
    ],
    participants: [
      { id: '1', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', name: 'Alex' },
      { id: '2', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face', name: 'Chris' },
      { id: '3', avatar: '', name: 'Jordan' },
    ],
    leaders: [
      { id: 'leader2', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', name: 'David' }
    ],
    category: 'Socializing',
    fee: '8000',
    currency: 'KRW'
  },
  '3': {
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
    imageUrls: [
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&h=600&fit=crop"
    ],
    participants: [
      { id: '1', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', name: 'John' },
      { id: '2', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b187?w=150&h=150&fit=crop&crop=face', name: 'Sarah' },
      { id: '3', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', name: 'Mike' },
      { id: '4', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', name: 'Anna' },
      { id: '5', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face', name: 'Tom' },
      { id: '6', avatar: '', name: 'Lisa' },
      { id: '7', avatar: '', name: 'Mark' },
    ],
    leaders: [
      { id: 'leader3', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', name: 'Rachel' }
    ],
    category: 'Movie Night',
    fee: '3000',
    currency: 'KRW'
  }
};

const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Get event data by eventId
    const selectedEvent = eventId ? sampleEvents[eventId] : null;
    
    if (selectedEvent) {
      setEvent(selectedEvent);
      
      // Auto-slide images
      if (selectedEvent.imageUrls.length > 1) {
        const interval = setInterval(() => {
          setCurrentImageIndex((prev) => 
            (prev + 1) % selectedEvent.imageUrls.length
          );
        }, 3000);
        
        return () => clearInterval(interval);
      }
    } else {
      // If event not found, set to null to show error state
      setEvent(null);
    }
  }, [eventId]);

  const handleBack = () => {
    navigate('/meetup');
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleJoin = () => {
    if (isJoined) {
      setIsJoined(false);
      // Handle leave event
    } else {
      setIsJoined(true);
      // Handle join event
    }
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
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

  const getCategoryEmoji = (category: string) => {
    switch (category.toLowerCase()) {
      case 'discussion': return '💬';
      case 'movie night': return '🎬';
      case 'picnic': return '🍉';
      case 'socializing': return '👥';
      default: return '📅';
    }
  };

  const getAvatarColor = (index: number, isLeader: boolean = false) => {
    const colors = isLeader 
      ? ['#9c27b0', '#673ab7', '#3f51b5'] 
      : ['#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50'];
    return colors[index % colors.length];
  };

  if (!event) {
    return (
      <Container>
        <AppBar>
          <BackButton onClick={handleBack}>←</BackButton>
          <div>{eventId ? 'Event Not Found' : 'Loading...'}</div>
          <div></div>
        </AppBar>
        <div style={{ paddingTop: '80px', textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: '#666', fontSize: '16px', marginBottom: '1rem' }}>
            {eventId 
              ? `Event with ID "${eventId}" was not found.` 
              : 'Loading event details...'
            }
          </div>
          {eventId && (
            <ActionButton
              $variant="join"
              onClick={handleBack}
              style={{ position: 'static', margin: '0 auto', maxWidth: '200px' }}
            >
              ← Back to Events
            </ActionButton>
          )}
        </div>
      </Container>
    );
  }

  const joined = event.currentParticipants;
  const isFull = joined >= event.maxParticipants;
  const isLocked = isFull; // Simplified logic

  return (
    <Container>
      <PhotoSlider>
        {event.imageUrls.length > 0 ? (
          event.imageUrls.map((url, index) => (
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
        <InfoSection>
          <CategoryTag $category={event.category}>
            <span>{getCategoryEmoji(event.category)}</span>
            {event.category}
          </CategoryTag>
          
          <Title>{event.title}</Title>
          <Description>{event.description}</Description>

          <SectionTitle>Details</SectionTitle>
          <DetailRow>
            <DetailIcon>💰</DetailIcon>
            <DetailText>Fee: {event.fee} {event.currency}</DetailText>
          </DetailRow>
          <DetailRow>
            <DetailIcon>📅</DetailIcon>
            <DetailText>Start: {formatDateTime(event.date, event.time)}</DetailText>
          </DetailRow>
          <DetailRow>
            <DetailIcon>📍</DetailIcon>
            <DetailText>{event.location}, {event.address}</DetailText>
          </DetailRow>

          {event.latitude && event.longitude && (
            <NaverMapComponent 
              latitude={event.latitude}
              longitude={event.longitude}
              locationName={event.location}
              mapUrl={event.mapUrl}
            />
          )}

          <SectionTitle>Participants ({joined}/{event.maxParticipants})</SectionTitle>
          <ParticipantsGrid>
            {event.participants.map((participant, index) => (
              <Avatar
                key={participant.id}
                $imageUrl={participant.avatar}
                $bgColor={getAvatarColor(index)}
                title={participant.name}
              />
            ))}
          </ParticipantsGrid>

          <SectionTitle>Hosts & Leaders</SectionTitle>
          <ParticipantsGrid>
            {event.leaders.map((leader, index) => (
              <Avatar
                key={leader.id}
                $imageUrl={leader.avatar}
                $bgColor={getAvatarColor(index, true)}
                title={leader.name}
              />
            ))}
          </ParticipantsGrid>

          {event.category.toLowerCase() === 'discussion' && event.topics && (
            <TopicsSection>
              <SectionTitle>Discussion Topics</SectionTitle>
              {event.topics.map((topic, index) => (
                <TopicCard key={topic.id} onClick={() => toggleTopic(topic.id)}>
                  <TopicTitle>
                    Topic {index + 1}: {topic.title}
                    <span>{expandedTopics[topic.id] ? '▲' : '▼'}</span>
                  </TopicTitle>
                  <TopicContent $expanded={expandedTopics[topic.id]}>
                    {topic.url && (
                      <DetailRow style={{ marginBottom: '1rem' }}>
                        <DetailIcon>🔗</DetailIcon>
                        <DetailText>
                          <a href={topic.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2196f3' }}>
                            {topic.url}
                          </a>
                        </DetailText>
                      </DetailRow>
                    )}
                    <div style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#333' }}>
                      Discussion Points:
                    </div>
                    {topic.discussion.map((point, pointIndex) => (
                      <DiscussionPoint key={pointIndex}>
                        <span>•</span>
                        <span>{point}</span>
                      </DiscussionPoint>
                    ))}
                  </TopicContent>
                </TopicCard>
              ))}
            </TopicsSection>
          )}
        </InfoSection>
      </Content>

      <ActionButtons>
        <ActionButton
          $variant="save"
          $saved={isBookmarked}
          onClick={handleBookmark}
        >
          <span>{isBookmarked ? '🔖' : '🔗'}</span>
          Save
        </ActionButton>
        
        <ActionButton
          $variant={isLocked ? 'locked' : isJoined ? 'cancel' : 'join'}
          onClick={isLocked ? undefined : handleJoin}
        >
          <span>
            {isLocked ? '🔒' : isJoined ? '❌' : '✅'}
          </span>
          {isLocked ? 'Locked' : isJoined ? 'Cancel' : 'Join'}
        </ActionButton>
      </ActionButtons>
    </Container>
  );
};

export default EventDetailPage; 