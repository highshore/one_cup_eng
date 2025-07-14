"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { useAuth } from "../lib/contexts/auth_context";
import { BlogPost } from "../lib/features/blog/types/blog_types";
import {
  fetchBlogPosts,
  fetchAllBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "../lib/features/blog/services/blog_service";
import { BlogEditor } from "../lib/features/blog/components/blog_editor";
import { BlogPostCard } from "../lib/features/blog/components/blog_post_card";

// Define colors for YC-style design
const colors = {
  primary: "#000000",
  primaryLight: "#333333",
  primaryDark: "#000000",
  primaryPale: "#f8f9fa",
  primaryBg: "#ffffff",
  accent: "#FF6600", // YC Orange
  accentHover: "#E55A00",
  accentLight: "#FFF4E6",
  text: {
    dark: "#000000",
    medium: "#666666",
    light: "#999999",
  },
  border: "#e1e5e9",
  shadow: "rgba(0, 0, 0, 0.1)",
  backgroundGray: "#f6f6f6",
};

const BlogContainer = styled.div`
  padding: 2rem 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background-color: ${colors.primaryBg};
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 1.5rem 0;
  }
`;

const BlogHeader = styled.div`
  margin-bottom: 3rem;
  text-align: center;

  @media (max-width: 768px) {
    margin-bottom: 2rem;
  }
`;

const BlogTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${colors.text.dark};
  margin: 0 0 1rem 0;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const BlogSubtitle = styled.p`
  font-size: 1.1rem;
  color: ${colors.text.medium};
  margin: 0;
  font-weight: 400;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const AdminControls = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2rem;
  gap: 1rem;

  @media (max-width: 768px) {
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }
`;

const AdminButton = styled.button`
  background: ${colors.accent};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 4px ${colors.shadow};

  &:hover {
    background: ${colors.accentHover};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px ${colors.shadow};
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 10px 20px;
    font-size: 0.85rem;
  }
`;

const BlogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: 1.1rem;
  color: ${colors.text.medium};
  background: ${colors.primaryBg};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${colors.text.medium};
  background: ${colors.primaryBg};
  border: 2px dashed ${colors.border};
  border-radius: 8px;
  font-family: inherit;

  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: ${colors.text.dark};
    font-family: inherit;
    font-weight: 600;
  }

  p {
    font-size: 1rem;
    line-height: 1.5;
    font-family: inherit;
  }

  @media (max-width: 768px) {
    padding: 3rem 1.5rem;

    h3 {
      font-size: 1.3rem;
    }

    p {
      font-size: 0.9rem;
    }
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc3545;
  background: #fff5f5;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
  margin: 2rem 0;
  font-family: inherit;
`;

interface BlogClientProps {
  initialPosts: BlogPost[];
}

export function BlogClient({ initialPosts }: BlogClientProps) {
  const { accountStatus } = useAuth();
  const router = useRouter();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Check if user is admin
  const isAdmin = accountStatus === "admin";

  // Load initial data if not provided via SSR
  useEffect(() => {
    if (initialPosts.length === 0) {
      loadBlogPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when admin status changes
  useEffect(() => {
    if (isAdmin) {
      loadBlogPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Admin users see all posts, regular users see only published posts
      const posts = isAdmin
        ? await fetchAllBlogPosts()
        : await fetchBlogPosts();

      // Debug: Log blog posts
      console.log(
        "Loaded blog posts:",
        posts.map((post) => ({
          id: post.id,
          title: post.title,
        }))
      );

      setBlogPosts(posts);
    } catch (err) {
      console.error("Failed to fetch blog posts:", err);
      setError("블로그 포스트를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = () => {
    setEditingPost(null);
    setShowEditor(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const handleSavePost = async (postData: Partial<BlogPost>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingPost) {
        // Update existing post
        await updateBlogPost(editingPost.id, postData);
      } else {
        // Create new post
        await createBlogPost(postData);
      }

      // Reload posts after save
      await loadBlogPosts();
      setShowEditor(false);
      setEditingPost(null);
    } catch (err) {
      console.error("Failed to save blog post:", err);
      setError("블로그 포스트 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("이 포스트를 삭제하시겠습니까?")) {
      return;
    }

    try {
      setLoading(true);
      await deleteBlogPost(postId);
      await loadBlogPosts();
    } catch (err) {
      console.error("Failed to delete blog post:", err);
      setError("블로그 포스트 삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingPost(null);
  };

  const handlePostClick = (post: BlogPost) => {
    console.log("Navigating to post:", {
      id: post.id,
      title: post.title,
    });
    // Always use ID-based routing
    router.push(`/blog/${post.id}`);
  };

  if (showEditor) {
    return (
      <BlogEditor
        post={editingPost}
        onSave={handleSavePost}
        onCancel={handleCloseEditor}
      />
    );
  }

  return (
    <BlogContainer>
      {isAdmin && (
        <AdminControls>
          <AdminButton onClick={handleCreatePost}>+ New Post</AdminButton>
          <AdminButton onClick={loadBlogPosts}>Refresh</AdminButton>
        </AdminControls>
      )}

      {error && <ErrorState>{error}</ErrorState>}

      {loading && <LoadingState>Loading posts...</LoadingState>}

      {!loading && blogPosts.length === 0 && !error && (
        <EmptyState>
          <h3>No posts yet</h3>
          <p>Be the first to share your thoughts!</p>
        </EmptyState>
      )}

      {!loading && blogPosts.length > 0 && (
        <BlogGrid>
          {blogPosts.map((post) => (
            <BlogPostCard
              key={post.id}
              post={post}
              isAdmin={isAdmin}
              onClick={() => handlePostClick(post)}
              onEdit={() => handleEditPost(post)}
              onDelete={() => handleDeletePost(post.id)}
            />
          ))}
        </BlogGrid>
      )}
    </BlogContainer>
  );
}
