import { BlogClient } from "./BlogClient";
import { fetchPublishedBlogPostsServer } from "../lib/features/blog/services/blog_service_server";
import { BlogPost } from "../lib/features/blog/types/blog_types";

// This page will be statically generated at build time
export default async function BlogPage() {
  let initialPosts: BlogPost[] = [];

  try {
    // Fetch blog posts at build time (SSG)
    initialPosts = await fetchPublishedBlogPostsServer();
  } catch (error) {
    console.error("Error fetching blog posts at build time:", error);
    // Fall back to empty array - client will handle fetching
    initialPosts = [];
  }

  return <BlogClient initialPosts={initialPosts} />;
}

// Generate metadata for SEO
export async function generateMetadata() {
  return {
    title: "블로그 | 영어 한잔",
    description: "영어 학습에 도움이 되는 다양한 블로그 글을 만나보세요.",
    keywords: "영어 학습, 블로그, 영어 한잔, 영어 공부",
    openGraph: {
      title: "블로그 | 영어 한잔",
      description: "영어 학습에 도움이 되는 다양한 블로그 글을 만나보세요.",
      type: "website",
    },
  };
}
