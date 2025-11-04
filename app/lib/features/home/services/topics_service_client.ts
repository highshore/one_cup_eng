import { db } from "../../../firebase/firebase";
import { collection, doc, getDoc } from "firebase/firestore";

export interface HomeTopicArticle {
  id: string;
  titleEnglish: string;
  titleKorean: string;
  imageUrl?: string;
  excerpt: string;
  keywords: string[];
  timestampISO: string;
}

// Featured article IDs - UPDATE THESE WITH YOUR ACTUAL FIRESTORE ARTICLE IDs
export const FEATURED_ARTICLE_IDS = [
  "Alx2pN2Wrv9jbP2MCNKo",
  "7WHMBwU9m8LtBYI2wQVA",
  "hienPf1lJL8GMBKkjnKm",
  "H1hBMM5hB7MqdXkbvvxp",
  "xI3D8ijG6Fp7UHHCvu9B",
  "xFqyswJDnRcEtTmwsU9q",
];

// Client-side fetch using Firebase client SDK - fetches specific articles by ID
export const fetchHomeTopicsClient = async (): Promise<HomeTopicArticle[]> => {
  try {
    if (!db) {
      console.warn("Firebase client SDK not initialized, returning empty topics");
      return [];
    }

    const topics: HomeTopicArticle[] = [];
    const articlesRef = collection(db, "articles");

    // Fetch each article by ID
    for (const articleId of FEATURED_ARTICLE_IDS) {
      try {
        const docRef = doc(articlesRef, articleId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          console.warn(`Article ${articleId} not found in Firestore`);
          continue;
        }

        const data = docSnap.data() || {};
        const contentEnglish: string[] = data.content?.english || [];
        const excerptSource = data.summary || data.excerpt || contentEnglish[0] || "";
        const excerpt = typeof excerptSource === "string"
          ? excerptSource
          : Array.isArray(excerptSource)
          ? excerptSource.join(" ")
          : "";

        const timestamp = data.timestamp?.toDate?.();

        topics.push({
          id: docSnap.id,
          titleEnglish: data.title?.english || "",
          titleKorean: data.title?.korean || "",
          imageUrl: data.image_url || data.hero_image || "",
          excerpt: excerpt.slice(0, 140),
          keywords: Array.isArray(data.keywords) ? data.keywords.slice(0, 5) : [],
          timestampISO: timestamp ? timestamp.toISOString() : new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error fetching article ${articleId}:`, error);
      }
    }

    console.log(`Fetched ${topics.length} topics from Firestore`);
    return topics;
  } catch (error) {
    console.error("Error fetching home topics (client):", error);
    return [];
  }
};

