import { db } from "../../../firebase/firebaseAdmin";

export interface HomeStats {
  totalMeetups: number;
  totalMembers: number;
  totalArticles: number;
}

export const fetchHomeStats = async (): Promise<HomeStats> => {
  try {
    // Check if Firebase Admin SDK is properly initialized
    if (!db || !db.collection) {
      console.warn(
        "Firebase Admin SDK not initialized, returning default stats"
      );
      return {
        totalMeetups: 0,
        totalMembers: 0,
        totalArticles: 0,
      };
    }

    const fetchCollectionSnapshot = async (
      collectionNames: string[]
    ): Promise<number> => {
      for (const name of collectionNames) {
        try {
          const aggregateSnapshot = await db.collection(name).count().get();
          const count = aggregateSnapshot.data().count ?? 0;
          if (count > 0) {
            if (collectionNames.length > 1 && name !== collectionNames[0]) {
              console.info(
                `Home stats: using fallback collection "${name}" (primary returned no documents).`
              );
            }
            return count;
          }
        } catch (aggregateError) {
          console.warn(
            `Aggregate query failed for collection ${name}, falling back to snapshot length:`,
            aggregateError
          );
          try {
            const snapshot = await db.collection(name).get();
            if (snapshot?.docs?.length) {
              return snapshot.docs.length;
            }
          } catch (snapshotError) {
            console.error(`Error fetching ${name} collection:`, snapshotError);
          }
        }
      }

      if (collectionNames.length > 1) {
        console.warn(
          `Home stats: collections ${collectionNames.join(", ")} returned no documents or counts.`
        );
      }
      return 0;
    };

    // Fetch document counts in parallel (meetups fallback to legacy "meetup")
    const [meetupsCount, usersCount, articlesCount] = await Promise.all([
      fetchCollectionSnapshot(["events", "meetups", "meetup"]),
      fetchCollectionSnapshot(["users", "members"]),
      fetchCollectionSnapshot(["articles", "articleEntries", "posts"]),
    ]);

    const stats = {
      totalMeetups: meetupsCount,
      totalMembers: usersCount,
      totalArticles: articlesCount,
    };

    console.log("Home stats fetched:", stats);
    return stats;
  } catch (error) {
    console.error("Error fetching home stats:", error);
    return {
      totalMeetups: 0,
      totalMembers: 0,
      totalArticles: 0,
    };
  }
};

