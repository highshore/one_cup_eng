import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

interface CachedStats {
  totalMeetups: number;
  totalMembers: number;
  totalArticles: number;
  lastUpdated: admin.firestore.Timestamp;
}

/**
 * Cloud Function to update cached home stats
 * Runs every hour to keep stats fresh
 */
export const updateHomeStats = functions.scheduler.onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (event) => {
    const db = admin.firestore();

    try {
      console.log("Starting home stats update...");

      // Count documents in parallel
      const [meetupsSnapshot, usersSnapshot, articlesSnapshot] =
        await Promise.all([
          db.collection("events").count().get(),
          db.collection("users").count().get(),
          db.collection("articles").count().get(),
        ]);

      const stats: CachedStats = {
        totalMeetups: meetupsSnapshot.data().count || 0,
        totalMembers: usersSnapshot.data().count || 0,
        totalArticles: articlesSnapshot.data().count || 0,
        lastUpdated: admin.firestore.Timestamp.now(),
      };

      // Write to cache collection
      await db.collection("cache").doc("homeStats").set(stats);

      console.log("Home stats updated successfully:", stats);
      return; // Return void for scheduler
    } catch (error) {
      console.error("Error updating home stats:", error);
      throw error;
    }
  }
);

/**
 * HTTP function to manually trigger stats update
 * Useful for immediate updates after major changes
 */
export const triggerHomeStatsUpdate = functions.https.onCall(
  {
    region: "asia-northeast3",
  },
  async (request) => {
    const db = admin.firestore();

    try {
      console.log("Manual home stats update triggered");

      const [meetupsSnapshot, usersSnapshot, articlesSnapshot] =
        await Promise.all([
          db.collection("events").count().get(),
          db.collection("users").count().get(),
          db.collection("articles").count().get(),
        ]);

      const stats: CachedStats = {
        totalMeetups: meetupsSnapshot.data().count || 0,
        totalMembers: usersSnapshot.data().count || 0,
        totalArticles: articlesSnapshot.data().count || 0,
        lastUpdated: admin.firestore.Timestamp.now(),
      };

      await db.collection("cache").doc("homeStats").set(stats);

      console.log("Home stats manually updated:", stats);
      return { success: true, stats };
    } catch (error) {
      console.error("Error in manual stats update:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to manually update home stats"
      );
    }
  }
);

