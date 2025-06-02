import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Timestamp } from 'firebase/firestore';
import { MeetupEvent } from '../types/meetup_types';
import { createMeetupEvent, updateMeetupEvent } from '../services/meetup_service';
import { uploadMeetupImages, validateImageFiles, deleteMeetupImage } from '../services/image_upload_service';

interface AdminEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateEvent?: MeetupEvent | null;
  editEvent?: MeetupEvent | null;
  creatorUid: string;
  onEventCreated?: (eventId: string) => void;
  onEventUpdated?: () => void;
}

// Naver search result interface
interface NaverSearchResult {
  title: string;
  address: string;
  mapx: string; // longitude in Naver coordinate system
  mapy: string; // latitude in Naver coordinate system
  link: string;
}

// Location search component
interface LocationSearchProps {
  onLocationSelected: (title: string, address: string, latitude: number, longitude: number, mapUrl: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Styled components
const DialogOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    align-items: flex-start;
    padding-top: 2rem;
  }
`;

const DialogContent = styled.div`
  background-color: white;
  border-radius: 20px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
    max-height: 95vh;
  }
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

const DialogTitle = styled.h2`
  color: #333;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f0f0f0;
  }
  
  @media (max-width: 768px) {
    font-size: 20px;
    padding: 0.375rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  @media (max-width: 768px) {
    gap: 0.875rem;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  color: #333;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 13px;
    margin-bottom: 0.375rem;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem;
    font-size: 16px; // Prevents zoom on iOS
    border-radius: 8px;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem;
    font-size: 16px; // Prevents zoom on iOS
    border-radius: 8px;
    min-height: 80px;
  }
`;

const LocationRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const NumberRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ImageUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FileInput = styled.input`
  padding: 0.75rem;
  border: 2px dashed #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  background-color: #fafafa;
  transition: all 0.2s;
  
  &:hover {
    border-color: #2196f3;
    background-color: #f5f5f5;
  }
  
  &:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
  }
`;

const ImagePreviewContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
`;

const ImagePreview = styled.div`
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background-color: #f5f5f5;
  aspect-ratio: 1;
  
  @media (max-width: 768px) {
    border-radius: 8px;
  }
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RemoveImageButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(244, 67, 54, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  
  &:hover {
    background-color: rgba(244, 67, 54, 1);
  }
  
  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 16px;
    top: 3px;
    right: 3px;
  }
`;

const ErrorMessage = styled.div`
  color: #f44336;
  font-size: 12px;
  margin-top: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 11px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    gap: 0.75rem;
    margin-top: 1rem;
  }
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  background-color: ${props => props.$variant === 'primary' ? '#181818' : '#f5f5f5'};
  color: ${props => props.$variant === 'primary' ? 'white' : '#666'};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.875rem;
    font-size: 16px; // Prevents zoom on iOS
    border-radius: 16px;
    
    &:hover {
      transform: translateY(-1px);
    }
  }
`;

const LocationSearchModal = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    align-items: flex-start;
    padding-top: 2rem;
  }
`;

const LocationSearchContent = styled.div`
  background-color: white;
  border-radius: 20px;
  padding: 1.5rem;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 16px;
    max-height: 90vh;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 1rem;
  
  &:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem;
    font-size: 16px; // Prevents zoom on iOS
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }
`;

const SearchResults = styled.div`
  max-height: 300px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    max-height: 250px;
  }
`;

const SearchResultItem = styled.div`
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
    border-color: #2196f3;
  }
  
  @media (max-width: 768px) {
    padding: 0.875rem;
    border-radius: 8px;
    margin-bottom: 0.375rem;
  }
`;

const ResultTitle = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
  
  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const ResultAddress = styled.div`
  color: #666;
  font-size: 12px;
  
  @media (max-width: 768px) {
    font-size: 11px;
  }
`;

const LoadingText = styled.div`
  text-align: center;
  color: #666;
  padding: 1rem;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    font-size: 14px;
  }
`;

const SearchButton = styled.button`
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 0.5rem;
  
  &:hover {
    background-color: #1976d2;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem 0.875rem;
    font-size: 16px; // Prevents zoom on iOS
    border-radius: 8px;
    margin-left: 0.375rem;
  }
`;

const LocationInputRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    gap: 0.375rem;
    margin-bottom: 0.375rem;
  }
`;

const LocationSearch: React.FC<LocationSearchProps> = ({
  isOpen,
  onClose,
  onLocationSelected
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<NaverSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const removeHtmlTags = (htmlText: string): string => {
    return htmlText.replace(/<[^>]*>/g, '');
  };

  // Call Firebase Function for Naver Local Search
  const performSearchWithNaver = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setErrorMessage('Please enter a search term.'); // User feedback
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Call your Firebase Function instead of direct API
      const functionUrl = `https://searchnaverlocal-cds6z3hrga-du.a.run.app?query=${encodeURIComponent(query)}&display=5&start=1&sort=random`;
      
      const response = await fetch(functionUrl, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.items && Array.isArray(data.items) && data.items.length > 0) { // Check if items exist and has length
          const mappedResults = data.items.map((item: any) => ({ // Renamed to avoid conflict
            title: removeHtmlTags(item.title || ''),
            address: removeHtmlTags(item.roadAddress || item.address || ''),
            link: item.link || '',
            mapx: item.mapx?.toString() || '0',
            mapy: item.mapy?.toString() || '0',
          }));

          setResults(mappedResults);
          setErrorMessage('');
        } else {
          setResults([]); // Clear previous results
          setErrorMessage('No results found for your search.'); // More specific message
        }
      } else {
        const errorText = await response.text(); // Get error text for better debugging
        setErrorMessage(`Search error: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }
    } catch (error) {
      setErrorMessage('Network error - please check your connection and try again');
    } finally {
      setIsLoading(false);
    }
  };

  const convertNaverCoordinates = (mapx: string, mapy: string): { latitude: number, longitude: number } => {
    const longitude = parseFloat(mapx) / 10000000;
    const latitude = parseFloat(mapy) / 10000000;
    return { latitude, longitude };
  };

  // Updates searchQuery state as user types
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handles the click of the new search button
  const handleSearchButtonClick = () => {
    performSearchWithNaver(searchQuery);
  };
  
  // Handles pressing Enter in the input field
  const handleSearchInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      performSearchWithNaver(searchQuery);
    }
  };

  const handleResultClick = (result: NaverSearchResult) => {
    const coordinates = convertNaverCoordinates(result.mapx, result.mapy);
    const mapUrl = result.link || `https://map.naver.com/v5/search/${encodeURIComponent(result.title)}`;
    
    console.log('📍 Selected location:', {
      title: result.title,
      address: result.address,
      coordinates,
      mapUrl
    });
    
    onLocationSelected(
      result.title,
      result.address,
      coordinates.latitude,
      coordinates.longitude,
      mapUrl
    );
    onClose();
  };

  // Initialize when opened
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery(''); // Clear search query on open
      setResults([]);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <LocationSearchModal $isOpen={isOpen} onClick={onClose}>
      <LocationSearchContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>🔍 Location Search (Naver API)</DialogTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </DialogHeader>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <SearchInput
            type="text"
            placeholder="Search locations: e.g., 강남역 카페"
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyPress={handleSearchInputKeyPress} // Added Enter key press handler
            style={{ flexGrow: 1 }}
          />
          <SearchButton 
            type="button" 
            onClick={handleSearchButtonClick} 
            disabled={isLoading || !searchQuery.trim()} // Disable if loading or query is empty
          >
            {isLoading ? 'Searching...' : 'Search'}
          </SearchButton>
        </div>
        
        <SearchResults>
          {isLoading && !results.length ? ( // Show loading only if there are no current results
            <LoadingText>Searching locations...</LoadingText>
          ) : results.length > 0 ? (
            results.map((result, index) => (
              <SearchResultItem key={index} onClick={() => handleResultClick(result)}>
                <ResultTitle>{result.title}</ResultTitle>
                <ResultAddress>{result.address}</ResultAddress>
              </SearchResultItem>
            ))
          ) : !isLoading && searchQuery.trim() && !errorMessage ? ( // Show if not loading, query exists, and no error yet
            <LoadingText>Click "Search" or press Enter to find locations.</LoadingText>
          ) : !isLoading && !searchQuery.trim() && !errorMessage ? (
             <LoadingText>Enter location name and click "Search".</LoadingText>
          ) : null}
        </SearchResults>
        
        {errorMessage && (
          <div style={{ 
            color: '#f44336', 
            fontSize: '12px', 
            marginTop: '1rem', 
            padding: '0.5rem', 
            backgroundColor: '#ffebee', 
            borderRadius: '8px',
            textAlign: 'center' // Center error message
          }}>
            {errorMessage}
          </div>
        )}
      </LocationSearchContent>
    </LocationSearchModal>
  );
};

const AdminEventDialog: React.FC<AdminEventDialogProps> = ({
  isOpen,
  onClose,
  templateEvent,
  editEvent,
  creatorUid,
  onEventCreated,
  onEventUpdated
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration_minutes: 60,
    location_name: '',
    location_address: '',
    location_map_url: '',
    location_extra_info: '',
    lockdown_minutes: 10,
    max_participants: 20,
    image_urls: [] as string[],
    topics: [] as { topic_id: string }[],
    latitude: 0,
    longitude: 0
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  // Initialize form data when template event or edit event changes
  useEffect(() => {
    if (editEvent) {
      // Editing existing event - populate with current data
      setFormData({
        title: editEvent.title,
        description: editEvent.description,
        date: editEvent.date,
        time: editEvent.time,
        duration_minutes: editEvent.duration_minutes,
        location_name: editEvent.location_name,
        location_address: editEvent.location_address,
        location_map_url: editEvent.location_map_url,
        location_extra_info: editEvent.location_extra_info,
        latitude: editEvent.latitude || 0,
        longitude: editEvent.longitude || 0,
        lockdown_minutes: editEvent.lockdown_minutes,
        max_participants: editEvent.max_participants,
        image_urls: editEvent.image_urls || [],
        topics: editEvent.topics
      });
    } else if (templateEvent) {
      // Duplicating existing event - populate with template data but use current date/time
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      setFormData({
        title: templateEvent.title,
        description: templateEvent.description,
        date: currentDate, // Use current date for duplicated event
        time: currentTime, // Use current time for duplicated event
        duration_minutes: templateEvent.duration_minutes,
        location_name: templateEvent.location_name,
        location_address: templateEvent.location_address,
        location_map_url: templateEvent.location_map_url,
        location_extra_info: templateEvent.location_extra_info,
        latitude: templateEvent.latitude || 0,
        longitude: templateEvent.longitude || 0,
        lockdown_minutes: templateEvent.lockdown_minutes,
        max_participants: templateEvent.max_participants,
        image_urls: templateEvent.image_urls || [],
        topics: templateEvent.topics
      });
    } else {
      // Creating new event - reset to default values with current date/time
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      setFormData({
        title: '',
        description: '',
        date: currentDate,
        time: currentTime,
        duration_minutes: 60,
        location_name: '',
        location_address: '',
        location_map_url: '',
        location_extra_info: '',
        latitude: 0,
        longitude: 0,
        lockdown_minutes: 10,
        max_participants: 20,
        image_urls: [],
        topics: []
      });
    }
  }, [templateEvent, editEvent]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationSelected = (title: string, address: string, latitude: number, longitude: number, mapUrl: string) => {
    setFormData(prev => ({
      ...prev,
      location_name: title,
      location_address: address,
      location_map_url: mapUrl,
      latitude: latitude,
      longitude: longitude
    }));
    
    // Note: We don't set coordinates here since they're handled by the geocoding service
    // The coordinates will be automatically resolved when the event is created/updated
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate files
    const { valid, errors } = validateImageFiles(files);
    setUploadErrors(errors);

    if (valid.length === 0) return;

    setUploadingImages(true);

    try {
      const uploadedUrls = await uploadMeetupImages(valid);

      // Add uploaded URLs to existing images
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls]
      }));

      // Clear file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Error uploading images:', error);
      setUploadErrors(prev => [...prev, `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = formData.image_urls[index];
    
    try {
      // Delete from Firebase Storage
      await deleteMeetupImage(imageUrl);
      
      // Remove from form data
      const newImageUrls = formData.image_urls.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        image_urls: newImageUrls
      }));
    } catch (error) {
      console.error('Error removing image:', error);
      // Still remove from UI even if deletion fails
      const newImageUrls = formData.image_urls.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        image_urls: newImageUrls
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert form data to Firestore format
      const firestoreEventData = {
        title: formData.title,
        description: formData.description,
        date_time: Timestamp.fromDate(new Date(`${formData.date}T${formData.time}`)),
        duration_minutes: formData.duration_minutes,
        image_urls: formData.image_urls,
        location_name: formData.location_name,
        location_address: formData.location_address,
        location_map_url: formData.location_map_url,
        latitude: formData.latitude,
        longitude: formData.longitude,
        location_extra_info: formData.location_extra_info,
        lockdown_minutes: formData.lockdown_minutes,
        max_participants: formData.max_participants,
        topics: formData.topics
      };

      if (editEvent) {
        await updateMeetupEvent(editEvent.id, firestoreEventData);
        if (onEventUpdated) {
          onEventUpdated();
        }
      } else {
        const eventId = await createMeetupEvent(firestoreEventData, creatorUid);
        if (onEventCreated) {
          onEventCreated(eventId);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <DialogOverlay $isOpen={isOpen} onClick={onClose}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            {editEvent 
              ? `Edit Event: ${editEvent.title}` 
              : templateEvent 
                ? `Duplicate Event: ${templateEvent.title}` 
                : 'Create New Event'
            }
          </DialogTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </DialogHeader>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Title</Label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Description</Label>
            <TextArea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
            />
          </FormGroup>

          <LocationRow>
            <FormGroup>
              <Label>Event Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Event Time</Label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                required
              />
            </FormGroup>
          </LocationRow>

          <FormGroup>
            <Label>Location</Label>
            <LocationInputRow>
              <div style={{ flex: 1 }}>
                <LocationRow>
                  <Input
                    type="text"
                    placeholder="Location Name"
                    value={formData.location_name}
                    onChange={(e) => handleInputChange('location_name', e.target.value)}
                    required
                  />
                  <Input
                    type="text"
                    placeholder="Location Address"
                    value={formData.location_address}
                    onChange={(e) => handleInputChange('location_address', e.target.value)}
                  />
                </LocationRow>
              </div>
              <SearchButton
                type="button"
                onClick={() => setShowLocationSearch(true)}
              >
                🔍 Search
              </SearchButton>
            </LocationInputRow>
            <LocationRow style={{ marginTop: '0.5rem' }}>
              <Input
                type="url"
                placeholder="Map URL (optional)"
                value={formData.location_map_url}
                onChange={(e) => handleInputChange('location_map_url', e.target.value)}
              />
              <Input
                type="text"
                placeholder="Extra Info"
                value={formData.location_extra_info}
                onChange={(e) => handleInputChange('location_extra_info', e.target.value)}
              />
            </LocationRow>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>
              🔍 Use the search button to find locations with automatic coordinates, or 💡 coordinates will be automatically resolved from the location name/address.
            </div>
          </FormGroup>

          <NumberRow>
            <FormGroup>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value) || 60)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Max Participants</Label>
              <Input
                type="number"
                value={formData.max_participants}
                onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value) || 20)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Lockdown (minutes)</Label>
              <Input
                type="number"
                value={formData.lockdown_minutes}
                onChange={(e) => handleInputChange('lockdown_minutes', parseInt(e.target.value) || 10)}
                required
              />
            </FormGroup>
          </NumberRow>

          <FormGroup>
            <Label>Event Images</Label>
            <ImageUploadContainer>
              <FileInput
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleImageUpload}
                disabled={uploadingImages}
              />
              
              {uploadErrors.length > 0 && (
                <div>
                  {uploadErrors.map((error, index) => (
                    <ErrorMessage key={index}>{error}</ErrorMessage>
                  ))}
                </div>
              )}

              {formData.image_urls.length > 0 && (
                <ImagePreviewContainer>
                  {formData.image_urls.map((url, index) => (
                    <ImagePreview key={index}>
                      <PreviewImage src={url} alt={`Event image ${index + 1}`} />
                      <RemoveImageButton
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                      >
                        ×
                      </RemoveImageButton>
                    </ImagePreview>
                  ))}
                </ImagePreviewContainer>
              )}
              
              <div style={{ fontSize: '12px', color: '#666' }}>
                📸 Upload JPEG, PNG, or WebP images (max 5MB each)
              </div>
            </ImageUploadContainer>
          </FormGroup>

          <ButtonRow>
            <ActionButton type="button" $variant="secondary" onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton 
              type="submit" 
              $variant="primary" 
              disabled={loading || uploadingImages}
            >
              {loading 
                ? (editEvent ? 'Updating...' : 'Creating...') 
                : uploadingImages 
                  ? 'Uploading Images...' 
                  : (editEvent ? 'Update Event' : 'Create Event')
              }
            </ActionButton>
          </ButtonRow>
        </Form>
      </DialogContent>
      
      <LocationSearch
        isOpen={showLocationSearch}
        onClose={() => setShowLocationSearch(false)}
        onLocationSelected={handleLocationSelected}
      />
    </DialogOverlay>
  );
};

export default AdminEventDialog; 