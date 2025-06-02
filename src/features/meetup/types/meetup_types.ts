// Firestore Meetup Types
export interface FirestoreMeetupEvent {
  id: string; // Document ID
  date_time: any; // Firestore Timestamp
  description: string;
  duration_minutes: number;
  image_urls: string[];
  leaders: string[]; // Array of user IDs
  location_name: string;
  location_address: string;
  location_map_url: string;
  latitude: number;
  longitude: number;
  location_extra_info: string;
  lockdown_minutes: number;
  max_participants: number;
  participants: string[]; // Array of user IDs
  title: string;
  topics: { topic_id: string }[];
}

// Converted types for UI components
export interface MeetupEvent {
  id: string;
  title: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  description: string;
  location_name: string;
  location_address: string;
  location_map_url: string;
  latitude: number;
  longitude: number;
  location_extra_info: string;
  duration_minutes: number;
  lockdown_minutes: number;
  max_participants: number;
  current_participants: number;
  participants: string[];
  leaders: string[];
  image_urls: string[];
  topics: { topic_id: string }[];
}

export interface MeetupTopic {
  id: string;
  title: string;
  url?: string;
  discussion_points: string[];
}

export interface MeetupParticipant {
  id: string;
  name: string;
  avatar?: string;
} 