import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

// User profile interface
export interface UserProfile {
  uid: string;
  displayName?: string;
  photoURL?: string;
  email?: string; // Keep email if you might need it, but it's often not public
  account_status?: string; // Add account_status field
}

// Cache for user profiles to avoid repeated fetches
const userCache = new Map<string, UserProfile>();

// Fetch a single user profile by UID from Firestore
export const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  // Check cache first
  if (userCache.has(uid)) {
    return userCache.get(uid) || null;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const profile: UserProfile = {
        uid,
        displayName: userData.displayName || userData.name || `User ${uid.substring(0, 6)}`,
        photoURL: userData.photoURL || userData.avatar,
        email: userData.email, // Only if you store and need it
        account_status: userData.account_status
      };
      userCache.set(uid, profile);
      return profile;
    } else {
      // User document doesn't exist in Firestore, create a fallback
      console.warn(`User document not found in Firestore for UID: ${uid}. Using fallback.`);
      const fallbackProfile: UserProfile = {
        uid,
        displayName: `User ${uid.substring(0, 6)}`,
        photoURL: undefined, // No photoURL if not in Firestore
        account_status: undefined
      };
      userCache.set(uid, fallbackProfile);
      return fallbackProfile;
    }
  } catch (error) {
    console.error(`Error fetching user profile for ${uid} from Firestore:`, error);
    // Return minimal profile on error
    const errorProfile: UserProfile = {
      uid,
      displayName: `User ${uid.substring(0, 6)}`,
      photoURL: undefined,
      account_status: undefined
    };
    userCache.set(uid, errorProfile);
    return errorProfile;
  }
};

// Fetch multiple user profiles by UIDs from Firestore
export const fetchUserProfiles = async (uids: string[]): Promise<UserProfile[]> => {
  const uniqueUids = [...new Set(uids)];
  const profiles: UserProfile[] = [];

  // Fetch each profile individually (leverages caching from fetchUserProfile)
  for (const uid of uniqueUids) {
    const profile = await fetchUserProfile(uid);
    if (profile) {
      profiles.push(profile);
    }
  }

  return profiles;
};

// Clear user cache (useful for debugging or forced refresh)
export const clearUserCache = (): void => {
  userCache.clear();
  console.log('User profile cache cleared.');
};

// Check if a user has admin status
export const isUserAdmin = async (uid: string): Promise<boolean> => {
  try {
    const profile = await fetchUserProfile(uid);
    return profile?.account_status === 'admin';
  } catch (error) {
    console.error(`Error checking admin status for ${uid}:`, error);
    return false;
  }
};

// Get cached user profile (synchronous)
export const getCachedUserProfile = (uid: string): UserProfile | null => {
  return userCache.get(uid) || null;
}; 