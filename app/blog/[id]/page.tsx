import BlogDetailClient from "./BlogDetailClient";
import {
  fetchPublishedBlogPostByIdServer,
  getPublishedBlogPostIdsServer,
} from "../../lib/features/blog/services/blog_service_server";
import { BlogPost } from "../../lib/features/blog/types/blog_types";
import { notFound } from "next/navigation";

interface BlogDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Generate static paths for all published blog posts
export async function generateStaticParams() {
  try {
    const postIds = await getPublishedBlogPostIdsServer();

    return postIds.map((id) => ({
      id: id,
    }));
  } catch (error) {
    console.error("Error generating static params for blog posts:", error);
    return [];
  }
}

// Allow dynamic routes that weren't pre-generated at build time
export const dynamicParams = true;

// Enable Incremental Static Regeneration - revalidate every 60 seconds
export const revalidate = 60;

// Force dynamic rendering as fallback
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

  // If no post found, show 404
  if (!post) {
    notFound();
  }

  return <BlogDetailClient initialPost={post} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogDetailPageProps) {
  const { id } = await params;

  try {
    const post = await fetchPublishedBlogPostByIdServer(id);

    if (!post) {
      return {
        title: "포스트를 찾을 수 없습니다 | 영어 한잔",
      };
    }

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
  } catch (error) {
    console.error("Error generating metadata for blog post:", error);
    return {
      title: "블로그 | 영어 한잔",
    };
  }
}
