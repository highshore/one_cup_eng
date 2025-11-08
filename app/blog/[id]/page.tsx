import BlogDetailClient from "./BlogDetailClient";
import {
  fetchPublishedBlogPostByIdServer,
  getPublishedBlogPostIdsServer,
} from "../../lib/features/blog/services/blog_service_server";
import { BlogPost } from "../../lib/features/blog/types/blog_types";

interface BlogDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Force dynamic rendering - generate pages on-demand
export const dynamic = 'force-dynamic';

// This page will be statically generated at build time for each blog post
export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { id } = await params;

  let post: BlogPost | null = null;

  try {
    // Fetch the specific blog post at build time (SSG)
    post = await fetchPublishedBlogPostByIdServer(id);
  } catch (error) {
    console.error("Error fetching blog post at build time:", error);
  }

  return <BlogDetailClient initialPost={post} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogDetailPageProps) {
  const { id } = await params;

  try {
    const post = await fetchPublishedBlogPostByIdServer(id);

    if (post) {
      return {
        title: `${post.title} | 영어 한잔`,
        description: post.excerpt || post.content.slice(0, 160),
        keywords: post.tags?.join(", ") || "영어 학습, 블로그, 영어 한잔",
        openGraph: {
          title: post.title,
          description: post.excerpt || post.content.slice(0, 160),
          type: "article",
          publishedTime: post.publishedAt?.toISOString(),
          authors: ["영어 한잔"],
          images: post.featuredImage ? [post.featuredImage] : undefined,
        },
      };
    }

    return {
      title: "블로그 | 영어 한잔",
      description: "영어 한잔 커뮤니티의 블로그 콘텐츠를 만나보세요.",
      keywords: "영어 학습, 블로그, 영어 한잔",
    };
  } catch (error) {
    console.error("Error generating metadata for blog post:", error);
    return {
      title: "블로그 | 영어 한잔",
    };
  }
}
