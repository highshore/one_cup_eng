import { db } from "../../../firebase/firebaseAdmin";
import { BlogPost } from "../types/blog_types";

const COLLECTION_NAME = "blog_posts";

// Convert Firestore document to BlogPost for server-side
const docToBlogPost = (doc: any): BlogPost => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || "",
    content: data.content || "",
    excerpt: data.excerpt || "",
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    publishedAt: data.publishedAt?.toDate() || null,
    status: data.status || "draft",
    slug: data.slug || "",
    featuredImage: data.featuredImage || "",
    tags: data.tags || [],
    views: data.views || 0,
    likes: data.likes || 0,
    likedBy: data.likedBy || [],
  };
};

// Fetch all published blog posts (for SSG)
export const fetchPublishedBlogPostsServer = async (): Promise<BlogPost[]> => {
  try {
    // Check if Firebase Admin SDK is properly initialized
    if (!db.collection) {
      console.warn(
        "Firebase Admin SDK not initialized, returning empty blog posts"
      );
      return [];
    }

    const blogRef = db.collection(COLLECTION_NAME);
    const querySnapshot = await blogRef.get();

    const posts = querySnapshot.docs
      .map(docToBlogPost)
      .filter((post) => post.status === "published")
      .sort((a, b) => {
        const dateA = a.publishedAt || a.createdAt;
        const dateB = b.publishedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      });

    return posts;
  } catch (error) {
    console.error("Error fetching published blog posts on server:", error);
    return [];
  }
};

// Fetch a single published blog post by ID (for SSG/SSR)
export const fetchPublishedBlogPostByIdServer = async (
  id: string
): Promise<BlogPost | null> => {
  try {
    // Check if Firebase Admin SDK is properly initialized
    if (!db.collection) {
      console.warn(
        "Firebase Admin SDK not initialized, returning null for blog post"
      );
      return null;
    }

    const docRef = db.collection(COLLECTION_NAME).doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const post = docToBlogPost(docSnap);
      // Only return if the post is published
      if (post.status === "published") {
        return post;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching published blog post by ID on server:", error);
    return null;
  }
};

// Get all published blog post IDs (for getStaticPaths)
export const getPublishedBlogPostIdsServer = async (): Promise<string[]> => {
  try {
    // Check if Firebase Admin SDK is properly initialized
    if (!db.collection) {
      console.warn(
        "Firebase Admin SDK not initialized, returning empty blog post IDs"
      );
      return [];
    }

    const blogRef = db.collection(COLLECTION_NAME);
    const querySnapshot = await blogRef.get();

    const postIds = querySnapshot.docs
      .map(docToBlogPost)
      .filter((post) => post.status === "published")
      .map((post) => post.id);

    return postIds;
  } catch (error) {
    console.error("Error fetching blog post IDs on server:", error);
    return [];
  }
};
