"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { useAuth } from "../../lib/contexts/auth_context";
import { BlogPost } from "../../lib/features/blog/types/blog_types";
import {
  fetchBlogPosts,
  fetchAllBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} from "../../lib/features/blog/services/blog_service";
import { BlogEditor } from "../../lib/features/blog/components/blog_editor";
import { BlogPostCard } from "../../lib/features/blog/components/blog_post_card";

// Define colors for consistency
const colors = {
  primary: "#2C1810",
  primaryLight: "#4A2F23",
  primaryDark: "#1A0F0A",
  primaryPale: "#F5EBE6",
  primaryBg: "#FDF9F6",
  accent: "#C8A27A",
  text: {
    dark: "#2C1810",
    medium: "#4A2F23",
    light: "#8B6B4F",
  },
};

const BlogContainer = styled.div`
  padding: 1.5rem 0;
  font-family: "Noto Sans KR", sans-serif;

  @media (max-width: 768px) {
    padding: 1rem 0;
  }
`;

const AdminControls = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
  gap: 0.75rem;

  @media (max-width: 768px) {
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }
`;

const AdminButton = styled.button`
  background: ${colors.primary};
  color: white;
  border: none;
  border-radius: 25px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: "Noto Sans KR", sans-serif;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 3px 10px rgba(44, 24, 16, 0.2);

  &:hover {
    background: ${colors.primaryLight};
    transform: translateY(-1px);
    box-shadow: 0 5px 15px rgba(44, 24, 16, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 8px 16px;
    font-size: 0.9rem;
  }
`;

const BlogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
    margin-top: 1.25rem;
  }

  & > * {
    max-width: 600px;
    justify-self: center;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: 1.2rem;
  color: ${colors.text.medium};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: ${colors.text.light};
  background: white;
  border-radius: 16px;
  border: 2px dashed ${colors.primaryPale};
  font-family: "Noto Sans KR", sans-serif;

  h3 {
    font-size: 1.4rem;
    margin-bottom: 0.75rem;
    color: ${colors.text.medium};
    font-family: "Noto Sans KR", sans-serif;
    font-weight: 600;
  }

  p {
    font-size: 0.95rem;
    line-height: 1.5;
    font-family: "Noto Sans KR", sans-serif;
  }

  @media (max-width: 768px) {
    padding: 2.5rem 1.5rem;

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
  border-radius: 12px;
  border: 1px solid #f5c6cb;
  margin: 2rem 0;
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
          <AdminButton onClick={handleCreatePost}>새 포스트 작성</AdminButton>
          <AdminButton onClick={loadBlogPosts}>새로고침</AdminButton>
        </AdminControls>
      )}

      {error && <ErrorState>{error}</ErrorState>}

      {loading && <LoadingState>로딩 중...</LoadingState>}

      {!loading && blogPosts.length === 0 && !error && (
        <EmptyState>
          <h3>아직 블로그 포스트가 없습니다</h3>
          <p>첫 번째 포스트를 작성해보세요!</p>
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
