import { db } from "../../../firebase/firebaseAdmin";
import { MeetupEvent, FirestoreMeetupEvent } from "../types/meetup_types";

const MEETUP_COLLECTION = "meetups";

// Convert Firestore document to MeetupEvent for server-side
const convertFirestoreToMeetupEvent = (
  firestoreEvent: FirestoreMeetupEvent
): MeetupEvent => {
  const dateTime = firestoreEvent.date_time?.toDate
    ? firestoreEvent.date_time.toDate()
    : new Date();

  return {
    id: firestoreEvent.id,
    title: firestoreEvent.title,
    description: firestoreEvent.description,
    date: dateTime.toISOString().split("T")[0], // YYYY-MM-DD format
    time: dateTime.toTimeString().split(" ")[0].slice(0, 5), // HH:MM format
    location_name: firestoreEvent.location_name,
    location_address: firestoreEvent.location_address,
    location_map_url: firestoreEvent.location_map_url,
    latitude: firestoreEvent.latitude,
    longitude: firestoreEvent.longitude,
    location_extra_info: firestoreEvent.location_extra_info,
    duration_minutes: firestoreEvent.duration_minutes,
    lockdown_minutes: firestoreEvent.lockdown_minutes,
    max_participants: firestoreEvent.max_participants,
    participants: firestoreEvent.participants || [],
    leaders: firestoreEvent.leaders || [],
    image_urls: firestoreEvent.image_urls || [],
    topics: firestoreEvent.topics || [],
    articles: firestoreEvent.articles || [],
  };
};

// Fetch upcoming meetup events (for SSG/SSR)
export const fetchUpcomingMeetupEventsServer = async (): Promise<
  MeetupEvent[]
> => {
  try {
    // Check if Firebase Admin SDK is properly initialized
    if (!db || !db.collection) {
      console.warn(
        "Firebase Admin SDK not initialized, returning empty meetup events"
      );
      return [];
    }

    const now = new Date();
    const meetupRef = db.collection(MEETUP_COLLECTION);

    // Check if the collection reference has the get method
    if (!meetupRef || typeof meetupRef.get !== 'function') {
      console.warn(
        "Firebase collection reference not properly initialized, returning empty meetup events"
      );
      return [];
    }

    // Get all documents and filter/sort in memory to avoid index issues
    const querySnapshot = await meetupRef.get();

    const events: MeetupEvent[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<FirestoreMeetupEvent, "id">;
      const eventData: FirestoreMeetupEvent = {
        id: doc.id,
        ...data,
      };

      const meetupEvent = convertFirestoreToMeetupEvent(eventData);

      // Check if the event is upcoming
      const eventDateTime = new Date(`${meetupEvent.date}T${meetupEvent.time}`);
      if (eventDateTime >= now) {
        events.push(meetupEvent);
      }
    });

    // Sort by date (ascending - soonest first)
    events.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    return events;
  } catch (error) {
    console.error("Error fetching upcoming meetup events on server:", error);
    return [];
  }
};
