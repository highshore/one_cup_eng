// Meetup feature exports - components still used by Next.js

// Export components
export { UserAvatar } from "./components/user_avatar";
export { default as AdminEventDialog } from "./components/admin_event_dialog";

// Types
export type {
  FirestoreMeetupEvent,
  MeetupEvent,
  MeetupTopic,
  MeetupParticipant,
} from "./types/meetup_types";

// Services
export {
  fetchMeetupEvents,
  fetchUpcomingMeetupEvents,
  fetchMeetupEventById,
  subscribeToAllEvents,
  subscribeToUpcomingEvents,
  subscribeToEvent,
  createMeetupEvent,
  updateMeetupEvent,
  joinEventAsRole,
  cancelParticipation,
  removeParticipant,
  changeUserRole,
} from "./services/meetup_service";
export {
  fetchUserProfile,
  fetchUserProfiles,
  isUserAdmin,
} from "./services/user_service";
export { geocodeLocation } from "./services/geocoding_service";
export {
  uploadMeetupImage,
  uploadMeetupImages,
  deleteMeetupImage,
  validateImageFiles,
} from "./services/image_upload_service";

// Utils
export {
  convertTimestampToDateTime,
  convertFirestoreToMeetupEvent,
  isEventLockedDown,
  formatEventDateTime,
  formatTextWithLineBreaks,
  getDaysUntilEvent,
  formatEventTitleWithCountdown,
  sampleFirestoreEvents,
  sampleTopics,
  isEventLocked,
} from "./utils/meetup_helpers";
