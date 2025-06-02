# Meetup Feature - Firestore Backend Setup

This meetup feature is designed to work with a Firestore backend following your mobile app's schema. Here's how to set it up:

## Firestore Collection Structure

### Collection Name: `meetup`

Each document in the `meetup` collection should follow this structure:

```typescript
{
  date_time: Timestamp,           // Firestore Timestamp
  description: string,            // Event description
  duration_minutes: number,       // Event duration in minutes
  image_urls: string[],          // Array of image URLs
  leaders: string[],             // Array of user IDs who are event leaders
  location: [                    // Array with location data
    string,                      // Location name (e.g., "스타벅스 고대안암병원점")
    string,                      // Address (e.g., "서울특별시 성북구 안암동5가 126-1")
    string,                      // Map URL (e.g., "nmap://search?query=...")
    number,                      // Latitude (e.g., 37.5871583)
    number,                      // Longitude (e.g., 127.0270049)
    string                       // Extra info (e.g., "고대병원 입구 쪽")
  ],
  lockdown_minutes: number,      // Minutes before event when registration locks
  max_participants: number,      // Maximum number of participants
  participants: string[],        // Array of user IDs who joined
  title: string,                 // Event title
  topics: {                      // Array of topic references
    topic_id: string             // Reference to topic document
  }[]
}
```

## Sample Data

Use the provided `sample_firestore_docs.json` to populate your Firestore collection with test data.

### Import Instructions:

1. **Option 1: Manual Import via Firebase Console**
   - Go to your Firebase Console → Firestore Database
   - Create a collection named `meetup`
   - For each document in `sample_firestore_docs.json`:
     - Create a new document with the document ID as the key
     - Add all the fields manually
     - For `date_time`, use Firestore timestamp format

2. **Option 2: Programmatic Import (Recommended)**
   Create a one-time import script:

```typescript
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import sampleDocs from './src/features/meetup/sample_firestore_docs.json';

const importSampleData = async () => {
  for (const [docId, data] of Object.entries(sampleDocs)) {
    const docRef = doc(collection(db, 'meetup'), docId);
    await setDoc(docRef, {
      ...data,
      date_time: Timestamp.fromDate(new Date(data.date_time))
    });
  }
  console.log('Sample data imported successfully!');
};

importSampleData();
```

## Features

### Real-time Updates
- Events list updates automatically when Firestore data changes
- Individual event details update in real-time
- Participant counts update immediately

### Fallback System
- In development mode, the app falls back to sample data if Firestore is unavailable
- Error handling for network issues and missing documents

### Key Functions

#### Services (`meetup_service.ts`)
- `fetchUpcomingMeetupEvents()` - Get all upcoming events
- `fetchMeetupEventById(id)` - Get specific event
- `subscribeToUpcomingEvents(callback)` - Real-time updates for events list
- `subscribeToEvent(id, callback)` - Real-time updates for specific event
- `joinMeetupEvent(eventId, userId)` - Join an event (TODO: implement)
- `leaveMeetupEvent(eventId, userId)` - Leave an event (TODO: implement)

#### Utilities (`meetup_helpers.ts`)
- `convertFirestoreToMeetupEvent()` - Convert Firestore doc to UI format
- `isEventLockedDown()` - Check if event registration is locked
- `formatEventDateTime()` - Format dates for display

## Schema Differences from Mobile

The web version converts your mobile schema to a more UI-friendly format:

**Mobile Schema → Web Schema**
- `date_time` → `date` + `time` (split for easier display)
- `location[0]` → `location_name`
- `location[1]` → `location_address`
- `location[2]` → `location_map_url`
- `location[3]` → `latitude`
- `location[4]` → `longitude`
- `location[5]` → `location_extra_info`
- `participants.length` → `current_participants` (calculated)

## Topics System

Topics are referenced by ID in the `topics` array. The actual topic data is stored in `utils/meetup_helpers.ts` as `sampleTopics`. In production, you should:

1. Create a separate `topics` collection in Firestore
2. Update the service to fetch topic data by ID
3. Cache topic data for better performance

## Security Rules

Add these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Meetup events - read access for all, write access for authenticated users
    match /meetup/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Topics - read access for all
    match /topics/{topicId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Testing

The feature includes comprehensive error handling and fallbacks:
- Network connectivity issues
- Missing documents
- Invalid data formats
- Authentication failures

Test these scenarios to ensure robustness in production. 