import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  addDoc,
  updateDoc,
  runTransaction,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import {
  FirestoreMeetupEvent,
  MeetupEvent,
  Article,
} from "../types/meetup_types";
import {
  convertFirestoreToMeetupEvent,
  sampleFirestoreEvents,
} from "../utils/meetup_helpers";
import { geocodeLocation } from "./geocoding_service";

// Collection references
const MEETUP_COLLECTION = "meetup";
const ARTICLES_COLLECTION = "articles";
const DEFAULT_EVENTS_PER_PAGE = 5; // Reduced to 5 for smaller incremental loading

// Fetch all meetup events with pagination
export const fetchMeetupEvents = async (
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  limitCount: number = DEFAULT_EVENTS_PER_PAGE
): Promise<{
  events: MeetupEvent[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}> => {
  try {
    const meetupCollection = collection(db, MEETUP_COLLECTION);
    let eventsQuery = query(
      meetupCollection,
      orderBy("date_time", "desc"), // Most recent first
      limit(limitCount)
    );

    // Add pagination if lastDoc is provided
    if (lastDoc) {
      eventsQuery = query(
        meetupCollection,
        orderBy("date_time", "desc"),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(eventsQuery);
    const events: MeetupEvent[] = [];
    let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<FirestoreMeetupEvent, "id">;
      const eventData: FirestoreMeetupEvent = {
        id: doc.id,
        ...data,
      };
      events.push(convertFirestoreToMeetupEvent(eventData));
      newLastDoc = doc;
    });

    return { events, lastDoc: newLastDoc };
  } catch (error) {
    console.error("Error fetching meetup events:", error);
    // Fallback to sample data in development
    if (process.env.NODE_ENV === "development") {
      console.log("Using sample data for development");
      const sampleEvents = Object.values(sampleFirestoreEvents).map(
        convertFirestoreToMeetupEvent
      );
      return { events: sampleEvents.slice(0, limitCount), lastDoc: null };
    }
    throw error;
  }
};

// Fetch upcoming meetup events
export const fetchUpcomingMeetupEvents = async (): Promise<MeetupEvent[]> => {
  try {
    const now = Timestamp.now();
    const meetupCollection = collection(db, MEETUP_COLLECTION);
    const upcomingQuery = query(
      meetupCollection,
      where("date_time", ">=", now),
      orderBy("date_time", "asc")
    );

    const querySnapshot = await getDocs(upcomingQuery);
    const events: MeetupEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<FirestoreMeetupEvent, "id">;
      const eventData: FirestoreMeetupEvent = {
        id: doc.id,
        ...data,
      };
      events.push(convertFirestoreToMeetupEvent(eventData));
    });

    return events;
  } catch (error) {
    console.error("Error fetching upcoming meetup events:", error);
    // Fallback to sample data in development
    if (process.env.NODE_ENV === "development") {
      console.log("Using sample data for development");
      return Object.values(sampleFirestoreEvents).map(
        convertFirestoreToMeetupEvent
      );
    }
    throw error;
  }
};

// Fetch a single meetup event by ID
export const fetchMeetupEventById = async (
  eventId: string
): Promise<MeetupEvent | null> => {
  try {
    const eventDoc = doc(db, MEETUP_COLLECTION, eventId);
    const docSnapshot = await getDoc(eventDoc);

    if (docSnapshot.exists()) {
      const data = docSnapshot.data() as Omit<FirestoreMeetupEvent, "id">;
      const eventData: FirestoreMeetupEvent = {
        id: docSnapshot.id,
        ...data,
      };
      return convertFirestoreToMeetupEvent(eventData);
    }

    return null;
  } catch (error) {
    console.error(`Error fetching meetup event ${eventId}:`, error);
    // Fallback to sample data in development
    if (
      process.env.NODE_ENV === "development" &&
      sampleFirestoreEvents[eventId]
    ) {
      console.log(`Using sample data for event ${eventId}`);
      return convertFirestoreToMeetupEvent(sampleFirestoreEvents[eventId]);
    }
    throw error;
  }
};

// Subscribe to real-time updates for all events (for infinite scroll)
export const subscribeToAllEvents = (
  callback: (events: MeetupEvent[]) => void
) => {
  try {
    const meetupCollection = collection(db, MEETUP_COLLECTION);
    const allEventsQuery = query(
      meetupCollection,
      orderBy("date_time", "desc")
    );

    const unsubscribe = onSnapshot(
      allEventsQuery,
      (querySnapshot) => {
        const events: MeetupEvent[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<FirestoreMeetupEvent, "id">;
          const eventData: FirestoreMeetupEvent = {
            id: doc.id,
            ...data,
          };
          events.push(convertFirestoreToMeetupEvent(eventData));
        });
        callback(events);
      },
      (error) => {
        console.error("Error in real-time subscription:", error);
        // Fallback to sample data in development
        if (process.env.NODE_ENV === "development") {
          console.log("Using sample data for real-time subscription");
          const sampleEvents = Object.values(sampleFirestoreEvents).map(
            convertFirestoreToMeetupEvent
          );
          callback(sampleEvents);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up real-time subscription:", error);
    // Return a no-op function if setup fails
    return () => {};
  }
};

// Subscribe to real-time updates for upcoming events
export const subscribeToUpcomingEvents = (
  callback: (events: MeetupEvent[]) => void
) => {
  try {
    const now = Timestamp.now();
    const meetupCollection = collection(db, MEETUP_COLLECTION);
    const upcomingQuery = query(
      meetupCollection,
      where("date_time", ">=", now),
      orderBy("date_time", "asc")
    );

    const unsubscribe = onSnapshot(
      upcomingQuery,
      (querySnapshot) => {
        const events: MeetupEvent[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<FirestoreMeetupEvent, "id">;
          const eventData: FirestoreMeetupEvent = {
            id: doc.id,
            ...data,
          };
          events.push(convertFirestoreToMeetupEvent(eventData));
        });
        callback(events);
      },
      (error) => {
        console.error("Error in real-time subscription:", error);
        // Fallback to sample data in development
        if (process.env.NODE_ENV === "development") {
          console.log("Using sample data for real-time subscription");
          const sampleEvents = Object.values(sampleFirestoreEvents).map(
            convertFirestoreToMeetupEvent
          );
          callback(sampleEvents);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up real-time subscription:", error);
    // Return a no-op function if setup fails
    return () => {};
  }
};

// Subscribe to real-time updates for a specific event
export const subscribeToEvent = (
  eventId: string,
  callback: (event: MeetupEvent | null) => void
) => {
  try {
    const eventDoc = doc(db, MEETUP_COLLECTION, eventId);

    const unsubscribe = onSnapshot(
      eventDoc,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as Omit<FirestoreMeetupEvent, "id">;
          const eventData: FirestoreMeetupEvent = {
            id: docSnapshot.id,
            ...data,
          };
          callback(convertFirestoreToMeetupEvent(eventData));
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error(
          `Error in real-time subscription for event ${eventId}:`,
          error
        );
        // Fallback to sample data in development
        if (
          process.env.NODE_ENV === "development" &&
          sampleFirestoreEvents[eventId]
        ) {
          console.log(
            `Using sample data for event ${eventId} real-time subscription`
          );
          callback(
            convertFirestoreToMeetupEvent(sampleFirestoreEvents[eventId])
          );
        } else {
          callback(null);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error(
      `Error setting up real-time subscription for event ${eventId}:`,
      error
    );
    // Return a no-op function if setup fails
    return () => {};
  }
};

// Join an event either as a participant or a leader
export const joinEventAsRole = async (
  eventId: string,
  userId: string,
  role: "participant" | "leader"
): Promise<void> => {
  const eventRef = doc(db, MEETUP_COLLECTION, eventId);
  try {
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) {
        throw new Error("Event does not exist!");
      }

      const eventData = eventDoc.data() as FirestoreMeetupEvent;
      const isParticipant = eventData.participants?.includes(userId);
      const isLeader = eventData.leaders?.includes(userId);

      // If already in the chosen role or the other role, do nothing (or handle as an error/notification)
      if (
        (role === "participant" && isParticipant) ||
        (role === "leader" && isLeader)
      ) {
        console.log(`User ${userId} already in the event as ${role}.`);
        return; // Or throw an error to indicate this
      }

      // Prevent joining if event is full (unless joining as a leader - leaders might bypass this)
      const currentTotal =
        (eventData.participants?.length || 0) +
        (eventData.leaders?.length || 0);
      if (
        role === "participant" &&
        currentTotal >= eventData.max_participants
      ) {
        throw new Error("Event is already full for participants.");
      }

      const updateData: Record<string, unknown> = {};

      if (role === "participant") {
        updateData.participants = arrayUnion(userId);
        if (isLeader) {
          // If they were a leader, remove them from leaders list
          updateData.leaders = arrayRemove(userId);
        }
      } else {
        // role === 'leader'
        updateData.leaders = arrayUnion(userId);
        if (isParticipant) {
          // If they were a participant, remove them from participants list
          updateData.participants = arrayRemove(userId);
        }
      }

      // No need to manage current_participants since we calculate it on the fly

      transaction.update(eventRef, updateData);
    });
    console.log(
      `User ${userId} successfully joined event ${eventId} as ${role}.`
    );
  } catch (error) {
    console.error("Error joining event:", error);
    throw error; // Re-throw to be caught by the caller
  }
};

// Cancel participation in an event (removes from either participant or leader list)
export const cancelParticipation = async (
  eventId: string,
  userId: string
): Promise<void> => {
  const eventRef = doc(db, MEETUP_COLLECTION, eventId);
  try {
    await runTransaction(db, async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) {
        throw new Error("Event does not exist!");
      }
      const eventData = eventDoc.data() as FirestoreMeetupEvent;
      const isParticipant = eventData.participants?.includes(userId);
      const isLeader = eventData.leaders?.includes(userId);

      if (!isParticipant && !isLeader) {
        console.log(`User ${userId} is not part of event ${eventId}.`);
        return; // Or throw an error
      }

      const updateData: Record<string, unknown> = {};

      if (isParticipant) {
        updateData.participants = arrayRemove(userId);
      }
      if (isLeader) {
        // Can be both a participant and leader based on old logic, so check separately
        updateData.leaders = arrayRemove(userId);
      }

      // No need to manage current_participants since we calculate it on the fly

      transaction.update(eventRef, updateData);
    });
    console.log(
      `User ${userId} successfully canceled participation for event ${eventId}.`
    );
  } catch (error) {
    console.error("Error canceling participation:", error);
    throw error; // Re-throw to be caught by the caller
  }
};

// Create a new meetup event
export const createMeetupEvent = async (
  eventData: Partial<FirestoreMeetupEvent>,
  creatorUid: string
): Promise<string> => {
  try {
    const dataToSave: Omit<FirestoreMeetupEvent, "id"> = {
      title: eventData.title || "Untitled Event",
      description: eventData.description || "",
      date_time: eventData.date_time || Timestamp.now(),
      duration_minutes: eventData.duration_minutes || 60,
      image_urls: eventData.image_urls || [],
      leaders: eventData.leaders || [creatorUid], // Default leader is creator
      participants: eventData.participants || [], // Default empty participants
      lockdown_minutes:
        eventData.lockdown_minutes === undefined
          ? 10
          : eventData.lockdown_minutes,
      max_participants: eventData.max_participants || 20,
      topics: eventData.topics || [],
      articles: eventData.articles || [], // Default empty articles

      location_name: eventData.location_name || "",
      location_address: eventData.location_address || "",
      location_map_url: eventData.location_map_url || "",
      latitude: eventData.latitude || 0,
      longitude: eventData.longitude || 0,
      location_extra_info: eventData.location_extra_info || "",
    };

    // Geocode only if coordinates are 0 (meaning not set by Naver search) AND an address is available
    if (
      (dataToSave.latitude === 0 || dataToSave.longitude === 0) &&
      dataToSave.location_address
    ) {
      console.log(`Geocoding for new event: ${dataToSave.location_address}`);
      const geocoded = await geocodeLocation(dataToSave.location_address);
      if (geocoded) {
        dataToSave.latitude = geocoded.latitude;
        dataToSave.longitude = geocoded.longitude;
        console.log(
          `Geocoded to: lat=${geocoded.latitude}, lng=${geocoded.longitude}`
        );
      } else {
        console.warn(
          `Geocoding failed for: ${dataToSave.location_address}. Using 0,0.`
        );
        dataToSave.latitude = 0;
        dataToSave.longitude = 0;
      }
    } else if (dataToSave.latitude !== 0 && dataToSave.longitude !== 0) {
      console.log(
        `Using provided coordinates for new event: lat=${dataToSave.latitude}, lng=${dataToSave.longitude}`
      );
    } else {
      console.log(
        "No address to geocode and no valid coordinates provided. Using 0,0."
      );
      dataToSave.latitude = 0;
      dataToSave.longitude = 0;
    }

    const docRef = await addDoc(collection(db, MEETUP_COLLECTION), dataToSave);
    console.log("Event created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating meetup event:", error);
    throw error;
  }
};

// Update an existing meetup event
export const updateMeetupEvent = async (
  eventId: string,
  eventData: Partial<FirestoreMeetupEvent>
): Promise<void> => {
  try {
    // Create a mutable copy for updateData
    const updateData: Partial<FirestoreMeetupEvent> = { ...eventData };

    // Determine if geocoding is needed for an update:
    // 1. If location_address is being updated AND
    // 2. If latitude or longitude are not part of this specific update OR they are explicitly set to 0 in this update.
    let needsGeocoding = false;
    if (typeof updateData.location_address === "string") {
      // Check if address is actually being updated
      // If lat/lng are not provided in this update, or are 0, and we have an address, try geocoding.
      if (
        updateData.latitude === undefined ||
        updateData.longitude === undefined ||
        updateData.latitude === 0 ||
        updateData.longitude === 0
      ) {
        needsGeocoding = true;
      }
    }

    if (needsGeocoding && updateData.location_address) {
      console.log(
        `Geocoding for event update (ID: ${eventId}): ${updateData.location_address}`
      );
      const geocoded = await geocodeLocation(updateData.location_address);
      if (geocoded) {
        updateData.latitude = geocoded.latitude;
        updateData.longitude = geocoded.longitude;
        console.log(
          `Geocoded to: lat=${geocoded.latitude}, lng=${geocoded.longitude}`
        );
      } else {
        console.warn(
          `Geocoding failed for: ${updateData.location_address}. Coordinates will be set to 0,0 if not already present in updateData or will remain unchanged if not part of updateData.`
        );
        // If geocoding fails, ensure lat/lng are numbers if they were intended to be updated to 0 or were undefined.
        // If they were defined with non-zero values in `eventData`, those will be used.
        // If they were not in `eventData` at all, they won't be touched here, preserving existing values in Firestore.
        if (updateData.latitude === undefined || updateData.latitude === 0)
          updateData.latitude = 0;
        if (updateData.longitude === undefined || updateData.longitude === 0)
          updateData.longitude = 0;
      }
    } else if (
      updateData.latitude !== undefined &&
      updateData.longitude !== undefined
    ) {
      // If latitude and longitude are explicitly provided in the update (and non-zero, or geocoding wasn't needed)
      console.log(
        `Using provided coordinates for event update (ID: ${eventId}): lat=${updateData.latitude}, lng=${updateData.longitude}`
      );
    }
    // If neither of the above, existing coordinates in Firestore are preserved unless explicitly changed in updateData.

    // Remove undefined fields from updateData to avoid overwriting existing fields with undefined
    // Firestore's updateDoc with partial data only updates fields that are explicitly in the object.
    // However, if a field is present with `undefined` it might clear it.
    // It's generally safer to build updateData with only the fields that are meant to change.
    // The current approach of spreading eventData and then conditionally modifying lat/lng is okay
    // as long as eventData itself doesn't contain undefined for fields that shouldn't be cleared.
    // For Partial<FirestoreMeetupEvent>, this is usually fine.

    console.log(
      "Updating event (ID: ${eventId}) with data:",
      JSON.stringify(updateData, null, 2)
    );
    await updateDoc(doc(db, MEETUP_COLLECTION, eventId), updateData);
    console.log("Event updated successfully:", eventId);
  } catch (error) {
    console.error("Error updating meetup event (ID: ${eventId}):", error);
    throw error;
  }
};

// Fetch recent articles for topic selection
export const fetchRecentArticles = async (
  limitCount: number = 10
): Promise<Article[]> => {
  try {
    const articlesCollection = collection(db, ARTICLES_COLLECTION);
    const articlesQuery = query(
      articlesCollection,
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(articlesQuery);
    const articles: Article[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      articles.push({
        id: doc.id,
        title: data.title || { english: "", korean: "" },
        timestamp: data.timestamp,
      });
    });

    return articles;
  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
};

// Fetch articles by IDs
export const fetchArticlesByIds = async (
  articleIds: string[]
): Promise<Article[]> => {
  try {
    if (articleIds.length === 0) return [];

    const articles: Article[] = [];

    // Fetch each article by ID
    for (const articleId of articleIds) {
      const articleRef = doc(db, ARTICLES_COLLECTION, articleId);
      const articleSnap = await getDoc(articleRef);

      if (articleSnap.exists()) {
        const data = articleSnap.data();
        articles.push({
          id: articleSnap.id,
          title: data.title || { english: "", korean: "" },
          timestamp: data.timestamp,
        });
      }
    }

    return articles;
  } catch (error) {
    console.error("Error fetching articles by IDs:", error);
    return [];
  }
};
