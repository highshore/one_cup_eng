import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { MeetupEvent } from '../types/meetup_types';
import { subscribeToEvent } from '../services/meetup_service';
import { formatEventDateTime, isEventLocked, sampleTopics, formatEventTitleWithCountdown } from '../utils/meetup_helpers';
import { UserAvatar } from '../components/user_avatar';
import { isUserAdmin } from '../services/user_service';
import { useAuth } from '../../../shared/contexts/auth_context';
import AdminEventDialog from '../components/admin_event_dialog';

// TypeScript declarations for Naver Maps
declare global {
  interface Window {
    naver: any;
    initNaverMaps?: () => void;
    navermap_authFailure?: () => void;
  }
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
  opacity: ${props => props.$active ? 1 : 0};
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
    padding: 1.5rem 1rem 0 1rem;
    max-width: 100%;
  }
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
  color: ${props => props.$isUrgent ? '#DC143C' : 'inherit'}; /* Crimson for urgent countdown */
  font-weight: ${props => props.$isUrgent ? 'bold' : 'inherit'};
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
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    font-size: 14px;
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
  
  @media (max-width: 768px) {
    gap: 6px;
    margin: 0.375rem 0;
    font-size: 13px;
  }
`;

const ActionButtons = styled.div<{ $isFloating: boolean; $top: number }>`
  position: ${props => props.$isFloating ? 'fixed' : 'static'};
  bottom: ${props => props.$isFloating ? '30px' : 'auto'};
  top: ${props => props.$isFloating ? 'auto' : `${props.$top}px`};
  left: ${props => props.$isFloating ? '20px' : '0'};
  right: ${props => props.$isFloating ? '20px' : '0'};
  display: flex;
  gap: 16px;
  max-width: 920px;
  margin: ${props => props.$isFloating ? '0 auto' : '2rem 0 0 0'};
  z-index: ${props => props.$isFloating ? 50 : 'auto'};
  padding-bottom: ${props => props.$isFloating ? '20px' : '0'};
  transition: all 0.3s ease-in-out;
  z-index: 1000;
  
  @media (max-width: 768px) {
    bottom: ${props => props.$isFloating ? '20px' : 'auto'};
    left: ${props => props.$isFloating ? '16px' : '0'};
    right: ${props => props.$isFloating ? '16px' : '0'};
    gap: 12px;
    margin: ${props => props.$isFloating ? '0 auto' : '1.5rem 0 0 0'};
    padding-bottom: ${props => props.$isFloating ? '16px' : '0'};
    flex-direction: column;
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

const ActionButton = styled.button<{ $variant: 'join' | 'cancel' | 'locked'; $saved?: boolean }>`
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 700;
  cursor: ${props => props.$variant === 'locked' ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
  
  /* Background styles based on variant */
  background-color: ${props => {
    if (props.$variant === 'locked') return '#e0e0e0';
    if (props.$variant === 'cancel') return '#f44336';
    return '#000000'; // Black for join button
  }};
  
  /* Gradient background specifically for join button */
  ${props => props.$variant === 'join' && css`
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
  
  color: ${props => {
    if (props.$variant === 'locked') return '#999';
    return 'white';
  }};
  
  &:hover {
    transform: ${props => props.$variant !== 'locked' ? 'translateY(-2px)' : 'none'};
    box-shadow: ${props => {
      if (props.$variant === 'locked') return 'none';
      if (props.$variant === 'join') return '0 8px 25px rgba(0, 0, 0, 0.4)';
      return '0 4px 12px rgba(0, 0, 0, 0.15)';
    }};
  }
  
  @media (max-width: 768px) {
    padding: 0.875rem;
    font-size: 14px;
    border-radius: 16px;
    gap: 6px;
    
    &:hover {
      transform: ${props => props.$variant !== 'locked' ? 'translateY(-1px)' : 'none'};
    }
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

const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [event, setEvent] = useState<MeetupEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [isButtonFloating, setIsButtonFloating] = useState(false);
  const actionButtonRef = useRef<HTMLDivElement>(null);
  const [originalButtonTop, setOriginalButtonTop] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [dialogTemplateEvent, setDialogTemplateEvent] = useState<MeetupEvent | null>(null);
  const [dialogEditEvent, setDialogEditEvent] = useState<MeetupEvent | null>(null);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        const adminStatus = await isUserAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
      }
    };
    checkAdminStatus();
  }, [currentUser]);

  useEffect(() => {
    if (!eventId) {
      setError('Event ID is required');
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates for this specific event
    const unsubscribe = subscribeToEvent(eventId, (eventData) => {
      setEvent(eventData);
      setLoading(false);
      if (!eventData) {
        setError('Event not found');
      } else {
        setError(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [eventId]);

  useEffect(() => {
    // Auto-slide images
    if (event && event.image_urls.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => 
          (prev + 1) % event.image_urls.length
        );
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [event]);

  // Handle scroll behavior for floating action button
  useEffect(() => {
    const handleScroll = () => {
      if (!actionButtonRef.current) return;

      const buttonElement = actionButtonRef.current;
      const buttonRect = buttonElement.getBoundingClientRect();
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      // Get the original position of the button (when not floating)
      if (originalButtonTop === 0 && !isButtonFloating) {
        const originalTop = buttonRect.top + scrollY;
        setOriginalButtonTop(originalTop);
        return;
      }

      // Calculate if button should be floating
      const buttonOriginalBottom = originalButtonTop + buttonElement.offsetHeight;
      const shouldFloat = scrollY + windowHeight < buttonOriginalBottom + 50; // 50px buffer

      setIsButtonFloating(shouldFloat);
    };

    // Set up scroll listener
    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [originalButtonTop, isButtonFloating]);

  const handleBack = () => {
    navigate('/meetup');
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

  const getCategoryEmoji = (category: string) => {
    switch (category.toLowerCase()) {
      case 'discussion': return '💬';
      case 'movie night': return '🎬';
      case 'picnic': return '🍉';
      case 'socializing': return '👥';
      default: return '📅';
    }
  };

  const handleAvatarClick = (uid: string) => {
    // Handle avatar click - could show user profile modal, etc.
    console.log('Avatar clicked for user:', uid);
  };

  const handleCreateNew = () => {
    setDialogTemplateEvent(null); // No template for new event
    setDialogEditEvent(null); // Not editing
    setShowAdminDialog(true);
  };

  const handleDuplicate = () => {
    setDialogTemplateEvent(event); // Use current event as template
    setDialogEditEvent(null); // Not editing
    setShowAdminDialog(true);
  };

  const handleEdit = () => {
    setDialogTemplateEvent(null); // Not using template
    setDialogEditEvent(event); // Edit current event
    setShowAdminDialog(true);
  };

  const handleEventCreated = (eventId: string) => {
    // Optionally navigate to the new event or show success message
    navigate(`/meetup/${eventId}`);
  };

  const handleEventUpdated = () => {
    // Stay on current page, event will update via real-time subscription
    handleDialogClose();
  };

  const handleDialogClose = () => {
    setShowAdminDialog(false);
    setDialogTemplateEvent(null);
    setDialogEditEvent(null);
  };

  // Loading state
  if (loading) {
    return (
      <Container>
        <div style={{ paddingTop: '80px', textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: '#666', fontSize: '16px', marginBottom: '1rem' }}>
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
        <div style={{ paddingTop: '80px', textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: '#666', fontSize: '16px', marginBottom: '1rem' }}>
            {error || `Event with ID "${eventId}" was not found.`}
          </div>
          <ActionButton
            $variant="join"
            onClick={handleBack}
            style={{ position: 'static', margin: '0 auto', maxWidth: '200px' }}
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
  const category = event.title.toLowerCase().includes('movie') ? 'Movie Night' :
                  event.title.toLowerCase().includes('business') ? 'Socializing' :
                  'Discussion';

  // Get topics data (in real app, you'd fetch this from Firestore)
  const eventTopics = event.topics
    .map(topicRef => sampleTopics[topicRef.topic_id as keyof typeof sampleTopics])
    .filter(Boolean);

  // Get countdown information for the title
  const { countdownPrefix, eventTitle, isUrgent } = formatEventTitleWithCountdown(event);

  // Calculate total participants including leaders
  const totalParticipants = event.current_participants + event.leaders.length;

  // Determine button text based on lock reason
  const getButtonText = () => {
    if (!isLocked) return isJoined ? '취소' : '참가 신청하기';
    
    switch (lockStatus.reason) {
      case 'started': return '모집 종료';
      case 'full': return '참가 인원 초과';
      case 'lockdown': return '모집 종료';
      default: return '모집 종료';
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
          <CategoryTag $category={category}>
            <span>{getCategoryEmoji(category)}</span>
            {category}
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
            <DetailIcon>⏱️</DetailIcon>
            <DetailText>일정 시간: {event.duration_minutes}분</DetailText>
          </DetailRow>
          <DetailRow>
            <DetailIcon>📅</DetailIcon>
            <DetailText>시작 시간: {formatEventDateTime(event)}</DetailText>
          </DetailRow>
          <DetailRow>
            <DetailIcon>📍</DetailIcon>
            <DetailText>{event.location_name} ({event.location_address}, {event.location_extra_info})</DetailText>
          </DetailRow>

          {event.latitude && event.longitude && (
            <NaverMapComponent 
              latitude={event.latitude}
              longitude={event.longitude}
              locationName={event.location_name}
              mapUrl={event.location_map_url}
            />
          )}

          <SectionTitle>참가 신청 ({totalParticipants}/{event.max_participants})</SectionTitle>
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
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#666'
              }}>
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
                    <span>{expandedTopics[topic.id] ? '▲' : '▼'}</span>
                  </TopicTitle>
                  <TopicContent $expanded={expandedTopics[topic.id]}>
                    {'url' in topic && topic.url && (
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
                    {topic.discussion_points.map((point: string, pointIndex: number) => (
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

          <ActionButtons 
            ref={actionButtonRef}
            $isFloating={isButtonFloating}
            $top={originalButtonTop}
          >
            {isAdmin && (
              <AdminButtons>
                <AdminButton onClick={handleEdit}>
                  ✏️ Edit Event
                </AdminButton>
                <AdminButton onClick={handleCreateNew}>
                  🆕 Create New Event
                </AdminButton>
                <AdminButton onClick={handleDuplicate}>
                  📋 Duplicate This Event
                </AdminButton>
              </AdminButtons>
            )}
            <ActionButton
              $variant={isLocked ? 'locked' : isJoined ? 'cancel' : 'join'}
              onClick={isLocked ? undefined : handleJoin}
            >
              <span>
                {isLocked ? '🔒' : isJoined ? '❌' : '✅'}
              </span>
              {getButtonText()}
            </ActionButton>
          </ActionButtons>
      </Content>

      <AdminEventDialog
        isOpen={showAdminDialog}
        onClose={handleDialogClose}
        templateEvent={dialogTemplateEvent}
        editEvent={dialogEditEvent}
        creatorUid={currentUser?.uid || ''}
        onEventCreated={handleEventCreated}
        onEventUpdated={handleEventUpdated}
      />
    </Container>
  );
};

export default EventDetailPage; 